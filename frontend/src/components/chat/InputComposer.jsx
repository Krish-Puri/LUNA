import { useState, useRef, useEffect } from 'react'
import IconButton from '../ui/IconButton'

const InputComposer = ({
  onSendMessage,
  onStartRecording,
  onStopRecording,
  isRecording = false,
  disabled = false
}) => {
  const [inputValue, setInputValue] = useState('')
  const textareaRef = useRef(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [inputValue])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (inputValue.trim() && !disabled) {
      onSendMessage(inputValue.trim())
      setInputValue('')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const canSend = inputValue.trim().length > 0 && !disabled
  const canRecord = !disabled && !isRecording

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-border bg-surface px-4 py-3"
    >
      <div className="max-w-3xl mx-auto flex items-end gap-2">
        {/* Attachment button (future) */}
        <IconButton
          type="button"
          variant="ghost"
          disabled={disabled}
          className="flex-shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </IconButton>

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Share what's on your mind..."
            disabled={disabled || isRecording}
            rows={1}
            className={`
              w-full resize-none px-4 py-3 rounded-xl
              bg-bg-secondary border border-border
              text-sm text-text-primary placeholder:text-text-tertiary
              focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-border-strong
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isRecording ? 'bg-accent-light border-accent' : ''}
            `}
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
        </div>

        {/* Microphone / Recording button */}
        {canRecord ? (
          <IconButton
            type="button"
            variant="accent"
            onClick={onStartRecording}
            disabled={disabled}
            className="flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-14 0m7 7v4m-4 0h8m-8-8a4 4 0 018 0" />
            </svg>
          </IconButton>
        ) : isRecording ? (
          <IconButton
            type="button"
            variant="accent"
            onClick={onStopRecording}
            className="flex-shrink-0 bg-error hover:bg-error"
          >
            <div className="w-5 h-5 rounded-sm bg-text-inverse" />
          </IconButton>
        ) : null}

        {/* Send button */}
        <IconButton
          type="submit"
          variant="accent"
          disabled={!canSend}
          className="flex-shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </IconButton>
      </div>

      {/* Recording indicator */}
      {isRecording && (
        <div className="max-w-3xl mx-auto mt-2 flex items-center gap-2 text-xs text-accent">
          <span className="w-2 h-2 bg-error rounded-full animate-pulse" />
          <span>Recording... tap mic to stop</span>
        </div>
      )}
    </form>
  )
}

export default InputComposer
