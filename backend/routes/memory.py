"""
Memory API — save, retrieve, and delete extracted memories.
"""
import aiosqlite
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List

from ..database.connection import get_db
from ..services import memory_service

router = APIRouter(prefix="/api/memory", tags=["memory"])


@router.post("/")
async def save_memories(
    body: dict,
    db: aiosqlite.Connection = Depends(get_db)
):
    """
    Extract and save memories from a user+LUNA exchange.
    Body: { user_id, user_message, luna_response, source_message_id? }
    """
    user_id = body.get("user_id")
    user_message = body.get("user_message", "")
    luna_response = body.get("luna_response", "")
    source_message_id = body.get("source_message_id")

    if not user_id or not user_message:
        raise HTTPException(status_code=400, detail="user_id and user_message are required")

    saved = await memory_service.save_memories(
        db, user_id, user_message, luna_response, source_message_id
    )
    return {"saved": saved}


@router.get("/")
async def get_memories(
    user_id: str = Query(..., description="User ID"),
    query: str = Query("", description="Query text to match memories against"),
    limit: int = Query(5, ge=1, le=20),
    db: aiosqlite.Connection = Depends(get_db)
):
    """
    Retrieve memories relevant to a query. If query is empty, returns most recent.
    """
    memories = await memory_service.get_memories_for_context(db, user_id, query, limit)
    return {"memories": memories}


@router.delete("/{memory_id}")
async def delete_memory(
    memory_id: str,
    db: aiosqlite.Connection = Depends(get_db)
):
    """Soft-delete a memory."""
    now = datetime.utcnow().isoformat()
    cursor = await db.execute(
        "UPDATE memory SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL",
        (now, memory_id)
    )
    await db.commit()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"success": True}


@router.delete("/all")
async def delete_all_memories(
    user_id: str = Query(..., description="User ID"),
    db: aiosqlite.Connection = Depends(get_db)
):
    """
    Soft-delete all non-deleted memories for a user by setting deleted_at on all matching rows.
    """
    now = datetime.utcnow().isoformat()
    cursor = await db.execute(
        "UPDATE memory SET deleted_at = ? WHERE user_id = ? AND deleted_at IS NULL",
        (now, user_id)
    )
    await db.commit()
    return {"success": True, "deleted_count": cursor.rowcount}


@router.get("/session/{session_id}/context")
async def get_session_context(
    session_id: str,
    db: aiosqlite.Connection = Depends(get_db)
):
    """
    Retrieve top 5 memories by confidence for the user who owns the given session.
    Joins sessions.user_id -> memory.user_id to scope memories to the session owner.
    """
    # First, look up the user_id for the given session
    cursor = await db.execute(
        "SELECT user_id FROM sessions WHERE id = ? AND deleted_at IS NULL",
        (session_id,)
    )
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")

    user_id = row["user_id"]

    # Fetch top 5 memories by confidence for this user
    cursor = await db.execute(
        """SELECT id, type, content, confidence
           FROM memory
           WHERE user_id = ? AND deleted_at IS NULL
           ORDER BY confidence DESC
           LIMIT 5""",
        (user_id,)
    )
    rows = await cursor.fetchall()
    memories = [
        {"id": r["id"], "type": r["type"], "content": r["content"], "confidence": r["confidence"]}
        for r in rows
    ]
    return {"session_id": session_id, "memories": memories}
