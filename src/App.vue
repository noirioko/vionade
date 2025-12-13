<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useFinanceStore } from './stores/finance'
import BottomNav from './components/BottomNav.vue'
import AddTransactionModal from './components/AddTransactionModal.vue'

const route = useRoute()
const store = useFinanceStore()
const showAddModal = ref(false)

// Hide main FAB on laundry page (it has its own)
const showFab = computed(() => route.path !== '/laundry')
</script>

<template>
  <router-view />

  <!-- FAB Button (hidden on laundry page) -->
  <button v-if="showFab" class="fab" @click="showAddModal = true">
    +
  </button>

  <!-- Bottom Navigation -->
  <BottomNav />

  <!-- Add Transaction Modal -->
  <AddTransactionModal
    v-if="showAddModal"
    @close="showAddModal = false"
  />
</template>
