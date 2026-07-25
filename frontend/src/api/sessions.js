import request from './client'

export async function getSessions(userId) {
  return request(`/api/sessions/?user_id=${encodeURIComponent(userId)}`)
}

export async function createSession(userId, data = {}) {
  return request('/api/sessions/', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, ...data }),
  })
}

export async function deleteSession(sessionId) {
  return request(`/api/sessions/${sessionId}`, {
    method: 'DELETE',
  })
}
