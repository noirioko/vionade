<script setup>
import { ref, computed, watch } from 'vue'
import { useFinanceStore } from '../stores/finance'

const props = defineProps({
  movie: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'save'])
const store = useFinanceStore()

// Form state
const title = ref('')
const posterUrl = ref('')
const rating = ref(7)
const watchedDate = ref(new Date().toISOString().split('T')[0])
const notes = ref('')
const wouldWatchAgain = ref(true)

// TMDB search state
const searchQuery = ref('')
const searchResults = ref([])
const isSearching = ref(false)
const showResults = ref(false)

// Initialize form if editing
watch(() => props.movie, (movie) => {
  if (movie) {
    title.value = movie.title
    posterUrl.value = movie.posterUrl || ''
    rating.value = movie.rating
    watchedDate.value = movie.watchedDate
    notes.value = movie.notes || ''
    wouldWatchAgain.value = movie.wouldWatchAgain
  } else {
    title.value = ''
    posterUrl.value = ''
    rating.value = 7
    watchedDate.value = new Date().toISOString().split('T')[0]
    notes.value = ''
    wouldWatchAgain.value = true
  }
}, { immediate: true })

const isEditing = computed(() => !!props.movie)

// TMDB API search
async function searchMovies() {
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    return
  }

  const apiKey = import.meta.env.VITE_TMDB_API_KEY
  if (!apiKey) {
    // No API key, just use the search query as title
    title.value = searchQuery.value
    showResults.value = false
    return
  }

  isSearching.value = true
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(searchQuery.value)}`
    )
    const data = await res.json()
    searchResults.value = data.results?.slice(0, 6).map(m => ({
      id: m.id,
      title: m.title,
      year: m.release_date?.slice(0, 4) || '',
      posterUrl: m.poster_path
        ? `https://image.tmdb.org/t/p/w200${m.poster_path}`
        : null
    })) || []
    showResults.value = true
  } catch (err) {
    console.error('TMDB search error:', err)
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

function selectMovie(result) {
  title.value = result.title
  posterUrl.value = result.posterUrl || ''
  searchQuery.value = ''
  showResults.value = false
  searchResults.value = []
}

function handleSave() {
  if (!title.value.trim()) return

  const movieData = {
    title: title.value.trim(),
    posterUrl: posterUrl.value || null,
    rating: rating.value,
    watchedDate: watchedDate.value,
    notes: notes.value.trim(),
    wouldWatchAgain: wouldWatchAgain.value
  }

  if (isEditing.value) {
    store.updateMovie(props.movie.id, movieData)
  } else {
    store.addMovie(movieData)
  }

  emit('save')
}

function handleDelete() {
  if (props.movie && confirm('Delete this movie?')) {
    store.deleteMovie(props.movie.id)
    emit('save')
  }
}

// Debounced search
let searchTimeout = null
function onSearchInput() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    searchMovies()
  }, 300)
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">{{ isEditing ? 'Edit Movie' : 'Add Movie' }}</h3>
        <button class="modal-close" @click="$emit('close')">×</button>
      </div>

      <!-- Search (only for new movies) -->
      <div v-if="!isEditing" class="input-group">
        <label class="input-label">Search Movie</label>
        <div class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            class="input"
            placeholder="Type movie title..."
            @input="onSearchInput"
            @focus="showResults = searchResults.length > 0"
          />
          <span v-if="isSearching" class="search-spinner">...</span>
        </div>

        <!-- Search Results -->
        <div v-if="showResults && searchResults.length > 0" class="search-results">
          <div
            v-for="result in searchResults"
            :key="result.id"
            class="search-result"
            @click="selectMovie(result)"
          >
            <div class="result-poster">
              <img v-if="result.posterUrl" :src="result.posterUrl" :alt="result.title" />
              <span v-else>🎬</span>
            </div>
            <div class="result-info">
              <span class="result-title">{{ result.title }}</span>
              <span v-if="result.year" class="result-year">{{ result.year }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Selected Movie Preview -->
      <div v-if="title || posterUrl" class="selected-movie">
        <div class="selected-poster">
          <img v-if="posterUrl" :src="posterUrl" :alt="title" />
          <span v-else>🎬</span>
        </div>
        <div class="selected-info">
          <input
            v-model="title"
            type="text"
            class="input title-input"
            placeholder="Movie title"
          />
        </div>
      </div>

      <!-- Rating -->
      <div class="input-group">
        <label class="input-label">Rating ({{ rating }}/10)</label>
        <div class="star-rating">
          <button
            v-for="n in 10"
            :key="n"
            class="star-btn"
            :class="{ filled: n <= rating }"
            @click="rating = n"
          >★</button>
        </div>
      </div>

      <!-- Date Watched -->
      <div class="input-group">
        <label class="input-label">Date Watched</label>
        <input
          v-model="watchedDate"
          type="date"
          class="input"
        />
      </div>

      <!-- Notes -->
      <div class="input-group">
        <label class="input-label">Notes</label>
        <textarea
          v-model="notes"
          class="input textarea"
          placeholder="What did you think?"
          rows="3"
        ></textarea>
      </div>

      <!-- Would Watch Again -->
      <div class="input-group">
        <label class="toggle-row">
          <span class="toggle-label">Would watch again?</span>
          <button
            class="toggle-btn"
            :class="{ active: wouldWatchAgain }"
            @click="wouldWatchAgain = !wouldWatchAgain"
          >
            {{ wouldWatchAgain ? 'Yes!' : 'Nope' }}
          </button>
        </label>
      </div>

      <!-- Actions -->
      <div class="modal-actions">
        <button v-if="isEditing" class="btn btn-ghost btn-delete" @click="handleDelete">
          Delete
        </button>
        <button class="btn btn-primary" :class="{ 'btn-full': !isEditing }" @click="handleSave">
          {{ isEditing ? 'Save' : 'Add Movie' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-box {
  position: relative;
}

.search-spinner {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
}

.search-results {
  margin-top: var(--space-sm);
  background: var(--white);
  border: 2px solid var(--lavender-200);
  border-radius: var(--radius-md);
  overflow: hidden;
  max-height: 240px;
  overflow-y: auto;
}

.search-result {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm);
  cursor: pointer;
  transition: background 0.15s;
}

.search-result:hover {
  background: var(--lavender-50);
}

.result-poster {
  width: 40px;
  height: 60px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--lavender-100);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.result-poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.result-info {
  flex: 1;
  min-width: 0;
}

.result-title {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-year {
  font-size: 0.6875rem;
  color: var(--text-secondary);
}

.selected-movie {
  display: flex;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
  padding: var(--space-md);
  background: var(--lavender-50);
  border-radius: var(--radius-md);
}

.selected-poster {
  width: 60px;
  height: 90px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--lavender-100);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 1.5rem;
}

.selected-poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.selected-info {
  flex: 1;
  display: flex;
  align-items: center;
}

.title-input {
  font-weight: 600;
}

.star-rating {
  display: flex;
  gap: 2px;
}

.star-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  font-size: 1.25rem;
  color: var(--gray-300);
  cursor: pointer;
  transition: all 0.15s;
  padding: 0;
}

.star-btn.filled {
  color: #F59E0B;
}

.star-btn:hover {
  transform: scale(1.2);
}

.textarea {
  resize: none;
  font-family: inherit;
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.toggle-label {
  font-size: 0.875rem;
  color: var(--text-primary);
}

.toggle-btn {
  padding: var(--space-xs) var(--space-md);
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-full);
  background: var(--white);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-btn.active {
  background: var(--income-color);
  border-color: var(--income-color);
  color: white;
}

.modal-actions {
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-md);
}

.modal-actions .btn {
  flex: 1;
}

.btn-full {
  width: 100%;
}

.btn-delete {
  color: var(--expense-color);
}
</style>

<style>
/* Dark mode */
[data-theme="dark"] .search-results {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .search-result:hover {
  background: #2D2640 !important;
}

[data-theme="dark"] .result-poster {
  background: #2D2640 !important;
}

[data-theme="dark"] .selected-movie {
  background: #2D2640 !important;
}

[data-theme="dark"] .selected-poster {
  background: #3D3456 !important;
}

[data-theme="dark"] .star-btn {
  color: #3D3456 !important;
}

[data-theme="dark"] .star-btn.filled {
  color: #F59E0B !important;
}

[data-theme="dark"] .toggle-btn {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .toggle-btn.active {
  background: var(--income-color) !important;
  border-color: var(--income-color) !important;
}
</style>
