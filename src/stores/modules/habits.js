// Habits module - 30-day habit tracker
import { state } from '../core'

export function toggleHabitCompletion(habitId, day) {
  const key = `${habitId}-${day}`
  if (state.habits.completions[key]) {
    delete state.habits.completions[key]
    state.habits.completions = { ...state.habits.completions }
  } else {
    state.habits.completions[key] = new Date().toISOString()
  }
}

export function toggleWeeklyBonus(bonusId, week) {
  const key = `${bonusId}-${week}`
  if (state.habits.weeklyBonuses[key]) {
    delete state.habits.weeklyBonuses[key]
    state.habits.weeklyBonuses = { ...state.habits.weeklyBonuses }
  } else {
    state.habits.weeklyBonuses[key] = new Date().toISOString()
  }
}

export function toggleEndOfMonthGoal(goalId) {
  const key = `${goalId}`
  if (state.habits.endOfMonthGoals[key]) {
    delete state.habits.endOfMonthGoals[key]
    state.habits.endOfMonthGoals = { ...state.habits.endOfMonthGoals }
  } else {
    state.habits.endOfMonthGoals[key] = new Date().toISOString()
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
