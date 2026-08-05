import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar'
import Header from '../components/layout/Header'
import MainContent from '../components/layout/MainContent'
import ChatArea from '../components/chat/ChatArea'
import InputComposer from '../components/chat/InputComposer'
import Grainient from '../components/ui/Grainient'
import SettingsPanel from '../components/settings/SettingsPanel'
import SessionMenuPanel from '../components/settings/SessionMenuPanel'
import AboutLuna from '../components/ui/AboutLuna'
import { API_BASE } from '../config'
import useSessionStore from '../store/sessionStore'
import useChatStore from '../store/chatStore'
import useVoiceStore from '../store/voiceStore'
import usePreferencesStore from '../store/preferencesStore'
import * as usersApi from '../api/users'
import * as messagesApi from '../api/messages'
import { streamChat, parseSSEData } from '../api/chat'

// Ensure a default user exists, returns user id.
// Each browser generates its own UUID via crypto.randomUUID() and stores it in
// localStorage. On first visit we POST to get-or-create (server generates no
// email), on return visits we find the same user by that UUID.
async function ensureUser() {
  let userId = localStorage.getItem('luna_user_id')
  if (!userId) {
    // Brand new browser — generate a UUID client-side, persist it, then
    // register it with the backend so we can find it again on return visits.
    userId = crypto.randomUUID()
    localStorage.setItem('luna_user_id', userId)
  }
  const user = await usersApi.getOrCreateUser(userId)
  return user.id
}

// Voice preview bar shown after recording — handles transcription display and editing
const VoicePreviewBar = ({
  audioUrl,
  transcriptionStatus,
  transcript,
  editedTranscript,
  onTranscriptChange,
  onSend,
  onDiscard,
}) => {
  const isLoading = transcriptionStatus === 'transcribing'
  const isDone = transcriptionStatus === 'done'
  const isError = transcriptionStatus === 'error'

  return (
    <div className="border-t border-white/20 bg-white/40 backdrop-blur-md px-4 py-3">
      <div className="max-w-3xl mx-auto flex flex-col gap-3">
        {/* Audio row */}
        <div className="flex items-center gap-3">
          <audio src={audioUrl} controls className="flex-1 h-8" />
          <button
            onClick={onDiscard}
            className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Discard
          </button>
          <button
            onClick={onSend}
            disabled={isLoading}
            className="px-4 py-1.5 bg-accent text-text-inverse text-sm rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>

        {/* Transcribing spinner */}
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <span className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            Transcribing...
          </div>
        )}

        {/* Editable transcript */}
        {isDone && (
          <textarea
            value={editedTranscript ?? transcript ?? ''}
            onChange={(e) => onTranscriptChange(e.target.value)}
            rows={2}
            placeholder="Transcript will appear here..."
            className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border rounded-lg resize-none focus:outline-none focus:border-border-strong"
          />
        )}

        {/* Error state */}
        {isError && (
          <p className="text-sm text-error">
            Transcription failed. You can still send the voice note.
          </p>
        )}
      </div>
    </div>
  )
}

const SessionsPage = () => {
  const { sessionId } = useParams()
  const navigate = useNavigate()

  // Stores
  const {
    sessions,
    activeSessionId,
    userId,
    setActiveSession,
    clearActiveSession,
    createSession,
    addMessage,
    updateSessionPreview,
    initialize,
    renameSession,
    deleteSession,
    archiveSession,
    unarchiveSession,
    togglePin,
  } = useSessionStore()

  const {
    messages,
    isTyping,
    loadMessages,
    addUserMessage,
    replaceMessage,
    addVoiceMessage,
    addStreamingToken,
    finalizeStreamingMessage,
    setTyping,
    clearMessages,
    editMessage,
    truncateMessagesFrom,
  } = useChatStore()

  const {
    recordingState,
    audioBlob,
    audioUrl,
    stopRecording,
    clearRecording,
    transcriptionStatus,
    transcript,
    editedTranscript,
    setTranscriptionStatus,
    setTranscriptionResult,
    setTranscriptionError,
    setEditedTranscript,
  } = useVoiceStore()

  // Local state
  const [isInitialized, setIsInitialized] = useState(false)
  const [editingMessage, setEditingMessage] = useState(null)  // message being edited
  const [isSending, setIsSending] = useState(false)  // guard against concurrent handleSendMessage calls
  const [grainSettings, setGrainSettings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('luna_grainient_settings') || 'null')
    } catch { return null }
  })

  // AbortController for cancelling in-flight SSE streams on session change
  const streamControllerRef = useRef(null)

  // Initialize on mount: ensure user + load sessions + load preferences
  useEffect(() => {
    const init = async () => {
      // Apply dark mode class before first paint to avoid flash
      const savedTheme = localStorage.getItem('luna_theme') || 'system'
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (savedTheme === 'dark' || (savedTheme === 'system' && prefersDark)) {
        document.documentElement.classList.add('dark')
      }

      try {
        const uid = await ensureUser()
        await initialize(uid)
        usePreferencesStore.getState().loadPreferences(uid)
        // setIsInitialized(true) only AFTER initialize() has restored
        // activeSessionId from localStorage — so the URL effect sees the
        // correct activeSessionId and doesn't call setActiveSession(null).
        setIsInitialized(true)
      } catch (err) {
        setIsInitialized(true)
      }
    }
    init()
  }, [])

  // Listen for grain settings changes from SettingsPanel
  useEffect(() => {
    const handler = (e) => setGrainSettings(e.detail)
    window.addEventListener('luna-grain-settings-change', handler)
    return () => window.removeEventListener('luna-grain-settings-change', handler)
  }, [])

  // Handle session change from URL — skips if sessionId is undefined to avoid
  // overwriting the activeSessionId that initialize() just restored from localStorage.
  useEffect(() => {
    if (!isInitialized || !sessionId) return
    setActiveSession(sessionId)
  }, [sessionId, isInitialized])

  // Load messages when active session changes
  useEffect(() => {
    if (!isInitialized) return
    const currentId = activeSessionId || sessionId
    if (currentId) {
      // Guard: if activeSessionId is null but sessionId is set, the session may have been
      // deleted — check it still exists in the sessions list before loading
      if (activeSessionId === null && sessionId) {
        const stillExists = sessions.some(s => s.id === sessionId)
        if (!stillExists) {
          clearMessages()
          return
        }
      }
      loadMessages(currentId)
    } else {
      clearMessages()
    }
  }, [activeSessionId, sessionId, isInitialized, loadMessages, clearMessages])

  // Handle new session creation
  const handleNewSession = async () => {
    if (!userId) return
    const newSession = await createSession()
    if (newSession) {
      navigate(`/session/${newSession.id}`)
    }
  }

  // Ensure we have an active session, create if needed
  const getOrCreateSession = async () => {
    let currentSessionId = activeSessionId || sessionId
    if (!currentSessionId) {
      const newSess = await createSession()
      if (!newSess) return null
      currentSessionId = newSess.id
      setActiveSession(currentSessionId)
      navigate(`/session/${currentSessionId}`)
    } else {
      // Existing session — ensure it's persisted to localStorage
      setActiveSession(currentSessionId)
    }
    return currentSessionId
  }

  // Handle sending a text message — streams LUNA's response via SSE
  const handleSendMessage = async (content) => {
    if (!content.trim()) return
    if (isSending) return
    setIsSending(true)
    try {
    const currentSessionId = await getOrCreateSession()
    if (!currentSessionId) return

    // Cancel any in-flight stream from a previous message
    if (streamControllerRef.current) {
      streamControllerRef.current.abort()
    }

    const userMsg = addUserMessage(content)
    // NOTE: addMessage to sessionStore is intentionally omitted — sessionStore holds
    // confirmed messages only. The optimistic userMsg stays in chatStore until the
    // API confirms it and replaceMessage swaps it to the server-assigned ID.
    // Set session title on first message only — never overwrite with subsequent messages.
    const currentSession = useSessionStore.getState().sessions.find(s => s.id === currentSessionId)
    if (!currentSession?.title && !currentSession?.preview) {
      renameSession(currentSessionId, content.slice(0, 50))
    } else {
      updateSessionPreview(currentSessionId, content.slice(0, 50))
    }
    setTyping(true)

    // POST user message to backend (stores it, returns confirmed id)
    let confirmedUserMsg = null
    try {
      confirmedUserMsg = await messagesApi.sendMessage(currentSessionId, { content })
      replaceMessage(userMsg.id, {
        ...userMsg,
        id: confirmedUserMsg.id,
        timestamp: new Date(confirmedUserMsg.created_at).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        }),
      })
    } catch (err) {
      // silently ignore — message is already displayed optimistically
    }

    // Start LUNA response stream
    const controller = new AbortController()
    streamControllerRef.current = controller
    const tempLunaId = `luna-${Date.now()}`
    let accumulated = ''

    // Add a placeholder LUNA message that will be filled token-by-token
    const lunaPlaceholder = {
      id: tempLunaId,
      role: 'assistant',
      content: '',
      messageType: 'text',
      streaming: true,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    }
    useChatStore.setState(state => ({ messages: [...state.messages, lunaPlaceholder] }))

    try {
      const { reader } = await streamChat(
        currentSessionId,
        content,
        tempLunaId,
        controller.signal
      )

      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          const data = parseSSEData(line)
          if (!data) continue

          if (data.error) {
            break
          }

          if (!data.done) {
            accumulated += data.token
            addStreamingToken(tempLunaId, data.token)
            // Also update the message in the list for real-time display
            useChatStore.setState(state => ({
              messages: state.messages.map(m =>
                m.id === tempLunaId
                  ? { ...m, content: accumulated }
                  : m
              ),
            }))
          } else {
            // Stream complete — add final LUNA message
            const confirmedId = data.message_id || tempLunaId
            finalizeStreamingMessage(tempLunaId, accumulated, confirmedId)
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') { setIsSending(false); return }  // stream was cancelled — normal
      setTyping(false)
    }
    } finally {
      setIsSending(false)
    }
  }

  // Start editing a user message
  const handleEditMessage = (message) => {
    setEditingMessage(message)
  }

  // Submit an edited message: update DB, remove subsequent LUNA responses, re-stream
  const handleEditSubmit = async (newContent) => {
    if (newContent === null) {
      // Cancel edit
      setEditingMessage(null)
      return
    }

    if (!editingMessage) return
    const { id: editId, session_id: editSessionId } = editingMessage
    const editSession = editSessionId || (activeSessionId || sessionId)

    // Cancel any in-flight stream
    if (streamControllerRef.current) {
      streamControllerRef.current.abort()
    }

    // Find index of the message being edited and remove everything after it
    // (including LUNA's old responses to the original message)
    const msgIndex = messages.findIndex(m => m.id === editId)
    if (msgIndex !== -1) {
      truncateMessagesFrom(msgIndex)
    }

    // Update in store (mark as edited)
    editMessage(editId, newContent)

    setEditingMessage(null)
    setTyping(true)

    // Call PATCH /api/messages/{id} to update in DB
    try {
      await messagesApi.updateMessage(editId, { content: newContent })
    } catch (err) {
      setTyping(false)
      return
    }

    // Stream new LUNA response to the edited message
    const controller = new AbortController()
    streamControllerRef.current = controller
    const tempLunaId = `luna-${Date.now()}`
    let accumulated = ''

    const lunaPlaceholder = {
      id: tempLunaId,
      role: 'assistant',
      content: '',
      messageType: 'text',
      streaming: true,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    }
    useChatStore.setState(state => ({ messages: [...state.messages, lunaPlaceholder] }))

    try {
      const { reader } = await streamChat(
        editSession,
        newContent,
        editId,  // use the existing message ID so backend detects it as edit
        controller.signal
      )

      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          const data = parseSSEData(line)
          if (!data) continue

          if (data.error) {
            break
          }

          if (!data.done) {
            accumulated += data.token
            addStreamingToken(tempLunaId, data.token)
            useChatStore.setState(state => ({
              messages: state.messages.map(m =>
                m.id === tempLunaId
                  ? { ...m, content: accumulated }
                  : m
              ),
            }))
          } else {
            finalizeStreamingMessage(tempLunaId, accumulated, data.message_id || tempLunaId)
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return
      setTyping(false)
    }
  }

  // Handle sending a voice note — uploads + streams LUNA's transcription response
  const handleSendVoiceNote = async () => {
    if (!audioBlob) return
    const currentSessionId = await getOrCreateSession()
    if (!currentSessionId) return

    // Use the edited transcript (from voiceStore), falling back to the raw transcript
    const transcriptToSend = editedTranscript || transcript || ''

    const voiceMsg = addVoiceMessage(audioUrl, transcriptToSend)
    // Note: addVoiceMessage already adds the optimistic message to chatStore.messages.
    // Do NOT add it again here (addMessage would create a duplicate in sessionStore).
    // Set session title on first message only — never overwrite with subsequent messages.
    const currentSession = useSessionStore.getState().sessions.find(s => s.id === currentSessionId)
    if (!currentSession?.title && !currentSession?.preview) {
      renameSession(currentSessionId, transcriptToSend.slice(0, 50) || 'Voice note')
    } else {
      updateSessionPreview(currentSessionId, transcriptToSend.slice(0, 50) || 'Voice note')
    }

    // Keep blob reference before clearing
    const blobToUpload = audioBlob
    clearRecording()

    try {
      // Upload voice note with the (possibly edited) transcript
      const sent = await messagesApi.uploadVoiceNote(currentSessionId, blobToUpload, null, transcriptToSend)
      const confirmedVoiceMsg = {
        ...voiceMsg,
        id: sent.id,
        audioUrl: sent.voice_note?.file_path
          ? `${API_BASE}/storage/${sent.voice_note.file_path.replace(/\\/g, '/').replace(/^storage\//, '')}`
          : null,
        transcription: transcriptToSend,
        timestamp: new Date(sent.created_at).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        }),
      }
      replaceMessage(voiceMsg.id, confirmedVoiceMsg)

      // Stream LUNA's response to the transcript
      if (transcriptToSend) {
        setTyping(true)

        const controller = new AbortController()
        streamControllerRef.current = controller
        const tempLunaId = `luna-${Date.now()}`
        let accumulated = ''

        const lunaPlaceholder = {
          id: tempLunaId,
          role: 'assistant',
          content: '',
          messageType: 'text',
          timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        }
        useChatStore.setState(state => ({ messages: [...state.messages, lunaPlaceholder] }))

        try {
          const { reader } = await streamChat(
            currentSessionId,
            transcriptToSend,
            tempLunaId,
            controller.signal
          )

          const decoder = new TextDecoder()
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')

            for (const line of lines) {
              const data = parseSSEData(line)
              if (!data) continue

              if (data.error) {
                break
              }

              if (!data.done) {
                accumulated += data.token
                useChatStore.setState(state => ({
                  messages: state.messages.map(m =>
                    m.id === tempLunaId ? { ...m, content: accumulated } : m
                  ),
                }))
              } else {
                finalizeStreamingMessage(tempLunaId, accumulated, data.message_id || tempLunaId)
              }
            }
          }
        } catch (err) {
          setTyping(false)
        }
      }
    } catch (err) {
      // voice note will remain in optimistic state — user can retry
    }
  }

  // Handle discarding a voice recording
  const handleDiscardVoice = () => {
    clearRecording()
  }

  // Session management handlers
  const handleRename = async (sessionId) => {
    const session = sessions.find(s => s.id === sessionId)
    const current = session?.title || session?.preview || ''
    const newTitle = window.prompt('Rename conversation:', current)
    if (newTitle !== null && newTitle !== current) {
      await renameSession(sessionId, newTitle)
    }
  }

  const handleDelete = async (sessionId) => {
    if (!window.confirm('Delete this conversation? This cannot be undone.')) return
    const wasActive = activeSessionId === sessionId || sessionId === sessionId
    await deleteSession(sessionId)
    if (wasActive) {
      clearActiveSession()
      clearMessages()
      navigate('/')
    }
  }

  const handleRenameFromHeader = async (newTitle) => {
    const currentId = activeSessionId || sessionId
    if (currentId) {
      await renameSession(currentId, newTitle)
    }
  }

  // Clear all messages in the active session
  const handleClearConversation = async (sessionId) => {
    if (!window.confirm('Clear all messages in this conversation? The session will remain.')) return
    await messagesApi.clearConversation(sessionId)
    clearMessages()
  }

  // Trigger summary generation for a session
  const handleGenerateSummary = async (sessionId) => {
    // TODO: wire to backend summary trigger endpoint when available
  }

  // Handle voice recording result — called by VoiceMicButton after MediaRecorder stops
  const handleVoiceStop = useCallback(async (blob) => {
    stopRecording(blob)
    const currentSessionId = await getOrCreateSession()
    if (currentSessionId) {
      setTranscriptionStatus('transcribing')
      try {
        const result = await messagesApi.transcribeAudio(
          currentSessionId,
          blob,
          usePreferencesStore.getState().language
        )
        setTranscriptionResult(result.transcript || '')
      } catch (err) {
        setTranscriptionError(err.message)
      }
    }
  }, [getOrCreateSession])

  // Get active session for header
  const activeSession = sessions.find(s => s.id === (activeSessionId || sessionId))

  // Resolve grain settings: localStorage or sensible defaults
  const effectiveGrain = grainSettings || {
    color1: '#c1d3c7',
    color2: '#8ab1ff',
    color3: '#f2f5f3',
    timeSpeed: 0.15,
    warpAmplitude: 40.0,
  }

  return (
    <div className="h-screen flex relative">
      {/* Full-page animated gradient background */}
      <Grainient
        className="fixed inset-0 z-0"
        color1={effectiveGrain.color1}
        color2={effectiveGrain.color2}
        color3={effectiveGrain.color3}
        timeSpeed={effectiveGrain.timeSpeed ?? 0.15}
        colorBalance={0.05}
        warpStrength={0.8}
        warpFrequency={4.5}
        warpSpeed={1.5}
        warpAmplitude={effectiveGrain.warpAmplitude ?? 40.0}
        blendAngle={15.0}
        blendSoftness={0.08}
        rotationAmount={400}
        noiseScale={1.8}
        grainAmount={0.06}
        grainScale={1.2}
        grainAnimated={false}
        contrast={1.1}
        gamma={1.0}
        saturation={0.9}
        centerX={0.0}
        centerY={0.0}
        zoom={1.1}
      />

      {/* Settings slide-in panel */}
      <SettingsPanel />

      {/* About Luna slide-in panel */}
      <AboutLuna />

      {/* Session menu slide-in panel */}
      <SessionMenuPanel
        session={activeSession}
        onRename={handleRenameFromHeader}
        onGenerateSummary={handleGenerateSummary}
        onArchive={archiveSession}
        onUnarchive={unarchiveSession}
        onDelete={handleDelete}
        onClear={handleClearConversation}
        onExport={() => {}} // placeholder
      />

      {/* UI layer — above the gradient */}
      <div className="relative z-10 flex h-full w-full">
      {/* Left Sidebar */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId || sessionId}
        onSessionSelect={setActiveSession}
        onNewSession={handleNewSession}
        onRename={handleRename}
        onDelete={handleDelete}
        onArchive={archiveSession}
        onUnarchive={unarchiveSession}
        onTogglePin={togglePin}
      />

      {/* Main Content Area */}
      <MainContent>
        {/* Header */}
        <Header
          title="LUNA"
          sessionTitle={activeSession?.title || null}
          subtitle={activeSession?.time || ''}
          onRename={handleRenameFromHeader}
        />

        {/* Chat Area */}
        <ChatArea
          messages={messages}
          isTyping={isTyping}
          onEdit={handleEditMessage}
        />

        {/* Voice Preview Bar */}
        {recordingState === 'recorded' && audioUrl && (
          <VoicePreviewBar
            audioUrl={audioUrl}
            transcriptionStatus={transcriptionStatus}
            transcript={transcript}
            editedTranscript={editedTranscript}
            onTranscriptChange={setEditedTranscript}
            onSend={handleSendVoiceNote}
            onDiscard={handleDiscardVoice}
          />
        )}

        {/* Input Composer */}
        <InputComposer
          onSendMessage={handleSendMessage}
          onVoiceStop={handleVoiceStop}
          onEditSubmit={handleEditSubmit}
          editingMessage={editingMessage}
          isRecording={recordingState === 'recording'}
        />
      </MainContent>
      </div>
    </div>
  )
}

export default SessionsPage
