// Subscriptions module - Recurring payment tracking
import { state, generateId } from '../core'

// Billing cycle options
export const BILLING_CYCLES = [
  { id: 'weekly', label: 'Weekly', days: 7 },
  { id: 'monthly', label: 'Monthly', days: 30 },
  { id: 'quarterly', label: 'Quarterly', days: 90 },
  { id: 'yearly', label: 'Yearly', days: 365 },
]

// Common subscription services
export const COMMON_SERVICES = [
  { name: 'Netflix', icon: '🎬', color: '#E50914' },
  { name: 'Spotify', icon: '🎵', color: '#1DB954' },
  { name: 'YouTube Premium', icon: '▶️', color: '#FF0000' },
  { name: 'Disney+', icon: '🏰', color: '#113CCF' },
  { name: 'iCloud', icon: '☁️', color: '#3693F3' },
  { name: 'Google One', icon: '🔵', color: '#4285F4' },
  { name: 'Adobe', icon: '🎨', color: '#FF0000' },
  { name: 'Figma', icon: '🖌️', color: '#A259FF' },
  { name: 'ChatGPT Plus', icon: '🤖', color: '#10A37F' },
  { name: 'Claude Pro', icon: '🧠', color: '#D97706' },
  { name: 'Gym', icon: '💪', color: '#EF4444' },
  { name: 'Other', icon: '📦', color: '#6B7280' },
]

// Add subscription
export function addSubscription(sub) {
  const id = generateId()
  const service = COMMON_SERVICES.find(s => s.name === sub.name)

  state.subscriptions.push({
    id,
    name: sub.name,
    icon: sub.icon || service?.icon || '📦',
    color: sub.color || service?.color || '#6B7280',
    amount: sub.amount || 0,
    cycle: sub.cycle || 'monthly',
    billingDate: sub.billingDate || 1, // Day of month (1-31) or day of week (1-7)
    startDate: sub.startDate || new Date().toISOString().split('T')[0],
    notes: sub.notes || '',
    isActive: true,
    createdAt: new Date().toISOString(),
  })
  return id
}

// Update subscription
export function updateSubscription(id, updates) {
  const sub = state.subscriptions.find(s => s.id === id)
  if (sub) {
    Object.assign(sub, updates)
  }
}

// Delete subscription
export function deleteSubscription(id) {
  const idx = state.subscriptions.findIndex(s => s.id === id)
  if (idx !== -1) {
    state.subscriptions.splice(idx, 1)
  }
}

// Toggle subscription active status
export function toggleSubscription(id) {
  const sub = state.subscriptions.find(s => s.id === id)
  if (sub) {
    sub.isActive = !sub.isActive
  }
}

// Get all active subscriptions
export function getActiveSubscriptions() {
  return state.subscriptions.filter(s => s.isActive)
}

// Calculate monthly cost of a subscription
export function getMonthlyAmount(sub) {
  const cycle = BILLING_CYCLES.find(c => c.id === sub.cycle)
  if (!cycle) return sub.amount

  // Convert to monthly
  switch (sub.cycle) {
    case 'weekly':
      return sub.amount * 4.33 // Average weeks per month
    case 'monthly':
      return sub.amount
    case 'quarterly':
      return sub.amount / 3
    case 'yearly':
      return sub.amount / 12
    default:
      return sub.amount
  }
}

// Get total monthly subscription cost
export function getTotalMonthlySubscriptions() {
  return getActiveSubscriptions()
    .reduce((sum, sub) => sum + getMonthlyAmount(sub), 0)
}

// Get total yearly subscription cost
export function getTotalYearlySubscriptions() {
  return getTotalMonthlySubscriptions() * 12
}

// Get next billing date for a subscription
export function getNextBillingDate(sub) {
  const today = new Date()
  const currentDay = today.getDate()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()

  if (sub.cycle === 'weekly') {
    // billingDate is day of week (0-6, Sunday-Saturday)
    const daysUntil = (sub.billingDate - today.getDay() + 7) % 7 || 7
    const nextDate = new Date(today)
    nextDate.setDate(today.getDate() + daysUntil)
    return nextDate
  }

  // For monthly/quarterly/yearly, billingDate is day of month
  let nextDate = new Date(currentYear, currentMonth, sub.billingDate)

  // If already passed this month, go to next billing cycle
  if (nextDate <= today) {
    switch (sub.cycle) {
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1)
        break
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3)
        break
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1)
        break
    }
  }

  return nextDate
}

// Get days until next billing
export function getDaysUntilBilling(sub) {
  const nextDate = getNextBillingDate(sub)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffTime = nextDate.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

// Get subscriptions due soon (within X days)
export function getUpcomingBillings(days = 7) {
  return getActiveSubscriptions()
    .filter(sub => getDaysUntilBilling(sub) <= days)
    .sort((a, b) => getDaysUntilBilling(a) - getDaysUntilBilling(b))
}
