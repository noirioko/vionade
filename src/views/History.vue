<script setup>
import { ref, computed } from 'vue'
import { useFinanceStore } from '../stores'
import PieChart from '../components/PieChart.vue'
import HelpTip from '../components/HelpTip.vue'
import EditTransactionModal from '../components/EditTransactionModal.vue'

const store = useFinanceStore()
const filter = ref('all') // all, income, expense, transfer
const showDeleteConfirm = ref(null)
const editingTransaction = ref(null)

// Save today feature
const saveTodayAmount = ref('')
const savingsType = ref('monthly') // 'monthly' or 'lifetime'
const showSaveSuccess = ref(false)

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

  // Padding for days before month starts
  for (let i = 0; i < startPadding; i++) {
    days.push({ day: null, date: null })
  }

  // Days of the month
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

// Monthly transactions for vio mood
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

// Vio's mood based on spending vs income
const vioMood = computed(() => {
  if (monthTransactions.value.length === 0) return 'neutral'
  return monthExpense.value > monthIncome.value ? 'sad' : 'happy'
})

// Monthly savings for selected month
const monthSavings = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()
  return store.monthlySavingsForMonth(year, month)
})

// Mood per category (for cashflow recap grid)
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

// Pie chart data - expenses by category
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
      name: cat.name,
      value: categoryTotals[cat.id] || 0,
      color: cat.color,
      icon: cat.icon,
    }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value)
})

const filteredTransactions = computed(() => {
  let transactions = [...store.transactions.value]
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  if (filter.value !== 'all') {
    transactions = transactions.filter(t => t.type === filter.value)
  }

  // Filter by selected date if one is chosen
  if (selectedDate.value) {
    transactions = transactions.filter(t => {
      const tDate = new Date(t.date)
      return tDate.toDateString() === selectedDate.value.toDateString()
    })
  }

  return transactions
})

// Group transactions by date
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

function confirmDelete(id) {
  showDeleteConfirm.value = id
}

function deleteTransaction(id) {
  store.deleteTransaction(id)
  showDeleteConfirm.value = null
}
</script>

<template>
  <div class="page history-page">
    <div class="page-header">
      <img src="/images/vio-logo.png" alt="Vionade" class="page-header-logo" />
    </div>

    <!-- Desktop Two-Column Layout -->
    <div class="history-layout">
      <!-- Left: Calendar & Overview -->
      <div class="history-left">

    <!-- Calendar Book -->
    <div class="calendar-book section">
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

    <!-- Monthly Cashflow Recap Grid -->
    <div class="section cashflow-recap">
      <div class="section-header">
        <h3 class="section-title">
          Monthly Recap
          <HelpTip text="Compare your actual income, expenses & savings against your targets! Set targets in Settings. Vio shows happy if you're on track, sad if not." />
        </h3>
      </div>

      <div class="recap-table">
        <!-- Header Row -->
        <div class="recap-header">
          <div class="recap-cell recap-label-cell"></div>
          <div class="recap-cell">Reality</div>
          <div class="recap-cell">Target</div>
          <div class="recap-cell">Vio</div>
        </div>

        <!-- Income Row -->
        <div class="recap-row">
          <div class="recap-cell recap-label-cell">
            <span class="recap-icon">💰</span>
            Income
          </div>
          <div class="recap-cell recap-amount income">
            {{ store.formatCurrency(monthIncome) }}
          </div>
          <div class="recap-cell recap-target">
            {{ store.settings.value.targets?.monthlyIncome ? store.formatCurrency(store.settings.value.targets.monthlyIncome) : '-' }}
          </div>
          <div class="recap-cell recap-mood">
            <img
              v-if="incomeMood === 'happy'"
              src="/images/vio_happy.png"
              class="recap-vio"
              alt="Happy"
            />
            <img
              v-else-if="incomeMood === 'sad'"
              src="/images/vio_fall.png"
              class="recap-vio"
              alt="Sad"
            />
            <img
              v-else
              src="/images/vio_sit.png"
              class="recap-vio"
              alt="Neutral"
            />
          </div>
        </div>

        <!-- Expense Row -->
        <div class="recap-row">
          <div class="recap-cell recap-label-cell">
            <span class="recap-icon">💸</span>
            Expense
          </div>
          <div class="recap-cell recap-amount expense">
            {{ store.formatCurrency(monthExpense) }}
          </div>
          <div class="recap-cell recap-target">
            {{ store.settings.value.targets?.monthlyExpense ? store.formatCurrency(store.settings.value.targets.monthlyExpense) : '-' }}
          </div>
          <div class="recap-cell recap-mood">
            <img
              v-if="expenseMood === 'happy'"
              src="/images/vio_happy.png"
              class="recap-vio"
              alt="Happy"
            />
            <img
              v-else-if="expenseMood === 'sad'"
              src="/images/vio_fall.png"
              class="recap-vio"
              alt="Sad"
            />
            <img
              v-else
              src="/images/vio_sit.png"
              class="recap-vio"
              alt="Neutral"
            />
          </div>
        </div>

        <!-- Savings Row -->
        <div class="recap-row recap-row-savings">
          <div class="recap-cell recap-label-cell">
            <span class="recap-icon">🐷</span>
            Savings
          </div>
          <div class="recap-cell recap-amount savings">
            {{ store.formatCurrency(monthSavings) }}
          </div>
          <div class="recap-cell recap-target">
            {{ store.settings.value.targets?.monthlySavings ? store.formatCurrency(store.settings.value.targets.monthlySavings) : '-' }}
          </div>
          <div class="recap-cell recap-mood">
            <img
              v-if="savingsMood === 'happy'"
              src="/images/vio_happy.png"
              class="recap-vio"
              alt="Happy"
            />
            <img
              v-else-if="savingsMood === 'sad'"
              src="/images/vio_fall.png"
              class="recap-vio"
              alt="Sad"
            />
            <img
              v-else
              src="/images/vio_sit.png"
              class="recap-vio"
              alt="Neutral"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Save Today Quick Input -->
    <div class="section save-today-section">
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
            <button
              class="type-btn"
              :class="{ active: savingsType === 'monthly' }"
              @click="savingsType = 'monthly'"
            >
              This month
            </button>
            <button
              class="type-btn"
              :class="{ active: savingsType === 'lifetime' }"
              @click="savingsType = 'lifetime'"
            >
              House fund
            </button>
          </div>
          <button
            class="btn btn-primary save-today-btn"
            :disabled="!saveTodayAmount"
            @click="saveToday"
          >
            Save!
          </button>
        </div>
      </div>
    </div>

    <!-- Lifetime Savings Goal (House Fund) -->
    <div class="section lifetime-goal-section">
      <div class="lifetime-goal-card">
        <div class="goal-header">
          <div class="goal-info">
            <span class="goal-icon">🏠</span>
            <div>
              <div class="goal-name">
                {{ store.settings.value.lifetimeGoal?.name || 'House Fund' }}
                <HelpTip text="Your big dream savings! This money is LOCKED - you promised yourself not to touch it until you reach your goal. Set your target amount in Settings." />
              </div>
              <div class="goal-subtitle">Locked savings - no withdrawals!</div>
            </div>
          </div>
          <div class="goal-amount">
            {{ store.formatCurrency(store.lifetimeSavingsTotal.value) }}
          </div>
        </div>
        <div v-if="store.settings.value.lifetimeGoal?.target > 0" class="goal-progress">
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: Math.min(100, (store.lifetimeSavingsTotal.value / store.settings.value.lifetimeGoal.target) * 100) + '%' }"
            ></div>
          </div>
          <div class="progress-labels">
            <span class="progress-current">{{ Math.round((store.lifetimeSavingsTotal.value / store.settings.value.lifetimeGoal.target) * 100) }}%</span>
            <span class="progress-target">Goal: {{ store.formatCurrency(store.settings.value.lifetimeGoal.target) }}</span>
          </div>
        </div>
        <div v-else class="goal-empty">
          <p class="text-sm text-muted">Set a goal in Settings to track your progress!</p>
        </div>
      </div>
    </div>

    <!-- Save Success Toast -->
    <div v-if="showSaveSuccess" class="save-toast">
      Saved!
    </div>

    <!-- Spending Breakdown Pie Chart -->
    <div class="section spending-section">
      <div class="section-header section-header-wide">
        <h3 class="section-title">Spending Breakdown</h3>
      </div>
      <div class="card">
        <PieChart :data="expensesByCategory" :size="180" />
      </div>
      <img src="/images/vio.png" alt="" class="vio-mascot" />
    </div>

      </div><!-- End history-left -->

      <!-- Right: Transaction List -->
      <div class="history-right">
        <div class="transactions-panel">
          <div class="transactions-header">
            <h3 class="section-title">Transactions</h3>
            <span class="transaction-count">{{ filteredTransactions.length }} total</span>
          </div>

    <!-- Filter Tabs -->
    <div class="tabs">
      <button class="tab" :class="{ active: filter === 'all' }" @click="filter = 'all'">All</button>
      <button class="tab" :class="{ active: filter === 'income' }" @click="filter = 'income'">In</button>
      <button class="tab" :class="{ active: filter === 'expense' }" @click="filter = 'expense'">Out</button>
      <button class="tab" :class="{ active: filter === 'transfer' }" @click="filter = 'transfer'">Move</button>
    </div>

    <!-- Transaction List -->
    <div v-if="filteredTransactions.length === 0" class="empty-state">
      <img src="/images/vio_sit.png" alt="" class="empty-state-vio" />
      <div class="empty-state-title">No transactions</div>
      <div class="empty-state-text">
        {{ selectedDate ? 'Nothing on this day' : (filter === 'all' ? "Add your first transaction!" : `No ${filter} transactions yet.`) }}
      </div>
    </div>

    <div v-else class="transaction-list">
      <div
        v-for="transaction in filteredTransactions"
        :key="transaction.id"
        class="tx-item"
        @click="editingTransaction = transaction"
      >
        <div
          class="tx-icon"
          :class="transaction.type"
        >
          {{ getTransactionIcon(transaction) }}
        </div>
        <div class="tx-info">
          <div class="tx-title">{{ getTransactionTitle(transaction) }}</div>
          <div class="tx-meta">{{ store.getWalletById(transaction.walletId)?.name }} · {{ formatDate(transaction.date) }}</div>
        </div>
        <div
          class="tx-amount"
          :class="transaction.type"
        >
          {{ transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : '' }}{{ store.formatCurrency(transaction.amount) }}
        </div>
      </div>
    </div>

        </div><!-- End transactions-panel -->
      </div><!-- End history-right -->
    </div><!-- End history-layout -->

    <!-- Edit Modal -->
    <EditTransactionModal
      v-if="editingTransaction"
      :transaction="editingTransaction"
      @close="editingTransaction = null"
    />
  </div>
</template>

<style scoped>
/* Calendar Book */
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
  font-size: 0.75rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  position: relative;
  color: var(--gray-600);
}

.cal-day.empty {
  cursor: default;
}

.cal-day.today {
  background: var(--lavender-100);
  font-weight: 700;
}

.cal-day.selected {
  background: var(--lavender-500);
  color: white;
}

.cal-day.has-dot .cal-dot {
  width: 4px;
  height: 4px;
  background: var(--sunshine-500);
  border-radius: 50%;
  position: absolute;
  bottom: 2px;
}

.cal-day.selected .cal-dot {
  background: white;
}

.clear-date {
  width: 100%;
  margin-top: var(--space-sm);
}

/* Compact Transaction List */
.transaction-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.tx-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm);
  background: var(--white);
  border-radius: var(--radius-md);
  cursor: pointer;
}

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

/* Vio sitting in empty state */
.empty-state-vio {
  width: 120px;
  height: auto;
  margin-bottom: var(--space-md);
  opacity: 0.9;
}

/* Monthly Cashflow Recap Grid */
.cashflow-recap {
  margin-bottom: var(--space-md);
}

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

.recap-row:last-child {
  border-bottom: none;
}

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

.recap-icon {
  font-size: 1rem;
}

.recap-amount {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.8125rem;
}

.recap-amount.income {
  color: var(--income-color);
}

.recap-amount.expense {
  color: var(--expense-color);
}

.recap-amount.savings {
  color: #F59E0B;
}

.recap-target {
  color: var(--gray-400);
  font-size: 0.6875rem;
}

.recap-mood {
  padding: var(--space-xs);
}

.recap-vio {
  width: 32px;
  height: auto;
}

/* Save Today Section */
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

.save-today-icon {
  font-size: 1.5rem;
}

.save-today-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.125rem;
  color: var(--gray-800);
}

.save-today-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.save-today-input {
  background: var(--white);
  font-size: 1.125rem;
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
  font-size: 1rem;
  font-weight: 700;
}

/* Lifetime Savings Goal */
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
  margin-bottom: var(--space-md);
}

.goal-info {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.goal-icon {
  font-size: 2rem;
}

.goal-name {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1rem;
  color: var(--gray-800);
}

.goal-subtitle {
  font-size: 0.6875rem;
  color: var(--gray-400);
}

.goal-amount {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.125rem;
  color: #F59E0B;
}

.goal-progress {
  margin-top: var(--space-sm);
}

.progress-bar {
  height: 12px;
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

.progress-current {
  font-weight: 700;
  color: #F59E0B;
}

.progress-target {
  color: var(--gray-400);
}

.goal-empty {
  text-align: center;
  padding: var(--space-sm) 0;
}

/* Save Success Toast */
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

/* Vio mascot peeking behind spending section */
.spending-section {
  position: relative;
  overflow: visible;
}

.vio-mascot {
  position: absolute;
  right: -10px;
  top: -35px;
  width: 90px;
  height: auto;
  z-index: 0;
  pointer-events: none;
}

.spending-section .section-header,
.spending-section .card {
  position: relative;
  z-index: 2;
}

/* Desktop Two-Column Layout */
.history-page {
  max-width: 1400px;
}

.history-layout {
  display: block;
}

@media (min-width: 900px) {
  .history-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-lg);
    align-items: start;
  }

  .history-left {
    position: sticky;
    top: var(--space-md);
  }

  .history-right {
    min-height: 0;
  }

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

  .transaction-list {
    max-height: calc(100vh - 200px);
    overflow-y: auto;
  }
}

@media (min-width: 1200px) {
  .history-layout {
    grid-template-columns: 1fr 1.2fr;
  }
}

/* Hide header on mobile */
.transactions-header {
  display: none;
}

@media (min-width: 900px) {
  .transactions-header {
    display: flex;
  }
}

</style>

<style>
/* Dark mode overrides (unscoped) */
[data-theme="dark"] .calendar-book {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .cal-day.has-dot .cal-dot {
  background: #8B5CF6 !important;
}

[data-theme="dark"] .save-today-card {
  background: linear-gradient(135deg, #2D2640 0%, #1A1625 100%) !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .save-today-title {
  color: #9D8BC2 !important;
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

[data-theme="dark"] .goal-amount {
  color: #A78BFA !important;
}

[data-theme="dark"] .lifetime-goal-card {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .recap-table {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .recap-header {
  background: #2D2640 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .transactions-panel {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}
</style>
