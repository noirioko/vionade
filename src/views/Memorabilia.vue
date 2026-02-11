<script setup>
import { ref, computed, inject, onMounted, onUnmounted } from 'vue'
import { useFinanceStore } from '../stores'
import { useToast } from '../composables/useToast'

const store = useFinanceStore()
const toast = useToast()
const fabAction = inject('fabAction')

// Modal state
const showModal = ref(false)
const editingItem = ref(null)

// Filter state
const selectedCategory = ref('all')
const selectedTag = ref('all')
const searchQuery = ref('')

// Form
const form = ref({
  name: '',
  category: 'song',
  tags: '',
  note: '',
  link: '',
  image: null,
})

// Computed
const allTags = computed(() => store.getAllTags())

const filteredItems = computed(() => {
  let items = [...store.memorabilia.value]

  if (selectedCategory.value !== 'all') {
    items = items.filter(m => m.category === selectedCategory.value)
  }

  if (selectedTag.value !== 'all') {
    items = items.filter(m => (m.tags || []).includes(selectedTag.value))
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    items = items.filter(m =>
      m.name.toLowerCase().includes(q) ||
      (m.note || '').toLowerCase().includes(q) ||
      (m.tags || []).some(t => t.includes(q))
    )
  }

  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  return items
})

const categoryCounts = computed(() => {
  const counts = {}
  store.memorabilia.value.forEach(m => {
    counts[m.category] = (counts[m.category] || 0) + 1
  })
  return counts
})

// FAB
onMounted(() => {
  fabAction.value = openAddModal
})

onUnmounted(() => {
  fabAction.value = null
})

function openAddModal() {
  editingItem.value = null
  form.value = {
    name: '',
    category: 'song',
    tags: '',
    note: '',
    link: '',
    image: null,
  }
  showModal.value = true
}

function openEditModal(item) {
  editingItem.value = item
  form.value = {
    name: item.name,
    category: item.category,
    tags: (item.tags || []).join(', '),
    note: item.note || '',
    link: item.link || '',
    image: item.image || null,
  }
  showModal.value = true
}

function handleImageUpload(e) {
  const file = e.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (event) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const size = 300
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      const scale = Math.max(size / img.width, size / img.height)
      const x = (size - img.width * scale) / 2
      const y = (size - img.height * scale) / 2
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale)
      form.value.image = canvas.toDataURL('image/jpeg', 0.7)
    }
    img.onerror = () => {
      toast.error('Failed to load image')
    }
    img.src = event.target.result
  }
  reader.onerror = () => {
    toast.error('Failed to read file')
  }
  reader.readAsDataURL(file)
}

function removeImage() {
  form.value.image = null
}

function saveItem() {
  if (!form.value.name.trim()) {
    toast.error('Please enter a name')
    return
  }

  const tags = form.value.tags
    .split(',')
    .map(t => t.trim().toLowerCase())
    .filter(Boolean)

  const data = {
    name: form.value.name.trim(),
    category: form.value.category,
    tags,
    note: form.value.note.trim(),
    link: form.value.link.trim(),
    image: form.value.image,
  }

  if (editingItem.value) {
    store.updateMemorabilia(editingItem.value.id, data)
    toast.success('Updated!')
  } else {
    store.addMemorabilia(data)
    toast.success('Added!')
  }

  showModal.value = false
}

function deleteItem() {
  if (confirm('Delete this item?')) {
    store.deleteMemorabilia(editingItem.value.id)
    toast.success('Deleted')
    showModal.value = false
  }
}

function getCatEmoji(catId) {
  const cat = store.getMemoCategoryById(catId)
  return cat ? cat.emoji : '✨'
}

function getCatName(catId) {
  const cat = store.getMemoCategoryById(catId)
  return cat ? cat.name : 'Other'
}

function openLink(url) {
  if (url) {
    window.open(url, '_blank', 'noopener')
  }
}
</script>

<template>
  <div class="page memorabilia-page">
    <!-- Header -->
    <div class="page-header">
      <img src="/images/vio-logo.png" alt="Vionade" class="page-header-logo" />
    </div>

    <!-- Banner -->
    <div class="memo-banner">
      <div class="memo-banner-content">
        <div class="memo-banner-title">Memorabilia</div>
        <div class="memo-banner-subtitle">Things you keep coming back to</div>
      </div>
      <img src="/images/vio_happy.png" alt="Vio" class="memo-banner-vio" />
    </div>

    <!-- Stats -->
    <div class="memo-stats" v-if="store.memorabilia.value.length > 0">
      <div class="memo-stat">
        <span class="memo-stat-value">{{ store.memorabilia.value.length }}</span>
        <span class="memo-stat-label">Items</span>
      </div>
      <div class="memo-stat">
        <span class="memo-stat-value">{{ Object.keys(categoryCounts).length }}</span>
        <span class="memo-stat-label">Categories</span>
      </div>
      <div class="memo-stat">
        <span class="memo-stat-value">{{ allTags.length }}</span>
        <span class="memo-stat-label">Tags</span>
      </div>
    </div>

    <!-- Search -->
    <div class="memo-search" v-if="store.memorabilia.value.length > 0">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search memorabilia..."
        class="memo-search-input"
      />
    </div>

    <!-- Category filter pills -->
    <div class="memo-filters" v-if="store.memorabilia.value.length > 0">
      <button
        class="filter-pill"
        :class="{ active: selectedCategory === 'all' }"
        @click="selectedCategory = 'all'; selectedTag = 'all'"
      >
        All ({{ store.memorabilia.value.length }})
      </button>
      <button
        v-for="cat in store.MEMORABILIA_CATEGORIES"
        :key="cat.id"
        class="filter-pill"
        :class="{ active: selectedCategory === cat.id }"
        @click="selectedCategory = cat.id; selectedTag = 'all'"
        v-show="categoryCounts[cat.id]"
      >
        {{ cat.emoji }} {{ cat.name }} ({{ categoryCounts[cat.id] || 0 }})
      </button>
    </div>

    <!-- Tag filter pills -->
    <div class="memo-tags-filter" v-if="allTags.length > 0">
      <button
        class="tag-pill"
        :class="{ active: selectedTag === 'all' }"
        @click="selectedTag = 'all'"
      >all</button>
      <button
        v-for="tag in allTags"
        :key="tag"
        class="tag-pill"
        :class="{ active: selectedTag === tag }"
        @click="selectedTag = tag"
      >#{{ tag }}</button>
    </div>

    <!-- Items grid -->
    <div class="memo-grid" v-if="filteredItems.length > 0">
      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="memo-card"
        @click="openEditModal(item)"
      >
        <div class="memo-card-image" v-if="item.image">
          <img :src="item.image" :alt="item.name" />
        </div>
        <div class="memo-card-emoji" v-else>
          {{ getCatEmoji(item.category) }}
        </div>
        <div class="memo-card-body">
          <div class="memo-card-header">
            <span class="memo-card-name">{{ item.name }}</span>
            <button
              v-if="item.link"
              class="memo-card-link"
              @click.stop="openLink(item.link)"
              title="Open link"
            >🔗</button>
          </div>
          <div class="memo-card-category">{{ getCatName(item.category) }}</div>
          <div class="memo-card-note" v-if="item.note">{{ item.note }}</div>
          <div class="memo-card-tags" v-if="item.tags && item.tags.length">
            <span v-for="tag in item.tags" :key="tag" class="memo-tag">#{{ tag }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div class="memo-empty" v-else-if="store.memorabilia.value.length === 0">
      <img src="/images/vio_sit.png" alt="Vio" class="memo-empty-vio" />
      <p class="memo-empty-title">No memorabilia yet!</p>
      <p class="memo-empty-text">Save songs, anime, movies, and more that you keep coming back to.</p>
      <button class="memo-empty-btn" @click="openAddModal">Add your first item</button>
    </div>

    <!-- No results -->
    <div class="memo-empty" v-else>
      <p class="memo-empty-title">No matches found</p>
      <p class="memo-empty-text">Try a different filter or search term.</p>
    </div>

    <!-- Add/Edit Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
          <div class="modal-sheet">
            <div class="modal-handle" @click="showModal = false"></div>
            <h3 class="modal-title">{{ editingItem ? 'Edit Item' : 'Add Memorabilia' }}</h3>

            <div class="form-group">
              <label class="form-label">Name *</label>
              <input v-model="form.name" type="text" class="form-input" placeholder="e.g. Unravel by TK" />
            </div>

            <div class="form-group">
              <label class="form-label">Category</label>
              <div class="category-grid">
                <button
                  v-for="cat in store.MEMORABILIA_CATEGORIES"
                  :key="cat.id"
                  class="category-btn"
                  :class="{ active: form.category === cat.id }"
                  @click="form.category = cat.id"
                >
                  <span>{{ cat.emoji }}</span>
                  <span>{{ cat.name }}</span>
                </button>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Tags</label>
              <input v-model="form.tags" type="text" class="form-input" placeholder="comfort, nostalgia, hype (comma separated)" />
            </div>

            <div class="form-group">
              <label class="form-label">Note</label>
              <textarea v-model="form.note" class="form-input form-textarea" placeholder="Why do you love this?" rows="2"></textarea>
            </div>

            <div class="form-group">
              <label class="form-label">Link</label>
              <input v-model="form.link" type="url" class="form-input" placeholder="https://..." />
            </div>

            <div class="form-group">
              <label class="form-label">Image</label>
              <div v-if="form.image" class="image-preview">
                <img :src="form.image" alt="Preview" />
                <button class="image-remove" @click="removeImage">Remove</button>
              </div>
              <label v-else class="image-upload">
                <span>📷 Upload Image</span>
                <input type="file" accept="image/*" @change="handleImageUpload" hidden />
              </label>
            </div>

            <div class="modal-actions">
              <button v-if="editingItem" class="btn-delete" @click="deleteItem">Delete</button>
              <div class="modal-actions-right">
                <button class="btn-cancel" @click="showModal = false">Cancel</button>
                <button class="btn-save" @click="saveItem">{{ editingItem ? 'Save' : 'Add' }}</button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* Banner */
.memo-banner {
  display: flex;
  align-items: center;
  border-radius: var(--radius-xl);
  overflow: hidden;
  background: linear-gradient(135deg, #F43F5E 0%, #FB7185 50%, #FDA4AF 100%);
  box-shadow: 0 4px 16px rgba(244, 63, 94, 0.3);
  margin-bottom: var(--space-md);
}

.memo-banner-content {
  flex: 1;
  padding: var(--space-lg);
}

.memo-banner-title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.memo-banner-subtitle {
  font-size: 0.9375rem;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 4px;
}

.memo-banner-vio {
  height: 130px;
  width: auto;
  flex-shrink: 0;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
  margin-right: var(--space-md);
  margin-bottom: -10px;
}

/* Stats */
.memo-stats {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}

.memo-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-sm) var(--space-xs);
  background: var(--white);
  border-radius: var(--radius-lg);
  border: 2px solid var(--lavender-100);
}

.memo-stat-value {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  color: #F43F5E;
}

.memo-stat-label {
  font-size: 0.6875rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Search */
.memo-search {
  margin-bottom: var(--space-md);
}

.memo-search-input {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-full);
  font-size: 0.875rem;
  background: var(--white);
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.memo-search-input:focus {
  border-color: #F43F5E;
}

/* Category filter pills */
.memo-filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin-bottom: var(--space-sm);
}

.filter-pill {
  padding: 6px 12px;
  border-radius: var(--radius-full);
  border: 2px solid var(--lavender-100);
  background: var(--white);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.filter-pill:hover {
  border-color: #FDA4AF;
}

.filter-pill.active {
  background: #F43F5E;
  border-color: #F43F5E;
  color: white;
}

/* Tag pills */
.memo-tags-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: var(--space-md);
}

.tag-pill {
  padding: 4px 10px;
  border-radius: var(--radius-full);
  border: 1.5px solid var(--lavender-100);
  background: var(--white);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.tag-pill:hover {
  border-color: #FDA4AF;
}

.tag-pill.active {
  background: #FFF1F2;
  border-color: #F43F5E;
  color: #F43F5E;
}

/* Grid */
.memo-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-sm);
}

@media (min-width: 480px) {
  .memo-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.memo-card {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--white);
  border-radius: var(--radius-lg);
  border: 2px solid var(--lavender-100);
  cursor: pointer;
  transition: all 0.15s;
}

.memo-card:hover {
  border-color: #FDA4AF;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(244, 63, 94, 0.1);
}

.memo-card-image {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-md);
  overflow: hidden;
  flex-shrink: 0;
}

.memo-card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.memo-card-emoji {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  background: #FFF1F2;
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.memo-card-body {
  flex: 1;
  min-width: 0;
}

.memo-card-header {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.memo-card-name {
  font-weight: 700;
  font-size: 0.9375rem;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.memo-card-link {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.875rem;
  padding: 2px;
  opacity: 0.6;
  transition: opacity 0.15s;
}

.memo-card-link:hover {
  opacity: 1;
}

.memo-card-category {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 2px;
}

.memo-card-note {
  font-size: 0.8125rem;
  color: var(--text-secondary);
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.memo-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.memo-tag {
  font-size: 0.6875rem;
  font-weight: 600;
  color: #F43F5E;
  background: #FFF1F2;
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

/* Empty state */
.memo-empty {
  text-align: center;
  padding: var(--space-xl) var(--space-md);
}

.memo-empty-vio {
  width: 120px;
  height: auto;
  margin-bottom: var(--space-md);
  opacity: 0.8;
}

.memo-empty-title {
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 var(--space-xs);
}

.memo-empty-text {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0 0 var(--space-md);
}

.memo-empty-btn {
  padding: var(--space-sm) var(--space-lg);
  background: #F43F5E;
  color: white;
  border: none;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.15s;
}

.memo-empty-btn:hover {
  background: #E11D48;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.modal-sheet {
  background: var(--bg-primary);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  padding: var(--space-sm) var(--space-lg) var(--space-xl);
  width: 100%;
  max-width: 500px;
  max-height: 85vh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

@media (min-width: 640px) {
  .modal-overlay {
    align-items: center;
  }
  .modal-sheet {
    border-radius: var(--radius-xl);
    max-height: 80vh;
  }
}

.modal-handle {
  width: 40px;
  height: 4px;
  background: var(--gray-300);
  border-radius: var(--radius-full);
  margin: 0 auto var(--space-md);
  cursor: pointer;
}

.modal-title {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 var(--space-md);
}

.form-group {
  margin-bottom: var(--space-md);
}

.form-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: var(--space-xs);
}

.form-input {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-lg);
  font-size: 0.875rem;
  background: var(--white);
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
  font-family: inherit;
}

.form-input:focus {
  border-color: #F43F5E;
}

.form-textarea {
  resize: vertical;
  min-height: 60px;
}

/* Category grid in modal */
.category-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}

@media (max-width: 400px) {
  .category-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.category-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--space-sm) var(--space-xs);
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-md);
  background: var(--white);
  cursor: pointer;
  transition: all 0.15s;
  font-size: 0.6875rem;
  color: var(--text-secondary);
}

.category-btn span:first-child {
  font-size: 1.25rem;
}

.category-btn:hover {
  border-color: #FDA4AF;
}

.category-btn.active {
  border-color: #F43F5E;
  background: #FFF1F2;
  color: #F43F5E;
}

/* Image upload */
.image-preview {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: var(--radius-md);
  overflow: hidden;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-remove {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  font-size: 0.6875rem;
  padding: 4px;
  cursor: pointer;
}

.image-upload {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-md);
  border: 2px dashed var(--lavender-200);
  border-radius: var(--radius-lg);
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--text-secondary);
  transition: all 0.15s;
}

.image-upload:hover {
  border-color: #F43F5E;
  color: #F43F5E;
}

/* Modal actions */
.modal-actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-top: var(--space-lg);
}

.modal-actions-right {
  display: flex;
  gap: var(--space-sm);
  margin-left: auto;
}

.btn-save {
  padding: var(--space-sm) var(--space-lg);
  background: #F43F5E;
  color: white;
  border: none;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-save:hover {
  background: #E11D48;
}

.btn-cancel {
  padding: var(--space-sm) var(--space-md);
  background: none;
  border: 2px solid var(--lavender-200);
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.btn-cancel:hover {
  border-color: var(--lavender-300);
}

.btn-delete {
  padding: var(--space-sm) var(--space-md);
  background: none;
  border: 2px solid #FCA5A5;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: 0.875rem;
  color: #EF4444;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-delete:hover {
  background: #FEE2E2;
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

<style>
/* Dark mode */
[data-theme="dark"] .memo-banner {
  background: linear-gradient(135deg, #9F1239 0%, #BE123C 50%, #E11D48 100%) !important;
  box-shadow: 0 4px 16px rgba(159, 18, 57, 0.4) !important;
}

[data-theme="dark"] .memo-stat {
  background: #2D2640 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .memo-stat-value {
  color: #FDA4AF !important;
}

[data-theme="dark"] .memo-search-input {
  background: #2D2640 !important;
  border-color: #3D3456 !important;
  color: #E8DEF8 !important;
}

[data-theme="dark"] .memo-search-input:focus {
  border-color: #F43F5E !important;
}

[data-theme="dark"] .filter-pill {
  background: #2D2640 !important;
  border-color: #3D3456 !important;
  color: #A78BFA !important;
}

[data-theme="dark"] .filter-pill:hover {
  border-color: #F43F5E !important;
}

[data-theme="dark"] .filter-pill.active {
  background: #F43F5E !important;
  border-color: #F43F5E !important;
  color: white !important;
}

[data-theme="dark"] .tag-pill {
  background: #2D2640 !important;
  border-color: #3D3456 !important;
  color: #A78BFA !important;
}

[data-theme="dark"] .tag-pill:hover {
  border-color: #F43F5E !important;
}

[data-theme="dark"] .tag-pill.active {
  background: rgba(244, 63, 94, 0.15) !important;
  border-color: #F43F5E !important;
  color: #FDA4AF !important;
}

[data-theme="dark"] .memo-card {
  background: #2D2640 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .memo-card:hover {
  border-color: #F43F5E !important;
  box-shadow: 0 4px 12px rgba(244, 63, 94, 0.2) !important;
}

[data-theme="dark"] .memo-card-emoji {
  background: rgba(244, 63, 94, 0.15) !important;
}

[data-theme="dark"] .memo-tag {
  background: rgba(244, 63, 94, 0.15) !important;
  color: #FDA4AF !important;
}

[data-theme="dark"] .memo-empty-btn {
  background: #E11D48 !important;
}

/* Modal dark mode */
[data-theme="dark"] .memorabilia-page .modal-sheet {
  background: #1A1625 !important;
}

[data-theme="dark"] .memorabilia-page .modal-handle {
  background: #3D3456 !important;
}

[data-theme="dark"] .memorabilia-page .form-input {
  background: #2D2640 !important;
  border-color: #3D3456 !important;
  color: #E8DEF8 !important;
}

[data-theme="dark"] .memorabilia-page .form-input:focus {
  border-color: #F43F5E !important;
}

[data-theme="dark"] .memorabilia-page .category-btn {
  background: #2D2640 !important;
  border-color: #3D3456 !important;
  color: #A78BFA !important;
}

[data-theme="dark"] .memorabilia-page .category-btn.active {
  background: rgba(244, 63, 94, 0.15) !important;
  border-color: #F43F5E !important;
  color: #FDA4AF !important;
}

[data-theme="dark"] .memorabilia-page .image-upload {
  border-color: #3D3456 !important;
  color: #A78BFA !important;
}

[data-theme="dark"] .memorabilia-page .image-upload:hover {
  border-color: #F43F5E !important;
  color: #FDA4AF !important;
}

[data-theme="dark"] .memorabilia-page .btn-cancel {
  border-color: #3D3456 !important;
  color: #A78BFA !important;
}

[data-theme="dark"] .memorabilia-page .btn-delete {
  border-color: #7F1D1D !important;
  color: #FCA5A5 !important;
}
</style>
