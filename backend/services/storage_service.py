import aiosqlite
import uuid
import shutil
from pathlib import Path
from typing import Optional
from datetime import datetime
from ..models.voice_note import VoiceNote, VoiceNoteCreate, VoiceNoteUpdate


# Base storage directory for voice notes
STORAGE_DIR = Path(__file__).parent.parent / "storage" / "voice_notes"


def get_storage_dir() -> Path:
    """Get or create the voice notes storage directory."""
    storage = STORAGE_DIR
    storage.mkdir(parents=True, exist_ok=True)
    return storage


async def save_voice_note_file(audio_data: bytes, extension: str = "webm") -> str:
    """Save audio bytes to a file and return the relative file path."""
    filename = f"{uuid.uuid4()}.{extension}"
    file_path = get_storage_dir() / filename
    file_path.write_bytes(audio_data)
    # Return relative path from backend root
    return str(Path("storage") / "voice_notes" / filename)


async def delete_voice_note_file(file_path: str) -> bool:
    """Delete a voice note file from disk."""
    try:
        full_path = Path(__file__).parent.parent / file_path
        if full_path.exists():
            full_path.unlink()
            return True
        return False
    except Exception:
        return False


async def create_voice_note(
    db: aiosqlite.Connection,
    voice_data: VoiceNoteCreate
) -> VoiceNote:
    """Create a voice note record."""
    voice_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    await db.execute(
        """
        INSERT INTO voice_notes
        (id, message_id, file_path, mime_type, duration_seconds, transcript, sample_rate, language, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            voice_id,
            voice_data.message_id,
            voice_data.file_path,
            voice_data.mime_type,
            voice_data.duration_seconds,
            voice_data.transcript,
            voice_data.sample_rate,
            voice_data.language,
            now
        )
    )
    await db.commit()

    cursor = await db.execute("SELECT * FROM voice_notes WHERE id = ?", (voice_id,))
    row = await cursor.fetchone()
    return VoiceNote(**dict(row))


async def get_voice_note_by_message(
    db: aiosqlite.Connection,
    message_id: str
) -> Optional[VoiceNote]:
    """Get voice note by message ID."""
    cursor = await db.execute(
        "SELECT * FROM voice_notes WHERE message_id = ? AND deleted_at IS NULL",
        (message_id,)
    )
    row = await cursor.fetchone()
    if row:
        return VoiceNote(**dict(row))
    return None


async def update_voice_note(
    db: aiosqlite.Connection,
    voice_id: str,
    updates: VoiceNoteUpdate
) -> Optional[VoiceNote]:
    """Update voice note fields (transcript, duration)."""
    update_fields = []
    values = []

    if updates.transcript is not None:
        update_fields.append("transcript = ?")
        values.append(updates.transcript)
    if updates.duration_seconds is not None:
        update_fields.append("duration_seconds = ?")
        values.append(updates.duration_seconds)

    if not update_fields:
        cursor = await db.execute("SELECT * FROM voice_notes WHERE id = ?", (voice_id,))
        row = await cursor.fetchone()
        return VoiceNote(**dict(row)) if row else None

    values.append(voice_id)
    await db.execute(
        f"UPDATE voice_notes SET {', '.join(update_fields)} WHERE id = ?",
        values
    )
    await db.commit()

    cursor = await db.execute("SELECT * FROM voice_notes WHERE id = ?", (voice_id,))
    row = await cursor.fetchone()
    return VoiceNote(**dict(row)) if row else None


async def soft_delete_voice_note(db: aiosqlite.Connection, voice_id: str) -> bool:
    """Soft delete a voice note."""
    now = datetime.utcnow().isoformat()
    cursor = await db.execute(
        "UPDATE voice_notes SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL",
        (now, voice_id)
    )
    await db.commit()
    return cursor.rowcount > 0
