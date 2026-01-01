<script setup>
import { ref, computed, inject, onMounted, onUnmounted } from 'vue'
import { useFinanceStore } from '../stores'

const store = useFinanceStore()
const fabAction = inject('fabAction')

const searchQuery = ref('')
const showAddModal = ref(false)
const editingPassword = ref(null)
const visiblePasswords = ref({}) // Track which passwords are visible

// Form data
const form = ref({
  name: '',
  url: '',
  username: '',
  phone: '',
  password: '',
  pin: '',
  notes: '',
})

onMounted(() => {
  fabAction.value = () => {
    editingPassword.value = null
    resetForm()
    showAddModal.value = true
  }
})

onUnmounted(() => {
  fabAction.value = null
})

const filteredPasswords = computed(() => {
  const passwords = store.passwords.value || []
  if (!searchQuery.value.trim()) return passwords

  const q = searchQuery.value.toLowerCase()
  return passwords.filter(p =>
    p.name?.toLowerCase().includes(q) ||
    p.username?.toLowerCase().includes(q) ||
    p.url?.toLowerCase().includes(q)
  )
})

function resetForm() {
  form.value = {
    name: '',
    url: '',
    username: '',
    phone: '',
    password: '',
    pin: '',
    notes: '',
  }
}

function openEdit(password) {
  editingPassword.value = password
  form.value = {
    name: password.name || '',
    url: password.url || '',
    username: password.username || '',
    phone: password.phone || '',
    password: password.password || '',
    pin: password.pin || '',
    notes: password.notes || '',
  }
  showAddModal.value = true
}

function handleSave() {
  if (!form.value.name.trim()) return

  if (editingPassword.value) {
    store.updatePassword(editingPassword.value.id, form.value)
  } else {
    store.addPassword(form.value)
  }

  showAddModal.value = false
  editingPassword.value = null
  resetForm()
}

function handleDelete() {
  if (editingPassword.value && confirm('Delete this password entry?')) {
    store.deletePassword(editingPassword.value.id)
    showAddModal.value = false
    editingPassword.value = null
    resetForm()
  }
}

function togglePasswordVisibility(id) {
  visiblePasswords.value[id] = !visiblePasswords.value[id]
}

function isPasswordVisible(id) {
  return visiblePasswords.value[id] || false
}

function maskPassword(password) {
  if (!password) return ''
  return '•'.repeat(password.length)
}

async function copyToClipboard(text, type) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    // Could add a toast notification here
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <img src="/images/vio-logo.png" alt="Vionade" class="page-header-logo" />
    </div>

    <!-- Header -->
    <div class="section">
      <div class="section-header">
        <h3 class="section-title">Password Book</h3>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="search-bar" v-if="store.passwords.value.length > 0">
      <input
        v-model="searchQuery"
        type="text"
        class="search-input"
        placeholder="Search accounts..."
      />
      <span v-if="searchQuery" class="search-clear" @click="searchQuery = ''">×</span>
    </div>

    <!-- Empty State -->
    <div v-if="store.passwords.value.length === 0" class="empty-state">
      <img src="/images/vio_sit.png" alt="" class="empty-vio" />
      <h3 class="empty-title">No passwords yet</h3>
      <p class="empty-text">Tap + to add your first account!</p>
    </div>

    <!-- Password Cards Grid -->
    <div v-else class="cards-grid">
      <div
        v-for="(password, index) in filteredPasswords"
        :key="password.id"
        class="password-card"
      >
        <span class="card-number">{{ index + 1 }}</span>

        <!-- Service Name -->
        <div class="field">
          <label>Service / Website</label>
          <div class="field-value service-name">{{ password.name || '—' }}</div>
        </div>

        <!-- URL -->
        <div class="field" v-if="password.url">
          <label>URL</label>
          <div class="field-value url-value">{{ password.url }}</div>
        </div>

        <!-- Username & Phone Row -->
        <div class="field-row">
          <div class="field">
            <label>Username / Email</label>
            <div class="field-value-row">
              <span class="field-value">{{ password.username || '—' }}</span>
              <button
                v-if="password.username"
                class="copy-btn"
                @click.stop="copyToClipboard(password.username, 'username')"
                title="Copy"
              >📋</button>
            </div>
          </div>
          <div class="field" v-if="password.phone">
            <label>Phone</label>
            <div class="field-value">{{ password.phone }}</div>
          </div>
        </div>

        <!-- Password -->
        <div class="field">
          <label>Password</label>
          <div class="field-value-row">
            <span class="field-value password-value">
              {{ isPasswordVisible(password.id) ? password.password : maskPassword(password.password) }}
            </span>
            <button
              v-if="password.password"
              class="toggle-btn"
              @click.stop="togglePasswordVisibility(password.id)"
              title="Toggle visibility"
            >{{ isPasswordVisible(password.id) ? '🙈' : '👁️' }}</button>
            <button
              v-if="password.password"
              class="copy-btn"
              @click.stop="copyToClipboard(password.password, 'password')"
              title="Copy"
            >📋</button>
          </div>
        </div>

        <!-- PIN & Date Row -->
        <div class="field-row" v-if="password.pin || password.updatedAt">
          <div class="field" v-if="password.pin">
            <label>PIN Code</label>
            <div class="field-value">{{ password.pin }}</div>
          </div>
          <div class="field">
            <label>Updated</label>
            <div class="field-value date-value">{{ formatDate(password.updatedAt) }}</div>
          </div>
        </div>

        <!-- Notes -->
        <div class="field" v-if="password.notes">
          <label>Notes</label>
          <div class="notes-box">{{ password.notes }}</div>
        </div>

        <!-- Edit Button -->
        <button class="edit-btn" @click="openEdit(password)">Edit</button>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingPassword ? 'Edit Account' : 'Add Account' }}</h3>
          <button class="modal-close" @click="showAddModal = false">×</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>Service / Website Name *</label>
            <input v-model="form.name" type="text" placeholder="e.g. Google, Netflix" />
          </div>

          <div class="form-group">
            <label>Website URL</label>
            <input v-model="form.url" type="text" placeholder="e.g. https://google.com" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Username / Email</label>
              <input v-model="form.username" type="text" placeholder="Username or email" />
            </div>
            <div class="form-group">
              <label>Phone Number</label>
              <input v-model="form.phone" type="text" placeholder="If any" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Password</label>
              <input v-model="form.password" type="text" placeholder="Password" />
            </div>
            <div class="form-group">
              <label>PIN Code</label>
              <input v-model="form.pin" type="text" placeholder="If any" />
            </div>
          </div>

          <div class="form-group">
            <label>Notes / Security Questions</label>
            <textarea v-model="form.notes" rows="3" placeholder="Any additional info..."></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button v-if="editingPassword" class="btn btn-danger" @click="handleDelete">Delete</button>
          <button class="btn btn-primary" @click="handleSave">
            {{ editingPassword ? 'Save Changes' : 'Add Account' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Search Bar */
.search-bar {
  position: relative;
  margin-bottom: var(--space-md);
}

.search-input {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  padding-right: 32px;
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-full);
  font-size: 0.875rem;
  background: var(--white);
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: var(--lavender-400);
}

.search-clear {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.25rem;
  color: var(--text-secondary);
  cursor: pointer;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: var(--space-2xl) var(--space-lg);
}

.empty-vio {
  width: 120px;
  height: auto;
  margin-bottom: var(--space-md);
  opacity: 0.8;
}

.empty-title {
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 var(--space-xs);
}

.empty-text {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
}

/* Cards Grid */
.cards-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}

@media (min-width: 500px) {
  .cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Password Card */
.password-card {
  position: relative;
  background: var(--white);
  border: 2px solid var(--lavender-200);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
}

.card-number {
  position: absolute;
  top: 8px;
  right: 12px;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--lavender-100);
}

/* Fields */
.field {
  margin-bottom: var(--space-sm);
}

.field label {
  display: block;
  font-size: 0.625rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}

.field-value {
  font-size: 0.8125rem;
  color: var(--text-primary);
  padding: 4px 0;
  border-bottom: 1.5px solid var(--lavender-100);
  min-height: 24px;
  word-break: break-all;
}

.service-name {
  font-weight: 600;
  font-size: 0.9375rem;
  color: var(--lavender-700);
  border-bottom: none;
}

.url-value {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.password-value {
  font-family: monospace;
  letter-spacing: 1px;
}

.date-value {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.field-value-row {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  border-bottom: 1.5px solid var(--lavender-100);
  padding: 4px 0;
}

.field-value-row .field-value {
  flex: 1;
  border-bottom: none;
  padding: 0;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
}

.notes-box {
  font-size: 0.75rem;
  color: var(--text-primary);
  background: var(--lavender-50);
  border: 1.5px solid var(--lavender-100);
  border-radius: var(--radius-sm);
  padding: var(--space-xs);
  min-height: 40px;
  white-space: pre-wrap;
}

/* Buttons */
.copy-btn,
.toggle-btn {
  background: none;
  border: none;
  padding: 2px;
  font-size: 0.875rem;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.copy-btn:hover,
.toggle-btn:hover {
  opacity: 1;
}

.edit-btn {
  width: 100%;
  margin-top: var(--space-sm);
  padding: var(--space-xs) var(--space-sm);
  background: var(--lavender-50);
  border: 1px solid var(--lavender-200);
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--lavender-600);
  cursor: pointer;
  transition: all 0.2s;
}

.edit-btn:hover {
  background: var(--lavender-100);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-md);
}

.modal {
  background: var(--white);
  border-radius: var(--radius-xl);
  width: 100%;
  max-width: 400px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md);
  border-bottom: 1px solid var(--lavender-100);
}

.modal-header h3 {
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.modal-body {
  padding: var(--space-md);
}

.form-group {
  margin-bottom: var(--space-md);
}

.form-group label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: var(--space-xs);
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: var(--space-sm);
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  background: var(--white);
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--lavender-400);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
}

.modal-footer {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-md);
  border-top: 1px solid var(--lavender-100);
}

.btn {
  flex: 1;
  padding: var(--space-sm) var(--space-md);
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--lavender-500);
  color: white;
}

.btn-primary:hover {
  background: var(--lavender-600);
}

.btn-danger {
  background: var(--expense-color);
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}
</style>

<style>
/* Dark mode */
[data-theme="dark"] .search-input {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
  color: var(--text-primary) !important;
}

[data-theme="dark"] .search-input:focus {
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .password-card {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .card-number {
  color: #3D3456 !important;
}

[data-theme="dark"] .field-value {
  border-bottom-color: #3D3456 !important;
}

[data-theme="dark"] .field-value-row {
  border-bottom-color: #3D3456 !important;
}

[data-theme="dark"] .service-name {
  color: #A78BFA !important;
}

[data-theme="dark"] .notes-box {
  background: #2D2640 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .edit-btn {
  background: #2D2640 !important;
  border-color: #3D3456 !important;
  color: #A78BFA !important;
}

[data-theme="dark"] .edit-btn:hover {
  background: #3D3456 !important;
}

[data-theme="dark"] .modal {
  background: #1A1625 !important;
}

[data-theme="dark"] .modal-header {
  border-bottom-color: #3D3456 !important;
}

[data-theme="dark"] .modal-footer {
  border-top-color: #3D3456 !important;
}

[data-theme="dark"] .form-group input,
[data-theme="dark"] .form-group textarea {
  background: #0F0D1A !important;
  border-color: #3D3456 !important;
  color: var(--text-primary) !important;
}

[data-theme="dark"] .form-group input:focus,
[data-theme="dark"] .form-group textarea:focus {
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .btn-primary {
  background: #8B5CF6 !important;
}

[data-theme="dark"] .btn-primary:hover {
  background: #7C3AED !important;
}
</style>
