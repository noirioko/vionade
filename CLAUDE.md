# Vionade - Project Documentation for Claude Code

**Last Updated:** December 14, 2024

---

## What is Vionade?

Vionade is a personal finance tracker app with a cute mascot named **Vio** (a lemon character). It's designed for a single user to track their income, expenses, savings goals, and daily spending habits.

**Previous names:** "Mochi Money", "Mochimane Fresh", "Lavender Finance"

---

## Tech Stack

- **Framework:** Vue 3 (Composition API with `<script setup>`)
- **Router:** Vue Router
- **State:** Custom reactive store (`src/stores/finance.js`) - NOT Pinia
- **Styling:** Plain CSS with CSS variables (no Tailwind, no preprocessors)
- **Storage:** localStorage + Firebase Firestore sync
- **Auth:** Firebase Auth (anonymous + Google sign-in)
- **Deployment:** Vercel

---

## Theme & Branding

### Light Mode
- Primary: Lavender/purple (`--lavender-500: #9F7AEA`)
- Accent: Sunshine yellow (`--sunshine-400: #FFE135`)
- Background: Light cream/white

### Dark Mode
- Primary: Deep purple background (`#0F0D1A`, `#1A1625`)
- Accent: Bright purple (`#8B5CF6`, `#A78BFA`)
- NO yellow in dark mode - replaced with purple tones

### Mascot: Vio
- A cute lemon character
- Images in `/public/images/`:
  - `vio-logo.png` - Logo
  - `vio_right.png` - Happy Vio
  - `vio_sit.png` - Neutral/sitting Vio
  - `vio_fall.png` - Sad/worried Vio

---

## Features

### 1. Dashboard (`/`)
- Total balance across all wallets
- "Tracking since" date
- Monthly income/expense summary (yellow calendar box)
- Challenge section (spending limits)
- Quick wallet preview
- Recent transactions for selected month

### 2. Wallets (`/wallets`)
- Multiple wallet support (BCA, BRI, OVO, GoPay, Cash, etc.)
- Balance per wallet
- Transfer between wallets

### 3. History (`/history`)
- Calendar view with dots showing transaction days
- Monthly recap (income, expenses, savings)
- "Save Today" quick action
- Lifetime savings goal progress
- Transaction list with filters

### 4. Wishlist (`/wishlist`)
- Savings goals for items you want to buy
- Priority levels: Need, Want, Dream
- Progress bars showing saved amount
- Emoji picker for each item
- Claim items when fully saved
- Low balance warning when total balance is low

### 5. Vio Pass (`/viopass`)
- Daily check-in system
- "Did you spend money today?" Yes/No
- If yes, select category
- Vio reacts based on spending type:
  - Nice (food, groceries, bills, pets) = okay reaction
  - Neutral (travel, hotel) = thinking reaction
  - Bad (clothes, other) = sad reaction
- Streak tracking (current & longest)
- No-spend days counter

### 6. Laundry (`/laundry`)
- Separate feature for tracking laundry
- Status: Pending → Washing → Drying → Done
- Location tracking (Home, Puro, Aries)
- Cost tracking with expense logging

### 7. Settings (`/settings`)
- Monthly targets (income, expense, savings)
- Lifetime goal configuration
- Theme toggle (light/dark)
- Google account linking
- Data backup/restore (JSON export)
- Firebase sync status

### 8. Challenges (on Dashboard)
- Set spending limits for a week or month
- Progress bar showing spending vs limit
- Warning when approaching limit
- Give up option

---

## Key UX Patterns

### Floating Action Button (FAB)
- Yellow "+" button, bottom-right corner
- **Contextual** - does different things based on current page:
  - Dashboard/Wallets/History → Add Transaction
  - Wishlist → Add Wishlist Item
  - Laundry → Add Laundry
- Pages register their FAB action via `inject('fabAction')`

### Bottom Navigation
- **Mobile (< 640px):** 5 items + "More" button with slide-up sheet
- **Desktop (≥ 640px):** All 7 items visible, no "More" button
- Items: Home, Wallets, History, Wishlist, Vio Pass, Laundry, Settings

### Date Picker (Add Transaction)
- Quick buttons: "Today", "Yesterday"
- Native date input for other dates

### Modals
- Slide up from bottom on mobile feel
- Dark overlay backdrop
- Click outside to close

---

## File Structure

```
src/
├── App.vue                 # Main app, FAB, theme application
├── main.js                 # Router setup, app initialization
├── style.css               # Global styles, CSS variables, dark mode
├── firebase.js             # Firebase config & auth functions
├── stores/
│   └── finance.js          # All state management (NOT Pinia)
├── components/
│   ├── BottomNav.vue       # Navigation with responsive More menu
│   ├── AddTransactionModal.vue
│   └── HelpTip.vue         # Tooltip/help component
└── views/
    ├── Dashboard.vue
    ├── Wallets.vue
    ├── History.vue
    ├── Wishlist.vue
    ├── VioPass.vue
    ├── Laundry.vue
    └── Settings.vue
```

---

## State Management (`finance.js`)

The store uses Vue's `reactive()` and `computed()` directly - NOT Pinia.

### Main State
- `wallets` - Array of wallet objects
- `transactions` - Array of all transactions
- `savings` - Array of savings entries
- `wishlist` - Array of wishlist items
- `challenges` - Array of challenges
- `vioPass` - Check-in data (checkins, streaks)
- `settings` - User preferences, targets, theme

### Key Functions
- `addTransaction()`, `deleteTransaction()`, `updateTransaction()`
- `addSavings()`, `deleteSavings()`
- `addWishlistItem()`, `addToWishlistSavings()`, `claimWishlistItem()`
- `startChallenge()`, `endChallenge()`
- `performCheckin()`, `getVioMood()`, `getVioPassStats()`
- `toggleTheme()`, `applyTheme()`
- `formatCurrency()` - Formats to IDR

### Data Persistence
1. Saves to `localStorage` immediately
2. Debounced sync to Firebase Firestore (1 second delay)
3. Real-time listener for cross-device sync

---

## Currency

Default currency is **Indonesian Rupiah (IDR)**.

Format: `Rp1.000.000` (no decimals, dot as thousands separator)

---

## Firebase Setup

- Project: `lavender-ledge`
- Firestore collection: `users/{userId}` - each user has one document with all their data
- Auth: Anonymous by default, can link Google account
- API key is public (normal for Firebase web apps - security is in Firestore rules)

---

## Common Tasks

### Adding a new page
1. Create `src/views/NewPage.vue`
2. Add route in `src/main.js`
3. Add nav item in `src/components/BottomNav.vue`
4. If page needs FAB, inject and register action

### Adding dark mode styles
Use `[data-theme="dark"]` selector in an unscoped `<style>` block:
```css
<style>
[data-theme="dark"] .my-class {
  background: #1A1625 !important;
}
</style>
```

### Adding new state
1. Add to `state` object in `finance.js`
2. Add `loadFromStorage()` call
3. Add `watch()` for localStorage persistence
4. Add to `saveToFirebase()` and `loadFromFirebase()`
5. Export in `useFinanceStore()` return object

---

## Things to Remember

- User is Indonesian - currency is IDR, not USD
- Vio is the mascot - use appropriate images for emotions
- Dark mode uses PURPLE, not yellow
- The "+" FAB is contextual based on current page
- Mobile-first design but works on desktop too
- No external UI libraries - all custom CSS
