<script setup>
import { ref, computed } from 'vue'
import { useFinanceStore } from '../stores/finance'

const store = useFinanceStore()
const editingWallet = ref(null)
const newBalance = ref('')

// Show setup hint if all wallets are at 0
const needsSetup = computed(() => {
  return store.wallets.value.every(w => w.balance === 0)
})

function startEdit(wallet) {
  editingWallet.value = wallet.id
  newBalance.value = wallet.balance.toString()
}

function saveBalance(walletId) {
  const balance = parseFloat(newBalance.value) || 0
  store.updateWalletBalance(walletId, balance)
  editingWallet.value = null
  newBalance.value = ''
}

function cancelEdit() {
  editingWallet.value = null
  newBalance.value = ''
}

function getWalletTransactions(walletId) {
  return store.transactions.value.filter(t =>
    t.walletId === walletId || t.toWalletId === walletId
  ).length
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <img src="/images/vio-logo.png" alt="Mochimane Fresh" class="page-header-logo" />
    </div>

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
            <div class="list-item-subtitle">{{ getWalletTransactions(wallet.id) }} transactions</div>
          </div>
          <div class="list-item-amount">
            <div v-if="editingWallet !== wallet.id">
              <div
                class="amount"
                :class="wallet.balance >= 0 ? 'amount-positive' : 'amount-negative'"
              >
                {{ store.formatCurrency(wallet.balance) }}
              </div>
              <button
                class="btn btn-ghost btn-sm mt-sm"
                @click="startEdit(wallet)"
              >
                Edit
              </button>
            </div>
          </div>

          <!-- Edit Mode -->
          <div
            v-if="editingWallet === wallet.id"
            style="width: 100%; margin-top: var(--space-md); display: flex; gap: var(--space-sm);"
          >
            <input
              v-model="newBalance"
              type="number"
              class="input"
              placeholder="New balance"
              style="flex: 1;"
              @keyup.enter="saveBalance(wallet.id)"
            />
            <button class="btn btn-primary" @click="saveBalance(wallet.id)">Save</button>
            <button class="btn btn-secondary" @click="cancelEdit">Cancel</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Info Card -->
    <div v-if="!needsSetup" class="card text-center" style="background: var(--lavender-50);">
      <div style="font-size: 1.5rem; margin-bottom: var(--space-sm);">💡</div>
      <p class="text-sm text-muted">
        Tap "Edit" on any wallet to manually adjust its balance.
        This is useful for setting starting balances!
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

.setup-hint-content {
  flex: 1;
}

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

[data-theme="dark"] .setup-hint {
  background: linear-gradient(135deg, var(--lavender-900) 0%, rgba(139, 92, 246, 0.1) 100%);
  border-color: var(--lavender-600);
}

[data-theme="dark"] .setup-hint-title {
  color: var(--lavender-300);
}
</style>
