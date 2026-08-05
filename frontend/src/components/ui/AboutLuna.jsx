import useSettingsStore from '../../store/settingsStore'

const FeatureCard = ({ icon, title, description }) => (
  <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'rgba(193, 211, 199, 0.15)' }}>
    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(138, 177, 255, 0.15)', color: '#8ab1ff' }}>
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-text-primary">{title}</p>
      <p className="text-xs text-text-tertiary mt-0.5">{description}</p>
    </div>
  </div>
)

const AboutLuna = () => {
  const { isAboutOpen, closeAbout } = useSettingsStore()

  if (!isAboutOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={closeAbout}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-80 z-50 flex flex-col
                      bg-surface border-l border-border shadow-lg
                      animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-text-primary">About Luna</h2>
          <button
            onClick={closeAbout}
            className="w-8 h-8 flex items-center justify-center rounded-full
                       hover:bg-bg-secondary transition-colors text-text-secondary"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

          {/* What is Luna? */}
          <div>
            <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">What is Luna?</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Luna is your personal AI mental wellness companion — here to listen, support, and help you reflect. Chat naturally, record voice notes, or just let Luna know how you are.
            </p>
          </div>

          {/* Getting Started */}
          <div>
            <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">Getting Started</h3>
            <ol className="space-y-2">
              {[
                'Create a new session.',
                'Type a message or record a voice note.',
                'Luna responds in real time.',
                'Click "Listen to Luna" to hear the response.',
                'Return anytime — your conversation is saved.',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-text-secondary">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent text-text-inverse text-xs flex items-center justify-center font-medium mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* Features */}
          <div>
            <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">Features</h3>
            <div className="space-y-2">
              <FeatureCard
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                }
                title="Text Chat"
                description="Chat naturally with Luna in real time."
              />
              <FeatureCard
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                }
                title="Voice Notes"
                description="Record and send audio messages."
              />
              <FeatureCard
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414" />
                  </svg>
                }
                title="Listen to Luna"
                description="Hear Luna's responses spoken aloud."
              />
              <FeatureCard
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                }
                title="Sessions"
                description="Create, rename, pin, and archive conversations."
              />
              <FeatureCard
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                }
                title="Customize Theme"
                description="Personalize gradient colors and animation."
              />
            </div>
          </div>

          {/* Tips */}
          <div>
            <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">Tips</h3>
            <ul className="space-y-2">
              {[
                'Be open and honest — Luna is here for you.',
                'Use voice notes when typing feels inconvenient.',
                'Toggle "Remember context" to let Luna learn from past conversations.',
                'Click the pin icon to keep important sessions at the top.',
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                  <span className="text-accent mt-0.5">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Privacy */}
          <div className="p-3 rounded-lg" style={{ background: 'rgba(193, 211, 199, 0.15)' }}>
            <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">Privacy</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Your conversations are stored locally in your browser and on our server. No data is shared with third parties. You can delete your account data at any time by clearing your browser data.
            </p>
          </div>

          {/* Version */}
          <div className="pt-4 border-t border-border">
            <p className="text-sm font-semibold text-text-primary">LUNA</p>
            <p className="text-xs text-text-tertiary mt-0.5">Version 1.0</p>
            <p className="text-xs text-text-tertiary mt-1">Built with: React, FastAPI, Groq, Whisper, Piper, SQLite</p>
          </div>
        </div>
      </div>
    </>
  )
}

export default AboutLuna
