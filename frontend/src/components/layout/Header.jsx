import IconButton from '../ui/IconButton'

const Header = ({ title, subtitle, showBackButton = false, onBack }) => {
  return (
    <header className="h-16 px-4 flex items-center border-b border-border bg-surface">
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
        <h1 className="text-base font-semibold text-text-primary truncate">
          {title || 'LUNA'}
        </h1>
        {subtitle && (
          <p className="text-xs text-text-tertiary">
            {subtitle}
          </p>
        )}
      </div>

      {/* Future: menu button */}
      <IconButton variant="ghost" className="ml-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </IconButton>
    </header>
  )
}

export default Header
