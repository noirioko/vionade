<script setup>
import { ref, computed, inject, onMounted, onUnmounted } from 'vue'
import { useFinanceStore } from '../stores'
import { useToast } from '../composables/useToast'

const store = useFinanceStore()
const toast = useToast()
const fabAction = inject('fabAction')

// Filter state
const categoryFilter = ref('all')
const searchQuery = ref('')
const showFavoritesOnly = ref(false)

// Active tag filter (clickable tags on cards)
const activeTagFilter = ref(null) // { type: 'brand' | 'location' | 'collection', value: string }

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
  collection: '',
  notes: '',
  favorite: false,
})

// Filtered items
const filteredItems = computed(() => {
  const options = {
    category: categoryFilter.value,
    search: searchQuery.value,
    favoritesOnly: showFavoritesOnly.value,
  }

  // Apply tag filter if active
  if (activeTagFilter.value) {
    options[activeTagFilter.value.type] = activeTagFilter.value.value
  }

  return store.getFilteredWardrobe(options)
})

// All locations, brands, collections for autocomplete
const locations = computed(() => store.getWardrobeLocations())
const brands = computed(() => store.getWardrobeBrands())
const collections = computed(() => store.getWardrobeCollections())

// Stats
const stats = computed(() => store.getWardrobeStats())

// Tag filter functions
function filterByTag(type, value, event) {
  if (event) event.stopPropagation()
  activeTagFilter.value = { type, value }
}

function clearTagFilter() {
  activeTagFilter.value = null
}

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
    collection: '',
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
    collection: item.collection || '',
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
    collection: itemForm.value.collection.trim(),
    notes: itemForm.value.notes.trim(),
  }

  if (editingItem.value) {
    store.updateWardrobeItem(editingItem.value.id, dataToSave)
    toast.success('Item updated!')
  } else {
    store.addWardrobeItem(dataToSave)
    toast.success('Item added!')
  }
  showItemModal.value = false
}

function deleteItem(id) {
  if (confirm('Delete this item?')) {
    store.deleteWardrobeItem(id)
    showItemModal.value = false
    toast.success('Item deleted')
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
      toast.error('Could not load image. Please try a different file.')
    }
    img.src = e.target.result
  }
  reader.onerror = () => {
    isUploadingImage.value = false
    toast.error('Could not read file. Please try again.')
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
  <div class="page wardrobe-page">
    <!-- Header -->
    <div class="page-header">
      <img src="/images/vio-logo.png" alt="Vionade" class="page-header-logo" />
    </div>

    <!-- Wardrobe Banner -->
    <div class="wardrobe-banner">
      <div class="wardrobe-banner-content">
        <div class="wardrobe-banner-title">Wardrobe</div>
        <div class="wardrobe-banner-subtitle">{{ stats.total }} items in your closet</div>
      </div>
      <img src="/images/vio_sit.png" alt="Vio" class="wardrobe-banner-vio" />
    </div>

    <!-- Quick Filter Tags (clickable brands/locations/collections) -->
    <div v-if="brands.length > 0 || locations.length > 0 || collections.length > 0" class="quick-filters">
      <div class="quick-filter-section" v-if="brands.length > 0">
        <span class="quick-filter-label">Brands:</span>
        <div class="quick-filter-tags">
          <button
            v-for="brand in brands"
            :key="brand"
            class="quick-tag"
            :class="{ active: activeTagFilter?.type === 'brand' && activeTagFilter?.value === brand }"
            @click="filterByTag('brand', brand)"
          >{{ brand }}</button>
        </div>
      </div>
      <div class="quick-filter-section" v-if="locations.length > 0">
        <span class="quick-filter-label">Locations:</span>
        <div class="quick-filter-tags">
          <button
            v-for="loc in locations"
            :key="loc"
            class="quick-tag location"
            :class="{ active: activeTagFilter?.type === 'location' && activeTagFilter?.value === loc }"
            @click="filterByTag('location', loc)"
          >{{ loc }}</button>
        </div>
      </div>
      <div class="quick-filter-section" v-if="collections.length > 0">
        <span class="quick-filter-label">Series:</span>
        <div class="quick-filter-tags">
          <button
            v-for="col in collections"
            :key="col"
            class="quick-tag collection"
            :class="{ active: activeTagFilter?.type === 'collection' && activeTagFilter?.value === col }"
            @click="filterByTag('collection', col)"
          >{{ col }}</button>
        </div>
      </div>
    </div>

    <!-- Active Filter Chip -->
    <div v-if="activeTagFilter" class="active-filter-bar">
      <span class="active-filter-label">Showing:</span>
      <button class="active-filter-chip" @click="clearTagFilter">
        <span class="chip-icon">
          {{ activeTagFilter.type === 'brand' ? '🏷️' : activeTagFilter.type === 'location' ? '📍' : '📦' }}
        </span>
        {{ activeTagFilter.value }}
        <span class="chip-close">×</span>
      </button>
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
        <label class="favorites-toggle">
          <input v-model="showFavoritesOnly" type="checkbox" />
          ❤️ Only
        </label>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="filteredItems.length === 0" class="empty-state">
      <img src="/images/vio_sit.png" alt="Vio" class="empty-vio" />
      <p v-if="searchQuery || categoryFilter !== 'all' || showFavoritesOnly || activeTagFilter">
        No items match your filters
        <button v-if="activeTagFilter" class="clear-filter-link" @click="clearTagFilter">Clear filter</button>
      </p>
      <p v-else>No clothes yet! Tap + to add your first item.</p>
    </div>

    <!-- Items Grid -->
    <div v-else class="items-grid">
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

          <!-- Clickable Tags -->
          <div class="wardrobe-tags">
            <button
              v-if="item.brand"
              class="item-tag brand"
              :class="{ active: activeTagFilter?.type === 'brand' && activeTagFilter?.value === item.brand }"
              @click="filterByTag('brand', item.brand, $event)"
            >🏷️ {{ item.brand }}</button>
            <button
              v-if="item.location"
              class="item-tag location"
              :class="{ active: activeTagFilter?.type === 'location' && activeTagFilter?.value === item.location }"
              @click="filterByTag('location', item.location, $event)"
            >📍 {{ item.location }}</button>
            <button
              v-if="item.collection"
              class="item-tag collection"
              :class="{ active: activeTagFilter?.type === 'collection' && activeTagFilter?.value === item.collection }"
              @click="filterByTag('collection', item.collection, $event)"
            >📦 {{ item.collection }}</button>
          </div>
        </div>

        <span class="category-badge">
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
              <input v-model="itemForm.brand" type="text" placeholder="Uniqlo" list="brand-suggestions" />
              <datalist id="brand-suggestions">
                <option v-for="b in brands" :key="b" :value="b" />
              </datalist>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group half">
              <label>Location</label>
              <input v-model="itemForm.location" type="text" placeholder="Closet A" list="location-suggestions" />
              <datalist id="location-suggestions">
                <option v-for="loc in locations" :key="loc" :value="loc" />
              </datalist>
            </div>
            <div class="form-group half">
              <label>Series/Collection</label>
              <input v-model="itemForm.collection" type="text" placeholder="Summer 2024" list="collection-suggestions" />
              <datalist id="collection-suggestions">
                <option v-for="c in collections" :key="c" :value="c" />
              </datalist>
            </div>
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
/* Wardrobe Banner */
.wardrobe-banner {
  position: relative;
  display: flex;
  align-items: center;
  background:
    linear-gradient(135deg, rgba(236, 72, 153, 0.8) 0%, rgba(244, 114, 182, 0.8) 50%, rgba(249, 168, 212, 0.8) 100%),
    url('/images/kawaii-bg.jpg') center center / cover no-repeat;
  border-radius: var(--radius-xl);
  overflow: hidden;
  min-height: 120px;
  margin-bottom: var(--space-md);
  box-shadow: 0 4px 16px rgba(236, 72, 153, 0.3);
}

.wardrobe-banner-content {
  flex: 1;
  padding: var(--space-lg);
}

.wardrobe-banner-title {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.wardrobe-banner-subtitle {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 4px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.wardrobe-banner-vio {
  height: 120px;
  width: auto;
  flex-shrink: 0;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
  align-self: flex-end;
  margin-right: var(--space-sm);
}

@media (max-width: 480px) {
  .wardrobe-banner-title { font-size: 1.5rem; }
  .wardrobe-banner-vio { height: 100px; }
}

/* Quick Filters */
.quick-filters {
  margin-bottom: var(--space-md);
  padding: var(--space-sm);
  background: var(--gray-50);
  border-radius: 12px;
}

.quick-filter-section {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  margin-bottom: var(--space-xs);
  flex-wrap: wrap;
}

.quick-filter-section:last-child { margin-bottom: 0; }

.quick-filter-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-secondary);
  min-width: 60px;
}

.quick-filter-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.quick-tag {
  padding: 4px 10px;
  background: white;
  border: 1.5px solid var(--border-color);
  border-radius: 20px;
  font-size: 0.6875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  color: #be185d;
}

.quick-tag:hover { border-color: #ec4899; background: #fdf2f8; }
.quick-tag.active { background: #ec4899; border-color: #ec4899; color: white; }

.quick-tag.location { color: #0369a1; }
.quick-tag.location:hover { border-color: #0ea5e9; background: #f0f9ff; }
.quick-tag.location.active { background: #0ea5e9; border-color: #0ea5e9; color: white; }

.quick-tag.collection { color: #7c3aed; }
.quick-tag.collection:hover { border-color: #8b5cf6; background: #faf5ff; }
.quick-tag.collection.active { background: #8b5cf6; border-color: #8b5cf6; color: white; }

/* Active Filter Bar */
.active-filter-bar {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  background: linear-gradient(135deg, #fce7f3 0%, #f3e8ff 100%);
  border-radius: 12px;
}

.active-filter-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.active-filter-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: white;
  border: 2px solid #ec4899;
  border-radius: 20px;
  font-size: 0.8125rem;
  font-weight: 700;
  color: #be185d;
  cursor: pointer;
  transition: all 0.15s;
}

.active-filter-chip:hover { background: #fdf2f8; }

.chip-icon { font-size: 0.875rem; }
.chip-close { font-size: 1rem; margin-left: 2px; opacity: 0.7; }
.chip-close:hover { opacity: 1; }

/* Filters */
.filters-section { margin-bottom: var(--space-lg); }

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

.filter-pills { display: flex; gap: 4px; flex-wrap: wrap; }

.filter-pill {
  padding: 6px 10px;
  background: white;
  border: 2px solid var(--border-color);
  border-radius: 20px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.15s;
}

.filter-pill:hover { border-color: #ec4899; }

.filter-pill.active {
  background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%);
  border-color: #ec4899;
  color: white;
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
.empty-state { text-align: center; padding: var(--space-xl); }
.empty-vio { width: 80px; margin-bottom: var(--space-md); }
.clear-filter-link {
  display: block;
  margin-top: var(--space-sm);
  background: none;
  border: none;
  color: #ec4899;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
}

/* Items Grid */
.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
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

.favorite-btn:hover { transform: scale(1.1); }

.wardrobe-photo {
  width: 100%;
  aspect-ratio: 1;
  background: linear-gradient(135deg, #fce7f3 0%, #f3e8ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.wardrobe-photo img { width: 100%; height: 100%; object-fit: cover; }
.wardrobe-emoji { font-size: 3rem; }

.wardrobe-info { padding: var(--space-sm); }

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
  margin-bottom: 4px;
}

/* Clickable Tags on Cards */
.wardrobe-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.item-tag {
  padding: 2px 8px;
  background: #fdf2f8;
  border: 1px solid #fbcfe8;
  border-radius: 10px;
  font-size: 0.5625rem;
  font-weight: 600;
  color: #be185d;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.item-tag:hover { background: #fce7f3; border-color: #f9a8d4; }
.item-tag.active { background: #ec4899; border-color: #ec4899; color: white; }

.item-tag.location { background: #f0f9ff; border-color: #bae6fd; color: #0369a1; }
.item-tag.location:hover { background: #e0f2fe; border-color: #7dd3fc; }
.item-tag.location.active { background: #0ea5e9; border-color: #0ea5e9; color: white; }

.item-tag.collection { background: #faf5ff; border-color: #e9d5ff; color: #7c3aed; }
.item-tag.collection:hover { background: #f3e8ff; border-color: #d8b4fe; }
.item-tag.collection.active { background: #8b5cf6; border-color: #8b5cf6; color: white; }

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

.modal-header h3 { margin: 0; font-family: var(--font-display); }

.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
}

.modal-body { padding: var(--space-lg); }

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

.photo-preview img { width: 100%; height: 100%; object-fit: cover; }

.photo-actions { display: flex; flex-direction: column; gap: var(--space-xs); }

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
.form-group { margin-bottom: var(--space-md); }

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

.form-group textarea { resize: none; font-family: inherit; }

.form-row { display: flex; gap: var(--space-md); }
.form-group.half { flex: 1; }

/* Category Options */
.category-options { display: flex; gap: var(--space-xs); flex-wrap: wrap; }

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

.category-btn:hover { border-color: #ec4899; }

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

.favorite-checkbox input { width: auto; }

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

.delete-btn:hover { background: #FF6B6B; color: white; }
</style>

<style>
/* Dark Mode */
[data-theme="dark"] .wardrobe-banner {
  background: linear-gradient(135deg, #831843 0%, #9D174D 50%, #BE185D 100%) !important;
}

[data-theme="dark"] .quick-filters {
  background: #2D2640 !important;
}

[data-theme="dark"] .quick-tag {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
  color: #F9A8D4 !important;
}

[data-theme="dark"] .quick-tag:hover {
  background: #3D3456 !important;
}

[data-theme="dark"] .quick-tag.active {
  background: #8B5CF6 !important;
  border-color: #8B5CF6 !important;
  color: white !important;
}

[data-theme="dark"] .quick-tag.location { color: #7DD3FC !important; }
[data-theme="dark"] .quick-tag.collection { color: #C4B5FD !important; }

[data-theme="dark"] .active-filter-bar {
  background: linear-gradient(135deg, #3D3456 0%, #4D4466 100%) !important;
}

[data-theme="dark"] .active-filter-chip {
  background: #1A1625 !important;
  border-color: #8B5CF6 !important;
  color: #C4B5FD !important;
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

[data-theme="dark"] .item-tag {
  background: #2D2640 !important;
  border-color: #3D3456 !important;
  color: #F9A8D4 !important;
}

[data-theme="dark"] .item-tag.active {
  background: #8B5CF6 !important;
  border-color: #8B5CF6 !important;
  color: white !important;
}

[data-theme="dark"] .item-tag.location { color: #7DD3FC !important; }
[data-theme="dark"] .item-tag.collection { color: #C4B5FD !important; }

[data-theme="dark"] .filter-pill {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .filter-pill.active {
  background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%) !important;
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .search-input {
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
