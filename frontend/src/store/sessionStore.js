import { create } from 'zustand'

// Generate mock sessions for demo
const generateMockSessions = () => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today - 86400000)
  const twoDaysAgo = new Date(today - 2 * 86400000)
  const lastWeek = new Date(today - 7 * 86400000)

  return [
    {
      id: 'session-1',
      preview: 'I had a difficult conversation with my boss today...',
      time: '2 hours ago',
      group: 'today',
      createdAt: new Date(today.getTime() - 2 * 3600000),
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'I had a difficult conversation with my boss today and I feel really drained.',
          timestamp: '2:34 PM'
        },
        {
          id: 'msg-2',
          role: 'luna',
          content: 'That sounds like a really challenging day. It takes courage to navigate difficult conversations at work. How are you feeling right now, in this moment?',
          timestamp: '2:35 PM'
        }
      ]
    },
    {
      id: 'session-2',
      preview: 'I have been feeling anxious about an upcoming trip',
      time: 'Yesterday',
      group: 'yesterday',
      createdAt: new Date(yesterday.getTime()),
      messages: [
        {
          id: 'msg-3',
          role: 'user',
          content: 'I have been feeling anxious about an upcoming trip for weeks now.',
          timestamp: '10:15 AM'
        },
        {
          id: 'msg-4',
          role: 'luna',
          content: 'Anxiety about something in the future is completely natural. It shows you care. What is it specifically about the trip that is causing you worry?',
          timestamp: '10:16 AM'
        }
      ]
    },
    {
      id: 'session-3',
      preview: 'I want to talk about my meditation practice',
      time: 'Yesterday',
      group: 'yesterday',
      createdAt: new Date(yesterday.getTime() - 3600000 * 6),
      messages: []
    },
    {
      id: 'session-4',
      preview: 'Feeling grateful today but also a bit overwhelmed',
      time: '2 days ago',
      group: 'earlier',
      createdAt: new Date(twoDaysAgo.getTime()),
      messages: []
    },
    {
      id: 'session-5',
      preview: 'Work-life balance has been on my mind',
      time: 'Last week',
      group: 'earlier',
      createdAt: new Date(lastWeek.getTime()),
      messages: []
    }
  ]
}

const useSessionStore = create((set, get) => ({
  sessions: generateMockSessions(),
  activeSessionId: null,
  isLoading: false,

  // Get active session
  getActiveSession: () => {
    const { sessions, activeSessionId } = get()
    return sessions.find(s => s.id === activeSessionId) || null
  },

  // Set active session
  setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),

  // Create new session
  createSession: (sessionId) => {
    const newSession = {
      id: sessionId,
      preview: '',
      time: 'Just now',
      group: 'today',
      createdAt: new Date(),
      messages: []
    }
    set(state => ({
      sessions: [newSession, ...state.sessions],
      activeSessionId: sessionId
    }))
    return newSession
  },

  // Delete session
  deleteSession: (sessionId) => {
    set(state => ({
      sessions: state.sessions.filter(s => s.id !== sessionId),
      activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId
    }))
  },

  // Add message to session
  addMessage: (sessionId, message) => {
    set(state => ({
      sessions: state.sessions.map(session => {
        if (session.id !== sessionId) return session
        const newPreview = message.role === 'user'
          ? (message.content || message.transcription || 'Voice note').slice(0, 50)
          : session.preview
        return {
          ...session,
          preview: newPreview || session.preview,
          messages: [...session.messages, message]
        }
      })
    }))
  },

  // Update session with LUNA response
  setLunaResponse: (sessionId, content) => {
    const lunaMessage = {
      id: `msg-${Date.now()}`,
      role: 'luna',
      content,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    }
    get().addMessage(sessionId, lunaMessage)
    return lunaMessage
  }
}))

export default useSessionStore
