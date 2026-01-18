<script setup>
import { ref, computed, inject, onMounted, onUnmounted } from 'vue'
import { useFinanceStore } from '../stores'

const store = useFinanceStore()
const fabAction = inject('fabAction')

// Modal states
const showNewPaperModal = ref(false)
const editingPaper = ref(null)
const newPaperName = ref('')

// Track which paper's input is focused
const activeInputPaper = ref(null)
const newItemInputs = ref({})

onMounted(() => {
  fabAction.value = openNewPaperModal
})

onUnmounted(() => {
  fabAction.value = null
})

// Get papers or empty array
const papers = computed(() => store.shoppingPapers.value || [])

function openNewPaperModal() {
  editingPaper.value = null
  newPaperName.value = ''
  showNewPaperModal.value = true
}

function handleCreatePaper() {
  if (!newPaperName.value.trim()) return
  store.createShoppingPaper(newPaperName.value)
  showNewPaperModal.value = false
  newPaperName.value = ''
}

function openEditPaper(paper) {
  editingPaper.value = paper
  newPaperName.value = paper.name
  showNewPaperModal.value = true
}

function handleUpdatePaper() {
  if (!newPaperName.value.trim() || !editingPaper.value) return
  store.updateShoppingPaper(editingPaper.value.id, newPaperName.value)
  showNewPaperModal.value = false
  editingPaper.value = null
  newPaperName.value = ''
}

function handleDeletePaper() {
  if (editingPaper.value && confirm('Delete this list and all items?')) {
    store.deleteShoppingPaper(editingPaper.value.id)
    showNewPaperModal.value = false
    editingPaper.value = null
  }
}

// Quick add item with Enter
function handleAddItem(paperId, event) {
  const input = newItemInputs.value[paperId]
  if (input && input.trim()) {
    store.addItemToPaper(paperId, input)
    newItemInputs.value[paperId] = ''
  }
}

function handleToggleItem(paperId, itemId) {
  store.togglePaperItem(paperId, itemId)
}

function handleDeleteItem(paperId, itemId) {
  store.deletePaperItem(paperId, itemId)
}

function handleClearChecked(paperId) {
  store.clearCheckedFromPaper(paperId)
}

function getUncheckedCount(paper) {
  return paper.items.filter(i => !i.checked).length
}

function getCheckedCount(paper) {
  return paper.items.filter(i => i.checked).length
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
        <div class="shopping-banner-title">Shopping Lists</div>
        <div class="shopping-banner-subtitle">{{ papers.length }} list{{ papers.length !== 1 ? 's' : '' }}</div>
      </div>
      <img src="/images/vio_right.png" alt="Vio" class="shopping-banner-vio" />
    </div>

    <!-- Empty State -->
    <div v-if="papers.length === 0" class="empty-state">
      <img src="/images/vio_sit.png" alt="" class="empty-vio" />
      <h3 class="empty-title">No shopping lists yet!</h3>
      <p class="empty-text">Tap + to create your first list</p>
    </div>

    <!-- Paper Cards Grid -->
    <div v-else class="papers-grid">
      <div
        v-for="paper in papers"
        :key="paper.id"
        class="paper-card"
      >
        <!-- Paper Header -->
        <div class="paper-header">
          <div class="paper-title-row">
            <h3 class="paper-title">{{ paper.name }}</h3>
            <button class="paper-menu-btn" @click="openEditPaper(paper)">
              <span>...</span>
            </button>
          </div>
          <div class="paper-meta">
            <span v-if="getUncheckedCount(paper) > 0" class="meta-remaining">
              {{ getUncheckedCount(paper) }} left
            </span>
            <span v-if="getCheckedCount(paper) > 0" class="meta-done">
              {{ getCheckedCount(paper) }} done
            </span>
            <button
              v-if="getCheckedCount(paper) > 0"
              class="clear-done-btn"
              @click="handleClearChecked(paper.id)"
            >
              Clear
            </button>
          </div>
        </div>

        <!-- Paper Lines (like notebook paper) -->
        <div class="paper-content">
          <!-- Unchecked Items -->
          <div
            v-for="item in paper.items.filter(i => !i.checked)"
            :key="item.id"
            class="paper-item"
          >
            <button
              class="item-checkbox"
              @click="handleToggleItem(paper.id, item.id)"
            >
              <span class="checkbox-circle"></span>
            </button>
            <span class="item-text">{{ item.name }}</span>
            <button
              class="item-delete"
              @click="handleDeleteItem(paper.id, item.id)"
            >
              ×
            </button>
          </div>

          <!-- Checked Items -->
          <div
            v-for="item in paper.items.filter(i => i.checked)"
            :key="item.id"
            class="paper-item checked"
          >
            <button
              class="item-checkbox checked"
              @click="handleToggleItem(paper.id, item.id)"
            >
              <span class="checkbox-circle checked">✓</span>
            </button>
            <span class="item-text">{{ item.name }}</span>
            <button
              class="item-delete"
              @click="handleDeleteItem(paper.id, item.id)"
            >
              ×
            </button>
          </div>

          <!-- Quick Add Input -->
          <div class="quick-add-row">
            <span class="add-bullet">+</span>
            <input
              v-model="newItemInputs[paper.id]"
              type="text"
              class="quick-add-input"
              placeholder="Add item..."
              @keyup.enter="handleAddItem(paper.id)"
            />
          </div>
        </div>

        <!-- Paper Footer -->
        <div class="paper-footer">
          <span class="paper-date">{{ formatDate(paper.createdAt) }}</span>
        </div>
      </div>
    </div>

    <!-- New/Edit Paper Modal -->
    <div v-if="showNewPaperModal" class="modal-overlay" @click.self="showNewPaperModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingPaper ? 'Edit List' : 'New List' }}</h3>
          <button class="modal-close" @click="showNewPaperModal = false">×</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>List Name</label>
            <input
              v-model="newPaperName"
              type="text"
              placeholder="e.g. Grocery Store, Target..."
              @keyup.enter="editingPaper ? handleUpdatePaper() : handleCreatePaper()"
            />
          </div>
        </div>

        <div class="modal-footer">
          <button v-if="editingPaper" class="btn btn-danger" @click="handleDeletePaper">
            Delete List
          </button>
          <button
            class="btn btn-primary"
            @click="editingPaper ? handleUpdatePaper() : handleCreatePaper()"
          >
            {{ editingPaper ? 'Save' : 'Create List' }}
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
    linear-gradient(135deg, rgba(52, 211, 153, 0.5) 0%, rgba(16, 185, 129, 0.5) 50%, rgba(5, 150, 105, 0.5) 100%),
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
  height: 120px;
  width: auto;
  flex-shrink: 0;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
  align-self: flex-end;
  margin-right: var(--space-sm);
}

@media (max-width: 480px) {
  .shopping-banner-title {
    font-size: 1.5rem;
  }

  .shopping-banner-vio {
    height: 100px;
  }
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

/* Papers Grid */
.papers-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-lg);
}

@media (min-width: 640px) {
  .papers-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .papers-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Paper Card - Notebook style */
.paper-card {
  background: linear-gradient(to bottom, #FFFEF0 0%, #FFF9E6 100%);
  border-radius: var(--radius-lg);
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.08),
    0 4px 16px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  position: relative;
  border: 1px solid rgba(200, 180, 140, 0.3);
}

/* Paper left edge red line */
.paper-card::before {
  content: '';
  position: absolute;
  left: 32px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: rgba(244, 63, 94, 0.3);
}

.paper-header {
  padding: var(--space-md) var(--space-md) var(--space-sm);
  padding-left: 44px;
  border-bottom: 1px solid rgba(200, 180, 140, 0.2);
}

.paper-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.paper-title {
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 700;
  color: #374151;
  margin: 0;
}

.paper-menu-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: #9CA3AF;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  line-height: 1;
}

.paper-menu-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #6B7280;
}

.paper-meta {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-top: var(--space-xs);
  font-size: 0.75rem;
}

.meta-remaining {
  color: #059669;
  font-weight: 600;
}

.meta-done {
  color: #9CA3AF;
}

.clear-done-btn {
  background: none;
  border: none;
  color: #9CA3AF;
  font-size: 0.75rem;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
}

.clear-done-btn:hover {
  color: #6B7280;
}

/* Paper Content */
.paper-content {
  padding: var(--space-sm) var(--space-md);
  padding-left: 44px;
  min-height: 120px;
  background-image: repeating-linear-gradient(
    transparent,
    transparent 27px,
    rgba(200, 180, 140, 0.2) 27px,
    rgba(200, 180, 140, 0.2) 28px
  );
}

/* Paper Item */
.paper-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  height: 28px;
  position: relative;
}

.paper-item.checked {
  opacity: 0.5;
}

.item-checkbox {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  flex-shrink: 0;
}

.checkbox-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: 2px solid #D1D5DB;
  border-radius: var(--radius-full);
  transition: all 0.15s;
}

.checkbox-circle.checked {
  background: #10B981;
  border-color: #10B981;
  color: white;
  font-size: 0.625rem;
}

.item-text {
  flex: 1;
  font-size: 0.875rem;
  color: #374151;
  font-family: 'Comic Sans MS', 'Segoe UI', sans-serif;
}

.paper-item.checked .item-text {
  text-decoration: line-through;
  color: #9CA3AF;
}

.item-delete {
  background: none;
  border: none;
  color: #D1D5DB;
  font-size: 1rem;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  opacity: 0;
  transition: opacity 0.15s;
}

.paper-item:hover .item-delete {
  opacity: 1;
}

.item-delete:hover {
  color: #EF4444;
  background: rgba(239, 68, 68, 0.1);
}

/* Quick Add Row */
.quick-add-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  height: 28px;
  margin-top: var(--space-xs);
}

.add-bullet {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #D1D5DB;
  font-size: 1rem;
  flex-shrink: 0;
}

.quick-add-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 0.875rem;
  color: #374151;
  font-family: 'Comic Sans MS', 'Segoe UI', sans-serif;
  outline: none;
}

.quick-add-input::placeholder {
  color: #D1D5DB;
  font-style: italic;
}

/* Paper Footer */
.paper-footer {
  padding: var(--space-xs) var(--space-md);
  padding-left: 44px;
  border-top: 1px solid rgba(200, 180, 140, 0.2);
  background: rgba(200, 180, 140, 0.1);
}

.paper-date {
  font-size: 0.6875rem;
  color: #9CA3AF;
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

.form-group input {
  width: 100%;
  padding: var(--space-sm);
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  background: var(--white);
}

.form-group input:focus {
  outline: none;
  border-color: var(--lavender-400);
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
  background: #10B981;
  color: white;
}

.btn-primary:hover {
  background: #059669;
}

.btn-danger {
  background: var(--expense-color);
  color: white;
}
</style>

<style>
/* Dark mode */
[data-theme="dark"] .shopping-banner {
  background: linear-gradient(135deg, rgba(6, 95, 70, 0.6) 0%, rgba(16, 185, 129, 0.5) 50%, rgba(52, 211, 153, 0.4) 100%),
    url('/images/kawaii-bg.jpg') center center / cover no-repeat !important;
}

[data-theme="dark"] .paper-card {
  background: linear-gradient(to bottom, #1A1625 0%, #1F1A2E 100%) !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .paper-card::before {
  background: rgba(139, 92, 246, 0.3) !important;
}

[data-theme="dark"] .paper-header {
  border-bottom-color: #3D3456 !important;
}

[data-theme="dark"] .paper-title {
  color: #E5E7EB !important;
}

[data-theme="dark"] .paper-content {
  background-image: repeating-linear-gradient(
    transparent,
    transparent 27px,
    rgba(61, 52, 86, 0.5) 27px,
    rgba(61, 52, 86, 0.5) 28px
  ) !important;
}

[data-theme="dark"] .item-text {
  color: #E5E7EB !important;
}

[data-theme="dark"] .paper-item.checked .item-text {
  color: #6B7280 !important;
}

[data-theme="dark"] .checkbox-circle {
  border-color: #4D4366 !important;
}

[data-theme="dark"] .checkbox-circle.checked {
  background: #8B5CF6 !important;
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .quick-add-input {
  color: #E5E7EB !important;
}

[data-theme="dark"] .quick-add-input::placeholder {
  color: #6B7280 !important;
}

[data-theme="dark"] .paper-footer {
  background: rgba(61, 52, 86, 0.3) !important;
  border-top-color: #3D3456 !important;
}

[data-theme="dark"] .meta-remaining {
  color: #34D399 !important;
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

[data-theme="dark"] .form-group input {
  background: #0F0D1A !important;
  border-color: #3D3456 !important;
  color: #E5E7EB !important;
}

[data-theme="dark"] .form-group input:focus {
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .btn-primary {
  background: #8B5CF6 !important;
}

[data-theme="dark"] .btn-primary:hover {
  background: #7C3AED !important;
}
</style>
