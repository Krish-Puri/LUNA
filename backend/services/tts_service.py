import os
import asyncio
import threading
import logging
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

TTS_DIR = Path(__file__).parent.parent / "storage" / "tts"
PIPER_DIR = Path(__file__).parent.parent / "storage" / "piper_models"
PIPER_MODEL = os.getenv("PIPER_MODEL", str(PIPER_DIR / "en_US-lessac-medium.onnx"))
_executor = ThreadPoolExecutor(max_workers=2)

# Lazily-loaded Piper voice — loaded once and reused for all synthesis.
# This avoids the ~11s load cost on every synthesis call.
_voice = None
# Set to "done" (signaled) once warm_voice() has fully loaded the model.
_warm_done = threading.Event()


def _get_voice():
    """Load and cache the Piper voice (called from the thread pool)."""
    global _voice
    if _voice is None:
        from piper.voice import PiperVoice
        _voice = PiperVoice.load(PIPER_MODEL)
    return _voice


def get_tts_dir() -> Path:
    TTS_DIR.mkdir(parents=True, exist_ok=True)
    return TTS_DIR


def get_cached_path(message_id: str) -> str | None:
    path = get_tts_dir() / f"{message_id}.wav"
    exists = path.exists()
    logger.info(f"[TTS-BACKEND] get_cached_path({message_id}) — exists: {exists}, path: {path}")
    if exists:
        return f"storage/tts/{message_id}.wav"
    return None


def _run_piper(text: str, output_path: str) -> None:
    import wave
    voice = _get_voice()  # reuse cached voice
    with wave.open(output_path, 'wb') as wav_file:
        voice.synthesize_wav(text, wav_file)


async def generate_tts(message_id: str, text: str) -> str:
    """
    Generate TTS via Piper in a thread pool (non-blocking).
    Returns the relative storage path.

    If the voice model is still warming up, this call blocks until warm-up
    is complete so the first request never pays the 11s load penalty alone.
    """
    logger.info(f"[TTS-BACKEND] generate_tts — message_id: {message_id}, warm_done.is_set(): {_warm_done.is_set()}")
    cached = get_cached_path(message_id)
    logger.info(f"[TTS-BACKEND] generate_tts — cached: {cached}")
    if cached:
        return cached

    # Block until the voice is ready (warm_voice completed or is still running)
    logger.info(f"[TTS-BACKEND] generate_tts — waiting for warm_done (blocking)...")
    _warm_done.wait()
    logger.info(f"[TTS-BACKEND] generate_tts — warm_done released, voice ready, starting synthesis")

    output_path = str(get_tts_dir() / f"{message_id}.wav")
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(_executor, _run_piper, text, output_path)
    logger.info(f"[TTS-BACKEND] generate_tts — synthesis DONE, output: {output_path}")
    return f"storage/tts/{message_id}.wav"


def warm_voice():
    """Pre-load the Piper voice model. Safe to call at startup (runs in ThreadPool)."""
    _get_voice()
    _warm_done.set()  # Signal that the voice is ready
    logger.info(f"[TTS-BACKEND] warm_voice — model loaded, warm_done.set() called")
