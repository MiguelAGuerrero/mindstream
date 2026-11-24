<script setup>
// The library: every saved workflow, compact by default. Each row is a title
// and a one-line subtitle (what it is for); "See more" expands the details
// (step count, uses, every step) in place. Workflows only, never runs.
import { reactive } from "vue";
import { workflowLabel } from "../model/workflow.js";

defineProps({
  workflows: { type: Array, default: () => [] },
});
const emit = defineEmits(["open", "new"]);

const expanded = reactive(new Set());
function toggle(id) {
  if (expanded.has(id)) expanded.delete(id);
  else expanded.add(id);
}

const stepCount = (wf) => `${wf.steps.length} ${wf.steps.length === 1 ? "step" : "steps"}`;
</script>

<template>
  <section>
    <header class="wf-lib__head">
      <div class="wf-lib__head-text">
        <h1 class="wf-lib__title">Workflows</h1>
        <p class="wf-lib__sub text-medium-emphasis">Reusable steps. Using one copies them.</p>
      </div>
      <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" @click="emit('new')">New</v-btn>
    </header>

    <p v-if="!workflows.length" class="text-medium-emphasis">No workflows yet.</p>

    <ul v-else class="wf-lib__list">
      <li v-for="wf in workflows" :key="wf.id" class="wf-lib__item">
        <button type="button" class="wf-lib__row" @click="emit('open', wf.id)">
          <span class="wf-lib__name">{{ workflowLabel(wf) }}</span>
          <span class="wf-lib__what">{{ wf.gap || stepCount(wf) }}</span>
        </button>
        <button
          type="button"
          class="wf-lib__toggle"
          :aria-expanded="expanded.has(wf.id)"
          @click="toggle(wf.id)"
        >
          {{ expanded.has(wf.id) ? "See less" : "See more" }}
        </button>
        <div v-if="expanded.has(wf.id)" class="wf-lib__details">
          <p class="wf-lib__meta">
            {{ stepCount(wf) }}<template v-if="wf.uses"> · used {{ wf.uses }}×</template>
          </p>
          <ol class="wf-lib__steps">
            <li v-for="(step, i) in wf.steps" :key="i">
              {{ step.prompt }}
              <v-icon v-if="step.expects === 'call'" size="12" icon="mdi-call-split" title="A decision step" />
            </li>
          </ol>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.wf-lib__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.wf-lib__head-text {
  min-width: 0;
}

.wf-lib__title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 600;
}

.wf-lib__sub {
  margin: 0;
  font-size: 0.85rem;
}

.wf-lib__list {
  list-style: none;
  margin: 0;
  padding: 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.wf-lib__item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 8px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.wf-lib__row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  min-height: 52px;
  padding: 8px 4px;
  border: none;
  background: none;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.wf-lib__row:hover .wf-lib__name {
  color: rgb(var(--v-theme-primary));
}

.wf-lib__name {
  font-size: 0.95rem;
  font-weight: 600;
}

.wf-lib__what {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.wf-lib__toggle {
  min-height: 40px;
  padding: 0 8px;
  border: none;
  background: none;
  color: rgb(var(--v-theme-primary));
  font-size: 0.78rem;
  cursor: pointer;
}

.wf-lib__details {
  grid-column: 1 / -1;
  padding: 0 4px 10px;
}

.wf-lib__meta {
  margin: 0 0 4px;
  font-size: 0.78rem;
  color: rgba(var(--v-theme-on-surface), 0.55);
}

.wf-lib__steps {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.85rem;
  color: rgba(var(--v-theme-on-surface), 0.8);
}
</style>
