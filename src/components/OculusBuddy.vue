<script setup>
/**
 * Oculus buddy: One big circle, one small circle, a bisecting line through the
 * center; the top half crops the fill. Supports a state machine for different
 * animations and shapes (e.g. idle = float, active = orbiter spinner).
 */
const props = defineProps({
  width: { type: [Number, String], default: 200 },
  height: { type: [Number, String], default: 120 },
  /** State: 'idle' = gentle float; 'active' = spinner with orbiting circle */
  state: { type: String, default: 'idle' },
  /** Gap in px between body edge and orbiter; increase to orbit farther out */
  orbitClearance: { type: Number, default: 4 },
})

const viewBox = '0 0 200 120'
const cx = 100
const cy = 60
const eyeRadius = 45
const pupilRadius = 16
const orbiterRadius = 7
const orbitRadius = eyeRadius + props.orbitClearance + orbiterRadius

// Top-half crop: fill only above the bisecting line (arc on top, flat chord at cy)
function topHalfCirclePath(centerX, centerY, r) {
  return `M ${centerX - r} ${centerY} A ${r} ${r} 0 0 0 ${centerX + r} ${centerY} L ${centerX - r} ${centerY} Z`
}

const eyePath = topHalfCirclePath(cx, cy, eyeRadius)
const pupilPath = topHalfCirclePath(cx, cy, pupilRadius)

const isActive = () => props.state === 'active'
</script>

<template>
  <svg
    class="oculus-buddy"
    :class="[`oculus-buddy--${state}`]"
    :width="width"
    :height="height"
    :viewBox="viewBox"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <!-- One eye: top half of big circle, dark off-white stroke on boundary -->
    <path
      :d="eyePath"
      class="eye"
      fill="currentColor"
      stroke="#2d2d2a"
      stroke-width="2"
    />
    <!-- One pupil: top half of small circle, black fill -->
    <path
      :d="pupilPath"
      class="pupil"
      fill="black"
    />
    <!-- Active state: small circle orbits the center (spinner) -->
    <g
      v-if="isActive()"
      :transform="`translate(${cx}, ${cy})`"
    >
      <g class="orbiter-group">
        <circle
          class="orbiter"
          :r="orbiterRadius"
          :cx="orbitRadius"
          cy="0"
          fill="white"
        />
      </g>
    </g>
  </svg>
</template>

<style scoped>
@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

@keyframes orbit {
  to {
    transform: rotate(360deg);
  }
}

.oculus-buddy {
  display: block;
  color: white;
}

.oculus-buddy--idle {
  animation: float 4s ease-in-out infinite;
}

.oculus-buddy--active .orbiter-group {
  animation: orbit 2.5s linear infinite;
  transform-origin: 0 0;
}

.eye {
  opacity: 0.9;
}

.pupil {
  stroke-linejoin: round;
}
</style>
