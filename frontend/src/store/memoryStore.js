import { create } from 'zustand'

const useMemoryStore = create((set) => ({
  sessionMemories: null,

  setSessionMemories: (memories) => set({ sessionMemories: memories }),

  clearSessionMemories: () => set({ sessionMemories: null }),
}))

export default useMemoryStore
