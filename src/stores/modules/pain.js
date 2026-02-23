// Pain tracking module
import { state, generateId } from '../core'

// Pain types
export const PAIN_TYPES = [
  { id: 'headache', label: 'Headache', icon: '🤕', color: '#EF4444' },
  { id: 'leg-left', label: 'Left Leg', icon: '🦵', color: '#F59E0B' },
  { id: 'leg-right', label: 'Right Leg', icon: '🦵', color: '#F59E0B' },
  { id: 'shoulder-left', label: 'Left Shoulder', icon: '💪', color: '#8B5CF6' },
  { id: 'shoulder-right', label: 'Right Shoulder', icon: '💪', color: '#8B5CF6' },
  { id: 'back', label: 'Back', icon: '🔙', color: '#EC4899' },
  { id: 'wrist-left', label: 'Left Wrist', icon: '🤚', color: '#06B6D4' },
  { id: 'wrist-right', label: 'Right Wrist', icon: '🤚', color: '#06B6D4' },
  { id: 'stomach', label: 'Stomach', icon: '😣', color: '#10B981' },
  { id: 'other', label: 'Other', icon: '😞', color: '#6B7280' },
]

// Pain intensity levels
export const PAIN_LEVELS = [
  { value: 1, label: 'Mild', color: '#FEF3C7' },
  { value: 2, label: 'Moderate', color: '#FED7AA' },
  { value: 3, label: 'Severe', color: '#FECACA' },
]

export function addPainLog(log) {
  const id = generateId()
  const newLog = {
    id,
    type: log.type,
    intensity: log.intensity || 1,
    note: log.note?.trim() || '',
    date: log.date || new Date().toISOString(),
    createdAt: new Date().toISOString(),
  }
  state.painLogs.push(newLog)
  return newLog
}

export function updatePainLog(id, updates) {
  const index = state.painLogs.findIndex(l => l.id === id)
  if (index !== -1) {
    state.painLogs[index] = {
      ...state.painLogs[index],
      ...updates,
      note: updates.note?.trim() || state.painLogs[index].note,
    }
  }
}

export function deletePainLog(id) {
  const index = state.painLogs.findIndex(l => l.id === id)
  if (index !== -1) {
    state.painLogs.splice(index, 1)
  }
}

export function getPainLogsForDate(date) {
  const targetDate = new Date(date).toDateString()
  return state.painLogs.filter(l => new Date(l.date).toDateString() === targetDate)
}

export function getPainLogsForMonth(year, month) {
  return state.painLogs.filter(l => {
    const logDate = new Date(l.date)
    return logDate.getFullYear() === year && logDate.getMonth() === month
  })
}

export function getPainTypeById(typeId) {
  return PAIN_TYPES.find(t => t.id === typeId)
}
