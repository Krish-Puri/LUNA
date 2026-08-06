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
from ..services import message_service, session_service, groq_service, luna_service, summary_service
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


# ------------------------------------------------------------------
# Memory extraction — runs as fire-and-forget after each LUNA response
# ------------------------------------------------------------------
async def _extract_memories(
    session_id: str,
    user_id: str | None,
    user_message: str,
    luna_response: str,
    source_message_id: str,
) -> None:
    """
    Check memory_enabled preference, then extract and save memories.
    Opens its own DB connection — does NOT reuse the SSE stream's connection.
    Safe to fire-and-forget — all errors are swallowed.
    """
    if not user_id:
        return

    # Open a fresh connection — never reuse the caller's connection
    db = await get_db_connection()
    try:
        cursor = await db.execute(
            "SELECT memory_enabled FROM preferences WHERE user_id = ?",
            (user_id,)
        )
        row = await cursor.fetchone()
        if not row or not row["memory_enabled"]:
            return
    except Exception:
        await db.close()
        return

    try:
        from ..services import memory_service
        await memory_service.save_memories(
            db, user_id, user_message, luna_response, source_message_id
        )
    except Exception as e:
        print(f"[_extract_memories] failed: {e}")
    finally:
        await db.close()


# ------------------------------------------------------------------
# Main SSE event generator
# ------------------------------------------------------------------
async def event_generator(
    session_id: str,
    user_content: str,
    message_id: str,
    db: aiosqlite.Connection,
    user_id: str | None = None,
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
        await message_service.delete_messages_after(db, session_id, message_id)

    # Fetch conversation context from DB (excludes soft-deleted messages)
    history = await message_service.get_conversation_context(db, session_id, limit=20)

    # Check memory_enabled preference before building messages
    memory_enabled = True
    if user_id:
        try:
            cursor = await db.execute(
                "SELECT memory_enabled FROM preferences WHERE user_id = ?",
                (user_id,)
            )
            row = await cursor.fetchone()
            if row:
                memory_enabled = bool(row["memory_enabled"])
        except Exception:
            memory_enabled = True  # default to enabled on error

    # Build full messages list for Groq (with memory context if enabled)
    luna_messages = await luna_service.build_luna_messages(history, user_content, user_id, memory_enabled)

    # Pre-create the assistant message with a known UUID so the frontend can
    # replace its streaming placeholder by ID when the done event arrives
    assistant_msg_id = str(uuid.uuid4())
    assistant_data = MessageCreate(
        id=assistant_msg_id,
        session_id=session_id,
        role="assistant",
        content="",
        message_type="text",
    )
    await message_service.create_message(db, assistant_data)

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

        # Update assistant message with final content and metadata
        updates = MessageUpdate(
            content=full_text,
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
            "message_id": assistant_msg_id,
            "token_count": token_count,
            "latency_ms": total_latency_ms,
            "ai_model": model,
        })

        # Trigger async summarization (fire-and-forget, every 10 messages)
        asyncio.create_task(
            summary_service.check_and_summarize(session_id, token_count)
        )

        # Trigger async memory extraction (fire-and-forget)
        asyncio.create_task(
            _extract_memories(session_id, user_id, user_content, full_text, assistant_msg_id)
        )

    except Exception as e:
        yield sse_event({"error": str(e), "done": True})


# ------------------------------------------------------------------
# Route handlers
# ------------------------------------------------------------------
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
        event_generator(session_id, content, message_id, db, session.user_id),
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
        event_generator(session_id, transcript, msg_id, db, session.user_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
