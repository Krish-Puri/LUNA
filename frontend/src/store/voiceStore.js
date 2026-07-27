import { create } from 'zustand'

const useVoiceStore = create((set, get) => ({
  recordingState: 'idle', // 'idle' | 'recording' | 'recorded' | 'playing'
  audioBlob: null,
  audioUrl: null,
  duration: 0,
  error: null,

  // Transcription state
  transcriptionStatus: 'idle', // 'idle' | 'transcribing' | 'done' | 'error'
  transcript: null,              // raw transcript from API
  editedTranscript: null,       // user's edited version

  // Start recording — clears all prior transcription state
  startRecording: () => {
    set({
      recordingState: 'recording',
      audioBlob: null,
      audioUrl: null,
      duration: 0,
      error: null,
      transcriptionStatus: 'idle',
      transcript: null,
      editedTranscript: null,
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
      transcriptionStatus: 'idle',
      transcript: null,
      editedTranscript: null,
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
      transcriptionStatus: 'idle',
      transcript: null,
      editedTranscript: null,
    })
  },

  // Set transcription status (call with 'transcribing' before kicking off API)
  setTranscriptionStatus: (status) => {
    set({ transcriptionStatus: status })
  },

  // Set transcription result from API
  setTranscriptionResult: (transcript) => {
    set({
      transcriptionStatus: 'done',
      transcript,
      editedTranscript: transcript,
    })
  },

  // Set transcription error
  setTranscriptionError: (errorMsg) => {
    set({ transcriptionStatus: 'error', error: errorMsg })
  },

  // Update the edited transcript (user typing in preview bar)
  setEditedTranscript: (text) => {
    set({ editedTranscript: text })
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
