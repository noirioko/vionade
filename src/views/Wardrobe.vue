<script setup>
import { ref, computed, inject, onMounted, onUnmounted } from 'vue'
import { useFinanceStore } from '../stores'

const store = useFinanceStore()
const fabAction = inject('fabAction')

// Filter state
const categoryFilter = ref('all')
const locationFilter = ref('all')
const searchQuery = ref('')
const showFavoritesOnly = ref(false)

// Modal state
const showItemModal = ref(false)
const editingItem = ref(null)
const isUploadingImage = ref(false)

// Form state
const itemForm = ref({
  name: '',
  category: 'tops',
  photo: '',
  location: '',
  color: '',
  brand: '',
  notes: '',
  favorite: false,
})

// Filtered items
const filteredItems = computed(() => {
  return store.getFilteredWardrobe({
    category: categoryFilter.value,
    location: locationFilter.value,
    search: searchQuery.value,
    favoritesOnly: showFavoritesOnly.value,
  })
})

// All locations for filter
const locations = computed(() => store.getWardrobeLocations())

// Stats
const stats = computed(() => store.getWardrobeStats())

// Modal functions
function openAddItem() {
  editingItem.value = null
  itemForm.value = {
    name: '',
    category: 'tops',
    photo: '',
    location: '',
    color: '',
    brand: '',
    notes: '',
    favorite: false,
  }
  showItemModal.value = true
}

function openEditItem(item) {
  editingItem.value = item
  itemForm.value = {
    name: item.name,
    category: item.category,
    photo: item.photo || '',
    location: item.location || '',
    color: item.color || '',
    brand: item.brand || '',
    notes: item.notes || '',
    favorite: item.favorite || false,
  }
  showItemModal.value = true
}

function saveItem() {
  const trimmedName = itemForm.value.name.trim()
  if (!trimmedName) return

  const dataToSave = {
    ...itemForm.value,
    name: trimmedName,
    location: itemForm.value.location.trim(),
    color: itemForm.value.color.trim(),
    brand: itemForm.value.brand.trim(),
    notes: itemForm.value.notes.trim(),
  }

  if (editingItem.value) {
    store.updateWardrobeItem(editingItem.value.id, dataToSave)
  } else {
    store.addWardrobeItem(dataToSave)
  }
  showItemModal.value = false
}

function deleteItem(id) {
  if (confirm('Delete this item?')) {
    store.deleteWardrobeItem(id)
    showItemModal.value = false
  }
}

// Quick toggle favorite
function quickToggleFavorite(id, event) {
  event.stopPropagation()
  store.toggleWardrobeFavorite(id)
}

// Image upload
function handleImageUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return

  isUploadingImage.value = true

  const reader = new FileReader()
  reader.onload = (e) => {
    const img = new Image()
    img.onload = () => {
      const maxSize = 400
      let { width, height } = img

      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width
          width = maxSize
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height
          height = maxSize
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7)
      itemForm.value.photo = compressedBase64
      isUploadingImage.value = false
    }
    img.onerror = () => {
      isUploadingImage.value = false
      alert('Could not load image. Please try a different file.')
    }
    img.src = e.target.result
  }
  reader.onerror = () => {
    isUploadingImage.value = false
    alert('Could not read file. Please try again.')
  }
  reader.readAsDataURL(file)
}

// Get category info
function getCategoryInfo(categoryId) {
  return store.WARDROBE_CATEGORIES.find(c => c.id === categoryId) || store.WARDROBE_CATEGORIES[0]
}

// FAB action
onMounted(() => {
  fabAction.value = openAddItem
})

onUnmounted(() => {
  fabAction.value = null
})
</script>

<template>
  <div class="page">
    <!-- Header -->
    <div class="page-header">
      <img src="/images/vio-logo.png" alt="Vionade" class="page-header-logo" />
    </div>

    <h1 class="page-title">Wardrobe</h1>
    <p class="page-subtitle">{{ stats.total }} items in your closet</p>

    <!-- Stats Row -->
    <div class="stats-row">
      <div class="stat-chip">
        <span class="stat-emoji">❤️</span>
        <span class="stat-value">{{ stats.favorites }}</span>
        <span class="stat-label">favorites</span>
      </div>
      <div class="stat-chip">
        <span class="stat-emoji">📍</span>
        <span class="stat-value">{{ stats.locations }}</span>
        <span class="stat-label">locations</span>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-section">
      <div class="filter-row">
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="Search clothes..."
        />
      </div>

      <div class="filter-row">
        <div class="filter-pills">
          <button
            class="filter-pill"
            :class="{ active: categoryFilter === 'all' }"
            @click="categoryFilter = 'all'"
          >All</button>
          <button
            v-for="cat in store.WARDROBE_CATEGORIES"
            :key="cat.id"
            class="filter-pill"
            :class="{ active: categoryFilter === cat.id }"
            @click="categoryFilter = cat.id"
          >{{ cat.emoji }}</button>
        </div>
      </div>

      <div class="filter-row">
        <select v-model="locationFilter" class="location-select">
          <option value="all">All Locations</option>
          <option v-for="loc in locations" :key="loc" :value="loc">{{ loc }}</option>
        </select>
        <label class="favorites-toggle">
          <input v-model="showFavoritesOnly" type="checkbox" />
          ❤️ Only
        </label>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="filteredItems.length === 0" class="empty-state">
      <img src="/images/vio_sit.png" alt="Vio" class="empty-vio" />
      <p v-if="searchQuery || categoryFilter !== 'all' || locationFilter !== 'all' || showFavoritesOnly">
        No items match your filters
      </p>
      <p v-else>No clothes yet! Tap + to add your first item.</p>
    </div>

    <!-- Items Grid -->
    <div class="items-grid">
      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="wardrobe-card"
        @click="openEditItem(item)"
      >
        <button
          class="favorite-btn"
          :class="{ active: item.favorite }"
          @click="quickToggleFavorite(item.id, $event)"
        >{{ item.favorite ? '❤️' : '🤍' }}</button>

        <div class="wardrobe-photo">
          <img v-if="item.photo" :src="item.photo" :alt="item.name" />
          <span v-else class="wardrobe-emoji">{{ getCategoryInfo(item.category).emoji }}</span>
        </div>

        <div class="wardrobe-info">
          <span class="wardrobe-name">{{ item.name }}</span>
          <span v-if="item.color" class="wardrobe-color">{{ item.color }}</span>
          <span v-if="item.location" class="wardrobe-location">📍 {{ item.location }}</span>
        </div>

        <span class="category-badge" :class="item.category">
          {{ getCategoryInfo(item.category).emoji }}
        </span>
      </div>
    </div>

    <!-- Add/Edit Item Modal -->
    <div v-if="showItemModal" class="modal-overlay" @click.self="showItemModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingItem ? 'Edit Item' : 'Add Item' }}</h3>
          <button class="modal-close" @click="showItemModal = false">×</button>
        </div>

        <div class="modal-body">
          <!-- Photo Upload -->
          <div class="photo-upload-section">
            <div class="photo-preview">
              <img v-if="itemForm.photo" :src="itemForm.photo" alt="Item photo" />
              <span v-else>{{ getCategoryInfo(itemForm.category).emoji }}</span>
            </div>
            <div class="photo-actions">
              <label class="upload-photo-btn">
                <input type="file" accept="image/*" @change="handleImageUpload" hidden />
                {{ isUploadingImage ? 'Processing...' : 'Upload Photo' }}
              </label>
              <button v-if="itemForm.photo" class="remove-photo-btn" @click="itemForm.photo = ''">Remove</button>
            </div>
          </div>

          <div class="form-group">
            <label>Item Name</label>
            <input v-model="itemForm.name" type="text" placeholder="Blue striped shirt" />
          </div>

          <div class="form-group">
            <label>Category</label>
            <div class="category-options">
              <button
                v-for="cat in store.WARDROBE_CATEGORIES"
                :key="cat.id"
                class="category-btn"
                :class="{ active: itemForm.category === cat.id }"
                @click="itemForm.category = cat.id"
              >
                {{ cat.emoji }}
              </button>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group half">
              <label>Color</label>
              <input v-model="itemForm.color" type="text" placeholder="Blue, White" />
            </div>
            <div class="form-group half">
              <label>Brand</label>
              <input v-model="itemForm.brand" type="text" placeholder="Uniqlo" />
            </div>
          </div>

          <div class="form-group">
            <label>Location</label>
            <input v-model="itemForm.location" type="text" placeholder="Closet A, Mom's house" list="location-suggestions" />
            <datalist id="location-suggestions">
              <option v-for="loc in locations" :key="loc" :value="loc" />
            </datalist>
          </div>

          <div class="form-group">
            <label>Notes</label>
            <textarea v-model="itemForm.notes" placeholder="Any notes" rows="2"></textarea>
          </div>

          <div class="form-group">
            <label class="favorite-checkbox">
              <input v-model="itemForm.favorite" type="checkbox" />
              <span>❤️ Mark as favorite</span>
            </label>
          </div>
        </div>

        <div class="modal-footer">
          <button v-if="editingItem" class="delete-btn" @click="deleteItem(editingItem.id)">Delete</button>
          <button class="save-btn" @click="saveItem">{{ editingItem ? 'Save' : 'Add Item' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 var(--space-xs);
}

.page-subtitle {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin: 0 0 var(--space-md);
}

/* Stats Row */
.stats-row {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-lg);
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: var(--space-xs) var(--space-md);
  background: white;
  border: 2px solid var(--border-color);
  border-radius: 20px;
}

.stat-emoji {
  font-size: 0.875rem;
}

.stat-value {
  font-weight: 700;
  font-size: 0.875rem;
}

.stat-label {
  font-size: 0.6875rem;
  color: var(--text-secondary);
}

/* Filters */
.filters-section {
  margin-bottom: var(--space-lg);
}

.filter-row {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
  align-items: center;
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  padding: var(--space-sm);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 0.875rem;
}

.filter-pills {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.filter-pill {
  padding: 6px 10px;
  background: white;
  border: 2px solid var(--border-color);
  border-radius: 20px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.15s;
}

.filter-pill:hover {
  border-color: #ec4899;
}

.filter-pill.active {
  background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%);
  border-color: #ec4899;
  color: white;
}

.location-select {
  flex: 1;
  padding: var(--space-sm);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 0.75rem;
  background: white;
}

.favorites-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: 0.75rem;
  cursor: pointer;
  white-space: nowrap;
  padding: var(--space-xs) var(--space-sm);
  border: 2px solid var(--border-color);
  border-radius: 8px;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: var(--space-xl);
}

.empty-vio {
  width: 80px;
  margin-bottom: var(--space-md);
}

/* Items Grid */
.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--space-md);
  padding-bottom: var(--space-xl);
}

.wardrobe-card {
  position: relative;
  background: white;
  border: 2px solid var(--border-color);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
}

.wardrobe-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.favorite-btn {
  position: absolute;
  top: var(--space-xs);
  right: var(--space-xs);
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  font-size: 0.875rem;
  cursor: pointer;
  z-index: 1;
  transition: transform 0.15s;
}

.favorite-btn:hover {
  transform: scale(1.1);
}

.wardrobe-photo {
  width: 100%;
  aspect-ratio: 1;
  background: linear-gradient(135deg, #fce7f3 0%, #f3e8ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.wardrobe-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.wardrobe-emoji {
  font-size: 3rem;
}

.wardrobe-info {
  padding: var(--space-sm);
}

.wardrobe-name {
  display: block;
  font-weight: 700;
  font-size: 0.8125rem;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wardrobe-color {
  display: block;
  font-size: 0.6875rem;
  color: var(--text-secondary);
}

.wardrobe-location {
  display: block;
  font-size: 0.625rem;
  color: var(--text-secondary);
  margin-top: 2px;
}

.category-badge {
  position: absolute;
  top: var(--space-xs);
  left: var(--space-xs);
  width: 24px;
  height: 24px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 24px 24px 0 0;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md) var(--space-lg);
  border-bottom: 2px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  font-family: var(--font-display);
}

.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
}

.modal-body {
  padding: var(--space-lg);
}

/* Photo Upload */
.photo-upload-section {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
  padding: var(--space-md);
  background: var(--gray-50);
  border-radius: 12px;
}

.photo-preview {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  background: linear-gradient(135deg, #fce7f3 0%, #f3e8ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  overflow: hidden;
  flex-shrink: 0;
}

.photo-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.upload-photo-btn {
  padding: var(--space-sm) var(--space-md);
  background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%);
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.75rem;
  color: white;
  cursor: pointer;
  text-align: center;
}

.remove-photo-btn {
  padding: var(--space-xs) var(--space-sm);
  background: transparent;
  border: 1px solid #FF6B6B;
  border-radius: 6px;
  font-size: 0.6875rem;
  color: #FF6B6B;
  cursor: pointer;
}

/* Form */
.form-group {
  margin-bottom: var(--space-md);
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: var(--space-xs);
  font-size: 0.875rem;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
}

.form-group textarea {
  resize: none;
  font-family: inherit;
}

.form-row {
  display: flex;
  gap: var(--space-md);
}

.form-group.half {
  flex: 1;
}

/* Category Options */
.category-options {
  display: flex;
  gap: var(--space-xs);
  flex-wrap: wrap;
}

.category-btn {
  width: 40px;
  height: 40px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 1.25rem;
  cursor: pointer;
  background: white;
  transition: all 0.15s;
}

.category-btn:hover {
  border-color: #ec4899;
}

.category-btn.active {
  background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%);
  border-color: transparent;
}

/* Favorite Checkbox */
.favorite-checkbox {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  cursor: pointer;
}

.favorite-checkbox input {
  width: auto;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  padding: var(--space-md) var(--space-lg);
  border-top: 2px solid var(--border-color);
}

.save-btn {
  padding: var(--space-sm) var(--space-xl);
  background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%);
  border: none;
  border-radius: 12px;
  font-weight: 700;
  color: white;
  cursor: pointer;
}

.delete-btn {
  padding: var(--space-sm) var(--space-lg);
  background: white;
  border: 2px solid #FF6B6B;
  border-radius: 12px;
  font-weight: 700;
  color: #FF6B6B;
  cursor: pointer;
}

.delete-btn:hover {
  background: #FF6B6B;
  color: white;
}
</style>

<style>
/* Dark Mode */
[data-theme="dark"] .stat-chip {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .wardrobe-card {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .wardrobe-photo {
  background: linear-gradient(135deg, #3D3456 0%, #4D4466 100%) !important;
}

[data-theme="dark"] .favorite-btn {
  background: rgba(26, 22, 37, 0.9) !important;
}

[data-theme="dark"] .category-badge {
  background: #1A1625 !important;
}

[data-theme="dark"] .filter-pill {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .filter-pill.active {
  background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%) !important;
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .search-input,
[data-theme="dark"] .location-select {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
  color: var(--text-primary) !important;
}

[data-theme="dark"] .favorites-toggle {
  border-color: #3D3456 !important;
}

[data-theme="dark"] .modal {
  background: #1A1625 !important;
}

[data-theme="dark"] .photo-upload-section {
  background: #2D2640 !important;
}

[data-theme="dark"] .photo-preview {
  background: linear-gradient(135deg, #3D3456 0%, #4D4466 100%) !important;
}

[data-theme="dark"] .category-btn {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .category-btn:hover {
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .category-btn.active {
  background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%) !important;
}

[data-theme="dark"] .upload-photo-btn {
  background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%) !important;
}

[data-theme="dark"] .save-btn {
  background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%) !important;
}
</style>
