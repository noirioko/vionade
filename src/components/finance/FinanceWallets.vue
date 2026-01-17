<script setup>
import { ref, computed } from 'vue'
import { useFinanceStore } from '../../stores'
import { useToast } from '../../composables/useToast'

const store = useFinanceStore()
const toast = useToast()

const editingWallet = ref(null)
const newBalance = ref('')
const newAccountNumber = ref('')

const needsSetup = computed(() => {
  return store.wallets.value.every(w => w.balance === 0)
})

function startEdit(wallet) {
  editingWallet.value = wallet.id
  newBalance.value = wallet.balance.toString()
  newAccountNumber.value = wallet.accountNumber || ''
}

function saveBalance(walletId) {
  const balance = parseFloat(newBalance.value) || 0
  store.updateWalletBalance(walletId, balance)
  store.updateWalletAccountNumber(walletId, newAccountNumber.value)
  editingWallet.value = null
  newBalance.value = ''
  newAccountNumber.value = ''
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
</style>
