<script setup>
import { ref, computed } from 'vue'
import { useFinanceStore } from '../stores'
import { getCurrentChallenge, getAllHabits, getMaxPoints } from '../data/habitChallenges'

const store = useFinanceStore()
const challenge = getCurrentChallenge()
const allHabits = getAllHabits()
const maxPoints = getMaxPoints()

// Collapsed state for categories
const collapsedCategories = ref({})

function toggleCategory(categoryId) {
  collapsedCategories.value[categoryId] = !collapsedCategories.value[categoryId]
}

// Calculate current day of challenge
const currentDay = computed(() => {
  const start = new Date(challenge.startDate)
  const today = new Date()
  const diff = Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1
  return Math.min(Math.max(diff, 1), challenge.totalDays)
})

// Calculate days remaining
const daysRemaining = computed(() => {
  const end = new Date(challenge.endDate)
  const today = new Date()
  const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24))
  return Math.max(diff, 0)
})

// Get current week (1-4)
const currentWeek = computed(() => {
  return Math.min(Math.ceil(currentDay.value / 7), 4)
})

// Calculate total points earned
const totalPoints = computed(() => {
  let points = 0

  // Daily habit completions
  Object.keys(store.habits.value.completions).forEach(key => {
    if (store.habits.value.completions[key]) {
      const habit = allHabits.find(h => h.id === parseInt(key.split('-')[0]))
      if (habit) points += habit.points
    }
  })

  // Weekly bonuses
  Object.keys(store.habits.value.weeklyBonuses).forEach(key => {
    if (store.habits.value.weeklyBonuses[key]) {
      const bonus = challenge.weeklyBonuses.find(b => b.id === parseInt(key.split('-')[0]))
      if (bonus) points += bonus.points
    }
  })

  // End of month goals
  Object.keys(store.habits.value.endOfMonthGoals).forEach(key => {
    if (store.habits.value.endOfMonthGoals[key]) {
      const goal = challenge.endOfMonthGoals.find(g => g.id === parseInt(key))
      if (goal) points += goal.points
    }
  })

  return points
})

// Calculate percentage
const progressPercent = computed(() => {
  return Math.round((totalPoints.value / maxPoints) * 100)
})

// Calculate current streak (consecutive days with at least 1 habit completed)
const currentStreak = computed(() => {
  let streak = 0
  const today = new Date()

  for (let i = 0; i < currentDay.value; i++) {
    const checkDay = currentDay.value - i
    const dayHasCompletion = allHabits.some(habit =>
      store.isHabitCompleted(habit.id, checkDay)
    )

    if (dayHasCompletion) {
      streak++
    } else if (i > 0) {
      // Skip today if not yet completed
      break
    }
  }

  return streak
})

// Get completions for today
const todayCompletions = computed(() => {
  return allHabits.filter(habit =>
    store.isHabitCompleted(habit.id, currentDay.value)
  ).length
})

// Days array for grid
const days = Array.from({ length: challenge.totalDays }, (_, i) => i + 1)

// Check if a day is in the past
function isPastDay(day) {
  return day < currentDay.value
}

// Check if a day is today
function isToday(day) {
  return day === currentDay.value
}

// Check if a day is in the future
function isFutureDay(day) {
  return day > currentDay.value
}

// Handle habit checkbox click - allow any day
function handleHabitClick(habitId, day) {
  store.toggleHabitCompletion(habitId, day)
}

// Handle weekly bonus click - allow any week
function handleBonusClick(bonusId, week) {
  store.toggleWeeklyBonus(bonusId, week)
}

// Handle end of month goal click - allow anytime
function handleGoalClick(goalId) {
  store.toggleEndOfMonthGoal(goalId)
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <img src="/images/vio-logo.png" alt="Vionade" class="page-header-logo" />
    </div>

    <!-- Event Banner -->
    <div
      class="event-banner"
      :style="challenge.bannerBg ? { backgroundImage: `url(${challenge.bannerBg})` } : {}"
    >
      <div class="banner-content">
        <img
          v-if="challenge.bannerIcon"
          :src="challenge.bannerIcon"
          alt=""
          class="banner-icon"
        />
        <div class="banner-text">
          <div class="banner-title">{{ challenge.name }}</div>
          <div class="banner-subtitle">{{ challenge.subtitle }}</div>
          <div class="banner-countdown" v-if="daysRemaining > 0">
            <span class="countdown-icon">⏰</span>
            <span class="countdown-text">{{ daysRemaining }} days left</span>
          </div>
          <div class="banner-countdown complete" v-else>
            <span class="countdown-icon">🎉</span>
            <span class="countdown-text">Complete!</span>
          </div>
        </div>
      </div>
      <img
        v-if="challenge.bannerChar"
        :src="challenge.bannerChar"
        alt=""
        class="banner-character"
      />
    </div>

    <!-- Stats Panel -->
    <div class="stats-panel section">
      <div class="stats-main">
        <div class="points-display">
          <span class="points-current">{{ totalPoints }}</span>
          <span class="points-max">/ {{ maxPoints }}</span>
        </div>
        <div class="points-label">Total Points</div>
      </div>

      <div class="progress-bar-container">
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: progressPercent + '%' }"
            :class="{ 'target-reached': progressPercent >= 70 }"
          ></div>
          <div class="progress-marker" style="left: 70%"></div>
        </div>
        <div class="progress-labels">
          <span>0%</span>
          <span class="target-label">70% Target</span>
          <span>100%</span>
        </div>
      </div>

      <div class="stats-row">
        <div class="stat-item">
          <div class="stat-value">{{ currentStreak }}</div>
          <div class="stat-label">Day Streak</div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <div class="stat-value">{{ todayCompletions }}/{{ allHabits.length }}</div>
          <div class="stat-label">Today</div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <div class="stat-value">{{ progressPercent }}%</div>
          <div class="stat-label">Complete</div>
        </div>
      </div>
    </div>

    <!-- Day indicator -->
    <div class="day-indicator">
      <span class="day-badge">Day {{ currentDay }} of {{ challenge.totalDays }}</span>
    </div>

    <!-- Habit Categories -->
    <div class="categories-container">
      <div
        v-for="(category, categoryKey) in challenge.categories"
        :key="categoryKey"
        class="category-section"
      >
        <button
          class="category-header"
          @click="toggleCategory(categoryKey)"
        >
          <div class="category-title">
            <span class="category-emoji">{{ category.emoji }}</span>
            <span class="category-name">{{ category.name }}</span>
          </div>
          <span class="category-toggle" :class="{ collapsed: collapsedCategories[categoryKey] }">▼</span>
        </button>

        <Transition name="collapse">
          <div class="category-content" v-show="!collapsedCategories[categoryKey]">
          <!-- Day numbers header -->
          <div class="days-header">
            <div class="habit-name-space"></div>
            <div class="days-scroll">
              <div
                v-for="day in days"
                :key="day"
                class="day-number"
                :class="{ 'today': isToday(day), 'past': isPastDay(day), 'future': isFutureDay(day) }"
              >
                {{ day }}
              </div>
            </div>
          </div>

          <!-- Habit rows -->
          <div
            v-for="habit in category.habits"
            :key="habit.id"
            class="habit-row"
          >
            <div class="habit-info">
              <div class="habit-name" :title="habit.desc">{{ habit.name }}</div>
            </div>
            <div class="habit-checkboxes">
              <button
                v-for="day in days"
                :key="day"
                class="habit-checkbox"
                :class="{
                  'checked': store.isHabitCompleted(habit.id, day),
                  'today': isToday(day)
                }"
                @click="handleHabitClick(habit.id, day)"
              >
                <span v-if="store.isHabitCompleted(habit.id, day)" class="check-icon">✓</span>
              </button>
            </div>
          </div>
        </div>
        </Transition>
      </div>
    </div>

    <!-- Weekly Bonuses -->
    <div class="section bonuses-section">
      <div class="section-header">
        <h3 class="section-title">
          <span class="section-emoji">⭐</span>
          Weekly Bonuses
          <span class="bonus-points">(+2 pts each)</span>
        </h3>
      </div>

      <div class="bonuses-grid">
        <div class="bonus-header">
          <div class="bonus-name-space"></div>
          <div class="week-labels">
            <span v-for="week in 4" :key="week" class="week-label">Wk {{ week }}</span>
          </div>
        </div>

        <div
          v-for="bonus in challenge.weeklyBonuses"
          :key="bonus.id"
          class="bonus-row"
        >
          <div class="bonus-info">
            <div class="bonus-name">{{ bonus.name }}</div>
            <div class="bonus-desc">{{ bonus.desc }}</div>
          </div>
          <div class="bonus-checkboxes">
            <button
              v-for="week in 4"
              :key="week"
              class="bonus-checkbox"
              :class="{
                'checked': store.isWeeklyBonusCompleted(bonus.id, week)
              }"
              @click="handleBonusClick(bonus.id, week)"
            >
              <span v-if="store.isWeeklyBonusCompleted(bonus.id, week)" class="check-icon">✓</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- End of Month Goals -->
    <div class="section goals-section">
      <div class="section-header">
        <h3 class="section-title">
          <span class="section-emoji">🏆</span>
          End of Month Goals
          <span class="bonus-points">(+5 pts each)</span>
        </h3>
      </div>

      <div class="goals-list">
        <div
          v-for="goal in challenge.endOfMonthGoals"
          :key="goal.id"
          class="goal-row"
        >
          <button
            class="goal-checkbox"
            :class="{
              'checked': store.isEndOfMonthGoalCompleted(goal.id)
            }"
            @click="handleGoalClick(goal.id)"
          >
            <span v-if="store.isEndOfMonthGoalCompleted(goal.id)" class="check-icon">✓</span>
          </button>
          <div class="goal-info">
            <div class="goal-name">{{ goal.name }}</div>
            <div class="goal-desc">{{ goal.desc }}</div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 1200px;
}

.page-title {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 var(--space-xs);
}

/* Event Banner */
.event-banner {
  position: relative;
  display: flex;
  align-items: stretch;
  border-radius: var(--radius-xl);
  overflow: hidden;
  margin-bottom: var(--space-md);
  background-color: #F59E0B;
  background-size: cover;
  background-position: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  min-height: 140px;
}

.banner-content {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: linear-gradient(90deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 60%, transparent 100%);
}

.banner-icon {
  width: 100px;
  height: 100px;
  object-fit: contain;
  flex-shrink: 0;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
}

.banner-text {
  flex: 1;
}

.banner-title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.banner-subtitle {
  font-size: 0.9375rem;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 4px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.banner-countdown {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  margin-top: var(--space-sm);
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(4px);
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
}

.banner-countdown.complete {
  background: rgba(16, 185, 129, 0.4);
}

.banner-character {
  height: 140px;
  width: auto;
  object-fit: contain;
  object-position: bottom right;
  flex-shrink: 0;
  margin-right: var(--space-md);
}

@media (max-width: 480px) {
  .banner-icon {
    width: 72px;
    height: 72px;
  }

  .banner-character {
    height: 100px;
    margin-right: var(--space-sm);
  }

  .banner-title {
    font-size: 1.25rem;
  }
}

/* Stats Panel */
.stats-panel {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  border: 2px solid var(--lavender-200);
}

.stats-main {
  text-align: center;
  margin-bottom: var(--space-md);
}

.points-display {
  font-family: var(--font-display);
}

.points-current {
  font-size: 3rem;
  font-weight: 700;
  color: var(--lavender-600);
}

.points-max {
  font-size: 1.5rem;
  color: var(--text-secondary);
}

.points-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.progress-bar-container {
  margin-bottom: var(--space-md);
}

.progress-bar {
  height: 12px;
  background: var(--gray-200);
  border-radius: 6px;
  position: relative;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--lavender-400) 0%, var(--lavender-600) 100%);
  border-radius: 6px;
  transition: width 0.5s ease;
}

.progress-fill.target-reached {
  background: linear-gradient(90deg, var(--income-color) 0%, #059669 100%);
}

.progress-marker {
  position: absolute;
  top: -4px;
  bottom: -4px;
  width: 3px;
  background: var(--text-primary);
  border-radius: 2px;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.625rem;
  color: var(--text-secondary);
  margin-top: 4px;
  position: relative;
}

.target-label {
  position: absolute;
  left: 70%;
  transform: translateX(-50%);
  color: var(--lavender-600);
  font-weight: 600;
}

.stats-row {
  display: flex;
  align-items: center;
  padding-top: var(--space-md);
  border-top: 1px solid var(--gray-200);
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
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

.stat-divider {
  width: 1px;
  height: 32px;
  background: var(--gray-200);
}

/* Day indicator */
.day-indicator {
  text-align: center;
  margin-bottom: var(--space-md);
}

.day-badge {
  display: inline-block;
  padding: var(--space-xs) var(--space-md);
  background: var(--lavender-100);
  color: var(--lavender-700);
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: var(--radius-full);
}

/* Categories */
.categories-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-bottom: var(--space-lg);
}

.category-section {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 2px solid var(--lavender-100);
}

.category-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md);
  background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}

.category-header:hover {
  background: linear-gradient(135deg, #FDE68A 0%, #FCD34D 100%);
}

.category-title {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.category-emoji {
  font-size: 1.25rem;
}

.category-name {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.75rem;
  color: var(--text-primary);
  letter-spacing: 0.5px;
}

.category-toggle {
  font-size: 1rem;
  color: var(--text-secondary);
  transition: transform 0.3s ease;
}

.category-toggle.collapsed {
  transform: rotate(-90deg);
}

.category-content {
  padding: var(--space-sm);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  position: relative;
}

/* Make habit rows scrollable with sticky name */
.habit-row {
  display: flex;
  align-items: center;
  min-width: max-content;
}

.habit-info {
  position: sticky;
  left: 0;
  z-index: 5;
  background: var(--bg-card);
}

/* Collapse animation */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 500px;
}

/* Days header */
.days-header {
  display: flex;
  margin-bottom: var(--space-xs);
  background: var(--bg-card);
  position: relative;
  min-width: max-content;
}

.habit-name-space {
  width: 120px;
  min-width: 120px;
  flex-shrink: 0;
  position: sticky;
  left: 0;
  z-index: 5;
  background: var(--bg-card);
}

.days-scroll {
  display: flex;
  gap: 2px;
}

.day-number {
  width: 28px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.day-number.today {
  background: var(--lavender-500);
  color: white;
  border-radius: var(--radius-sm);
}


/* Habit rows - defined above for sticky behavior */
.habit-row {
  padding: var(--space-xs) 0;
  border-bottom: 1px solid var(--gray-100);
}

.habit-row:last-child {
  border-bottom: none;
}

.habit-info {
  width: 120px;
  min-width: 120px;
  flex-shrink: 0;
  padding-right: var(--space-sm);
  /* sticky is defined above */
}

.habit-name {
  font-size: 0.8125rem;
  color: var(--text-primary);
  line-height: 1.3;
  cursor: help;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.habit-checkboxes {
  display: flex;
  gap: 2px;
  position: relative;
  z-index: 2;
}

.habit-checkbox {
  width: 28px;
  height: 28px;
  border: 2px solid var(--gray-300);
  border-radius: var(--radius-sm);
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  flex-shrink: 0;
  padding: 0;
  margin: 0;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  -webkit-appearance: none;
  appearance: none;
  position: relative;
  z-index: 1;
  line-height: 1;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
}

.habit-checkbox:hover:not(:disabled) {
  border-color: var(--lavender-400);
  background: var(--lavender-50);
}

.habit-checkbox.checked {
  background: var(--lavender-500);
  border-color: var(--lavender-500);
}

.habit-checkbox.checked .check-icon {
  color: white;
  font-size: 0.875rem;
  font-weight: 700;
}

.habit-checkbox.today {
  border-color: var(--lavender-500);
  box-shadow: 0 0 0 2px rgba(159, 122, 234, 0.2);
}


.habit-checkbox:active:not(:disabled) {
  transform: scale(0.9);
}

/* Mobile touch improvements */
@media (max-width: 640px) {
  .habit-checkbox {
    width: 32px;
    height: 32px;
    min-width: 32px;
    min-height: 32px;
  }

  .day-number {
    width: 32px;
  }

  .habit-row {
    touch-action: pan-x;
    -webkit-user-select: none;
    user-select: none;
  }

  .habit-checkboxes {
    touch-action: pan-x;
  }

  .category-content {
    touch-action: pan-x pan-y;
  }
}

/* Weekly Bonuses */
.bonuses-section {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  border: 2px solid var(--lavender-100);
}

.bonuses-section .section-header,
.goals-section .section-header {
  background: none;
  padding: 0;
  min-height: auto;
  margin-bottom: var(--space-sm);
}

.bonuses-section .section-title,
.goals-section .section-title {
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.section-emoji {
  margin-right: var(--space-xs);
}

.bonus-points {
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--text-secondary);
  margin-left: var(--space-xs);
}

.bonuses-grid {
  margin-top: var(--space-md);
}

.bonus-header {
  display: flex;
  margin-bottom: var(--space-sm);
}

.bonus-name-space {
  flex: 1;
}

.week-labels {
  display: flex;
  gap: var(--space-sm);
}

.week-label {
  width: 40px;
  text-align: center;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.bonus-row {
  display: flex;
  align-items: center;
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--gray-100);
}

.bonus-row:last-child {
  border-bottom: none;
}

.bonus-info {
  flex: 1;
  padding-right: var(--space-md);
}

.bonus-name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary);
}

.bonus-desc {
  font-size: 0.6875rem;
  color: var(--text-secondary);
  margin-top: 2px;
}

.bonus-checkboxes {
  display: flex;
  gap: var(--space-sm);
}

.bonus-checkbox {
  width: 40px;
  height: 32px;
  border: 2px solid var(--gray-300);
  border-radius: var(--radius-md);
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  padding: 0;
  margin: 0;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  -webkit-appearance: none;
  appearance: none;
}

.bonus-checkbox:hover:not(:disabled) {
  border-color: var(--lavender-400);
  background: var(--lavender-50);
}

.bonus-checkbox.checked {
  background: var(--lavender-500);
  border-color: var(--lavender-500);
}

.bonus-checkbox.checked .check-icon {
  color: white;
  font-weight: 700;
}

.bonus-checkbox.current {
  border-color: var(--lavender-500);
  box-shadow: 0 0 0 2px rgba(159, 122, 234, 0.2);
}


/* End of Month Goals */
.goals-section {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  border: 2px solid #FFD700;
  margin-bottom: var(--space-xl);
}

.goals-list {
  margin-top: var(--space-md);
}

.goal-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--gray-100);
}

.goal-row:last-child {
  border-bottom: none;
}

.goal-checkbox {
  width: 48px;
  height: 48px;
  border: 3px solid #FFD700;
  border-radius: var(--radius-lg);
  background: #FFFBEB;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  flex-shrink: 0;
  padding: 0;
  margin: 0;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  -webkit-appearance: none;
  appearance: none;
}

.goal-checkbox:hover:not(:disabled) {
  background: #FEF3C7;
}

.goal-checkbox.checked {
  background: #FFD700;
  border-color: #F59E0B;
}

.goal-checkbox.checked .check-icon {
  color: white;
  font-size: 1.25rem;
  font-weight: 700;
}


.goal-info {
  flex: 1;
}

.goal-name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary);
}

.goal-desc {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 4px;
}

</style>

<style>
/* Dark mode */
[data-theme="dark"] .event-banner {
  background-color: #5B21B6 !important;
  box-shadow: 0 4px 16px rgba(139, 92, 246, 0.3) !important;
}

[data-theme="dark"] .banner-title {
  color: #F5F3FF !important;
}

[data-theme="dark"] .banner-subtitle {
  color: #DDD6FE !important;
}

[data-theme="dark"] .banner-countdown {
  background: rgba(255, 255, 255, 0.1) !important;
  color: #E9D5FF !important;
}

[data-theme="dark"] .banner-countdown.complete {
  background: rgba(16, 185, 129, 0.2) !important;
  color: #6EE7B7 !important;
}

[data-theme="dark"] .stats-panel {
  background: var(--bg-card) !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .progress-bar {
  background: #2D2640 !important;
}

[data-theme="dark"] .stats-row {
  border-top-color: #3D3456 !important;
}

[data-theme="dark"] .stat-divider {
  background: #3D3456 !important;
}

[data-theme="dark"] .day-badge {
  background: #2D2640 !important;
  color: #A78BFA !important;
}

[data-theme="dark"] .category-section {
  background: var(--bg-card) !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .category-header {
  background: linear-gradient(135deg, #3D2E5C 0%, #4C3D6E 100%) !important;
}

[data-theme="dark"] .category-header:hover {
  background: linear-gradient(135deg, #4C3D6E 0%, #5D4E7F 100%) !important;
}

[data-theme="dark"] .category-content {
  background: var(--bg-card) !important;
}

[data-theme="dark"] .days-header {
  background: var(--bg-card) !important;
}

[data-theme="dark"] .habit-name-space,
[data-theme="dark"] .habit-info {
  background: var(--bg-card) !important;
}

[data-theme="dark"] .habit-row {
  border-bottom-color: #3D3456 !important;
}

[data-theme="dark"] .habit-checkbox {
  background: #2D2640 !important;
  border-color: #4D4366 !important;
}

[data-theme="dark"] .habit-checkbox:hover:not(:disabled) {
  background: #3D3456 !important;
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .habit-checkbox.checked {
  background: #8B5CF6 !important;
  border-color: #8B5CF6 !important;
}


[data-theme="dark"] .bonuses-section {
  background: var(--bg-card) !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .bonus-row {
  border-bottom-color: #3D3456 !important;
}

[data-theme="dark"] .bonus-checkbox {
  background: #2D2640 !important;
  border-color: #4D4366 !important;
}

[data-theme="dark"] .bonus-checkbox:hover:not(:disabled) {
  background: #3D3456 !important;
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .bonus-checkbox.checked {
  background: #8B5CF6 !important;
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .goals-section {
  background: var(--bg-card) !important;
  border-color: #B8860B !important;
}

[data-theme="dark"] .goal-row {
  border-bottom-color: #3D3456 !important;
}

[data-theme="dark"] .goal-checkbox {
  background: #3D3456 !important;
  border-color: #B8860B !important;
}

[data-theme="dark"] .goal-checkbox:hover:not(:disabled) {
  background: #4D4366 !important;
}

[data-theme="dark"] .goal-checkbox.checked {
  background: #B8860B !important;
  border-color: #8B6914 !important;
}

</style>
