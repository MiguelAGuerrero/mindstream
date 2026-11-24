<script setup>
// Steps handed back by another tool (ThinkPad's decomposition, a workflow).
// Starting them queues the whole list on the focus and begins at step 1, so no
// step is lost while you work through the others. Nothing happens until you
// choose.
defineProps({
  open: { type: Boolean, default: false },
  /** Which tool the steps came from, e.g. "ThinkPad" or "Workflows". */
  sourceName: { type: String, default: "" },
  parentFocus: { type: String, default: "" },
  /** Steps: { title, decision? }. */
  subFocuses: { type: Array, default: () => [] },
});
const emit = defineEmits(["start", "dismiss"]);
</script>

<template>
  <v-dialog :model-value="open" max-width="520" scrim="rgba(0,0,0,0.35)" persistent>
    <v-card rounded="lg">
      <v-card-title class="px-6 pt-6 pb-1">{{ sourceName ? `Steps from ${sourceName}` : "Steps returned" }}</v-card-title>
      <v-card-subtitle class="px-6 pb-0 text-wrap">For: {{ parentFocus }}</v-card-subtitle>
      <v-card-text class="px-6 py-3">
        <ol class="return-steps">
          <li v-for="(step, i) in subFocuses" :key="i">
            {{ step.title }}
            <span v-if="step.decision" class="return-steps__decision">
              <v-icon size="13" icon="mdi-call-split" />
              {{ step.decision.options.length ? step.decision.options.join(" / ") : "decide" }}
            </span>
          </li>
        </ol>
      </v-card-text>
      <v-card-actions class="px-6 pb-5">
        <v-spacer />
        <v-btn variant="text" @click="emit('dismiss')">Discard</v-btn>
        <v-btn color="primary" variant="flat" :disabled="!subFocuses.length" @click="emit('start', subFocuses)">
          Start {{ subFocuses.length }} {{ subFocuses.length === 1 ? "step" : "steps" }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.return-steps {
  margin: 0;
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.return-steps__decision {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: 6px;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
</style>
