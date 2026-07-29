"""
Memory service — extracts notable facts/preferences/goals from conversations,
stores them in the memory table, and retrieves relevant memories for context injection.
"""
import aiosqlite
import uuid
import json
import re
from datetime import datetime, timedelta
from pathlib import Path

from . import groq_service

DATABASE_PATH = Path(__file__).parent.parent / "luna.db"

EXTRACTION_PROMPT = """You are a memory extraction assistant for a mental health chatbot.

Given a conversation between LUNA (an empathetic AI therapist) and a user, extract any notable facts, preferences, goals, or emotional patterns that LUNA should remember for future conversations.

Extract ONLY information that is:
- Specific and personally relevant (not generic advice)
- Emotionally or therapeutically significant
- Likely to be useful in future conversations

Return a JSON array with 0 to 5 objects. Each object has:
- "type": one of "fact", "preference", "goal", "pattern"
- "content": a concise description (under 30 words)
- "confidence": a number between 0.5 and 1.0 indicating how confident you are this is real and useful

Return an empty array [] if nothing notable was discussed.

Conversation:
{conversation}

JSON:
"""


async def save_memories(
    db: aiosqlite.Connection,
    user_id: str,
    user_message: str,
    luna_response: str,
    source_message_id: str | None = None,
) -> list[dict]:
    """
    Extract memories from a user+LUNA exchange and save to the database.
    Deduplicates against memories saved in the last 24 hours.
    Returns the list of saved memory objects.
    """
    conversation = f"User: {user_message}\n\nLUNA: {luna_response}"
    prompt = EXTRACTION_PROMPT.format(conversation=conversation)

    try:
        client = groq_service.get_client()
        model = groq_service.get_model()
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=300,
        )
        text = (response.choices[0].message.content or "").strip()

        # Try to parse JSON array from the response
        # Handle cases where the model wraps the JSON in markdown backticks
        json_match = re.search(r'\[[\s\S]*\]', text)
        if not json_match:
            return []
        items = json.loads(json_match.group())
    except Exception as e:
        print(f"[memory_service] extraction failed: {e}")
        return []

    if not items:
        return []

    # Build a fingerprint set of recent memories for deduplication
    cutoff = (datetime.utcnow() - timedelta(hours=24)).isoformat()
    cursor = await db.execute(
        """SELECT content, type FROM memory
           WHERE user_id = ? AND deleted_at IS NULL AND created_at > ?""",
        (user_id, cutoff)
    )
    existing = {(row["content"], row["type"]) for row in await cursor.fetchall()}

    saved = []
    now = datetime.utcnow().isoformat()
    for item in items:
        content = (item.get("content") or "").strip()
        mem_type = item.get("type", "fact")
        confidence = float(item.get("confidence", 0.8))

        if not content:
            continue
        if (content, mem_type) in existing:
            continue  # deduplicated

        mem_id = str(uuid.uuid4())
        await db.execute(
            """INSERT INTO memory (id, user_id, type, content, confidence, source_message_id, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (mem_id, user_id, mem_type, content, confidence, source_message_id, now, now)
        )
        saved.append({"id": mem_id, "type": mem_type, "content": content, "confidence": confidence})
        existing.add((content, mem_type))  # prevent dupes within this batch

    if saved:
        await db.commit()

    return saved


async def get_memories_for_context(
    db: aiosqlite.Connection,
    user_id: str,
    query_text: str,
    limit: int = 5,
) -> list[dict]:
    """
    Retrieve memories relevant to a user's query text.
    Uses simple keyword matching: words in query are matched against memory content.
    Returns memories sorted by confidence descending.
    """
    # Extract keywords (remove stopwords)
    stopwords = {"the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
                 "have", "has", "had", "do", "does", "did", "will", "would", "could",
                 "should", "may", "might", "must", "can", "to", "of", "in", "for",
                 "on", "with", "at", "by", "from", "as", "that", "this", "it", "its",
                 "i", "me", "my", "you", "your", "we", "our", "they", "them", "their",
                 "what", "which", "who", "how", "when", "where", "why", "and", "or",
                 "but", "so", "if", "then", "just", "about", "really", "like", "get", "got"}
    words = [w.lower() for w in re.findall(r'\b\w+\b', query_text) if w.lower() not in stopwords and len(w) > 2]

    if not words:
        # Fall back to returning most recent memories
        cursor = await db.execute(
            """SELECT id, type, content, confidence FROM memory
               WHERE user_id = ? AND deleted_at IS NULL
               ORDER BY created_at DESC LIMIT ?""",
            (user_id, limit)
        )
    else:
        # Build LIKE clauses for each keyword
        conditions = " OR ".join(["(content LIKE ? OR context LIKE ?)"] * len(words))
        args = []
        for w in words:
            args.extend([f"%{w}%", f"%{w}%"])

        cursor = await db.execute(
            f"""SELECT id, type, content, confidence FROM memory
                WHERE user_id = ? AND deleted_at IS NULL AND ({conditions})
                ORDER BY confidence DESC LIMIT ?""",
            [user_id] + args + [limit]
        )

    rows = await cursor.fetchall()
    return [
        {"id": r["id"], "type": r["type"], "content": r["content"], "confidence": r["confidence"]}
        for r in rows
    ]


def format_memories_for_context(memories: list[dict]) -> str:
    """
    Format a list of memory objects as a markdown block to inject into LUNA's system prompt.
    """
    if not memories:
        return ""

    lines = ["### Relevant Memory"]
    for m in memories:
        tag = m["type"]  # fact, preference, goal, pattern
        content = m["content"]
        conf = m.get("confidence", 1.0)
        lines.append(f"- [{tag}] {content} (confidence: {conf:.0%})")

    return "\n".join(lines)
