<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import { onClickOutside } from "@vueuse/core";
import { getMoveById, getSymbolForMove } from "../moves";
import { emitAudioEvent } from "../../sfx";

const props = defineProps({
  row: { type: Object, required: true },
  active: { type: Boolean, default: false },
});

const emit = defineEmits(["peek", "open", "close"]);

const TEXT_MAX = 120;

const open = ref(false);
const bulbRef = ref(null);
const previewRef = ref(null);
const previewStyle = ref({ top: "0px", left: "0px" });

const hasIdeas = computed(() => props.row.ideas?.length > 0);

function truncate(text, max = TEXT_MAX) {
  if (!text) return "";
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max).trimEnd()}…` : t;
}

function moveFor(moveId) {
  return getMoveById(moveId) ?? null;
}

function symbolFor(moveId) {
  return getSymbolForMove(moveId) ?? null;
}

function positionPreview() {
  const btn = bulbRef.value;
  if (!btn) return;
  const rect = btn.getBoundingClientRect();
  previewStyle.value = {
    top: `${rect.top + rect.height / 2}px`,
    left: `${rect.left - 8}px`,
  };
}

function openPreview() {
  open.value = true;
  positionPreview();
  emit("open", props.row.nodeId);
  emit("peek", props.row.ideas?.[0]?.stepId ?? null);
  emitAudioEvent("thinkpad", "idea", "hover");
}

function closePreview() {
  if (!open.value) return;
  open.value = false;
  emit("close", props.row.nodeId);
  emit("peek", null);
}

function togglePreview() {
  if (open.value) closePreview();
  else openPreview();
}

onClickOutside(previewRef, closePreview, { ignore: [bulbRef] });

watch(
  () => props.active,
  (isActive) => {
    if (!isActive && open.value) closePreview();
  },
);

let scrollEl = null;

onMounted(() => {
  nextTick(() => {
    scrollEl = bulbRef.value?.closest?.(".thinkpad-panel__scroll") ?? null;
    scrollEl?.addEventListener("scroll", positionPreview, { passive: true });
    window.addEventListener("resize", positionPreview, { passive: true });
  });
});

onBeforeUnmount(() => {
  scrollEl?.removeEventListener("scroll", positionPreview);
  window.removeEventListener("resize", positionPreview);
  if (open.value) emit("peek", null);
});
</script>

<template>
  <div
    class="thinkpad-idea-gutter-row"
    :class="{
      'thinkpad-idea-gutter-row--empty': !hasIdeas,
      'thinkpad-idea-gutter-row--open': open,
    }"
    :data-idea-node="row.nodeId"
  >
    <button
      v-if="hasIdeas"
      ref="bulbRef"
      type="button"
      class="thinkpad-idea-gutter-row__bulb"
      :class="{ 'thinkpad-idea-gutter-row__bulb--open': open }"
      :title="row.ideas.length > 1 ? `${row.ideas.length} staged ideas` : 'View staged idea'"
      :aria-expanded="open"
      @click="togglePreview"
    >
      <v-icon icon="mdi-lightbulb-on-outline" size="16" />
      <span v-if="row.ideas.length > 1" class="thinkpad-idea-gutter-row__count">{{ row.ideas.length }}</span>
    </button>
    <div v-else class="thinkpad-idea-gutter-row__placeholder">
      <span class="thinkpad-idea-gutter-row__placeholder-dash">—</span>
    </div>

    <Teleport to="body">
      <div
        v-if="open"
        ref="previewRef"
        class="thinkpad-idea-gutter-preview"
        :style="previewStyle"
        role="dialog"
        aria-label="Staged idea preview"
      >
        <div
          v-for="idea in row.ideas"
          :key="idea.id"
          class="thinkpad-idea-gutter-preview__card"
        >
          <div class="thinkpad-idea-gutter-preview__header">
            <span
              v-if="symbolFor(idea.moveId)"
              class="thinkpad-idea-gutter-preview__symbol"
              :title="moveFor(idea.moveId)?.label"
            >{{ symbolFor(idea.moveId) }}</span>
            <span v-if="idea.source" class="thinkpad-idea-gutter-preview__source">
              &ldquo;{{ truncate(idea.source) }}&rdquo;
            </span>
          </div>
          <span v-if="moveFor(idea.moveId)" class="thinkpad-idea-gutter-preview__move">
            {{ moveFor(idea.moveId).label }}
          </span>
          <p v-if="idea.text" class="thinkpad-idea-gutter-preview__output">{{ truncate(idea.text, 160) }}</p>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.thinkpad-idea-gutter-row {
  position: absolute;
  left: 0;
  width: 28px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  pointer-events: auto;
}

.thinkpad-idea-gutter-row__bulb {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid rgba(var(--v-theme-primary), 0.35);
  border-radius: 999px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-primary));
  cursor: pointer;
  transition: background-color 0.12s, border-color 0.12s, box-shadow 0.12s;
}

.thinkpad-idea-gutter-row__bulb:hover,
.thinkpad-idea-gutter-row__bulb--open {
  background: rgba(var(--v-theme-primary), 0.14);
  border-color: rgba(var(--v-theme-primary), 0.55);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.14);
}

.thinkpad-idea-gutter-row__count {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 12px;
  height: 12px;
  padding: 0 3px;
  border-radius: 999px;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  font-size: 0.55rem;
  font-weight: 700;
  line-height: 12px;
  text-align: center;
}

.thinkpad-idea-gutter-row__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
}

.thinkpad-idea-gutter-row__placeholder-dash {
  color: rgba(var(--v-theme-on-surface), 0.22);
  font-size: 0.85rem;
  line-height: 1;
}
</style>

<style>
.thinkpad-idea-gutter-preview {
  position: fixed;
  z-index: 2400;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 220px;
  max-width: 300px;
  padding: 8px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.22);
  transform: translate(-100%, -50%);
  pointer-events: auto;
}

.thinkpad-idea-gutter-preview__card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border-radius: 8px;
  background: rgba(var(--v-theme-surface-variant), 0.45);
}

.thinkpad-idea-gutter-preview__header {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.thinkpad-idea-gutter-preview__symbol {
  flex-shrink: 0;
  font-size: 0.82rem;
  font-weight: 700;
  font-family: var(--font-mono, monospace);
  color: rgb(var(--v-theme-primary));
}

.thinkpad-idea-gutter-preview__source {
  color: rgba(var(--v-theme-on-surface), 0.72);
  font-size: 0.78rem;
  font-style: italic;
  line-height: 1.4;
}

.thinkpad-idea-gutter-preview__move {
  align-self: flex-start;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
  font-size: 0.68rem;
  font-weight: 600;
}

.thinkpad-idea-gutter-preview__output {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.85);
  font-size: 0.78rem;
  line-height: 1.45;
  white-space: pre-wrap;
}
</style>
