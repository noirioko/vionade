// Collections module - Collection sets + individual items
import { state, generateId } from '../core'

// Collection types
export const COLLECTION_TYPES = [
  { id: 'blindbox', name: 'Blind Box', emoji: '🎁' },
  { id: 'figure', name: 'Figure', emoji: '🗿' },
  { id: 'plush', name: 'Plush', emoji: '🧸' },
  { id: 'other', name: 'Other', emoji: '✨' },
]

// Get all unique brands (case-preserved)
export function getCollectionBrands() {
  const brands = new Set()
  state.collections.forEach(c => {
    if (c.brand) brands.add(c.brand)
  })
  return Array.from(brands).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
}

// Smart brand normalization - finds existing brand case-insensitively
// If "Uniqlo" exists and user types "uniqlo", returns "Uniqlo"
export function normalizeBrand(inputBrand) {
  if (!inputBrand) return ''
  const trimmed = inputBrand.trim()
  if (!trimmed) return ''

  const existingBrands = getCollectionBrands()
  const match = existingBrands.find(b => b.toLowerCase() === trimmed.toLowerCase())
  return match || trimmed
}

// Collection CRUD
export function addCollection(collection) {
  const id = generateId()
  state.collections.push({
    id,
    name: collection.name || '',
    type: collection.type || 'blindbox',
    brand: normalizeBrand(collection.brand),
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
    // Normalize brand if it's being updated
    if (updates.brand !== undefined) {
      updates.brand = normalizeBrand(updates.brand)
    }
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

// Get unique locations from collections and items
export function getCollectionLocations() {
  const locations = new Set()
  state.collections.forEach(c => {
    if (c.location) locations.add(c.location)
  })
  state.collectionItems.forEach(i => {
    if (i.location) locations.add(i.location)
  })
  return Array.from(locations).sort()
}

// Filter collections
export function getFilteredCollections(options = {}) {
  const { type, brand, search, showComplete = true } = options

  let collections = getCollectionsWithStats()

  if (type && type !== 'all') {
    collections = collections.filter(c => c.type === type)
  }

  if (brand && brand !== 'all') {
    collections = collections.filter(c => c.brand === brand)
  }

  if (search) {
    const lower = search.toLowerCase()
    collections = collections.filter(c =>
      c.name.toLowerCase().includes(lower) ||
      c.brand?.toLowerCase().includes(lower) ||
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

// Get collections grouped by a field
export function getCollectionsGrouped(groupBy, options = {}) {
  const collections = getFilteredCollections(options)
  const groups = {}
  const ungrouped = []

  collections.forEach(collection => {
    const key = collection[groupBy]
    if (key) {
      if (!groups[key]) groups[key] = []
      groups[key].push(collection)
    } else {
      ungrouped.push(collection)
    }
  })

  // Convert to array and sort by group name
  const sortedGroups = Object.entries(groups)
    .sort(([a], [b]) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map(([name, items]) => ({
      name,
      collections: items,
      count: items.length,
      totalItems: items.reduce((sum, c) => sum + c.stats.total, 0),
      ownedItems: items.reduce((sum, c) => sum + c.stats.owned, 0),
    }))

  // Add ungrouped items at the end if any
  if (ungrouped.length > 0) {
    sortedGroups.push({
      name: 'No Brand',
      collections: ungrouped,
      count: ungrouped.length,
      totalItems: ungrouped.reduce((sum, c) => sum + c.stats.total, 0),
      ownedItems: ungrouped.reduce((sum, c) => sum + c.stats.owned, 0),
    })
  }

  return sortedGroups
}
