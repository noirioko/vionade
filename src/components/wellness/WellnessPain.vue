<script setup>
import { ref, computed } from 'vue'
import { useFinanceStore } from '../../stores'
import PieChart from '../PieChart.vue'

const store = useFinanceStore()

// Modal state
const showAddModal = ref(false)
const editingLog = ref(null)
const editingDayLogs = ref(null) // For editing a whole day's logs

// Helper to get local date string (YYYY-MM-DD)
function getLocalDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const form = ref({
  types: ['headache'],
  intensity: 1,
  note: '',
  date: getLocalDateString(),
})

// Month picker for overview
const viewDate = ref(new Date())

const viewMonth = computed(() => {
  return viewDate.value.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
})

function prevMonth() {
  const newDate = new Date(viewDate.value)
  newDate.setMonth(newDate.getMonth() - 1)
  viewDate.value = newDate
}

function nextMonth() {
  const newDate = new Date(viewDate.value)
  newDate.setMonth(newDate.getMonth() + 1)
  if (newDate <= new Date()) {
    viewDate.value = newDate
  }
}

const isCurrentMonth = computed(() => {
  const now = new Date()
  return viewDate.value.getMonth() === now.getMonth() &&
         viewDate.value.getFullYear() === now.getFullYear()
})

// Get logs for current view month
const monthLogs = computed(() => {
  return store.getPainLogsForMonth(
    viewDate.value.getFullYear(),
    viewDate.value.getMonth()
  )
})

// Mini calendar data (just dots)
const calendarDays = computed(() => {
  const year = viewDate.value.getFullYear()
  const month = viewDate.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startDayOfWeek = firstDay.getDay()

  const days = []

  for (let i = 0; i < startDayOfWeek; i++) {
    days.push({ day: null, logs: [] })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    const dayLogs = monthLogs.value.filter(l => {
      return new Date(l.date).getDate() === day
    })
    days.push({
      day,
      date,
      logs: dayLogs,
      isToday: date.toDateString() === new Date().toDateString(),
    })
  }

  return days
})

// Stats for the month
const monthStats = computed(() => {
  const logs = monthLogs.value
  const daysWithPain = new Set(logs.map(l => new Date(l.date).getDate())).size
  const totalLogs = logs.length

  // Count by type
  const byType = {}
  store.PAIN_TYPES.forEach(t => {
    byType[t.id] = logs.filter(l => l.type === t.id).length
  })

  // Most common pain
  const mostCommon = Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .filter(([, count]) => count > 0)[0]

  // Calculate chart data for pie
  const chartData = Object.entries(byType)
    .filter(([, count]) => count > 0)
    .map(([typeId, count]) => {
      const type = store.getPainTypeById(typeId)
      return {
        id: typeId,
        label: type?.label || typeId,
        icon: type?.icon || '?',
        color: type?.color || '#999',
        count,
        percentage: totalLogs > 0 ? Math.round((count / totalLogs) * 100) : 0
      }
    })
    .sort((a, b) => b.count - a.count)

  // Format data for PieChart component: [{ name, value, color, icon }]
  const pieChartData = chartData.map(item => ({
    name: item.label,
    value: item.count,
    color: item.color,
    icon: item.icon,
  }))

  return {
    daysWithPain,
    totalLogs,
    byType,
    chartData,
    pieChartData,
    mostCommon: mostCommon ? store.getPainTypeById(mostCommon[0]) : null,
    mostCommonCount: mostCommon ? mostCommon[1] : 0,
  }
})

// Group logs by date for display (consolidated cards)
const logsByDate = computed(() => {
  const allLogs = [...store.painLogs.value]
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  const grouped = {}
  allLogs.forEach(log => {
    const dateKey = new Date(log.date).toDateString()
    if (!grouped[dateKey]) {
      grouped[dateKey] = {
        date: log.date,
        logs: []
      }
    }
    grouped[dateKey].logs.push(log)
  })

  // Return last 10 days with logs
  return Object.values(grouped).slice(0, 10)
})

// Toggle type selection
function toggleType(typeId) {
  const idx = form.value.types.indexOf(typeId)
  if (idx === -1) {
    form.value.types.push(typeId)
  } else if (form.value.types.length > 1) {
    form.value.types.splice(idx, 1)
  }
}

function isTypeSelected(typeId) {
  return form.value.types.includes(typeId)
}

// Functions
function openAddModal() {
  editingLog.value = null
  editingDayLogs.value = null
  form.value = {
    types: ['headache'],
    intensity: 1,
    note: '',
    date: getLocalDateString(),
  }
  showAddModal.value = true
}

function openEditDayLogs(dayGroup) {
  editingDayLogs.value = dayGroup
  // Pre-select all types from that day
  const types = [...new Set(dayGroup.logs.map(l => l.type))]
  const firstLog = dayGroup.logs[0]
  form.value = {
    types,
    intensity: firstLog.intensity,
    note: firstLog.note || '',
    date: getLocalDateString(new Date(firstLog.date)),
  }
  showAddModal.value = true
}

function saveLog() {
  // Parse the form date and set to noon local time to avoid timezone issues
  const [year, month, day] = form.value.date.split('-').map(Number)
  const localDate = new Date(year, month - 1, day, 12, 0, 0)

  const baseData = {
    intensity: form.value.intensity,
    note: form.value.note.trim(),
    date: localDate.toISOString(),
  }

  if (editingDayLogs.value) {
    // Delete all logs for that day, then create new ones
    editingDayLogs.value.logs.forEach(log => {
      store.deletePainLog(log.id)
    })
    // Create new logs for selected types
    form.value.types.forEach(type => {
      store.addPainLog({
        ...baseData,
        type,
      })
    })
    editingDayLogs.value = null
  } else {
    // Create new logs
    form.value.types.forEach(type => {
      store.addPainLog({
        ...baseData,
        type,
      })
    })
  }

  showAddModal.value = false
}

function deleteDayLogs() {
  if (editingDayLogs.value && confirm('Delete all pain logs for this day?')) {
    editingDayLogs.value.logs.forEach(log => {
      store.deletePainLog(log.id)
    })
    showAddModal.value = false
    editingDayLogs.value = null
  }
}

function formatDate(dateString) {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  }
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

// Quick add with a specific type
function quickAdd(typeId) {
  form.value.types = [typeId]
  openAddModal()
}

// Expose for FAB
defineExpose({ openAddModal })
</script>

<template>
  <div class="pain-tracker">
    <!-- Month Navigation + Stats -->
    <div class="month-header">
      <button class="month-nav-btn" @click="prevMonth">‹</button>
      <span class="month-title">{{ viewMonth }}</span>
      <button
        class="month-nav-btn"
        :class="{ disabled: isCurrentMonth }"
        :disabled="isCurrentMonth"
        @click="nextMonth"
      >›</button>
      <div class="month-stats">
        <span class="stat-badge">{{ monthStats.daysWithPain }} days</span>
        <span class="stat-badge">{{ monthStats.totalLogs }} logs</span>
      </div>
    </div>

    <!-- Pie Chart Section -->
    <div class="chart-section">
      <PieChart
        v-if="monthStats.pieChartData.length > 0"
        :data="monthStats.pieChartData"
        :size="160"
      />
      <div v-else class="chart-empty">
        <span class="chart-empty-icon">📊</span>
        <span class="chart-empty-text">No pain data this month</span>
      </div>
    </div>

    <!-- Quick Add Section -->
    <div class="section">
      <div class="section-header">
        <h3 class="section-title">Quick Log</h3>
      </div>
      <div class="quick-add-grid">
        <button
          v-for="type in store.PAIN_TYPES"
          :key="type.id"
          class="quick-add-btn"
          @click="quickAdd(type.id)"
        >
          <span class="quick-add-icon">{{ type.icon }}</span>
          <span class="quick-add-label">{{ type.label }}</span>
        </button>
      </div>
    </div>

    <!-- Recent Logs (Grouped by Date) -->
    <div class="section">
      <div class="section-header">
        <h3 class="section-title">Recent Days</h3>
      </div>

      <div v-if="logsByDate.length === 0" class="empty-state">
        <img src="/images/vio_sit.png" alt="" class="empty-vio" />
        <div class="empty-title">No pain logs yet</div>
        <div class="empty-text">Tap a pain type above to log</div>
      </div>

      <div v-else class="logs-list">
        <div
          v-for="dayGroup in logsByDate"
          :key="dayGroup.date"
          class="day-card"
          @click="openEditDayLogs(dayGroup)"
        >
          <div class="day-header">
            <span class="day-date">{{ formatDate(dayGroup.date) }}</span>
            <div class="day-intensity">
              <span
                v-for="i in 3"
                :key="i"
                class="intensity-dot"
                :class="{ active: i <= dayGroup.logs[0]?.intensity }"
              ></span>
            </div>
          </div>
          <div class="day-types">
            <span
              v-for="log in dayGroup.logs"
              :key="log.id"
              class="day-type-chip"
              :style="{ background: store.getPainTypeById(log.type)?.color + '20' }"
            >
              {{ store.getPainTypeById(log.type)?.icon }}
              {{ store.getPainTypeById(log.type)?.label }}
            </span>
          </div>
          <div v-if="dayGroup.logs[0]?.note" class="day-note">
            {{ dayGroup.logs[0].note }}
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">{{ editingDayLogs ? 'Edit' : 'Log' }} Pain</h3>
          <button class="modal-close" @click="showAddModal = false">×</button>
        </div>

        <div class="input-group">
          <label class="input-label">What hurts? <span class="hint">(select multiple)</span></label>
          <div class="type-grid">
            <button
              v-for="type in store.PAIN_TYPES"
              :key="type.id"
              class="type-btn"
              :class="{ active: isTypeSelected(type.id) }"
              @click="toggleType(type.id)"
            >
              <span class="type-icon">{{ type.icon }}</span>
              <span class="type-label">{{ type.label }}</span>
            </button>
          </div>
        </div>

        <div class="input-group">
          <label class="input-label">Intensity</label>
          <div class="intensity-selector">
            <button
              v-for="level in store.PAIN_LEVELS"
              :key="level.value"
              class="intensity-btn"
              :class="{ active: form.intensity === level.value }"
              :style="{ '--level-color': level.color }"
              @click="form.intensity = level.value"
            >
              {{ level.label }}
            </button>
          </div>
        </div>

        <div class="input-group">
          <label class="input-label">Date</label>
          <input
            v-model="form.date"
            type="date"
            class="input"
          />
        </div>

        <div class="input-group">
          <label class="input-label">Note (optional)</label>
          <textarea
            v-model="form.note"
            class="input textarea"
            placeholder="What triggered it? Any other details..."
            rows="2"
          ></textarea>
        </div>

        <div class="modal-actions">
          <button v-if="editingDayLogs" class="btn btn-ghost" @click="deleteDayLogs">
            Delete
          </button>
          <button class="btn btn-primary" @click="saveLog">
            {{ editingDayLogs ? 'Save' : `Log ${form.types.length > 1 ? form.types.length + ' pains' : 'Pain'}` }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pain-tracker {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

/* Month Header */
.month-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--white);
  border: 2px solid #F9A8D4;
  border-radius: var(--radius-md);
}

.month-nav-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: #FCE7F3;
  border-radius: var(--radius-full);
  color: #BE185D;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 700;
}

.month-nav-btn:hover:not(.disabled) {
  background: #FBCFE8;
}

.month-nav-btn.disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.month-title {
  font-family: var(--font-display);
  font-weight: 700;
  color: #BE185D;
  font-size: 1rem;
}

.month-stats {
  margin-left: auto;
  display: flex;
  gap: var(--space-xs);
}

.stat-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  color: #9D174D;
  background: #FCE7F3;
  padding: 4px 8px;
  border-radius: var(--radius-full);
}

/* Chart Section */
.chart-section {
  background: var(--white);
  border: 2px solid #F9A8D4;
  border-radius: var(--radius-lg);
  padding: var(--space-md);
}

.chart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-lg);
  color: var(--gray-400);
}

.chart-empty-icon {
  font-size: 2rem;
  opacity: 0.5;
}

.chart-empty-text {
  font-size: 0.875rem;
}

/* Quick Add */
.quick-add-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-sm);
}

.quick-add-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--space-sm);
  background: var(--bg-card);
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
}

.quick-add-btn:hover {
  border-color: var(--lavender-300);
  transform: translateY(-2px);
}

.quick-add-icon {
  font-size: 1.5rem;
}

.quick-add-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-secondary);
}

/* Logs List (Day Cards) */
.logs-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.day-card {
  padding: var(--space-md);
  background: var(--bg-card);
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
}

.day-card:hover {
  border-color: var(--lavender-300);
}

.day-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-xs);
}

.day-date {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.875rem;
}

.day-intensity {
  display: flex;
  gap: 4px;
}

.intensity-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--gray-200);
}

.intensity-dot.active {
  background: #EC4899;
}

.day-types {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: var(--space-xs);
}

.day-type-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-primary);
}

.day-note {
  font-size: 0.75rem;
  color: var(--text-secondary);
  padding-top: var(--space-xs);
  border-top: 1px dashed var(--gray-200);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: var(--space-xl);
}

.empty-vio {
  width: 80px;
  height: auto;
  margin-bottom: var(--space-md);
  opacity: 0.7;
}

.empty-title {
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--space-xs);
}

.empty-text {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* Modal */
.hint {
  font-weight: 400;
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-sm);
}

.type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--space-sm);
  background: var(--bg-card);
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
}

.type-btn:hover {
  border-color: var(--lavender-300);
}

.type-btn.active {
  border-color: #EC4899;
  background: #FDF2F8;
}

.type-icon {
  font-size: 1.25rem;
}

.type-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.intensity-selector {
  display: flex;
  gap: var(--space-sm);
}

.intensity-btn {
  flex: 1;
  padding: var(--space-sm) var(--space-md);
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-md);
  background: var(--bg-card);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.intensity-btn:hover {
  border-color: var(--lavender-300);
}

.intensity-btn.active {
  border-color: #EC4899;
  background: var(--level-color);
}

.textarea {
  resize: vertical;
  min-height: 60px;
}

.modal-actions {
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-md);
}

.modal-actions .btn-primary {
  flex: 1;
}

@media (max-width: 480px) {
  .quick-add-grid,
  .type-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>

<style>
/* Dark mode */
[data-theme="dark"] .month-header,
[data-theme="dark"] .chart-section {
  background: #1A1625 !important;
  border-color: #6D28D9 !important;
}

[data-theme="dark"] .month-nav-btn {
  background: #2D2640 !important;
  color: #C4B5FD !important;
}

[data-theme="dark"] .month-title {
  color: #C4B5FD !important;
}

[data-theme="dark"] .stat-badge {
  background: #2D2640 !important;
  color: #C4B5FD !important;
}

[data-theme="dark"] .quick-add-btn {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .day-card {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .day-note {
  border-color: #3D3456 !important;
}

[data-theme="dark"] .type-btn {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .type-btn.active {
  background: rgba(236, 72, 153, 0.2) !important;
  border-color: #EC4899 !important;
}

[data-theme="dark"] .intensity-btn {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}
</style>
