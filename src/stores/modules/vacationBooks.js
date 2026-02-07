// Vacation Books module - Travel journal/diary
import { state, markPendingChanges } from '../core'

export const TRIP_STATUSES = [
  { id: 'wishlist', name: 'Wishlist', icon: '💭', color: '#9CA3AF' },
  { id: 'planning', name: 'Planning', icon: '📝', color: '#F59E0B' },
  { id: 'booked', name: 'Booked', icon: '✈️', color: '#3B82F6' },
  { id: 'ongoing', name: 'Ongoing', icon: '🌴', color: '#10B981' },
  { id: 'completed', name: 'Completed', icon: '✅', color: '#8B5CF6' },
]

// Book CRUD
export function createVacationBook(book) {
  markPendingChanges()

  const newBook = {
    id: Date.now(),
    title: book.title.trim(),
    destination: book.destination.trim(),
    country: book.country?.trim() || '',
    coverImage: book.coverImage || '',
    startDate: book.startDate || '',
    endDate: book.endDate || '',
    status: book.status || 'wishlist',
    budget: book.budget ? parseFloat(book.budget) : null,
    notes: book.notes?.trim() || '',
    // Sub-collections
    diaryEntries: [],
    cafeVisits: [],
    restaurantVisits: [],
    createdAt: new Date().toISOString()
  }

  state.vacationBooks = [newBook, ...state.vacationBooks]
  return newBook.id
}

export function updateVacationBook(id, updates) {
  markPendingChanges()

  state.vacationBooks = state.vacationBooks.map(book => {
    if (book.id === id) {
      return {
        ...book,
        title: updates.title?.trim() ?? book.title,
        destination: updates.destination?.trim() ?? book.destination,
        country: updates.country?.trim() ?? book.country,
        coverImage: updates.coverImage ?? book.coverImage,
        startDate: updates.startDate ?? book.startDate,
        endDate: updates.endDate ?? book.endDate,
        status: updates.status ?? book.status,
        budget: updates.budget !== undefined ? (updates.budget ? parseFloat(updates.budget) : null) : book.budget,
        notes: updates.notes?.trim() ?? book.notes,
      }
    }
    return book
  })
}

export function deleteVacationBook(id) {
  markPendingChanges()
  state.vacationBooks = state.vacationBooks.filter(book => book.id !== id)
}

export function getVacationBookById(id) {
  return state.vacationBooks.find(book => book.id === id)
}

// Diary Entries
export function addDiaryEntry(bookId, entry) {
  markPendingChanges()

  const newEntry = {
    id: Date.now(),
    date: entry.date || new Date().toISOString().split('T')[0],
    title: entry.title?.trim() || '',
    content: entry.content?.trim() || '',
    photos: entry.photos || [], // Array of base64 or URLs
    mood: entry.mood || '',
    createdAt: new Date().toISOString()
  }

  state.vacationBooks = state.vacationBooks.map(book => {
    if (book.id === bookId) {
      return {
        ...book,
        diaryEntries: [...book.diaryEntries, newEntry]
      }
    }
    return book
  })
}

export function updateDiaryEntry(bookId, entryId, updates) {
  markPendingChanges()

  state.vacationBooks = state.vacationBooks.map(book => {
    if (book.id === bookId) {
      return {
        ...book,
        diaryEntries: book.diaryEntries.map(entry => {
          if (entry.id === entryId) {
            return {
              ...entry,
              date: updates.date ?? entry.date,
              title: updates.title?.trim() ?? entry.title,
              content: updates.content?.trim() ?? entry.content,
              photos: updates.photos ?? entry.photos,
              mood: updates.mood ?? entry.mood,
            }
          }
          return entry
        })
      }
    }
    return book
  })
}

export function deleteDiaryEntry(bookId, entryId) {
  markPendingChanges()

  state.vacationBooks = state.vacationBooks.map(book => {
    if (book.id === bookId) {
      return {
        ...book,
        diaryEntries: book.diaryEntries.filter(entry => entry.id !== entryId)
      }
    }
    return book
  })
}

// Cafe Visits
export function addCafeVisit(bookId, visit) {
  markPendingChanges()

  const newVisit = {
    id: Date.now(),
    name: visit.name.trim(),
    date: visit.date || new Date().toISOString().split('T')[0],
    time: visit.time || '',
    notes: visit.notes?.trim() || '',
    createdAt: new Date().toISOString()
  }

  state.vacationBooks = state.vacationBooks.map(book => {
    if (book.id === bookId) {
      return {
        ...book,
        cafeVisits: [...book.cafeVisits, newVisit]
      }
    }
    return book
  })
}

export function updateCafeVisit(bookId, visitId, updates) {
  markPendingChanges()

  state.vacationBooks = state.vacationBooks.map(book => {
    if (book.id === bookId) {
      return {
        ...book,
        cafeVisits: book.cafeVisits.map(visit => {
          if (visit.id === visitId) {
            return {
              ...visit,
              name: updates.name?.trim() ?? visit.name,
              date: updates.date ?? visit.date,
              time: updates.time ?? visit.time,
              notes: updates.notes?.trim() ?? visit.notes,
            }
          }
          return visit
        })
      }
    }
    return book
  })
}

export function deleteCafeVisit(bookId, visitId) {
  markPendingChanges()

  state.vacationBooks = state.vacationBooks.map(book => {
    if (book.id === bookId) {
      return {
        ...book,
        cafeVisits: book.cafeVisits.filter(visit => visit.id !== visitId)
      }
    }
    return book
  })
}

// Restaurant Visits
export function addRestaurantVisit(bookId, visit) {
  markPendingChanges()

  const newVisit = {
    id: Date.now(),
    name: visit.name.trim(),
    date: visit.date || new Date().toISOString().split('T')[0],
    meal: visit.meal || 'lunch', // 'breakfast', 'lunch', 'dinner', 'snack'
    notes: visit.notes?.trim() || '',
    createdAt: new Date().toISOString()
  }

  state.vacationBooks = state.vacationBooks.map(book => {
    if (book.id === bookId) {
      return {
        ...book,
        restaurantVisits: [...book.restaurantVisits, newVisit]
      }
    }
    return book
  })
}

export function updateRestaurantVisit(bookId, visitId, updates) {
  markPendingChanges()

  state.vacationBooks = state.vacationBooks.map(book => {
    if (book.id === bookId) {
      return {
        ...book,
        restaurantVisits: book.restaurantVisits.map(visit => {
          if (visit.id === visitId) {
            return {
              ...visit,
              name: updates.name?.trim() ?? visit.name,
              date: updates.date ?? visit.date,
              meal: updates.meal ?? visit.meal,
              notes: updates.notes?.trim() ?? visit.notes,
            }
          }
          return visit
        })
      }
    }
    return book
  })
}

export function deleteRestaurantVisit(bookId, visitId) {
  markPendingChanges()

  state.vacationBooks = state.vacationBooks.map(book => {
    if (book.id === bookId) {
      return {
        ...book,
        restaurantVisits: book.restaurantVisits.filter(visit => visit.id !== visitId)
      }
    }
    return book
  })
}

// Stats
export function getVacationStats() {
  const books = state.vacationBooks || []
  return {
    total: books.length,
    completed: books.filter(b => b.status === 'completed').length,
    planned: books.filter(b => b.status === 'planning' || b.status === 'booked').length,
    wishlist: books.filter(b => b.status === 'wishlist').length,
  }
}
