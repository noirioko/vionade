<script setup>
import { ref, computed, inject, onMounted, onUnmounted } from 'vue'
import { useFinanceStore } from '../stores'

const store = useFinanceStore()
const fabAction = inject('fabAction')

const showAddModal = ref(false)
const editingItem = ref(null)

const form = ref({
  name: '',
  quantity: 1,
  category: 'general',
  notes: '',
})

onMounted(() => {
  fabAction.value = openAddModal
})

onUnmounted(() => {
  fabAction.value = null
})

function openAddModal() {
  editingItem.value = null
  form.value = { name: '', quantity: 1, category: 'general', notes: '' }
  showAddModal.value = true
}

// Separate checked and unchecked items
const uncheckedItems = computed(() => {
  return (store.shoppingList.value || []).filter(i => !i.checked)
})

const checkedItems = computed(() => {
  return (store.shoppingList.value || []).filter(i => i.checked)
})

const totalItems = computed(() => {
  return store.shoppingList.value?.length || 0
})

const checkedCount = computed(() => {
  return checkedItems.value.length
})

function getCategoryIcon(categoryId) {
  const cat = store.SHOPPING_CATEGORIES.find(c => c.id === categoryId)
  return cat?.icon || '📦'
}

function getCategoryLabel(categoryId) {
  const cat = store.SHOPPING_CATEGORIES.find(c => c.id === categoryId)
  return cat?.label || 'General'
}

function handleToggle(item) {
  store.toggleShoppingItem(item.id)
}

function openEdit(item) {
  editingItem.value = item
  form.value = {
    name: item.name || '',
    quantity: item.quantity || 1,
    category: item.category || 'general',
    notes: item.notes || '',
  }
  showAddModal.value = true
}

function handleSave() {
  if (!form.value.name.trim()) return

  if (editingItem.value) {
    store.updateShoppingItem(editingItem.value.id, form.value)
  } else {
    store.addShoppingItem(form.value)
  }

  showAddModal.value = false
  editingItem.value = null
  form.value = { name: '', quantity: 1, category: 'general', notes: '' }
}

function handleDelete() {
  if (editingItem.value && confirm('Delete this item?')) {
    store.deleteShoppingItem(editingItem.value.id)
    showAddModal.value = false
    editingItem.value = null
  }
}

function handleClearChecked() {
  if (checkedItems.value.length > 0 && confirm('Clear all checked items?')) {
    store.clearCheckedItems()
  }
}
</script>

<template>
  <div class="page shopping-page">
    <div class="page-header">
      <img src="/images/vio-logo.png" alt="Vionade" class="page-header-logo" />
    </div>

    <!-- Shopping Banner -->
    <div class="shopping-banner">
      <div class="shopping-banner-content">
        <div class="shopping-banner-title">Shopping List</div>
        <div class="shopping-banner-subtitle">Don't forget anything!</div>
      </div>
      <img src="/images/vio_right.png" alt="Vio" class="shopping-banner-vio" />
    </div>

    <!-- Stats Bar -->
    <div class="stats-bar" v-if="totalItems > 0">
      <div class="stat-item">
        <span class="stat-value">{{ totalItems - checkedCount }}</span>
        <span class="stat-label">remaining</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ checkedCount }}</span>
        <span class="stat-label">done</span>
      </div>
      <button
        v-if="checkedCount > 0"
        class="clear-btn"
        @click="handleClearChecked"
      >
        Clear Done
      </button>
    </div>

    <!-- Empty State -->
    <div v-if="totalItems === 0" class="empty-state">
      <img src="/images/vio_sit.png" alt="" class="empty-vio" />
      <h3 class="empty-title">List is empty!</h3>
      <p class="empty-text">Tap + to add items</p>
    </div>

    <!-- Shopping Items -->
    <div v-else class="shopping-content">
      <!-- Unchecked Items -->
      <div v-if="uncheckedItems.length > 0" class="items-section">
        <div class="section-title">To Buy</div>
        <div class="items-list">
          <div
            v-for="item in uncheckedItems"
            :key="item.id"
            class="shopping-item"
          >
            <button class="check-btn" @click="handleToggle(item)">
              <span class="check-circle"></span>
            </button>
            <div class="item-content" @click="openEdit(item)">
              <div class="item-name">
                <span class="item-icon">{{ getCategoryIcon(item.category) }}</span>
                {{ item.name }}
                <span v-if="item.quantity > 1" class="item-qty">×{{ item.quantity }}</span>
              </div>
              <div v-if="item.notes" class="item-notes">{{ item.notes }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Checked Items -->
      <div v-if="checkedItems.length > 0" class="items-section checked-section">
        <div class="section-title">Done</div>
        <div class="items-list">
          <div
            v-for="item in checkedItems"
            :key="item.id"
            class="shopping-item checked"
          >
            <button class="check-btn checked" @click="handleToggle(item)">
              <span class="check-circle checked">✓</span>
            </button>
            <div class="item-content" @click="openEdit(item)">
              <div class="item-name">
                <span class="item-icon">{{ getCategoryIcon(item.category) }}</span>
                {{ item.name }}
                <span v-if="item.quantity > 1" class="item-qty">×{{ item.quantity }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingItem ? 'Edit Item' : 'Add Item' }}</h3>
          <button class="modal-close" @click="showAddModal = false">×</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>Item Name *</label>
            <input v-model="form.name" type="text" placeholder="e.g. Milk, Eggs, Bread" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Quantity</label>
              <input v-model.number="form.quantity" type="number" min="1" />
            </div>
            <div class="form-group">
              <label>Category</label>
              <select v-model="form.category">
                <option
                  v-for="cat in store.SHOPPING_CATEGORIES"
                  :key="cat.id"
                  :value="cat.id"
                >
                  {{ cat.icon }} {{ cat.label }}
                </option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Notes</label>
            <input v-model="form.notes" type="text" placeholder="Brand, size, etc..." />
          </div>
        </div>

        <div class="modal-footer">
          <button v-if="editingItem" class="btn btn-danger" @click="handleDelete">Delete</button>
          <button class="btn btn-primary" @click="handleSave">
            {{ editingItem ? 'Save' : 'Add Item' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Shopping Banner */
.shopping-banner {
  position: relative;
  display: flex;
  align-items: center;
  background:
    linear-gradient(135deg, rgba(52, 211, 153, 0.8) 0%, rgba(16, 185, 129, 0.8) 50%, rgba(5, 150, 105, 0.8) 100%),
    url('/images/kawaii-bg.jpg') center center / cover no-repeat;
  border-radius: var(--radius-xl);
  overflow: hidden;
  min-height: 120px;
  margin-bottom: var(--space-md);
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
}

.shopping-banner-content {
  flex: 1;
  padding: var(--space-lg);
}

.shopping-banner-title {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.shopping-banner-subtitle {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 4px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.shopping-banner-vio {
  height: 140px;
  width: auto;
  flex-shrink: 0;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
  margin-bottom: -30px;
}

@media (max-width: 480px) {
  .shopping-banner-title {
    font-size: 1.5rem;
  }

  .shopping-banner-vio {
    height: 110px;
    margin-bottom: -20px;
  }
}

/* Stats Bar */
.stats-bar {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-card);
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-md);
}

.stat-item {
  display: flex;
  align-items: baseline;
  gap: var(--space-xs);
}

.stat-value {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.25rem;
  color: var(--lavender-600);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.clear-btn {
  margin-left: auto;
  padding: var(--space-xs) var(--space-sm);
  background: var(--lavender-50);
  border: 1px solid var(--lavender-200);
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--lavender-600);
  cursor: pointer;
}

.clear-btn:hover {
  background: var(--lavender-100);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: var(--space-2xl) var(--space-lg);
}

.empty-vio {
  width: 120px;
  height: auto;
  margin-bottom: var(--space-md);
  opacity: 0.8;
}

.empty-title {
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 var(--space-xs);
}

.empty-text {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
}

/* Shopping Items */
.shopping-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.items-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.section-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.shopping-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-card);
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-md);
}

.shopping-item.checked {
  opacity: 0.6;
}

.check-btn {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  margin-top: 2px;
}

.check-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 2px solid var(--lavender-300);
  border-radius: var(--radius-full);
  transition: all 0.2s;
}

.check-circle.checked {
  background: var(--lavender-500);
  border-color: var(--lavender-500);
  color: white;
  font-size: 0.75rem;
}

.item-content {
  flex: 1;
  cursor: pointer;
}

.item-name {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-weight: 600;
  color: var(--text-primary);
}

.shopping-item.checked .item-name {
  text-decoration: line-through;
  color: var(--text-secondary);
}

.item-icon {
  font-size: 1rem;
}

.item-qty {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--lavender-500);
  background: var(--lavender-50);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.item-notes {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 2px;
}

.checked-section {
  opacity: 0.7;
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
  max-width: 400px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md);
  border-bottom: 1px solid var(--lavender-100);
}

.modal-header h3 {
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.modal-body {
  padding: var(--space-md);
}

.form-group {
  margin-bottom: var(--space-md);
}

.form-group label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: var(--space-xs);
}

.form-group input,
.form-group select {
  width: 100%;
  padding: var(--space-sm);
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  background: var(--white);
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--lavender-400);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
}

.modal-footer {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-md);
  border-top: 1px solid var(--lavender-100);
}

.btn {
  flex: 1;
  padding: var(--space-sm) var(--space-md);
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary {
  background: var(--lavender-500);
  color: white;
}

.btn-primary:hover {
  background: var(--lavender-600);
}

.btn-danger {
  background: var(--expense-color);
  color: white;
}
</style>

<style>
/* Dark mode */
[data-theme="dark"] .shopping-banner {
  background: linear-gradient(135deg, #047857 0%, #059669 50%, #10B981 100%) !important;
}

[data-theme="dark"] .stats-bar {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .stat-value {
  color: #A78BFA !important;
}

[data-theme="dark"] .clear-btn {
  background: #2D2640 !important;
  border-color: #3D3456 !important;
  color: #A78BFA !important;
}

[data-theme="dark"] .shopping-item {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .check-circle {
  border-color: #6D28D9 !important;
}

[data-theme="dark"] .check-circle.checked {
  background: #8B5CF6 !important;
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .item-qty {
  background: #2D2640 !important;
  color: #A78BFA !important;
}

[data-theme="dark"] .modal {
  background: #1A1625 !important;
}

[data-theme="dark"] .modal-header {
  border-bottom-color: #3D3456 !important;
}

[data-theme="dark"] .modal-footer {
  border-top-color: #3D3456 !important;
}

[data-theme="dark"] .form-group input,
[data-theme="dark"] .form-group select {
  background: #0F0D1A !important;
  border-color: #3D3456 !important;
  color: var(--text-primary) !important;
}

[data-theme="dark"] .form-group input:focus,
[data-theme="dark"] .form-group select:focus {
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .btn-primary {
  background: #8B5CF6 !important;
}
</style>
