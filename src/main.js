import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import './style.css'
import App from './App.vue'
import { auth, waitForAuth } from './firebase'

// Views
import Landing from './views/Landing.vue'
import Home from './views/Home.vue'
import Dashboard from './views/Dashboard.vue'
import Wallets from './views/Wallets.vue'
import History from './views/History.vue'
import Wishlist from './views/Wishlist.vue'
import Media from './views/Movies.vue'
import VioPass from './views/VioPass.vue'
import Laundry from './views/Laundry.vue'
import Settings from './views/Settings.vue'

const routes = [
  { path: '/landing', name: 'Landing', component: Landing, meta: { public: true } },
  { path: '/', name: 'Home', component: Home },
  { path: '/finance', name: 'Finance', component: Dashboard },
  { path: '/wallets', name: 'Wallets', component: Wallets },
  { path: '/history', name: 'History', component: History },
  { path: '/wishlist', name: 'Wishlist', component: Wishlist },
  { path: '/media', name: 'Media', component: Media },
  { path: '/viopass', name: 'VioPass', component: VioPass },
  { path: '/laundry', name: 'Laundry', component: Laundry },
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
