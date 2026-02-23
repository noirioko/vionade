<script setup>
import { ref, computed, watch } from 'vue'
import { useFinanceStore } from '../stores'
import { useToast } from '../composables/useToast'

const props = defineProps({
  movie: {
    type: Object,
    default: null
  },
  mediaType: {
    type: String,
    default: 'movie' // 'movie', 'series', 'book'
  }
})

const emit = defineEmits(['close', 'save'])
const store = useFinanceStore()
const toast = useToast()

// Form state
const title = ref('')
const posterUrl = ref('')
const customPosterUrl = ref('')
const useCustomPoster = ref(false)
const isUploadingImage = ref(false)
const rating = ref(7)
const watchedDate = ref(new Date().toISOString().split('T')[0])
const finishedDate = ref('') // For books - when finished reading
const notes = ref('')
const wouldWatchAgain = ref('yes') // 'yes', 'maybe', 'no'
const didFinish = ref('yes') // 'yes', 'no', 'reading', 'dropped' (for books), 'watching' (for series)
const currentEpisode = ref(1) // Episode tracker for series
const currentPage = ref('') // Page tracker for books

// Search state
const searchQuery = ref('')
const searchResults = ref([])
const isSearching = ref(false)
const showResults = ref(false)

// Initialize form if editing
watch(() => props.movie, (movie) => {
  if (movie) {
    title.value = movie.title
    posterUrl.value = movie.posterUrl || ''
    customPosterUrl.value = movie.posterUrl || ''
    useCustomPoster.value = false
    rating.value = movie.rating
    watchedDate.value = movie.watchedDate
    finishedDate.value = movie.finishedDate || ''
    notes.value = movie.notes || ''
    currentEpisode.value = movie.currentEpisode || 1
    currentPage.value = movie.currentPage || ''
    // Handle didFinish - convert boolean to string if needed
    if (typeof movie.didFinish === 'boolean') {
      didFinish.value = movie.didFinish ? 'yes' : 'no'
    } else {
      didFinish.value = movie.didFinish || 'yes'
    }
    if (typeof movie.wouldWatchAgain === 'boolean') {
      wouldWatchAgain.value = movie.wouldWatchAgain ? 'yes' : 'no'
    } else {
      wouldWatchAgain.value = movie.wouldWatchAgain || 'yes'
    }
  } else {
    title.value = ''
    posterUrl.value = ''
    customPosterUrl.value = ''
    useCustomPoster.value = false
    rating.value = 7
    watchedDate.value = new Date().toISOString().split('T')[0]
    finishedDate.value = ''
    notes.value = ''
    didFinish.value = 'yes'
    wouldWatchAgain.value = 'yes'
    currentEpisode.value = 1
    currentPage.value = ''
  }
}, { immediate: true })

const isEditing = computed(() => !!props.movie)
const hasApiKey = computed(() => {
  if (props.mediaType === 'book') return true // Google Books doesn't need key
  return !!import.meta.env.VITE_TMDB_API_KEY
})

// Computed labels based on media type
const mediaLabels = computed(() => {
  const labels = {
    movie: {
      title: 'Movie',
      search: 'Search TMDB...',
      poster: 'Poster',
      dateLabel: 'Date Watched',
      finishLabel: 'Did I finish it?',
      againLabel: 'Would watch again?'
    },
    series: {
      title: 'Series',
      search: 'Search TV series...',
      poster: 'Poster',
      dateLabel: 'Date Watched',
      finishLabel: 'Did I finish it?',
      againLabel: 'Would watch again?'
    },
    book: {
      title: 'Book',
      search: 'Search Google Books...',
      poster: 'Cover',
      dateLabel: 'Date Read',
      finishLabel: 'Reading status',
      againLabel: 'Would read again?'
    }
  }
  return labels[props.mediaType] || labels.movie
})

// Different finish options for books vs movies/series
const isBook = computed(() => props.mediaType === 'book')
const isSeries = computed(() => props.mediaType === 'series')

const effectivePosterUrl = computed(() => {
  return useCustomPoster.value ? customPosterUrl.value : posterUrl.value
})

// Search API based on media type
async function searchMedia() {
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    return
  }

  if (props.mediaType === 'book') {
    await searchBooks()
  } else {
    await searchTMDB()
  }
}

async function searchTMDB() {
  const apiKey = import.meta.env.VITE_TMDB_API_KEY
  if (!apiKey) {
    title.value = searchQuery.value
    showResults.value = false
    return
  }

  isSearching.value = true
  try {
    const endpoint = props.mediaType === 'series' ? 'search/tv' : 'search/movie'
    const res = await fetch(
      `https://api.themoviedb.org/3/${endpoint}?api_key=${apiKey}&query=${encodeURIComponent(searchQuery.value)}`
    )
    const data = await res.json()
    searchResults.value = data.results?.slice(0, 6).map(m => ({
      id: m.id,
      title: m.title || m.name, // TV shows use 'name'
      year: (m.release_date || m.first_air_date)?.slice(0, 4) || '',
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

async function searchBooks() {
  isSearching.value = true
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery.value)}&maxResults=6`
    )
    const data = await res.json()
    searchResults.value = data.items?.map(b => ({
      id: b.id,
      title: b.volumeInfo.title,
      year: b.volumeInfo.publishedDate?.slice(0, 4) || '',
      author: b.volumeInfo.authors?.[0] || '',
      posterUrl: b.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || null
    })) || []
    showResults.value = true
  } catch (err) {
    console.error('Google Books search error:', err)
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

  const mediaData = {
    title: title.value.trim(),
    posterUrl: effectivePosterUrl.value || null,
    rating: rating.value,
    watchedDate: watchedDate.value,
    notes: notes.value.trim(),
    didFinish: didFinish.value,
    wouldWatchAgain: wouldWatchAgain.value
  }

  // Add episode tracking for series
  if (props.mediaType === 'series') {
    mediaData.currentEpisode = currentEpisode.value
  }

  // Add finished date and page tracking for books
  if (props.mediaType === 'book') {
    mediaData.finishedDate = finishedDate.value || null
    mediaData.currentPage = currentPage.value ? parseInt(currentPage.value) : null
  }

  if (props.mediaType === 'series') {
    if (isEditing.value) {
      store.updateSeries(props.movie.id, mediaData)
    } else {
      store.addSeries(mediaData)
    }
  } else if (props.mediaType === 'book') {
    if (isEditing.value) {
      store.updateBook(props.movie.id, mediaData)
    } else {
      store.addBook(mediaData)
    }
  } else {
    if (isEditing.value) {
      store.updateMovie(props.movie.id, mediaData)
    } else {
      store.addMovie(mediaData)
    }
  }

  emit('save')
}

function handleDelete() {
  if (!props.movie) return
  const confirmMsg = `Delete this ${mediaLabels.value.title.toLowerCase()}?`
  if (confirm(confirmMsg)) {
    if (props.mediaType === 'series') {
      store.deleteSeries(props.movie.id)
    } else if (props.mediaType === 'book') {
      store.deleteBook(props.movie.id)
    } else {
      store.deleteMovie(props.movie.id)
    }
    emit('save')
  }
}

// Debounced search
let searchTimeout = null
function onSearchInput() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    searchMedia()
  }, 300)
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
      // Compress to max 300px width for thumbnail
      const maxWidth = 300
      const maxHeight = 450
      let { width, height } = img

      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height
        height = maxHeight
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      // Convert to compressed JPEG base64
      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7)
      customPosterUrl.value = compressedBase64
      useCustomPoster.value = true
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
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">{{ isEditing ? 'Edit' : 'Add' }} {{ mediaLabels.title }}</h3>
        <button class="modal-close" @click="$emit('close')">×</button>
      </div>

      <!-- Search -->
      <div class="input-group">
        <label class="input-label">{{ isEditing ? 'Change' : 'Search' }} {{ mediaLabels.title }}</label>
        <div class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            class="input"
            :placeholder="hasApiKey ? mediaLabels.search : `Type ${mediaLabels.title.toLowerCase()} title...`"
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
              <span v-else>{{ mediaType === 'book' ? '📚' : '🎬' }}</span>
            </div>
            <div class="result-info">
              <span class="result-title">{{ result.title }}</span>
              <span v-if="result.author" class="result-author">{{ result.author }}</span>
              <span v-if="result.year" class="result-year">{{ result.year }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Manual Entry Option (when search has no results or user wants to skip) -->
      <button
        v-if="!title && !effectivePosterUrl && searchQuery && searchResults.length === 0 && !isSearching"
        class="manual-entry-btn"
        @click="title = searchQuery; searchQuery = ''"
      >
        Can't find it? Add "{{ searchQuery }}" manually
      </button>

      <!-- Selected Preview / Manual Entry -->
      <div class="selected-movie" :class="{ 'no-selection': !title && !effectivePosterUrl }">
        <div class="selected-poster">
          <img v-if="effectivePosterUrl" :src="effectivePosterUrl" :alt="title" />
          <span v-else>{{ mediaType === 'book' ? '📚' : '🎬' }}</span>
        </div>
        <div class="selected-info">
          <input
            v-model="title"
            type="text"
            class="input title-input"
            :placeholder="`${mediaLabels.title} title (type or search above)`"
          />
        </div>
      </div>

      <!-- Custom Image Upload -->
      <div class="input-group">
        <label class="input-label">Custom {{ mediaLabels.poster }}</label>
        <div class="upload-options">
          <label class="upload-btn">
            <input
              type="file"
              accept="image/*"
              @change="handleImageUpload"
              hidden
            />
            {{ isUploadingImage ? 'Processing...' : 'Upload Image' }}
          </label>
          <span class="upload-hint">or paste URL:</span>
          <input
            v-model="customPosterUrl"
            type="url"
            class="input url-input"
            placeholder="https://..."
            @input="useCustomPoster = !!customPosterUrl"
          />
        </div>
        <p v-if="useCustomPoster && customPosterUrl" class="upload-status">
          Custom image set
          <button class="clear-custom-btn" @click="customPosterUrl = ''; useCustomPoster = false">Clear</button>
        </p>
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

      <!-- Date Watched/Read -->
      <div class="input-group">
        <label class="input-label">{{ mediaLabels.dateLabel }}</label>
        <div class="date-options">
          <input
            v-model="watchedDate"
            type="date"
            class="input date-input"
            :disabled="watchedDate === 'unknown'"
          />
          <button
            class="date-unknown-btn"
            :class="{ active: watchedDate === 'unknown' }"
            @click="watchedDate = watchedDate === 'unknown' ? new Date().toISOString().split('T')[0] : 'unknown'"
          >
            {{ watchedDate === 'unknown' ? "Can't remember" : '?' }}
          </button>
        </div>
      </div>

      <!-- Did I finish it? (different options for books and series) -->
      <div class="input-group">
        <label class="input-label">{{ mediaLabels.finishLabel }}</label>
        <!-- Movies: simple yes/no -->
        <div class="finish-options" v-if="!isBook && !isSeries">
          <button
            class="finish-btn"
            :class="{ active: didFinish === 'yes' }"
            @click="didFinish = 'yes'"
          >Yep!</button>
          <button
            class="finish-btn"
            :class="{ active: didFinish === 'no' }"
            @click="didFinish = 'no'"
          >Nope (fell asleep)</button>
        </div>
        <!-- Series: finished/watching/hiatus/dropped -->
        <div class="finish-options series-options" v-else-if="isSeries">
          <button
            class="finish-btn"
            :class="{ active: didFinish === 'yes' }"
            @click="didFinish = 'yes'"
          >Finished</button>
          <button
            class="finish-btn"
            :class="{ active: didFinish === 'watching' }"
            @click="didFinish = 'watching'"
          >Watching</button>
          <button
            class="finish-btn"
            :class="{ active: didFinish === 'hiatus' }"
            @click="didFinish = 'hiatus'"
          >On Hiatus</button>
          <button
            class="finish-btn"
            :class="{ active: didFinish === 'dropped' }"
            @click="didFinish = 'dropped'"
          >Dropped</button>
        </div>
        <!-- Books: finished/reading/owned/dropped -->
        <div class="finish-options book-options" v-else>
          <button
            class="finish-btn"
            :class="{ active: didFinish === 'yes' }"
            @click="didFinish = 'yes'"
          >Finished</button>
          <button
            class="finish-btn"
            :class="{ active: didFinish === 'reading' }"
            @click="didFinish = 'reading'"
          >Still reading</button>
          <button
            class="finish-btn"
            :class="{ active: didFinish === 'owned' }"
            @click="didFinish = 'owned'"
          >Owned</button>
          <button
            class="finish-btn"
            :class="{ active: didFinish === 'dropped' }"
            @click="didFinish = 'dropped'"
          >Dropped</button>
        </div>
      </div>

      <!-- Finished Date (for books when finished) -->
      <div class="input-group" v-if="isBook && didFinish === 'yes'">
        <label class="input-label">Finished Reading</label>
        <input
          v-model="finishedDate"
          type="date"
          class="input"
        />
      </div>

      <!-- Episode tracker for series (when watching or on hiatus) -->
      <div class="input-group" v-if="isSeries && (didFinish === 'watching' || didFinish === 'hiatus')">
        <label class="input-label">On Episode</label>
        <div class="episode-input-row">
          <button class="episode-btn" @click="currentEpisode = Math.max(1, currentEpisode - 1)">-</button>
          <input
            v-model.number="currentEpisode"
            type="number"
            class="input episode-input"
            min="1"
          />
          <button class="episode-btn" @click="currentEpisode++">+</button>
        </div>
      </div>

      <!-- Page tracker for books (when still reading) -->
      <div class="input-group" v-if="isBook && didFinish === 'reading'">
        <label class="input-label">On Page</label>
        <input
          v-model="currentPage"
          type="number"
          class="input"
          placeholder="e.g. 142"
          min="1"
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

      <!-- Would Watch/Read Again -->
      <div class="input-group">
        <label class="input-label">{{ mediaLabels.againLabel }}</label>
        <div class="rewatch-options">
          <button
            class="rewatch-btn"
            :class="{ active: wouldWatchAgain === 'yes' }"
            @click="wouldWatchAgain = 'yes'"
          >Yes!</button>
          <button
            class="rewatch-btn"
            :class="{ active: wouldWatchAgain === 'maybe' }"
            @click="wouldWatchAgain = 'maybe'"
          >Maybe</button>
          <button
            class="rewatch-btn"
            :class="{ active: wouldWatchAgain === 'no' }"
            @click="wouldWatchAgain = 'no'"
          >Nope</button>
        </div>
      </div>

      <!-- Actions -->
      <div class="modal-actions">
        <button v-if="isEditing" class="btn btn-ghost btn-delete" @click="handleDelete">
          Delete
        </button>
        <button class="btn btn-primary" :class="{ 'btn-full': !isEditing }" @click="handleSave">
          {{ isEditing ? 'Save' : `Add ${mediaLabels.title}` }}
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

.result-author {
  font-size: 0.6875rem;
  color: var(--lavender-500);
  font-style: italic;
}

.result-year {
  font-size: 0.6875rem;
  color: var(--text-secondary);
}

.upload-options {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.upload-btn {
  padding: var(--space-sm) var(--space-md);
  border: 2px dashed var(--lavender-300);
  border-radius: var(--radius-md);
  background: var(--lavender-50);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--lavender-600);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.upload-btn:hover {
  border-color: var(--lavender-500);
  background: var(--lavender-100);
}

.upload-hint {
  font-size: 0.6875rem;
  color: var(--text-secondary);
}

.url-input {
  flex: 1;
  min-width: 100px;
  padding: var(--space-xs) var(--space-sm) !important;
  font-size: 0.75rem !important;
}

.upload-status {
  margin-top: var(--space-xs);
  font-size: 0.6875rem;
  color: var(--income-color);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.clear-custom-btn {
  padding: 2px 8px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--lavender-100);
  font-size: 0.625rem;
  color: var(--text-secondary);
  cursor: pointer;
}

.clear-custom-btn:hover {
  background: var(--lavender-200);
}

.manual-entry-btn {
  width: 100%;
  padding: var(--space-sm);
  margin-bottom: var(--space-sm);
  background: var(--sunshine-100);
  border: 2px dashed var(--sunshine-400);
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.manual-entry-btn:hover {
  background: var(--sunshine-200);
  border-style: solid;
}

.selected-movie {
  display: flex;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
  padding: var(--space-md);
  background: var(--lavender-50);
  border-radius: var(--radius-md);
}

.selected-movie.no-selection {
  background: var(--gray-50);
  border: 2px dashed var(--gray-200);
}

.selected-poster {
  width: 80px;
  height: 120px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--lavender-100);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 1.5rem;
}

@media (min-width: 768px) {
  .selected-poster {
    width: 120px;
    height: 180px;
  }
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

.date-options {
  display: flex;
  gap: var(--space-xs);
}

.date-input {
  flex: 1;
}

.date-unknown-btn {
  padding: var(--space-sm) var(--space-md);
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-md);
  background: var(--white);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.date-unknown-btn:hover {
  border-color: var(--lavender-300);
}

.date-unknown-btn.active {
  background: var(--lavender-500);
  border-color: var(--lavender-500);
  color: white;
}

.finish-options,
.rewatch-options {
  display: flex;
  gap: var(--space-xs);
}

.finish-btn,
.rewatch-btn {
  flex: 1;
  padding: var(--space-sm);
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-md);
  background: var(--white);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.finish-btn:hover,
.rewatch-btn:hover {
  border-color: var(--lavender-300);
}

.finish-btn.active,
.rewatch-btn.active {
  background: var(--lavender-500);
  border-color: var(--lavender-500);
  color: white;
}

/* Episode input */
.episode-input-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.episode-btn {
  width: 40px;
  height: 40px;
  border: 2px solid var(--lavender-300);
  border-radius: var(--radius-md);
  background: var(--lavender-50);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--lavender-600);
  cursor: pointer;
  transition: all 0.15s;
}

.episode-btn:hover {
  background: var(--lavender-100);
  border-color: var(--lavender-500);
}

.episode-btn:active {
  transform: scale(0.95);
}

.episode-input {
  width: 80px;
  text-align: center;
  font-size: 1.25rem;
  font-weight: 700;
  padding: var(--space-sm) !important;
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

[data-theme="dark"] .selected-movie.no-selection {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .manual-entry-btn {
  background: #2D2640 !important;
  border-color: #8B5CF6 !important;
  color: #C4B5FD !important;
}

[data-theme="dark"] .manual-entry-btn:hover {
  background: #3D3456 !important;
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

[data-theme="dark"] .finish-btn,
[data-theme="dark"] .rewatch-btn {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .finish-btn:hover,
[data-theme="dark"] .rewatch-btn:hover {
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .finish-btn.active,
[data-theme="dark"] .rewatch-btn.active {
  background: #8B5CF6 !important;
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .date-unknown-btn {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .date-unknown-btn:hover {
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .date-unknown-btn.active {
  background: #8B5CF6 !important;
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .upload-btn {
  background: #2D2640 !important;
  border-color: #3D3456 !important;
  color: #C4B5FD !important;
}

[data-theme="dark"] .upload-btn:hover {
  border-color: #8B5CF6 !important;
  background: #3D3456 !important;
}

[data-theme="dark"] .clear-custom-btn {
  background: #3D3456 !important;
  color: #C4B5FD !important;
}

[data-theme="dark"] .clear-custom-btn:hover {
  background: #4D4466 !important;
}

[data-theme="dark"] .episode-btn {
  background: #2D2640 !important;
  border-color: #3D3456 !important;
  color: #C4B5FD !important;
}

[data-theme="dark"] .episode-btn:hover {
  background: #3D3456 !important;
  border-color: #8B5CF6 !important;
}
</style>
