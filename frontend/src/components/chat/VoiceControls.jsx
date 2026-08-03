import { useRef, useState, useEffect, useCallback } from 'react'
import useTtsStore from '../../store/ttsStore'
import { generateTTS, checkTTSStatus } from '../../api/tts'

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Confirmed UUID — temp prefixes never appear after finalizeStreamingMessage.
const isTempId = (id) => /^luna-|^voice-|^user-/.test(id)

const VoiceControls = ({ messageId, content, streaming }) => {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  // Track in-flight requests to prevent duplicate TTS calls
  const requestRef = useRef(null)
  // Track active polling to prevent concurrent poll loops
  const pollRef = useRef(false)

  // Read current TTS state from store — the single source of truth
  const ttsEntry = useTtsStore(s => s.ttsState[messageId])
  const { setLoading, setReady, setError } = useTtsStore()

  const status = ttsEntry?.status || 'idle'
  const audioUrl = ttsEntry?.audioUrl || null
  const errorMsg = ttsEntry?.error || null

  // --- Poll for audio readiness ---
  // Called after TTS request returns 'generating'. Keeps polling until the
  // backend confirms the .wav file is ready. Guarded by pollRef to prevent
  // concurrent poll loops if requestTTS is called multiple times.
  const pollForAudio = useCallback(async (msgId) => {
    if (pollRef.current) return
    pollRef.current = true
    try {
      while (true) {
        const result = await checkTTSStatus(msgId)
        if (result.status === 'ready') {
          setReady(msgId, result.audioUrl)
          break
        }
        // Still generating — wait before next poll
        await new Promise(r => setTimeout(r, 500))
      }
    } catch (err) {
      setError(msgId, err.message)
    } finally {
      pollRef.current = false
    }
  }, [setReady, setError])

  // --- Request TTS generation ---
  // Guards (in order):
  //  1. Not finalized yet  — streaming, temp ID, or empty content → skip
  //  2. Already loading    — duplicate request protection
  //  3. Already ready      — audio already exists, nothing to do
  //  4. Request in-flight — concurrent call protection via requestRef
  const requestTTS = useCallback(async (msgId, text) => {
    if (streaming || isTempId(msgId) || !text || !text.trim()) {
      return
    }
    if (status === 'loading' || status === 'ready') {
      return
    }
    if (requestRef.current) {
      return
    }
    requestRef.current = true
    try {
      setLoading(msgId)
      const result = await generateTTS(msgId, text)
      if (result.status === 'ready') {
        // Audio already on disk — build full URL immediately
        const fullUrl = `http://localhost:8000/storage/tts/${msgId}.wav`
        setReady(msgId, fullUrl)
      } else {
        // Background generation started — poll until ready
        pollForAudio(msgId)
      }
    } catch (err) {
      setError(msgId, err.message)
    } finally {
      requestRef.current = null
    }
  }, [streaming, status, setLoading, setReady, setError, pollForAudio])

  // --- Playback controls ---
  const toggle = () => {
    const audio = audioRef.current
    // Defensive: guard against null audioRef or null/missing src even if audioUrl
    // is set in store — a stale blob URL (restored by persist on reload) would
    // otherwise cause "no supported sources" because the tab that created the
    // blob is gone.
    if (!audio || !audioUrl || !audio.src) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play().catch(err => {
        // If playback fails (stale blob, CORS, decode error), clear the entry
        // so the next click generates fresh TTS instead of hitting the same bad URL.
        if (audioUrl?.startsWith('blob:')) {
          useTtsStore.getState().clear(messageId)
        }
      })
      setPlaying(true)
    }
  }

  const onTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime)
  }

  const onLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration)
  }

  const onEnded = () => {
    setPlaying(false)
    setCurrentTime(0)
  }

  // Handle playback errors: blob URLs created in a previous tab/process are
  // invalid in this tab. Clear the stale entry so the next click generates
  // fresh TTS with a direct URL instead of reusing the dead blob URL.
  const onError = () => {
    // audioUrl from render scope — still valid reference even if store updates
    const url = audioUrl
    if (url?.startsWith('blob:')) {
      useTtsStore.getState().clear(messageId)
    }
  }

  // Auto-play when audio becomes ready — the user clicked Listen, they shouldn't
  // have to click play again after watching the spinner disappear.
  useEffect(() => {
    if (status === 'ready' && audioRef.current && audioUrl) {
      // Guard against stale blob URL (restored from persist after a tab crash).
      // If the audio element has no valid src, clear the entry and let the user
      // click again to regenerate.
      if (!audioRef.current.src || audioRef.current.src === window.location.href) {
        useTtsStore.getState().clear(messageId)
        return
      }
      audioRef.current.play().catch(err => {
        // Playback failed — if it was a blob URL, discard it so the next click
        // generates fresh TTS instead of retrying the same dead URL.
        if (audioUrl?.startsWith('blob:')) {
          useTtsStore.getState().clear(messageId)
        }
      })
    }
  }, [status, audioUrl, messageId])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  // Guard: refuse to operate on anything that isn't a finalized assistant message.
  // This is the architectural guarantee — TTS must NEVER see partial/streaming content.
  const isFinalized = !streaming && !isTempId(messageId) && content && content.trim()

  // --- Idle: show Listen button (disabled while Luna is typing or message not ready) ---
  if (status === 'idle') {
    if (streaming || isTempId(messageId)) {
      return (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-text-tertiary italic">
          <svg className="w-3.5 h-3.5 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" />
          </svg>
          {streaming ? 'Luna is typing…' : 'Preparing…'}
        </div>
      )
    }
    if (!content || !content.trim()) {
      return (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-text-tertiary italic opacity-50">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414" />
          </svg>
          Listen to Luna
        </div>
      )
    }
    return (
      <button
        onClick={() => requestTTS(messageId, content)}
        className="flex items-center gap-1.5 mt-2 text-xs text-text-tertiary hover:text-accent transition-colors cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414" />
        </svg>
        Listen to Luna
      </button>
    )
  }

  // --- Loading: spinner + text ---
  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 mt-2 text-xs text-text-tertiary">
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        Generating voice…
      </div>
    )
  }

  // --- Error: message + Retry button ---
  if (status === 'error') {
    return (
      <div className="flex items-center gap-1.5 mt-2 text-xs text-red-400">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="flex-1">{errorMsg || 'Failed to generate voice'}</span>
        <button
          onClick={() => requestTTS(messageId, content)}
          className="ml-2 text-xs text-accent hover:underline flex-shrink-0"
        >
          Retry
        </button>
      </div>
    )
  }

  // --- Ready / Playing / Paused ---
  return (
    <div className="flex items-center gap-2 mt-2">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
        onError={onError}
      />
      <button
        onClick={toggle}
        className="w-7 h-7 rounded-full bg-accent text-text-inverse flex items-center justify-center hover:bg-accent-hover transition-colors flex-shrink-0"
      >
        {playing ? (
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-xs text-text-tertiary tabular-nums w-9 text-right">
        {playing ? formatTime(currentTime) : formatTime(duration)}
      </span>
    </div>
  )
}

export default VoiceControls
