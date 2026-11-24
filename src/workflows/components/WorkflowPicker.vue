<script setup>
// Answering another tool's request for steps: choose a workflow and its steps
// go back (copied). Cancel sends nothing.
import { computed, ref } from "vue";
import { workflowLabel } from "../model/workflow.js";

const props = defineProps({
  request: { type: Object, required: true },
  requesterName: { type: String, default: "" },
  workflows: { type: Array, default: () => [] },
});
const emit = defineEmits(["choose", "cancel"]);

const usable = computed(() => props.workflows.filter((w) => w.steps.length));
const picked = ref(usable.value[0]?.id ?? null);
const selected = computed(() => usable.value.find((w) => w.id === picked.value) ?? null);
</script>

<template>
  <section class="wf-pick">
    <header class="wf-pick__head">
      <div class="wf-pick__for">
        <p class="wf-pick__eyebrow">PICK STEPS{{ requesterName ? ` FOR ${requesterName.toUpperCase()}` : "" }}</p>
        <h1 class="wf-pick__title">{{ request.text }}</h1>
        <p v-if="request.context.length" class="wf-pick__notes text-medium-emphasis">{{ request.context.join(' › ') }}</p>
      </div>
      <v-btn variant="text" prepend-icon="mdi-close" @click="emit('cancel')">Cancel</v-btn>
    </header>

    <p v-if="!usable.length" class="text-medium-emphasis">No workflows with steps yet.</p>

    <v-radio-group v-else v-model="picked" hide-details>
      <div v-for="wf in usable" :key="wf.id" class="wf-pick__item" :class="{ 'wf-pick__item--on': wf.id === picked }">
        <v-radio :value="wf.id">
          <template #label>
            <span class="wf-pick__name">{{ workflowLabel(wf) }}</span>
            <span class="wf-pick__count">{{ wf.steps.length }} steps</span>
          </template>
        </v-radio>
        <p v-if="wf.gap && wf.id === picked" class="wf-pick__gap">{{ wf.gap }}</p>
        <ol v-if="wf.id === picked" class="wf-pick__steps">
          <li v-for="(step, i) in wf.steps" :key="i">
            {{ step.prompt }}
            <span v-if="step.expects === 'call'" class="wf-pick__decision">
              <v-icon size="12" icon="mdi-call-split" />
              {{ step.options?.length ? step.options.join(" / ") : "decide" }}
            </span>
          </li>
        </ol>
      </div>
    </v-radio-group>

    <div class="wf-pick__actions">
      <v-spacer />
      <v-btn color="primary" variant="flat" :disabled="!selected" @click="emit('choose', selected.id)">
        Use {{ selected ? `these ${selected.steps.length}` : "" }} steps
      </v-btn>
    </div>
  </section>
</template>

<style scoped>
.wf-pick__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.wf-pick__for {
  min-width: 0;
}

.wf-pick__eyebrow {
  margin: 0 0 4px;
  font-size: 0.7rem;
  letter-spacing: 0.16em;
  font-weight: 700;
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.wf-pick__title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.wf-pick__notes {
  margin: 4px 0 0;
  font-size: 0.85rem;
}

.wf-pick__item {
  padding: 4px 8px 8px;
  border-radius: 8px;
}

.wf-pick__item--on {
  background: rgba(var(--v-theme-primary), 0.06);
}

.wf-pick__name {
  font-weight: 600;
  margin-right: 8px;
}

.wf-pick__count {
  font-size: 0.85rem;
  color: rgba(var(--v-theme-on-surface), 0.55);
}

.wf-pick__gap {
  margin: 0 0 4px 40px;
  font-size: 0.85rem;
  font-style: italic;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.wf-pick__steps {
  margin: 0 0 0 40px;
  padding-left: 1.1rem;
  font-size: 0.9rem;
}

.wf-pick__decision {
  margin-left: 6px;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.wf-pick__actions {
  display: flex;
  margin-top: 20px;
}
</style>
