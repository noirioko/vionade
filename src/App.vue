<script setup>
import { ref, computed, onMounted, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFinanceStore } from './stores'
import BottomNav from './components/BottomNav.vue'
import AddTransactionModal from './components/AddTransactionModal.vue'
import ToastContainer from './components/ToastContainer.vue'

const route = useRoute()
const router = useRouter()
const store = useFinanceStore()

// Set up sign out callback to redirect to landing
store.setOnSignOutCallback(() => {
  router.push('/landing')
})

const showAddModal = ref(false)

// Provide a way for child pages to trigger their own add action
const fabAction = ref(null)
provide('fabAction', fabAction)

// Pages where we show the FAB
const pagesWithFab = ['/finance', '/media', '/laundry', '/passwords', '/pets', '/collections', '/wardrobe', '/subscriptions', '/shopping', '/reviews', '/wellness']

const showFab = computed(() => pagesWithFab.includes(route.path))

// Hide nav on landing page
const showNav = computed(() => route.path !== '/landing')

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

  // Prevent scroll wheel from changing number input values
  document.addEventListener('wheel', (e) => {
    if (e.target.type === 'number') {
      e.target.blur()
    }
  }, { passive: true })
})
</script>

<template>
  <ToastContainer />
  <router-view />

  <!-- FAB Button - contextual based on current page -->
  <button v-if="showFab" class="fab" @click="handleFabClick">
    +
  </button>

  <!-- Bottom Navigation -->
  <BottomNav v-if="showNav" />

  <!-- Add Transaction Modal (default action) -->
  <AddTransactionModal
    v-if="showAddModal"
    @close="showAddModal = false"
  />
</template>

