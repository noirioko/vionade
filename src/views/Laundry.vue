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
const activeTab = ref('active') // 'active', 'history'

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

// Active items
const pendingItems = computed(() =>
  laundryItems.value.filter(item => item.status === 'pending')
)

const washingItems = computed(() =>
  laundryItems.value.filter(item => item.status === 'washing')
)

const dryingItems = computed(() =>
  laundryItems.value.filter(item => item.status === 'drying')
)

const activeCount = computed(() =>
  pendingItems.value.length + washingItems.value.length + dryingItems.value.length
)

// History - ALL done items, no cap
const allDoneItems = computed(() =>
  laundryItems.value
    .filter(item => item.status === 'done')
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
)

// History month selector
const historyDate = ref(new Date())

const historyMonthOptions = computed(() => {
  const now = new Date()
  let earliest = new Date(now.getFullYear(), now.getMonth(), 1)

  allDoneItems.value.forEach(item => {
    const d = new Date(item.completedAt)
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
    if (monthStart < earliest) earliest = monthStart
  })

  const months = []
  const cursor = new Date(now.getFullYear(), now.getMonth(), 1)

  while (cursor >= earliest) {
    months.push({
      key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
      year: cursor.getFullYear(),
      month: cursor.getMonth(),
      label: cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    })
    cursor.setMonth(cursor.getMonth() - 1)
  }

  return months
})

function onHistoryMonthSelect(event) {
  const [year, month] = event.target.value.split('-').map(Number)
  historyDate.value = new Date(year, month, 1)
}

const historyMonthItems = computed(() => {
  const year = historyDate.value.getFullYear()
  const month = historyDate.value.getMonth()
  return allDoneItems.value.filter(item => {
    const d = new Date(item.completedAt)
    return d.getFullYear() === year && d.getMonth() === month
  })
})

const historyMonthCost = computed(() =>
  historyMonthItems.value.reduce((sum, item) => sum + (item.cost || 0), 0)
)

// Stats
const totalDone = computed(() => allDoneItems.value.length)
const totalSpent = computed(() =>
  allDoneItems.value.reduce((sum, item) => sum + (item.cost || 0), 0)
)

// CRUD
function addItem() {
  if (!newItem.value.name.trim()) return

  const item = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
    name: newItem.value.name.trim(),
    location: newItem.value.location,
    notes: newItem.value.notes.trim(),
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
    item.name = editForm.value.name.trim()
    item.location = editForm.value.location
    item.notes = editForm.value.notes.trim()
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
  <div class="page laundry-page media-page">
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

    <!-- Desktop Layout -->
    <div class="laundry-layout">
      <!-- Desktop Sidebar -->
      <aside class="laundry-sidebar">
        <nav class="sidebar-nav">
          <button
            class="sidebar-item"
            :class="{ active: activeTab === 'active' }"
            @click="activeTab = 'active'"
          >
            <span class="sidebar-icon">🧺</span>
            <span class="sidebar-label">Active</span>
            <span v-if="activeCount > 0" class="sidebar-count">{{ activeCount }}</span>
          </button>
          <button
            class="sidebar-item"
            :class="{ active: activeTab === 'history' }"
            @click="activeTab = 'history'"
          >
            <span class="sidebar-icon">📖</span>
            <span class="sidebar-label">History</span>
            <span class="sidebar-count">{{ totalDone }}</span>
          </button>
        </nav>

        <!-- Sidebar Stats -->
        <div class="sidebar-stats-card">
          <div class="sidebar-stat-row">
            <span class="sidebar-stat-label">👕 To Wash</span>
            <span class="sidebar-stat-value">{{ pendingItems.length }}</span>
          </div>
          <div class="sidebar-stat-row">
            <span class="sidebar-stat-label">🌀 Washing</span>
            <span class="sidebar-stat-value">{{ washingItems.length }}</span>
          </div>
          <div class="sidebar-stat-row">
            <span class="sidebar-stat-label">☀️ Drying</span>
            <span class="sidebar-stat-value">{{ dryingItems.length }}</span>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="laundry-content">
        <!-- Mobile Tabs -->
        <div class="laundry-tabs mobile-only">
          <button
            class="laundry-tab"
            :class="{ active: activeTab === 'active' }"
            @click="activeTab = 'active'"
          >🧺 Active <span v-if="activeCount > 0">({{ activeCount }})</span></button>
          <button
            class="laundry-tab"
            :class="{ active: activeTab === 'history' }"
            @click="activeTab = 'history'"
          >📖 History</button>
        </div>

        <!-- ACTIVE TAB -->
        <template v-if="activeTab === 'active'">
          <!-- Quick Stats (mobile) -->
          <div class="quick-stats mobile-only">
            <div class="qs-item">
              <div class="qs-value">{{ pendingItems.length }}</div>
              <div class="qs-label">To Wash</div>
            </div>
            <div class="qs-divider"></div>
            <div class="qs-item">
              <div class="qs-value washing">{{ washingItems.length }}</div>
              <div class="qs-label">Washing</div>
            </div>
            <div class="qs-divider"></div>
            <div class="qs-item">
              <div class="qs-value drying">{{ dryingItems.length }}</div>
              <div class="qs-label">Drying</div>
            </div>
          </div>

          <!-- Pending Section -->
          <div v-if="pendingItems.length > 0" class="status-section">
            <h3 class="status-header"><span class="status-dot pending"></span>To Wash</h3>
            <div class="list">
              <div v-for="item in pendingItems" :key="item.id" class="laundry-item" @click="openEditModal(item)">
                <div class="laundry-item-main">
                  <div class="laundry-icon pending">👕</div>
                  <div class="laundry-content-info">
                    <div class="laundry-name">{{ item.name }}</div>
                    <div class="laundry-meta">
                      <span class="location-badge" :class="item.location">
                        {{ getLocation(item.location).icon }} {{ getLocation(item.location).name }}
                      </span>
                      <span v-if="item.cost" class="cost-badge">{{ formatCost(item.cost) }}</span>
                    </div>
                    <div v-if="item.notes" class="laundry-notes">{{ item.notes }}</div>
                  </div>
                </div>
                <div class="laundry-actions" @click.stop>
                  <button class="btn btn-primary btn-sm" @click="startWashing(item.id)">Start Wash</button>
                  <button class="btn btn-ghost btn-sm" @click="deleteItem(item.id)">✕</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Washing Section -->
          <div v-if="washingItems.length > 0" class="status-section">
            <h3 class="status-header"><span class="status-dot washing"></span>Washing</h3>
            <div class="list">
              <div v-for="item in washingItems" :key="item.id" class="laundry-item" @click="openEditModal(item)">
                <div class="laundry-item-main">
                  <div class="laundry-icon washing"><span class="spin">🌀</span></div>
                  <div class="laundry-content-info">
                    <div class="laundry-name">{{ item.name }}</div>
                    <div class="laundry-meta">
                      <span class="location-badge" :class="item.location">
                        {{ getLocation(item.location).icon }} {{ getLocation(item.location).name }}
                      </span>
                      <span v-if="item.cost" class="cost-badge">{{ formatCost(item.cost) }}</span>
                      <span class="date-text">Started {{ formatDate(item.startedAt) }}</span>
                    </div>
                  </div>
                </div>
                <div class="laundry-actions" @click.stop>
                  <button class="btn btn-sm cancel-btn" @click="cancelItem(item.id)">Cancel</button>
                  <button class="btn btn-sm drying-btn" @click="startDrying(item.id)">Dry</button>
                  <button class="btn btn-sm done-btn" @click="markDone(item.id)">Done!</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Drying Section -->
          <div v-if="dryingItems.length > 0" class="status-section">
            <h3 class="status-header"><span class="status-dot drying-dot"></span>Drying</h3>
            <div class="list">
              <div v-for="item in dryingItems" :key="item.id" class="laundry-item" @click="openEditModal(item)">
                <div class="laundry-item-main">
                  <div class="laundry-icon drying">☀️</div>
                  <div class="laundry-content-info">
                    <div class="laundry-name">{{ item.name }}</div>
                    <div class="laundry-meta">
                      <span class="location-badge" :class="item.location">
                        {{ getLocation(item.location).icon }} {{ getLocation(item.location).name }}
                      </span>
                      <span v-if="item.cost" class="cost-badge">{{ formatCost(item.cost) }}</span>
                      <span class="date-text">Drying {{ formatDate(item.dryingAt) }}</span>
                    </div>
                  </div>
                </div>
                <div class="laundry-actions" @click.stop>
                  <button class="btn btn-sm cancel-btn" @click="cancelItem(item.id)">Cancel</button>
                  <button class="btn btn-sm done-btn" @click="markDone(item.id)">Done!</button>
                </div>
              </div>
            </div>
          </div>

          <!-- All Empty -->
          <div v-if="activeCount === 0" class="empty-state">
            <img src="/images/vio_sit.png" alt="" class="empty-state-vio" />
            <div class="empty-state-title">All caught up!</div>
            <div class="empty-state-text">No laundry in progress. Tap + to add.</div>
          </div>
        </template>

        <!-- HISTORY TAB -->
        <template v-if="activeTab === 'history'">
          <!-- Month Selector -->
          <div class="history-selector">
            <span class="history-selector-icon">📅</span>
            <select
              class="history-select"
              :value="historyDate.getFullYear() + '-' + historyDate.getMonth()"
              @change="onHistoryMonthSelect($event)"
            >
              <option
                v-for="m in historyMonthOptions"
                :key="m.key"
                :value="m.key"
              >{{ m.label }}</option>
            </select>
          </div>

          <!-- Month Stats -->
          <div class="history-stats">
            <div class="history-stat-box">
              <span class="history-stat-emoji">✅</span>
              <div class="history-stat-info">
                <div class="history-stat-value">{{ historyMonthItems.length }}</div>
                <div class="history-stat-label">completed</div>
              </div>
            </div>
            <div class="history-stat-box">
              <span class="history-stat-emoji">💸</span>
              <div class="history-stat-info">
                <div class="history-stat-value">{{ formatCost(historyMonthCost) || 'Rp0' }}</div>
                <div class="history-stat-label">spent</div>
              </div>
            </div>
          </div>

          <!-- Done Items -->
          <div v-if="historyMonthItems.length === 0" class="empty-state">
            <img src="/images/vio_sit.png" alt="" class="empty-state-vio" />
            <div class="empty-state-title">No history this month</div>
            <div class="empty-state-text">Completed laundry will show here</div>
          </div>

          <div v-else class="list">
            <div v-for="item in historyMonthItems" :key="item.id" class="laundry-item done-item" @click="openEditModal(item)">
              <div class="laundry-item-main">
                <div class="laundry-icon done-icon">✓</div>
                <div class="laundry-content-info">
                  <div class="laundry-name">{{ item.name }}</div>
                  <div class="laundry-meta">
                    <span class="location-badge" :class="item.location">
                      {{ getLocation(item.location).icon }} {{ getLocation(item.location).name }}
                    </span>
                    <span v-if="item.cost" class="cost-badge">{{ formatCost(item.cost) }}</span>
                    <span class="date-text">{{ formatDate(item.completedAt) }}</span>
                  </div>
                </div>
                <!-- Logged checkbox -->
                <div class="logged-status" @click.stop>
                  <label class="logged-checkbox">
                    <input type="checkbox" :checked="item.logged" @change="toggleLogged(item)" />
                    <span class="checkmark">{{ item.logged ? '✓' : '' }}</span>
                    <span class="logged-label">Logged</span>
                  </label>
                </div>
              </div>
              <div class="laundry-actions" @click.stop>
                <button class="btn btn-sm cancel-btn" @click="cancelItem(item.id)">Redo</button>
                <button class="btn btn-ghost btn-sm" @click="deleteItem(item.id)">✕</button>
              </div>
            </div>
          </div>
        </template>
      </main>
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
          <input v-model="newItem.name" type="text" class="input" placeholder="e.g., Bed sheets, Work clothes..." />
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
          <input v-model="newItem.cost" type="number" class="input" placeholder="e.g., 15000" inputmode="numeric" />
        </div>

        <div class="input-group">
          <label class="input-label">Notes (optional)</label>
          <input v-model="newItem.notes" type="text" class="input" placeholder="e.g., Delicate cycle, cold water..." />
        </div>

        <button class="btn btn-primary btn-lg w-full" @click="addItem">Add to Laundry</button>
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
          <input v-model="editForm.name" type="text" class="input" placeholder="e.g., Bed sheets, Work clothes..." />
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
          <input v-model="editForm.cost" type="number" class="input" placeholder="e.g., 15000" inputmode="numeric" />
        </div>

        <div class="input-group">
          <label class="input-label">Notes (optional)</label>
          <input v-model="editForm.notes" type="text" class="input" placeholder="e.g., Delicate cycle, cold water..." />
        </div>

        <div class="input-group">
          <label class="logged-checkbox modal-logged">
            <input type="checkbox" v-model="editForm.logged" />
            <span class="checkmark">{{ editForm.logged ? '✓' : '' }}</span>
            <span class="logged-label">Logged to Finance</span>
          </label>
        </div>

        <button class="btn btn-primary btn-lg w-full" @click="saveEdit">Save Changes</button>
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
  .laundry-banner-title { font-size: 1.5rem; }
  .laundry-banner-vio { height: 100px; }
}

/* Layout */
.laundry-layout { display: block; }
.laundry-sidebar { display: none; }
.laundry-content { width: 100%; }

/* Mobile Tabs */
.laundry-tabs {
  display: flex;
  gap: var(--space-xs);
  margin-bottom: var(--space-md);
  background: var(--white);
  border-radius: var(--radius-lg);
  padding: var(--space-xs);
  border: 2px solid #BFDBFE;
}

.laundry-tab {
  flex: 1;
  padding: var(--space-sm) var(--space-md);
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.laundry-tab.active {
  background: #DBEAFE;
  color: #1E40AF;
}

.mobile-only { display: flex; }

/* Quick Stats (mobile) */
.quick-stats {
  display: flex;
  align-items: center;
  background: var(--white);
  border: 2px solid #BFDBFE;
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  margin-bottom: var(--space-md);
  text-align: center;
}

.qs-item { flex: 1; }
.qs-divider { width: 1px; height: 36px; background: #BFDBFE; }

.qs-value {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.5rem;
  color: #3B82F6;
}

.qs-value.washing { color: #60A5FA; }
.qs-value.drying { color: #F59E0B; }

.qs-label {
  font-size: 0.6875rem;
  color: var(--text-tertiary);
}

/* Sidebar Styles (base in style.css) */
.sidebar-stats-card {
  margin-top: var(--space-md);
  padding: var(--space-md);
  background: linear-gradient(135deg, #DBEAFE, #BFDBFE);
  border: 2px solid #3B82F6;
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.sidebar-stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-stat-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #1E40AF;
}

.sidebar-stat-value {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1rem;
  color: #1E3A8A;
}

/* Status Sections */
.status-section {
  margin-bottom: var(--space-lg);
}

.status-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-family: var(--font-display);
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 var(--space-sm);
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.status-dot.pending { background: #3B82F6; }
.status-dot.washing { background: #60A5FA; }
.status-dot.drying-dot { background: #F59E0B; }

/* Laundry Items */
.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.laundry-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--white);
  border-radius: var(--radius-lg);
  border: 2px solid #BFDBFE;
  transition: all 0.2s;
  cursor: pointer;
}

.laundry-item:hover {
  border-color: #60A5FA;
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

.laundry-icon.pending { background: #DBEAFE; }
.laundry-icon.washing { background: #BFDBFE; }
.laundry-icon.drying { background: #FEF3C7; }
.laundry-icon.done-icon { background: #D1FAE5; color: #059669; font-weight: bold; }

.laundry-content-info {
  flex: 1;
  min-width: 0;
}

.laundry-name {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.laundry-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
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

.location-badge.home { background: #D1FAE5; color: #065F46; }
.location-badge.puro { background: #FFF3E0; color: #E65100; }
.location-badge.aries { background: #E8EAF6; color: #3949AB; }

.cost-badge {
  background: #DBEAFE;
  color: #1E40AF;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 600;
}

.date-text {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.laundry-notes {
  font-size: 0.8125rem;
  color: var(--text-tertiary);
  font-style: italic;
  margin-top: 4px;
}

.laundry-actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
}

.done-item { opacity: 0.8; }

/* Buttons */
.drying-btn { background: #FBBF24; color: white; }
.done-btn { background: #10B981; color: white; }
.cancel-btn { background: var(--gray-200); color: var(--gray-600); }
.cancel-btn:hover { background: var(--gray-300); }

/* Logged */
.logged-status { margin-left: auto; flex-shrink: 0; }

.logged-checkbox {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  cursor: pointer;
  font-size: 0.75rem;
}

.logged-checkbox input { display: none; }

.logged-checkbox .checkmark {
  width: 20px;
  height: 20px;
  border: 2px solid #93C5FD;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: white;
  background: var(--white);
  transition: all 0.15s;
}

.logged-checkbox input:checked + .checkmark {
  background: #10B981;
  border-color: #10B981;
}

.logged-checkbox .logged-label {
  color: var(--text-tertiary);
  font-weight: 500;
}

.modal-logged {
  padding: var(--space-md);
  background: #EFF6FF;
  border-radius: var(--radius-md);
}

.modal-logged .logged-label { color: #1E40AF; }

/* History Selector */
.history-selector {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: linear-gradient(135deg, #DBEAFE, #BFDBFE);
  border: 2px solid #3B82F6;
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-sm);
}

.history-selector-icon { font-size: 1.25rem; }

.history-select {
  flex: 1;
  padding: var(--space-sm) var(--space-md);
  border: 2px solid #2563EB;
  border-radius: var(--radius-md);
  background: white;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.9375rem;
  color: #1E40AF;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%231E40AF' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
}

.history-select:focus {
  outline: none;
  border-color: #3B82F6;
}

/* History Stats */
.history-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}

.history-stat-box {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--white);
  border: 2px solid #BFDBFE;
  border-radius: var(--radius-lg);
}

.history-stat-emoji { font-size: 1.5rem; }

.history-stat-info { flex: 1; min-width: 0; }

.history-stat-value {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.0625rem;
  color: var(--text-primary);
}

.history-stat-label {
  font-size: 0.6875rem;
  color: var(--text-tertiary);
}

/* Location Selector */
.location-selector { display: flex; gap: var(--space-sm); }

.location-btn {
  flex: 1;
  padding: var(--space-md);
  border: 2px solid #BFDBFE;
  border-radius: var(--radius-md);
  background: var(--white);
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
}

.location-btn.active {
  border-color: #3B82F6;
  background: #EFF6FF;
}

.location-btn-icon { font-size: 1.5rem; display: block; margin-bottom: var(--space-xs); }
.location-btn-label { font-size: 0.875rem; font-weight: 600; color: var(--text-primary); }

/* Empty State */
.empty-state { text-align: center; padding: var(--space-xl); }

.empty-state-vio {
  width: 120px;
  height: auto;
  margin-bottom: var(--space-md);
  opacity: 0.9;
}

.empty-state-title {
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--space-xs);
}

.empty-state-text {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* Spin animation */
.spin {
  display: inline-block;
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Blue theme overrides */
.laundry-page :deep(.modal-title) { color: #3B82F6; }
.laundry-page :deep(.modal-close) { color: #60A5FA; }
.laundry-page :deep(.modal-close:hover) { color: #2563EB; }
.laundry-page :deep(.input:focus) { border-color: #60A5FA; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15); }
.laundry-page :deep(.input-label) { color: #3B82F6; }
.laundry-page :deep(.btn-primary) { background: linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%); }
.laundry-page :deep(.btn-primary:hover) { background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); }

/* Desktop (768px+) */
@media (min-width: 768px) {
  .mobile-only { display: none !important; }

  .laundry-layout {
    display: grid;
    grid-template-columns: 240px 1fr;
    gap: var(--space-lg);
  }

  .laundry-sidebar {
    display: flex;
    flex-direction: column;
    position: sticky;
    top: var(--space-md);
    height: fit-content;
    max-height: calc(100vh - 200px);
  }
}

@media (min-width: 1024px) {
  .laundry-layout { grid-template-columns: 260px 1fr; }
}
</style>

<style>
/* Dark mode */
[data-theme="dark"] .laundry-banner {
  background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 50%, #60A5FA 100%) !important;
}

[data-theme="dark"] .laundry-tabs {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .laundry-tab.active {
  background: #2D2640 !important;
  color: #93C5FD !important;
}

[data-theme="dark"] .quick-stats {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .qs-divider {
  background: #3D3456 !important;
}

[data-theme="dark"] .laundry-item {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .laundry-item:hover {
  border-color: #60A5FA !important;
}

[data-theme="dark"] .sidebar-stats-card {
  background: linear-gradient(135deg, #1E3A5F, #1A1625) !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .sidebar-stat-label {
  color: #93C5FD !important;
}

[data-theme="dark"] .sidebar-stat-value {
  color: #BFDBFE !important;
}

[data-theme="dark"] .history-selector {
  background: linear-gradient(135deg, #1E3A5F, #1A1625) !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .history-select {
  background-color: #1A1625 !important;
  border-color: #3D3456 !important;
  color: #93C5FD !important;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2393C5FD' d='M6 8L1 3h10z'/%3E%3C/svg%3E") !important;
}

[data-theme="dark"] .history-stat-box {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .location-btn {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .location-btn.active {
  border-color: #3B82F6 !important;
  background: #1E3A5F !important;
}

[data-theme="dark"] .cost-badge {
  background: #1E3A5F !important;
  color: #93C5FD !important;
}

[data-theme="dark"] .logged-checkbox .checkmark {
  border-color: #3D3456 !important;
  background: #2D2640 !important;
}

[data-theme="dark"] .logged-checkbox input:checked + .checkmark {
  background: #10B981 !important;
  border-color: #10B981 !important;
}

[data-theme="dark"] .modal-logged {
  background: #2D2640 !important;
}

[data-theme="dark"] .modal-logged .logged-label {
  color: #93C5FD !important;
}
</style>
