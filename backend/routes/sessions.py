from fastapi import APIRouter, Depends, HTTPException, Query
import aiosqlite
import logging
from typing import List
from ..database.connection import get_db
from ..models.session import Session, SessionCreate, SessionUpdate, SessionWithPreview
from ..services import session_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


def session_to_preview(
    session: Session,
    message_count: int = 0,
    preview: str = "",
    summary: str | None = None,
) -> SessionWithPreview:
    """Convert a Session to SessionWithPreview with computed fields."""
    from datetime import datetime

    # Compute relative time string
    time_str = ""
    if session.last_message_at:
        diff = datetime.utcnow() - session.last_message_at
        if diff.days == 0:
            hours = diff.seconds // 3600
            if hours == 0:
                minutes = diff.seconds // 60
                time_str = f"{minutes} min ago" if minutes > 0 else "Just now"
            else:
                time_str = f"{hours}h ago"
        elif diff.days == 1:
            time_str = "Yesterday"
        elif diff.days < 7:
            time_str = f"{diff.days} days ago"
        else:
            time_str = session.last_message_at.strftime("%b %d")
    elif session.created_at:
        diff = datetime.utcnow() - session.created_at
        if diff.days == 0:
            time_str = "Today"
        elif diff.days == 1:
            time_str = "Yesterday"
        else:
            time_str = session.created_at.strftime("%b %d")

    return SessionWithPreview(
        **session.model_dump(),
        message_count=message_count,
        preview=preview,
        time=time_str,
        summary=summary,
    )


@router.post("/", response_model=Session)
async def create_session(
    session_data: SessionCreate,
    db: aiosqlite.Connection = Depends(get_db)
):
    """Create a new session."""
    return await session_service.create_session(db, session_data)


@router.get("/", response_model=List[SessionWithPreview])
async def list_sessions(
    user_id: str = Query(..., description="User ID to filter sessions"),
    include_archived: bool = Query(False, description="Include archived sessions"),
    db: aiosqlite.Connection = Depends(get_db)
):
    """List all sessions for a user, with previews."""
    sessions = await session_service.get_sessions_by_user(db, user_id, include_archived)
    logger.info(f"[SESSION-BACKEND] list_sessions — user_id={user_id!r}, include_archived={include_archived}, returning {len(sessions)} sessions")
    for s in sessions:
        logger.info(f"[SESSION-BACKEND]   session: id={s.id}, title={s.title_custom or s.title_auto!r}, is_archived={s.is_archived}, updated_at={s.updated_at}")

    from ..services import message_service, summary_service

    result = []
    for session in sessions:
        messages = []
        preview = ""
        summary = None
        try:
            # Get message count and first message preview
            messages = await message_service.get_messages_by_session(db, session.id, limit=1)
            first_msg = messages[0] if messages else None
            preview_text = ""
            if first_msg:
                # Voice messages: use transcript from voice_note; text messages: use content
                if first_msg.message_type == "voice" and first_msg.voice_note:
                    preview_text = first_msg.voice_note.transcript or ""
                else:
                    preview_text = first_msg.content or ""
            preview = preview_text[:50] if preview_text else ""

            # Get existing summary, if any
            summary = await summary_service.get_summary(db, session.id)
        except Exception as e:
            logger.warning(f"[SESSION-BACKEND] list_sessions — failed to get preview/summary for session {session.id}: {e}")
            # Keep defaults: messages=[], preview="", summary=None

        result.append(session_to_preview(session, len(messages), preview, summary))

    return result


@router.get("/{session_id}", response_model=Session)
async def get_session(
    session_id: str,
    db: aiosqlite.Connection = Depends(get_db)
):
    """Get a session by ID."""
    session = await session_service.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.patch("/{session_id}", response_model=Session)
async def update_session(
    session_id: str,
    updates: SessionUpdate,
    db: aiosqlite.Connection = Depends(get_db)
):
    """Update session fields."""
    session = await session_service.update_session(db, session_id, updates)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.delete("/{session_id}")
async def delete_session(
    session_id: str,
    db: aiosqlite.Connection = Depends(get_db)
):
    """Soft delete a session."""
    success = await session_service.soft_delete_session(db, session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"success": True, "message": "Session deleted"}
