import { useEffect, useRef } from 'react'

/**
 * SummaryModal — centered modal for displaying a generated conversation summary.
 *
 * Props:
 *   isOpen       {bool}   — whether to show the modal
 *   summary      {string} — the summary text to display
 *   onClose      {fn}     — called to close the modal
 *   isGenerating {bool}   — if true, show a loading spinner instead of content
 */
const SummaryModal = ({ isOpen, summary, onClose, isGenerating = false }) => {
  const contentRef = useRef(null)

  // Trap focus and handle ESC key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Parse markdown-ish bold headers into styled spans for display
  const renderContent = (text) => {
    if (!text) return null
    // Split on **headers** and wrap them in styled spans
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const label = part.slice(2, -2)
        return (
          <span key={i} className="block font-semibold text-text-primary mt-4 first:mt-0 text-sm uppercase tracking-wide text-accent">
            {label}
          </span>
        )
      }
      // Handle newlines
      return part.split('\n').map((line, j) => (
        <span key={`${i}-${j}`}>{line}{j < part.split('\n').length - 1 ? '\n' : ''}</span>
      ))
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
        role="dialog"
        aria-modal="true"
        aria-label="Conversation Summary"
      >
        <div
          className="bg-surface rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col pointer-events-auto overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
            <div>
              <h2 className="text-base font-semibold text-text-primary">Conversation Summary</h2>
              <p className="text-xs text-text-tertiary mt-0.5">Your session at a glance</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-secondary transition-colors text-text-secondary flex-shrink-0 ml-4"
              aria-label="Close summary"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content — scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-text-secondary">Generating summary...</p>
              </div>
            ) : summary ? (
              <div className="text-sm text-text-primary leading-relaxed space-y-1">
                {renderContent(summary)}
              </div>
            ) : (
              <p className="text-sm text-text-tertiary italic">No summary available.</p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default SummaryModal
