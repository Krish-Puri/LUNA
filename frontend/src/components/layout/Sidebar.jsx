import { useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import Button from '../ui/Button'
import IconButton from '../ui/IconButton'
import Avatar from '../ui/Avatar'
import useSettingsStore from '../../store/settingsStore'

// Three-dots options dropdown for a session
const SessionOptionsMenu = ({ session, onRename, onDelete, onArchive, onUnarchive, onTogglePin }) => {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handle = (action) => {
    setOpen(false)
    action()
  }

  return (
    <div className="relative" ref={menuRef}>
      <IconButton
        variant="ghost"
        size="sm"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
        </svg>
      </IconButton>
      {open && (
        <div className="absolute right-2 top-8 z-50 bg-surface border border-border rounded-lg shadow-lg py-1 w-44">
          <button
            onClick={() => handle(() => onRename(session.id))}
            className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-tertiary flex items-center gap-2"
          >
            <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            Rename
          </button>
          <button
            onClick={() => handle(() => onTogglePin(session.id))}
            className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-tertiary flex items-center gap-2"
          >
            <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
            </svg>
            {session.isPinned ? 'Unpin' : 'Pin'}
          </button>
          {session.isArchived ? (
            <button
              onClick={() => handle(() => onUnarchive(session.id))}
              className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-tertiary flex items-center gap-2"
            >
              <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/>
              </svg>
              Unarchive
            </button>
          ) : (
            <button
              onClick={() => handle(() => onArchive(session.id))}
              className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-tertiary flex items-center gap-2"
            >
              <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/>
              </svg>
              Archive
            </button>
          )}
          <div className="border-t border-border my-1" />
          <button
            onClick={() => handle(() => onDelete(session.id))}
            className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-bg-tertiary flex items-center gap-2"
          >
            <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

// LUNA Logo component
const LunaLogo = () => (
  <div className="flex items-center gap-3 px-4 py-3">
    <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
      <span className="text-text-inverse font-semibold text-sm">L</span>
    </div>
    <span className="text-xl font-semibold text-text-primary">LUNA</span>
  </div>
)

// New Session Button
const NewSessionButton = ({ onClick }) => (
  <div className="px-3 py-2">
    <Button
      onClick={onClick}
      variant="secondary"
      className="w-full justify-start gap-2"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      New Session
    </Button>
  </div>
)

// Session group header
const SessionGroupHeader = ({ title, count }) => (
  <div className="px-4 py-2 flex items-center justify-between">
    <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
      {title}
    </span>
    <span className="text-xs text-text-tertiary">{count}</span>
  </div>
)

// Session item
const SessionItem = ({ session, isActive, onClick, onRename, onDelete, onArchive, onUnarchive, onTogglePin }) => (
  <div className={`group relative flex items-center w-full px-4 py-2.5 text-left transition-colors duration-150 hover:bg-bg-tertiary ${isActive ? 'bg-bg-tertiary' : ''}`}>
    {/* Clickable area */}
    <button
      onClick={onClick}
      className="flex-1 min-w-0 text-left"
    >
      <div className="flex items-center gap-1.5">
        {session.isPinned && (
          <svg className="w-3 h-3 text-accent flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
          </svg>
        )}
        <p className="text-sm text-text-primary line-clamp-1">
          {session.summary || session.title || session.preview || 'New conversation'}
        </p>
      </div>
      <p className="text-xs text-text-tertiary mt-1">
        {session.isArchived && <span className="mr-1 opacity-60">[Archived]</span>}
        {session.time}
      </p>
    </button>
    {/* Options button — positioned at the far right */}
    <div className="flex-shrink-0 pl-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <SessionOptionsMenu
        session={session}
        onRename={onRename}
        onDelete={onDelete}
        onArchive={onArchive}
        onUnarchive={onUnarchive}
        onTogglePin={onTogglePin}
      />
    </div>
  </div>
)

// Settings area at bottom
const SettingsArea = () => {
  const openSettings = useSettingsStore(s => s.openSettings)
  return (
    <div className="p-3 border-t border-border">
      <div
        onClick={openSettings}
        className="flex items-center gap-3 p-2 rounded-lg hover:bg-bg-tertiary cursor-pointer transition-colors"
      >
        <Avatar name="User" size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">My Space</p>
          <p className="text-xs text-text-tertiary">Settings</p>
        </div>
        <IconButton variant="ghost" size="sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </IconButton>
      </div>
    </div>
  )
}

// Main Sidebar component
const Sidebar = ({
  sessions = [],
  activeSessionId,
  onSessionSelect,
  onNewSession,
  onRename,
  onDelete,
  onArchive,
  onUnarchive,
  onTogglePin,
}) => {
  const navigate = useNavigate()

  // Separate active (non-archived) from archived sessions
  const activeSessions = sessions.filter(s => !s.isArchived)
  const archivedSessions = sessions.filter(s => s.isArchived)

  // Group active sessions by time period
  const groupedSessions = {
    today: activeSessions.filter(s => s.group === 'today'),
    yesterday: activeSessions.filter(s => s.group === 'yesterday'),
    earlier: activeSessions.filter(s => s.group === 'earlier'),
  }

  const handleSessionClick = (sessionId) => {
    navigate(`/session/${sessionId}`)
    if (onSessionSelect) onSessionSelect(sessionId)
  }

  const handleNewSession = () => {
    if (onNewSession) onNewSession()
  }

  const renderSessionItem = (session) => (
    <SessionItem
      key={session.id}
      session={session}
      isActive={session.id === activeSessionId}
      onClick={() => handleSessionClick(session.id)}
      onRename={onRename}
      onDelete={onDelete}
      onArchive={onArchive}
      onUnarchive={onUnarchive}
      onTogglePin={onTogglePin}
    />
  )

  return (
    <aside className="w-[280px] h-full bg-white/40 backdrop-blur-md border-r border-white/20 flex flex-col">
      {/* Logo */}
      <LunaLogo />

      {/* New Session Button */}
      <NewSessionButton onClick={handleNewSession} />

      {/* Divider */}
      <div className="border-t border-border mx-3 my-2" />

      {/* Session List */}
      <div className="flex-1 overflow-y-auto">
        {/* Today */}
        {groupedSessions.today.length > 0 && (
          <div className="mb-3">
            <SessionGroupHeader title="Today" count={groupedSessions.today.length} />
            {groupedSessions.today.map(renderSessionItem)}
          </div>
        )}

        {/* Yesterday */}
        {groupedSessions.yesterday.length > 0 && (
          <div className="mb-3">
            <SessionGroupHeader title="Yesterday" count={groupedSessions.yesterday.length} />
            {groupedSessions.yesterday.map(renderSessionItem)}
          </div>
        )}

        {/* Earlier */}
        {groupedSessions.earlier.length > 0 && (
          <div className="mb-3">
            <SessionGroupHeader title="Earlier" count={groupedSessions.earlier.length} />
            {groupedSessions.earlier.map(renderSessionItem)}
          </div>
        )}

        {/* Archived sessions */}
        {archivedSessions.length > 0 && (
          <div className="mb-3">
            <SessionGroupHeader title="Archived" count={archivedSessions.length} />
            {archivedSessions.map(renderSessionItem)}
          </div>
        )}

        {/* Empty state hint */}
        {sessions.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-text-tertiary">
              No conversations yet
            </p>
            <p className="text-xs text-text-tertiary mt-1">
              Start a new session to begin
            </p>
          </div>
        )}
      </div>

      {/* Settings */}
      <SettingsArea />
    </aside>
  )
}

export default Sidebar
