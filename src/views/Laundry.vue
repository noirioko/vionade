<script setup>
import { ref, computed, onMounted, onUnmounted, inject } from 'vue'

// Laundry tracking - separate from finance
const STORAGE_KEY = 'mochi_laundry'

// Register FAB action for this page
const fabAction = inject('fabAction')

// Location options
const LOCATIONS = [
  { id: 'home', name: 'Home', icon: '🏠' },
  { id: 'puro', name: 'Puro', icon: '🧺' },
  { id: 'aries', name: 'Aries', icon: '♈' },
]

function loadLaundry() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveLaundry() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(laundryItems.value))
}

const laundryItems = ref(loadLaundry())
const showAddModal = ref(false)
const showEditModal = ref(false)
const activeTab = ref('pending') // pending, washing, drying, done

// Register FAB action
onMounted(() => {
  fabAction.value = () => {
    showAddModal.value = true
  }
})

onUnmounted(() => {
  fabAction.value = null
})

// Form state for adding
const newItem = ref({
  name: '',
  location: 'home',
  notes: '',
  cost: '',
})

// Form state for editing
const editingItem = ref(null)
const editForm = ref({
  name: '',
  location: 'home',
  notes: '',
  cost: '',
  logged: false,
})

const pendingItems = computed(() =>
  laundryItems.value.filter(item => item.status === 'pending')
)

const washingItems = computed(() =>
  laundryItems.value.filter(item => item.status === 'washing')
)

const dryingItems = computed(() =>
  laundryItems.value.filter(item => item.status === 'drying')
)

const doneItems = computed(() =>
  laundryItems.value
    .filter(item => item.status === 'done')
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
    .slice(0, 20)
)

function addItem() {
  if (!newItem.value.name.trim()) return

  const item = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
    name: newItem.value.name,
    location: newItem.value.location,
    notes: newItem.value.notes,
    cost: parseFloat(newItem.value.cost) || 0,
    logged: false,
    status: 'pending',
    createdAt: new Date().toISOString(),
    startedAt: null,
    dryingAt: null,
    completedAt: null,
  }

  laundryItems.value.push(item)
  saveLaundry()

  // Reset form
  newItem.value = { name: '', location: 'home', notes: '', cost: '' }
  showAddModal.value = false
}

function openEditModal(item) {
  editingItem.value = item
  editForm.value = {
    name: item.name,
    location: item.location,
    notes: item.notes || '',
    cost: item.cost || '',
    logged: item.logged || false,
  }
  showEditModal.value = true
}

function saveEdit() {
  if (!editingItem.value) return
  if (!editForm.value.name.trim()) return

  const item = laundryItems.value.find(i => i.id === editingItem.value.id)
  if (item) {
    item.name = editForm.value.name
    item.location = editForm.value.location
    item.notes = editForm.value.notes
    item.cost = parseFloat(editForm.value.cost) || 0
    item.logged = editForm.value.logged
    saveLaundry()
  }

  showEditModal.value = false
  editingItem.value = null
}

function toggleLogged(item) {
  item.logged = !item.logged
  saveLaundry()
}

function startWashing(id) {
  const item = laundryItems.value.find(i => i.id === id)
  if (item) {
    item.status = 'washing'
    item.startedAt = new Date().toISOString()
    saveLaundry()
  }
}

function startDrying(id) {
  const item = laundryItems.value.find(i => i.id === id)
  if (item) {
    item.status = 'drying'
    item.dryingAt = new Date().toISOString()
    saveLaundry()
  }
}

function markDone(id) {
  const item = laundryItems.value.find(i => i.id === id)
  if (item) {
    item.status = 'done'
    item.completedAt = new Date().toISOString()
    saveLaundry()
  }
}

function deleteItem(id) {
  const index = laundryItems.value.findIndex(i => i.id === id)
  if (index !== -1) {
    laundryItems.value.splice(index, 1)
    saveLaundry()
  }
}

function cancelItem(id) {
  const item = laundryItems.value.find(i => i.id === id)
  if (item) {
    item.status = 'pending'
    item.startedAt = null
    item.dryingAt = null
    item.completedAt = null
    saveLaundry()
  }
}

function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}

function formatCost(cost) {
  if (!cost) return ''
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(cost)
}

function getLocation(locationId) {
  return LOCATIONS.find(l => l.id === locationId) || LOCATIONS[0]
}
</script>

<template>
  <div class="page laundry-page">
    <div class="page-header">
      <img src="/images/vio-logo.png" alt="Vionade" class="page-header-logo" />
    </div>

    <!-- Laundry Banner -->
    <div class="laundry-banner">
      <div class="laundry-banner-content">
        <div class="laundry-banner-title">Laundry Tracker</div>
        <div class="laundry-banner-subtitle">Keep track of your washing</div>
      </div>
      <img src="/images/vio_laundry_banner.png" alt="Vio" class="laundry-banner-vio" />
    </div>

    <!-- Quick Stats -->
    <div class="card section" style="display: flex; gap: var(--space-md); text-align: center;">
      <div style="flex: 1;">
        <div class="text-xs text-muted mb-sm">To Wash</div>
        <div class="stat-number">{{ pendingItems.length }}</div>
      </div>
      <div style="width: 1px; background: var(--blue-100);"></div>
      <div style="flex: 1;">
        <div class="text-xs text-muted mb-sm">Washing</div>
        <div class="stat-number washing">{{ washingItems.length }}</div>
      </div>
      <div style="width: 1px; background: var(--blue-100);"></div>
      <div style="flex: 1;">
        <div class="text-xs text-muted mb-sm">Drying</div>
        <div class="stat-number drying">{{ dryingItems.length }}</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button
        class="tab"
        :class="{ active: activeTab === 'pending' }"
        @click="activeTab = 'pending'"
      >
        To Wash
      </button>
      <button
        class="tab"
        :class="{ active: activeTab === 'washing' }"
        @click="activeTab = 'washing'"
      >
        Washing
      </button>
      <button
        class="tab"
        :class="{ active: activeTab === 'drying' }"
        @click="activeTab = 'drying'"
      >
        Drying
      </button>
      <button
        class="tab"
        :class="{ active: activeTab === 'done' }"
        @click="activeTab = 'done'"
      >
        Done
      </button>
    </div>

    <!-- Pending Items -->
    <div v-if="activeTab === 'pending'" class="section">
      <div v-if="pendingItems.length === 0" class="empty-state">
        <img src="/images/vio_sit.png" alt="" class="empty-state-vio" />
        <div class="empty-state-title">All caught up!</div>
        <div class="empty-state-text">No laundry waiting to be washed</div>
      </div>

      <div v-else class="list">
        <div v-for="item in pendingItems" :key="item.id" class="laundry-item" @click="openEditModal(item)">
          <div class="laundry-item-main">
            <div class="laundry-icon pending">👕</div>
            <div class="laundry-content">
              <div class="laundry-name">{{ item.name }}</div>
              <div class="laundry-meta">
                <span class="location-badge" :class="item.location">
                  {{ getLocation(item.location).icon }} {{ getLocation(item.location).name }}
                </span>
                <span class="cost-badge">{{ formatCost(item.cost) }}</span>
              </div>
              <div v-if="item.notes" class="laundry-notes">{{ item.notes }}</div>
            </div>
          </div>
          <div class="laundry-actions" @click.stop>
            <button class="btn btn-primary btn-sm" @click="startWashing(item.id)">
              Start Wash
            </button>
            <button class="btn btn-ghost btn-sm" @click="deleteItem(item.id)">
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Washing Items -->
    <div v-if="activeTab === 'washing'" class="section">
      <div v-if="washingItems.length === 0" class="empty-state">
        <img src="/images/vio_sit.png" alt="" class="empty-state-vio" />
        <div class="empty-state-title">Nothing washing</div>
        <div class="empty-state-text">Start a wash from the "To Wash" tab</div>
      </div>

      <div v-else class="list">
        <div v-for="item in washingItems" :key="item.id" class="laundry-item" @click="openEditModal(item)">
          <div class="laundry-item-main">
            <div class="laundry-icon washing">
              <span class="spin">🌀</span>
            </div>
            <div class="laundry-content">
              <div class="laundry-name">{{ item.name }}</div>
              <div class="laundry-meta">
                <span class="location-badge" :class="item.location">
                  {{ getLocation(item.location).icon }} {{ getLocation(item.location).name }}
                </span>
                <span class="cost-badge">{{ formatCost(item.cost) }}</span>
                <span class="text-muted">Started {{ formatDate(item.startedAt) }}</span>
              </div>
            </div>
          </div>
          <div class="laundry-actions" @click.stop>
            <button class="btn btn-sm cancel-btn" @click="cancelItem(item.id)">
              Cancel
            </button>
            <button class="btn btn-sm drying-btn" @click="startDrying(item.id)">
              Dry
            </button>
            <button class="btn btn-sm done-btn" @click="markDone(item.id)">
              Done!
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Drying Items -->
    <div v-if="activeTab === 'drying'" class="section">
      <div v-if="dryingItems.length === 0" class="empty-state">
        <img src="/images/vio_sit.png" alt="" class="empty-state-vio" />
        <div class="empty-state-title">Nothing drying</div>
        <div class="empty-state-text">Move items from washing to drying</div>
      </div>

      <div v-else class="list">
        <div v-for="item in dryingItems" :key="item.id" class="laundry-item" @click="openEditModal(item)">
          <div class="laundry-item-main">
            <div class="laundry-icon drying">☀️</div>
            <div class="laundry-content">
              <div class="laundry-name">{{ item.name }}</div>
              <div class="laundry-meta">
                <span class="location-badge" :class="item.location">
                  {{ getLocation(item.location).icon }} {{ getLocation(item.location).name }}
                </span>
                <span class="cost-badge">{{ formatCost(item.cost) }}</span>
                <span class="text-muted">Drying {{ formatDate(item.dryingAt) }}</span>
              </div>
            </div>
          </div>
          <div class="laundry-actions" @click.stop>
            <button class="btn btn-sm cancel-btn" @click="cancelItem(item.id)">
              Cancel
            </button>
            <button class="btn btn-sm done-btn" @click="markDone(item.id)">
              Done!
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Done Items -->
    <div v-if="activeTab === 'done'" class="section">
      <div v-if="doneItems.length === 0" class="empty-state">
        <img src="/images/vio_sit.png" alt="" class="empty-state-vio" />
        <div class="empty-state-title">No history yet</div>
        <div class="empty-state-text">Completed laundry will show here</div>
      </div>

      <div v-else class="list">
        <div v-for="item in doneItems" :key="item.id" class="laundry-item done" @click="openEditModal(item)">
          <div class="laundry-item-main">
            <div class="laundry-icon done">✓</div>
            <div class="laundry-content">
              <div class="laundry-name">{{ item.name }}</div>
              <div class="laundry-meta">
                <span class="location-badge" :class="item.location">
                  {{ getLocation(item.location).icon }} {{ getLocation(item.location).name }}
                </span>
                <span class="cost-badge">{{ formatCost(item.cost) }}</span>
                <span class="text-muted">{{ formatDate(item.completedAt) }}</span>
              </div>
            </div>
            <!-- Logged checkbox -->
            <div class="logged-status" @click.stop>
              <label class="logged-checkbox">
                <input
                  type="checkbox"
                  :checked="item.logged"
                  @change="toggleLogged(item)"
                />
                <span class="checkmark">{{ item.logged ? '✓' : '' }}</span>
                <span class="logged-label">Logged</span>
              </label>
            </div>
          </div>
          <div class="laundry-actions" @click.stop>
            <button class="btn btn-sm cancel-btn" @click="cancelItem(item.id)">
              Redo
            </button>
            <button class="btn btn-ghost btn-sm" @click="deleteItem(item.id)">
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Modal -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">Add Laundry</h3>
          <button class="modal-close" @click="showAddModal = false">×</button>
        </div>

        <div class="input-group">
          <label class="input-label">What needs washing?</label>
          <input
            v-model="newItem.name"
            type="text"
            class="input"
            placeholder="e.g., Bed sheets, Work clothes..."
          />
        </div>

        <div class="input-group">
          <label class="input-label">Where?</label>
          <div class="location-selector">
            <button
              v-for="loc in LOCATIONS"
              :key="loc.id"
              class="location-btn"
              :class="{ active: newItem.location === loc.id }"
              @click="newItem.location = loc.id"
            >
              <span class="location-btn-icon">{{ loc.icon }}</span>
              <span class="location-btn-label">{{ loc.name }}</span>
            </button>
          </div>
        </div>

        <div class="input-group">
          <label class="input-label">Cost (IDR)</label>
          <input
            v-model="newItem.cost"
            type="number"
            class="input"
            placeholder="e.g., 15000"
            inputmode="numeric"
          />
        </div>

        <div class="input-group">
          <label class="input-label">Notes (optional)</label>
          <input
            v-model="newItem.notes"
            type="text"
            class="input"
            placeholder="e.g., Delicate cycle, cold water..."
          />
        </div>

        <button class="btn btn-primary btn-lg w-full" @click="addItem">
          Add to Laundry
        </button>
      </div>
    </div>

    <!-- Edit Modal -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">Edit Laundry</h3>
          <button class="modal-close" @click="showEditModal = false">×</button>
        </div>

        <div class="input-group">
          <label class="input-label">What needs washing?</label>
          <input
            v-model="editForm.name"
            type="text"
            class="input"
            placeholder="e.g., Bed sheets, Work clothes..."
          />
        </div>

        <div class="input-group">
          <label class="input-label">Where?</label>
          <div class="location-selector">
            <button
              v-for="loc in LOCATIONS"
              :key="loc.id"
              class="location-btn"
              :class="{ active: editForm.location === loc.id }"
              @click="editForm.location = loc.id"
            >
              <span class="location-btn-icon">{{ loc.icon }}</span>
              <span class="location-btn-label">{{ loc.name }}</span>
            </button>
          </div>
        </div>

        <div class="input-group">
          <label class="input-label">Cost (IDR)</label>
          <input
            v-model="editForm.cost"
            type="number"
            class="input"
            placeholder="e.g., 15000"
            inputmode="numeric"
          />
        </div>

        <div class="input-group">
          <label class="input-label">Notes (optional)</label>
          <input
            v-model="editForm.notes"
            type="text"
            class="input"
            placeholder="e.g., Delicate cycle, cold water..."
          />
        </div>

        <div class="input-group">
          <label class="logged-checkbox modal-logged">
            <input
              type="checkbox"
              v-model="editForm.logged"
            />
            <span class="checkmark">{{ editForm.logged ? '✓' : '' }}</span>
            <span class="logged-label">Logged to Finance</span>
          </label>
        </div>

        <button class="btn btn-primary btn-lg w-full" @click="saveEdit">
          Save Changes
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Laundry Banner */
.laundry-banner {
  position: relative;
  display: flex;
  align-items: center;
  background:
    linear-gradient(135deg, rgba(59, 130, 246, 0.8) 0%, rgba(96, 165, 250, 0.8) 50%, rgba(147, 197, 253, 0.8) 100%),
    url('/images/kawaii-bg.jpg') center center / cover no-repeat;
  border-radius: var(--radius-xl);
  overflow: hidden;
  min-height: 120px;
  margin-bottom: var(--space-md);
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
}

.laundry-banner-content {
  flex: 1;
  padding: var(--space-lg);
}

.laundry-banner-title {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.laundry-banner-subtitle {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 4px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.laundry-banner-vio {
  height: 120px;
  width: auto;
  flex-shrink: 0;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
  align-self: flex-end;
  margin-right: var(--space-sm);
}

@media (max-width: 480px) {
  .laundry-banner-title {
    font-size: 1.5rem;
  }

  .laundry-banner-vio {
    height: 100px;
  }
}

/* Blue theme for laundry page */
.page :deep(h1),
.page :deep(.section-title) {
  color: var(--blue-500);
}

.stat-number {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 700;
  color: var(--blue-500);
}

.stat-number.washing {
  color: var(--blue-300);
}

.laundry-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--white);
  border-radius: var(--radius-md);
  border: 1px solid var(--blue-100);
}

.laundry-item-main {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
}

.laundry-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.laundry-icon.pending {
  background: var(--blue-100);
}

.laundry-icon.washing {
  background: var(--blue-200);
}

.laundry-icon.done {
  background: rgba(35, 225, 124, 0.2);
  color: #1a8a50;
  font-weight: bold;
}

.laundry-content {
  flex: 1;
  min-width: 0;
}

.laundry-name {
  font-weight: 600;
  color: var(--gray-700);
  margin-bottom: 4px;
}

.laundry-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  align-items: center;
  font-size: 0.8125rem;
}

.location-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 600;
}

.location-badge.home {
  background: var(--mint-soft);
  color: #3d7a5a;
}

.location-badge.puro {
  background: #fff3e0;
  color: #e65100;
}

.location-badge.aries {
  background: #e8eaf6;
  color: #3949ab;
}

.cost-badge {
  background: var(--blue-100);
  color: var(--blue-600);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 600;
}

.stat-number.drying {
  color: #f59e0b;
}

.laundry-icon.drying {
  background: #fef3c7;
}

.drying-btn {
  background: #fbbf24;
  color: white;
}

.done-btn {
  background: var(--income-color);
  color: white;
}

.cancel-btn {
  background: var(--gray-200);
  color: var(--gray-600);
}

.cancel-btn:hover {
  background: var(--gray-300);
}

/* Logged checkbox */
.logged-status {
  margin-left: auto;
  flex-shrink: 0;
}

.logged-checkbox {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  cursor: pointer;
  font-size: 0.75rem;
}

.logged-checkbox input {
  display: none;
}

.logged-checkbox .checkmark {
  width: 20px;
  height: 20px;
  border: 2px solid var(--blue-300);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: white;
  background: var(--white);
  transition: all var(--transition-fast);
}

.logged-checkbox input:checked + .checkmark {
  background: var(--income-color);
  border-color: var(--income-color);
}

.logged-checkbox .logged-label {
  color: var(--gray-500);
  font-weight: 500;
}

.modal-logged {
  padding: var(--space-md);
  background: var(--blue-50);
  border-radius: var(--radius-md);
}

.modal-logged .logged-label {
  color: var(--blue-600);
}

.laundry-notes {
  color: var(--gray-500);
  font-style: italic;
}

.laundry-actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
}

.laundry-item.done {
  opacity: 0.7;
}

.location-selector {
  display: flex;
  gap: var(--space-sm);
}

.location-btn {
  flex: 1;
  padding: var(--space-md);
  border: 2px solid var(--blue-200);
  border-radius: var(--radius-md);
  background: var(--white);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: center;
}

.location-btn.active {
  border-color: var(--blue-400);
  background: var(--blue-50);
}

.location-btn-icon {
  font-size: 1.5rem;
  display: block;
  margin-bottom: var(--space-xs);
}

.location-btn-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--gray-700);
}

.spin {
  display: inline-block;
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Blue theme for tabs */
.page :deep(.tabs) {
  background: var(--blue-50);
}

.page :deep(.tab) {
  color: var(--blue-400);
}

.page :deep(.tab.active) {
  color: var(--blue-500);
  border-bottom-color: var(--blue-500);
}

/* Blue theme for cards */
.page :deep(.card) {
  border-color: var(--blue-100);
}

/* Blue theme for modal */
.page :deep(.modal-title) {
  color: var(--blue-500);
}

.page :deep(.modal-close) {
  color: var(--blue-400);
}

.page :deep(.modal-close:hover) {
  color: var(--blue-600);
}

/* Blue theme for inputs */
.page :deep(.input:focus) {
  border-color: var(--blue-400);
  box-shadow: 0 0 0 3px rgba(102, 160, 201, 0.15);
}

.page :deep(.input-label) {
  color: var(--blue-500);
}

/* Blue primary button in laundry */
.page :deep(.btn-primary) {
  background: linear-gradient(135deg, var(--blue-300) 0%, var(--blue-500) 100%);
}

.page :deep(.btn-primary:hover) {
  background: linear-gradient(135deg, var(--blue-400) 0%, var(--blue-600) 100%);
}

/* Vio sitting in empty state */
.empty-state-vio {
  width: 120px;
  height: auto;
  margin-bottom: var(--space-md);
  opacity: 0.9;
}
</style>

<style>
/* Dark mode styles */
[data-theme="dark"] .laundry-banner {
  background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 50%, #60A5FA 100%) !important;
}

[data-theme="dark"] .laundry-page .card {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .laundry-page .laundry-item {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .laundry-page .tabs {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .laundry-page .tab.active {
  background: #2D2640 !important;
  color: #C4B5FD !important;
}
</style>
