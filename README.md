# Luna — AI Mental Wellness Companion

Luna is a personal AI mental wellness companion with real-time streaming chat, voice notes, text-to-speech, and session management — all wrapped in a calming, customizable interface.

**Live app:** `https://luna-nine-virid.vercel.app`

---

## Features

- **Real-time streaming chat** — Messages stream token-by-token from Groq's Llama 3.3 70B
- **Voice notes** — Record and send audio; Whisper large-v3 turbo transcribes automatically
- **Listen to Luna** — Piper TTS reads Luna's responses aloud with a single click
- **Session management** — Create, rename, pin, archive, and delete conversations
- **Custom gradient backgrounds** — Animated grainient effect with user-configurable colors
- **Light / Dark / System themes**
- **Memory** — Toggle context recall across sessions
- **Multilingual** — English, Spanish, French, German, Portuguese

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, React Router, Zustand, Tailwind CSS |
| Backend | FastAPI, Uvicorn, aiosqlite |
| AI (Chat) | Groq API — Llama 3.3 70B |
| AI (Transcription) | Groq API — Whisper large-v3 turbo |
| AI (TTS) | Piper (ONNX) via `piper-tts` |
| Database | SQLite |
| Deployment | Vercel (frontend), Render (backend) |

---

## Architecture

```
Browser
  │
  ├──► Vercel (static SPA)
  │         │
  │         └──► Render (FastAPI + uvicorn)
  │                   │
  │                   ├──► Groq API (chat + Whisper)
  │                   ├──► Piper TTS (local ONNX)
  │                   └──► SQLite (sessions, messages, users)
  │
  └──► Local storage (messages + sessions backup via zustand persist)
```

---

## Local Development Setup

### Prerequisites

- Node.js 18+
- Python 3.11+
- [Groq API key](https://console.groq.com) (free tier available)
- Piper TTS model (auto-downloaded on first run, or place `en_US-lessac-medium.onnx` in `backend/storage/piper_models/`)

### 1. Clone & install frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
VITE_API_URL=http://localhost:8000
```

Start dev server:

```bash
npm run dev
```

### 2. Install backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
GROQ_API_KEY=your_groq_api_key_here
PORT=8000
```

### 3. Run backend

```bash
cd backend
python -m uvicorn backend.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. The FastAPI docs are at `http://localhost:8000/docs`.

### 4. Run frontend (separate terminal)

```bash
cd frontend
npm run dev
```

Frontend at `http://localhost:5173` proxies API requests to `http://localhost:8000`.

---

## Deployment

### Frontend — Vercel

1. Go to [vercel.com](https://vercel.com) → "Add New" → "Project"
2. Import `Krish-Puri/LUNA`
3. Set **Root Directory** to `frontend`
4. Set **Build Command** to `npm run build`
5. Set **Output Directory** to `dist`
6. Add environment variable:
   - `VITE_API_URL` = `https://your-backend-host.onrender.com` (your Render backend URL)
7. Deploy

> **Note:** After deploying the backend, update the `VITE_API_URL` in Vercel to match your actual backend URL and redeploy.

### Backend — Render

1. Go to [render.com](https://render.com) → "New" → "Web Service"
2. Connect your GitHub repo, set **Root Directory** to `backend`
3. Set **Runtime** to `Docker`
4. Add environment variables:
   - `GROQ_API_KEY` = your Groq API key
   - `CORS_ORIGINS` = `https://luna-nine-virid.vercel.app,http://localhost:5173`
   - `PORT` = `8080` (set automatically by Render)
5. Deploy

> **Free tier note:** Render's free tier spins down after 15 minutes of inactivity. The first request after idle may take 30–60 seconds to wake the container. For always-on hosting, consider Railway or Render's paid plan.

### Updating CORS

After your Vercel frontend deploys, copy the Vercel URL and add it to Render's `CORS_ORIGINS` environment variable:

```
https://luna-nine-virid.vercel.app,http://localhost:5173
```

Render auto-redeploys when you save the environment variable.

---

## Environment Variables

### Backend (`backend/.env` or Render dashboard)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GROQ_API_KEY` | Yes | — | API key from [console.groq.com](https://console.groq.com) |
| `PORT` | No | `8080` | Port for uvicorn |
| `CORS_ORIGINS` | No | `localhost:5173` | Comma-separated list of allowed origins |
| `DATABASE_PATH` | No | `luna.db` | Path to SQLite database file |
| `LUNA_MODEL` | No | `llama-3.3-70b-versatile` | Groq chat model |
| `WHISPER_MODEL` | No | `whisper-large-v3-turbo` | Groq transcription model |

### Frontend (`frontend/.env.local`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | No | `http://localhost:8000` | Backend API base URL |

---

## Project Structure

```
LUNA/
├── backend/
│   ├── main.py                  # FastAPI app + lifespan events
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── routes/                  # API endpoints
│   │   ├── chat.py              # /api/chat/session/{id}/stream
│   │   ├── sessions.py          # /api/sessions
│   │   ├── messages.py          # /api/messages
│   │   ├── users.py             # /api/users
│   │   ├── tts.py               # /api/tts/{id}
│   │   ├── voice.py             # /api/voice
│   │   └── memory.py            # /api/memory
│   ├── services/
│   │   ├── luna_service.py      # Groq chat integration
│   │   ├── tts_service.py       # Piper TTS generation
│   │   └── user_service.py      # User/preferences CRUD
│   ├── database/
│   │   ├── connection.py        # aiosqlite singleton
│   │   └── init_db.py           # Schema + seed data
│   ├── models/                  # Pydantic models
│   └── storage/
│       ├── piper_models/        # TTS ONNX model (gitignored)
│       ├── voice_notes/         # Uploaded audio files
│       └── tts/                 # Generated TTS WAV files
├── frontend/
│   ├── src/
│   │   ├── pages/SessionsPage.jsx   # Main chat page
│   │   ├── components/
│   │   │   ├── chat/            # ChatArea, InputComposer, VoiceControls
│   │   │   ├── layout/          # Sidebar, Header, MainContent
│   │   │   ├── settings/        # SettingsPanel, SessionMenuPanel
│   │   │   └── ui/              # Buttons, Avatar, Grainient, AboutLuna
│   │   ├── store/               # Zustand stores
│   │   └── api/                 # API client functions
│   └── vite.config.js
└── README.md
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/chat/session/{id}/stream` | Stream chat responses (SSE) |
| `GET` | `/api/sessions/` | List user sessions |
| `POST` | `/api/sessions/` | Create session |
| `PATCH` | `/api/sessions/{id}` | Update session |
| `DELETE` | `/api/sessions/{id}` | Delete session |
| `GET` | `/api/messages/{session_id}` | Get session messages |
| `POST` | `/api/voice` | Upload + transcribe voice note |
| `POST` | `/api/tts/{id}` | Generate TTS audio |
| `GET` | `/api/tts/status/{id}` | Poll TTS generation status |
| `POST` | `/api/users/get-or-create` | Get or create user by client UUID |
| `GET` | `/api/users/{id}/preferences` | Get user preferences |
| `PATCH` | `/api/users/{id}/preferences` | Update preferences |
| `GET` | `/api/memory/` | Search session memories |

---

## Storage

Voice notes and TTS audio files are stored on the Render ephemeral filesystem. They are **lost on container cold-starts** (free tier). For production, mount a persistent Render Disk at `/app/backend/storage` or migrate to a cloud blob store (S3, Cloudflare R2).

Sessions and messages are persisted in SQLite and also backed up to browser `localStorage` via Zustand persist middleware, so conversations survive page reloads even if the backend storage is wiped.

---

## License

MIT
