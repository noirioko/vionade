<script setup>
import { ref, computed, inject, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFinanceStore } from '../stores'
import { useToast } from '../composables/useToast'

const router = useRouter()
const store = useFinanceStore()
const toast = useToast()
const fabAction = inject('fabAction')

// Modal state
const showAddModal = ref(false)
const editingBook = ref(null)

// Form
const form = ref({
  title: '',
  destination: '',
  country: '',
  coverImage: '',
  startDate: '',
  endDate: '',
  status: 'wishlist',
  budget: '',
  notes: ''
})

// Filter
const statusFilter = ref('all')

// Stats
const stats = computed(() => store.getVacationStats())

// Filtered books
const filteredBooks = computed(() => {
  let books = [...store.vacationBooks.value]

  if (statusFilter.value !== 'all') {
    books = books.filter(b => b.status === statusFilter.value)
  }

  // Sort: ongoing first, then by date
  return books.sort((a, b) => {
    if (a.status === 'ongoing' && b.status !== 'ongoing') return -1
    if (b.status === 'ongoing' && a.status !== 'ongoing') return 1
    return new Date(b.createdAt) - new Date(a.createdAt)
  })
})

function openAddModal() {
  editingBook.value = null
  form.value = {
    title: '',
    destination: '',
    country: '',
    coverImage: '',
    startDate: '',
    endDate: '',
    status: 'wishlist',
    budget: '',
    notes: ''
  }
  showAddModal.value = true
}

function openEditModal(book, e) {
  e.stopPropagation()
  editingBook.value = book
  form.value = {
    title: book.title,
    destination: book.destination,
    country: book.country || '',
    coverImage: book.coverImage || '',
    startDate: book.startDate || '',
    endDate: book.endDate || '',
    status: book.status,
    budget: book.budget?.toString() || '',
    notes: book.notes || ''
  }
  showAddModal.value = true
}

function saveBook() {
  if (!form.value.title.trim()) {
    toast.error('Please enter a title')
    return
  }
  if (!form.value.destination.trim()) {
    toast.error('Please enter a destination')
    return
  }

  if (editingBook.value) {
    store.updateVacationBook(editingBook.value.id, form.value)
    toast.success('Book updated!')
  } else {
    const id = store.createVacationBook(form.value)
    toast.success('Book created!')
    router.push(`/vacation/${id}`)
  }

  showAddModal.value = false
}

function deleteBook() {
  if (confirm('Delete this vacation book and all its entries?')) {
    store.deleteVacationBook(editingBook.value.id)
    toast.success('Book deleted')
    showAddModal.value = false
  }
}

function openBook(book) {
  router.push(`/vacation/${book.id}`)
}

function getStatusInfo(statusId) {
  return store.TRIP_STATUSES.find(s => s.id === statusId) || store.TRIP_STATUSES[0]
}

function formatDateRange(start, end) {
  if (!start) return ''
  const startDate = new Date(start)
  const startStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  if (!end) return startStr
  const endDate = new Date(end)
  const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${startStr} - ${endStr}`
}

function handleCoverUpload(e) {
  const file = e.target.files[0]
  if (!file) return

  if (file.size > 2 * 1024 * 1024) {
    toast.error('Image too large (max 2MB)')
    return
  }

  const reader = new FileReader()
  reader.onload = (event) => {
    form.value.coverImage = event.target.result
  }
  reader.readAsDataURL(file)
}

// FAB
onMounted(() => {
  fabAction.value = openAddModal
})

onUnmounted(() => {
  fabAction.value = null
})
</script>

<template>
  <div class="page vacation-page">
    <div class="page-header">
      <img src="/images/vio-logo.png" alt="Vionade" class="page-header-logo" />
    </div>

    <!-- Banner -->
    <div class="vacation-banner">
      <div class="vacation-banner-content">
        <div class="vacation-banner-title">Vacation Books</div>
        <div class="vacation-banner-subtitle">Your travel journal</div>
      </div>
      <img src="/images/vio_happy.png" alt="Vio" class="vacation-banner-vio" />
    </div>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-card">
        <span class="stat-value">{{ stats.completed }}</span>
        <span class="stat-label">Trips Done</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ stats.planned }}</span>
        <span class="stat-label">Planned</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ stats.wishlist }}</span>
        <span class="stat-label">Wishlist</span>
      </div>
    </div>

    <!-- Filter -->
    <div class="filter-row">
      <button
        class="filter-chip"
        :class="{ active: statusFilter === 'all' }"
        @click="statusFilter = 'all'"
      >All</button>
      <button
        v-for="status in store.TRIP_STATUSES"
        :key="status.id"
        class="filter-chip"
        :class="{ active: statusFilter === status.id }"
        @click="statusFilter = status.id"
      >{{ status.icon }} {{ status.name }}</button>
    </div>

    <!-- Books Grid -->
    <div class="books-grid">
      <div v-if="filteredBooks.length === 0" class="empty-state">
        <span class="empty-emoji">🗺️</span>
        <p>No vacation books yet</p>
        <p class="empty-hint">Tap + to create your first travel journal!</p>
      </div>

      <div
        v-for="book in filteredBooks"
        :key="book.id"
        class="book-card"
        :class="{ ongoing: book.status === 'ongoing' }"
        @click="openBook(book)"
      >
        <!-- Book spine effect -->
        <div class="book-spine"></div>

        <div class="book-main">
          <div class="book-cover" :style="book.coverImage ? { backgroundImage: `url(${book.coverImage})` } : {}">
            <div v-if="!book.coverImage" class="book-cover-placeholder">
              <span class="placeholder-icon">✈️</span>
              <span class="placeholder-text">{{ book.destination }}</span>
            </div>

            <!-- Status ribbon -->
            <div class="book-ribbon" :style="{ '--ribbon-color': getStatusInfo(book.status).color }">
              {{ getStatusInfo(book.status).icon }}
            </div>

            <button class="book-edit-btn" @click="openEditModal(book, $event)">✏️</button>
          </div>

          <div class="book-info">
            <div class="book-title">{{ book.title }}</div>
            <div class="book-destination">
              {{ book.destination }}<span v-if="book.country">, {{ book.country }}</span>
            </div>
            <div class="book-dates" v-if="book.startDate">
              📅 {{ formatDateRange(book.startDate, book.endDate) }}
            </div>
            <div class="book-counts" v-if="book.diaryEntries?.length || book.cafeVisits?.length || book.restaurantVisits?.length">
              <span v-if="book.diaryEntries?.length" class="count-badge diary">📝 {{ book.diaryEntries.length }}</span>
              <span v-if="book.cafeVisits?.length" class="count-badge cafe">☕ {{ book.cafeVisits.length }}</span>
              <span v-if="book.restaurantVisits?.length" class="count-badge restaurant">🍽️ {{ book.restaurantVisits.length }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <Teleport to="body">
      <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
        <div class="modal vacation-modal">
          <div class="modal-header">
            <h2>{{ editingBook ? 'Edit Book' : 'New Vacation Book' }}</h2>
            <button class="modal-close" @click="showAddModal = false">&times;</button>
          </div>

          <div class="modal-body">
            <!-- Cover Image -->
            <div class="form-group">
              <label>Cover Image (optional)</label>
              <div class="cover-upload">
                <div
                  class="cover-preview"
                  :style="form.coverImage ? { backgroundImage: `url(${form.coverImage})` } : {}"
                >
                  <span v-if="!form.coverImage">📷</span>
                </div>
                <input type="file" accept="image/*" @change="handleCoverUpload" class="cover-input" />
                <button v-if="form.coverImage" class="clear-cover" @click="form.coverImage = ''">&times;</button>
              </div>
            </div>

            <!-- Title -->
            <div class="form-group">
              <label>Trip Title</label>
              <input
                v-model="form.title"
                type="text"
                placeholder="e.g. Bali Adventure 2026"
                class="form-input"
              />
            </div>

            <!-- Destination -->
            <div class="form-row">
              <div class="form-group">
                <label>Destination</label>
                <input
                  v-model="form.destination"
                  type="text"
                  placeholder="City"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label>Country</label>
                <input
                  v-model="form.country"
                  type="text"
                  placeholder="Country"
                  class="form-input"
                />
              </div>
            </div>

            <!-- Status -->
            <div class="form-group">
              <label>Status</label>
              <div class="status-options">
                <button
                  v-for="status in store.TRIP_STATUSES"
                  :key="status.id"
                  class="status-btn"
                  :class="{ active: form.status === status.id }"
                  :style="{ '--status-color': status.color }"
                  @click="form.status = status.id"
                >
                  <span>{{ status.icon }}</span>
                  <span>{{ status.name }}</span>
                </button>
              </div>
            </div>

            <!-- Dates -->
            <div class="form-row">
              <div class="form-group">
                <label>Start Date</label>
                <input v-model="form.startDate" type="date" class="form-input" />
              </div>
              <div class="form-group">
                <label>End Date</label>
                <input v-model="form.endDate" type="date" class="form-input" />
              </div>
            </div>

            <!-- Budget -->
            <div class="form-group">
              <label>Budget (optional)</label>
              <input
                v-model="form.budget"
                type="number"
                placeholder="IDR"
                class="form-input"
              />
            </div>

            <!-- Notes -->
            <div class="form-group">
              <label>Notes (optional)</label>
              <input
                v-model="form.notes"
                type="text"
                placeholder="Any notes..."
                class="form-input"
              />
            </div>
          </div>

          <div class="modal-footer">
            <button v-if="editingBook" class="btn-delete" @click="deleteBook">Delete</button>
            <button class="btn-save" @click="saveBook">
              {{ editingBook ? 'Update' : 'Create Book' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* Banner */
.vacation-banner {
  position: relative;
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #0EA5E9 0%, #38BDF8 50%, #7DD3FC 100%);
  border-radius: var(--radius-xl);
  overflow: hidden;
  min-height: 120px;
  margin-bottom: var(--space-md);
  box-shadow: 0 4px 16px rgba(14, 165, 233, 0.3);
}

.vacation-banner-content {
  flex: 1;
  padding: var(--space-lg);
}

.vacation-banner-title {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.vacation-banner-subtitle {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 4px;
}

.vacation-banner-vio {
  height: 120px;
  width: auto;
  flex-shrink: 0;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
  align-self: flex-end;
  margin-right: var(--space-sm);
}

/* Stats */
.stats-row {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}

.stat-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-md);
  background: var(--bg-card);
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-lg);
}

.stat-value {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--lavender-600);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Filter */
.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin-bottom: var(--space-md);
}

.filter-chip {
  padding: 6px 12px;
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-full);
  background: white;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.filter-chip:hover {
  border-color: var(--lavender-300);
}

.filter-chip.active {
  background: var(--lavender-500);
  border-color: var(--lavender-500);
  color: white;
}

/* Books Grid */
.books-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-lg);
}

@media (min-width: 768px) {
  .books-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1024px) {
  .books-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* Book Card - Journal Style */
.book-card {
  display: flex;
  cursor: pointer;
  transition: all 0.25s ease;
  transform-style: preserve-3d;
  perspective: 1000px;
}

.book-card:hover {
  transform: translateY(-4px) rotateY(-2deg);
}

.book-card:hover .book-main {
  box-shadow: 8px 8px 20px rgba(0, 0, 0, 0.15), 0 0 0 1px var(--lavender-300);
}

/* Book Spine */
.book-spine {
  width: 12px;
  background: linear-gradient(135deg, #C4B5FD 0%, #A78BFA 50%, #8B5CF6 100%);
  border-radius: var(--radius-md) 0 0 var(--radius-md);
  flex-shrink: 0;
  box-shadow: inset -2px 0 4px rgba(0, 0, 0, 0.1);
}

.book-card.ongoing .book-spine {
  background: linear-gradient(135deg, #6EE7B7 0%, #34D399 50%, #10B981 100%);
}

/* Book Main */
.book-main {
  flex: 1;
  background: var(--bg-card);
  border-radius: 0 var(--radius-lg) var(--radius-lg) 0;
  overflow: hidden;
  box-shadow: 4px 4px 12px rgba(0, 0, 0, 0.08), 0 0 0 1px var(--lavender-100);
  transition: box-shadow 0.25s ease;
}

/* Book Cover */
.book-cover {
  position: relative;
  height: 140px;
  background: linear-gradient(135deg, #BAE6FD 0%, #7DD3FC 50%, #38BDF8 100%);
  background-size: cover;
  background-position: center;
  overflow: hidden;
}


.book-cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  background: linear-gradient(135deg, #BAE6FD 0%, #7DD3FC 50%, #38BDF8 100%);
}

.placeholder-icon {
  font-size: 2rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.placeholder-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  text-align: center;
  padding: 0 var(--space-sm);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Status Ribbon */
.book-ribbon {
  position: absolute;
  top: 12px;
  left: -4px;
  background: var(--ribbon-color);
  padding: 4px 10px 4px 8px;
  font-size: 0.8125rem;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
  z-index: 5;
}

.book-ribbon::before {
  content: '';
  position: absolute;
  left: 0;
  bottom: -4px;
  border-style: solid;
  border-width: 4px 4px 0 0;
  border-color: rgba(0, 0, 0, 0.3) transparent transparent transparent;
}

.book-edit-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-full);
  border: none;
  background: rgba(255, 255, 255, 0.95);
  cursor: pointer;
  font-size: 0.8125rem;
  opacity: 0;
  transition: all 0.2s;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  z-index: 5;
}

.book-edit-btn:hover {
  transform: scale(1.1);
}

.book-card:hover .book-edit-btn {
  opacity: 1;
}

/* Book Info */
.book-info {
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-card);
}

.book-title {
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--text-primary);
  font-size: 0.9375rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.book-destination {
  font-size: 0.75rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.book-dates {
  font-size: 0.6875rem;
  color: var(--text-tertiary);
  margin-top: 6px;
}

.book-counts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.count-badge {
  font-size: 0.625rem;
  padding: 2px 6px;
  border-radius: var(--radius-full);
  background: var(--gray-100);
  color: var(--text-secondary);
}

.count-badge.diary { background: #EDE9FE; color: #7C3AED; }
.count-badge.cafe { background: #FEF3C7; color: #B45309; }
.count-badge.restaurant { background: #FFEDD5; color: #C2410C; }

/* Empty State */
.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: var(--space-xl);
  color: var(--text-secondary);
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
}

/* Modal */
.vacation-modal {
  max-width: 480px;
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

.form-input {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-md);
  font-size: 0.9375rem;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--lavender-400);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
}

/* Cover Upload */
.cover-upload {
  position: relative;
  display: inline-block;
}

.cover-preview {
  width: 100px;
  height: 80px;
  border: 2px dashed var(--gray-300);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  background-size: cover;
  background-position: center;
  cursor: pointer;
}

.cover-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.clear-cover {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: var(--expense-color);
  color: white;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
}

/* Status Options */
.status-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

.status-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-full);
  background: white;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s;
}

.status-btn:hover {
  border-color: var(--status-color);
}

.status-btn.active {
  border-color: var(--status-color);
  background: color-mix(in srgb, var(--status-color) 15%, white);
}

/* Modal Footer */
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

.btn-save:hover {
  background: var(--lavender-600);
}

@media (max-width: 480px) {
  .vacation-banner-title {
    font-size: 1.5rem;
  }
  .vacation-banner-vio {
    height: 100px;
  }
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>

<style>
/* Dark mode */
[data-theme="dark"] .vacation-banner {
  background: linear-gradient(135deg, #0369A1 0%, #0284C7 50%, #0EA5E9 100%) !important;
}

[data-theme="dark"] .stat-card {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .filter-chip {
  background: #2D2640 !important;
  border-color: #3D3456 !important;
  color: #9D8BC2 !important;
}

[data-theme="dark"] .filter-chip.active {
  background: #8B5CF6 !important;
  border-color: #8B5CF6 !important;
  color: white !important;
}

[data-theme="dark"] .book-spine {
  background: linear-gradient(135deg, #6D5BA0 0%, #8B5CF6 50%, #A78BFA 100%) !important;
}

[data-theme="dark"] .book-card.ongoing .book-spine {
  background: linear-gradient(135deg, #34D399 0%, #10B981 50%, #059669 100%) !important;
}

[data-theme="dark"] .book-main {
  background: #1A1625 !important;
  box-shadow: 4px 4px 12px rgba(0, 0, 0, 0.3), 0 0 0 1px #3D3456 !important;
}

[data-theme="dark"] .book-card:hover .book-main {
  box-shadow: 8px 8px 20px rgba(0, 0, 0, 0.4), 0 0 0 1px #8B5CF6 !important;
}

[data-theme="dark"] .book-cover {
  background: linear-gradient(135deg, #0369A1 0%, #0284C7 50%, #0EA5E9 100%) !important;
}

[data-theme="dark"] .book-cover-placeholder {
  background: linear-gradient(135deg, #0369A1 0%, #0284C7 50%, #0EA5E9 100%) !important;
}

[data-theme="dark"] .book-info {
  background: #1A1625 !important;
}

[data-theme="dark"] .book-edit-btn {
  background: rgba(45, 38, 64, 0.95) !important;
}

[data-theme="dark"] .count-badge {
  background: #2D2640 !important;
  color: #9D8BC2 !important;
}

[data-theme="dark"] .count-badge.diary {
  background: rgba(139, 92, 246, 0.2) !important;
  color: #C4B5FD !important;
}

[data-theme="dark"] .count-badge.cafe {
  background: rgba(251, 191, 36, 0.2) !important;
  color: #FDE68A !important;
}

[data-theme="dark"] .count-badge.restaurant {
  background: rgba(249, 115, 22, 0.2) !important;
  color: #FDBA74 !important;
}

[data-theme="dark"] .cover-preview {
  border-color: #3D3456 !important;
  background-color: #2D2640 !important;
}

[data-theme="dark"] .status-btn {
  background: #2D2640 !important;
  border-color: #3D3456 !important;
  color: #9D8BC2 !important;
}

[data-theme="dark"] .status-btn:hover {
  background: #3D3456 !important;
  border-color: var(--status-color) !important;
  color: #E5E5E5 !important;
}

[data-theme="dark"] .status-btn.active {
  background: color-mix(in srgb, var(--status-color) 30%, #2D2640) !important;
  border-color: var(--status-color) !important;
  color: #F5F5F5 !important;
}

[data-theme="dark"] .form-input {
  background: #2D2640 !important;
  border-color: #3D3456 !important;
  color: #E5E5E5 !important;
}

[data-theme="dark"] .form-input:focus {
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .modal-footer {
  border-top-color: #3D3456 !important;
}

[data-theme="dark"] .btn-delete {
  background: transparent !important;
}
</style>
