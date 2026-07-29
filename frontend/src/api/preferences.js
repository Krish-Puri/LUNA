import request from './client'

export const updatePreferences = (userId, data) =>
  request(`/api/users/${userId}/preferences`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

export const getPreferences = (userId) =>
  request(`/api/users/${userId}/preferences`)
