import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'
import Avatar from '../ui/Avatar'

const ChatArea = ({ messages = [], isTyping = false }) => {
  const messagesEndRef = useRef(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Empty state when no messages
  if (messages.length === 0 && !isTyping) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center px-8">
          {/* LUNA icon */}
          <div className="w-16 h-16 rounded-full bg-accent-light mx-auto mb-6 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
              <span className="text-text-inverse font-semibold">L</span>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Start a conversation
          </h2>
          <p className="text-sm text-text-secondary max-w-xs mx-auto">
            Share what's on your mind, or tap the microphone to record a voice note.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto py-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id || index}
            message={message}
            showAvatar={true}
          />
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex gap-3 px-4">
            <Avatar name="LUNA" size="md" />
            <div className="bg-luna-bubble border border-luna-border px-4 py-3 rounded-2xl rounded-tl-md">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-text-tertiary rounded-full animate-pulse" />
                <span className="w-2 h-2 bg-text-tertiary rounded-full animate-pulse delay-75" />
                <span className="w-2 h-2 bg-text-tertiary rounded-full animate-pulse delay-150" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}

export default ChatArea
