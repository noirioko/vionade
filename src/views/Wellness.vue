<script setup>
import { ref, computed, inject, onMounted, onUnmounted } from 'vue'
import { useFinanceStore } from '../stores'

// Tab Components
import WellnessHabits from '../components/wellness/WellnessHabits.vue'
import WellnessPain from '../components/wellness/WellnessPain.vue'
import WellnessNut from '../components/wellness/WellnessNut.vue'

const store = useFinanceStore()
const fabAction = inject('fabAction')

// Tab Management
const activeTab = ref('pain') // 'pain', 'nut', 'habits'

function selectTab(tab) {
  activeTab.value = tab
}

// Refs for FAB
const painRef = ref(null)
const nutRef = ref(null)

// Stats for sidebar
const wellnessStats = computed(() => {
  const today = new Date()
  const painLogsToday = store.painLogs.value.filter(l => {
    return new Date(l.date).toDateString() === today.toDateString()
  }).length
  const nutLogsToday = store.nutLogs.value.filter(l => {
    return new Date(l.date).toDateString() === today.toDateString()
  }).length

  return {
    painLogsToday,
    nutLogsToday,
    totalPainLogs: store.painLogs.value.length,
    totalNutLogs: store.nutLogs.value.length,
  }
})

// FAB behavior based on active tab
onMounted(() => {
  fabAction.value = () => {
    if (activeTab.value === 'pain' && painRef.value) {
      painRef.value.openAddModal()
    } else if (activeTab.value === 'nut' && nutRef.value) {
      nutRef.value.openAddModal()
    }
  }
})

onUnmounted(() => {
  fabAction.value = null
})
</script>

<template>
  <div class="page wellness-page media-page">
    <div class="page-header">
      <img src="/images/vio-logo.png" alt="Vionade" class="page-header-logo" />
    </div>

    <!-- Wellness Banner -->
    <div class="wellness-banner">
      <div class="wellness-banner-content">
        <div class="wellness-banner-title">Wellness Hub</div>
        <div class="wellness-banner-subtitle">Track habits, pain & more</div>
      </div>
      <img src="/images/vio_wellness_banner.png" alt="Vio" class="wellness-banner-vio" />
    </div>

    <!-- Desktop Layout Container -->
    <div class="wellness-layout">
      <!-- Desktop Sidebar -->
      <aside class="wellness-sidebar">
        <nav class="sidebar-nav">
          <button
            class="sidebar-item"
            :class="{ active: activeTab === 'pain' }"
            @click="selectTab('pain')"
          >
            <span class="sidebar-icon">🤕</span>
            <span class="sidebar-label">Pain Tracker</span>
            <span class="sidebar-count">{{ wellnessStats.painLogsToday }}</span>
          </button>
          <button
            class="sidebar-item"
            :class="{ active: activeTab === 'nut' }"
            @click="selectTab('nut')"
          >
            <span class="sidebar-icon">🥜</span>
            <span class="sidebar-label">Nut Tracker</span>
            <span class="sidebar-count">{{ wellnessStats.nutLogsToday }}</span>
          </button>
          <button
            class="sidebar-item"
            :class="{ active: activeTab === 'habits' }"
            @click="selectTab('habits')"
          >
            <span class="sidebar-icon">✅</span>
            <span class="sidebar-label">Habits</span>
          </button>
        </nav>

        <div class="sidebar-stats-card">
          <img src="/images/vio_happy.png" alt="Vio" class="sidebar-vio" />
          <div class="sidebar-stats-info">
            <div class="sidebar-stats-label">Total Nuts</div>
            <div class="sidebar-stats-number">{{ wellnessStats.totalNutLogs }}</div>
          </div>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="wellness-content">
        <!-- Mobile Tabs -->
        <div class="wellness-tabs mobile-only">
          <button
            class="wellness-tab"
            :class="{ active: activeTab === 'pain' }"
            @click="selectTab('pain')"
          >Pain</button>
          <button
            class="wellness-tab"
            :class="{ active: activeTab === 'nut' }"
            @click="selectTab('nut')"
          >Nut</button>
          <button
            class="wellness-tab"
            :class="{ active: activeTab === 'habits' }"
            @click="selectTab('habits')"
          >Habits</button>
        </div>

        <!-- Tab Content -->
        <WellnessPain
          v-if="activeTab === 'pain'"
          ref="painRef"
        />

        <WellnessNut
          v-if="activeTab === 'nut'"
          ref="nutRef"
        />

        <WellnessHabits v-if="activeTab === 'habits'" />
      </main>
    </div>
  </div>
</template>

<style scoped>
/* Wellness Banner */
.wellness-banner {
  position: relative;
  display: flex;
  align-items: center;
  background:
    linear-gradient(135deg, rgba(16, 185, 129, 0.5) 0%, rgba(52, 211, 153, 0.5) 50%, rgba(110, 231, 183, 0.5) 100%),
    url('/images/kawaii-bg.jpg') center center / cover no-repeat;
  border-radius: var(--radius-xl);
  overflow: hidden;
  min-height: 120px;
  margin-bottom: var(--space-md);
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
}

.wellness-banner-content {
  flex: 1;
  padding: var(--space-lg);
}

.wellness-banner-title {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.wellness-banner-subtitle {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 4px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.wellness-banner-vio {
  height: 180px;
  width: auto;
  flex-shrink: 0;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
  margin-bottom: -60px;
}

@media (max-width: 480px) {
  .wellness-banner-title {
    font-size: 1.5rem;
  }

  .wellness-banner-vio {
    height: 140px;
    margin-bottom: -40px;
  }
}

/* Layout */
.wellness-layout {
  display: block;
}

/* Desktop Sidebar - hidden on mobile */
.wellness-sidebar {
  display: none;
}

.wellness-content {
  width: 100%;
}

/* Mobile Tabs */
.wellness-tabs {
  display: flex;
  gap: var(--space-xs);
  margin-bottom: var(--space-md);
  background: var(--white);
  border-radius: var(--radius-lg);
  padding: var(--space-xs);
  border: 2px solid var(--lavender-100);
  overflow-x: auto;
}

.wellness-tab {
  flex: 1;
  padding: var(--space-sm) var(--space-md);
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.wellness-tab.active {
  background: var(--lavender-100);
  color: var(--lavender-700);
}

/* Mobile only class */
.mobile-only {
  display: flex;
}

/* Sidebar styles */
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--white);
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-lg);
  padding: var(--space-sm);
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.sidebar-item:hover {
  background: var(--lavender-50);
  color: var(--text-primary);
}

.sidebar-item.active {
  background: var(--lavender-100);
  color: var(--lavender-700);
  font-weight: 600;
}

.sidebar-icon {
  font-size: 1.125rem;
}

.sidebar-label {
  flex: 1;
}

.sidebar-count {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-tertiary);
  background: var(--lavender-50);
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.sidebar-item.active .sidebar-count {
  background: var(--lavender-200);
  color: var(--lavender-700);
}

/* Sidebar Stats Card */
.sidebar-stats-card {
  margin-top: var(--space-md);
  padding: var(--space-md);
  background: linear-gradient(135deg, #EC4899 0%, #F472B6 100%);
  border: 3px solid #DB2777;
  border-radius: var(--radius-lg);
  box-shadow: 4px 4px 0 rgba(219, 39, 119, 0.3);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.sidebar-vio {
  width: 50px;
  height: auto;
  flex-shrink: 0;
}

.sidebar-stats-info {
  flex: 1;
}

.sidebar-stats-label {
  font-size: 0.6875rem;
  color: rgba(255, 255, 255, 0.9);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sidebar-stats-number {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  color: white;
}

/* Desktop Styles (768px+) */
@media (min-width: 768px) {
  .mobile-only {
    display: none !important;
  }

  .wellness-layout {
    display: grid;
    grid-template-columns: 180px 1fr;
    gap: var(--space-md);
  }

  .wellness-sidebar {
    display: flex;
    flex-direction: column;
    position: sticky;
    top: var(--space-md);
    height: fit-content;
    max-height: calc(100vh - 200px);
  }
}

/* Large Desktop (1024px+) */
@media (min-width: 1024px) {
  .wellness-layout {
    grid-template-columns: 200px 1fr;
  }
}
</style>

<style>
/* Dark mode overrides */
[data-theme="dark"] .wellness-banner {
  background: linear-gradient(135deg, rgba(6, 95, 70, 0.7) 0%, rgba(16, 185, 129, 0.6) 50%, rgba(52, 211, 153, 0.5) 100%),
    url('/images/kawaii-bg.jpg') center center / cover no-repeat !important;
}

[data-theme="dark"] .wellness-tabs {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .wellness-tab.active {
  background: #2D2640 !important;
  color: #C4B5FD !important;
}

[data-theme="dark"] .sidebar-nav {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .sidebar-item:hover {
  background: #2D2640 !important;
}

[data-theme="dark"] .sidebar-item.active {
  background: #2D2640 !important;
  color: #C4B5FD !important;
}

[data-theme="dark"] .sidebar-stats-card {
  background: linear-gradient(135deg, #831843 0%, #9D174D 100%) !important;
  border-color: #BE185D !important;
}

[data-theme="dark"] .sidebar-count {
  background: #2D2640 !important;
  color: #9D8BC2 !important;
}

[data-theme="dark"] .sidebar-item.active .sidebar-count {
  background: #3D3456 !important;
  color: #C4B5FD !important;
}
</style>
