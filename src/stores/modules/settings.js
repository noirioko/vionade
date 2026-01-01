// Settings module
import { state } from '../core'

export function completeOnboarding() {
  state.settings.hasCompletedOnboarding = true
}

export function setMonthlyTargets(income, expense, savings) {
  state.settings.targets = {
    monthlyIncome: income || 0,
    monthlyExpense: expense || 0,
    monthlySavings: savings || 0,
  }
}

export function setLifetimeGoal(name, target) {
  state.settings.lifetimeGoal = {
    name: name || 'House Fund',
    target: target || 0,
  }
}

export function toggleTheme() {
  state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark'
  applyTheme()
}

export function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.settings.theme || 'light')
}
