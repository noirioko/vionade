<script setup>
import { ref, computed, inject, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFinanceStore } from '../stores'
import { useToast } from '../composables/useToast'
import { petActions, getActionKeywords, getStatusColor, formatDaysAgo, sessionTypes, quickLogActions } from '../data/petActions'

const router = useRouter()
const store = useFinanceStore()
const toast = useToast()
const fabAction = inject('fabAction')

// Help modal state
const showHelpModal = ref(false)

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
const petForm = ref({ name: '', nickname: '', photo: '', birthdate: '', notes: '' })
const isUploadingImage = ref(false)

// Pet list sorting
const petSort = ref('name') // 'name', 'vaccine', 'flea'

const sortedPets = computed(() => {
  const pets = [...store.pets.value]

  if (petSort.value === 'name') {
    return pets.sort((a, b) => a.name.localeCompare(b.name))
  }

  if (petSort.value === 'vaccine') {
    return pets.sort((a, b) => {
      const aDate = store.getLastActionDate(a.id, 'vaccine')
      const bDate = store.getLastActionDate(b.id, 'vaccine')
      if (!aDate && !bDate) return a.name.localeCompare(b.name)
      if (!aDate) return 1 // Never vaccinated goes last
      if (!bDate) return -1
      return aDate.localeCompare(bDate) // Oldest first (needs vaccine sooner)
    })
  }

  if (petSort.value === 'flea') {
    return pets.sort((a, b) => {
      const aDate = store.getLastActionDate(a.id, 'flea')
      const bDate = store.getLastActionDate(b.id, 'flea')
      if (!aDate && !bDate) return a.name.localeCompare(b.name)
      if (!aDate) return 1
      if (!bDate) return -1
      return aDate.localeCompare(bDate) // Oldest first
    })
  }

  return pets
})

// Session logging state
const activeSessionType = ref('bath')
const selectedPets = ref([])
const sessionDate = ref(new Date().toISOString().split('T')[0])
const sessionCost = ref('')
const sessionProvider = ref('')
const sessionNotes = ref('')

// View tab state
const activeTab = ref('logs') // 'logs', 'sessions'

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

// Filtered sessions
const filteredSessions = computed(() => {
  const { sessions, total } = store.getPetSessions({
    petId: petFilter.value !== 'all' ? petFilter.value : null,
    startDate: dateRange.value.start,
    endDate: dateRange.value.end,
    limit: displayLimit.value,
    offset: 0
  })
  return { sessions, total }
})

// Group sessions by date
const groupedSessions = computed(() => {
  const groups = {}
  filteredSessions.value.sessions.forEach(session => {
    const date = session.date
    if (!groups[date]) groups[date] = []
    groups[date].push(session)
  })
  return groups
})

// Autocomplete suggestions
const suggestions = computed(() => {
  const input = quickInput.value.toLowerCase().trim()
  if (!input) return []

  return store.pets.value
    .filter(p => {
      // Check primary nickname
      if (p.nickname?.startsWith(input)) return true
      // Check all nicknames
      if (p.nicknames?.some(n => n.startsWith(input))) return true
      // Check name
      if (p.name?.toLowerCase().startsWith(input)) return true
      return false
    })
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
  petForm.value = { name: '', nickname: '', photo: '', birthdate: '', notes: '' }
  showAddPetModal.value = true
}

function openEditPet(pet, event) {
  if (event) event.stopPropagation()
  editingPet.value = pet
  petForm.value = {
    ...pet,
    // Join nicknames array back to string for editing
    nickname: pet.nicknames?.join(', ') || pet.nickname || '',
    birthdate: pet.birthdate || ''
  }
  showAddPetModal.value = true
}

function goToPetBook(petId) {
  router.push(`/pets/${petId}`)
}

function savePet() {
  const trimmedName = petForm.value.name.trim()
  if (!trimmedName) return

  const dataToSave = {
    ...petForm.value,
    name: trimmedName,
    nickname: petForm.value.nickname?.trim() || '',
    birthdate: petForm.value.birthdate || null,
    notes: petForm.value.notes?.trim() || '',
  }

  if (editingPet.value) {
    store.updatePet(editingPet.value.id, dataToSave)
  } else {
    store.addPet(dataToSave)
  }
  showAddPetModal.value = false
}

function deletePet(id) {
  if (confirm('Delete this pet? This will NOT delete their logs.')) {
    store.deletePet(id)
    showAddPetModal.value = false
  }
}

// Image upload and compression
function handleImageUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return

  isUploadingImage.value = true

  const reader = new FileReader()
  reader.onload = (e) => {
    const img = new Image()
    img.onload = () => {
      // Compress to max 200px for avatar
      const maxSize = 200
      let { width, height } = img

      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width
          width = maxSize
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height
          height = maxSize
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      // Convert to compressed JPEG base64
      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7)
      petForm.value.photo = compressedBase64
      isUploadingImage.value = false
    }
    img.onerror = () => {
      isUploadingImage.value = false
      toast.error('Could not load image. Please try a different file.')
    }
    img.src = e.target.result
  }
  reader.onerror = () => {
    isUploadingImage.value = false
    toast.error('Could not read file. Please try again.')
  }
  reader.readAsDataURL(file)
}

// Session pet selection
function togglePetSelection(petId) {
  const idx = selectedPets.value.indexOf(petId)
  if (idx === -1) {
    selectedPets.value.push(petId)
  } else {
    selectedPets.value.splice(idx, 1)
  }
}

function isPetSelected(petId) {
  return selectedPets.value.includes(petId)
}

// Submit session
function submitSession() {
  if (selectedPets.value.length === 0) return

  const parsedCost = parseFloat(sessionCost.value)

  store.addPetSession({
    type: activeSessionType.value,
    petIds: [...selectedPets.value],
    date: sessionDate.value,
    cost: !isNaN(parsedCost) ? parsedCost : null,
    provider: sessionProvider.value.trim(),
    notes: sessionNotes.value.trim()
  })

  // Reset form
  selectedPets.value = []
  sessionCost.value = ''
  sessionProvider.value = ''
  sessionNotes.value = ''
  sessionDate.value = new Date().toISOString().split('T')[0]
}

// Delete session
function deleteSession(id) {
  if (confirm('Delete this session?')) {
    store.deletePetSession(id)
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
        <button class="help-btn" @click="showHelpModal = true">?</button>
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
        <span class="preview-text">Format: [nickname] [action] • Actions: nail, sick, medicine, weight, vaccine</span>
      </div>
    </div>

    <!-- Session Logging Section -->
    <div class="session-section">
      <div class="session-header">
        <span class="session-icon">📋</span>
        <span>Log Session</span>
        <span class="session-hint">(group activities)</span>
      </div>

      <!-- Session Type Tabs -->
      <div class="session-type-tabs">
        <button
          v-for="(typeInfo, typeKey) in sessionTypes"
          :key="typeKey"
          class="session-type-tab"
          :class="{ active: activeSessionType === typeKey }"
          :style="{ '--type-color': typeInfo.color }"
          @click="activeSessionType = typeKey"
        >
          <span class="session-type-emoji">{{ typeInfo.emoji }}</span>
          <span class="session-type-label">{{ typeInfo.label.split('/')[0] }}</span>
        </button>
      </div>

      <!-- Pet Selection Grid -->
      <div class="pet-select-label">Select cats:</div>
      <div class="pet-select-grid">
        <button
          v-for="pet in store.pets.value"
          :key="pet.id"
          class="pet-select-btn"
          :class="{ selected: isPetSelected(pet.id) }"
          @click="togglePetSelection(pet.id)"
        >
          <div class="pet-select-avatar">
            <img v-if="pet.photo" :src="pet.photo" :alt="pet.name" />
            <span v-else>🐱</span>
          </div>
          <span class="pet-select-name">{{ pet.nickname || pet.name }}</span>
          <span v-if="isPetSelected(pet.id)" class="pet-select-check">✓</span>
        </button>
      </div>

      <!-- Session Details -->
      <div class="session-details">
        <div class="session-row">
          <input
            v-model="sessionDate"
            type="date"
            class="session-input date"
          />
          <input
            v-model="sessionCost"
            type="number"
            class="session-input cost"
            placeholder="Cost (Rp)"
          />
        </div>
        <input
          v-model="sessionProvider"
          type="text"
          class="session-input provider"
          :placeholder="sessionTypes[activeSessionType]?.providerLabel || 'Provider'"
        />
        <textarea
          v-model="sessionNotes"
          class="session-input notes"
          placeholder="Notes (procedures, meds, etc.)"
          rows="2"
        ></textarea>
      </div>

      <button
        class="session-submit-btn"
        :disabled="selectedPets.length === 0"
        @click="submitSession"
      >
        Add {{ sessionTypes[activeSessionType]?.label }} Session
      </button>
    </div>

    <!-- View Tabs -->
    <div class="view-tabs">
      <button
        class="view-tab"
        :class="{ active: activeTab === 'logs' }"
        @click="activeTab = 'logs'"
      >Quick Logs</button>
      <button
        class="view-tab"
        :class="{ active: activeTab === 'sessions' }"
        @click="activeTab = 'sessions'"
      >Sessions</button>
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

    <!-- Log Feed (Quick Logs) -->
    <div v-if="activeTab === 'logs'" class="log-feed">
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

    <!-- Sessions Feed -->
    <div v-if="activeTab === 'sessions'" class="log-feed">
      <div class="log-count">
        Showing {{ filteredSessions.sessions.length }} of {{ filteredSessions.total }} sessions
      </div>

      <div v-if="filteredSessions.sessions.length === 0" class="empty-state">
        <img src="/images/vio_sit.png" alt="Vio" class="empty-vio" />
        <p>No sessions found. Log your first grooming or vet session above!</p>
      </div>

      <div v-for="(sessions, date) in groupedSessions" :key="date" class="log-group">
        <div class="log-date-header">📅 {{ formatDateHeader(date) }}</div>

        <div
          v-for="session in sessions"
          :key="session.id"
          class="session-card"
          :style="{ '--session-color': sessionTypes[session.type]?.color }"
        >
          <div class="session-card-header">
            <span class="session-card-emoji">{{ sessionTypes[session.type]?.emoji }}</span>
            <span class="session-card-type">{{ sessionTypes[session.type]?.label }}</span>
            <span v-if="session.cost" class="session-card-cost">Rp{{ session.cost.toLocaleString() }}</span>
          </div>
          <div class="session-card-pets">
            {{ session.petNames.join(', ') }}
          </div>
          <div v-if="session.provider" class="session-card-provider">
            {{ sessionTypes[session.type]?.providerLabel }}: {{ session.provider }}
          </div>
          <div v-if="session.notes" class="session-card-notes">
            {{ session.notes }}
          </div>
          <button class="session-delete" @click="deleteSession(session.id)">×</button>
        </div>
      </div>

      <button
        v-if="filteredSessions.sessions.length < filteredSessions.total"
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

      <!-- Sort Options -->
      <div class="sort-options">
        <span class="sort-label">Sort:</span>
        <button
          class="sort-btn"
          :class="{ active: petSort === 'name' }"
          @click="petSort = 'name'"
        >A-Z</button>
        <button
          class="sort-btn"
          :class="{ active: petSort === 'vaccine' }"
          @click="petSort = 'vaccine'"
        >💉 Vaccine</button>
        <button
          class="sort-btn"
          :class="{ active: petSort === 'flea' }"
          @click="petSort = 'flea'"
        >🐛 Flea</button>
      </div>

      <div class="pet-grid">
        <div
          v-for="pet in sortedPets"
          :key="pet.id"
          class="pet-card"
          @click="goToPetBook(pet.id)"
        >
          <button class="pet-edit-btn" @click="openEditPet(pet, $event)">✎</button>
          <div class="pet-avatar">
            <img v-if="pet.photo" :src="pet.photo" :alt="pet.name" />
            <span v-else>🐱</span>
          </div>
          <div class="pet-info">
            <span class="pet-name">{{ pet.name }}</span>
            <span class="pet-nickname">{{ pet.nickname }}</span>
          </div>
          <div class="pet-health-badges">
            <span
              class="health-badge"
              :class="getStatusColor('vaccine', store.getDaysSinceAction(pet.id, 'vaccine'))"
              :title="'Vaccine: ' + formatDaysAgo(store.getDaysSinceAction(pet.id, 'vaccine'))"
            >💉 {{ formatDaysAgo(store.getDaysSinceAction(pet.id, 'vaccine')) }}</span>
            <span
              class="health-badge"
              :class="getStatusColor('flea', store.getDaysSinceAction(pet.id, 'flea'))"
              :title="'Flea: ' + formatDaysAgo(store.getDaysSinceAction(pet.id, 'flea'))"
            >🐛 {{ formatDaysAgo(store.getDaysSinceAction(pet.id, 'flea')) }}</span>
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
          <!-- Photo Preview & Upload -->
          <div class="photo-upload-section">
            <div class="photo-preview">
              <img v-if="petForm.photo" :src="petForm.photo" alt="Pet photo" />
              <span v-else>🐱</span>
            </div>
            <div class="photo-actions">
              <label class="upload-photo-btn">
                <input
                  type="file"
                  accept="image/*"
                  @change="handleImageUpload"
                  hidden
                />
                {{ isUploadingImage ? 'Processing...' : 'Upload Photo' }}
              </label>
              <button
                v-if="petForm.photo"
                class="remove-photo-btn"
                @click="petForm.photo = ''"
              >Remove</button>
            </div>
          </div>

          <div class="form-group">
            <label>Name</label>
            <input v-model="petForm.name" type="text" placeholder="Pong Pong" />
          </div>

          <div class="form-group">
            <label>Nicknames (for quick entry)</label>
            <input v-model="petForm.nickname" type="text" placeholder="pong, pongie, pp" />
            <span class="form-hint">Separate multiple nicknames with commas or spaces</span>
          </div>

          <div class="form-group">
            <label>Birthdate</label>
            <input v-model="petForm.birthdate" type="date" />
          </div>

          <div class="form-group">
            <label>Photo URL (optional)</label>
            <input v-model="petForm.photo" type="url" placeholder="https://... or uploaded" />
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

    <!-- Help Modal -->
    <div v-if="showHelpModal" class="modal-overlay" @click.self="showHelpModal = false">
      <div class="help-modal">
        <div class="modal-header">
          <h3>Quick Log Commands</h3>
          <button class="modal-close" @click="showHelpModal = false">×</button>
        </div>
        <div class="help-content">
          <p class="help-intro">Type <strong>[nickname] [action]</strong> to log quickly!</p>
          <p class="help-example">Example: <code>pong bath</code> or <code>mochi vet checkup notes</code></p>

          <div class="help-section">
            <h4>Available Actions</h4>
            <div class="help-actions">
              <div v-for="(action, key) in petActions" :key="key" class="help-action">
                <span class="help-action-emoji">{{ action.emoji }}</span>
                <span class="help-action-keyword">{{ key }}</span>
                <span class="help-action-label">{{ action.label }}</span>
              </div>
            </div>
          </div>

          <div class="help-section">
            <h4>Tips</h4>
            <ul class="help-tips">
              <li>Nicknames are case-insensitive</li>
              <li>Anything after the action becomes a note</li>
              <li>Use the date picker for past logs</li>
              <li>Click a cat card to see their full Pet Book!</li>
            </ul>
          </div>
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
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: #E0F7FA;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  overflow: hidden;
  margin-bottom: var(--space-sm);
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

/* Sort Options */
.sort-options {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  margin-bottom: var(--space-md);
}

.sort-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.sort-btn {
  padding: 4px 10px;
  background: white;
  border: 2px solid var(--border-color);
  border-radius: 20px;
  font-size: 0.6875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.sort-btn:hover {
  border-color: #00BFFF;
}

.sort-btn.active {
  background: #00BFFF;
  border-color: #0099CC;
  color: white;
}

/* Health Badges on Pet Cards */
.pet-health-badges {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: var(--space-sm);
  width: 100%;
}

.health-badge {
  display: block;
  text-align: center;
  font-size: 0.625rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.health-badge.green {
  background: #dcfce7;
  color: #15803d;
}

.health-badge.yellow {
  background: #fef9c3;
  color: #a16207;
}

.health-badge.red {
  background: #fee2e2;
  color: #dc2626;
}

.health-badge.gray {
  background: var(--background-secondary);
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

.form-hint {
  display: block;
  font-size: 0.6875rem;
  color: var(--text-secondary);
  margin-top: 4px;
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

/* Session Section */
.session-section {
  background: linear-gradient(135deg, #f472b6 0%, #c084fc 100%);
  border: 3px solid #a855f7;
  border-radius: 16px;
  padding: var(--space-md);
  margin-bottom: var(--space-lg);
  box-shadow: 4px 4px 0 #7c3aed;
}

.session-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-weight: 700;
  color: white;
  margin-bottom: var(--space-md);
}

.session-icon {
  font-size: 1.25rem;
}

.session-hint {
  font-size: 0.75rem;
  opacity: 0.8;
  font-weight: 500;
}

/* Session Type Tabs */
.session-type-tabs {
  display: flex;
  gap: var(--space-xs);
  margin-bottom: var(--space-md);
}

.session-type-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--space-sm);
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.session-type-tab:hover {
  background: rgba(255, 255, 255, 0.3);
}

.session-type-tab.active {
  background: white;
  border-color: var(--type-color, #a855f7);
}

.session-type-emoji {
  font-size: 1.25rem;
}

.session-type-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: white;
}

.session-type-tab.active .session-type-label {
  color: var(--type-color, #a855f7);
}

/* Pet Selection Grid */
.pet-select-label {
  font-size: 0.75rem;
  color: white;
  margin-bottom: var(--space-xs);
  font-weight: 600;
}

.pet-select-grid {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
  margin-bottom: var(--space-md);
}

.pet-select-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--space-sm);
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
  min-width: 60px;
}

.pet-select-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.pet-select-btn.selected {
  background: white;
  border-color: #4ade80;
}

.pet-select-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  overflow: hidden;
}

.pet-select-btn.selected .pet-select-avatar {
  background: #E0F7FA;
}

.pet-select-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pet-select-name {
  font-size: 0.625rem;
  font-weight: 600;
  color: white;
}

.pet-select-btn.selected .pet-select-name {
  color: #059669;
}

.pet-select-check {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 18px;
  height: 18px;
  background: #4ade80;
  border-radius: 50%;
  font-size: 0.6875rem;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

/* Session Details */
.session-details {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin-bottom: var(--space-md);
}

.session-row {
  display: flex;
  gap: var(--space-xs);
}

.session-input {
  padding: var(--space-sm);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
}

.session-input.date {
  flex: 1;
}

.session-input.cost {
  flex: 1;
}

.session-input.provider {
  width: 100%;
}

.session-input.notes {
  width: 100%;
  resize: none;
  font-family: inherit;
}

.session-input:focus {
  outline: none;
  border-color: white;
}

.session-submit-btn {
  width: 100%;
  padding: var(--space-sm) var(--space-lg);
  background: white;
  border: 3px solid rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
  color: #a855f7;
  transition: all 0.15s;
}

.session-submit-btn:hover:not(:disabled) {
  background: #fafafa;
  transform: translateY(-1px);
}

.session-submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* View Tabs */
.view-tabs {
  display: flex;
  gap: var(--space-xs);
  margin-bottom: var(--space-md);
}

.view-tab {
  flex: 1;
  padding: var(--space-sm);
  background: white;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.15s;
  color: var(--text-secondary);
}

.view-tab:hover {
  border-color: #00BFFF;
}

.view-tab.active {
  background: #00BFFF;
  border-color: #0099CC;
  color: white;
}

/* Session Cards */
.session-card {
  position: relative;
  padding: var(--space-md);
  background: white;
  border: 2px solid var(--border-color);
  border-left: 4px solid var(--session-color, #a855f7);
  border-radius: 12px;
  margin-bottom: var(--space-sm);
}

.session-card-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-xs);
}

.session-card-emoji {
  font-size: 1.25rem;
}

.session-card-type {
  font-weight: 700;
  color: var(--session-color, #a855f7);
}

.session-card-cost {
  margin-left: auto;
  font-weight: 700;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.session-card-pets {
  font-weight: 600;
  margin-bottom: var(--space-xs);
}

.session-card-provider {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: var(--space-xs);
}

.session-card-notes {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-style: italic;
  padding: var(--space-xs);
  background: var(--background-secondary);
  border-radius: 6px;
}

.session-delete {
  position: absolute;
  top: var(--space-sm);
  right: var(--space-sm);
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

.session-card:hover .session-delete {
  opacity: 1;
}

.session-delete:hover {
  color: #FF6B6B;
}

/* Photo Upload in Modal */
.photo-upload-section {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
  padding: var(--space-md);
  background: var(--background-secondary);
  border-radius: 12px;
}

.photo-preview {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #E0F7FA;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  overflow: hidden;
  flex-shrink: 0;
}

.photo-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.upload-photo-btn {
  padding: var(--space-sm) var(--space-md);
  background: #00BFFF;
  border: 2px solid #0099CC;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.75rem;
  color: white;
  cursor: pointer;
  text-align: center;
}

.upload-photo-btn:hover {
  background: #0099CC;
}

.remove-photo-btn {
  padding: var(--space-xs) var(--space-sm);
  background: transparent;
  border: 1px solid #FF6B6B;
  border-radius: 6px;
  font-size: 0.6875rem;
  color: #FF6B6B;
  cursor: pointer;
}

.remove-photo-btn:hover {
  background: #FF6B6B;
  color: white;
}

/* Help Button */
.help-btn {
  margin-left: auto;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  border: 2px solid rgba(255, 255, 255, 0.5);
  color: white;
  font-weight: 700;
  font-size: 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.help-btn:hover {
  background: white;
  color: #00BFFF;
}

/* Pet Edit Button */
.pet-card {
  position: relative;
}

.pet-edit-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: white;
  border: 2px solid var(--border-color);
  font-size: 0.875rem;
  cursor: pointer;
  opacity: 0;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pet-card:hover .pet-edit-btn {
  opacity: 1;
}

.pet-edit-btn:hover {
  background: #00BFFF;
  border-color: #0099CC;
  color: white;
}

/* Help Modal */
.help-modal {
  background: white;
  border-radius: 24px 24px 0 0;
  width: 100%;
  max-width: 500px;
  max-height: 85vh;
  overflow-y: auto;
}

.help-content {
  padding: var(--space-md) var(--space-lg);
}

.help-intro {
  color: var(--text-secondary);
  margin: 0 0 var(--space-xs);
}

.help-example {
  background: var(--background-secondary);
  padding: var(--space-sm) var(--space-md);
  border-radius: 8px;
  margin-bottom: var(--space-lg);
  font-size: 0.875rem;
}

.help-example code {
  background: #00BFFF;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

.help-section {
  margin-bottom: var(--space-lg);
}

.help-section h4 {
  margin: 0 0 var(--space-sm);
  font-size: 0.875rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.help-actions {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--space-xs);
}

.help-action {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-sm);
  background: var(--background-secondary);
  border-radius: 8px;
}

.help-action-emoji {
  font-size: 1.25rem;
}

.help-action-keyword {
  font-weight: 700;
  font-size: 0.75rem;
  background: #00BFFF;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
}

.help-action-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.help-tips {
  margin: 0;
  padding-left: var(--space-lg);
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.help-tips li {
  margin-bottom: var(--space-xs);
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

[data-theme="dark"] .sort-btn {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .sort-btn:hover {
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .sort-btn.active {
  background: #8B5CF6 !important;
  border-color: #7C3AED !important;
}

[data-theme="dark"] .health-badge.green {
  background: rgba(74, 222, 128, 0.2) !important;
  color: #4ade80 !important;
}

[data-theme="dark"] .health-badge.yellow {
  background: rgba(251, 191, 36, 0.2) !important;
  color: #fbbf24 !important;
}

[data-theme="dark"] .health-badge.red {
  background: rgba(248, 113, 113, 0.2) !important;
  color: #f87171 !important;
}

[data-theme="dark"] .health-badge.gray {
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

/* Session Section Dark Mode */
[data-theme="dark"] .session-section {
  background: linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%) !important;
  border-color: #6D28D9 !important;
  box-shadow: 4px 4px 0 #3D3456 !important;
}

[data-theme="dark"] .session-input {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
  color: var(--text-primary) !important;
}

[data-theme="dark"] .session-input:focus {
  border-color: #A78BFA !important;
}

[data-theme="dark"] .session-submit-btn {
  background: rgba(255, 255, 255, 0.1) !important;
  border-color: rgba(255, 255, 255, 0.2) !important;
  color: white !important;
}

[data-theme="dark"] .session-type-tab.active {
  background: #1A1625 !important;
}

[data-theme="dark"] .pet-select-btn.selected {
  background: #1A1625 !important;
  border-color: #4ade80 !important;
}

[data-theme="dark"] .pet-select-btn.selected .pet-select-avatar {
  background: #2D2640 !important;
}

[data-theme="dark"] .pet-select-btn.selected .pet-select-name {
  color: #4ade80 !important;
}

/* View Tabs Dark Mode */
[data-theme="dark"] .view-tab {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .view-tab:hover {
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .view-tab.active {
  background: #8B5CF6 !important;
  border-color: #7C3AED !important;
}

/* Session Cards Dark Mode */
[data-theme="dark"] .session-card {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .session-card-notes {
  background: #2D2640 !important;
}

/* Photo Upload Dark Mode */
[data-theme="dark"] .photo-upload-section {
  background: #2D2640 !important;
}

[data-theme="dark"] .photo-preview {
  background: #3D3456 !important;
}

[data-theme="dark"] .upload-photo-btn {
  background: #8B5CF6 !important;
  border-color: #7C3AED !important;
}

[data-theme="dark"] .upload-photo-btn:hover {
  background: #7C3AED !important;
}

/* Help Modal Dark Mode */
[data-theme="dark"] .help-modal {
  background: #1A1625 !important;
}

[data-theme="dark"] .help-example {
  background: #2D2640 !important;
}

[data-theme="dark"] .help-example code {
  background: #8B5CF6 !important;
}

[data-theme="dark"] .help-action {
  background: #2D2640 !important;
}

[data-theme="dark"] .help-action-keyword {
  background: #8B5CF6 !important;
}

/* Pet Edit Button Dark Mode */
[data-theme="dark"] .pet-edit-btn {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .pet-edit-btn:hover {
  background: #8B5CF6 !important;
  border-color: #7C3AED !important;
}

/* Help Button Dark Mode */
[data-theme="dark"] .help-btn:hover {
  background: #8B5CF6 !important;
  color: white !important;
}
</style>
