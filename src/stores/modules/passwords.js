// Passwords module
import { state, generateId } from '../core'

export function addPassword(password) {
  const id = generateId()
  const now = new Date().toISOString()
  state.passwords.push({
    id,
    name: password.name || '',
    url: password.url || '',
    username: password.username || '',
    phone: password.phone || '',
    password: password.password || '',
    pin: password.pin || '',
    notes: password.notes || '',
    createdAt: now,
    updatedAt: now,
  })
}

export function updatePassword(id, updates) {
  const password = state.passwords.find(p => p.id === id)
  if (password) {
    Object.assign(password, updates, { updatedAt: new Date().toISOString() })
  }
}

export function deletePassword(id) {
  const index = state.passwords.findIndex(p => p.id === id)
  if (index !== -1) {
    state.passwords.splice(index, 1)
  }
}
