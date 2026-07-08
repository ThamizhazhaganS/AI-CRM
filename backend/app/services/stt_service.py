import json
import urllib.request
import struct
import asyncio
from app.config import GROQ_API_KEY

class STTService:
    API_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
    MODEL = "whisper-large-v3"

    @staticmethod
    def _ulaw_to_linear(u_val: int) -> int:
        """Converts G.711 u-law byte to 16-bit linear PCM sample."""
        u_val = ~u_val & 0xFF
        sign = -1 if (u_val & 0x80) else 1
        exponent = (u_val & 0x70) >> 4
        mantissa = u_val & 0x0F
        sample = (mantissa << 3) + 132
        sample <<= exponent
        return sign * (sample - 132)

    @classmethod
    def _ulaw_bytes_to_pcm_wav(cls, ulaw_data: bytes) -> bytes:
        """Converts raw G.711 u-law bytes to a 16-bit PCM mono 8000Hz WAV in memory."""
        pcm_data = bytearray()
        for b in ulaw_data:
            sample = cls._ulaw_to_linear(b)
            pcm_data.extend(struct.pack("<h", sample))

        num_channels = 1
        sample_rate = 8000
        bits_per_sample = 16
        byte_rate = sample_rate * num_channels * (bits_per_sample // 8)
        block_align = num_channels * (bits_per_sample // 8)
        data_size = len(pcm_data)
        chunk_size = 36 + data_size

        header = struct.pack(
            "<4sI4s4sIHHIIHH4sI",
            b"RIFF", chunk_size, b"WAVE", b"fmt ", 16, 1, num_channels,
            sample_rate, byte_rate, block_align, bits_per_sample, b"data", data_size
        )
        return bytes(header + pcm_data)

    @classmethod
    async def transcribe_audio(cls, ulaw_data: bytes) -> str:
        """
        Sends the u-law audio buffer to Groq's Whisper API for transcription.
        """
        if not GROQ_API_KEY:
            print("STT Error: GROQ_API_KEY is not configured.")
            return ""

        if not ulaw_data or len(ulaw_data) < 320: # Less than 40ms of audio
            return ""

        wav_bytes = cls._ulaw_bytes_to_pcm_wav(ulaw_data)

        def make_request():
            boundary = "----GroqTranscriptionBoundary"
            
            # Construct multipart form-data payload in-memory
            body_parts = []
            
            # Model parameter
            body_parts.append(f"--{boundary}")
            body_parts.append('Content-Disposition: form-data; name="model"')
            body_parts.append("")
            body_parts.append(cls.MODEL)
            
            # File parameter
            body_parts.append(f"--{boundary}")
            body_parts.append('Content-Disposition: form-data; name="file"; filename="audio.wav"')
            body_parts.append('Content-Type: audio/wav')
            body_parts.append("")
            
            # We encode headers as ascii/utf-8, then append raw wav bytes
            body = b"\r\n".join([p.encode("utf-8") for p in body_parts]) + b"\r\n" + wav_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

            req = urllib.request.Request(
                cls.API_URL,
                data=body,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": f"multipart/form-data; boundary={boundary}",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                },
                method="POST"
            )
            try:
                with urllib.request.urlopen(req, timeout=10) as response:
                    res_data = json.loads(response.read().decode("utf-8"))
                    return res_data.get("text", "")
            except Exception as e:
                print(f"Groq STT Request Error: {e}")
                return ""

        return await asyncio.to_thread(make_request)
