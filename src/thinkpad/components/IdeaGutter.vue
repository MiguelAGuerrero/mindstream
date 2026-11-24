<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import IdeaGutterRow from "./IdeaGutterRow.vue";

const props = defineProps({
  rows: { type: Array, default: () => [] },
  editor: { type: Object, default: null },
  wrapEl: { type: Object, default: null },
});

const emit = defineEmits(["peek"]);

const positions = ref({});
const activeNodeId = ref(null);

let scrollEl = null;

function findParagraphBounds(nodeId) {
  const view = props.editor?.view;
  const wrap = props.wrapEl;
  if (!view || !wrap) return null;

  let pmPos = null;
  view.state.doc.descendants((node, pos) => {
    if (node.type.name === "paragraph" && node.attrs?.id === nodeId) {
      pmPos = pos + 1;
      return false;
    }
    return true;
  });
  if (pmPos == null) return null;

  const coords = view.coordsAtPos(pmPos);
  const wrapRect = wrap.getBoundingClientRect();
  const top = coords.top - wrapRect.top;
  const height = coords.bottom - coords.top;
  return { top, height };
}

function syncPositions() {
  const next = {};
  for (const row of props.rows) {
    const bounds = findParagraphBounds(row.nodeId);
    if (bounds != null) next[row.nodeId] = bounds;
  }
  positions.value = next;
}

function handleOpen(nodeId) {
  activeNodeId.value = nodeId;
}

function handleClose(nodeId) {
  if (activeNodeId.value === nodeId) activeNodeId.value = null;
}

function handlePeek(stepId) {
  emit("peek", stepId);
}

watch(
  () => props.rows,
  () => nextTick(syncPositions),
  { deep: true },
);

watch(
  () => props.editor,
  () => nextTick(syncPositions),
);

onMounted(() => {
  nextTick(syncPositions);
  scrollEl = props.wrapEl?.closest?.(".thinkpad-panel__scroll") ?? null;
  scrollEl?.addEventListener("scroll", syncPositions, { passive: true });
  window.addEventListener("resize", syncPositions, { passive: true });
  props.editor?.on?.("update", syncPositions);
});

onBeforeUnmount(() => {
  scrollEl?.removeEventListener("scroll", syncPositions);
  window.removeEventListener("resize", syncPositions);
  props.editor?.off?.("update", syncPositions);
  emit("peek", null);
});
</script>

<template>
  <aside v-if="rows.length" class="thinkpad-idea-gutter" aria-label="Staged ideas">
    <IdeaGutterRow
      v-for="row in rows"
      :key="row.nodeId"
      :row="row"
      :active="activeNodeId === row.nodeId"
      :style="{
        top: `${positions[row.nodeId]?.top ?? 0}px`,
        minHeight: positions[row.nodeId]?.height ? `${positions[row.nodeId].height}px` : undefined,
      }"
      @peek="handlePeek"
      @open="handleOpen"
      @close="handleClose"
    />
  </aside>
</template>

<style scoped>
.thinkpad-idea-gutter {
  position: relative;
  min-height: 100%;
  width: 28px;
  flex-shrink: 0;
}
</style>
