// Memorabilia module - Save things you keep coming back to
import { state, generateId } from '../core'

// Predefined categories
export const MEMORABILIA_CATEGORIES = [
  { id: 'song', name: 'Song', emoji: '🎵' },
  { id: 'anime', name: 'Anime', emoji: '🌸' },
  { id: 'movie', name: 'Movie', emoji: '🎬' },
  { id: 'show', name: 'Show', emoji: '📺' },
  { id: 'game', name: 'Game', emoji: '🎮' },
  { id: 'food', name: 'Food', emoji: '🍜' },
  { id: 'place', name: 'Place', emoji: '📍' },
  { id: 'book', name: 'Book', emoji: '📖' },
  { id: 'video', name: 'Video', emoji: '▶️' },
  { id: 'other', name: 'Other', emoji: '✨' },
]

export function getCategoryById(id) {
  return MEMORABILIA_CATEGORIES.find(c => c.id === id) || MEMORABILIA_CATEGORIES[MEMORABILIA_CATEGORIES.length - 1]
}

// CRUD
export function addMemorabilia(item) {
  const id = generateId()
  const tags = (item.tags || []).map(t => t.trim().toLowerCase()).filter(Boolean)
  state.memorabilia.push({
    id,
    name: (item.name || '').trim(),
    category: item.category || 'other',
    tags,
    note: (item.note || '').trim(),
    link: (item.link || '').trim(),
    image: item.image || null,
    createdAt: new Date().toISOString(),
  })
  return id
}

export function updateMemorabilia(id, updates) {
  const item = state.memorabilia.find(m => m.id === id)
  if (item) {
    if (updates.name !== undefined) updates.name = updates.name.trim()
    if (updates.note !== undefined) updates.note = updates.note.trim()
    if (updates.link !== undefined) updates.link = updates.link.trim()
    if (updates.tags !== undefined) {
      updates.tags = updates.tags.map(t => t.trim().toLowerCase()).filter(Boolean)
    }
    Object.assign(item, updates)
  }
}

export function deleteMemorabilia(id) {
  const index = state.memorabilia.findIndex(m => m.id === id)
  if (index !== -1) {
    state.memorabilia.splice(index, 1)
  }
}

// Get all unique tags across all items
export function getAllTags() {
  const tags = new Set()
  state.memorabilia.forEach(m => {
    (m.tags || []).forEach(t => tags.add(t))
  })
  return Array.from(tags).sort()
}
