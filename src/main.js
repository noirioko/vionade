import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import './style.css'
import App from './App.vue'

// Views
import Dashboard from './views/Dashboard.vue'
import Wallets from './views/Wallets.vue'
import History from './views/History.vue'
import Wishlist from './views/Wishlist.vue'
import VioPass from './views/VioPass.vue'
import Laundry from './views/Laundry.vue'
import Settings from './views/Settings.vue'

const routes = [
  { path: '/', name: 'Dashboard', component: Dashboard },
  { path: '/wallets', name: 'Wallets', component: Wallets },
  { path: '/history', name: 'History', component: History },
  { path: '/wishlist', name: 'Wishlist', component: Wishlist },
  { path: '/viopass', name: 'VioPass', component: VioPass },
  { path: '/laundry', name: 'Laundry', component: Laundry },
  { path: '/settings', name: 'Settings', component: Settings },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

const app = createApp(App)
app.use(router)
app.mount('#app')
