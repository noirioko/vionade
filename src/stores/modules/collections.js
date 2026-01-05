// Collections module - Collection sets + individual items
import { state, generateId } from '../core'

// Collection types
export const COLLECTION_TYPES = [
  { id: 'blindbox', name: 'Blind Box', emoji: '🎁' },
  { id: 'figure', name: 'Figure', emoji: '🗿' },
  { id: 'plush', name: 'Plush', emoji: '🧸' },
  { id: 'other', name: 'Other', emoji: '✨' },
]

// Collection CRUD
export function addCollection(collection) {
  const id = generateId()
  state.collections.push({
    id,
    name: collection.name || '',
    type: collection.type || 'blindbox',
    photo: collection.photo || null,
    totalItems: collection.totalItems || 0,
    pricePerItem: collection.pricePerItem || null,
    location: collection.location || '',
    notes: collection.notes || '',
    createdAt: new Date().toISOString(),
  })
  return id
}

export function updateCollection(id, updates) {
  const collection = state.collections.find(c => c.id === id)
  if (collection) {
    Object.assign(collection, updates)
  }
}

export function deleteCollection(id) {
  // Delete collection
  const index = state.collections.findIndex(c => c.id === id)
  if (index !== -1) {
    state.collections.splice(index, 1)
  }
  // Delete all items in collection
  state.collectionItems = state.collectionItems.filter(i => i.collectionId !== id)
}

export function getCollectionById(id) {
  return state.collections.find(c => c.id === id)
}

// Collection Item CRUD
export function addCollectionItem(item) {
  const id = generateId()
  state.collectionItems.push({
    id,
    collectionId: item.collectionId,
    name: item.name || '',
    photo: item.photo || null,
    owned: item.owned !== undefined ? item.owned : false,
    pricePaid: item.pricePaid || null,
    location: item.location || '',
    notes: item.notes || '',
    createdAt: new Date().toISOString(),
  })
  return id
}

export function updateCollectionItem(id, updates) {
  const item = state.collectionItems.find(i => i.id === id)
  if (item) {
    Object.assign(item, updates)
  }
}

export function deleteCollectionItem(id) {
  const index = state.collectionItems.findIndex(i => i.id === id)
  if (index !== -1) {
    state.collectionItems.splice(index, 1)
  }
}

export function getCollectionItems(collectionId) {
  return state.collectionItems
    .filter(i => i.collectionId === collectionId)
    .sort((a, b) => {
      // Sort owned items first, then by name
      if (a.owned !== b.owned) return b.owned - a.owned
      return a.name.localeCompare(b.name)
    })
}

export function getCollectionStats(collectionId) {
  const items = state.collectionItems.filter(i => i.collectionId === collectionId)
  const owned = items.filter(i => i.owned).length
  const total = items.length
  const totalSpent = items.reduce((sum, i) => sum + (i.pricePaid || 0), 0)

  return {
    owned,
    total,
    totalSpent,
    progress: total > 0 ? Math.round((owned / total) * 100) : 0,
    isComplete: total > 0 && owned === total,
  }
}

// Toggle owned status for an item
export function toggleItemOwned(id) {
  const item = state.collectionItems.find(i => i.id === id)
  if (item) {
    item.owned = !item.owned
  }
}

// Get all collections with stats
export function getCollectionsWithStats() {
  return state.collections.map(c => ({
    ...c,
    stats: getCollectionStats(c.id),
    items: getCollectionItems(c.id),
  }))
}

// Filter collections
export function getFilteredCollections(options = {}) {
  const { type, search, showComplete = true } = options

  let collections = getCollectionsWithStats()

  if (type && type !== 'all') {
    collections = collections.filter(c => c.type === type)
  }

  if (search) {
    const lower = search.toLowerCase()
    collections = collections.filter(c =>
      c.name.toLowerCase().includes(lower) ||
      c.items.some(i => i.name.toLowerCase().includes(lower))
    )
  }

  if (!showComplete) {
    collections = collections.filter(c => !c.stats.isComplete)
  }

  // Sort by name
  collections.sort((a, b) => a.name.localeCompare(b.name))

  return collections
}
