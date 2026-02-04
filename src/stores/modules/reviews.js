// Reviews module - Track product/service reviews
import { state, markPendingChanges } from '../core'

export const REVIEW_CATEGORIES = [
  { id: 'product', name: 'Product', icon: '📦' },
  { id: 'food', name: 'Food & Drink', icon: '🍜' },
  { id: 'restaurant', name: 'Restaurant', icon: '🍽️' },
  { id: 'cafe', name: 'Cafe', icon: '☕' },
  { id: 'service', name: 'Service', icon: '🛠️' },
  { id: 'app', name: 'App', icon: '📱' },
  { id: 'place', name: 'Place', icon: '📍' },
  { id: 'beauty', name: 'Beauty', icon: '💄' },
  { id: 'other', name: 'Other', icon: '✨' },
]

export function addReview(review) {
  markPendingChanges()

  const newReview = {
    id: Date.now(),
    name: review.name.trim(),
    category: review.category,
    rating: review.rating, // 1-5
    review: review.review?.trim() || '',
    pros: review.pros?.trim() || '',
    cons: review.cons?.trim() || '',
    recommend: review.recommend ?? true,
    price: review.price ? parseFloat(review.price) : null,
    date: review.date || new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  }

  state.reviews = [newReview, ...state.reviews]
}

export function updateReview(id, updates) {
  markPendingChanges()

  state.reviews = state.reviews.map(review => {
    if (review.id === id) {
      return {
        ...review,
        name: updates.name?.trim() ?? review.name,
        category: updates.category ?? review.category,
        rating: updates.rating ?? review.rating,
        review: updates.review?.trim() ?? review.review,
        pros: updates.pros?.trim() ?? review.pros,
        cons: updates.cons?.trim() ?? review.cons,
        recommend: updates.recommend ?? review.recommend,
        price: updates.price !== undefined ? (updates.price ? parseFloat(updates.price) : null) : review.price,
        date: updates.date ?? review.date
      }
    }
    return review
  })
}

export function deleteReview(id) {
  markPendingChanges()
  state.reviews = state.reviews.filter(review => review.id !== id)
}

export function getReviewsByCategory(category) {
  return state.reviews.filter(r => r.category === category)
}

export function getReviewStats() {
  const reviews = state.reviews || []
  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0

  return {
    total: reviews.length,
    avgRating: Math.round(avgRating * 10) / 10,
    recommended: reviews.filter(r => r.recommend).length,
    byCategory: REVIEW_CATEGORIES.map(cat => ({
      ...cat,
      count: reviews.filter(r => r.category === cat.id).length
    })).filter(cat => cat.count > 0)
  }
}
