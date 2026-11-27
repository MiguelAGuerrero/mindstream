<script setup>
// The moves of the level on screen, as comment-style cards beside the page.
// A card is a cue: the passage, the thread's last line, its state. A short
// result can be given here; longer work opens the thread's own page.
import { reactive, ref } from "vue";
import { ANNOTATION_TAG_DISPLAY } from "../moves";

defineProps({
  cards: { type: Array, default: () => [] },
});

const emit = defineEmits(["open", "answer", "link"]);

const drafts = reactive({});
const activeId = ref(null);

function glyph(card) {
  if (card.kind === "source") return "“";
  if (card.status === "resolved") return "✓";
  return ANNOTATION_TAG_DISPLAY[card.tag]?.glyph ?? "↗";
}

function label(card) {
  if (card.kind === "source") return "Needs a source";
  return ANNOTATION_TAG_DISPLAY[card.tag]?.label ?? "Thread";
}

function meta(card) {
  if (card.kind === "source") return "Open";
  const caveats = card.caveats ? ` · ${card.caveats} caveat${card.caveats === 1 ? "" : "s"}` : "";
  if (card.status === "resolved") return `Resolved${caveats}`;
  if (card.openInside) return `Open · ${card.openInside} open inside`;
  return card.status === "converged" ? "Ready to resolve" : "Open";
}

function answer(card) {
  const result = (drafts[card.id] ?? "").trim();
  if (!result || !card.canAnswer) return;
  emit("answer", { threadId: card.threadId, result });
  delete drafts[card.id];
}
</script>

<template>
  <aside class="move-margin" aria-label="Moves on this page">
    <article
      v-for="card in cards"
      :key="card.id"
      class="move-card"
      :class="{ 'move-card--active': activeId === card.id, 'move-card--resolved': card.status === 'resolved' }"
      @click="activeId = card.id"
      @focusin="activeId = card.id"
    >
      <header class="move-card__head">
        <span class="move-card__glyph" aria-hidden="true">{{ glyph(card) }}</span>
        <div class="move-card__who">
          <div class="move-card__label">{{ label(card) }}</div>
          <div class="move-card__meta">{{ meta(card) }}</div>
        </div>
        <span
          v-if="card.kind === 'thread' && card.status !== 'resolved'"
          class="move-card__check-wrap"
          :title="card.openInside ? 'Settle what is open inside this thread first' : (drafts[card.id] ?? '').trim() ? 'Resolve' : 'Write a result first'"
        >
          <button
            type="button"
            class="move-card__check"
            aria-label="Resolve"
            :disabled="!card.canAnswer || !(drafts[card.id] ?? '').trim()"
            @click.stop="answer(card)"
          >
            <v-icon icon="mdi-check" size="18" />
          </button>
        </span>
      </header>

      <blockquote v-if="card.passage" class="move-card__passage">{{ card.passage }}</blockquote>
      <p v-if="card.kind === 'thread' && card.title && card.title !== card.passage" class="move-card__title">{{ card.title }}</p>
      <p v-if="card.status === 'resolved' && card.result" class="move-card__result">{{ card.result }}</p>
      <p v-else-if="card.latest" class="move-card__latest">Latest: “{{ card.latest }}”</p>

      <textarea
        v-if="card.canAnswer"
        v-model="drafts[card.id]"
        class="move-card__field"
        rows="1"
        placeholder="Your result, in a line…"
        :aria-label="`Result for ${label(card)}: ${card.passage}`"
        @keydown.enter.exact.prevent="answer(card)"
      />

      <div class="move-card__actions">
        <template v-if="card.kind === 'thread'">
          <button
            v-if="card.canAnswer && (drafts[card.id] ?? '').trim()"
            type="button"
            class="move-card__btn move-card__btn--fill"
            @click.stop="answer(card)"
          >Resolve</button>
          <button type="button" class="move-card__btn" @click.stop="emit('open', card.threadId)">
            {{ card.status === "resolved" ? "Reopen thread" : "Open thread" }}
          </button>
        </template>
        <button v-else type="button" class="move-card__btn" @click.stop="emit('link', card.span)">Attach a link</button>
      </div>
    </article>
  </aside>
</template>

<style scoped>
.move-margin {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 0 0 280px;
  width: 280px;
  min-height: 0;
  /* Room on the left for the selected card to step toward the page. */
  padding: 56px 2px 16px 14px;
  overflow-y: auto;
}

.move-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.82rem;
  line-height: 1.45;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.move-card--active {
  transform: translateX(-10px);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2), 0 4px 12px rgba(0, 0, 0, 0.14);
}

.move-card--resolved {
  background: transparent;
}

.move-card__head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.move-card__glyph {
  display: grid;
  place-items: center;
  flex: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(var(--v-theme-primary), 0.14);
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}

.move-card--resolved .move-card__glyph {
  background: rgba(var(--v-theme-success), 0.16);
  color: rgb(var(--v-theme-success));
}

.move-card__who {
  min-width: 0;
}

.move-card__label {
  font-weight: 600;
}

.move-card__meta {
  font-size: 0.74rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.move-card__check-wrap {
  margin-inline-start: auto;
}

.move-card__check {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: rgb(var(--v-theme-primary));
  cursor: pointer;
}

.move-card__check:hover:not(:disabled) {
  background: rgba(var(--v-theme-primary), 0.12);
}

.move-card__check:disabled {
  color: rgba(var(--v-theme-on-surface), 0.3);
  cursor: not-allowed;
}

.move-card__passage {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
  margin: 0;
  padding-inline-start: 8px;
  border-inline-start: 2px solid rgba(var(--v-theme-warning), 0.7);
  color: rgba(var(--v-theme-on-surface), 0.65);
  overflow-wrap: anywhere;
}

.move-card__title,
.move-card__latest,
.move-card__result {
  margin: 0;
  overflow-wrap: anywhere;
}

.move-card__latest {
  color: rgba(var(--v-theme-on-surface), 0.65);
}

.move-card__field {
  width: 100%;
  box-sizing: border-box;
  padding: 7px 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 16px;
  background: transparent;
  color: inherit;
  font: inherit;
  resize: none;
  field-sizing: content;
}

.move-card__field:focus {
  outline: 2px solid rgba(var(--v-theme-primary), 0.6);
  outline-offset: 0;
}

.move-card__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.move-card__btn {
  margin-inline-start: -8px;
  padding: 4px 8px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgb(var(--v-theme-primary));
  font: inherit;
  font-weight: 500;
  cursor: pointer;
}

.move-card__btn:hover {
  background: rgba(var(--v-theme-primary), 0.1);
}

.move-card__btn--fill {
  margin-inline-start: 0;
  padding: 5px 14px;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}

.move-card__btn--fill:hover {
  background: rgb(var(--v-theme-primary));
  opacity: 0.92;
}

@media (prefers-reduced-motion: reduce) {
  .move-card {
    transition: none;
  }
}
</style>
