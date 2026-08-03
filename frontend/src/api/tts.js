const BASE_URL = 'http://localhost:8000'

/**
 * Request TTS generation for a message.
 * Returns immediately; audio may still be generating.
 * @param {string} messageId
 * @param {string} content
 * @returns {Promise<{ status: 'ready'|'generating', audioUrl: string|null }>}
 */
export async function generateTTS(messageId, content) {
  const res = await fetch(`${BASE_URL}/api/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message_id: messageId, content }),
  })
  if (!res.ok) throw new Error(`TTS failed: ${res.status}`)
  return res.json()
}

/**
 * Poll for TTS audio readiness.
 * Returns the audioUrl as a blob URL when ready.
 * @param {string} messageId
 * @returns {Promise<{ status: 'ready'|'generating', audioUrl: string|null }>}
 */
export async function checkTTSStatus(messageId) {
  const res = await fetch(`${BASE_URL}/api/tts/${messageId}`)
  if (res.status === 404) return { status: 'generating', audioUrl: null }
  if (!res.ok) throw new Error(`TTS status check failed: ${res.status}`)
  const blob = await res.blob()
  const audioUrl = URL.createObjectURL(blob)
  return { status: 'ready', audioUrl }
}
