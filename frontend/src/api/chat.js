const BASE_URL = 'http://localhost:8000'

/**
 * Open a streaming SSE connection to the LUNA chat endpoint.
 * Returns a ReadableStream reader via fetch + Response.body.getReader().
 *
 * @param {string} sessionId
 * @param {string} content  - user message text
 * @param {string} messageId - temp ID for this message
 * @param {AbortSignal} signal
 * @returns {Promise<{reader: ReadableStreamDefaultReader, response: Response}>}
 */
export async function streamChat(sessionId, content, messageId, signal) {
  const response = await fetch(
    `${BASE_URL}/api/chat/session/${sessionId}/stream`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, message_id: messageId }),
      signal,
    }
  )

  if (!response.ok) {
    let detail = response.statusText
    try {
      const body = await response.json()
      detail = body.detail || detail
    } catch {}
    throw new Error(detail || `Stream request failed: ${response.status}`)
  }

  return {
    reader: response.body.getReader(),
    response,
  }
}

/**
 * Parse a single SSE data line: "data: {...}"
 * Returns the parsed object, or null if not a data line.
 */
export function parseSSEData(line) {
  const trimmed = line.trim()
  if (!trimmed.startsWith('data:')) return null
  try {
    return JSON.parse(trimmed.slice(5).trim())
  } catch {
    return null
  }
}
