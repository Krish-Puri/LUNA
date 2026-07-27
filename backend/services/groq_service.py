import os
import io
import time
from dotenv import load_dotenv, find_dotenv
from pathlib import Path
from typing import AsyncGenerator, Optional

import groq
from groq import Groq

# Load .env at project root into os.environ
_dotenv_path = find_dotenv()  # searches upward from cwd until .env is found
load_dotenv(_dotenv_path, override=True)

_client: Optional[Groq] = None


def get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    return _client


def get_model() -> str:
    return os.getenv("LUNA_MODEL", "llama-3.3-70b-versatile")


def get_whisper_model() -> str:
    return os.getenv("WHISPER_MODEL", "whisper-large-v3-turbo")


async def stream_chat_completion(
    messages: list[dict],
    model: Optional[str] = None,
) -> AsyncGenerator[tuple[str, int, int], None]:
    """
    Yields (token, token_count, latency_ms) tuples from a streaming Groq completion.
    The final yield has an empty token to signal completion.
    """
    client = get_client()
    model = model or get_model()
    start_time = time.perf_counter()
    token_count = 0
    accumulated = []

    stream = client.chat.completions.create(
        model=model,
        messages=messages,
        stream=True,
    )

    for chunk in stream:
        token = chunk.choices[0].delta.content or ""
        if not token:
            continue
        token_count += 1
        accumulated.append(token)
        latency_ms = int((time.perf_counter() - start_time) * 1000)
        yield token, token_count, latency_ms

    total_latency_ms = int((time.perf_counter() - start_time) * 1000)
    yield "", token_count, total_latency_ms


async def transcribe_audio(
    audio_bytes: bytes,
    filename: str = "audio.webm",
    language: str = "en",
) -> str:
    """
    Transcribe audio bytes using Groq's Whisper endpoint.
    Returns the transcribed text.
    """
    client = get_client()
    file_obj = io.BytesIO(audio_bytes)
    file_obj.name = filename
    transcription = client.audio.transcriptions.create(
        file=file_obj,
        model=get_whisper_model(),
        language=language,
        response_format="text",
    )
    return transcription
