<script setup>
import { ref, computed } from 'vue'
import { useFinanceStore } from '../stores/finance'
import HelpTip from '../components/HelpTip.vue'

const store = useFinanceStore()

// Check-in flow state
const step = ref('start') // 'start', 'category', 'result'
const didSpend = ref(null)
const selectedCategory = ref(null)

const hasCheckedIn = computed(() => store.hasCheckedInToday())
const todayCheckin = computed(() => store.getTodayCheckin())
const stats = computed(() => store.getVioPassStats())
const vioMood = computed(() => store.getVioMood())

// Get recent checkins (last 7 days)
const recentCheckins = computed(() => {
  return [...store.vioPass.value.checkins]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 7)
})

function startCheckin(spent) {
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

const checkinResult = ref(null)

function completeCheckin() {
  const result = store.performCheckin(didSpend.value, selectedCategory.value)
  checkinResult.value = result
  step.value = 'result'
}

function resetCheckin() {
  step.value = 'start'
  didSpend.value = null
  selectedCategory.value = null
  checkinResult.value = null
}

function getVioImage() {
  if (step.value === 'result' && checkinResult.value) {
    const reaction = checkinResult.value.vioReaction
    if (reaction === 'happy') return '/images/vio_right.png'
    if (reaction === 'okay') return '/images/vio_sit.png'
    if (reaction === 'thinking') return '/images/vio_sit.png'
    if (reaction === 'sad') return '/images/vio_fall.png'
  }

  if (hasCheckedIn.value) {
    const reaction = todayCheckin.value?.vioReaction
    if (reaction === 'happy') return '/images/vio_right.png'
    if (reaction === 'sad') return '/images/vio_fall.png'
    return '/images/vio_sit.png'
  }

  // Based on overall mood
  if (vioMood.value === 'worried') return '/images/vio_fall.png'
  if (vioMood.value === 'happy') return '/images/vio_right.png'
  return '/images/vio_sit.png'
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
  } else {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }
}

function getReactionEmoji(reaction) {
  if (reaction === 'happy') return '😊'
  if (reaction === 'okay') return '😌'
  if (reaction === 'thinking') return '🤔'
  if (reaction === 'sad') return '😢'
  return '😐'
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <img src="/images/vio-logo.png" alt="Vionade" class="page-header-logo" />
    </div>

    <!-- Header -->
    <div class="section">
      <div class="section-header">
        <h3 class="section-title">
          Vio Pass
          <HelpTip text="Check in daily with Vio! Tell her if you spent money today. Build streaks by checking in every day. Vio will react based on what you bought!" />
        </h3>
      </div>
    </div>

    <!-- Vio Display -->
    <div class="vio-card">
      <img :src="getVioImage()" alt="Vio" class="vio-image" />

      <!-- Already checked in today -->
      <template v-if="hasCheckedIn && step === 'start'">
        <div class="vio-speech">
          {{ todayCheckin?.vioMessage || "Thanks for checking in!" }}
        </div>
        <div class="checkin-done">
          <span class="checkin-done-icon">{{ getReactionEmoji(todayCheckin?.vioReaction) }}</span>
          <span>Already checked in today!</span>
        </div>
      </template>

      <!-- Step: Start -->
      <template v-else-if="step === 'start'">
        <div class="vio-speech">
          Hey! Did you spend any money today?
        </div>
        <div class="checkin-buttons">
          <button class="btn btn-checkin btn-no" @click="startCheckin(false)">
            <span class="btn-emoji">😊</span>
            Nope!
          </button>
          <button class="btn btn-checkin btn-yes" @click="startCheckin(true)">
            <span class="btn-emoji">💸</span>
            Yes...
          </button>
        </div>
      </template>

      <!-- Step: Category -->
      <template v-else-if="step === 'category'">
        <div class="vio-speech">
          What did you spend on?
        </div>
        <div class="category-grid">
          <button
            v-for="cat in store.EXPENSE_CATEGORIES"
            :key="cat.id"
            class="category-btn"
            @click="selectCategory(cat.id)"
          >
            <span class="category-icon">{{ cat.icon }}</span>
            <span class="category-name">{{ cat.name }}</span>
          </button>
        </div>
      </template>

      <!-- Step: Result -->
      <template v-else-if="step === 'result'">
        <div class="vio-speech">
          {{ checkinResult?.vioMessage }}
        </div>
        <div class="result-streak">
          <span class="streak-flame">{{ stats.currentStreak >= 7 ? '🔥' : '✨' }}</span>
          <span class="streak-count">{{ stats.currentStreak }} day streak!</span>
        </div>
      </template>
    </div>

    <!-- Stats Card -->
    <div class="stats-card section">
      <div class="stats-row">
        <div class="stat-item">
          <div class="stat-value">{{ stats.currentStreak }}</div>
          <div class="stat-label">Current Streak</div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <div class="stat-value">{{ stats.longestStreak }}</div>
          <div class="stat-label">Best Streak</div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <div class="stat-value">{{ stats.noSpendDays }}</div>
          <div class="stat-label">No-Spend Days</div>
        </div>
      </div>
    </div>

    <!-- Recent History -->
    <div class="section">
      <div class="section-header">
        <h3 class="section-title">Recent Check-ins</h3>
      </div>

      <div v-if="recentCheckins.length === 0" class="empty-state">
        <div class="empty-state-title">No check-ins yet</div>
        <div class="empty-state-text">Start checking in daily!</div>
      </div>

      <div v-else class="history-list">
        <div
          v-for="checkin in recentCheckins"
          :key="checkin.date"
          class="history-item"
          :class="{ 'no-spend': !checkin.didSpend }"
        >
          <div class="history-date">{{ formatDate(checkin.date) }}</div>
          <div class="history-status">
            <span class="history-emoji">{{ getReactionEmoji(checkin.vioReaction) }}</span>
            <span v-if="checkin.didSpend" class="history-category">
              {{ store.getCategoryById(checkin.category, 'expense')?.icon }}
              {{ store.getCategoryById(checkin.category, 'expense')?.name || 'Spent' }}
            </span>
            <span v-else class="history-no-spend">No spending!</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vio-card {
  background: linear-gradient(135deg, var(--lavender-100) 0%, var(--lavender-50) 100%);
  border-radius: var(--radius-xl);
  padding: var(--space-lg);
  text-align: center;
  margin-bottom: var(--space-md);
  border: 2px solid var(--lavender-200);
}

.vio-image {
  width: 120px;
  height: auto;
  margin-bottom: var(--space-md);
}

.vio-speech {
  background: var(--white);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  margin-bottom: var(--space-md);
  font-family: var(--font-display);
  font-size: 1.125rem;
  color: var(--text-primary);
  position: relative;
  box-shadow: var(--shadow-sm);
}

.vio-speech::after {
  content: '';
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 8px solid var(--white);
}

.checkin-done {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  color: var(--income-color);
  font-weight: 600;
}

.checkin-done-icon {
  font-size: 1.5rem;
}

.checkin-buttons {
  display: flex;
  gap: var(--space-md);
  justify-content: center;
}

.btn-checkin {
  flex: 1;
  max-width: 140px;
  padding: var(--space-md);
  border-radius: var(--radius-lg);
  border: 2px solid transparent;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  transition: all var(--transition-fast);
}

.btn-emoji {
  font-size: 2rem;
}

.btn-no {
  background: rgba(16, 185, 129, 0.1);
  color: var(--income-color);
  border-color: var(--income-color);
}

.btn-no:hover {
  background: rgba(16, 185, 129, 0.2);
}

.btn-yes {
  background: rgba(244, 63, 94, 0.1);
  color: var(--expense-color);
  border-color: var(--expense-color);
}

.btn-yes:hover {
  background: rgba(244, 63, 94, 0.2);
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-sm);
}

.category-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--space-sm);
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-md);
  background: var(--white);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.category-btn:hover {
  border-color: var(--lavender-500);
  background: var(--lavender-50);
}

.category-icon {
  font-size: 1.5rem;
}

.category-name {
  font-size: 0.625rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.result-streak {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--lavender-600);
}

.streak-flame {
  font-size: 1.5rem;
}

/* Stats Card */
.stats-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
}

.stats-row {
  display: flex;
  align-items: center;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-value {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.5rem;
  color: var(--lavender-600);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: var(--gray-200);
}

/* History */
.history-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-card);
  border-radius: var(--radius-md);
  border-left: 4px solid var(--expense-color);
}

.history-item.no-spend {
  border-left-color: var(--income-color);
}

.history-date {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.history-status {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.history-emoji {
  font-size: 1.25rem;
}

.history-category {
  font-size: 0.875rem;
  color: var(--text-primary);
}

.history-no-spend {
  font-size: 0.875rem;
  color: var(--income-color);
  font-weight: 600;
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: var(--space-lg);
}

.empty-state-title {
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--space-xs);
}

.empty-state-text {
  font-size: 0.875rem;
  color: var(--text-secondary);
}
</style>

<style>
/* Dark mode */
[data-theme="dark"] .vio-card {
  background: linear-gradient(135deg, #2D2640 0%, #1A1625 100%) !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .vio-speech {
  background: var(--bg-card) !important;
}

[data-theme="dark"] .vio-speech::after {
  border-bottom-color: var(--bg-card) !important;
}

[data-theme="dark"] .category-btn {
  background: var(--bg-card) !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .category-btn:hover {
  border-color: #8B5CF6 !important;
  background: rgba(139, 92, 246, 0.1) !important;
}

[data-theme="dark"] .stat-divider {
  background: #3D3456 !important;
}

[data-theme="dark"] .history-item {
  background: var(--bg-card) !important;
}
</style>
