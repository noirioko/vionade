<script setup>
import { ref, computed, inject, onMounted, onUnmounted } from 'vue'
import { useFinanceStore } from '../stores'

const store = useFinanceStore()
const fabAction = inject('fabAction')

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

// Filtered collections
const filteredCollections = computed(() => {
  return store.getFilteredCollections({
    type: typeFilter.value,
    search: searchQuery.value,
    showComplete: showComplete.value,
  })
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
    photo: collection.photo || '',
    totalItems: collection.totalItems,
    pricePerItem: collection.pricePerItem || '',
    location: collection.location || '',
    notes: collection.notes || '',
  }
  showCollectionModal.value = true
}

function saveCollection() {
  if (!collectionForm.value.name.trim()) return

  const data = {
    ...collectionForm.value,
    pricePerItem: collectionForm.value.pricePerItem ? parseFloat(collectionForm.value.pricePerItem) : null,
    totalItems: parseInt(collectionForm.value.totalItems) || 0,
  }

  if (editingCollection.value) {
    store.updateCollection(editingCollection.value.id, data)
  } else {
    store.addCollection(data)
  }
  showCollectionModal.value = false
}

function deleteCollection(id) {
  if (confirm('Delete this collection and all its items?')) {
    store.deleteCollection(id)
    showCollectionModal.value = false
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
  if (!itemForm.value.name.trim()) return

  const data = {
    ...itemForm.value,
    collectionId: activeCollectionId.value,
    pricePaid: itemForm.value.pricePaid ? parseFloat(itemForm.value.pricePaid) : null,
  }

  if (editingItem.value) {
    store.updateCollectionItem(editingItem.value.id, data)
  } else {
    store.addCollectionItem(data)
  }
  showItemModal.value = false
}

function deleteItem(id) {
  if (confirm('Delete this item?')) {
    store.deleteCollectionItem(id)
    showItemModal.value = false
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
    img.src = e.target.result
  }
  reader.readAsDataURL(file)
}

// Get type info
function getTypeInfo(typeId) {
  return store.COLLECTION_TYPES.find(t => t.id === typeId) || store.COLLECTION_TYPES[0]
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
  <div class="page">
    <!-- Header -->
    <div class="page-header">
      <img src="/images/vio-logo.png" alt="Vionade" class="page-header-logo" />
    </div>

    <h1 class="page-title">Collections</h1>
    <p class="page-subtitle">Track your blind boxes & figures</p>

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
            v-for="type in store.COLLECTION_TYPES"
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
    </div>

    <!-- Empty State -->
    <div v-if="filteredCollections.length === 0" class="empty-state">
      <img src="/images/vio_sit.png" alt="Vio" class="empty-vio" />
      <p v-if="searchQuery">No collections match "{{ searchQuery }}"</p>
      <p v-else>No collections yet! Tap + to add your first one.</p>
    </div>

    <!-- Collections List -->
    <div class="collections-list">
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
            <div v-if="collection.stats.totalSpent > 0" class="collection-spent">
              Spent: Rp{{ collection.stats.totalSpent.toLocaleString() }}
            </div>
          </div>
          <button class="expand-btn">{{ isExpanded(collection.id) ? '▼' : '▶' }}</button>
        </div>

        <!-- Expanded Content -->
        <div v-if="isExpanded(collection.id)" class="collection-content">
          <!-- Actions -->
          <div class="collection-actions">
            <button class="action-btn edit" @click.stop="openEditCollection(collection)">Edit</button>
            <button class="action-btn add" @click.stop="openAddItem(collection.id)">+ Add Item</button>
          </div>

          <!-- Location & Notes -->
          <div v-if="collection.location" class="collection-meta">
            <span class="meta-icon">📍</span> {{ collection.location }}
          </div>
          <div v-if="collection.notes" class="collection-meta notes">
            {{ collection.notes }}
          </div>

          <!-- Items Grid -->
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

            <!-- Add Item Card -->
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
            <input v-model="collectionForm.name" type="text" placeholder="Sonny Angel Fruit Series" />
          </div>

          <div class="form-group">
            <label>Type</label>
            <div class="type-options">
              <button
                v-for="type in store.COLLECTION_TYPES"
                :key="type.id"
                class="type-btn"
                :class="{ active: collectionForm.type === type.id }"
                @click="collectionForm.type = type.id"
              >
                {{ type.emoji }} {{ type.name }}
              </button>
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
            <input v-model="collectionForm.location" type="text" placeholder="Display shelf, box, etc." />
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
              <input v-model="itemForm.location" type="text" placeholder="Where is it?" />
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
  margin: 0 0 var(--space-lg);
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

.filter-pills {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

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

.filter-pill:hover {
  border-color: #f472b6;
}

.filter-pill.active {
  background: linear-gradient(135deg, #f472b6 0%, #c084fc 100%);
  border-color: #c084fc;
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

/* Empty State */
.empty-state {
  text-align: center;
  padding: var(--space-xl);
}

.empty-vio {
  width: 80px;
  margin-bottom: var(--space-md);
}

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

.collection-card.complete {
  border-color: #4ade80;
}

.collection-card.expanded {
  border-color: #c084fc;
}

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
  background: linear-gradient(135deg, #fce7f3 0%, #f3e8ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  overflow: hidden;
  flex-shrink: 0;
}

.collection-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.collection-info {
  flex: 1;
  min-width: 0;
}

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

.collection-type-badge.blindbox {
  background: #fef3c7;
  color: #d97706;
}

.collection-type-badge.figure {
  background: #dbeafe;
  color: #2563eb;
}

.collection-type-badge.plush {
  background: #fce7f3;
  color: #db2777;
}

.collection-type-badge.other {
  background: #f3e8ff;
  color: #9333ea;
}

/* Progress Bar */
.collection-progress {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: var(--gray-100);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #f472b6 0%, #c084fc 100%);
  border-radius: 4px;
  transition: width 0.3s;
}

.progress-fill.complete {
  background: linear-gradient(90deg, #4ade80 0%, #22d3ee 100%);
}

.progress-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}

.complete-badge {
  color: #22c55e;
  margin-left: 4px;
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

/* Collection Content (expanded) */
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

.action-btn.edit:hover {
  border-color: #c084fc;
  color: #c084fc;
}

.action-btn.add {
  background: linear-gradient(135deg, #f472b6 0%, #c084fc 100%);
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

.item-card.owned {
  border-color: #4ade80;
  background: #f0fdf4;
}

.item-card.missing {
  border-color: #fca5a5;
  background: #fef2f2;
  opacity: 0.7;
}

.item-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

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

.item-card.owned .item-check {
  opacity: 1;
}

.item-card.missing .item-check {
  background: #f87171;
}

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

.item-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-name {
  font-size: 0.625rem;
  font-weight: 600;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.item-card.add-item {
  border-style: dashed;
  border-color: #c084fc;
  background: #faf5ff;
}

.add-icon {
  font-size: 1.25rem;
  color: #c084fc;
}

.add-text {
  font-size: 0.625rem;
  color: #c084fc;
  font-weight: 600;
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
  background: linear-gradient(135deg, #f472b6 0%, #c084fc 100%);
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
.form-group textarea {
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

/* Type Options */
.type-options {
  display: flex;
  gap: var(--space-xs);
  flex-wrap: wrap;
}

.type-btn {
  padding: var(--space-sm) var(--space-md);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  background: white;
  transition: all 0.15s;
}

.type-btn:hover {
  border-color: #c084fc;
}

.type-btn.active {
  background: linear-gradient(135deg, #f472b6 0%, #c084fc 100%);
  border-color: transparent;
  color: white;
}

/* Owned Toggle */
.owned-toggle {
  display: flex;
  gap: var(--space-xs);
}

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

.owned-btn.active {
  background: #4ade80;
  border-color: #22c55e;
  color: white;
}

.owned-btn.missing.active {
  background: #f87171;
  border-color: #ef4444;
  color: white;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  padding: var(--space-md) var(--space-lg);
  border-top: 2px solid var(--border-color);
}

.save-btn {
  padding: var(--space-sm) var(--space-xl);
  background: linear-gradient(135deg, #f472b6 0%, #c084fc 100%);
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
[data-theme="dark"] .collection-card {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .collection-card.expanded {
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .collection-card.complete {
  border-color: #4ade80 !important;
}

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

[data-theme="dark"] .progress-bar {
  background: #3D3456 !important;
}

[data-theme="dark"] .item-card {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .item-card.owned {
  background: #1a2e1a !important;
  border-color: #4ade80 !important;
}

[data-theme="dark"] .item-card.missing {
  background: #2e1a1a !important;
  border-color: #f87171 !important;
}

[data-theme="dark"] .item-card.add-item {
  background: #2D2640 !important;
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .item-photo {
  background: #3D3456 !important;
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

[data-theme="dark"] .type-btn {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .type-btn:hover {
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .type-btn.active {
  background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%) !important;
}

[data-theme="dark"] .owned-btn {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .action-btn {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .action-btn.add {
  background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%) !important;
}

[data-theme="dark"] .collection-meta.notes {
  background: #2D2640 !important;
}

[data-theme="dark"] .collection-content {
  border-top-color: #3D3456 !important;
}
</style>
