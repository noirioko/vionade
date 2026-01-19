<template>
  <div class="page subscriptions-page">
    <div class="page-header">
      <img src="/images/vio-logo.png" alt="Vionade" class="page-header-logo" />
    </div>

    <!-- Subscriptions Banner -->
    <div class="subs-banner">
      <div class="subs-banner-content">
        <div class="subs-banner-title">Subscriptions</div>
        <div class="subs-banner-subtitle">Track your recurring payments</div>
      </div>
      <img src="/images/vio_sit.png" alt="Vio" class="subs-banner-vio" />
    </div>

    <!-- Summary Cards -->
    <div class="summary-grid">
      <div class="summary-card">
        <span class="summary-label">Monthly</span>
        <span class="summary-amount">{{ formatCurrency(getTotalMonthlySubscriptions()) }}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Yearly</span>
        <span class="summary-amount">{{ formatCurrency(getTotalYearlySubscriptions()) }}</span>
      </div>
    </div>

    <!-- Upcoming Billings -->
    <section v-if="upcomingBillings.length > 0" class="upcoming-section">
      <h2>Due Soon</h2>
      <div class="upcoming-list">
        <div
          v-for="sub in upcomingBillings"
          :key="sub.id"
          class="upcoming-item"
          :style="{ borderLeftColor: sub.color }"
        >
          <span class="upcoming-icon">{{ sub.icon }}</span>
          <div class="upcoming-info">
            <span class="upcoming-name">{{ sub.name }}</span>
            <span class="upcoming-days">{{ getDaysUntilBilling(sub) === 0 ? 'Today!' : `in ${getDaysUntilBilling(sub)} days` }}</span>
          </div>
          <span class="upcoming-amount">{{ formatCurrency(sub.amount) }}</span>
        </div>
      </div>
    </section>

    <!-- Subscription List -->
    <section class="subscriptions-section">
      <h2>All Subscriptions</h2>

      <div v-if="subscriptions.length === 0" class="empty-state">
        <span class="empty-icon">📦</span>
        <p>No subscriptions yet</p>
        <p class="empty-hint">Tap + to add your first subscription</p>
      </div>

      <div v-else class="subscription-list">
        <div
          v-for="sub in sortedSubscriptions"
          :key="sub.id"
          class="subscription-card"
          :class="{ inactive: !sub.isActive }"
          @click="openEditModal(sub)"
        >
          <div class="sub-icon" :style="{ background: sub.color }">
            {{ sub.icon }}
          </div>
          <div class="sub-info">
            <span class="sub-name">{{ sub.name }}</span>
            <span class="sub-cycle">{{ getCycleLabel(sub.cycle) }} · {{ formatNextBilling(sub) }}</span>
          </div>
          <div class="sub-amount">
            <span class="amount">{{ formatCurrency(sub.amount) }}</span>
            <span v-if="sub.cycle !== 'monthly'" class="monthly-equiv">
              ~{{ formatCurrency(getMonthlyAmount(sub)) }}/mo
            </span>
          </div>
          <button
            class="toggle-btn"
            :class="{ active: sub.isActive }"
            @click.stop="toggleSubscription(sub.id)"
          >
            {{ sub.isActive ? 'ON' : 'OFF' }}
          </button>
        </div>
      </div>
    </section>

    <!-- Add/Edit Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ editingSubscription ? 'Edit' : 'Add' }} Subscription</h2>
          <button class="close-btn" @click="closeModal">&times;</button>
        </div>

        <div class="modal-body">
          <!-- Quick Select -->
          <div v-if="!editingSubscription" class="quick-select">
            <button
              v-for="service in COMMON_SERVICES"
              :key="service.name"
              class="service-btn"
              :class="{ selected: form.name === service.name }"
              @click="selectService(service)"
            >
              <span class="service-icon">{{ service.icon }}</span>
              <span class="service-name">{{ service.name }}</span>
            </button>
          </div>

          <div class="form-group">
            <label>Name</label>
            <input v-model="form.name" type="text" placeholder="Subscription name" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Amount</label>
              <input v-model.number="form.amount" type="number" placeholder="0" />
            </div>
            <div class="form-group">
              <label>Billing Cycle</label>
              <select v-model="form.cycle">
                <option v-for="cycle in BILLING_CYCLES" :key="cycle.id" :value="cycle.id">
                  {{ cycle.label }}
                </option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Billing Day ({{ form.cycle === 'weekly' ? '0=Sun, 1=Mon...' : 'day of month' }})</label>
            <input
              v-model.number="form.billingDate"
              type="number"
              :min="form.cycle === 'weekly' ? 0 : 1"
              :max="form.cycle === 'weekly' ? 6 : 31"
            />
          </div>

          <div class="form-group">
            <label>Notes (optional)</label>
            <input v-model="form.notes" type="text" placeholder="e.g., shared with family" />
          </div>
        </div>

        <div class="modal-footer">
          <button v-if="editingSubscription" class="delete-btn" @click="handleDelete">
            Delete
          </button>
          <button class="save-btn" @click="handleSave">
            {{ editingSubscription ? 'Update' : 'Add' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted, onUnmounted } from 'vue'
import { useFinanceStore } from '../stores'

const store = useFinanceStore()
const {
  subscriptions,
  formatCurrency,
  BILLING_CYCLES,
  COMMON_SERVICES,
  addSubscription,
  updateSubscription,
  deleteSubscription,
  toggleSubscription,
  getMonthlyAmount,
  getTotalMonthlySubscriptions,
  getTotalYearlySubscriptions,
  getNextBillingDate,
  getDaysUntilBilling,
  getUpcomingBillings,
} = store

// FAB integration
const fabAction = inject('fabAction')

onMounted(() => {
  fabAction.value = openAddModal
})

onUnmounted(() => {
  fabAction.value = null
})

// Modal state
const showModal = ref(false)
const editingSubscription = ref(null)
const form = ref({
  name: '',
  amount: 0,
  cycle: 'monthly',
  billingDate: 1,
  notes: '',
  icon: '📦',
  color: '#6B7280',
})

// Computed
const sortedSubscriptions = computed(() => {
  return [...subscriptions.value].sort((a, b) => {
    // Active first, then by name
    if (a.isActive !== b.isActive) return b.isActive - a.isActive
    return a.name.localeCompare(b.name)
  })
})

const upcomingBillings = computed(() => {
  return getUpcomingBillings(7)
})

// Helpers
function getCycleLabel(cycleId) {
  const cycle = BILLING_CYCLES.find(c => c.id === cycleId)
  return cycle?.label || cycleId
}

function formatNextBilling(sub) {
  if (!sub.isActive) return 'Paused'
  const nextDate = getNextBillingDate(sub)
  const days = getDaysUntilBilling(sub)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function selectService(service) {
  form.value.name = service.name
  form.value.icon = service.icon
  form.value.color = service.color
}

// Modal actions
function openAddModal() {
  editingSubscription.value = null
  form.value = {
    name: '',
    amount: 0,
    cycle: 'monthly',
    billingDate: 1,
    notes: '',
    icon: '📦',
    color: '#6B7280',
  }
  showModal.value = true
}

function openEditModal(sub) {
  editingSubscription.value = sub
  form.value = {
    name: sub.name,
    amount: sub.amount,
    cycle: sub.cycle,
    billingDate: sub.billingDate,
    notes: sub.notes || '',
    icon: sub.icon,
    color: sub.color,
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingSubscription.value = null
}

function handleSave() {
  if (!form.value.name || form.value.amount <= 0) return

  if (editingSubscription.value) {
    updateSubscription(editingSubscription.value.id, {
      name: form.value.name,
      amount: form.value.amount,
      cycle: form.value.cycle,
      billingDate: form.value.billingDate,
      notes: form.value.notes,
      icon: form.value.icon,
      color: form.value.color,
    })
  } else {
    addSubscription({
      name: form.value.name,
      amount: form.value.amount,
      cycle: form.value.cycle,
      billingDate: form.value.billingDate,
      notes: form.value.notes,
      icon: form.value.icon,
      color: form.value.color,
    })
  }

  closeModal()
}

function handleDelete() {
  if (editingSubscription.value && confirm('Delete this subscription?')) {
    deleteSubscription(editingSubscription.value.id)
    closeModal()
  }
}
</script>

<style scoped>
/* Subscriptions Banner */
.subs-banner {
  position: relative;
  display: flex;
  align-items: center;
  background:
    linear-gradient(135deg, rgba(139, 92, 246, 0.8) 0%, rgba(167, 139, 250, 0.8) 50%, rgba(196, 181, 253, 0.8) 100%),
    url('/images/kawaii-bg.jpg') center center / cover no-repeat;
  border-radius: var(--radius-xl);
  overflow: hidden;
  min-height: 120px;
  margin-bottom: var(--space-md);
  box-shadow: 0 4px 16px rgba(139, 92, 246, 0.3);
}

.subs-banner-content {
  flex: 1;
  padding: var(--space-lg);
}

.subs-banner-title {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.subs-banner-subtitle {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 4px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.subs-banner-vio {
  height: 120px;
  width: auto;
  flex-shrink: 0;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
  align-self: flex-end;
  margin-right: var(--space-sm);
}

@media (max-width: 480px) {
  .subs-banner-title {
    font-size: 1.5rem;
  }

  .subs-banner-vio {
    height: 100px;
  }
}

/* Summary Grid */
.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.summary-card {
  background: var(--white);
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  text-align: center;
}

.summary-label {
  display: block;
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: var(--space-xs);
}

.summary-amount {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--lavender-600);
}

/* Section styling */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-sm);
}

.section-title {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

/* Upcoming Section */
.upcoming-section {
  margin-bottom: var(--space-lg);
}

.upcoming-section h2 {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 var(--space-sm);
  color: var(--text-primary);
}

.upcoming-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.upcoming-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  background: var(--white);
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-md);
  border-left: 4px solid;
}

.upcoming-icon {
  font-size: 1.25rem;
}

.upcoming-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.upcoming-name {
  font-weight: 600;
  font-size: 0.875rem;
}

.upcoming-days {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.upcoming-amount {
  font-weight: 600;
  color: var(--lavender-600);
}

/* Subscriptions Section */
.subscriptions-section h2 {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 var(--space-sm);
  color: var(--text-primary);
}

.empty-state {
  text-align: center;
  padding: var(--space-xl);
  background: var(--white);
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-lg);
}

.empty-icon {
  font-size: 2.5rem;
  display: block;
  margin-bottom: var(--space-sm);
  opacity: 0.5;
}

.empty-hint {
  font-size: 0.875rem;
  color: var(--text-tertiary);
}

.subscription-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.subscription-card {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  background: var(--white);
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  cursor: pointer;
  transition: all 0.2s;
}

.subscription-card:hover {
  border-color: var(--lavender-300);
  background: var(--lavender-50);
}

.subscription-card.inactive {
  opacity: 0.5;
}

.sub-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.sub-info {
  flex: 1;
  min-width: 0;
}

.sub-name {
  display: block;
  font-weight: 600;
  font-size: 0.9375rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sub-cycle {
  display: block;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.sub-amount {
  text-align: right;
}

.sub-amount .amount {
  display: block;
  font-weight: 600;
  color: var(--text-primary);
}

.sub-amount .monthly-equiv {
  display: block;
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.toggle-btn {
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  background: var(--gray-200);
  color: var(--text-secondary);
  transition: all 0.15s;
}

.toggle-btn.active {
  background: var(--lavender-500);
  color: white;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--white);
  border-radius: 20px 20px 0 0;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--lavender-200);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.125rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.modal-body {
  padding: 1.25rem;
}

.quick-select {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.service-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem;
  border: 2px solid var(--lavender-200);
  border-radius: 10px;
  background: var(--white);
  cursor: pointer;
  transition: all 0.15s;
  width: calc(25% - 0.375rem);
  min-width: 70px;
}

.service-btn:hover {
  border-color: var(--lavender-400);
}

.service-btn.selected {
  border-color: var(--lavender-500);
  background: var(--lavender-100);
}

.service-icon {
  font-size: 1.25rem;
}

.service-name {
  font-size: 0.65rem;
  color: var(--text-secondary);
  text-align: center;
  line-height: 1.2;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.375rem;
  color: var(--text-primary);
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--lavender-200);
  border-radius: 10px;
  font-size: 1rem;
  background: var(--lavender-50);
  color: var(--text-primary);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--lavender-200);
}

.save-btn {
  padding: 0.75rem 1.5rem;
  background: var(--lavender-500);
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.save-btn:hover {
  background: var(--lavender-600);
}

.delete-btn {
  padding: 0.75rem 1.5rem;
  background: #fee2e2;
  color: #dc2626;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  margin-right: auto;
}

.delete-btn:hover {
  background: #fecaca;
}
</style>

<style>
/* Dark mode styles */
[data-theme="dark"] .subs-banner {
  background: linear-gradient(135deg, #5B21B6 0%, #7C3AED 50%, #8B5CF6 100%) !important;
}

[data-theme="dark"] .summary-card {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .summary-amount {
  color: #A78BFA !important;
}

[data-theme="dark"] .upcoming-item {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .upcoming-amount {
  color: #A78BFA !important;
}

[data-theme="dark"] .subscriptions-section .empty-state {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .subscription-card {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .subscription-card:hover {
  background: #2D2640 !important;
  border-color: #5B21B6 !important;
}

[data-theme="dark"] .subscriptions-page .modal {
  background: #1A1625 !important;
}

[data-theme="dark"] .subscriptions-page .modal-header {
  border-color: #3D3456 !important;
}

[data-theme="dark"] .subscriptions-page .modal-body {
  background: #1A1625 !important;
}

[data-theme="dark"] .subscriptions-page .modal-footer {
  border-color: #3D3456 !important;
  background: #1A1625 !important;
}

[data-theme="dark"] .subscriptions-page .modal-header h2 {
  color: var(--text-primary) !important;
}

[data-theme="dark"] .subscriptions-page .close-btn {
  color: #9D8BC2 !important;
}

[data-theme="dark"] .subscriptions-page .service-btn {
  background: #2D2640 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .subscriptions-page .service-btn.selected {
  background: #3D2F5E !important;
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .subscriptions-page .form-group input,
[data-theme="dark"] .subscriptions-page .form-group select {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
  color: var(--text-primary) !important;
}

[data-theme="dark"] .subscriptions-page .toggle-btn {
  background: #3D3456 !important;
}

[data-theme="dark"] .subscriptions-page .toggle-btn.active {
  background: #8B5CF6 !important;
}

[data-theme="dark"] .subscriptions-page .delete-btn {
  background: #4A1D1D !important;
  color: #F87171 !important;
}
</style>
