import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useTtsStore = create(
  persist(
    (set, get) => ({
      // Per-message TTS state: { [messageId]: { status, audioUrl, error } }
      // status: 'idle' | 'loading' | 'ready' | 'error'
      ttsState: {},

      getState: (messageId) => get().ttsState[messageId] || { status: 'idle', audioUrl: null },

      setLoading: (messageId) => set(state => ({
        ttsState: {
          ...state.ttsState,
          [messageId]: { status: 'loading', audioUrl: null },
        },
      })),

      setReady: (messageId, audioUrl) => set(state => ({
        ttsState: {
          ...state.ttsState,
          [messageId]: { status: 'ready', audioUrl },
        },
      })),

      setError: (messageId, error) => set(state => ({
        ttsState: {
          ...state.ttsState,
          [messageId]: { status: 'error', audioUrl: null, error },
        },
      })),

      clear: (messageId) => set(state => {
        const { [messageId]: _, ...rest } = state.ttsState
        return { ttsState: rest }
      }),
    }),
    {
      name: 'luna-tts-v1',  // namespaced key — avoids colliding with other persisted stores
    }
  )
)

export default useTtsStore
