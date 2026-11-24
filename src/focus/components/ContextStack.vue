<script setup>
// One column of the board: a context's frame stack drawn as a physical deck.
// Cards run root (top) → active subproblem (bottom), so the deck grows downward
// as you decompose and the BOTTOM card is always the thing you're on.
//
// Parents collapse to a uniform peeking strip and only the bottom card renders
// full. Peeking is driven by the card's own `isActive` flag rather than a
// :not(:last-child) selector, so a depth-1 context — where the root IS the
// active frame — needs no special case.
//
// Presentational only: props in, events out. The board attaches the context id
// when it re-emits, so this component never learns the store's payload shape.

const props = defineProps({
  /** Frames root→active, from the store's contextBoard getter. */
  cards: { type: Array, default: () => [] },
  /** "live" | "parked" | "resolved" — drives the tint and the status icon. */
  state: { type: String, default: "live" },
  waitingOn: { type: String, default: "" },
});

const emit = defineEmits(["select", "update-waiting-on"]);

// At most one status icon, in the active card's header slot. A live context
// shows none; the rail uses the same two icons for the same two states.
const STATUS = {
  resolved: { icon: "mdi-check-circle", label: "Completed" },
  parked: { icon: "mdi-pause-circle", label: "Stopped" },
};
</script>

<template>
  <div class="ctx-stack" :class="`ctx-stack--${props.state}`">
    <!-- The button wraps ONLY the deck. The reason field below is a sibling,
         never a descendant: nesting a text field inside a button is invalid
         and needs @click.stop to behave. -->
    <button type="button" class="ctx-stack__deck" @click="emit('select')">
      <div class="ctx-stack__deck-inner">
        <div
          v-for="card in props.cards"
          :key="card.id"
          class="ctx-stack__card"
          :class="card.isActive ? 'ctx-stack__card--active' : 'ctx-stack__card--peek'"
        >
          <div class="ctx-stack__card-head">
            <!-- The icon is decorative: v-icon renders aria-hidden unless it
                 has a click handler, so an aria-label on it would never reach
                 assistive tech. The visually-hidden span carries the status. -->
            <template v-if="card.isActive && STATUS[props.state]">
              <v-icon size="15" :icon="STATUS[props.state].icon" class="ctx-stack__status" />
              <span class="ctx-stack__sr">{{ STATUS[props.state].label }}</span>
            </template>
            <span class="ctx-stack__card-title" :title="card.title">{{ card.title }}</span>
            <!-- A parent that already folded a takeaway up into itself. -->
            <v-icon
              v-if="!card.isActive && card.result"
              size="13"
              icon="mdi-check"
              class="ctx-stack__card-mark"
            />
          </div>
          <p v-if="card.isActive && card.result" class="ctx-stack__card-result">
            <v-icon size="14" icon="mdi-subdirectory-arrow-right" class="mr-1" />{{ card.result }}
          </p>
        </div>
      </div>
    </button>

    <div v-if="props.state === 'parked'" class="ctx-stack__waiting">
      <v-text-field
        :model-value="props.waitingOn"
        label="Reason (optional)"
        variant="outlined"
        density="compact"
        hide-details
        @update:model-value="emit('update-waiting-on', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
/* Every measurement is a token so the deck can be retuned in one place. */
.ctx-stack {
  --ctx-stack-width: 248px;
  --ctx-stack-peek: 32px;
  --ctx-stack-overlap: 6px;
  --ctx-stack-rule: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));

  display: flex;
  flex-direction: column;
  /* Short decks must NOT stretch to the tallest column — a stack that grew to
     fill the row would lose the "this one is deeper" read. */
  align-self: flex-start;
  flex: 0 0 auto;
  /* cqw resolves against the widget-shell body or the route shell, so a narrow
     dashboard cell shrinks the column instead of clipping it. */
  width: min(var(--ctx-stack-width), 88cqw);
  min-width: 0;
  box-sizing: border-box;
}

.ctx-stack--parked {
  opacity: 0.7;
}

.ctx-stack--resolved {
  opacity: 0.75;
}

.ctx-stack__deck {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.ctx-stack__deck:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
  border-radius: 10px;
}

/* Positioned so a leaving card can go absolute without escaping the column. */
.ctx-stack__deck-inner {
  position: relative;
  display: flex;
  flex-direction: column;
}

.ctx-stack__card {
  /* Later siblings paint over earlier ones — that IS the shingle, no z-index. */
  position: relative;
  flex: 0 0 auto;
  min-width: 0;
  box-sizing: border-box;
  padding: 6px 10px;
  border: var(--ctx-stack-rule);
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  transition: border-color 0.12s ease, background-color 0.12s ease;
}

/* PEEK — a parent, collapsed to exactly its title line. Fixed height, not
   max-height: a one-word title and a long one must produce the IDENTICAL
   strip, and that uniformity is what reads as a stack of sheets. */
.ctx-stack__card--peek {
  height: var(--ctx-stack-peek);
  overflow: hidden;
  margin-bottom: calc(-1 * var(--ctx-stack-overlap));
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  background: rgba(var(--v-theme-on-surface), 0.05);
  box-shadow: inset 0 -6px 8px -8px rgba(0, 0, 0, 0.55);
}

/* ACTIVE — the bottom sheet is the real card. At depth 1 this is the ONLY
   card, and nothing above it needs to change. */
.ctx-stack__card--active {
  padding: 12px 12px 14px;
  border-color: rgba(var(--v-theme-primary), 0.55);
  border-top: 3px solid rgb(var(--v-theme-primary));
}

.ctx-stack--resolved .ctx-stack__card--active {
  border-top-color: rgb(var(--v-theme-success));
  border-color: rgba(var(--v-theme-success), 0.45);
}

.ctx-stack--parked .ctx-stack__card--active {
  border-top-color: rgba(var(--v-theme-on-surface), 0.45);
  border-color: rgba(var(--v-theme-on-surface), 0.2);
}

.ctx-stack__deck:hover .ctx-stack__card {
  border-color: rgba(var(--v-theme-primary), 0.75);
}

.ctx-stack__card-head {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.ctx-stack__card--peek .ctx-stack__card-head {
  height: 100%;
}

.ctx-stack__status {
  flex-shrink: 0;
  color: rgba(var(--v-theme-on-surface), 0.55);
}

/* Status text for screen readers only — the icon beside it is aria-hidden. */
.ctx-stack__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

.ctx-stack--resolved .ctx-stack__status {
  color: rgb(var(--v-theme-success));
}

.ctx-stack__card-title {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1.35;
  color: rgb(var(--v-theme-on-surface));
  /* Peeks stay exactly one line — the strip has no room for a second. */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ctx-stack__card--peek .ctx-stack__card-title {
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.62);
}

.ctx-stack__card--active .ctx-stack__card-title {
  font-size: 0.95rem;
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
}

.ctx-stack__card-mark {
  flex-shrink: 0;
  color: rgba(var(--v-theme-primary), 0.75);
}

.ctx-stack__card-result {
  display: flex;
  align-items: flex-start;
  margin: 6px 0 0;
  font-size: 0.78rem;
  line-height: 1.35;
  color: rgb(var(--v-theme-primary));
}

.ctx-stack__waiting {
  margin-top: 8px;
}
</style>
