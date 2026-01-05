// Pets module - Pet management + Pet logs
import { state, generateId } from '../core'

// Helper to parse nicknames (supports comma or space separated)
function parseNicknames(nicknameStr) {
  if (!nicknameStr) return []
  return nicknameStr
    .toLowerCase()
    .split(/[,\s]+/)
    .map(n => n.trim())
    .filter(n => n.length > 0)
}

// Pet CRUD
export function addPet(pet) {
  const id = generateId()
  const nicknames = parseNicknames(pet.nickname || pet.name || '')
  state.pets.push({
    id,
    name: pet.name || '',
    nickname: nicknames[0] || '', // Primary nickname for display
    nicknames: nicknames, // All nicknames for matching
    photo: pet.photo || null,
    notes: pet.notes || '',
    createdAt: new Date().toISOString(),
  })
  return id
}

export function updatePet(id, updates) {
  const pet = state.pets.find(p => p.id === id)
  if (pet) {
    const nicknames = parseNicknames(updates.nickname || pet.nickname || '')
    Object.assign(pet, updates, {
      nickname: nicknames[0] || pet.nickname || '',
      nicknames: nicknames.length > 0 ? nicknames : pet.nicknames || [pet.nickname],
    })
  }
}

export function deletePet(id) {
  const index = state.pets.findIndex(p => p.id === id)
  if (index !== -1) {
    state.pets.splice(index, 1)
  }
}

export function getPetByNickname(nickname) {
  const lower = nickname.toLowerCase().trim()
  return state.pets.find(p => {
    // Check primary nickname
    if (p.nickname === lower) return true
    // Check all nicknames array
    if (p.nicknames && p.nicknames.includes(lower)) return true
    return false
  })
}

export function getPetById(id) {
  return state.pets.find(p => p.id === id)
}

// Pet Log CRUD
export function addPetLog(log) {
  const id = generateId()
  const pet = getPetById(log.petId) || getPetByNickname(log.petId)

  state.petLogs.push({
    id,
    petId: pet?.id || log.petId,
    petName: pet?.name || log.petName || 'Unknown',
    action: log.action,
    note: log.note || '',
    date: log.date || new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
  })
  return id
}

export function deletePetLog(id) {
  const index = state.petLogs.findIndex(l => l.id === id)
  if (index !== -1) {
    state.petLogs.splice(index, 1)
  }
}

// Get logs filtered and sorted
export function getPetLogs(options = {}) {
  const { petId, action, startDate, endDate, limit = 50, offset = 0 } = options

  let logs = [...state.petLogs]

  // Filter by pet
  if (petId) {
    logs = logs.filter(l => l.petId === petId)
  }

  // Filter by action
  if (action) {
    logs = logs.filter(l => l.action === action)
  }

  // Filter by date range
  if (startDate) {
    logs = logs.filter(l => l.date >= startDate)
  }
  if (endDate) {
    logs = logs.filter(l => l.date <= endDate)
  }

  // Sort by date (newest first)
  logs.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date)
    return b.createdAt.localeCompare(a.createdAt)
  })

  // Paginate
  const total = logs.length
  logs = logs.slice(offset, offset + limit)

  return { logs, total }
}

// Get last action date for a pet
export function getLastActionDate(petId, action) {
  const logs = state.petLogs
    .filter(l => l.petId === petId && l.action === action)
    .sort((a, b) => b.date.localeCompare(a.date))

  return logs[0]?.date || null
}

// Get days since last action
export function getDaysSinceAction(petId, action) {
  const lastDate = getLastActionDate(petId, action)
  if (!lastDate) return null

  const last = new Date(lastDate)
  const now = new Date()
  const diffTime = now.getTime() - last.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

// Parse quick entry text: "[nickname] [action] [optional note]"
export function parseQuickEntry(text, actionKeywords) {
  const parts = text.trim().split(/\s+/)
  if (parts.length < 2) return null

  const nickname = parts[0].toLowerCase()
  const pet = getPetByNickname(nickname)
  if (!pet) return null

  // Find action keyword in remaining parts
  let actionIndex = -1
  let action = null

  for (let i = 1; i < parts.length; i++) {
    const word = parts[i].toLowerCase()
    if (actionKeywords.includes(word)) {
      actionIndex = i
      action = word
      break
    }
  }

  if (!action) return null

  // Everything after action is the note
  const note = parts.slice(actionIndex + 1).join(' ')

  return {
    pet,
    action,
    note,
  }
}
