from fastapi import APIRouter

router = APIRouter()


@router.get("/session/{session_id}")
async def get_messages(session_id: str):
    """Get all messages for a session"""
    # TODO: Connect to database
    return {"messages": []}


@router.post("/session/{session_id}")
async def create_message(session_id: str):
    """Create a new message in a session"""
    # TODO: Connect to database, AI integration
    return {"id": "new-message-id", "session_id": session_id}
