<script setup>
// The open-item gate (docs/capture-templates-proposal.md §8). Lists the moves
// started at this level that haven't resolved, plus items lifted up from below,
// and asks for one decision on each before the level may resolve up:
//   address it here (go to it) · accept as room for doubt · lift it · park it.
// Already-decided items are listed with an undo.
import { computed, reactive } from "vue";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  goal: { type: String, default: "" },
  items: { type: Array, default: () => [] },
  decided: { type: Array, default: () => [] },
  liftTargets: { type: Array, default: () => [] }, // [{ locator, label }], root first
  canResolve: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue", "dispose", "clear", "go-to", "resolve"]);

const notes = reactive({});

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

const DECISION_LABELS = {
  accepted: "Accepted as room for doubt",
  lifted: "Lifted",
  parked: "Parked as its own work",
};

function decisionLabel(item) {
  const d = item.disposition ?? {};
  if (d.kind !== "lifted") return DECISION_LABELS[d.kind] ?? d.kind;
  const target = props.liftTargets.find((t) => t.locator === (d.target ?? null));
  return `Lifted to ${target?.label ?? "a level above"}`;
}

function dispose(item, kind, target = null) {
  emit("dispose", { id: item.id, kind, note: notes[item.id] ?? "", target });
  delete notes[item.id];
}
</script>

<template>
  <v-dialog v-model="open" max-width="680" scrollable>
    <v-card class="gate-card">
      <v-card-title class="d-flex align-center">
        <span>Before this resolves</span>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" aria-label="Close" @click="open = false" />
      </v-card-title>
      <v-card-subtitle class="gate-subtitle">
        Decide what to do with each open item, so nothing is lost on the way up.
      </v-card-subtitle>

      <v-card-text class="d-flex flex-column ga-4">
        <section v-if="items.length" class="d-flex flex-column ga-3" aria-label="Open items">
          <p class="text-overline text-medium-emphasis mb-0">Open · {{ items.length }}</p>
          <div v-for="item in items" :key="item.id" class="gate-item">
            <div class="d-flex align-center ga-2 flex-wrap">
              <strong class="gate-item__text">{{ item.text || "Untitled move" }}</strong>
              <v-chip v-if="item.kind === 'lifted'" size="x-small" variant="tonal" color="info">lifted from below</v-chip>
            </div>
            <p v-if="item.source && item.source !== item.text" class="gate-item__source">“{{ item.source }}”</p>
            <p class="gate-item__check">
              Would answering this change the answer to <strong>“{{ goal }}”</strong>?
            </p>
            <v-text-field
              v-model="notes[item.id]"
              label="Note (optional): the caveat, or what to carry up"
              density="compact"
              variant="outlined"
              hide-details
            />
            <div class="d-flex flex-wrap ga-2 mt-2">
              <v-btn
                v-if="item.kind === 'move' && item.threadId"
                size="small"
                variant="tonal"
                prepend-icon="mdi-arrow-down-right"
                @click="emit('go-to', item.threadId)"
              >
                Address it here
              </v-btn>
              <v-btn size="small" variant="tonal" color="warning" @click="dispose(item, 'accepted')">
                Accept as doubt
              </v-btn>
              <v-menu v-if="liftTargets.length">
                <template #activator="{ props: menuProps }">
                  <v-btn v-bind="menuProps" size="small" variant="tonal" append-icon="mdi-menu-down">Lift to…</v-btn>
                </template>
                <v-list density="compact">
                  <v-list-item
                    v-for="t in liftTargets"
                    :key="t.locator ?? 'root'"
                    :title="t.label"
                    @click="dispose(item, 'lifted', t.locator)"
                  />
                </v-list>
              </v-menu>
              <v-btn size="small" variant="tonal" @click="dispose(item, 'parked')">Park as its own work</v-btn>
            </div>
          </div>
        </section>

        <p v-else class="text-body-2 mb-0">Every open item has a decision.</p>

        <section v-if="decided.length" class="d-flex flex-column ga-2" aria-label="Decided items">
          <p class="text-overline text-medium-emphasis mb-0">Decided · {{ decided.length }}</p>
          <div v-for="item in decided" :key="item.id" class="gate-decided">
            <div class="flex-grow-1">
              <div class="text-body-2">{{ item.text || "Untitled move" }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ decisionLabel(item) }}<span v-if="item.disposition?.note"> · “{{ item.disposition.note }}”</span>
              </div>
            </div>
            <v-btn size="small" variant="text" @click="emit('clear', { id: item.id })">Undo</v-btn>
          </div>
        </section>
      </v-card-text>

      <v-card-actions class="px-6 pb-4">
        <span v-if="items.length" class="text-body-2 text-warning">{{ items.length }} still to decide</span>
        <v-spacer />
        <v-btn variant="text" @click="open = false">Keep working</v-btn>
        <v-btn color="primary" variant="flat" :disabled="!canResolve" @click="emit('resolve')">Resolve</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.gate-subtitle {
  white-space: normal;
}

.gate-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.gate-item__text {
  font-size: 0.95rem;
}

.gate-item__source {
  margin: 0;
  font-size: 0.85rem;
  font-style: italic;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.gate-item__check {
  margin: 0;
  font-size: 0.85rem;
  color: rgba(var(--v-theme-on-surface), 0.8);
}

.gate-decided {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(var(--v-theme-on-surface), 0.05);
}
</style>
