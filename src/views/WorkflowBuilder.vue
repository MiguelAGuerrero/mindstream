<script setup>
import { ref } from 'vue';
import Icon from '../components/Icon.vue';

defineProps({
  problem: { type: String, required: true },
  workflows: { type: Array, required: true },
  sessions: { type: Array, required: true },
  steps: { type: Array, required: true },
  getWorkflowById: { type: Function, required: true },
  getDurationFormatted: { type: Function, required: true },
  validateSteps: { type: Function, required: true },
});

const durationMinutes = ref(0);
const loop = ref(false);
const focusAudioEnabled = ref(true);
const nudgesEnabled = ref(true);
const nudgeIntervalMinutes = ref(20);

const emit = defineEmits(['add-step', 'remove-step', 'start-session', 'start-session-with-workflow', 'enter']);

function handleEnter(e) {
  emit('enter', e);
}

function addStep() {
  emit('add-step');
}

function removeStep(step) {
  emit('remove-step', step);
}

function startSession() {
  const durationSeconds = durationMinutes.value > 0 ? durationMinutes.value * 60 : 0;
  emit('start-session', {
    timing: { durationSeconds },
    loop: loop.value,
    audio: {
      enableBackgroundNoise: focusAudioEnabled.value,
      enableNudges: nudgesEnabled.value,
      nudgeIntervalMinutes: nudgeIntervalMinutes.value,
    },
  });
}
</script>

<template>
  <section class="workflow-builder">
    <div class="problem-title">
      <h2> {{ problem }} </h2>
      <h4 class="title">By...</h4>
    </div>
    <ol class="step-list">
      <li v-for="(step, index) in steps" :key="index" class="step-row">
        <input id="step-title" type="text" v-model="step.title" @keyup.enter="handleEnter" class="step-input"
          placeholder="Step" />
        <button class="remove-step-button" @click="removeStep(step)" type="button" aria-label="Remove step"
          v-if="steps.length > 1">
          <Icon name="close" size="16" />
        </button>
      </li>
    </ol>
    <section class="config-container">
      <h6 class="config-title">Session</h6>
      <div class="config-item">
        <label for="duration-minutes">Duration (min, 0 = no limit)</label>
        <input id="duration-minutes" type="number" min="0" v-model.number="durationMinutes" />
      </div>
      <div class="config-item">
        <label for="loop">Loop</label>
        <input id="loop" type="checkbox" v-model="loop" />
      </div>
      <div class="config-item">
        <label for="focus-audio-enabled">Background noise</label>
        <input id="focus-audio-enabled" type="checkbox" v-model="focusAudioEnabled" />
      </div>
      <div class="config-item">
        <label for="nudges-enabled">Refocus nudges</label>
        <input id="nudges-enabled" type="checkbox" v-model="nudgesEnabled" />
      </div>
      <div class="config-item">
        <label for="nudge-interval-minutes">Nudge every (min)</label>
        <input
          id="nudge-interval-minutes"
          type="number"
          min="1"
          v-model.number="nudgeIntervalMinutes"
          :disabled="!nudgesEnabled"
        />
      </div>
    </section>
  </section>
  <button @click="addStep" class="add-step-button">Add Step</button>
  <button @click="startSession" :disabled="!validateSteps()" class="start-session-button">
    Start Session
  </button>
</template>

<style scoped>

.config-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: flex-start;
}

.config-item {
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
  align-items: center;
}

.workflow-builder {
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.workflow-builder h1,
.workflow-builder h2 {
  text-align: left;
  margin: 0;
}

.workflow-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.workflow-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.workflow-info {
  flex: 1;
}

.workflow-play {
  flex-shrink: 0;
  min-width: 48px;
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.step-input {
  border: none;
  border-bottom: 1px solid var(--color-text-secondary);
  background-color: transparent;
}

.step-list {
  margin: 0;
  display: flex;
  flex-direction: column;
  width: 100%;
  justify-content: center;
  gap: 2rem;
  padding: 0;
}

.step-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1rem;
}

.add-step-button {
  background-color: var(--color-primary);
  color: var(--color-text-primary);
  width: 100%;
}

.start-session-button {
  background-color: var(--color-accent);
  color: var(--color-text-primary);
  width: 100%;
}

.start-session-button:disabled {
  background-color: var(--color-accent);
  color: var(--color-text-secondary);
  cursor: not-allowed;
  opacity: 0.5;
}

.problem-title {
  font-size: 1.5rem;
  font-weight: 500;
  margin: 0;
  color: var(--color-text-primary);
}

.problem-title h2 {
  margin: 0;
}

.problem-title h4 {
  margin: 0;
  color: var(--color-text-secondary);
}

.remove-step-button {
  background-color: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
}

.config-title {
  font-weight: 500;
  margin: 0;
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-text-secondary);
  width: 100%;
}
</style>
