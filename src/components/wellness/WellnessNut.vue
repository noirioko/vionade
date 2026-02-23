<script setup>
import { ref, computed } from 'vue'
import { useFinanceStore } from '../../stores'

const store = useFinanceStore()

// Modal state
const showModal = ref(false)
const editingLog = ref(null)
const form = ref({
  trigger: '',
  hornyLevel: 5,
  rating: 5,
  rant: '',
  regret: false,
  date: '',
})

function getLocalDatetime() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

function toLocalDatetime(isoString) {
  const d = new Date(isoString)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

function openAddModal() {
  editingLog.value = null
  form.value = {
    trigger: '',
    hornyLevel: 5,
    rating: 5,
    rant: '',
    regret: false,
    date: getLocalDatetime(),
  }
  showModal.value = true
}

function openEditModal(log) {
  editingLog.value = log
  form.value = {
    trigger: log.trigger || '',
    hornyLevel: log.hornyLevel || 5,
    rating: log.rating || 5,
    rant: log.rant || '',
    regret: log.regret || false,
    date: toLocalDatetime(log.date),
  }
  showModal.value = true
}

function saveLog() {
  const dateValue = new Date(form.value.date).toISOString()

  if (editingLog.value) {
    store.updateNutLog(editingLog.value.id, {
      trigger: form.value.trigger,
      hornyLevel: form.value.hornyLevel,
      rating: form.value.rating,
      rant: form.value.rant,
      regret: form.value.regret,
      date: dateValue,
    })
  } else {
    store.addNutLog({
      trigger: form.value.trigger,
      hornyLevel: form.value.hornyLevel,
      rating: form.value.rating,
      rant: form.value.rant,
      regret: form.value.regret,
      date: dateValue,
    })
  }
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

function getRatingClass(rating) {
  if (rating >= 8) return 'rating-fire'
  if (rating >= 5) return 'rating-ok'
  return 'rating-meh'
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
          class="log-card"
        >
          <div class="log-card-top">
            <div class="log-rating-badge" :class="getRatingClass(log.rating)">
              <span class="log-rating-num">{{ log.rating }}</span>
              <span class="log-rating-max">/10</span>
            </div>
            <div class="log-card-info">
              <div class="log-card-date">
                {{ formatDate(log.date) }} <span class="log-card-time">{{ formatTime(log.date) }}</span>
              </div>
              <div class="log-card-tags">
                <span class="log-tag trigger-tag" v-if="log.trigger">{{ getTriggerIcon(log.trigger) }} {{ getTriggerLabel(log.trigger) }}</span>
                <span class="log-tag horny-tag">🔥 {{ log.hornyLevel }}/10</span>
                <span class="log-tag regret-tag" v-if="log.regret">😬 Regret</span>
              </div>
            </div>
            <div class="log-actions">
              <button class="log-action-btn edit-btn" @click="openEditModal(log)" title="Edit">✏️</button>
              <button class="log-action-btn delete-btn" @click="deleteLog(log)" title="Delete">🗑️</button>
            </div>
          </div>
          <div v-if="log.rant" class="log-card-rant">{{ log.rant }}</div>
        </div>
      </div>
    </div>

    <!-- Add Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ editingLog ? '✏️ Edit Log' : '🥜 Log the Deed' }}</h2>
          <button class="close-btn" @click="showModal = false">×</button>
        </div>

        <div class="modal-body">
          <!-- Date & Time -->
          <div class="form-group">
            <label>When?</label>
            <input
              type="datetime-local"
              v-model="form.date"
              class="date-input"
            />
          </div>

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
            <span>{{ editingLog ? '✅' : '💦' }}</span> {{ editingLog ? 'Save Changes' : 'Log It' }}
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
  gap: var(--space-sm);
}

.log-card {
  background: var(--white);
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  transition: all 0.2s;
}

.log-card-top {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

/* Big rating badge */
.log-rating-badge {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  line-height: 1;
}

.log-rating-badge.rating-fire {
  background: linear-gradient(135deg, #D4A574, #C4956A);
  border: 2px solid #A67C52;
  box-shadow: 2px 2px 0 #8B6642;
}

.log-rating-badge.rating-ok {
  background: linear-gradient(135deg, #E8D4BC, #D4C4AC);
  border: 2px solid #C4A882;
  box-shadow: 2px 2px 0 #A69070;
}

.log-rating-badge.rating-meh {
  background: var(--lavender-100);
  border: 2px solid var(--lavender-200);
  box-shadow: 2px 2px 0 var(--lavender-200);
}

.log-rating-num {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.25rem;
  color: white;
}

.log-rating-badge.rating-meh .log-rating-num {
  color: var(--text-secondary);
}

.log-rating-max {
  font-size: 0.5625rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
  margin-top: -2px;
}

.log-rating-badge.rating-meh .log-rating-max {
  color: var(--text-tertiary);
}

/* Card info */
.log-card-info {
  flex: 1;
  min-width: 0;
}

.log-card-date {
  font-weight: 700;
  font-size: 0.9375rem;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.log-card-time {
  font-weight: 500;
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.log-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.log-tag {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  white-space: nowrap;
}

.trigger-tag {
  background: #FDF4E7;
  color: #8B6642;
}

.horny-tag {
  background: #FEE2E2;
  color: #DC2626;
}

.regret-tag {
  background: #FEF3C7;
  color: #92400E;
}

/* Rant */
.log-card-rant {
  margin-top: var(--space-sm);
  padding-top: var(--space-sm);
  border-top: 1px dashed var(--lavender-100);
  font-size: 0.8125rem;
  color: var(--text-secondary);
  font-style: italic;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Actions */
.log-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}

.log-action-btn {
  width: 30px;
  height: 30px;
  border: none;
  background: var(--lavender-50);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.log-action-btn.edit-btn:hover {
  background: #FDF4E7;
}

.log-action-btn.delete-btn:hover {
  background: #FEE2E2;
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

/* Date Input */
.date-input {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-family: inherit;
  color: var(--text-primary);
  background: var(--white);
}

.date-input:focus {
  outline: none;
  border-color: #D4A574;
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

[data-theme="dark"] .nut-tracker .log-card {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .nut-tracker .log-card-date {
  color: #E9D5FF !important;
}

[data-theme="dark"] .nut-tracker .log-card-time {
  color: #9D8BC2 !important;
}

[data-theme="dark"] .nut-tracker .trigger-tag {
  background: rgba(212, 165, 116, 0.15) !important;
  color: #D4A574 !important;
}

[data-theme="dark"] .nut-tracker .horny-tag {
  background: rgba(239, 68, 68, 0.15) !important;
  color: #FCA5A5 !important;
}

[data-theme="dark"] .nut-tracker .regret-tag {
  background: rgba(251, 191, 36, 0.15) !important;
  color: #FCD34D !important;
}

[data-theme="dark"] .nut-tracker .log-card-rant {
  border-color: #3D3456 !important;
  color: #9D8BC2 !important;
}

[data-theme="dark"] .nut-tracker .log-rating-badge.rating-meh {
  background: #2D2640 !important;
  border-color: #3D3456 !important;
  box-shadow: 2px 2px 0 #3D3456 !important;
}

[data-theme="dark"] .nut-tracker .log-rating-badge.rating-meh .log-rating-num {
  color: #9D8BC2 !important;
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

[data-theme="dark"] .nut-tracker .date-input {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
  color: #E9D5FF !important;
}

[data-theme="dark"] .nut-tracker .date-input:focus {
  border-color: #D4A574 !important;
}

[data-theme="dark"] .nut-tracker .log-action-btn {
  background: #2D2640 !important;
}

[data-theme="dark"] .nut-tracker .log-action-btn.edit-btn:hover {
  background: rgba(212, 165, 116, 0.2) !important;
}

[data-theme="dark"] .nut-tracker .log-action-btn.delete-btn:hover {
  background: rgba(239, 68, 68, 0.2) !important;
}
</style>
