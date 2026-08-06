import { useState, useRef } from 'react'
import IconButton from '../ui/IconButton'
import useSessionMenuStore from '../../store/sessionMenuStore'

const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

const Header = ({ title, subtitle, sessionTitle, showBackButton = false, onBack, onRename, onMenuToggle }) => {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(title || '')
  const inputRef = useRef(null)

  const startEditing = () => {
    setValue(title || '')
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const commitEdit = () => {
    const trimmed = value.trim()
    if (trimmed && trimmed !== title && onRename) {
      onRename(trimmed)
    }
    setEditing(false)
  }

  const cancelEdit = () => {
    setValue(title || '')
    setEditing(false)
  }

  return (
    <header
      className="h-16 px-4 flex items-center border-b border-white/20 bg-white/40 backdrop-blur-md"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Hamburger — mobile only (hidden at lg+) */}
      <button
        type="button"
        onClick={onMenuToggle}
        className="mr-3 p-1.5 -ml-1.5 rounded-lg hover:bg-bg-secondary transition-colors lg:hidden"
        aria-label="Toggle sidebar"
      >
        <svg className="w-5 h-5 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Back button (mobile/sidebar context) */}
      {showBackButton && (
        <IconButton
          onClick={onBack}
          variant="ghost"
          className="mr-2 -ml-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </IconButton>
      )}

      {/* Title area */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => {
              if (e.key === 'Enter') commitEdit()
              if (e.key === 'Escape') cancelEdit()
            }}
            className="w-full bg-bg-secondary rounded-md text-base font-semibold text-text-primary border border-accent outline-none px-1 py-1"
            autoFocus
          />
        ) : (
          <>
            <h1
              onClick={onRename ? startEditing : undefined}
              className={`text-base font-semibold text-text-primary truncate cursor-pointer hover:text-accent transition-colors ${onRename ? 'select-none' : ''}`}
              title="Click to rename"
            >
              {title || 'LUNA'}
            </h1>
            {sessionTitle && !editing && (
              <p className="text-xs text-text-tertiary italic line-clamp-1">
                {getGreeting()} · {sessionTitle}
              </p>
            )}
          </>
        )}
        {subtitle && !editing && !sessionTitle && (
          <p className="text-xs text-text-tertiary">
            {subtitle}
          </p>
        )}
      </div>

      {/* Menu button */}
      <IconButton variant="ghost" className="ml-2" onClick={useSessionMenuStore(s => s.openSessionMenu)}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </IconButton>
    </header>
  )
}

export default Header
