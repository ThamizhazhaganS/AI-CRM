import base64
import json
import asyncio
import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Request, Response, WebSocket, WebSocketDisconnect

from app import models
from app.services.crm_service import CRMService
from app.services.llm_service import LLMService
from app.services.stt_service import STTService
from app.services.tts_service import TTSService
from app.lead_scorer import calculate_lead_score

router = APIRouter(prefix="/api/voice_agent", tags=["AI Voice Agent"])
logger = logging.getLogger("uvicorn.error")

# ── VOICE ACTIVITY DETECTION CONFIGURATION ───────────────────────────────────
SILENCE_THRESHOLD = 400.0    # RMS amplitude below this = silence
SILENCE_DURATION_SEC = 0.8   # Wait 0.8 seconds of silence before triggering STT (was 1.5s)
FRAME_DURATION_SEC = 0.02    # Each Twilio frame = 20ms audio = 160 bytes

# ── STT POST-PROCESSING CORRECTIONS ──────────────────────────────────────────
# Fixes common real estate mishears from Groq Whisper
STT_CORRECTIONS = {
    "oem": "OMR",
    "o.m.r": "OMR",
    "e.c.r": "ECR",
    "3dhk": "3BHK",
    "2dhk": "2BHK",
    "4dhk": "4BHK",
    "3 d h k": "3BHK",
    "2 d h k": "2BHK",
    "lak": "Lakh",
    "lacks": "Lakhs",
    "crow": "Crore",
    "velacherry": "Velachery",
    "sholinganallur": "Sholinganallur",
    "guduvancheri": "Guduvanchery",
}


def calculate_rms(ulaw_bytes: bytes) -> float:
    """Calculates RMS energy of raw G.711 u-law audio frames."""
    if not ulaw_bytes:
        return 0.0
    total = 0
    for b in ulaw_bytes:
        sample = STTService._ulaw_to_linear(b)
        total += sample * sample
    return (total / len(ulaw_bytes)) ** 0.5


def bytes_to_b64(data: bytes) -> str:
    return base64.b64encode(data).decode("utf-8")


# ── INBOUND CALL TwiML WEBHOOK ────────────────────────────────────────────────
@router.post("/incoming")
async def incoming_call(request: Request):
    """Twilio voice webhook: returns TwiML to initiate a WebSocket media stream."""
    logger.info("[VoiceAgent] Incoming call webhook triggered.")
    
    # Extract caller's phone number from Twilio form parameters
    form_data = await request.form()
    from_number = form_data.get("From", "+91 98888 77777")
    logger.info(f"[VoiceAgent] Call from actual number: {from_number}")
    
    # Print headers to help diagnose proxy/tunnel setup
    for k, v in request.headers.items():
        logger.info(f"  Header: {k} = {v}")
        
    x_forwarded_host = request.headers.get("x-forwarded-host")
    host = x_forwarded_host if x_forwarded_host else request.headers.get("host", "localhost:8000")
    
    logger.info(f"[VoiceAgent] Using host for WebSocket connection: {host}")
    
    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Aditi">Welcome to ABC Builders. Connecting you to a sales executive.</Say>
    <Connect>
        <Stream url="wss://{host}/api/voice_agent/stream">
            <Parameter name="From" value="{from_number}" />
        </Stream>
    </Connect>
</Response>"""
    return Response(content=twiml, media_type="application/xml")


# ── REAL-TIME VOICE WEBSOCKET STREAM ─────────────────────────────────────────
@router.websocket("/stream")
async def voice_agent_stream(websocket: WebSocket):
    await websocket.accept()
    logger.info("[VoiceAgent] WebSocket connection accepted.")

    # ── Call & Session State ──────────────────────────────────────────
    stream_sid: str | None = None
    caller_phone: str | None = None
    start_time = datetime.utcnow()

    # Conversation History
    history = [
        {
            "role": "system",
            "content": (
                "You are Kavitha, a professional real estate sales executive for ABC Builders in Chennai. "
                "Your objective is to:\n"
                "1. Greet callers warmly. If you do not know their name, you MUST ask for it early in the conversation.\n"
                "2. When a caller tells you their name, ALWAYS confirm it by repeating it back: e.g. 'Nice to meet you, [Name]! Did I get that right?' — never assume the name without confirming.\n"
                "3. If the caller makes an unclear sound (like 'mmm' or 'hmm'), ask them politely to repeat: e.g. 'Sorry, could you repeat that?'\n"
                "4. Understand and gather their property preferences step-by-step: preferred type (Apartment, Villa, Plot, Commercial), location in Chennai, budget, and purchasing timeline.\n"
                "5. Proactively recommend a site visit for this Sunday morning.\n"
                "Ensure you ask targeted follow-up questions to collect any missing details (e.g. name, budget, timeline) naturally.\n"
                "Keep all responses SHORT and CONVERSATIONAL — maximum 1-2 sentences. "
                "You are speaking on the phone, so act human, warm, and brief."
            )
        }
    ]

    # Audio Buffers & Flags
    user_audio_buffer = bytearray()
    is_speaking = False
    last_speech_time = 0.0

    # State variables for Barge-In (interruption support)
    ai_is_speaking = False
    interrupt_tts = False
    current_processing_task: asyncio.Task | None = None

    # Pre-generate opening greeting audio
    initial_greeting = "Hello! Thank you for calling ABC Builders. My name is Kavitha. May I know your name and how I can help you today?"
    history.append({"role": "assistant", "content": initial_greeting})
    logger.info("[VoiceAgent] Pre-generating greeting TTS...")
    initial_audio = await TTSService.generate_speech(initial_greeting)

    # ── Helper: Stream audio to Twilio in small chunks ────────────────
    async def send_audio_to_twilio(audio_bytes: bytes):
        nonlocal stream_sid, ai_is_speaking, interrupt_tts
        if not audio_bytes or not stream_sid:
            return
        
        ai_is_speaking = True
        interrupt_tts = False
        
        # 640 bytes = 80ms of audio at 8000Hz u-law.
        # Smaller chunks allow extremely fast barge-in detection.
        chunk_size = 640
        logger.info(f"[VoiceAgent] Starting audio stream playback ({len(audio_bytes)} bytes)...")
        
        for i in range(0, len(audio_bytes), chunk_size):
            if interrupt_tts:
                logger.info("[VoiceAgent] Playback chunk loop interrupted. Stopping stream.")
                break
                
            chunk = audio_bytes[i:i + chunk_size]
            payload = bytes_to_b64(chunk)
            msg = {
                "event": "media",
                "streamSid": stream_sid,
                "media": {"payload": payload}
            }
            await websocket.send_text(json.dumps(msg))
            await asyncio.sleep(0.075)  # Slight pacing (~75ms) matching u-law rate

        ai_is_speaking = False
        interrupt_tts = False

    # ── Helper: Process user speech turn ─────────────────────────────
    async def process_user_turn(audio: bytes):
        nonlocal history
        try:
            # 1. Speech to Text
            user_text = await STTService.transcribe_audio(audio)
            if not user_text or not user_text.strip():
                logger.info("[VoiceAgent] STT returned empty transcript — skipping turn.")
                return

            logger.info(f"[VoiceAgent] Raw STT transcript: '{user_text}'")

            # ── WHISPER HALLUCINATION FILTER ─────────────────────────────
            # Whisper often hallucinates a single word/name from short noise,
            # humming, or throat-clearing sounds (e.g. 'mmmm' → 'Ramesh').
            # If the transcript is a single short word (≤6 chars), skip it.
            words = user_text.strip().split()
            if len(words) == 1 and len(words[0]) <= 6:
                logger.info(f"[VoiceAgent] Skipping likely hallucination: '{user_text}' (1 short word)")
                return

            # ── STT CORRECTION PASS ───────────────────────────────────────
            corrected = user_text
            for wrong, right in STT_CORRECTIONS.items():
                corrected = corrected.replace(wrong, right)
            if corrected != user_text:
                logger.info(f"[VoiceAgent] STT corrected: '{user_text}' → '{corrected}'")
                user_text = corrected

            logger.info(f"[VoiceAgent] User said: '{user_text}'") 

            history.append({"role": "user", "content": user_text})

            # ── TRIM HISTORY: keep system prompt + last 10 messages ───────
            system_msg = history[0]
            recent = history[1:]
            if len(recent) > 10:
                recent = recent[-10:]
            trimmed_history = [system_msg] + recent

            # 2. Dynamic CRM Property Lookup
            lower_text = user_text.lower()
            if any(kw in lower_text for kw in ["project", "property", "apartment", "villa", "plot", "price", "available", "location"]):
                query = "Chennai"
                for loc in ["omr", "ecr", "velachery", "anna nagar", "guduvanchery", "porur", "perungudi", "sholinganallur"]:
                    if loc in lower_text:
                        query = loc
                        break
                properties = CRMService.search_properties(query)
                if properties:
                    catalog = "\n".join(
                        f"- {p.name} in {p.location}: {p.type.value}, ₹{p.price} ({p.status.value})"
                        for p in properties
                    )
                    trimmed_history.append({
                        "role": "system",
                        "content": f"Available properties matching the query:\n{catalog}\nUse these details."
                    })

            # 3. LLM Response via Groq
            response_text = await LLMService.get_response(trimmed_history)
            logger.info(f"[VoiceAgent] Kavitha responds: '{response_text}'")
            history.append({"role": "assistant", "content": response_text})

            # 4. TTS → Send audio
            response_audio = await TTSService.generate_speech(response_text)
            await send_audio_to_twilio(response_audio)

        except asyncio.CancelledError:
            logger.info("[VoiceAgent] Speech processing task was cancelled (user started speaking again).")
        except Exception as e:
            logger.error(f"[VoiceAgent] Error in speech processing turn: {e}")

    # ── Main WebSocket Loop ───────────────────────────────────────────
    try:
        async for raw_message in websocket.iter_text():
            data = json.loads(raw_message)
            event = data.get("event")

            if event == "start":
                stream_sid = data["start"]["streamSid"]
                caller_phone = (
                    data["start"].get("customParameters", {}).get("From")
                    or "+91 98888 77777"
                )
                logger.info(f"[VoiceAgent] Stream started. SID={stream_sid}, Phone={caller_phone}")

                # Create or find lead in DB
                CRMService.find_or_create_lead(phone=caller_phone)

                # Send opening greeting
                await asyncio.sleep(0.5)
                logger.info("[VoiceAgent] Sending opening greeting...")
                await send_audio_to_twilio(initial_audio)

            elif event == "media":
                raw_bytes = base64.b64decode(data["media"]["payload"])
                rms = calculate_rms(raw_bytes)

                if rms > SILENCE_THRESHOLD:
                    # ── BARGE-IN DETECTION ────────────────────────────────────
                    # If the user speaks while the AI is talking or thinking,
                    # we immediately stop AI speech and cancel current processes.
                    if ai_is_speaking or (current_processing_task and not current_processing_task.done()):
                        logger.info("[VoiceAgent] Barge-in! User interrupted AI. Clearing Twilio buffer...")
                        interrupt_tts = True
                        
                        # Cancel any active STT/LLM/TTS processing task
                        if current_processing_task and not current_processing_task.done():
                            current_processing_task.cancel()
                            
                        # Send clear instruction to Twilio to stop playing audio
                        if stream_sid:
                            clear_msg = {
                                "event": "clear",
                                "streamSid": stream_sid
                            }
                            await websocket.send_text(json.dumps(clear_msg))
                    
                    user_audio_buffer.extend(raw_bytes)
                    is_speaking = True
                    last_speech_time = asyncio.get_event_loop().time()
                else:
                    # Silence detected
                    if is_speaking:
                        user_audio_buffer.extend(raw_bytes)
                        
                        now = asyncio.get_event_loop().time()
                        if now - last_speech_time >= SILENCE_DURATION_SEC:
                            # End of user speech turn detected
                            audio_snapshot = bytes(user_audio_buffer)
                            user_audio_buffer.clear()
                            is_speaking = False
                            
                            logger.info(f"[VoiceAgent] Silence gate: processing {len(audio_snapshot)} bytes of user audio...")
                            
                            # Cancel any previous task just in case, then spawn new processing task
                            if current_processing_task and not current_processing_task.done():
                                current_processing_task.cancel()
                                
                            current_processing_task = asyncio.create_task(process_user_turn(audio_snapshot))

            elif event == "stop":
                logger.info("[VoiceAgent] Twilio sent stop event.")
                break

    except WebSocketDisconnect:
        logger.info("[VoiceAgent] WebSocket disconnected by client.")
    except Exception as e:
        logger.error(f"[VoiceAgent] Unexpected error in main loop: {e}")
    finally:
        # Cancel any running background task
        if current_processing_task and not current_processing_task.done():
            current_processing_task.cancel()

        # ── POST-CALL: Summarise & Save to CRM ───────────────────────
        duration_secs = int((datetime.utcnow() - start_time).total_seconds())
        logger.info(f"[VoiceAgent] Call ended. Duration={duration_secs}s. Saving call record...")

        # Only save if there was a real conversation
        if caller_phone and len(history) > 2:
            transcript_lines = [
                f"{'Customer' if m['role'] == 'user' else 'AI Receptionist'}: {m['content']}"
                for m in history if m["role"] in ("user", "assistant")
            ]
            full_transcript = "\n".join(transcript_lines)

            # Extract lead details via Groq
            details = await LLMService.extract_lead_details(full_transcript)
            logger.info(f"[VoiceAgent] Extracted details: {details}")

            # Score the lead
            site_visit_mentioned = any(kw in full_transcript.lower() for kw in ["visit", "sunday", "site"])
            score, score_cat = calculate_lead_score(
                budget=details.get("budget"),
                timeline=details.get("timeline"),
                site_visit_requested=site_visit_mentioned,
                email=None,
                property_type=details.get("property_type")
            )

            # Update lead in DB
            lead = CRMService.find_or_create_lead(phone=caller_phone)
            CRMService.update_lead_profile(lead.id, {
                "name": details.get("name", "Interested Buyer"),
                "budget": details.get("budget", "Not specified"),
                "location": details.get("location", "Chennai"),
                "property_type": details.get("property_type", "Apartment"),
                "timeline": details.get("timeline", "Browsing"),
                "score": score,
                "score_category": score_cat,
                "status": (
                    models.LeadStatus.site_visit_scheduled
                    if site_visit_mentioned
                    else models.LeadStatus.call_completed
                )
            })

            # Auto-book Sunday site visit if requested
            if site_visit_mentioned:
                days_until_sunday = (6 - datetime.utcnow().weekday()) % 7
                visit_time = datetime.utcnow().replace(
                    hour=11, minute=0, second=0, microsecond=0
                ) + timedelta(days=days_until_sunday or 7)
                try:
                    CRMService.book_appointment(
                        lead_id=lead.id,
                        slot_datetime=visit_time,
                        notes="Auto-booked by AI Voice Sales Executive (Kavitha)."
                    )
                    logger.info(f"[VoiceAgent] Site visit appointment booked for {visit_time}")
                except Exception as apt_err:
                    logger.error(f"[VoiceAgent] Appointment booking failed: {apt_err}")

            # Save call record
            call_id = f"CALL-VA-{int(datetime.utcnow().timestamp())}"
            try:
                CRMService.save_call_record(
                    call_id=call_id,
                    lead_id=lead.id,
                    duration=duration_secs,
                    phone=caller_phone,
                    summary=details.get("summary", "Incoming voice call completed with AI Sales Executive."),
                    transcript=json.dumps([{"speaker": "System", "text": ln} for ln in transcript_lines]),
                    score=score,
                    category=score_cat.value
                )
                logger.info(f"[VoiceAgent] Call record saved. ID={call_id}, Lead={lead.id}")
            except Exception as call_err:
                logger.error(f"[VoiceAgent] Call record save failed: {call_err}")

        logger.info("[VoiceAgent] Session fully cleaned up.")
