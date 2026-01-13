<script setup>
import { ref, computed } from 'vue'

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

const hoveredSegment = ref(null)
const tooltipPos = ref({ x: 0, y: 0 })

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

function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function handleMouseEnter(segment, event) {
  hoveredSegment.value = segment
  updateTooltipPosition(event)
}

function handleMouseMove(event) {
  if (hoveredSegment.value) {
    updateTooltipPosition(event)
  }
}

function handleMouseLeave() {
  hoveredSegment.value = null
}

function updateTooltipPosition(event) {
  const rect = event.currentTarget.closest('.pie-chart-wrapper').getBoundingClientRect()
  tooltipPos.value = {
    x: event.clientX - rect.left + 10,
    y: event.clientY - rect.top - 40
  }
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
            :class="{ hovered: hoveredSegment?.name === segment.name }"
            @mouseenter="handleMouseEnter(segment, $event)"
            @mousemove="handleMouseMove"
            @mouseleave="handleMouseLeave"
          />
        </g>
        <!-- Center hole for donut effect -->
        <circle
          :cx="size/2"
          :cy="size/2"
          :r="size/4"
          fill="white"
          class="pie-center"
        />
      </svg>

      <!-- Tooltip -->
      <div
        v-if="hoveredSegment"
        class="pie-tooltip"
        :style="{ left: tooltipPos.x + 'px', top: tooltipPos.y + 'px' }"
      >
        <div class="tooltip-header">
          <span class="tooltip-icon">{{ hoveredSegment.icon }}</span>
          <span class="tooltip-name">{{ hoveredSegment.name }}</span>
        </div>
        <div class="tooltip-amount">{{ formatCurrency(hoveredSegment.value) }}</div>
        <div class="tooltip-percent">{{ hoveredSegment.percentage.toFixed(1) }}%</div>
      </div>

      <!-- Legend -->
      <div class="pie-legend">
        <div
          v-for="segment in segments"
          :key="segment.name"
          class="pie-legend-item"
          :class="{ hovered: hoveredSegment?.name === segment.name }"
          @mouseenter="hoveredSegment = segment"
          @mouseleave="hoveredSegment = null"
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
  position: relative;
}

.pie-segment {
  transition: transform 0.2s ease, filter 0.2s ease;
  transform-origin: center;
  cursor: pointer;
}

.pie-segment:hover,
.pie-segment.hovered {
  transform: scale(1.03);
  filter: brightness(1.1);
}

.pie-center {
  pointer-events: none;
}

/* Tooltip */
.pie-tooltip {
  position: absolute;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  pointer-events: none;
  z-index: 100;
  min-width: 120px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transform: translateX(-50%);
}

.tooltip-header {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  margin-bottom: 4px;
}

.tooltip-icon {
  font-size: 1rem;
}

.tooltip-name {
  font-weight: 600;
}

.tooltip-amount {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.875rem;
  color: #fbbf24;
}

.tooltip-percent {
  font-size: 0.6875rem;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 2px;
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
  cursor: pointer;
  transition: all 0.2s ease;
}

.pie-legend-item:hover,
.pie-legend-item.hovered {
  background: var(--lavender-100);
  transform: scale(1.05);
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

<style>
/* Dark mode */
[data-theme="dark"] .pie-center {
  fill: #1A1625 !important;
}

[data-theme="dark"] .pie-legend-item {
  background: #2D2640 !important;
}

[data-theme="dark"] .pie-legend-item:hover,
[data-theme="dark"] .pie-legend-item.hovered {
  background: #3D3456 !important;
}

[data-theme="dark"] .pie-legend-name {
  color: #A3A3A3 !important;
}

[data-theme="dark"] .pie-legend-value {
  color: #E5E5E5 !important;
}

[data-theme="dark"] .pie-tooltip {
  background: rgba(30, 27, 45, 0.95) !important;
  border: 1px solid #3D3456;
}
</style>
