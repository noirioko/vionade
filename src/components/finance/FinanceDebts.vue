<script setup>
import { ref, computed } from 'vue'
import { useFinanceStore } from '../../stores'

const store = useFinanceStore()

// Modal state
const showAddModal = ref(false)
const editingDebt = ref(null) // null = adding, object = editing
const newDebt = ref({
  type: 'owed_to_me',
  person: '',
  amount: '',
  reason: '',
  date: '',
})

// Active vs History view
const showHistory = ref(false)

const activeDebts = computed(() => store.getActiveDebts())
const paidDebts = computed(() => store.getPaidDebts())
const totalOwedToMe = computed(() => store.getTotalOwedToMe())
const totalIOwe = computed(() => store.getTotalIOwe())

function openAddModal() {
  editingDebt.value = null
  newDebt.value = {
    type: 'owed_to_me',
    person: '',
    amount: '',
    reason: '',
    date: new Date().toISOString().split('T')[0],
  }
  showAddModal.value = true
}

function openEditModal(debt) {
  editingDebt.value = debt
  newDebt.value = {
    type: debt.type,
    person: debt.person,
    amount: debt.amount,
    reason: debt.reason || '',
    date: debt.date ? new Date(debt.date).toISOString().split('T')[0] : '',
  }
  showAddModal.value = true
}

function saveDebt() {
  if (!newDebt.value.person.trim() || !newDebt.value.amount) return

  const debtDate = newDebt.value.date
    ? new Date(newDebt.value.date + 'T12:00:00').toISOString()
    : new Date().toISOString()

  if (editingDebt.value) {
    // Editing existing debt
    store.updateDebt(editingDebt.value.id, {
      type: newDebt.value.type,
      person: newDebt.value.person,
      amount: parseFloat(newDebt.value.amount),
      reason: newDebt.value.reason,
      date: debtDate,
    })
  } else {
    // Adding new debt
    store.addDebt({
      type: newDebt.value.type,
      person: newDebt.value.person,
      amount: parseFloat(newDebt.value.amount),
      reason: newDebt.value.reason,
      date: debtDate,
    })
  }

  showAddModal.value = false
  editingDebt.value = null
}

function markPaid(id) {
  store.markDebtPaid(id)
}

function undoPaid(id) {
  store.reactivateDebt(id)
}

function deleteDebt(id) {
  if (confirm('Delete this debt record?')) {
    store.deleteDebt(id)
  }
}

function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="tab-content debts-content">
    <!-- Summary Cards -->
    <div class="debt-summary">
      <div class="summary-card owed-to-me">
        <div class="summary-icon">💰</div>
        <div class="summary-info">
          <div class="summary-label">Owed to you</div>
          <div class="summary-amount">{{ store.formatCurrency(totalOwedToMe) }}</div>
        </div>
      </div>
      <div class="summary-card i-owe">
        <div class="summary-icon">💸</div>
        <div class="summary-info">
          <div class="summary-label">You owe</div>
          <div class="summary-amount">{{ store.formatCurrency(totalIOwe) }}</div>
        </div>
      </div>
    </div>

    <!-- Toggle Active/History -->
    <div class="view-toggle">
      <button
        class="toggle-btn"
        :class="{ active: !showHistory }"
        @click="showHistory = false"
      >
        Active ({{ activeDebts.length }})
      </button>
      <button
        class="toggle-btn"
        :class="{ active: showHistory }"
        @click="showHistory = true"
      >
        History ({{ paidDebts.length }})
      </button>
    </div>

    <!-- Active Debts -->
    <div v-if="!showHistory" class="debt-list">
      <div v-if="activeDebts.length === 0" class="empty-state">
        <img src="/images/vio_happy.png" alt="" class="empty-vio" />
        <div class="empty-title">No active debts!</div>
        <div class="empty-text">You're all clear~ No one owes you and you owe no one!</div>
      </div>

      <div
        v-for="debt in activeDebts"
        :key="debt.id"
        class="debt-item clickable"
        :class="debt.type"
        @click="openEditModal(debt)"
      >
        <div class="debt-indicator" :class="debt.type"></div>
        <div class="debt-info">
          <div class="debt-person">
            <span v-if="debt.type === 'owed_to_me'">{{ debt.person }} owes you</span>
            <span v-else>You owe {{ debt.person }}</span>
          </div>
          <div class="debt-meta">
            <span v-if="debt.reason">{{ debt.reason }} · </span>
            {{ formatDate(debt.date) }}
          </div>
        </div>
        <div class="debt-amount" :class="debt.type">
          {{ store.formatCurrency(debt.amount) }}
        </div>
        <button class="btn btn-sm btn-success debt-action" @click.stop="markPaid(debt.id)">
          Paid
        </button>
      </div>
    </div>

    <!-- History -->
    <div v-else class="debt-list history">
      <div v-if="paidDebts.length === 0" class="empty-state">
        <img src="/images/vio_sit.png" alt="" class="empty-vio" />
        <div class="empty-title">No history yet</div>
        <div class="empty-text">Paid debts will show up here</div>
      </div>

      <div
        v-for="debt in paidDebts"
        :key="debt.id"
        class="debt-item paid"
      >
        <div class="debt-indicator paid"></div>
        <div class="debt-info">
          <div class="debt-person">
            <span v-if="debt.type === 'owed_to_me'">{{ debt.person }} paid you</span>
            <span v-else>You paid {{ debt.person }}</span>
          </div>
          <div class="debt-meta">
            <span v-if="debt.reason">{{ debt.reason }} · </span>
            {{ formatDate(debt.date) }} → {{ formatDate(debt.paidDate) }}
          </div>
        </div>
        <div class="debt-amount paid">
          {{ store.formatCurrency(debt.amount) }}
        </div>
        <div class="debt-actions">
          <button class="btn btn-xs btn-ghost" @click="undoPaid(debt.id)" title="Undo">↩</button>
          <button class="btn btn-xs btn-ghost text-danger" @click="deleteDebt(debt.id)" title="Delete">×</button>
        </div>
      </div>
    </div>

    <!-- Add Button -->
    <button class="add-debt-btn" @click="openAddModal">
      + Add Debt
    </button>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false; editingDebt = null">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">{{ editingDebt ? 'Edit Debt' : 'Add Debt' }}</h3>
          <button class="modal-close" @click="showAddModal = false; editingDebt = null">×</button>
        </div>

        <div class="input-group">
          <label class="input-label">Type</label>
          <div class="type-toggle">
            <button
              class="type-btn"
              :class="{ active: newDebt.type === 'owed_to_me' }"
              @click="newDebt.type = 'owed_to_me'"
            >
              <span class="type-icon">💰</span>
              <span>They owe me</span>
            </button>
            <button
              class="type-btn"
              :class="{ active: newDebt.type === 'i_owe' }"
              @click="newDebt.type = 'i_owe'"
            >
              <span class="type-icon">💸</span>
              <span>I owe them</span>
            </button>
          </div>
        </div>

        <div class="input-group">
          <label class="input-label">Who?</label>
          <input
            v-model="newDebt.person"
            type="text"
            class="input"
            placeholder="Person's name"
          />
        </div>

        <div class="input-group">
          <label class="input-label">Amount</label>
          <input
            v-model="newDebt.amount"
            type="number"
            class="input"
            placeholder="0"
            inputmode="numeric"
          />
        </div>

        <div class="input-group">
          <label class="input-label">Reason (optional)</label>
          <input
            v-model="newDebt.reason"
            type="text"
            class="input"
            placeholder="e.g., lunch, concert ticket"
          />
        </div>

        <div class="input-group">
          <label class="input-label">When?</label>
          <input
            v-model="newDebt.date"
            type="date"
            class="input"
          />
        </div>

        <div class="modal-actions">
          <button
            v-if="editingDebt"
            class="btn btn-ghost btn-delete"
            @click="deleteDebt(editingDebt.id); showAddModal = false; editingDebt = null"
          >
            Delete
          </button>
          <button
            class="btn btn-primary"
            :class="{ 'w-full': !editingDebt }"
            :disabled="!newDebt.person.trim() || !newDebt.amount"
            @click="saveDebt"
          >
            {{ editingDebt ? 'Save' : 'Add Debt' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.debts-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

/* Summary Cards */
.debt-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
}

.summary-card {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  border-radius: var(--radius-lg);
  background: var(--white);
  border: 2px solid var(--border-color);
}

.summary-card.owed-to-me {
  border-color: var(--income-color);
  background: rgba(16, 185, 129, 0.05);
}

.summary-card.i-owe {
  border-color: var(--expense-color);
  background: rgba(244, 63, 94, 0.05);
}

.summary-icon {
  font-size: 1.5rem;
}

.summary-info {
  flex: 1;
}

.summary-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.summary-amount {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1rem;
}

.summary-card.owed-to-me .summary-amount {
  color: var(--income-color);
}

.summary-card.i-owe .summary-amount {
  color: var(--expense-color);
}

/* View Toggle */
.view-toggle {
  display: flex;
  gap: var(--space-xs);
  background: var(--gray-100);
  padding: var(--space-xs);
  border-radius: var(--radius-md);
}

.toggle-btn {
  flex: 1;
  padding: var(--space-sm);
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-btn.active {
  background: var(--white);
  color: var(--lavender-700);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Debt List */
.debt-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.debt-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--white);
  border-radius: var(--radius-lg);
  border: 2px solid var(--border-color);
  transition: all 0.2s;
}

.debt-item.clickable {
  cursor: pointer;
}

.debt-item.clickable:hover {
  border-color: var(--lavender-300);
  background: var(--lavender-50);
}

.debt-indicator {
  width: 4px;
  height: 40px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.debt-indicator.owed_to_me {
  background: var(--income-color);
}

.debt-indicator.i_owe {
  background: var(--expense-color);
}

.debt-indicator.paid {
  background: var(--gray-300);
}

.debt-info {
  flex: 1;
  min-width: 0;
}

.debt-person {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.debt-meta {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 2px;
}

.debt-amount {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.debt-amount.owed_to_me {
  color: var(--income-color);
}

.debt-amount.i_owe {
  color: var(--expense-color);
}

.debt-amount.paid {
  color: var(--text-secondary);
  text-decoration: line-through;
}

.debt-action {
  flex-shrink: 0;
}

.debt-actions {
  display: flex;
  gap: var(--space-xs);
}

.btn-success {
  background: var(--income-color);
  color: white;
}

.btn-success:hover {
  background: #059669;
}

.text-danger {
  color: var(--expense-color) !important;
}

/* Add Button */
.add-debt-btn {
  padding: var(--space-md);
  border: 2px dashed var(--lavender-300);
  border-radius: var(--radius-lg);
  background: transparent;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--lavender-600);
  cursor: pointer;
  transition: all 0.2s;
}

.add-debt-btn:hover {
  border-color: var(--lavender-500);
  background: var(--lavender-50);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: var(--space-xl);
}

.empty-vio {
  width: 100px;
  height: auto;
  margin-bottom: var(--space-md);
}

.empty-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.125rem;
  color: var(--text-primary);
  margin-bottom: var(--space-xs);
}

.empty-text {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* Modal Type Toggle */
.type-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
}

.type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-md);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--white);
  cursor: pointer;
  transition: all 0.2s;
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

/* Modal Actions */
.modal-actions {
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-md);
}

.modal-actions .btn {
  flex: 1;
}

.btn-delete {
  color: var(--expense-color) !important;
}
</style>

<style>
/* Dark mode */
[data-theme="dark"] .summary-card {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .summary-card.owed-to-me {
  border-color: #10B981 !important;
  background: rgba(16, 185, 129, 0.1) !important;
}

[data-theme="dark"] .summary-card.i-owe {
  border-color: #F43F5E !important;
  background: rgba(244, 63, 94, 0.1) !important;
}

[data-theme="dark"] .view-toggle {
  background: #2D2640 !important;
}

[data-theme="dark"] .toggle-btn.active {
  background: #1A1625 !important;
  color: #C4B5FD !important;
}

[data-theme="dark"] .debt-item {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .debt-item.clickable:hover {
  background: #2D2640 !important;
  border-color: #6D28D9 !important;
}

[data-theme="dark"] .debt-person {
  color: #E9D5FF !important;
}

[data-theme="dark"] .add-debt-btn {
  border-color: #6D28D9 !important;
  color: #A78BFA !important;
}

[data-theme="dark"] .add-debt-btn:hover {
  background: rgba(139, 92, 246, 0.1) !important;
}

[data-theme="dark"] .type-btn {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .type-btn.active {
  background: #2D2640 !important;
  border-color: #8B5CF6 !important;
}
</style>
