<script setup>
import { ref, computed, defineExpose } from 'vue'
import { useFinanceStore } from '../../stores'
import { useToast } from '../../composables/useToast'

const store = useFinanceStore()
const toast = useToast()

// Modal state
const showAddModal = ref(false)
const editingVisit = ref(null)

// Form data
const form = ref({
  cafe: '',
  order: '',
  amount: '',
  rating: 'worth',
  notes: '',
  date: new Date().toISOString().split('T')[0]
})

// Rating options
const ratingOptions = [
  { value: 'worth', label: 'Worth it!', emoji: '😋', color: '#10B981' },
  { value: 'meh', label: 'Meh', emoji: '😐', color: '#F59E0B' },
  { value: 'regret', label: 'Regret', emoji: '😞', color: '#EF4444' }
]

// Common cafes for quick selection
const commonCafes = [
  'Starbucks',
  'Double Dose',
  'Ombe Koffie',
  'Joe & Dough',
  'GA / GA',
  'KOI Thé',
  'Megaze Coffee',
]

// Sub-tabs
const cafeTab = ref('visits') // 'visits' or 'overview'

// Month selector
const viewDate = ref(new Date())

// Generate all months from earliest visit to now
const allMonthOptions = computed(() => {
  const now = new Date()
  let earliest = new Date(now.getFullYear(), now.getMonth(), 1)

  store.cafeVisits.value.forEach(v => {
    const d = new Date(v.date)
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
    if (monthStart < earliest) earliest = monthStart
  })

  const months = []
  const current = new Date(now.getFullYear(), now.getMonth(), 1)
  const cursor = new Date(current)

  while (cursor >= earliest) {
    months.push({
      key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
      year: cursor.getFullYear(),
      month: cursor.getMonth(),
      label: cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    })
    cursor.setMonth(cursor.getMonth() - 1)
  }

  return months
})

function onMonthSelect(event) {
  const [year, month] = event.target.value.split('-').map(Number)
  viewDate.value = new Date(year, month, 1)
}

// Visits for the selected month
const monthVisits = computed(() => {
  const year = viewDate.value.getFullYear()
  const month = viewDate.value.getMonth()
  return [...store.cafeVisits.value]
    .filter(v => {
      const d = new Date(v.date)
      return d.getFullYear() === year && d.getMonth() === month
    })
    .sort((a, b) => {
      const dateCompare = new Date(b.date) - new Date(a.date)
      if (dateCompare !== 0) return dateCompare
      return new Date(b.createdAt) - new Date(a.createdAt)
    })
})

const monthTotal = computed(() => {
  return monthVisits.value.reduce((sum, v) => sum + (v.amount || 0), 0)
})

// Overview stats
const totalVisits = computed(() => store.cafeVisits.value.length)
const totalSpent = computed(() => store.cafeVisits.value.reduce((sum, v) => sum + (v.amount || 0), 0))
const avgPerVisit = computed(() => totalVisits.value ? Math.round(totalSpent.value / totalVisits.value) : 0)

const topCafes = computed(() => {
  const counts = {}
  store.cafeVisits.value.forEach(v => {
    if (!counts[v.cafe]) counts[v.cafe] = { name: v.cafe, visits: 0, spent: 0 }
    counts[v.cafe].visits++
    counts[v.cafe].spent += v.amount || 0
  })
  return Object.values(counts).sort((a, b) => b.visits - a.visits).slice(0, 5)
})

const ratingBreakdown = computed(() => {
  const counts = { worth: 0, meh: 0, regret: 0 }
  store.cafeVisits.value.forEach(v => {
    if (counts[v.rating] !== undefined) counts[v.rating]++
  })
  return counts
})

function openAddModal() {
  editingVisit.value = null
  form.value = {
    cafe: '',
    order: '',
    amount: '',
    rating: 'worth',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  }
  showAddModal.value = true
}

function openEditModal(visit) {
  editingVisit.value = visit
  form.value = {
    cafe: visit.cafe,
    order: visit.order,
    amount: visit.amount.toString(),
    rating: visit.rating,
    notes: visit.notes || '',
    date: visit.date
  }
  showAddModal.value = true
}

function selectCafe(cafe) {
  form.value.cafe = cafe
}

function saveVisit() {
  if (!form.value.cafe.trim()) {
    toast.error('Please enter cafe name')
    return
  }
  if (!form.value.order.trim()) {
    toast.error('Please enter what you ordered')
    return
  }

  const amount = parseFloat(form.value.amount)
  if (isNaN(amount) || amount < 0) {
    toast.error('Please enter a valid amount')
    return
  }

  if (editingVisit.value) {
    store.updateCafeVisit(editingVisit.value.id, {
      cafe: form.value.cafe,
      order: form.value.order,
      amount: amount,
      rating: form.value.rating,
      notes: form.value.notes,
      date: form.value.date
    })
    toast.success('Visit updated!')
  } else {
    store.addCafeVisit({
      cafe: form.value.cafe,
      order: form.value.order,
      amount: amount,
      rating: form.value.rating,
      notes: form.value.notes,
      date: form.value.date
    })
    toast.success('Cafe visit logged!')
  }

  showAddModal.value = false
}

function deleteVisit(visit) {
  if (confirm('Delete this cafe visit?')) {
    store.deleteCafeVisit(visit.id)
    toast.success('Visit deleted')
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

function formatDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

function getRatingInfo(rating) {
  return ratingOptions.find(r => r.value === rating) || ratingOptions[0]
}

// Expose for FAB
defineExpose({ openAddModal })
</script>

<template>
  <div class="cafe-tracker">
    <!-- Sub Tabs -->
    <div class="cafe-tabs">
      <button class="cafe-tab" :class="{ active: cafeTab === 'visits' }" @click="cafeTab = 'visits'">☕ Visits</button>
      <button class="cafe-tab" :class="{ active: cafeTab === 'overview' }" @click="cafeTab = 'overview'">📊 Overview</button>
    </div>

    <!-- VISITS TAB -->
    <template v-if="cafeTab === 'visits'">
      <!-- Month Selector -->
      <div class="month-selector">
        <span class="month-selector-icon">📅</span>
        <select class="month-select" :value="viewDate.getFullYear() + '-' + viewDate.getMonth()" @change="onMonthSelect($event)">
          <option
            v-for="m in allMonthOptions"
            :key="m.key"
            :value="m.key"
          >{{ m.label }}</option>
        </select>
      </div>

      <!-- Month Stats -->
      <div class="month-stats">
        <div class="month-stat-box">
          <span class="month-stat-emoji">☕</span>
          <div class="month-stat-info">
            <div class="month-stat-value">{{ monthVisits.length }}</div>
            <div class="month-stat-label">visit{{ monthVisits.length !== 1 ? 's' : '' }}</div>
          </div>
        </div>
        <div class="month-stat-box">
          <span class="month-stat-emoji">💸</span>
          <div class="month-stat-info">
            <div class="month-stat-value">{{ formatCurrency(monthTotal) }}</div>
            <div class="month-stat-label">spent</div>
          </div>
        </div>
      </div>

      <!-- Visit List -->
      <div class="visits-list">
        <div v-if="monthVisits.length === 0" class="empty-state">
          <span class="empty-emoji">☕</span>
          <p>No cafe visits this month</p>
          <p class="empty-hint">Tap + to log a visit!</p>
        </div>

        <div
          v-for="visit in monthVisits"
          :key="visit.id"
          class="visit-card"
          @click="openEditModal(visit)"
        >
          <div class="visit-rating" :style="{ backgroundColor: getRatingInfo(visit.rating).color }">
            {{ getRatingInfo(visit.rating).emoji }}
          </div>
          <div class="visit-info">
            <div class="visit-cafe">{{ visit.cafe }}</div>
            <div class="visit-order">{{ visit.order }}</div>
            <div class="visit-meta">
              <span class="visit-date">{{ formatDate(visit.date) }}</span>
              <span v-if="visit.notes" class="visit-notes">{{ visit.notes }}</span>
            </div>
          </div>
          <div class="visit-amount">{{ formatCurrency(visit.amount) }}</div>
        </div>
      </div>
    </template>

    <!-- OVERVIEW TAB -->
    <template v-if="cafeTab === 'overview'">
      <div class="overview-grid">
        <!-- All-time Stats -->
        <div class="overview-card">
          <div class="overview-card-icon">☕</div>
          <div class="overview-card-value">{{ totalVisits }}</div>
          <div class="overview-card-label">Total Visits</div>
        </div>
        <div class="overview-card">
          <div class="overview-card-icon">💸</div>
          <div class="overview-card-value">{{ formatCurrency(totalSpent) }}</div>
          <div class="overview-card-label">Total Spent</div>
        </div>
        <div class="overview-card">
          <div class="overview-card-icon">📊</div>
          <div class="overview-card-value">{{ formatCurrency(avgPerVisit) }}</div>
          <div class="overview-card-label">Avg / Visit</div>
        </div>
      </div>

      <!-- Rating Breakdown -->
      <div class="overview-section">
        <h3 class="overview-section-title">Vibes Check</h3>
        <div class="rating-bars">
          <div class="rating-bar-row">
            <span class="rating-bar-label">😋 Worth it</span>
            <div class="rating-bar-track">
              <div class="rating-bar-fill worth" :style="{ width: totalVisits ? (ratingBreakdown.worth / totalVisits * 100) + '%' : '0%' }"></div>
            </div>
            <span class="rating-bar-count">{{ ratingBreakdown.worth }}</span>
          </div>
          <div class="rating-bar-row">
            <span class="rating-bar-label">😐 Meh</span>
            <div class="rating-bar-track">
              <div class="rating-bar-fill meh" :style="{ width: totalVisits ? (ratingBreakdown.meh / totalVisits * 100) + '%' : '0%' }"></div>
            </div>
            <span class="rating-bar-count">{{ ratingBreakdown.meh }}</span>
          </div>
          <div class="rating-bar-row">
            <span class="rating-bar-label">😞 Regret</span>
            <div class="rating-bar-track">
              <div class="rating-bar-fill regret" :style="{ width: totalVisits ? (ratingBreakdown.regret / totalVisits * 100) + '%' : '0%' }"></div>
            </div>
            <span class="rating-bar-count">{{ ratingBreakdown.regret }}</span>
          </div>
        </div>
      </div>

      <!-- Top Cafes -->
      <div v-if="topCafes.length > 0" class="overview-section">
        <h3 class="overview-section-title">Fave Spots</h3>
        <div class="top-cafes-list">
          <div v-for="(cafe, i) in topCafes" :key="cafe.name" class="top-cafe-item">
            <span class="top-cafe-rank">{{ i === 0 ? '👑' : '#' + (i + 1) }}</span>
            <div class="top-cafe-info">
              <div class="top-cafe-name">{{ cafe.name }}</div>
              <div class="top-cafe-meta">{{ cafe.visits }} visit{{ cafe.visits !== 1 ? 's' : '' }}</div>
            </div>
            <div class="top-cafe-spent">{{ formatCurrency(cafe.spent) }}</div>
          </div>
        </div>
      </div>
    </template>

    <!-- Add/Edit Modal -->
    <Teleport to="body">
      <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
        <div class="modal cafe-modal">
          <div class="modal-header">
            <h2>{{ editingVisit ? 'Edit Visit' : 'Log Cafe Visit' }}</h2>
            <button class="modal-close" @click="showAddModal = false">&times;</button>
          </div>

          <div class="modal-body">
            <!-- Quick Cafe Selection -->
            <div class="form-group">
              <label>Cafe</label>
              <div class="quick-cafes">
                <button
                  v-for="cafe in commonCafes"
                  :key="cafe"
                  class="quick-cafe-btn"
                  :class="{ active: form.cafe === cafe }"
                  @click="selectCafe(cafe)"
                >
                  {{ cafe }}
                </button>
              </div>
              <input
                v-model="form.cafe"
                type="text"
                placeholder="Or type cafe name..."
                class="form-input"
              />
            </div>

            <!-- Order -->
            <div class="form-group">
              <label>What did you order?</label>
              <input
                v-model="form.order"
                type="text"
                placeholder="e.g. Iced Americano, Matcha Latte"
                class="form-input"
              />
            </div>

            <!-- Amount -->
            <div class="form-group">
              <label>Amount (IDR)</label>
              <input
                v-model="form.amount"
                type="number"
                placeholder="35000"
                class="form-input"
              />
            </div>

            <!-- Rating -->
            <div class="form-group">
              <label>Was it worth it?</label>
              <div class="rating-options">
                <button
                  v-for="option in ratingOptions"
                  :key="option.value"
                  class="rating-btn"
                  :class="{ active: form.rating === option.value }"
                  :style="{ '--rating-color': option.color }"
                  @click="form.rating = option.value"
                >
                  <span class="rating-emoji">{{ option.emoji }}</span>
                  <span class="rating-label">{{ option.label }}</span>
                </button>
              </div>
            </div>

            <!-- Date -->
            <div class="form-group">
              <label>Date</label>
              <input
                v-model="form.date"
                type="date"
                class="form-input"
              />
            </div>

            <!-- Notes -->
            <div class="form-group">
              <label>Notes (optional)</label>
              <input
                v-model="form.notes"
                type="text"
                placeholder="Any thoughts?"
                class="form-input"
              />
            </div>
          </div>

          <div class="modal-footer">
            <button v-if="editingVisit" class="btn-delete" @click="deleteVisit(editingVisit); showAddModal = false">
              Delete
            </button>
            <button class="btn-save" @click="saveVisit">
              {{ editingVisit ? 'Update' : 'Log Visit' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.cafe-tracker {
  width: 100%;
}

/* Sub Tabs */
.cafe-tabs {
  display: flex;
  gap: var(--space-xs);
  background: var(--white);
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-lg);
  padding: var(--space-xs);
  margin-bottom: var(--space-md);
}

.cafe-tab {
  flex: 1;
  padding: var(--space-sm);
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.cafe-tab.active {
  background: linear-gradient(135deg, #FDF4E7, #FEF3C7);
  color: #92400E;
}

/* Month Selector */
.month-selector {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: linear-gradient(135deg, #FDF4E7, #FEF3C7);
  border: 2px solid #F59E0B;
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-sm);
}

.month-selector-icon {
  font-size: 1.25rem;
}

.month-select {
  flex: 1;
  padding: var(--space-sm) var(--space-md);
  border: 2px solid #D97706;
  border-radius: var(--radius-md);
  background: white;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.9375rem;
  color: #92400E;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2392400E' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
}

.month-select:focus {
  outline: none;
  border-color: #F59E0B;
}

/* Month Stats Boxes */
.month-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}

.month-stat-box {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--white);
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-lg);
}

.month-stat-emoji {
  font-size: 1.5rem;
}

.month-stat-info {
  flex: 1;
  min-width: 0;
}

.month-stat-value {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.0625rem;
  color: var(--text-primary);
}

.month-stat-label {
  font-size: 0.6875rem;
  color: var(--text-tertiary);
}

/* Overview Grid */
.overview-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}

.overview-card {
  background: var(--white);
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  text-align: center;
}

.overview-card-icon {
  font-size: 1.5rem;
  margin-bottom: var(--space-xs);
}

.overview-card-value {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1rem;
  color: var(--text-primary);
  word-break: break-word;
}

.overview-card-label {
  font-size: 0.6875rem;
  color: var(--text-tertiary);
  margin-top: 2px;
}

/* Overview Sections */
.overview-section {
  background: var(--white);
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  margin-bottom: var(--space-md);
}

.overview-section-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.9375rem;
  color: var(--text-primary);
  margin: 0 0 var(--space-md);
}

/* Rating Bars */
.rating-bars {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.rating-bar-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.rating-bar-label {
  font-size: 0.8125rem;
  font-weight: 600;
  width: 90px;
  flex-shrink: 0;
}

.rating-bar-track {
  flex: 1;
  height: 12px;
  background: var(--lavender-50);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.rating-bar-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.4s ease;
}

.rating-bar-fill.worth { background: #10B981; }
.rating-bar-fill.meh { background: #F59E0B; }
.rating-bar-fill.regret { background: #EF4444; }

.rating-bar-count {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  width: 24px;
  text-align: right;
}

/* Top Cafes */
.top-cafes-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.top-cafe-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm);
  background: var(--lavender-50);
  border-radius: var(--radius-md);
}

.top-cafe-rank {
  font-size: 1rem;
  width: 28px;
  text-align: center;
  font-weight: 700;
  color: var(--text-tertiary);
}

.top-cafe-info {
  flex: 1;
  min-width: 0;
}

.top-cafe-name {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--text-primary);
}

.top-cafe-meta {
  font-size: 0.6875rem;
  color: var(--text-tertiary);
}

.top-cafe-spent {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 0.8125rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

/* Visit Cards */
.visits-list {
  display: flex;
  flex-direction: column;
}

.visit-card {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--bg-card);
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-md);
  margin-top: var(--space-sm);
  cursor: pointer;
  transition: all 0.2s;
}

.visit-card:hover {
  border-color: var(--lavender-300);
  transform: translateY(-1px);
}

.visit-rating {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.visit-info {
  flex: 1;
  min-width: 0;
}

.visit-cafe {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.9375rem;
}

.visit-order {
  font-size: 0.8125rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.visit-meta {
  display: flex;
  gap: var(--space-sm);
  margin-top: 2px;
}

.visit-date {
  font-size: 0.6875rem;
  color: var(--text-tertiary);
}

.visit-notes {
  font-size: 0.6875rem;
  color: var(--lavender-500);
  font-style: italic;
}

.visit-amount {
  font-family: var(--font-display);
  font-weight: 600;
  color: var(--expense-color);
  font-size: 0.875rem;
  white-space: nowrap;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: var(--space-xl);
  color: var(--text-secondary);
}

.empty-emoji {
  font-size: 3rem;
  display: block;
  margin-bottom: var(--space-sm);
  opacity: 0.5;
}

.empty-hint {
  font-size: 0.8125rem;
  color: var(--text-tertiary);
}

/* Modal */
.cafe-modal {
  max-width: 440px;
}

.form-group {
  margin-bottom: var(--space-md);
}

.form-group label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-xs);
}

.form-input {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-md);
  font-size: 0.9375rem;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--lavender-400);
}

/* Quick Cafes */
.quick-cafes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin-bottom: var(--space-sm);
}

.quick-cafe-btn {
  padding: 6px 12px;
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-full);
  background: white;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.quick-cafe-btn:hover {
  border-color: var(--lavender-300);
  color: var(--lavender-600);
}

.quick-cafe-btn.active {
  background: var(--lavender-500);
  border-color: var(--lavender-500);
  color: white;
}

/* Rating Options */
.rating-options {
  display: flex;
  gap: var(--space-sm);
}

.rating-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--space-sm);
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-md);
  background: white;
  cursor: pointer;
  transition: all 0.15s;
}

.rating-btn:hover {
  border-color: var(--rating-color);
}

.rating-btn.active {
  border-color: var(--rating-color);
  background: color-mix(in srgb, var(--rating-color) 10%, white);
}

.rating-emoji {
  font-size: 1.5rem;
}

.rating-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.rating-btn.active .rating-label {
  color: var(--rating-color);
}

/* Modal Footer */
.modal-footer {
  display: flex;
  gap: var(--space-sm);
  padding-top: var(--space-md);
  border-top: 1px solid var(--gray-200);
}

.btn-delete {
  padding: var(--space-sm) var(--space-md);
  border: 2px solid var(--expense-color);
  border-radius: var(--radius-md);
  background: white;
  color: var(--expense-color);
  font-weight: 600;
  cursor: pointer;
}

.btn-save {
  flex: 1;
  padding: var(--space-sm) var(--space-md);
  border: none;
  border-radius: var(--radius-md);
  background: var(--lavender-500);
  color: white;
  font-weight: 600;
  cursor: pointer;
}

.btn-save:hover {
  background: var(--lavender-600);
}
</style>

<style>
/* Dark mode */
[data-theme="dark"] .cafe-tabs {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .cafe-tab.active {
  background: #2D2640 !important;
  color: #C4B5FD !important;
}

[data-theme="dark"] .month-selector {
  background: linear-gradient(135deg, #2D2640, #1A1625) !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .month-select {
  background-color: #1A1625 !important;
  border-color: #3D3456 !important;
  color: #E9D5FF !important;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23C4B5FD' d='M6 8L1 3h10z'/%3E%3C/svg%3E") !important;
}

[data-theme="dark"] .month-select:focus {
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .month-stat-box {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .overview-card {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .overview-section {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .overview-section-title {
  color: #E9D5FF !important;
}

[data-theme="dark"] .rating-bar-track {
  background: #2D2640 !important;
}

[data-theme="dark"] .top-cafe-item {
  background: #2D2640 !important;
}

[data-theme="dark"] .top-cafe-rank {
  color: #9D8BC2 !important;
}

[data-theme="dark"] .visit-card {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .visit-card:hover {
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .quick-cafe-btn {
  background: #2D2640 !important;
  border-color: #3D3456 !important;
  color: #9D8BC2 !important;
}

[data-theme="dark"] .quick-cafe-btn:hover {
  border-color: #8B5CF6 !important;
  color: #C4B5FD !important;
}

[data-theme="dark"] .quick-cafe-btn.active {
  background: #8B5CF6 !important;
  border-color: #8B5CF6 !important;
  color: white !important;
}

[data-theme="dark"] .rating-btn {
  background: #2D2640 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .rating-btn.active {
  background: #3D3456 !important;
}

[data-theme="dark"] .form-input {
  background: #2D2640 !important;
  border-color: #3D3456 !important;
  color: #E5E5E5 !important;
}

[data-theme="dark"] .form-input:focus {
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .btn-delete {
  background: transparent !important;
}

[data-theme="dark"] .modal-footer {
  border-top-color: #3D3456 !important;
}
</style>
