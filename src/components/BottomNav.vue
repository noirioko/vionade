<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <nav class="bottom-nav">
    <RouterLink to="/" class="nav-item">
      <span class="nav-item-icon">🏠</span>
      <span>Home</span>
    </RouterLink>

    <RouterLink to="/wallets" class="nav-item">
      <span class="nav-item-icon">👛</span>
      <span>Wallets</span>
    </RouterLink>

    <RouterLink to="/history" class="nav-item">
      <span class="nav-item-icon">📋</span>
      <span>History</span>
    </RouterLink>

    <RouterLink to="/laundry" class="nav-item">
      <span class="nav-item-icon">🧺</span>
      <span>Laundry</span>
    </RouterLink>

    <RouterLink to="/settings" class="nav-item">
      <span class="nav-item-icon">⚙️</span>
      <span>Settings</span>
    </RouterLink>
  </nav>
</template>
