// Nut tracking module
import { state, generateId } from '../core'

// Trigger options
export const NUT_TRIGGERS = [
  { id: 'bored', label: 'Bored', icon: '😑' },
  { id: 'horny', label: 'Just Horny', icon: '🥵' },
  { id: 'stressed', label: 'Stressed', icon: '😫' },
  { id: 'partner', label: 'Partner', icon: '💕' },
  { id: 'content', label: 'Spicy Content', icon: '📱' },
  { id: 'random', label: 'Random Urge', icon: '🎲' },
  { id: 'lonely', label: 'Lonely', icon: '😢' },
  { id: 'celebration', label: 'Celebration', icon: '🎉' },
]

export function addNutLog(log = {}) {
  const id = generateId()
  const newLog = {
    id,
    trigger: log.trigger || '',
    hornyLevel: log.hornyLevel || 5,
    rating: log.rating || 5,
    rant: log.rant?.trim() || '',
    regret: log.regret || false,
    date: log.date || new Date().toISOString(),
    createdAt: new Date().toISOString(),
  }
  state.nutLogs.push(newLog)
  return newLog
}

export function updateNutLog(id, updates) {
  const index = state.nutLogs.findIndex(l => l.id === id)
  if (index !== -1) {
    state.nutLogs[index] = {
      ...state.nutLogs[index],
      ...updates,
      rant: updates.rant?.trim() ?? state.nutLogs[index].rant,
    }
  }
}

export function deleteNutLog(id) {
  const index = state.nutLogs.findIndex(l => l.id === id)
  if (index !== -1) {
    state.nutLogs.splice(index, 1)
  }
}

export function getNutLogsForDate(date) {
  const targetDate = new Date(date).toDateString()
  return state.nutLogs.filter(l => new Date(l.date).toDateString() === targetDate)
}

export function getNutLogsForMonth(year, month) {
  return state.nutLogs.filter(l => {
    const logDate = new Date(l.date)
    return logDate.getFullYear() === year && logDate.getMonth() === month
  })
}

export function getTotalNutCount() {
  return state.nutLogs.length
}

export function getThisMonthNutCount() {
  const now = new Date()
  return getNutLogsForMonth(now.getFullYear(), now.getMonth()).length
}
