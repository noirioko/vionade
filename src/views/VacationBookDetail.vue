<script setup>
import { ref, computed, onMounted, inject, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFinanceStore } from '../stores'
import { useToast } from '../composables/useToast'

const route = useRoute()
const router = useRouter()
const store = useFinanceStore()
const toast = useToast()
const fabAction = inject('fabAction')

const bookId = computed(() => parseInt(route.params.id))
const book = computed(() => store.getVacationBookById(bookId.value))

// Active section
const activeSection = ref('diary') // 'diary', 'cafes', 'restaurants'

function selectSection(section) {
  activeSection.value = section
}

// Modals
const showDiaryModal = ref(false)
const showCafeModal = ref(false)
const showRestaurantModal = ref(false)

const editingDiary = ref(null)
const editingCafe = ref(null)
const editingRestaurant = ref(null)

// Forms
const diaryForm = ref({ date: '', title: '', content: '', photos: [], mood: '' })
const cafeForm = ref({ name: '', date: '', time: '', notes: '' })
const restaurantForm = ref({ name: '', date: '', meal: 'lunch', notes: '' })

// Photo viewing
const viewingPhotos = ref(null)
const currentPhotoIndex = ref(0)

const mealTypes = [
  { id: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { id: 'lunch', label: 'Lunch', icon: '☀️' },
  { id: 'dinner', label: 'Dinner', icon: '🌙' },
  { id: 'snack', label: 'Snack', icon: '🍪' },
]

// Stats for sidebar
const bookStats = computed(() => ({
  diary: book.value?.diaryEntries?.length || 0,
  cafes: book.value?.cafeVisits?.length || 0,
  restaurants: book.value?.restaurantVisits?.length || 0
}))

// Sorted entries
const sortedDiary = computed(() => {
  if (!book.value?.diaryEntries) return []
  return [...book.value.diaryEntries].sort((a, b) => new Date(b.date) - new Date(a.date))
})

const sortedCafes = computed(() => {
  if (!book.value?.cafeVisits) return []
  return [...book.value.cafeVisits].sort((a, b) => new Date(b.date) - new Date(a.date))
})

const sortedRestaurants = computed(() => {
  if (!book.value?.restaurantVisits) return []
  return [...book.value.restaurantVisits].sort((a, b) => new Date(b.date) - new Date(a.date))
})

function getStatusInfo(statusId) {
  return store.TRIP_STATUSES.find(s => s.id === statusId) || store.TRIP_STATUSES[0]
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function formatShortDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}

// Diary functions
function openAddDiary() {
  editingDiary.value = null
  diaryForm.value = {
    date: new Date().toISOString().split('T')[0],
    title: '',
    content: '',
    photos: [],
    mood: ''
  }
  showDiaryModal.value = true
}

function openEditDiary(entry) {
  editingDiary.value = entry
  diaryForm.value = {
    date: entry.date,
    title: entry.title || '',
    content: entry.content || '',
    photos: [...(entry.photos || [])],
    mood: entry.mood || ''
  }
  showDiaryModal.value = true
}

function saveDiary() {
  if (!diaryForm.value.date) {
    toast.error('Please select a date')
    return
  }

  if (editingDiary.value) {
    store.updateDiaryEntry(bookId.value, editingDiary.value.id, diaryForm.value)
    toast.success('Entry updated!')
  } else {
    store.addDiaryEntry(bookId.value, diaryForm.value)
    toast.success('Entry added!')
  }
  showDiaryModal.value = false
}

function deleteDiary() {
  if (confirm('Delete this diary entry?')) {
    store.deleteDiaryEntry(bookId.value, editingDiary.value.id)
    toast.success('Entry deleted')
    showDiaryModal.value = false
  }
}

function handlePhotoUpload(e) {
  const files = Array.from(e.target.files)
  if (files.length === 0) return

  files.forEach(file => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error(`${file.name} is too large (max 2MB)`)
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      diaryForm.value.photos.push(event.target.result)
    }
    reader.readAsDataURL(file)
  })
}

function removePhoto(index) {
  diaryForm.value.photos.splice(index, 1)
}

function viewPhotos(photos, startIndex = 0) {
  viewingPhotos.value = photos
  currentPhotoIndex.value = startIndex
}

function closePhotoViewer() {
  viewingPhotos.value = null
}

// Cafe functions
function openAddCafe() {
  editingCafe.value = null
  cafeForm.value = {
    name: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    notes: ''
  }
  showCafeModal.value = true
}

function openEditCafe(visit) {
  editingCafe.value = visit
  cafeForm.value = {
    name: visit.name,
    date: visit.date,
    time: visit.time || '',
    notes: visit.notes || ''
  }
  showCafeModal.value = true
}

function saveCafe() {
  if (!cafeForm.value.name.trim()) {
    toast.error('Please enter cafe name')
    return
  }

  if (editingCafe.value) {
    store.updateVacationCafeVisit(bookId.value, editingCafe.value.id, cafeForm.value)
    toast.success('Cafe updated!')
  } else {
    store.addVacationCafeVisit(bookId.value, cafeForm.value)
    toast.success('Cafe added!')
  }
  showCafeModal.value = false
}

function deleteCafe() {
  if (confirm('Delete this cafe visit?')) {
    store.deleteVacationCafeVisit(bookId.value, editingCafe.value.id)
    toast.success('Cafe deleted')
    showCafeModal.value = false
  }
}

// Restaurant functions
function openAddRestaurant() {
  editingRestaurant.value = null
  restaurantForm.value = {
    name: '',
    date: new Date().toISOString().split('T')[0],
    meal: 'lunch',
    notes: ''
  }
  showRestaurantModal.value = true
}

function openEditRestaurant(visit) {
  editingRestaurant.value = visit
  restaurantForm.value = {
    name: visit.name,
    date: visit.date,
    meal: visit.meal || 'lunch',
    notes: visit.notes || ''
  }
  showRestaurantModal.value = true
}

function saveRestaurant() {
  if (!restaurantForm.value.name.trim()) {
    toast.error('Please enter restaurant name')
    return
  }

  if (editingRestaurant.value) {
    store.updateRestaurantVisit(bookId.value, editingRestaurant.value.id, restaurantForm.value)
    toast.success('Restaurant updated!')
  } else {
    store.addRestaurantVisit(bookId.value, restaurantForm.value)
    toast.success('Restaurant added!')
  }
  showRestaurantModal.value = false
}

function deleteRestaurant() {
  if (confirm('Delete this restaurant visit?')) {
    store.deleteRestaurantVisit(bookId.value, editingRestaurant.value.id)
    toast.success('Restaurant deleted')
    showRestaurantModal.value = false
  }
}

function getMealInfo(mealId) {
  return mealTypes.find(m => m.id === mealId) || mealTypes[1]
}

// FAB behavior based on active section
function updateFabAction() {
  if (activeSection.value === 'diary') {
    fabAction.value = openAddDiary
  } else if (activeSection.value === 'cafes') {
    fabAction.value = openAddCafe
  } else if (activeSection.value === 'restaurants') {
    fabAction.value = openAddRestaurant
  }
}

onMounted(() => {
  if (!book.value) {
    router.push('/vacation')
  }
  updateFabAction()
})

onUnmounted(() => {
  fabAction.value = null
})

watch(activeSection, () => {
  updateFabAction()
})
</script>

<template>
  <div class="page vacation-detail-page media-page" v-if="book">
    <!-- Standard Header -->
    <div class="page-header">
      <img src="/images/vio-logo.png" alt="Vionade" class="page-header-logo" />
    </div>

    <!-- Book Banner with Cover Image -->
    <div
      class="book-banner"
      :style="book.coverImage ? { backgroundImage: `url(${book.coverImage})` } : {}"
    >
      <button class="back-btn" @click="router.push('/vacation')">
        <span class="back-icon">←</span>
        <span class="back-text">Back</span>
      </button>
      <div class="book-banner-overlay">
        <div class="book-status-badge" :style="{ backgroundColor: getStatusInfo(book.status).color }">
          {{ getStatusInfo(book.status).icon }} {{ getStatusInfo(book.status).name }}
        </div>
        <h1 class="book-title">{{ book.title }}</h1>
        <div class="book-destination">📍 {{ book.destination }}<span v-if="book.country">, {{ book.country }}</span></div>
        <div class="book-dates" v-if="book.startDate">
          {{ formatDate(book.startDate) }} <span v-if="book.endDate">- {{ formatDate(book.endDate) }}</span>
        </div>
      </div>
      <img src="/images/vio_sit.png" alt="" class="book-banner-vio" />
    </div>

    <!-- Desktop Layout Container -->
    <div class="book-layout">
      <!-- Desktop Sidebar -->
      <aside class="book-sidebar">
        <nav class="sidebar-nav">
          <button
            class="sidebar-item"
            :class="{ active: activeSection === 'diary' }"
            @click="selectSection('diary')"
          >
            <span class="sidebar-icon">📝</span>
            <span class="sidebar-label">Diary</span>
            <span class="sidebar-count">{{ bookStats.diary }}</span>
          </button>
          <button
            class="sidebar-item"
            :class="{ active: activeSection === 'cafes' }"
            @click="selectSection('cafes')"
          >
            <span class="sidebar-icon">☕</span>
            <span class="sidebar-label">Cafes</span>
            <span class="sidebar-count">{{ bookStats.cafes }}</span>
          </button>
          <button
            class="sidebar-item"
            :class="{ active: activeSection === 'restaurants' }"
            @click="selectSection('restaurants')"
          >
            <span class="sidebar-icon">🍽️</span>
            <span class="sidebar-label">Restaurants</span>
            <span class="sidebar-count">{{ bookStats.restaurants }}</span>
          </button>
        </nav>

        <div class="sidebar-info-card">
          <img src="/images/vio_happy.png" alt="Vio" class="sidebar-vio" />
          <div class="sidebar-info">
            <div class="sidebar-info-label">Total Entries</div>
            <div class="sidebar-info-value">{{ bookStats.diary + bookStats.cafes + bookStats.restaurants }}</div>
          </div>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="book-content">
        <!-- Mobile Tabs -->
        <div class="book-tabs mobile-only">
          <button
            class="book-tab"
            :class="{ active: activeSection === 'diary' }"
            @click="selectSection('diary')"
          >📝 Diary</button>
          <button
            class="book-tab"
            :class="{ active: activeSection === 'cafes' }"
            @click="selectSection('cafes')"
          >☕ Cafes</button>
          <button
            class="book-tab"
            :class="{ active: activeSection === 'restaurants' }"
            @click="selectSection('restaurants')"
          >🍽️ Food</button>
        </div>

        <!-- Diary Section -->
        <div v-show="activeSection === 'diary'" class="section-content">
          <div v-if="sortedDiary.length === 0" class="empty-section">
            <span class="empty-emoji">📝</span>
            <p>No diary entries yet</p>
            <p class="empty-hint">Tap + to add your first entry</p>
          </div>

          <div v-for="entry in sortedDiary" :key="entry.id" class="diary-card" @click="openEditDiary(entry)">
            <div class="diary-date">{{ formatDate(entry.date) }}</div>
            <div class="diary-title" v-if="entry.title">{{ entry.title }}</div>
            <div class="diary-content" v-if="entry.content">{{ entry.content }}</div>
            <div class="diary-photos" v-if="entry.photos?.length">
              <div
                v-for="(photo, idx) in entry.photos.slice(0, 4)"
                :key="idx"
                class="diary-photo"
                :style="{ backgroundImage: `url(${photo})` }"
                @click.stop="viewPhotos(entry.photos, idx)"
              >
                <span v-if="idx === 3 && entry.photos.length > 4" class="more-photos">
                  +{{ entry.photos.length - 4 }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Cafes Section -->
        <div v-show="activeSection === 'cafes'" class="section-content">
          <div v-if="sortedCafes.length === 0" class="empty-section">
            <span class="empty-emoji">☕</span>
            <p>No cafe visits yet</p>
            <p class="empty-hint">Tap + to log a cafe visit</p>
          </div>

          <div v-for="visit in sortedCafes" :key="visit.id" class="visit-card" @click="openEditCafe(visit)">
            <span class="visit-icon">☕</span>
            <div class="visit-info">
              <div class="visit-name">{{ visit.name }}</div>
              <div class="visit-meta">
                {{ formatShortDate(visit.date) }}
                <span v-if="visit.time"> • {{ visit.time }}</span>
              </div>
              <div class="visit-notes" v-if="visit.notes">{{ visit.notes }}</div>
            </div>
          </div>
        </div>

        <!-- Restaurants Section -->
        <div v-show="activeSection === 'restaurants'" class="section-content">
          <div v-if="sortedRestaurants.length === 0" class="empty-section">
            <span class="empty-emoji">🍽️</span>
            <p>No restaurant visits yet</p>
            <p class="empty-hint">Tap + to log a meal</p>
          </div>

          <div v-for="visit in sortedRestaurants" :key="visit.id" class="visit-card" @click="openEditRestaurant(visit)">
            <span class="visit-icon">{{ getMealInfo(visit.meal).icon }}</span>
            <div class="visit-info">
              <div class="visit-name">{{ visit.name }}</div>
              <div class="visit-meta">
                {{ formatShortDate(visit.date) }} • {{ getMealInfo(visit.meal).label }}
              </div>
              <div class="visit-notes" v-if="visit.notes">{{ visit.notes }}</div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- Photo Viewer -->
    <Teleport to="body">
      <div v-if="viewingPhotos" class="photo-viewer" @click="closePhotoViewer">
        <button class="photo-close">&times;</button>
        <img :src="viewingPhotos[currentPhotoIndex]" class="photo-full" @click.stop />
        <div class="photo-nav" v-if="viewingPhotos.length > 1" @click.stop>
          <button @click="currentPhotoIndex = (currentPhotoIndex - 1 + viewingPhotos.length) % viewingPhotos.length">←</button>
          <span>{{ currentPhotoIndex + 1 }} / {{ viewingPhotos.length }}</span>
          <button @click="currentPhotoIndex = (currentPhotoIndex + 1) % viewingPhotos.length">→</button>
        </div>
      </div>
    </Teleport>

    <!-- Diary Modal -->
    <Teleport to="body">
      <div v-if="showDiaryModal" class="modal-overlay" @click.self="showDiaryModal = false">
        <div class="modal diary-modal">
          <div class="modal-header">
            <h2>{{ editingDiary ? 'Edit Entry' : 'New Diary Entry' }}</h2>
            <button class="modal-close" @click="showDiaryModal = false">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Date</label>
              <input v-model="diaryForm.date" type="date" class="form-input" />
            </div>
            <div class="form-group">
              <label>Title (optional)</label>
              <input v-model="diaryForm.title" type="text" placeholder="Day title..." class="form-input" />
            </div>
            <div class="form-group">
              <label>What happened today?</label>
              <textarea v-model="diaryForm.content" rows="4" placeholder="Write about your day..." class="form-textarea"></textarea>
            </div>
            <div class="form-group">
              <label>Photos</label>
              <div class="photos-grid">
                <div v-for="(photo, idx) in diaryForm.photos" :key="idx" class="photo-thumb" :style="{ backgroundImage: `url(${photo})` }">
                  <button class="remove-photo" @click="removePhoto(idx)">&times;</button>
                </div>
                <label class="add-photo-btn">
                  <span>📷 Add</span>
                  <input type="file" accept="image/*" multiple @change="handlePhotoUpload" hidden />
                </label>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button v-if="editingDiary" class="btn-delete" @click="deleteDiary">Delete</button>
            <button class="btn-save" @click="saveDiary">{{ editingDiary ? 'Update' : 'Save' }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Cafe Modal -->
    <Teleport to="body">
      <div v-if="showCafeModal" class="modal-overlay" @click.self="showCafeModal = false">
        <div class="modal">
          <div class="modal-header">
            <h2>{{ editingCafe ? 'Edit Cafe' : 'Add Cafe' }}</h2>
            <button class="modal-close" @click="showCafeModal = false">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Cafe Name</label>
              <input v-model="cafeForm.name" type="text" placeholder="Cafe name" class="form-input" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Date</label>
                <input v-model="cafeForm.date" type="date" class="form-input" />
              </div>
              <div class="form-group">
                <label>Time (optional)</label>
                <input v-model="cafeForm.time" type="time" class="form-input" />
              </div>
            </div>
            <div class="form-group">
              <label>Notes (optional)</label>
              <input v-model="cafeForm.notes" type="text" placeholder="What did you have?" class="form-input" />
            </div>
          </div>
          <div class="modal-footer">
            <button v-if="editingCafe" class="btn-delete" @click="deleteCafe">Delete</button>
            <button class="btn-save" @click="saveCafe">{{ editingCafe ? 'Update' : 'Add' }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Restaurant Modal -->
    <Teleport to="body">
      <div v-if="showRestaurantModal" class="modal-overlay" @click.self="showRestaurantModal = false">
        <div class="modal">
          <div class="modal-header">
            <h2>{{ editingRestaurant ? 'Edit Restaurant' : 'Add Restaurant' }}</h2>
            <button class="modal-close" @click="showRestaurantModal = false">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Restaurant Name</label>
              <input v-model="restaurantForm.name" type="text" placeholder="Restaurant name" class="form-input" />
            </div>
            <div class="form-group">
              <label>Date</label>
              <input v-model="restaurantForm.date" type="date" class="form-input" />
            </div>
            <div class="form-group">
              <label>Meal</label>
              <div class="meal-options">
                <button
                  v-for="meal in mealTypes"
                  :key="meal.id"
                  class="meal-btn"
                  :class="{ active: restaurantForm.meal === meal.id }"
                  @click="restaurantForm.meal = meal.id"
                >
                  {{ meal.icon }} {{ meal.label }}
                </button>
              </div>
            </div>
            <div class="form-group">
              <label>Notes (optional)</label>
              <input v-model="restaurantForm.notes" type="text" placeholder="What did you eat?" class="form-input" />
            </div>
          </div>
          <div class="modal-footer">
            <button v-if="editingRestaurant" class="btn-delete" @click="deleteRestaurant">Delete</button>
            <button class="btn-save" @click="saveRestaurant">{{ editingRestaurant ? 'Update' : 'Add' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* Book Banner */
.book-banner {
  position: relative;
  min-height: 180px;
  border-radius: var(--radius-xl);
  overflow: hidden;
  background: linear-gradient(135deg, #0EA5E9 0%, #7DD3FC 100%);
  background-size: cover;
  background-position: center;
  margin-bottom: var(--space-md);
  display: flex;
}

.back-btn {
  position: absolute;
  top: var(--space-md);
  left: var(--space-md);
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-sm);
  background: rgba(255, 255, 255, 0.95);
  border: none;
  border-radius: var(--radius-full);
  font-size: 0.8125rem;
  font-weight: 600;
  color: #0369A1;
  cursor: pointer;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.15s;
}

.back-btn:hover {
  background: white;
  transform: translateX(-2px);
}

.back-icon {
  font-size: 1rem;
  line-height: 1;
}

.book-banner-overlay {
  flex: 1;
  background: linear-gradient(90deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.4) 50%, transparent 100%);
  padding: var(--space-lg);
  padding-top: 50px;
  min-height: 180px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.book-banner-vio {
  position: absolute;
  right: 0;
  bottom: 0;
  height: 140px;
  width: auto;
  opacity: 0.9;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
}

.book-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
  width: fit-content;
  margin-bottom: var(--space-sm);
}

.book-title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  color: white;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.book-destination {
  color: rgba(255,255,255,0.9);
  font-size: 0.875rem;
  margin-top: 4px;
}

.book-dates {
  color: rgba(255,255,255,0.8);
  font-size: 0.75rem;
  margin-top: 4px;
}

/* Desktop Layout */
.book-layout {
  display: flex;
  gap: var(--space-lg);
}

/* Sidebar */
.book-sidebar {
  display: none;
  width: 220px;
  flex-shrink: 0;
}

@media (min-width: 768px) {
  .book-sidebar {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-card);
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.15s;
}

.sidebar-item:hover {
  border-color: var(--lavender-300);
}

.sidebar-item.active {
  background: var(--lavender-500);
  border-color: var(--lavender-500);
  color: white;
}

.sidebar-icon {
  font-size: 1.25rem;
}

.sidebar-label {
  flex: 1;
  font-weight: 600;
  font-size: 0.875rem;
}

.sidebar-count {
  font-size: 0.75rem;
  padding: 2px 8px;
  background: rgba(0,0,0,0.1);
  border-radius: var(--radius-full);
}

.sidebar-item.active .sidebar-count {
  background: rgba(255,255,255,0.2);
}

.sidebar-info-card {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%);
  border-radius: var(--radius-lg);
  border: 2px solid #7DD3FC;
}

.sidebar-vio {
  height: 50px;
  width: auto;
}

.sidebar-info {
  flex: 1;
}

.sidebar-info-label {
  font-size: 0.6875rem;
  color: #0369A1;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sidebar-info-value {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: #0284C7;
}

/* Main Content */
.book-content {
  flex: 1;
  min-width: 0;
}

/* Mobile Tabs */
.book-tabs {
  display: flex;
  gap: var(--space-xs);
  margin-bottom: var(--space-md);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.book-tab {
  flex: 1;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-card);
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-md);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}

.book-tab:hover {
  border-color: var(--lavender-300);
}

.book-tab.active {
  background: var(--lavender-500);
  border-color: var(--lavender-500);
  color: white;
}

.mobile-only {
  display: flex;
}

@media (min-width: 768px) {
  .mobile-only {
    display: none;
  }
}

/* Section Content */
.section-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.empty-section {
  text-align: center;
  padding: var(--space-xl);
  color: var(--text-tertiary);
}

.empty-emoji {
  font-size: 3rem;
  display: block;
  margin-bottom: var(--space-sm);
  opacity: 0.5;
}

.empty-hint {
  font-size: 0.8125rem;
  color: var(--text-tertiary);
  margin-top: var(--space-xs);
}

/* Diary Card */
.diary-card {
  background: var(--bg-card);
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  cursor: pointer;
  transition: all 0.2s;
}

.diary-card:hover {
  border-color: var(--lavender-300);
  transform: translateY(-1px);
}

.diary-date {
  font-size: 0.75rem;
  color: #0EA5E9;
  font-weight: 600;
  margin-bottom: var(--space-xs);
}

.diary-title {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-xs);
}

.diary-content {
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.diary-photos {
  display: flex;
  gap: var(--space-xs);
  margin-top: var(--space-sm);
}

.diary-photo {
  width: 60px;
  height: 60px;
  border-radius: var(--radius-md);
  background-size: cover;
  background-position: center;
  position: relative;
}

.more-photos {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.5);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  border-radius: var(--radius-md);
}

/* Visit Card */
.visit-card {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  background: var(--bg-card);
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  cursor: pointer;
  transition: all 0.2s;
}

.visit-card:hover {
  border-color: var(--lavender-300);
  transform: translateY(-1px);
}

.visit-icon {
  font-size: 1.5rem;
}

.visit-info {
  flex: 1;
}

.visit-name {
  font-weight: 600;
  color: var(--text-primary);
}

.visit-meta {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  margin-top: 2px;
}

.visit-notes {
  font-size: 0.8125rem;
  color: var(--text-secondary);
  margin-top: 4px;
}

/* Photo Viewer */
.photo-viewer {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.95);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
}

.photo-close {
  position: absolute;
  top: var(--space-md);
  right: var(--space-md);
  background: none;
  border: none;
  color: white;
  font-size: 2rem;
  cursor: pointer;
}

.photo-full {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
  border-radius: var(--radius-md);
}

.photo-nav {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-top: var(--space-md);
  color: white;
}

.photo-nav button {
  background: rgba(255,255,255,0.2);
  border: none;
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.25rem;
}

/* Photos Grid in Modal */
.photos-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

.photo-thumb {
  width: 70px;
  height: 70px;
  border-radius: var(--radius-md);
  background-size: cover;
  background-position: center;
  position: relative;
}

.remove-photo {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: var(--expense-color);
  color: white;
  cursor: pointer;
  font-size: 0.875rem;
  line-height: 1;
}

.add-photo-btn {
  width: 70px;
  height: 70px;
  border: 2px dashed var(--gray-300);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.add-photo-btn:hover {
  border-color: var(--lavender-400);
  color: var(--lavender-600);
}

/* Meal Options */
.meal-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

.meal-btn {
  padding: 6px 12px;
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-full);
  background: white;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s;
}

.meal-btn:hover {
  border-color: var(--lavender-300);
}

.meal-btn.active {
  background: var(--lavender-500);
  border-color: var(--lavender-500);
  color: white;
}

/* Form styles */
.diary-modal {
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.form-group {
  margin-bottom: var(--space-md);
}

.form-group label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-xs);
}

.form-input, .form-textarea {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-md);
  font-size: 0.9375rem;
  font-family: inherit;
}

.form-input:focus, .form-textarea:focus {
  outline: none;
  border-color: var(--lavender-400);
}

.form-textarea {
  resize: vertical;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
}

.modal-footer {
  display: flex;
  gap: var(--space-sm);
  padding-top: var(--space-md);
  border-top: 1px solid var(--gray-200);
}

.btn-delete {
  padding: var(--space-sm) var(--space-md);
  border: 2px solid var(--expense-color);
  border-radius: var(--radius-md);
  background: white;
  color: var(--expense-color);
  font-weight: 600;
  cursor: pointer;
}

.btn-save {
  flex: 1;
  padding: var(--space-sm) var(--space-md);
  border: none;
  border-radius: var(--radius-md);
  background: var(--lavender-500);
  color: white;
  font-weight: 600;
  cursor: pointer;
}

@media (max-width: 480px) {
  .book-banner-vio {
    height: 100px;
    opacity: 0.7;
  }

  .book-title {
    font-size: 1.25rem;
  }

  .back-text {
    display: none;
  }

  .back-btn {
    padding: var(--space-xs);
    width: 32px;
    height: 32px;
    justify-content: center;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>

<style>
/* Dark mode */
[data-theme="dark"] .book-banner {
  background: linear-gradient(135deg, #0369A1 0%, #0EA5E9 100%) !important;
}

[data-theme="dark"] .back-btn {
  background: rgba(45, 38, 64, 0.95) !important;
  color: #7DD3FC !important;
}

[data-theme="dark"] .back-btn:hover {
  background: #2D2640 !important;
}

[data-theme="dark"] .sidebar-item {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .sidebar-item:hover {
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .sidebar-item.active {
  background: #8B5CF6 !important;
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .sidebar-info-card {
  background: linear-gradient(135deg, #1E3A5F 0%, #0C4A6E 100%) !important;
  border-color: #0369A1 !important;
}

[data-theme="dark"] .sidebar-info-label {
  color: #7DD3FC !important;
}

[data-theme="dark"] .sidebar-info-value {
  color: #38BDF8 !important;
}

[data-theme="dark"] .book-tab {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
  color: #9D8BC2 !important;
}

[data-theme="dark"] .book-tab.active {
  background: #8B5CF6 !important;
  border-color: #8B5CF6 !important;
  color: white !important;
}

[data-theme="dark"] .diary-card,
[data-theme="dark"] .visit-card {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .diary-card:hover,
[data-theme="dark"] .visit-card:hover {
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .diary-date {
  color: #38BDF8 !important;
}

[data-theme="dark"] .form-input,
[data-theme="dark"] .form-textarea {
  background: #2D2640 !important;
  border-color: #3D3456 !important;
  color: #E5E5E5 !important;
}

[data-theme="dark"] .meal-btn {
  background: #2D2640 !important;
  border-color: #3D3456 !important;
  color: #9D8BC2 !important;
}

[data-theme="dark"] .meal-btn.active {
  background: #8B5CF6 !important;
  border-color: #8B5CF6 !important;
  color: white !important;
}

[data-theme="dark"] .add-photo-btn {
  border-color: #3D3456 !important;
}

[data-theme="dark"] .modal-footer {
  border-top-color: #3D3456 !important;
}

[data-theme="dark"] .btn-delete {
  background: transparent !important;
}
</style>
