import aiosqlite
import uuid
from typing import List, Optional
from datetime import datetime
from ..models.user import User, UserCreate, UserUpdate
from ..models.preferences import Preferences, PreferencesUpdate


async def create_user(db: aiosqlite.Connection, user_data: UserCreate) -> User:
    """Create a new user and their default preferences."""
    user_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    await db.execute(
        """
        INSERT INTO users (id, email, name, profile_picture, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (user_id, user_data.email, user_data.name, user_data.profile_picture, now, now)
    )

    # Create default preferences for user
    await db.execute(
        """
        INSERT INTO preferences (user_id, theme, voice_enabled, voice_model, language, memory_enabled, notifications, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (user_id, "light", True, "whisper-1", "en", True, True, now)
    )

    await db.commit()

    cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = await cursor.fetchone()
    return User(**dict(row))


async def get_user(db: aiosqlite.Connection, user_id: str) -> Optional[User]:
    """Get a user by ID."""
    cursor = await db.execute(
        "SELECT * FROM users WHERE id = ? AND deleted_at IS NULL",
        (user_id,)
    )
    row = await cursor.fetchone()
    if row:
        return User(**dict(row))
    return None


async def get_user_by_email(db: aiosqlite.Connection, email: str) -> Optional[User]:
    """Get a user by email."""
    cursor = await db.execute(
        "SELECT * FROM users WHERE email = ? AND deleted_at IS NULL",
        (email,)
    )
    row = await cursor.fetchone()
    if row:
        return User(**dict(row))
    return None


async def get_or_create_user(db: aiosqlite.Connection, client_id: str, name: str = "Luna User") -> User:
    """Get an existing user by client_id (browser-generated UUID) or create a new one.

    Each browser generates a UUID via crypto.randomUUID() and stores it in localStorage.
    On return visit, we find that same user. On first visit for a fresh browser, we create
    a new user tied to that browser's UUID — no email conflict, no server-side session.
    """
    cursor = await db.execute(
        "SELECT * FROM users WHERE id = ? AND deleted_at IS NULL",
        (client_id,)
    )
    row = await cursor.fetchone()
    if row:
        return User(**dict(row))

    # New browser — create user with the client-supplied ID (no email needed).
    now = datetime.utcnow().isoformat()
    await db.execute(
        """
        INSERT INTO users (id, email, name, profile_picture, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (client_id, None, name, None, now, now)
    )
    # Create default preferences.
    await db.execute(
        """
        INSERT INTO preferences (user_id, theme, voice_enabled, voice_model, language, memory_enabled, notifications, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (client_id, "light", True, "whisper-1", "en", True, True, now)
    )
    await db.commit()
    cursor = await db.execute("SELECT * FROM users WHERE id = ?", (client_id,))
    row = await cursor.fetchone()
    return User(**dict(row))


async def update_user(
    db: aiosqlite.Connection,
    user_id: str,
    updates: UserUpdate
) -> Optional[User]:
    """Update user fields."""
    update_fields = []
    values = []

    if updates.email is not None:
        update_fields.append("email = ?")
        values.append(updates.email)
    if updates.name is not None:
        update_fields.append("name = ?")
        values.append(updates.name)
    if updates.profile_picture is not None:
        update_fields.append("profile_picture = ?")
        values.append(updates.profile_picture)

    if not update_fields:
        return await get_user(db, user_id)

    update_fields.append("updated_at = ?")
    values.append(datetime.utcnow().isoformat())
    values.append(user_id)

    await db.execute(
        f"UPDATE users SET {', '.join(update_fields)} WHERE id = ?",
        values
    )
    await db.commit()
    return await get_user(db, user_id)


async def get_preferences(db: aiosqlite.Connection, user_id: str) -> Optional[Preferences]:
    """Get user preferences."""
    cursor = await db.execute(
        "SELECT * FROM preferences WHERE user_id = ?",
        (user_id,)
    )
    row = await cursor.fetchone()
    if row:
        return Preferences(**dict(row))
    return None


async def update_preferences(
    db: aiosqlite.Connection,
    user_id: str,
    updates: PreferencesUpdate
) -> Optional[Preferences]:
    """Update user preferences."""
    update_fields = []
    values = []

    if updates.theme is not None:
        update_fields.append("theme = ?")
        values.append(updates.theme)
    if updates.voice_enabled is not None:
        update_fields.append("voice_enabled = ?")
        values.append(updates.voice_enabled)
    if updates.voice_model is not None:
        update_fields.append("voice_model = ?")
        values.append(updates.voice_model)
    if updates.language is not None:
        update_fields.append("language = ?")
        values.append(updates.language)
    if updates.memory_enabled is not None:
        update_fields.append("memory_enabled = ?")
        values.append(updates.memory_enabled)
    if updates.notifications is not None:
        update_fields.append("notifications = ?")
        values.append(updates.notifications)

    if not update_fields:
        return await get_preferences(db, user_id)

    update_fields.append("updated_at = ?")
    values.append(datetime.utcnow().isoformat())
    values.append(user_id)

    await db.execute(
        f"UPDATE preferences SET {', '.join(update_fields)} WHERE user_id = ?",
        values
    )
    await db.commit()
    return await get_preferences(db, user_id)
