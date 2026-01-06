# Vionade - Project Documentation for Claude Code

**Last Updated:** January 6, 2026

---

## What is Vionade?

Vionade is a personal finance tracker app with a cute mascot named **Vio** (a lemon character). It's designed for a single user to track their income, expenses, savings goals, and daily spending habits.

**Previous names:** "Mochi Money", "Mochimane Fresh", "Lavender Finance"

---

## Tech Stack

- **Framework:** Vue 3 (Composition API with `<script setup>`)
- **Router:** Vue Router
- **State:** Custom reactive store (`src/stores/`) - NOT Pinia
- **Styling:** Plain CSS with CSS variables (no Tailwind, no preprocessors)
- **Storage:** localStorage + Firebase Firestore sync
- **Auth:** Firebase Auth (anonymous + Google sign-in)
- **Deployment:** Vercel

---

## Theme & Branding

### Light Mode
- Primary: Lavender/purple (`--lavender-500: #9F7AEA`)
- Accent: Sunshine yellow (`--sunshine-400: #FFE135`)
- Background: Light cream/white (`#FFFDF7`)
- Cards: White with subtle borders

### Dark Mode
- Primary: Deep purple background (`#0F0D1A`, `#1A1625`)
- Secondary background: `#2D2640`
- Accent: Bright purple (`#8B5CF6`, `#A78BFA`)
- Borders: `#3D3456`
- **NO yellow in dark mode** - replaced with purple tones

### Mascot: Vio
- A cute lemon character
- Images in `/public/images/`:
  - `vio-logo.png` - Logo
  - `vio_right.png` - Happy Vio
  - `vio_sit.png` - Neutral/sitting Vio
  - `vio_fall.png` - Sad/worried Vio

---

## CSS Guidelines

### Spacing Variables (use these consistently)
```css
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
```

### Border Radius
```css
--radius-sm: 8px;    /* Small elements, buttons */
--radius-md: 12px;   /* Cards, inputs */
--radius-lg: 16px;   /* Modals, sections */
--radius-xl: 24px;   /* Large cards */
```

### Standard Card Styling
```css
.card {
  background: white;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: var(--space-md);
}

/* Dark mode */
[data-theme="dark"] .card {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}
```

### Feature Section Box (colored boxes like Pet Tracker, Collections)
```css
.feature-section {
  background: #00BFFF;           /* or gradient */
  border: 3px solid #0099CC;
  border-radius: 16px;
  padding: var(--space-md);
  box-shadow: 4px 4px 0 #0099CC;
}

/* Dark mode - use purple instead */
[data-theme="dark"] .feature-section {
  background: #5B21B6 !important;
  border-color: #7C3AED !important;
  box-shadow: 4px 4px 0 #3D3456 !important;
}
```

### Input Styling
```css
.input {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
}

.input:focus {
  outline: none;
  border-color: var(--lavender-500);
}

/* Dark mode */
[data-theme="dark"] .input {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
  color: var(--text-primary) !important;
}
```

### Button Patterns

**Primary Button (action buttons)**
```css
.btn-primary {
  padding: var(--space-sm) var(--space-xl);
  background: var(--lavender-500);
  border: 3px solid var(--lavender-600);
  border-radius: 12px;
  font-weight: 700;
  color: white;
  cursor: pointer;
  box-shadow: 3px 3px 0 var(--lavender-700);
}

.btn-primary:hover {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 var(--lavender-700);
}
```

**Filter Pill**
```css
.filter-pill {
  padding: 4px 10px;
  background: white;
  border: 2px solid var(--border-color);
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.filter-pill.active {
  background: var(--lavender-500);
  border-color: var(--lavender-600);
  color: white;
}
```

### Modal Pattern
```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;      /* Slide up from bottom */
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

/* Dark mode */
[data-theme="dark"] .modal {
  background: #1A1625 !important;
}
```

### Empty State Pattern
```css
.empty-state {
  text-align: center;
  padding: var(--space-xl);
}

.empty-vio {
  width: 80px;
  margin-bottom: var(--space-md);
}
```

### Image Upload Section
```css
.photo-upload-section {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--background-secondary);
  border-radius: 12px;
}

.photo-preview {
  width: 80px;
  height: 80px;
  border-radius: 12px;          /* or 50% for avatars */
  background: var(--lavender-100);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
```

### Grid Patterns
```css
/* Item grid (wardrobe, collections) */
.item-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: var(--space-md);
}

/* Pet/selection grid */
.select-grid {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
}
```

---

## Features

### Core Finance
1. **Dashboard** (`/`) - Balance overview, monthly summary, challenges
2. **Wallets** (`/wallets`) - Multiple wallet support
3. **History** (`/history`) - Calendar view, transaction list
4. **Wishlist** (`/wishlist`) - Savings goals with progress tracking

### Lifestyle
5. **Vio Pass** (`/viopass`) - Daily check-in, streak tracking
6. **Habits** (`/habits`) - Monthly habit challenges
7. **Laundry** (`/laundry`) - Laundry status tracking

### Media Tracking
8. **Media** (`/media`) - Movies, Series, Books with ratings

### Pet Care
9. **Pet Tracker** (`/pets`) - Quick logs, sessions (bath, vet, grooming, food)
10. **Aquarium** (`/aquarium`) - Tank maintenance logs

### Organization
11. **Collections** (`/collections`) - Blind boxes, figures with completion tracking
12. **Wardrobe** (`/wardrobe`) - Clothes with location tracking
13. **Passwords** (`/passwords`) - Password manager

### System
14. **Settings** (`/settings`) - Targets, theme, backup/restore

---

## File Structure

```
src/
├── App.vue                     # Main app, FAB, ToastContainer
├── main.js                     # Router setup
├── style.css                   # Global styles, CSS variables
├── firebase.js                 # Firebase config & auth
├── composables/
│   └── useToast.js             # Toast notification system
├── stores/
│   ├── index.js                # Main store export
│   ├── core.js                 # State, Firebase sync, helpers
│   └── modules/
│       ├── finance.js          # Transactions, savings, challenges
│       ├── media.js            # Movies, series, books
│       ├── passwords.js        # Password management
│       ├── habits.js           # Habit tracking
│       ├── viopass.js          # Check-in system
│       ├── wishlist.js         # Wishlist items
│       ├── settings.js         # User preferences
│       ├── pets.js             # Pet logs and sessions
│       ├── tanks.js            # Aquarium logs
│       ├── collections.js      # Collection tracking
│       └── wardrobe.js         # Wardrobe tracking
├── components/
│   ├── BottomNav.vue           # Navigation
│   ├── ToastContainer.vue      # Toast notifications
│   ├── AddTransactionModal.vue
│   ├── AddMovieModal.vue
│   └── ...
├── views/
│   ├── Home.vue
│   ├── Wallets.vue
│   ├── History.vue
│   ├── Wishlist.vue
│   ├── VioPass.vue
│   ├── Habits.vue
│   ├── Movies.vue              # Media tracking
│   ├── Laundry.vue
│   ├── Passwords.vue
│   ├── PetTracker.vue
│   ├── AquariumTracker.vue
│   ├── Collections.vue
│   ├── Wardrobe.vue
│   └── Settings.vue
└── data/
    └── petActions.js           # Pet action definitions
```

---

## Common Patterns

### Toast Notifications (use instead of alert())
```javascript
import { useToast } from '../composables/useToast'

const toast = useToast()

// Usage
toast.success('Item saved!')
toast.error('Could not load image. Please try a different file.')
toast.warning('Low balance warning')
toast.info('Sync in progress...')
```

### Image Upload with Error Handling
```javascript
function handleImageUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return

  isUploadingImage.value = true

  const reader = new FileReader()
  reader.onload = (e) => {
    const img = new Image()
    img.onload = () => {
      // Compress and save
      const canvas = document.createElement('canvas')
      // ... compression logic
      form.value.photo = canvas.toDataURL('image/jpeg', 0.7)
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
```

### Save with Trimming and Validation
```javascript
function saveItem() {
  const trimmedName = form.value.name.trim()
  if (!trimmedName) return

  const parsedPrice = parseFloat(form.value.price)

  const dataToSave = {
    ...form.value,
    name: trimmedName,
    notes: form.value.notes.trim(),
    price: !isNaN(parsedPrice) ? parsedPrice : null,
  }

  if (editingItem.value) {
    store.updateItem(editingItem.value.id, dataToSave)
  } else {
    store.addItem(dataToSave)
  }
  showModal.value = false
}
```

### FAB Registration
```javascript
import { inject, onMounted, onUnmounted } from 'vue'

const fabAction = inject('fabAction')

onMounted(() => {
  fabAction.value = openAddModal
})

onUnmounted(() => {
  fabAction.value = null
})
```

### Adding New State to Store
1. Add to `state` object in `core.js`
2. Add `loadFromStorage()` call
3. Add to `stateKeys` array for localStorage watcher
4. Add to `saveToFirebase()` function
5. Add to `loadFromFirebase()` function
6. Add to `setupRealtimeSync()` function
7. Add to `resetAllData()` function
8. Create module in `stores/modules/`
9. Export from `stores/index.js`

---

## Things to Remember

- User is Indonesian - currency is IDR, not USD
- Vio is the mascot - use appropriate images for emotions
- **Dark mode uses PURPLE, not yellow**
- The "+" FAB is contextual based on current page
- Mobile-first design but works on desktop too
- No external UI libraries - all custom CSS
- **Always handle image upload errors** (onerror handlers)
- **Always trim text inputs before saving**
- **Always validate numeric inputs** (check for NaN)
- **Use toast notifications instead of alert()**
- **Follow consistent CSS patterns** documented above
