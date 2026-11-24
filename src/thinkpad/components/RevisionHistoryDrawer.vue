<script setup>
// Revision history (roadmap Revision 34): every draft of this level, newest
// first, with the moves that made it. Tap one to read that draft (read-only);
// tap the current one to come back. A bottom sheet on phones, a side drawer
// on desktop. Opened by tapping "Draft N / M" in the pill.
import { computed } from "vue";
import { useDisplay } from "vuetify";
import { VBottomSheet, VNavigationDrawer } from "vuetify/components";
import { usePadStore } from "../store/padStore";
import { useSessionUi } from "../composables/useSessionUi";
import { formatRelativeTime } from "../utils/formatRelativeTime";

const padStore = usePadStore();
const sessionUi = useSessionUi();
const { smAndDown } = useDisplay();

const open = computed({
  get: () => sessionUi.historyOpen,
  set: (v) => { sessionUi.historyOpen = v; },
});
const entries = computed(() => padStore.revisionHistory);
const latestN = computed(() => entries.value[0]?.n ?? null);
const viewingN = computed(() => (padStore.isDraftHistoryView ? padStore.viewingDraftN : latestN.value));

function kindLabel(e) {
  if (e.kind === "first") return "First draft";
  if (e.kind === "writing") {
    const d = e.wordDelta;
    if (d > 0) return `Writing pass · +${d} word${d === 1 ? "" : "s"}`;
    if (d < 0) return `Writing pass · −${-d} word${d === -1 ? "" : "s"}`;
    return "Writing pass · edits";
  }
  const n = e.moves.length;
  return `${n} result${n === 1 ? "" : "s"} brought in`;
}

function pick(n) {
  if (n === latestN.value) padStore.exitDraftHistory();
  else padStore.navigateToDraft(n);
  open.value = false;
}
</script>

<template>
  <component
    :is="smAndDown ? VBottomSheet : VNavigationDrawer"
    v-model="open"
    v-bind="smAndDown ? { inset: true } : { location: 'right', temporary: true, width: 380 }"
  >
    <v-card class="revision-history" :class="{ 'revision-history--sheet': smAndDown }" flat>
      <div class="revision-history__head">
        <span class="text-subtitle-1 font-weight-medium">Revision history</span>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" aria-label="Close" @click="open = false" />
      </div>
      <p v-if="!entries.length" class="revision-history__empty text-body-2 text-medium-emphasis">
        No drafts yet. Switch to Reflect to make the first one.
      </p>
      <ol class="revision-history__list">
        <li v-for="e in entries" :key="e.n">
          <button
            type="button"
            class="revision-history__entry"
            :class="{ 'revision-history__entry--on': e.n === viewingN }"
            @click="pick(e.n)"
          >
            <span class="revision-history__row">
              <span class="revision-history__draft">Draft {{ e.n + 1 }}</span>
              <span v-if="e.n === latestN" class="revision-history__current">current</span>
              <v-spacer />
              <span v-if="e.at" class="text-caption text-disabled">{{ formatRelativeTime(e.at) }}</span>
            </span>
            <span class="revision-history__kind text-caption text-medium-emphasis">
              <v-icon
                :icon="e.kind === 'writing' ? 'mdi-pencil-outline' : e.kind === 'first' ? 'mdi-file-document-outline' : 'mdi-call-merge'"
                size="13"
              />
              {{ kindLabel(e) }}
            </span>
            <ul v-if="e.moves.length" class="revision-history__moves">
              <li v-for="(m, i) in e.moves" :key="i">
                <span class="revision-history__move-title">
                  {{ m.kind === "synthesis" ? "Synthesis" : `“${m.title}”` }}
                </span>
                <span class="revision-history__move-result">→ {{ m.result }}</span>
                <span v-for="(cv, j) in m.caveats" :key="j" class="revision-history__caveat">with caveat: {{ cv }}</span>
              </li>
            </ul>
          </button>
        </li>
      </ol>
    </v-card>
  </component>
</template>

<style scoped>
.revision-history {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.revision-history--sheet {
  max-height: 70dvh;
}

.revision-history__head {
  display: flex;
  align-items: center;
  padding: 10px 8px 4px 16px;
  flex-shrink: 0;
}

.revision-history__empty {
  margin: 8px 16px 16px;
}

.revision-history__list {
  list-style: none;
  margin: 0;
  padding: 0 8px calc(12px + env(safe-area-inset-bottom, 0px));
  overflow-y: auto;
  min-height: 0;
}

.revision-history__entry {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 100%;
  min-height: 48px;
  padding: 10px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.revision-history__entry:hover {
  background: rgba(var(--v-theme-on-surface), 0.05);
}

.revision-history__entry--on {
  background: rgba(var(--v-theme-primary), 0.12);
}

.revision-history__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.revision-history__draft {
  font-weight: 600;
}

.revision-history__current {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgb(var(--v-theme-primary));
}

.revision-history__kind {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.revision-history__moves {
  list-style: none;
  margin: 2px 0 0;
  padding: 0 0 0 17px;
  display: grid;
  gap: 4px;
  font-size: 0.85rem;
}

.revision-history__move-title {
  font-weight: 500;
}

.revision-history__move-result {
  display: block;
  color: rgba(var(--v-theme-on-surface), 0.75);
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.revision-history__caveat {
  display: block;
  font-size: 0.78rem;
  color: rgb(var(--v-theme-warning));
}
</style>
