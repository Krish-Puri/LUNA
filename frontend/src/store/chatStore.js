import { create } from 'zustand'

const useChatStore = create((set, get) => ({
  messages: [],
  isTyping: false,
  isSending: false,

  // Add a user message
  addUserMessage: (content) => {
    const message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    }
    set(state => ({ messages: [...state.messages, message] }))
    return message
  },

  // Add a voice message
  addVoiceMessage: (audioUrl, transcription) => {
    const message = {
      id: `voice-${Date.now()}`,
      role: 'user',
      audioUrl,
      transcription,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    }
    set(state => ({ messages: [...state.messages, message] }))
    return message
  },

  // Set typing state (LUNA thinking)
  setTyping: (isTyping) => set({ isTyping }),

  // Add LUNA response
  addLunaMessage: (content) => {
    const message = {
      id: `luna-${Date.now()}`,
      role: 'luna',
      content,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    }
    set(state => ({ messages: [...state.messages, message], isTyping: false }))
    return message
  },

  // Clear messages
  clearMessages: () => set({ messages: [], isTyping: false }),

  // Load messages for a session
  loadMessages: (messages) => set({ messages: messages || [] })
}))

export default useChatStore
