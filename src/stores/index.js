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
  markPendingChanges,
  pauseSync,
  resumeSync,
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
  recalculateWalletBalance,
  fixAllWalletBalances,
  clearWalletTransactions,
  startFreshMonth,
  archiveMonth,
  deleteArchivedMonth,
  getClosedMonths,
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
  addYoutubeVideo,
  updateYoutubeVideo,
  deleteYoutubeVideo,
  YOUTUBE_CATEGORIES,
  addYoutubeChannel,
  updateYoutubeChannel,
  deleteYoutubeChannel,
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
  updatePetLog,
  deletePetLog,
  getPetLogs,
  getLastActionDate,
  getDaysSinceAction,
  addPetSession,
  updatePetSession,
  deletePetSession,
  getPetSessions,
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

// Collections module
import {
  COLLECTION_TYPES,
  addCollection,
  updateCollection,
  deleteCollection,
  getCollectionById,
  addCollectionItem,
  updateCollectionItem,
  deleteCollectionItem,
  getCollectionItems,
  getCollectionStats,
  toggleItemOwned,
  getCollectionsWithStats,
  getFilteredCollections,
  getCollectionLocations,
  getCollectionBrands,
  getCollectionsGrouped,
} from './modules/collections'

// Wardrobe module
import {
  WARDROBE_CATEGORIES,
  addWardrobeItem,
  updateWardrobeItem,
  deleteWardrobeItem,
  getWardrobeItemById,
  toggleWardrobeFavorite,
  getWardrobeLocations,
  getWardrobeBrands,
  getWardrobeCollections,
  getFilteredWardrobe,
  getWardrobeGrouped,
  getWardrobeStats,
} from './modules/wardrobe'

// Subscriptions module
import {
  BILLING_CYCLES,
  COMMON_SERVICES,
  addSubscription,
  updateSubscription,
  deleteSubscription,
  toggleSubscription,
  getActiveSubscriptions,
  getMonthlyAmount,
  getTotalMonthlySubscriptions,
  getTotalYearlySubscriptions,
  getNextBillingDate,
  getDaysUntilBilling,
  getUpcomingBillings,
} from './modules/subscriptions'

// Pain module
import {
  PAIN_TYPES,
  PAIN_LEVELS,
  addPainLog,
  updatePainLog,
  deletePainLog,
  getPainLogsForDate,
  getPainLogsForMonth,
  getPainTypeById,
} from './modules/pain'

// Nut module
import {
  NUT_TRIGGERS,
  addNutLog,
  updateNutLog,
  deleteNutLog,
  getNutLogsForDate,
  getNutLogsForMonth,
  getTotalNutCount,
  getThisMonthNutCount,
} from './modules/nut'

// Cafe module
import {
  addCafeVisit,
  updateCafeVisit,
  deleteCafeVisit,
  getCafeStats,
} from './modules/cafe'

// Reviews module
import {
  REVIEW_CATEGORIES,
  addReview,
  updateReview,
  deleteReview,
  getReviewsByCategory,
  getReviewStats,
} from './modules/reviews'

// Important Numbers module
import {
  addImportantNumber,
  updateImportantNumber,
  deleteImportantNumber,
} from './modules/importantNumbers'

// Shopping List module
import {
  SHOPPING_CATEGORIES,
  addShoppingItem,
  updateShoppingItem,
  deleteShoppingItem,
  toggleShoppingItem,
  clearCheckedItems,
  createShoppingPaper,
  updateShoppingPaper,
  deleteShoppingPaper,
  addItemToPaper,
  togglePaperItem,
  deletePaperItem,
  updatePaperItem,
  clearCheckedFromPaper,
} from './modules/shoppingList'

// Debts module
import {
  addDebt,
  updateDebt,
  markDebtPaid,
  reactivateDebt,
  deleteDebt,
  getActiveDebts,
  getPaidDebts,
  getTotalOwedToMe,
  getTotalIOwe,
} from './modules/debts'

// Export constants for direct use
export { COLLECTION_TYPES }

// Export composable
export function useFinanceStore() {
  return {
    // State (reactive)
    state,
    wallets: computed(() => state.wallets),
    transactions: computed(() => state.transactions),
    savings: computed(() => state.savings),
    wishlist: computed(() => state.wishlist),
    challenges: computed(() => [...state.challenges]),
    vioPass: computed(() => state.vioPass),
    movies: computed(() => state.movies),
    series: computed(() => state.series),
    books: computed(() => state.books),
    youtubeVideos: computed(() => state.youtubeVideos),
    youtubeChannels: computed(() => state.youtubeChannels),
    passwords: computed(() => state.passwords),
    pets: computed(() => state.pets),
    petLogs: computed(() => state.petLogs),
    petSessions: computed(() => state.petSessions),
    tankLogs: computed(() => state.tankLogs),
    collections: computed(() => state.collections),
    collectionItems: computed(() => state.collectionItems),
    wardrobe: computed(() => state.wardrobe),
    painLogs: computed(() => [...state.painLogs]),
    nutLogs: computed(() => [...state.nutLogs]),
    cafeVisits: computed(() => [...state.cafeVisits]),
    reviews: computed(() => [...state.reviews]),
    importantNumbers: computed(() => state.importantNumbers),
    shoppingList: computed(() => state.shoppingList),
    shoppingPapers: computed(() => state.shoppingPapers),
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
    COLLECTION_TYPES,
    WARDROBE_CATEGORIES,

    // Finance actions
    addTransaction,
    deleteTransaction,
    updateTransaction,
    updateWalletBalance,
    updateWalletAccountNumber,
    setStartingBalance,
    recalculateWalletBalance,
    fixAllWalletBalances,
    clearWalletTransactions,
    startFreshMonth,
    archiveMonth,
    deleteArchivedMonth,
    getClosedMonths,
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
    addYoutubeVideo,
    updateYoutubeVideo,
    deleteYoutubeVideo,
    YOUTUBE_CATEGORIES,
    addYoutubeChannel,
    updateYoutubeChannel,
    deleteYoutubeChannel,

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
    updatePetLog,
    deletePetLog,
    getPetLogs,
    getLastActionDate,
    getDaysSinceAction,
    addPetSession,
    updatePetSession,
    deletePetSession,
    getPetSessions,
    parseQuickEntry,

    // Tank actions
    addTankLog,
    deleteTankLog,
    updateTankLog,
    getTankLogs,
    getLastWaterChange,
    getDaysSinceWaterChange,
    getLastTankAction,

    // Collection actions
    addCollection,
    updateCollection,
    deleteCollection,
    getCollectionById,
    addCollectionItem,
    updateCollectionItem,
    deleteCollectionItem,
    getCollectionItems,
    getCollectionStats,
    toggleItemOwned,
    getCollectionsWithStats,
    getFilteredCollections,
    getCollectionLocations,
    getCollectionBrands,
    getCollectionsGrouped,

    // Wardrobe actions
    addWardrobeItem,
    updateWardrobeItem,
    deleteWardrobeItem,
    getWardrobeItemById,
    toggleWardrobeFavorite,
    getWardrobeLocations,
    getWardrobeBrands,
    getWardrobeCollections,
    getFilteredWardrobe,
    getWardrobeGrouped,
    getWardrobeStats,

    // Subscription actions
    BILLING_CYCLES,
    COMMON_SERVICES,
    subscriptions: computed(() => state.subscriptions),
    addSubscription,
    updateSubscription,
    deleteSubscription,
    toggleSubscription,
    getActiveSubscriptions,
    getMonthlyAmount,
    getTotalMonthlySubscriptions,
    getTotalYearlySubscriptions,
    getNextBillingDate,
    getDaysUntilBilling,
    getUpcomingBillings,

    // Pain actions
    PAIN_TYPES,
    PAIN_LEVELS,
    addPainLog,
    updatePainLog,
    deletePainLog,
    getPainLogsForDate,
    getPainLogsForMonth,
    getPainTypeById,

    // Nut actions
    NUT_TRIGGERS,
    addNutLog,
    updateNutLog,
    deleteNutLog,
    getNutLogsForDate,
    getNutLogsForMonth,
    getTotalNutCount,
    getThisMonthNutCount,

    // Cafe actions
    addCafeVisit,
    updateCafeVisit,
    deleteCafeVisit,
    getCafeStats,

    // Reviews actions
    REVIEW_CATEGORIES,
    addReview,
    updateReview,
    deleteReview,
    getReviewsByCategory,
    getReviewStats,

    // Important Numbers actions
    addImportantNumber,
    updateImportantNumber,
    deleteImportantNumber,

    // Shopping List actions
    SHOPPING_CATEGORIES,
    addShoppingItem,
    updateShoppingItem,
    deleteShoppingItem,
    toggleShoppingItem,
    clearCheckedItems,
    createShoppingPaper,
    updateShoppingPaper,
    deleteShoppingPaper,
    addItemToPaper,
    togglePaperItem,
    deletePaperItem,
    updatePaperItem,
    clearCheckedFromPaper,

    // Debt actions
    debts: computed(() => state.debts),
    addDebt,
    updateDebt,
    markDebtPaid,
    reactivateDebt,
    deleteDebt,
    getActiveDebts,
    getPaidDebts,
    getTotalOwedToMe,
    getTotalIOwe,

    // Helpers
    formatCurrency,
    getWalletById,
    getCategoryById,
    markPendingChanges,
    pauseSync,
    resumeSync,
    resetAllData,
    setOnSignOutCallback,
  }
}
