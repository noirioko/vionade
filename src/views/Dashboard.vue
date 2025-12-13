<script setup>
import { ref, computed } from 'vue'
import { useFinanceStore } from '../stores/finance'

const store = useFinanceStore()

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
          class="list-item"
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
</style>
