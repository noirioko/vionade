<script setup>
import { ref, computed } from 'vue'
import { useFinanceStore } from '../../stores'
import { useToast } from '../../composables/useToast'

const store = useFinanceStore()
const toast = useToast()

const editingWallet = ref(null)
const newBalance = ref('')
const newAccountNumber = ref('')

// Import state
const showImportModal = ref(false)
const importPreview = ref([])
const importStartingBalances = ref([])
const importStats = ref({ total: 0, new: 0, duplicates: 0, startingBalances: 0 })
const isImporting = ref(false)
const forceImportAll = ref(false)

// Clear data state
const showClearConfirm = ref(false)
const clearConfirmText = ref('')
const walletToClear = ref(null)

// Start Fresh state
const showStartFresh = ref(false)
const freshBalances = ref({
  bca: '',
  ovo: '',
  gopay: '',
  cash: '',
  bri: '',
  dana: '',
  shopeepay: '',
  tokopedia: '',
  danamon: '',
  paypal: '',
})
const freshConfirmText = ref('')

const needsSetup = computed(() => {
  return store.wallets.value.every(w => w.balance === 0)
})

function startEdit(wallet) {
  editingWallet.value = wallet.id
  newBalance.value = wallet.balance.toString()
  newAccountNumber.value = wallet.accountNumber || ''
}

async function saveBalance(walletId) {
  const balance = parseFloat(newBalance.value) || 0

  // Pause sync to prevent Firebase from overwriting
  store.pauseSync()

  store.updateWalletBalance(walletId, balance)
  store.updateWalletAccountNumber(walletId, newAccountNumber.value)

  // Save immediately
  await store.saveToFirebase()

  // Resume sync after delay
  setTimeout(() => store.resumeSync(), 3000)

  editingWallet.value = null
  newBalance.value = ''
  newAccountNumber.value = ''
  toast.success('Balance saved!')
}

function cancelEdit() {
  editingWallet.value = null
  newBalance.value = ''
  newAccountNumber.value = ''
}

function getWalletTransactions(walletId) {
  return store.transactions.value.filter(t =>
    t.walletId === walletId || t.toWalletId === walletId
  ).length
}

function recalculateBalance(wallet) {
  const oldBalance = wallet.balance
  const newBalance = store.recalculateWalletBalance(wallet.id)
  const diff = newBalance - oldBalance

  if (diff === 0) {
    toast.info(`${wallet.name} balance is already correct!`)
  } else {
    const diffStr = store.formatCurrency(Math.abs(diff))
    const direction = diff > 0 ? 'increased' : 'decreased'
    toast.success(`${wallet.name} ${direction} by ${diffStr}`)
  }
}

function fixAllBalances() {
  const results = store.fixAllWalletBalances()
  const changed = results.filter(r => r.changed)

  if (changed.length === 0) {
    toast.success('All wallet balances are already clean!')
  } else {
    toast.success(`Fixed ${changed.length} wallet(s) with floating point errors`)
  }

  // Show what starting balances were calculated
  console.log('Wallet fix results:', results)
}

// CSV Import functions
function handleFileSelect(event) {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    parseCSV(e.target.result)
  }
  reader.readAsText(file)

  // Reset input so same file can be selected again
  event.target.value = ''
}

function parseCSV(csvText) {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) {
    toast.error('CSV file is empty or invalid')
    return
  }

  // Parse header
  const header = lines[0].split(',').map(h => h.trim().toLowerCase())
  const dateIdx = header.findIndex(h => h === 'date')
  const typeIdx = header.findIndex(h => h === 'type')
  const categoryIdx = header.findIndex(h => h === 'category')
  const amountIdx = header.findIndex(h => h === 'amount')
  const walletIdx = header.findIndex(h => h === 'wallet')
  const toWalletIdx = header.findIndex(h => h.includes('to wallet') || h === 'to_wallet')
  const noteIdx = header.findIndex(h => h === 'note')

  if (dateIdx === -1 || amountIdx === -1) {
    toast.error('CSV must have at least Date and Amount columns')
    return
  }

  const parsed = []
  const startingBalances = [] // Track starting balances
  const existingTx = store.transactions.value

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.startsWith('===')) break // Stop at summary section

    // Parse CSV line (handle commas in quoted strings)
    const values = parseCSVLine(line)

    const date = values[dateIdx]
    const type = (values[typeIdx] || 'expense').toLowerCase()
    const categoryName = values[categoryIdx] || ''
    const amount = Math.abs(parseFloat(values[amountIdx])) || 0
    const walletName = values[walletIdx] || ''
    const toWalletName = values[toWalletIdx] || ''
    const note = values[noteIdx] || ''

    if (!amount) continue

    // Find wallet ID by name
    const wallet = store.wallets.value.find(w =>
      w.name.toLowerCase() === walletName.toLowerCase()
    )

    // Check if this is a starting balance row
    if (type === 'starting' || type === 'starting balance' || type === 'start' ||
        note.toLowerCase().includes('starting balance') ||
        note.toLowerCase().includes('saldo awal')) {
      if (wallet) {
        startingBalances.push({
          walletId: wallet.id,
          walletName: wallet.name,
          amount: amount,
          isStartingBalance: true
        })
      }
      continue // Don't add as transaction
    }

    if (!date) continue

    const toWallet = toWalletName ? store.wallets.value.find(w =>
      w.name.toLowerCase() === toWalletName.toLowerCase()
    ) : null

    // Find category ID by name
    const category = store.EXPENSE_CATEGORIES.find(c =>
      c.name.toLowerCase() === categoryName.toLowerCase()
    ) || store.INCOME_CATEGORIES.find(c =>
      c.name.toLowerCase() === categoryName.toLowerCase()
    )

    // Check if this transaction already exists (same date, amount, wallet, and type)
    const isDuplicate = existingTx.some(t => {
      const tDate = new Date(t.date).toISOString().split('T')[0]
      const sameDate = tDate === date
      const sameAmount = Math.abs(t.amount - amount) < 1
      const sameWallet = t.walletId === (wallet?.id || 'bca')
      const sameType = t.type === type
      // Must match date + amount + wallet + type to be considered duplicate
      return sameDate && sameAmount && sameWallet && sameType
    })

    parsed.push({
      date,
      type: type,
      category: category?.id || 'other',
      categoryName: category?.name || categoryName || 'Other',
      amount,
      walletId: wallet?.id || 'bca',
      walletName: wallet?.name || walletName || 'BCA',
      toWalletId: toWallet?.id || null,
      toWalletName: toWallet?.name || toWalletName || '',
      note,
      isDuplicate
    })
  }

  importPreview.value = parsed
  importStartingBalances.value = startingBalances
  importStats.value = {
    total: parsed.length,
    new: parsed.filter(p => !p.isDuplicate).length,
    duplicates: parsed.filter(p => p.isDuplicate).length,
    startingBalances: startingBalances.length
  }
  showImportModal.value = true
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

async function confirmImport() {
  isImporting.value = true
  let imported = 0

  // PAUSE Firebase sync completely during import
  store.pauseSync()

  // First, set starting balances
  importStartingBalances.value.forEach(sb => {
    console.log('Setting starting balance:', sb.walletName, sb.amount)
    store.updateWalletBalance(sb.walletId, sb.amount)
  })

  // Then import transactions
  importPreview.value.forEach(tx => {
    // Import if not duplicate, OR if forceImportAll is enabled
    if (!tx.isDuplicate || forceImportAll.value) {
      console.log('Importing:', tx.date, tx.type, tx.amount, tx.walletId, tx.note)
      store.addTransaction({
        date: tx.date,
        type: tx.type,
        category: tx.category,
        amount: tx.amount,
        walletId: tx.walletId,
        toWalletId: tx.toWalletId,
        note: tx.note
      })
      imported++
    }
  })

  // Log total transactions after import
  console.log('=== IMPORT COMPLETE ===')
  console.log('Imported:', imported, 'transactions')
  console.log('Total transactions now:', store.transactions.value.length)
  console.log('Force import enabled:', forceImportAll.value)

  // Force save to Firebase immediately
  console.log('Saving to Firebase...')
  try {
    await store.saveToFirebase()
    console.log('SUCCESS: Saved to Firebase!')
    console.log('Transactions after save:', store.transactions.value.length)
  } catch (err) {
    console.error('FAILED to save to Firebase:', err)
  }

  // Resume sync after a delay to let Firebase propagate
  setTimeout(() => {
    store.resumeSync()
  }, 5000)

  isImporting.value = false
  showImportModal.value = false

  const sbCount = importStartingBalances.value.length
  if (sbCount > 0 && imported > 0) {
    toast.success(`Set ${sbCount} starting balance(s) & imported ${imported} transaction(s)!`)
  } else if (sbCount > 0) {
    toast.success(`Set ${sbCount} starting balance(s)!`)
  } else {
    toast.success(`Imported ${imported} new transaction(s)!`)
  }

  // Clear preview
  importPreview.value = []
  importStartingBalances.value = []
  importStats.value = { total: 0, new: 0, duplicates: 0, startingBalances: 0 }
  forceImportAll.value = false
}

function cancelImport() {
  showImportModal.value = false
  importPreview.value = []
  importStartingBalances.value = []
  importStats.value = { total: 0, new: 0, duplicates: 0, startingBalances: 0 }
  forceImportAll.value = false
}

// Clear transactions for specific wallet
function openClearWallet(wallet) {
  walletToClear.value = wallet
  clearConfirmText.value = ''
  showClearConfirm.value = true
}

async function confirmClearWallet() {
  if (clearConfirmText.value.toLowerCase() !== 'delete') {
    toast.error('Please type "delete" to confirm')
    return
  }

  if (!walletToClear.value) return

  // PAUSE Firebase sync completely during clear
  store.pauseSync()

  const deleted = store.clearWalletTransactions(walletToClear.value.id)

  // Force save to Firebase immediately
  try {
    await store.saveToFirebase()
    console.log('Cleared and saved to Firebase!')
  } catch (err) {
    console.error('Failed to save to Firebase:', err)
  }

  // Resume sync after a delay
  setTimeout(() => {
    store.resumeSync()
  }, 5000)

  showClearConfirm.value = false
  clearConfirmText.value = ''
  toast.success(`Cleared ${deleted} transaction(s) from ${walletToClear.value.name}!`)
  walletToClear.value = null
}

// Start Fresh - clear everything and set new opening balances
async function confirmStartFresh() {
  if (freshConfirmText.value.toLowerCase() !== 'fresh') {
    toast.error('Please type "fresh" to confirm')
    return
  }

  // Build balances object from inputs
  const balances = {}
  Object.entries(freshBalances.value).forEach(([walletId, balance]) => {
    const numBalance = parseFloat(balance) || 0
    if (numBalance > 0) {
      balances[walletId] = numBalance
    }
  })

  // Pause sync
  store.pauseSync()

  // Start fresh
  store.startFreshMonth(balances)

  // Save to Firebase
  try {
    await store.saveToFirebase()
    console.log('Started fresh and saved to Firebase!')
  } catch (err) {
    console.error('Failed to save to Firebase:', err)
  }

  // Resume sync after delay
  setTimeout(() => store.resumeSync(), 5000)

  showStartFresh.value = false
  freshConfirmText.value = ''
  // Reset form
  Object.keys(freshBalances.value).forEach(k => freshBalances.value[k] = '')

  toast.success('Started fresh! Your February journey begins now 🍋')
}

function getWalletTransactionCount(walletId) {
  return store.transactions.value.filter(t =>
    t.walletId === walletId || t.toWalletId === walletId
  ).length
}

function exportToCSV() {
  // Build transactions CSV
  const headers = ['Date', 'Type', 'Category', 'Amount', 'Wallet', 'To Wallet', 'Note', 'Wallet Balance Effect']
  const rows = store.transactions.value
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(t => {
      const wallet = store.getWalletById(t.walletId)
      const toWallet = t.toWalletId ? store.getWalletById(t.toWalletId) : null
      const cat = store.getCategoryById(t.category, t.type === 'income' ? 'income' : 'expense')

      let effect = ''
      if (t.type === 'income') effect = `+${t.amount}`
      else if (t.type === 'expense') effect = `-${t.amount}`
      else if (t.type === 'transfer') effect = `${wallet?.name}: -${t.amount}, ${toWallet?.name}: +${t.amount}`

      return [
        new Date(t.date).toLocaleDateString('en-CA'), // YYYY-MM-DD format
        t.type,
        cat?.name || t.category || '',
        t.amount,
        wallet?.name || '',
        toWallet?.name || '',
        (t.note || '').replace(/,/g, ';'), // escape commas
        effect
      ]
    })

  // Add wallet summary at the end
  rows.push([])
  rows.push(['=== WALLET SUMMARY ==='])
  rows.push(['Wallet', 'Stored Balance', 'Calculated Balance', 'Difference'])

  store.wallets.value.forEach(wallet => {
    // Calculate what balance SHOULD be
    let calculated = 0
    store.transactions.value.forEach(t => {
      if (t.walletId === wallet.id) {
        if (t.type === 'income') calculated += t.amount
        else if (t.type === 'expense') calculated -= t.amount
        else if (t.type === 'transfer') calculated -= t.amount
      }
      if (t.type === 'transfer' && t.toWalletId === wallet.id) {
        calculated += t.amount
      }
    })

    const diff = wallet.balance - calculated
    rows.push([wallet.name, wallet.balance, calculated, diff])
  })

  // Create CSV content
  const csvContent = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n')

  // Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `vionade-finance-export-${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(link.href)

  toast.success('Exported to CSV!')
}
</script>

<template>
  <div class="tab-content">
    <!-- Total Balance Card -->
    <div class="wallet-card section">
      <div class="wallet-card-content">
        <div class="wallet-card-label">Total Balance</div>
        <div class="wallet-card-amount">{{ store.formatCurrency(store.totalBalance.value) }}</div>
      </div>
      <img src="/images/vio_right.png" alt="" class="wallet-card-vio" />
    </div>

    <!-- Setup Hint -->
    <div v-if="needsSetup" class="setup-hint">
      <div class="setup-hint-icon">👋</div>
      <div class="setup-hint-content">
        <div class="setup-hint-title">First time? Set your starting balances!</div>
        <div class="setup-hint-text">Tap "Edit" on each wallet below to enter how much money you currently have. This helps track your finances accurately.</div>
      </div>
    </div>

    <!-- Wallet List -->
    <div class="section">
      <div class="section-header">
        <h3 class="section-title">All Wallets</h3>
      </div>

      <div class="list">
        <div
          v-for="wallet in store.wallets.value"
          :key="wallet.id"
          class="list-item"
          style="flex-wrap: wrap;"
        >
          <div
            class="list-item-icon"
            :style="{ background: wallet.color + '20' }"
          >
            {{ wallet.icon }}
          </div>
          <div class="list-item-content">
            <div class="list-item-title">{{ wallet.name }}</div>
            <div class="list-item-subtitle">
              <span v-if="wallet.accountNumber" class="account-number">{{ wallet.accountNumber }}</span>
              <span v-else>{{ getWalletTransactions(wallet.id) }} transactions</span>
            </div>
          </div>
          <div class="list-item-amount">
            <div v-if="editingWallet !== wallet.id">
              <div
                class="amount"
                :class="wallet.balance >= 0 ? 'amount-positive' : 'amount-negative'"
              >
                {{ store.formatCurrency(wallet.balance) }}
              </div>
              <div class="wallet-actions">
                <button
                  class="btn btn-ghost btn-sm"
                  @click="startEdit(wallet)"
                >
                  Edit
                </button>
                <button
                  class="btn btn-ghost btn-sm recalc-btn"
                  @click="recalculateBalance(wallet)"
                  title="Recalculate balance from all transactions"
                >
                  Recalc
                </button>
                <button
                  v-if="getWalletTransactionCount(wallet.id) > 0"
                  class="btn btn-ghost btn-sm clear-wallet-btn"
                  @click="openClearWallet(wallet)"
                  title="Clear all transactions for this wallet"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          <!-- Edit Mode -->
          <div
            v-if="editingWallet === wallet.id"
            class="edit-panel"
          >
            <div class="edit-row">
              <label class="edit-label">Balance</label>
              <input
                v-model="newBalance"
                type="number"
                class="input"
                placeholder="New balance"
              />
            </div>
            <div class="edit-row">
              <label class="edit-label">No. Rekening</label>
              <input
                v-model="newAccountNumber"
                type="text"
                class="input"
                placeholder="e.g. 1234567890"
                @keyup.enter="saveBalance(wallet.id)"
              />
            </div>
            <div class="edit-actions">
              <button class="btn btn-primary" @click="saveBalance(wallet.id)">Save</button>
              <button class="btn btn-secondary" @click="cancelEdit">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Info Card -->
    <div v-if="!needsSetup" class="card text-center" style="background: var(--lavender-50);">
      <div style="font-size: 1.5rem; margin-bottom: var(--space-sm);">💡</div>
      <p class="text-sm text-muted">
        Tap "Edit" to manually adjust balance, or "Recalc" to recalculate from all transactions.
        Use Recalc if your balance doesn't match your bank statement!
      </p>
    </div>

    <!-- Tools Section -->
    <div class="export-section">
      <div class="tools-buttons">
        <button class="btn btn-primary fix-btn" @click="fixAllBalances">
          🔧 Fix Balances
        </button>
        <button class="btn btn-secondary export-btn" @click="exportToCSV">
          📊 Export
        </button>
        <label class="btn btn-secondary import-btn">
          📥 Import
          <input type="file" accept=".csv" @change="handleFileSelect" hidden />
        </label>
      </div>
      <p class="export-hint">
        <strong>Fix:</strong> Rounds balances • <strong>Export:</strong> Download CSV • <strong>Import:</strong> Add from CSV
      </p>

      <!-- Start Fresh Button -->
      <div class="start-fresh-section">
        <button class="btn btn-fresh" @click="showStartFresh = true">
          🌱 Start Fresh Month
        </button>
        <p class="fresh-hint">Clear all transactions and set new opening balances</p>
      </div>
    </div>

    <!-- Import Preview Modal -->
    <div v-if="showImportModal" class="import-modal-overlay" @click.self="cancelImport">
      <div class="import-modal">
        <div class="import-modal-header">
          <h3>📥 Import Preview</h3>
          <button class="import-modal-close" @click="cancelImport">&times;</button>
        </div>

        <div class="import-stats">
          <div class="import-stat">
            <span class="stat-number">{{ importStats.total }}</span>
            <span class="stat-label">Transactions</span>
          </div>
          <div class="import-stat stat-new">
            <span class="stat-number">{{ importStats.new }}</span>
            <span class="stat-label">New</span>
          </div>
          <div class="import-stat stat-dup">
            <span class="stat-number">{{ importStats.duplicates }}</span>
            <span class="stat-label">Skip</span>
          </div>
          <div v-if="importStats.startingBalances > 0" class="import-stat stat-balance">
            <span class="stat-number">{{ importStats.startingBalances }}</span>
            <span class="stat-label">Balances</span>
          </div>
        </div>

        <!-- Force Import Option -->
        <div v-if="importStats.duplicates > 0" class="force-import-option">
          <label class="force-checkbox">
            <input type="checkbox" v-model="forceImportAll" />
            <span class="checkbox-text">
              Force import ALL {{ importStats.total }} transactions
              <span class="checkbox-hint">(ignores duplicate detection - use after clearing wallet)</span>
            </span>
          </label>
        </div>

        <!-- Starting Balances Preview -->
        <div v-if="importStartingBalances.length > 0" class="starting-balances-preview">
          <div class="sb-header">💰 Starting Balances to Set:</div>
          <div v-for="sb in importStartingBalances" :key="sb.walletId" class="sb-item">
            <span class="sb-wallet">{{ sb.walletName }}</span>
            <span class="sb-amount">{{ store.formatCurrency(sb.amount) }}</span>
          </div>
        </div>

        <div class="import-preview-list">
          <div
            v-for="(tx, idx) in importPreview.slice(0, 50)"
            :key="idx"
            class="import-preview-item"
            :class="{ duplicate: tx.isDuplicate }"
          >
            <div class="import-preview-status">
              <span v-if="tx.isDuplicate" class="status-dup">SKIP</span>
              <span v-else class="status-new">NEW</span>
            </div>
            <div class="import-preview-info">
              <div class="import-preview-date">{{ tx.date }}</div>
              <div class="import-preview-note">{{ tx.note || tx.categoryName }}</div>
              <div class="import-preview-meta">{{ tx.walletName }} • {{ tx.categoryName }}</div>
            </div>
            <div class="import-preview-amount" :class="tx.type">
              {{ tx.type === 'income' ? '+' : '-' }}{{ store.formatCurrency(tx.amount) }}
            </div>
          </div>
          <div v-if="importPreview.length > 50" class="import-preview-more">
            ...and {{ importPreview.length - 50 }} more
          </div>
        </div>

        <div class="import-modal-actions">
          <button class="btn btn-secondary" @click="cancelImport">Cancel</button>
          <button
            class="btn btn-primary"
            @click="confirmImport"
            :disabled="(importStats.new === 0 && !forceImportAll) || isImporting"
          >
            {{ isImporting ? 'Importing...' : `Import ${forceImportAll ? importStats.total : importStats.new} Transaction(s)` }}
          </button>
        </div>
      </div>
    </div>

    <!-- Clear Wallet Confirmation Modal -->
    <div v-if="showClearConfirm && walletToClear" class="import-modal-overlay" @click.self="showClearConfirm = false; walletToClear = null">
      <div class="import-modal clear-modal">
        <div class="import-modal-header">
          <h3>{{ walletToClear.icon }} Clear {{ walletToClear.name }}?</h3>
          <button class="import-modal-close" @click="showClearConfirm = false; walletToClear = null">&times;</button>
        </div>

        <div class="clear-warning">
          <p>This will delete:</p>
          <ul>
            <li>📝 {{ getWalletTransactionCount(walletToClear.id) }} transactions from {{ walletToClear.name }}</li>
            <li>💰 Reset {{ walletToClear.name }} balance to Rp 0</li>
          </ul>
          <p class="warning-safe">✅ Your other wallets, pets, media, collections - ALL SAFE!</p>
        </div>

        <div class="clear-confirm-input">
          <label>Type <strong>"delete"</strong> to confirm:</label>
          <input
            v-model="clearConfirmText"
            type="text"
            class="input"
            placeholder="delete"
            @keyup.enter="confirmClearWallet"
          />
        </div>

        <div class="import-modal-actions">
          <button class="btn btn-secondary" @click="showClearConfirm = false; clearConfirmText = ''; walletToClear = null">Cancel</button>
          <button
            class="btn btn-danger"
            @click="confirmClearWallet"
            :disabled="clearConfirmText.toLowerCase() !== 'delete'"
          >
            🗑️ Clear {{ walletToClear.name }}
          </button>
        </div>
      </div>
    </div>

    <!-- Start Fresh Modal -->
    <div v-if="showStartFresh" class="import-modal-overlay" @click.self="showStartFresh = false">
      <div class="import-modal fresh-modal">
        <div class="import-modal-header fresh-header">
          <h3>🌱 Start Fresh Month</h3>
          <button class="import-modal-close" @click="showStartFresh = false">&times;</button>
        </div>

        <div class="fresh-info">
          <p>This will clear ALL transactions and set new opening balances.</p>
          <p class="fresh-tip">💡 Enter your ACTUAL current wallet balances from your bank apps</p>
        </div>

        <div class="fresh-balances">
          <div class="fresh-balance-row">
            <label>🏦 BCA</label>
            <input v-model="freshBalances.bca" type="number" class="input" placeholder="e.g. 1696289" />
          </div>
          <div class="fresh-balance-row">
            <label>💜 OVO</label>
            <input v-model="freshBalances.ovo" type="number" class="input" placeholder="e.g. 179618" />
          </div>
          <div class="fresh-balance-row">
            <label>🩵 GoPay</label>
            <input v-model="freshBalances.gopay" type="number" class="input" placeholder="e.g. 272868" />
          </div>
          <div class="fresh-balance-row">
            <label>💵 Cash</label>
            <input v-model="freshBalances.cash" type="number" class="input" placeholder="e.g. 100000" />
          </div>
          <div class="fresh-balance-row">
            <label>🏛️ BRI</label>
            <input v-model="freshBalances.bri" type="number" class="input" placeholder="Optional" />
          </div>
          <div class="fresh-balance-row">
            <label>💙 DANA</label>
            <input v-model="freshBalances.dana" type="number" class="input" placeholder="Optional" />
          </div>
        </div>

        <div class="clear-confirm-input">
          <label>Type <strong>"fresh"</strong> to confirm:</label>
          <input
            v-model="freshConfirmText"
            type="text"
            class="input"
            placeholder="fresh"
            @keyup.enter="confirmStartFresh"
          />
        </div>

        <div class="import-modal-actions">
          <button class="btn btn-secondary" @click="showStartFresh = false; freshConfirmText = ''">Cancel</button>
          <button
            class="btn btn-fresh"
            @click="confirmStartFresh"
            :disabled="freshConfirmText.toLowerCase() !== 'fresh'"
          >
            🌱 Start Fresh
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.setup-hint {
  display: flex;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: linear-gradient(135deg, var(--lavender-100) 0%, var(--lavender-50) 100%);
  border: 2px solid var(--lavender-300);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-md);
}

.setup-hint-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.setup-hint-content { flex: 1; }

.setup-hint-title {
  font-weight: 600;
  color: var(--lavender-700);
  margin-bottom: var(--space-xs);
}

.setup-hint-text {
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.account-number {
  font-family: monospace;
  font-size: 0.8rem;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

.edit-panel {
  width: 100%;
  margin-top: var(--space-md);
  padding: var(--space-md);
  background: var(--gray-50);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.edit-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.edit-label {
  width: 90px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.edit-row .input { flex: 1; }

.edit-actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
  margin-top: var(--space-xs);
}

.wallet-actions {
  display: flex;
  gap: var(--space-xs);
  margin-top: var(--space-sm);
}

.recalc-btn {
  font-size: 0.7rem !important;
  opacity: 0.7;
}

.recalc-btn:hover {
  opacity: 1;
}

.clear-wallet-btn {
  font-size: 0.7rem !important;
  opacity: 0.6;
  color: #ef4444 !important;
}

.clear-wallet-btn:hover {
  opacity: 1;
  background: rgba(239, 68, 68, 0.1) !important;
}

.hint-secondary {
  opacity: 0.7;
  font-size: 0.6875rem;
}

.export-section {
  margin-top: var(--space-lg);
  text-align: center;
  padding: var(--space-md);
  border-top: 1px solid var(--border-color);
}

.tools-buttons {
  display: flex;
  gap: var(--space-sm);
  justify-content: center;
  flex-wrap: wrap;
}

.fix-btn, .export-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
}

.export-hint {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: var(--space-sm);
}

/* Start Fresh Section */
.start-fresh-section {
  margin-top: var(--space-lg);
  padding-top: var(--space-md);
  border-top: 1px dashed var(--gray-300);
  text-align: center;
}

.btn-fresh {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border: none;
  padding: var(--space-sm) var(--space-lg);
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-fresh:hover {
  background: linear-gradient(135deg, #059669, #047857);
  transform: translateY(-1px);
}

.btn-fresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.fresh-hint {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: var(--space-xs);
}

/* Fresh Modal */
.fresh-modal {
  max-width: 450px;
}

.fresh-header {
  background: linear-gradient(135deg, #d1fae5, #a7f3d0);
}

.fresh-info {
  padding: var(--space-md);
  background: #ecfdf5;
  border-left: 4px solid #10b981;
}

.fresh-info p {
  margin: 0 0 var(--space-xs);
  color: #065f46;
  font-size: 0.875rem;
}

.fresh-tip {
  font-weight: 600;
}

.fresh-balances {
  padding: var(--space-md);
  max-height: 250px;
  overflow-y: auto;
}

.fresh-balance-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.fresh-balance-row label {
  width: 80px;
  font-size: 0.875rem;
  font-weight: 600;
  flex-shrink: 0;
}

.fresh-balance-row .input {
  flex: 1;
}

.import-btn {
  cursor: pointer;
}

/* Import Modal */
.import-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-md);
}

.import-modal {
  background: var(--white);
  border-radius: var(--radius-xl);
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  animation: modal-pop 0.2s ease;
}

@keyframes modal-pop {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.import-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md);
  border-bottom: 1px solid var(--border-color);
}

.import-modal-header h3 {
  margin: 0;
  font-size: 1.125rem;
}

.import-modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: var(--gray-100);
  border-radius: var(--radius-full);
  font-size: 1.25rem;
  cursor: pointer;
  color: var(--gray-500);
}

.import-stats {
  display: flex;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--gray-50);
  justify-content: center;
}

.import-stat {
  text-align: center;
}

.stat-number {
  display: block;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.5rem;
  color: var(--gray-700);
}

.stat-new .stat-number { color: var(--income-color); }
.stat-dup .stat-number { color: var(--gray-400); }
.stat-balance .stat-number { color: #f59e0b; }

/* Starting Balances Preview */
.starting-balances-preview {
  background: #fef9c3;
  border-left: 4px solid #f59e0b;
  padding: var(--space-sm) var(--space-md);
  margin: 0 var(--space-sm);
  border-radius: var(--radius-md);
}

.sb-header {
  font-weight: 700;
  font-size: 0.8125rem;
  color: #92400e;
  margin-bottom: var(--space-xs);
}

.sb-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.8125rem;
  padding: var(--space-xs) 0;
}

.sb-wallet {
  color: #78350f;
}

.sb-amount {
  font-family: var(--font-display);
  font-weight: 700;
  color: #b45309;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--gray-500);
}

/* Force Import Option */
.force-import-option {
  padding: var(--space-sm) var(--space-md);
  background: #fef3c7;
  border-left: 4px solid #f59e0b;
}

.force-checkbox {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  cursor: pointer;
}

.force-checkbox input {
  margin-top: 2px;
  width: 18px;
  height: 18px;
  accent-color: #f59e0b;
}

.checkbox-text {
  font-size: 0.875rem;
  font-weight: 600;
  color: #92400e;
}

.checkbox-hint {
  display: block;
  font-size: 0.75rem;
  font-weight: normal;
  color: #b45309;
  margin-top: 2px;
}

.import-preview-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-sm);
  max-height: 300px;
}

.import-preview-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-xs);
  background: var(--white);
  border: 1px solid var(--border-color);
}

.import-preview-item.duplicate {
  opacity: 0.5;
  background: var(--gray-50);
}

.import-preview-status {
  flex-shrink: 0;
}

.status-new {
  background: var(--income-color);
  color: white;
  font-size: 0.625rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.status-dup {
  background: var(--gray-300);
  color: var(--gray-600);
  font-size: 0.625rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.import-preview-info {
  flex: 1;
  min-width: 0;
}

.import-preview-date {
  font-size: 0.6875rem;
  color: var(--gray-400);
}

.import-preview-note {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--gray-700);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.import-preview-meta {
  font-size: 0.6875rem;
  color: var(--gray-400);
}

.import-preview-amount {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.8125rem;
  flex-shrink: 0;
}

.import-preview-amount.income { color: var(--income-color); }
.import-preview-amount.expense { color: var(--expense-color); }

.import-preview-more {
  text-align: center;
  color: var(--gray-400);
  font-size: 0.75rem;
  padding: var(--space-sm);
}

.import-modal-actions {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-md);
  border-top: 1px solid var(--border-color);
  justify-content: flex-end;
}

/* Danger Zone */
.danger-zone {
  margin-top: var(--space-lg);
  padding-top: var(--space-md);
  border-top: 1px dashed var(--gray-300);
}

.btn-danger-outline {
  background: transparent;
  border: 2px solid #ef4444;
  color: #ef4444;
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-danger-outline:hover {
  background: #ef4444;
  color: white;
}

.btn-danger {
  background: #ef4444;
  border: none;
  color: white;
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
}

.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Clear Modal */
.clear-modal {
  max-width: 400px;
}

.clear-warning {
  padding: var(--space-md);
  background: #fef2f2;
  border-left: 4px solid #ef4444;
}

.clear-warning p {
  margin: 0 0 var(--space-sm);
  font-weight: 600;
  color: #991b1b;
}

.clear-warning ul {
  margin: 0 0 var(--space-sm);
  padding-left: var(--space-lg);
  color: #7f1d1d;
}

.clear-warning li {
  margin-bottom: var(--space-xs);
}

.warning-note {
  font-size: 0.75rem;
  color: #6b7280 !important;
  font-weight: normal !important;
}

.warning-safe {
  font-size: 0.8125rem;
  color: #059669 !important;
  font-weight: 600 !important;
  background: #d1fae5;
  padding: var(--space-sm);
  border-radius: var(--radius-md);
  margin-top: var(--space-sm);
}

.clear-confirm-input {
  padding: var(--space-md);
}

.clear-confirm-input label {
  display: block;
  font-size: 0.875rem;
  margin-bottom: var(--space-sm);
  color: var(--gray-600);
}

.clear-confirm-input .input {
  width: 100%;
}
</style>

<style>
/* Dark mode */
[data-theme="dark"] .setup-hint {
  background: linear-gradient(135deg, var(--lavender-900) 0%, rgba(139, 92, 246, 0.1) 100%) !important;
  border-color: var(--lavender-600) !important;
}

[data-theme="dark"] .setup-hint-title {
  color: var(--lavender-300) !important;
}

[data-theme="dark"] .edit-panel {
  background: #2D2640 !important;
}

[data-theme="dark"] .import-modal {
  background: #1A1625 !important;
}

[data-theme="dark"] .import-modal-header {
  border-color: #3D3456 !important;
}

[data-theme="dark"] .import-modal-close {
  background: #2D2640 !important;
  color: #9D8BC2 !important;
}

[data-theme="dark"] .import-stats {
  background: #2D2640 !important;
}

[data-theme="dark"] .stat-number {
  color: #E5E5E5 !important;
}

[data-theme="dark"] .import-preview-item {
  background: #2D2640 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .import-preview-item.duplicate {
  background: #1A1625 !important;
}

[data-theme="dark"] .import-preview-note {
  color: #E5E5E5 !important;
}

[data-theme="dark"] .import-modal-actions {
  border-color: #3D3456 !important;
}

[data-theme="dark"] .danger-zone {
  border-color: #4D4466 !important;
}

[data-theme="dark"] .clear-warning {
  background: rgba(239, 68, 68, 0.1) !important;
}

[data-theme="dark"] .clear-warning p {
  color: #fca5a5 !important;
}

[data-theme="dark"] .clear-warning ul {
  color: #fecaca !important;
}

[data-theme="dark"] .warning-note {
  color: #9D8BC2 !important;
}

[data-theme="dark"] .clear-confirm-input label {
  color: #9D8BC2 !important;
}

[data-theme="dark"] .warning-safe {
  background: rgba(5, 150, 105, 0.2) !important;
  color: #6ee7b7 !important;
}

[data-theme="dark"] .clear-wallet-btn {
  color: #f87171 !important;
}

[data-theme="dark"] .clear-wallet-btn:hover {
  background: rgba(239, 68, 68, 0.2) !important;
}

[data-theme="dark"] .starting-balances-preview {
  background: rgba(245, 158, 11, 0.15) !important;
}

[data-theme="dark"] .sb-header {
  color: #fbbf24 !important;
}

[data-theme="dark"] .sb-wallet {
  color: #fcd34d !important;
}

[data-theme="dark"] .sb-amount {
  color: #fbbf24 !important;
}

[data-theme="dark"] .force-import-option {
  background: rgba(245, 158, 11, 0.15) !important;
}

[data-theme="dark"] .checkbox-text {
  color: #fbbf24 !important;
}

[data-theme="dark"] .checkbox-hint {
  color: #fcd34d !important;
}

/* Start Fresh Dark Mode */
[data-theme="dark"] .start-fresh-section {
  border-color: #4D4466 !important;
}

[data-theme="dark"] .fresh-header {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.2)) !important;
}

[data-theme="dark"] .fresh-info {
  background: rgba(16, 185, 129, 0.1) !important;
}

[data-theme="dark"] .fresh-info p {
  color: #6ee7b7 !important;
}

[data-theme="dark"] .fresh-balance-row label {
  color: #E5E5E5 !important;
}
</style>
