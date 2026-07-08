import json
import urllib.request
import asyncio
from app.config import ELEVENLABS_API_KEY

class TTSService:
    VOICE_ID = "EXAVITQu4vr4xnSDxMaL"  # ElevenLabs "Bella" — professional female voice (available on free tier)

    @classmethod
    async def generate_speech(cls, text: str) -> bytes:
        """
        Sends text to ElevenLabs TTS API.
        Returns raw G.711 u-law 8000Hz audio bytes (Twilio compatible).
        """
        if not ELEVENLABS_API_KEY or len(ELEVENLABS_API_KEY) < 20:
            print("TTS Warning: ELEVENLABS_API_KEY not configured.")
            return b""

        api_url = (
            f"https://api.elevenlabs.io/v1/text-to-speech/{cls.VOICE_ID}"
            f"?output_format=ulaw_8000"
        )

        def make_request():
            payload = {
                "text": text,
                "model_id": "eleven_turbo_v2",   # Faster, lower latency for real-time calls
                "voice_settings": {
                    "stability": 0.55,
                    "similarity_boost": 0.75,
                    "style": 0.2,
                    "use_speaker_boost": True
                }
            }
            req = urllib.request.Request(
                api_url,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "xi-api-key": ELEVENLABS_API_KEY,
                    "Content-Type": "application/json",
                    "Accept": "audio/basic"   # u-law format
                },
                method="POST"
            )
            try:
                with urllib.request.urlopen(req, timeout=15) as response:
                    audio_bytes = response.read()
                    print(f"[TTS] Generated {len(audio_bytes)} bytes of u-law audio.")
                    return audio_bytes
            except urllib.error.HTTPError as e:
                print(f"[TTS] HTTPError {e.code}: {e.read().decode()}")
                return b""
            except Exception as e:
                print(f"[TTS] Error: {e}")
                return b""

        return await asyncio.to_thread(make_request)

