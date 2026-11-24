<script setup>
// Edit one workflow. Saves as you type. Any step can be marked as a call (a
// decision): running it then finishes by choosing an output (one of its
// options, or a short answer when it has none) instead of a plain Resolve.
import { ref, watch } from "vue";
import { MAX_OPTIONS, MAX_STEPS } from "../../handoff/steps.js";
import { workflowLabel } from "../model/workflow.js";

const props = defineProps({
  workflow: { type: Object, required: true },
  canRun: { type: Boolean, default: false },
});
const emit = defineEmits(["update", "back", "delete", "run"]);

let key = 0;
function toRow(step) {
  return {
    key: key++,
    prompt: step.prompt ?? "",
    // Kept as-is; the editor does not offer "action" steps yet.
    produces: step.produces ?? "text",
    isDecision: step.expects === "call",
    options: [...(step.options ?? [])],
  };
}

// A local draft, so a blank row you just added does not vanish when the saved
// (cleaned) version comes back. Reset only when another workflow is opened,
// which remounts this component (keyed in the page).
const label = ref(props.workflow.label);
const gap = ref(props.workflow.gap);
const rows = ref(props.workflow.steps.map(toRow));
if (!rows.value.length) rows.value.push(toRow({ prompt: "" }));

function toSteps() {
  return rows.value.map((r) => ({
    prompt: r.prompt,
    produces: r.produces,
    ...(r.isDecision ? { expects: "call", options: r.options } : {}),
  }));
}

let timer = null;
watch(
  [label, gap, rows],
  () => {
    clearTimeout(timer);
    timer = setTimeout(() => emit("update", { label: label.value, gap: gap.value, steps: toSteps() }), 300);
  },
  { deep: true },
);

function addStep(at = rows.value.length) {
  if (rows.value.length >= MAX_STEPS) return;
  rows.value.splice(at, 0, toRow({ prompt: "" }));
}
function removeStep(i) {
  rows.value.splice(i, 1);
  if (!rows.value.length) addStep();
}
function move(i, delta) {
  const j = i + delta;
  if (j < 0 || j >= rows.value.length) return;
  const [row] = rows.value.splice(i, 1);
  rows.value.splice(j, 0, row);
}
function toggleDecision(row) {
  row.isDecision = !row.isDecision;
}
// Pasting several lines into a step makes one step per line.
function onPaste(i, event) {
  const text = event.clipboardData?.getData("text") ?? "";
  const lines = text.split(/\r?\n/).map((l) => l.replace(/^\s*(?:\d+[.)]|[-*•])\s+/, "").trim()).filter(Boolean);
  if (lines.length < 2) return;
  event.preventDefault();
  const room = MAX_STEPS - rows.value.length + 1;
  const [first, ...rest] = lines.slice(0, Math.max(room, 1));
  rows.value[i].prompt = rows.value[i].prompt ? `${rows.value[i].prompt} ${first}` : first;
  rows.value.splice(i + 1, 0, ...rest.map((prompt) => toRow({ prompt })));
}

const confirmDelete = ref(false);
const hasSteps = () => rows.value.some((r) => r.prompt.trim());
</script>

<template>
  <section class="wf-edit">
    <v-btn variant="text" prepend-icon="mdi-arrow-left" class="mb-4 px-1" @click="emit('back')">Workflows</v-btn>

    <v-text-field v-model="label" label="Name" placeholder="Untitled workflow" variant="outlined" class="mb-2" />
    <v-text-field
      v-model="gap"
      label="Closes the gap when… (optional)"
      placeholder="A bug report I don't know how to approach yet"
      variant="outlined"
      class="mb-4"
    />

    <p class="wf-edit__label">STEPS</p>
    <ol class="wf-edit__steps">
      <li v-for="(row, i) in rows" :key="row.key" class="wf-edit__row">
        <div class="wf-edit__line">
          <span class="wf-edit__num">{{ i + 1 }}</span>
          <v-text-field
            v-model="row.prompt"
            :placeholder="i === 0 ? 'First step (paste a list to add several)' : 'Step'"
            variant="outlined"
            density="compact"
            hide-details
            class="wf-edit__title"
            @paste="onPaste(i, $event)"
            @keydown.enter.prevent="addStep(i + 1)"
          />
          <v-btn
            icon="mdi-call-split"
            :variant="row.isDecision ? 'tonal' : 'text'"
            :color="row.isDecision ? 'primary' : undefined"
            size="small"
            :aria-pressed="row.isDecision"
            :title="row.isDecision ? 'Decision step (click to make it a plain step)' : 'Make this a decision step'"
            @click="toggleDecision(row)"
          />
          <v-btn icon="mdi-chevron-up" variant="text" size="small" :disabled="i === 0" aria-label="Move up" @click="move(i, -1)" />
          <v-btn
            icon="mdi-chevron-down"
            variant="text"
            size="small"
            :disabled="i === rows.length - 1"
            aria-label="Move down"
            @click="move(i, 1)"
          />
          <v-btn icon="mdi-close" variant="text" size="small" aria-label="Remove step" @click="removeStep(i)" />
        </div>
        <div v-if="row.isDecision" class="wf-edit__decision">
          <v-combobox
            v-model="row.options"
            label="Outputs to choose from (Enter to add; leave empty for a short answer)"
            multiple
            chips
            closable-chips
            :delimiters="[',']"
            :counter="MAX_OPTIONS"
            variant="outlined"
            density="compact"
            hide-details
          />
        </div>
      </li>
    </ol>
    <v-btn variant="text" prepend-icon="mdi-plus" :disabled="rows.length >= MAX_STEPS" @click="addStep()">
      Add step
    </v-btn>

    <div class="wf-edit__actions">
      <v-btn variant="text" color="error" @click="confirmDelete = true">Delete</v-btn>
      <v-spacer />
      <v-btn
        v-if="canRun"
        color="primary"
        variant="flat"
        append-icon="mdi-play"
        :disabled="!hasSteps()"
        @click="emit('run')"
      >
        Run as new context
      </v-btn>
    </div>

    <v-dialog v-model="confirmDelete" max-width="420">
      <v-card rounded="lg">
        <v-card-title class="px-6 pt-6">Delete "{{ workflowLabel(workflow) }}"?</v-card-title>
        <v-card-text class="px-6">Work already started from it keeps its steps.</v-card-text>
        <v-card-actions class="px-6 pb-5">
          <v-spacer />
          <v-btn variant="text" @click="confirmDelete = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="emit('delete')">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>

<style scoped>
.wf-edit__label {
  margin: 0 0 6px;
  font-size: 0.7rem;
  letter-spacing: 0.16em;
  font-weight: 700;
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.wf-edit__steps {
  margin: 0 0 4px;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.wf-edit__line {
  display: flex;
  align-items: center;
  gap: 4px;
}

.wf-edit__num {
  flex: 0 0 1.5rem;
  text-align: right;
  margin-right: 6px;
  font-size: 0.85rem;
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.wf-edit__title {
  flex: 1 1 auto;
}

.wf-edit__decision {
  margin: 6px 0 0 calc(1.5rem + 10px);
}

.wf-edit__actions {
  display: flex;
  align-items: center;
  margin-top: 24px;
}
</style>
