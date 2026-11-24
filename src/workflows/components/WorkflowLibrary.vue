<script setup>
// The library: every saved workflow as a card. Workflows only, never runs.
import { workflowLabel } from "../model/workflow.js";

defineProps({
  workflows: { type: Array, default: () => [] },
});
const emit = defineEmits(["open", "new"]);
</script>

<template>
  <section>
    <header class="wf-lib__head">
      <div>
        <h1 class="wf-lib__title">Workflows</h1>
        <p class="wf-lib__sub text-medium-emphasis">
          Saved steps you can reuse. Using a workflow copies its steps, so editing it later never changes a run already started.
        </p>
      </div>
      <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" @click="emit('new')">New workflow</v-btn>
    </header>

    <p v-if="!workflows.length" class="text-medium-emphasis">No workflows yet.</p>

    <v-row v-else density="comfortable">
      <v-col v-for="wf in workflows" :key="wf.id" cols="12" sm="6">
        <v-card class="h-100" rounded="lg" variant="outlined" hover @click="emit('open', wf.id)">
          <v-card-item>
            <v-card-title class="text-wrap">{{ workflowLabel(wf) }}</v-card-title>
            <v-card-subtitle>
              {{ wf.steps.length }} {{ wf.steps.length === 1 ? "step" : "steps" }}
              <template v-if="wf.uses"> · used {{ wf.uses }}×</template>
            </v-card-subtitle>
          </v-card-item>
          <v-card-text>
            <p v-if="wf.gap" class="wf-lib__gap">{{ wf.gap }}</p>
            <ol class="wf-lib__steps">
              <li v-for="(step, i) in wf.steps.slice(0, 3)" :key="i">
                {{ step.prompt }}
                <v-icon v-if="step.expects === 'call'" size="12" icon="mdi-call-split" />
              </li>
            </ol>
            <p v-if="wf.steps.length > 3" class="wf-lib__more">+ {{ wf.steps.length - 3 }} more</p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </section>
</template>

<style scoped>
.wf-lib__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.wf-lib__title {
  margin: 0 0 4px;
  font-size: 1.5rem;
  font-weight: 600;
}

.wf-lib__sub {
  margin: 0;
  max-width: 34rem;
  font-size: 0.9rem;
}

.wf-lib__gap {
  margin: 0 0 8px;
  font-size: 0.85rem;
  font-style: italic;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.wf-lib__steps {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.85rem;
  color: rgba(var(--v-theme-on-surface), 0.75);
}

.wf-lib__steps li {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wf-lib__more {
  margin: 4px 0 0;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.5);
}
</style>
