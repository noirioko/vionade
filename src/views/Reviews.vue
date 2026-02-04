<script setup>
import { ref, computed, inject, onMounted, onUnmounted } from 'vue'
import { useFinanceStore } from '../stores'
import { useToast } from '../composables/useToast'

const store = useFinanceStore()
const toast = useToast()
const fabAction = inject('fabAction')

// Modal state
const showAddModal = ref(false)
const editingReview = ref(null)

// Filter state
const selectedCategory = ref('all')
const sortBy = ref('date') // 'date', 'rating', 'name'

// Form data
const form = ref({
  name: '',
  category: 'product',
  rating: 5,
  review: '',
  pros: '',
  cons: '',
  recommend: true,
  price: '',
  date: new Date().toISOString().split('T')[0]
})

// Stats
const stats = computed(() => store.getReviewStats())

// Filtered and sorted reviews
const filteredReviews = computed(() => {
  let reviews = [...store.reviews.value]

  // Filter by category
  if (selectedCategory.value !== 'all') {
    reviews = reviews.filter(r => r.category === selectedCategory.value)
  }

  // Sort
  if (sortBy.value === 'date') {
    reviews.sort((a, b) => new Date(b.date) - new Date(a.date))
  } else if (sortBy.value === 'rating') {
    reviews.sort((a, b) => b.rating - a.rating)
  } else if (sortBy.value === 'name') {
    reviews.sort((a, b) => a.name.localeCompare(b.name))
  }

  return reviews
})

// Categories with counts
const categoriesWithCounts = computed(() => {
  const counts = {}
  store.reviews.value.forEach(r => {
    counts[r.category] = (counts[r.category] || 0) + 1
  })
  return store.REVIEW_CATEGORIES.map(cat => ({
    ...cat,
    count: counts[cat.id] || 0
  }))
})

function openAddModal() {
  editingReview.value = null
  form.value = {
    name: '',
    category: 'product',
    rating: 5,
    review: '',
    pros: '',
    cons: '',
    recommend: true,
    price: '',
    date: new Date().toISOString().split('T')[0]
  }
  showAddModal.value = true
}

function openEditModal(review) {
  editingReview.value = review
  form.value = {
    name: review.name,
    category: review.category,
    rating: review.rating,
    review: review.review || '',
    pros: review.pros || '',
    cons: review.cons || '',
    recommend: review.recommend,
    price: review.price?.toString() || '',
    date: review.date
  }
  showAddModal.value = true
}

function saveReview() {
  if (!form.value.name.trim()) {
    toast.error('Please enter a name')
    return
  }

  if (editingReview.value) {
    store.updateReview(editingReview.value.id, form.value)
    toast.success('Review updated!')
  } else {
    store.addReview(form.value)
    toast.success('Review added!')
  }

  showAddModal.value = false
}

function deleteReview(review) {
  if (confirm('Delete this review?')) {
    store.deleteReview(review.id)
    toast.success('Review deleted')
    showAddModal.value = false
  }
}

function getCategoryInfo(categoryId) {
  return store.REVIEW_CATEGORIES.find(c => c.id === categoryId) || store.REVIEW_CATEGORIES[0]
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

function formatDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

// FAB
onMounted(() => {
  fabAction.value = openAddModal
})

onUnmounted(() => {
  fabAction.value = null
})
</script>

<template>
  <div class="page reviews-page">
    <div class="page-header">
      <img src="/images/vio-logo.png" alt="Vionade" class="page-header-logo" />
    </div>

    <!-- Banner -->
    <div class="reviews-banner">
      <div class="reviews-banner-content">
        <div class="reviews-banner-title">My Reviews</div>
        <div class="reviews-banner-subtitle">Rate everything you try!</div>
      </div>
      <img src="/images/vio_sit.png" alt="Vio" class="reviews-banner-vio" />
    </div>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-card">
        <span class="stat-value">{{ stats.total }}</span>
        <span class="stat-label">Reviews</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ stats.avgRating }}<span class="stat-unit">★</span></span>
        <span class="stat-label">Avg Rating</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ stats.recommended }}</span>
        <span class="stat-label">Recommended</span>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-section">
      <div class="category-filter">
        <button
          class="filter-chip"
          :class="{ active: selectedCategory === 'all' }"
          @click="selectedCategory = 'all'"
        >
          All ({{ store.reviews.value.length }})
        </button>
        <button
          v-for="cat in categoriesWithCounts"
          :key="cat.id"
          class="filter-chip"
          :class="{ active: selectedCategory === cat.id }"
          @click="selectedCategory = cat.id"
          v-show="cat.count > 0"
        >
          {{ cat.icon }} {{ cat.name }} ({{ cat.count }})
        </button>
      </div>

      <select v-model="sortBy" class="sort-select">
        <option value="date">Newest</option>
        <option value="rating">Highest Rated</option>
        <option value="name">A-Z</option>
      </select>
    </div>

    <!-- Reviews List -->
    <div class="reviews-list">
      <div v-if="filteredReviews.length === 0" class="empty-state">
        <span class="empty-emoji">📝</span>
        <p>No reviews yet</p>
        <p class="empty-hint">Tap + to write your first review!</p>
      </div>

      <div
        v-for="review in filteredReviews"
        :key="review.id"
        class="review-card"
        @click="openEditModal(review)"
      >
        <div class="review-header">
          <span class="review-category-icon">{{ getCategoryInfo(review.category).icon }}</span>
          <div class="review-title-section">
            <div class="review-name">{{ review.name }}</div>
            <div class="review-meta">
              <span class="review-category">{{ getCategoryInfo(review.category).name }}</span>
              <span class="review-date">{{ formatDate(review.date) }}</span>
            </div>
          </div>
          <div class="review-rating">
            <span class="stars">{{ '★'.repeat(review.rating) }}{{ '☆'.repeat(5 - review.rating) }}</span>
          </div>
        </div>

        <p v-if="review.review" class="review-text">{{ review.review }}</p>

        <div class="review-details" v-if="review.pros || review.cons">
          <div v-if="review.pros" class="review-pros">
            <span class="detail-label">👍</span>
            <span>{{ review.pros }}</span>
          </div>
          <div v-if="review.cons" class="review-cons">
            <span class="detail-label">👎</span>
            <span>{{ review.cons }}</span>
          </div>
        </div>

        <div class="review-footer">
          <span class="recommend-badge" :class="{ yes: review.recommend, no: !review.recommend }">
            {{ review.recommend ? '👍 Recommend' : '👎 Not recommended' }}
          </span>
          <span v-if="review.price" class="price-badge">{{ formatCurrency(review.price) }}</span>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <Teleport to="body">
      <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
        <div class="modal reviews-modal">
          <div class="modal-header">
            <h2>{{ editingReview ? 'Edit Review' : 'Write Review' }}</h2>
            <button class="modal-close" @click="showAddModal = false">&times;</button>
          </div>

          <div class="modal-body">
            <!-- Name -->
            <div class="form-group">
              <label>What are you reviewing?</label>
              <input
                v-model="form.name"
                type="text"
                placeholder="Product, restaurant, service..."
                class="form-input"
              />
            </div>

            <!-- Category -->
            <div class="form-group">
              <label>Category</label>
              <div class="category-grid">
                <button
                  v-for="cat in store.REVIEW_CATEGORIES"
                  :key="cat.id"
                  class="category-btn"
                  :class="{ active: form.category === cat.id }"
                  @click="form.category = cat.id"
                >
                  <span class="cat-icon">{{ cat.icon }}</span>
                  <span class="cat-name">{{ cat.name }}</span>
                </button>
              </div>
            </div>

            <!-- Rating -->
            <div class="form-group">
              <label>Rating</label>
              <div class="rating-input">
                <button
                  v-for="star in 5"
                  :key="star"
                  class="star-btn"
                  :class="{ filled: star <= form.rating }"
                  @click="form.rating = star"
                >
                  {{ star <= form.rating ? '★' : '☆' }}
                </button>
              </div>
            </div>

            <!-- Review Text -->
            <div class="form-group">
              <label>Your Review (optional)</label>
              <textarea
                v-model="form.review"
                placeholder="Share your thoughts..."
                class="form-textarea"
                rows="3"
              ></textarea>
            </div>

            <!-- Pros/Cons -->
            <div class="form-row">
              <div class="form-group">
                <label>👍 Pros</label>
                <input
                  v-model="form.pros"
                  type="text"
                  placeholder="What's good?"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label>👎 Cons</label>
                <input
                  v-model="form.cons"
                  type="text"
                  placeholder="What's bad?"
                  class="form-input"
                />
              </div>
            </div>

            <!-- Recommend -->
            <div class="form-group">
              <label>Would you recommend?</label>
              <div class="recommend-toggle">
                <button
                  class="toggle-btn"
                  :class="{ active: form.recommend }"
                  @click="form.recommend = true"
                >
                  👍 Yes
                </button>
                <button
                  class="toggle-btn"
                  :class="{ active: !form.recommend }"
                  @click="form.recommend = false"
                >
                  👎 No
                </button>
              </div>
            </div>

            <!-- Price & Date -->
            <div class="form-row">
              <div class="form-group">
                <label>Price (optional)</label>
                <input
                  v-model="form.price"
                  type="number"
                  placeholder="IDR"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label>Date</label>
                <input
                  v-model="form.date"
                  type="date"
                  class="form-input"
                />
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button v-if="editingReview" class="btn-delete" @click="deleteReview(editingReview)">
              Delete
            </button>
            <button class="btn-save" @click="saveReview">
              {{ editingReview ? 'Update' : 'Save Review' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* Banner */
.reviews-banner {
  position: relative;
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 50%, #C4B5FD 100%);
  border-radius: var(--radius-xl);
  overflow: hidden;
  min-height: 120px;
  margin-bottom: var(--space-md);
  box-shadow: 0 4px 16px rgba(139, 92, 246, 0.3);
}

.reviews-banner-content {
  flex: 1;
  padding: var(--space-lg);
}

.reviews-banner-title {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.reviews-banner-subtitle {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 4px;
}

.reviews-banner-vio {
  height: 120px;
  width: auto;
  flex-shrink: 0;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
  align-self: flex-end;
  margin-right: var(--space-sm);
}

/* Stats Row */
.stats-row {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}

.stat-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-md);
  background: var(--bg-card);
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-lg);
}

.stat-value {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--lavender-600);
}

.stat-unit {
  font-size: 1rem;
  color: #F59E0B;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Filters */
.filters-section {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  align-items: center;
  margin-bottom: var(--space-md);
}

.category-filter {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  flex: 1;
}

.filter-chip {
  padding: 6px 12px;
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-full);
  background: white;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.filter-chip:hover {
  border-color: var(--lavender-300);
}

.filter-chip.active {
  background: var(--lavender-500);
  border-color: var(--lavender-500);
  color: white;
}

.sort-select {
  padding: 6px 12px;
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-md);
  background: white;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-primary);
  cursor: pointer;
}

/* Reviews List */
.reviews-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.review-card {
  background: var(--bg-card);
  border: 2px solid var(--lavender-100);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  cursor: pointer;
  transition: all 0.2s;
}

.review-card:hover {
  border-color: var(--lavender-300);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.15);
}

.review-header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.review-category-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.review-title-section {
  flex: 1;
  min-width: 0;
}

.review-name {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 1rem;
}

.review-meta {
  display: flex;
  gap: var(--space-sm);
  font-size: 0.75rem;
  color: var(--text-tertiary);
  margin-top: 2px;
}

.review-rating {
  flex-shrink: 0;
}

.stars {
  color: #F59E0B;
  font-size: 0.875rem;
  letter-spacing: 1px;
}

.review-text {
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: var(--space-sm);
}

.review-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: var(--space-sm);
}

.review-pros,
.review-cons {
  display: flex;
  align-items: flex-start;
  gap: var(--space-xs);
  font-size: 0.8125rem;
}

.review-pros {
  color: var(--income-color);
}

.review-cons {
  color: var(--expense-color);
}

.detail-label {
  flex-shrink: 0;
}

.review-footer {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.recommend-badge {
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 0.6875rem;
  font-weight: 600;
}

.recommend-badge.yes {
  background: #D1FAE5;
  color: #065F46;
}

.recommend-badge.no {
  background: #FEE2E2;
  color: #991B1B;
}

.price-badge {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
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
.reviews-modal {
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
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

.form-input,
.form-textarea {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-md);
  font-size: 0.9375rem;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--lavender-400);
}

.form-textarea {
  resize: vertical;
  font-family: inherit;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
}

/* Category Grid */
.category-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-xs);
}

.category-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--space-sm);
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-md);
  background: white;
  cursor: pointer;
  transition: all 0.15s;
}

.category-btn:hover {
  border-color: var(--lavender-300);
}

.category-btn.active {
  border-color: var(--lavender-500);
  background: var(--lavender-50);
}

.cat-icon {
  font-size: 1.25rem;
}

.cat-name {
  font-size: 0.625rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.category-btn.active .cat-name {
  color: var(--lavender-700);
}

/* Rating Input */
.rating-input {
  display: flex;
  gap: var(--space-xs);
}

.star-btn {
  font-size: 2rem;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--gray-300);
  transition: all 0.15s;
  padding: 0;
}

.star-btn.filled {
  color: #F59E0B;
}

.star-btn:hover {
  transform: scale(1.2);
}

/* Recommend Toggle */
.recommend-toggle {
  display: flex;
  gap: var(--space-sm);
}

.toggle-btn {
  flex: 1;
  padding: var(--space-sm);
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-md);
  background: white;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.toggle-btn:hover {
  border-color: var(--lavender-300);
}

.toggle-btn.active {
  border-color: var(--lavender-500);
  background: var(--lavender-50);
  color: var(--lavender-700);
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

@media (max-width: 480px) {
  .reviews-banner-title {
    font-size: 1.5rem;
  }

  .reviews-banner-vio {
    height: 100px;
  }

  .category-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>

<style>
/* Dark mode */
[data-theme="dark"] .reviews-banner {
  background: linear-gradient(135deg, #5B21B6 0%, #7C3AED 50%, #8B5CF6 100%) !important;
}

[data-theme="dark"] .stat-card {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .filter-chip {
  background: #2D2640 !important;
  border-color: #3D3456 !important;
  color: #9D8BC2 !important;
}

[data-theme="dark"] .filter-chip:hover {
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .filter-chip.active {
  background: #8B5CF6 !important;
  border-color: #8B5CF6 !important;
  color: white !important;
}

[data-theme="dark"] .sort-select {
  background: #2D2640 !important;
  border-color: #3D3456 !important;
  color: #E5E5E5 !important;
}

[data-theme="dark"] .review-card {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .review-card:hover {
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .recommend-badge.yes {
  background: #064E3B !important;
  color: #6EE7B7 !important;
}

[data-theme="dark"] .recommend-badge.no {
  background: #7F1D1D !important;
  color: #FCA5A5 !important;
}

[data-theme="dark"] .category-btn {
  background: #2D2640 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .category-btn:hover {
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .category-btn.active {
  background: #3D3456 !important;
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .form-input,
[data-theme="dark"] .form-textarea {
  background: #2D2640 !important;
  border-color: #3D3456 !important;
  color: #E5E5E5 !important;
}

[data-theme="dark"] .form-input:focus,
[data-theme="dark"] .form-textarea:focus {
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .star-btn {
  color: #4D4366 !important;
}

[data-theme="dark"] .star-btn.filled {
  color: #F59E0B !important;
}

[data-theme="dark"] .toggle-btn {
  background: #2D2640 !important;
  border-color: #3D3456 !important;
  color: #9D8BC2 !important;
}

[data-theme="dark"] .toggle-btn.active {
  background: #3D3456 !important;
  border-color: #8B5CF6 !important;
  color: #C4B5FD !important;
}

[data-theme="dark"] .modal-footer {
  border-top-color: #3D3456 !important;
}

[data-theme="dark"] .btn-delete {
  background: transparent !important;
}
</style>
