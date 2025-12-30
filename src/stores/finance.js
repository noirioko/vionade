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
  wishlist: loadFromStorage('mochi_wishlist', []), // Array of { id, name, price, emoji, saved: 0, priority, createdAt }
  challenges: loadFromStorage('mochi_challenges', []), // Array of { id, type, target, startDate, endDate, status }
  movies: loadFromStorage('mochi_movies', []), // Array of { id, title, posterUrl, rating, watchedDate, notes, wouldWatchAgain }
  vioPass: loadFromStorage('mochi_viopass', {
    checkins: [], // Array of { date, didSpend, category?, note?, vioReaction }
    currentStreak: 0,
    longestStreak: 0,
    lastCheckinDate: null,
  }),
  settings: loadFromStorage('mochi_settings', {
    currency: 'IDR',
    hasCompletedOnboarding: false,
    startedAt: null,
    theme: 'light', // 'light' or 'dark'
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

// Callback for when user signs out (set by App.vue)
let onSignOutCallback = null

function setOnSignOutCallback(callback) {
  onSignOutCallback = callback
}

async function initFirebase() {
  // Set up auth callback to handle user changes (e.g., when signing in/out)
  setAuthCallback((user) => {
    if (user) {
      state.userId = user.uid
      state.userEmail = user.email // null for anonymous, email for Google sign-in
      loadFromFirebase()
      setupRealtimeSync()
    } else {
      // User signed out - clean up
      if (unsubscribe) {
        unsubscribe()
        unsubscribe = null
      }
      state.userId = null
      state.userEmail = null
      // Trigger the sign out callback (for redirect)
      if (onSignOutCallback) {
        onSignOutCallback()
      }
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
      // Existing user - load their data
      const data = userDoc.data()
      if (data.wallets) state.wallets = data.wallets
      if (data.transactions) state.transactions = data.transactions
      if (data.settings) state.settings = { ...state.settings, ...data.settings }
      if (data.savings) state.savings = data.savings
      if (data.wishlist) state.wishlist = data.wishlist
      if (data.vioPass) state.vioPass = { ...state.vioPass, ...data.vioPass }
      if (data.movies) state.movies = data.movies

      // Also save to localStorage as backup
      localStorage.setItem('mochi_wallets', JSON.stringify(state.wallets))
      localStorage.setItem('mochi_transactions', JSON.stringify(state.transactions))
      localStorage.setItem('mochi_settings', JSON.stringify(state.settings))
      localStorage.setItem('mochi_savings', JSON.stringify(state.savings))
      localStorage.setItem('mochi_wishlist', JSON.stringify(state.wishlist))
      localStorage.setItem('mochi_viopass', JSON.stringify(state.vioPass))
      localStorage.setItem('mochi_movies', JSON.stringify(state.movies))
    } else {
      // First time user - start fresh with defaults (don't use old localStorage)
      state.wallets = [...DEFAULT_WALLETS]
      state.transactions = []
      state.savings = []
      state.wishlist = []
      state.challenges = []
      state.movies = []
      state.vioPass = {
        checkins: [],
        currentStreak: 0,
        longestStreak: 0,
        lastCheckinDate: null,
      }
      state.settings = {
        currency: 'IDR',
        hasCompletedOnboarding: false,
        startedAt: null,
        theme: state.settings.theme, // Keep current theme preference
        targets: { monthlyIncome: 0, monthlyExpense: 0, monthlySavings: 0 },
        lifetimeGoal: { name: 'House Fund', target: 0 },
      }
      // Save fresh state to Firebase
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
      wishlist: state.wishlist,
      vioPass: state.vioPass,
      movies: state.movies,
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
      if (data.wishlist) state.wishlist = data.wishlist
      if (data.vioPass) state.vioPass = { ...state.vioPass, ...data.vioPass }
      if (data.movies) state.movies = data.movies
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

watch(() => state.wishlist, (newVal) => {
  localStorage.setItem('mochi_wishlist', JSON.stringify(newVal))
  debouncedSaveToFirebase()
}, { deep: true })

watch(() => state.challenges, (newVal) => {
  localStorage.setItem('mochi_challenges', JSON.stringify(newVal))
  debouncedSaveToFirebase()
}, { deep: true })

watch(() => state.vioPass, (newVal) => {
  localStorage.setItem('mochi_viopass', JSON.stringify(newVal))
  debouncedSaveToFirebase()
}, { deep: true })

watch(() => state.movies, (newVal) => {
  localStorage.setItem('mochi_movies', JSON.stringify(newVal))
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

function toggleTheme() {
  state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark'
  applyTheme()
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.settings.theme || 'light')
}

// Wishlist functions
function addWishlistItem(item) {
  const id = Date.now().toString(36) + Math.random().toString(36).substr(2)
  state.wishlist.push({
    id,
    name: item.name,
    price: item.price,
    emoji: item.emoji || '🎁',
    saved: 0,
    priority: item.priority || 'want', // 'need', 'want', 'dream'
    createdAt: new Date().toISOString(),
  })
}

function updateWishlistItem(id, updates) {
  const item = state.wishlist.find(w => w.id === id)
  if (item) {
    Object.assign(item, updates)
  }
}

function deleteWishlistItem(id) {
  const index = state.wishlist.findIndex(w => w.id === id)
  if (index !== -1) {
    state.wishlist.splice(index, 1)
  }
}

function addToWishlistSavings(id, amount) {
  const item = state.wishlist.find(w => w.id === id)
  if (item) {
    item.saved = (item.saved || 0) + amount
    if (item.saved > item.price) {
      item.saved = item.price
    }
  }
}

function claimWishlistItem(id) {
  const item = state.wishlist.find(w => w.id === id)
  if (item && item.saved >= item.price) {
    item.claimed = true
    item.claimedAt = new Date().toISOString()
  }
}

// Movie functions
function addMovie(movie) {
  const id = Date.now().toString(36) + Math.random().toString(36).substr(2)
  state.movies.push({
    id,
    title: movie.title,
    posterUrl: movie.posterUrl || null,
    rating: movie.rating || 5,
    watchedDate: movie.watchedDate || new Date().toISOString().split('T')[0],
    notes: movie.notes || '',
    wouldWatchAgain: movie.wouldWatchAgain !== undefined ? movie.wouldWatchAgain : true,
    createdAt: new Date().toISOString(),
  })
}

function updateMovie(id, updates) {
  const movie = state.movies.find(m => m.id === id)
  if (movie) {
    Object.assign(movie, updates)
  }
}

function deleteMovie(id) {
  const index = state.movies.findIndex(m => m.id === id)
  if (index !== -1) {
    state.movies.splice(index, 1)
  }
}

// Challenge functions
function startChallenge(challenge) {
  const id = Date.now().toString(36) + Math.random().toString(36).substr(2)
  const now = new Date()
  let endDate = new Date(now)

  if (challenge.period === 'week') {
    endDate.setDate(endDate.getDate() + 7)
  } else if (challenge.period === 'month') {
    endDate.setMonth(endDate.getMonth() + 1)
  }

  state.challenges.push({
    id,
    type: challenge.type, // 'no-buy', 'limit-spending'
    target: challenge.target || 0,
    period: challenge.period,
    startDate: now.toISOString(),
    endDate: endDate.toISOString(),
    status: 'active',
  })
}

function endChallenge(id, status) {
  const challenge = state.challenges.find(c => c.id === id)
  if (challenge) {
    challenge.status = status // 'completed' or 'failed'
    challenge.endedAt = new Date().toISOString()
  }
}

function getActiveChallenge() {
  return state.challenges.find(c => c.status === 'active')
}

// Vio Pass functions
const SPENDING_REACTIONS = {
  // Category reactions: { nice: true } = acceptable, { bad: true } = unnecessary
  fnb: { nice: true, message: "Food is important! Just don't overdo it~" },
  groceries: { nice: true, message: "Groceries are essential! Good job being responsible!" },
  bills: { nice: true, message: "Paying bills on time! Vio is proud of you!" },
  pets: { nice: true, message: "Taking care of your pets! They're family!" },
  commissions: { nice: true, message: "Supporting artists! That's so nice of you!" },
  travel: { neutral: true, message: "Traveling can be good for the soul..." },
  hotel: { neutral: true, message: "Sometimes you need a place to stay!" },
  clothes: { bad: true, message: "Hmm... Did you really need new clothes?" },
  other: { bad: true, message: "What did you buy? Vio is curious..." },
}

function getDateString(date = new Date()) {
  return date.toISOString().split('T')[0]
}

function getTodayCheckin() {
  const today = getDateString()
  return state.vioPass.checkins.find(c => c.date === today)
}

function hasCheckedInToday() {
  return !!getTodayCheckin()
}

function performCheckin(didSpend, category = null, note = '') {
  const today = getDateString()

  // Don't allow duplicate checkins
  if (hasCheckedInToday()) {
    return { success: false, message: "You already checked in today!" }
  }

  // Determine Vio's reaction
  let vioReaction = 'happy'
  let vioMessage = "You didn't spend anything today! Amazing self-control!"

  if (didSpend) {
    const reaction = SPENDING_REACTIONS[category] || SPENDING_REACTIONS.other
    vioMessage = reaction.message
    if (reaction.nice) {
      vioReaction = 'okay'
    } else if (reaction.neutral) {
      vioReaction = 'thinking'
    } else {
      vioReaction = 'sad'
    }
  }

  // Add checkin
  state.vioPass.checkins.push({
    date: today,
    didSpend,
    category,
    note,
    vioReaction,
    vioMessage,
  })

  // Update streak
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayString = getDateString(yesterday)

  if (state.vioPass.lastCheckinDate === yesterdayString) {
    // Consecutive day - increase streak
    state.vioPass.currentStreak += 1
  } else if (state.vioPass.lastCheckinDate !== today) {
    // Streak broken - reset to 1
    state.vioPass.currentStreak = 1
  }

  // Update longest streak
  if (state.vioPass.currentStreak > state.vioPass.longestStreak) {
    state.vioPass.longestStreak = state.vioPass.currentStreak
  }

  state.vioPass.lastCheckinDate = today

  return {
    success: true,
    vioReaction,
    vioMessage,
    streak: state.vioPass.currentStreak,
  }
}

function getVioMood() {
  // Get recent spending behavior
  const recentCheckins = state.vioPass.checkins.slice(-7)
  if (recentCheckins.length === 0) return 'neutral'

  const badSpending = recentCheckins.filter(c => c.vioReaction === 'sad').length
  const goodDays = recentCheckins.filter(c => !c.didSpend || c.vioReaction === 'okay').length

  if (badSpending >= 4) return 'worried'
  if (badSpending >= 2) return 'concerned'
  if (goodDays >= 5) return 'happy'
  return 'neutral'
}

function getVioPassStats() {
  const totalCheckins = state.vioPass.checkins.length
  const noSpendDays = state.vioPass.checkins.filter(c => !c.didSpend).length
  const thisWeek = state.vioPass.checkins.filter(c => {
    const checkinDate = new Date(c.date)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return checkinDate >= weekAgo
  })

  return {
    totalCheckins,
    noSpendDays,
    currentStreak: state.vioPass.currentStreak,
    longestStreak: state.vioPass.longestStreak,
    thisWeekCheckins: thisWeek.length,
    thisWeekNoSpend: thisWeek.filter(c => !c.didSpend).length,
  }
}

function formatCurrency(amount, showSign = false) {
  // For normal display, show negative values naturally
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) // Removed Math.abs() - show negatives!

  // If showSign is true, add explicit + for positive
  if (showSign && amount > 0) {
    return `+${formatted}`
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

// Reset all data - clears localStorage and Firebase
async function resetAllData() {
  // Clear all localStorage items
  localStorage.removeItem('mochi_wallets')
  localStorage.removeItem('mochi_transactions')
  localStorage.removeItem('mochi_settings')
  localStorage.removeItem('mochi_savings')
  localStorage.removeItem('mochi_wishlist')
  localStorage.removeItem('mochi_challenges')
  localStorage.removeItem('mochi_viopass')
  localStorage.removeItem('mochi_movies')

  // Reset state to defaults
  state.wallets = JSON.parse(JSON.stringify(DEFAULT_WALLETS))
  state.transactions = []
  state.savings = []
  state.wishlist = []
  state.challenges = []
  state.movies = []
  state.vioPass = {
    checkins: [],
    currentStreak: 0,
    longestStreak: 0,
    lastCheckinDate: null,
  }
  state.settings = {
    currency: 'IDR',
    hasCompletedOnboarding: false,
    startedAt: null,
    theme: state.settings.theme, // Keep current theme
    targets: {
      monthlyIncome: 0,
      monthlyExpense: 0,
      monthlySavings: 0,
    },
    lifetimeGoal: {
      name: 'House Fund',
      target: 0,
    },
  }

  // Save empty state to Firebase to overwrite cloud data
  await saveToFirebase()

  return true
}

// Export composable
export function useFinanceStore() {
  return {
    // State
    state,
    wallets: computed(() => state.wallets),
    transactions: computed(() => state.transactions),
    savings: computed(() => state.savings),
    wishlist: computed(() => state.wishlist),
    challenges: computed(() => state.challenges),
    vioPass: computed(() => state.vioPass),
    movies: computed(() => state.movies),
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
    toggleTheme,
    applyTheme,
    addWishlistItem,
    updateWishlistItem,
    deleteWishlistItem,
    addToWishlistSavings,
    claimWishlistItem,
    addMovie,
    updateMovie,
    deleteMovie,
    startChallenge,
    endChallenge,
    getActiveChallenge,
    performCheckin,
    getTodayCheckin,
    hasCheckedInToday,
    getVioMood,
    getVioPassStats,

    // Constants
    SPENDING_REACTIONS,

    // Helpers
    formatCurrency,
    getWalletById,
    getCategoryById,
    monthlySavingsForMonth,
    resetAllData,
    setOnSignOutCallback,
  }
}
