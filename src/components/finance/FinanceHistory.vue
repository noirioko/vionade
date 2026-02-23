<script setup>
import { ref, computed } from 'vue'
import { useFinanceStore } from '../../stores'
import HelpTip from '../HelpTip.vue'
import PieChart from '../PieChart.vue'

const store = useFinanceStore()

const emit = defineEmits(['edit-transaction'])

const filter = ref('all')
const walletFilter = ref('all') // 'all' or a wallet ID
const saveTodayAmount = ref('')
const savingsType = ref('monthly')
const showSaveSuccess = ref(false)

// Category filter
const categoryFilter = ref('all') // 'all' or a category ID

// Search
const searchQuery = ref('')

function saveToday() {
  const amount = parseFloat(saveTodayAmount.value)
  if (!amount || amount <= 0) return

  store.addSavings(amount, savingsType.value, 'Quick save')
  saveTodayAmount.value = ''

  showSaveSuccess.value = true
  setTimeout(() => {
    showSaveSuccess.value = false
  }, 2000)
}

// Calendar state
const currentMonth = ref(new Date())
const selectedDate = ref(null)

const calendarDays = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPadding = firstDay.getDay()
  const days = []

  for (let i = 0; i < startPadding; i++) {
    days.push({ day: null, date: null })
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d)
    days.push({ day: d, date })
  }

  return days
})

const daysWithTransactions = computed(() => {
  const days = new Set()
  store.transactions.value.forEach(t => {
    const date = new Date(t.date)
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    days.add(key)
  })
  return days
})

function hasDot(date) {
  if (!date) return false
  const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
  return daysWithTransactions.value.has(key)
}

function isSelected(date) {
  if (!date || !selectedDate.value) return false
  return date.toDateString() === selectedDate.value.toDateString()
}

function isToday(date) {
  if (!date) return false
  return date.toDateString() === new Date().toDateString()
}

function selectDate(date) {
  if (!date) return
  selectedDate.value = date
}

function prevMonth() {
  const d = new Date(currentMonth.value)
  d.setMonth(d.getMonth() - 1)
  currentMonth.value = d
}

function nextMonth() {
  const d = new Date(currentMonth.value)
  d.setMonth(d.getMonth() + 1)
  currentMonth.value = d
}

const monthYearLabel = computed(() => {
  return currentMonth.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

// Monthly transactions for history
const monthTransactions = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()
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

const monthSavings = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()
  return store.monthlySavingsForMonth(year, month)
})

// Mood calculations
const incomeMood = computed(() => {
  const target = store.settings.value.targets?.monthlyIncome || 0
  if (target === 0) return 'neutral'
  return monthIncome.value >= target ? 'happy' : 'sad'
})

const expenseMood = computed(() => {
  const target = store.settings.value.targets?.monthlyExpense || 0
  if (target === 0) return 'neutral'
  return monthExpense.value <= target ? 'happy' : 'sad'
})

const savingsMood = computed(() => {
  const target = store.settings.value.targets?.monthlySavings || 0
  if (target === 0) return 'neutral'
  return monthSavings.value >= target ? 'happy' : 'sad'
})

// Pie chart data
// Vio messages based on mood
const vioMessages = {
  income: {
    happy: "Yay! You're doing great! Keep it up! 💜",
    sad: "Let's find more ways to earn! You got this!",
    neutral: "Set an income target in Settings!"
  },
  expense: {
    happy: "Good job keeping spending in check! 🌟",
    sad: "Uh oh, I thought you wanted to buy a house? 😢",
    neutral: "Set a spending target in Settings!"
  },
  savings: {
    happy: "Amazing! Your house fund is growing! 🏠✨",
    sad: "Every little bit counts! Let's save more~",
    neutral: "Set a savings target in Settings!"
  }
}

function getVioMessage(type, mood) {
  return vioMessages[type]?.[mood] || ''
}

const expensesByCategory = computed(() => {
  const expenses = monthTransactions.value.filter(t => t.type === 'expense')
  const categoryTotals = {}

  expenses.forEach(t => {
    const catId = t.category || 'other'
    if (!categoryTotals[catId]) {
      categoryTotals[catId] = 0
    }
    categoryTotals[catId] += t.amount
  })

  return store.EXPENSE_CATEGORIES
    .map(cat => ({
      id: cat.id,
      name: cat.name,
      value: categoryTotals[cat.id] || 0,
      color: cat.color,
      icon: cat.icon,
    }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value)
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

  // Sum up transactions for this month
  monthTransactions.value.forEach(t => {
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

function handleCategoryClick(segment) {
  // Find the category ID from the name
  const cat = store.EXPENSE_CATEGORIES.find(c => c.name === segment.name)
  if (cat) {
    categoryFilter.value = cat.id
    filter.value = 'expense' // Switch to expense filter since categories are for expenses
  }
}

const filteredTransactions = computed(() => {
  let transactions = [...store.transactions.value]
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  if (filter.value !== 'all') {
    transactions = transactions.filter(t => t.type === filter.value)
  }

  if (walletFilter.value !== 'all') {
    transactions = transactions.filter(t =>
      t.walletId === walletFilter.value || t.toWalletId === walletFilter.value
    )
  }

  if (categoryFilter.value !== 'all') {
    transactions = transactions.filter(t =>
      t.type === 'expense' && (t.category || 'other') === categoryFilter.value
    )
  }

  if (selectedDate.value) {
    transactions = transactions.filter(t => {
      const tDate = new Date(t.date)
      return tDate.toDateString() === selectedDate.value.toDateString()
    })
  }

  // Search filter - searches note, category name, wallet name
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    transactions = transactions.filter(t => {
      const note = (t.note || '').toLowerCase()
      const cat = store.getCategoryById(t.category, t.type === 'income' ? 'income' : 'expense')
      const catName = (cat?.name || '').toLowerCase()
      const wallet = store.getWalletById(t.walletId)
      const walletName = (wallet?.name || '').toLowerCase()
      const toWallet = t.toWalletId ? store.getWalletById(t.toWalletId) : null
      const toWalletName = (toWallet?.name || '').toLowerCase()
      const amount = t.amount.toString()

      return note.includes(query) ||
             catName.includes(query) ||
             walletName.includes(query) ||
             toWalletName.includes(query) ||
             amount.includes(query)
    })
  }

  return transactions
})

const groupedTransactions = computed(() => {
  const groups = {}
  filteredTransactions.value.forEach(t => {
    const dateKey = new Date(t.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    if (!groups[dateKey]) {
      groups[dateKey] = []
    }
    groups[dateKey].push(t)
  })
  return groups
})

// Helpers
function formatDateHeader(date) {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  } else {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
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
  <div class="tab-content history-content">
    <!-- Desktop Grid Layout -->
    <div class="history-grid">

      <!-- Section 1: Calendar + Monthly Recap side by side -->
      <div class="top-section">
        <!-- Compact Calendar -->
        <div class="calendar-book">
          <div class="calendar-nav">
            <button class="cal-nav-btn" @click="prevMonth">←</button>
            <div class="cal-month">{{ monthYearLabel }}</div>
            <button class="cal-nav-btn" @click="nextMonth">→</button>
          </div>
          <div class="calendar-weekdays">
            <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
          </div>
          <div class="calendar-grid">
            <div
              v-for="(item, idx) in calendarDays"
              :key="idx"
              class="cal-day"
              :class="{
                empty: !item.day,
                today: isToday(item.date),
                selected: isSelected(item.date),
                'has-dot': hasDot(item.date)
              }"
              @click="selectDate(item.date)"
            >
              <span v-if="item.day">{{ item.day }}</span>
              <span v-if="hasDot(item.date)" class="cal-dot"></span>
            </div>
          </div>
          <button v-if="selectedDate" class="btn btn-ghost btn-sm clear-date" @click="selectedDate = null">
            Clear selection
          </button>
        </div>

        <!-- Monthly Recap (moved here) -->
        <div class="recap-compact">
          <div class="recap-title">
            Monthly Recap
            <HelpTip text="Compare your actual income, expenses & savings against your targets! Set targets in Settings." />
          </div>

          <div class="recap-rows">
            <div class="recap-mini-row">
              <span class="recap-mini-icon">💰</span>
              <span class="recap-mini-label">Income</span>
              <span class="recap-mini-amount income">{{ store.formatCurrency(monthIncome) }}</span>
              <div class="vio-wrapper">
                <img v-if="incomeMood === 'happy'" src="/images/vio_happy.png" class="recap-mini-vio" alt="" />
                <img v-else-if="incomeMood === 'sad'" src="/images/vio_fall.png" class="recap-mini-vio" alt="" />
                <img v-else src="/images/vio_sit.png" class="recap-mini-vio" alt="" />
                <div class="vio-speech">{{ getVioMessage('income', incomeMood) }}</div>
              </div>
            </div>
            <div class="recap-mini-row">
              <span class="recap-mini-icon">💸</span>
              <span class="recap-mini-label">Expense</span>
              <span class="recap-mini-amount expense">{{ store.formatCurrency(monthExpense) }}</span>
              <div class="vio-wrapper">
                <img v-if="expenseMood === 'happy'" src="/images/vio_happy.png" class="recap-mini-vio" alt="" />
                <img v-else-if="expenseMood === 'sad'" src="/images/vio_fall.png" class="recap-mini-vio" alt="" />
                <img v-else src="/images/vio_sit.png" class="recap-mini-vio" alt="" />
                <div class="vio-speech">{{ getVioMessage('expense', expenseMood) }}</div>
              </div>
            </div>
            <div class="recap-mini-row savings-row">
              <span class="recap-mini-icon">🐷</span>
              <span class="recap-mini-label">Savings</span>
              <span class="recap-mini-amount savings">{{ store.formatCurrency(monthSavings) }}</span>
              <div class="vio-wrapper">
                <img v-if="savingsMood === 'happy'" src="/images/vio_happy.png" class="recap-mini-vio" alt="" />
                <img v-else-if="savingsMood === 'sad'" src="/images/vio_fall.png" class="recap-mini-vio" alt="" />
                <img v-else src="/images/vio_sit.png" class="recap-mini-vio" alt="" />
                <div class="vio-speech">{{ getVioMessage('savings', savingsMood) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Section 2: Transaction Log (FULL WIDTH) -->
      <div class="transactions-panel">
        <div class="transactions-header">
          <h3 class="section-title">{{ selectedDate ? formatDateHeader(selectedDate) : 'All Transactions' }}</h3>
          <span class="transaction-count">{{ filteredTransactions.length }} total</span>
        </div>

        <!-- Search Bar -->
        <div class="search-row">
          <div class="search-input-wrapper">
            <span class="search-icon">🔍</span>
            <input
              v-model="searchQuery"
              type="text"
              class="search-input"
              placeholder="Search transactions..."
            />
            <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">&times;</button>
          </div>
        </div>

        <!-- Filter Row: Type + Wallet + Category -->
        <div class="filter-row">
          <div class="tabs">
            <button class="tab" :class="{ active: filter === 'all' }" @click="filter = 'all'; categoryFilter = 'all'">All</button>
            <button class="tab" :class="{ active: filter === 'income' }" @click="filter = 'income'; categoryFilter = 'all'">In</button>
            <button class="tab" :class="{ active: filter === 'expense' }" @click="filter = 'expense'">Out</button>
            <button class="tab" :class="{ active: filter === 'transfer' }" @click="filter = 'transfer'; categoryFilter = 'all'">Move</button>
          </div>

          <div class="filter-dropdowns">
            <select v-model="walletFilter" class="filter-select">
              <option value="all">All Wallets</option>
              <option v-for="wallet in store.wallets.value" :key="wallet.id" :value="wallet.id">
                {{ wallet.icon }} {{ wallet.name }}
              </option>
            </select>

            <select v-model="categoryFilter" class="filter-select" :disabled="filter !== 'expense' && filter !== 'all'">
              <option value="all">All Categories</option>
              <option v-for="cat in store.EXPENSE_CATEGORIES" :key="cat.id" :value="cat.id">
                {{ cat.icon }} {{ cat.name }}
              </option>
            </select>
          </div>
        </div>

          <!-- Transaction List -->
          <div v-if="filteredTransactions.length === 0" class="empty-state">
            <img src="/images/vio_sit.png" alt="" class="empty-state-vio" />
            <div class="empty-state-title">No transactions</div>
            <div class="empty-state-text">
              {{ selectedDate ? 'Nothing on this day' : (filter === 'all' ? "Add your first transaction!" : `No ${filter} transactions yet.`) }}
            </div>
          </div>

          <!-- Grouped by date when no date selected -->
          <div v-else-if="!selectedDate" class="transaction-list grouped">
            <template v-for="(transactions, dateKey) in groupedTransactions" :key="dateKey">
              <div class="date-header">{{ dateKey }}</div>
              <div
                v-for="transaction in transactions"
                :key="transaction.id"
                class="tx-item"
                @click="$emit('edit-transaction', transaction)"
              >
                <div class="tx-icon" :class="transaction.type">
                  {{ getTransactionIcon(transaction) }}
                </div>
                <div class="tx-info">
                  <div class="tx-title">{{ getTransactionTitle(transaction) }}</div>
                  <div class="tx-meta">{{ store.getWalletById(transaction.walletId)?.name }}</div>
                </div>
                <div class="tx-amount" :class="transaction.type">
                  {{ transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : '' }}{{ store.formatCurrency(transaction.amount) }}
                </div>
              </div>
            </template>
          </div>

          <!-- Flat list when date is selected -->
          <div v-else class="transaction-list">
            <div
              v-for="transaction in filteredTransactions"
              :key="transaction.id"
              class="tx-item"
              @click="$emit('edit-transaction', transaction)"
            >
              <div class="tx-icon" :class="transaction.type">
                {{ getTransactionIcon(transaction) }}
              </div>
              <div class="tx-info">
                <div class="tx-title">{{ getTransactionTitle(transaction) }}</div>
                <div class="tx-meta">{{ store.getWalletById(transaction.walletId)?.name }}</div>
              </div>
              <div class="tx-amount" :class="transaction.type">
                {{ transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : '' }}{{ store.formatCurrency(transaction.amount) }}
              </div>
            </div>
          </div>
        </div>

      <!-- Section 3: Save Today + House Fund + Spending -->
      <div class="bottom-section">
        <!-- Save Today -->
        <div class="save-today-card">
          <div class="save-today-header">
            <span class="save-today-icon">🐷</span>
            <span class="save-today-title">
              Save today?
              <HelpTip text="Quick-save money! 'This month' adds to your monthly savings goal. 'House fund' goes to your lifetime goal (locked - can't take it out!)." />
            </span>
          </div>
          <div class="save-today-form">
            <input
              v-model="saveTodayAmount"
              type="number"
              class="input save-today-input"
              placeholder="Amount to save"
              inputmode="numeric"
              @keyup.enter="saveToday"
            />
            <div class="save-today-type">
              <button class="type-btn" :class="{ active: savingsType === 'monthly' }" @click="savingsType = 'monthly'">
                This month
              </button>
              <button class="type-btn" :class="{ active: savingsType === 'lifetime' }" @click="savingsType = 'lifetime'">
                House fund
              </button>
            </div>
            <button class="btn btn-primary save-today-btn" :disabled="!saveTodayAmount" @click="saveToday">
              Save!
            </button>
          </div>
        </div>

        <!-- House Fund -->
        <div class="lifetime-goal-card">
          <div class="goal-header">
            <div class="goal-info">
              <span class="goal-icon">🏠</span>
              <div>
                <div class="goal-name">
                  {{ store.settings.value.lifetimeGoal?.name || 'House Fund' }}
                  <HelpTip text="Your big dream savings! This money is LOCKED - you promised yourself not to touch it until you reach your goal." />
                </div>
                <div class="goal-subtitle">Locked savings</div>
              </div>
            </div>
            <div class="goal-amount">
              {{ store.formatCurrency(store.lifetimeSavingsTotal.value) }}
            </div>
          </div>
          <div v-if="store.settings.value.lifetimeGoal?.target > 0" class="goal-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: Math.min(100, (store.lifetimeSavingsTotal.value / store.settings.value.lifetimeGoal.target) * 100) + '%' }"></div>
            </div>
            <div class="progress-labels">
              <span class="progress-current">{{ Math.round((store.lifetimeSavingsTotal.value / store.settings.value.lifetimeGoal.target) * 100) }}%</span>
              <span class="progress-target">Goal: {{ store.formatCurrency(store.settings.value.lifetimeGoal.target) }}</span>
            </div>
          </div>
        </div>

        <!-- Spending Breakdown -->
        <div class="spending-card">
          <h3 class="section-title">Spending Breakdown</h3>
          <p class="spending-hint">Tap a category to filter transactions</p>
          <PieChart :data="expensesByCategory" :size="160" :clickable="true" @category-click="handleCategoryClick" />
        </div>
      </div>

      <!-- Wallet Breakdown for the month -->
      <div v-if="expensesByWallet.length > 0" class="wallet-breakdown-section">
        <h3 class="section-title">{{ monthYearLabel }} by Wallet</h3>
        <div class="wallet-breakdown">
          <div
            v-for="item in expensesByWallet"
            :key="item.wallet.id"
            class="wallet-breakdown-item"
            :class="{ active: walletFilter === item.wallet.id }"
            @click="walletFilter = walletFilter === item.wallet.id ? 'all' : item.wallet.id"
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

      <!-- Save Success Toast -->
      <div v-if="showSaveSuccess" class="save-toast">
        Saved!
      </div>
    </div>
  </div>
</template>

<style scoped>
.history-content {
  max-width: 100%;
}

.history-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

/* Section 1: Calendar + Monthly Recap */
.top-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

/* Compact Monthly Recap (beside calendar) */
.recap-compact {
  background: var(--white);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  border: 2px solid var(--lavender-200);
}

.recap-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.875rem;
  color: var(--lavender-600);
  margin-bottom: var(--space-sm);
}

.recap-rows {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.recap-mini-row {
  display: flex;
  align-items: center;
  padding: var(--space-sm) var(--space-md);
  background: var(--gray-50);
  border-radius: var(--radius-md);
  min-height: 48px;
  position: relative;
}

.recap-mini-row.savings-row {
  background: rgba(255, 225, 53, 0.15);
}

.recap-mini-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
  margin-right: var(--space-sm);
}

.recap-mini-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--gray-600);
}

.recap-mini-amount {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.9375rem;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.recap-mini-amount.income { color: var(--income-color); }
.recap-mini-amount.expense { color: var(--expense-color); }
.recap-mini-amount.savings { color: #F59E0B; }

.vio-wrapper {
  position: relative;
  margin-left: auto;
  cursor: pointer;
}

.recap-mini-vio {
  width: 36px;
  height: auto;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.vio-wrapper:hover .recap-mini-vio {
  transform: scale(1.15);
}

.vio-speech {
  position: absolute;
  bottom: calc(100% + 8px);
  right: -10px;
  background: var(--white);
  border: 2px solid var(--lavender-300);
  border-radius: var(--radius-lg);
  padding: var(--space-sm) var(--space-md);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--gray-700);
  line-height: 1.4;
  opacity: 0;
  visibility: hidden;
  transform: translateY(5px);
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10;
  width: max-content;
  max-width: 220px;
  text-align: center;
}

.vio-speech::after {
  content: '';
  position: absolute;
  top: 100%;
  right: 12px;
  border: 6px solid transparent;
  border-top-color: var(--lavender-300);
}

.vio-speech::before {
  content: '';
  position: absolute;
  top: 100%;
  right: 13px;
  border: 5px solid transparent;
  border-top-color: var(--white);
  z-index: 1;
}

.vio-wrapper:hover .vio-speech {
  opacity: 1;
  visibility: visible;
  transform: translateY(-4px);
}

/* Filter Row */
/* Search Bar */
.search-row {
  margin-bottom: var(--space-sm);
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  font-size: 0.875rem;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  padding-left: 36px;
  padding-right: 36px;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-full);
  background: var(--white);
  font-size: 0.875rem;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: var(--lavender-500);
}

.search-input::placeholder {
  color: var(--gray-400);
}

.search-clear {
  position: absolute;
  right: 8px;
  width: 24px;
  height: 24px;
  border: none;
  background: var(--gray-200);
  border-radius: var(--radius-full);
  font-size: 1rem;
  cursor: pointer;
  color: var(--gray-500);
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.search-clear:hover {
  background: var(--gray-300);
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  align-items: center;
  margin-bottom: var(--space-md);
}

.filter-dropdowns {
  display: flex;
  gap: var(--space-xs);
  flex-wrap: wrap;
}

.filter-select {
  padding: var(--space-xs) var(--space-sm);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--white);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  min-width: 110px;
}

.filter-select:focus {
  outline: none;
  border-color: var(--lavender-500);
}

.filter-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Calendar - Compact */
.calendar-book {
  background: var(--white);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  border: 2px solid var(--lavender-200);
}

.calendar-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-sm);
}

.cal-nav-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: var(--lavender-100);
  border-radius: var(--radius-full);
  color: var(--lavender-600);
  cursor: pointer;
  font-size: 0.875rem;
}

.cal-month {
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--lavender-600);
  font-size: 0.9rem;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-size: 0.625rem;
  color: var(--gray-400);
  margin-bottom: var(--space-xs);
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.cal-day {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  position: relative;
  color: var(--gray-600);
}

.cal-day.empty { cursor: default; }
.cal-day.today { background: var(--lavender-100); font-weight: 700; }
.cal-day.selected { background: var(--lavender-500); color: white; }

.cal-day.has-dot .cal-dot {
  width: 4px;
  height: 4px;
  background: var(--sunshine-500);
  border-radius: 50%;
  position: absolute;
  bottom: 2px;
}

.cal-day.selected .cal-dot { background: white; }

.clear-date {
  width: 100%;
  margin-top: var(--space-sm);
  font-size: 0.75rem;
}

/* Transactions Panel */
.transactions-panel {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  border: 2px solid var(--border-color);
}

.transactions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-sm);
}

.transaction-count {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Transaction List */
.transaction-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.date-header {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--lavender-600);
  padding: var(--space-sm) 0 var(--space-xs);
  border-bottom: 1px solid var(--lavender-100);
  margin-top: var(--space-sm);
}

.date-header:first-child { margin-top: 0; }

.tx-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm);
  background: var(--white);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.15s;
}

.tx-item:hover { background: var(--lavender-50); }

.tx-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.tx-icon.income { background: rgba(16, 185, 129, 0.15); }
.tx-icon.expense { background: rgba(244, 63, 94, 0.15); }
.tx-icon.transfer { background: rgba(139, 92, 246, 0.15); }

.tx-info {
  flex: 1;
  min-width: 0;
}

.tx-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--gray-700);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tx-meta {
  font-size: 0.6875rem;
  color: var(--gray-400);
}

.tx-amount {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.8125rem;
  flex-shrink: 0;
}

.tx-amount.income { color: var(--income-color); }
.tx-amount.expense { color: var(--expense-color); }
.tx-amount.transfer { color: var(--gray-500); }

/* Monthly Recap */
.cashflow-recap { margin-bottom: 0; }

.recap-table {
  background: var(--white);
  border-radius: var(--radius-lg);
  border: 2px solid var(--lavender-200);
  overflow: hidden;
}

.recap-header {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr 0.6fr;
  background: var(--lavender-100);
  border-bottom: 2px solid var(--lavender-200);
}

.recap-header .recap-cell {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.6875rem;
  color: var(--lavender-600);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.recap-row {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr 0.6fr;
  border-bottom: 1px solid var(--lavender-100);
}

.recap-row:last-child { border-bottom: none; }

.recap-row-savings {
  background: linear-gradient(135deg, rgba(255, 225, 53, 0.1) 0%, rgba(255, 225, 53, 0.05) 100%);
}

.recap-cell {
  padding: var(--space-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
}

.recap-label-cell {
  justify-content: flex-start;
  gap: var(--space-xs);
  font-weight: 600;
  color: var(--gray-700);
}

.recap-icon { font-size: 1rem; }

.recap-amount {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.8125rem;
}

.recap-amount.income { color: var(--income-color); }
.recap-amount.expense { color: var(--expense-color); }
.recap-amount.savings { color: #F59E0B; }

.recap-target {
  color: var(--gray-400);
  font-size: 0.6875rem;
}

.recap-mood { padding: var(--space-xs); }
.recap-vio { width: 32px; height: auto; }

/* Bottom Section: 3 cards */
.bottom-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

/* Save Today Card */
.save-today-card {
  background: linear-gradient(135deg, #FFE135 0%, #FFF176 100%);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  border: 2px solid #F9D423;
}

.save-today-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}

.save-today-icon { font-size: 1.5rem; }

.save-today-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1rem;
  color: var(--gray-800);
}

.save-today-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.save-today-input {
  background: var(--white);
  font-size: 1rem;
  font-weight: 600;
  text-align: center;
}

.save-today-type {
  display: flex;
  gap: var(--space-xs);
}

.type-btn {
  flex: 1;
  padding: var(--space-sm);
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-md);
  background: var(--white);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--gray-600);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.type-btn.active {
  border-color: var(--lavender-500);
  background: var(--lavender-50);
  color: var(--lavender-700);
}

.save-today-btn {
  font-size: 0.875rem;
  font-weight: 700;
}

/* House Fund Card */
.lifetime-goal-card {
  background: var(--white);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  border: 2px solid var(--lavender-200);
}

.goal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.goal-info {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.goal-icon { font-size: 1.5rem; }

.goal-name {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--gray-800);
}

.goal-subtitle {
  font-size: 0.6875rem;
  color: var(--gray-400);
}

.goal-amount {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1rem;
  color: #F59E0B;
}

.goal-progress { margin-top: var(--space-sm); }

.progress-bar {
  height: 10px;
  background: var(--lavender-100);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-bottom: var(--space-xs);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #F59E0B, #FBBF24);
  border-radius: var(--radius-full);
  transition: width 0.5s ease;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.6875rem;
}

.progress-current { font-weight: 700; color: #F59E0B; }
.progress-target { color: var(--gray-400); }

/* Spending Card */
.spending-card {
  background: var(--white);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  border: 2px solid var(--lavender-200);
  text-align: center;
}

.spending-card .section-title {
  margin-bottom: var(--space-xs);
}

.spending-hint {
  font-size: 0.6875rem;
  color: var(--gray-400);
  margin-bottom: var(--space-sm);
}

/* Toast */
.save-toast {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--income-color);
  color: white;
  padding: var(--space-sm) var(--space-lg);
  border-radius: var(--radius-full);
  font-weight: 600;
  box-shadow: var(--shadow-lg);
  z-index: 100;
  animation: toast-pop 0.3s ease;
}

@keyframes toast-pop {
  0% { transform: translateX(-50%) translateY(20px); opacity: 0; }
  100% { transform: translateX(-50%) translateY(0); opacity: 1; }
}

/* Empty state */
.empty-state-vio {
  width: 120px;
  height: auto;
  margin-bottom: var(--space-md);
  opacity: 0.9;
}

/* Wallet Breakdown */
.wallet-breakdown-section {
  margin-top: var(--space-md);
}

.wallet-breakdown {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}

.wallet-breakdown-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  background: var(--white);
  border-radius: var(--radius-md);
  border: 2px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s;
}

.wallet-breakdown-item:hover {
  border-color: var(--lavender-300);
}

.wallet-breakdown-item.active {
  border-color: var(--lavender-500);
  background: var(--lavender-50);
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

/* Desktop Layout for History tab */
@media (min-width: 768px) {
  .top-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-md);
    align-items: start;
  }

  .transactions-panel {
    max-height: 500px;
    overflow-y: auto;
  }

  .bottom-section {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: var(--space-md);
  }

}

@media (min-width: 1024px) {
  .transactions-panel {
    max-height: 550px;
  }
}
</style>

<style>
/* Dark mode overrides */
[data-theme="dark"] .calendar-book {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .cal-day.has-dot .cal-dot {
  background: #8B5CF6 !important;
}

[data-theme="dark"] .transactions-panel {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .tx-item {
  background: #2D2640 !important;
}

[data-theme="dark"] .tx-item:hover {
  background: #3D3456 !important;
}

[data-theme="dark"] .date-header {
  color: #A78BFA !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .recap-compact {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .recap-title {
  color: #A78BFA !important;
}

[data-theme="dark"] .recap-mini-row {
  background: #2D2640 !important;
}

[data-theme="dark"] .recap-mini-row.savings-row {
  background: rgba(139, 92, 246, 0.2) !important;
}

[data-theme="dark"] .vio-speech {
  background: #2D2640 !important;
  border-color: #8B5CF6 !important;
  color: #E9D5FF !important;
}

[data-theme="dark"] .vio-speech::after {
  border-top-color: #8B5CF6 !important;
}

[data-theme="dark"] .vio-speech::before {
  border-top-color: #2D2640 !important;
}

[data-theme="dark"] .wallet-filter {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
  color: #9D8BC2 !important;
}

[data-theme="dark"] .save-today-card {
  background: linear-gradient(135deg, #2D2640 0%, #1A1625 100%) !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .save-today-title {
  color: #C4B5FD !important;
}

[data-theme="dark"] .type-btn {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
  color: #9D8BC2 !important;
}

[data-theme="dark"] .type-btn.active {
  background: #2D2640 !important;
  border-color: #8B5CF6 !important;
  color: #C4B5FD !important;
}

[data-theme="dark"] .lifetime-goal-card {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .goal-amount {
  color: #A78BFA !important;
}

[data-theme="dark"] .progress-current {
  color: #A78BFA !important;
}

[data-theme="dark"] .spending-card {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .spending-hint {
  color: #6B6B7B !important;
}

[data-theme="dark"] .filter-select {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
  color: #9D8BC2 !important;
}

[data-theme="dark"] .search-input {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
  color: #E5E5E5 !important;
}

[data-theme="dark"] .search-input::placeholder {
  color: #6B6B7B !important;
}

[data-theme="dark"] .search-clear {
  background: #3D3456 !important;
  color: #9D8BC2 !important;
}

[data-theme="dark"] .search-clear:hover {
  background: #4D4466 !important;
}

[data-theme="dark"] .wallet-breakdown-item {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .wallet-breakdown-item:hover {
  border-color: #6D28D9 !important;
}

[data-theme="dark"] .wallet-breakdown-item.active {
  background: #2D2640 !important;
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .wallet-breakdown-name {
  color: #E9D5FF !important;
}

[data-theme="dark"] .wallet-breakdown-count {
  color: #9D8BC2 !important;
}

[data-theme="dark"] .section-title {
  color: #E9D5FF !important;
}

[data-theme="dark"] .transaction-count {
  color: #9D8BC2 !important;
}
</style>
