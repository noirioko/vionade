<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useFinanceStore } from '../stores'
import { getCurrentChallenge } from '../data/habitChallenges'
import HelpTip from '../components/HelpTip.vue'
import EditTransactionModal from '../components/EditTransactionModal.vue'

const store = useFinanceStore()
const router = useRouter()
const habitChallenge = getCurrentChallenge()

// Edit transaction state
const editingTransaction = ref(null)

// Challenge state
const showChallengeModal = ref(false)
const newChallenge = ref({
  type: 'limit-spending',
  target: '',
  period: 'week',
})

const activeChallenge = computed(() => {
  return store.challenges.value.find(c => c.status === 'active')
})

const challengeProgress = computed(() => {
  if (!activeChallenge.value) return 0
  const challenge = activeChallenge.value

  if (challenge.type === 'limit-spending') {
    // Get expenses during challenge period
    const startDate = new Date(challenge.startDate)
    const expenses = store.transactions.value
      .filter(t => t.type === 'expense' && new Date(t.date) >= startDate)
      .reduce((sum, t) => sum + t.amount, 0)
    return Math.min(100, (expenses / challenge.target) * 100)
  }
  return 0
})

const challengeSpent = computed(() => {
  if (!activeChallenge.value) return 0
  const startDate = new Date(activeChallenge.value.startDate)
  return store.transactions.value
    .filter(t => t.type === 'expense' && new Date(t.date) >= startDate)
    .reduce((sum, t) => sum + t.amount, 0)
})

const daysLeft = computed(() => {
  if (!activeChallenge.value) return 0
  const end = new Date(activeChallenge.value.endDate)
  const now = new Date()
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
})

function startNewChallenge() {
  if (!newChallenge.value.target) return
  store.startChallenge({
    type: newChallenge.value.type,
    target: parseFloat(newChallenge.value.target),
    period: newChallenge.value.period,
  })
  showChallengeModal.value = false
  newChallenge.value = { type: 'limit-spending', target: '', period: 'week' }
}

function giveUpChallenge() {
  if (activeChallenge.value) {
    store.endChallenge(activeChallenge.value.id, 'failed')
  }
}

// Format the "tracking since" date
const trackingSince = computed(() => {
  const startedAt = store.settings.value.startedAt
  if (!startedAt) return null
  const date = new Date(startedAt)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
})

// Month picker
const currentDate = ref(new Date())

const selectedMonth = computed(() => {
  return currentDate.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

function prevMonth() {
  const newDate = new Date(currentDate.value)
  newDate.setMonth(newDate.getMonth() - 1)
  currentDate.value = newDate
}

function nextMonth() {
  const newDate = new Date(currentDate.value)
  newDate.setMonth(newDate.getMonth() + 1)
  // Don't go beyond current month
  if (newDate <= new Date()) {
    currentDate.value = newDate
  }
}

const isCurrentMonth = computed(() => {
  const now = new Date()
  return currentDate.value.getMonth() === now.getMonth() &&
         currentDate.value.getFullYear() === now.getFullYear()
})

// Filter transactions by selected month
const monthTransactions = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const startOfMonth = new Date(year, month, 1)
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59)

  return store.transactions.value.filter(t => {
    const date = new Date(t.date)
    return date >= startOfMonth && date <= endOfMonth
  })
})

const monthIncome = computed(() => {
  return monthTransactions.value
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
})

const monthExpense = computed(() => {
  return monthTransactions.value
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
})

function formatDate(dateString) {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}

function getTransactionIcon(transaction) {
  if (transaction.type === 'transfer') return '↔️'
  if (transaction.type === 'income') {
    const cat = store.getCategoryById(transaction.category, 'income')
    return cat?.icon || '💰'
  }
  const cat = store.getCategoryById(transaction.category, 'expense')
  return cat?.icon || '📦'
}

function getTransactionTitle(transaction) {
  if (transaction.type === 'transfer') {
    const from = store.getWalletById(transaction.walletId)
    const to = store.getWalletById(transaction.toWalletId)
    return `${from?.name || 'Unknown'} → ${to?.name || 'Unknown'}`
  }
  if (transaction.note) return transaction.note
  const cat = store.getCategoryById(
    transaction.category,
    transaction.type === 'income' ? 'income' : 'expense'
  )
  return cat?.name || 'Transaction'
}

const recentMonthTransactions = computed(() => {
  return [...monthTransactions.value]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5)
})
</script>

<template>
  <div class="page">
    <div class="page-header">
      <img src="/images/vio-logo.png" alt="Vionade" class="page-header-logo" />
    </div>

    <!-- Total Balance Card -->
    <div class="wallet-card section">
      <div class="wallet-card-content">
        <div class="wallet-card-label">Total Balance</div>
        <div class="wallet-card-amount">{{ store.formatCurrency(store.totalBalance.value) }}</div>
        <div class="wallet-card-subtitle">across {{ store.wallets.value.length }} wallets</div>
        <div v-if="trackingSince" class="wallet-card-since">Tracking since {{ trackingSince }}</div>
      </div>
      <img src="/images/vio_right.png" alt="" class="wallet-card-vio" />
    </div>

    <!-- Quick Actions with Vio -->
    <div class="quick-actions-card">
      <div class="quick-actions-content">
        <div class="quick-actions-title">What would you like to do?</div>
        <div class="quick-actions-grid">
          <router-link to="/wallets" class="quick-action-btn">
            <span class="quick-action-icon">💰</span>
            <span class="quick-action-label">Wallets</span>
          </router-link>
          <router-link to="/history" class="quick-action-btn">
            <span class="quick-action-icon">📊</span>
            <span class="quick-action-label">History</span>
          </router-link>
          <router-link to="/wishlist" class="quick-action-btn">
            <span class="quick-action-icon">🎁</span>
            <span class="quick-action-label">Wishlist</span>
          </router-link>
          <router-link to="/viopass" class="quick-action-btn">
            <span class="quick-action-icon">✅</span>
            <span class="quick-action-label">Vio Pass</span>
          </router-link>
        </div>
      </div>
      <img src="/images/vio_stand1.png" alt="Vio" class="quick-actions-vio" />
    </div>

    <!-- Challenge Section -->
    <div class="section challenge-section">
      <div class="section-header">
        <h3 class="section-title">
          Challenge
          <HelpTip text="Set spending limits for yourself! Try to stay under your budget for a week or month. Vio will cheer you on!" />
        </h3>
      </div>

      <!-- Active Challenge -->
      <div v-if="activeChallenge" class="challenge-card" :class="{ danger: challengeProgress > 80 }">
        <div class="challenge-header">
          <div class="challenge-info">
            <span class="challenge-icon">{{ challengeProgress > 80 ? '😰' : '💪' }}</span>
            <div>
              <div class="challenge-title">Limit Spending</div>
              <div class="challenge-subtitle">{{ daysLeft }} days left</div>
            </div>
          </div>
          <button class="btn btn-sm btn-ghost" @click="giveUpChallenge">Give up</button>
        </div>

        <div class="challenge-progress">
          <div class="challenge-bar">
            <div
              class="challenge-fill"
              :class="{ danger: challengeProgress > 80 }"
              :style="{ width: challengeProgress + '%' }"
            ></div>
          </div>
          <div class="challenge-stats">
            <span>{{ store.formatCurrency(challengeSpent) }} spent</span>
            <span>Limit: {{ store.formatCurrency(activeChallenge.target) }}</span>
          </div>
        </div>

        <div v-if="challengeProgress > 80" class="challenge-warning">
          Careful! You're close to your limit!
        </div>
      </div>

      <!-- No Active Challenge -->
      <div v-else class="challenge-empty" @click="showChallengeModal = true">
        <span class="challenge-empty-icon">🎯</span>
        <div class="challenge-empty-text">Start a challenge!</div>
        <div class="challenge-empty-hint">Tap to set a spending limit</div>
      </div>
    </div>

    <!-- Challenge Modal -->
    <div v-if="showChallengeModal" class="modal-overlay" @click.self="showChallengeModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">Start a Challenge</h3>
          <button class="modal-close" @click="showChallengeModal = false">x</button>
        </div>

        <div class="input-group">
          <label class="input-label">Spending Limit</label>
          <input
            v-model="newChallenge.target"
            type="number"
            class="input"
            placeholder="e.g., 500000"
            inputmode="numeric"
          />
        </div>

        <div class="input-group">
          <label class="input-label">Duration</label>
          <div class="period-grid">
            <button
              class="period-btn"
              :class="{ active: newChallenge.period === 'week' }"
              @click="newChallenge.period = 'week'"
            >
              1 Week
            </button>
            <button
              class="period-btn"
              :class="{ active: newChallenge.period === 'month' }"
              @click="newChallenge.period = 'month'"
            >
              1 Month
            </button>
          </div>
        </div>

        <button class="btn btn-primary btn-lg w-full" @click="startNewChallenge">
          Start Challenge!
        </button>
      </div>
    </div>

    <!-- Habits Banner -->
    <div
      class="habits-banner"
      :style="habitChallenge.bannerBg ? { backgroundImage: `url(${habitChallenge.bannerBg})` } : {}"
      @click="router.push('/habits')"
    >
      <div class="habits-banner-content">
        <img
          v-if="habitChallenge.bannerIcon"
          :src="habitChallenge.bannerIcon"
          alt=""
          class="habits-banner-icon"
        />
        <div class="habits-banner-text">
          <div class="habits-banner-title">{{ habitChallenge.name }}</div>
          <div class="habits-banner-subtitle">{{ habitChallenge.subtitle }}</div>
        </div>
      </div>
      <img
        v-if="habitChallenge.bannerChar"
        :src="habitChallenge.bannerChar"
        alt=""
        class="habits-banner-char"
      />
    </div>

    <!-- Media Tracker Banner -->
    <div
      class="media-banner"
      @click="router.push('/media')"
    >
      <div class="media-banner-content">
        <div class="media-banner-text">
          <div class="media-banner-title">Media Journal</div>
          <div class="media-banner-subtitle">Track movies, series & books</div>
        </div>
      </div>
      <img src="/images/vio_banner_full.png" alt="Vio" class="media-banner-vio" />
    </div>

    <!-- Calendar Box with Header Ribbon -->
    <div class="calendar-box section">
      <div class="calendar-header">
        <button class="month-nav" @click="prevMonth">←</button>
        <div class="month-label">{{ selectedMonth }}</div>
        <button
          class="month-nav"
          :class="{ disabled: isCurrentMonth }"
          :disabled="isCurrentMonth"
          @click="nextMonth"
        >→</button>
      </div>
      <div class="summary-box">
        <div class="summary-item">
          <div class="summary-label">Income</div>
          <div class="summary-amount income">{{ store.formatCurrency(monthIncome) }}</div>
        </div>
        <div class="summary-divider"></div>
        <div class="summary-item">
          <div class="summary-label">Expenses</div>
          <div class="summary-amount expense">{{ store.formatCurrency(monthExpense) }}</div>
        </div>
      </div>
    </div>

    <!-- Quick Wallets -->
    <div class="section">
      <div class="section-header">
        <h3 class="section-title">Wallets</h3>
        <RouterLink to="/wallets" class="btn btn-ghost btn-sm">See all</RouterLink>
      </div>
      <div style="display: flex; gap: var(--space-sm); overflow-x: auto; padding-bottom: var(--space-sm);">
        <div
          v-for="wallet in store.wallets.value.slice(0, 4)"
          :key="wallet.id"
          class="card card-hover"
          style="min-width: 140px; flex-shrink: 0;"
        >
          <div style="font-size: 1.5rem; margin-bottom: var(--space-xs);">{{ wallet.icon }}</div>
          <div class="text-sm font-bold">{{ wallet.name }}</div>
          <div class="amount text-sm" :class="wallet.balance >= 0 ? 'amount-positive' : 'amount-negative'">
            {{ store.formatCurrency(wallet.balance) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Transactions (for selected month) -->
    <div class="section">
      <div class="section-header">
        <h3 class="section-title">Recent Transactions</h3>
        <RouterLink to="/history" class="btn btn-ghost btn-sm">See all</RouterLink>
      </div>

      <div v-if="recentMonthTransactions.length === 0" class="empty-state">
        <img src="/images/vio_sit.png" alt="" class="empty-state-vio" />
        <div class="empty-state-title">No transactions</div>
        <div class="empty-state-text">No transactions in {{ selectedMonth }}</div>
      </div>

      <div v-else class="list">
        <div
          v-for="transaction in recentMonthTransactions"
          :key="transaction.id"
          class="list-item list-item-clickable"
          @click="openEditModal(transaction)"
        >
          <div
            class="list-item-icon"
            :style="{
              background: transaction.type === 'income'
                ? 'rgba(125, 211, 168, 0.15)'
                : transaction.type === 'transfer'
                  ? 'rgba(163, 196, 245, 0.15)'
                  : 'rgba(245, 163, 181, 0.15)'
            }"
          >
            {{ getTransactionIcon(transaction) }}
          </div>
          <div class="list-item-content">
            <div class="list-item-title">{{ getTransactionTitle(transaction) }}</div>
            <div class="list-item-subtitle">
              {{ formatDate(transaction.date) }}
              <span v-if="transaction.type !== 'transfer'">
                · {{ store.getWalletById(transaction.walletId)?.name }}
              </span>
            </div>
          </div>
          <div class="list-item-amount">
            <div
              class="amount"
              :class="{
                'amount-positive': transaction.type === 'income',
                'amount-negative': transaction.type === 'expense',
                'text-muted': transaction.type === 'transfer'
              }"
            >
              {{ transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : '' }}{{ store.formatCurrency(transaction.amount) }}
            </div>
          </div>
        </div>
      </div>
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
/* Quick Actions Card */
.quick-actions-card {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%);
  border-radius: var(--radius-xl);
  margin-bottom: var(--space-md);
  border: 2px solid #7DD3FC;
}

.quick-actions-content {
  flex: 1;
}

.quick-actions-title {
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 700;
  color: #0369A1;
  margin-bottom: var(--space-md);
}

.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-sm);
}

.quick-action-btn {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: white;
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--text-primary);
  font-weight: 600;
  font-size: 0.875rem;
  border: 2px solid transparent;
  transition: all 0.15s;
}

.quick-action-btn:hover {
  border-color: #7DD3FC;
  transform: translateY(-1px);
}

.quick-action-icon {
  font-size: 1.25rem;
}

.quick-action-label {
  color: #0C4A6E;
}

.quick-actions-vio {
  width: 120px;
  height: auto;
  flex-shrink: 0;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
}

@media (max-width: 480px) {
  .quick-actions-vio {
    width: 80px;
  }

  .quick-actions-title {
    font-size: 1rem;
  }

  .quick-action-btn {
    padding: var(--space-xs) var(--space-sm);
    font-size: 0.75rem;
  }

  .quick-action-icon {
    font-size: 1rem;
  }
}

/* Habits Banner */
.habits-banner {
  position: relative;
  display: flex;
  align-items: stretch;
  border-radius: var(--radius-xl);
  overflow: hidden;
  margin-bottom: var(--space-md);
  background: linear-gradient(135deg, #F59E0B 0%, #FBBF24 50%, #FCD34D 100%);
  background-size: cover;
  background-position: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  min-height: 140px;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

.habits-banner:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}

.habits-banner-content {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: linear-gradient(90deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 60%, transparent 100%);
}

.habits-banner-icon {
  width: 100px;
  height: 100px;
  object-fit: contain;
  flex-shrink: 0;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
}

.habits-banner-text {
  flex: 1;
}

.habits-banner-title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.habits-banner-subtitle {
  font-size: 0.9375rem;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 4px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.habits-banner-char {
  height: 140px;
  width: auto;
  object-fit: contain;
  object-position: bottom right;
  flex-shrink: 0;
  margin-right: var(--space-md);
}

@media (max-width: 480px) {
  .habits-banner-icon {
    width: 72px;
    height: 72px;
  }

  .habits-banner-char {
    height: 100px;
    margin-right: var(--space-sm);
  }

  .habits-banner-title {
    font-size: 1.25rem;
  }
}

/* Media Banner */
.media-banner {
  position: relative;
  display: flex;
  align-items: center;
  border-radius: var(--radius-xl);
  overflow: hidden;
  margin-bottom: var(--space-md);
  background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 50%, #C4B5FD 100%);
  box-shadow: 0 4px 16px rgba(139, 92, 246, 0.3);
  min-height: 100px;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

.media-banner:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
}

.media-banner-content {
  flex: 1;
  padding: var(--space-lg);
}

.media-banner-text {
  flex: 1;
}

.media-banner-title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.media-banner-subtitle {
  font-size: 0.9375rem;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 4px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.media-banner-vio {
  height: 100px;
  width: auto;
  object-fit: contain;
  flex-shrink: 0;
  margin-right: var(--space-md);
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
}

@media (max-width: 480px) {
  .media-banner-title {
    font-size: 1.25rem;
  }

  .media-banner-vio {
    height: 80px;
    margin-right: var(--space-sm);
  }
}

/* Rounded Yellow Box with Header Ribbon */
.calendar-box {
  background: #FFE135;
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  overflow: hidden;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
  background: url('/images/calendar_ribbon.png') center center no-repeat;
  background-size: contain;
  padding: var(--space-md) var(--space-sm);
}

.month-nav {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.5);
  border-radius: var(--radius-full);
  font-size: 1rem;
  color: var(--lavender-600);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.month-nav:hover:not(.disabled) {
  background: rgba(255, 255, 255, 0.8);
}

.month-nav.disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.month-label {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.25rem;
  color: var(--lavender-600);
  min-width: 160px;
  text-align: center;
}

.summary-box {
  display: flex;
  align-items: center;
  background: var(--white);
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-md);
}

.summary-item {
  flex: 1;
  text-align: center;
}

.summary-label {
  font-size: 0.75rem;
  color: var(--lavender-500);
  margin-bottom: 2px;
}

.summary-amount {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1rem;
}

.summary-amount.income {
  color: var(--income-color);
}

.summary-amount.expense {
  color: var(--expense-color);
}

.summary-divider {
  width: 2px;
  height: 30px;
  background: #FFD700;
  margin: 0 var(--space-sm);
}

/* Vio sitting in empty state */
.empty-state-vio {
  width: 120px;
  height: auto;
  margin-bottom: var(--space-md);
  opacity: 0.9;
}

/* Challenge Section */
.challenge-section {
  margin-bottom: var(--space-md);
}

.challenge-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  border: 2px solid var(--lavender-200);
}

.challenge-card.danger {
  border-color: var(--expense-color);
  background: rgba(244, 63, 94, 0.05);
}

.challenge-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.challenge-info {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.challenge-icon {
  font-size: 1.75rem;
}

.challenge-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1rem;
  color: var(--text-primary);
}

.challenge-subtitle {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.challenge-progress {
  margin-bottom: var(--space-sm);
}

.challenge-bar {
  height: 12px;
  background: var(--gray-200);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-bottom: var(--space-xs);
}

.challenge-fill {
  height: 100%;
  background: var(--lavender-500);
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}

.challenge-fill.danger {
  background: var(--expense-color);
}

.challenge-stats {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.challenge-warning {
  margin-top: var(--space-sm);
  padding: var(--space-sm);
  background: rgba(244, 63, 94, 0.1);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  color: var(--expense-color);
  text-align: center;
  font-weight: 600;
}

.challenge-empty {
  background: var(--bg-card);
  border: 2px dashed var(--lavender-300);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  text-align: center;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.challenge-empty:hover {
  border-color: var(--lavender-500);
  background: var(--lavender-50);
}

.challenge-empty-icon {
  font-size: 2.5rem;
  display: block;
  margin-bottom: var(--space-sm);
}

.challenge-empty-text {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.125rem;
  color: var(--text-primary);
  margin-bottom: var(--space-xs);
}

.challenge-empty-hint {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.period-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-sm);
}

.period-btn {
  padding: var(--space-sm) var(--space-md);
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-md);
  background: var(--bg-card);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  color: var(--text-primary);
  transition: all var(--transition-fast);
}

.period-btn:hover {
  border-color: var(--lavender-300);
}

.period-btn.active {
  border-color: var(--lavender-500);
  background: var(--lavender-500);
  color: white;
}

/* Clickable list items */
.list-item-clickable {
  cursor: pointer;
  transition: background var(--transition-fast);
}

.list-item-clickable:hover {
  background: var(--gray-100);
}

.list-item-clickable:active {
  background: var(--gray-200);
}
</style>

<style>
/* Dark mode */
[data-theme="dark"] .quick-actions-card {
  background: linear-gradient(135deg, #1E1B4B 0%, #312E81 100%) !important;
  border-color: #4C1D95 !important;
}

[data-theme="dark"] .quick-actions-title {
  color: #C4B5FD !important;
}

[data-theme="dark"] .quick-action-btn {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .quick-action-btn:hover {
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .quick-action-label {
  color: #E0E7FF !important;
}

/* Dark mode for Habits Banner */
[data-theme="dark"] .habits-banner {
  box-shadow: 0 4px 16px rgba(139, 92, 246, 0.3) !important;
}

[data-theme="dark"] .habits-banner-title {
  color: #F5F3FF !important;
}

[data-theme="dark"] .habits-banner-subtitle {
  color: #DDD6FE !important;
}

/* Dark mode for Media Banner */
[data-theme="dark"] .media-banner {
  background: linear-gradient(135deg, #4C1D95 0%, #6D28D9 50%, #7C3AED 100%) !important;
}
</style>
