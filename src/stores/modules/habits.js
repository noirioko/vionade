// Habits module - 30-day habit tracker
import { state } from '../core'

export function toggleHabitCompletion(habitId, day) {
  const key = `${habitId}-${day}`
  const newCompletions = { ...state.habits.completions }

  if (newCompletions[key]) {
    delete newCompletions[key]
  } else {
    newCompletions[key] = new Date().toISOString()
  }

  // Trigger reactivity by reassigning the whole habits object
  state.habits = {
    ...state.habits,
    completions: newCompletions
  }
}

export function toggleWeeklyBonus(bonusId, week) {
  const key = `${bonusId}-${week}`
  const newWeeklyBonuses = { ...state.habits.weeklyBonuses }

  if (newWeeklyBonuses[key]) {
    delete newWeeklyBonuses[key]
  } else {
    newWeeklyBonuses[key] = new Date().toISOString()
  }

  // Trigger reactivity by reassigning the whole habits object
  state.habits = {
    ...state.habits,
    weeklyBonuses: newWeeklyBonuses
  }
}

export function toggleEndOfMonthGoal(goalId) {
  const key = `${goalId}`
  const newEndOfMonthGoals = { ...state.habits.endOfMonthGoals }

  if (newEndOfMonthGoals[key]) {
    delete newEndOfMonthGoals[key]
  } else {
    newEndOfMonthGoals[key] = new Date().toISOString()
  }

  // Trigger reactivity by reassigning the whole habits object
  state.habits = {
    ...state.habits,
    endOfMonthGoals: newEndOfMonthGoals
  }
}

export function isHabitCompleted(habitId, day) {
  return !!state.habits.completions[`${habitId}-${day}`]
}

export function isWeeklyBonusCompleted(bonusId, week) {
  return !!state.habits.weeklyBonuses[`${bonusId}-${week}`]
}

export function isEndOfMonthGoalCompleted(goalId) {
  return !!state.habits.endOfMonthGoals[`${goalId}`]
}
