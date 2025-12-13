<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: {
    type: Array,
    required: true
    // Expected: [{ name, value, color, icon }]
  },
  size: {
    type: Number,
    default: 200
  }
})

const total = computed(() => {
  return props.data.reduce((sum, item) => sum + item.value, 0)
})

const segments = computed(() => {
  if (total.value === 0) return []

  let currentAngle = 0
  return props.data
    .filter(item => item.value > 0)
    .map(item => {
      const percentage = (item.value / total.value) * 100
      const angle = (item.value / total.value) * 360
      const startAngle = currentAngle
      currentAngle += angle

      return {
        ...item,
        percentage,
        startAngle,
        endAngle: currentAngle,
      }
    })
})

// Convert polar to cartesian coordinates
function polarToCartesian(cx, cy, r, angle) {
  const rad = (angle - 90) * Math.PI / 180
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad)
  }
}

// Create SVG arc path
function createArcPath(cx, cy, r, startAngle, endAngle) {
  // Handle full circle case
  if (endAngle - startAngle >= 359.99) {
    return `
      M ${cx} ${cy - r}
      A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r}
      Z
    `
  }

  const start = polarToCartesian(cx, cy, r, startAngle)
  const end = polarToCartesian(cx, cy, r, endAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0

  return `
    M ${cx} ${cy}
    L ${start.x} ${start.y}
    A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}
    Z
  `
}
</script>

<template>
  <div class="pie-chart-container">
    <!-- Empty state -->
    <div v-if="total === 0" class="pie-empty">
      <div class="pie-empty-icon">📊</div>
      <div class="pie-empty-text">No expenses yet</div>
    </div>

    <!-- Chart -->
    <div v-else class="pie-chart-wrapper">
      <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`">
        <g v-for="(segment, index) in segments" :key="index">
          <path
            :d="createArcPath(size/2, size/2, size/2 - 4, segment.startAngle, segment.endAngle)"
            :fill="segment.color"
            stroke="white"
            stroke-width="2"
            class="pie-segment"
          />
        </g>
        <!-- Center hole for donut effect -->
        <circle
          :cx="size/2"
          :cy="size/2"
          :r="size/4"
          fill="white"
        />
      </svg>

      <!-- Legend -->
      <div class="pie-legend">
        <div
          v-for="segment in segments"
          :key="segment.name"
          class="pie-legend-item"
        >
          <span class="pie-legend-color" :style="{ background: segment.color }"></span>
          <span class="pie-legend-icon">{{ segment.icon }}</span>
          <span class="pie-legend-name">{{ segment.name }}</span>
          <span class="pie-legend-value">{{ segment.percentage.toFixed(0) }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pie-chart-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
}

.pie-chart-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
  width: 100%;
}

.pie-segment {
  transition: transform 0.2s ease;
  transform-origin: center;
}

.pie-segment:hover {
  transform: scale(1.02);
}

.pie-legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  justify-content: center;
  width: 100%;
}

.pie-legend-item {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-sm);
  background: var(--lavender-50);
  border-radius: var(--radius-full);
  font-size: 0.75rem;
}

.pie-legend-color {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.pie-legend-icon {
  font-size: 0.875rem;
}

.pie-legend-name {
  color: var(--gray-600);
}

.pie-legend-value {
  font-weight: 700;
  color: var(--gray-700);
}

.pie-empty {
  text-align: center;
  padding: var(--space-xl);
}

.pie-empty-icon {
  font-size: 2rem;
  margin-bottom: var(--space-sm);
  opacity: 0.5;
}

.pie-empty-text {
  color: var(--gray-500);
  font-size: 0.875rem;
}
</style>
