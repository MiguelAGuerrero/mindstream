<script setup>
// The stack board: every context as its own column of cards, laid out left to
// right and scrolled horizontally. It replaces the rail's flattened list with
// the shape the model actually has — a stack you push onto and pop off.
//
// Click a column to make that context active, which swaps the board out for the
// centered prompt card. Ordering (live → parked → resolved) comes from the
// store's contextBoard getter, not from here.
//
// Emits the SAME three events as ContextRail, so the runner's existing handlers
// are reused verbatim and the two views stay swappable.
import ContextStack from "./ContextStack.vue";

const props = defineProps({
  /** Columns from the store's contextBoard getter. */
  columns: { type: Array, default: () => [] },
});

const emit = defineEmits(["switch", "new", "update-waiting-on"]);
</script>

<template>
  <section class="ctx-board">
    <!-- Deliberately NO `appear`: the board unmounts whenever a card is up, so
         every return is a fresh mount and `appear` would just fade the whole
         board in each time — it can't show a column sliding between bands
         (that needs `move`, which needs the element to survive the change). -->
    <TransitionGroup tag="div" class="ctx-board__rail" name="ctx-col">
      <ContextStack
        v-for="col in props.columns"
        :key="col.id"
        :cards="col.cards"
        :state="col.state"
        :waiting-on="col.waitingOn"
        @select="emit('switch', col.id)"
        @update-waiting-on="emit('update-waiting-on', { id: col.id, reason: $event })"
      />

      <!-- Trailing ghost column: the rail's footer button has nowhere to live
           in a horizontal scroller, so authoring sits at the end of the row. -->
      <button key="__new" type="button" class="ctx-board__new" @click="emit('new')">
        <v-icon icon="mdi-plus" size="20" />
        <span>New context</span>
      </button>
    </TransitionGroup>
  </section>
</template>

<style scoped>
.ctx-board {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  width: 100%;
}

.ctx-board__rail {
  display: flex;
  flex-direction: row;
  /* Columns size to their own depth instead of stretching to the tallest. */
  align-items: flex-start;
  gap: 12px;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  padding: 16px 12px;
  /* Both axes: a deep deck can outgrow a short widget cell too. */
  overflow: auto;
  /* Contains the absolutely-positioned leaving column during a transition. */
  position: relative;
}

.ctx-board__new {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex: 0 0 auto;
  align-self: flex-start;
  box-sizing: border-box;
  width: min(160px, 60cqw);
  padding: 18px 12px;
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.22);
  border-radius: 8px;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-family: var(--font-sans);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.12s ease, color 0.12s ease, background-color 0.12s ease;
}

.ctx-board__new:hover {
  border-color: rgba(var(--v-theme-primary), 0.65);
  background: rgba(var(--v-theme-primary), 0.06);
  color: rgb(var(--v-theme-primary));
}

.ctx-board__new:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

/* Column reorder. `move` only works if the leaving element leaves the flow,
   hence position:absolute on leave-active — otherwise survivors jump. Each
   child must also have a SINGLE root element; ContextStack's root div does. */
.ctx-col-move {
  transition: transform 0.24s ease;
}

.ctx-col-enter-active,
.ctx-col-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.ctx-col-leave-active {
  position: absolute;
}

.ctx-col-enter-from,
.ctx-col-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@media (prefers-reduced-motion: reduce) {
  .ctx-col-move,
  .ctx-col-enter-active,
  .ctx-col-leave-active {
    transition: none;
  }
}
</style>
