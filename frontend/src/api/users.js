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
