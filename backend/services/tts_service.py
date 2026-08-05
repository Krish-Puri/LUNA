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

# ---------------------------------------------------------------------------
# Generation state — replaces path.exists() as the readiness signal.
# Transitions: idle -> generating -> ready | failed
# ---------------------------------------------------------------------------
_state: dict[str, str] = {}       # message_id -> 'generating' | 'ready' | 'failed'
_state_lock = threading.Lock()


def get_generation_state(message_id: str) -> str:
    """Returns 'idle' if no entry exists."""
    return _state.get(message_id, 'idle')


def set_generation_state(message_id: str, state: str) -> None:
    with _state_lock:
        _state[message_id] = state
        logger.info(f"[TTS-BACKEND] set_generation_state — {message_id}: {state}")


def clear_generation_state(message_id: str) -> None:
    with _state_lock:
        _state.pop(message_id, None)


# ---------------------------------------------------------------------------
# Voice loading
# ---------------------------------------------------------------------------
def _get_voice():
    """Load and cache the Piper voice (called from the thread pool)."""
    global _voice
    if _voice is None:
        import os
        from piper.voice import PiperVoice
        model_path = PIPER_MODEL
        logger.info(f"[TTS-BACKEND] _get_voice — PIPER_MODEL={model_path!r}, CWD={os.getcwd()!r}")
        logger.info(f"[TTS-BACKEND] _get_voice — model exists: {os.path.exists(model_path)}")
        logger.info(f"[TTS-BACKEND] _get_voice — config exists: {os.path.exists(model_path + '.json')}")
        _voice = PiperVoice.load(PIPER_MODEL)
    return _voice


def get_tts_dir() -> Path:
    TTS_DIR.mkdir(parents=True, exist_ok=True)
    return TTS_DIR


# ---------------------------------------------------------------------------
# TTS synthesis
# ---------------------------------------------------------------------------
def _run_piper(text: str, output_path: str) -> None:
    """
    Synthesize text to a WAV file via Piper.
    Writes to a .tmp file and atomically renames on success.
    This prevents readers from ever seeing a half-written file.
    """
    import wave
    logger.info(f"[TTS-BACKEND] _run_piper — text length: {len(text)}")
    tmp_path = output_path + '.tmp'
    try:
        voice = _get_voice()  # reuse cached voice
        with wave.open(tmp_path, 'wb') as wav_file:
            voice.synthesize_wav(text, wav_file)
        os.replace(tmp_path, output_path)  # atomic on POSIX; move on Windows
        file_size = os.path.getsize(output_path)
        logger.info(f"[TTS-BACKEND] _run_piper — synthesis complete, file size: {file_size}")
    except Exception:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise


async def generate_tts(message_id: str, text: str) -> str:
    """
    Generate TTS via Piper in a thread pool (non-blocking).
    Transitions state: idle -> generating -> ready | failed.
    Only returns when synthesis is fully complete.
    """
    logger.info(f"[TTS-BACKEND] generate_tts — message_id: {message_id}")

    # Idempotent: if already ready, return immediately without re-synthesizing.
    if get_generation_state(message_id) == 'ready':
        path = get_tts_dir() / f"{message_id}.wav"
        file_size = path.stat().st_size
        logger.info(f"[TTS-BACKEND] generate_tts — already ready, file size: {file_size}")
        return f"storage/tts/{message_id}.wav"

    set_generation_state(message_id, 'generating')

    try:
        _warm_done.wait(timeout=30)  # wait up to 30s for voice to be ready
        if not _warm_done.is_set():
            raise TimeoutError("TTS voice warmup timed out after 30s")

        output_path = str(get_tts_dir() / f"{message_id}.wav")
        loop = asyncio.get_event_loop()
        await asyncio.wait_for(
            loop.run_in_executor(_executor, _run_piper, text, output_path),
            timeout=30
        )

        set_generation_state(message_id, 'ready')
        file_size = os.path.getsize(output_path)
        logger.info(f"[TTS-BACKEND] generate_tts — state: ready, file size: {file_size}")
        return f"storage/tts/{message_id}.wav"
    except asyncio.TimeoutError as e:
        set_generation_state(message_id, 'failed')
        logger.error(f"[TTS-BACKEND] generate_tts — state: failed, timeout: {e}")
        raise
    except Exception as e:
        set_generation_state(message_id, 'failed')
        logger.error(f"[TTS-BACKEND] generate_tts — state: failed, error: {e}", exc_info=True)
        raise


def warm_voice():
    """Pre-load the Piper voice model. Safe to call at startup (runs in ThreadPool)."""
    try:
        _get_voice()
        _warm_done.set()  # Signal that the voice is ready
        logger.info(f"[TTS-BACKEND] warm_voice — model loaded, warm_done.set() called")
    except Exception as e:
        logger.error(f"[TTS-BACKEND] warm_voice — FAILED to load model: {e}", exc_info=True)
        _warm_done.set()  # Unblock waiters so they get a proper error instead of hanging
