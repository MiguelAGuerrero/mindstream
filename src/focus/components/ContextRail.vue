<script setup>
// Left rail of isolated contexts. Each is its own problem (a drillable focus
// stack); click one to switch to it. Stopped contexts show an editable optional
// reason. Presentational only: props in, events out.
import { computed } from "vue";

const props = defineProps({
  contexts: { type: Array, default: () => [] },
});
const emit = defineEmits(["switch", "new", "update-waiting-on"]);

// Each card surfaces at most one status icon in a fixed header slot. Completed
// and paused are the states worth flagging at a glance; an in-progress context
// shows none. Completed is terminal, so it wins if both flags are ever set.
const STATUS = {
  resolved: { icon: "mdi-check-circle", tone: "success" },
  parked: { icon: "mdi-pause-circle", tone: "muted" },
};

const cards = computed(() =>
  props.contexts.map((c) => ({
    ...c,
    status: c.resolved ? STATUS.resolved : c.parked ? STATUS.parked : null,
  })),
);
</script>

<template>
  <aside class="ctx-rail">
    <header class="ctx-rail__head">
      <span class="ctx-rail__title">Contexts</span>
    </header>

    <div class="ctx-rail__list">
      <button
        v-for="c in cards"
        :key="c.id"
        type="button"
        class="ctx-card"
        :class="{ 'ctx-card--active': c.isActive, 'ctx-card--parked': c.parked, 'ctx-card--resolved': c.resolved }"
        @click="emit('switch', c.id)"
      >
        <div class="ctx-card__header">
          <div class="ctx-card__problem">{{ c.problem }}</div>
          <v-icon
            v-if="c.status"
            size="15"
            :icon="c.status.icon"
            class="ctx-card__status"
            :class="`ctx-card__status--${c.status.tone}`"
          />
        </div>
        <div v-if="!c.resolved && c.depth > 1" class="ctx-card__current">↳ {{ c.current }}</div>
        <div v-if="c.resolved && c.result" class="ctx-card__result">{{ c.result }}</div>
        <div v-if="c.parked" class="ctx-card__stopped" @click.stop>
          <v-text-field
            :model-value="c.waitingOn"
            label="Reason (optional)"
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="emit('update-waiting-on', { id: c.id, reason: $event })"
          />
        </div>
      </button>
    </div>

    <footer class="ctx-rail__foot">
      <button type="button" class="ctx-rail__new" @click="emit('new')">
        <v-icon icon="mdi-plus" size="18" />
        <span>New context</span>
      </button>
    </footer>
  </aside>
</template>

<style scoped>
/* One inset token — every band shares the same horizontal padding and borders. */
.ctx-rail {
  --ctx-rail-width: 268px;
  --ctx-rail-inset: 12px;
  --ctx-rail-rule: 1px solid rgba(var(--v-theme-on-surface), 0.12);

  display: flex;
  flex-direction: column;
  align-self: stretch;
  width: var(--ctx-rail-width);
  flex: 0 0 var(--ctx-rail-width);
  min-width: var(--ctx-rail-width);
  min-height: 0;
  border-right: var(--ctx-rail-rule);
  overflow: hidden;
  box-sizing: border-box;
}

.ctx-rail__head,
.ctx-rail__list,
.ctx-rail__foot {
  padding-inline: var(--ctx-rail-inset);
  box-sizing: border-box;
}

.ctx-rail__head {
  flex-shrink: 0;
  padding-block: 12px;
  border-bottom: var(--ctx-rail-rule);
}

.ctx-rail__title {
  display: block;
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  font-weight: 700;
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.ctx-rail__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  padding-block: 12px;
  overflow-y: auto;
}

.ctx-rail__foot {
  flex-shrink: 0;
  width: 100%;
  padding-block: 12px;
  border-top: var(--ctx-rail-rule);
}

.ctx-rail__new {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px 12px;
  border: 0;
  border-radius: 8px;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  font-family: var(--font-sans);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.12s ease;
}

.ctx-rail__new:hover {
  filter: brightness(1.08);
}

.ctx-card {
  display: block;
  width: 100%;
  box-sizing: border-box;
  text-align: left;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  background: transparent;
  cursor: pointer;
  transition: background-color 0.12s ease, border-color 0.12s ease;
}

.ctx-card:hover {
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.ctx-card--active {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.08);
}

.ctx-card--parked {
  opacity: 0.7;
}

.ctx-card--resolved {
  opacity: 0.75;
}

.ctx-card__header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ctx-card__status {
  flex-shrink: 0;
}

.ctx-card__status--success {
  color: rgb(var(--v-theme-success));
}

.ctx-card__status--muted {
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.ctx-card__problem {
  font-size: 0.9rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ctx-card__current {
  font-size: 0.78rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ctx-card__result {
  font-size: 0.78rem;
  color: rgba(var(--v-theme-on-surface), 0.55);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-style: italic;
}

.ctx-card__stopped {
  margin-top: 6px;
}

@media (max-width: 959px) {
  .ctx-rail {
    width: 100%;
    flex: 0 0 auto;
    min-width: 0;
    max-height: 34vh;
    border-right: none;
    border-bottom: var(--ctx-rail-rule);
  }
}
</style>
