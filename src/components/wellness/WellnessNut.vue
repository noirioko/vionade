<script setup>
import { ref, computed } from 'vue'
import { useFinanceStore } from '../../stores'

const store = useFinanceStore()

// Modal state
const showModal = ref(false)
const form = ref({
  trigger: '',
  hornyLevel: 5,
  rating: 5,
  rant: '',
  regret: false,
})

function openAddModal() {
  form.value = {
    trigger: '',
    hornyLevel: 5,
    rating: 5,
    rant: '',
    regret: false,
  }
  showModal.value = true
}

function saveLog() {
  store.addNutLog({
    trigger: form.value.trigger,
    hornyLevel: form.value.hornyLevel,
    rating: form.value.rating,
    rant: form.value.rant,
    regret: form.value.regret,
  })
  showModal.value = false
}

// Month picker for overview
const viewDate = ref(new Date())

const viewMonth = computed(() => {
  return viewDate.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
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
  return store.getNutLogsForMonth(
    viewDate.value.getFullYear(),
    viewDate.value.getMonth()
  )
})

// Calendar data
const calendarDays = computed(() => {
  const year = viewDate.value.getFullYear()
  const month = viewDate.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startDayOfWeek = firstDay.getDay()

  const days = []

  for (let i = 0; i < startDayOfWeek; i++) {
    days.push({ day: null, count: 0 })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    const dayLogs = monthLogs.value.filter(l => {
      return new Date(l.date).getDate() === day
    })
    days.push({
      day,
      date,
      count: dayLogs.length,
      isToday: date.toDateString() === new Date().toDateString(),
    })
  }

  return days
})

// Stats
const monthCount = computed(() => monthLogs.value.length)
const totalCount = computed(() => store.nutLogs.value.length)
const avgRating = computed(() => {
  const logs = store.nutLogs.value.filter(l => l.rating)
  if (logs.length === 0) return 0
  return (logs.reduce((sum, l) => sum + l.rating, 0) / logs.length).toFixed(1)
})
const regretCount = computed(() => {
  return store.nutLogs.value.filter(l => l.regret).length
})

// Recent logs
const recentLogs = computed(() => {
  return [...store.nutLogs.value]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5)
})

function deleteLog(log) {
  if (confirm('Delete this log?')) {
    store.deleteNutLog(log.id)
  }
}

function getTriggerIcon(triggerId) {
  const trigger = store.NUT_TRIGGERS.find(t => t.id === triggerId)
  return trigger?.icon || '🥜'
}

function getTriggerLabel(triggerId) {
  const trigger = store.NUT_TRIGGERS.find(t => t.id === triggerId)
  return trigger?.label || ''
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
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatTime(dateString) {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

// Expose for FAB
defineExpose({ openAddModal })
</script>

<template>
  <div class="nut-tracker">
    <!-- Big Add Button -->
    <button class="big-add-btn" @click="openAddModal">
      <span class="big-add-icon">🥜</span>
      <span class="big-add-text">Log Nut</span>
    </button>

    <!-- Compact Calendar -->
    <div class="calendar-book">
      <div class="calendar-nav">
        <button class="cal-nav-btn" @click="prevMonth">←</button>
        <div class="cal-month">{{ viewMonth }}</div>
        <button
          class="cal-nav-btn"
          :class="{ disabled: isCurrentMonth }"
          :disabled="isCurrentMonth"
          @click="nextMonth"
        >→</button>
      </div>
      <div class="calendar-weekdays">
        <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
      </div>
      <div class="calendar-grid">
        <div
          v-for="(cell, idx) in calendarDays"
          :key="idx"
          class="cal-day"
          :class="{
            empty: !cell.day,
            today: cell.isToday,
            'has-nut': cell.count > 0,
            'nut-1': cell.count === 1,
            'nut-2': cell.count === 2,
            'nut-3': cell.count >= 3,
          }"
        >
          <span v-if="cell.day">{{ cell.day }}</span>
          <span v-if="cell.count > 0" class="cal-dot">{{ cell.count }}</span>
        </div>
      </div>

      <!-- Stats -->
      <div class="calendar-stats">
        <div class="cal-stat">
          <span class="cal-stat-value">{{ monthCount }}</span>
          <span class="cal-stat-label">this month</span>
        </div>
        <div class="cal-stat">
          <span class="cal-stat-value">{{ avgRating }}</span>
          <span class="cal-stat-label">avg rating</span>
        </div>
        <div class="cal-stat">
          <span class="cal-stat-value">{{ regretCount }}</span>
          <span class="cal-stat-label">regrets</span>
        </div>
      </div>
    </div>

    <!-- Recent Logs -->
    <div class="section">
      <div class="section-header">
        <h3 class="section-title">Recent</h3>
      </div>

      <div v-if="recentLogs.length === 0" class="empty-state">
        <div class="empty-icon">🥜</div>
        <div class="empty-title">No logs yet</div>
        <div class="empty-text">Tap the button above to log</div>
      </div>

      <div v-else class="logs-list">
        <div
          v-for="log in recentLogs"
          :key="log.id"
          class="log-item"
          @click="deleteLog(log)"
        >
          <div class="log-icon">{{ getTriggerIcon(log.trigger) }}</div>
          <div class="log-content">
            <div class="log-title">
              {{ formatDate(log.date) }}
              <span v-if="log.regret" class="regret-badge">😬</span>
            </div>
            <div class="log-meta">
              {{ formatTime(log.date) }}
              <span v-if="log.rating">· {{ log.rating }}/10</span>
              <span v-if="log.trigger">· {{ getTriggerLabel(log.trigger) }}</span>
            </div>
            <div v-if="log.rant" class="log-rant">{{ log.rant }}</div>
          </div>
          <div class="log-delete">×</div>
        </div>
      </div>
    </div>

    <!-- Add Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2>🥜 Log the Deed</h2>
          <button class="close-btn" @click="showModal = false">×</button>
        </div>

        <div class="modal-body">
          <!-- Trigger -->
          <div class="form-group">
            <label>What triggered it?</label>
            <div class="trigger-grid">
              <button
                v-for="trigger in store.NUT_TRIGGERS"
                :key="trigger.id"
                class="trigger-btn"
                :class="{ selected: form.trigger === trigger.id }"
                @click="form.trigger = trigger.id"
              >
                <span class="trigger-icon">{{ trigger.icon }}</span>
                <span class="trigger-label">{{ trigger.label }}</span>
              </button>
            </div>
          </div>

          <!-- Horny Level -->
          <div class="form-group">
            <label>How horny were you? <span class="range-value">{{ form.hornyLevel }}/10</span></label>
            <input
              type="range"
              v-model.number="form.hornyLevel"
              min="1"
              max="10"
              class="range-slider horny-slider"
            />
            <div class="range-labels">
              <span>Meh</span>
              <span>🔥🔥🔥</span>
            </div>
          </div>

          <!-- Rating -->
          <div class="form-group">
            <label>How was it? <span class="range-value">{{ form.rating }}/10</span></label>
            <input
              type="range"
              v-model.number="form.rating"
              min="1"
              max="10"
              class="range-slider rating-slider"
            />
            <div class="range-labels">
              <span>Terrible</span>
              <span>Amazing</span>
            </div>
          </div>

          <!-- Regret Toggle -->
          <div class="form-group">
            <div class="regret-toggle">
              <span class="regret-label">Do you regret it?</span>
              <button
                class="toggle-btn"
                :class="{ active: form.regret }"
                @click="form.regret = !form.regret"
              >
                <span class="toggle-text">{{ form.regret ? '😬 Yeah...' : '😎 Nope!' }}</span>
              </button>
            </div>
          </div>

          <!-- Rant -->
          <div class="form-group">
            <label>Rant Corner (optional)</label>
            <textarea
              v-model="form.rant"
              placeholder="Let it out... how was the experience? any thoughts?"
              rows="3"
              class="rant-input"
            ></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button class="save-btn" @click="saveLog">
            <span>💦</span> Log It
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nut-tracker {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

/* Big Add Button */
.big-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: linear-gradient(135deg, #D4A574 0%, #C4956A 100%);
  border: 3px solid #A67C52;
  border-radius: var(--radius-xl);
  box-shadow: 4px 4px 0 #8B6642;
  cursor: pointer;
  transition: all 0.15s;
}

.big-add-btn:hover {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 #8B6642;
}

.big-add-btn:active {
  transform: translate(4px, 4px);
  box-shadow: none;
}

.big-add-icon {
  font-size: 2.5rem;
}

.big-add-text {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* Compact Calendar */
.calendar-book {
  background: var(--white);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  border: 2px solid #D4A574;
}

.calendar-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-sm);
}

.cal-nav-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: #FDF4E7;
  border-radius: var(--radius-full);
  color: #8B6642;
  cursor: pointer;
  font-size: 0.875rem;
}

.cal-nav-btn:hover:not(.disabled) {
  background: #F5E6D3;
}

.cal-nav-btn.disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.cal-month {
  font-family: var(--font-display);
  font-weight: 700;
  color: #8B6642;
  font-size: 0.9rem;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-size: 0.625rem;
  color: var(--gray-400);
  margin-bottom: var(--space-xs);
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.cal-day {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  position: relative;
  color: var(--gray-600);
}

.cal-day.empty { cursor: default; }
.cal-day.today { background: #FDF4E7; font-weight: 700; color: #8B6642; }
.cal-day.has-nut { background: #F5E6D3; }
.cal-day.nut-2 { background: #E8D4BC; }
.cal-day.nut-3 { background: #D4A574; color: white; }

.cal-day .cal-dot {
  font-size: 0.5rem;
  font-weight: 700;
  color: #8B6642;
  position: absolute;
  bottom: 1px;
}

.cal-day.nut-3 .cal-dot { color: white; }

/* Calendar Stats */
.calendar-stats {
  display: flex;
  justify-content: center;
  gap: var(--space-md);
  margin-top: var(--space-sm);
  padding-top: var(--space-sm);
  border-top: 1px solid #D4A574;
}

.cal-stat {
  text-align: center;
}

.cal-stat-value {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1rem;
  color: #8B6642;
  display: block;
}

.cal-stat-label {
  font-size: 0.625rem;
  color: #A67C52;
}

/* Logs List */
.logs-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.log-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--white);
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
}

.log-item:hover {
  border-color: #EF4444;
  background: #FEF2F2;
}

.log-icon {
  font-size: 1.25rem;
  margin-top: 2px;
}

.log-content {
  flex: 1;
  min-width: 0;
}

.log-title {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.regret-badge {
  font-size: 0.75rem;
}

.log-meta {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.log-rant {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  font-style: italic;
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.log-delete {
  font-size: 1.25rem;
  color: var(--gray-400);
  opacity: 0;
  transition: opacity 0.2s;
}

.log-item:hover .log-delete {
  opacity: 1;
  color: #EF4444;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: var(--space-lg);
}

.empty-icon {
  font-size: 2rem;
  margin-bottom: var(--space-sm);
  opacity: 0.5;
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
  background: var(--white);
  border-radius: 24px 24px 0 0;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md) var(--space-lg);
  border-bottom: 1px solid var(--lavender-100);
}

.modal-header h2 {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-secondary);
  cursor: pointer;
}

.modal-body {
  padding: var(--space-lg);
}

.modal-footer {
  padding: var(--space-md) var(--space-lg);
  border-top: 1px solid var(--lavender-100);
}

/* Form Elements */
.form-group {
  margin-bottom: var(--space-lg);
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: var(--space-sm);
  color: var(--text-primary);
}

.range-value {
  font-weight: 700;
  color: #D4A574;
}

/* Trigger Grid */
.trigger-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-xs);
}

.trigger-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--space-sm);
  background: var(--lavender-50);
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
}

.trigger-btn:hover {
  border-color: var(--lavender-300);
}

.trigger-btn.selected {
  background: #D4A574;
  border-color: #A67C52;
  color: white;
}

.trigger-icon {
  font-size: 1.25rem;
}

.trigger-label {
  font-size: 0.625rem;
  font-weight: 600;
  text-align: center;
}

/* Range Sliders */
.range-slider {
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: var(--lavender-100);
  appearance: none;
  outline: none;
}

.range-slider::-webkit-slider-thumb {
  appearance: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #D4A574;
  border: 3px solid #A67C52;
  cursor: pointer;
  box-shadow: 2px 2px 0 #8B6642;
}

.range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.6875rem;
  color: var(--text-tertiary);
  margin-top: 4px;
}

/* Regret Toggle */
.regret-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md);
  background: var(--lavender-50);
  border-radius: var(--radius-md);
}

.regret-label {
  font-weight: 600;
  color: var(--text-primary);
}

.toggle-btn {
  padding: var(--space-sm) var(--space-md);
  border: 2px solid var(--lavender-200);
  border-radius: var(--radius-full);
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-btn.active {
  background: #FEE2E2;
  border-color: #EF4444;
  color: #DC2626;
}

.toggle-text {
  font-size: 0.875rem;
  font-weight: 600;
}

/* Rant Input */
.rant-input {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  resize: none;
  font-family: inherit;
}

.rant-input:focus {
  outline: none;
  border-color: #D4A574;
}

/* Save Button */
.save-btn {
  width: 100%;
  padding: var(--space-md);
  background: linear-gradient(135deg, #D4A574 0%, #C4956A 100%);
  border: 3px solid #A67C52;
  border-radius: var(--radius-lg);
  box-shadow: 4px 4px 0 #8B6642;
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  color: white;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
}

.save-btn:hover {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 #8B6642;
}
</style>

<style>
/* Dark mode */
[data-theme="dark"] .big-add-btn {
  background: linear-gradient(135deg, #8B6642 0%, #6B5232 100%) !important;
  border-color: #5B4428 !important;
  box-shadow: 4px 4px 0 #3D2D1A !important;
}

[data-theme="dark"] .nut-tracker .calendar-book {
  background: #1A1625 !important;
  border-color: #8B6642 !important;
}

[data-theme="dark"] .nut-tracker .cal-nav-btn {
  background: #2D2640 !important;
  color: #D4A574 !important;
}

[data-theme="dark"] .nut-tracker .cal-month {
  color: #D4A574 !important;
}

[data-theme="dark"] .nut-tracker .cal-day.today {
  background: #2D2640 !important;
  color: #D4A574 !important;
}

[data-theme="dark"] .nut-tracker .cal-day.has-nut {
  background: rgba(212, 165, 116, 0.2) !important;
}

[data-theme="dark"] .nut-tracker .cal-day.nut-2 {
  background: rgba(212, 165, 116, 0.4) !important;
}

[data-theme="dark"] .nut-tracker .cal-day.nut-3 {
  background: rgba(212, 165, 116, 0.7) !important;
}

[data-theme="dark"] .nut-tracker .calendar-stats {
  border-color: #3D3456 !important;
}

[data-theme="dark"] .nut-tracker .cal-stat-value {
  color: #D4A574 !important;
}

[data-theme="dark"] .nut-tracker .cal-stat-label {
  color: #9D8BC2 !important;
}

[data-theme="dark"] .nut-tracker .log-item {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .nut-tracker .log-item:hover {
  background: rgba(239, 68, 68, 0.1) !important;
  border-color: #EF4444 !important;
}

[data-theme="dark"] .nut-tracker .modal {
  background: #1A1625 !important;
}

[data-theme="dark"] .nut-tracker .modal-header {
  border-color: #3D3456 !important;
}

[data-theme="dark"] .nut-tracker .modal-footer {
  border-color: #3D3456 !important;
}

[data-theme="dark"] .nut-tracker .trigger-btn {
  background: #2D2640 !important;
  border-color: #3D3456 !important;
  color: var(--text-primary) !important;
}

[data-theme="dark"] .nut-tracker .trigger-btn.selected {
  background: #8B6642 !important;
  border-color: #D4A574 !important;
  color: white !important;
}

[data-theme="dark"] .nut-tracker .range-slider {
  background: #3D3456 !important;
}

[data-theme="dark"] .nut-tracker .regret-toggle {
  background: #2D2640 !important;
}

[data-theme="dark"] .nut-tracker .toggle-btn {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .nut-tracker .toggle-btn.active {
  background: rgba(239, 68, 68, 0.2) !important;
  border-color: #EF4444 !important;
}

[data-theme="dark"] .nut-tracker .rant-input {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
  color: var(--text-primary) !important;
}

[data-theme="dark"] .nut-tracker .save-btn {
  background: linear-gradient(135deg, #8B6642 0%, #6B5232 100%) !important;
  border-color: #5B4428 !important;
  box-shadow: 4px 4px 0 #3D2D1A !important;
}
</style>
