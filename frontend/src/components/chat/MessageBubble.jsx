import { useRef, useState } from 'react'
import Avatar from '../ui/Avatar'

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const VoicePlayer = ({ audioUrl }) => {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      audio.play()
    }
    setPlaying(!playing)
  }

  const onTimeUpdate = () => {
    const audio = audioRef.current
    if (audio) setCurrentTime(audio.currentTime)
  }

  const onLoadedMetadata = () => {
    const audio = audioRef.current
    if (audio) setDuration(audio.duration)
  }

  const onEnded = () => setPlaying(false)

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
      />
      <button
        onClick={toggle}
        className="w-8 h-8 rounded-full bg-accent text-text-inverse flex items-center justify-center hover:bg-accent-hover transition-colors flex-shrink-0"
      >
        {playing ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
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
      <span className="text-xs text-text-tertiary tabular-nums w-8 text-right">
        {playing ? formatTime(currentTime) : formatTime(duration)}
      </span>
    </div>
  )
}

const MessageBubble = ({ message, showAvatar = true, onEdit }) => {
  const isUser = message.role === 'user'
  const isLuna = message.role === 'luna' || message.role === 'assistant'
  const isVoice = message.messageType === 'voice'

  return (
    <div className={`flex gap-3 px-4 group ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className="flex-shrink-0 w-8">
        {showAvatar && (
          isLuna ? (
            <Avatar name="LUNA" size="md" />
          ) : (
            <Avatar name="Me" size="md" />
          )
        )}
      </div>

      {/* Message content */}
      <div className={`flex flex-col max-w-[70%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Bubble — voice uses neutral treatment, no user/LUNA color split */}
        <div
          className={`
            px-4 py-3 rounded-2xl
            ${isVoice
              ? 'bg-bg-secondary border border-border'
              : isUser
                ? 'bg-user-bubble rounded-tr-md'
                : 'bg-luna-bubble border border-luna-border rounded-tl-md'
            }
          `}
        >
          {/* Voice note label */}
          {isVoice && (
            <div className="flex items-center gap-1.5 mb-2">
              <svg className="w-3 h-3 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-14 0m7 7v4m-4 0h8m-8-8a4 4 0 018 0" />
              </svg>
              <span className="text-xs text-text-tertiary">Voice note</span>
            </div>
          )}

          {/* Voice note player */}
          {isVoice && message.audioUrl && (
            <VoicePlayer audioUrl={message.audioUrl} />
          )}

          {/* Text content — hidden for voice messages */}
          {message.content && !isVoice && (
            <p className="text-sm text-text-primary whitespace-pre-wrap">
              {message.content}
              {/* Blinking cursor while LUNA is streaming a response */}
              {message.role === 'assistant' && String(message.id).startsWith('luna-') && (
                <span className="inline-block w-2 h-4 bg-accent ml-0.5 animate-pulse align-middle" />
              )}
            </p>
          )}
        </div>

        {/* Transcript caption — outside bubble, below it */}
        {isVoice && message.transcription && (
          <p className="text-xs italic text-text-tertiary mt-1 px-1">
            "{message.transcription}"
          </p>
        )}

        {/* Timestamp + edit indicator */}
        {message.timestamp && (
          <span className="text-xs text-text-tertiary mt-1.5 px-1 flex items-center gap-1">
            {message.edited && <span className="italic">(edited)</span>}
            {/* Edit button — visible on hover for user messages */}
            {isUser && onEdit && (
              <button
                onClick={() => onEdit(message)}
                className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 p-0.5 rounded hover:bg-border cursor-pointer"
                title="Edit message"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
          </span>
        )}
      </div>
    </div>
  )
}

export default MessageBubble
