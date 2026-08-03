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
  // Also marks the temp message as streaming so VoiceControls can disable itself
  addStreamingToken: (tempId, token) => {
    set(state => {
      const updatedMessages = state.messages.map(m =>
        m.id === tempId ? { ...m, streaming: true } : m
      )
      // If the temp message doesn't exist yet, add it as a placeholder
      const messageExists = state.messages.some(m => m.id === tempId)
      const placeholder = messageExists ? null : {
        id: tempId,
        role: 'assistant',
        content: '',
        messageType: 'text',
        streaming: true,
        timestamp: new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        }),
      }
      return {
        messages: messageExists ? updatedMessages : [...state.messages, placeholder],
        streamingTokens: {
          ...state.streamingTokens,
          [tempId]: (state.streamingTokens[tempId] || '') + token,
        },
      }
    })
  },

  // Replace streaming accumulator with a confirmed final message
  finalizeStreamingMessage: (tempId, finalContent, confirmedId) => {
    const message = {
      id: confirmedId || tempId,
      role: 'assistant',
      content: finalContent,
      messageType: 'text',
      streaming: false,
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
    // Mark loading state immediately so concurrent handleSendMessage flows
    // (which also call loadMessages via effect) see isSending: true.
    set({ isSending: true, error: null })
    try {
      const msgs = await messagesApi.getMessages(sessionId)

      // Re-read optimistic state AFTER the await.
      // By this point replaceMessage has already upgraded any confirmed messages
      // from temp IDs (user-/voice-/luna-) to server UUIDs, so they won't match
      // the filter and won't be double-merged. Only genuinely unconfirmed messages
      // (e.g. in-flight voice notes still awaiting their API response) are kept.
      const optimisticMessages = get().messages.filter(m =>
        m.id && (m.id.startsWith('voice-') || m.id.startsWith('user-') || m.id.startsWith('luna-'))
      )

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
      set({ messages: [...mapped, ...optimisticMessages], isSending: false })
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
      streaming: true,
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

  // Replace an optimistic message with the server-confirmed version.
  // Falls back to append if the placeholder wasn't found (handles duplicate /
  // missed-replace cases gracefully — prevents orphaned optimistics from vanishing).
  replaceMessage: (tempId, confirmedMessage) => {
    set(state => {
      const exists = state.messages.some(m => m.id === tempId)
      return {
        messages: exists
          ? state.messages.map(m => m.id === tempId ? confirmedMessage : m)
          : [...state.messages, confirmedMessage],
      }
    })
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
