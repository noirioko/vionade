import { reactive, watch } from 'vue'
import { db, initAuth, setAuthCallback } from '../firebase'
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore'

// Default wallets
export const DEFAULT_WALLETS = [
  { id: 'bca', name: 'BCA', icon: '🏦', color: '#1a365d', balance: 0, accountNumber: '' },
  { id: 'bri', name: 'BRI', icon: '🏛️', color: '#0066b3', balance: 0, accountNumber: '' },
  { id: 'danamon', name: 'Danamon', icon: '🔶', color: '#fdb813', balance: 0, accountNumber: '' },
  { id: 'ovo', name: 'OVO', icon: '💜', color: '#4c3494', balance: 0, accountNumber: '' },
  { id: 'shopeepay', name: 'ShopeePay', icon: '🧡', color: '#ee4d2d', balance: 0, accountNumber: '' },
  { id: 'tokopedia', name: 'Tokopedia', icon: '💚', color: '#42b549', balance: 0, accountNumber: '' },
  { id: 'dana', name: 'DANA', icon: '💙', color: '#108ee9', balance: 0, accountNumber: '' },
  { id: 'gopay', name: 'GoPay', icon: '🩵', color: '#00aed6', balance: 0, accountNumber: '' },
  { id: 'paypal', name: 'PayPal', icon: '🅿️', color: '#003087', balance: 0, accountNumber: '' },
  { id: 'cash', name: 'Cash', icon: '💵', color: '#6b8e23', balance: 0, accountNumber: '' },
]

// Expense categories
export const EXPENSE_CATEGORIES = [
  { id: 'commissions', name: 'Commissions', icon: '🎨', color: '#e879f9' },
  { id: 'fnb', name: 'F&B', icon: '🍽️', color: '#fb923c' },
  { id: 'groceries', name: 'Groceries', icon: '🛒', color: '#4ade80' },
  { id: 'clothes', name: 'Clothes', icon: '👗', color: '#f472b6' },
  { id: 'salon', name: 'Salon / Beauty', icon: '💅', color: '#f9a8d4' },
  { id: 'pets', name: 'Pets', icon: '🐱', color: '#a3e635' },
  { id: 'bills', name: 'Bills', icon: '⚡', color: '#60a5fa' },
  { id: 'subscription', name: 'Subscription', icon: '🔄', color: '#8b5cf6' },
  { id: 'laundry', name: 'Laundry', icon: '🧺', color: '#67e8f9' },
  { id: 'travel', name: 'Travel', icon: '✈️', color: '#38bdf8' },
  { id: 'hotel', name: 'Hotel', icon: '🏨', color: '#c084fc' },
  { id: 'shopping', name: 'Shopping', icon: '🛍️', color: '#f43f5e' },
  { id: 'gaming', name: 'Gaming', icon: '🎮', color: '#6366f1' },
  { id: 'medical', name: 'Medical', icon: '🏥', color: '#ef4444' },
  { id: 'business', name: 'Business', icon: '💼', color: '#0ea5e9' },
  { id: 'other', name: 'Other', icon: '📦', color: '#a1a1aa' },
]

// Income categories
export const INCOME_CATEGORIES = [
  { id: 'freelance', name: 'Freelance', icon: '💼' },
  { id: 'other', name: 'Other', icon: '✨' },
]

// Load from localStorage helper
export function loadFromStorage(key, defaultValue) {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : defaultValue
  } catch {
    return defaultValue
  }
}

// Generate unique ID
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// Create reactive store state - use global to survive HMR
// This ensures all module instances share the same state
if (!window.__vionadeState) {
  window.__vionadeState = reactive({
    wallets: loadFromStorage('mochi_wallets', DEFAULT_WALLETS),
    transactions: loadFromStorage('mochi_transactions', []),
    savings: loadFromStorage('mochi_savings', []),
    wishlist: loadFromStorage('mochi_wishlist', []),
    challenges: loadFromStorage('mochi_challenges', []),
    movies: loadFromStorage('mochi_movies', []),
    series: loadFromStorage('mochi_series', []),
    books: loadFromStorage('mochi_books', []),
    youtubeVideos: loadFromStorage('mochi_youtube_videos', []),
    youtubeChannels: loadFromStorage('mochi_youtube_channels', []),
    passwords: loadFromStorage('mochi_passwords', []),
    pets: loadFromStorage('mochi_pets', []),
    petLogs: loadFromStorage('mochi_petlogs', []),
    petSessions: loadFromStorage('mochi_petsessions', []),
    tankLogs: loadFromStorage('mochi_tanklogs', []),
    collections: loadFromStorage('mochi_collections', []),
    collectionItems: loadFromStorage('mochi_collectionitems', []),
    wardrobe: loadFromStorage('mochi_wardrobe', []),
    subscriptions: loadFromStorage('mochi_subscriptions', []),
    painLogs: loadFromStorage('mochi_painlogs', []),
    nutLogs: loadFromStorage('mochi_nutlogs', []),
    importantNumbers: loadFromStorage('mochi_importantnumbers', []),
    shoppingList: loadFromStorage('mochi_shoppinglist', []),
    shoppingPapers: loadFromStorage('mochi_shoppingpapers', []),
    habits: loadFromStorage('mochi_habits', {
      currentChallenge: 'january-2026',
      completions: {},
      weeklyBonuses: {},
      endOfMonthGoals: {},
    }),
    vioPass: loadFromStorage('mochi_viopass', {
      checkins: [],
      currentStreak: 0,
      longestStreak: 0,
      lastCheckinDate: null,
    }),
    settings: loadFromStorage('mochi_settings', {
      currency: 'IDR',
      hasCompletedOnboarding: false,
      startedAt: null,
      theme: 'light',
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
}

export const state = window.__vionadeState

// Firebase sync
let onSignOutCallback = null
let saveTimeout = null

// Use global flags to survive HMR (hot module replacement)
if (typeof window.__vionadePendingChanges === 'undefined') {
  window.__vionadePendingChanges = false
}
if (typeof window.__vionadeSyncPaused === 'undefined') {
  window.__vionadeSyncPaused = false
}

function getHasPendingChanges() {
  return window.__vionadePendingChanges
}
function setHasPendingChanges(value) {
  window.__vionadePendingChanges = value
}

// Pause/resume sync - use this during bulk operations
export function pauseSync() {
  window.__vionadeSyncPaused = true
  console.log('[Firebase] Sync PAUSED')
}

export function resumeSync() {
  window.__vionadeSyncPaused = false
  console.log('[Firebase] Sync RESUMED')
}

// Call this BEFORE making local state changes to prevent Firebase sync from overwriting
export function markPendingChanges() {
  setHasPendingChanges(true)
  console.log('[Firebase] Marked pending changes')
}

export function setOnSignOutCallback(callback) {
  onSignOutCallback = callback
}

export async function saveToFirebase() {
  if (!state.userId || state.isSyncing) return

  state.isSyncing = true
  setHasPendingChanges(true) // Ensure flag is set during save
  try {
    await setDoc(doc(db, 'users', state.userId), {
      wallets: state.wallets,
      transactions: state.transactions,
      savings: state.savings,
      wishlist: state.wishlist,
      challenges: state.challenges,
      vioPass: state.vioPass,
      movies: state.movies,
      series: state.series,
      books: state.books,
      youtubeVideos: state.youtubeVideos,
      youtubeChannels: state.youtubeChannels,
      passwords: state.passwords,
      pets: state.pets,
      petLogs: state.petLogs,
      petSessions: state.petSessions,
      tankLogs: state.tankLogs,
      collections: state.collections,
      collectionItems: state.collectionItems,
      wardrobe: state.wardrobe,
      subscriptions: state.subscriptions,
      habits: state.habits,
      importantNumbers: state.importantNumbers,
      shoppingList: state.shoppingList,
      shoppingPapers: state.shoppingPapers,
      painLogs: state.painLogs,
      nutLogs: state.nutLogs,
      settings: state.settings,
      updatedAt: new Date().toISOString(),
    })
    console.log('[Firebase] Saved successfully, transactions:', state.transactions.length)
    // Keep pending flag true for 3 seconds after save to prevent sync overwrite
    setTimeout(() => {
      setHasPendingChanges(false)
      console.log('[Firebase] Pending changes flag cleared')
    }, 3000)
  } catch (error) {
    console.error('Save to Firebase error:', error)
    setHasPendingChanges(false)
  } finally {
    state.isSyncing = false
  }
}

export function debouncedSaveToFirebase() {
  setHasPendingChanges(true)
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(async () => {
    await saveToFirebase()
    // Note: saveToFirebase already handles clearing the flag after 3 seconds
  }, 1000)
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
      if (data.wishlist) state.wishlist = data.wishlist
      if (data.challenges) state.challenges = data.challenges
      if (data.vioPass) state.vioPass = { ...state.vioPass, ...data.vioPass }
      if (data.movies) state.movies = data.movies
      if (data.series) state.series = data.series
      if (data.books) state.books = data.books
      if (data.youtubeVideos) state.youtubeVideos = data.youtubeVideos
      if (data.youtubeChannels) state.youtubeChannels = data.youtubeChannels
      if (data.passwords) state.passwords = data.passwords
      if (data.pets) state.pets = data.pets
      if (data.petLogs) state.petLogs = data.petLogs
      if (data.petSessions) state.petSessions = data.petSessions
      if (data.tankLogs) state.tankLogs = data.tankLogs
      if (data.collections) state.collections = data.collections
      if (data.collectionItems) state.collectionItems = data.collectionItems
      if (data.wardrobe) state.wardrobe = data.wardrobe
      if (data.subscriptions) state.subscriptions = data.subscriptions
      if (data.habits) state.habits = { ...state.habits, ...data.habits }
      if (data.importantNumbers) state.importantNumbers = data.importantNumbers
      if (data.shoppingList) state.shoppingList = data.shoppingList
      if (data.shoppingPapers) state.shoppingPapers = data.shoppingPapers
      if (data.painLogs) state.painLogs = data.painLogs
      if (data.nutLogs) state.nutLogs = data.nutLogs

      // Save to localStorage as backup
      localStorage.setItem('mochi_wallets', JSON.stringify(state.wallets))
      localStorage.setItem('mochi_transactions', JSON.stringify(state.transactions))
      localStorage.setItem('mochi_settings', JSON.stringify(state.settings))
      localStorage.setItem('mochi_savings', JSON.stringify(state.savings))
      localStorage.setItem('mochi_wishlist', JSON.stringify(state.wishlist))
      localStorage.setItem('mochi_challenges', JSON.stringify(state.challenges))
      localStorage.setItem('mochi_viopass', JSON.stringify(state.vioPass))
      localStorage.setItem('mochi_movies', JSON.stringify(state.movies))
      localStorage.setItem('mochi_series', JSON.stringify(state.series))
      localStorage.setItem('mochi_books', JSON.stringify(state.books))
      localStorage.setItem('mochi_youtube_videos', JSON.stringify(state.youtubeVideos))
      localStorage.setItem('mochi_youtube_channels', JSON.stringify(state.youtubeChannels))
      localStorage.setItem('mochi_passwords', JSON.stringify(state.passwords))
      localStorage.setItem('mochi_pets', JSON.stringify(state.pets))
      localStorage.setItem('mochi_petlogs', JSON.stringify(state.petLogs))
      localStorage.setItem('mochi_petsessions', JSON.stringify(state.petSessions))
      localStorage.setItem('mochi_tanklogs', JSON.stringify(state.tankLogs))
      localStorage.setItem('mochi_collections', JSON.stringify(state.collections))
      localStorage.setItem('mochi_collectionitems', JSON.stringify(state.collectionItems))
      localStorage.setItem('mochi_wardrobe', JSON.stringify(state.wardrobe))
      localStorage.setItem('mochi_subscriptions', JSON.stringify(state.subscriptions))
      localStorage.setItem('mochi_habits', JSON.stringify(state.habits))
      localStorage.setItem('mochi_shoppingpapers', JSON.stringify(state.shoppingPapers))
      localStorage.setItem('mochi_painlogs', JSON.stringify(state.painLogs))
      localStorage.setItem('mochi_nutlogs', JSON.stringify(state.nutLogs))
    } else {
      // First time user - start fresh
      state.wallets = [...DEFAULT_WALLETS]
      state.transactions = []
      state.savings = []
      state.wishlist = []
      state.challenges = []
      state.movies = []
      state.series = []
      state.books = []
      state.youtubeVideos = []
      state.youtubeChannels = []
      state.passwords = []
      state.pets = []
      state.petLogs = []
      state.petSessions = []
      state.tankLogs = []
      state.collections = []
      state.collectionItems = []
      state.wardrobe = []
      state.habits = {
        currentChallenge: 'january-2026',
        completions: {},
        weeklyBonuses: {},
        endOfMonthGoals: {},
      }
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
        theme: state.settings.theme,
        targets: { monthlyIncome: 0, monthlyExpense: 0, monthlySavings: 0 },
        lifetimeGoal: { name: 'House Fund', target: 0 },
      }
      await saveToFirebase()
    }
  } catch (error) {
    console.error('Load from Firebase error:', error)
  }
}

function setupRealtimeSync() {
  if (!state.userId) return

  // Use global unsubscribe to prevent multiple listeners from HMR
  // First, clean up any existing listener
  if (window.__vionadeUnsubscribe) {
    console.log('[Firebase] Cleaning up old listener')
    window.__vionadeUnsubscribe()
    window.__vionadeUnsubscribe = null
  }

  console.log('[Firebase] Setting up realtime sync listener')
  window.__vionadeUnsubscribe = onSnapshot(doc(db, 'users', state.userId), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data()

      // Log sync attempts for debugging
      if (window.__vionadeSyncPaused) {
        console.log('[Firebase Sync] BLOCKED - sync is paused')
        return
      }
      if (state.isSyncing) {
        console.log('[Firebase Sync] BLOCKED - currently syncing')
        return
      }
      if (getHasPendingChanges()) {
        console.log('[Firebase Sync] BLOCKED - has pending changes')
        return
      }

      console.log('[Firebase Sync] Applying remote data, transactions:', data.transactions?.length || 0)

      if (data.wallets) state.wallets = data.wallets
      if (data.transactions) state.transactions = data.transactions
      if (data.settings) state.settings = { ...state.settings, ...data.settings }
      if (data.savings) state.savings = data.savings
      if (data.wishlist) state.wishlist = data.wishlist
      if (data.challenges) state.challenges = data.challenges
      if (data.vioPass) state.vioPass = { ...state.vioPass, ...data.vioPass }
      if (data.movies) state.movies = data.movies
      if (data.series) state.series = data.series
      if (data.books) state.books = data.books
      if (data.youtubeVideos) state.youtubeVideos = data.youtubeVideos
      if (data.youtubeChannels) state.youtubeChannels = data.youtubeChannels
      if (data.passwords) state.passwords = data.passwords
      if (data.pets) state.pets = data.pets
      if (data.petLogs) state.petLogs = data.petLogs
      if (data.petSessions) state.petSessions = data.petSessions
      if (data.tankLogs) state.tankLogs = data.tankLogs
      if (data.collections) state.collections = data.collections
      if (data.collectionItems) state.collectionItems = data.collectionItems
      if (data.wardrobe) state.wardrobe = data.wardrobe
      if (data.subscriptions) state.subscriptions = data.subscriptions
      if (data.habits) state.habits = { ...state.habits, ...data.habits }
      if (data.importantNumbers) state.importantNumbers = data.importantNumbers
      if (data.shoppingList) state.shoppingList = data.shoppingList
      if (data.shoppingPapers) state.shoppingPapers = data.shoppingPapers
      if (data.painLogs) state.painLogs = data.painLogs
      if (data.nutLogs) state.nutLogs = data.nutLogs
    }
  })
}

export async function initFirebase() {
  setAuthCallback((user) => {
    if (user) {
      state.userId = user.uid
      state.userEmail = user.email
      loadFromFirebase()
      setupRealtimeSync()
    } else {
      if (window.__vionadeUnsubscribe) {
        window.__vionadeUnsubscribe()
        window.__vionadeUnsubscribe = null
      }
      state.userId = null
      state.userEmail = null
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

// Setup localStorage watchers
const stateKeys = [
  { key: 'wallets', storage: 'mochi_wallets' },
  { key: 'transactions', storage: 'mochi_transactions' },
  { key: 'settings', storage: 'mochi_settings' },
  { key: 'savings', storage: 'mochi_savings' },
  { key: 'wishlist', storage: 'mochi_wishlist' },
  { key: 'challenges', storage: 'mochi_challenges' },
  { key: 'vioPass', storage: 'mochi_viopass' },
  { key: 'movies', storage: 'mochi_movies' },
  { key: 'series', storage: 'mochi_series' },
  { key: 'books', storage: 'mochi_books' },
  { key: 'youtubeVideos', storage: 'mochi_youtube_videos' },
  { key: 'youtubeChannels', storage: 'mochi_youtube_channels' },
  { key: 'passwords', storage: 'mochi_passwords' },
  { key: 'pets', storage: 'mochi_pets' },
  { key: 'petLogs', storage: 'mochi_petlogs' },
  { key: 'petSessions', storage: 'mochi_petsessions' },
  { key: 'tankLogs', storage: 'mochi_tanklogs' },
  { key: 'collections', storage: 'mochi_collections' },
  { key: 'collectionItems', storage: 'mochi_collectionitems' },
  { key: 'wardrobe', storage: 'mochi_wardrobe' },
  { key: 'subscriptions', storage: 'mochi_subscriptions' },
  { key: 'habits', storage: 'mochi_habits' },
  { key: 'painLogs', storage: 'mochi_painlogs' },
  { key: 'nutLogs', storage: 'mochi_nutlogs' },
  { key: 'importantNumbers', storage: 'mochi_importantnumbers' },
  { key: 'shoppingList', storage: 'mochi_shoppinglist' },
  { key: 'shoppingPapers', storage: 'mochi_shoppingpapers' },
]

stateKeys.forEach(({ key, storage }) => {
  watch(() => state[key], (newVal) => {
    localStorage.setItem(storage, JSON.stringify(newVal))
    debouncedSaveToFirebase()
  }, { deep: true })
})

// Initialize Firebase on load
initFirebase()

// Reset all data
export async function resetAllData() {
  stateKeys.forEach(({ storage }) => {
    localStorage.removeItem(storage)
  })

  state.wallets = JSON.parse(JSON.stringify(DEFAULT_WALLETS))
  state.transactions = []
  state.savings = []
  state.wishlist = []
  state.challenges = []
  state.movies = []
  state.series = []
  state.books = []
  state.youtubeVideos = []
  state.youtubeChannels = []
  state.passwords = []
  state.pets = []
  state.petLogs = []
  state.petSessions = []
  state.tankLogs = []
  state.collections = []
  state.collectionItems = []
  state.wardrobe = []
  state.painLogs = []
  state.nutLogs = []
  state.importantNumbers = []
  state.shoppingList = []
  state.habits = {
    currentChallenge: 'january-2026',
    completions: {},
    weeklyBonuses: {},
    endOfMonthGoals: {},
  }
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
    theme: state.settings.theme,
    targets: { monthlyIncome: 0, monthlyExpense: 0, monthlySavings: 0 },
    lifetimeGoal: { name: 'House Fund', target: 0 },
  }

  await saveToFirebase()
  return true
}

// Currency formatter
export function formatCurrency(amount, showSign = false) {
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)

  if (showSign && amount > 0) {
    return `+${formatted}`
  }
  return formatted
}

// Helper functions
export function getWalletById(id) {
  return state.wallets.find(w => w.id === id)
}

export function getCategoryById(id, type = 'expense') {
  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
  return categories.find(c => c.id === id)
}
