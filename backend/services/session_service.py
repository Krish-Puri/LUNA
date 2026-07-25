import aiosqlite
from typing import List, Optional
from datetime import datetime
from ..models.session import Session, SessionCreate, SessionUpdate


async def create_session(db: aiosqlite.Connection, session_data: SessionCreate) -> Session:
    """Create a new session."""
    import uuid
    session_id = session_data.id or str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    await db.execute(
        """
        INSERT INTO sessions (id, user_id, title_auto, title_custom, created_at, updated_at, last_message_at, is_archived)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            session_id,
            session_data.user_id,
            session_data.title_auto,
            session_data.title_custom,
            now,
            now,
            None,
            False
        )
    )
    await db.commit()

    cursor = await db.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
    row = await cursor.fetchone()
    return Session(**dict(row))


async def get_session(db: aiosqlite.Connection, session_id: str) -> Optional[Session]:
    """Get a session by ID."""
    cursor = await db.execute(
        "SELECT * FROM sessions WHERE id = ? AND deleted_at IS NULL",
        (session_id,)
    )
    row = await cursor.fetchone()
    if row:
        return Session(**dict(row))
    return None


async def get_sessions_by_user(
    db: aiosqlite.Connection,
    user_id: str,
    include_archived: bool = False
) -> List[Session]:
    """Get all sessions for a user, ordered by last_message_at desc."""
    query = """
        SELECT * FROM sessions
        WHERE user_id = ? AND deleted_at IS NULL
    """
    if not include_archived:
        query += " AND is_archived = FALSE"
    query += " ORDER BY COALESCE(last_message_at, created_at) DESC"

    cursor = await db.execute(query, (user_id,))
    rows = await cursor.fetchall()
    return [Session(**dict(row)) for row in rows]


async def update_session(
    db: aiosqlite.Connection,
    session_id: str,
    updates: SessionUpdate
) -> Optional[Session]:
    """Update session fields."""
    update_fields = []
    values = []

    if updates.title_auto is not None:
        update_fields.append("title_auto = ?")
        values.append(updates.title_auto)
    if updates.title_custom is not None:
        update_fields.append("title_custom = ?")
        values.append(updates.title_custom)
    if updates.last_message_at is not None:
        update_fields.append("last_message_at = ?")
        values.append(updates.last_message_at.isoformat())
    if updates.is_archived is not None:
        update_fields.append("is_archived = ?")
        values.append(updates.is_archived)

    if not update_fields:
        return await get_session(db, session_id)

    update_fields.append("updated_at = ?")
    values.append(datetime.utcnow().isoformat())
    values.append(session_id)

    await db.execute(
        f"UPDATE sessions SET {', '.join(update_fields)} WHERE id = ?",
        values
    )
    await db.commit()
    return await get_session(db, session_id)


async def soft_delete_session(db: aiosqlite.Connection, session_id: str) -> bool:
    """Soft delete a session."""
    now = datetime.utcnow().isoformat()
    cursor = await db.execute(
        "UPDATE sessions SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
        (now, now, session_id)
    )
    await db.commit()
    return cursor.rowcount > 0


async def update_last_message_time(db: aiosqlite.Connection, session_id: str) -> None:
    """Update the last_message_at timestamp to now."""
    now = datetime.utcnow().isoformat()
    await db.execute(
        "UPDATE sessions SET last_message_at = ?, updated_at = ? WHERE id = ?",
        (now, now, session_id)
    )
    await db.commit()
