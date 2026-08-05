import request from './client'

export async function createUser(data) {
  return request('/api/users/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getUser(userId) {
  return request(`/api/users/${userId}`)
}

/**
 * Get or create a user identified by a browser-generated UUID (client_id).
 * Each browser gets its own isolated account — no email conflict.
 */
export async function getOrCreateUser(clientId) {
  return request('/api/users/get-or-create', {
    method: 'POST',
    body: JSON.stringify({ client_id: clientId }),
  })
}
