/**
 * SessionMenuPanel — slide-in panel with session-scoped actions.
 *
 * Props:
 *   isOpen        {bool}   — whether the panel is visible
 *   onClose       {fn}     — called to close the panel
 *   session       {obj}     — { id, title, summary, isArchived } of the active session
 *   onRename      {fn}     — (sessionId) rename the session
 *   onGenerateSummary {fn} — (sessionId) trigger summary generation
 *   onArchive     {fn}     — (sessionId) archive the session
 *   onUnarchive   {fn}     — (sessionId) unarchive the session
 *   onDelete      {fn}     — (sessionId) delete the session
 *   onClear       {fn}     — (sessionId) clear all messages in the session
 *   onExport      {fn}     — (sessionId) export the conversation
 */
import useSessionMenuStore from '../../store/sessionMenuStore'

// --- Reusable UI primitives (match SettingsPanel design language) ---

const MenuSection = ({ title, children }) => (
  <div className="space-y-1">
    {title && (
      <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider px-1">
        {title}
      </h3>
    )}
    {children}
  </div>
)

const MenuItem = ({ icon, label, description, onClick, destructive = false, disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
      transition-colors duration-150
      ${destructive
        ? 'text-red-500 hover:bg-red-500/10'
        : 'text-text-primary hover:bg-bg-tertiary'
      }
      ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
    `}
  >
    <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center opacity-70">
      {icon}
    </span>
    <span className="flex-1 min-w-0">
      <span className="text-sm font-medium block">{label}</span>
      {description && (
        <span className="text-xs text-text-tertiary block mt-0.5">{description}</span>
      )}
    </span>
  </button>
)

const Divider = () => <div className="border-t border-border mx-3 my-1" />

// --- Icon helpers (inline SVGs, no external icon lib dependency) ---

const IconPencil = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
)

const IconSparkle = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
)

const IconEye = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
)

const IconDownload = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
)

const IconShare = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
)

const IconArchive = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
  </svg>
)

const IconTrash = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

const IconEraser = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

// --- Main panel ---

const SessionMenuPanel = ({
  session,
  onRename,
  onGenerateSummary,
  onArchive,
  onUnarchive,
  onDelete,
  onClear,
  onExport,
}) => {
  const { isOpen, closeSessionMenu } = useSessionMenuStore()

  if (!isOpen) return null

  const handle = (action) => {
    if (!session) return
    closeSessionMenu()
    // Use setTimeout to ensure the panel closes before the action fires
    // (avoids visual glitch where panel lingers during navigation)
    setTimeout(() => action(session.id), 50)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={closeSessionMenu}
      />

      {/* Panel — bottom sheet on mobile, right-side drawer on desktop */}
      <div className={`
        fixed z-50 flex flex-col bg-surface shadow-lg
        animate-slide-up lg:animate-slide-in
        /* Mobile: bottom sheet */
        bottom-0 left-0 right-0 top-auto w-full max-h-[85vh] rounded-t-2xl
        /* Desktop: right-side floating panel */
        lg:bottom-auto lg:left-auto lg:right-0 lg:top-0 lg:w-80 lg:max-h-full lg:rounded-none lg:rounded-l-xl
      `}>
        {/* Drag handle — mobile only */}
        <div className="flex justify-center pt-3 pb-2 lg:hidden">
          <div className="w-9 h-1 bg-border rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-text-primary truncate">
              {session?.summary || session?.title || 'Session'}
            </h2>
            {session?.summary && (
              <p className="text-xs text-text-tertiary mt-0.5 line-clamp-2">
                {session.summary}
              </p>
            )}
          </div>
          <button
            onClick={closeSessionMenu}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full
                       hover:bg-bg-secondary transition-colors text-text-secondary ml-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Actions */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

          {/* Session Info */}
          <MenuSection title="Session">
            <MenuItem
              icon={<IconPencil />}
              label="Rename"
              description="Change the session title"
              onClick={() => handle(onRename)}
            />
          </MenuSection>

          <Divider />

          {/* Summary */}
          <MenuSection title="Summary">
            <MenuItem
              icon={<IconSparkle />}
              label="Generate Summary"
              description="Create a one-line summary (every 10 messages)"
              onClick={() => handle(onGenerateSummary)}
            />
            {session?.summary && (
              <MenuItem
                icon={<IconEye />}
                label="View Summary"
                description={session.summary}
                onClick={() => {}} // No-op — already visible in the header above
              />
            )}
          </MenuSection>

          <Divider />

          {/* Data */}
          <MenuSection title="Data">
            <MenuItem
              icon={<IconShare />}
              label="Export Conversation"
              description="Share or copy the full transcript"
              onClick={() => handle(onExport)}
            />
            <MenuItem
              icon={<IconDownload />}
              label="Download Transcript"
              description="Save as a text file"
              onClick={() => {}} // Placeholder — backend not wired yet
              disabled
            />
          </MenuSection>

          <Divider />

          {/* Session Management */}
          <MenuSection title="Manage">
            {session?.isArchived ? (
              <MenuItem
                icon={<IconArchive />}
                label="Unarchive Session"
                description="Move back to your session list"
                onClick={() => handle(onUnarchive)}
              />
            ) : (
              <MenuItem
                icon={<IconArchive />}
                label="Archive Session"
                description="Hide from the main list"
                onClick={() => handle(onArchive)}
              />
            )}
            <MenuItem
              icon={<IconEraser />}
              label="Clear Conversation"
              description="Delete all messages but keep the session"
              onClick={() => handle(onClear)}
            />
          </MenuSection>

          <Divider />

          {/* Danger Zone */}
          <MenuSection title="Danger Zone">
            <MenuItem
              icon={<IconTrash />}
              label="Delete Session"
              description="Permanently delete this session and all messages"
              onClick={() => handle(onDelete)}
              destructive
            />
          </MenuSection>

        </div>
      </div>
    </>
  )
}

export default SessionMenuPanel
