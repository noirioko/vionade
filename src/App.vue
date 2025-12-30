<script setup>
import { ref, computed, onMounted, provide } from 'vue'
import { useRoute } from 'vue-router'
import { useFinanceStore } from './stores/finance'
import BottomNav from './components/BottomNav.vue'
import AddTransactionModal from './components/AddTransactionModal.vue'

const route = useRoute()
const store = useFinanceStore()

const showAddModal = ref(false)

// Provide a way for child pages to trigger their own add action
const fabAction = ref(null)
provide('fabAction', fabAction)

// Pages where we show the FAB
const pagesWithFab = ['/finance', '/wallets', '/history', '/wishlist', '/movies', '/laundry']

const showFab = computed(() => pagesWithFab.includes(route.path))

function handleFabClick() {
  // If the current page registered a custom action, use it
  if (fabAction.value) {
    fabAction.value()
  } else {
    // Default: open transaction modal (for /, /wallets, /history)
    showAddModal.value = true
  }
}

// Apply theme on mount
onMounted(() => {
  store.applyTheme()
})
</script>

<template>
  <router-view />

  <!-- FAB Button - contextual based on current page -->
  <button v-if="showFab" class="fab" @click="handleFabClick">
    +
  </button>

  <!-- Bottom Navigation -->
  <BottomNav />

  <!-- Add Transaction Modal (default action) -->
  <AddTransactionModal
    v-if="showAddModal"
    @close="showAddModal = false"
  />
</template>

