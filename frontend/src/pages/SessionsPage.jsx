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

const SessionsPage = () => {
  const { sessionId } = useParams()
  const navigate = useNavigate()

  // Stores
  const {
    sessions,
    activeSessionId,
    setActiveSession,
    createSession,
    addMessage,
    getActiveSession,
    setLunaResponse
  } = useSessionStore()

  const { messages, isTyping, addUserMessage, setTyping, loadMessages, addLunaMessage } = useChatStore()

  const {
    recordingState,
    startRecording,
    stopRecording,
    clearRecording
  } = useVoiceStore()

  // Local state for voice recording
  const [mediaRecorder, setMediaRecorder] = useState(null)
  const [audioChunks, setAudioChunks] = useState([])

  // Handle session change from URL
  useEffect(() => {
    if (sessionId) {
      setActiveSession(sessionId)
    } else {
      setActiveSession(null)
    }
  }, [sessionId, setActiveSession])

  // Load messages when active session changes
  useEffect(() => {
    const session = getActiveSession()
    if (session) {
      loadMessages(session.messages)
    } else {
      loadMessages([])
    }
  }, [activeSessionId, getActiveSession, loadMessages])

  // Handle new session creation
  const handleNewSession = (newId) => {
    createSession(newId)
  }

  // Handle sending a text message
  const handleSendMessage = async (content) => {
    if (!activeSessionId) {
      // Create a new session first
      const newId = `session-${Date.now()}`
      createSession(newId)
      navigate(`/session/${newId}`)
      // Small delay to ensure session is set
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    // Add user message
    const userMsg = addUserMessage(content)
    addMessage(activeSessionId || sessionId, userMsg)

    // Simulate LUNA thinking and responding
    setTyping(true)
    setTimeout(() => {
      const responses = [
        "Thank you for sharing that. It takes courage to open up. How does that make you feel right now?",
        "I hear you. Those feelings are completely valid. What's on your mind the most about this?",
        "That sounds meaningful. Let's explore this together. What would feel most helpful to discuss?",
        "I appreciate you telling me. This shows real self-awareness. What do you think triggered those feelings?",
        "That's a thoughtful reflection. In moments like these, what do you think you need most?"
      ]
      const randomResponse = responses[Math.floor(Math.random() * responses.length)]
      addLunaMessage(randomResponse)
      if (activeSessionId || sessionId) {
        setLunaResponse(activeSessionId || sessionId, randomResponse)
      }
    }, 1500 + Math.random() * 1000)
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
          setAudioChunks(chunks)
        }
      }

      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' })
        stopRecording(audioBlob)
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
    clearRecording()
  }

  // Get active session for header
  const activeSession = getActiveSession()

  return (
    <div className="h-screen flex bg-bg-primary">
      {/* Left Sidebar */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
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
