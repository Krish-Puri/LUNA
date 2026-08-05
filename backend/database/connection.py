import os
import aiosqlite
from pathlib import Path

DATABASE_PATH = Path(os.getenv("DATABASE_PATH", Path(__file__).parent.parent / "luna.db"))


async def get_db():
    """Dependency that provides a database connection."""
    db = await aiosqlite.connect(DATABASE_PATH)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()


async def get_db_connection():
    """Standalone connection for startup/shutdown tasks."""
    print(f"[GET_DB] DATABASE_PATH = {DATABASE_PATH} (absolute: {DATABASE_PATH.is_absolute()})")
    db = await aiosqlite.connect(DATABASE_PATH)
    db.row_factory = aiosqlite.Row
    return db
