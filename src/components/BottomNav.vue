<script setup>
import { ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()
const showMore = ref(false)

// Check if current route is in the "more" menu
const isMoreActive = () => {
  const moreRoutes = ['/media', '/habits', '/passwords', '/viopass', '/laundry', '/pets', '/aquarium', '/collections', '/wardrobe', '/subscriptions', '/settings']
  return moreRoutes.includes(route.path)
}

function toggleMore() {
  showMore.value = !showMore.value
}

function closeMore() {
  showMore.value = false
}
</script>

<template>
  <!-- More Menu Overlay (mobile only) -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="showMore" class="more-overlay" @click="closeMore"></div>
    </Transition>
    <Transition name="slide-up">
      <div v-if="showMore" class="more-sheet">
        <div class="more-handle" @click="closeMore"></div>
        <div class="more-grid">
          <RouterLink to="/media" class="more-item" @click="closeMore">
            <span class="more-item-icon">🎬</span>
            <span class="more-item-label">Media</span>
          </RouterLink>
          <RouterLink to="/habits" class="more-item" @click="closeMore">
            <span class="more-item-icon">✨</span>
            <span class="more-item-label">Habits</span>
          </RouterLink>
          <RouterLink to="/passwords" class="more-item" @click="closeMore">
            <span class="more-item-icon">🔐</span>
            <span class="more-item-label">Passwords</span>
          </RouterLink>
          <RouterLink to="/viopass" class="more-item" @click="closeMore">
            <span class="more-item-icon">🍋</span>
            <span class="more-item-label">Vio Pass</span>
          </RouterLink>
          <RouterLink to="/laundry" class="more-item" @click="closeMore">
            <span class="more-item-icon">🧺</span>
            <span class="more-item-label">Laundry</span>
          </RouterLink>
          <RouterLink to="/pets" class="more-item" @click="closeMore">
            <span class="more-item-icon">🐱</span>
            <span class="more-item-label">Pets</span>
          </RouterLink>
          <RouterLink to="/aquarium" class="more-item" @click="closeMore">
            <span class="more-item-icon">🐟</span>
            <span class="more-item-label">Aquarium</span>
          </RouterLink>
          <RouterLink to="/collections" class="more-item" @click="closeMore">
            <span class="more-item-icon">🎁</span>
            <span class="more-item-label">Collections</span>
          </RouterLink>
          <RouterLink to="/wardrobe" class="more-item" @click="closeMore">
            <span class="more-item-icon">👗</span>
            <span class="more-item-label">Wardrobe</span>
          </RouterLink>
          <RouterLink to="/subscriptions" class="more-item" @click="closeMore">
            <span class="more-item-icon">🔄</span>
            <span class="more-item-label">Subscriptions</span>
          </RouterLink>
          <RouterLink to="/settings" class="more-item" @click="closeMore">
            <span class="more-item-icon">⚙️</span>
            <span class="more-item-label">Settings</span>
          </RouterLink>
        </div>
      </div>
    </Transition>
  </Teleport>

  <nav class="bottom-nav">
    <RouterLink to="/" class="nav-item">
      <span class="nav-item-icon">🏠</span>
      <span>Home</span>
    </RouterLink>

    <RouterLink to="/finance" class="nav-item">
      <span class="nav-item-icon">💰</span>
      <span>Finance</span>
    </RouterLink>

    <RouterLink to="/wallets" class="nav-item">
      <span class="nav-item-icon">👛</span>
      <span>Wallets</span>
    </RouterLink>

    <RouterLink to="/history" class="nav-item">
      <span class="nav-item-icon">📋</span>
      <span>History</span>
    </RouterLink>

    <RouterLink to="/wishlist" class="nav-item">
      <span class="nav-item-icon">🎁</span>
      <span>Wishlist</span>
    </RouterLink>

    <!-- Desktop only items -->
    <RouterLink to="/media" class="nav-item desktop-only">
      <span class="nav-item-icon">🎬</span>
      <span>Media</span>
    </RouterLink>

    <RouterLink to="/habits" class="nav-item desktop-only">
      <span class="nav-item-icon">✨</span>
      <span>Habits</span>
    </RouterLink>

    <RouterLink to="/passwords" class="nav-item desktop-only">
      <span class="nav-item-icon">🔐</span>
      <span>Passwords</span>
    </RouterLink>

    <RouterLink to="/viopass" class="nav-item desktop-only">
      <span class="nav-item-icon">🍋</span>
      <span>Vio Pass</span>
    </RouterLink>

    <RouterLink to="/laundry" class="nav-item desktop-only">
      <span class="nav-item-icon">🧺</span>
      <span>Laundry</span>
    </RouterLink>

    <RouterLink to="/pets" class="nav-item desktop-only">
      <span class="nav-item-icon">🐱</span>
      <span>Pets</span>
    </RouterLink>

    <RouterLink to="/aquarium" class="nav-item desktop-only">
      <span class="nav-item-icon">🐟</span>
      <span>Aquarium</span>
    </RouterLink>

    <RouterLink to="/wardrobe" class="nav-item desktop-only">
      <span class="nav-item-icon">👗</span>
      <span>Wardrobe</span>
    </RouterLink>

    <RouterLink to="/subscriptions" class="nav-item desktop-only">
      <span class="nav-item-icon">🔄</span>
      <span>Subscriptions</span>
    </RouterLink>

    <RouterLink to="/settings" class="nav-item desktop-only">
      <span class="nav-item-icon">⚙️</span>
      <span>Settings</span>
    </RouterLink>

    <!-- Mobile only: More button -->
    <button
      class="nav-item nav-more mobile-only"
      :class="{ active: isMoreActive() || showMore }"
      @click="toggleMore"
    >
      <span class="nav-item-icon">{{ showMore ? '✕' : '•••' }}</span>
      <span>More</span>
    </button>
  </nav>
</template>

<style scoped>
/* Responsive: show/hide items based on screen size */
.desktop-only {
  display: none;
}

.mobile-only {
  display: flex;
}

/* Desktop: show all items, hide "More" button */
@media (min-width: 640px) {
  .desktop-only {
    display: flex;
  }

  .mobile-only {
    display: none;
  }
}

.nav-more {
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
}

.more-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 998;
}

.more-sheet {
  position: fixed;
  bottom: calc(70px + env(safe-area-inset-bottom, 0));
  left: 0;
  right: 0;
  background: var(--bg-card);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  padding: var(--space-sm) var(--space-md) var(--space-lg);
  z-index: 999;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
}

.more-handle {
  width: 40px;
  height: 4px;
  background: var(--gray-300);
  border-radius: var(--radius-full);
  margin: 0 auto var(--space-md);
  cursor: pointer;
}

.more-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-sm);
}

.more-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-md);
  border-radius: var(--radius-lg);
  background: var(--bg-primary);
  text-decoration: none;
  transition: all var(--transition-fast);
}

.more-item:hover,
.more-item.router-link-active {
  background: var(--lavender-100);
}

.more-item-icon {
  font-size: 1.75rem;
}

.more-item-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-primary);
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}
</style>

<style>
/* Dark mode for more sheet */
[data-theme="dark"] .more-sheet {
  background: var(--bg-card) !important;
}

[data-theme="dark"] .more-item {
  background: var(--bg-primary) !important;
}

[data-theme="dark"] .more-item:hover,
[data-theme="dark"] .more-item.router-link-active {
  background: rgba(139, 92, 246, 0.15) !important;
}

[data-theme="dark"] .more-handle {
  background: #3D3456 !important;
}
</style>
