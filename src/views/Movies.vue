<script setup>
import { ref, computed, inject, onMounted, onUnmounted } from 'vue'
import { useFinanceStore } from '../stores'
import AddMovieModal from '../components/AddMovieModal.vue'

const store = useFinanceStore()
const fabAction = inject('fabAction')

const showAddModal = ref(false)
const showViewModal = ref(false)
const editingMovie = ref(null)
const viewingMovie = ref(null)
const sortBy = ref('date') // 'date', 'rating', 'title'
const searchQuery = ref('')
const activeTab = ref('movies') // 'movies', 'series', 'books'

onMounted(() => {
  fabAction.value = () => {
    editingMovie.value = null
    showAddModal.value = true
  }
})

onUnmounted(() => {
  fabAction.value = null
})

// Get current data source based on active tab
const currentItems = computed(() => {
  if (activeTab.value === 'series') return store.series.value || []
  if (activeTab.value === 'books') return store.books.value || []
  return store.movies.value || []
})

// Get media type for the modal
const currentMediaType = computed(() => {
  if (activeTab.value === 'series') return 'series'
  if (activeTab.value === 'books') return 'book'
  return 'movie'
})

// Labels based on current tab
const tabLabels = computed(() => {
  const labels = {
    movies: { singular: 'movie', plural: 'movies', emoji: '🎬', search: 'Find movie...' },
    series: { singular: 'series', plural: 'series', emoji: '📺', search: 'Find series...' },
    books: { singular: 'book', plural: 'books', emoji: '📚', search: 'Find book...' }
  }
  return labels[activeTab.value] || labels.movies
})

const filteredItems = computed(() => {
  const source = currentItems.value || []
  let items = [...source]

  // Filter by search
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    items = items.filter(m => m.title?.toLowerCase().includes(q))
  }

  // Sort
  if (sortBy.value === 'date') {
    return items.sort((a, b) => new Date(b.watchedDate) - new Date(a.watchedDate))
  } else if (sortBy.value === 'rating') {
    return items.sort((a, b) => (b.rating || 0) - (a.rating || 0))
  } else {
    return items.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
  }
})

function formatDate(dateStr) {
  if (dateStr === 'unknown') return "Can't remember"
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function renderStars(rating) {
  const filled = Math.round(rating)
  const empty = 10 - filled
  return '★'.repeat(filled) + '☆'.repeat(empty)
}

function openView(movie) {
  viewingMovie.value = movie
  showViewModal.value = true
}

function openEdit(movie) {
  showViewModal.value = false
  editingMovie.value = movie || viewingMovie.value
  showAddModal.value = true
}

function handleSave() {
  showAddModal.value = false
  showViewModal.value = false
  editingMovie.value = null
  viewingMovie.value = null
}

function getWatchAgainText(value) {
  if (value === true || value === 'yes') return 'Yes!'
  if (value === 'maybe') return 'Maybe'
  return 'Nope'
}

function getWatchAgainClass(value) {
  if (value === true || value === 'yes') return 'badge-yes'
  if (value === 'maybe') return 'badge-maybe'
  return 'badge-no'
}

function getFinishText(value) {
  if (value === 'reading') return 'Still reading'
  if (value === 'dropped') return 'Dropped'
  if (value === false || value === 'no') return 'Nope'
  return 'Yes'
}

function getFinishClass(value) {
  if (value === 'reading') return 'badge-maybe'
  if (value === 'dropped') return 'badge-no'
  if (value === false || value === 'no') return 'badge-no'
  return 'badge-yes'
}

// Check if current tab is books
const isBookTab = computed(() => activeTab.value === 'books')
</script>

<template>
  <div class="page">
    <div class="page-header">
      <img src="/images/vio-logo.png" alt="Vionade" class="page-header-logo" />
    </div>

    <!-- Media Banner -->
    <div class="media-banner">
      <div class="media-banner-content">
        <div class="media-banner-title">Media Journal</div>
        <div class="media-banner-subtitle">Track movies, series & books</div>
      </div>
      <img src="/images/vio_banner_full.png" alt="Vio" class="media-banner-vio" />
    </div>

    <!-- Tabs -->
    <div class="media-tabs">
      <button
        class="media-tab"
        :class="{ active: activeTab === 'movies' }"
        @click="activeTab = 'movies'"
      >Movies</button>
      <button
        class="media-tab"
        :class="{ active: activeTab === 'series' }"
        @click="activeTab = 'series'"
      >Series</button>
      <button
        class="media-tab"
        :class="{ active: activeTab === 'books' }"
        @click="activeTab = 'books'"
      >Books</button>
    </div>

    <!-- Search & Sort Bar -->
    <div class="toolbar" v-if="currentItems.length > 0">
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          :placeholder="tabLabels.search"
        />
        <span v-if="searchQuery" class="search-clear" @click="searchQuery = ''">×</span>
      </div>
      <div class="sort-pills">
        <button
          class="sort-pill"
          :class="{ active: sortBy === 'date' }"
          @click="sortBy = 'date'"
        >Recent</button>
        <button
          class="sort-pill"
          :class="{ active: sortBy === 'rating' }"
          @click="sortBy = 'rating'"
        >Top</button>
        <button
          class="sort-pill"
          :class="{ active: sortBy === 'title' }"
          @click="sortBy = 'title'"
        >A-Z</button>
      </div>
    </div>

    <!-- Stats -->
    <div class="media-stats" v-if="currentItems.length > 0">
      <span class="stat-count">{{ filteredItems.length }} {{ tabLabels.plural }}</span>
    </div>

    <!-- Empty State -->
    <div v-if="currentItems.length === 0" class="empty-state">
      <img src="/images/vio_sit.png" alt="" class="empty-vio" />
      <h3 class="empty-title">No {{ tabLabels.plural }} yet</h3>
      <p class="empty-text">Tap + to add your first {{ tabLabels.singular }}!</p>
    </div>

    <!-- Poster Grid -->
    <div v-else class="poster-grid">
      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="poster-card"
        @click="openView(item)"
      >
        <div class="poster-wrapper">
          <img
            v-if="item.posterUrl"
            :src="item.posterUrl"
            :alt="item.title"
            class="poster-img"
          />
          <div v-else class="poster-placeholder">
            <span class="placeholder-emoji">{{ tabLabels.emoji }}</span>
            <span class="placeholder-title">{{ item.title }}</span>
          </div>
          <div class="poster-rating">{{ item.rating }}/10</div>
        </div>
      </div>
    </div>

    <!-- View Modal -->
    <div v-if="showViewModal && viewingMovie" class="modal-overlay" @click.self="showViewModal = false">
      <div class="view-modal">
        <button class="modal-close" @click="showViewModal = false">×</button>

        <div class="view-content">
          <div class="view-poster">
            <img v-if="viewingMovie.posterUrl" :src="viewingMovie.posterUrl" :alt="viewingMovie.title" />
            <div v-else class="view-poster-placeholder">{{ tabLabels.emoji }}</div>
          </div>

          <div class="view-details">
            <h2 class="view-title">{{ viewingMovie.title }}</h2>
            <div class="view-stars">{{ renderStars(viewingMovie.rating) }}</div>

            <div class="view-table">
              <div class="view-row">
                <span class="view-label">{{ isBookTab ? 'Read' : 'Watched' }}</span>
                <span class="view-value">{{ formatDate(viewingMovie.watchedDate) }}</span>
              </div>
              <div class="view-row">
                <span class="view-label">{{ isBookTab ? 'Status' : 'Finished' }}</span>
                <span class="view-value" :class="getFinishClass(viewingMovie.didFinish)">
                  {{ getFinishText(viewingMovie.didFinish) }}
                </span>
              </div>
              <div class="view-row">
                <span class="view-label">{{ isBookTab ? 'Read again?' : 'Watch again?' }}</span>
                <span class="view-value" :class="getWatchAgainClass(viewingMovie.wouldWatchAgain)">
                  {{ getWatchAgainText(viewingMovie.wouldWatchAgain) }}
                </span>
              </div>
            </div>

            <div v-if="viewingMovie.notes" class="view-notes">
              <span class="view-label">Notes</span>
              <p class="view-notes-text">{{ viewingMovie.notes }}</p>
            </div>
          </div>
        </div>

        <button class="btn btn-primary view-edit-btn" @click="openEdit()">
          Edit
        </button>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <AddMovieModal
      v-if="showAddModal"
      :movie="editingMovie"
      :mediaType="currentMediaType"
      @close="showAddModal = false"
      @save="handleSave"
    />
  </div>
</template>

<style scoped>
/* Media Banner */
.media-banner {
  position: relative;
  display: flex;
  align-items: center;
  border-radius: var(--radius-xl);
  overflow: hidden;
  margin-bottom: var(--space-md);
  background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 50%, #C4B5FD 100%);
  box-shadow: 0 4px 16px rgba(139, 92, 246, 0.3);
  min-height: 120px;
}

.media-banner-content {
  flex: 1;
  padding: var(--space-lg);
}

.media-banner-title {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.media-banner-subtitle {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 4px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.media-banner-vio {
  height: 300px;
  width: auto;
  flex-shrink: 0;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
  animation: gentle-bounce 2s ease-in-out infinite;
  margin-bottom: -180px;
}

@keyframes gentle-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

@media (max-width: 480px) {
  .media-banner-title {
    font-size: 1.5rem;
  }

  .media-banner-vio {
    height: 220px;
    margin-bottom: -120px;
  }
}

/* Tabs */
.media-tabs {
  display: flex;
  gap: var(--space-xs);
  margin-bottom: var(--space-md);
  background: var(--lavender-50);
  padding: 4px;
  border-radius: var(--radius-lg);
}

.media-tab {
  flex: 1;
  padding: var(--space-sm);
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.media-tab.active {
  background: var(--white);
  color: var(--lavender-600);
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

/* Toolbar */
.toolbar {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.search-box {
  flex: 1;
  position: relative;
}

.search-input {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  padding-right: 32px;
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-full);
  font-size: 0.8125rem;
  background: var(--white);
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: var(--lavender-400);
}

.search-clear {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.25rem;
  color: var(--text-secondary);
  cursor: pointer;
}

.sort-pills {
  display: flex;
  gap: 2px;
  background: var(--lavender-50);
  padding: 2px;
  border-radius: var(--radius-full);
}

.sort-pill {
  padding: var(--space-xs) var(--space-sm);
  border: none;
  border-radius: var(--radius-full);
  background: transparent;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.sort-pill.active {
  background: var(--white);
  color: var(--lavender-600);
}

/* Stats */
.media-stats {
  margin-bottom: var(--space-md);
}

.stat-count {
  font-size: 0.75rem;
  color: var(--text-secondary);
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

/* Poster Grid */
.poster-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-sm);
}

@media (min-width: 400px) {
  .poster-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (min-width: 600px) {
  .poster-grid {
    grid-template-columns: repeat(5, 1fr);
  }
}

.poster-card {
  cursor: pointer;
  transition: transform 0.2s;
}

.poster-card:hover {
  transform: scale(1.03);
}

.poster-wrapper {
  position: relative;
  aspect-ratio: 2/3;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--lavender-100);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.poster-wrapper .poster-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.poster-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-sm);
  text-align: center;
}

.placeholder-emoji {
  font-size: 2rem;
  margin-bottom: var(--space-xs);
}

.placeholder-title {
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--text-secondary);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.poster-rating {
  position: absolute;
  bottom: 4px;
  right: 4px;
  background: rgba(0,0,0,0.7);
  color: #F59E0B;
  font-size: 0.625rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

/* View Modal */
.view-modal {
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  padding: var(--space-lg);
  width: calc(100% - 32px);
  max-width: 400px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
}

.view-content {
  display: flex;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.view-poster {
  flex-shrink: 0;
  width: 100px;
  aspect-ratio: 2/3;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--lavender-100);
}

.view-poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.view-poster-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
}

.view-details {
  flex: 1;
  min-width: 0;
}

.view-title {
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 var(--space-xs);
}

.view-stars {
  font-size: 0.875rem;
  color: #F59E0B;
  letter-spacing: -1px;
  margin-bottom: var(--space-md);
}

.view-table {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.view-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-xs) 0;
  border-bottom: 1px solid var(--lavender-100);
}

.view-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.view-value {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-primary);
}

.view-value.badge-yes { color: var(--income-color); }
.view-value.badge-maybe { color: #F59E0B; }
.view-value.badge-no { color: var(--text-secondary); }

.view-notes {
  margin-top: var(--space-md);
}

.view-notes-text {
  font-size: 0.8125rem;
  color: var(--text-primary);
  margin: var(--space-xs) 0 0;
  line-height: 1.5;
}

.view-edit-btn {
  width: 100%;
}
</style>

<style>
/* Dark mode */
[data-theme="dark"] .media-banner {
  background: linear-gradient(135deg, #4C1D95 0%, #6D28D9 50%, #7C3AED 100%) !important;
}

[data-theme="dark"] .media-tabs {
  background: #1A1625 !important;
}

[data-theme="dark"] .media-tab.active {
  background: #2D2640 !important;
  color: #C4B5FD !important;
}

[data-theme="dark"] .search-input {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
  color: var(--text-primary) !important;
}

[data-theme="dark"] .search-input:focus {
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .sort-pills {
  background: #1A1625 !important;
}

[data-theme="dark"] .sort-pill.active {
  background: #2D2640 !important;
  color: #C4B5FD !important;
}

[data-theme="dark"] .poster-wrapper {
  background: #2D2640 !important;
}

[data-theme="dark"] .view-modal {
  background: #1A1625 !important;
}

[data-theme="dark"] .view-poster {
  background: #2D2640 !important;
}

[data-theme="dark"] .view-row {
  border-color: #3D3456 !important;
}
</style>
