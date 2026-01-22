<script setup>
import { ref, computed, inject, onMounted, onUnmounted } from 'vue'
import { useFinanceStore, COLLECTION_TYPES } from '../stores'
import { useToast } from '../composables/useToast'

const store = useFinanceStore()
const toast = useToast()
const fabAction = inject('fabAction')

// Tag filter state (clickable filtering)
const activeTagFilter = ref(null) // { type: 'brand' | 'location', value: string }

// View mode: 'all', 'brand', 'location'
const viewMode = ref('all')

// Filter state
const typeFilter = ref('all')
const searchQuery = ref('')
const showComplete = ref(true)

// Modal state
const showCollectionModal = ref(false)
const showItemModal = ref(false)
const editingCollection = ref(null)
const editingItem = ref(null)
const activeCollectionId = ref(null)

// Expanded collections
const expandedCollections = ref(new Set())

// Form state
const collectionForm = ref({
  name: '',
  type: 'blindbox',
  brand: '',
  photo: '',
  totalItems: 0,
  pricePerItem: '',
  location: '',
  notes: '',
})

const itemForm = ref({
  name: '',
  photo: '',
  owned: false,
  pricePaid: '',
  location: '',
  notes: '',
})

const isUploadingImage = ref(false)

// Filtered collections (flat list)
const filteredCollections = computed(() => {
  let collections = store.getFilteredCollections({
    type: typeFilter.value,
    search: searchQuery.value,
    showComplete: showComplete.value,
  })

  // Apply tag filter if active
  if (activeTagFilter.value) {
    const { type, value } = activeTagFilter.value
    if (type === 'brand') {
      collections = collections.filter(c => c.brand === value)
    } else if (type === 'location') {
      collections = collections.filter(c => c.location === value)
    }
  }

  return collections
})

// Grouped collections
const groupedCollections = computed(() => {
  if (viewMode.value === 'all') return null
  return store.getCollectionsGrouped(viewMode.value, {
    type: typeFilter.value,
    search: searchQuery.value,
    showComplete: showComplete.value,
  })
})

// Autocomplete data
const locations = computed(() => store.getCollectionLocations())
const brands = computed(() => store.getCollectionBrands())

// Stats
const stats = computed(() => {
  const collections = store.getCollectionsWithStats()
  return {
    totalCollections: collections.length,
    totalItems: collections.reduce((sum, c) => sum + c.stats.total, 0),
    ownedItems: collections.reduce((sum, c) => sum + c.stats.owned, 0),
    totalSpent: collections.reduce((sum, c) => sum + c.stats.totalSpent, 0),
    brands: brands.value.length,
  }
})

// Toggle collection expansion
function toggleExpand(id) {
  if (expandedCollections.value.has(id)) {
    expandedCollections.value.delete(id)
  } else {
    expandedCollections.value.add(id)
  }
}

function isExpanded(id) {
  return expandedCollections.value.has(id)
}

// Collection modal functions
function openAddCollection() {
  editingCollection.value = null
  collectionForm.value = {
    name: '',
    type: 'blindbox',
    brand: '',
    photo: '',
    totalItems: 0,
    pricePerItem: '',
    location: '',
    notes: '',
  }
  showCollectionModal.value = true
}

function openEditCollection(collection) {
  editingCollection.value = collection
  collectionForm.value = {
    name: collection.name,
    type: collection.type,
    brand: collection.brand || '',
    photo: collection.photo || '',
    totalItems: collection.totalItems,
    pricePerItem: collection.pricePerItem || '',
    location: collection.location || '',
    notes: collection.notes || '',
  }
  showCollectionModal.value = true
}

function saveCollection() {
  const trimmedName = collectionForm.value.name.trim()
  if (!trimmedName) {
    toast.error('Collection name is required')
    return
  }

  const parsedPrice = parseFloat(collectionForm.value.pricePerItem)
  const parsedTotal = parseInt(collectionForm.value.totalItems)

  const data = {
    ...collectionForm.value,
    name: trimmedName,
    brand: collectionForm.value.brand.trim(),
    location: collectionForm.value.location.trim(),
    notes: collectionForm.value.notes.trim(),
    pricePerItem: !isNaN(parsedPrice) ? parsedPrice : null,
    totalItems: !isNaN(parsedTotal) ? parsedTotal : 0,
  }

  if (editingCollection.value) {
    store.updateCollection(editingCollection.value.id, data)
    toast.success('Collection updated!')
  } else {
    store.addCollection(data)
    toast.success('Collection added!')
  }
  showCollectionModal.value = false
}

function deleteCollection(id) {
  if (confirm('Delete this collection and all its items?')) {
    store.deleteCollection(id)
    showCollectionModal.value = false
    toast.success('Collection deleted')
  }
}

// Item modal functions
function openAddItem(collectionId) {
  activeCollectionId.value = collectionId
  editingItem.value = null
  itemForm.value = {
    name: '',
    photo: '',
    owned: true,
    pricePaid: '',
    location: '',
    notes: '',
  }
  showItemModal.value = true
}

function openEditItem(item, collectionId) {
  activeCollectionId.value = collectionId
  editingItem.value = item
  itemForm.value = {
    name: item.name,
    photo: item.photo || '',
    owned: item.owned,
    pricePaid: item.pricePaid || '',
    location: item.location || '',
    notes: item.notes || '',
  }
  showItemModal.value = true
}

function saveItem() {
  const trimmedName = itemForm.value.name.trim()
  if (!trimmedName) {
    toast.error('Item name is required')
    return
  }

  const parsedPrice = parseFloat(itemForm.value.pricePaid)

  const data = {
    ...itemForm.value,
    name: trimmedName,
    location: itemForm.value.location.trim(),
    notes: itemForm.value.notes.trim(),
    collectionId: activeCollectionId.value,
    pricePaid: !isNaN(parsedPrice) ? parsedPrice : null,
  }

  if (editingItem.value) {
    store.updateCollectionItem(editingItem.value.id, data)
    toast.success('Item updated!')
  } else {
    store.addCollectionItem(data)
    toast.success('Item added!')
  }
  showItemModal.value = false
}

function deleteItem(id) {
  if (confirm('Delete this item?')) {
    store.deleteCollectionItem(id)
    showItemModal.value = false
    toast.success('Item deleted')
  }
}

// Quick toggle owned
function quickToggleOwned(itemId) {
  store.toggleItemOwned(itemId)
}

// Image upload
function handleImageUpload(event, target) {
  const file = event.target.files?.[0]
  if (!file) return

  isUploadingImage.value = true

  const reader = new FileReader()
  reader.onload = (e) => {
    const img = new Image()
    img.onload = () => {
      const maxSize = 300
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
      if (target === 'collection') {
        collectionForm.value.photo = compressedBase64
      } else {
        itemForm.value.photo = compressedBase64
      }
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

// Get type info
function getTypeInfo(typeId) {
  return COLLECTION_TYPES.find(t => t.id === typeId) || COLLECTION_TYPES[0]
}

// Tag filter functions
function filterByTag(type, value, event) {
  if (event) event.stopPropagation()
  activeTagFilter.value = { type, value }
}

function clearTagFilter() {
  activeTagFilter.value = null
}

// Render a single collection card (reusable)
function renderCollectionCard(collection) {
  return collection
}

// FAB action
onMounted(() => {
  fabAction.value = openAddCollection
})

onUnmounted(() => {
  fabAction.value = null
})
</script>

<template>
  <div class="page collections-page">
    <!-- Header -->
    <div class="page-header">
      <img src="/images/vio-logo.png" alt="Vionade" class="page-header-logo" />
    </div>

    <!-- Collections Banner -->
    <div class="collections-banner">
      <div class="collections-banner-content">
        <div class="collections-banner-title">Collections</div>
        <div class="collections-banner-subtitle">{{ stats.ownedItems }}/{{ stats.totalItems }} items collected</div>
      </div>
      <img src="/images/vio_sit.png" alt="Vio" class="collections-banner-vio" />
    </div>

    <!-- Stats Row -->
    <div class="stats-row">
      <div class="stat-chip">
        <span class="stat-emoji">📦</span>
        <span class="stat-value">{{ stats.totalCollections }}</span>
        <span class="stat-label">series</span>
      </div>
      <div class="stat-chip">
        <span class="stat-emoji">🎁</span>
        <span class="stat-value">{{ stats.ownedItems }}</span>
        <span class="stat-label">owned</span>
      </div>
      <div v-if="stats.brands > 0" class="stat-chip">
        <span class="stat-emoji">🏷️</span>
        <span class="stat-value">{{ stats.brands }}</span>
        <span class="stat-label">brands</span>
      </div>
      <div class="stat-chip">
        <span class="stat-emoji">💰</span>
        <span class="stat-value">{{ store.formatCurrency(stats.totalSpent) }}</span>
        <span class="stat-label">spent</span>
      </div>
    </div>

    <!-- View Mode Tabs -->
    <div class="view-tabs">
      <button class="view-tab" :class="{ active: viewMode === 'all' }" @click="viewMode = 'all'">
        All
      </button>
      <button class="view-tab" :class="{ active: viewMode === 'brand' }" @click="viewMode = 'brand'">
        By Brand
      </button>
      <button class="view-tab" :class="{ active: viewMode === 'location' }" @click="viewMode = 'location'">
        By Location
      </button>
    </div>

    <!-- Filters -->
    <div class="filters-section">
      <div class="filter-row">
        <div class="filter-pills">
          <button
            class="filter-pill"
            :class="{ active: typeFilter === 'all' }"
            @click="typeFilter = 'all'"
          >All</button>
          <button
            v-for="type in COLLECTION_TYPES"
            :key="type.id"
            class="filter-pill"
            :class="{ active: typeFilter === type.id }"
            @click="typeFilter = type.id"
          >{{ type.emoji }} {{ type.name }}</button>
        </div>
      </div>

      <div class="filter-row">
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="Search collections..."
        />
        <label class="show-complete-toggle">
          <input v-model="showComplete" type="checkbox" />
          Show complete
        </label>
      </div>

      <!-- Quick Filters (clickable tags) -->
      <div v-if="brands.length > 0 || locations.length > 0" class="quick-filters">
        <div v-if="brands.length > 0" class="quick-filter-group">
          <span class="quick-filter-label">Brands:</span>
          <div class="quick-filter-pills">
            <button
              v-for="brand in brands"
              :key="brand"
              class="quick-tag brand"
              :class="{ active: activeTagFilter?.type === 'brand' && activeTagFilter?.value === brand }"
              @click="filterByTag('brand', brand)"
            >{{ brand }}</button>
          </div>
        </div>
        <div v-if="locations.length > 0" class="quick-filter-group">
          <span class="quick-filter-label">Locations:</span>
          <div class="quick-filter-pills">
            <button
              v-for="loc in locations"
              :key="loc"
              class="quick-tag location"
              :class="{ active: activeTagFilter?.type === 'location' && activeTagFilter?.value === loc }"
              @click="filterByTag('location', loc)"
            >{{ loc }}</button>
          </div>
        </div>
      </div>

      <!-- Active Filter Bar -->
      <div v-if="activeTagFilter" class="active-filter-bar">
        <span class="active-filter-label">Filtered by:</span>
        <span class="active-filter-tag" :class="activeTagFilter.type">
          {{ activeTagFilter.type === 'brand' ? '🏷️' : '📍' }} {{ activeTagFilter.value }}
        </span>
        <button class="clear-filter-btn" @click="clearTagFilter">× Clear</button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="filteredCollections.length === 0" class="empty-state">
      <img src="/images/vio_sit.png" alt="Vio" class="empty-vio" />
      <p v-if="searchQuery || typeFilter !== 'all' || !showComplete">
        No collections match your filters
      </p>
      <p v-else>No collections yet! Tap + to add your first one.</p>
    </div>

    <!-- Grouped View -->
    <template v-else-if="viewMode !== 'all' && groupedCollections">
      <div v-for="group in groupedCollections" :key="group.name" class="group-section">
        <div class="group-header">
          <div class="group-header-left">
            <span class="group-name">{{ group.name }}</span>
            <span class="group-meta">{{ group.count }} series</span>
          </div>
          <span class="group-progress">{{ group.ownedItems }}/{{ group.totalItems }}</span>
        </div>

        <div class="collections-list">
          <div
            v-for="collection in group.collections"
            :key="collection.id"
            class="collection-card"
            :class="{ expanded: isExpanded(collection.id), complete: collection.stats.isComplete }"
          >
            <!-- Collection Header -->
            <div class="collection-header" @click="toggleExpand(collection.id)">
              <div class="collection-photo">
                <img v-if="collection.photo" :src="collection.photo" :alt="collection.name" />
                <span v-else>{{ getTypeInfo(collection.type).emoji }}</span>
              </div>
              <div class="collection-info">
                <div class="collection-name-row">
                  <span class="collection-name">{{ collection.name }}</span>
                  <span class="collection-type-badge" :class="collection.type">
                    {{ getTypeInfo(collection.type).name }}
                  </span>
                </div>
                <div class="collection-progress">
                  <div class="progress-bar">
                    <div
                      class="progress-fill"
                      :style="{ width: collection.stats.progress + '%' }"
                      :class="{ complete: collection.stats.isComplete }"
                    ></div>
                  </div>
                  <span class="progress-text">
                    {{ collection.stats.owned }}/{{ collection.stats.total }}
                    <span v-if="collection.stats.isComplete" class="complete-badge">Complete!</span>
                  </span>
                </div>
                <div class="collection-tags">
                  <span
                    v-if="collection.brand"
                    class="clickable-tag brand"
                    @click.stop="filterByTag('brand', collection.brand, $event)"
                  >🏷️ {{ collection.brand }}</span>
                  <span
                    v-if="collection.location"
                    class="clickable-tag location"
                    @click.stop="filterByTag('location', collection.location, $event)"
                  >📍 {{ collection.location }}</span>
                </div>
              </div>
              <button class="expand-btn">{{ isExpanded(collection.id) ? '▼' : '▶' }}</button>
            </div>

            <!-- Expanded Content -->
            <div v-if="isExpanded(collection.id)" class="collection-content">
              <div class="collection-actions">
                <button class="action-btn edit" @click.stop="openEditCollection(collection)">Edit</button>
                <button class="action-btn add" @click.stop="openAddItem(collection.id)">+ Add Item</button>
              </div>

              <div v-if="collection.location" class="collection-meta">
                <span class="meta-icon">📍</span> {{ collection.location }}
              </div>

              <div class="items-grid">
                <div
                  v-for="item in collection.items"
                  :key="item.id"
                  class="item-card"
                  :class="{ owned: item.owned, missing: !item.owned }"
                  @click="openEditItem(item, collection.id)"
                >
                  <div class="item-check" @click.stop="quickToggleOwned(item.id)">
                    {{ item.owned ? '✓' : '' }}
                  </div>
                  <div class="item-photo">
                    <img v-if="item.photo" :src="item.photo" :alt="item.name" />
                    <span v-else>{{ item.owned ? '✨' : '?' }}</span>
                  </div>
                  <div class="item-name">{{ item.name }}</div>
                </div>

                <div class="item-card add-item" @click="openAddItem(collection.id)">
                  <span class="add-icon">+</span>
                  <span class="add-text">Add</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Regular List View -->
    <div v-else class="collections-list">
      <div
        v-for="collection in filteredCollections"
        :key="collection.id"
        class="collection-card"
        :class="{ expanded: isExpanded(collection.id), complete: collection.stats.isComplete }"
      >
        <!-- Collection Header -->
        <div class="collection-header" @click="toggleExpand(collection.id)">
          <div class="collection-photo">
            <img v-if="collection.photo" :src="collection.photo" :alt="collection.name" />
            <span v-else>{{ getTypeInfo(collection.type).emoji }}</span>
          </div>
          <div class="collection-info">
            <div class="collection-name-row">
              <span class="collection-name">{{ collection.name }}</span>
              <span class="collection-type-badge" :class="collection.type">
                {{ getTypeInfo(collection.type).name }}
              </span>
            </div>
            <div class="collection-progress">
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :style="{ width: collection.stats.progress + '%' }"
                  :class="{ complete: collection.stats.isComplete }"
                ></div>
              </div>
              <span class="progress-text">
                {{ collection.stats.owned }}/{{ collection.stats.total }}
                <span v-if="collection.stats.isComplete" class="complete-badge">Complete!</span>
              </span>
            </div>
            <div class="collection-tags">
              <span
                v-if="collection.brand"
                class="clickable-tag brand"
                @click.stop="filterByTag('brand', collection.brand, $event)"
              >🏷️ {{ collection.brand }}</span>
              <span
                v-if="collection.location"
                class="clickable-tag location"
                @click.stop="filterByTag('location', collection.location, $event)"
              >📍 {{ collection.location }}</span>
            </div>
            <div v-if="collection.stats.totalSpent > 0" class="collection-spent">
              Spent: {{ store.formatCurrency(collection.stats.totalSpent) }}
            </div>
          </div>
          <button class="expand-btn">{{ isExpanded(collection.id) ? '▼' : '▶' }}</button>
        </div>

        <!-- Expanded Content -->
        <div v-if="isExpanded(collection.id)" class="collection-content">
          <div class="collection-actions">
            <button class="action-btn edit" @click.stop="openEditCollection(collection)">Edit</button>
            <button class="action-btn add" @click.stop="openAddItem(collection.id)">+ Add Item</button>
          </div>

          <div v-if="collection.location" class="collection-meta">
            <span class="meta-icon">📍</span> {{ collection.location }}
          </div>
          <div v-if="collection.notes" class="collection-meta notes">
            {{ collection.notes }}
          </div>

          <div class="items-grid">
            <div
              v-for="item in collection.items"
              :key="item.id"
              class="item-card"
              :class="{ owned: item.owned, missing: !item.owned }"
              @click="openEditItem(item, collection.id)"
            >
              <div class="item-check" @click.stop="quickToggleOwned(item.id)">
                {{ item.owned ? '✓' : '' }}
              </div>
              <div class="item-photo">
                <img v-if="item.photo" :src="item.photo" :alt="item.name" />
                <span v-else>{{ item.owned ? '✨' : '?' }}</span>
              </div>
              <div class="item-name">{{ item.name }}</div>
            </div>

            <div class="item-card add-item" @click="openAddItem(collection.id)">
              <span class="add-icon">+</span>
              <span class="add-text">Add</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Collection Modal -->
    <div v-if="showCollectionModal" class="modal-overlay" @click.self="showCollectionModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingCollection ? 'Edit Collection' : 'Add Collection' }}</h3>
          <button class="modal-close" @click="showCollectionModal = false">×</button>
        </div>

        <div class="modal-body">
          <!-- Photo Upload -->
          <div class="photo-upload-section">
            <div class="photo-preview collection">
              <img v-if="collectionForm.photo" :src="collectionForm.photo" alt="Collection photo" />
              <span v-else>🎁</span>
            </div>
            <div class="photo-actions">
              <label class="upload-photo-btn">
                <input type="file" accept="image/*" @change="handleImageUpload($event, 'collection')" hidden />
                {{ isUploadingImage ? 'Processing...' : 'Upload Photo' }}
              </label>
              <button v-if="collectionForm.photo" class="remove-photo-btn" @click="collectionForm.photo = ''">Remove</button>
            </div>
          </div>

          <div class="form-group">
            <label>Collection Name</label>
            <input v-model="collectionForm.name" type="text" placeholder="Labubu Forest Series" />
          </div>

          <div class="form-row">
            <div class="form-group half">
              <label>Brand</label>
              <input v-model="collectionForm.brand" type="text" placeholder="Pop Mart" list="brand-suggestions" />
              <datalist id="brand-suggestions">
                <option v-for="b in brands" :key="b" :value="b" />
              </datalist>
              <span class="field-hint">Auto-detects existing brands</span>
            </div>
            <div class="form-group half">
              <label>Type</label>
              <select v-model="collectionForm.type">
                <option v-for="type in COLLECTION_TYPES" :key="type.id" :value="type.id">
                  {{ type.emoji }} {{ type.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group half">
              <label>Total Items in Set</label>
              <input v-model="collectionForm.totalItems" type="number" placeholder="12" />
            </div>
            <div class="form-group half">
              <label>Price per Item</label>
              <input v-model="collectionForm.pricePerItem" type="number" placeholder="Rp" />
            </div>
          </div>

          <div class="form-group">
            <label>Location</label>
            <input v-model="collectionForm.location" type="text" placeholder="Display shelf, box, etc." list="location-suggestions" />
            <datalist id="location-suggestions">
              <option v-for="loc in locations" :key="loc" :value="loc" />
            </datalist>
          </div>

          <div class="form-group">
            <label>Notes</label>
            <textarea v-model="collectionForm.notes" placeholder="Any notes about this collection" rows="2"></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button v-if="editingCollection" class="delete-btn" @click="deleteCollection(editingCollection.id)">Delete</button>
          <button class="save-btn" @click="saveCollection">{{ editingCollection ? 'Save' : 'Add Collection' }}</button>
        </div>
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
            <div class="photo-preview item">
              <img v-if="itemForm.photo" :src="itemForm.photo" alt="Item photo" />
              <span v-else>✨</span>
            </div>
            <div class="photo-actions">
              <label class="upload-photo-btn">
                <input type="file" accept="image/*" @change="handleImageUpload($event, 'item')" hidden />
                {{ isUploadingImage ? 'Processing...' : 'Upload Photo' }}
              </label>
              <button v-if="itemForm.photo" class="remove-photo-btn" @click="itemForm.photo = ''">Remove</button>
            </div>
          </div>

          <div class="form-group">
            <label>Item Name</label>
            <input v-model="itemForm.name" type="text" placeholder="Watermelon" />
          </div>

          <div class="form-group">
            <label>Owned?</label>
            <div class="owned-toggle">
              <button
                class="owned-btn"
                :class="{ active: itemForm.owned }"
                @click="itemForm.owned = true"
              >✓ Have it!</button>
              <button
                class="owned-btn missing"
                :class="{ active: !itemForm.owned }"
                @click="itemForm.owned = false"
              >✗ Missing</button>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group half">
              <label>Price Paid</label>
              <input v-model="itemForm.pricePaid" type="number" placeholder="Rp" />
            </div>
            <div class="form-group half">
              <label>Location</label>
              <input v-model="itemForm.location" type="text" placeholder="Where is it?" list="item-location-suggestions" />
              <datalist id="item-location-suggestions">
                <option v-for="loc in locations" :key="loc" :value="loc" />
              </datalist>
            </div>
          </div>

          <div class="form-group">
            <label>Notes</label>
            <textarea v-model="itemForm.notes" placeholder="Any notes" rows="2"></textarea>
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
/* Collections Banner */
.collections-banner {
  position: relative;
  display: flex;
  align-items: center;
  background:
    linear-gradient(135deg, rgba(249, 115, 22, 0.8) 0%, rgba(251, 146, 60, 0.8) 50%, rgba(253, 186, 116, 0.8) 100%),
    url('/images/kawaii-bg.jpg') center center / cover no-repeat;
  border-radius: var(--radius-xl);
  overflow: hidden;
  min-height: 120px;
  margin-bottom: var(--space-md);
  box-shadow: 0 4px 16px rgba(249, 115, 22, 0.3);
}

.collections-banner-content {
  flex: 1;
  padding: var(--space-lg);
}

.collections-banner-title {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.collections-banner-subtitle {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 4px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.collections-banner-vio {
  height: 140px;
  width: auto;
  flex-shrink: 0;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
  margin-bottom: -30px;
}

@media (max-width: 480px) {
  .collections-banner-title { font-size: 1.5rem; }
  .collections-banner-vio { height: 110px; margin-bottom: -20px; }
}

/* Stats Row */
.stats-row {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
  flex-wrap: wrap;
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

.stat-emoji { font-size: 0.875rem; }
.stat-value { font-weight: 700; font-size: 0.875rem; }
.stat-label { font-size: 0.6875rem; color: var(--text-secondary); }

/* View Tabs */
.view-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: var(--space-md);
  padding: 4px;
  background: var(--gray-100);
  border-radius: 12px;
}

.view-tab {
  flex: 1;
  padding: var(--space-sm) var(--space-md);
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.view-tab:hover { color: var(--text-primary); }

.view-tab.active {
  background: white;
  color: #f97316;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Filters */
.filters-section { margin-bottom: var(--space-lg); }

.filter-row {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
  align-items: center;
  flex-wrap: wrap;
}

.filter-pills { display: flex; gap: 4px; flex-wrap: wrap; }

.filter-pill {
  padding: 6px 12px;
  background: white;
  border: 2px solid var(--border-color);
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.filter-pill:hover { border-color: #f97316; }

.filter-pill.active {
  background: linear-gradient(135deg, #f97316 0%, #fb923c 100%);
  border-color: #f97316;
  color: white;
}

.search-input {
  flex: 1;
  min-width: 150px;
  padding: var(--space-sm);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 0.875rem;
}

.show-complete-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: 0.75rem;
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
}

/* Group Section */
.group-section { margin-bottom: var(--space-xl); }

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) var(--space-md);
  background: linear-gradient(135deg, #fef3c7 0%, #ffedd5 100%);
  border-radius: 12px;
  margin-bottom: var(--space-md);
}

.group-header-left { display: flex; align-items: baseline; gap: var(--space-sm); }
.group-name { font-weight: 700; font-size: 1rem; color: #c2410c; }
.group-meta { font-size: 0.75rem; color: var(--text-secondary); }
.group-progress {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: white;
  padding: 2px 10px;
  border-radius: 10px;
}

/* Empty State */
.empty-state { text-align: center; padding: var(--space-xl); }
.empty-vio { width: 80px; margin-bottom: var(--space-md); }

/* Collections List */
.collections-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding-bottom: var(--space-xl);
}

.collection-card {
  background: white;
  border: 2px solid var(--border-color);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.2s;
}

.collection-card.complete { border-color: #4ade80; }
.collection-card.expanded { border-color: #f97316; }

/* Collection Header */
.collection-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  cursor: pointer;
}

.collection-photo {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  background: linear-gradient(135deg, #fef3c7 0%, #ffedd5 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  overflow: hidden;
  flex-shrink: 0;
}

.collection-photo img { width: 100%; height: 100%; object-fit: cover; }

.collection-info { flex: 1; min-width: 0; }

.collection-name-row {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  margin-bottom: 4px;
}

.collection-name {
  font-weight: 700;
  font-size: 0.9375rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.collection-type-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  flex-shrink: 0;
}

.collection-type-badge.blindbox { background: #fef3c7; color: #d97706; }
.collection-type-badge.figure { background: #dbeafe; color: #2563eb; }
.collection-type-badge.plush { background: #fce7f3; color: #db2777; }
.collection-type-badge.other { background: #f3e8ff; color: #9333ea; }

.collection-progress { display: flex; align-items: center; gap: var(--space-sm); }

.progress-bar {
  flex: 1;
  height: 8px;
  background: var(--gray-100);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #f97316 0%, #fb923c 100%);
  border-radius: 4px;
  transition: width 0.3s;
}

.progress-fill.complete { background: linear-gradient(90deg, #4ade80 0%, #22d3ee 100%); }

.progress-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}

.complete-badge { color: #22c55e; margin-left: 4px; }

/* Clickable Tags */
.collection-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.clickable-tag {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.625rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.clickable-tag.brand {
  background: #fce7f3;
  color: #be185d;
}

.clickable-tag.brand:hover {
  background: #f9a8d4;
  transform: scale(1.05);
}

.clickable-tag.location {
  background: #dbeafe;
  color: #1d4ed8;
}

.clickable-tag.location:hover {
  background: #93c5fd;
  transform: scale(1.05);
}

/* Quick Filters */
.quick-filters {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}

.quick-filter-group {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.quick-filter-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-secondary);
  min-width: 60px;
}

.quick-filter-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.quick-tag {
  padding: 4px 10px;
  border: none;
  border-radius: 12px;
  font-size: 0.6875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.quick-tag.brand {
  background: #fce7f3;
  color: #be185d;
}

.quick-tag.brand:hover,
.quick-tag.brand.active {
  background: #ec4899;
  color: white;
}

.quick-tag.location {
  background: #dbeafe;
  color: #1d4ed8;
}

.quick-tag.location:hover,
.quick-tag.location.active {
  background: #3b82f6;
  color: white;
}

/* Active Filter Bar */
.active-filter-bar {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: linear-gradient(135deg, #fef3c7 0%, #ffedd5 100%);
  border-radius: 12px;
  margin-top: var(--space-md);
}

.active-filter-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #92400e;
}

.active-filter-tag {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 600;
}

.active-filter-tag.brand {
  background: #ec4899;
  color: white;
}

.active-filter-tag.location {
  background: #3b82f6;
  color: white;
}

.clear-filter-btn {
  margin-left: auto;
  padding: 4px 12px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
}

.clear-filter-btn:hover {
  background: #f3f4f6;
  color: var(--text-primary);
}

.collection-spent {
  font-size: 0.6875rem;
  color: var(--text-secondary);
  margin-top: 2px;
}

.expand-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  color: var(--text-secondary);
  font-size: 0.75rem;
  cursor: pointer;
}

/* Collection Content */
.collection-content {
  padding: 0 var(--space-md) var(--space-md);
  border-top: 1px solid var(--border-color);
}

.collection-actions {
  display: flex;
  gap: var(--space-sm);
  margin: var(--space-md) 0;
}

.action-btn {
  padding: var(--space-xs) var(--space-md);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  background: white;
}

.action-btn.edit:hover { border-color: #f97316; color: #f97316; }

.action-btn.add {
  background: linear-gradient(135deg, #f97316 0%, #fb923c 100%);
  border-color: transparent;
  color: white;
}

.collection-meta {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: var(--space-xs);
  display: flex;
  align-items: center;
  gap: 4px;
}

.collection-meta.notes {
  font-style: italic;
  padding: var(--space-xs);
  background: var(--gray-50);
  border-radius: 6px;
}

/* Items Grid */
.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
  gap: var(--space-sm);
  margin-top: var(--space-md);
}

.item-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-sm);
  background: white;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.item-card.owned { border-color: #4ade80; background: #f0fdf4; }
.item-card.missing { border-color: #fca5a5; background: #fef2f2; opacity: 0.7; }
.item-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }

.item-check {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 20px;
  height: 20px;
  background: #4ade80;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6875rem;
  color: white;
  font-weight: 700;
  opacity: 0;
  transition: opacity 0.15s;
}

.item-card.owned .item-check { opacity: 1; }
.item-card.missing .item-check { background: #f87171; }

.item-photo {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--gray-100);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  overflow: hidden;
  margin-bottom: 4px;
}

.item-photo img { width: 100%; height: 100%; object-fit: cover; }

.item-name {
  font-size: 0.625rem;
  font-weight: 600;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.item-card.add-item { border-style: dashed; border-color: #f97316; background: #fff7ed; }
.add-icon { font-size: 1.25rem; color: #f97316; }
.add-text { font-size: 0.625rem; color: #f97316; font-weight: 600; }

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
  background: linear-gradient(135deg, #fef3c7 0%, #ffedd5 100%);
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
  background: linear-gradient(135deg, #f97316 0%, #fb923c 100%);
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

.field-hint {
  display: block;
  font-size: 0.6875rem;
  color: var(--text-secondary);
  margin-top: 2px;
}

.form-row { display: flex; gap: var(--space-md); }
.form-group.half { flex: 1; }

/* Owned Toggle */
.owned-toggle { display: flex; gap: var(--space-xs); }

.owned-btn {
  flex: 1;
  padding: var(--space-sm);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  background: white;
}

.owned-btn.active { background: #4ade80; border-color: #22c55e; color: white; }
.owned-btn.missing.active { background: #f87171; border-color: #ef4444; color: white; }

.modal-footer {
  display: flex;
  justify-content: space-between;
  padding: var(--space-md) var(--space-lg);
  border-top: 2px solid var(--border-color);
}

.save-btn {
  padding: var(--space-sm) var(--space-xl);
  background: linear-gradient(135deg, #f97316 0%, #fb923c 100%);
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
[data-theme="dark"] .collections-banner {
  background: linear-gradient(135deg, #9A3412 0%, #C2410C 50%, #EA580C 100%) !important;
}

[data-theme="dark"] .stat-chip {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .view-tabs { background: #2D2640 !important; }
[data-theme="dark"] .view-tab { color: #A78BFA !important; }
[data-theme="dark"] .view-tab.active { background: #1A1625 !important; color: #FB923C !important; }

[data-theme="dark"] .group-header {
  background: linear-gradient(135deg, #3D3456 0%, #4D4466 100%) !important;
}
[data-theme="dark"] .group-name { color: #FDBA74 !important; }
[data-theme="dark"] .group-progress { background: #1A1625 !important; }

[data-theme="dark"] .collection-card {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .collection-card.expanded { border-color: #8B5CF6 !important; }
[data-theme="dark"] .collection-card.complete { border-color: #4ade80 !important; }

[data-theme="dark"] .collection-photo {
  background: linear-gradient(135deg, #3D3456 0%, #4D4466 100%) !important;
}

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

[data-theme="dark"] .progress-bar { background: #3D3456 !important; }
[data-theme="dark"] .progress-fill { background: linear-gradient(90deg, #8B5CF6 0%, #A78BFA 100%) !important; }

[data-theme="dark"] .item-card {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .item-card.owned { background: #1a2e1a !important; border-color: #4ade80 !important; }
[data-theme="dark"] .item-card.missing { background: #2e1a1a !important; border-color: #f87171 !important; }
[data-theme="dark"] .item-card.add-item { background: #2D2640 !important; border-color: #8B5CF6 !important; }
[data-theme="dark"] .add-icon, [data-theme="dark"] .add-text { color: #A78BFA !important; }

[data-theme="dark"] .item-photo { background: #3D3456 !important; }

[data-theme="dark"] .modal { background: #1A1625 !important; }
[data-theme="dark"] .photo-upload-section { background: #2D2640 !important; }
[data-theme="dark"] .photo-preview { background: linear-gradient(135deg, #3D3456 0%, #4D4466 100%) !important; }

[data-theme="dark"] .action-btn { background: #1A1625 !important; border-color: #3D3456 !important; }
[data-theme="dark"] .action-btn.add { background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%) !important; }

[data-theme="dark"] .collection-content { border-top-color: #3D3456 !important; }
[data-theme="dark"] .collection-meta.notes { background: #2D2640 !important; }

[data-theme="dark"] .owned-btn { background: #1A1625 !important; border-color: #3D3456 !important; }
[data-theme="dark"] .upload-photo-btn, [data-theme="dark"] .save-btn {
  background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%) !important;
}

/* Dark mode - Clickable Tags */
[data-theme="dark"] .clickable-tag.brand {
  background: #831843 !important;
  color: #f9a8d4 !important;
}

[data-theme="dark"] .clickable-tag.brand:hover {
  background: #be185d !important;
  color: white !important;
}

[data-theme="dark"] .clickable-tag.location {
  background: #1e3a5f !important;
  color: #93c5fd !important;
}

[data-theme="dark"] .clickable-tag.location:hover {
  background: #1d4ed8 !important;
  color: white !important;
}

/* Dark mode - Quick Filters */
[data-theme="dark"] .quick-tag.brand {
  background: #831843 !important;
  color: #f9a8d4 !important;
}

[data-theme="dark"] .quick-tag.brand:hover,
[data-theme="dark"] .quick-tag.brand.active {
  background: #be185d !important;
  color: white !important;
}

[data-theme="dark"] .quick-tag.location {
  background: #1e3a5f !important;
  color: #93c5fd !important;
}

[data-theme="dark"] .quick-tag.location:hover,
[data-theme="dark"] .quick-tag.location.active {
  background: #1d4ed8 !important;
  color: white !important;
}

/* Dark mode - Active Filter Bar */
[data-theme="dark"] .active-filter-bar {
  background: linear-gradient(135deg, #3D3456 0%, #4D4466 100%) !important;
}

[data-theme="dark"] .active-filter-label {
  color: #A78BFA !important;
}

[data-theme="dark"] .clear-filter-btn {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
  color: #A78BFA !important;
}

[data-theme="dark"] .clear-filter-btn:hover {
  background: #2D2640 !important;
}
</style>
