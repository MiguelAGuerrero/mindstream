<script setup>
import { getMoveById, getSymbolForMove } from "../moves";

const props = defineProps({
  items: { type: Array, default: () => [] },
});

const emit = defineEmits(["peek"]);

const TEXT_MAX = 80;

function truncate(text, max) {
  if (!text) return "";
  const t = text.trim();
  return t.length > max ? t.slice(0, max).trimEnd() + "…" : t;
}

function moveFor(moveId) {
  return getMoveById(moveId) ?? null;
}

function symbolFor(moveId) {
  return getSymbolForMove(moveId) ?? null;
}
</script>

<template>
  <v-menu location="bottom end" :close-on-content-click="false" offset="8">
    <template #activator="{ props: menuProps }">
      <v-badge
        :content="items.length"
        :model-value="items.length > 0"
        color="primary"
      >
        <v-btn
          v-bind="menuProps"
          icon="mdi-lightbulb-outline"
          variant="text"
          size="small"
          density="compact"
          :title="items.length ? `${items.length} idea${items.length !== 1 ? 's' : ''} staged` : 'No ideas staged'"
        />
      </v-badge>
    </template>

    <v-card class="ideas-menu" width="300">
      <div class="ideas-menu__header d-flex align-center px-4">
        <span class="text-overline text-medium-emphasis">Ideas</span>
        <v-spacer />
        <span v-if="items.length" class="text-caption text-disabled">{{ items.length }}</span>
      </div>
      <v-divider />

      <div class="ideas-menu__body">
        <div v-if="items.length" class="pa-3 d-flex flex-column ideas-list">
          <div
            v-for="item in items"
            :key="item.id"
            class="idea-card pa-3"
            @mouseenter="emit('peek', item.stepId)"
            @mouseleave="emit('peek', null)"
          >
            <div class="idea-card__row d-flex align-baseline gap-2 mb-2">
              <span
                v-if="symbolFor(item.moveId)"
                class="idea-card__symbol"
                :title="moveFor(item.moveId)?.label"
              >{{ symbolFor(item.moveId) }}</span>
              <span v-if="item.source" class="idea-card__source text-caption">
                &ldquo;{{ truncate(item.source, TEXT_MAX) }}&rdquo;
              </span>
            </div>
            <div v-if="moveFor(item.moveId)" class="d-flex align-center">
              <v-chip
                size="x-small"
                variant="tonal"
                :prepend-icon="moveFor(item.moveId).icon"
                class="idea-card__move"
              >{{ moveFor(item.moveId).label }}</v-chip>
            </div>
          </div>
        </div>

        <div
          v-else
          class="d-flex flex-column align-center justify-center text-center px-6 py-8"
        >
          <v-icon icon="mdi-lightbulb-outline" size="28" class="mb-3 text-disabled" />
          <p class="text-body-2 text-medium-emphasis mb-1">No ideas staged</p>
          <p class="text-caption text-disabled mb-0">
            Highlight text and apply a move to stage an idea.
          </p>
        </div>
      </div>
    </v-card>
  </v-menu>
</template>

<style scoped>
.ideas-menu__header {
  min-height: 44px;
}

.ideas-menu__body {
  overflow-y: auto;
  max-height: 360px;
}

.ideas-list {
  gap: 8px;
}

.idea-card {
  border-radius: 8px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgba(var(--v-theme-surface-variant), 0.4);
  cursor: default;
  transition: background-color 0.13s ease;
}

.idea-card:hover {
  background: rgba(var(--v-theme-surface-variant), 0.72);
}

.idea-card__symbol {
  flex-shrink: 0;
  font-size: 0.82rem;
  font-weight: 700;
  font-family: var(--font-mono, monospace);
  color: rgb(var(--v-theme-primary));
  line-height: 1;
  letter-spacing: -0.01em;
  user-select: none;
}

.idea-card__source {
  color: rgba(var(--v-theme-on-surface), 0.72);
  font-style: italic;
  line-height: 1.4;
}
</style>
