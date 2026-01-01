// VioPass module - Daily check-in system
import { state } from '../core'

export const SPENDING_REACTIONS = {
  fnb: { nice: true, message: "Food is important! Just don't overdo it~" },
  groceries: { nice: true, message: "Groceries are essential! Good job being responsible!" },
  bills: { nice: true, message: "Paying bills on time! Vio is proud of you!" },
  pets: { nice: true, message: "Taking care of your pets! They're family!" },
  commissions: { nice: true, message: "Supporting artists! That's so nice of you!" },
  travel: { neutral: true, message: "Traveling can be good for the soul..." },
  hotel: { neutral: true, message: "Sometimes you need a place to stay!" },
  clothes: { bad: true, message: "Hmm... Did you really need new clothes?" },
  other: { bad: true, message: "What did you buy? Vio is curious..." },
}

function getDateString(date = new Date()) {
  return date.toISOString().split('T')[0]
}

export function getTodayCheckin() {
  const today = getDateString()
  return state.vioPass.checkins.find(c => c.date === today)
}

export function hasCheckedInToday() {
  return !!getTodayCheckin()
}

export function performCheckin(didSpend, category = null, note = '') {
  const today = getDateString()

  if (hasCheckedInToday()) {
    return { success: false, message: "You already checked in today!" }
  }

  let vioReaction = 'happy'
  let vioMessage = "You didn't spend anything today! Amazing self-control!"

  if (didSpend) {
    const reaction = SPENDING_REACTIONS[category] || SPENDING_REACTIONS.other
    vioMessage = reaction.message
    if (reaction.nice) {
      vioReaction = 'okay'
    } else if (reaction.neutral) {
      vioReaction = 'thinking'
    } else {
      vioReaction = 'sad'
    }
  }

  state.vioPass.checkins.push({
    date: today,
    didSpend,
    category,
    note,
    vioReaction,
    vioMessage,
  })

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayString = getDateString(yesterday)

  if (state.vioPass.lastCheckinDate === yesterdayString) {
    state.vioPass.currentStreak += 1
  } else if (state.vioPass.lastCheckinDate !== today) {
    state.vioPass.currentStreak = 1
  }

  if (state.vioPass.currentStreak > state.vioPass.longestStreak) {
    state.vioPass.longestStreak = state.vioPass.currentStreak
  }

  state.vioPass.lastCheckinDate = today

  return {
    success: true,
    vioReaction,
    vioMessage,
    streak: state.vioPass.currentStreak,
  }
}

export function getVioMood() {
  const recentCheckins = state.vioPass.checkins.slice(-7)
  if (recentCheckins.length === 0) return 'neutral'

  const badSpending = recentCheckins.filter(c => c.vioReaction === 'sad').length
  const goodDays = recentCheckins.filter(c => !c.didSpend || c.vioReaction === 'okay').length

  if (badSpending >= 4) return 'worried'
  if (badSpending >= 2) return 'concerned'
  if (goodDays >= 5) return 'happy'
  return 'neutral'
}

export function getVioPassStats() {
  const totalCheckins = state.vioPass.checkins.length
  const noSpendDays = state.vioPass.checkins.filter(c => !c.didSpend).length
  const thisWeek = state.vioPass.checkins.filter(c => {
    const checkinDate = new Date(c.date)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return checkinDate >= weekAgo
  })

  return {
    totalCheckins,
    noSpendDays,
    currentStreak: state.vioPass.currentStreak,
    longestStreak: state.vioPass.longestStreak,
    thisWeekCheckins: thisWeek.length,
    thisWeekNoSpend: thisWeek.filter(c => !c.didSpend).length,
  }
}
