# Vionade - Project Documentation

**Last Updated:** January 17, 2026

## Quick Reference

- **Framework:** Vue 3 (Composition API with `<script setup>`)
- **State:** Custom store in `src/stores/` (NOT Pinia)
- **Styling:** Plain CSS with variables (no Tailwind)
- **User:** Indonesian (currency = IDR)
- **Mascot:** Vio (a lemon character)

---

## Design System (CRITICAL)

### Every Page MUST Have:
1. `.page` wrapper with page-specific class (e.g., `.page.finance-page`)
2. `.page-header` with `<img src="/images/vio-logo.png">`
3. A banner with gradient + Vio image
4. Dark mode styles in unscoped `<style>` block

### Page Color Themes

| Page | Light Gradient | Dark Gradient |
|------|---------------|---------------|
| Finance | Gold `#F59E0B` | Purple `#7C3AED` |
| Media | Purple `#8B5CF6` | Purple `#5B21B6` |
| Wellness | Pink `#EC4899` | Pink `#831843` |
| Subscriptions | Purple `#8B5CF6` | Purple `#5B21B6` |
| Laundry | Blue `#3B82F6` | Blue `#1E40AF` |
| Wardrobe | Pink `#EC4899` | Pink `#831843` |
| Collections | Orange `#F97316` | Orange `#9A3412` |
| Pet Tracker | Green `#10B981` | Green `#065F46` |
| Aquarium | Cyan `#06B6D4` | Cyan `#0E7490` |
| VioPass | Purple `#8B5CF6` | Purple `#5B21B6` |
| Settings | Gray `#6B7280` | Gray `#374151` |
| Passwords | Indigo `#4F46E5` | Indigo `#3730A3` |

### Dark Mode Rules
- Background: `#1A1625`
- Secondary bg: `#2D2640`
- Borders: `#3D3456`
- Accent: `#8B5CF6`, `#A78BFA`
- **NO yellow in dark mode** - use purple

---

## Key Patterns

### FAB (Floating Action Button)
```javascript
const fabAction = inject('fabAction')

onMounted(() => {
  fabAction.value = openAddModal
})

onUnmounted(() => {
  fabAction.value = null
})
```
**DO NOT use** deprecated `setFabAction`/`clearFabAction`.

### Toast Notifications
```javascript
import { useToast } from '../composables/useToast'
const toast = useToast()
toast.success('Saved!')
toast.error('Failed!')
```
**DO NOT use** `alert()`.

### Adding New State
1. Add to `state` in `core.js` with `loadFromStorage()`
2. Add to `stateKeys` array
3. Add to `saveToFirebase()`, `loadFromFirebase()`, `setupRealtimeSync()`, `resetAllData()`
4. Create module in `stores/modules/`
5. Export from `stores/index.js`

---

## Code Quality Rules

- **Always trim** text inputs before saving
- **Always validate** numeric inputs (check NaN)
- **Always handle** image upload errors (onerror)
- **Use lazy loading** for routes: `const X = () => import('./views/X.vue')`

---

## File Locations

- Views: `src/views/`
- Components: `src/components/`
- Store modules: `src/stores/modules/`
- Vio images: `/public/images/vio_*.png`

## Vio Images
- `vio_sit.png` - Default/neutral
- `vio_right.png` - Happy
- `vio_fall.png` - Sad
- `vio_happy.png` - Very happy

---

## Example: Banner Pattern

Look at `Finance.vue` or `Wellness.vue` for complete examples. Key structure:

```vue
<div class="[page]-banner">
  <div class="[page]-banner-content">
    <div class="[page]-banner-title">Title</div>
    <div class="[page]-banner-subtitle">Subtitle</div>
  </div>
  <img src="/images/vio_sit.png" class="[page]-banner-vio" />
</div>
```

For hub pages with sidebar (Finance, Media, Wellness), look at `Finance.vue` for the complete layout pattern.
