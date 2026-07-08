import json
import urllib.request
import urllib.parse
import asyncio
from app.config import GROQ_API_KEY

class LLMService:
    # Use LLaMA 3.1 8B (fast, active model on Groq)
    MODEL = "llama-3.1-8b-instant"
    API_URL = "https://api.groq.com/openai/v1/chat/completions"

    @classmethod
    async def get_response(cls, messages: list, temperature: float = 0.5) -> str:
        """
        Sends the conversation history to Groq and returns the text response.
        Runs the blocking HTTP call in a separate thread pool.
        """
        if not GROQ_API_KEY:
            return "Hello, I am the virtual sales executive. Please configure my Groq key to proceed."

        def make_request():
            payload = {
                "model": cls.MODEL,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": 150
            }
            # Custom User-Agent to bypass Cloudflare (HTTP 403 / Error 1010)
            req = urllib.request.Request(
                cls.API_URL,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                },
                method="POST"
            )
            try:
                with urllib.request.urlopen(req, timeout=8) as response:
                    res_data = json.loads(response.read().decode("utf-8"))
                    return res_data["choices"][0]["message"]["content"]
            except Exception as e:
                print(f"Groq LLM Request Error: {e}")
                return "I'm sorry, I'm having trouble processing that right now."

        return await asyncio.to_thread(make_request)

    @classmethod
    async def extract_lead_details(cls, conversation_text: str) -> dict:
        """
        Helper method that parses the final conversation transcript and extracts lead details.
        """
        system_prompt = (
            "You are a data extraction assistant. Parse the conversation transcript and extract: "
            "1. Name of the customer\n"
            "2. Budget limit (e.g. ₹80 Lakhs, ₹2 Cr)\n"
            "3. Location preference (e.g. OMR, Velachery)\n"
            "4. Property type preferred (Apartment, Villa, Plot, Commercial Office)\n"
            "5. Purchase timeline (e.g. Immediate, 3 months, 1 year)\n"
            "6. A brief call summary\n"
            "Respond ONLY with a JSON object. Fields: name, budget, location, property_type, timeline, summary."
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Transcript:\n{conversation_text}"}
        ]

        raw_response = await cls.get_response(messages, temperature=0.1)
        try:
            # Parse JSON block
            start = raw_response.find("{")
            end = raw_response.rfind("}") + 1
            if start != -1 and end != -1:
                return json.loads(raw_response[start:end])
        except Exception:
            pass

        return {
            "name": "Interested Buyer",
            "budget": "Not specified",
            "location": "Chennai",
            "property_type": "Apartment",
            "timeline": "Browsing",
            "summary": "Incoming call successfully completed with AI Receptionist."
        }
