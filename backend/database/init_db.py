"""
Run this once to initialize the database and create all tables.
Usage: python -m database.init_db
"""
import asyncio
import aiosqlite
from pathlib import Path

DATABASE_PATH = Path(__file__).parent.parent / "luna.db"

SCHEMA = """
-- =============================================
-- USERS
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    profile_picture TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- =============================================
-- SESSIONS
-- =============================================
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    title_auto TEXT,
    title_custom TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP,
    is_archived BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_last_message_at ON sessions(last_message_at DESC);

-- =============================================
-- MESSAGES
-- =============================================
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT,
    message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'voice', 'system')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    token_count INTEGER,
    latency_ms INTEGER,
    ai_model TEXT,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- =============================================
-- VOICE NOTES
-- =============================================
CREATE TABLE IF NOT EXISTS voice_notes (
    id TEXT PRIMARY KEY,
    message_id TEXT REFERENCES messages(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    mime_type TEXT,
    duration_seconds REAL,
    transcript TEXT,
    sample_rate INTEGER,
    language TEXT DEFAULT 'en',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- =============================================
-- SESSION SUMMARIES
-- =============================================
CREATE TABLE IF NOT EXISTS session_summaries (
    id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    message_count INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_summaries_session_id ON session_summaries(session_id);

-- =============================================
-- USER PREFERENCES
-- =============================================
CREATE TABLE IF NOT EXISTS preferences (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
    voice_enabled BOOLEAN DEFAULT TRUE,
    voice_model TEXT DEFAULT 'whisper-1',
    language TEXT DEFAULT 'en',
    memory_enabled BOOLEAN DEFAULT TRUE,
    notifications BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- AI MEMORY
-- =============================================
CREATE TABLE IF NOT EXISTS memory (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    confidence REAL DEFAULT 1.0,
    source_message_id TEXT,
    context TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_memory_user_id ON memory(user_id);

-- =============================================
-- MESSAGE FEEDBACK
-- =============================================
CREATE TABLE IF NOT EXISTS message_feedback (
    id TEXT PRIMARY KEY,
    message_id TEXT REFERENCES messages(id) ON DELETE CASCADE,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('thumbs_up', 'thumbs_down', 'report')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedback_message_id ON message_feedback(message_id);

-- =============================================
-- SYSTEM PROMPTS
-- =============================================
CREATE TABLE IF NOT EXISTS system_prompts (
    id TEXT PRIMARY KEY,
    version INTEGER NOT NULL,
    prompt_text TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- USAGE STATS (per user per day)
-- =============================================
CREATE TABLE IF NOT EXISTS usage_stats (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    messages_sent INTEGER DEFAULT 0,
    voice_notes INTEGER DEFAULT 0,
    sessions_created INTEGER DEFAULT 0,
    total_minutes REAL DEFAULT 0,
    last_active TIMESTAMP,
    UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_stats_user_date ON usage_stats(user_id, date DESC);
"""


async def init_database():
    """Create all tables defined in SCHEMA."""
    print(f"[INIT] DATABASE_PATH = {DATABASE_PATH} (absolute: {DATABASE_PATH.is_absolute()})")
    print("[INIT] Starting database initialization...")

    async with aiosqlite.connect(DATABASE_PATH) as db:
        # Enable foreign keys
        await db.execute("PRAGMA foreign_keys = ON;")
        result = await db.execute("PRAGMA database_list").fetchall()
        print(f"[INIT] database_list: {result}")

        # Execute schema
        for statement in SCHEMA.strip().split(";"):
            statement = statement.strip()
            if statement:
                await db.execute(statement)

        await db.commit()
        print("[INIT] All tables created successfully.")


if __name__ == "__main__":
    asyncio.run(init_database())
