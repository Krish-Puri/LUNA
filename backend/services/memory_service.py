"""
Memory service — extracts notable facts/preferences/goals from conversations,
stores them in the memory table, and retrieves relevant memories for context injection.
"""
import os
import aiosqlite
import uuid
import json
import re
from datetime import datetime, timedelta
from pathlib import Path

from . import groq_service

DATABASE_PATH = Path(os.getenv("DATABASE_PATH", Path(__file__).parent.parent / "luna.db"))

EXTRACTION_PROMPT = """You are a memory extraction assistant for an AI companion chatbot named LUNA.

Given a conversation between LUNA and a user, extract any notable facts, preferences, goals, or emotional patterns that LUNA should remember for future conversations.

Extract information that is:
- Specific and personally relevant to this user (not generic advice)
- Emotionally or therapeutically significant OR simply useful to know (e.g. name, gender, occupation, relationships, hobbies, life events)
- Likely to be useful in future conversations

IMPORTANT: Always extract the user's name if they share it, along with any other basic identity facts (gender, age, location, job, family, hobbies, etc.). These are high-value memories even if not "therapeutically significant."

Return a JSON array with 0 to 5 objects. Each object has:
- "type": one of "fact", "preference", "goal", "pattern"
- "content": a concise description (under 30 words)
- "confidence": a number between 0.5 and 1.0 indicating how confident you are this is real and useful

Return an empty array [] only if nothing worth remembering was discussed.

Conversation:
{conversation}

JSON:
"""

RERANK_PROMPT = """You are a memory reranking assistant for a mental health chatbot.

Given a user's query and a list of memories, select the 5-7 most relevant memories that would help LUNA provide better, more personalized support.

Query: {query}

Memories:
{memories}

Return a JSON array containing only the IDs of the selected memories, in order of relevance (most relevant first). Return 5-7 memory IDs.

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

    print(f"[save_memories] user_id={user_id}, user_msg='{user_message[:80]}', luna_resp='{luna_response[:80]}'")

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
        print(f"[save_memories] raw response: {text[:200]}")

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


async def update_memory_usage(db: aiosqlite.Connection, memory_ids: list[str]) -> None:
    """
    Bump times_referenced and update last_used_at for the given memory IDs.
    """
    if not memory_ids:
        return

    now = datetime.utcnow().isoformat()
    placeholders = ",".join(["?"] * len(memory_ids))
    await db.execute(
        f"""UPDATE memory
            SET times_referenced = times_referenced + 1,
                last_used_at = ?
            WHERE id IN ({placeholders})""",
        [now] + memory_ids
    )
    await db.commit()


async def _semantic_rerank(
    db: aiosqlite.Connection,
    memories: list[dict],
    query_text: str,
) -> list[dict]:
    """
    Use Groq to semantically rerank memories against the query and return the top 5-7.
    Returns the reranked list, or raises an exception on failure.
    """
    memories_text = "\n".join(
        [f'ID: {m["id"]} | [{m["type"]}] {m["content"]} (confidence: {m["confidence"]})' for m in memories]
    )
    prompt = RERANK_PROMPT.format(query=query_text, memories=memories_text)

    client = groq_service.get_client()
    model = groq_service.get_model()
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=200,
    )
    text = (response.choices[0].message.content or "").strip()

    json_match = re.search(r'\[[\s\S]*\]', text)
    if not json_match:
        raise ValueError("No JSON array found in rerank response")

    selected_ids = json.loads(json_match.group())
    if not selected_ids:
        raise ValueError("Empty rerank result")

    # Build a lookup map
    memory_map = {m["id"]: m for m in memories}

    # Return in rerank order, max 7
    result = []
    for mem_id in selected_ids[:7]:
        if mem_id in memory_map:
            result.append(memory_map[mem_id])

    return result


async def get_memories_for_context(
    db: aiosqlite.Connection,
    user_id: str,
    query_text: str,
    limit: int = 5,
) -> list[dict]:
    """
    Retrieve memories relevant to a user's query text.
    Fetches top 15 by confidence, then uses Groq to semantically rerank and
    select the best 5-7 memories. Falls back to top 5 by confidence if reranking fails.
    Updates usage stats for returned memories.
    """
    # Always fetch top 15 by confidence
    cursor = await db.execute(
        """SELECT id, type, content, confidence FROM memory
           WHERE user_id = ? AND deleted_at IS NULL
           ORDER BY confidence DESC LIMIT 15""",
        (user_id,)
    )
    rows = await cursor.fetchall()
    memories = [
        {"id": r["id"], "type": r["type"], "content": r["content"], "confidence": r["confidence"]}
        for r in rows
    ]

    if not memories:
        print(f"[get_memories_for_context] user_id={user_id}, query='{query_text[:80]}', no memories found")
        return []

    print(f"[get_memories_for_context] user_id={user_id}, query='{query_text[:80]}', found {len(memories)} memories: {[m['content'][:50] for m in memories]}")
    try:
        reranked = await _semantic_rerank(db, memories, query_text)
    except Exception as e:
        print(f"[memory_service] rerank failed, falling back to top 5 by confidence: {e}")
        # Fall back to top 5 by confidence
        returned = memories[:5]
        await update_memory_usage(db, [m["id"] for m in returned])
        return returned

    # Return 5-7 reranked memories
    returned = reranked[:7] if len(reranked) > 7 else reranked
    # Ensure we return at least 5 if we have them
    if len(returned) < 5 and len(memories) >= 5:
        returned = memories[:5]

    await update_memory_usage(db, [m["id"] for m in returned])
    return returned


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
        lines.append(f"- [{tag}] {content}")

    return "\n".join(lines)
