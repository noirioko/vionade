<script setup>
import { ref, computed } from 'vue'
import { useFinanceStore } from '../../stores'
import HelpTip from '../HelpTip.vue'

const store = useFinanceStore()

const emit = defineEmits(['edit-transaction', 'switch-tab'])

// Challenge state
const showChallengeModal = ref(false)
const newChallenge = ref({
  type: 'limit-spending',
  target: '',
  period: 'week',
})

// Challenge types
const challengeTypes = [
  { id: 'limit-spending', label: 'Limit Spending', icon: '💸', description: 'Spend less than...' },
  { id: 'save-amount', label: 'Save Money', icon: '🐷', description: 'Save at least...' },
]

// Get ALL active challenges (not just one)
const activeChallenges = computed(() => {
  const challenges = store.challenges.value
  if (!challenges || challenges.length === 0) return []
  return challenges.filter(c => c.status === 'active')
})

// Helper to get challenge start date (adjusted for period)
function getChallengeStartDate(challenge) {
  let startDate = new Date(challenge.startDate)

  if (challenge.period === 'month') {
    startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
  } else if (challenge.period === 'week') {
    const day = startDate.getDay()
    startDate = new Date(startDate)
    startDate.setDate(startDate.getDate() - day) // Go back to Sunday
    startDate.setHours(0, 0, 0, 0)
  }

  return startDate
}

// Helper functions to calculate per-challenge stats
function getChallengeProgress(challenge) {
  if (!challenge) return 0

  if (challenge.type === 'limit-spending') {
    const startDate = getChallengeStartDate(challenge)
    const expenses = store.transactions.value
      .filter(t => t.type === 'expense' && new Date(t.date) >= startDate)
      .reduce((sum, t) => sum + t.amount, 0)
    return (expenses / challenge.target) * 100
  }

  if (challenge.type === 'save-amount') {
    const startDate = getChallengeStartDate(challenge)
    const income = store.transactions.value
      .filter(t => t.type === 'income' && new Date(t.date) >= startDate)
      .reduce((sum, t) => sum + t.amount, 0)
    const expenses = store.transactions.value
      .filter(t => t.type === 'expense' && new Date(t.date) >= startDate)
      .reduce((sum, t) => sum + t.amount, 0)
    return ((income - expenses) / challenge.target) * 100
  }
  return 0
}

function getChallengeSpent(challenge) {
  if (!challenge) return 0
  const startDate = getChallengeStartDate(challenge)
  return store.transactions.value
    .filter(t => t.type === 'expense' && new Date(t.date) >= startDate)
    .reduce((sum, t) => sum + t.amount, 0)
}

function getChallengeSaved(challenge) {
  if (!challenge) return 0
  const startDate = getChallengeStartDate(challenge)
  const income = store.transactions.value
    .filter(t => t.type === 'income' && new Date(t.date) >= startDate)
    .reduce((sum, t) => sum + t.amount, 0)
  const expenses = store.transactions.value
    .filter(t => t.type === 'expense' && new Date(t.date) >= startDate)
    .reduce((sum, t) => sum + t.amount, 0)
  return income - expenses
}

function getChallengeTypeInfo(challenge) {
  if (!challenge) return null
  return challengeTypes.find(t => t.id === challenge.type)
}

function getDaysLeft(challenge) {
  if (!challenge) return 0
  const end = new Date(challenge.endDate)
  const now = new Date()
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}

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

function giveUpChallenge(challengeId) {
  store.endChallenge(challengeId, 'failed')
}

const trackingSince = computed(() => {
  const startedAt = store.settings.value.startedAt
  if (!startedAt) return null
  const date = new Date(startedAt)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
})

// Month picker
const overviewDate = ref(new Date())

const overviewMonth = computed(() => {
  return overviewDate.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

function prevOverviewMonth() {
  const newDate = new Date(overviewDate.value)
  newDate.setMonth(newDate.getMonth() - 1)
  overviewDate.value = newDate
}

function nextOverviewMonth() {
  const newDate = new Date(overviewDate.value)
  newDate.setMonth(newDate.getMonth() + 1)
  if (newDate <= new Date()) {
    overviewDate.value = newDate
  }
}

const isCurrentOverviewMonth = computed(() => {
  const now = new Date()
  return overviewDate.value.getMonth() === now.getMonth() &&
         overviewDate.value.getFullYear() === now.getFullYear()
})

const overviewTransactions = computed(() => {
  const year = overviewDate.value.getFullYear()
  const month = overviewDate.value.getMonth()
  const startOfMonth = new Date(year, month, 1)
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59)

  return store.transactions.value.filter(t => {
    const date = new Date(t.date)
    return date >= startOfMonth && date <= endOfMonth
  })
})

const overviewIncome = computed(() => {
  return overviewTransactions.value
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
})

const overviewExpense = computed(() => {
  return overviewTransactions.value
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
})

const recentOverviewTransactions = computed(() => {
  return [...overviewTransactions.value]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5)
})

// Expenses by wallet for the month
const expensesByWallet = computed(() => {
  const walletTotals = {}

  // Initialize all wallets with 0
  store.wallets.value.forEach(w => {
    walletTotals[w.id] = {
      wallet: w,
      expense: 0,
      income: 0,
      transactions: 0
    }
  })

  // Sum up transactions
  overviewTransactions.value.forEach(t => {
    if (walletTotals[t.walletId]) {
      if (t.type === 'expense') {
        walletTotals[t.walletId].expense += t.amount
        walletTotals[t.walletId].transactions++
      } else if (t.type === 'income') {
        walletTotals[t.walletId].income += t.amount
        walletTotals[t.walletId].transactions++
      }
    }
  })

  // Convert to array and filter out wallets with no transactions
  return Object.values(walletTotals)
    .filter(w => w.transactions > 0)
    .sort((a, b) => b.expense - a.expense)
})

// Helpers
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
</script>

<template>
  <div class="tab-content overview-content">
    <!-- Calendar Box -->
    <div class="calendar-box">
      <div class="calendar-header">
        <button class="month-nav" @click="prevOverviewMonth">←</button>
        <div class="month-label">{{ overviewMonth }}</div>
        <button
          class="month-nav"
          :class="{ disabled: isCurrentOverviewMonth }"
          :disabled="isCurrentOverviewMonth"
          @click="nextOverviewMonth"
        >→</button>
      </div>
      <div class="summary-box">
        <div class="summary-item">
          <div class="summary-label">Income</div>
          <div class="summary-amount income">{{ store.formatCurrency(overviewIncome) }}</div>
        </div>
        <div class="summary-divider"></div>
        <div class="summary-item">
          <div class="summary-label">Expenses</div>
          <div class="summary-amount expense">{{ store.formatCurrency(overviewExpense) }}</div>
        </div>
      </div>
    </div>

    <!-- Challenge Section - Shows all active challenges + new challenge card -->
    <div class="section challenge-section">
      <div class="section-header">
        <h3 class="section-title">
          Vio's Challenges
          <HelpTip text="Vio challenges you to reach your financial goals! Complete challenges to become a money master!" />
        </h3>
      </div>

      <div class="challenge-grid">
        <!-- Loop through ALL active challenges -->
        <div
          v-for="challenge in activeChallenges"
          :key="challenge.id"
          class="challenge-card"
          :class="{
            danger: challenge.type === 'limit-spending' && getChallengeProgress(challenge) > 80,
            'over-limit': challenge.type === 'limit-spending' && getChallengeProgress(challenge) >= 100,
            success: challenge.type === 'save-amount' && getChallengeProgress(challenge) >= 100
          }"
        >
          <div class="challenge-vio-badge">
            <img src="/images/vio_right.png" alt="Vio" class="challenge-vio" />
          </div>
          <div class="challenge-header">
            <div class="challenge-info">
              <span class="challenge-icon">{{ getChallengeTypeInfo(challenge)?.icon || '💪' }}</span>
              <div>
                <div class="challenge-label">Vio challenged you to...</div>
                <div class="challenge-title">{{ getChallengeTypeInfo(challenge)?.label }}</div>
                <div class="challenge-subtitle">{{ getDaysLeft(challenge) }} days left</div>
              </div>
            </div>
          </div>

          <div class="challenge-progress">
            <div class="challenge-bar">
              <div
                class="challenge-fill"
                :class="{
                  danger: challenge.type === 'limit-spending' && getChallengeProgress(challenge) > 80,
                  'over-limit': challenge.type === 'limit-spending' && getChallengeProgress(challenge) >= 100,
                  success: challenge.type === 'save-amount' && getChallengeProgress(challenge) >= 100
                }"
                :style="{ width: Math.min(getChallengeProgress(challenge), 100) + '%' }"
              ></div>
            </div>
            <div class="challenge-stats">
              <span v-if="challenge.type === 'limit-spending'">
                {{ store.formatCurrency(getChallengeSpent(challenge)) }} spent
              </span>
              <span v-else>
                {{ store.formatCurrency(Math.max(0, getChallengeSaved(challenge))) }} saved
              </span>
              <span>
                {{ challenge.type === 'limit-spending' ? 'Limit' : 'Goal' }}: {{ store.formatCurrency(challenge.target) }}
              </span>
            </div>
          </div>

          <div v-if="challenge.type === 'limit-spending' && getChallengeProgress(challenge) >= 100" class="challenge-warning over-limit">
            Whoa, you went over! Tell me it's for a good cause...
          </div>
          <div v-else-if="challenge.type === 'limit-spending' && getChallengeProgress(challenge) > 80" class="challenge-warning">
            Careful! You're close to your limit!
          </div>
          <div v-else-if="challenge.type === 'save-amount' && getChallengeProgress(challenge) >= 100" class="challenge-warning success">
            Amazing! You did it! Vio is so proud!
          </div>

          <button class="btn btn-sm btn-ghost challenge-giveup" @click="giveUpChallenge(challenge.id)">Give up</button>
        </div>

        <!-- Empty placeholder when no active challenges -->
        <div v-if="activeChallenges.length === 0" class="challenge-card challenge-card-empty">
          <div class="challenge-empty-content">
            <img src="/images/vio_sit.png" alt="Vio" class="challenge-empty-vio" />
            <div class="challenge-empty-text">No active challenge</div>
            <div class="challenge-empty-hint">Start one now!</div>
          </div>
        </div>

        <!-- New Challenge Card - Always visible -->
        <div class="challenge-card challenge-new" @click="showChallengeModal = true">
          <div class="challenge-new-icon">🎯</div>
          <div class="challenge-new-title">New Challenge?</div>
          <div class="challenge-new-hint">Tap to let Vio challenge you!</div>
        </div>
      </div>
    </div>

    <!-- Quick Wallets -->
    <div class="section wallets-section">
      <div class="section-header">
        <h3 class="section-title">Wallets</h3>
        <button class="btn btn-ghost btn-sm" @click="$emit('switch-tab', 'wallets')">See all</button>
      </div>
      <div class="wallet-grid">
        <div
          v-for="wallet in store.wallets.value.slice(0, 4)"
          :key="wallet.id"
          class="card card-hover wallet-card"
        >
          <div class="wallet-card-icon">{{ wallet.icon }}</div>
          <div class="wallet-card-name">{{ wallet.name }}</div>
          <div class="wallet-card-balance" :class="wallet.balance >= 0 ? 'positive' : 'negative'">
            {{ store.formatCurrency(wallet.balance) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Spending by Wallet -->
    <div v-if="expensesByWallet.length > 0" class="section">
      <div class="section-header">
        <h3 class="section-title">{{ overviewMonth }} by Wallet</h3>
      </div>

      <div class="wallet-breakdown">
        <div
          v-for="item in expensesByWallet"
          :key="item.wallet.id"
          class="wallet-breakdown-item"
        >
          <div class="wallet-breakdown-icon" :style="{ background: item.wallet.color + '20' }">
            {{ item.wallet.icon }}
          </div>
          <div class="wallet-breakdown-info">
            <div class="wallet-breakdown-name">{{ item.wallet.name }}</div>
            <div class="wallet-breakdown-count">{{ item.transactions }} transactions</div>
          </div>
          <div class="wallet-breakdown-amounts">
            <div v-if="item.income > 0" class="wallet-amount income">
              +{{ store.formatCurrency(item.income) }}
            </div>
            <div v-if="item.expense > 0" class="wallet-amount expense">
              -{{ store.formatCurrency(item.expense) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Transactions -->
    <div class="section">
      <div class="section-header">
        <h3 class="section-title">Recent Transactions</h3>
        <button class="btn btn-ghost btn-sm" @click="$emit('switch-tab', 'history')">See all</button>
      </div>

      <div v-if="recentOverviewTransactions.length === 0" class="empty-state">
        <img src="/images/vio_sit.png" alt="" class="empty-state-vio" />
        <div class="empty-state-title">No transactions</div>
        <div class="empty-state-text">No transactions in {{ overviewMonth }}</div>
      </div>

      <div v-else class="list">
        <div
          v-for="transaction in recentOverviewTransactions"
          :key="transaction.id"
          class="list-item list-item-clickable"
          @click="$emit('edit-transaction', transaction)"
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

    <!-- Challenge Modal -->
    <div v-if="showChallengeModal" class="modal-overlay" @click.self="showChallengeModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">Vio Challenges You!</h3>
          <button class="modal-close" @click="showChallengeModal = false">x</button>
        </div>

        <div class="modal-vio-header">
          <img src="/images/vio_right.png" alt="Vio" class="modal-vio" />
          <div class="modal-vio-speech">Pick a challenge and prove yourself!</div>
        </div>

        <div class="input-group">
          <label class="input-label">Challenge Type</label>
          <div class="type-grid">
            <button
              v-for="type in challengeTypes"
              :key="type.id"
              class="type-btn"
              :class="{ active: newChallenge.type === type.id }"
              @click="newChallenge.type = type.id"
            >
              <span class="type-icon">{{ type.icon }}</span>
              <span class="type-label">{{ type.label }}</span>
            </button>
          </div>
        </div>

        <div class="input-group">
          <label class="input-label">
            {{ newChallenge.type === 'limit-spending' ? 'Spending Limit' : 'Savings Goal' }}
          </label>
          <input
            v-model="newChallenge.target"
            type="number"
            class="input"
            :placeholder="newChallenge.type === 'limit-spending' ? 'e.g., 500000' : 'e.g., 1000000'"
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
          Accept Challenge!
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Overview Layout */
.overview-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

/* Wallets Section */
.wallets-section {
  margin-bottom: 0;
}

.wallet-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-sm);
}

.wallet-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-md);
  text-align: center;
  background: white;
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-lg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.wallet-card-icon {
  font-size: 1.75rem;
  margin-bottom: var(--space-xs);
}

.wallet-card-name {
  font-weight: 600;
  font-size: 0.8125rem;
  color: var(--text-secondary);
  margin-bottom: var(--space-xs);
}

.wallet-card-balance {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1rem;
}

.wallet-card-balance.positive {
  color: var(--income-color);
}

.wallet-card-balance.negative {
  color: var(--expense-color);
}

/* Desktop: 4 columns for wallets */
@media (min-width: 768px) {
  .wallet-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* Calendar Box */
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

.summary-amount.income { color: var(--income-color); }
.summary-amount.expense { color: var(--expense-color); }

.summary-divider {
  width: 2px;
  height: 30px;
  background: #FFD700;
  margin: 0 var(--space-sm);
}

/* Wallet Breakdown */
.wallet-breakdown {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.wallet-breakdown-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  background: var(--white);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.wallet-breakdown-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.wallet-breakdown-info {
  flex: 1;
  min-width: 0;
}

.wallet-breakdown-name {
  font-weight: 600;
  font-size: 0.9rem;
}

.wallet-breakdown-count {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.wallet-breakdown-amounts {
  text-align: right;
  flex-shrink: 0;
}

.wallet-amount {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.875rem;
}

.wallet-amount.income {
  color: var(--income-color);
}

.wallet-amount.expense {
  color: var(--expense-color);
}

/* Challenge Section */
.challenge-section {
  margin-bottom: 0;
}

.challenge-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-md);
}

@media (min-width: 640px) {
  .challenge-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.challenge-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  border: 2px solid var(--lavender-200);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  position: relative;
  overflow: hidden;
}

.challenge-card.danger {
  border-color: var(--expense-color);
  background: rgba(244, 63, 94, 0.05);
}

.challenge-card.success {
  border-color: var(--income-color);
  background: rgba(16, 185, 129, 0.05);
}

.challenge-card.over-limit {
  border-color: #DC2626;
  background: rgba(220, 38, 38, 0.05);
}

.challenge-vio-badge {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 60px;
  height: 60px;
}

.challenge-vio {
  width: 100%;
  height: auto;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.challenge-header {
  margin-bottom: var(--space-md);
}

.challenge-info {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
}

.challenge-icon {
  font-size: 1.75rem;
  flex-shrink: 0;
}

.challenge-label {
  font-size: 0.6875rem;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.challenge-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.125rem;
  color: var(--text-primary);
}

.challenge-subtitle {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 2px;
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

.challenge-fill.danger { background: var(--expense-color); }
.challenge-fill.over-limit { background: #DC2626; }
.challenge-fill.success { background: var(--income-color); }

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
  font-size: 0.8125rem;
  color: var(--expense-color);
  text-align: center;
  font-weight: 600;
}

.challenge-warning.over-limit {
  background: rgba(220, 38, 38, 0.15);
  color: #DC2626;
}

.challenge-warning.success {
  background: rgba(16, 185, 129, 0.15);
  color: var(--income-color);
}

.challenge-giveup {
  margin-top: var(--space-sm);
  width: 100%;
}

/* Empty challenge card */
.challenge-card-empty {
  border-style: dashed;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
}

.challenge-empty-content {
  text-align: center;
}

.challenge-empty-vio {
  width: 60px;
  height: auto;
  margin-bottom: var(--space-sm);
  opacity: 0.7;
}

.challenge-empty-text {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1rem;
  color: var(--text-primary);
  margin-bottom: var(--space-xs);
}

.challenge-empty-hint {
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

/* New Challenge Card */
.challenge-new {
  border: 2px dashed var(--lavender-400);
  background: linear-gradient(135deg, var(--lavender-50) 0%, rgba(139, 92, 246, 0.1) 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  cursor: pointer;
  min-height: 180px;
  transition: all var(--transition-fast);
}

.challenge-new:hover {
  border-color: var(--lavender-500);
  background: linear-gradient(135deg, var(--lavender-100) 0%, rgba(139, 92, 246, 0.2) 100%);
  transform: translateY(-2px);
}

.challenge-new-icon {
  font-size: 2.5rem;
  margin-bottom: var(--space-sm);
}

.challenge-new-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.125rem;
  color: var(--lavender-700);
  margin-bottom: var(--space-xs);
}

.challenge-new-hint {
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

/* Modal Vio Header */
.modal-vio-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
  padding: var(--space-md);
  background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
  border-radius: var(--radius-lg);
}

.modal-vio {
  width: 60px;
  height: auto;
  flex-shrink: 0;
}

.modal-vio-speech {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #92400E;
}

/* Type Grid */
.type-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-sm);
}

.type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-md);
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-md);
  background: var(--bg-card);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.type-btn:hover {
  border-color: var(--lavender-300);
}

.type-btn.active {
  border-color: var(--lavender-500);
  background: var(--lavender-50);
}

.type-icon {
  font-size: 1.5rem;
}

.type-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary);
}

/* Period Grid */
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

.period-btn:hover { border-color: var(--lavender-300); }

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

.list-item-clickable:hover { background: var(--gray-100); }
.list-item-clickable:active { background: var(--gray-200); }

/* Vio sitting in empty state */
.empty-state-vio {
  width: 120px;
  height: auto;
  margin-bottom: var(--space-md);
  opacity: 0.9;
}
</style>

<style>
/* Dark mode overrides */
[data-theme="dark"] .calendar-box {
  background: linear-gradient(135deg, #2D2640 0%, #1A1625 100%) !important;
}

[data-theme="dark"] .calendar-header {
  background: linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%) !important;
  background-image: none !important;
  border-radius: var(--radius-md);
}

[data-theme="dark"] .month-label {
  color: #FFFFFF !important;
}

[data-theme="dark"] .month-nav {
  background: rgba(255, 255, 255, 0.2) !important;
  color: #FFFFFF !important;
}

[data-theme="dark"] .month-nav:hover:not(.disabled) {
  background: rgba(255, 255, 255, 0.3) !important;
}

[data-theme="dark"] .challenge-new {
  background: linear-gradient(135deg, #2D2640 0%, rgba(139, 92, 246, 0.15) 100%) !important;
  border-color: #6D28D9 !important;
}

[data-theme="dark"] .challenge-new:hover {
  background: linear-gradient(135deg, #3D3456 0%, rgba(139, 92, 246, 0.25) 100%) !important;
}

[data-theme="dark"] .challenge-new-title {
  color: #C4B5FD !important;
}

[data-theme="dark"] .modal-vio-header {
  background: linear-gradient(135deg, #3D2E5C 0%, #4C3D6E 100%) !important;
}

[data-theme="dark"] .modal-vio-speech {
  color: #FDE68A !important;
}

[data-theme="dark"] .type-btn.active {
  background: #2D2640 !important;
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .period-btn {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
  color: #9D8BC2 !important;
}

[data-theme="dark"] .period-btn:hover {
  border-color: #6D28D9 !important;
}

[data-theme="dark"] .period-btn.active {
  background: #8B5CF6 !important;
  border-color: #8B5CF6 !important;
  color: white !important;
}

[data-theme="dark"] .challenge-card {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .challenge-card.danger,
[data-theme="dark"] .challenge-card.over-limit {
  background: rgba(220, 38, 38, 0.1) !important;
  border-color: #DC2626 !important;
}

[data-theme="dark"] .challenge-card.success {
  background: rgba(16, 185, 129, 0.1) !important;
  border-color: #10B981 !important;
}

[data-theme="dark"] .challenge-card-empty {
  background: transparent !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .wallet-card {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .wallet-breakdown-item {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .wallet-breakdown-name {
  color: #E9D5FF !important;
}

[data-theme="dark"] .wallet-breakdown-count {
  color: #9D8BC2 !important;
}
</style>
