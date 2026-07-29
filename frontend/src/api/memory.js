import request from './client'

export const saveMemories = (data) =>
  request('/api/memory/', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const getMemories = (userId, query = '', limit = 5) =>
  request(`/api/memory/?user_id=${encodeURIComponent(userId)}&query=${encodeURIComponent(query)}&limit=${limit}`)

export const deleteMemory = (memoryId) =>
  request(`/api/memory/${memoryId}`, { method: 'DELETE' })
