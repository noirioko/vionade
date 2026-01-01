<script setup>
import { ref, computed, inject, onMounted, onUnmounted } from 'vue'
import { useFinanceStore } from '../stores'
import { petActions, getActionKeywords, getStatusColor, formatDaysAgo } from '../data/petActions'

const store = useFinanceStore()
const fabAction = inject('fabAction')

// Quick entry state
const quickInput = ref('')
const selectedDate = ref(new Date().toISOString().split('T')[0])
const parsedEntry = ref(null)
const showAutocomplete = ref(false)

// Filter state
const dateFilter = ref('7') // '7', '30', '90', 'all'
const petFilter = ref('all')
const actionFilter = ref('all')

// Pagination state
const displayLimit = ref(20)

// Modal state
const showAddPetModal = ref(false)
const editingPet = ref(null)
const petForm = ref({ name: '', nickname: '', photo: '', notes: '' })

// Compute date range for filter
const dateRange = computed(() => {
  if (dateFilter.value === 'all') return { start: null, end: null }
  const days = parseInt(dateFilter.value)
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  }
})

// Filtered and paginated logs
const filteredLogs = computed(() => {
  const { logs, total } = store.getPetLogs({
    petId: petFilter.value !== 'all' ? petFilter.value : null,
    action: actionFilter.value !== 'all' ? actionFilter.value : null,
    startDate: dateRange.value.start,
    endDate: dateRange.value.end,
    limit: displayLimit.value,
    offset: 0
  })
  return { logs, total }
})

// Group logs by date
const groupedLogs = computed(() => {
  const groups = {}
  filteredLogs.value.logs.forEach(log => {
    const date = log.date
    if (!groups[date]) groups[date] = []
    groups[date].push(log)
  })
  return groups
})

// Autocomplete suggestions
const suggestions = computed(() => {
  const input = quickInput.value.toLowerCase().trim()
  if (!input) return []

  return store.pets.value
    .filter(p => p.nickname.startsWith(input) || p.name.toLowerCase().startsWith(input))
    .slice(0, 5)
})

// Parse quick entry as user types
function parseInput() {
  const actionKeywords = getActionKeywords()
  parsedEntry.value = store.parseQuickEntry(quickInput.value, actionKeywords)
}

// Select suggestion
function selectSuggestion(pet) {
  quickInput.value = pet.nickname + ' '
  showAutocomplete.value = false
  parseInput()
}

// Submit quick entry
function submitEntry() {
  if (!parsedEntry.value) return

  store.addPetLog({
    petId: parsedEntry.value.pet.id,
    petName: parsedEntry.value.pet.name,
    action: parsedEntry.value.action,
    note: parsedEntry.value.note,
    date: selectedDate.value
  })

  quickInput.value = ''
  parsedEntry.value = null
  selectedDate.value = new Date().toISOString().split('T')[0]
}

// Delete log
function deleteLog(id) {
  if (confirm('Delete this log?')) {
    store.deletePetLog(id)
  }
}

// Load more logs
function loadMore() {
  displayLimit.value += 20
}

// Format date header
function formatDateHeader(dateStr) {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  if (dateStr === today.toISOString().split('T')[0]) return 'Today'
  if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday'

  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

// Format time from createdAt
function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

// Pet modal functions
function openAddPet() {
  editingPet.value = null
  petForm.value = { name: '', nickname: '', photo: '', notes: '' }
  showAddPetModal.value = true
}

function openEditPet(pet) {
  editingPet.value = pet
  petForm.value = { ...pet }
  showAddPetModal.value = true
}

function savePet() {
  if (!petForm.value.name.trim()) return

  if (editingPet.value) {
    store.updatePet(editingPet.value.id, petForm.value)
  } else {
    store.addPet(petForm.value)
  }
  showAddPetModal.value = false
}

function deletePet(id) {
  if (confirm('Delete this pet? This will NOT delete their logs.')) {
    store.deletePet(id)
    showAddPetModal.value = false
  }
}

// FAB action
onMounted(() => {
  fabAction.value = openAddPet
})

onUnmounted(() => {
  fabAction.value = null
})
</script>

<template>
  <div class="page">
    <!-- Header -->
    <div class="page-header">
      <img src="/images/vio-logo.png" alt="Vionade" class="page-header-logo" />
    </div>

    <h1 class="page-title">Pet Tracker</h1>
    <p class="page-subtitle">Quick log for your {{ store.pets.value.length }} cats</p>

    <!-- Quick Entry Section -->
    <div class="quick-entry-section">
      <div class="quick-entry-header">
        <span class="quick-entry-icon">🐱</span>
        <span>Quick Log</span>
      </div>

      <div class="quick-entry-row">
        <div class="quick-entry-input-wrapper">
          <input
            v-model="quickInput"
            type="text"
            class="quick-entry-input"
            placeholder="pong bath"
            @input="parseInput(); showAutocomplete = true"
            @focus="showAutocomplete = true"
            @keydown.enter="submitEntry"
          />

          <!-- Autocomplete dropdown -->
          <div v-if="showAutocomplete && suggestions.length > 0" class="autocomplete-dropdown">
            <div
              v-for="pet in suggestions"
              :key="pet.id"
              class="autocomplete-item"
              @click="selectSuggestion(pet)"
            >
              <span class="autocomplete-name">{{ pet.name }}</span>
              <span class="autocomplete-nickname">{{ pet.nickname }}</span>
            </div>
          </div>
        </div>

        <input
          v-model="selectedDate"
          type="date"
          class="date-picker"
        />

        <button
          class="add-btn"
          :disabled="!parsedEntry"
          @click="submitEntry"
        >
          Add
        </button>
      </div>

      <!-- Preview -->
      <div v-if="parsedEntry" class="entry-preview valid">
        <span class="preview-emoji">{{ petActions[parsedEntry.action]?.emoji }}</span>
        <span class="preview-text">
          {{ parsedEntry.pet.name }} - {{ petActions[parsedEntry.action]?.label }}
          <span v-if="parsedEntry.note" class="preview-note">• {{ parsedEntry.note }}</span>
        </span>
      </div>

      <!-- Hint when no pets -->
      <div v-else-if="store.pets.value.length === 0" class="entry-preview hint">
        <span class="preview-emoji">💡</span>
        <span class="preview-text">Add your cats first using the + button below!</span>
      </div>

      <!-- Format hint -->
      <div v-else-if="quickInput.length > 0 && !parsedEntry" class="entry-preview hint">
        <span class="preview-emoji">💡</span>
        <span class="preview-text">Format: [nickname] [action] • Actions: bath, vet, flea, vaccine, deworm, nail, sick, medicine, weight</span>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-section">
      <div class="filter-group">
        <span class="filter-label">Time:</span>
        <div class="filter-pills">
          <button
            v-for="opt in [{v: '7', l: '7 Days'}, {v: '30', l: '30 Days'}, {v: '90', l: '3 Months'}, {v: 'all', l: 'All'}]"
            :key="opt.v"
            class="filter-pill"
            :class="{ active: dateFilter === opt.v }"
            @click="dateFilter = opt.v; displayLimit = 20"
          >{{ opt.l }}</button>
        </div>
      </div>

      <div class="filter-group">
        <span class="filter-label">Cat:</span>
        <div class="filter-pills">
          <button
            class="filter-pill"
            :class="{ active: petFilter === 'all' }"
            @click="petFilter = 'all'; displayLimit = 20"
          >All</button>
          <button
            v-for="pet in store.pets.value"
            :key="pet.id"
            class="filter-pill"
            :class="{ active: petFilter === pet.id }"
            @click="petFilter = pet.id; displayLimit = 20"
          >{{ pet.nickname }}</button>
        </div>
      </div>

      <div class="filter-group">
        <span class="filter-label">Action:</span>
        <div class="filter-pills">
          <button
            class="filter-pill"
            :class="{ active: actionFilter === 'all' }"
            @click="actionFilter = 'all'; displayLimit = 20"
          >All</button>
          <button
            v-for="(action, key) in petActions"
            :key="key"
            class="filter-pill"
            :class="{ active: actionFilter === key }"
            @click="actionFilter = key; displayLimit = 20"
          >{{ action.emoji }}</button>
        </div>
      </div>
    </div>

    <!-- Log Feed -->
    <div class="log-feed">
      <div class="log-count">
        Showing {{ filteredLogs.logs.length }} of {{ filteredLogs.total }} logs
      </div>

      <div v-if="filteredLogs.logs.length === 0" class="empty-state">
        <img src="/images/vio_sit.png" alt="Vio" class="empty-vio" />
        <p>No logs found. Try a different filter or add your first log!</p>
      </div>

      <div v-for="(logs, date) in groupedLogs" :key="date" class="log-group">
        <div class="log-date-header">📅 {{ formatDateHeader(date) }}</div>

        <div
          v-for="log in logs"
          :key="log.id"
          class="log-card"
        >
          <span class="log-emoji">{{ petActions[log.action]?.emoji || '📝' }}</span>
          <div class="log-content">
            <span class="log-pet">{{ log.petName }}</span>
            <span class="log-action">{{ petActions[log.action]?.label || log.action }}</span>
            <span v-if="log.note" class="log-note">{{ log.note }}</span>
          </div>
          <span class="log-time">{{ formatTime(log.createdAt) }}</span>
          <button class="log-delete" @click="deleteLog(log.id)">×</button>
        </div>
      </div>

      <button
        v-if="filteredLogs.logs.length < filteredLogs.total"
        class="load-more-btn"
        @click="loadMore"
      >
        Load More
      </button>
    </div>

    <!-- Pet List -->
    <div class="pet-list-section">
      <div class="section-banner">
        <div class="section-banner-content">
          <span class="section-banner-icon">🐱</span>
          <span class="section-banner-title">Your Cats</span>
        </div>
        <button class="add-pet-btn" @click="openAddPet">+ Add</button>
      </div>

      <div class="pet-grid">
        <div
          v-for="pet in store.pets.value"
          :key="pet.id"
          class="pet-card"
          @click="openEditPet(pet)"
        >
          <div class="pet-avatar">
            <img v-if="pet.photo" :src="pet.photo" :alt="pet.name" />
            <span v-else>🐱</span>
          </div>
          <div class="pet-info">
            <span class="pet-name">{{ pet.name }}</span>
            <span class="pet-nickname">{{ pet.nickname }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Pet Modal -->
    <div v-if="showAddPetModal" class="modal-overlay" @click.self="showAddPetModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingPet ? 'Edit Pet' : 'Add New Pet' }}</h3>
          <button class="modal-close" @click="showAddPetModal = false">×</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>Name</label>
            <input v-model="petForm.name" type="text" placeholder="Pong Pong" />
          </div>

          <div class="form-group">
            <label>Nickname (for quick entry)</label>
            <input v-model="petForm.nickname" type="text" placeholder="pong" />
          </div>

          <div class="form-group">
            <label>Photo URL (optional)</label>
            <input v-model="petForm.photo" type="url" placeholder="https://..." />
          </div>

          <div class="form-group">
            <label>Notes</label>
            <textarea v-model="petForm.notes" placeholder="Orange tabby, grumpy"></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button v-if="editingPet" class="delete-btn" @click="deletePet(editingPet.id)">Delete</button>
          <button class="save-btn" @click="savePet">{{ editingPet ? 'Save' : 'Add Pet' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 var(--space-xs);
}

.page-subtitle {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin: 0 0 var(--space-lg);
}

/* Quick Entry */
.quick-entry-section {
  background: #00BFFF;
  border: 3px solid #0099CC;
  border-radius: 16px;
  padding: var(--space-md);
  margin-bottom: var(--space-lg);
  box-shadow: 4px 4px 0 #0099CC;
}

.quick-entry-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-weight: 700;
  color: white;
  margin-bottom: var(--space-sm);
}

.quick-entry-icon {
  font-size: 1.25rem;
}

.quick-entry-row {
  display: flex;
  gap: var(--space-sm);
}

.quick-entry-input-wrapper {
  flex: 1;
  position: relative;
}

.quick-entry-input {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  border: 3px solid #006994;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  background: white;
}

.quick-entry-input:focus {
  outline: none;
  border-color: #FFE135;
}

.date-picker {
  padding: var(--space-sm);
  border: 3px solid #006994;
  border-radius: 12px;
  font-weight: 600;
  background: white;
  cursor: pointer;
}

.add-btn {
  padding: var(--space-sm) var(--space-lg);
  background: #FFE135;
  border: 3px solid #F9D423;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 3px 3px 0 #006994;
  transition: all 0.1s;
}

.add-btn:hover:not(:disabled) {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 #006994;
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Autocomplete */
.autocomplete-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 3px solid #006994;
  border-radius: 12px;
  margin-top: 4px;
  z-index: 100;
  overflow: hidden;
}

.autocomplete-item {
  padding: var(--space-sm) var(--space-md);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
}

.autocomplete-item:hover {
  background: #E0F7FA;
}

.autocomplete-name {
  font-weight: 600;
}

.autocomplete-nickname {
  color: var(--text-secondary);
}

/* Preview */
.entry-preview {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  color: white;
  font-weight: 600;
}

.preview-emoji {
  font-size: 1.25rem;
}

.preview-note {
  opacity: 0.8;
}

.entry-preview.hint {
  background: rgba(255, 255, 255, 0.2);
  font-size: 0.8rem;
}

/* Filters */
.filters-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-bottom: var(--space-lg);
}

.filter-group {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.filter-label {
  font-weight: 600;
  font-size: 0.75rem;
  color: var(--text-secondary);
  min-width: 50px;
}

.filter-pills {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.filter-pill {
  padding: 4px 10px;
  background: white;
  border: 2px solid var(--border-color);
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.filter-pill:hover {
  border-color: #00BFFF;
}

.filter-pill.active {
  background: #00BFFF;
  border-color: #0099CC;
  color: white;
}

/* Log Feed */
.log-feed {
  margin-bottom: var(--space-xl);
}

.log-count {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: var(--space-md);
}

.empty-state {
  text-align: center;
  padding: var(--space-xl);
}

.empty-vio {
  width: 80px;
  margin-bottom: var(--space-md);
}

.log-group {
  margin-bottom: var(--space-md);
}

.log-date-header {
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: var(--space-sm);
  font-size: 0.875rem;
}

.log-card {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: white;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  margin-bottom: var(--space-xs);
}

.log-emoji {
  font-size: 1.25rem;
}

.log-content {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  align-items: baseline;
}

.log-pet {
  font-weight: 700;
}

.log-action {
  color: var(--text-secondary);
}

.log-note {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-style: italic;
}

.log-time {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.log-delete {
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  color: var(--text-secondary);
  font-size: 1.25rem;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
}

.log-card:hover .log-delete {
  opacity: 1;
}

.log-delete:hover {
  color: #FF6B6B;
}

.load-more-btn {
  width: 100%;
  padding: var(--space-md);
  background: white;
  border: 3px dashed var(--border-color);
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
  color: var(--text-secondary);
}

.load-more-btn:hover {
  border-color: #00BFFF;
  color: #00BFFF;
}

/* Pet List */
.pet-list-section {
  margin-bottom: var(--space-xl);
}

.section-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-sm) var(--space-md);
  margin-bottom: var(--space-md);
  background: linear-gradient(135deg, #7AD7F0 0%, #5BC0DE 100%);
  border-radius: var(--radius-lg);
  box-shadow: 0 2px 8px rgba(122, 215, 240, 0.3);
}

.section-banner-content {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.section-banner-icon {
  font-size: 1.25rem;
}

.section-banner-title {
  font-family: var(--font-display);
  font-size: 0.9375rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.add-pet-btn {
  padding: var(--space-xs) var(--space-sm);
  background: white;
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.75rem;
  cursor: pointer;
  color: #0099CC;
}

.pet-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--space-sm);
}

.pet-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-md);
  background: white;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.pet-card:hover {
  border-color: #00BFFF;
  transform: translateY(-2px);
}

.pet-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #E0F7FA;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  overflow: hidden;
  margin-bottom: var(--space-xs);
}

.pet-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pet-info {
  text-align: center;
}

.pet-name {
  display: block;
  font-weight: 700;
  font-size: 0.875rem;
}

.pet-nickname {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 24px 24px 0 0;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md) var(--space-lg);
  border-bottom: 2px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  font-family: var(--font-display);
}

.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
}

.modal-body {
  padding: var(--space-lg);
}

.form-group {
  margin-bottom: var(--space-md);
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: var(--space-xs);
  font-size: 0.875rem;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
}

.form-group textarea {
  min-height: 80px;
  resize: vertical;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  padding: var(--space-md) var(--space-lg);
  border-top: 2px solid var(--border-color);
}

.save-btn {
  padding: var(--space-sm) var(--space-xl);
  background: #00BFFF;
  border: 3px solid #0099CC;
  border-radius: 12px;
  font-weight: 700;
  color: white;
  cursor: pointer;
  box-shadow: 3px 3px 0 #006994;
}

.save-btn:hover {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 #006994;
}

.delete-btn {
  padding: var(--space-sm) var(--space-lg);
  background: white;
  border: 2px solid #FF6B6B;
  border-radius: 12px;
  font-weight: 700;
  color: #FF6B6B;
  cursor: pointer;
}

.delete-btn:hover {
  background: #FF6B6B;
  color: white;
}
</style>

<style>
/* Dark mode */
[data-theme="dark"] .quick-entry-section {
  background: #5B21B6 !important;
  border-color: #7C3AED !important;
  box-shadow: 4px 4px 0 #3D3456 !important;
}

[data-theme="dark"] .quick-entry-input,
[data-theme="dark"] .date-picker {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
  color: var(--text-primary) !important;
}

[data-theme="dark"] .add-btn {
  background: #8B5CF6 !important;
  border-color: #7C3AED !important;
  color: white !important;
}

[data-theme="dark"] .filter-pill {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .filter-pill.active {
  background: #8B5CF6 !important;
  border-color: #7C3AED !important;
}

[data-theme="dark"] .log-card,
[data-theme="dark"] .pet-card {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .pet-card:hover,
[data-theme="dark"] .log-card:hover {
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .modal {
  background: #1A1625 !important;
}

[data-theme="dark"] .autocomplete-dropdown {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .autocomplete-item:hover {
  background: #2D2640 !important;
}

[data-theme="dark"] .pet-avatar {
  background: #2D2640 !important;
}

[data-theme="dark"] .section-banner {
  background: linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%) !important;
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3) !important;
}

[data-theme="dark"] .add-pet-btn {
  background: rgba(255, 255, 255, 0.1) !important;
  border-color: rgba(255, 255, 255, 0.2) !important;
  color: white !important;
}
</style>
