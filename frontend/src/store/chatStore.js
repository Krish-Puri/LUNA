import { create } from 'zustand'
import * as messagesApi from '../api/messages'

const useChatStore = create((set, get) => ({
  messages: [],
  isTyping: false,
  isSending: false,
  error: null,

  // Streaming token accumulators — { tempId: accumulatedString }
  streamingTokens: {},

  // Append a streaming token to the accumulator for a given temp message ID
  addStreamingToken: (tempId, token) => {
    set(state => ({
      streamingTokens: {
        ...state.streamingTokens,
        [tempId]: (state.streamingTokens[tempId] || '') + token,
      },
    }))
  },

  // Replace streaming accumulator with a confirmed final message
  finalizeStreamingMessage: (tempId, finalContent, confirmedId) => {
    const message = {
      id: confirmedId || tempId,
      role: 'assistant',
      content: finalContent,
      messageType: 'text',
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }),
    }
    set(state => {
      const { [tempId]: _, ...restTokens } = state.streamingTokens
      // Replace placeholder if it exists, otherwise append
      const exists = state.messages.some(m => m.id === tempId)
      return {
        messages: exists
          ? state.messages.map(m => m.id === tempId ? message : m)
          : [...state.messages, message],
        streamingTokens: restTokens,
        isTyping: false,
      }
    })
    return message
  },

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
            ? `http://localhost:8000/storage/${voiceNote.file_path.replace(/\\/g, '/').replace(/^storage\//, '')}`
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

  // Edit a user message content and mark it as edited
  editMessage: (id, newContent) => {
    set(state => ({
      messages: state.messages.map(m =>
        m.id === id ? { ...m, content: newContent, edited: true } : m
      ),
    }))
  },

  // Remove all messages from a given index onward (used when editing a message
  // and LUNA's subsequent responses are being regenerated)
  truncateMessagesFrom: (fromIndex) => {
    set(state => ({
      messages: state.messages.slice(0, fromIndex + 1),
    }))
  },

  // Clear messages
  clearMessages: () => set({ messages: [], isTyping: false, error: null }),
}))

export default useChatStore
