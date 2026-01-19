// Important Numbers module
import { state, generateId } from '../core'

export function addImportantNumber(item = {}) {
  const id = generateId()
  const newItem = {
    id,
    label: item.label?.trim() || '',
    number: item.number?.trim() || '',
    notes: item.notes?.trim() || '',
    createdAt: new Date().toISOString(),
  }
  state.importantNumbers.push(newItem)
  return newItem
}

export function updateImportantNumber(id, updates) {
  const index = state.importantNumbers.findIndex(n => n.id === id)
  if (index !== -1) {
    state.importantNumbers[index] = {
      ...state.importantNumbers[index],
      ...updates,
      label: updates.label?.trim() ?? state.importantNumbers[index].label,
      number: updates.number?.trim() ?? state.importantNumbers[index].number,
      notes: updates.notes?.trim() ?? state.importantNumbers[index].notes,
      updatedAt: new Date().toISOString(),
    }
  }
}

export function deleteImportantNumber(id) {
  const index = state.importantNumbers.findIndex(n => n.id === id)
  if (index !== -1) {
    state.importantNumbers.splice(index, 1)
  }
}
