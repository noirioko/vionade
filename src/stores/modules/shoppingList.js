// Shopping List module
import { state, generateId } from '../core'

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
