<script setup>
import { ref, computed, inject, onMounted, onUnmounted } from 'vue'
import { useFinanceStore } from '../stores/finance'
import AddMovieModal from '../components/AddMovieModal.vue'

const store = useFinanceStore()
const fabAction = inject('fabAction')

const showAddModal = ref(false)
const editingMovie = ref(null)
const sortBy = ref('date') // 'date', 'rating', 'title'

onMounted(() => {
  fabAction.value = () => {
    editingMovie.value = null
    showAddModal.value = true
  }
})

onUnmounted(() => {
  fabAction.value = null
})

const sortedMovies = computed(() => {
  const movies = [...store.movies.value]

  if (sortBy.value === 'date') {
    return movies.sort((a, b) => new Date(b.watchedDate) - new Date(a.watchedDate))
  } else if (sortBy.value === 'rating') {
    return movies.sort((a, b) => b.rating - a.rating)
  } else {
    return movies.sort((a, b) => a.title.localeCompare(b.title))
  }
})

function formatDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function renderStars(rating) {
  const filled = Math.round(rating)
  const empty = 10 - filled
  return '★'.repeat(filled) + '☆'.repeat(empty)
}

function openEdit(movie) {
  editingMovie.value = movie
  showAddModal.value = true
}

function handleSave() {
  showAddModal.value = false
  editingMovie.value = null
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <img src="/images/vio-logo.png" alt="Vionade" class="page-header-logo" />
    </div>

    <!-- Header -->
    <div class="movies-header section">
      <div class="movies-header-content">
        <h2 class="movies-title">Movie Journal</h2>
        <p class="movies-subtitle">{{ store.movies.value.length }} movies watched</p>
      </div>
      <img src="/images/vio_sit.png" alt="" class="movies-vio" />
    </div>

    <!-- Sort Options -->
    <div class="sort-bar" v-if="store.movies.value.length > 0">
      <span class="sort-label">Sort by:</span>
      <button
        class="sort-btn"
        :class="{ active: sortBy === 'date' }"
        @click="sortBy = 'date'"
      >Recent</button>
      <button
        class="sort-btn"
        :class="{ active: sortBy === 'rating' }"
        @click="sortBy = 'rating'"
      >Rating</button>
      <button
        class="sort-btn"
        :class="{ active: sortBy === 'title' }"
        @click="sortBy = 'title'"
      >A-Z</button>
    </div>

    <!-- Empty State -->
    <div v-if="store.movies.value.length === 0" class="empty-state">
      <img src="/images/vio_sit.png" alt="" class="empty-vio" />
      <h3 class="empty-title">No movies yet</h3>
      <p class="empty-text">Tap + to add your first movie!</p>
    </div>

    <!-- Movie List -->
    <div v-else class="movie-list">
      <div
        v-for="movie in sortedMovies"
        :key="movie.id"
        class="movie-card"
        @click="openEdit(movie)"
      >
        <div class="movie-poster">
          <img
            v-if="movie.posterUrl"
            :src="movie.posterUrl"
            :alt="movie.title"
            class="poster-img"
          />
          <div v-else class="poster-placeholder">🎬</div>
        </div>
        <div class="movie-info">
          <h3 class="movie-title">{{ movie.title }}</h3>
          <div class="movie-stars">{{ renderStars(movie.rating) }}</div>
          <div class="movie-meta">
            <span class="movie-date">{{ formatDate(movie.watchedDate) }}</span>
            <span v-if="movie.wouldWatchAgain" class="movie-rewatch">Would rewatch</span>
          </div>
          <p v-if="movie.notes" class="movie-notes">{{ movie.notes }}</p>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <AddMovieModal
      v-if="showAddModal"
      :movie="editingMovie"
      @close="showAddModal = false"
      @save="handleSave"
    />
  </div>
</template>

<style scoped>
.movies-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #F59E0B20 0%, #FBBF2410 100%);
  border: 2px solid #F59E0B40;
  border-radius: var(--radius-lg);
  padding: var(--space-md);
}

.movies-header-content {
  flex: 1;
}

.movies-title {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.movies-subtitle {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin: 0;
}

.movies-vio {
  width: 60px;
  height: auto;
}

.sort-bar {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  margin-bottom: var(--space-md);
}

.sort-label {
  font-size: 0.6875rem;
  color: var(--text-secondary);
}

.sort-btn {
  padding: var(--space-xs) var(--space-sm);
  border: 1px solid var(--lavender-200);
  border-radius: var(--radius-full);
  background: var(--white);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.sort-btn.active {
  background: var(--lavender-500);
  border-color: var(--lavender-500);
  color: white;
}

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

.movie-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.movie-card {
  display: flex;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--white);
  border-radius: var(--radius-lg);
  border: 2px solid var(--lavender-100);
  cursor: pointer;
  transition: all 0.2s ease;
}

.movie-card:hover {
  border-color: var(--lavender-300);
}

.movie-poster {
  flex-shrink: 0;
  width: 60px;
  height: 90px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--lavender-100);
}

.poster-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.poster-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.movie-info {
  flex: 1;
  min-width: 0;
}

.movie-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 var(--space-xs);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.movie-stars {
  font-size: 0.75rem;
  color: #F59E0B;
  letter-spacing: -1px;
  margin-bottom: var(--space-xs);
}

.movie-meta {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-xs);
}

.movie-date {
  font-size: 0.6875rem;
  color: var(--text-secondary);
}

.movie-rewatch {
  font-size: 0.625rem;
  padding: 2px 6px;
  background: var(--income-color);
  color: white;
  border-radius: var(--radius-full);
  font-weight: 600;
}

.movie-notes {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>

<style>
/* Dark mode */
[data-theme="dark"] .movies-header {
  background: linear-gradient(135deg, #F59E0B15 0%, #1A1625 100%) !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .sort-btn {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
  color: var(--text-secondary) !important;
}

[data-theme="dark"] .sort-btn.active {
  background: #8B5CF6 !important;
  border-color: #8B5CF6 !important;
  color: white !important;
}

[data-theme="dark"] .movie-card {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .movie-card:hover {
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .movie-poster {
  background: #2D2640 !important;
}
</style>
