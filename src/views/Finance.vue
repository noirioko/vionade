<script setup>
import { ref, computed, inject, onMounted, onUnmounted, watch } from 'vue'
import { useFinanceStore } from '../stores'
import EditTransactionModal from '../components/EditTransactionModal.vue'

// Tab Components
import FinanceOverview from '../components/finance/FinanceOverview.vue'
import FinanceWallets from '../components/finance/FinanceWallets.vue'
import FinanceHistory from '../components/finance/FinanceHistory.vue'
import FinanceArchive from '../components/finance/FinanceArchive.vue'
import FinanceWishlist from '../components/finance/FinanceWishlist.vue'
import FinanceDebts from '../components/finance/FinanceDebts.vue'

const store = useFinanceStore()
const fabAction = inject('fabAction')

// Tab Management
const activeTab = ref('overview') // 'overview', 'wallets', 'history', 'wishlist'

function selectTab(tab) {
  activeTab.value = tab
}

// Transaction editing (shared across tabs)
const editingTransaction = ref(null)

function openEditTransaction(transaction) {
  editingTransaction.value = transaction
}

// Wishlist ref for FAB
const wishlistRef = ref(null)

// Stats for sidebar
const financeStats = computed(() => ({
  wallets: store.wallets.value.length,
  transactions: store.transactions.value.length,
  archivedMonths: store.getClosedMonths()?.length || 0,
  wishlistItems: store.wishlist.value.filter(w => !w.claimed).length,
  activeDebts: store.getActiveDebts()?.length || 0
}))

// FAB behavior based on active tab
// For overview/wallets/history: return null so App.vue opens AddTransactionModal
// For wishlist: open the wishlist add modal
onMounted(() => {
  updateFabAction()
})

onUnmounted(() => {
  fabAction.value = null
})

function updateFabAction() {
  if (activeTab.value === 'wishlist') {
    fabAction.value = () => {
      if (wishlistRef.value) {
        wishlistRef.value.showAddModal = true
      }
    }
  } else {
    // Let App.vue handle it (opens AddTransactionModal)
    fabAction.value = null
  }
}

// Update FAB when tab changes
watch(activeTab, () => {
  updateFabAction()
})
</script>

<template>
  <div class="page finance-page media-page">
    <div class="page-header">
      <img src="/images/vio-logo.png" alt="Vionade" class="page-header-logo" />
    </div>

    <!-- Finance Banner -->
    <div class="finance-banner">
      <div class="finance-banner-content">
        <div class="finance-banner-title">Finance Hub</div>
        <div class="finance-banner-subtitle">Track income, expenses & savings</div>
      </div>
      <img src="/images/finance_bg.png" alt="Vio" class="finance-banner-vio" />
    </div>

    <!-- Desktop Layout Container -->
    <div class="finance-layout">
      <!-- Desktop Sidebar -->
      <aside class="finance-sidebar">
        <nav class="sidebar-nav">
          <button
            class="sidebar-item"
            :class="{ active: activeTab === 'overview' }"
            @click="selectTab('overview')"
          >
            <span class="sidebar-icon">💰</span>
            <span class="sidebar-label">Overview</span>
          </button>
          <button
            class="sidebar-item"
            :class="{ active: activeTab === 'wallets' }"
            @click="selectTab('wallets')"
          >
            <span class="sidebar-icon">👛</span>
            <span class="sidebar-label">Wallets</span>
            <span class="sidebar-count">{{ financeStats.wallets }}</span>
          </button>
          <button
            class="sidebar-item"
            :class="{ active: activeTab === 'history' }"
            @click="selectTab('history')"
          >
            <span class="sidebar-icon">📖</span>
            <span class="sidebar-label">History</span>
            <span class="sidebar-count">{{ financeStats.transactions }}</span>
          </button>
          <button
            class="sidebar-item"
            :class="{ active: activeTab === 'archive' }"
            @click="selectTab('archive')"
          >
            <span class="sidebar-icon">📚</span>
            <span class="sidebar-label">Archive</span>
            <span class="sidebar-count">{{ financeStats.archivedMonths }}</span>
          </button>
          <button
            class="sidebar-item"
            :class="{ active: activeTab === 'debts' }"
            @click="selectTab('debts')"
          >
            <span class="sidebar-icon">🤝</span>
            <span class="sidebar-label">Debts</span>
            <span v-if="financeStats.activeDebts > 0" class="sidebar-count">{{ financeStats.activeDebts }}</span>
          </button>

          <div class="sidebar-divider"></div>

          <button
            class="sidebar-item"
            :class="{ active: activeTab === 'wishlist' }"
            @click="selectTab('wishlist')"
          >
            <span class="sidebar-icon">🎁</span>
            <span class="sidebar-label">Wishlist</span>
            <span class="sidebar-count">{{ financeStats.wishlistItems }}</span>
          </button>
        </nav>

        <div class="sidebar-balance-card">
          <img src="/images/vio_sit.png" alt="Vio" class="sidebar-vio" />
          <div class="sidebar-balance-info">
            <div class="sidebar-balance-label">Total Balance</div>
            <div class="sidebar-balance-amount" :class="store.totalBalance.value >= 0 ? 'positive' : 'negative'">
              {{ store.formatCurrency(store.totalBalance.value) }}
            </div>
          </div>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="finance-content">
        <!-- Mobile Tabs -->
        <div class="finance-tabs mobile-only">
          <button
            class="finance-tab"
            :class="{ active: activeTab === 'overview' }"
            @click="selectTab('overview')"
          >Overview</button>
          <button
            class="finance-tab"
            :class="{ active: activeTab === 'wallets' }"
            @click="selectTab('wallets')"
          >Wallets</button>
          <button
            class="finance-tab"
            :class="{ active: activeTab === 'history' }"
            @click="selectTab('history')"
          >History</button>
          <button
            class="finance-tab"
            :class="{ active: activeTab === 'archive' }"
            @click="selectTab('archive')"
          >Archive</button>
          <button
            class="finance-tab"
            :class="{ active: activeTab === 'debts' }"
            @click="selectTab('debts')"
          >Debts</button>
          <button
            class="finance-tab"
            :class="{ active: activeTab === 'wishlist' }"
            @click="selectTab('wishlist')"
          >Wishlist</button>
        </div>

        <!-- Tab Content -->
        <FinanceOverview
          v-if="activeTab === 'overview'"
          @edit-transaction="openEditTransaction"
          @switch-tab="selectTab"
        />

        <FinanceWallets v-if="activeTab === 'wallets'" />

        <FinanceHistory
          v-if="activeTab === 'history'"
          @edit-transaction="openEditTransaction"
        />

        <FinanceArchive v-if="activeTab === 'archive'" />

        <FinanceDebts v-if="activeTab === 'debts'" />

        <FinanceWishlist
          v-if="activeTab === 'wishlist'"
          ref="wishlistRef"
        />
      </main>
    </div>

    <!-- Edit Transaction Modal -->
    <EditTransactionModal
      v-if="editingTransaction"
      :transaction="editingTransaction"
      @close="editingTransaction = null"
    />
  </div>
</template>

<style scoped>
/* Finance Banner - Universal banner style */
.finance-banner {
  position: relative;
  display: flex;
  align-items: center;
  background:
    linear-gradient(135deg, rgba(245, 158, 11, 0.7) 0%, rgba(251, 191, 36, 0.7) 50%, rgba(252, 211, 77, 0.7) 100%),
    url('/images/1539952.jpg') center center / cover no-repeat;
  border-radius: var(--radius-xl);
  overflow: hidden;
  min-height: 120px;
  margin-bottom: var(--space-md);
  box-shadow: 0 4px 16px rgba(245, 158, 11, 0.3);
}

.finance-banner-content {
  flex: 1;
  padding: var(--space-lg);
}

.finance-banner-title {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.finance-banner-subtitle {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 4px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.finance-banner-vio {
  height: 300px;
  width: auto;
  flex-shrink: 0;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
  animation: gentle-bounce 2s ease-in-out infinite;
  margin-bottom: -180px;
  margin-top: -80px;
}

@keyframes gentle-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

@media (max-width: 480px) {
  .finance-banner-title {
    font-size: 1.5rem;
  }

  .finance-banner-vio {
    height: 220px;
    margin-bottom: -120px;
    margin-top: -60px;
  }
}

/* Layout */
.finance-layout {
  display: block;
}

/* Desktop Sidebar - hidden on mobile */
.finance-sidebar {
  display: none;
}

.finance-content {
  width: 100%;
}

/* Mobile Tabs */
.finance-tabs {
  display: flex;
  gap: var(--space-xs);
  margin-bottom: var(--space-md);
  background: var(--white);
  border-radius: var(--radius-lg);
  padding: var(--space-xs);
  border: 2px solid var(--lavender-100);
  overflow-x: auto;
}

.finance-tab {
  flex: 1;
  padding: var(--space-sm) var(--space-md);
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.finance-tab.active {
  background: var(--lavender-100);
  color: var(--lavender-700);
}

/* Mobile only class */
.mobile-only {
  display: flex;
}

/* Sidebar styles (shared with Media) */
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--white);
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-lg);
  padding: var(--space-sm);
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.sidebar-item:hover {
  background: var(--lavender-50);
  color: var(--text-primary);
}

.sidebar-item.active {
  background: var(--lavender-100);
  color: var(--lavender-700);
  font-weight: 600;
}

.sidebar-icon {
  font-size: 1.125rem;
}

.sidebar-label {
  flex: 1;
}

.sidebar-count {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-tertiary);
  background: var(--lavender-50);
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.sidebar-item.active .sidebar-count {
  background: var(--lavender-200);
  color: var(--lavender-700);
}

.sidebar-divider {
  height: 1px;
  background: var(--lavender-100);
  margin: var(--space-sm) 0;
}

/* Sidebar Balance Card with Vio */
.sidebar-balance-card {
  margin-top: var(--space-md);
  padding: var(--space-md);
  background-image:
    linear-gradient(135deg, rgba(255, 225, 53, 0.6) 0%, rgba(252, 211, 77, 0.6) 100%),
    url('/images/kawaii-bg.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  border: 3px solid #F59E0B;
  border-radius: var(--radius-lg);
  box-shadow: 4px 4px 0 rgba(245, 158, 11, 0.3);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  overflow: hidden;
  position: relative;
}

.sidebar-vio {
  width: 70px;
  height: auto;
  flex-shrink: 0;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15));
}

.sidebar-balance-info {
  flex: 1;
  min-width: 0;
}

.sidebar-balance-label {
  font-size: 0.6875rem;
  color: #92400E;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
  font-weight: 600;
}

.sidebar-balance-amount {
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-balance-amount.positive {
  color: #065F46;
}

.sidebar-balance-amount.negative {
  color: #DC2626;
}

/* Desktop Styles (768px+) */
@media (min-width: 768px) {
  .mobile-only {
    display: none !important;
  }

  .finance-layout {
    display: grid;
    grid-template-columns: 240px 1fr;
    gap: var(--space-lg);
  }

  .finance-sidebar {
    display: flex;
    flex-direction: column;
    position: sticky;
    top: var(--space-md);
    height: fit-content;
    max-height: calc(100vh - 200px);
  }
}

/* Large Desktop (1024px+) */
@media (min-width: 1024px) {
  .finance-layout {
    grid-template-columns: 260px 1fr;
  }
}

/* Extra Large Desktop (1280px+) */
@media (min-width: 1280px) {
  .finance-layout {
    grid-template-columns: 280px 1fr;
  }
}
</style>

<style>
/* Dark mode overrides */
[data-theme="dark"] .finance-banner {
  background: linear-gradient(135deg, #7C3AED 0%, #8B5CF6 50%, #A78BFA 100%) !important;
}

[data-theme="dark"] .finance-tabs {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .finance-tab.active {
  background: #2D2640 !important;
  color: #C4B5FD !important;
}

[data-theme="dark"] .sidebar-nav {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .sidebar-item:hover {
  background: #2D2640 !important;
}

[data-theme="dark"] .sidebar-item.active {
  background: #2D2640 !important;
  color: #C4B5FD !important;
}

[data-theme="dark"] .sidebar-divider {
  background: #3D3456 !important;
}

[data-theme="dark"] .sidebar-balance-card {
  background: linear-gradient(135deg, #5B21B6 0%, #7C3AED 100%) !important;
  border-color: #8B5CF6 !important;
  box-shadow: 4px 4px 0 rgba(139, 92, 246, 0.3) !important;
}

[data-theme="dark"] .sidebar-balance-label {
  color: #E9D5FF !important;
}

[data-theme="dark"] .sidebar-balance-amount.positive {
  color: #6EE7B7 !important;
}

[data-theme="dark"] .sidebar-balance-amount.negative {
  color: #FCA5A5 !important;
}

[data-theme="dark"] .sidebar-count {
  background: #2D2640 !important;
  color: #9D8BC2 !important;
}

[data-theme="dark"] .sidebar-item.active .sidebar-count {
  background: #3D3456 !important;
  color: #C4B5FD !important;
}
</style>
