import asyncio
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from ..services import tts_service

router = APIRouter(prefix="/api/tts", tags=["tts"])


class TTSRequest(BaseModel):
    message_id: str
    content: str


@router.post("")
async def generate_tts(req: TTSRequest):
    """Kick off TTS generation. Returns immediately with status."""
    if not req.content:
        raise HTTPException(400, "content is required")

    cached = tts_service.get_cached_path(req.message_id)
    if cached:
        return {"status": "ready", "audio_url": f"/{cached}"}

    asyncio.create_task(tts_service.generate_tts(req.message_id, req.content))
    return {"status": "generating", "audio_url": None}


@router.get("/{message_id}")
async def get_tts_audio(message_id: str):
    """Stream cached TTS audio, or 404 if not yet ready."""
    path = tts_service.get_cached_path(message_id)
    if not path:
        raise HTTPException(404, "Audio not ready")

    full_path = tts_service.get_tts_dir() / f"{message_id}.wav"
    return FileResponse(full_path, media_type="audio/wav", filename=f"{message_id}.wav")
