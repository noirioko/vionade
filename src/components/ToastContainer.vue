<script setup>
import { useToast } from '../composables/useToast'

const { toasts, dismiss } = useToast()

function getIcon(type) {
  switch (type) {
    case 'success': return '✓'
    case 'error': return '✕'
    case 'warning': return '!'
    default: return 'i'
  }
}
</script>

<template>
  <Teleport to="body">
    <TransitionGroup name="toast" tag="div" class="toast-container">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="toast.type"
        @click="dismiss(toast.id)"
      >
        <span class="toast-icon">{{ getIcon(toast.type) }}</span>
        <span class="toast-message">{{ toast.message }}</span>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: env(safe-area-inset-top, 16px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  pointer-events: none;
  max-width: 100%;
  width: 400px;
}

.toast {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-radius: 12px;
  background: white;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  pointer-events: auto;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  border: 2px solid;
}

.toast-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}

.toast-message {
  flex: 1;
  color: var(--text-primary);
}

/* Success */
.toast.success {
  border-color: #4ade80;
  background: #f0fdf4;
}

.toast.success .toast-icon {
  background: #4ade80;
}

/* Error */
.toast.error {
  border-color: #f87171;
  background: #fef2f2;
}

.toast.error .toast-icon {
  background: #f87171;
}

/* Warning */
.toast.warning {
  border-color: #fbbf24;
  background: #fffbeb;
}

.toast.warning .toast-icon {
  background: #fbbf24;
}

/* Info */
.toast.info {
  border-color: #60a5fa;
  background: #eff6ff;
}

.toast.info .toast-icon {
  background: #60a5fa;
}

/* Transitions */
.toast-enter-active {
  transition: all 0.3s ease-out;
}

.toast-leave-active {
  transition: all 0.2s ease-in;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100px);
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>

<style>
/* Dark mode */
[data-theme="dark"] .toast {
  background: #1A1625 !important;
}

[data-theme="dark"] .toast.success {
  border-color: #4ade80 !important;
  background: #1a2e1a !important;
}

[data-theme="dark"] .toast.error {
  border-color: #f87171 !important;
  background: #2e1a1a !important;
}

[data-theme="dark"] .toast.warning {
  border-color: #fbbf24 !important;
  background: #2e2a1a !important;
}

[data-theme="dark"] .toast.info {
  border-color: #60a5fa !important;
  background: #1a1a2e !important;
}
</style>
