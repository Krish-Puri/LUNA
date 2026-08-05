import { useRef, useState, useEffect, useCallback } from 'react'
import useTtsStore from '../../store/ttsStore'
import { generateTTS, checkTTSStatus } from '../../api/tts'
import { API_BASE } from '../../config'

const log = (label, ...args) => console.log(`[VoiceControls ${new Date().toISOString()}] ${label}`, ...args)

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Confirmed UUID — temp prefixes never appear after finalizeStreamingMessage.
const isTempId = (id) => /^luna-|^voice-|^user-/.test(id)

const POLL_TIMEOUT_MS = 120_000   // Backend allows up to 90s synthesis; give polling a comfortable margin.
const POLL_INTERVAL_MS = 500

const VoiceControls = ({ messageId, content, streaming }) => {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  // Track in-flight requests to prevent duplicate TTS calls.
  const requestRef = useRef(null)
  // Track active polling to prevent concurrent poll loops.
  const pollRef = useRef(false)

  // Read current TTS state from store — the single source of truth.
  const ttsEntry = useTtsStore(s => s.ttsState[messageId])
  const { setLoading, setReady, setError } = useTtsStore()

  const status = ttsEntry?.status || 'idle'
  const audioUrl = ttsEntry?.audioUrl || null
  const errorMsg = ttsEntry?.error || null

  // --- Poll for audio readiness ---
  // Called after TTS request returns 'generating'. Keeps polling until the
  // backend confirms the .wav file is ready or POLL_TIMEOUT_MS elapses.
  // Guarded by pollRef to prevent concurrent poll loops.
  const pollForAudio = useCallback(async (msgId) => {
    if (pollRef.current) {
      log('pollForAudio: already polling, skipping')
      return
    }
    pollRef.current = true
    const pollStart = Date.now()
    let consecutiveEmpty = 0

    try {
      while (true) {
        const elapsed = Date.now() - pollStart
        if (elapsed >= POLL_TIMEOUT_MS) {
          log(`pollForAudio: TIMEOUT after ${elapsed}ms`)
          setError(msgId, 'TTS generation timed out after 60s')
          return
        }

        const result = await checkTTSStatus(msgId)
        log(`pollForAudio: status=${result.status} elapsed=${elapsed}ms`)

        if (result.status === 'ready') {
          log(`pollForAudio: READY — setting URL`, result.audioUrl)
          setReady(msgId, result.audioUrl)
          return  // <-- explicitly return so fire-and-forget callers can't continue
        }

        if (result.status === 'failed') {
          setError(msgId, 'TTS generation failed on backend')
          return
        }

        // Still generating — wait before next poll.
        // Count consecutive "still generating" to detect stalled state.
        consecutiveEmpty += 1
        if (consecutiveEmpty >= 10 && consecutiveEmpty % 10 === 0) {
          log(`pollForAudio: still generating after ${elapsed}ms (${consecutiveEmpty} polls)`)
        }

        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
      }
    } catch (err) {
      log(`pollForAudio: error —`, err.message)
      setError(msgId, err.message)
    } finally {
      pollRef.current = false
    }
  }, [setReady, setError])

  // --- Request TTS generation ---
  // Guards (evaluated fresh from store on every call to avoid stale closure):
  //  1. streaming or temp ID or empty content → skip entirely
  //  2. 'loading' — TTS in progress, skip duplicate request
  //  3. 'ready' — audio already exists, nothing to do
  //  4. 'error' — clear previous error and retry fresh
  //  5. request already in-flight via requestRef
  const requestTTS = useCallback(async (msgId, text) => {
    // Read status fresh from store to avoid stale closure.
    const currentStatus = useTtsStore.getState().ttsState[msgId]?.status || 'idle'
    log(`requestTTS: status=${currentStatus} ref=${!!requestRef.current}`)

    if (streaming || isTempId(msgId) || !text || !text.trim()) {
      log('requestTTS: skipped — streaming/temp/empty')
      return
    }

    // Allow retry on 'error' state by clearing it first.
    if (currentStatus === 'error') {
      log('requestTTS: clearing previous error and retrying')
      useTtsStore.getState().clear(msgId)
    }

    if (currentStatus === 'loading' || currentStatus === 'ready') {
      log(`requestTTS: skipped — status=${currentStatus}`)
      return
    }

    if (requestRef.current) {
      log('requestTTS: request already in-flight')
      return
    }

    requestRef.current = true
    try {
      setLoading(msgId)
      log(`requestTTS: POST /api/tts for ${msgId}`)
      const result = await generateTTS(msgId, text)
      log(`requestTTS: response status=${result.status}`)

      if (result.status === 'ready') {
        // Audio already on disk.
        const fullUrl = `${API_BASE}/storage/tts/${msgId}.wav`
        log(`requestTTS: already ready, URL=${fullUrl}`)
        setReady(msgId, fullUrl)
      } else {
        // Background generation started — poll until ready.
        log(`requestTTS: generating, starting poll`)
        pollForAudio(msgId)
      }
    } catch (err) {
      log(`requestTTS: catch —`, err.message)
      setError(msgId, err.message)
    } finally {
      requestRef.current = null
    }
  }, [streaming, setLoading, setReady, setError, pollForAudio])

  // --- Playback controls ---
  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    log(`toggle: playing=${playing} src=${!!audio.src}`)

    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      if (!audioUrl) return
      audio.play().then(() => {
        log('toggle: play() succeeded')
        setPlaying(true)
      }).catch(err => {
        log('toggle: play() failed', err.message)
        if (audioUrl?.startsWith('blob:')) {
          useTtsStore.getState().clear(messageId)
        }
        setPlaying(false)
      })
    }
  }, [playing, audioUrl, messageId])

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

  const onError = () => {
    const url = audioUrl
    log(`onError: url=${url} playing=${playing}`)
    if (url?.startsWith('blob:')) {
      useTtsStore.getState().clear(messageId)
    }
    setPlaying(false)
  }

  // Auto-play when audio becomes ready.
  // The user clicked "Listen to Luna" — they shouldn't have to click again.
  useEffect(() => {
    if (status !== 'ready' || !audioUrl) return
    const audio = audioRef.current
    if (!audio || !audio.src || audio.src === window.location.href) {
      log('autoPlay: no src, clearing')
      useTtsStore.getState().clear(messageId)
      return
    }
    log('autoPlay: playing')
    audio.play().then(() => {
      log('autoPlay: play() succeeded')
      setPlaying(true)
    }).catch(err => {
      log('autoPlay: play() failed', err.message)
      if (audioUrl?.startsWith('blob:')) {
        useTtsStore.getState().clear(messageId)
      }
      setPlaying(false)
    })
  }, [status, audioUrl, messageId])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  // Guard: refuse to operate on anything that isn't a finalized assistant message.
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
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
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
