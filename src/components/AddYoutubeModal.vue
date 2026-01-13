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
  }
})

const emit = defineEmits(['close', 'save'])
const store = useFinanceStore()
const toast = useToast()

// Form state - Video
const title = ref('')
const channelName = ref('')
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

// Initialize form if editing
watch(() => props.item, (item) => {
  if (item) {
    if (props.itemType === 'video') {
      title.value = item.title || ''
      channelName.value = item.channelName || ''
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

function resetForm() {
  title.value = ''
  channelName.value = ''
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

const isEditing = computed(() => !!props.item)

function handleSave() {
  if (props.itemType === 'video') {
    if (!title.value.trim()) return

    const videoData = {
      title: title.value.trim(),
      channelName: channelName.value.trim(),
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
                placeholder="or paste URL..."
              />
            </div>
          </div>

          <div class="input-group">
            <label class="input-label">Video Title</label>
            <input v-model="title" type="text" class="input" placeholder="Video title" />
          </div>

          <div class="input-group">
            <label class="input-label">Channel Name</label>
            <input v-model="channelName" type="text" class="input" placeholder="Channel name" />
          </div>

          <div class="input-group">
            <label class="input-label">Video URL (optional)</label>
            <input v-model="videoUrl" type="url" class="input" placeholder="https://youtube.com/watch?v=..." />
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
