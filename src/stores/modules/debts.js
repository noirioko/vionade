// Debts module - Simple debt/loan tracker (utang piutang)
import { state, generateId } from '../core'

// Add a new debt
export function addDebt(debt) {
  const id = generateId()

  const newDebt = {
    id,
    type: debt.type, // 'owed_to_me' (piutang) or 'i_owe' (utang)
    person: debt.person.trim(),
    amount: Math.round(debt.amount),
    reason: debt.reason?.trim() || '',
    date: debt.date || new Date().toISOString(), // When the debt happened
    status: 'active',
    paidDate: null,
  }

  state.debts.push(newDebt)
  return newDebt
}

// Mark a debt as paid
export function markDebtPaid(id) {
  const debt = state.debts.find(d => d.id === id)
  if (debt) {
    debt.status = 'paid'
    debt.paidDate = new Date().toISOString()
  }
}

// Reactivate a debt (undo paid)
export function reactivateDebt(id) {
  const debt = state.debts.find(d => d.id === id)
  if (debt) {
    debt.status = 'active'
    debt.paidDate = null
  }
}

// Update a debt
export function updateDebt(id, updates) {
  const debt = state.debts.find(d => d.id === id)
  if (debt) {
    if (updates.person !== undefined) debt.person = updates.person.trim()
    if (updates.amount !== undefined) debt.amount = Math.round(updates.amount)
    if (updates.reason !== undefined) debt.reason = updates.reason?.trim() || ''
    if (updates.date !== undefined) debt.date = updates.date
    if (updates.type !== undefined) debt.type = updates.type
  }
}

// Delete a debt
export function deleteDebt(id) {
  const index = state.debts.findIndex(d => d.id === id)
  if (index !== -1) {
    state.debts.splice(index, 1)
  }
}

// Get active debts
export function getActiveDebts() {
  return state.debts.filter(d => d.status === 'active')
}

// Get paid debts (history)
export function getPaidDebts() {
  return state.debts
    .filter(d => d.status === 'paid')
    .sort((a, b) => new Date(b.paidDate) - new Date(a.paidDate))
}

// Get total owed to me
export function getTotalOwedToMe() {
  return state.debts
    .filter(d => d.type === 'owed_to_me' && d.status === 'active')
    .reduce((sum, d) => sum + d.amount, 0)
}

// Get total I owe
export function getTotalIOwe() {
  return state.debts
    .filter(d => d.type === 'i_owe' && d.status === 'active')
    .reduce((sum, d) => sum + d.amount, 0)
}
