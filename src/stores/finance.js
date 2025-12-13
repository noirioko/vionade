import { reactive, computed, watch, ref } from 'vue'
import { db, initAuth, setAuthCallback } from '../firebase'
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  query,
  orderBy
} from 'firebase/firestore'

// Default wallets with their icons (placeholder emojis for now)
const DEFAULT_WALLETS = [
  { id: 'bca', name: 'BCA', icon: '🏦', color: '#1a365d', balance: 0 },
  { id: 'bri', name: 'BRI', icon: '🏛️', color: '#0066b3', balance: 0 },
  { id: 'danamon', name: 'Danamon', icon: '🔶', color: '#fdb813', balance: 0 },
  { id: 'ovo', name: 'OVO', icon: '💜', color: '#4c3494', balance: 0 },
  { id: 'shopeepay', name: 'ShopeePay', icon: '🧡', color: '#ee4d2d', balance: 0 },
  { id: 'tokopedia', name: 'Tokopedia', icon: '💚', color: '#42b549', balance: 0 },
  { id: 'dana', name: 'DANA', icon: '💙', color: '#108ee9', balance: 0 },
  { id: 'gopay', name: 'GoPay', icon: '🩵', color: '#00aed6', balance: 0 },
  { id: 'paypal', name: 'PayPal', icon: '🅿️', color: '#003087', balance: 0 },
  { id: 'cash', name: 'Cash', icon: '💵', color: '#6b8e23', balance: 0 },
]

// Expense categories tailored for you!
const EXPENSE_CATEGORIES = [
  { id: 'commissions', name: 'Commissions', icon: '🎨', color: '#e879f9' },
  { id: 'fnb', name: 'F&B', icon: '🍽️', color: '#fb923c' },
  { id: 'groceries', name: 'Groceries', icon: '🛒', color: '#4ade80' },
  { id: 'clothes', name: 'Clothes', icon: '👗', color: '#f472b6' },
  { id: 'pets', name: 'Pets', icon: '🐱', color: '#a3e635' },
  { id: 'bills', name: 'Bills', icon: '⚡', color: '#60a5fa' },
  { id: 'laundry', name: 'Laundry', icon: '🧺', color: '#67e8f9' },
  { id: 'travel', name: 'Travel', icon: '✈️', color: '#38bdf8' },
  { id: 'hotel', name: 'Hotel', icon: '🏨', color: '#c084fc' },
  { id: 'other', name: 'Other', icon: '📦', color: '#a1a1aa' },
]

// Income categories
const INCOME_CATEGORIES = [
  { id: 'freelance', name: 'Freelance', icon: '💼' },
  { id: 'other', name: 'Other', icon: '✨' },
]

// Load from localStorage (fallback)
function loadFromStorage(key, defaultValue) {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : defaultValue
  } catch {
    return defaultValue
  }
}

// Create reactive store
const state = reactive({
  wallets: loadFromStorage('mochi_wallets', DEFAULT_WALLETS),
  transactions: loadFromStorage('mochi_transactions', []),
  savings: loadFromStorage('mochi_savings', []), // Array of { id, amount, date, type: 'monthly' | 'lifetime', note }
  settings: loadFromStorage('mochi_settings', {
    currency: 'IDR',
    hasCompletedOnboarding: false,
    startedAt: null,
    targets: {
      monthlyIncome: 0,
      monthlyExpense: 0,
      monthlySavings: 0,
    },
    lifetimeGoal: {
      name: 'House Fund',
      target: 0,
    },
  }),
  userId: null,
  userEmail: null,
  isLoading: true,
  isSyncing: false,
})

// Firebase sync
let unsubscribe = null

async function initFirebase() {
  // Set up auth callback to handle user changes (e.g., when signing in/out)
  setAuthCallback((user) => {
    if (user) {
      state.userId = user.uid
      state.userEmail = user.email // null for anonymous, email for Google sign-in
      loadFromFirebase()
      setupRealtimeSync()
    } else {
      state.userId = null
      state.userEmail = null
    }
  })

  try {
    const user = await initAuth()
    if (user) {
      state.userId = user.uid
      state.userEmail = user.email
      await loadFromFirebase()
      setupRealtimeSync()
    }
  } catch (error) {
    console.error('Firebase init error:', error)
  } finally {
    state.isLoading = false
  }
}

async function loadFromFirebase() {
  if (!state.userId) return

  try {
    const userDoc = await getDoc(doc(db, 'users', state.userId))
    if (userDoc.exists()) {
      const data = userDoc.data()
      if (data.wallets) state.wallets = data.wallets
      if (data.transactions) state.transactions = data.transactions
      if (data.settings) state.settings = { ...state.settings, ...data.settings }
      if (data.savings) state.savings = data.savings

      // Also save to localStorage as backup
      localStorage.setItem('mochi_wallets', JSON.stringify(state.wallets))
      localStorage.setItem('mochi_transactions', JSON.stringify(state.transactions))
      localStorage.setItem('mochi_settings', JSON.stringify(state.settings))
      localStorage.setItem('mochi_savings', JSON.stringify(state.savings))
    } else {
      // First time user - save current data to Firebase
      await saveToFirebase()
    }
  } catch (error) {
    console.error('Load from Firebase error:', error)
  }
}

async function saveToFirebase() {
  if (!state.userId || state.isSyncing) return

  state.isSyncing = true
  try {
    await setDoc(doc(db, 'users', state.userId), {
      wallets: state.wallets,
      transactions: state.transactions,
      savings: state.savings,
      settings: state.settings,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Save to Firebase error:', error)
  } finally {
    state.isSyncing = false
  }
}

function setupRealtimeSync() {
  if (!state.userId || unsubscribe) return

  unsubscribe = onSnapshot(doc(db, 'users', state.userId), (docSnap) => {
    if (docSnap.exists() && !state.isSyncing) {
      const data = docSnap.data()
      // Only update if data is newer (avoid loops)
      if (data.wallets) state.wallets = data.wallets
      if (data.transactions) state.transactions = data.transactions
      if (data.settings) state.settings = { ...state.settings, ...data.settings }
      if (data.savings) state.savings = data.savings
    }
  })
}

// Debounced save to Firebase
let saveTimeout = null
function debouncedSaveToFirebase() {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    saveToFirebase()
  }, 1000) // Save 1 second after last change
}

// Watch and save to localStorage + Firebase
watch(() => state.wallets, (newVal) => {
  localStorage.setItem('mochi_wallets', JSON.stringify(newVal))
  debouncedSaveToFirebase()
}, { deep: true })

watch(() => state.transactions, (newVal) => {
  localStorage.setItem('mochi_transactions', JSON.stringify(newVal))
  debouncedSaveToFirebase()
}, { deep: true })

watch(() => state.settings, (newVal) => {
  localStorage.setItem('mochi_settings', JSON.stringify(newVal))
  debouncedSaveToFirebase()
}, { deep: true })

watch(() => state.savings, (newVal) => {
  localStorage.setItem('mochi_savings', JSON.stringify(newVal))
  debouncedSaveToFirebase()
}, { deep: true })

// Initialize Firebase on load
initFirebase()

// Computed values
const totalBalance = computed(() => {
  return state.wallets.reduce((sum, wallet) => sum + wallet.balance, 0)
})

const recentTransactions = computed(() => {
  return [...state.transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10)
})

const thisMonthTransactions = computed(() => {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  return state.transactions.filter(t => new Date(t.date) >= startOfMonth)
})

const thisMonthIncome = computed(() => {
  return thisMonthTransactions.value
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
})

const thisMonthExpense = computed(() => {
  return thisMonthTransactions.value
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
})

// Savings computed values
const thisMonthSavings = computed(() => {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  return state.savings
    .filter(s => new Date(s.date) >= startOfMonth)
    .reduce((sum, s) => sum + s.amount, 0)
})

const lifetimeSavingsTotal = computed(() => {
  return state.savings
    .filter(s => s.type === 'lifetime')
    .reduce((sum, s) => sum + s.amount, 0)
})

const monthlySavingsForMonth = (year, month) => {
  const startOfMonth = new Date(year, month, 1)
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59)
  return state.savings
    .filter(s => {
      const date = new Date(s.date)
      return date >= startOfMonth && date <= endOfMonth
    })
    .reduce((sum, s) => sum + s.amount, 0)
}

// Actions
function addTransaction(transaction) {
  const id = Date.now().toString(36) + Math.random().toString(36).substr(2)

  // Set startedAt if this is the first transaction
  if (!state.settings.startedAt && state.transactions.length === 0) {
    state.settings.startedAt = new Date().toISOString()
  }

  // Handle date - if it's just YYYY-MM-DD, convert to ISO with current time
  let transactionDate = transaction.date
  if (transactionDate && transactionDate.length === 10) {
    // It's just a date like "2024-12-10", add current time
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

  // Update wallet balance
  const wallet = state.wallets.find(w => w.id === transaction.walletId)
  if (wallet) {
    if (transaction.type === 'income') {
      wallet.balance += transaction.amount
    } else if (transaction.type === 'expense') {
      wallet.balance -= transaction.amount
    }
  }

  // Handle transfers
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

function deleteTransaction(id) {
  const index = state.transactions.findIndex(t => t.id === id)
  if (index === -1) return

  const transaction = state.transactions[index]

  // Reverse the balance change
  const wallet = state.wallets.find(w => w.id === transaction.walletId)
  if (wallet) {
    if (transaction.type === 'income') {
      wallet.balance -= transaction.amount
    } else if (transaction.type === 'expense') {
      wallet.balance += transaction.amount
    }
  }

  // Reverse transfer
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

function updateTransaction(id, updates) {
  const index = state.transactions.findIndex(t => t.id === id)
  if (index === -1) return

  const oldTransaction = state.transactions[index]

  // First, reverse the old transaction's effect on wallets
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

  // Handle date - if it's just YYYY-MM-DD, convert to ISO
  let transactionDate = updates.date
  if (transactionDate && transactionDate.length === 10) {
    transactionDate = new Date(transactionDate + 'T12:00:00').toISOString()
  }

  // Apply the new transaction
  const newTransaction = {
    ...oldTransaction,
    ...updates,
    date: transactionDate || oldTransaction.date,
  }

  // Apply new transaction's effect on wallets
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

function updateWalletBalance(walletId, balance) {
  const wallet = state.wallets.find(w => w.id === walletId)
  if (wallet) {
    wallet.balance = balance
  }
}

function setStartingBalance(walletId, balance) {
  const wallet = state.wallets.find(w => w.id === walletId)
  if (wallet) {
    wallet.balance = balance
    // Set startedAt if this is the first time logging a balance
    if (!state.settings.startedAt) {
      state.settings.startedAt = new Date().toISOString()
    }
    // Add a "starting balance" transaction for record
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

function completeOnboarding() {
  state.settings.hasCompletedOnboarding = true
}

// Savings functions
function addSavings(amount, type = 'monthly', note = '') {
  const id = Date.now().toString(36) + Math.random().toString(36).substr(2)
  state.savings.push({
    id,
    amount,
    type, // 'monthly' or 'lifetime'
    note,
    date: new Date().toISOString(),
  })
}

function deleteSavings(id) {
  const index = state.savings.findIndex(s => s.id === id)
  if (index !== -1) {
    state.savings.splice(index, 1)
  }
}

function setMonthlyTargets(income, expense, savings) {
  state.settings.targets = {
    monthlyIncome: income || 0,
    monthlyExpense: expense || 0,
    monthlySavings: savings || 0,
  }
}

function setLifetimeGoal(name, target) {
  state.settings.lifetimeGoal = {
    name: name || 'House Fund',
    target: target || 0,
  }
}

function formatCurrency(amount, showSign = false) {
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount))

  if (showSign && amount !== 0) {
    return amount > 0 ? `+${formatted}` : `-${formatted}`
  }
  return formatted
}

function getWalletById(id) {
  return state.wallets.find(w => w.id === id)
}

function getCategoryById(id, type = 'expense') {
  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
  return categories.find(c => c.id === id)
}

// Export composable
export function useFinanceStore() {
  return {
    // State
    state,
    wallets: computed(() => state.wallets),
    transactions: computed(() => state.transactions),
    savings: computed(() => state.savings),
    settings: computed(() => state.settings),
    isLoading: computed(() => state.isLoading),
    isSyncing: computed(() => state.isSyncing),
    userId: computed(() => state.userId),
    userEmail: computed(() => state.userEmail),

    // Computed
    totalBalance,
    recentTransactions,
    thisMonthTransactions,
    thisMonthIncome,
    thisMonthExpense,
    thisMonthSavings,
    lifetimeSavingsTotal,

    // Constants
    EXPENSE_CATEGORIES,
    INCOME_CATEGORIES,
    DEFAULT_WALLETS,

    // Actions
    addTransaction,
    deleteTransaction,
    updateTransaction,
    updateWalletBalance,
    setStartingBalance,
    completeOnboarding,
    saveToFirebase,
    addSavings,
    deleteSavings,
    setMonthlyTargets,
    setLifetimeGoal,

    // Helpers
    formatCurrency,
    getWalletById,
    getCategoryById,
    monthlySavingsForMonth,
  }
}
