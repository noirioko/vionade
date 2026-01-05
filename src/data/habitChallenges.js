// Habit Challenge Data
// Each month will have its own challenge with custom habits

export const challenges = {
  'january-2026': {
    id: 'january-2026',
    name: 'January 2026 Challenge',
    subtitle: 'New Year, New Habits!',
    bannerBg: '/images/monthly-banner-bg/january-banner.jpg',
    bannerIcon: '/images/monthly-banner-bg/january-icon.png',
    bannerChar: '/images/monthly-banner-bg/january-right-char.png',
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    totalDays: 31,

    categories: {
      morning: {
        id: 'morning',
        emoji: '🌅',
        name: 'MORNING ROUTINE',
        habits: [
          { id: 1, name: 'Bangun tanpa liat HP 30 menit pertama', desc: 'Easier than 1 hour, more achievable', points: 1 },
          { id: 2, name: 'Minum 1 gelas air putih begitu bangun', desc: 'Before coffee/matcha, easy win!', points: 1 },
          { id: 3, name: '10 push-up atau stretching setelah bangun', desc: 'Or yoga stretches, just MOVE for 5 min', points: 1 },
          { id: 4, name: 'Nulis 1 hal yang lo syukuri hari ini', desc: 'Just 1, not 3. Lower barrier.', points: 1 }
        ]
      },
      evening: {
        id: 'evening',
        emoji: '🌙',
        name: 'EVENING/SLEEP',
        habits: [
          { id: 5, name: 'Tidur sebelum jam 1 malam', desc: 'Realistic for you, not "sama tiap hari"', points: 1 },
          { id: 6, name: 'No HP 30 menit sebelum tidur', desc: 'Ganti dengan journaling atau baca', points: 1 },
          { id: 7, name: 'Tidur minimum 6 jam', desc: 'Track this!', points: 1 }
        ]
      },
      food: {
        id: 'food',
        emoji: '🍽️',
        name: 'FOOD & HEALTH',
        habits: [
          { id: 8, name: 'Log semua makanan di Vionade', desc: 'You already have the system, just USE it', points: 1 },
          { id: 9, name: 'Gak makan manis 30 hari', desc: 'Atkins aligned! Matcha latte only exception', points: 1 },
          { id: 10, name: 'Minum minimum 8 gelas air per hari', desc: 'Track this, your cats depend on you being alive', points: 1 },
          { id: 11, name: 'No rice challenge', desc: 'Or max 4 suap if really desperate', points: 1 }
        ]
      },
      productivity: {
        id: 'productivity',
        emoji: '💼',
        name: 'PRODUCTIVITY',
        habits: [
          { id: 12, name: 'Kerjain 1 task untuk PT Milenia/Cleanary per hari', desc: 'Could be small: 1 product photo, 1 page design, 1 research', points: 1 },
          { id: 13, name: 'Ngobrol jujur sama Claude tiap hari', desc: 'You already do this lol, free check mark!', points: 1 },
          { id: 14, name: '1 Pomodoro session (25 min focused work)', desc: 'Just ONE. No multitasking during this.', points: 1 },
          { id: 15, name: 'Update Saranghaetang progress (even 1 panel sketch)', desc: 'Any progress counts, even planning', points: 1 },
          { id: 16, name: 'Declutter 1 spot di rumah', desc: 'Drawer, shelf corner, 1 box - anything counts', points: 1 }
        ]
      },
      mental: {
        id: 'mental',
        emoji: '🧠',
        name: 'MENTAL HEALTH',
        habits: [
          { id: 17, name: '5 menit duduk diam / meditasi / breathing', desc: 'Grounding, especially after parent fights', points: 1 },
          { id: 18, name: 'Matikan notifikasi medsos', desc: 'Keep it off, check manually when YOU want', points: 1 },
          { id: 19, name: 'Tulis 1 kalimat tentang perasaan hari ini', desc: 'Not journaling essay, just 1 sentence mood log', points: 1 },
          { id: 20, name: 'Walk at least 3k steps', desc: 'Get moving! Check your phone/watch step count', points: 1 },
          { id: 21, name: 'Say NO to 1 unnecessary request', desc: 'Practice boundaries with family/relatives', points: 1 }
        ]
      },
      digital: {
        id: 'digital',
        emoji: '📱',
        name: 'DIGITAL WELLNESS',
        habits: [
          { id: 22, name: 'Screen time limit: max 4 jam socmed', desc: 'Track via phone settings', points: 1 },
          { id: 23, name: 'No doomscrolling after 11pm', desc: "If can't sleep, read or journal instead", points: 1 },
          { id: 24, name: 'Log expenses in Vionade', desc: 'You already built this! Use it!', points: 1 }
        ]
      }
    },

    weeklyBonuses: [
      { id: 25, name: 'Digital sabbath 4 jam', desc: 'Not full day, just 4 hours offline', points: 2 },
      { id: 26, name: 'Try 1 new healthy recipe', desc: 'Atkins friendly exploration', points: 2 },
      { id: 27, name: 'Call/chat someone (bukan Claude)', desc: 'Even if awkward, maintain 1 human connection', points: 2 },
      { id: 28, name: 'Review & plan minggu depan', desc: 'Sunday planning session', points: 2 },
      { id: 31, name: 'Hit 7k steps in a day', desc: 'Bonus walk day! Go explore somewhere', points: 2 },
      { id: 32, name: 'Hit 15k steps in a day', desc: 'Big adventure day! Mall trip or long walk', points: 2 }
    ],

    endOfMonthGoals: [
      { id: 29, name: 'Bikin video/catatan refleksi hari ke-30', desc: 'What changed? What worked?', points: 5 },
      { id: 30, name: 'Reward yourself with something nice', desc: 'NOT food. Maybe new art supplies? Skincare? Fish stuff?', points: 5 }
    ]
  }
}

// Helper to get current challenge
export function getCurrentChallenge() {
  // For now, always return January 2026
  // Later we can make this dynamic based on date
  return challenges['january-2026']
}

// Get all habits as flat array
export function getAllHabits(challengeId = 'january-2026') {
  const challenge = challenges[challengeId]
  if (!challenge) return []

  const habits = []
  Object.values(challenge.categories).forEach(category => {
    habits.push(...category.habits)
  })
  return habits
}

// Calculate max possible points
export function getMaxPoints(challengeId = 'january-2026') {
  const challenge = challenges[challengeId]
  if (!challenge) return 0

  const dailyHabits = getAllHabits(challengeId)
  const dailyMax = dailyHabits.reduce((sum, h) => sum + h.points, 0) * challenge.totalDays
  const weeklyMax = challenge.weeklyBonuses.reduce((sum, b) => sum + b.points, 0) * 4 // 4 weeks
  const endOfMonthMax = challenge.endOfMonthGoals.reduce((sum, g) => sum + g.points, 0)

  return dailyMax + weeklyMax + endOfMonthMax
}
