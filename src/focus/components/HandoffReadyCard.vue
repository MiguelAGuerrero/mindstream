<script setup>
// "Ready to start" screen for a task handed to Focus. The task is prefilled;
// the user chooses to begin (the timer never auto-starts).
defineProps({
  title: { type: String, default: "" },
  notes: { type: String, default: "" },
  /** Steps that come with the task (e.g. from a workflow); they become its plan. */
  stepCount: { type: Number, default: 0 },
});
const emit = defineEmits(["start", "dismiss"]);
</script>

<template>
  <div class="handoff-ready">
    <p class="handoff-ready__eyebrow">READY TO START</p>
    <h2 class="handoff-ready__title">{{ title }}</h2>
    <p v-if="notes" class="handoff-ready__notes text-medium-emphasis text-truncate">{{ notes }}</p>
    <p v-if="stepCount" class="handoff-ready__notes text-medium-emphasis">
      Starts with {{ stepCount }} {{ stepCount === 1 ? "step" : "steps" }}
    </p>
    <v-btn color="primary" size="large" variant="flat" class="handoff-ready__go" @click="emit('start')">
      Start focus
    </v-btn>
    <v-btn variant="text" class="mt-2" @click="emit('dismiss')">Not now</v-btn>
  </div>
</template>

<style scoped>
.handoff-ready {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 520px;
  margin: auto;
  padding: 24px;
  text-align: center;
}
.handoff-ready__eyebrow {
  font-size: 0.75rem;
  letter-spacing: 0.18em;
  font-weight: 700;
  margin: 0 0 0.5rem;
  color: rgba(var(--v-theme-on-surface), 0.45);
}
.handoff-ready__title {
  font-size: clamp(1.5rem, 4vw, 2.25rem);
  font-weight: 600;
  line-height: 1.25;
  margin: 0 0 0.75rem;
  color: rgb(var(--v-theme-on-surface));
}
.handoff-ready__notes {
  max-width: 100%;
  margin: 0 0 1.5rem;
  font-size: 0.95rem;
}
.handoff-ready__go {
  align-self: stretch;
}
</style>
