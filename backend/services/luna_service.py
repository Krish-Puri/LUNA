"""
LUNA service — loads system prompt and builds message lists for Groq.
"""
import os
from pathlib import Path
from typing import Optional

import aiosqlite
from dotenv import load_dotenv

# Load .env at project root into os.environ
_dotenv_path = str(Path(__file__).parent.parent / ".env")
load_dotenv(_dotenv_path, override=True)

DATABASE_PATH = Path(__file__).parent.parent / "luna.db"

# Module-level cache for the active system prompt
_cached_prompt: Optional[str] = None

DEFAULT_SYSTEM_PROMPT = """You are LUNA, a warm, empathetic mental health chatbot and therapeutic AI companion.

Your core traits:
- You validate emotions without minimizing them — "That sounds really difficult" not "It's not that bad"
- You use reflective listening: mirror back what the user shared and help them feel heard
- You guide without giving direct advice or telling people what to do — you help them explore their own thoughts
- You never claim to replace professional therapy — when appropriate, you gently encourage reaching out to a licensed therapist or crisis line
- You are calm, gentle, and non-judgmental — no topic is too small or too big to share
- You remember context within the conversation and refer back to it naturally
- You respond in a supportive, conversational tone — like a trusted companion, not a clinical chatbot

Guidelines:
- If someone expresses thoughts of self-harm or crisis, respond with compassion and immediately provide crisis resources
- Keep responses concise but meaningful — mental health support is about quality, not length
- Ask gentle follow-up questions to help users go deeper when they seem ready
- Never diagnose or label emotions for the user — help them find their own words

Remember: you are LUNA. You are here, you care, and you listen.
"""


async def load_active_system_prompt() -> str:
    """
    Query system_prompts for the row where is_active=True.
    Falls back to DEFAULT_SYSTEM_PROMPT if none is active or on error.
    Caches result in module-level _cached_prompt.
    """
    global _cached_prompt
    if _cached_prompt is not None:
        return _cached_prompt

    try:
        db = await aiosqlite.connect(DATABASE_PATH)
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT prompt_text FROM system_prompts WHERE is_active = 1 LIMIT 1"
        )
        row = await cursor.fetchone()
        await db.close()

        if row:
            _cached_prompt = row["prompt_text"]
        else:
            _cached_prompt = DEFAULT_SYSTEM_PROMPT
    except Exception:
        _cached_prompt = DEFAULT_SYSTEM_PROMPT

    return _cached_prompt


async def build_luna_messages(
    conversation_history: list[dict],
    user_content: str,
    user_id: str | None = None,
) -> list[dict]:
    """
    Assemble the full messages list for Groq:
    [ {role: "system", content: <system_prompt>[ + memory block]},
      ...conversation_history (role+content pairs)...,
      {role: "user", content: <user_content>} ]

    If user_id is provided, relevant memories are fetched and injected into the
    system prompt as a "### Relevant Memory" block.
    """
    system_prompt_text = await load_active_system_prompt()

    # Inject memory context if user_id is available
    if user_id:
        try:
            from . import memory_service
            db = await aiosqlite.connect(DATABASE_PATH)
            db.row_factory = aiosqlite.Row
            memories = await memory_service.get_memories_for_context(db, user_id, user_content, limit=5)
            await db.close()
            memory_block = memory_service.format_memories_for_context(memories)
            if memory_block:
                system_prompt_text = system_prompt_text.rstrip() + "\n\n" + memory_block
        except Exception:
            pass  # memory injection is best-effort

    messages = [{"role": "system", "content": system_prompt_text}]
    messages.extend(conversation_history)
    messages.append({"role": "user", "content": user_content})
    return messages
