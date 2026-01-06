<template>
  <div class="subscriptions-page">
    <header class="page-header">
      <h1>Subscriptions</h1>
      <p class="subtitle">Track your recurring payments</p>
    </header>

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
const setFabAction = inject('setFabAction', null)
const clearFabAction = inject('clearFabAction', null)

onMounted(() => {
  if (setFabAction) {
    setFabAction(() => openAddModal())
  }
})

onUnmounted(() => {
  if (clearFabAction) {
    clearFabAction()
  }
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
.subscriptions-page {
  padding: 1rem;
  padding-bottom: 100px;
  max-width: 600px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.page-header h1 {
  font-size: 1.5rem;
  margin: 0;
  color: var(--text-primary);
}

.subtitle {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin: 0.25rem 0 0;
}

/* Summary Grid */
.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 1rem;
  text-align: center;
  box-shadow: var(--shadow-sm);
}

.summary-label {
  display: block;
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.25rem;
}

.summary-amount {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--lavender-600);
}

/* Upcoming Section */
.upcoming-section {
  margin-bottom: 1.5rem;
}

.upcoming-section h2 {
  font-size: 1rem;
  margin: 0 0 0.75rem;
  color: var(--text-primary);
}

.upcoming-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.upcoming-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--card-bg);
  border-radius: 10px;
  padding: 0.75rem;
  border-left: 4px solid;
  box-shadow: var(--shadow-sm);
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
  font-size: 1rem;
  margin: 0 0 0.75rem;
  color: var(--text-primary);
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 0.5rem;
}

.empty-hint {
  font-size: 0.875rem;
  opacity: 0.7;
}

.subscription-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.subscription-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--card-bg);
  border-radius: 12px;
  padding: 1rem;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

.subscription-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
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
  background: var(--border-color);
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
  background: var(--card-bg);
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
  border-bottom: 1px solid var(--border-color);
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
  border: 2px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-secondary);
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
  border: 1px solid var(--border-color);
  border-radius: 10px;
  font-size: 1rem;
  background: var(--bg-secondary);
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
  border-top: 1px solid var(--border-color);
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
[data-theme="dark"] .summary-card {
  background: #1e1b2e;
}

[data-theme="dark"] .summary-amount {
  color: #a78bfa;
}

[data-theme="dark"] .upcoming-item {
  background: #1e1b2e;
}

[data-theme="dark"] .upcoming-amount {
  color: #a78bfa;
}

[data-theme="dark"] .subscription-card {
  background: #1e1b2e;
}

[data-theme="dark"] .modal {
  background: #1e1b2e;
}

[data-theme="dark"] .service-btn {
  background: #2d2640;
  border-color: #3d3456;
}

[data-theme="dark"] .service-btn.selected {
  background: #3d2f5e;
  border-color: #8b5cf6;
}

[data-theme="dark"] .form-group input,
[data-theme="dark"] .form-group select {
  background: #2d2640;
  border-color: #3d3456;
}

[data-theme="dark"] .toggle-btn {
  background: #3d3456;
}

[data-theme="dark"] .toggle-btn.active {
  background: #8b5cf6;
}

[data-theme="dark"] .delete-btn {
  background: #4a1d1d;
  color: #f87171;
}
</style>
