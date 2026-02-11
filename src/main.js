import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import './style.css'
import App from './App.vue'
import { auth, waitForAuth } from './firebase'

// Views - lazy loaded for code splitting
const Landing = () => import('./views/Landing.vue')
const Home = () => import('./views/Home.vue')
const Finance = () => import('./views/Finance.vue')
const Media = () => import('./views/Movies.vue')
const VioPass = () => import('./views/VioPass.vue')
const Laundry = () => import('./views/Laundry.vue')
const Wellness = () => import('./views/Wellness.vue')
const Passwords = () => import('./views/Passwords.vue')
const PetTracker = () => import('./views/PetTracker.vue')
const PetDetail = () => import('./views/PetDetail.vue')
const Collections = () => import('./views/Collections.vue')
const Wardrobe = () => import('./views/Wardrobe.vue')
const Subscriptions = () => import('./views/Subscriptions.vue')
const ShoppingList = () => import('./views/ShoppingList.vue')
const Reviews = () => import('./views/Reviews.vue')
const VacationBooks = () => import('./views/VacationBooks.vue')
const VacationBookDetail = () => import('./views/VacationBookDetail.vue')
const Memorabilia = () => import('./views/Memorabilia.vue')
const Settings = () => import('./views/Settings.vue')

const routes = [
  { path: '/landing', name: 'Landing', component: Landing, meta: { public: true } },
  { path: '/', name: 'Home', component: Home },
  { path: '/finance', name: 'Finance', component: Finance },
  // Redirect old routes to finance
  { path: '/wallets', redirect: '/finance' },
  { path: '/history', redirect: '/finance' },
  { path: '/wishlist', redirect: '/finance' },
  { path: '/media', name: 'Media', component: Media },
  { path: '/viopass', name: 'VioPass', component: VioPass },
  { path: '/laundry', name: 'Laundry', component: Laundry },
  { path: '/wellness', name: 'Wellness', component: Wellness },
  { path: '/habits', redirect: '/wellness' },
  { path: '/passwords', name: 'Passwords', component: Passwords },
  { path: '/pets', name: 'Pets', component: PetTracker },
  { path: '/pets/:id', name: 'PetDetail', component: PetDetail },
  { path: '/aquarium', redirect: '/pets' },
  { path: '/collections', name: 'Collections', component: Collections },
  { path: '/wardrobe', name: 'Wardrobe', component: Wardrobe },
  { path: '/subscriptions', name: 'Subscriptions', component: Subscriptions },
  { path: '/shopping', name: 'Shopping', component: ShoppingList },
  { path: '/reviews', name: 'Reviews', component: Reviews },
  { path: '/vacation', name: 'VacationBooks', component: VacationBooks },
  { path: '/vacation/:id', name: 'VacationBookDetail', component: VacationBookDetail },
  { path: '/memorabilia', name: 'Memorabilia', component: Memorabilia },
  { path: '/settings', name: 'Settings', component: Settings },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Navigation guard - redirect to landing if not authenticated
router.beforeEach(async (to, from, next) => {
  // Wait for auth to be ready before checking
  const user = await waitForAuth()

  // If going to a protected route and not authenticated
  if (!to.meta.public && !user) {
    next('/landing')
  }
  // If going to landing but already authenticated
  else if (to.path === '/landing' && user) {
    next('/')
  }
  else {
    next()
  }
})

const app = createApp(App)
app.use(router)
app.mount('#app')
