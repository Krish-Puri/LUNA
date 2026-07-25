import aiosqlite
from typing import List, Optional
from datetime import datetime
from ..models.message import Message, MessageCreate, MessageUpdate


async def create_message(db: aiosqlite.Connection, message_data: MessageCreate) -> Message:
    """Create a new message."""
    import uuid
    message_id = message_data.id or str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    await db.execute(
        """
        INSERT INTO messages (id, session_id, role, content, message_type, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            message_id,
            message_data.session_id,
            message_data.role,
            message_data.content,
            message_data.message_type,
            now
        )
    )
    await db.commit()

    cursor = await db.execute("SELECT * FROM messages WHERE id = ?", (message_id,))
    row = await cursor.fetchone()
    return Message(**dict(row))


async def get_message(db: aiosqlite.Connection, message_id: str) -> Optional[Message]:
    """Get a message by ID."""
    cursor = await db.execute(
        "SELECT * FROM messages WHERE id = ? AND deleted_at IS NULL",
        (message_id,)
    )
    row = await cursor.fetchone()
    if row:
        return Message(**dict(row))
    return None


async def get_messages_by_session(
    db: aiosqlite.Connection,
    session_id: str,
    limit: int = 100,
    offset: int = 0
) -> List[Message]:
    """Get all messages for a session, ordered by created_at asc."""
    cursor = await db.execute(
        """
        SELECT * FROM messages
        WHERE session_id = ? AND deleted_at IS NULL
        ORDER BY created_at ASC
        LIMIT ? OFFSET ?
        """,
        (session_id, limit, offset)
    )
    rows = await cursor.fetchall()
    return [Message(**dict(row)) for row in rows]


async def get_message_count(db: aiosqlite.Connection, session_id: str) -> int:
    """Count messages in a session."""
    cursor = await db.execute(
        "SELECT COUNT(*) as count FROM messages WHERE session_id = ? AND deleted_at IS NULL",
        (session_id,)
    )
    row = await cursor.fetchone()
    return row["count"]


async def update_message(
    db: aiosqlite.Connection,
    message_id: str,
    updates: MessageUpdate
) -> Optional[Message]:
    """Update message fields (content, token_count, latency_ms, model_used)."""
    update_fields = []
    values = []

    if updates.content is not None:
        update_fields.append("content = ?")
        values.append(updates.content)

    if not update_fields:
        return await get_message(db, message_id)

    update_fields.append("updated_at = ?")
    values.append(datetime.utcnow().isoformat())
    values.append(message_id)

    await db.execute(
        f"UPDATE messages SET {', '.join(update_fields)} WHERE id = ?",
        values
    )
    await db.commit()
    return await get_message(db, message_id)


async def soft_delete_message(db: aiosqlite.Connection, message_id: str) -> bool:
    """Soft delete a message."""
    now = datetime.utcnow().isoformat()
    cursor = await db.execute(
        "UPDATE messages SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL",
        (now, message_id)
    )
    await db.commit()
    return cursor.rowcount > 0
