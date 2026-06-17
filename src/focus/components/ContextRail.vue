<script setup>
// Left rail of isolated contexts. Each is its own problem (a drillable focus
// stack); click one to switch to it. Parked contexts show what they're waiting
// on. Presentational only: props in, events out.
defineProps({
  contexts: { type: Array, default: () => [] },
});
const emit = defineEmits(["switch", "new"]);
</script>

<template>
  <aside class="ctx-rail">
    <div class="ctx-rail__head">
      <span class="ctx-rail__title">Contexts</span>
      <v-btn size="small" variant="text" prepend-icon="mdi-plus" @click="emit('new')">New</v-btn>
    </div>

    <div class="ctx-rail__list">
      <button
        v-for="c in contexts"
        :key="c.id"
        type="button"
        class="ctx-card"
        :class="{ 'ctx-card--active': c.isActive, 'ctx-card--parked': c.parked }"
        @click="emit('switch', c.id)"
      >
        <div class="ctx-card__problem">{{ c.problem }}</div>
        <div v-if="c.depth > 1" class="ctx-card__current">↳ {{ c.current }}</div>
        <div v-if="c.parked" class="ctx-card__parked">
          <v-icon size="13" icon="mdi-pause-circle-outline" class="mr-1" />
          {{ c.waitingOn ? `waiting on ${c.waitingOn}` : "parked" }}
        </div>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.ctx-rail {
  display: flex;
  flex-direction: column;
  flex: 0 0 268px;
  min-height: 0;
  border-right: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  overflow: hidden;
}

.ctx-rail__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0.5rem 0.75rem 1rem;
  flex-shrink: 0;
}

.ctx-rail__title {
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  font-weight: 700;
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.ctx-rail__list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0 0.5rem 1rem;
  overflow-y: auto;
  min-height: 0;
}

.ctx-card {
  text-align: left;
  width: 100%;
  padding: 0.6rem 0.75rem;
  border-radius: 10px;
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

.ctx-card__parked {
  display: flex;
  align-items: center;
  font-size: 0.74rem;
  color: rgb(var(--v-theme-warning));
  margin-top: 4px;
}

@media (max-width: 959px) {
  .ctx-rail {
    flex: 0 0 auto;
    max-height: 34vh;
    border-right: none;
    border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  }
}
</style>
