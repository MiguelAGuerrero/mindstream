<script setup>
// A column beside the pad, shown while another tool is waiting on a
// decomposition. Think on the pad as usual; list the steps here (list lines on
// the pad are suggested for you) and send them back. It is its own column so it
// never takes height from the pad, and renders nothing when no one is waiting.
import { computed, ref, watch } from "vue";
import { usePadStore } from "../store/padStore";
import { useDecomposeHandoff } from "../composables/useDecomposeHandoff";
import { itemsFromDraft, itemsFromPadText } from "../domain/decomposeReturn.js";

const padStore = usePadStore();
const decompose = useDecomposeHandoff();

const draft = ref("");
// Until you type in the field, it follows the list lines on the pad.
const touched = ref(false);
const padText = computed(() => padStore.currentPad?.doc?.text ?? "");

watch(
  () => decompose.open.value?.id,
  () => {
    touched.value = false;
    draft.value = itemsFromPadText(padText.value).join("\n");
  },
  { immediate: true },
);
watch(padText, (text) => {
  if (!touched.value) draft.value = itemsFromPadText(text).join("\n");
});

const count = computed(() => itemsFromDraft(draft.value).length);
const handoff = computed(() => decompose.open.value);

function onInput(event) {
  touched.value = true;
  draft.value = event.target.value;
}
function send() {
  decompose.returnSteps(draft.value);
}
</script>

<template>
  <v-col v-if="handoff" cols="12" md="auto" class="decompose-col">
    <aside class="decompose-panel" aria-label="Steps to send back to Focus">
      <header class="decompose-panel__head">
        <span class="decompose-panel__eyebrow">STEPS FOR FOCUS</span>
        <span class="decompose-panel__task" :title="handoff.task.title">{{ handoff.task.title }}</span>
        <span v-if="handoff.task.notes" class="decompose-panel__notes" :title="handoff.task.notes">
          {{ handoff.task.notes }}
        </span>
      </header>

      <label class="decompose-panel__label" for="decompose-steps">One step per line, in order</label>
      <textarea
        id="decompose-steps"
        class="decompose-panel__input"
        :value="draft"
        placeholder="1. First small step&#10;2. Next step"
        @input="onInput"
      />

      <footer class="decompose-panel__actions">
        <v-btn color="primary" variant="flat" block :disabled="!count" @click="send">
          Send {{ count || "" }} {{ count === 1 ? "step" : "steps" }} back to Focus
        </v-btn>
        <v-btn variant="text" block size="small" @click="decompose.drop()">Drop and go back</v-btn>
      </footer>
    </aside>
  </v-col>
</template>

<style scoped>
.decompose-col {
  display: flex;
  flex-direction: column;
  min-height: 0;
  /* A fixed-width side column: the pad keeps the rest of the row. */
  flex: 0 0 340px;
  width: 340px;
  max-width: 100%;
}

.decompose-panel {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  gap: 8px;
  padding: 14px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
}

.decompose-panel__head {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.decompose-panel__eyebrow {
  font-size: 0.65rem;
  letter-spacing: 0.16em;
  font-weight: 700;
  color: rgba(var(--v-theme-on-surface), 0.45);
}

.decompose-panel__task {
  font-weight: 600;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.decompose-panel__notes {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  overflow-wrap: anywhere;
}

.decompose-panel__label {
  margin-top: 6px;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.decompose-panel__input {
  flex: 1 1 auto;
  min-height: 8rem;
  resize: none;
  padding: 10px 12px;
  font: inherit;
  font-family: var(--font-sans);
  line-height: 1.5;
  color: rgb(var(--v-theme-on-surface));
  background: transparent;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
}

.decompose-panel__input:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 1px;
}

.decompose-panel__actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

@media (max-width: 959px) {
  .decompose-col {
    flex: 0 0 auto;
    width: 100%;
  }

  .decompose-panel__input {
    min-height: 10rem;
  }
}
</style>
