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
  'Kopi Kenangan',
  'Fore Coffee',
  'Janji Jiwa',
  'Tomoro',
  'Point Coffee',
  'Gulu Gulu',
  'Chatime',
  'Kokumi',
  'Local Cafe'
]

// Stats
const cafeStats = computed(() => store.getCafeStats())

// Sorted visits (newest first)
const sortedVisits = computed(() => {
  return [...store.cafeVisits.value].sort((a, b) => {
    const dateCompare = new Date(b.date) - new Date(a.date)
    if (dateCompare !== 0) return dateCompare
    return new Date(b.createdAt) - new Date(a.createdAt)
  })
})

// Group visits by month
const visitsByMonth = computed(() => {
  const groups = {}
  sortedVisits.value.forEach(visit => {
    const date = new Date(visit.date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    if (!groups[monthKey]) {
      groups[monthKey] = { label: monthLabel, visits: [], total: 0 }
    }
    groups[monthKey].visits.push(visit)
    groups[monthKey].total += visit.amount || 0
  })
  return groups
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
    <!-- Stats Card -->
    <div class="cafe-stats">
      <div class="stat-item">
        <span class="stat-emoji">☕</span>
        <div class="stat-info">
          <div class="stat-value">{{ cafeStats.thisMonthVisits }}</div>
          <div class="stat-label">This Month</div>
        </div>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-emoji">💸</span>
        <div class="stat-info">
          <div class="stat-value">{{ formatCurrency(cafeStats.thisMonthSpent) }}</div>
          <div class="stat-label">Spent</div>
        </div>
      </div>
    </div>

    <!-- Visit List -->
    <div class="visits-list">
      <div v-if="sortedVisits.length === 0" class="empty-state">
        <span class="empty-emoji">☕</span>
        <p>No cafe visits logged yet</p>
        <p class="empty-hint">Tap + to log your first visit!</p>
      </div>

      <template v-for="(group, monthKey) in visitsByMonth" :key="monthKey">
        <div class="month-header">
          <span class="month-label">{{ group.label }}</span>
          <span class="month-total">{{ formatCurrency(group.total) }}</span>
        </div>

        <div
          v-for="visit in group.visits"
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
      </template>
    </div>

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

/* Stats */
.cafe-stats {
  display: flex;
  align-items: center;
  background: var(--bg-card);
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  margin-bottom: var(--space-md);
}

.stat-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.stat-emoji {
  font-size: 1.5rem;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: var(--gray-200);
  margin: 0 var(--space-md);
}

/* Month Header */
.month-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-sm) 0;
  margin-top: var(--space-md);
  border-bottom: 2px solid var(--lavender-100);
}

.month-header:first-of-type {
  margin-top: 0;
}

.month-label {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.875rem;
}

.month-total {
  font-weight: 600;
  color: var(--expense-color);
  font-size: 0.875rem;
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
[data-theme="dark"] .cafe-stats {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .stat-divider {
  background: #3D3456 !important;
}

[data-theme="dark"] .month-header {
  border-bottom-color: #3D3456 !important;
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
