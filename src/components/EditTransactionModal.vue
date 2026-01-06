<script setup>
import { ref, computed, watch } from 'vue'
import { useFinanceStore } from '../stores'

const props = defineProps({
  transaction: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'delete'])
const store = useFinanceStore()

// Date helpers - use local date, not UTC
function getDateString(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Form state
const editForm = ref({
  type: 'expense',
  amount: '',
  amountUSD: '',
  walletId: 'bca',
  toWalletId: 'bri',
  category: 'fnb',
  note: '',
  date: '',
})

// Initialize form when transaction changes
watch(() => props.transaction, (tx) => {
  if (tx) {
    editForm.value = {
      type: tx.type,
      amount: tx.amount,
      amountUSD: tx.amountUSD || '',
      walletId: tx.walletId,
      toWalletId: tx.toWalletId || 'bri',
      category: tx.category || 'fnb',
      note: tx.note || '',
      date: tx.date ? tx.date.split('T')[0] : getDateString(new Date()),
    }
  }
}, { immediate: true })

const todayString = getDateString(new Date())
const yesterdayDate = new Date()
yesterdayDate.setDate(yesterdayDate.getDate() - 1)
const yesterdayString = getDateString(yesterdayDate)

const isToday = computed(() => editForm.value.date === todayString)
const isYesterday = computed(() => editForm.value.date === yesterdayString)

function setToday() {
  editForm.value.date = todayString
}

function setYesterday() {
  editForm.value.date = yesterdayString
}

const categories = computed(() => {
  return editForm.value.type === 'expense'
    ? store.EXPENSE_CATEGORIES
    : store.INCOME_CATEGORIES
})

const toWallets = computed(() => {
  return store.wallets.value.filter(w => w.id !== editForm.value.walletId)
})

function saveEdit() {
  if (!editForm.value.amount) return

  store.updateTransaction(props.transaction.id, {
    type: editForm.value.type,
    amount: parseFloat(editForm.value.amount),
    amountUSD: editForm.value.amountUSD ? parseFloat(editForm.value.amountUSD) : null,
    walletId: editForm.value.walletId,
    toWalletId: editForm.value.type === 'transfer' ? editForm.value.toWalletId : null,
    category: editForm.value.type !== 'transfer' ? editForm.value.category : null,
    note: editForm.value.note || null,
    date: editForm.value.date,
  })

  emit('close')
}

function handleDelete() {
  if (confirm('Delete this transaction?')) {
    store.deleteTransaction(props.transaction.id)
    emit('close')
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">Edit Transaction</h3>
        <button class="modal-close" @click="$emit('close')">×</button>
      </div>

      <!-- Transaction Type (display only) -->
      <div class="input-group">
        <label class="input-label">Type</label>
        <div class="type-display">
          <span v-if="editForm.type === 'income'" class="chip chip-income">💰 Income</span>
          <span v-else-if="editForm.type === 'expense'" class="chip chip-expense">💸 Expense</span>
          <span v-else class="chip chip-transfer">↔️ Transfer</span>
        </div>
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
            v-model="editForm.date"
            type="date"
            class="date-input"
          />
        </div>
      </div>

      <!-- Amount in USD (for income) -->
      <div v-if="editForm.type === 'income'" class="input-group">
        <label class="input-label">Amount in USD (optional)</label>
        <input
          v-model="editForm.amountUSD"
          type="number"
          class="input"
          placeholder="e.g., 50"
          inputmode="decimal"
        />
      </div>

      <!-- Amount -->
      <div class="input-group">
        <label class="input-label">Amount (IDR)</label>
        <input
          v-model="editForm.amount"
          type="number"
          class="input"
          placeholder="e.g., 500000"
          inputmode="numeric"
        />
      </div>

      <!-- Wallet -->
      <div class="input-group">
        <label class="input-label">
          {{ editForm.type === 'transfer' ? 'From Wallet' : 'Wallet' }}
        </label>
        <div class="wallet-grid">
          <button
            v-for="wallet in store.wallets.value"
            :key="wallet.id"
            class="wallet-mini"
            :class="{ active: editForm.walletId === wallet.id }"
            @click="editForm.walletId = wallet.id"
          >
            <span class="wallet-mini-icon">{{ wallet.icon }}</span>
            <div class="wallet-mini-info">
              <div class="wallet-mini-name">{{ wallet.name }}</div>
            </div>
          </button>
        </div>
      </div>

      <!-- To Wallet (for transfers) -->
      <div v-if="editForm.type === 'transfer'" class="input-group">
        <label class="input-label">To Wallet</label>
        <div class="wallet-grid">
          <button
            v-for="wallet in toWallets"
            :key="wallet.id"
            class="wallet-mini"
            :class="{ active: editForm.toWalletId === wallet.id }"
            @click="editForm.toWalletId = wallet.id"
          >
            <span class="wallet-mini-icon">{{ wallet.icon }}</span>
            <div class="wallet-mini-info">
              <div class="wallet-mini-name">{{ wallet.name }}</div>
            </div>
          </button>
        </div>
      </div>

      <!-- Category (not for transfers) -->
      <div v-if="editForm.type !== 'transfer'" class="input-group">
        <label class="input-label">Category</label>
        <div class="category-grid">
          <button
            v-for="cat in categories"
            :key="cat.id"
            class="category-btn"
            :class="{ active: editForm.category === cat.id }"
            @click="editForm.category = cat.id"
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
          v-model="editForm.note"
          type="text"
          class="input"
          placeholder="What was this for?"
        />
      </div>

      <!-- Actions -->
      <div class="modal-actions">
        <button class="btn btn-ghost btn-delete" @click="handleDelete">Delete</button>
        <button class="btn btn-primary" @click="saveEdit">Save</button>
      </div>
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

.type-display {
  margin-top: var(--space-xs);
}

.modal-actions {
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-md);
}

.modal-actions .btn {
  flex: 1;
}

.btn-delete {
  color: var(--expense-color);
}
</style>

<style>
/* Dark mode */
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
