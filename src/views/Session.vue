<script setup>
import Icon from '../components/Icon.vue';

defineProps({
  stepPosition: { type: Number, required: true },
  stepsLength: { type: Number, required: true },
  stepTitle: { type: String, default: '' },
  timerFormatted: { type: String, default: '0:00' },
});

const emit = defineEmits(['prev', 'next', 'stop']);

const actionButtons = [
  { label: 'Previous', icon: 'chevron-left', order: 0, event: 'prev' },
  { label: 'Next', icon: 'chevron-right', order: 2, event: 'next' },
  { label: 'Stop', icon: 'stop', order: 1, event: 'stop' },
];

</script>

<template>
  <div class="session-card">
    <div class="session-card__content">
      <p class="session-step-position" aria-live="polite">
        Step {{ stepPosition }} of {{ stepsLength }}
      </p>
      <h2 class="session-prompt">{{ stepTitle }}</h2>
      <p class="session-timer" aria-live="polite">{{ timerFormatted }}</p>
    </div>
    <div class="step-buttons">
      <button
        v-for="btn in actionButtons.sort((a, b) => a.order - b.order)"
        :key="btn.label"
        type="button"
        class="step-button"
        :aria-label="btn.label"
        @click="emit(btn.event)"
      >
        <Icon :name="btn.icon" size="24px" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.session-card {
  display: flex;
  flex-direction: column;
  min-height: 0;
  max-width: 440px;
  max-height: 90vh;
  margin: auto;
  padding: 2rem;
  background-color: var(--color-primary);
  border-radius: 1rem;
}

.session-card__content {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding-bottom: 1rem;
}

.session-prompt {
  flex: 0 0 auto;
  font-size: clamp(1rem, 5vw, 2.5rem);
  line-height: 1.3;
  margin: 0 0 0.5rem;
  color: var(--color-text-primary);
}

.session-step-position {
  flex: 0 0 auto;
  font-size: 0.875rem;
  margin: 0 0 0.25rem;
  color: var(--color-text-secondary);
}

.session-timer {
  flex: 0 0 auto;
  font-size: 1rem;
  margin: 0;
  color: var(--color-text-secondary);
}

.step-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin-top: auto;
  flex-shrink: 0;
  min-height: 48px;
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.step-button {
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
