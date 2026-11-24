<script setup>
// Write more (G4, roadmap Revision 11): the append-only way back to writing.
// The frozen draft above is never reopened. What you write here is added after
// it as new paragraphs and a new draft version when you choose "Add to draft".
// The text is saved as you type (debounced), so a reload keeps it.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { usePadStore } from "../store/padStore";

const padStore = usePadStore();
const padLocator = computed(() => padStore.surfaceHead);
const stored = computed(() => padStore.writeMoreText ?? "");

const draft = ref(stored.value);
const field = ref(null);
let timer = null;

function flush() {
  if (timer) { clearTimeout(timer); timer = null; }
  if (draft.value !== stored.value) {
    padStore.setWriteMoreText({ padLocator: padLocator.value, text: draft.value });
  }
}

watch(draft, () => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(flush, 400);
});

// Another level or a reload can change what is stored; follow it when idle.
watch(stored, (v) => { if (!timer && v !== draft.value) draft.value = v; });

const canAdd = computed(() => draft.value.trim().length > 0);

function add() {
  flush();
  padStore.addWriteMore({ padLocator: padLocator.value });
}

function cancel() {
  if (timer) { clearTimeout(timer); timer = null; }
  padStore.cancelWriteMore({ padLocator: padLocator.value });
}

onMounted(() => nextTick(() => field.value?.focus?.()));
onBeforeUnmount(flush);
</script>

<template>
  <section class="write-more" aria-label="Write more">
    <p class="write-more__label">
      <v-icon icon="mdi-pencil-plus-outline" size="14" class="mr-1" />
      Writing more · added after the draft above
    </p>
    <v-textarea
      ref="field"
      v-model="draft"
      variant="plain"
      auto-grow
      rows="3"
      hide-details
      placeholder="Write freely. Leave a blank line between separate ideas."
      class="write-more__field"
      @keydown.meta.enter.prevent="canAdd && add()"
      @keydown.ctrl.enter.prevent="canAdd && add()"
      @keydown.esc.prevent="cancel"
    />
    <div class="write-more__actions">
      <v-btn variant="text" size="small" @click="cancel">Cancel</v-btn>
      <v-btn
        color="primary"
        variant="flat"
        size="small"
        prepend-icon="mdi-plus"
        :disabled="!canAdd"
        @click="add"
      >
        Add to draft
      </v-btn>
    </div>
  </section>
</template>

<style scoped>
.write-more {
  margin-top: 12px;
  padding: 12px 20px 10px;
  border-radius: 6px;
  border: 1px dashed rgba(var(--v-theme-primary), 0.55);
  background: rgb(var(--v-theme-surface));
}

.write-more__label {
  display: flex;
  align-items: center;
  margin: 0 0 4px;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
}

.write-more__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 6px;
}
</style>
