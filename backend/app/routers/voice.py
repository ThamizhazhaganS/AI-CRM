import os
import json
import asyncio
from datetime import datetime, timedelta
from fastapi import APIRouter, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import SessionLocal
from app.config import OPENAI_API_KEY, TWILIO_PHONE_NUMBER
from app.lead_scorer import calculate_lead_score

# Only import websockets if available (prevents compile errors during initial setup)
try:
    import websockets
except ImportError:
    websockets = None

router = APIRouter(prefix="/api/voice", tags=["Voice Telephony"])

# ── ID GENERATION HELPERS ──────────────────────────────────────────────
def generate_call_id(db: Session) -> str:
    count = db.query(models.Call).count()
    return f"CALL-{count + 1:03d}"

def generate_lead_id(db: Session) -> str:
    count = db.query(models.Lead).count()
    return f"C-{9000 + count + 1}"

# ── INBOUND CALL TwiML WEBHOOK ─────────────────────────────────────────
@router.post("/incoming")
async def incoming_call(request: Request):
    """
    Twilio voice webhook endpoint.
    Instructs Twilio to start a WebSocket media stream.
    """
    host = request.headers.get("host", "localhost:8000")
    # TwiML response configuration
    twiml_response = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Aditi">Hello, welcome to Estate AI. Connecting you to our assistant.</Say>
    <Connect>
        <Stream url="wss://{host}/api/voice/stream" />
    </Connect>
</Response>"""
    return Response(content=twiml_response, media_type="application/xml")

# ── REAL-TIME VOICE WEBSOCKET STREAM ──────────────────────────────────
@router.websocket("/stream")
async def voice_stream(websocket: WebSocket):
    """
    Main WebSocket endpoint routing audio data between Twilio and OpenAI.
    """
    await websocket.accept()
    print("Twilio WebSocket connection accepted.")

    if not websockets:
        print("Error: websockets library is not installed. Please install it first.")
        await websocket.close(code=1011)
        return

    if not OPENAI_API_KEY:
        print("Error: OPENAI_API_KEY is not configured in .env.")
        await websocket.close(code=1011)
        return

    openai_ws_url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01"
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "OpenAI-Beta": "realtime=v1"
    }

    try:
        async with websockets.connect(openai_ws_url, extra_headers=headers) as openai_ws:
            print("Connected to OpenAI Realtime API.")
            
            # Configure Realtime Session parameters
            session_update = {
                "type": "session.update",
                "session": {
                    "modalities": ["text", "audio"],
                    "instructions": """You are EstateAI Receptionist, a friendly, professional AI voice receptionist for a premier Indian real estate developer.
Your goals:
1. Greet the caller warmly. Ask for their name and requirement.
2. Politely capture their preferred property type (Apartment, Villa, Plot, or Commercial), location preference, budget (in Lakhs/Crores), and timeline for purchase.
3. Be helpful and clear. Answer in English or Hindi (or Hinglish) depending on the caller's preference.
4. Try to offer a site visit for this Sunday morning.
Keep responses concise since this is a voice conversation. Avoid long monologues.
""",
                    "input_audio_format": "g711_ulaw",
                    "output_audio_format": "g711_ulaw",
                    "voice": "alloy",
                    "temperature": 0.6,
                }
            }
            await openai_ws.send(json.dumps(session_update))

            # Stream State
            stream_sid = None
            caller_phone = None
            start_time = datetime.utcnow()
            
            transcript_accumulator = []
            
            # Sub-task lists for async execution
            async def receive_from_twilio():
                nonlocal stream_sid, caller_phone
                try:
                    async for message in websocket.iter_text():
                        data = json.loads(message)
                        event = data.get("event")

                        if event == "start":
                            stream_sid = data["start"]["streamSid"]
                            # Twilio provides custom parameters if configured
                            custom_parameters = data["start"].get("customParameters", {})
                            caller_phone = custom_parameters.get("From") or "+91 99999 99999"
                            print(f"Call started. StreamSid: {stream_sid}, Phone: {caller_phone}")

                        elif event == "media":
                            media_payload = data["media"]["payload"]
                            audio_event = {
                                "type": "input_audio_buffer.append",
                                "audio": media_payload
                            }
                            await openai_ws.send(json.dumps(audio_event))

                        elif event == "stop":
                            print("Twilio call stopped event received.")
                            break
                except WebSocketDisconnect:
                    print("Twilio disconnected.")
                except Exception as e:
                    print(f"Error in Twilio loop: {e}")

            async def receive_from_openai():
                nonlocal stream_sid, transcript_accumulator
                try:
                    async for message in openai_ws:
                        response_data = json.loads(message)
                        event_type = response_data.get("type")

                        if event_type == "response.audio.delta" and stream_sid:
                            audio_payload = response_data.get("delta")
                            twilio_audio = {
                                "event": "media",
                                "streamSid": stream_sid,
                                "media": {
                                    "payload": audio_payload
                                }
                            }
                            await websocket.send_text(json.dumps(twilio_audio))

                        elif event_type == "response.audio_transcript.done":
                            model_transcript = response_data.get("transcript", "")
                            if model_transcript.strip():
                                transcript_accumulator.append(f"AI Receptionist: {model_transcript}")

                        elif event_type == "conversation.item.input_audio_transcription.completed":
                            user_transcript = response_data.get("transcript", "")
                            if user_transcript.strip():
                                transcript_accumulator.append(f"Customer: {user_transcript}")

                except Exception as e:
                    print(f"Error in OpenAI loop: {e}")

            # Run Twilio and OpenAI pipelines concurrently
            await asyncio.gather(receive_from_twilio(), receive_from_openai())

            # ── CALL DISCONNECTED: SAVE LEAD & LOG DETAILS ───────────────────
            duration = int((datetime.utcnow() - start_time).total_seconds())
            print(f"Call finished. Duration: {duration}s. Writing log to database...")

            # Parse accumulated transcript
            full_transcript_str = "\n".join(transcript_accumulator)
            
            # Simple AI heuristic parser from transcript content
            inferred_location = None
            inferred_budget = None
            inferred_property = None
            inferred_timeline = None
            inferred_name = "Interested Buyer"

            # Parse basic parameters from transcript for demo scoring
            lower_t = full_transcript_str.lower()
            if "apartment" in lower_t or "flat" in lower_t:
                inferred_property = "Apartment"
            elif "villa" in lower_t:
                inferred_property = "Villa"
            elif "plot" in lower_t:
                inferred_property = "Plot"
            
            if "lakh" in lower_t or "cr" in lower_t or "crore" in lower_t:
                inferred_budget = "₹60–90 Lakhs" # Default inferred budget
            if "immediate" in lower_t or "soon" in lower_t or "now" in lower_t:
                inferred_timeline = "Immediate"

            # Auto-Scoring Heuristic
            score, score_category = calculate_lead_score(
                budget=inferred_budget,
                timeline=inferred_timeline,
                site_visit_requested="visit" in lower_t or "sunday" in lower_t,
                email=None,
                property_type=inferred_property
            )

            # DB Write
            with SessionLocal() as db:
                if caller_phone:
                    # Check if lead already exists
                    lead = db.query(models.Lead).filter(models.Lead.phone == caller_phone).first()
                    if not lead:
                        lead = models.Lead(
                            id=generate_lead_id(db),
                            name=inferred_name,
                            phone=caller_phone,
                            email=None,
                            property_type=inferred_property or "Apartment",
                            location=inferred_location or "Chennai",
                            budget=inferred_budget or "Not specified",
                            timeline=inferred_timeline or "Browsing",
                            score=score,
                            score_category=score_category,
                            status=models.LeadStatus.call_completed
                        )
                        db.add(lead)
                        db.commit()
                        db.refresh(lead)
                    
                    # Create Call log
                    new_call = models.Call(
                        id=generate_call_id(db),
                        lead_id=lead.id,
                        duration_seconds=duration,
                        caller_phone=caller_phone,
                        recording_url="http://demo-recording.s3.amazonaws.com/call_rec.mp3",
                        transcript=json.dumps([{"speaker": "System", "text": t} for t in transcript_accumulator]),
                        ai_summary="Incoming phone call conversation successfully completed with AI receptionist assistant.",
                        ai_intent="Site Visit Inquiry" if "visit" in lower_t else "General Pricing Enquiry",
                        score_at_call=score,
                        category=score_category
                    )
                    db.add(new_call)
                    db.commit()
                    print(f"Log written. Call ID: {new_call.id}, Lead ID: {lead.id}")

    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        print("WebSocket voice stream connection closed.")
