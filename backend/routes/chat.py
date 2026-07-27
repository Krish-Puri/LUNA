"""
LUNA chat routes — SSE streaming endpoints for LUNA AI responses.
"""
import asyncio
import json
import os
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
import aiosqlite

from ..database.connection import get_db_connection
from ..services import message_service, session_service, groq_service, luna_service
from ..models.message import MessageCreate, MessageUpdate

router = APIRouter(prefix="/api/chat", tags=["chat"])

_executor = ThreadPoolExecutor(max_workers=4)


def sse_event(data: dict) -> bytes:
    """Serialize a dict as a single SSE data event."""
    return f"data: {json.dumps(data)}\n\n".encode()


async def groq_stream_async(messages: list[dict], model: str):
    """
    Run Groq streaming in a thread pool, yielding tokens asynchronously.
    """
    loop = asyncio.get_event_loop()

    def blocking_iter():
        client = groq_service.get_client()
        stream = client.chat.completions.create(
            model=model,
            messages=messages,
            stream=True,
        )
        for chunk in stream:
            token = chunk.choices[0].delta.content or ""
            if token:
                yield token

    for token in blocking_iter():
        yield token



async def event_generator(
    session_id: str,
    user_content: str,
    message_id: str,
    db: aiosqlite.Connection,
):
    """
    Async generator yielding SSE tokens from Groq.
    On completion, persists the assistant message to the DB.

    If message_id belongs to an existing user message in this session,
    this is treated as an edit: the message is updated, all subsequent
    LUNA responses are deleted, and a new LUNA response is streamed.
    """
    start_time = time.perf_counter()
    full_response = []
    model = os.getenv("LUNA_MODEL", "llama-3.3-70b-versatile")

    # Check if this is an edit of an existing message
    existing = await message_service.get_message(db, message_id)
    is_edit = existing is not None and existing.role == "user"

    if is_edit:
        # Update the message content and delete subsequent LUNA responses
        await message_service.update_message(
            db, message_id, MessageUpdate(content=user_content)
        )
        deleted = await message_service.delete_messages_after(db, session_id, message_id)

    # Fetch conversation context from DB (excludes soft-deleted messages)
    history = await message_service.get_conversation_context(db, session_id, limit=20)

    # Build full messages list for Groq
    luna_messages = await luna_service.build_luna_messages(history, user_content)

    try:
        # Stream from Groq — run blocking SDK in thread pool
        async for token in groq_stream_async(luna_messages, model):
            full_response.append(token)
            total_latency_ms = int((time.perf_counter() - start_time) * 1000)
            token_count = len(full_response)
            yield sse_event({
                "token": token,
                "done": False,
                "token_count": token_count,
                "latency_ms": total_latency_ms,
            })

        # Stream complete
        total_latency_ms = int((time.perf_counter() - start_time) * 1000)
        token_count = len(full_response)
        full_text = "".join(full_response)

        # Persist assistant message to DB — always use a new UUID (not the user's message_id)
        assistant_data = MessageCreate(
            session_id=session_id,
            role="assistant",
            content=full_text,
            message_type="text",
        )
        await message_service.create_message(db, assistant_data)

        # Patch with token/latency metadata
        cursor = await db.execute(
            "SELECT id FROM messages WHERE session_id = ? AND role = 'assistant' AND content = ? ORDER BY created_at DESC LIMIT 1",
            (session_id, full_text)
        )
        created = await cursor.fetchall()
        if created:
            assistant_msg_id = created[0]["id"]
            updates = MessageUpdate(
                token_count=token_count,
                latency_ms=total_latency_ms,
            )
            await message_service.update_message(db, assistant_msg_id, updates)
            # Try to set ai_model — column may not exist in old databases
            try:
                await db.execute(
                    "UPDATE messages SET ai_model = ? WHERE id = ?",
                    (model, assistant_msg_id)
                )
                await db.commit()
            except Exception:
                pass

        yield sse_event({
            "token": "",
            "done": True,
            "message_id": message_id,
            "token_count": token_count,
            "latency_ms": total_latency_ms,
            "ai_model": model,
        })

    except Exception as e:
        yield sse_event({"error": str(e), "done": True})


@router.post("/session/{session_id}/stream")
async def chat_stream(
    session_id: str,
    body: dict,
):
    """
    SSE endpoint: POST a user message → Groq streams tokens → SSE events.
    Frontend consumes via fetch() + ReadableStream (NOT EventSource, which only supports GET).
    """
    # Get our own connection so it stays open for the full SSE stream
    db = await get_db_connection()

    session = await session_service.get_session(db, session_id)
    if not session:
        await db.close()
        raise HTTPException(status_code=404, detail="Session not found")

    content = body.get("content", "")
    message_id = body.get("message_id") or str(uuid.uuid4())

    if not content:
        await db.close()
        raise HTTPException(status_code=400, detail="content is required")

    await session_service.update_last_message_time(db, session_id)

    # Stream — db connection stays open for the entire iteration
    return StreamingResponse(
        event_generator(session_id, content, message_id, db),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/session/{session_id}/voice/stream")
async def voice_chat_stream(
    session_id: str,
    audio: UploadFile = File(...),
    language: str = Form("en"),
    message_id: str = Form(None),
):
    """
    Upload a voice note → transcribe via Whisper → stream LUNA's response via SSE.
    """
    db = await get_db_connection()

    session = await session_service.get_session(db, session_id)
    if not session:
        await db.close()
        raise HTTPException(status_code=404, detail="Session not found")

    msg_id = message_id or str(uuid.uuid4())

    # Read audio bytes
    audio_bytes = await audio.read()
    filename = audio.filename or "audio.webm"

    # Transcribe via Whisper
    transcript = await groq_service.transcribe_audio(audio_bytes, filename, language)

    await session_service.update_last_message_time(db, session_id)

    return StreamingResponse(
        event_generator(session_id, transcript, msg_id, db),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
