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
  const amount = Math.round(transaction.amount) // Round to avoid floating point errors

  if (wallet) {
    if (transaction.type === 'income') {
      wallet.balance = Math.round(wallet.balance + amount)
    } else if (transaction.type === 'expense') {
      wallet.balance = Math.round(wallet.balance - amount)
    }
  }

  if (transaction.type === 'transfer' && transaction.toWalletId) {
    const fromWallet = state.wallets.find(w => w.id === transaction.walletId)
    const toWallet = state.wallets.find(w => w.id === transaction.toWalletId)
    if (fromWallet && toWallet) {
      fromWallet.balance = Math.round(fromWallet.balance - amount)
      toWallet.balance = Math.round(toWallet.balance + amount)
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
    // Round to avoid floating point errors (IDR has no decimals)
    wallet.balance = Math.round(balance)
    // Store as starting balance for recalculation reference
    wallet.startingBalance = Math.round(balance)
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
    // Just set the balance directly, don't create a transaction
    // (the old code was double-counting by setting balance AND adding income)
    wallet.balance = balance
    if (!state.settings.startedAt) {
      state.settings.startedAt = new Date().toISOString()
    }
  }
}

// Recalculate wallet balance from all transactions
// Use this if balance gets out of sync
export function recalculateWalletBalance(walletId) {
  const wallet = state.wallets.find(w => w.id === walletId)
  if (!wallet) return 0

  // Start with stored starting balance, or check for "Starting balance" transaction
  let balance = wallet.startingBalance || 0

  // Fallback: check for starting balance transaction (legacy support)
  if (!balance) {
    const startingTx = state.transactions.find(
      t => t.walletId === walletId && t.note === 'Starting balance' && t.type === 'income'
    )
    if (startingTx) {
      balance = startingTx.amount
    }
  }

  // Process all other transactions
  state.transactions.forEach(t => {
    // Skip the starting balance transaction (already counted)
    if (t.note === 'Starting balance' && t.type === 'income' && t.walletId === walletId) {
      return
    }

    if (t.walletId === walletId) {
      if (t.type === 'income') {
        balance += t.amount
      } else if (t.type === 'expense') {
        balance -= t.amount
      } else if (t.type === 'transfer') {
        // This wallet is the source of transfer
        balance -= t.amount
      }
    }

    // If this wallet is the destination of a transfer
    if (t.type === 'transfer' && t.toWalletId === walletId) {
      balance += t.amount
    }
  })

  // Round to avoid floating point errors
  balance = Math.round(balance)

  // Update the wallet balance
  wallet.balance = balance
  return balance
}

// Clear transactions for a SPECIFIC wallet only
export function clearWalletTransactions(walletId) {
  // Count before
  const beforeCount = state.transactions.length

  // Remove only transactions involving this wallet
  state.transactions = state.transactions.filter(t => {
    // Keep transactions that don't involve this wallet
    return t.walletId !== walletId && t.toWalletId !== walletId
  })

  // Reset only THIS wallet's balance
  const wallet = state.wallets.find(w => w.id === walletId)
  if (wallet) {
    wallet.balance = 0
    wallet.startingBalance = 0
  }

  const deleted = beforeCount - state.transactions.length
  return deleted
}

// Fix all wallet balances - rounds to integers and calculates proper starting balances
export function fixAllWalletBalances() {
  const results = []

  state.wallets.forEach(wallet => {
    const oldBalance = wallet.balance

    // Calculate what the balance SHOULD be from transactions (starting from 0)
    let calculatedFromTx = 0
    state.transactions.forEach(t => {
      if (t.note === 'Starting balance' && t.type === 'income' && t.walletId === wallet.id) {
        return // Skip starting balance transactions
      }

      if (t.walletId === wallet.id) {
        if (t.type === 'income') calculatedFromTx += t.amount
        else if (t.type === 'expense') calculatedFromTx -= t.amount
        else if (t.type === 'transfer') calculatedFromTx -= t.amount
      }
      if (t.type === 'transfer' && t.toWalletId === wallet.id) {
        calculatedFromTx += t.amount
      }
    })

    // The starting balance = current balance - calculated from transactions
    // This way: startingBalance + transactions = current balance
    const startingBalance = Math.round(oldBalance - calculatedFromTx)

    wallet.startingBalance = startingBalance
    wallet.balance = Math.round(oldBalance) // Fix any floating point errors

    results.push({
      name: wallet.name,
      oldBalance,
      newBalance: wallet.balance,
      startingBalance,
      changed: oldBalance !== wallet.balance
    })
  })

  return results
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

// Start fresh - clear all transactions and set opening balances
export function startFreshMonth(openingBalances = {}) {
  // Clear all transactions
  state.transactions = []

  // Reset all wallets to 0 first
  state.wallets.forEach(wallet => {
    wallet.balance = 0
    wallet.startingBalance = 0
  })

  // Set opening balances for specified wallets
  Object.entries(openingBalances).forEach(([walletId, balance]) => {
    const wallet = state.wallets.find(w => w.id === walletId)
    if (wallet) {
      wallet.balance = Math.round(balance)
      wallet.startingBalance = Math.round(balance)
    }
  })

  // Update settings
  state.settings.startedAt = new Date().toISOString()

  return true
}
