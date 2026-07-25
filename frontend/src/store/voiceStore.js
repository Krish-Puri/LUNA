import { create } from 'zustand'

const useVoiceStore = create((set, get) => ({
  recordingState: 'idle', // 'idle' | 'recording' | 'recorded' | 'playing'
  audioBlob: null,
  audioUrl: null,
  duration: 0,
  error: null,

  // Start recording
  startRecording: () => {
    set({
      recordingState: 'recording',
      audioBlob: null,
      audioUrl: null,
      duration: 0,
      error: null,
    })
  },

  // Stop recording
  stopRecording: (audioBlob) => {
    const audioUrl = audioBlob ? URL.createObjectURL(audioBlob) : null
    set({
      recordingState: 'recorded',
      audioBlob,
      audioUrl,
      error: null,
    })
    return audioUrl
  },

  // Clear recording
  clearRecording: () => {
    const { audioUrl } = get()
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    set({
      recordingState: 'idle',
      audioBlob: null,
      audioUrl: null,
      duration: 0,
    })
  },

  // Set playing state
  setPlaying: (isPlaying) => {
    set({ recordingState: isPlaying ? 'playing' : 'recorded' })
  },

  // Set error
  setError: (error) => set({ error, recordingState: 'idle' }),

  // Update duration
  setDuration: (duration) => set({ duration }),
}))

export default useVoiceStore
