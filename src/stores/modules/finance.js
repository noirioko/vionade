// Finance module - Wallets, Transactions, Savings
import { computed } from 'vue'
import { state, generateId } from '../core'

// Computed values
export const totalBalance = computed(() => {
  return state.wallets.reduce((sum, wallet) => sum + wallet.balance, 0)
})

export const recentTransactions = computed(() => {
  return [...state.transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10)
})

export const thisMonthTransactions = computed(() => {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  return state.transactions.filter(t => new Date(t.date) >= startOfMonth)
})

export const thisMonthIncome = computed(() => {
  return thisMonthTransactions.value
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
})

export const thisMonthExpense = computed(() => {
  return thisMonthTransactions.value
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
})

export const thisMonthSavings = computed(() => {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  return state.savings
    .filter(s => new Date(s.date) >= startOfMonth)
    .reduce((sum, s) => sum + s.amount, 0)
})

export const lifetimeSavingsTotal = computed(() => {
  return state.savings
    .filter(s => s.type === 'lifetime')
    .reduce((sum, s) => sum + s.amount, 0)
})

export function monthlySavingsForMonth(year, month) {
  const startOfMonth = new Date(year, month, 1)
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59)
  return state.savings
    .filter(s => {
      const date = new Date(s.date)
      return date >= startOfMonth && date <= endOfMonth
    })
    .reduce((sum, s) => sum + s.amount, 0)
}

// Transaction functions
export function addTransaction(transaction) {
  const id = generateId()

  if (!state.settings.startedAt && state.transactions.length === 0) {
    state.settings.startedAt = new Date().toISOString()
  }

  let transactionDate = transaction.date
  if (transactionDate && transactionDate.length === 10) {
    transactionDate = new Date(transactionDate + 'T12:00:00').toISOString()
  } else if (!transactionDate) {
    transactionDate = new Date().toISOString()
  }

  const newTransaction = {
    id,
    ...transaction,
    date: transactionDate,
  }

  state.transactions.push(newTransaction)

  const wallet = state.wallets.find(w => w.id === transaction.walletId)
  if (wallet) {
    if (transaction.type === 'income') {
      wallet.balance += transaction.amount
    } else if (transaction.type === 'expense') {
      wallet.balance -= transaction.amount
    }
  }

  if (transaction.type === 'transfer' && transaction.toWalletId) {
    const fromWallet = state.wallets.find(w => w.id === transaction.walletId)
    const toWallet = state.wallets.find(w => w.id === transaction.toWalletId)
    if (fromWallet && toWallet) {
      fromWallet.balance -= transaction.amount
      toWallet.balance += transaction.amount
    }
  }

  return newTransaction
}

export function deleteTransaction(id) {
  const index = state.transactions.findIndex(t => t.id === id)
  if (index === -1) return

  const transaction = state.transactions[index]

  const wallet = state.wallets.find(w => w.id === transaction.walletId)
  if (wallet) {
    if (transaction.type === 'income') {
      wallet.balance -= transaction.amount
    } else if (transaction.type === 'expense') {
      wallet.balance += transaction.amount
    }
  }

  if (transaction.type === 'transfer' && transaction.toWalletId) {
    const fromWallet = state.wallets.find(w => w.id === transaction.walletId)
    const toWallet = state.wallets.find(w => w.id === transaction.toWalletId)
    if (fromWallet && toWallet) {
      fromWallet.balance += transaction.amount
      toWallet.balance -= transaction.amount
    }
  }

  state.transactions.splice(index, 1)
}

export function updateTransaction(id, updates) {
  const index = state.transactions.findIndex(t => t.id === id)
  if (index === -1) return

  const oldTransaction = state.transactions[index]

  // Reverse old transaction's effect
  const oldWallet = state.wallets.find(w => w.id === oldTransaction.walletId)
  if (oldWallet) {
    if (oldTransaction.type === 'income') {
      oldWallet.balance -= oldTransaction.amount
    } else if (oldTransaction.type === 'expense') {
      oldWallet.balance += oldTransaction.amount
    }
  }

  if (oldTransaction.type === 'transfer' && oldTransaction.toWalletId) {
    const oldFromWallet = state.wallets.find(w => w.id === oldTransaction.walletId)
    const oldToWallet = state.wallets.find(w => w.id === oldTransaction.toWalletId)
    if (oldFromWallet && oldToWallet) {
      oldFromWallet.balance += oldTransaction.amount
      oldToWallet.balance -= oldTransaction.amount
    }
  }

  let transactionDate = updates.date
  if (transactionDate && transactionDate.length === 10) {
    transactionDate = new Date(transactionDate + 'T12:00:00').toISOString()
  }

  const newTransaction = {
    ...oldTransaction,
    ...updates,
    date: transactionDate || oldTransaction.date,
  }

  // Apply new transaction's effect
  const newWallet = state.wallets.find(w => w.id === newTransaction.walletId)
  if (newWallet) {
    if (newTransaction.type === 'income') {
      newWallet.balance += newTransaction.amount
    } else if (newTransaction.type === 'expense') {
      newWallet.balance -= newTransaction.amount
    }
  }

  if (newTransaction.type === 'transfer' && newTransaction.toWalletId) {
    const newFromWallet = state.wallets.find(w => w.id === newTransaction.walletId)
    const newToWallet = state.wallets.find(w => w.id === newTransaction.toWalletId)
    if (newFromWallet && newToWallet) {
      newFromWallet.balance -= newTransaction.amount
      newToWallet.balance += newTransaction.amount
    }
  }

  state.transactions[index] = newTransaction
}

export function updateWalletBalance(walletId, balance) {
  const wallet = state.wallets.find(w => w.id === walletId)
  if (wallet) {
    wallet.balance = balance
  }
}

export function updateWalletAccountNumber(walletId, accountNumber) {
  const wallet = state.wallets.find(w => w.id === walletId)
  if (wallet) {
    wallet.accountNumber = accountNumber
  }
}

export function setStartingBalance(walletId, balance) {
  const wallet = state.wallets.find(w => w.id === walletId)
  if (wallet) {
    wallet.balance = balance
    if (!state.settings.startedAt) {
      state.settings.startedAt = new Date().toISOString()
    }
    addTransaction({
      type: 'income',
      walletId,
      amount: balance,
      category: 'other',
      note: 'Starting balance',
      date: new Date().toISOString(),
    })
  }
}

// Savings functions
export function addSavings(amount, type = 'monthly', note = '') {
  const id = generateId()
  state.savings.push({
    id,
    amount,
    type,
    note,
    date: new Date().toISOString(),
  })
}

export function deleteSavings(id) {
  const index = state.savings.findIndex(s => s.id === id)
  if (index !== -1) {
    state.savings.splice(index, 1)
  }
}

// Challenge functions
export function startChallenge(challenge) {
  const id = generateId()
  const now = new Date()
  let endDate = new Date(now)

  if (challenge.period === 'week') {
    endDate.setDate(endDate.getDate() + 7)
  } else if (challenge.period === 'month') {
    endDate.setMonth(endDate.getMonth() + 1)
  }

  state.challenges.push({
    id,
    type: challenge.type,
    target: challenge.target || 0,
    period: challenge.period,
    startDate: now.toISOString(),
    endDate: endDate.toISOString(),
    status: 'active',
  })
}

export function endChallenge(id, status) {
  const challenge = state.challenges.find(c => c.id === id)
  if (challenge) {
    challenge.status = status
    challenge.endedAt = new Date().toISOString()
  }
}

export function getActiveChallenge() {
  return state.challenges.find(c => c.status === 'active')
}
