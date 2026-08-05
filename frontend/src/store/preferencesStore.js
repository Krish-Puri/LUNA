import { create } from 'zustand'
import * as preferencesApi from '../api/preferences'

const usePreferencesStore = create((set, get) => ({
  theme: 'light',
  memoryEnabled: true,
  voiceEnabled: true,
  language: 'en',
  notifications: true,
  isLoaded: false,

  loadPreferences: async (userId) => {
    try {
      const prefs = await preferencesApi.getPreferences(userId)
      set({
        theme: prefs.theme || 'light',
        memoryEnabled: prefs.memory_enabled ?? true,
        voiceEnabled: prefs.voice_enabled ?? true,
        language: prefs.language || 'en',
        notifications: prefs.notifications ?? true,
        isLoaded: true,
      })
    } catch {
      set({ isLoaded: true })
    }
  },

  updatePreference: async (userId, key, value) => {
    // Optimistic update
    set({ [key]: value })

    // Persist to backend
    const keyMap = {
      theme: 'theme',
      memoryEnabled: 'memory_enabled',
      voiceEnabled: 'voice_enabled',
      language: 'language',
      notifications: 'notifications',
    }
    const apiKey = keyMap[key]
    if (!apiKey) return

    try {
      await preferencesApi.updatePreferences(userId, { [apiKey]: value })
    } catch (err) {
      // silently ignore — preference update failure shouldn't disrupt UX
    }
  },

  setTheme: (theme) => {
    set({ theme })
    // Apply or remove dark class on <html>
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = theme === 'dark' || (theme === 'system' && prefersDark)
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('luna_theme', theme)
  },
}))

export default usePreferencesStore
