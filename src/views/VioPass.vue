<script setup>
import { ref, computed } from 'vue'
import { useFinanceStore } from '../stores'

const store = useFinanceStore()

// Check-in flow state
const step = ref('start') // 'start', 'spending', 'category', 'done'
const didSpend = ref(null)
const selectedCategory = ref(null)
const checkinResult = ref(null)

// Calendar state
const currentMonth = ref(new Date())

const hasCheckedIn = computed(() => store.hasCheckedInToday())
const todayCheckin = computed(() => store.getTodayCheckin())
const stats = computed(() => store.getVioPassStats())

// Get all checkins as a Set for quick lookup
const checkinDates = computed(() => {
  const dates = new Set()
  store.vioPass.value.checkins.forEach(c => dates.add(c.date))
  return dates
})

// Calendar helpers
const calendarDays = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPadding = firstDay.getDay() // 0 = Sunday

  const days = []

  // Padding for days before month starts
  for (let i = 0; i < startPadding; i++) {
    days.push({ day: null, date: null })
  }

  // Actual days
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const checkin = store.vioPass.value.checkins.find(c => c.date === dateStr)
    days.push({
      day: d,
      date: dateStr,
      isToday: dateStr === new Date().toISOString().split('T')[0],
      hasCheckin: checkinDates.value.has(dateStr),
      checkin: checkin || null
    })
  }

  return days
})

const monthName = computed(() => {
  return currentMonth.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

function prevMonth() {
  const d = new Date(currentMonth.value)
  d.setMonth(d.getMonth() - 1)
  currentMonth.value = d
}

function nextMonth() {
  const d = new Date(currentMonth.value)
  d.setMonth(d.getMonth() + 1)
  currentMonth.value = d
}

// Check-in flow
function doCheckin() {
  if (hasCheckedIn.value) return
  step.value = 'spending'
}

function answerSpending(spent) {
  didSpend.value = spent
  if (spent) {
    step.value = 'category'
  } else {
    completeCheckin()
  }
}

function selectCategory(category) {
  selectedCategory.value = category
  completeCheckin()
}

function completeCheckin() {
  const result = store.performCheckin(didSpend.value, selectedCategory.value)
  checkinResult.value = result
  step.value = 'done'
}

function resetFlow() {
  step.value = 'start'
  didSpend.value = null
  selectedCategory.value = null
  checkinResult.value = null
}

// Vio helpers
function getVioImage() {
  if (step.value === 'done' && checkinResult.value) {
    const reaction = checkinResult.value.vioReaction
    if (reaction === 'happy') return '/images/vio_right.png'
    if (reaction === 'sad') return '/images/vio_fall.png'
    return '/images/vio_sit.png'
  }

  if (hasCheckedIn.value) {
    return '/images/vio_right.png'
  }

  // Encourage check-in
  return '/images/vio_sit.png'
}

function getStreakEmoji() {
  const streak = stats.value.currentStreak
  if (streak >= 30) return '👑'
  if (streak >= 14) return '🔥'
  if (streak >= 7) return '⭐'
  if (streak >= 3) return '✨'
  return '🌱'
}

function getCheckinEmoji(checkin) {
  if (!checkin) return ''
  if (!checkin.didSpend) return '💚'
  return '💸'
}

// Recent checkins for sidebar
const recentCheckins = computed(() => {
  return [...store.vioPass.value.checkins]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10)
})

function formatDate(dateStr) {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (dateStr === today.toISOString().split('T')[0]) return 'Today'
  if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday'
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="page viopass-page">
    <div class="page-header">
      <img src="/images/vio-logo.png" alt="Vionade" class="page-header-logo" />
    </div>

    <h1 class="page-title">Vio Pass</h1>
    <p class="page-subtitle">Check in daily with Vio!</p>

    <div class="viopass-layout">
      <!-- Main Column -->
      <div class="main-column">
        <!-- Check-in Card -->
        <div class="checkin-card">
          <div class="checkin-card-inner">
            <img :src="getVioImage()" alt="Vio" class="vio-avatar" />

            <!-- Not checked in yet -->
            <template v-if="!hasCheckedIn && step === 'start'">
              <div class="checkin-prompt">
                <div class="prompt-text">Hey! Ready to check in?</div>
                <button class="checkin-btn" @click="doCheckin">
                  <span class="checkin-btn-icon">✅</span>
                  <span>Check In</span>
                </button>
              </div>
            </template>

            <!-- Spending question -->
            <template v-else-if="step === 'spending'">
              <div class="checkin-prompt">
                <div class="prompt-text">Did you spend money today?</div>
                <div class="spending-btns">
                  <button class="spend-btn no" @click="answerSpending(false)">
                    <span>😊</span> Nope!
                  </button>
                  <button class="spend-btn yes" @click="answerSpending(true)">
                    <span>💸</span> Yes
                  </button>
                </div>
              </div>
            </template>

            <!-- Category selection -->
            <template v-else-if="step === 'category'">
              <div class="checkin-prompt">
                <div class="prompt-text">What did you spend on?</div>
                <div class="category-grid">
                  <button
                    v-for="cat in store.EXPENSE_CATEGORIES"
                    :key="cat.id"
                    class="cat-btn"
                    @click="selectCategory(cat.id)"
                  >
                    <span class="cat-icon">{{ cat.icon }}</span>
                    <span class="cat-name">{{ cat.name }}</span>
                  </button>
                </div>
              </div>
            </template>

            <!-- Done! -->
            <template v-else-if="step === 'done'">
              <div class="checkin-prompt">
                <div class="prompt-text">{{ checkinResult?.vioMessage }}</div>
                <div class="streak-celebration">
                  <span class="streak-emoji">{{ getStreakEmoji() }}</span>
                  <span class="streak-text">{{ stats.currentStreak }} day streak!</span>
                </div>
              </div>
            </template>

            <!-- Already checked in -->
            <template v-else-if="hasCheckedIn">
              <div class="checkin-prompt">
                <div class="prompt-text">{{ todayCheckin?.vioMessage || "You're all checked in!" }}</div>
                <div class="checked-badge">
                  <span>✅</span> Checked in today!
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- Stats Row -->
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-icon">{{ getStreakEmoji() }}</div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.currentStreak }}</div>
              <div class="stat-label">Current Streak</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🏆</div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.longestStreak }}</div>
              <div class="stat-label">Best Streak</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">💚</div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.noSpendDays }}</div>
              <div class="stat-label">No-Spend Days</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">📅</div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalCheckins }}</div>
              <div class="stat-label">Total Check-ins</div>
            </div>
          </div>
        </div>

        <!-- Calendar -->
        <div class="calendar-card">
          <div class="calendar-header">
            <button class="cal-nav" @click="prevMonth">←</button>
            <span class="cal-month">{{ monthName }}</span>
            <button class="cal-nav" @click="nextMonth">→</button>
          </div>
          <div class="calendar-weekdays">
            <span v-for="d in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="d">{{ d }}</span>
          </div>
          <div class="calendar-grid">
            <div
              v-for="(day, i) in calendarDays"
              :key="i"
              class="cal-day"
              :class="{
                empty: !day.day,
                today: day.isToday,
                'has-checkin': day.hasCheckin,
                'no-spend': day.checkin && !day.checkin.didSpend,
                'did-spend': day.checkin && day.checkin.didSpend
              }"
            >
              <span v-if="day.day" class="day-num">{{ day.day }}</span>
              <span v-if="day.hasCheckin" class="day-dot">{{ getCheckinEmoji(day.checkin) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Sidebar (desktop) -->
      <div class="sidebar">
        <div class="sidebar-card">
          <h3 class="sidebar-title">Recent Check-ins</h3>
          <div v-if="recentCheckins.length === 0" class="empty-history">
            No check-ins yet. Start your streak!
          </div>
          <div v-else class="history-list">
            <div
              v-for="checkin in recentCheckins"
              :key="checkin.date"
              class="history-item"
              :class="{ 'no-spend': !checkin.didSpend }"
            >
              <span class="history-emoji">{{ checkin.didSpend ? '💸' : '💚' }}</span>
              <div class="history-info">
                <div class="history-date">{{ formatDate(checkin.date) }}</div>
                <div class="history-detail">
                  {{ checkin.didSpend
                    ? store.getCategoryById(checkin.category, 'expense')?.name || 'Spent'
                    : 'No spending!' }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Streak milestones -->
        <div class="sidebar-card milestones">
          <h3 class="sidebar-title">Streak Milestones</h3>
          <div class="milestone" :class="{ achieved: stats.currentStreak >= 3 }">
            <span class="milestone-icon">✨</span>
            <span>3 days</span>
          </div>
          <div class="milestone" :class="{ achieved: stats.currentStreak >= 7 }">
            <span class="milestone-icon">⭐</span>
            <span>7 days</span>
          </div>
          <div class="milestone" :class="{ achieved: stats.currentStreak >= 14 }">
            <span class="milestone-icon">🔥</span>
            <span>14 days</span>
          </div>
          <div class="milestone" :class="{ achieved: stats.currentStreak >= 30 }">
            <span class="milestone-icon">👑</span>
            <span>30 days</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.viopass-page {
  max-width: 1200px;
}

.page-title {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 var(--space-xs);
}

.page-subtitle {
  color: var(--text-secondary);
  font-size: 1rem;
  margin: 0 0 var(--space-lg);
}

.viopass-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-lg);
}

@media (min-width: 768px) {
  .viopass-layout {
    grid-template-columns: 1fr 280px;
  }
}

/* Check-in Card */
.checkin-card {
  background: linear-gradient(135deg, var(--lavender-100) 0%, var(--sunshine-100) 100%);
  border: 3px solid var(--lavender-300);
  border-radius: 20px;
  padding: var(--space-lg);
  margin-bottom: var(--space-lg);
}

.checkin-card-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.vio-avatar {
  width: 120px;
  height: auto;
  margin-bottom: var(--space-md);
}

.checkin-prompt {
  width: 100%;
}

.prompt-text {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: var(--space-md);
  color: var(--text-primary);
}

.checkin-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-xl);
  background: var(--lavender-500);
  border: 3px solid var(--lavender-600);
  border-radius: 14px;
  color: white;
  font-size: 1.125rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 4px 4px 0 var(--lavender-700);
  transition: all 0.1s;
}

.checkin-btn:hover {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 var(--lavender-700);
}

.checkin-btn-icon {
  font-size: 1.5rem;
}

/* Spending buttons */
.spending-btns {
  display: flex;
  gap: var(--space-md);
  justify-content: center;
}

.spend-btn {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-lg);
  border: 3px solid;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}

.spend-btn.no {
  background: #DCFCE7;
  border-color: #22C55E;
  color: #166534;
}

.spend-btn.yes {
  background: #FEE2E2;
  border-color: #EF4444;
  color: #991B1B;
}

.spend-btn:hover {
  transform: scale(1.05);
}

/* Category grid */
.category-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-xs);
}

@media (max-width: 480px) {
  .category-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.cat-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--space-sm);
  background: white;
  border: 2px solid var(--gray-200);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
}

.cat-btn:hover {
  border-color: var(--lavender-500);
  background: var(--lavender-50);
}

.cat-icon {
  font-size: 1.25rem;
}

.cat-name {
  font-size: 0.6rem;
  color: var(--text-secondary);
  font-weight: 600;
}

/* Celebration */
.streak-celebration {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: white;
  border-radius: 12px;
  margin-top: var(--space-sm);
}

.streak-emoji {
  font-size: 2rem;
}

.streak-text {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--lavender-600);
}

.checked-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: #DCFCE7;
  border-radius: 20px;
  color: #166534;
  font-weight: 600;
}

/* Stats Row */
.stats-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-sm);
  margin-bottom: var(--space-lg);
}

@media (min-width: 480px) {
  .stats-row {
    grid-template-columns: repeat(4, 1fr);
  }
}

.stat-card {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: 12px;
}

.stat-icon {
  font-size: 1.75rem;
}

.stat-value {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--lavender-600);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Calendar */
.calendar-card {
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: 16px;
  padding: var(--space-md);
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.cal-nav {
  width: 32px;
  height: 32px;
  background: var(--lavender-100);
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
}

.cal-nav:hover {
  background: var(--lavender-200);
}

.cal-month {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.125rem;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: var(--space-xs);
}

.calendar-weekdays span {
  text-align: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  padding: var(--space-xs);
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.cal-day {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-size: 0.875rem;
  position: relative;
  background: var(--gray-50);
}

.cal-day.empty {
  background: transparent;
}

.cal-day.today {
  border: 2px solid var(--lavender-500);
}

.cal-day.has-checkin {
  background: var(--lavender-100);
}

.cal-day.no-spend {
  background: #DCFCE7;
}

.cal-day.did-spend {
  background: #FEF3C7;
}

.day-num {
  font-weight: 600;
}

.day-dot {
  font-size: 0.7rem;
  position: absolute;
  bottom: 3px;
}

/* Sidebar */
.sidebar {
  display: none;
}

@media (min-width: 768px) {
  .sidebar {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }
}

.sidebar-card {
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: 16px;
  padding: var(--space-md);
}

.sidebar-title {
  font-family: var(--font-display);
  font-size: 0.875rem;
  font-weight: 700;
  margin: 0 0 var(--space-md);
}

.empty-history {
  color: var(--text-secondary);
  font-size: 0.8rem;
  text-align: center;
  padding: var(--space-md);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.history-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm);
  background: var(--gray-50);
  border-radius: 8px;
  border-left: 3px solid #EF4444;
}

.history-item.no-spend {
  border-left-color: #22C55E;
}

.history-emoji {
  font-size: 1rem;
}

.history-date {
  font-size: 0.75rem;
  font-weight: 600;
}

.history-detail {
  font-size: 0.65rem;
  color: var(--text-secondary);
}

/* Milestones */
.milestones {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.milestone {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm);
  background: var(--gray-100);
  border-radius: 8px;
  font-size: 0.8rem;
  color: var(--text-secondary);
  opacity: 0.5;
}

.milestone.achieved {
  background: var(--lavender-100);
  color: var(--lavender-700);
  opacity: 1;
  font-weight: 600;
}

.milestone-icon {
  font-size: 1.25rem;
}
</style>

<style>
/* Dark mode */
[data-theme="dark"] .checkin-card {
  background: linear-gradient(135deg, #2D2640 0%, #1A1625 100%) !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .checkin-btn {
  background: #8B5CF6 !important;
  border-color: #7C3AED !important;
  box-shadow: 4px 4px 0 #5B21B6 !important;
}

[data-theme="dark"] .spend-btn.no {
  background: #14532D !important;
  border-color: #22C55E !important;
  color: #86EFAC !important;
}

[data-theme="dark"] .spend-btn.yes {
  background: #450A0A !important;
  border-color: #EF4444 !important;
  color: #FCA5A5 !important;
}

[data-theme="dark"] .cat-btn {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .cat-btn:hover {
  background: #2D2640 !important;
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .streak-celebration {
  background: #1A1625 !important;
}

[data-theme="dark"] .stat-card,
[data-theme="dark"] .calendar-card,
[data-theme="dark"] .sidebar-card {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .cal-nav {
  background: #2D2640 !important;
}

[data-theme="dark"] .cal-day {
  background: #2D2640 !important;
}

[data-theme="dark"] .cal-day.empty {
  background: transparent !important;
}

[data-theme="dark"] .cal-day.has-checkin {
  background: rgba(139, 92, 246, 0.3) !important;
}

[data-theme="dark"] .cal-day.no-spend {
  background: rgba(34, 197, 94, 0.2) !important;
}

[data-theme="dark"] .cal-day.did-spend {
  background: rgba(251, 191, 36, 0.2) !important;
}

[data-theme="dark"] .history-item {
  background: #2D2640 !important;
}

[data-theme="dark"] .milestone {
  background: #2D2640 !important;
}

[data-theme="dark"] .milestone.achieved {
  background: rgba(139, 92, 246, 0.2) !important;
  color: #A78BFA !important;
}

[data-theme="dark"] .checked-badge {
  background: #14532D !important;
  color: #86EFAC !important;
}
</style>
