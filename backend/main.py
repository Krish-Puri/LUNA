from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import sessions, messages

app = FastAPI(title="LUNA API", version="0.1.0")

# CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])
app.include_router(messages.router, prefix="/api/messages", tags=["messages"])


@app.get("/")
async def root():
    return {"message": "LUNA API is running", "status": "healthy"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
