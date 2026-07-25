import { useNavigate } from 'react-router-dom'
import Button from '../ui/Button'
import IconButton from '../ui/IconButton'
import Avatar from '../ui/Avatar'

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
const SessionItem = ({ session, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`
      w-full px-4 py-3 text-left transition-colors duration-150
      hover:bg-bg-tertiary
      ${isActive ? 'bg-bg-tertiary' : ''}
    `}
  >
    <p className="text-sm text-text-primary line-clamp-1">
      {session.preview || 'New conversation'}
    </p>
    <p className="text-xs text-text-tertiary mt-1">
      {session.time}
    </p>
  </button>
)

// Settings area at bottom
const SettingsArea = () => (
  <div className="p-3 border-t border-border">
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-bg-tertiary cursor-pointer transition-colors">
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

// Main Sidebar component
const Sidebar = ({
  sessions = [],
  activeSessionId,
  onSessionSelect,
  onNewSession
}) => {
  const navigate = useNavigate()

  // Group sessions by time period
  const groupedSessions = {
    today: sessions.filter(s => s.group === 'today'),
    yesterday: sessions.filter(s => s.group === 'yesterday'),
    earlier: sessions.filter(s => s.group === 'earlier'),
  }

  const handleSessionClick = (sessionId) => {
    navigate(`/session/${sessionId}`)
    if (onSessionSelect) onSessionSelect(sessionId)
  }

  const handleNewSession = () => {
    const newId = `session-${Date.now()}`
    if (onNewSession) onNewSession(newId)
    navigate(`/session/${newId}`)
  }

  return (
    <aside className="w-[280px] h-full bg-bg-secondary border-r border-border flex flex-col">
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
          <div className="mb-2">
            <SessionGroupHeader title="Today" count={groupedSessions.today.length} />
            {groupedSessions.today.map(session => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId}
                onClick={() => handleSessionClick(session.id)}
              />
            ))}
          </div>
        )}

        {/* Yesterday */}
        {groupedSessions.yesterday.length > 0 && (
          <div className="mb-2">
            <SessionGroupHeader title="Yesterday" count={groupedSessions.yesterday.length} />
            {groupedSessions.yesterday.map(session => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId}
                onClick={() => handleSessionClick(session.id)}
              />
            ))}
          </div>
        )}

        {/* Earlier */}
        {groupedSessions.earlier.length > 0 && (
          <div className="mb-2">
            <SessionGroupHeader title="Earlier" count={groupedSessions.earlier.length} />
            {groupedSessions.earlier.map(session => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId}
                onClick={() => handleSessionClick(session.id)}
              />
            ))}
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
