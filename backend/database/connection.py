import os
import aiosqlite
from pathlib import Path

DATABASE_PATH = Path(os.getenv("DATABASE_PATH", Path(__file__).parent.parent / "luna.db"))


async def get_db():
    """Dependency that provides a database connection."""
    print(f"[GET_DB] Opening DB at: {DATABASE_PATH}")
    db = await aiosqlite.connect(DATABASE_PATH)
    db.row_factory = aiosqlite.Row
    tables = await (await db.execute("SELECT name FROM sqlite_master WHERE type='table'")).fetchall()
    print(f"[GET_DB] Tables visible on open: {[t[0] for t in tables]}")
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
