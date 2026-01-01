<script setup>
import { ref, computed } from 'vue'
import { useFinanceStore } from '../stores'
import { tanks, tankActions, getWaterChangeStatus, formatDaysAgo } from '../data/tanks'

const store = useFinanceStore()

// Modal state
const showLogModal = ref(false)
const selectedTank = ref(null)
const logForm = ref({
  action: 'water_change',
  percentage: 25,
  note: '',
  date: new Date().toISOString().split('T')[0]
})

// History modal
const showHistoryModal = ref(false)
const historyTank = ref(null)

// Get tank status
function getTankStatus(tankId) {
  const days = store.getDaysSinceWaterChange(tankId)
  return {
    days,
    status: getWaterChangeStatus(days),
    text: formatDaysAgo(days)
  }
}

// Quick water change - one tap
function quickWaterChange(tank) {
  store.addTankLog({
    tankId: tank.id,
    tankName: tank.name,
    action: 'water_change',
    percentage: 25,
    note: '',
    date: new Date().toISOString().split('T')[0]
  })
}

// Open log modal for more options
function openLogModal(tank) {
  editingLog.value = null  // Clear any editing state
  selectedTank.value = tank
  logForm.value = {
    action: 'water_change',
    percentage: 25,
    note: '',
    date: new Date().toISOString().split('T')[0]
  }
  showLogModal.value = true
}

// Submit log (create or update)
function submitLog() {
  if (!selectedTank.value) return

  const logData = {
    tankId: selectedTank.value.id,
    tankName: selectedTank.value.name,
    action: logForm.value.action,
    percentage: logForm.value.action === 'water_change' ? logForm.value.percentage : null,
    note: logForm.value.note,
    date: logForm.value.date
  }

  if (editingLog.value) {
    // Update existing log
    store.updateTankLog(editingLog.value.id, logData)
    editingLog.value = null
  } else {
    // Create new log
    store.addTankLog(logData)
  }

  showLogModal.value = false
}

// History
function openHistory(tank) {
  historyTank.value = tank
  showHistoryModal.value = true
}

const tankHistory = computed(() => {
  if (!historyTank.value) return []
  const { logs } = store.getTankLogs(historyTank.value.id, { limit: 30 })
  return logs
})

function deleteLog(id) {
  if (confirm('Delete this log?')) {
    store.deleteTankLog(id)
  }
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Count tanks by status
const statusCounts = computed(() => {
  const counts = { good: 0, warning: 0, overdue: 0, none: 0 }
  tanks.forEach(tank => {
    const status = getTankStatus(tank.id).status
    counts[status]++
  })
  return counts
})

// Pagination
const currentPage = ref(1)
const logsPerPage = 15

const allLogsSorted = computed(() => {
  return [...store.tankLogs.value]
    .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
})

const totalLogs = computed(() => store.tankLogs.value.length)
const totalPages = computed(() => Math.ceil(totalLogs.value / logsPerPage))

const paginatedLogs = computed(() => {
  const start = (currentPage.value - 1) * logsPerPage
  return allLogsSorted.value.slice(start, start + logsPerPage)
})

function goToPage(page) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

// Edit log
const editingLog = ref(null)

function openEditLog(log) {
  editingLog.value = { ...log }
  selectedTank.value = tanks.find(t => t.id === log.tankId) || { id: log.tankId, name: log.tankName, emoji: '🐟' }
  logForm.value = {
    action: log.action,
    percentage: log.percentage || 25,
    note: log.note || '',
    date: log.date
  }
  showLogModal.value = true
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <img src="/images/vio-logo.png" alt="Vionade" class="page-header-logo" />
    </div>

    <h1 class="page-title">Aquarium</h1>
    <p class="page-subtitle">{{ tanks.length }} tanks to care for</p>

    <div class="status-overview">
      <div class="status-pill good" v-if="statusCounts.good">
        <span>✅</span> {{ statusCounts.good }} good
      </div>
      <div class="status-pill warning" v-if="statusCounts.warning">
        <span>⚠️</span> {{ statusCounts.warning }} soon
      </div>
      <div class="status-pill overdue" v-if="statusCounts.overdue">
        <span>🔴</span> {{ statusCounts.overdue }} overdue
      </div>
      <div class="status-pill none" v-if="statusCounts.none">
        <span>❓</span> {{ statusCounts.none }} no data
      </div>
    </div>

    <div class="tank-grid">
      <div
        v-for="tank in tanks"
        :key="tank.id"
        class="tank-card"
        :class="'status-' + getTankStatus(tank.id).status"
      >
        <div class="tank-top">
          <span class="tank-emoji">{{ tank.emoji }}</span>
          <button class="tank-menu" @click="openHistory(tank)">...</button>
        </div>
        <div class="tank-name">{{ tank.name }}</div>
        <div class="tank-water-status">
          <span class="water-icon">💧</span>
          <span class="water-text">{{ getTankStatus(tank.id).text }}</span>
        </div>
        <div class="tank-actions">
          <button class="quick-water-btn" @click="quickWaterChange(tank)">
            💧 Quick 25%
          </button>
          <button class="more-btn" @click="openLogModal(tank)">+</button>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="recent-section">
      <div class="section-banner">
        <div class="section-banner-content">
          <span class="section-banner-icon">📋</span>
          <span class="section-banner-title">Activity Log</span>
        </div>
        <span class="log-count" v-if="totalLogs > 0">{{ totalLogs }} total</span>
      </div>

      <div v-if="paginatedLogs.length === 0" class="empty-state">
        <img src="/images/vio_sit.png" alt="Vio" class="empty-vio" />
        <p>No logs yet. Tap "Quick 25%" or "+" on any tank to start!</p>
      </div>

      <div v-else class="activity-list">
        <div v-for="log in paginatedLogs" :key="log.id" class="activity-item">
          <span class="activity-emoji">{{ tankActions[log.action]?.emoji || '📝' }}</span>
          <div class="activity-info">
            <div class="activity-top">
              <span class="activity-tank">{{ log.tankName }}</span>
              <span class="activity-action">{{ tankActions[log.action]?.label || log.action }}</span>
              <span v-if="log.percentage" class="activity-pct">{{ log.percentage }}%</span>
            </div>
            <div v-if="log.note" class="activity-note">{{ log.note }}</div>
          </div>
          <div class="activity-meta">
            <span class="activity-date">{{ formatDate(log.date) }}</span>
            <div class="activity-actions">
              <button class="action-btn-small" @click="openEditLog(log)">✏️</button>
              <button class="action-btn-small delete" @click="deleteLog(log.id)">🗑️</button>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="pagination">
          <button
            class="page-btn"
            :disabled="currentPage === 1"
            @click="goToPage(currentPage - 1)"
          >←</button>

          <div class="page-numbers">
            <button
              v-for="page in totalPages"
              :key="page"
              class="page-num"
              :class="{ active: page === currentPage }"
              @click="goToPage(page)"
            >{{ page }}</button>
          </div>

          <button
            class="page-btn"
            :disabled="currentPage === totalPages"
            @click="goToPage(currentPage + 1)"
          >→</button>
        </div>
      </div>
    </div>

    <div v-if="showLogModal" class="modal-overlay" @click.self="showLogModal = false; editingLog = null">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-tank-info">
            <span class="modal-tank-emoji">{{ selectedTank?.emoji }}</span>
            <h3>{{ editingLog ? 'Edit Log' : selectedTank?.name }}</h3>
          </div>
          <button class="modal-close" @click="showLogModal = false; editingLog = null">×</button>
        </div>
        <div class="modal-body">
          <div class="action-grid">
            <button
              v-for="(action, key) in tankActions"
              :key="key"
              class="action-btn"
              :class="{ active: logForm.action === key }"
              :style="logForm.action === key ? { background: action.color + '30', borderColor: action.color } : {}"
              @click="logForm.action = key"
            >
              <span class="action-emoji">{{ action.emoji }}</span>
              <span class="action-label">{{ action.label }}</span>
            </button>
          </div>
          <div v-if="logForm.action === 'water_change'" class="percentage-section">
            <label>How much?</label>
            <div class="percentage-btns">
              <button
                v-for="pct in [25, 50, 75, 100]"
                :key="pct"
                class="pct-btn"
                :class="{ active: logForm.percentage === pct }"
                @click="logForm.percentage = pct"
              >{{ pct }}%</button>
            </div>
          </div>
          <div class="form-row">
            <label>Date</label>
            <input v-model="logForm.date" type="date" class="date-input" />
          </div>
          <div class="form-row">
            <label>Note (optional)</label>
            <input v-model="logForm.note" type="text" class="note-input" placeholder="Any observations..." />
          </div>
        </div>
        <div class="modal-footer">
          <button class="submit-btn" @click="submitLog">
            {{ tankActions[logForm.action]?.emoji }} {{ editingLog ? 'Update' : 'Log' }} {{ tankActions[logForm.action]?.label }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showHistoryModal" class="modal-overlay" @click.self="showHistoryModal = false">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-tank-info">
            <span class="modal-tank-emoji">{{ historyTank?.emoji }}</span>
            <h3>{{ historyTank?.name }}</h3>
          </div>
          <button class="modal-close" @click="showHistoryModal = false">×</button>
        </div>
        <div class="modal-body history-body">
          <div v-if="tankHistory.length === 0" class="empty-state">
            <img src="/images/vio_sit.png" alt="Vio" class="empty-vio" />
            <p>No logs yet for this tank</p>
          </div>
          <div v-for="log in tankHistory" :key="log.id" class="history-item">
            <span class="history-emoji">{{ tankActions[log.action]?.emoji || '📝' }}</span>
            <div class="history-info">
              <span class="history-action">{{ tankActions[log.action]?.label || log.action }}</span>
              <span v-if="log.percentage" class="history-pct">{{ log.percentage }}%</span>
              <span v-if="log.note" class="history-note">{{ log.note }}</span>
            </div>
            <span class="history-date">{{ formatDate(log.date) }}</span>
            <button class="delete-btn" @click="deleteLog(log.id)">×</button>
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
  margin: 0 0 var(--space-xs);
}

.page-subtitle {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin: 0 0 var(--space-md);
}

.status-overview {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin-bottom: var(--space-lg);
}

.status-pill {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-pill.good { background: #DCFCE7; color: #166534; }
.status-pill.warning { background: #FEF9C3; color: #854D0E; }
.status-pill.overdue { background: #FEE2E2; color: #991B1B; }
.status-pill.none { background: var(--gray-100); color: var(--text-secondary); }

.tank-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}

.tank-card {
  background: var(--bg-card);
  border: 3px solid var(--lavender-200);
  border-radius: 16px;
  padding: var(--space-md);
  transition: all 0.15s;
}

.tank-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.tank-card.status-good { border-color: #86EFAC; }
.tank-card.status-warning { border-color: #FDE047; }
.tank-card.status-overdue { border-color: #FCA5A5; }
.tank-card.status-none { border-color: var(--gray-200); }

.tank-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-xs);
}

.tank-emoji { font-size: 1.5rem; }

.tank-menu {
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  opacity: 0.5;
  padding: 4px;
}

.tank-menu:hover { opacity: 1; }

.tank-name {
  font-weight: 700;
  font-size: 0.875rem;
  margin-bottom: var(--space-sm);
  line-height: 1.2;
}

.tank-water-status {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  margin-bottom: var(--space-md);
  font-size: 0.8rem;
}

.water-icon { font-size: 0.9rem; }

.water-text {
  color: var(--text-secondary);
  font-weight: 500;
}

.status-good .water-text { color: #16A34A; }
.status-warning .water-text { color: #CA8A04; }
.status-overdue .water-text { color: #DC2626; }

.tank-actions {
  display: flex;
  gap: var(--space-xs);
}

.quick-water-btn {
  flex: 1;
  padding: 8px 12px;
  background: #7AD7F0;
  border: 2px solid #5BC4E0;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 700;
  color: #0C4A6E;
  cursor: pointer;
  transition: all 0.1s;
}

.quick-water-btn:hover { background: #5BC4E0; }
.quick-water-btn:active { transform: scale(0.98); }

.more-btn {
  width: 36px;
  height: 36px;
  background: var(--lavender-100);
  border: 2px solid var(--lavender-300);
  border-radius: 10px;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--lavender-600);
  cursor: pointer;
}

.more-btn:hover { background: var(--lavender-200); }

/* Recent Activity Section */
.recent-section {
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

.log-count {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(0, 0, 0, 0.15);
  padding: 4px 10px;
  border-radius: 12px;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.activity-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: 12px;
}

.activity-emoji {
  font-size: 1.25rem;
}

.activity-info {
  flex: 1;
  min-width: 0;
}

.activity-top {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: baseline;
}

.activity-tank {
  font-weight: 700;
  font-size: 0.875rem;
}

.activity-action {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.activity-pct {
  font-size: 0.75rem;
  color: #0EA5E9;
  font-weight: 600;
}

.activity-note {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-style: italic;
  margin-top: 2px;
}

.activity-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.activity-date {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.delete-btn-visible {
  background: none;
  border: none;
  font-size: 0.875rem;
  cursor: pointer;
  padding: 2px;
  opacity: 0.5;
  transition: opacity 0.15s;
}

.delete-btn-visible:hover {
  opacity: 1;
}

.activity-actions {
  display: flex;
  gap: 4px;
}

.action-btn-small {
  background: none;
  border: none;
  font-size: 0.875rem;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  opacity: 0.6;
  transition: all 0.15s;
}

.action-btn-small:hover {
  opacity: 1;
  background: var(--gray-100);
}

.action-btn-small.delete:hover {
  background: #FEE2E2;
}

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  margin-top: var(--space-lg);
  padding: var(--space-md) 0;
}

.page-btn {
  width: 36px;
  height: 36px;
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}

.page-btn:hover:not(:disabled) {
  border-color: var(--lavender-400);
  background: var(--lavender-50);
}

.page-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.page-numbers {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 200px;
}

.page-num {
  min-width: 32px;
  height: 32px;
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.15s;
}

.page-num:hover {
  border-color: var(--lavender-400);
}

.page-num.active {
  background: var(--lavender-500);
  border-color: var(--lavender-600);
  color: white;
}

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
  background: var(--bg-card);
  border-radius: 24px 24px 0 0;
  width: 100%;
  max-width: 480px;
  max-height: 85vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md) var(--space-lg);
  border-bottom: 2px solid var(--border-color);
}

.modal-tank-info {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.modal-tank-emoji { font-size: 1.5rem; }

.modal-header h3 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.125rem;
}

.modal-close {
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
}

.modal-body { padding: var(--space-lg); }

.history-body {
  max-height: 400px;
  overflow-y: auto;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-sm);
  margin-bottom: var(--space-lg);
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--space-md) var(--space-sm);
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.action-btn:hover { border-color: var(--lavender-400); }
.action-btn.active { border-width: 3px; }

.action-emoji { font-size: 1.5rem; }

.action-label {
  font-size: 0.65rem;
  font-weight: 600;
  text-align: center;
}

.percentage-section { margin-bottom: var(--space-lg); }

.percentage-section label {
  display: block;
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: var(--space-sm);
}

.percentage-btns {
  display: flex;
  gap: var(--space-sm);
}

.pct-btn {
  flex: 1;
  padding: var(--space-sm);
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
}

.pct-btn.active {
  background: #7AD7F0;
  border-color: #5BC4E0;
  color: #0C4A6E;
}

.form-row { margin-bottom: var(--space-md); }

.form-row label {
  display: block;
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: var(--space-xs);
}

.date-input,
.note-input {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  border: 2px solid var(--border-color);
  border-radius: 10px;
  font-size: 1rem;
}

.modal-footer {
  padding: var(--space-md) var(--space-lg);
  border-top: 2px solid var(--border-color);
}

.submit-btn {
  width: 100%;
  padding: var(--space-md);
  background: var(--lavender-500);
  border: 3px solid var(--lavender-600);
  border-radius: 12px;
  font-weight: 700;
  color: white;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.15s;
}

.submit-btn:hover { background: var(--lavender-600); }

.empty-state {
  text-align: center;
  padding: var(--space-xl);
}

.empty-vio {
  width: 60px;
  margin-bottom: var(--space-md);
  opacity: 0.7;
}

.empty-state p {
  color: var(--text-secondary);
  margin: 0;
}

.history-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--border-color);
}

.history-item:last-child { border-bottom: none; }

.history-emoji { font-size: 1.25rem; }

.history-info {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: baseline;
}

.history-action {
  font-weight: 600;
  font-size: 0.875rem;
}

.history-pct {
  font-size: 0.75rem;
  color: #0EA5E9;
  font-weight: 600;
}

.history-note {
  width: 100%;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.history-date {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.delete-btn {
  width: 24px;
  height: 24px;
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  opacity: 0;
  color: var(--text-secondary);
}

.history-item:hover .delete-btn { opacity: 1; }
.delete-btn:hover { color: #EF4444; }
</style>

<style>
[data-theme="dark"] .tank-card {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .tank-card.status-good { border-color: #22C55E !important; }
[data-theme="dark"] .tank-card.status-warning { border-color: #EAB308 !important; }
[data-theme="dark"] .tank-card.status-overdue { border-color: #EF4444 !important; }

[data-theme="dark"] .status-pill.good { background: #14532D; color: #86EFAC; }
[data-theme="dark"] .status-pill.warning { background: #422006; color: #FDE047; }
[data-theme="dark"] .status-pill.overdue { background: #450A0A; color: #FCA5A5; }
[data-theme="dark"] .status-pill.none { background: #2D2640; }

[data-theme="dark"] .quick-water-btn {
  background: #8B5CF6 !important;
  border-color: #7C3AED !important;
  color: white !important;
}

[data-theme="dark"] .quick-water-btn:hover { background: #7C3AED !important; }

[data-theme="dark"] .more-btn {
  background: #2D2640 !important;
  border-color: #3D3456 !important;
  color: #A78BFA !important;
}

[data-theme="dark"] .modal { background: #1A1625 !important; }

[data-theme="dark"] .action-btn {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .pct-btn {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .pct-btn.active {
  background: #8B5CF6 !important;
  border-color: #7C3AED !important;
  color: white !important;
}

[data-theme="dark"] .date-input,
[data-theme="dark"] .note-input {
  background: #0F0D1A !important;
  border-color: #3D3456 !important;
  color: var(--text-primary) !important;
}

[data-theme="dark"] .submit-btn {
  background: #8B5CF6 !important;
  border-color: #7C3AED !important;
}

[data-theme="dark"] .section-banner {
  background: linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%) !important;
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3) !important;
}

[data-theme="dark"] .activity-item {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .action-btn-small:hover {
  background: #2D2640 !important;
}

[data-theme="dark"] .action-btn-small.delete:hover {
  background: #450A0A !important;
}

[data-theme="dark"] .page-btn,
[data-theme="dark"] .page-num {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .page-btn:hover:not(:disabled),
[data-theme="dark"] .page-num:hover {
  border-color: #8B5CF6 !important;
  background: #2D2640 !important;
}

[data-theme="dark"] .page-num.active {
  background: #8B5CF6 !important;
  border-color: #7C3AED !important;
}
</style>
