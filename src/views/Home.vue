<script setup>
import { useFinanceStore } from '../stores'
import { getCurrentChallenge } from '../data/habitChallenges'

const store = useFinanceStore()
const habitChallenge = getCurrentChallenge()

const features = [
  { icon: '💰', label: 'Finance', route: '/finance', color: '#10B981' },
  { icon: '🎬', label: 'Media', route: '/media', color: '#F59E0B' },
  { icon: '💗', label: 'Wellness', route: '/wellness', color: '#EC4899' },
  { icon: '🔐', label: 'Passwords', route: '/passwords', color: '#6366F1' },
  { icon: '🍋', label: 'Vio Pass', route: '/viopass', color: '#FBBF24' },
  { icon: '🧺', label: 'Laundry', route: '/laundry', color: '#38BDF8' },
  { icon: '🐱', label: 'Pets', route: '/pets', color: '#A3E635' },
  { icon: '🎁', label: 'Collections', route: '/collections', color: '#F97316' },
  { icon: '👗', label: 'Wardrobe', route: '/wardrobe', color: '#EC4899' },
  { icon: '🔄', label: 'Subscriptions', route: '/subscriptions', color: '#8B5CF6' },
  { icon: '🛒', label: 'Shopping', route: '/shopping', color: '#22C55E' },
  { icon: '⚙️', label: 'Settings', route: '/settings', color: '#94A3B8' },
]
</script>

<template>
  <div class="page">
    <!-- Standard Header -->
    <div class="page-header">
      <img src="/images/vio-logo.png" alt="Vionade" class="page-header-logo" />
    </div>

    <!-- Welcome Section with Vio on RIGHT -->
    <div class="welcome-section section">
      <div class="welcome-content">
        <p class="welcome-greeting">What would you like to do?</p>
        <div class="welcome-buttons">
          <RouterLink to="/finance" class="welcome-btn">
            <span>💰</span> Finance
          </RouterLink>
          <RouterLink to="/viopass" class="welcome-btn welcome-btn-vio">
            <span>🍋</span> Vio Pass
          </RouterLink>
        </div>
      </div>
      <img src="/images/vio_stand1.png" alt="Vio" class="welcome-vio" />
    </div>

    <!-- Habits Banner (links to Wellness hub) -->
    <RouterLink to="/wellness?tab=habits" class="habits-banner-link">
      <div
        class="habits-banner"
        :class="{ 'february-theme': habitChallenge.id?.includes('february') }"
        :style="habitChallenge.bannerBg ? { backgroundImage: `url(${habitChallenge.bannerBg})` } : {}"
      >
        <div class="habits-banner-content">
          <img
            v-if="habitChallenge.bannerIcon"
            :src="habitChallenge.bannerIcon"
            alt=""
            class="habits-banner-icon"
          />
          <div class="habits-banner-text">
            <div class="habits-banner-title">{{ habitChallenge.name }}</div>
            <div class="habits-banner-subtitle">{{ habitChallenge.subtitle }}</div>
          </div>
        </div>
        <img
          v-if="habitChallenge.bannerChar"
          :src="habitChallenge.bannerChar"
          alt=""
          class="habits-banner-char"
        />
      </div>
    </RouterLink>

    <!-- Icon Grid -->
    <div class="icon-grid">
      <RouterLink
        v-for="feature in features"
        :key="feature.route"
        :to="feature.route"
        class="icon-card"
      >
        <div class="icon-emoji" :style="{ background: feature.color + '20' }">
          {{ feature.icon }}
        </div>
        <span class="icon-label">{{ feature.label }}</span>
      </RouterLink>
    </div>

    <!-- Quick Stats -->
    <div class="quick-stats">
      <div class="stat-card">
        <span class="stat-label">Balance</span>
        <span class="stat-value" :class="store.totalBalance.value >= 0 ? 'positive' : 'negative'">
          {{ store.formatCurrency(store.totalBalance.value) }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Welcome Section */
.welcome-section {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  padding-right: 0;
  background: linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%);
  border-radius: var(--radius-xl);
  border: 2px solid #7DD3FC;
  overflow: hidden;
}

.welcome-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.welcome-greeting {
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 700;
  color: #0369A1;
  margin: 0;
}

.welcome-buttons {
  display: flex;
  gap: var(--space-sm);
}

.welcome-btn {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-md);
  background: white;
  border-radius: var(--radius-full);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 600;
  color: #0369A1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.15s;
}

.welcome-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.welcome-btn-vio {
  background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
  color: #92400E;
}

.welcome-vio {
  height: 300px;
  width: auto;
  flex-shrink: 0;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
  animation: gentle-bounce 2s ease-in-out infinite;
  align-self: flex-end;
  margin-bottom: -150px;
}

@keyframes gentle-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

/* Habits Banner */
.habits-banner-link {
  display: block;
  text-decoration: none;
  margin-bottom: var(--space-md);
}

.habits-banner {
  position: relative;
  display: flex;
  align-items: stretch;
  border-radius: var(--radius-xl);
  overflow: hidden;
  background-color: #F59E0B;
  background-size: cover;
  background-position: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  min-height: 140px;
  transition: transform 0.15s, box-shadow 0.15s;
}

.habits-banner:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}

.habits-banner-content {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: linear-gradient(90deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 60%, transparent 100%);
}

.habits-banner-icon {
  width: 100px;
  height: 100px;
  object-fit: contain;
  flex-shrink: 0;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
}

.habits-banner-text {
  flex: 1;
}

.habits-banner-title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.habits-banner-subtitle {
  font-size: 0.9375rem;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 4px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.habits-banner-char {
  height: 140px;
  width: auto;
  object-fit: contain;
  object-position: bottom right;
  flex-shrink: 0;
  margin-right: var(--space-md);
}

/* February pink theme */
.habits-banner.february-theme {
  background-color: #EC4899;
}

.habits-banner.february-theme .habits-banner-content {
  background: linear-gradient(90deg, rgba(236,72,153,0.6) 0%, rgba(219,39,119,0.4) 40%, rgba(244,114,182,0.2) 70%, transparent 100%);
}

/* Media Banner */
.media-banner-link {
  display: block;
  text-decoration: none;
  margin-bottom: var(--space-lg);
}

.media-banner {
  position: relative;
  display: flex;
  align-items: center;
  border-radius: var(--radius-xl);
  overflow: hidden;
  background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 50%, #C4B5FD 100%);
  box-shadow: 0 4px 16px rgba(139, 92, 246, 0.3);
  min-height: 120px;
  transition: transform 0.15s, box-shadow 0.15s;
}

.media-banner:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
}

.media-banner-content {
  flex: 1;
  padding: var(--space-lg);
}

.media-banner-title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.media-banner-subtitle {
  font-size: 0.9375rem;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 4px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.media-banner-vio {
  height: 180px;
  width: auto;
  flex-shrink: 0;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
  animation: gentle-bounce 2s ease-in-out infinite;
  margin-bottom: -60px;
}

@media (max-width: 480px) {
  .welcome-vio {
    height: 240px;
    margin-bottom: -110px;
  }

  .welcome-greeting {
    font-size: 1rem;
  }

  .habits-banner-icon {
    width: 72px;
    height: 72px;
  }

  .habits-banner-char {
    height: 100px;
    margin-right: var(--space-sm);
  }

  .habits-banner-title,
  .media-banner-title {
    font-size: 1.25rem;
  }

  .media-banner-vio {
    height: 140px;
    margin-bottom: -40px;
  }
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}

@media (min-width: 400px) {
  .icon-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-sm);
  }
}

.icon-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--white);
  border-radius: var(--radius-lg);
  border: 2px solid var(--lavender-100);
  text-decoration: none;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.icon-card:hover {
  transform: translateY(-2px);
  border-color: var(--lavender-300);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.icon-card:active {
  transform: translateY(0);
}

.icon-emoji {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  border-radius: var(--radius-md);
}

.icon-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
}

.quick-stats {
  display: flex;
  gap: var(--space-sm);
}

.stat-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-md);
  background: var(--white);
  border-radius: var(--radius-lg);
  border: 2px solid var(--lavender-100);
}

.stat-label {
  font-size: 0.6875rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
}

.stat-value.positive {
  color: var(--income-color);
}

.stat-value.negative {
  color: var(--expense-color);
}
</style>

<style>
/* Dark mode */
[data-theme="dark"] .welcome-section {
  background: linear-gradient(135deg, #1E1B4B 0%, #312E81 100%) !important;
  border-color: #4C1D95 !important;
}

[data-theme="dark"] .welcome-greeting {
  color: #C4B5FD !important;
}

[data-theme="dark"] .welcome-btn {
  background: #1A1625 !important;
  color: #C4B5FD !important;
}

[data-theme="dark"] .welcome-btn-vio {
  background: linear-gradient(135deg, #3D2E5C 0%, #4C3D6E 100%) !important;
  color: #FDE68A !important;
}

[data-theme="dark"] .icon-card {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .icon-card:hover {
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .stat-card {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

/* Habits Banner dark mode */
[data-theme="dark"] .habits-banner {
  background-color: #5B21B6 !important;
  box-shadow: 0 4px 16px rgba(139, 92, 246, 0.3) !important;
}

[data-theme="dark"] .habits-banner-title {
  color: #F5F3FF !important;
}

[data-theme="dark"] .habits-banner-subtitle {
  color: #DDD6FE !important;
}

/* February theme dark mode */
[data-theme="dark"] .habits-banner.february-theme {
  background-color: #9D174D !important;
  box-shadow: 0 4px 16px rgba(236, 72, 153, 0.3) !important;
}

[data-theme="dark"] .habits-banner.february-theme .habits-banner-content {
  background: linear-gradient(90deg, rgba(157,23,77,0.7) 0%, rgba(190,24,93,0.5) 40%, rgba(236,72,153,0.3) 70%, transparent 100%) !important;
}

/* Media Banner dark mode */
[data-theme="dark"] .media-banner {
  background: linear-gradient(135deg, #4C1D95 0%, #6D28D9 50%, #7C3AED 100%) !important;
}
</style>
