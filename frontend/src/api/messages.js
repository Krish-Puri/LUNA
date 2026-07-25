import request from './client'

export async function getMessages(sessionId) {
  return request(`/api/messages/session/${sessionId}`)
}

export async function sendMessage(sessionId, data) {
  return request(`/api/messages/session/${sessionId}`, {
    method: 'POST',
    body: JSON.stringify({ role: 'user', ...data }),
  })
}

export async function uploadVoiceNote(sessionId, audioBlob, durationSeconds) {
  const formData = new FormData()
  formData.append('file', audioBlob, 'voice.webm')
  if (durationSeconds != null) {
    formData.append('duration_seconds', String(durationSeconds))
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
