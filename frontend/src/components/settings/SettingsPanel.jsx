import { useEffect, useState } from 'react'
import useSettingsStore from '../../store/settingsStore'
import usePreferencesStore from '../../store/preferencesStore'

// Toggle switch
const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`
      relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200
      ${checked ? 'bg-accent' : 'bg-border'}
    `}
  >
    <span
      className={`
        inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200
        ${checked ? 'translate-x-4.5' : 'translate-x-0.5'}
      `}
    />
  </button>
)

// Radio option
const RadioOption = ({ value, selected, label, description, onChange }) => (
  <label className="flex items-start gap-3 cursor-pointer group">
    <div className={`
      mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors
      ${selected ? 'border-accent' : 'border-border-strong'}
    `}>
      {selected && <div className="w-2 h-2 rounded-full bg-accent" />}
    </div>
    <input
      type="radio"
      name="theme"
      value={value}
      checked={selected}
      onChange={() => onChange(value)}
      className="sr-only"
    />
    <div>
      <p className="text-sm text-text-primary group-hover:text-accent transition-colors">{label}</p>
      {description && <p className="text-xs text-text-tertiary mt-0.5">{description}</p>}
    </div>
  </label>
)

// Select dropdown
const Select = ({ value, onChange, options }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border rounded-lg
               text-text-primary focus:outline-none focus:border-border-strong"
  >
    {options.map(opt => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>
)

// Section heading
const Section = ({ title, children }) => (
  <div className="space-y-4">
    <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">{title}</h3>
    {children}
  </div>
)

// Range slider with label
const Slider = ({ label, value, min, max, step = 1, onChange }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs text-text-secondary">
      <span>{label}</span>
      <span className="text-accent">{value}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-1.5 bg-border rounded-full appearance-none cursor-pointer
                 accent-accent"
    />
  </div>
)

// Color swatch picker
const ColorPicker = ({ label, value, onChange }) => (
  <div className="flex items-center gap-3">
    <label className="text-xs text-text-secondary w-24">{label}</label>
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
      />
      <span className="text-xs text-text-tertiary font-mono">{value}</span>
    </div>
  </div>
)

// Hardcoded defaults — used for both initialisation and reset
const GRAIN_DEFAULTS = {
  color1: '#c1d3c7',
  color2: '#8ab1ff',
  color3: '#f2f5f3',
  timeSpeed: 0.15,
  warpAmplitude: 40.0,
}

const SettingsPanel = () => {
  const { isOpen, closeSettings } = useSettingsStore()
  const { theme, memoryEnabled, voiceEnabled, language, setTheme, updatePreference } = usePreferencesStore()

  const userId = localStorage.getItem('luna_user_id')

  // Grainient settings — stored in localStorage, not backed by API
  const [grainSettings, setGrainSettings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('luna_grainient_settings') || 'null')
    } catch {
      return null
    }
  })

  // Initialize grain settings with defaults if absent
  useEffect(() => {
    if (grainSettings === null) {
      setGrainSettings(GRAIN_DEFAULTS)
      localStorage.setItem('luna_grainient_settings', JSON.stringify(GRAIN_DEFAULTS))
    }
  }, [grainSettings])

  const updateGrain = (key, value) => {
    const next = { ...grainSettings, [key]: value }
    setGrainSettings(next)
    localStorage.setItem('luna_grainient_settings', JSON.stringify(next))
    // Dispatch a custom event so SessionsPage can pick up the new props
    window.dispatchEvent(new CustomEvent('luna-grain-settings-change', { detail: next }))
  }

  const resetGrain = () => {
    setGrainSettings(GRAIN_DEFAULTS)
    localStorage.setItem('luna_grainient_settings', JSON.stringify(GRAIN_DEFAULTS))
    window.dispatchEvent(new CustomEvent('luna-grain-settings-change', { detail: GRAIN_DEFAULTS }))
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={closeSettings}
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
          <h2 className="text-base font-semibold text-text-primary">Settings</h2>
          <button
            onClick={closeSettings}
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

          {/* Appearance */}
          <Section title="Appearance">
            <div className="space-y-3">
              <RadioOption
                value="light"
                selected={theme === 'light'}
                label="Light"
                description="Warm, bright interface"
                onChange={(v) => { setTheme(v); updatePreference(userId, 'theme', v) }}
              />
              <RadioOption
                value="dark"
                selected={theme === 'dark'}
                label="Dark"
                description="Easy on the eyes at night"
                onChange={(v) => { setTheme(v); updatePreference(userId, 'theme', v) }}
              />
              <RadioOption
                value="system"
                selected={theme === 'system'}
                label="System"
                description="Match your device settings"
                onChange={(v) => { setTheme(v); updatePreference(userId, 'theme', v) }}
              />
            </div>
          </Section>

          {/* Memory */}
          <Section title="Memory">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-primary">Remember context</p>
                <p className="text-xs text-text-tertiary mt-0.5">LUNA learns from your conversations</p>
              </div>
              <Toggle
                checked={memoryEnabled}
                onChange={(v) => updatePreference(userId, 'memoryEnabled', v)}
              />
            </div>
          </Section>

          {/* Voice */}
          <Section title="Voice">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-primary">Voice input</p>
                  <p className="text-xs text-text-tertiary mt-0.5">Record voice notes</p>
                </div>
                <Toggle
                  checked={voiceEnabled}
                  onChange={(v) => updatePreference(userId, 'voiceEnabled', v)}
                />
              </div>

              <div>
                <p className="text-xs text-text-secondary mb-1.5">Language</p>
                <Select
                  value={language}
                  onChange={(v) => updatePreference(userId, 'language', v)}
                  options={[
                    { value: 'en', label: 'English' },
                    { value: 'es', label: 'Español' },
                    { value: 'fr', label: 'Français' },
                    { value: 'de', label: 'Deutsch' },
                    { value: 'pt', label: 'Português' },
                  ]}
                />
              </div>
            </div>
          </Section>

          {/* Gradient Effects */}
          {grainSettings && (
            <Section title="Gradient Effects">
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs text-text-secondary">Colors</p>
                  <div className="space-y-2 pl-1">
                    <ColorPicker
                      label="Color 1"
                      value={grainSettings.color1}
                      onChange={(v) => updateGrain('color1', v)}
                    />
                    <ColorPicker
                      label="Color 2"
                      value={grainSettings.color2}
                      onChange={(v) => updateGrain('color2', v)}
                    />
                    <ColorPicker
                      label="Color 3"
                      value={grainSettings.color3}
                      onChange={(v) => updateGrain('color3', v)}
                    />
                  </div>
                </div>

                <Slider
                  label="Animation Speed"
                  value={grainSettings.timeSpeed}
                  min={0.01}
                  max={1}
                  step={0.01}
                  onChange={(v) => updateGrain('timeSpeed', v)}
                />

                <Slider
                  label="Warp Intensity"
                  value={grainSettings.warpAmplitude}
                  min={5}
                  max={100}
                  step={1}
                  onChange={(v) => updateGrain('warpAmplitude', v)}
                />

                <button
                  onClick={resetGrain}
                  className="w-full mt-1 py-2 text-xs text-text-secondary rounded-lg border border-border
                             hover:border-accent hover:text-accent transition-colors"
                >
                  Reset to Defaults
                </button>
              </div>
            </Section>
          )}
        </div>
      </div>
    </>
  )
}

export default SettingsPanel
