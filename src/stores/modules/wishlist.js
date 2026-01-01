// Wishlist module
import { state, generateId } from '../core'

export function addWishlistItem(item) {
  const id = generateId()
  state.wishlist.push({
    id,
    name: item.name,
    price: item.price,
    emoji: item.emoji || '🎁',
    saved: 0,
    priority: item.priority || 'want',
    createdAt: new Date().toISOString(),
  })
}

export function updateWishlistItem(id, updates) {
  const item = state.wishlist.find(w => w.id === id)
  if (item) {
    Object.assign(item, updates)
  }
}

export function deleteWishlistItem(id) {
  const index = state.wishlist.findIndex(w => w.id === id)
  if (index !== -1) {
    state.wishlist.splice(index, 1)
  }
}

export function addToWishlistSavings(id, amount) {
  const item = state.wishlist.find(w => w.id === id)
  if (item) {
    item.saved = (item.saved || 0) + amount
    if (item.saved > item.price) {
      item.saved = item.price
    }
  }
}

export function claimWishlistItem(id, yolo = false) {
  const item = state.wishlist.find(w => w.id === id)
  if (item && (item.saved >= item.price || yolo)) {
    item.claimed = true
    item.claimedAt = new Date().toISOString()
    item.wasYolo = yolo
    item.savedAmount = item.saved || 0
  }
}
