import asyncio
import logging
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

# Configure root logger so all `logging.getLogger(__name__)` calls output.
# level=INFO ensures [SESSION-BACKEND], [TTS-BACKEND] etc. are visible.
logging.basicConfig(level=logging.INFO, format="%(name)s — %(levelname)s — %(message)s")

from .routes import sessions, messages, users, health, chat, memory, tts
from .database.init_db import init_database
from .services import luna_service, tts_service

# Load .env before reading CORS_ORIGINS so it can be set there
load_dotenv(override=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and warm caches on startup."""
    await init_database()
    # Warm the LUNA system prompt cache
    try:
        await luna_service.load_active_system_prompt()
    except Exception:
        pass  # non-fatal — will use default prompt
    # Warm the Piper TTS voice model in the background (takes ~11s, done once)
    asyncio.create_task(asyncio.to_thread(tts_service.warm_voice))
    yield


app = FastAPI(
    title="LUNA API",
    version="0.1.0",
    description="Backend API for LUNA mental health support app",
    lifespan=lifespan
)

# CORS — origins from environment (default to localhost for local dev)
CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for voice note playback
storage_path = Path(__file__).parent / "storage"
storage_path.mkdir(parents=True, exist_ok=True)
app.mount("/storage", StaticFiles(directory=str(storage_path)), name="storage")

# Include routers
app.include_router(health.router)
app.include_router(users.router)
app.include_router(sessions.router)
app.include_router(messages.router)
app.include_router(chat.router)
app.include_router(memory.router)
app.include_router(tts.router)


@app.get("/")
async def root():
    return {
        "message": "LUNA API",
        "version": "0.1.0",
        "status": "running"
    }
