import Avatar from '../ui/Avatar'

const MessageBubble = ({ message, showAvatar = true }) => {
  const isUser = message.role === 'user'
  const isLuna = message.role === 'luna' || message.role === 'assistant'

  return (
    <div className={`flex gap-3 px-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
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
        <div
          className={`
            px-4 py-3 rounded-2xl
            ${isUser
              ? 'bg-user-bubble rounded-tr-md'
              : 'bg-luna-bubble border border-luna-border rounded-tl-md'
            }
          `}
        >
          {/* Text content */}
          {message.content && (
            <p className="text-sm text-text-primary whitespace-pre-wrap">
              {message.content}
            </p>
          )}

          {/* Voice note indicator */}
          {message.audioUrl && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
              <button className="w-8 h-8 rounded-full bg-accent text-text-inverse flex items-center justify-center hover:bg-accent-hover transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
              <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                <div className="h-full w-0 bg-accent rounded-full" />
              </div>
              <span className="text-xs text-text-tertiary">0:00</span>
            </div>
          )}

          {/* Transcription */}
          {message.transcription && (
            <p className="text-xs text-text-tertiary mt-2 italic border-t border-border pt-2">
              "{message.transcription}"
            </p>
          )}
        </div>

        {/* Timestamp */}
        {message.timestamp && (
          <span className="text-xs text-text-tertiary mt-1 px-1">
            {message.timestamp}
          </span>
        )}
      </div>
    </div>
  )
}

export default MessageBubble
