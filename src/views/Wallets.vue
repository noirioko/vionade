<script setup>
import { ref } from 'vue'
import { useFinanceStore } from '../stores/finance'

const store = useFinanceStore()
const editingWallet = ref(null)
const newBalance = ref('')

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
    <div class="card text-center" style="background: var(--lavender-50);">
      <div style="font-size: 1.5rem; margin-bottom: var(--space-sm);">💡</div>
      <p class="text-sm text-muted">
        Tap "Edit" on any wallet to manually adjust its balance.
        This is useful for setting starting balances!
      </p>
    </div>
  </div>
</template>
