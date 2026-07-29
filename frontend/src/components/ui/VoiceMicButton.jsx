/**
 * VoiceMicButton — inline voice recording button for InputComposer.
 * Handles its own MediaRecorder internally.
 * Props:
 *   onStop    — (blob, durationSec) called when recording ends
 *   disabled  — prevents interaction
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { Mic } from 'lucide-react'
import useVoiceStore from '../../store/voiceStore'

export default function VoiceMicButton({ onStop, disabled = false }) {
  const [isRecording, setIsRecording] = useState(false)
  const [elapsedSec, setElapsedSec] = useState(0)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const startTimeRef = useRef(null)

  const { startRecording: storeStartRecording } = useVoiceStore()

  // Timer tick
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 200)
    } else {
      clearInterval(timerRef.current)
      setElapsedSec(0)
    }
    return () => clearInterval(timerRef.current)
  }, [isRecording])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current)
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  const startCapture = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000, channelCount: 1 },
      })

      chunksRef.current = []
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000)
        stream.getTracks().forEach((t) => t.stop())
        setIsRecording(false)
        onStop?.(blob, duration)
      }

      recorder.start(100)
      startTimeRef.current = Date.now()
      setIsRecording(true)
      storeStartRecording()
    } catch (err) {
      console.error('[VoiceMicButton] getUserMedia failed:', err)
    }
  }, [onStop, storeStartRecording])

  const stopCapture = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    } else {
      setIsRecording(false)
    }
  }, [])

  const handleClick = () => {
    if (disabled) return
    isRecording ? stopCapture() : startCapture()
  }

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col items-center gap-0.5 select-none">
      {/* Top: timer */}
      <span
        aria-live="polite"
        className={`
          font-mono text-[10px] transition-opacity duration-200 leading-none
          ${isRecording ? 'text-accent opacity-100' : 'text-transparent opacity-0'}
        `}
      >
        {formatTime(elapsedSec)}
      </span>

      {/* Mic / Stop button */}
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        className={`
          flex items-center justify-center rounded-xl transition-colors duration-200
          ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-bg-tertiary cursor-pointer'}
          ${isRecording ? 'bg-accent-light w-12 h-12' : 'bg-transparent w-10 h-10'}
        `}
      >
        {isRecording ? (
          <div className="h-5 w-5 rounded-sm bg-accent" />
        ) : (
          <Mic className="h-5 w-5 text-accent" />
        )}
      </button>

      {/* Bottom: animated wave bars — only visible while recording */}
      {isRecording && (
        <div className="flex items-center justify-center gap-px overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="w-0.5 rounded-full bg-accent animate-pulse"
              style={{ animationDelay: `${i * 0.06}s`, height: '12px' }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
