<script setup>
import { ref, computed, watch } from 'vue'
import { useFinanceStore } from '../stores'
import { useToast } from '../composables/useToast'

const props = defineProps({
  item: {
    type: Object,
    default: null
  },
  itemType: {
    type: String,
    default: 'video' // 'video' or 'channel'
  },
  preselectedChannelId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['close', 'save'])
const store = useFinanceStore()
const toast = useToast()

// Form state - Video
const title = ref('')
const channelName = ref('')
const channelId = ref(null)
const thumbnail = ref('')
const videoUrl = ref('')
const watchedDate = ref(new Date().toISOString().split('T')[0])
const rating = ref(7)
const notes = ref('')
const wouldWatchAgain = ref('yes')

// Form state - Channel
const name = ref('')
const channelUrl = ref('')
const category = ref('other')
const subscribed = ref(true)

// Image upload
const isUploadingImage = ref(false)
const isFetchingUrl = ref(false)

// Get available channels for dropdown
const availableChannels = computed(() => store.youtubeChannels.value || [])

// Initialize form if editing
watch(() => props.item, (item) => {
  if (item) {
    if (props.itemType === 'video') {
      title.value = item.title || ''
      channelName.value = item.channelName || ''
      channelId.value = item.channelId || null
      thumbnail.value = item.thumbnail || ''
      videoUrl.value = item.videoUrl || ''
      watchedDate.value = item.watchedDate || new Date().toISOString().split('T')[0]
      rating.value = item.rating || 7
      notes.value = item.notes || ''
      wouldWatchAgain.value = item.wouldWatchAgain || 'yes'
    } else {
      name.value = item.name || ''
      thumbnail.value = item.thumbnail || ''
      channelUrl.value = item.channelUrl || ''
      category.value = item.category || 'other'
      subscribed.value = item.subscribed !== undefined ? item.subscribed : true
      notes.value = item.notes || ''
    }
  } else {
    resetForm()
  }
}, { immediate: true })

// Handle preselected channel
watch(() => props.preselectedChannelId, (id) => {
  if (id && props.itemType === 'video') {
    channelId.value = id
    // Auto-fill channel name from the selected channel
    const channel = availableChannels.value.find(c => c.id === id)
    if (channel) {
      channelName.value = channel.name
    }
  }
}, { immediate: true })

function resetForm() {
  title.value = ''
  channelName.value = ''
  channelId.value = props.preselectedChannelId || null
  thumbnail.value = ''
  videoUrl.value = ''
  watchedDate.value = new Date().toISOString().split('T')[0]
  rating.value = 7
  notes.value = ''
  wouldWatchAgain.value = 'yes'
  name.value = ''
  channelUrl.value = ''
  category.value = 'other'
  subscribed.value = true
}

// When channel is selected from dropdown, update channelName
function handleChannelSelect(selectedChannelId) {
  channelId.value = selectedChannelId
  if (selectedChannelId) {
    const channel = availableChannels.value.find(c => c.id === selectedChannelId)
    if (channel) {
      channelName.value = channel.name
    }
  }
}

// Extract YouTube video ID from URL
function extractVideoId(url) {
  if (!url) return null
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

// Fetch video info from YouTube URL using noembed (CORS-friendly)
async function fetchYoutubeInfo() {
  const url = videoUrl.value.trim()
  if (!url) return

  const videoId = extractVideoId(url)
  if (!videoId) {
    toast.error('Could not parse YouTube URL')
    return
  }

  isFetchingUrl.value = true
  try {
    // Use noembed.com which supports CORS (YouTube oEmbed doesn't)
    const noembedUrl = `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`
    const response = await fetch(noembedUrl)

    if (!response.ok) {
      throw new Error('Video not found')
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error)
    }

    // Fill in the form (always fill, user clicked Fetch explicitly)
    if (data.title) {
      title.value = data.title
    }
    if (data.author_name) {
      channelName.value = data.author_name
    }

    // Get thumbnail (high quality)
    thumbnail.value = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`

    toast.success('Video info fetched!')
  } catch (error) {
    console.error('Error fetching YouTube info:', error)
    // Fallback: at least get the thumbnail
    thumbnail.value = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    toast.warning('Could not get video details, but thumbnail loaded')
  } finally {
    isFetchingUrl.value = false
  }
}

const isEditing = computed(() => !!props.item)

function handleSave() {
  if (props.itemType === 'video') {
    if (!title.value.trim()) return

    const videoData = {
      title: title.value.trim(),
      channelName: channelName.value.trim(),
      channelId: channelId.value || null,
      thumbnail: thumbnail.value || null,
      videoUrl: videoUrl.value.trim() || null,
      watchedDate: watchedDate.value,
      rating: rating.value,
      notes: notes.value.trim(),
      wouldWatchAgain: wouldWatchAgain.value
    }

    if (isEditing.value) {
      store.updateYoutubeVideo(props.item.id, videoData)
      toast.success('Video updated!')
    } else {
      store.addYoutubeVideo(videoData)
      toast.success('Video added!')
    }
  } else {
    if (!name.value.trim()) return

    const channelData = {
      name: name.value.trim(),
      thumbnail: thumbnail.value || null,
      channelUrl: channelUrl.value.trim() || null,
      category: category.value,
      subscribed: subscribed.value,
      notes: notes.value.trim()
    }

    if (isEditing.value) {
      store.updateYoutubeChannel(props.item.id, channelData)
      toast.success('Channel updated!')
    } else {
      store.addYoutubeChannel(channelData)
      toast.success('Channel added!')
    }
  }

  emit('save')
}

function handleDelete() {
  if (!props.item) return
  const confirmMsg = props.itemType === 'video' ? 'Delete this video?' : 'Delete this channel?'
  if (confirm(confirmMsg)) {
    if (props.itemType === 'video') {
      store.deleteYoutubeVideo(props.item.id)
    } else {
      store.deleteYoutubeChannel(props.item.id)
    }
    emit('save')
  }
}

// Image upload and compression
function handleImageUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return

  isUploadingImage.value = true

  const reader = new FileReader()
  reader.onload = (e) => {
    const img = new Image()
    img.onload = () => {
      const maxWidth = 300
      const maxHeight = 300
      let { width, height } = img

      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height
        height = maxHeight
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      thumbnail.value = canvas.toDataURL('image/jpeg', 0.7)
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
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">
          {{ isEditing ? 'Edit' : 'Add' }} {{ itemType === 'video' ? 'Video' : 'Channel' }}
        </h3>
        <button class="modal-close" @click="$emit('close')">×</button>
      </div>

      <div class="modal-body">
        <!-- Video Form -->
        <template v-if="itemType === 'video'">
          <!-- Quick URL Paste Section -->
          <div class="url-fetch-section">
            <div class="input-group" style="margin-bottom: 0;">
              <label class="input-label">Paste YouTube URL</label>
              <div class="url-fetch-row">
                <input
                  v-model="videoUrl"
                  type="url"
                  class="input"
                  placeholder="https://youtube.com/watch?v=..."
                  @keyup.enter="fetchYoutubeInfo"
                />
                <button
                  class="fetch-btn"
                  :disabled="isFetchingUrl || !videoUrl"
                  @click="fetchYoutubeInfo"
                >
                  {{ isFetchingUrl ? '...' : 'Fetch' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Thumbnail Preview -->
          <div class="thumbnail-section">
            <div class="thumbnail-preview">
              <img v-if="thumbnail" :src="thumbnail" alt="Thumbnail" />
              <span v-else>🎬</span>
            </div>
            <div class="thumbnail-actions">
              <label class="upload-btn">
                <input type="file" accept="image/*" @change="handleImageUpload" hidden />
                {{ isUploadingImage ? 'Processing...' : 'Upload' }}
              </label>
              <input
                v-model="thumbnail"
                type="url"
                class="input url-input"
                placeholder="or paste thumbnail URL..."
              />
            </div>
          </div>

          <div class="input-group">
            <label class="input-label">Video Title</label>
            <input v-model="title" type="text" class="input" placeholder="Video title" />
          </div>

          <!-- Channel Selector -->
          <div class="input-group">
            <label class="input-label">Link to Channel (optional)</label>
            <select
              class="input select-input"
              :value="channelId"
              @change="handleChannelSelect($event.target.value || null)"
            >
              <option value="">-- No channel --</option>
              <option
                v-for="ch in availableChannels"
                :key="ch.id"
                :value="ch.id"
              >
                {{ ch.name }}
              </option>
            </select>
          </div>

          <div class="input-group">
            <label class="input-label">Channel Name</label>
            <input v-model="channelName" type="text" class="input" placeholder="Channel name (auto-filled if linked)" />
          </div>

          <div class="input-group">
            <label class="input-label">Date Watched</label>
            <input v-model="watchedDate" type="date" class="input" />
          </div>

          <div class="input-group">
            <label class="input-label">Rating ({{ rating }}/10)</label>
            <div class="star-rating">
              <button
                v-for="n in 10"
                :key="n"
                class="star-btn"
                :class="{ filled: n <= rating }"
                @click="rating = n"
              >★</button>
            </div>
          </div>

          <div class="input-group">
            <label class="input-label">Notes</label>
            <textarea v-model="notes" class="input textarea" placeholder="What did you think?" rows="2"></textarea>
          </div>

          <div class="input-group">
            <label class="input-label">Would watch again?</label>
            <div class="option-buttons">
              <button
                class="option-btn"
                :class="{ active: wouldWatchAgain === 'yes' }"
                @click="wouldWatchAgain = 'yes'"
              >Yes!</button>
              <button
                class="option-btn"
                :class="{ active: wouldWatchAgain === 'maybe' }"
                @click="wouldWatchAgain = 'maybe'"
              >Maybe</button>
              <button
                class="option-btn"
                :class="{ active: wouldWatchAgain === 'no' }"
                @click="wouldWatchAgain = 'no'"
              >Nope</button>
            </div>
          </div>
        </template>

        <!-- Channel Form -->
        <template v-else>
          <!-- Thumbnail Preview -->
          <div class="thumbnail-section">
            <div class="thumbnail-preview channel">
              <img v-if="thumbnail" :src="thumbnail" alt="Channel" />
              <span v-else>📺</span>
            </div>
            <div class="thumbnail-actions">
              <label class="upload-btn">
                <input type="file" accept="image/*" @change="handleImageUpload" hidden />
                {{ isUploadingImage ? 'Processing...' : 'Upload' }}
              </label>
              <input
                v-model="thumbnail"
                type="url"
                class="input url-input"
                placeholder="or paste URL..."
              />
            </div>
          </div>

          <div class="input-group">
            <label class="input-label">Channel Name</label>
            <input v-model="name" type="text" class="input" placeholder="Channel name" />
          </div>

          <div class="input-group">
            <label class="input-label">Channel URL (optional)</label>
            <input v-model="channelUrl" type="url" class="input" placeholder="https://youtube.com/@..." />
          </div>

          <div class="input-group">
            <label class="input-label">Category</label>
            <div class="category-grid">
              <button
                v-for="cat in store.YOUTUBE_CATEGORIES"
                :key="cat.id"
                class="category-btn"
                :class="{ active: category === cat.id }"
                @click="category = cat.id"
              >
                <span>{{ cat.icon }}</span>
                <span>{{ cat.name }}</span>
              </button>
            </div>
          </div>

          <div class="input-group">
            <label class="input-label">Subscribed?</label>
            <div class="option-buttons">
              <button
                class="option-btn"
                :class="{ active: subscribed === true }"
                @click="subscribed = true"
              >Yes</button>
              <button
                class="option-btn"
                :class="{ active: subscribed === false }"
                @click="subscribed = false"
              >No</button>
            </div>
          </div>

          <div class="input-group">
            <label class="input-label">Notes</label>
            <textarea v-model="notes" class="input textarea" placeholder="What kind of content do they make?" rows="2"></textarea>
          </div>
        </template>
      </div>

      <div class="modal-footer">
        <button v-if="isEditing" class="btn btn-delete" @click="handleDelete">Delete</button>
        <button class="btn btn-primary" @click="handleSave">
          {{ isEditing ? 'Save' : 'Add' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-body {
  padding: var(--space-md) var(--space-lg);
  max-height: 60vh;
  overflow-y: auto;
}

/* URL Fetch Section */
.url-fetch-section {
  padding: var(--space-md);
  background: linear-gradient(135deg, #FF000020 0%, #FF634720 100%);
  border: 2px solid #FF6347;
  border-radius: 12px;
  margin-bottom: var(--space-md);
}

.url-fetch-row {
  display: flex;
  gap: var(--space-sm);
}

.url-fetch-row .input {
  flex: 1;
}

.fetch-btn {
  padding: var(--space-sm) var(--space-md);
  background: #FF6347;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 700;
  color: white;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}

.fetch-btn:hover:not(:disabled) {
  background: #FF4500;
}

.fetch-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.select-input {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
  cursor: pointer;
}

.thumbnail-section {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
  padding: var(--space-md);
  background: var(--background-secondary);
  border-radius: 12px;
}

.thumbnail-preview {
  width: 80px;
  height: 60px;
  border-radius: 8px;
  background: var(--lavender-100);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  overflow: hidden;
  flex-shrink: 0;
}

.thumbnail-preview.channel {
  width: 60px;
  height: 60px;
  border-radius: 50%;
}

.thumbnail-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-actions {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.upload-btn {
  padding: var(--space-xs) var(--space-sm);
  background: var(--lavender-500);
  border: none;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  text-align: center;
}

.upload-btn:hover {
  background: var(--lavender-600);
}

.url-input {
  padding: var(--space-xs) var(--space-sm) !important;
  font-size: 0.75rem !important;
}

.input-group {
  margin-bottom: var(--space-md);
}

.input-label {
  display: block;
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: var(--space-xs);
  color: var(--text-secondary);
}

.input {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
  font-family: inherit;
}

.input:focus {
  outline: none;
  border-color: var(--lavender-500);
}

.textarea {
  resize: none;
}

.star-rating {
  display: flex;
  gap: 2px;
}

.star-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  font-size: 1.25rem;
  color: var(--gray-300);
  cursor: pointer;
  transition: all 0.15s;
  padding: 0;
}

.star-btn.filled {
  color: #F59E0B;
}

.star-btn:hover {
  transform: scale(1.2);
}

.option-buttons {
  display: flex;
  gap: var(--space-xs);
}

.option-btn {
  flex: 1;
  padding: var(--space-sm);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: white;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.option-btn:hover {
  border-color: var(--lavender-300);
}

.option-btn.active {
  background: var(--lavender-500);
  border-color: var(--lavender-500);
  color: white;
}

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
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: white;
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.category-btn span:first-child {
  font-size: 1.25rem;
}

.category-btn:hover {
  border-color: var(--lavender-300);
}

.category-btn.active {
  background: var(--lavender-500);
  border-color: var(--lavender-500);
  color: white;
}

.modal-footer {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-lg);
  border-top: 1px solid var(--border-color);
}

.btn {
  flex: 1;
  padding: var(--space-sm) var(--space-md);
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-primary {
  background: var(--lavender-500);
  border: 3px solid var(--lavender-600);
  color: white;
  box-shadow: 3px 3px 0 var(--lavender-700);
}

.btn-primary:hover {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 var(--lavender-700);
}

.btn-delete {
  background: white;
  border: 2px solid #FF6B6B;
  color: #FF6B6B;
}

.btn-delete:hover {
  background: #FF6B6B;
  color: white;
}
</style>

<style>
/* Dark mode */
[data-theme="dark"] .url-fetch-section {
  background: linear-gradient(135deg, #FF000015 0%, #FF634715 100%) !important;
  border-color: #CC5038 !important;
}

[data-theme="dark"] .fetch-btn {
  background: #CC5038 !important;
}

[data-theme="dark"] .fetch-btn:hover:not(:disabled) {
  background: #FF6347 !important;
}

[data-theme="dark"] .select-input {
  background-color: #1A1625 !important;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23999' d='M6 8L1 3h10z'/%3E%3C/svg%3E") !important;
}

[data-theme="dark"] .thumbnail-section {
  background: #2D2640 !important;
}

[data-theme="dark"] .thumbnail-preview {
  background: #3D3456 !important;
}

[data-theme="dark"] .upload-btn {
  background: #8B5CF6 !important;
}

[data-theme="dark"] .upload-btn:hover {
  background: #7C3AED !important;
}

[data-theme="dark"] .option-btn,
[data-theme="dark"] .category-btn {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}

[data-theme="dark"] .option-btn:hover,
[data-theme="dark"] .category-btn:hover {
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .option-btn.active,
[data-theme="dark"] .category-btn.active {
  background: #8B5CF6 !important;
  border-color: #8B5CF6 !important;
}

[data-theme="dark"] .star-btn {
  color: #3D3456 !important;
}

[data-theme="dark"] .star-btn.filled {
  color: #F59E0B !important;
}

[data-theme="dark"] .btn-primary {
  background: #8B5CF6 !important;
  border-color: #7C3AED !important;
  box-shadow: 3px 3px 0 #5B21B6 !important;
}

[data-theme="dark"] .btn-primary:hover {
  box-shadow: 1px 1px 0 #5B21B6 !important;
}
</style>
