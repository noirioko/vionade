// Pet action keywords for quick entry parsing
export const petActions = {
  bath: { emoji: '🛁', label: 'Bath/Grooming' },
  vet: { emoji: '🏥', label: 'Vet Visit' },
  flea: { emoji: '🐛', label: 'Flea Treatment' },
  vaccine: { emoji: '💉', label: 'Vaccination' },
  deworm: { emoji: '💊', label: 'Deworming' },
  nail: { emoji: '✂️', label: 'Nail Trim' },
  sick: { emoji: '🤒', label: 'Sick/Unwell' },
  medicine: { emoji: '💊', label: 'Medicine Given' },
  weight: { emoji: '⚖️', label: 'Weight Check' },
}

// Status thresholds (in days) for each action type
export const petStatusRules = {
  bath: { good: 14, warning: 21, overdue: 30 },
  vet: { good: 180, warning: 270, overdue: 365 },
  flea: { good: 30, warning: 45, overdue: 60 },
  vaccine: { good: 365, warning: 400, overdue: 450 },
  deworm: { good: 90, warning: 120, overdue: 180 },
  nail: { good: 14, warning: 21, overdue: 30 },
  sick: { good: 999, warning: 999, overdue: 999 }, // No schedule
  medicine: { good: 999, warning: 999, overdue: 999 }, // No schedule
  weight: { good: 30, warning: 60, overdue: 90 },
}

// Get action keywords for autocomplete
export function getActionKeywords() {
  return Object.keys(petActions)
}

// Get status color based on days since last action
export function getStatusColor(action, daysSince) {
  const rules = petStatusRules[action]
  if (!rules) return 'gray'

  if (daysSince === null || daysSince === undefined) return 'gray'
  if (daysSince <= rules.good) return 'green'
  if (daysSince <= rules.warning) return 'yellow'
  return 'red'
}

// Format days ago text
export function formatDaysAgo(daysSince) {
  if (daysSince === null || daysSince === undefined) return 'Never'
  if (daysSince === 0) return 'Today'
  if (daysSince === 1) return 'Yesterday'
  if (daysSince < 7) return `${daysSince} days ago`
  if (daysSince < 30) return `${Math.floor(daysSince / 7)} weeks ago`
  if (daysSince < 365) return `${Math.floor(daysSince / 30)} months ago`
  return `${Math.floor(daysSince / 365)} years ago`
}
