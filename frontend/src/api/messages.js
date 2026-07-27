import request from './client'

// Transcribe audio via Whisper — saves file and returns transcript without creating DB records
export async function transcribeAudio(sessionId, audioBlob, language = 'en') {
  const formData = new FormData()
  formData.append('file', audioBlob, 'voice.webm')
  formData.append('language', language)

  const res = await fetch(`http://localhost:8000/api/messages/session/${sessionId}/transcribe`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail || `Transcription failed: ${res.status}`)
  }

  return res.json()
}

export async function getMessages(sessionId) {
  return request(`/api/messages/session/${sessionId}`)
}

export async function sendMessage(sessionId, data) {
  return request(`/api/messages/session/${sessionId}`, {
    method: 'POST',
    body: JSON.stringify({ role: 'user', ...data }),
  })
}

export async function updateMessage(messageId, data) {
  return request(`/api/messages/${messageId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function uploadVoiceNote(sessionId, audioBlob, durationSeconds, transcript) {
  const formData = new FormData()
  formData.append('file', audioBlob, 'voice.webm')
  if (durationSeconds != null) {
    formData.append('duration_seconds', String(durationSeconds))
  }
  if (transcript != null) {
    formData.append('transcript', transcript)
  }

  const res = await fetch(`http://localhost:8000/api/messages/session/${sessionId}/voice`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail || `Upload failed: ${res.status}`)
  }

  return res.json()
}
