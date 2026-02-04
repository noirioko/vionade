// Cafe Check-in module - Track cafe visits
import { state, markPendingChanges } from '../core'

export function addCafeVisit(visit) {
  markPendingChanges()

  const newVisit = {
    id: Date.now(),
    cafe: visit.cafe.trim(),
    order: visit.order.trim(),
    amount: parseFloat(visit.amount) || 0,
    rating: visit.rating, // 1-5 or 'worth', 'meh', 'regret'
    notes: visit.notes?.trim() || '',
    date: visit.date || new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  }

  state.cafeVisits = [newVisit, ...state.cafeVisits]
}

export function updateCafeVisit(id, updates) {
  markPendingChanges()

  state.cafeVisits = state.cafeVisits.map(visit => {
    if (visit.id === id) {
      return {
        ...visit,
        cafe: updates.cafe?.trim() ?? visit.cafe,
        order: updates.order?.trim() ?? visit.order,
        amount: updates.amount !== undefined ? parseFloat(updates.amount) || 0 : visit.amount,
        rating: updates.rating ?? visit.rating,
        notes: updates.notes?.trim() ?? visit.notes,
        date: updates.date ?? visit.date
      }
    }
    return visit
  })
}

export function deleteCafeVisit(id) {
  markPendingChanges()
  state.cafeVisits = state.cafeVisits.filter(visit => visit.id !== id)
}

export function getCafeStats() {
  const visits = state.cafeVisits || []
  const now = new Date()
  const thisMonth = visits.filter(v => {
    const d = new Date(v.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  return {
    totalVisits: visits.length,
    thisMonthVisits: thisMonth.length,
    thisMonthSpent: thisMonth.reduce((sum, v) => sum + (v.amount || 0), 0),
    totalSpent: visits.reduce((sum, v) => sum + (v.amount || 0), 0)
  }
}
