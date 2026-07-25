from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from .routes import sessions, messages, users, health
from .database.init_db import init_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    await init_database()
    yield


app = FastAPI(
    title="LUNA API",
    version="0.1.0",
    description="Backend API for LUNA mental health support app",
    lifespan=lifespan
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
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


@app.get("/")
async def root():
    return {
        "message": "LUNA API",
        "version": "0.1.0",
        "status": "running"
    }
