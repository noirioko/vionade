<script setup>
import { ref, computed } from 'vue'
import { useFinanceStore } from '../stores'

const emit = defineEmits(['close'])
const store = useFinanceStore()

const transactionType = ref('expense')
const amount = ref('')
const amountUSD = ref('')
const amountIDR = ref('')
const selectedWallet = ref('bca')
const selectedToWallet = ref('bri')
const selectedCategory = ref('fnb')
const note = ref('')
const selectedDate = ref(new Date().toISOString().split('T')[0]) // Default to today

// Date helpers
function getDateString(date) {
  return date.toISOString().split('T')[0]
}

const todayString = getDateString(new Date())
const yesterdayDate = new Date()
yesterdayDate.setDate(yesterdayDate.getDate() - 1)
const yesterdayString = getDateString(yesterdayDate)

const isToday = computed(() => selectedDate.value === todayString)
const isYesterday = computed(() => selectedDate.value === yesterdayString)

function setToday() {
  selectedDate.value = todayString
}

function setYesterday() {
  selectedDate.value = yesterdayString
}

const categories = computed(() => {
  return transactionType.value === 'expense'
    ? store.EXPENSE_CATEGORIES
    : store.INCOME_CATEGORIES
})

const availableWallets = computed(() => {
  return store.wallets.value
})

const toWallets = computed(() => {
  return store.wallets.value.filter(w => w.id !== selectedWallet.value)
})

function handleSubmit() {
  let finalAmount = 0

  if (transactionType.value === 'income' && amountIDR.value) {
    // For income with USD conversion
    finalAmount = parseFloat(amountIDR.value) || 0
  } else {
    finalAmount = parseFloat(amount.value) || 0
  }

  if (finalAmount <= 0) return

  const transaction = {
    type: transactionType.value,
    amount: finalAmount,
    walletId: selectedWallet.value,
    category: transactionType.value !== 'transfer' ? selectedCategory.value : null,
    note: note.value || null,
    toWalletId: transactionType.value === 'transfer' ? selectedToWallet.value : null,
    // Store USD amount for reference if provided
    amountUSD: amountUSD.value ? parseFloat(amountUSD.value) : null,
    // Custom date (or today if not changed)
    date: selectedDate.value,
  }

  store.addTransaction(transaction)
  emit('close')
}

function setType(type) {
  transactionType.value = type
  // Reset category to first available
  selectedCategory.value = type === 'expense' ? 'fnb' : 'freelance'
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">Add Transaction</h3>
        <button class="modal-close" @click="$emit('close')">×</button>
      </div>

      <!-- Transaction Type Selector -->
      <div class="type-selector">
        <button
          class="type-btn income"
          :class="{ active: transactionType === 'income' }"
          @click="setType('income')"
        >
          <div class="type-btn-icon">💰</div>
          <div class="type-btn-label">Income</div>
        </button>
        <button
          class="type-btn expense"
          :class="{ active: transactionType === 'expense' }"
          @click="setType('expense')"
        >
          <div class="type-btn-icon">💸</div>
          <div class="type-btn-label">Expense</div>
        </button>
        <button
          class="type-btn transfer"
          :class="{ active: transactionType === 'transfer' }"
          @click="setType('transfer')"
        >
          <div class="type-btn-icon">↔️</div>
          <div class="type-btn-label">Transfer</div>
        </button>
      </div>

      <!-- Date Picker -->
      <div class="input-group">
        <label class="input-label">Date</label>
        <div class="date-shortcuts">
          <button
            type="button"
            class="date-btn"
            :class="{ active: isToday }"
            @click="setToday"
          >Today</button>
          <button
            type="button"
            class="date-btn"
            :class="{ active: isYesterday }"
            @click="setYesterday"
          >Yesterday</button>
          <input
            v-model="selectedDate"
            type="date"
            class="date-input"
          />
        </div>
      </div>

      <!-- Amount Input -->
      <div v-if="transactionType === 'income'" class="input-group">
        <label class="input-label">Amount in USD (optional)</label>
        <input
          v-model="amountUSD"
          type="number"
          class="input"
          placeholder="e.g., 50"
          inputmode="decimal"
        />
      </div>

      <div v-if="transactionType === 'income'" class="input-group">
        <label class="input-label">Amount Received (IDR)</label>
        <input
          v-model="amountIDR"
          type="number"
          class="input"
          placeholder="e.g., 500000"
          inputmode="numeric"
        />
      </div>

      <div v-else class="input-group">
        <label class="input-label">Amount (IDR)</label>
        <input
          v-model="amount"
          type="number"
          class="input"
          placeholder="e.g., 500000"
          inputmode="numeric"
        />
      </div>

      <!-- Wallet Selection -->
      <div class="input-group">
        <label class="input-label">
          {{ transactionType === 'transfer' ? 'From Wallet' : 'Wallet' }}
        </label>
        <div class="wallet-grid">
          <button
            v-for="wallet in availableWallets"
            :key="wallet.id"
            class="wallet-mini"
            :class="{ active: selectedWallet === wallet.id }"
            @click="selectedWallet = wallet.id"
          >
            <span class="wallet-mini-icon">{{ wallet.icon }}</span>
            <div class="wallet-mini-info">
              <div class="wallet-mini-name">{{ wallet.name }}</div>
              <div class="wallet-mini-balance">{{ store.formatCurrency(wallet.balance) }}</div>
            </div>
          </button>
        </div>
      </div>

      <!-- To Wallet (for transfers) -->
      <div v-if="transactionType === 'transfer'" class="input-group">
        <label class="input-label">To Wallet</label>
        <div class="wallet-grid">
          <button
            v-for="wallet in toWallets"
            :key="wallet.id"
            class="wallet-mini"
            :class="{ active: selectedToWallet === wallet.id }"
            @click="selectedToWallet = wallet.id"
          >
            <span class="wallet-mini-icon">{{ wallet.icon }}</span>
            <div class="wallet-mini-info">
              <div class="wallet-mini-name">{{ wallet.name }}</div>
              <div class="wallet-mini-balance">{{ store.formatCurrency(wallet.balance) }}</div>
            </div>
          </button>
        </div>
      </div>

      <!-- Category Selection (not for transfers) -->
      <div v-if="transactionType !== 'transfer'" class="input-group">
        <label class="input-label">Category</label>
        <div class="category-grid">
          <button
            v-for="cat in categories"
            :key="cat.id"
            class="category-btn"
            :class="{ active: selectedCategory === cat.id }"
            @click="selectedCategory = cat.id"
          >
            <div class="category-btn-icon">{{ cat.icon }}</div>
            <div class="category-btn-label">{{ cat.name }}</div>
          </button>
        </div>
      </div>

      <!-- Note -->
      <div class="input-group">
        <label class="input-label">Note (optional)</label>
        <input
          v-model="note"
          type="text"
          class="input"
          placeholder="What was this for?"
        />
      </div>

      <!-- Submit Button -->
      <button class="btn btn-primary btn-lg w-full" @click="handleSubmit">
        Add Transaction
      </button>
    </div>
  </div>
</template>

<style scoped>
.date-shortcuts {
  display: flex;
  gap: var(--space-sm);
  align-items: center;
}

.date-btn {
  padding: var(--space-sm) var(--space-md);
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-md);
  background: var(--bg-card);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.date-btn:hover {
  border-color: var(--lavender-300);
  color: var(--text-primary);
}

.date-btn.active {
  border-color: var(--lavender-500);
  background: var(--lavender-500);
  color: white;
}

.date-input {
  flex: 1;
  padding: var(--space-sm) var(--space-md);
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-md);
  background: var(--bg-card);
  font-size: 0.875rem;
  font-family: inherit;
  color: var(--text-primary);
  cursor: pointer;
}

.date-input:focus {
  outline: none;
  border-color: var(--lavender-500);
}
</style>

<style>
/* Dark mode for date picker */
[data-theme="dark"] .date-btn {
  background: var(--bg-card);
  border-color: #3D3456;
  color: var(--text-secondary);
}

[data-theme="dark"] .date-btn:hover {
  border-color: #8B5CF6;
}

[data-theme="dark"] .date-btn.active {
  background: #8B5CF6;
  border-color: #8B5CF6;
}

[data-theme="dark"] .date-input {
  background: var(--bg-card);
  border-color: #3D3456;
  color: var(--text-primary);
}

[data-theme="dark"] .date-input:focus {
  border-color: #8B5CF6;
}
</style>
