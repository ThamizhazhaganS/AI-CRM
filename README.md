# EstateAI - AI Voice Receptionist & Real Estate CRM 🏠🤖

EstateAI is an enterprise-grade AI-powered conversational receptionist and Customer Relationship Management (CRM) platform designed specifically for real estate builders and developers (e.g., ABC Builders). 

The platform intercepts incoming client calls, guides customers through conversational property qualification (capturing budget, preferred location, size/configuration, and timeline), automatically scores and segments leads, schedules Sunday morning site visits, and displays real-time analytics in a modern dashboard.

---

## 🚀 Key Features

*   **AI Voice Receptionist ("Kavitha")**: Interactive, low-latency voice calling powered by Twilio WebSockets, Groq LLM, Groq Whisper (STT), and ElevenLabs (TTS).
*   **Dynamic Lead Scoring**: Auto-scores incoming leads from 0 to 100 based on buyer intent, urgency, and purchase criteria.
*   **Stunning Dashboard UI**: High-fidelity dark mode CRM built with Next.js, featuring glassmorphism elements, micro-animations, and clean charts.
*   **Timeframe-Reactive Analytics**: Interactive date controls (7 days, 30 days, 6 months) updating caller volumes, site visit booking statistics, and cost savings instantly.
*   **Interactive Appointment Calendar**: A calendar allowing managers to filter, reschedule, and track upcoming client site visits and callbacks.
*   **Knowledge Base Listings**: A persistent real estate portfolio manager where agents can add/remove active project structures (Villas, Apartments, Commercial properties) which the AI agent can reference in real-time calls.

---

## 🛠️ Tech Stack

### Frontend (Next.js Dashboard)
*   **Framework**: Next.js 15 (App Router)
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS
*   **Icons**: Lucide React
*   **Visualization**: Recharts

### Backend (AI & Telephony Engine)
*   **Framework**: FastAPI (Python 3.10+)
*   **Database**: SQLite (local development) / Supabase PostgreSQL (production)
*   **ORM**: SQLAlchemy
*   **Telephony integration**: Twilio Webhooks & WebSocket Audio Media Streams
*   **LLM Orchestration**: Groq API (Llama 3.1 70B)
*   **Transcription (STT)**: Groq Whisper API
*   **Voice Synthesis (TTS)**: ElevenLabs API (Polly fallback)

---

## 📦 Directory Structure

```text
├── app/                  # Next.js 15 frontend application
│   ├── dashboard/        # Dashboard layout & pages (analytics, appointments, leads)
│   └── lib/              # Frontend API client library (api.ts)
├── backend/              # FastAPI python backend application
│   ├── app/
│   │   ├── routers/      # API routers (voice_agent.py, leads.py, calls.py, settings.py)
│   │   ├── services/     # Third-party integrations (llm_service.py, stt_service.py, tts_service.py)
│   │   ├── models.py     # SQLAlchemy database schemas
│   │   └── database.py   # Database connection and session setup
│   ├── requirements.txt  # Python package requirements
│   └── .env.example      # Example environment variables template
├── SETUP.md              # Startup runbook
└── README.md             # Project documentation
```

---

## ⚙️ Setup & Installation

Detailed instructions to run the application locally can be found in [SETUP.md](file:///d:/TRY%201%20Call/SETUP.md).

### Quickstart Prerequisites

1. Create a `backend/.env` file with your credentials:
   ```env
   DATABASE_URL=sqlite:///./estateai.db
   GROQ_API_KEY=your_groq_api_key
   ELEVENLABS_API_KEY=your_elevenlabs_key
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   TWILIO_PHONE_NUMBER=your_twilio_phone
   ```

2. Run the application in production mode:
   ```bash
   npm run prod
   ```

3. Expose the local backend (Port 8000) using ngrok:
   ```bash
   ngrok http 8000
   ```
