// Staycation module - Track hotel stays
import { state, markPendingChanges } from '../core'

export function addStaycation(stay) {
  markPendingChanges()

  const newStay = {
    id: Date.now(),
    hotel: stay.hotel.trim(),
    roomType: stay.roomType?.trim() || '',
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    price: parseFloat(stay.price) || 0,
    rating: stay.rating, // 'worth', 'meh', 'regret'
    notes: stay.notes?.trim() || '',
    createdAt: new Date().toISOString()
  }

  state.staycations = [newStay, ...state.staycations]
}

export function updateStaycation(id, updates) {
  markPendingChanges()

  state.staycations = state.staycations.map(stay => {
    if (stay.id === id) {
      return {
        ...stay,
        hotel: updates.hotel?.trim() ?? stay.hotel,
        roomType: updates.roomType?.trim() ?? stay.roomType,
        checkIn: updates.checkIn ?? stay.checkIn,
        checkOut: updates.checkOut ?? stay.checkOut,
        price: updates.price !== undefined ? parseFloat(updates.price) || 0 : stay.price,
        rating: updates.rating ?? stay.rating,
        notes: updates.notes?.trim() ?? stay.notes
      }
    }
    return stay
  })
}

export function deleteStaycation(id) {
  markPendingChanges()
  state.staycations = state.staycations.filter(stay => stay.id !== id)
}

export function getStaycationStats() {
  const stays = state.staycations || []
  const now = new Date()
  const thisYear = stays.filter(s => {
    const d = new Date(s.checkIn)
    return d.getFullYear() === now.getFullYear()
  })

  return {
    totalStays: stays.length,
    thisYearStays: thisYear.length,
    thisYearSpent: thisYear.reduce((sum, s) => sum + (s.price || 0), 0),
    totalSpent: stays.reduce((sum, s) => sum + (s.price || 0), 0)
  }
}
