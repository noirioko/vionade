<script setup>
import { useFinanceStore } from '../stores/finance'

const store = useFinanceStore()

const features = [
  { icon: '💰', label: 'Finance', route: '/finance', color: '#10B981' },
  { icon: '👛', label: 'Wallets', route: '/wallets', color: '#8B5CF6' },
  { icon: '📖', label: 'History', route: '/history', color: '#0EA5E9' },
  { icon: '🎁', label: 'Wishlist', route: '/wishlist', color: '#F472B6' },
  { icon: '🎬', label: 'Movies', route: '/movies', color: '#F59E0B' },
  { icon: '🍋', label: 'Vio Pass', route: '/viopass', color: '#FBBF24' },
  { icon: '🧺', label: 'Laundry', route: '/laundry', color: '#38BDF8' },
  { icon: '⚙️', label: 'Settings', route: '/settings', color: '#94A3B8' },
]
</script>

<template>
  <div class="home-page">
    <!-- Header with Vio -->
    <div class="home-header">
      <img src="/images/vio_right.png" alt="Vio" class="home-vio" />
      <div class="home-greeting">
        <h1 class="home-title">Vionade</h1>
        <p class="home-subtitle">What would you like to do?</p>
      </div>
    </div>

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
.home-page {
  min-height: 100vh;
  padding: var(--space-lg);
  padding-bottom: calc(var(--space-xl) + 80px);
  max-width: 480px;
  margin: 0 auto;
}

.home-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
  padding: var(--space-lg);
  background: linear-gradient(135deg, var(--lavender-100) 0%, var(--lavender-50) 100%);
  border-radius: var(--radius-xl);
  border: 2px solid var(--lavender-200);
}

.home-vio {
  width: 80px;
  height: auto;
}

.home-greeting {
  flex: 1;
}

.home-title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--lavender-600);
  margin: 0;
}

.home-subtitle {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
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
[data-theme="dark"] .home-header {
  background: linear-gradient(135deg, #2D2640 0%, #1A1625 100%) !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .home-title {
  color: #C4B5FD !important;
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
</style>
