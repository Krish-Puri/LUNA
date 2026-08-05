import { useState, useRef, useEffect } from 'react'
import IconButton from '../ui/IconButton'
import VoiceMicButton from '../ui/VoiceMicButton'

const InputComposer = ({
  onSendMessage,
  onVoiceStop,   // (blob) => void — called when VoiceMicButton finishes recording
  onEditSubmit,
  editingMessage,
  isRecording = false,
  disabled = false
}) => {
  const [inputValue, setInputValue] = useState('')
  const textareaRef = useRef(null)

  // When editingMessage changes, populate the textarea with its content
  useEffect(() => {
    if (editingMessage) {
      setInputValue(editingMessage.content || '')
      // Focus and position cursor at end
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.selectionStart = textareaRef.current.value.length
        }
      }, 0)
    }
  }, [editingMessage])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [inputValue])

  const handleSubmit = (e) => {
    e.preventDefault()
    const text = inputValue.trim()
    if (!text || disabled) return

    if (editingMessage && onEditSubmit) {
      onEditSubmit(text)
    } else {
      onSendMessage(text)
    }
    setInputValue('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && editingMessage) {
      // Cancel edit
      setInputValue('')
      onEditSubmit && onEditSubmit(null) // signal cancel
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const cancelEdit = () => {
    setInputValue('')
    onEditSubmit && onEditSubmit(null)
  }

  const canSend = inputValue.trim().length > 0 && !disabled

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-white/20 bg-white/40 backdrop-blur-md px-4 py-4 shadow-sm"
    >
      {/* Edit mode header */}
      {editingMessage && (
        <div className="max-w-3xl mx-auto flex items-center justify-between mb-2">
          <span className="text-xs text-text-secondary italic">
            Editing message
          </span>
          <button
            type="button"
            onClick={cancelEdit}
            className="text-xs text-text-tertiary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
      <div className="max-w-3xl mx-auto flex items-center gap-2">
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

        {/* Microphone — VoiceMicButton manages its own recording state internally */}
        <VoiceMicButton
          onStop={onVoiceStop}
          disabled={disabled}
        />

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
    </form>
  )
}

export default InputComposer
