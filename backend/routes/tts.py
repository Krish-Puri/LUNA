import asyncio
import logging
import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from ..services import tts_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tts", tags=["tts"])


class TTSRequest(BaseModel):
    message_id: str
    content: str


@router.post("")
async def generate_tts(req: TTSRequest):
    """
    Kick off TTS generation. Returns immediately.
    Checks state to avoid re-synthesizing already-ready or in-progress messages.
    """
    if not req.content:
        raise HTTPException(400, "content is required")

    message_id = req.message_id
    state = tts_service.get_generation_state(message_id)
    logger.info(f"[TTS-ROUTE] POST {message_id} — current state: {state}, content length: {len(req.content)}")

    if state == 'ready':
        return {"status": "ready", "audio_url": f"/storage/tts/{message_id}.wav"}
    if state == 'generating':
        return {"status": "generating", "audio_url": None}

    # state == 'idle' or 'failed' — kick off new generation
    asyncio.create_task(tts_service.generate_tts(message_id, req.content))
    return {"status": "generating", "audio_url": None}


@router.get("/{message_id}")
async def get_tts_audio(message_id: str):
    """
    Serve cached TTS audio only when generation is complete (state == ready).
    Returns 202 + status JSON while generation is in progress.
    Returns 503 if generation has failed.
    """
    state = tts_service.get_generation_state(message_id)
    logger.info(f"[TTS-ROUTE] GET {message_id} — state: {state}")

    if state == 'idle' or state == 'generating':
        return JSONResponse(
            {"status": state},
            status_code=202,
            headers={"Cache-Control": "no-cache"},
        )

    if state == 'failed':
        raise HTTPException(503, "TTS generation failed")

    # state == 'ready' — serve the file
    full_path = tts_service.get_tts_dir() / f"{message_id}.wav"
    if not full_path.exists():
        raise HTTPException(404, "Audio file not found on disk")

    file_size = os.path.getsize(full_path)
    logger.info(f"[TTS-ROUTE] GET {message_id} — serving {file_size} bytes")

    async def file_iterator():
        with open(full_path, 'rb') as f:
            while chunk := f.read(65536):
                yield chunk

    return StreamingResponse(
        file_iterator(),
        media_type="audio/wav",
        headers={
            "Content-Length": str(file_size),
            "Content-Disposition": f'attachment; filename="{message_id}.wav"',
            "Accept-Ranges": "none",
        }
    )
