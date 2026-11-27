<script setup>
// Phones have no margin: a tapped move opens as a sheet from the bottom, and
// the arrows page through the other moves of this level.
import { computed } from "vue";
import { VBottomSheet } from "vuetify/components";
import MoveCard from "./MoveCard.vue";

const props = defineProps({
  cards: { type: Array, default: () => [] },
  activeId: { type: String, default: null },
  freshId: { type: String, default: null },
});

const emit = defineEmits(["update:activeId", "open", "answer", "link", "remove", "set-aside", "bring-back"]);

const index = computed(() => props.cards.findIndex((c) => c.id === props.activeId));
const card = computed(() => props.cards[index.value] ?? null);

function step(by) {
  const next = props.cards[index.value + by];
  if (next) emit("update:activeId", next.id);
}
</script>

<template>
  <VBottomSheet
    :model-value="!!card"
    inset
    @update:model-value="(v) => { if (!v) emit('update:activeId', null); }"
  >
    <v-card v-if="card" class="move-sheet" flat>
      <div class="move-sheet__bar">
        <button type="button" class="move-sheet__nav" aria-label="Previous move" :disabled="index <= 0" @click="step(-1)">
          <v-icon icon="mdi-chevron-left" size="20" />
        </button>
        <span class="move-sheet__count">{{ index + 1 }} of {{ cards.length }}</span>
        <button type="button" class="move-sheet__nav" aria-label="Next move" :disabled="index >= cards.length - 1" @click="step(1)">
          <v-icon icon="mdi-chevron-right" size="20" />
        </button>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" aria-label="Close" @click="emit('update:activeId', null)" />
      </div>
      <MoveCard
        :key="card.id"
        class="move-sheet__card"
        :card="card"
        :autofocus="freshId === card.id"
        @open="(id) => { emit('update:activeId', null); emit('open', id); }"
        @answer="(a) => emit('answer', a)"
        @link="(span) => { emit('update:activeId', null); emit('link', span); }"
        @remove="(id) => emit('remove', id)"
        @set-aside="(id) => emit('set-aside', id)"
        @bring-back="(id) => emit('bring-back', id)"
      />
    </v-card>
  </VBottomSheet>
</template>

<style scoped>
.move-sheet {
  max-height: 70dvh;
  overflow-y: auto;
  padding: 4px 8px calc(12px + env(safe-area-inset-bottom, 0px));
}

.move-sheet__bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-inline-start: 4px;
}

.move-sheet__nav {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.move-sheet__nav:disabled {
  opacity: 0.3;
  cursor: default;
}

.move-sheet__count {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.65);
  font-variant-numeric: tabular-nums;
}

.move-sheet__card {
  border: 0;
  font-size: 0.95rem;
}
</style>
