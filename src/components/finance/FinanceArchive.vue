<script setup>
import { ref, computed } from 'vue'
import { useFinanceStore } from '../../stores'
import { useToast } from '../../composables/useToast'

const store = useFinanceStore()
const toast = useToast()

const expandedMonth = ref(null)
const showImportArchive = ref(false)
const importPreview = ref(null)
const archiveLabel = ref('')

const closedMonths = computed(() => {
  return store.getClosedMonths() || []
})

function toggleExpand(monthId) {
  if (expandedMonth.value === monthId) {
    expandedMonth.value = null
  } else {
    expandedMonth.value = monthId
  }
}

function handleFileSelect(event) {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    parseArchiveCSV(e.target.result)
  }
  reader.readAsText(file)
  event.target.value = ''
}

function parseArchiveCSV(csvText) {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) {
    toast.error('CSV file is empty or invalid')
    return
  }

  const header = lines[0].split(',').map(h => h.trim().toLowerCase())
  const dateIdx = header.findIndex(h => h === 'date')
  const typeIdx = header.findIndex(h => h === 'type')
  const categoryIdx = header.findIndex(h => h === 'category')
  const amountIdx = header.findIndex(h => h === 'amount')
  const walletIdx = header.findIndex(h => h === 'wallet')
  const toWalletIdx = header.findIndex(h => h.includes('to wallet') || h === 'to_wallet')
  const noteIdx = header.findIndex(h => h === 'note')

  const transactions = []
  const walletBalances = {}

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.startsWith('===')) break

    const values = parseCSVLine(line)
    const date = values[dateIdx]
    const type = (values[typeIdx] || 'expense').toLowerCase()
    const categoryName = values[categoryIdx] || ''
    const amount = Math.abs(parseFloat(values[amountIdx])) || 0
    const walletName = values[walletIdx] || ''
    const toWalletName = values[toWalletIdx] || ''
    const note = values[noteIdx] || ''

    if (!amount) continue

    const wallet = store.wallets.value.find(w =>
      w.name.toLowerCase() === walletName.toLowerCase()
    )

    // Handle starting balance
    if (type === 'starting' || type === 'starting balance' || type === 'start') {
      if (wallet) {
        walletBalances[wallet.id] = { opening: amount }
      }
      continue
    }

    if (!date) continue

    const toWallet = toWalletName ? store.wallets.value.find(w =>
      w.name.toLowerCase() === toWalletName.toLowerCase()
    ) : null

    const category = store.EXPENSE_CATEGORIES.find(c =>
      c.name.toLowerCase() === categoryName.toLowerCase()
    ) || store.INCOME_CATEGORIES.find(c =>
      c.name.toLowerCase() === categoryName.toLowerCase()
    )

    transactions.push({
      date,
      type,
      category: category?.id || 'other',
      categoryName: category?.name || categoryName || 'Other',
      amount,
      walletId: wallet?.id || 'bca',
      walletName: wallet?.name || walletName || 'BCA',
      toWalletId: toWallet?.id || null,
      toWalletName: toWallet?.name || toWalletName || '',
      note,
    })
  }

  // Calculate totals
  let totalIncome = 0
  let totalExpense = 0
  transactions.forEach(t => {
    if (t.type === 'income') totalIncome += t.amount
    else if (t.type === 'expense') totalExpense += t.amount
  })

  importPreview.value = {
    transactions,
    walletBalances,
    totalIncome,
    totalExpense,
    count: transactions.length,
  }
  showImportArchive.value = true
}

function parseCSVLine(line) {
  const values = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  values.push(current.trim())
  return values
}

async function confirmImportArchive() {
  if (!archiveLabel.value.trim()) {
    toast.error('Please enter a label (e.g., "January 2026")')
    return
  }

  store.pauseSync()

  store.archiveMonth(
    archiveLabel.value.trim(),
    importPreview.value.transactions,
    importPreview.value.walletBalances
  )

  await store.saveToFirebase()

  setTimeout(() => store.resumeSync(), 3000)

  showImportArchive.value = false
  importPreview.value = null
  archiveLabel.value = ''

  toast.success('Month archived successfully!')
}

function cancelImportArchive() {
  showImportArchive.value = false
  importPreview.value = null
  archiveLabel.value = ''
}

function deleteMonth(month) {
  if (confirm(`Delete "${month.label}" archive? This cannot be undone.`)) {
    store.deleteArchivedMonth(month.id)
    store.saveToFirebase()
    toast.success('Archive deleted')
  }
}

function getWalletName(walletId) {
  const wallet = store.wallets.value.find(w => w.id === walletId)
  return wallet?.name || walletId
}

function getWalletIcon(walletId) {
  const wallet = store.wallets.value.find(w => w.id === walletId)
  return wallet?.icon || '💰'
}

function getCategoryIcon(categoryId, type) {
  const cat = store.getCategoryById(categoryId, type === 'income' ? 'income' : 'expense')
  return cat?.icon || '📦'
}
</script>

<template>
  <div class="archive-container">
    <!-- Header -->
    <div class="archive-header">
      <div class="archive-title">
        <span class="archive-icon">📚</span>
        <h3>History Book</h3>
      </div>
      <label class="btn btn-secondary btn-sm import-archive-btn">
        📥 Import Archive
        <input type="file" accept=".csv" @change="handleFileSelect" hidden />
      </label>
    </div>

    <!-- Empty State -->
    <div v-if="closedMonths.length === 0" class="archive-empty">
      <div class="empty-icon">📖</div>
      <p>No archived months yet</p>
      <p class="empty-hint">Import a CSV to archive past months</p>
    </div>

    <!-- Closed Months List -->
    <div v-else class="archive-list">
      <div
        v-for="month in closedMonths"
        :key="month.id"
        class="archive-month"
        :class="{ expanded: expandedMonth === month.id }"
      >
        <div class="month-header" @click="toggleExpand(month.id)">
          <div class="month-info">
            <span class="month-icon">📅</span>
            <div>
              <div class="month-label">{{ month.label }}</div>
              <div class="month-meta">{{ month.transactionCount }} transactions</div>
            </div>
          </div>
          <div class="month-summary">
            <div class="summary-item income">
              <span class="summary-label">Income</span>
              <span class="summary-value">{{ store.formatCurrency(month.totalIncome) }}</span>
            </div>
            <div class="summary-item expense">
              <span class="summary-label">Expense</span>
              <span class="summary-value">{{ store.formatCurrency(month.totalExpense) }}</span>
            </div>
          </div>
          <div class="month-expand">
            {{ expandedMonth === month.id ? '▼' : '▶' }}
          </div>
        </div>

        <!-- Expanded Transactions -->
        <div v-if="expandedMonth === month.id" class="month-transactions">
          <div class="transactions-header">
            <span>All Transactions</span>
            <button class="btn btn-ghost btn-xs delete-btn" @click.stop="deleteMonth(month)">
              🗑️ Delete Archive
            </button>
          </div>
          <div class="transaction-list">
            <div
              v-for="(tx, idx) in month.transactions"
              :key="idx"
              class="transaction-item"
              :class="tx.type"
            >
              <div class="tx-icon">{{ getCategoryIcon(tx.category, tx.type) }}</div>
              <div class="tx-info">
                <div class="tx-note">{{ tx.note || tx.categoryName }}</div>
                <div class="tx-meta">
                  {{ tx.date }} • {{ getWalletName(tx.walletId) }}
                  <span v-if="tx.toWalletId"> → {{ getWalletName(tx.toWalletId) }}</span>
                </div>
              </div>
              <div class="tx-amount" :class="tx.type">
                {{ tx.type === 'income' ? '+' : '-' }}{{ store.formatCurrency(tx.amount) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Import Archive Modal -->
    <div v-if="showImportArchive" class="modal-overlay" @click.self="cancelImportArchive">
      <div class="modal archive-modal">
        <div class="modal-header">
          <h3>📥 Import as Archive</h3>
          <button class="modal-close" @click="cancelImportArchive">&times;</button>
        </div>

        <div class="import-info">
          <p>This will save the CSV as a <strong>read-only archive</strong>.</p>
          <p class="info-note">It won't affect your current transactions or balances.</p>
        </div>

        <div v-if="importPreview" class="import-preview">
          <div class="preview-stats">
            <div class="stat">
              <span class="stat-number">{{ importPreview.count }}</span>
              <span class="stat-label">Transactions</span>
            </div>
            <div class="stat income">
              <span class="stat-number">{{ store.formatCurrency(importPreview.totalIncome) }}</span>
              <span class="stat-label">Income</span>
            </div>
            <div class="stat expense">
              <span class="stat-number">{{ store.formatCurrency(importPreview.totalExpense) }}</span>
              <span class="stat-label">Expenses</span>
            </div>
          </div>

          <div class="label-input">
            <label>Archive Label:</label>
            <input
              v-model="archiveLabel"
              type="text"
              class="input"
              placeholder="e.g., January 2026"
            />
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="cancelImportArchive">Cancel</button>
          <button
            class="btn btn-primary"
            @click="confirmImportArchive"
            :disabled="!archiveLabel.trim()"
          >
            📚 Save to History Book
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.archive-container {
  padding: var(--space-md);
}

.archive-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-lg);
}

.archive-title {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.archive-icon {
  font-size: 1.5rem;
}

.archive-title h3 {
  margin: 0;
  font-size: 1.25rem;
}

.import-archive-btn {
  font-size: 0.8rem;
}

/* Empty State */
.archive-empty {
  text-align: center;
  padding: var(--space-xl);
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: var(--space-md);
  opacity: 0.5;
}

.empty-hint {
  font-size: 0.875rem;
  opacity: 0.7;
}

/* Archive List */
.archive-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.archive-month {
  background: var(--white);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.month-header {
  display: flex;
  align-items: center;
  padding: var(--space-md);
  cursor: pointer;
  transition: background 0.2s;
}

.month-header:hover {
  background: var(--gray-50);
}

.month-info {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex: 1;
}

.month-icon {
  font-size: 1.5rem;
}

.month-label {
  font-weight: 600;
  color: var(--text-primary);
}

.month-meta {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.month-summary {
  display: flex;
  gap: var(--space-lg);
  margin-right: var(--space-md);
}

.summary-item {
  text-align: right;
}

.summary-label {
  display: block;
  font-size: 0.625rem;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.summary-value {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.875rem;
}

.summary-item.income .summary-value {
  color: var(--income-color);
}

.summary-item.expense .summary-value {
  color: var(--expense-color);
}

.month-expand {
  color: var(--text-secondary);
  font-size: 0.75rem;
}

/* Transactions */
.month-transactions {
  border-top: 1px solid var(--border-color);
  background: var(--gray-50);
}

.transactions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-sm) var(--space-md);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.delete-btn {
  color: #ef4444 !important;
  font-size: 0.7rem !important;
}

.transaction-list {
  max-height: 400px;
  overflow-y: auto;
}

.transaction-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--border-color);
}

.transaction-item:last-child {
  border-bottom: none;
}

.tx-icon {
  font-size: 1.25rem;
}

.tx-info {
  flex: 1;
  min-width: 0;
}

.tx-note {
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tx-meta {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.tx-amount {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.tx-amount.income {
  color: var(--income-color);
}

.tx-amount.expense {
  color: var(--expense-color);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-md);
}

.modal {
  background: var(--white);
  border-radius: var(--radius-xl);
  width: 100%;
  max-width: 450px;
  animation: modal-pop 0.2s ease;
}

@keyframes modal-pop {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md);
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.125rem;
}

.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: var(--gray-100);
  border-radius: var(--radius-full);
  font-size: 1.25rem;
  cursor: pointer;
}

.import-info {
  padding: var(--space-md);
  background: #ecfdf5;
  border-left: 4px solid #10b981;
}

.import-info p {
  margin: 0 0 var(--space-xs);
  color: #065f46;
  font-size: 0.875rem;
}

.info-note {
  font-size: 0.75rem !important;
  opacity: 0.8;
}

.import-preview {
  padding: var(--space-md);
}

.preview-stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: var(--space-md);
}

.stat {
  text-align: center;
}

.stat-number {
  display: block;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.125rem;
}

.stat.income .stat-number {
  color: var(--income-color);
}

.stat.expense .stat-number {
  color: var(--expense-color);
}

.stat-label {
  font-size: 0.7rem;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.label-input {
  margin-top: var(--space-md);
}

.label-input label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: var(--space-xs);
}

.modal-actions {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-md);
  border-top: 1px solid var(--border-color);
  justify-content: flex-end;
}

/* Mobile */
@media (max-width: 600px) {
  .month-summary {
    display: none;
  }
}
</style>

<style>
/* Dark mode */
[data-theme="dark"] .archive-month {
  background: #2D2640 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .month-header:hover {
  background: #3D3456 !important;
}

[data-theme="dark"] .month-label {
  color: #E5E5E5 !important;
}

[data-theme="dark"] .month-transactions {
  background: #1A1625 !important;
}

[data-theme="dark"] .transaction-item {
  border-color: #3D3456 !important;
}

[data-theme="dark"] .modal {
  background: #1A1625 !important;
}

[data-theme="dark"] .modal-header {
  border-color: #3D3456 !important;
}

[data-theme="dark"] .modal-close {
  background: #2D2640 !important;
  color: #9D8BC2 !important;
}

[data-theme="dark"] .import-info {
  background: rgba(16, 185, 129, 0.1) !important;
}

[data-theme="dark"] .import-info p {
  color: #6ee7b7 !important;
}

[data-theme="dark"] .modal-actions {
  border-color: #3D3456 !important;
}
</style>
