from fastapi import APIRouter, Depends
from ..database.connection import get_db
import aiosqlite

router = APIRouter()


@router.get("/health")
async def health_check(db: aiosqlite.Connection = Depends(get_db)):
    """Check API and database health."""
    try:
        # Test DB connection
        await db.execute("SELECT 1")
        return {"status": "healthy", "db": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "db": "disconnected", "error": str(e)}
