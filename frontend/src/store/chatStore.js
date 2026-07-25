import { create } from 'zustand'
import * as messagesApi from '../api/messages'

const useChatStore = create((set, get) => ({
  messages: [],
  isTyping: false,
  isSending: false,
  error: null,

  // Load messages for a session from API
  loadMessages: async (sessionId) => {
    set({ isSending: true, error: null })
    try {
      const msgs = await messagesApi.getMessages(sessionId)
      // Map backend message fields to frontend shape
      const mapped = msgs.map(m => {
        const voiceNote = m.voice_note
        return {
          id: m.id,
          role: m.role,
          content: m.content || null,
          messageType: m.message_type,
          transcription: voiceNote?.transcript || null,
          audioUrl: voiceNote?.file_path
            ? `http://localhost:8000/storage/${voiceNote.file_path.split('/').pop()}`
            : null,
          createdAt: new Date(m.created_at),
          timestamp: new Date(m.created_at).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          }),
        }
      })
      set({ messages: mapped, isSending: false })
    } catch (err) {
      set({ error: err.message, isSending: false })
    }
  },

  // Add a user message locally (optimistic)
  addUserMessage: (content) => {
    const message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      messageType: 'text',
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }),
    }
    set(state => ({ messages: [...state.messages, message] }))
    return message
  },

  // Add a voice message locally (optimistic)
  addVoiceMessage: (audioUrl, transcription) => {
    const message = {
      id: `voice-${Date.now()}`,
      role: 'user',
      content: transcription || 'Voice note',
      messageType: 'voice',
      audioUrl,
      transcription,
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }),
    }
    set(state => ({ messages: [...state.messages, message] }))
    return message
  },

  // Set typing state (LUNA thinking)
  setTyping: (isTyping) => set({ isTyping }),

  // Set sending state
  setSending: (isSending) => set({ isSending }),

  // Add LUNA response locally
  addLunaMessage: (content, id) => {
    const message = {
      id: id || `luna-${Date.now()}`,
      role: 'assistant',
      content,
      messageType: 'text',
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }),
    }
    set(state => ({ messages: [...state.messages, message], isTyping: false }))
    return message
  },

  // Append a fully-formed message (e.g. from API refetch)
  appendMessage: (message) => {
    set(state => ({ messages: [...state.messages, message] }))
  },

  // Replace an optimistic message with the server-confirmed version
  replaceMessage: (tempId, confirmedMessage) => {
    set(state => ({
      messages: state.messages.map(m => m.id === tempId ? confirmedMessage : m),
    }))
  },

  // Clear messages
  clearMessages: () => set({ messages: [], isTyping: false, error: null }),
}))

export default useChatStore
