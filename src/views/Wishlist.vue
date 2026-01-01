<script setup>
import { ref, computed, onMounted, onUnmounted, inject } from 'vue'
import { useFinanceStore } from '../stores'
import HelpTip from '../components/HelpTip.vue'

const store = useFinanceStore()

const showAddModal = ref(false)

// Register FAB action for this page
const fabAction = inject('fabAction')

onMounted(() => {
  // When on this page, FAB opens the add wishlist modal
  fabAction.value = () => {
    showAddModal.value = true
  }
})

onUnmounted(() => {
  // Clean up when leaving the page
  fabAction.value = null
})

const showSaveModal = ref(false)
const selectedItem = ref(null)

// Form state
const newItem = ref({
  name: '',
  price: '',
  emoji: '🎁',
  priority: 'want',
})

const saveAmount = ref('')

const emojiOptions = ['🎁', '👗', '👟', '💄', '🎮', '📱', '💻', '🎧', '📚', '🏠', '🚗', '✈️', '🎸', '🎨', '💍', '⌚']

const priorityOptions = [
  { id: 'need', label: 'Need', color: '#10B981' },
  { id: 'want', label: 'Want', color: '#F59E0B' },
  { id: 'dream', label: 'Dream', color: '#8B5CF6' },
]

// Sorted wishlist - unclaimed first, by priority
const sortedWishlist = computed(() => {
  const priorityOrder = { need: 0, want: 1, dream: 2 }
  return [...store.wishlist.value]
    .filter(item => !item.claimed)
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
})

const claimedItems = computed(() => {
  return store.wishlist.value.filter(item => item.claimed)
})

// Check if balance is low compared to wishlist
const totalWishlistNeeded = computed(() => {
  return sortedWishlist.value.reduce((sum, item) => sum + (item.price - (item.saved || 0)), 0)
})

const isBalanceLow = computed(() => {
  return store.totalBalance.value < totalWishlistNeeded.value * 0.5
})

function addItem() {
  if (!newItem.value.name || !newItem.value.price) return

  store.addWishlistItem({
    name: newItem.value.name,
    price: parseFloat(newItem.value.price),
    emoji: newItem.value.emoji,
    priority: newItem.value.priority,
  })

  newItem.value = { name: '', price: '', emoji: '🎁', priority: 'want' }
  showAddModal.value = false
}

function openSaveModal(item) {
  selectedItem.value = item
  saveAmount.value = ''
  showSaveModal.value = true
}

function saveToItem() {
  if (!saveAmount.value || !selectedItem.value) return

  store.addToWishlistSavings(selectedItem.value.id, parseFloat(saveAmount.value))
  showSaveModal.value = false
  selectedItem.value = null
  saveAmount.value = ''
}

function claimItem(item) {
  if (item.saved >= item.price) {
    store.claimWishlistItem(item.id)
  }
}

function yoloItem(item) {
  if (confirm(`YOLO! Buy "${item.name}" even though you haven't saved enough?`)) {
    store.claimWishlistItem(item.id, true)
  }
}

function formatClaimedDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function deleteItem(id) {
  store.deleteWishlistItem(id)
}

function getProgress(item) {
  return Math.min(100, ((item.saved || 0) / item.price) * 100)
}

function getPriorityColor(priority) {
  const opt = priorityOptions.find(p => p.id === priority)
  return opt?.color || '#F59E0B'
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
        <h3 class="section-title">
          My Wishlist
          <HelpTip text="Save towards things you want! Add items, set their price, and save money towards them. Once you've saved enough, claim your reward!" />
        </h3>
      </div>
    </div>

    <!-- Balance Warning -->
    <div v-if="isBalanceLow && sortedWishlist.length > 0" class="warning-card">
      <img src="/images/vio_fall.png" alt="Vio worried" class="warning-vio" />
      <div class="warning-content">
        <div class="warning-title">Hey, be careful!</div>
        <div class="warning-text">Your balance is getting low... Remember your wishlist goals!</div>
      </div>
    </div>

    <!-- Wishlist Items -->
    <div v-if="sortedWishlist.length === 0" class="empty-state">
      <img src="/images/vio_sit.png" alt="" class="empty-state-vio" />
      <div class="empty-state-title">No wishes yet!</div>
      <div class="empty-state-text">Add something you're saving for</div>
      <button class="btn btn-primary" @click="showAddModal = true">
        + Add Wish
      </button>
    </div>

    <div v-else class="wishlist-grid">
      <div
        v-for="item in sortedWishlist"
        :key="item.id"
        class="wishlist-card"
        :class="{ 'is-ready': item.saved >= item.price }"
      >
        <div class="wishlist-header">
          <span class="wishlist-emoji">{{ item.emoji }}</span>
          <span
            class="wishlist-priority"
            :style="{ background: getPriorityColor(item.priority) }"
          >
            {{ item.priority }}
          </span>
        </div>

        <div class="wishlist-name">{{ item.name }}</div>
        <div class="wishlist-price">{{ store.formatCurrency(item.price) }}</div>

        <div class="wishlist-progress">
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: getProgress(item) + '%', background: getPriorityColor(item.priority) }"
            ></div>
          </div>
          <div class="progress-text">
            {{ store.formatCurrency(item.saved || 0) }} / {{ store.formatCurrency(item.price) }}
          </div>
        </div>

        <div class="wishlist-actions">
          <button
            v-if="item.saved >= item.price"
            class="btn btn-sm btn-claim"
            @click="claimItem(item)"
          >
            🎉 Claim!
          </button>
          <template v-else>
            <button
              class="btn btn-sm btn-save"
              @click="openSaveModal(item)"
            >
              + Save
            </button>
            <button
              class="btn btn-sm btn-yolo"
              @click="yoloItem(item)"
            >
              YOLO!
            </button>
          </template>
          <button class="btn btn-sm btn-ghost" @click="deleteItem(item.id)">
            🗑️
          </button>
        </div>
      </div>
    </div>

    <!-- Achievements Section -->
    <div v-if="claimedItems.length > 0" class="section achievements-section">
      <div class="achievements-header">
        <span class="achievements-icon">🏆</span>
        <div class="achievements-title">Achievements</div>
        <span class="achievements-count">{{ claimedItems.length }} item{{ claimedItems.length > 1 ? 's' : '' }}</span>
      </div>
      <div class="achievements-grid">
        <div
          v-for="item in claimedItems"
          :key="item.id"
          class="achievement-card"
          :class="{ 'was-yolo': item.wasYolo }"
        >
          <div class="achievement-emoji">{{ item.emoji }}</div>
          <div class="achievement-info">
            <div class="achievement-name">{{ item.name }}</div>
            <div class="achievement-price">{{ store.formatCurrency(item.price) }}</div>
            <div class="achievement-meta">
              <span v-if="item.wasYolo" class="yolo-badge">YOLO'd! 🔥</span>
              <span v-else class="saved-badge">Saved 100% 💪</span>
            </div>
          </div>
          <div class="achievement-date">{{ formatClaimedDate(item.claimedAt) }}</div>
        </div>
      </div>
    </div>

    <!-- Add Item Modal -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">Add to Wishlist</h3>
          <button class="modal-close" @click="showAddModal = false">x</button>
        </div>

        <div class="input-group">
          <label class="input-label">What do you want?</label>
          <input
            v-model="newItem.name"
            type="text"
            class="input"
            placeholder="e.g., New headphones"
          />
        </div>

        <div class="input-group">
          <label class="input-label">How much is it?</label>
          <input
            v-model="newItem.price"
            type="number"
            class="input"
            placeholder="e.g., 500000"
            inputmode="numeric"
          />
        </div>

        <div class="input-group">
          <label class="input-label">Pick an emoji</label>
          <div class="emoji-grid">
            <button
              v-for="emoji in emojiOptions"
              :key="emoji"
              class="emoji-btn"
              :class="{ active: newItem.emoji === emoji }"
              @click="newItem.emoji = emoji"
            >
              {{ emoji }}
            </button>
          </div>
        </div>

        <div class="input-group">
          <label class="input-label">Priority</label>
          <div class="priority-grid">
            <button
              v-for="opt in priorityOptions"
              :key="opt.id"
              class="priority-btn"
              :class="{ active: newItem.priority === opt.id }"
              :style="newItem.priority === opt.id ? { background: opt.color, borderColor: opt.color } : {}"
              @click="newItem.priority = opt.id"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <button class="btn btn-primary btn-lg w-full" @click="addItem">
          Add to Wishlist
        </button>
      </div>
    </div>

    <!-- Save To Item Modal -->
    <div v-if="showSaveModal" class="modal-overlay" @click.self="showSaveModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">Save towards {{ selectedItem?.name }}</h3>
          <button class="modal-close" @click="showSaveModal = false">x</button>
        </div>

        <div class="save-modal-info">
          <span class="save-modal-emoji">{{ selectedItem?.emoji }}</span>
          <div>
            <div class="save-modal-remaining">
              {{ store.formatCurrency((selectedItem?.price || 0) - (selectedItem?.saved || 0)) }} left
            </div>
            <div class="text-sm text-muted">
              {{ store.formatCurrency(selectedItem?.saved || 0) }} saved so far
            </div>
          </div>
        </div>

        <div class="input-group">
          <label class="input-label">How much to save?</label>
          <input
            v-model="saveAmount"
            type="number"
            class="input"
            placeholder="Amount"
            inputmode="numeric"
          />
        </div>

        <button class="btn btn-primary btn-lg w-full" @click="saveToItem">
          Save!
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.warning-card {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: rgba(244, 63, 94, 0.1);
  border: 2px solid var(--expense-color);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-md);
}

.warning-vio {
  width: 60px;
  height: auto;
}

.warning-title {
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--expense-color);
}

.warning-text {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.wishlist-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.wishlist-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  border: 2px solid var(--border-color);
}

.wishlist-card.is-ready {
  border-color: var(--income-color);
  background: rgba(16, 185, 129, 0.05);
}

.wishlist-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-sm);
}

.wishlist-emoji {
  font-size: 2rem;
}

.wishlist-priority {
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: 0.625rem;
  font-weight: 700;
  color: white;
  text-transform: uppercase;
}

.wishlist-name {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.125rem;
  color: var(--text-primary);
  margin-bottom: var(--space-xs);
}

.wishlist-price {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: var(--space-md);
}

.wishlist-progress {
  margin-bottom: var(--space-md);
}

.progress-bar {
  height: 8px;
  background: var(--gray-200);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-bottom: var(--space-xs);
}

.progress-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.wishlist-actions {
  display: flex;
  gap: var(--space-sm);
}

.btn-save {
  background: var(--lavender-500);
  color: white;
  flex: 1;
}

.btn-claim {
  background: var(--income-color);
  color: white;
  flex: 1;
  animation: pulse 1s infinite;
}

.btn-yolo {
  background: linear-gradient(135deg, #F97316 0%, #EF4444 100%);
  color: white;
  font-weight: 700;
  border: none;
}

.btn-yolo:hover {
  background: linear-gradient(135deg, #EA580C 0%, #DC2626 100%);
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

/* Achievements Section */
.achievements-section {
  margin-top: var(--space-xl);
}

.achievements-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-md);
}

.achievements-icon {
  font-size: 1.5rem;
}

.achievements-title {
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 700;
  color: #78350F;
  flex: 1;
}

.achievements-count {
  font-size: 0.75rem;
  font-weight: 600;
  color: #92400E;
  background: rgba(255, 255, 255, 0.4);
  padding: 4px 10px;
  border-radius: 12px;
}

.achievements-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.achievement-card {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--bg-card);
  border: 2px solid var(--income-color);
  border-radius: var(--radius-lg);
}

.achievement-card.was-yolo {
  border-color: #F97316;
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.05) 0%, rgba(239, 68, 68, 0.05) 100%);
}

.achievement-emoji {
  font-size: 2rem;
  flex-shrink: 0;
}

.achievement-info {
  flex: 1;
  min-width: 0;
}

.achievement-name {
  font-weight: 700;
  font-size: 0.9375rem;
  margin-bottom: 2px;
}

.achievement-price {
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

.achievement-meta {
  margin-top: var(--space-xs);
}

.saved-badge {
  display: inline-block;
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 2px 8px;
  background: rgba(16, 185, 129, 0.15);
  color: #059669;
  border-radius: 10px;
}

.yolo-badge {
  display: inline-block;
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 2px 8px;
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.2) 0%, rgba(239, 68, 68, 0.2) 100%);
  color: #EA580C;
  border-radius: 10px;
}

.achievement-date {
  font-size: 0.6875rem;
  color: var(--text-secondary);
  flex-shrink: 0;
}

/* Modal extras */
.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: var(--space-xs);
}

.emoji-btn {
  padding: var(--space-sm);
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-md);
  background: var(--bg-card);
  font-size: 1.25rem;
  cursor: pointer;
}

.emoji-btn.active {
  border-color: var(--lavender-500);
  background: var(--lavender-50);
}

.priority-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-sm);
}

.priority-btn {
  padding: var(--space-sm);
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-md);
  background: var(--bg-card);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  color: var(--text-primary);
}

.priority-btn.active {
  color: white;
}

.save-modal-info {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--gray-100);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-md);
}

.save-modal-emoji {
  font-size: 2.5rem;
}

.save-modal-remaining {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.125rem;
  color: var(--text-primary);
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: var(--space-xl) var(--space-md);
}

.empty-state-vio {
  width: 120px;
  height: auto;
  margin-bottom: var(--space-md);
}

.empty-state-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.125rem;
  color: var(--text-primary);
  margin-bottom: var(--space-xs);
}

.empty-state-text {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: var(--space-lg);
}
</style>

<style>
/* Dark mode */
[data-theme="dark"] .achievements-header {
  background: linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%) !important;
}

[data-theme="dark"] .achievements-title {
  color: white !important;
}

[data-theme="dark"] .achievements-count {
  color: rgba(255, 255, 255, 0.8) !important;
  background: rgba(0, 0, 0, 0.2) !important;
}

[data-theme="dark"] .achievement-card {
  background: #1A1625 !important;
  border-color: #22C55E !important;
}

[data-theme="dark"] .achievement-card.was-yolo {
  border-color: #F97316 !important;
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(239, 68, 68, 0.1) 100%) !important;
}

[data-theme="dark"] .saved-badge {
  background: rgba(16, 185, 129, 0.2) !important;
}

[data-theme="dark"] .yolo-badge {
  background: rgba(249, 115, 22, 0.25) !important;
}
</style>
