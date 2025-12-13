<script setup>
import { ref, computed } from 'vue'
import { useFinanceStore } from '../stores/finance'
import HelpTip from '../components/HelpTip.vue'
import EditTransactionModal from '../components/EditTransactionModal.vue'

const store = useFinanceStore()

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
