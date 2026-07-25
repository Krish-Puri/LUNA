import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar'
import Header from '../components/layout/Header'
import MainContent from '../components/layout/MainContent'
import ChatArea from '../components/chat/ChatArea'
import InputComposer from '../components/chat/InputComposer'
import useSessionStore from '../store/sessionStore'
import useChatStore from '../store/chatStore'
import useVoiceStore from '../store/voiceStore'
import * as usersApi from '../api/users'
import * as messagesApi from '../api/messages'

// Ensure a default user exists, returns user id
async function ensureUser() {
  let userId = localStorage.getItem('luna_user_id')
  if (!userId) {
    const user = await usersApi.createUser({
      email: 'default@luna.app',
      name: 'Luna User',
    })
    userId = user.id
    localStorage.setItem('luna_user_id', userId)
  }
  return userId
}

// Voice preview bar shown after recording
const VoicePreviewBar = ({ audioUrl, onSend, onDiscard }) => (
  <div className="border-t border-border bg-surface px-4 py-3">
    <div className="max-w-3xl mx-auto flex items-center gap-3">
      <audio src={audioUrl} controls className="flex-1 h-8" />
      <button
        onClick={onDiscard}
        className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        Discard
      </button>
      <button
        onClick={onSend}
        className="px-4 py-1.5 bg-accent text-text-inverse text-sm rounded-lg hover:bg-accent-hover transition-colors"
      >
        Send
      </button>
    </div>
  </div>
)

const SessionsPage = () => {
  const { sessionId } = useParams()
  const navigate = useNavigate()

  // Stores
  const {
    sessions,
    activeSessionId,
    userId,
    setActiveSession,
    createSession,
    addMessage,
    updateSessionPreview,
    initialize,
  } = useSessionStore()

  const {
    messages,
    isTyping,
    loadMessages,
    addUserMessage,
    replaceMessage,
    addVoiceMessage,
    setTyping,
    clearMessages,
  } = useChatStore()

  const {
    recordingState,
    audioBlob,
    audioUrl,
    startRecording,
    stopRecording,
    clearRecording,
  } = useVoiceStore()

  // Local state
  const [mediaRecorder, setMediaRecorder] = useState(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize on mount: ensure user + load sessions
  useEffect(() => {
    const init = async () => {
      try {
        const uid = await ensureUser()
        await initialize(uid)
        setIsInitialized(true)
      } catch (err) {
        console.error('Failed to initialize:', err)
        setIsInitialized(true)
      }
    }
    init()
  }, [])

  // Handle session change from URL
  useEffect(() => {
    if (!isInitialized) return
    if (sessionId) {
      setActiveSession(sessionId)
    } else {
      setActiveSession(null)
    }
  }, [sessionId, isInitialized])

  // Load messages when active session changes
  useEffect(() => {
    if (!isInitialized) return
    const currentId = activeSessionId || sessionId
    if (currentId) {
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
      navigate(`/session/${currentSessionId}`)
    }
    return currentSessionId
  }

  // Handle sending a text message
  const handleSendMessage = async (content) => {
    if (!content.trim()) return
    const currentSessionId = await getOrCreateSession()
    if (!currentSessionId) return

    const userMsg = addUserMessage(content)
    addMessage(currentSessionId, userMsg)
    updateSessionPreview(currentSessionId, content.slice(0, 50))

    try {
      const sent = await messagesApi.sendMessage(currentSessionId, { content })
      replaceMessage(userMsg.id, {
        ...userMsg,
        id: sent.id,
        timestamp: new Date(sent.created_at).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        }),
      })
      setTyping(false)
    } catch (err) {
      console.error('Failed to send message:', err)
      setTyping(false)
    }
  }

  // Handle sending a voice note
  const handleSendVoiceNote = async () => {
    if (!audioBlob) return
    const currentSessionId = await getOrCreateSession()
    if (!currentSessionId) return

    const tempId = `voice-${Date.now()}`
    const voiceMsg = addVoiceMessage(audioUrl, null)
    addMessage(currentSessionId, { ...voiceMsg, id: tempId })
    updateSessionPreview(currentSessionId, 'Voice note')
    clearRecording()

    try {
      const sent = await messagesApi.uploadVoiceNote(currentSessionId, audioBlob)
      const serverMsg = {
        ...voiceMsg,
        id: sent.id,
        audioUrl: sent.voice_note?.file_path
          ? `http://localhost:8000/storage/${sent.voice_note.file_path.split('/').pop()}`
          : audioUrl,
        timestamp: new Date(sent.created_at).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        }),
      }
      replaceMessage(tempId, serverMsg)
    } catch (err) {
      console.error('Failed to send voice note:', err)
    }
  }

  // Handle discarding a voice recording
  const handleDiscardVoice = () => {
    clearRecording()
  }

  // Handle starting voice recording
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        stopRecording(blob)
        stream.getTracks().forEach(track => track.stop())
      }

      recorder.start()
      setMediaRecorder(recorder)
      startRecording()
    } catch (err) {
      console.error('Failed to start recording:', err)
    }
  }

  // Handle stopping voice recording
  const handleStopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    }
    // Don't clear recording here — we want to show the preview bar
  }

  // Get active session for header
  const activeSession = sessions.find(s => s.id === (activeSessionId || sessionId))

  return (
    <div className="h-screen flex bg-bg-primary">
      {/* Left Sidebar */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId || sessionId}
        onSessionSelect={setActiveSession}
        onNewSession={handleNewSession}
      />

      {/* Main Content Area */}
      <MainContent>
        {/* Header */}
        <Header
          title={activeSession?.preview?.slice(0, 30) || 'LUNA'}
          subtitle={activeSession?.time || ''}
        />

        {/* Chat Area */}
        <ChatArea
          messages={messages}
          isTyping={isTyping}
        />

        {/* Voice Preview Bar */}
        {recordingState === 'recorded' && audioUrl && (
          <VoicePreviewBar
            audioUrl={audioUrl}
            onSend={handleSendVoiceNote}
            onDiscard={handleDiscardVoice}
          />
        )}

        {/* Input Composer */}
        <InputComposer
          onSendMessage={handleSendMessage}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          isRecording={recordingState === 'recording'}
        />
      </MainContent>
    </div>
  )
}

export default SessionsPage
