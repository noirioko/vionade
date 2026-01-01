// Main store - combines all modules
import { computed } from 'vue'

// Core state and helpers
import {
  state,
  DEFAULT_WALLETS,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  formatCurrency,
  getWalletById,
  getCategoryById,
  saveToFirebase,
  resetAllData,
  setOnSignOutCallback,
} from './core'

// Finance module
import {
  totalBalance,
  recentTransactions,
  thisMonthTransactions,
  thisMonthIncome,
  thisMonthExpense,
  thisMonthSavings,
  lifetimeSavingsTotal,
  monthlySavingsForMonth,
  addTransaction,
  deleteTransaction,
  updateTransaction,
  updateWalletBalance,
  updateWalletAccountNumber,
  setStartingBalance,
  addSavings,
  deleteSavings,
  startChallenge,
  endChallenge,
  getActiveChallenge,
} from './modules/finance'

// Media module
import {
  addMovie,
  updateMovie,
  deleteMovie,
  addSeries,
  updateSeries,
  deleteSeries,
  addBook,
  updateBook,
  deleteBook,
} from './modules/media'

// Passwords module
import {
  addPassword,
  updatePassword,
  deletePassword,
} from './modules/passwords'

// Habits module
import {
  toggleHabitCompletion,
  toggleWeeklyBonus,
  toggleEndOfMonthGoal,
  isHabitCompleted,
  isWeeklyBonusCompleted,
  isEndOfMonthGoalCompleted,
} from './modules/habits'

// VioPass module
import {
  SPENDING_REACTIONS,
  getTodayCheckin,
  hasCheckedInToday,
  performCheckin,
  getVioMood,
  getVioPassStats,
} from './modules/viopass'

// Wishlist module
import {
  addWishlistItem,
  updateWishlistItem,
  deleteWishlistItem,
  addToWishlistSavings,
  claimWishlistItem,
} from './modules/wishlist'

// Settings module
import {
  completeOnboarding,
  setMonthlyTargets,
  setLifetimeGoal,
  toggleTheme,
  applyTheme,
} from './modules/settings'

// Pets module
import {
  addPet,
  updatePet,
  deletePet,
  getPetByNickname,
  getPetById,
  addPetLog,
  deletePetLog,
  getPetLogs,
  getLastActionDate,
  getDaysSinceAction,
  parseQuickEntry,
} from './modules/pets'

// Tanks module
import {
  addTankLog,
  deleteTankLog,
  updateTankLog,
  getTankLogs,
  getLastWaterChange,
  getDaysSinceWaterChange,
  getLastTankAction,
} from './modules/tanks'

// Export composable
export function useFinanceStore() {
  return {
    // State (reactive)
    state,
    wallets: computed(() => state.wallets),
    transactions: computed(() => state.transactions),
    savings: computed(() => state.savings),
    wishlist: computed(() => state.wishlist),
    challenges: computed(() => state.challenges),
    vioPass: computed(() => state.vioPass),
    movies: computed(() => state.movies),
    series: computed(() => state.series),
    books: computed(() => state.books),
    passwords: computed(() => state.passwords),
    pets: computed(() => state.pets),
    petLogs: computed(() => state.petLogs),
    tankLogs: computed(() => state.tankLogs),
    habits: computed(() => state.habits),
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
    SPENDING_REACTIONS,

    // Finance actions
    addTransaction,
    deleteTransaction,
    updateTransaction,
    updateWalletBalance,
    updateWalletAccountNumber,
    setStartingBalance,
    saveToFirebase,
    addSavings,
    deleteSavings,
    startChallenge,
    endChallenge,
    getActiveChallenge,
    monthlySavingsForMonth,

    // Settings actions
    completeOnboarding,
    setMonthlyTargets,
    setLifetimeGoal,
    toggleTheme,
    applyTheme,

    // Wishlist actions
    addWishlistItem,
    updateWishlistItem,
    deleteWishlistItem,
    addToWishlistSavings,
    claimWishlistItem,

    // Media actions
    addMovie,
    updateMovie,
    deleteMovie,
    addSeries,
    updateSeries,
    deleteSeries,
    addBook,
    updateBook,
    deleteBook,

    // Password actions
    addPassword,
    updatePassword,
    deletePassword,

    // VioPass actions
    performCheckin,
    getTodayCheckin,
    hasCheckedInToday,
    getVioMood,
    getVioPassStats,

    // Habits actions
    toggleHabitCompletion,
    toggleWeeklyBonus,
    toggleEndOfMonthGoal,
    isHabitCompleted,
    isWeeklyBonusCompleted,
    isEndOfMonthGoalCompleted,

    // Pet actions
    addPet,
    updatePet,
    deletePet,
    getPetByNickname,
    getPetById,
    addPetLog,
    deletePetLog,
    getPetLogs,
    getLastActionDate,
    getDaysSinceAction,
    parseQuickEntry,

    // Tank actions
    addTankLog,
    deleteTankLog,
    updateTankLog,
    getTankLogs,
    getLastWaterChange,
    getDaysSinceWaterChange,
    getLastTankAction,

    // Helpers
    formatCurrency,
    getWalletById,
    getCategoryById,
    resetAllData,
    setOnSignOutCallback,
  }
}
