<script setup>
// The study beat (G7; stream-reflect-lifecycle.md §3, batch-reflection-research.md):
// after Next Draft, read the new version as a whole and ask whether the gap to
// the goal narrowed. The app asks; it never answers. What changed is shown
// as before → after so the moment the mess was replaced is visible. Skippable.
import { ref } from "vue";
import { usePadStore } from "../store/padStore";

defineProps({
  goal: { type: String, default: "" },
});

const padStore = usePadStore();
const showChanges = ref(true);
</script>

<template>
  <section v-if="padStore.studyBeat" class="study-beat" aria-label="Read the new draft">
    <div class="study-beat__head">
      <p class="study-beat__label">
        <v-icon icon="mdi-book-open-variant" size="14" class="mr-1" />
        Draft {{ padStore.studyBeat.n + 1 }} · read it as a whole
      </p>
      <v-btn size="x-small" variant="text" @click="padStore.dismissStudyBeat()">Done</v-btn>
    </div>
    <p class="study-beat__question">
      <template v-if="goal">Did the gap to “{{ goal }}” narrow?</template>
      <template v-else>What is this draft saying now? Did the gap narrow?</template>
    </p>
    <button
      v-if="padStore.studyBeat.changes.length"
      type="button"
      class="study-beat__toggle"
      @click="showChanges = !showChanges"
    >
      <v-icon :icon="showChanges ? 'mdi-chevron-down' : 'mdi-chevron-right'" size="14" />
      What changed ({{ padStore.studyBeat.changes.length }})
    </button>
    <ul v-if="showChanges" class="study-beat__changes">
      <li v-for="(c, i) in padStore.studyBeat.changes" :key="i">
        <span class="study-beat__before">{{ c.source }}</span>
        <v-icon icon="mdi-arrow-right" size="13" class="mx-1" />
        <span class="study-beat__after">{{ c.output }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.study-beat {
  margin-top: 12px;
  padding: 10px 20px 12px;
  border-radius: 6px;
  border: 1px solid rgba(var(--v-theme-primary), 0.35);
  background: rgb(var(--v-theme-surface));
}

.study-beat__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.study-beat__label {
  display: flex;
  align-items: center;
  margin: 0;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
}

.study-beat__question {
  margin: 6px 0 8px;
  font-size: 0.95rem;
}

.study-beat__toggle {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 0;
  border: none;
  background: none;
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-size: 0.78rem;
  cursor: pointer;
}

.study-beat__changes {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
  display: grid;
  gap: 4px;
  font-size: 0.85rem;
}

.study-beat__before {
  text-decoration: line-through;
  opacity: 0.6;
}

.study-beat__after {
  font-weight: 500;
}

/* Mobile-first: comfortable tap targets on phones (Revision 14). */
@media (max-width: 600px) {
  .study-beat__toggle,
  .study-beat__head :deep(.v-btn) {
    min-height: 40px;
  }
}
</style>
