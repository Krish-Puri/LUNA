import { create } from 'zustand'
import * as sessionsApi from '../api/sessions'

function computeGroup(lastMessageAt, createdAt) {
  const now = new Date()
  const ref = lastMessageAt ? new Date(lastMessageAt) : new Date(createdAt)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const refDay = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())
  const diffDays = Math.floor((today - refDay) / 86400000)

  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  return 'earlier'
}

function computeTime(lastMessageAt, createdAt) {
  const now = new Date()
  const ref = lastMessageAt ? new Date(lastMessageAt) : new Date(createdAt)
  const diff = now - ref
  const diffDays = Math.floor(diff / 86400000)
  const diffHours = Math.floor(diff / 3600000)
  const diffMinutes = Math.floor(diff / 60000)

  if (diffDays === 0) {
    if (diffHours === 0) return diffMinutes <= 1 ? 'Just now' : `${diffMinutes} min ago`
    return `${diffHours}h ago`
  }
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return ref.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const SESSION_STORAGE_KEY = 'luna_active_session'

const useSessionStore = create((set, get) => ({
  sessions: [],
  activeSessionId: null,
  isLoading: false,
  error: null,
  userId: null,

  // Initialize: load sessions from API and restore activeSessionId
  initialize: async (userId) => {
    set({ isLoading: true, error: null, userId })
    try {
      const sessions = await sessionsApi.getSessions(userId)
      // Attach computed group/time fields from backend
      const mapped = sessions.map(s => ({
        id: s.id,
        title: s.title_custom || s.title_auto || '',
        preview: s.preview || '',
        summary: s.summary || null,
        time: s.time || computeTime(s.last_message_at, s.created_at),
        group: computeGroup(s.last_message_at, s.created_at),
        createdAt: new Date(s.created_at),
        lastMessageAt: s.last_message_at ? new Date(s.last_message_at) : null,
        isPinned: s.is_pinned || false,
        isArchived: s.is_archived || false,
        messages: [],
      }))
      // Fallback to URL session if no saved active session.
      // SessionsPage passes sessionId via the store's setActiveSession after
      // initialize completes, so this is only a fallback for reloads where
      // localStorage was cleared or the session predates the localStorage fix.
      const urlSessionId = (() => {
        // Read directly to avoid a reactive dependency on window.location
        const match = window.location.pathname.match(/^\/session\/([^/]+)/)
        return match ? match[1] : null
      })()
      const savedActiveId = localStorage.getItem(SESSION_STORAGE_KEY) || null
      // Only restore savedActiveId if it's still valid — a session deleted on another
      // device (or that predates a schema change) would otherwise be set as active
      // without existing in the sessions list, causing the sidebar to miss it.
      const validActiveId = (savedActiveId && mapped.some(s => s.id === savedActiveId))
        ? savedActiveId
        : (urlSessionId || null)
      set({
        sessions: mapped,
        activeSessionId: validActiveId,
        isLoading: false,
      })
    } catch (err) {
      set({ error: err.message, isLoading: false })
    }
  },

  // Get active session
  getActiveSession: () => {
    const { sessions, activeSessionId } = get()
    return sessions.find(s => s.id === activeSessionId) || null
  },

  // Set active session — persists to localStorage so it survives reloads
  setActiveSession: (sessionId) => {
    if (sessionId) {
      localStorage.setItem(SESSION_STORAGE_KEY, sessionId)
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY)
    }
    set({ activeSessionId: sessionId })
  },

  // Create new session
  createSession: async () => {
    const { userId } = get()
    if (!userId) return null
    try {
      const session = await sessionsApi.createSession(userId)
      const newSession = {
        id: session.id,
        title: '',
        preview: '',
        summary: null,
        time: 'Just now',
        group: 'today',
        createdAt: new Date(session.created_at),
        lastMessageAt: null,
        isPinned: false,
        isArchived: false,
        messages: [],
      }
      set(state => ({
        sessions: [newSession, ...state.sessions],
        activeSessionId: session.id,
      }))
      // Also persist to localStorage so reloads survive.
      localStorage.setItem(SESSION_STORAGE_KEY, session.id)
      return newSession
    } catch (err) {
      set({ error: err.message })
      return null
    }
  },

  // Delete session
  deleteSession: async (sessionId) => {
    try {
      await sessionsApi.deleteSession(sessionId)
      set(state => ({
        sessions: state.sessions.filter(s => s.id !== sessionId),
        activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId,
      }))
    } catch (err) {
      set({ error: err.message })
    }
  },

  // Clear active session (e.g. after deleting the active one)
  clearActiveSession: () => set({ activeSessionId: null }),

  // Rename session
  renameSession: async (sessionId, title) => {
    // Optimistic update
    set(state => ({
      sessions: state.sessions.map(s =>
        s.id === sessionId
          ? { ...s, title, preview: title }
          : s
      ),
    }))
    try {
      await sessionsApi.updateSession(sessionId, { title_custom: title })
    } catch (err) {
      set({ error: err.message })
    }
  },

  // Archive session
  archiveSession: async (sessionId) => {
    set(state => ({
      sessions: state.sessions.map(s =>
        s.id === sessionId ? { ...s, isArchived: true } : s
      ),
    }))
    try {
      await sessionsApi.updateSession(sessionId, { is_archived: true })
    } catch (err) {
      set({ error: err.message })
    }
  },

  // Unarchive session
  unarchiveSession: async (sessionId) => {
    set(state => ({
      sessions: state.sessions.map(s =>
        s.id === sessionId ? { ...s, isArchived: false } : s
      ),
    }))
    try {
      await sessionsApi.updateSession(sessionId, { is_archived: false })
    } catch (err) {
      set({ error: err.message })
    }
  },

  // Toggle pin (local only — no backend field)
  togglePin: (sessionId) => {
    set(state => ({
      sessions: state.sessions.map(s =>
        s.id === sessionId ? { ...s, isPinned: !s.isPinned } : s
      ),
    }))
  },

  // Update session preview after a new message
  updateSessionPreview: (sessionId, preview) => {
    set(state => ({
      sessions: state.sessions.map(session => {
        if (session.id !== sessionId) return session
        const updated = {
          ...session,
          preview,
          time: 'Just now',
          group: 'today',
          lastMessageAt: new Date(),
        }
        return updated
      }).sort((a, b) => {
        const aTime = a.lastMessageAt || a.createdAt
        const bTime = b.lastMessageAt || b.createdAt
        return bTime - aTime
      }),
    }))
  },

  // Append message to a session's message list
  addMessage: (sessionId, message) => {
    set(state => ({
      sessions: state.sessions.map(session => {
        if (session.id !== sessionId) return session
        return {
          ...session,
          messages: [...session.messages, message],
        }
      }),
    }))
  },

  // Load messages into a session
  setSessionMessages: (sessionId, messages) => {
    set(state => ({
      sessions: state.sessions.map(session => {
        if (session.id !== sessionId) return session
        return { ...session, messages }
      }),
    }))
  },
}))

export default useSessionStore
