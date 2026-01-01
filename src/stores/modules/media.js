// Media module - Movies, Series, Books
import { state, generateId } from '../core'

// Movies CRUD
export function addMovie(movie) {
  const id = generateId()
  state.movies.push({
    id,
    title: movie.title,
    posterUrl: movie.posterUrl || null,
    rating: movie.rating || 5,
    watchedDate: movie.watchedDate || new Date().toISOString().split('T')[0],
    notes: movie.notes || '',
    wouldWatchAgain: movie.wouldWatchAgain !== undefined ? movie.wouldWatchAgain : true,
    createdAt: new Date().toISOString(),
  })
}

export function updateMovie(id, updates) {
  const movie = state.movies.find(m => m.id === id)
  if (movie) {
    Object.assign(movie, updates)
  }
}

export function deleteMovie(id) {
  const index = state.movies.findIndex(m => m.id === id)
  if (index !== -1) {
    state.movies.splice(index, 1)
  }
}

// Series CRUD
export function addSeries(series) {
  const id = generateId()
  state.series.push({
    id,
    title: series.title,
    posterUrl: series.posterUrl || null,
    rating: series.rating || 5,
    watchedDate: series.watchedDate || new Date().toISOString().split('T')[0],
    notes: series.notes || '',
    didFinish: series.didFinish !== undefined ? series.didFinish : true,
    wouldWatchAgain: series.wouldWatchAgain !== undefined ? series.wouldWatchAgain : 'yes',
    createdAt: new Date().toISOString(),
  })
}

export function updateSeries(id, updates) {
  const series = state.series.find(s => s.id === id)
  if (series) {
    Object.assign(series, updates)
  }
}

export function deleteSeries(id) {
  const index = state.series.findIndex(s => s.id === id)
  if (index !== -1) {
    state.series.splice(index, 1)
  }
}

// Books CRUD
export function addBook(book) {
  const id = generateId()
  state.books.push({
    id,
    title: book.title,
    posterUrl: book.posterUrl || null,
    rating: book.rating || 5,
    watchedDate: book.watchedDate || new Date().toISOString().split('T')[0],
    notes: book.notes || '',
    didFinish: book.didFinish !== undefined ? book.didFinish : true,
    wouldWatchAgain: book.wouldWatchAgain !== undefined ? book.wouldWatchAgain : 'yes',
    createdAt: new Date().toISOString(),
  })
}

export function updateBook(id, updates) {
  const book = state.books.find(b => b.id === id)
  if (book) {
    Object.assign(book, updates)
  }
}

export function deleteBook(id) {
  const index = state.books.findIndex(b => b.id === id)
  if (index !== -1) {
    state.books.splice(index, 1)
  }
}
