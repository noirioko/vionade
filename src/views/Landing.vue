<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { signInWithGoogle, signInAsGuest } from '../firebase'

const router = useRouter()
const isLoading = ref(false)
const error = ref('')

async function handleGoogleSignIn() {
  isLoading.value = true
  error.value = ''
  try {
    await signInWithGoogle()
    router.push('/')
  } catch (err) {
    console.error('Sign in error:', err)
    error.value = 'Failed to sign in. Please try again.'
  } finally {
    isLoading.value = false
  }
}

async function handleGuestSignIn() {
  isLoading.value = true
  error.value = ''
  try {
    await signInAsGuest()
    router.push('/')
  } catch (err) {
    console.error('Guest sign in error:', err)
    error.value = 'Failed to continue. Please try again.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="landing-page">
    <div class="landing-content">
      <!-- Logo & Mascot -->
      <div class="landing-hero">
        <img src="/images/vio_right.png" alt="Vio" class="landing-vio" />
        <img src="/images/vio-logo.png" alt="Vionade" class="landing-logo" />
        <p class="landing-tagline">Your kawaii finance tracker</p>
      </div>

      <!-- Features Preview -->
      <div class="landing-features">
        <div class="feature-item">
          <span class="feature-icon">💰</span>
          <span class="feature-text">Track expenses</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">🎯</span>
          <span class="feature-text">Set goals</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">🎬</span>
          <span class="feature-text">Movie journal</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">🍋</span>
          <span class="feature-text">Daily check-ins</span>
        </div>
      </div>

      <!-- Error Message -->
      <p v-if="error" class="landing-error">{{ error }}</p>

      <!-- Sign In Buttons -->
      <div class="landing-actions">
        <button
          class="btn btn-primary btn-lg landing-btn"
          :disabled="isLoading"
          @click="handleGoogleSignIn"
        >
          <span class="btn-icon">🔐</span>
          {{ isLoading ? 'Signing in...' : 'Sign in with Google' }}
        </button>

        <button
          class="btn btn-ghost landing-btn-guest"
          :disabled="isLoading"
          @click="handleGuestSignIn"
        >
          Continue as Guest
        </button>

        <p class="landing-hint">
          Guest data is stored locally on this device only
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.landing-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  background: linear-gradient(180deg, var(--lavender-50) 0%, var(--bg-primary) 100%);
}

.landing-content {
  width: 100%;
  max-width: 360px;
  text-align: center;
}

.landing-hero {
  margin-bottom: var(--space-xl);
}

.landing-vio {
  width: 120px;
  height: auto;
  margin-bottom: var(--space-md);
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.landing-logo {
  height: 40px;
  width: auto;
  margin-bottom: var(--space-sm);
}

.landing-tagline {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
}

.landing-features {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-sm);
  margin-bottom: var(--space-xl);
}

.feature-item {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-sm);
  background: var(--white);
  border-radius: var(--radius-md);
  border: 1px solid var(--lavender-100);
}

.feature-icon {
  font-size: 1rem;
}

.feature-text {
  font-size: 0.75rem;
  color: var(--text-primary);
  font-weight: 500;
}

.landing-error {
  color: var(--expense-color);
  font-size: 0.875rem;
  margin-bottom: var(--space-md);
}

.landing-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.landing-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  width: 100%;
}

.btn-icon {
  font-size: 1.25rem;
}

.landing-btn-guest {
  font-size: 0.875rem;
}

.landing-hint {
  font-size: 0.6875rem;
  color: var(--text-secondary);
  margin: var(--space-xs) 0 0;
}
</style>

<style>
/* Dark mode */
[data-theme="dark"] .landing-page {
  background: linear-gradient(180deg, #1A1625 0%, #0F0D1A 100%) !important;
}

[data-theme="dark"] .feature-item {
  background: #1A1625 !important;
  border-color: #3D3456 !important;
}
</style>
