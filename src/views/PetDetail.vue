<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFinanceStore } from '../stores'
import { petActions, sessionTypes, getStatusColor, formatDaysAgo } from '../data/petActions'

const route = useRoute()
const router = useRouter()
const store = useFinanceStore()

// Get pet from route param
const petId = computed(() => route.params.id)
const pet = computed(() => store.pets.value.find(p => p.id === petId.value))

// Tab state
const activeTab = ref('logs')

// Pagination
const displayLimit = ref(50)

// Get logs for this pet
const petLogs = computed(() => {
  return store.getPetLogs({
    petId: petId.value,
    limit: displayLimit.value,
    offset: 0
  })
})

// Group logs by date
const groupedLogs = computed(() => {
  const groups = {}
  petLogs.value.logs.forEach(log => {
    const date = log.date
    if (!groups[date]) groups[date] = []
    groups[date].push(log)
  })
  return groups
})

// Get sessions for this pet
const petSessions = computed(() => {
  return store.getPetSessions({
    petId: petId.value,
    limit: displayLimit.value,
    offset: 0
  })
})

// Group sessions by date
const groupedSessions = computed(() => {
  const groups = {}
  petSessions.value.sessions.forEach(session => {
    const date = session.date
    if (!groups[date]) groups[date] = []
    groups[date].push(session)
  })
  return groups
})

// Quick stats - show key metrics
const quickStats = computed(() => {
  const stats = []
  const keyActions = ['bath', 'vet', 'flea', 'vaccine', 'deworm', 'nail']

  keyActions.forEach(action => {
    const daysSince = store.getDaysSinceAction(petId.value, action)
    stats.push({
      action,
      emoji: petActions[action]?.emoji || '?',
      label: petActions[action]?.label || action,
      daysSince,
      daysText: formatDaysAgo(daysSince),
      status: getStatusColor(action, daysSince)
    })
  })

  return stats
})

// Format date header
function formatDateHeader(dateStr) {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  if (dateStr === today.toISOString().split('T')[0]) return 'Today'
  if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday'

  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

// Format time
function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

// Delete log
function deleteLog(id) {
  if (confirm('Delete this log?')) {
    store.deletePetLog(id)
  }
}

// Delete session
function deleteSession(id) {
  if (confirm('Delete this session?')) {
    store.deletePetSession(id)
  }
}

// Load more
function loadMore() {
  displayLimit.value += 50
}

// Go back
function goBack() {
  router.push('/pets')
}

// Redirect if pet not found
onMounted(() => {
  if (!pet.value) {
    router.push('/pets')
  }
})
</script>

<template>
  <div v-if="pet" class="page pet-detail-page">
    <!-- Header -->
    <div class="pet-header">
      <button class="back-btn" @click="goBack">
        <span class="back-icon">&larr;</span>
        Back
      </button>

      <div class="pet-header-content">
        <div class="pet-photo">
          <img v-if="pet.photo" :src="pet.photo" :alt="pet.name" />
          <span v-else class="pet-photo-placeholder">🐱</span>
        </div>

        <div class="pet-header-info">
          <h1 class="pet-title">{{ pet.name }}</h1>
          <p class="pet-nicknames">{{ pet.nickname }}</p>
          <p v-if="pet.notes" class="pet-notes">{{ pet.notes }}</p>
        </div>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="stats-section">
      <h2 class="section-title">Health Overview</h2>
      <div class="stats-grid">
        <div
          v-for="stat in quickStats"
          :key="stat.action"
          class="stat-card"
          :class="stat.status"
        >
          <span class="stat-emoji">{{ stat.emoji }}</span>
          <span class="stat-label">{{ stat.label }}</span>
          <span class="stat-value">{{ stat.daysText }}</span>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="view-tabs">
      <button
        class="view-tab"
        :class="{ active: activeTab === 'logs' }"
        @click="activeTab = 'logs'"
      >
        Quick Logs ({{ petLogs.total }})
      </button>
      <button
        class="view-tab"
        :class="{ active: activeTab === 'sessions' }"
        @click="activeTab = 'sessions'"
      >
        Sessions ({{ petSessions.total }})
      </button>
    </div>

    <!-- Logs Feed -->
    <div v-if="activeTab === 'logs'" class="log-feed">
      <div v-if="petLogs.logs.length === 0" class="empty-state">
        <img src="/images/vio_sit.png" alt="Vio" class="empty-vio" />
        <p>No logs yet for {{ pet.name }}!</p>
        <p class="empty-hint">Go back to the Pet Tracker to add your first log.</p>
      </div>

      <div v-for="(logs, date) in groupedLogs" :key="date" class="log-group">
        <div class="log-date-header">{{ formatDateHeader(date) }}</div>

        <div
          v-for="log in logs"
          :key="log.id"
          class="log-card"
        >
          <span class="log-emoji">{{ petActions[log.action]?.emoji || '📝' }}</span>
          <div class="log-content">
            <span class="log-action">{{ petActions[log.action]?.label || log.action }}</span>
            <span v-if="log.note" class="log-note">{{ log.note }}</span>
          </div>
          <span class="log-time">{{ formatTime(log.createdAt) }}</span>
          <button class="log-delete" @click="deleteLog(log.id)">×</button>
        </div>
      </div>

      <button
        v-if="petLogs.logs.length < petLogs.total"
        class="load-more-btn"
        @click="loadMore"
      >
        Load More
      </button>
    </div>

    <!-- Sessions Feed -->
    <div v-if="activeTab === 'sessions'" class="log-feed">
      <div v-if="petSessions.sessions.length === 0" class="empty-state">
        <img src="/images/vio_sit.png" alt="Vio" class="empty-vio" />
        <p>No sessions recorded for {{ pet.name }}!</p>
        <p class="empty-hint">Sessions track group activities like vet visits or grooming.</p>
      </div>

      <div v-for="(sessions, date) in groupedSessions" :key="date" class="log-group">
        <div class="log-date-header">{{ formatDateHeader(date) }}</div>

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
        v-if="petSessions.sessions.length < petSessions.total"
        class="load-more-btn"
        @click="loadMore"
      >
        Load More
      </button>
    </div>
  </div>
</template>

<style scoped>
.pet-detail-page {
  padding-bottom: 100px;
}

/* Header */
.pet-header {
  margin-bottom: var(--space-lg);
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-sm);
  background: transparent;
  border: none;
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--text-secondary);
  cursor: pointer;
  margin-bottom: var(--space-md);
}

.back-btn:hover {
  color: #00BFFF;
}

.back-icon {
  font-size: 1rem;
}

.pet-header-content {
  display: flex;
  gap: var(--space-lg);
  align-items: center;
  padding: var(--space-lg);
  background: linear-gradient(135deg, #7AD7F0 0%, #5BC0DE 100%);
  border-radius: var(--radius-lg);
  box-shadow: 0 4px 12px rgba(122, 215, 240, 0.3);
}

.pet-photo {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  border: 4px solid rgba(255, 255, 255, 0.5);
}

.pet-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pet-photo-placeholder {
  font-size: 3rem;
}

.pet-header-info {
  flex: 1;
  min-width: 0;
}

.pet-title {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 700;
  color: white;
  margin: 0 0 var(--space-xs);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.pet-nicknames {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 var(--space-xs);
}

.pet-notes {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
  font-style: italic;
}

/* Stats Section */
.stats-section {
  margin-bottom: var(--space-lg);
}

.section-title {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 var(--space-sm);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-sm);
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-sm);
  background: white;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  text-align: center;
}

.stat-card.green {
  border-color: #4ade80;
  background: linear-gradient(to bottom, #f0fdf4, white);
}

.stat-card.yellow {
  border-color: #fbbf24;
  background: linear-gradient(to bottom, #fefce8, white);
}

.stat-card.red {
  border-color: #f87171;
  background: linear-gradient(to bottom, #fef2f2, white);
}

.stat-card.gray {
  border-color: var(--border-color);
}

.stat-emoji {
  font-size: 1.5rem;
  margin-bottom: 2px;
}

.stat-label {
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 2px;
}

.stat-value {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-primary);
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

/* Log Feed */
.log-feed {
  margin-bottom: var(--space-xl);
}

.empty-state {
  text-align: center;
  padding: var(--space-xl);
}

.empty-vio {
  width: 80px;
  margin-bottom: var(--space-md);
}

.empty-hint {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.log-group {
  margin-bottom: var(--space-md);
}

.log-date-header {
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: var(--space-sm);
  font-size: 0.875rem;
  padding-left: var(--space-xs);
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

.log-action {
  font-weight: 700;
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

/* Load More */
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
</style>

<style>
/* Dark Mode */
[data-theme="dark"] .pet-header-content {
  background: linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%) !important;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3) !important;
}

[data-theme="dark"] .pet-photo {
  background: #1A1625 !important;
  border-color: rgba(255, 255, 255, 0.2) !important;
}

[data-theme="dark"] .back-btn:hover {
  color: #A78BFA !important;
}

[data-theme="dark"] .stat-card {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .stat-card.green {
  border-color: #4ade80 !important;
  background: linear-gradient(to bottom, #14532d33, #1A1625) !important;
}

[data-theme="dark"] .stat-card.yellow {
  border-color: #fbbf24 !important;
  background: linear-gradient(to bottom, #78350f33, #1A1625) !important;
}

[data-theme="dark"] .stat-card.red {
  border-color: #f87171 !important;
  background: linear-gradient(to bottom, #7f1d1d33, #1A1625) !important;
}

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

[data-theme="dark"] .log-card {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .session-card {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .session-card-notes {
  background: #2D2640 !important;
}

[data-theme="dark"] .load-more-btn {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .load-more-btn:hover {
  border-color: #8B5CF6 !important;
  color: #A78BFA !important;
}
</style>
