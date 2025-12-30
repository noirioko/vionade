<script setup>
import { ref } from 'vue'
import { useFinanceStore } from '../stores/finance'
import { signInWithGoogle, signOutUser } from '../firebase'

const store = useFinanceStore()
const showClearConfirm = ref(false)
const showExportSuccess = ref(false)
const isSigningIn = ref(false)
const showTargetsModal = ref(false)
const showGoalModal = ref(false)

// Target editing
const targetForm = ref({
  monthlyIncome: 0,
  monthlyExpense: 0,
  monthlySavings: 0,
})

// Goal editing
const goalForm = ref({
  name: '',
  target: 0,
})

function openTargetsModal() {
  targetForm.value = {
    monthlyIncome: store.settings.value.targets?.monthlyIncome || 0,
    monthlyExpense: store.settings.value.targets?.monthlyExpense || 0,
    monthlySavings: store.settings.value.targets?.monthlySavings || 0,
  }
  showTargetsModal.value = true
}

function saveTargets() {
  store.setMonthlyTargets(
    parseFloat(targetForm.value.monthlyIncome) || 0,
    parseFloat(targetForm.value.monthlyExpense) || 0,
    parseFloat(targetForm.value.monthlySavings) || 0
  )
  showTargetsModal.value = false
}

function openGoalModal() {
  goalForm.value = {
    name: store.settings.value.lifetimeGoal?.name || 'House Fund',
    target: store.settings.value.lifetimeGoal?.target || 0,
  }
  showGoalModal.value = true
}

function saveGoal() {
  store.setLifetimeGoal(
    goalForm.value.name || 'House Fund',
    parseFloat(goalForm.value.target) || 0
  )
  showGoalModal.value = false
}

async function handleGoogleSignIn() {
  isSigningIn.value = true
  try {
    await signInWithGoogle()
  } catch (error) {
    console.error('Sign in error:', error)
    alert('Failed to sign in. Please try again.')
  } finally {
    isSigningIn.value = false
  }
}

async function handleSignOut() {
  try {
    await signOutUser()
  } catch (error) {
    console.error('Sign out error:', error)
  }
}

function exportData() {
  const data = {
    wallets: store.wallets.value,
    transactions: store.transactions.value,
    settings: store.settings.value,
    exportedAt: new Date().toISOString(),
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `vionade-backup-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)

  showExportSuccess.value = true
  setTimeout(() => {
    showExportSuccess.value = false
  }, 3000)
}

function importData(event) {
  const file = event.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result)
      if (data.wallets) {
        store.state.wallets = data.wallets
      }
      if (data.transactions) {
        store.state.transactions = data.transactions
      }
      if (data.settings) {
        store.state.settings = data.settings
      }
      alert('Data imported successfully!')
    } catch (err) {
      alert('Failed to import data. Please check the file format.')
    }
  }
  reader.readAsText(file)
}

async function clearAllData() {
  await store.resetAllData()
  showClearConfirm.value = false
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <img src="/images/vio-logo.png" alt="Vionade" class="page-header-logo" />
    </div>

    <!-- App Info -->
    <div class="card section text-center app-info-card">
      <img src="/images/vio_sit.png" alt="Vio" class="app-info-vio" />
      <h2 style="margin-bottom: var(--space-xs);">Vionade</h2>
      <p class="text-sm text-muted">Your kawaii finance tracker</p>
      <p class="text-xs text-muted mt-sm">Made with 💜 for you</p>
    </div>

    <!-- Appearance -->
    <div class="section">
      <div class="section-header">
        <h3 class="section-title">Appearance</h3>
      </div>
      <div class="card">
        <div class="theme-toggle">
          <div class="theme-info">
            <span class="theme-icon">{{ store.settings.value.theme === 'dark' ? '🌙' : '☀️' }}</span>
            <div>
              <div class="font-bold text-sm">{{ store.settings.value.theme === 'dark' ? 'Night Mode' : 'Day Mode' }}</div>
              <div class="text-xs text-muted">{{ store.settings.value.theme === 'dark' ? 'Easy on the eyes' : 'Bright and cheerful' }}</div>
            </div>
          </div>
          <button class="toggle-btn" :class="{ active: store.settings.value.theme === 'dark' }" @click="store.toggleTheme()">
            <span class="toggle-slider"></span>
          </button>
        </div>
      </div>
    </div>

    <!-- Account & Sync -->
    <div class="card section">
      <div class="section-title mb-md">Account</div>

      <!-- Signed in state -->
      <div v-if="store.userEmail.value" style="display: flex; align-items: center; gap: var(--space-md); margin-bottom: var(--space-md);">
        <div
          style="
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: var(--lavender-100);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
          "
        >
          👤
        </div>
        <div style="flex: 1;">
          <div class="font-bold text-sm">{{ store.userEmail.value }}</div>
          <div class="text-xs text-muted">Signed in with Google</div>
        </div>
        <button class="btn btn-sm btn-ghost" @click="handleSignOut">
          Sign out
        </button>
      </div>

      <!-- Not signed in -->
      <div v-else style="margin-bottom: var(--space-md);">
        <button
          class="btn btn-secondary w-full"
          style="display: flex; align-items: center; justify-content: center; gap: var(--space-sm);"
          :disabled="isSigningIn"
          @click="handleGoogleSignIn"
        >
          <span style="font-size: 1.25rem;">🔐</span>
          {{ isSigningIn ? 'Signing in...' : 'Sign in with Google' }}
        </button>
        <p class="text-xs text-muted text-center mt-sm">Sign in to sync your data across devices</p>
      </div>

      <!-- Sync status -->
      <div style="display: flex; align-items: center; gap: var(--space-sm); padding-top: var(--space-md); border-top: 1px solid var(--lavender-100);">
        <div
          style="
            width: 10px;
            height: 10px;
            border-radius: 50%;
            flex-shrink: 0;
          "
          :style="{
            background: store.userId.value ? 'var(--income-color)' : 'var(--gray-400)',
            boxShadow: store.userId.value ? '0 0 6px var(--income-color)' : 'none'
          }"
        ></div>
        <div class="text-sm" style="flex: 1;">
          {{ store.userId.value ? 'Cloud sync active' : 'Offline mode' }}
        </div>
        <div v-if="store.isSyncing.value" class="text-xs text-muted">
          Syncing...
        </div>
      </div>
    </div>

    <!-- Data Management -->
    <div class="section">
      <div class="section-header">
        <h3 class="section-title">Data Management</h3>
      </div>

      <div class="list">
        <button class="list-item" @click="exportData">
          <div class="list-item-icon" style="background: rgba(125, 211, 168, 0.15);">
            📤
          </div>
          <div class="list-item-content">
            <div class="list-item-title">Export Data</div>
            <div class="list-item-subtitle">Download your data as JSON</div>
          </div>
        </button>

        <button class="list-item" @click="$refs.fileInput.click()">
          <div class="list-item-icon" style="background: rgba(163, 196, 245, 0.15);">
            📥
          </div>
          <div class="list-item-content">
            <div class="list-item-title">Import Data</div>
            <div class="list-item-subtitle">Restore from a backup file</div>
          </div>
        </button>
        <input
          ref="fileInput"
          type="file"
          accept=".json"
          style="display: none;"
          @change="importData"
        />

        <button
          class="list-item"
          @click="showClearConfirm = true"
        >
          <div class="list-item-icon" style="background: rgba(245, 163, 181, 0.15);">
            🗑️
          </div>
          <div class="list-item-content">
            <div class="list-item-title" style="color: var(--expense-color);">Clear All Data</div>
            <div class="list-item-subtitle">Reset everything to default</div>
          </div>
        </button>
      </div>
    </div>

    <!-- Goals & Targets -->
    <div class="section">
      <div class="section-header">
        <h3 class="section-title">Goals & Targets</h3>
      </div>

      <div class="list">
        <button class="list-item" @click="openTargetsModal">
          <div class="list-item-icon" style="background: rgba(125, 211, 168, 0.15);">
            🎯
          </div>
          <div class="list-item-content">
            <div class="list-item-title">Monthly Targets</div>
            <div class="list-item-subtitle">Set income, expense & savings goals</div>
          </div>
          <div class="list-item-amount">
            <span v-if="store.settings.value.targets?.monthlySavings" class="text-sm text-muted">
              {{ store.formatCurrency(store.settings.value.targets.monthlySavings) }}/mo
            </span>
          </div>
        </button>

        <button class="list-item" @click="openGoalModal">
          <div class="list-item-icon" style="background: rgba(245, 158, 11, 0.15);">
            🏠
          </div>
          <div class="list-item-content">
            <div class="list-item-title">{{ store.settings.value.lifetimeGoal?.name || 'House Fund' }}</div>
            <div class="list-item-subtitle">Lifetime savings goal</div>
          </div>
          <div class="list-item-amount">
            <span v-if="store.settings.value.lifetimeGoal?.target" class="text-sm text-muted">
              {{ store.formatCurrency(store.settings.value.lifetimeGoal.target) }}
            </span>
          </div>
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="section stats-section">
      <img src="/images/vio_right2.png" alt="" class="vio-peek" />
      <div class="section-header">
        <h3 class="section-title">Statistics</h3>
      </div>

      <div class="card">
        <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-md);">
          <span class="text-muted">Total Transactions</span>
          <span class="font-bold">{{ store.transactions.value.length }}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-md);">
          <span class="text-muted">Active Wallets</span>
          <span class="font-bold">{{ store.wallets.value.filter(w => w.balance !== 0).length }}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span class="text-muted">This Month Transactions</span>
          <span class="font-bold">{{ store.thisMonthTransactions.value.length }}</span>
        </div>
      </div>
    </div>

    <!-- Categories Reference -->
    <div class="section">
      <div class="section-header">
        <h3 class="section-title">Your Categories</h3>
      </div>

      <div class="card">
        <p class="text-sm text-muted mb-md">Expense categories tailored just for you:</p>
        <div style="display: flex; flex-wrap: wrap; gap: var(--space-sm);">
          <span
            v-for="cat in store.EXPENSE_CATEGORIES"
            :key="cat.id"
            class="chip"
            style="background: var(--lavender-100); color: var(--lavender-700);"
          >
            {{ cat.icon }} {{ cat.name }}
          </span>
        </div>
      </div>
    </div>

    <!-- Export Success Toast -->
    <div
      v-if="showExportSuccess"
      style="
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
      "
    >
      Data exported successfully!
    </div>

    <!-- Clear Data Confirmation Modal -->
    <div v-if="showClearConfirm" class="modal-overlay" @click.self="showClearConfirm = false">
      <div class="modal" style="text-align: center;">
        <div style="font-size: 3rem; margin-bottom: var(--space-md);">⚠️</div>
        <h3 style="margin-bottom: var(--space-sm);">Clear All Data?</h3>
        <p class="text-muted mb-lg">
          This will permanently delete all your transactions and wallet data.
          Make sure to export a backup first!
        </p>
        <div style="display: flex; gap: var(--space-md);">
          <button
            class="btn btn-secondary btn-lg"
            style="flex: 1;"
            @click="showClearConfirm = false"
          >
            Cancel
          </button>
          <button
            class="btn btn-lg"
            style="flex: 1; background: var(--expense-color); color: white;"
            @click="clearAllData"
          >
            Clear Data
          </button>
        </div>
      </div>
    </div>

    <!-- Monthly Targets Modal -->
    <div v-if="showTargetsModal" class="modal-overlay" @click.self="showTargetsModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">Monthly Targets</h3>
          <button class="modal-close" @click="showTargetsModal = false">×</button>
        </div>
        <p class="text-sm text-muted mb-md">Set your monthly goals - Vio will cheer you on!</p>

        <div class="input-group">
          <label class="input-label">💰 Monthly Income Target</label>
          <input
            v-model="targetForm.monthlyIncome"
            type="number"
            class="input"
            placeholder="e.g., 10000000"
            inputmode="numeric"
          />
        </div>

        <div class="input-group">
          <label class="input-label">💸 Monthly Expense Limit</label>
          <input
            v-model="targetForm.monthlyExpense"
            type="number"
            class="input"
            placeholder="e.g., 5000000"
            inputmode="numeric"
          />
        </div>

        <div class="input-group">
          <label class="input-label">🐷 Monthly Savings Target</label>
          <input
            v-model="targetForm.monthlySavings"
            type="number"
            class="input"
            placeholder="e.g., 2000000"
            inputmode="numeric"
          />
        </div>

        <button class="btn btn-primary btn-lg w-full" @click="saveTargets">
          Save Targets
        </button>
      </div>
    </div>

    <!-- Lifetime Goal Modal -->
    <div v-if="showGoalModal" class="modal-overlay" @click.self="showGoalModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">Lifetime Goal</h3>
          <button class="modal-close" @click="showGoalModal = false">×</button>
        </div>
        <p class="text-sm text-muted mb-md">Set a big dream to save for - no withdrawals allowed!</p>

        <div class="input-group">
          <label class="input-label">🏷️ Goal Name</label>
          <input
            v-model="goalForm.name"
            type="text"
            class="input"
            placeholder="e.g., House Fund, Dream Car"
          />
        </div>

        <div class="input-group">
          <label class="input-label">💰 Target Amount</label>
          <input
            v-model="goalForm.target"
            type="number"
            class="input"
            placeholder="e.g., 500000000"
            inputmode="numeric"
          />
        </div>

        <button class="btn btn-primary btn-lg w-full" @click="saveGoal">
          Save Goal
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Vio in app info card */
.app-info-vio {
  width: 100px;
  height: auto;
  margin-bottom: var(--space-sm);
}

/* Vio peeking from stats section */
.stats-section {
  position: relative;
  overflow: visible;
}

.vio-peek {
  position: absolute;
  right: -15px;
  top: -50px;
  width: 100px;
  height: auto;
  z-index: 0;
  pointer-events: none;
}

.stats-section .section-header {
  position: relative;
  z-index: 2;
}

.stats-section .card {
  position: relative;
  z-index: 2;
  background: var(--bg-card);
}

/* Theme Toggle */
.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.theme-info {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.theme-icon {
  font-size: 1.5rem;
}

.toggle-btn {
  width: 52px;
  height: 28px;
  background: var(--gray-200);
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  position: relative;
  transition: background var(--transition-normal);
}

.toggle-btn.active {
  background: var(--lavender-500);
}

.toggle-slider {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  background: white;
  border-radius: 50%;
  transition: transform var(--transition-normal);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-btn.active .toggle-slider {
  transform: translateX(24px);
}
</style>
