// Hardcoded tank list - 9 tanks
export const tanks = [
  { id: 'giants', name: "Giant's Tank", emoji: '🐋' },
  { id: 'cory-tetra', name: 'Cory & Tetra', emoji: '🐟' },
  { id: 'pygmies', name: 'Pygmies 2.5g', emoji: '🦐' },
  { id: 'noodle-tetra', name: 'Noodle Tetra', emoji: '🍜' },
  { id: 'red-betta', name: 'Red Betta', emoji: '❤️' },
  { id: 'dante', name: 'Dante', emoji: '😈' },
  { id: 'regina-george', name: 'Regina George', emoji: '👑' },
  { id: 'dickson', name: 'Dickson', emoji: '🐠' },
  { id: 'inferno', name: 'Inferno', emoji: '🔥' },
]

// Simplified tank actions - focused on what matters
export const tankActions = {
  water_change: { emoji: '💧', label: 'Water Change', color: '#7AD7F0' },
  clean: { emoji: '✨', label: 'Cleaning', color: '#FFE135' },
  feed: { emoji: '🍽️', label: 'Feeding', color: '#98FB98' },
  test: { emoji: '🧪', label: 'Water Test', color: '#DDA0DD' },
  note: { emoji: '📝', label: 'Note', color: '#A78BFA' },
}

// Water change status thresholds (in days)
export const waterChangeRules = {
  good: 7,
  warning: 10,
  overdue: 14,
}

// Get status color based on days since last water change
export function getWaterChangeStatus(daysSince) {
  if (daysSince === null || daysSince === undefined) return 'none'
  if (daysSince <= waterChangeRules.good) return 'good'
  if (daysSince <= waterChangeRules.warning) return 'warning'
  return 'overdue'
}

// Format days ago text
export function formatDaysAgo(daysSince) {
  if (daysSince === null || daysSince === undefined) return 'No data'
  if (daysSince === 0) return 'Today'
  if (daysSince === 1) return 'Yesterday'
  if (daysSince <= 7) return `${daysSince}d ago`
  return `${daysSince} days`
}

// Get tank by ID
export function getTankById(id) {
  return tanks.find(t => t.id === id)
}
