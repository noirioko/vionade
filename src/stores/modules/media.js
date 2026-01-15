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

// YouTube Videos CRUD
export function addYoutubeVideo(video) {
  const id = generateId()
  const newVideo = {
    id,
    title: video.title,
    channelName: video.channelName || '',
    channelId: video.channelId || null,
    thumbnail: video.thumbnail || null,
    videoUrl: video.videoUrl || null,
    watchedDate: video.watchedDate || new Date().toISOString().split('T')[0],
    rating: video.rating || 5,
    notes: video.notes || '',
    wouldWatchAgain: video.wouldWatchAgain || 'yes',
    createdAt: new Date().toISOString(),
  }
  // Reassign array to trigger reactivity
  state.youtubeVideos = [...state.youtubeVideos, newVideo]
  return id
}

export function updateYoutubeVideo(id, updates) {
  state.youtubeVideos = state.youtubeVideos.map(v =>
    v.id === id ? { ...v, ...updates } : v
  )
}

export function deleteYoutubeVideo(id) {
  state.youtubeVideos = state.youtubeVideos.filter(v => v.id !== id)
}

// YouTube Channels CRUD
export const YOUTUBE_CATEGORIES = [
  { id: 'gaming', name: 'Gaming', icon: '🎮' },
  { id: 'tech', name: 'Tech', icon: '💻' },
  { id: 'cooking', name: 'Cooking', icon: '🍳' },
  { id: 'music', name: 'Music', icon: '🎵' },
  { id: 'education', name: 'Education', icon: '📚' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬' },
  { id: 'vlog', name: 'Vlog', icon: '📷' },
  { id: 'art', name: 'Art', icon: '🎨' },
  { id: 'fitness', name: 'Fitness', icon: '💪' },
  { id: 'comedy', name: 'Comedy', icon: '😂' },
  { id: 'news', name: 'News', icon: '📰' },
  { id: 'other', name: 'Other', icon: '📺' },
]

export function addYoutubeChannel(channel) {
  const id = generateId()
  const newChannel = {
    id,
    name: channel.name,
    thumbnail: channel.thumbnail || null,
    channelUrl: channel.channelUrl || null,
    category: channel.category || 'other',
    subscribed: channel.subscribed !== undefined ? channel.subscribed : true,
    notes: channel.notes || '',
    createdAt: new Date().toISOString(),
  }
  // Reassign array to trigger reactivity
  state.youtubeChannels = [...state.youtubeChannels, newChannel]
  return id
}

export function updateYoutubeChannel(id, updates) {
  state.youtubeChannels = state.youtubeChannels.map(c =>
    c.id === id ? { ...c, ...updates } : c
  )
}

export function deleteYoutubeChannel(id) {
  state.youtubeChannels = state.youtubeChannels.filter(c => c.id !== id)
}
