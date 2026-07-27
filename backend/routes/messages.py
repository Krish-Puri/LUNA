from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
import aiosqlite
from typing import List, Optional
import uuid
from datetime import datetime
from ..database.connection import get_db
from ..models.message import Message, MessageCreate, MessageUpdate
from ..models.voice_note import VoiceNote, VoiceNoteCreate, VoiceNoteUpdate
from ..services import message_service, session_service, storage_service, groq_service

router = APIRouter(prefix="/api/messages", tags=["messages"])


@router.post("/session/{session_id}", response_model=Message)
async def create_message(
    session_id: str,
    message_data: MessageCreate,
    db: aiosqlite.Connection = Depends(get_db)
):
    """Create a new text message in a session."""
    # Verify session exists
    session = await session_service.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Auto-set session_id from path
    message_data.session_id = session_id
    message = await message_service.create_message(db, message_data)

    # Update session last_message_at
    await session_service.update_last_message_time(db, session_id)

    return message


@router.get("/session/{session_id}", response_model=List[Message])
async def list_messages(
    session_id: str,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: aiosqlite.Connection = Depends(get_db)
):
    """List all messages in a session."""
    return await message_service.get_messages_by_session(db, session_id, limit, offset)


@router.get("/{message_id}", response_model=Message)
async def get_message(
    message_id: str,
    db: aiosqlite.Connection = Depends(get_db)
):
    """Get a message by ID."""
    message = await message_service.get_message(db, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    return message


@router.patch("/{message_id}", response_model=Message)
async def update_message(
    message_id: str,
    updates: MessageUpdate,
    db: aiosqlite.Connection = Depends(get_db)
):
    """Update a message (content, token_count, latency_ms, ai_model)."""
    message = await message_service.update_message(db, message_id, updates)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    return message


@router.delete("/{message_id}")
async def delete_message(
    message_id: str,
    db: aiosqlite.Connection = Depends(get_db)
):
    """Soft delete a message."""
    success = await message_service.soft_delete_message(db, message_id)
    if not success:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"success": True, "message": "Message deleted"}


# --- Voice Note Endpoints ---

@router.post("/session/{session_id}/transcribe")
async def transcribe_voice_note(
    session_id: str,
    file: UploadFile = File(...),
    language: str = Form("en"),
    db: aiosqlite.Connection = Depends(get_db)
):
    """
    Save audio file and transcribe it via Whisper. Returns { file_path, transcript }.
    Does NOT create any DB records — callers handle that on Send.
    """
    session = await session_service.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    mime_to_ext = {
        "audio/webm": "webm",
        "audio/mp4": "m4a",
        "audio/mpeg": "mp3",
        "audio/wav": "wav",
        "audio/ogg": "ogg",
    }
    extension = mime_to_ext.get(file.content_type, "webm")

    audio_bytes = await file.read()
    file_path = await storage_service.save_voice_note_file(audio_bytes, extension)

    transcript = await groq_service.transcribe_audio(
        audio_bytes, file.filename or "audio.webm", language
    )

    return {"file_path": file_path, "transcript": transcript}


@router.post("/session/{session_id}/voice", response_model=Message)
async def create_voice_message(
    session_id: str,
    file: UploadFile = File(...),
    duration_seconds: Optional[float] = Form(None),
    language: str = Form("en"),
    transcript: Optional[str] = Form(None),
    db: aiosqlite.Connection = Depends(get_db)
):
    """
    Upload a voice note: saves file, creates message + voice_note record.
    """
    # Verify session exists
    session = await session_service.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Determine extension from mime type
    mime_to_ext = {
        "audio/webm": "webm",
        "audio/mp4": "m4a",
        "audio/mpeg": "mp3",
        "audio/wav": "wav",
        "audio/ogg": "ogg",
    }
    extension = mime_to_ext.get(file.content_type, "webm")

    # Read and save file
    audio_bytes = await file.read()
    file_path = await storage_service.save_voice_note_file(audio_bytes, extension)

    # Create message
    message_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    await db.execute(
        """
        INSERT INTO messages (id, session_id, role, content, message_type, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (message_id, session_id, "user", None, "voice", now)
    )
    await db.commit()

    # Create voice note record
    voice_note_data = VoiceNoteCreate(
        message_id=message_id,
        file_path=file_path,
        mime_type=file.content_type,
        duration_seconds=duration_seconds,
        language=language,
        transcript=transcript,
    )
    await storage_service.create_voice_note(db, voice_note_data)

    # Update session last_message_at
    await session_service.update_last_message_time(db, session_id)

    # Fetch and return created message
    cursor = await db.execute("SELECT * FROM messages WHERE id = ?", (message_id,))
    row = await cursor.fetchone()
    return Message(**dict(row))


@router.get("/{message_id}/voice", response_model=VoiceNote)
async def get_voice_note(
    message_id: str,
    db: aiosqlite.Connection = Depends(get_db)
):
    """Get voice note for a message."""
    voice = await storage_service.get_voice_note_by_message(db, message_id)
    if not voice:
        raise HTTPException(status_code=404, detail="Voice note not found")
    return voice


@router.patch("/{message_id}/voice/transcript", response_model=VoiceNote)
async def update_transcript(
    message_id: str,
    transcript: str = Form(...),
    db: aiosqlite.Connection = Depends(get_db)
):
    """Update the transcript for a voice note (after transcription service runs)."""
    voice = await storage_service.get_voice_note_by_message(db, message_id)
    if not voice:
        raise HTTPException(status_code=404, detail="Voice note not found")

    # Also update the message content
    await message_service.update_message(
        db, message_id, MessageUpdate(content=transcript)
    )

    updated = await storage_service.update_voice_note(
        db, voice.id, VoiceNoteUpdate(transcript=transcript)
    )
    return updated
