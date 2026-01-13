<script setup>
import { ref, computed, inject, onMounted, onUnmounted } from 'vue'
import { useFinanceStore } from '../stores'
import AddMovieModal from '../components/AddMovieModal.vue'
import AddYoutubeModal from '../components/AddYoutubeModal.vue'

const store = useFinanceStore()
const fabAction = inject('fabAction')

const showAddModal = ref(false)
const showYoutubeModal = ref(false)
const showViewModal = ref(false)
const editingMovie = ref(null)
const editingYoutube = ref(null)
const viewingMovie = ref(null)
const viewingYoutube = ref(null)
const sortBy = ref('date') // 'date', 'rating', 'title'
const searchQuery = ref('')
const activeTab = ref('movies') // 'movies', 'series', 'books', 'youtube'
const youtubeSubTab = ref('videos') // 'videos', 'channels'
const statusFilter = ref('all')

onMounted(() => {
  fabAction.value = openAddFromFab
})

onUnmounted(() => {
  fabAction.value = null
})

function openAddFromFab() {
  if (activeTab.value === 'youtube') {
    editingYoutube.value = null
    showYoutubeModal.value = true
  } else {
    editingMovie.value = null
    showAddModal.value = true
  }
}

// Get current data source based on active tab
const currentItems = computed(() => {
  if (activeTab.value === 'series') return store.series.value || []
  if (activeTab.value === 'books') return store.books.value || []
  if (activeTab.value === 'youtube') {
    if (youtubeSubTab.value === 'channels') return store.youtubeChannels.value || []
    return store.youtubeVideos.value || []
  }
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
    books: { singular: 'book', plural: 'books', emoji: '📚', search: 'Find book...' },
    youtube: {
      singular: youtubeSubTab.value === 'channels' ? 'channel' : 'video',
      plural: youtubeSubTab.value === 'channels' ? 'channels' : 'videos',
      emoji: youtubeSubTab.value === 'channels' ? '📺' : '▶️',
      search: youtubeSubTab.value === 'channels' ? 'Find channel...' : 'Find video...'
    }
  }
  return labels[activeTab.value] || labels.movies
})

const filteredItems = computed(() => {
  const source = currentItems.value || []
  let items = [...source]

  // Filter by search
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    if (activeTab.value === 'youtube' && youtubeSubTab.value === 'channels') {
      items = items.filter(c => c.name?.toLowerCase().includes(q))
    } else if (activeTab.value === 'youtube') {
      items = items.filter(v => v.title?.toLowerCase().includes(q) || v.channelName?.toLowerCase().includes(q))
    } else {
      items = items.filter(m => m.title?.toLowerCase().includes(q))
    }
  }

  // Filter by status (for series)
  if (activeTab.value === 'series' && statusFilter.value !== 'all') {
    items = items.filter(item => {
      if (statusFilter.value === 'watching') return item.didFinish === 'watching'
      if (statusFilter.value === 'hiatus') return item.didFinish === 'hiatus'
      if (statusFilter.value === 'finished') return item.didFinish === 'yes' || item.didFinish === true
      if (statusFilter.value === 'dropped') return item.didFinish === 'dropped'
      return true
    })
  }

  // Filter by status (for books)
  if (activeTab.value === 'books' && statusFilter.value !== 'all') {
    items = items.filter(item => {
      if (statusFilter.value === 'reading') return item.didFinish === 'reading'
      if (statusFilter.value === 'finished') return item.didFinish === 'yes' || item.didFinish === true
      if (statusFilter.value === 'dropped') return item.didFinish === 'dropped'
      return true
    })
  }

  // Filter by subscribed (for youtube channels)
  if (activeTab.value === 'youtube' && youtubeSubTab.value === 'channels' && statusFilter.value !== 'all') {
    items = items.filter(item => {
      if (statusFilter.value === 'subscribed') return item.subscribed === true
      if (statusFilter.value === 'unsubscribed') return item.subscribed === false
      return true
    })
  }

  // Sort
  if (activeTab.value === 'youtube' && youtubeSubTab.value === 'channels') {
    if (sortBy.value === 'date') {
      return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    } else if (sortBy.value === 'title') {
      return items.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    }
    return items
  }

  if (sortBy.value === 'date') {
    return items.sort((a, b) => new Date(b.watchedDate || b.createdAt) - new Date(a.watchedDate || a.createdAt))
  } else if (sortBy.value === 'rating') {
    return items.sort((a, b) => (b.rating || 0) - (a.rating || 0))
  } else {
    return items.sort((a, b) => (a.title || a.name || '').localeCompare(b.title || b.name || ''))
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
  if (activeTab.value === 'youtube') {
    viewingYoutube.value = movie
    showViewModal.value = true
  } else {
    viewingMovie.value = movie
    showViewModal.value = true
  }
}

function openEdit(movie) {
  showViewModal.value = false
  if (activeTab.value === 'youtube') {
    editingYoutube.value = movie || viewingYoutube.value
    showYoutubeModal.value = true
  } else {
    editingMovie.value = movie || viewingMovie.value
    showAddModal.value = true
  }
}

function handleSave() {
  showAddModal.value = false
  showYoutubeModal.value = false
  showViewModal.value = false
  editingMovie.value = null
  editingYoutube.value = null
  viewingMovie.value = null
  viewingYoutube.value = null
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
  if (value === 'watching') return 'Still watching'
  if (value === 'hiatus') return 'On Hiatus'
  if (value === 'dropped') return 'Dropped'
  if (value === false || value === 'no') return 'Nope'
  return 'Finished'
}

function getFinishClass(value) {
  if (value === 'reading') return 'badge-maybe'
  if (value === 'watching') return 'badge-watching'
  if (value === 'hiatus') return 'badge-hiatus'
  if (value === 'dropped') return 'badge-no'
  if (value === false || value === 'no') return 'badge-no'
  return 'badge-yes'
}

function getCategoryInfo(categoryId) {
  const cat = store.YOUTUBE_CATEGORIES.find(c => c.id === categoryId)
  return cat || { name: 'Other', icon: '📺' }
}

// Check if current tab is series
const isSeriesTab = computed(() => activeTab.value === 'series')

// Check if current tab is books
const isBookTab = computed(() => activeTab.value === 'books')

// Check if current tab is YouTube
const isYoutubeTab = computed(() => activeTab.value === 'youtube')

// Stats for sidebar
const mediaStats = computed(() => ({
  movies: store.movies.value?.length || 0,
  series: store.series.value?.length || 0,
  books: store.books.value?.length || 0,
  videos: store.youtubeVideos.value?.length || 0,
  channels: store.youtubeChannels.value?.length || 0
}))

// Sidebar navigation
function selectTab(tab, subTab = null) {
  activeTab.value = tab
  statusFilter.value = 'all'
  searchQuery.value = ''
  if (subTab) {
    youtubeSubTab.value = subTab
  }
}
</script>

<template>
  <div class="page media-page">
    <div class="page-header">
      <img src="/images/vio-logo.png" alt="Vionade" class="page-header-logo" />
    </div>

    <!-- Media Banner -->
    <div class="media-banner">
      <div class="media-banner-content">
        <div class="media-banner-title">Media Journal</div>
        <div class="media-banner-subtitle">Track movies, series, books & YouTube</div>
      </div>
      <img src="/images/vio_banner_full.png" alt="Vio" class="media-banner-vio" />
    </div>

    <!-- Desktop Layout Container -->
    <div class="media-layout">
      <!-- Desktop Sidebar -->
      <aside class="media-sidebar">
        <nav class="sidebar-nav">
          <button
            class="sidebar-item"
            :class="{ active: activeTab === 'movies' }"
            @click="selectTab('movies')"
          >
            <span class="sidebar-icon">🎬</span>
            <span class="sidebar-label">Movies</span>
            <span class="sidebar-count">{{ mediaStats.movies }}</span>
          </button>
          <button
            class="sidebar-item"
            :class="{ active: activeTab === 'series' }"
            @click="selectTab('series')"
          >
            <span class="sidebar-icon">📺</span>
            <span class="sidebar-label">Series</span>
            <span class="sidebar-count">{{ mediaStats.series }}</span>
          </button>
          <button
            class="sidebar-item"
            :class="{ active: activeTab === 'books' }"
            @click="selectTab('books')"
          >
            <span class="sidebar-icon">📚</span>
            <span class="sidebar-label">Books</span>
            <span class="sidebar-count">{{ mediaStats.books }}</span>
          </button>

          <div class="sidebar-divider"></div>

          <div class="sidebar-group">
            <button
              class="sidebar-item"
              :class="{ active: activeTab === 'youtube' && youtubeSubTab === 'videos' }"
              @click="selectTab('youtube', 'videos')"
            >
              <span class="sidebar-icon">▶️</span>
              <span class="sidebar-label">YouTube Videos</span>
              <span class="sidebar-count">{{ mediaStats.videos }}</span>
            </button>
            <button
              class="sidebar-item"
              :class="{ active: activeTab === 'youtube' && youtubeSubTab === 'channels' }"
              @click="selectTab('youtube', 'channels')"
            >
              <span class="sidebar-icon">📡</span>
              <span class="sidebar-label">YouTube Channels</span>
              <span class="sidebar-count">{{ mediaStats.channels }}</span>
            </button>
          </div>
        </nav>

        <div class="sidebar-stats">
          <div class="sidebar-stat-title">Total Tracked</div>
          <div class="sidebar-stat-number">{{ mediaStats.movies + mediaStats.series + mediaStats.books + mediaStats.videos + mediaStats.channels }}</div>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="media-content">
        <!-- Mobile Tabs (hidden on desktop) -->
        <div class="media-tabs mobile-tabs">
          <button
            class="media-tab"
            :class="{ active: activeTab === 'movies' }"
            @click="selectTab('movies')"
          >Movies</button>
          <button
            class="media-tab"
            :class="{ active: activeTab === 'series' }"
            @click="selectTab('series')"
          >Series</button>
          <button
            class="media-tab"
            :class="{ active: activeTab === 'books' }"
            @click="selectTab('books')"
          >Books</button>
          <button
            class="media-tab"
            :class="{ active: activeTab === 'youtube' }"
            @click="selectTab('youtube', youtubeSubTab)"
          >YouTube</button>
        </div>

        <!-- YouTube Sub-tabs (mobile) -->
        <div class="youtube-subtabs" v-if="activeTab === 'youtube'">
          <button
            class="subtab"
            :class="{ active: youtubeSubTab === 'videos' }"
            @click="youtubeSubTab = 'videos'"
          >Videos</button>
          <button
            class="subtab"
            :class="{ active: youtubeSubTab === 'channels' }"
            @click="youtubeSubTab = 'channels'"
          >Channels</button>
        </div>

        <!-- Status Filter (Series) -->
        <div class="status-filters" v-if="activeTab === 'series' && currentItems.length > 0">
          <button
            class="status-pill"
            :class="{ active: statusFilter === 'all' }"
            @click="statusFilter = 'all'"
          >All</button>
          <button
            class="status-pill watching"
            :class="{ active: statusFilter === 'watching' }"
            @click="statusFilter = 'watching'"
          >Watching</button>
          <button
            class="status-pill hiatus"
            :class="{ active: statusFilter === 'hiatus' }"
            @click="statusFilter = 'hiatus'"
          >On Hiatus</button>
          <button
            class="status-pill finished"
            :class="{ active: statusFilter === 'finished' }"
            @click="statusFilter = 'finished'"
          >Finished</button>
          <button
            class="status-pill dropped"
            :class="{ active: statusFilter === 'dropped' }"
            @click="statusFilter = 'dropped'"
          >Dropped</button>
        </div>

        <!-- Status Filter (Books) -->
        <div class="status-filters" v-if="activeTab === 'books' && currentItems.length > 0">
          <button
            class="status-pill"
            :class="{ active: statusFilter === 'all' }"
            @click="statusFilter = 'all'"
          >All</button>
          <button
            class="status-pill reading"
            :class="{ active: statusFilter === 'reading' }"
            @click="statusFilter = 'reading'"
          >Reading</button>
          <button
            class="status-pill finished"
            :class="{ active: statusFilter === 'finished' }"
            @click="statusFilter = 'finished'"
          >Finished</button>
          <button
            class="status-pill dropped"
            :class="{ active: statusFilter === 'dropped' }"
            @click="statusFilter = 'dropped'"
          >Dropped</button>
        </div>

        <!-- Status Filter (YouTube Channels) -->
        <div class="status-filters" v-if="activeTab === 'youtube' && youtubeSubTab === 'channels' && currentItems.length > 0">
          <button
            class="status-pill"
            :class="{ active: statusFilter === 'all' }"
            @click="statusFilter = 'all'"
          >All</button>
          <button
            class="status-pill subscribed"
            :class="{ active: statusFilter === 'subscribed' }"
            @click="statusFilter = 'subscribed'"
          >Subscribed</button>
          <button
            class="status-pill unsubscribed"
            :class="{ active: statusFilter === 'unsubscribed' }"
            @click="statusFilter = 'unsubscribed'"
          >Not Subscribed</button>
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
              v-if="!(activeTab === 'youtube' && youtubeSubTab === 'channels')"
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

        <!-- YouTube Channels Grid -->
        <div v-else-if="activeTab === 'youtube' && youtubeSubTab === 'channels'" class="channel-grid">
          <div
            v-for="channel in filteredItems"
            :key="channel.id"
            class="channel-card"
            @click="openView(channel)"
          >
            <div class="channel-thumb">
              <img v-if="channel.thumbnail" :src="channel.thumbnail" :alt="channel.name" />
              <span v-else class="channel-thumb-placeholder">{{ getCategoryInfo(channel.category).icon }}</span>
            </div>
            <div class="channel-info">
              <div class="channel-name">{{ channel.name }}</div>
              <div class="channel-meta">
                <span class="channel-category">{{ getCategoryInfo(channel.category).icon }} {{ getCategoryInfo(channel.category).name }}</span>
                <span v-if="channel.subscribed" class="channel-sub-badge">Subscribed</span>
              </div>
            </div>
          </div>
        </div>

        <!-- YouTube Videos Grid -->
        <div v-else-if="activeTab === 'youtube'" class="video-grid">
          <div
            v-for="video in filteredItems"
            :key="video.id"
            class="video-card"
            @click="openView(video)"
          >
            <div class="video-thumb">
              <img v-if="video.thumbnail" :src="video.thumbnail" :alt="video.title" />
              <div v-else class="video-thumb-placeholder">▶️</div>
              <div class="video-rating">{{ video.rating }}/10</div>
            </div>
            <div class="video-info">
              <div class="video-title">{{ video.title }}</div>
              <div class="video-channel">{{ video.channelName }}</div>
            </div>
          </div>
        </div>

        <!-- Poster Grid (Movies, Series, Books) -->
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
              <div v-if="(item.didFinish === 'watching' || item.didFinish === 'hiatus') && item.currentEpisode" class="poster-episode" :class="{ hiatus: item.didFinish === 'hiatus' }">
                Ep {{ item.currentEpisode }}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- View Modal (Movies, Series, Books) -->
    <div v-if="showViewModal && viewingMovie && !isYoutubeTab" class="modal-overlay" @click.self="showViewModal = false">
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
              <div class="view-row" v-if="isSeriesTab && (viewingMovie.didFinish === 'watching' || viewingMovie.didFinish === 'hiatus') && viewingMovie.currentEpisode">
                <span class="view-label">Progress</span>
                <span class="view-value episode-badge">
                  Episode {{ viewingMovie.currentEpisode }}
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

    <!-- View Modal (YouTube Video) -->
    <div v-if="showViewModal && viewingYoutube && isYoutubeTab && youtubeSubTab === 'videos'" class="modal-overlay" @click.self="showViewModal = false">
      <div class="view-modal">
        <button class="modal-close" @click="showViewModal = false">×</button>

        <div class="view-content youtube-view">
          <div class="video-view-thumb">
            <img v-if="viewingYoutube.thumbnail" :src="viewingYoutube.thumbnail" :alt="viewingYoutube.title" />
            <div v-else class="video-view-placeholder">▶️</div>
          </div>

          <div class="view-details">
            <h2 class="view-title">{{ viewingYoutube.title }}</h2>
            <div class="view-channel">{{ viewingYoutube.channelName }}</div>
            <div class="view-stars">{{ renderStars(viewingYoutube.rating) }}</div>

            <div class="view-table">
              <div class="view-row">
                <span class="view-label">Watched</span>
                <span class="view-value">{{ formatDate(viewingYoutube.watchedDate) }}</span>
              </div>
              <div class="view-row">
                <span class="view-label">Watch again?</span>
                <span class="view-value" :class="getWatchAgainClass(viewingYoutube.wouldWatchAgain)">
                  {{ getWatchAgainText(viewingYoutube.wouldWatchAgain) }}
                </span>
              </div>
            </div>

            <div v-if="viewingYoutube.videoUrl" class="view-link">
              <a :href="viewingYoutube.videoUrl" target="_blank" rel="noopener">Open in YouTube ↗</a>
            </div>

            <div v-if="viewingYoutube.notes" class="view-notes">
              <span class="view-label">Notes</span>
              <p class="view-notes-text">{{ viewingYoutube.notes }}</p>
            </div>
          </div>
        </div>

        <button class="btn btn-primary view-edit-btn" @click="openEdit()">
          Edit
        </button>
      </div>
    </div>

    <!-- View Modal (YouTube Channel) -->
    <div v-if="showViewModal && viewingYoutube && isYoutubeTab && youtubeSubTab === 'channels'" class="modal-overlay" @click.self="showViewModal = false">
      <div class="view-modal">
        <button class="modal-close" @click="showViewModal = false">×</button>

        <div class="view-content channel-view">
          <div class="channel-view-thumb">
            <img v-if="viewingYoutube.thumbnail" :src="viewingYoutube.thumbnail" :alt="viewingYoutube.name" />
            <div v-else class="channel-view-placeholder">{{ getCategoryInfo(viewingYoutube.category).icon }}</div>
          </div>

          <div class="view-details">
            <h2 class="view-title">{{ viewingYoutube.name }}</h2>
            <div class="view-category">{{ getCategoryInfo(viewingYoutube.category).icon }} {{ getCategoryInfo(viewingYoutube.category).name }}</div>

            <div class="view-table">
              <div class="view-row">
                <span class="view-label">Status</span>
                <span class="view-value" :class="viewingYoutube.subscribed ? 'badge-yes' : 'badge-no'">
                  {{ viewingYoutube.subscribed ? 'Subscribed' : 'Not Subscribed' }}
                </span>
              </div>
              <div class="view-row">
                <span class="view-label">Added</span>
                <span class="view-value">{{ formatDate(viewingYoutube.createdAt) }}</span>
              </div>
            </div>

            <div v-if="viewingYoutube.channelUrl" class="view-link">
              <a :href="viewingYoutube.channelUrl" target="_blank" rel="noopener">Open Channel ↗</a>
            </div>

            <div v-if="viewingYoutube.notes" class="view-notes">
              <span class="view-label">Notes</span>
              <p class="view-notes-text">{{ viewingYoutube.notes }}</p>
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

    <!-- Add/Edit YouTube Modal -->
    <AddYoutubeModal
      v-if="showYoutubeModal"
      :item="editingYoutube"
      :defaultType="youtubeSubTab === 'channels' ? 'channel' : 'video'"
      @close="showYoutubeModal = false"
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

/* Desktop Layout */
.media-layout {
  display: block;
}

/* Desktop Sidebar - hidden on mobile */
.media-sidebar {
  display: none;
}

/* Mobile Tabs */
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

/* YouTube Sub-tabs */
.youtube-subtabs {
  display: flex;
  gap: var(--space-xs);
  margin-bottom: var(--space-md);
  background: var(--lavender-100);
  padding: 3px;
  border-radius: var(--radius-md);
}

.subtab {
  flex: 1;
  padding: 6px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.subtab.active {
  background: var(--white);
  color: var(--lavender-600);
}

/* Status Filters */
.status-filters {
  display: flex;
  gap: 6px;
  margin-bottom: var(--space-md);
  overflow-x: auto;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;
}

.status-pill {
  padding: 6px 12px;
  border: none;
  border-radius: var(--radius-full);
  background: var(--gray-100);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

.status-pill:hover {
  background: var(--gray-200);
}

.status-pill.active {
  background: var(--lavender-500);
  color: white;
}

.status-pill.watching.active,
.status-pill.reading.active,
.status-pill.subscribed.active {
  background: #10B981;
}

.status-pill.hiatus.active {
  background: #F59E0B;
}

.status-pill.finished.active {
  background: var(--lavender-500);
}

.status-pill.dropped.active,
.status-pill.unsubscribed.active {
  background: var(--gray-400);
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

.poster-episode {
  position: absolute;
  top: 4px;
  left: 4px;
  background: #10B981;
  color: white;
  font-size: 0.5625rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.poster-episode.hiatus {
  background: #F59E0B;
}

/* YouTube Video Grid */
.video-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-sm);
}

@media (min-width: 400px) {
  .video-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.video-card {
  cursor: pointer;
  transition: transform 0.2s;
}

.video-card:hover {
  transform: scale(1.02);
}

.video-thumb {
  position: relative;
  aspect-ratio: 16/9;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--lavender-100);
  margin-bottom: var(--space-xs);
}

.video-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
}

.video-rating {
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

.video-info {
  padding: 0 var(--space-xs);
}

.video-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.3;
}

.video-channel {
  font-size: 0.6875rem;
  color: var(--text-secondary);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* YouTube Channel Grid */
.channel-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.channel-card {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm);
  background: var(--white);
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
}

.channel-card:hover {
  border-color: var(--lavender-300);
  transform: translateY(-1px);
}

.channel-thumb {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--lavender-100);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.channel-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.channel-thumb-placeholder {
  font-size: 1.5rem;
}

.channel-info {
  flex: 1;
  min-width: 0;
}

.channel-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.channel-meta {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-top: 2px;
}

.channel-category {
  font-size: 0.6875rem;
  color: var(--text-secondary);
}

.channel-sub-badge {
  font-size: 0.625rem;
  font-weight: 600;
  color: white;
  background: #10B981;
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

.view-content.youtube-view,
.view-content.channel-view {
  flex-direction: column;
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

.video-view-thumb {
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--lavender-100);
  margin-bottom: var(--space-sm);
}

.video-view-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-view-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
}

.channel-view-thumb {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--lavender-100);
  margin: 0 auto var(--space-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.channel-view-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.channel-view-placeholder {
  font-size: 2rem;
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

.view-channel {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: var(--space-xs);
}

.view-category {
  font-size: 0.875rem;
  color: var(--lavender-600);
  margin-bottom: var(--space-sm);
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
.view-value.badge-watching { color: #10B981; }
.view-value.badge-hiatus { color: #F59E0B; }
.view-value.badge-maybe { color: #F59E0B; }
.view-value.badge-no { color: var(--text-secondary); }
.view-value.episode-badge {
  color: var(--lavender-600);
  font-weight: 700;
}

.view-link {
  margin-top: var(--space-md);
}

.view-link a {
  color: var(--lavender-600);
  font-size: 0.8125rem;
  font-weight: 600;
  text-decoration: none;
}

.view-link a:hover {
  text-decoration: underline;
}

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

/* Desktop Styles (768px+) */
@media (min-width: 768px) {
  .media-layout {
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: var(--space-lg);
  }

  .media-sidebar {
    display: flex;
    flex-direction: column;
    position: sticky;
    top: var(--space-md);
    height: fit-content;
    max-height: calc(100vh - 200px);
  }

  .sidebar-nav {
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: var(--white);
    border: 2px solid var(--lavender-100);
    border-radius: var(--radius-lg);
    padding: var(--space-sm);
  }

  .sidebar-item {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    border: none;
    border-radius: var(--radius-md);
    background: transparent;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }

  .sidebar-item:hover {
    background: var(--lavender-50);
    color: var(--text-primary);
  }

  .sidebar-item.active {
    background: var(--lavender-100);
    color: var(--lavender-700);
    font-weight: 600;
  }

  .sidebar-icon {
    font-size: 1.125rem;
  }

  .sidebar-label {
    flex: 1;
  }

  .sidebar-count {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-tertiary);
    background: var(--lavender-50);
    padding: 2px 8px;
    border-radius: var(--radius-full);
  }

  .sidebar-item.active .sidebar-count {
    background: var(--lavender-200);
    color: var(--lavender-700);
  }

  .sidebar-divider {
    height: 1px;
    background: var(--lavender-100);
    margin: var(--space-xs) 0;
  }

  .sidebar-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .sidebar-stats {
    margin-top: var(--space-md);
    padding: var(--space-md);
    background: var(--lavender-50);
    border-radius: var(--radius-lg);
    text-align: center;
  }

  .sidebar-stat-title {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin-bottom: var(--space-xs);
  }

  .sidebar-stat-number {
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--lavender-600);
  }

  /* Hide mobile tabs on desktop */
  .mobile-tabs {
    display: none;
  }

  /* Hide youtube subtabs on desktop (they're in sidebar) */
  .youtube-subtabs {
    display: none;
  }

  /* Larger grids on desktop */
  .poster-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-md);
  }

  .video-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-md);
  }

  .channel-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-md);
  }

  .view-modal {
    max-width: 500px;
  }
}

/* Large Desktop (1024px+) */
@media (min-width: 1024px) {
  .media-layout {
    grid-template-columns: 260px 1fr;
  }

  .poster-grid {
    grid-template-columns: repeat(5, 1fr);
  }

  .video-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .channel-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .view-modal {
    max-width: 600px;
  }
}

/* Extra Large Desktop (1280px+) */
@media (min-width: 1280px) {
  .poster-grid {
    grid-template-columns: repeat(6, 1fr);
  }

  .video-grid {
    grid-template-columns: repeat(5, 1fr);
  }

  .channel-grid {
    grid-template-columns: repeat(3, 1fr);
  }
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

[data-theme="dark"] .youtube-subtabs {
  background: #1A1625 !important;
}

[data-theme="dark"] .subtab.active {
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

[data-theme="dark"] .video-thumb {
  background: #2D2640 !important;
}

[data-theme="dark"] .channel-card {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .channel-card:hover {
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .channel-thumb {
  background: #2D2640 !important;
}

[data-theme="dark"] .view-modal {
  background: #1A1625 !important;
}

[data-theme="dark"] .view-poster {
  background: #2D2640 !important;
}

[data-theme="dark"] .video-view-thumb {
  background: #2D2640 !important;
}

[data-theme="dark"] .channel-view-thumb {
  background: #2D2640 !important;
}

[data-theme="dark"] .view-row {
  border-color: #3D3456 !important;
}

[data-theme="dark"] .view-link a {
  color: #A78BFA !important;
}

[data-theme="dark"] .view-category {
  color: #A78BFA !important;
}

[data-theme="dark"] .status-filters {
  background: transparent !important;
}

[data-theme="dark"] .status-pill {
  background: #2D2640 !important;
  color: #A3A3A3 !important;
}

[data-theme="dark"] .status-pill:hover {
  background: #3D3456 !important;
}

[data-theme="dark"] .status-pill.active {
  color: white !important;
}

/* Dark mode sidebar */
[data-theme="dark"] .sidebar-nav {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .sidebar-item {
  color: #A3A3A3 !important;
}

[data-theme="dark"] .sidebar-item:hover {
  background: #2D2640 !important;
  color: #E5E5E5 !important;
}

[data-theme="dark"] .sidebar-item.active {
  background: #3D3456 !important;
  color: #C4B5FD !important;
}

[data-theme="dark"] .sidebar-count {
  background: #2D2640 !important;
  color: #A3A3A3 !important;
}

[data-theme="dark"] .sidebar-item.active .sidebar-count {
  background: #5B21B6 !important;
  color: #E9D5FF !important;
}

[data-theme="dark"] .sidebar-divider {
  background: #3D3456 !important;
}

[data-theme="dark"] .sidebar-stats {
  background: #2D2640 !important;
}

[data-theme="dark"] .sidebar-stat-number {
  color: #A78BFA !important;
}
</style>
