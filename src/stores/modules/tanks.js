// Tanks module - Tank log management (tanks are hardcoded in data/tanks.js)
import { state, generateId } from '../core'
import { getTankById } from '../../data/tanks'

// Tank Log CRUD
export function addTankLog(log) {
  const id = generateId()
  const tank = getTankById(log.tankId)

  state.tankLogs.push({
    id,
    tankId: log.tankId,
    tankName: tank?.name || log.tankName || 'Unknown Tank',
    action: log.action,
    percentage: log.percentage || null, // For water changes
    note: log.note || '',
    date: log.date || new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
  })
  return id
}

export function deleteTankLog(id) {
  const index = state.tankLogs.findIndex(l => l.id === id)
  if (index !== -1) {
    state.tankLogs.splice(index, 1)
  }
}

export function updateTankLog(id, updates) {
  const index = state.tankLogs.findIndex(l => l.id === id)
  if (index !== -1) {
    state.tankLogs[index] = {
      ...state.tankLogs[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }
  }
}

// Get logs for a specific tank
export function getTankLogs(tankId, options = {}) {
  const { action, startDate, endDate, limit = 50, offset = 0 } = options

  let logs = state.tankLogs.filter(l => l.tankId === tankId)

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

// Get last water change date for a tank
export function getLastWaterChange(tankId) {
  const logs = state.tankLogs
    .filter(l => l.tankId === tankId && l.action === 'water_change')
    .sort((a, b) => b.date.localeCompare(a.date))

  return logs[0] || null
}

// Get days since last water change
export function getDaysSinceWaterChange(tankId) {
  const lastLog = getLastWaterChange(tankId)
  if (!lastLog) return null

  const last = new Date(lastLog.date)
  const now = new Date()
  const diffTime = now.getTime() - last.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

// Get last action of any type for a tank
export function getLastTankAction(tankId, action) {
  const logs = state.tankLogs
    .filter(l => l.tankId === tankId && l.action === action)
    .sort((a, b) => b.date.localeCompare(a.date))

  return logs[0] || null
}
