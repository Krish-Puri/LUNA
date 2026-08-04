import { API_BASE } from '../config'

/**
 * Request TTS generation for a message.
 * Returns immediately; audio may still be generating.
 * @param {string} messageId
 * @param {string} content
 * @returns {Promise<{ status: 'ready'|'generating', audioUrl: string|null }>}
 */
export async function generateTTS(messageId, content) {
  const res = await fetch(`${API_BASE}/api/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message_id: messageId, content }),
  })
  if (!res.ok) throw new Error(`TTS failed: ${res.status}`)
  return res.json()
}

/**
 * Poll for TTS audio readiness.
 * Returns the direct streaming URL when ready — no blob URL needed.
 * @param {string} messageId
 * @returns {Promise<{ status: 'ready'|'generating', audioUrl: string|null }>}
 */
export async function checkTTSStatus(messageId) {
  const res = await fetch(`${API_BASE}/api/tts/${messageId}`)

  // 404 or 202 both mean still generating
  if (res.status === 404 || res.status === 202) {
    return { status: 'generating', audioUrl: null }
  }
  if (!res.ok) throw new Error(`TTS status check failed: ${res.status}`)

  // 200 OK — file is ready; serve it directly.
  // The browser handles range requests and streaming natively via the direct URL.
  const audioUrl = `${API_BASE}/api/tts/${messageId}`
  return { status: 'ready', audioUrl }
}
