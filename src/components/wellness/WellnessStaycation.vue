<script setup>
import { ref, computed, defineExpose } from 'vue'
import { useFinanceStore } from '../../stores'
import { useToast } from '../../composables/useToast'

const store = useFinanceStore()
const toast = useToast()

// Modal state
const showAddModal = ref(false)
const editingStay = ref(null)

// Form data
const form = ref({
  hotel: '',
  roomType: '',
  checkIn: new Date().toISOString().split('T')[0],
  checkOut: '',
  price: '',
  rating: 'worth',
  notes: ''
})

// Rating options
const ratingOptions = [
  { value: 'worth', label: 'Worth it!', emoji: '😍', color: '#10B981' },
  { value: 'meh', label: 'Meh', emoji: '😐', color: '#F59E0B' },
  { value: 'regret', label: 'Regret', emoji: '😞', color: '#EF4444' }
]

// Common hotels for quick selection
const commonHotels = [
  'Aston',
  'Ibis',
  'Mercure',
  'Novotel',
  'Holiday Inn',
  'Four Points',
  'Harris',
  'Swiss-Belhotel',
  'Best Western',
  'Other'
]

// Stats
const stats = computed(() => store.getStaycationStats())

// Sorted stays (newest first)
const sortedStays = computed(() => {
  return [...store.staycations.value].sort((a, b) => {
    return new Date(b.checkIn) - new Date(a.checkIn)
  })
})

// Get stay status
function getStayStatus(stay) {
  const now = new Date()
  const checkIn = new Date(stay.checkIn)
  const checkOut = new Date(stay.checkOut)

  if (now < checkIn) return 'upcoming'
  if (now >= checkIn && now <= checkOut) return 'ongoing'
  return 'completed'
}

function openAddModal() {
  editingStay.value = null
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  form.value = {
    hotel: '',
    roomType: '',
    checkIn: new Date().toISOString().split('T')[0],
    checkOut: tomorrow.toISOString().split('T')[0],
    price: '',
    rating: 'worth',
    notes: ''
  }
  showAddModal.value = true
}

function openEditModal(stay) {
  editingStay.value = stay
  form.value = {
    hotel: stay.hotel,
    roomType: stay.roomType || '',
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    price: stay.price?.toString() || '',
    rating: stay.rating,
    notes: stay.notes || ''
  }
  showAddModal.value = true
}

function selectHotel(hotel) {
  form.value.hotel = hotel
}

function saveStay() {
  if (!form.value.hotel.trim()) {
    toast.error('Please enter hotel name')
    return
  }
  if (!form.value.checkIn || !form.value.checkOut) {
    toast.error('Please enter check-in and check-out dates')
    return
  }

  if (editingStay.value) {
    store.updateStaycation(editingStay.value.id, form.value)
    toast.success('Staycation updated!')
  } else {
    store.addStaycation(form.value)
    toast.success('Staycation added!')
  }

  showAddModal.value = false
}

function deleteStay(stay) {
  if (confirm('Delete this staycation?')) {
    store.deleteStaycation(stay.id)
    toast.success('Staycation deleted')
    showAddModal.value = false
  }
}

function formatCurrency(amount) {
  if (!amount) return ''
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

function formatDateRange(checkIn, checkOut) {
  const start = new Date(checkIn)
  const end = new Date(checkOut)
  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${startStr} - ${endStr}`
}

function getNights(checkIn, checkOut) {
  const start = new Date(checkIn)
  const end = new Date(checkOut)
  const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
  return diff
}

function getRatingInfo(rating) {
  return ratingOptions.find(r => r.value === rating) || ratingOptions[0]
}

// Expose for FAB
defineExpose({ openAddModal })
</script>

<template>
  <div class="staycation-tracker">
    <!-- Stats Card -->
    <div class="stay-stats">
      <div class="stat-item">
        <span class="stat-emoji">🏨</span>
        <div class="stat-info">
          <div class="stat-value">{{ stats.thisYearStays }}</div>
          <div class="stat-label">This Year</div>
        </div>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-emoji">💸</span>
        <div class="stat-info">
          <div class="stat-value">{{ formatCurrency(stats.thisYearSpent) }}</div>
          <div class="stat-label">Spent</div>
        </div>
      </div>
    </div>

    <!-- Stays List -->
    <div class="stays-list">
      <div v-if="sortedStays.length === 0" class="empty-state">
        <span class="empty-emoji">🏨</span>
        <p>No staycations logged yet</p>
        <p class="empty-hint">Tap + to log your first hotel stay!</p>
      </div>

      <div
        v-for="stay in sortedStays"
        :key="stay.id"
        class="stay-card"
        :class="getStayStatus(stay)"
        @click="openEditModal(stay)"
      >
        <div class="stay-rating" :style="{ backgroundColor: getRatingInfo(stay.rating).color }">
          {{ getRatingInfo(stay.rating).emoji }}
        </div>
        <div class="stay-info">
          <div class="stay-hotel">{{ stay.hotel }}</div>
          <div class="stay-room" v-if="stay.roomType">{{ stay.roomType }}</div>
          <div class="stay-dates">
            <span class="dates-icon">📅</span>
            {{ formatDateRange(stay.checkIn, stay.checkOut) }}
            <span class="nights-badge">{{ getNights(stay.checkIn, stay.checkOut) }}N</span>
          </div>
        </div>
        <div class="stay-right">
          <div class="stay-price">{{ formatCurrency(stay.price) }}</div>
          <div class="stay-status" :class="getStayStatus(stay)">
            {{ getStayStatus(stay) === 'upcoming' ? '🗓️ Upcoming' : getStayStatus(stay) === 'ongoing' ? '✨ Now' : '✓' }}
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <Teleport to="body">
      <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
        <div class="modal staycation-modal">
          <div class="modal-header">
            <h2>{{ editingStay ? 'Edit Staycation' : 'Log Staycation' }}</h2>
            <button class="modal-close" @click="showAddModal = false">&times;</button>
          </div>

          <div class="modal-body">
            <!-- Quick Hotel Selection -->
            <div class="form-group">
              <label>Hotel</label>
              <div class="quick-hotels">
                <button
                  v-for="hotel in commonHotels"
                  :key="hotel"
                  class="quick-hotel-btn"
                  :class="{ active: form.hotel === hotel }"
                  @click="selectHotel(hotel)"
                >
                  {{ hotel }}
                </button>
              </div>
              <input
                v-model="form.hotel"
                type="text"
                placeholder="Or type hotel name..."
                class="form-input"
              />
            </div>

            <!-- Room Type -->
            <div class="form-group">
              <label>Room Type (optional)</label>
              <input
                v-model="form.roomType"
                type="text"
                placeholder="e.g. Deluxe, Superior, Suite"
                class="form-input"
              />
            </div>

            <!-- Dates -->
            <div class="form-row">
              <div class="form-group">
                <label>Check-in</label>
                <input
                  v-model="form.checkIn"
                  type="date"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label>Check-out</label>
                <input
                  v-model="form.checkOut"
                  type="date"
                  class="form-input"
                />
              </div>
            </div>

            <!-- Price -->
            <div class="form-group">
              <label>Total Price (IDR)</label>
              <input
                v-model="form.price"
                type="number"
                placeholder="500000"
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

            <!-- Notes -->
            <div class="form-group">
              <label>Notes (optional)</label>
              <input
                v-model="form.notes"
                type="text"
                placeholder="Any thoughts about the stay?"
                class="form-input"
              />
            </div>
          </div>

          <div class="modal-footer">
            <button v-if="editingStay" class="btn-delete" @click="deleteStay(editingStay)">
              Delete
            </button>
            <button class="btn-save" @click="saveStay">
              {{ editingStay ? 'Update' : 'Log Staycation' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.staycation-tracker {
  width: 100%;
}

/* Stats */
.stay-stats {
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

/* Stay Cards */
.stays-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.stay-card {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--bg-card);
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
}

.stay-card:hover {
  border-color: var(--lavender-300);
  transform: translateY(-1px);
}

.stay-card.upcoming {
  border-left: 4px solid #3B82F6;
}

.stay-card.ongoing {
  border-left: 4px solid #10B981;
  background: linear-gradient(90deg, rgba(16, 185, 129, 0.05) 0%, transparent 100%);
}

.stay-rating {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.stay-info {
  flex: 1;
  min-width: 0;
}

.stay-hotel {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.9375rem;
}

.stay-room {
  font-size: 0.75rem;
  color: var(--lavender-500);
  margin-top: 2px;
}

.stay-dates {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 4px;
}

.dates-icon {
  font-size: 0.875rem;
}

.nights-badge {
  background: var(--lavender-100);
  color: var(--lavender-700);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: 0.625rem;
  font-weight: 600;
}

.stay-right {
  text-align: right;
  flex-shrink: 0;
}

.stay-price {
  font-family: var(--font-display);
  font-weight: 600;
  color: var(--expense-color);
  font-size: 0.875rem;
}

.stay-status {
  font-size: 0.6875rem;
  margin-top: 4px;
  color: var(--text-tertiary);
}

.stay-status.upcoming {
  color: #3B82F6;
}

.stay-status.ongoing {
  color: #10B981;
  font-weight: 600;
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
.staycation-modal {
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

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
}

/* Quick Hotels */
.quick-hotels {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin-bottom: var(--space-sm);
}

.quick-hotel-btn {
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

.quick-hotel-btn:hover {
  border-color: var(--lavender-300);
  color: var(--lavender-600);
}

.quick-hotel-btn.active {
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
[data-theme="dark"] .stay-stats {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .stat-divider {
  background: #3D3456 !important;
}

[data-theme="dark"] .stay-card {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .stay-card:hover {
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .stay-card.ongoing {
  background: linear-gradient(90deg, rgba(16, 185, 129, 0.1) 0%, transparent 100%) !important;
}

[data-theme="dark"] .nights-badge {
  background: #2D2640 !important;
  color: #C4B5FD !important;
}

[data-theme="dark"] .quick-hotel-btn {
  background: #2D2640 !important;
  border-color: #3D3456 !important;
  color: #9D8BC2 !important;
}

[data-theme="dark"] .quick-hotel-btn:hover {
  border-color: #8B5CF6 !important;
  color: #C4B5FD !important;
}

[data-theme="dark"] .quick-hotel-btn.active {
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
