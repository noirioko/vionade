<script setup>
import { ref } from 'vue'

defineProps({
  text: {
    type: String,
    required: true
  }
})

const showTip = ref(false)
</script>

<template>
  <span class="help-tip-wrapper">
    <button class="help-tip-btn" @click="showTip = !showTip">?</button>
    <div v-if="showTip" class="help-tip-popup" @click="showTip = false">
      <div class="help-tip-content">
        <span class="help-tip-close">tap to close</span>
        {{ text }}
      </div>
    </div>
  </span>
</template>

<style scoped>
.help-tip-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  margin-left: var(--space-xs);
}

.help-tip-btn {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1.5px solid var(--lavender-400);
  background: transparent;
  color: var(--lavender-500);
  font-size: 0.625rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.help-tip-btn:hover {
  background: var(--lavender-100);
}

.help-tip-popup {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-lg);
}

.help-tip-content {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  max-width: 300px;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--text-primary);
  box-shadow: var(--shadow-lg);
  text-align: center;
}

.help-tip-close {
  display: block;
  font-size: 0.625rem;
  color: var(--text-secondary);
  margin-bottom: var(--space-sm);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
</style>
