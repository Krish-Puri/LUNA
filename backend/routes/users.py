from fastapi import APIRouter, Depends, HTTPException
import aiosqlite
from ..database.connection import get_db
from ..models.user import User, UserCreate, UserUpdate
from ..models.preferences import Preferences, PreferencesUpdate
from ..services import user_service

router = APIRouter(prefix="/api/users", tags=["users"])


@router.post("/", response_model=User)
async def create_user(
    user_data: UserCreate,
    db: aiosqlite.Connection = Depends(get_db)
):
    """Create a new user."""
    # Check if email already exists
    existing = await user_service.get_user_by_email(db, user_data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    return await user_service.create_user(db, user_data)


@router.get("/{user_id}", response_model=User)
async def get_user(
    user_id: str,
    db: aiosqlite.Connection = Depends(get_db)
):
    """Get a user by ID."""
    user = await user_service.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/{user_id}", response_model=User)
async def update_user(
    user_id: str,
    updates: UserUpdate,
    db: aiosqlite.Connection = Depends(get_db)
):
    """Update user fields."""
    user = await user_service.update_user(db, user_id, updates)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/{user_id}/preferences", response_model=Preferences)
async def get_preferences(
    user_id: str,
    db: aiosqlite.Connection = Depends(get_db)
):
    """Get user preferences."""
    prefs = await user_service.get_preferences(db, user_id)
    if not prefs:
        raise HTTPException(status_code=404, detail="Preferences not found")
    return prefs


@router.patch("/{user_id}/preferences", response_model=Preferences)
async def update_preferences(
    user_id: str,
    updates: PreferencesUpdate,
    db: aiosqlite.Connection = Depends(get_db)
):
    """Update user preferences."""
    prefs = await user_service.update_preferences(db, user_id, updates)
    if not prefs:
        raise HTTPException(status_code=404, detail="Preferences not found")
    return prefs
