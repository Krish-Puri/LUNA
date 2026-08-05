import os
import asyncio
import threading
import logging
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

TTS_DIR = Path(__file__).parent.parent / "storage" / "tts"
PIPER_DIR = Path(__file__).parent.parent / "storage" / "piper_models"
# Always use absolute path. The ENV var is overridden at runtime on Render,
# so compute the absolute path from the file's location to guarantee correctness.
PIPER_MODEL = str(PIPER_DIR / "en_US-lessac-medium.onnx")
_executor = ThreadPoolExecutor(max_workers=2)

# Lazily-loaded Piper voice — loaded once and reused for all synthesis.
# This avoids the ~11s load cost on every synthesis call.
_voice = None
# Set to "done" (signaled) once warm_voice() has fully loaded the model.
_warm_done = threading.Event()
# Tracks whether warmup has ever been triggered (started or completed).
_warmup_started = False
_warmup_started_lock = threading.Lock()


def _get_voice():
    """Load and cache the Piper voice (called from the thread pool)."""
    global _voice
    if _voice is None:
        from piper.voice import PiperVoice
        _voice = PiperVoice.load(PIPER_MODEL)
        logger.info(f"[TTS-BACKEND] _get_voice — model loaded, id={id(_voice)}")
    return _voice


def get_tts_dir() -> Path:
    TTS_DIR.mkdir(parents=True, exist_ok=True)
    return TTS_DIR


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
        logger.info(f"[TTS-BACKEND] setGenerationState — {message_id}: {state}")


def clear_generation_state(message_id: str) -> None:
    with _state_lock:
        _state.pop(message_id, None)


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
    logger.info(f"[TTS-BACKEND] _run_piper — text length: {len(text)}, output: {output_path}")
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
        # Wait for the model to finish loading.
        # Path A: warmup() ran at startup and completed — _warm_done is set, wait() returns immediately.
        # Path B: warmup() is still running — wait() blocks until it finishes.
        # Path C: warmup() never started (e.g., container cold-start before latest deploy) —
        #          we detect _warmup_started is False and trigger lazy loading inline,
        #          waiting for it to complete before proceeding.
        if _warm_done.wait(timeout=30):
            logger.info("[TTS-BACKEND] model already warm")
        else:
            # Timed out — warmup never started or is still running.
            # Check _warmup_started to distinguish: if False, trigger lazy load; if True,
            # the background warmup is still running and our wait will be satisfied by it.
            with _warmup_started_lock:
                started = _warmup_started
            if not started:
                logger.info("[TTS-BACKEND] warmup never triggered — lazy loading now...")
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(_executor, _get_voice)
                _warm_done.set()
                logger.info("[TTS-BACKEND] lazy load complete")
            else:
                # Background warmup is still running — wait for it.
                logger.info("[TTS-BACKEND] warmup in progress, waiting...")
                _warm_done.wait(timeout=30)
                if not _warm_done.is_set():
                    raise TimeoutError("TTS warmup timed out after 30s (background warmup still running)")

        output_path = str(get_tts_dir() / f"{message_id}.wav")
        loop = asyncio.get_event_loop()
        await asyncio.wait_for(
            loop.run_in_executor(_executor, _run_piper, text, output_path),
            timeout=30
        )

        file_size = os.path.getsize(output_path)
        if file_size == 0:
            raise ValueError(f"TTS file is empty: {output_path}")

        set_generation_state(message_id, 'ready')
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
    global _warmup_started
    with _warmup_started_lock:
        _warmup_started = True

    try:
        _get_voice()
        _warm_done.set()  # Signal that the voice is ready
        logger.info(f"[TTS-BACKEND] warm_voice — model loaded, warm_done.set() called")
    except Exception as e:
        logger.error(f"[TTS-BACKEND] warm_voice — FAILED to load model: {e}", exc_info=True)
        _warm_done.set()  # Unblock waiters so they get a proper error instead of hanging
