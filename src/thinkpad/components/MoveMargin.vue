<script setup>
// The moves of the level on screen, as comment-style cards beside the page.
// Each card sits level with its passage, like a comment in a word processor;
// cards whose passage is off screen (or on another page) are not shown.
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import MoveCard from "./MoveCard.vue";

const props = defineProps({
  cards: { type: Array, default: () => [] },
  activeId: { type: String, default: null },
  freshId: { type: String, default: null },
});

const emit = defineEmits(["update:activeId", "open", "answer", "link", "remove"]);

const GAP = 8;
const rootRef = ref(null);
const slotEls = new Map();
// card id → top in px; absent = its passage is out of view.
const tops = reactive({});

function setSlot(id, el) {
  if (el) slotEls.set(id, el);
  else slotEls.delete(id);
}

/** Where a card's passage is on screen: a y relative to the margin, null when
 *  out of view, or Infinity when the passage has no mark to line up with. */
function anchorY(card, rootTop) {
  const el = document.querySelector(`.thinkpad-page [data-annotation-id="${CSS.escape(card.id)}"]`);
  if (!el) return Infinity;
  const r = el.getBoundingClientRect();
  const scroller = el.closest(".thinkpad-panel__scroll");
  if (scroller) {
    const s = scroller.getBoundingClientRect();
    // Pages view shows only the lines of the current page.
    const pageVisible = parseFloat(scroller.style.getPropertyValue("--page-visible"));
    const bottom = Number.isFinite(pageVisible) ? Math.min(s.bottom, s.top + pageVisible) : s.bottom;
    if (r.bottom <= s.top || r.top >= bottom) return null;
  }
  return r.top - rootTop;
}

function layout() {
  const root = rootRef.value;
  if (!root) return;
  const rootTop = root.getBoundingClientRect().top;
  const placed = props.cards
    .map((card, i) => ({ card, i, y: anchorY(card, rootTop) }))
    .filter((p) => p.y !== null)
    .sort((a, b) => a.y - b.y || a.i - b.i);
  const height = (card) => slotEls.get(card.id)?.offsetHeight ?? 0;
  const scrolled = root.scrollTop;
  const next = {};
  // The selected card sits level with its passage; the cards before it stack
  // upward from there and the rest downward, as comments do in a word processor.
  const pivot = placed.findIndex((p) => p.card.id === props.activeId && Number.isFinite(p.y));
  let floor = 0;
  if (pivot >= 0) {
    const pivotTop = Math.max(placed[pivot].y - 10, 0);
    let ceiling = pivotTop;
    for (let i = pivot - 1; i >= 0; i--) {
      const { card, y } = placed[i];
      const top = Math.min(y - 10, ceiling - GAP - height(card));
      next[card.id] = top + scrolled;
      ceiling = top;
    }
    next[placed[pivot].card.id] = pivotTop + scrolled;
    floor = pivotTop + height(placed[pivot].card) + GAP;
  }
  for (const { card, y } of placed.slice(pivot + 1)) {
    const top = Math.max(Number.isFinite(y) ? y - 10 : floor, floor);
    next[card.id] = top + scrolled;
    floor = top + height(card) + GAP;
  }
  for (const id of Object.keys(tops)) if (!(id in next)) delete tops[id];
  for (const [id, top] of Object.entries(next)) if (tops[id] !== top) tops[id] = top;
}

let frame = 0;
function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(layout);
}

let settle = null;
function scheduleSettled() {
  nextTick(schedule);
  clearTimeout(settle);
  settle = setTimeout(schedule, 200); // after the editor has painted its marks
}

let resizeObserver = null;
onMounted(() => {
  document.addEventListener("scroll", schedule, true);
  document.addEventListener("transitionend", schedule, true);
  window.addEventListener("resize", schedule);
  resizeObserver = new ResizeObserver(schedule);
  resizeObserver.observe(rootRef.value);
  const page = document.querySelector(".thinkpad-page");
  if (page) resizeObserver.observe(page);
  scheduleSettled();
});
onBeforeUnmount(() => {
  document.removeEventListener("scroll", schedule, true);
  document.removeEventListener("transitionend", schedule, true);
  window.removeEventListener("resize", schedule);
  resizeObserver?.disconnect();
  cancelAnimationFrame(frame);
  clearTimeout(settle);
});
watch(() => props.cards, scheduleSettled, { deep: true });
watch(() => props.activeId, schedule);
// Typing in a card changes its height.
function onInput() { schedule(); }
</script>

<template>
  <aside ref="rootRef" class="move-margin" aria-label="Moves on this page" @input="onInput">
    <div
      v-for="card in cards"
      :key="card.id"
      :ref="(el) => setSlot(card.id, el)"
      class="move-margin__slot"
      :class="{ 'move-margin__slot--active': activeId === card.id, 'move-margin__slot--away': tops[card.id] === undefined }"
      :style="{ top: `${tops[card.id] ?? 0}px` }"
      :inert="tops[card.id] === undefined"
      @click="emit('update:activeId', card.id)"
      @focusin="emit('update:activeId', card.id)"
    >
      <MoveCard
        :card="card"
        :active="activeId === card.id"
        :autofocus="freshId === card.id"
        @open="(id) => emit('open', id)"
        @answer="(a) => emit('answer', a)"
        @link="(span) => emit('link', span)"
        @remove="(id) => emit('remove', id)"
      />
    </div>
  </aside>
</template>

<style scoped>
.move-margin {
  position: relative;
  flex: 0 0 280px;
  width: 280px;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: thin;
}

.move-margin__slot {
  position: absolute;
  inset-inline: 14px 2px;
  transition: transform 0.15s ease, top 0.15s ease;
}

/* The selected card steps toward the page. */
.move-margin__slot--active {
  transform: translateX(-10px);
  z-index: 1;
}

.move-margin__slot--away {
  visibility: hidden;
}

@media (prefers-reduced-motion: reduce) {
  .move-margin__slot {
    transition: none;
  }
}
</style>
