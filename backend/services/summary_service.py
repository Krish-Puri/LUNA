"""
Session summarization service — generates one-line summaries using Groq
and stores them in the session_summaries table.
"""
import aiosqlite
import uuid
from datetime import datetime
from pathlib import Path

from . import groq_service

DATABASE_PATH = Path(__file__).parent.parent / "luna.db"

SUMMARY_PROMPT = """Summarize this therapy conversation in one sentence (max 20 words).
Format: "[emotional tone] - [main topic] - [user's goal or progress]"
Example: "Reflective - anxiety and work stress - user identified coping strategies"
"""

DETAILED_SUMMARY_PROMPT = """You are a reflective journaling assistant. Given a therapy conversation between a user and LUNA, generate a comprehensive summary for the user to read.

Write in natural, readable prose (not JSON, not bullet points). Aim for 300–500 words. Structure the summary with these sections, clearly labeled:

**Conversation Overview** — A brief overview of what this conversation was about.

**Main Topics Discussed** — The key subjects and themes that came up.

**Emotional Themes** — The emotional undercurrents observed (e.g., anxiety, hope, frustration, relief).

**Insights Identified** — Any meaningful realizations, shifts in perspective, or useful reframes that emerged.

**Positive Progress** — Any evidence of growth, coping strategies used, or steps already taken.

**Suggested Reflection** — A gentle, open-ended question or prompt to help the user continue processing on their own.

Write with warmth and without clinical language. This is for the user, not for LUNA.

Conversation:
{conversation}

Detailed Summary:"""


async def get_summary(db: aiosqlite.Connection, session_id: str) -> str | None:
    """Return the existing summary for a session, if any."""
    cursor = await db.execute(
        "SELECT summary FROM session_summaries WHERE session_id = ? AND deleted_at IS NULL",
        (session_id,)
    )
    row = await cursor.fetchone()
    return row["summary"] if row else None


async def save_summary(db: aiosqlite.Connection, session_id: str, summary: str, message_count: int) -> None:
    """Insert or replace a summary for a session (upsert)."""
    now = datetime.utcnow().isoformat()
    # Check if summary already exists
    cursor = await db.execute(
        "SELECT id FROM session_summaries WHERE session_id = ? AND deleted_at IS NULL",
        (session_id,)
    )
    existing = await cursor.fetchone()

    if existing:
        await db.execute(
            "UPDATE session_summaries SET summary = ?, message_count = ?, updated_at = ? WHERE id = ?",
            (summary, message_count, now, existing["id"])
        )
    else:
        summary_id = str(uuid.uuid4())
        await db.execute(
            """INSERT INTO session_summaries (id, session_id, summary, message_count, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (summary_id, session_id, summary, message_count, now, now)
        )
    await db.commit()


async def generate_summary_text(messages: list[dict]) -> str:
    """
    Call Groq with a summarization prompt and return the summary string.
    messages: list of {role, content} dicts (most recent last).
    """
    # Build a compact conversation string for the prompt
    lines = []
    for msg in messages[-10:]:  # last 10 messages max
        role = msg.get("role", "user")
        content = (msg.get("content") or "").replace("\n", " ").strip()
        if content:
            lines.append(f"{role}: {content}")
    conversation_text = "\n".join(lines)

    prompt = f"{SUMMARY_PROMPT}\n\nConversation:\n{conversation_text}"

    try:
        client = groq_service.get_client()
        model = groq_service.get_model()
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=60,
        )
        summary = (response.choices[0].message.content or "").strip()
        return summary
    except Exception as e:
        print(f"[summary_service] Groq summarization failed: {e}")
        return ""


async def generate_detailed_summary_text(messages: list[dict]) -> str:
    """
    Generate a detailed, user-facing summary (300-500 words) for the modal.
    messages: list of {role, content} dicts (most recent last).
    """
    lines = []
    for msg in messages:
        role = msg.get("role", "user")
        content = (msg.get("content") or "").strip()
        if content:
            lines.append(f"{role}: {content}")
    conversation_text = "\n".join(lines)

    prompt = DETAILED_SUMMARY_PROMPT.format(conversation=conversation_text)

    try:
        client = groq_service.get_client()
        model = groq_service.get_model()
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            max_tokens=700,
        )
        summary = (response.choices[0].message.content or "").strip()
        return summary
    except Exception as e:
        print(f"[summary_service] detailed summary failed: {e}")
        return ""


async def check_and_summarize(session_id: str, message_count: int) -> None:
    """
    Called after done: True in the chat stream.
    If message_count is a multiple of 10 and no summary exists yet,
    generate and store one. Runs asynchronously — fire-and-forget.
    """
    if message_count % 10 != 0:
        return

    db = await aiosqlite.connect(DATABASE_PATH)
    db.row_factory = aiosqlite.Row

    try:
        # Skip if already summarized
        existing = await get_summary(db, session_id)
        if existing:
            return

        # Fetch last 10 messages for context
        from . import message_service
        messages = await message_service.get_messages_by_session(db, session_id, limit=10)
        if not messages:
            return

        # Build conversation for summarization
        msg_dicts = [
            {"role": m.role, "content": m.content}
            for m in reversed(messages)  # oldest first for context
            if m.role in ("user", "assistant") and m.content
        ]

        summary_text = await generate_summary_text(msg_dicts)
        if summary_text:
            await save_summary(db, session_id, summary_text, message_count)
    finally:
        await db.close()
