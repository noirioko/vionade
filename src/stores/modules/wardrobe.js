// Wardrobe module - Track clothes and where they are stored
import { state, generateId } from '../core'

// Wardrobe categories
export const WARDROBE_CATEGORIES = [
  { id: 'tops', name: 'Tops', emoji: '👕' },
  { id: 'bottoms', name: 'Bottoms', emoji: '👖' },
  { id: 'dresses', name: 'Dresses', emoji: '👗' },
  { id: 'outerwear', name: 'Outerwear', emoji: '🧥' },
  { id: 'shoes', name: 'Shoes', emoji: '👟' },
  { id: 'bags', name: 'Bags', emoji: '👜' },
  { id: 'accessories', name: 'Accessories', emoji: '🎀' },
  { id: 'sleepwear', name: 'Sleepwear', emoji: '🛏️' },
  { id: 'other', name: 'Other', emoji: '✨' },
]

// Wardrobe item CRUD
export function addWardrobeItem(item) {
  const id = generateId()
  state.wardrobe.push({
    id,
    name: item.name || '',
    category: item.category || 'other',
    photo: item.photo || null,
    location: item.location || '',
    color: item.color || '',
    brand: item.brand || '',
    collection: item.collection || '',
    notes: item.notes || '',
    favorite: item.favorite || false,
    createdAt: new Date().toISOString(),
  })
  return id
}

export function updateWardrobeItem(id, updates) {
  const item = state.wardrobe.find(i => i.id === id)
  if (item) {
    Object.assign(item, updates)
  }
}

export function deleteWardrobeItem(id) {
  const index = state.wardrobe.findIndex(i => i.id === id)
  if (index !== -1) {
    state.wardrobe.splice(index, 1)
  }
}

export function getWardrobeItemById(id) {
  return state.wardrobe.find(i => i.id === id)
}

// Toggle favorite
export function toggleWardrobeFavorite(id) {
  const item = state.wardrobe.find(i => i.id === id)
  if (item) {
    item.favorite = !item.favorite
  }
}

// Get all unique locations
export function getWardrobeLocations() {
  const locations = new Set()
  state.wardrobe.forEach(item => {
    if (item.location) locations.add(item.location)
  })
  return Array.from(locations).sort()
}

// Get all unique brands
export function getWardrobeBrands() {
  const brands = new Set()
  state.wardrobe.forEach(item => {
    if (item.brand) brands.add(item.brand)
  })
  return Array.from(brands).sort()
}

// Get all unique collections
export function getWardrobeCollections() {
  const collections = new Set()
  state.wardrobe.forEach(item => {
    if (item.collection) collections.add(item.collection)
  })
  return Array.from(collections).sort()
}

// Filter wardrobe items
export function getFilteredWardrobe(options = {}) {
  const { category, location, brand, collection, search, favoritesOnly = false } = options

  let items = [...state.wardrobe]

  if (category && category !== 'all') {
    items = items.filter(i => i.category === category)
  }

  if (location && location !== 'all') {
    items = items.filter(i => i.location === location)
  }

  if (brand && brand !== 'all') {
    items = items.filter(i => i.brand === brand)
  }

  if (collection && collection !== 'all') {
    items = items.filter(i => i.collection === collection)
  }

  if (search) {
    const lower = search.toLowerCase()
    items = items.filter(i =>
      i.name.toLowerCase().includes(lower) ||
      i.brand?.toLowerCase().includes(lower) ||
      i.color?.toLowerCase().includes(lower) ||
      i.collection?.toLowerCase().includes(lower) ||
      i.notes?.toLowerCase().includes(lower)
    )
  }

  if (favoritesOnly) {
    items = items.filter(i => i.favorite)
  }

  // Sort: favorites first, then by name
  items.sort((a, b) => {
    if (a.favorite !== b.favorite) return b.favorite - a.favorite
    return a.name.localeCompare(b.name)
  })

  return items
}

// Get wardrobe items grouped by a field
export function getWardrobeGrouped(groupBy, options = {}) {
  const items = getFilteredWardrobe(options)
  const groups = {}
  const ungrouped = []

  items.forEach(item => {
    const key = item[groupBy]
    if (key) {
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    } else {
      ungrouped.push(item)
    }
  })

  // Convert to array and sort by group name
  const sortedGroups = Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, items]) => ({ name, items, count: items.length }))

  // Add ungrouped items at the end if any
  if (ungrouped.length > 0) {
    sortedGroups.push({ name: 'Uncategorized', items: ungrouped, count: ungrouped.length })
  }

  return sortedGroups
}

// Get wardrobe stats
export function getWardrobeStats() {
  const items = state.wardrobe
  const byCategory = {}

  WARDROBE_CATEGORIES.forEach(cat => {
    byCategory[cat.id] = items.filter(i => i.category === cat.id).length
  })

  return {
    total: items.length,
    byCategory,
    favorites: items.filter(i => i.favorite).length,
    locations: getWardrobeLocations().length,
    brands: getWardrobeBrands().length,
    collections: getWardrobeCollections().length,
  }
}
