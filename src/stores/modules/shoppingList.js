// Shopping List module - with paper/collection support
import { state, generateId } from '../core'

// Create a new shopping paper/list
export function createShoppingPaper(name = 'Shopping List') {
  const id = generateId()
  const newPaper = {
    id,
    name: name.trim(),
    items: [],
    createdAt: new Date().toISOString(),
  }

  if (!state.shoppingPapers) {
    state.shoppingPapers = []
  }
  state.shoppingPapers.push(newPaper)
  return newPaper
}

// Update paper name
export function updateShoppingPaper(paperId, name) {
  const paper = state.shoppingPapers?.find(p => p.id === paperId)
  if (paper) {
    paper.name = name.trim()
  }
}

// Delete a paper
export function deleteShoppingPaper(paperId) {
  if (!state.shoppingPapers) return
  const index = state.shoppingPapers.findIndex(p => p.id === paperId)
  if (index !== -1) {
    state.shoppingPapers.splice(index, 1)
  }
}

// Add item to a paper
export function addItemToPaper(paperId, itemName) {
  const paper = state.shoppingPapers?.find(p => p.id === paperId)
  if (paper && itemName.trim()) {
    const newItem = {
      id: generateId(),
      name: itemName.trim(),
      checked: false,
      createdAt: new Date().toISOString(),
    }
    paper.items.push(newItem)
    return newItem
  }
}

// Toggle item checked state
export function togglePaperItem(paperId, itemId) {
  const paper = state.shoppingPapers?.find(p => p.id === paperId)
  if (paper) {
    const item = paper.items.find(i => i.id === itemId)
    if (item) {
      item.checked = !item.checked
    }
  }
}

// Delete item from paper
export function deletePaperItem(paperId, itemId) {
  const paper = state.shoppingPapers?.find(p => p.id === paperId)
  if (paper) {
    const index = paper.items.findIndex(i => i.id === itemId)
    if (index !== -1) {
      paper.items.splice(index, 1)
    }
  }
}

// Update item name in paper
export function updatePaperItem(paperId, itemId, newName) {
  const paper = state.shoppingPapers?.find(p => p.id === paperId)
  if (paper) {
    const item = paper.items.find(i => i.id === itemId)
    if (item && newName.trim()) {
      item.name = newName.trim()
    }
  }
}

// Clear checked items from a paper
export function clearCheckedFromPaper(paperId) {
  const paper = state.shoppingPapers?.find(p => p.id === paperId)
  if (paper) {
    paper.items = paper.items.filter(i => !i.checked)
  }
}

// Legacy support - keep old functions working
export function addShoppingItem(item = {}) {
  const id = generateId()
  const newItem = {
    id,
    name: item.name?.trim() || '',
    quantity: item.quantity || 1,
    category: item.category || 'general',
    notes: item.notes?.trim() || '',
    checked: false,
    createdAt: new Date().toISOString(),
  }
  state.shoppingList.push(newItem)
  return newItem
}

export function updateShoppingItem(id, updates) {
  const index = state.shoppingList.findIndex(i => i.id === id)
  if (index !== -1) {
    state.shoppingList[index] = {
      ...state.shoppingList[index],
      ...updates,
      name: updates.name?.trim() ?? state.shoppingList[index].name,
      notes: updates.notes?.trim() ?? state.shoppingList[index].notes,
    }
  }
}

export function deleteShoppingItem(id) {
  const index = state.shoppingList.findIndex(i => i.id === id)
  if (index !== -1) {
    state.shoppingList.splice(index, 1)
  }
}

export function toggleShoppingItem(id) {
  const index = state.shoppingList.findIndex(i => i.id === id)
  if (index !== -1) {
    state.shoppingList[index].checked = !state.shoppingList[index].checked
  }
}

export function clearCheckedItems() {
  state.shoppingList = state.shoppingList.filter(i => !i.checked)
}

export const SHOPPING_CATEGORIES = [
  { id: 'general', label: 'General', icon: '📦' },
  { id: 'groceries', label: 'Groceries', icon: '🛒' },
  { id: 'household', label: 'Household', icon: '🏠' },
  { id: 'personal', label: 'Personal Care', icon: '🧴' },
  { id: 'pet', label: 'Pet Supplies', icon: '🐱' },
  { id: 'electronics', label: 'Electronics', icon: '📱' },
  { id: 'clothes', label: 'Clothes', icon: '👗' },
]
