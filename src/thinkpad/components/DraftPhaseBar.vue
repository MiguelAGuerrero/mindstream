<script setup>
import { computed } from "vue";
import { usePadStore } from "../store/padStore";

const padStore = usePadStore();

const isDraftFrozen      = computed(() => padStore.isDraftFrozen);
const stagedCount        = computed(() => padStore.stagedOutputs.length);
const padLocator         = computed(() => padStore.surfaceHead);
const hasContent         = computed(() => (padStore.viewPad?.text ?? "").trim() !== "");
const draftHistory       = computed(() => padStore.draftHistory);
const draftCount         = computed(() => draftHistory.value.length);
const viewingDraftN      = computed(() => padStore.viewingDraftN);
const isDraftHistoryView = computed(() => padStore.isDraftHistoryView);

// Stream → Reflect: the first stamp. The way back to writing is Write more,
// which adds after the frozen draft and never reopens it.
function handleStamp() {
  if (!isDraftFrozen.value && !isDraftHistoryView.value) {
    padStore.stampDraft({ padLocator: padLocator.value });
  }
}

// Write more (append-only): open the writing area under the frozen draft.
const writeMoreOpen = computed(() => padStore.writeMoreText !== null);
function handleWriteMore() {
  padStore.beginWriteMore({ padLocator: padLocator.value });
}

// Apply all staged outputs and advance to the next draft version.
function handleNextDraft() {
  padStore.advanceToNextDraft({ padLocator: padLocator.value });
}

// Navigate draft history: dir = -1 (prev) or +1 (next / exit history).
function handleNavigateDraft(dir) {
  const n = viewingDraftN.value;
  if (n === null && dir > 0) return; // already at most recent; right arrow is a no-op from live view
  const target = n === null ? draftCount.value - 2 : n + dir;
  if (target < 0) return;
  if (target >= draftCount.value) {
    padStore.exitDraftHistory();
    return;
  }
  padStore.navigateToDraft(target);
}
</script>

<template>
  <div class="phase-pill" role="toolbar" aria-label="Writing phase">

    <!-- ── Stream mode: bootstrap dump, one-way stamp action ── -->
    <template v-if="!isDraftFrozen && !isDraftHistoryView">
      <span class="phase-pill__mode-label phase-pill__mode-label--stream">Stream</span>
      <span class="phase-pill__sep" aria-hidden="true" />
      <button
        type="button"
        class="phase-pill__stamp-btn"
        :disabled="!hasContent"
        title="Done streaming — begin reflect (one-way)"
        @click="handleStamp"
      >
        <v-icon icon="mdi-lightbulb-on-outline" size="15" />
        <span>Begin Reflect</span>
      </button>
    </template>

    <!-- ── Cultivate mode: history nav + next draft ── -->
    <template v-else>
      <span class="phase-pill__mode-label phase-pill__mode-label--reflect">Reflect</span>

      <!-- Draft navigator: visible once at least one snapshot exists -->
      <template v-if="draftCount > 0">
        <span class="phase-pill__sep" aria-hidden="true" />
        <div class="phase-pill__nav" :class="{ 'phase-pill__nav--history': isDraftHistoryView }">
          <button
            type="button"
            class="phase-pill__nav-arrow"
            :disabled="isDraftHistoryView && viewingDraftN === 0"
            title="Previous draft"
            @click="handleNavigateDraft(-1)"
          >
            <v-icon icon="mdi-chevron-left" size="14" />
          </button>
          <span class="phase-pill__nav-label">
            {{ isDraftHistoryView ? `Draft ${viewingDraftN + 1}` : `Draft ${draftCount}` }}
            <span class="phase-pill__nav-of">/ {{ draftCount }}</span>
          </span>
          <button
            type="button"
            class="phase-pill__nav-arrow"
            :disabled="!isDraftHistoryView"
            :title="isDraftHistoryView && viewingDraftN === draftCount - 1 ? 'Return to current' : 'Next draft'"
            @click="handleNavigateDraft(1)"
          >
            <v-icon icon="mdi-chevron-right" size="14" />
          </button>
        </div>
      </template>

      <!-- Write more: the append-only way back to writing (live view only) -->
      <template v-if="!isDraftHistoryView && !writeMoreOpen">
        <span class="phase-pill__sep" aria-hidden="true" />
        <button
          type="button"
          class="phase-pill__write-more"
          title="Write more — add new text after this draft"
          @click="handleWriteMore"
        >
          <v-icon icon="mdi-pencil-plus-outline" size="14" />
          <span>Write more</span>
        </button>
      </template>

      <!-- Next Draft: only in live cultivate mode with staged moves -->
      <Transition name="phase-reveal">
        <button
          v-if="!isDraftHistoryView && isDraftFrozen && stagedCount > 0"
          type="button"
          class="phase-pill__reveal"
          :title="`Apply ${stagedCount} staged move${stagedCount !== 1 ? 's' : ''} → next draft`"
          @click="handleNextDraft"
        >
          <v-icon icon="mdi-arrow-right-circle-outline" size="14" />
          <span class="phase-pill__reveal-count">Next Draft</span>
        </button>
      </Transition>
    </template>

  </div>
</template>

<style scoped>
.phase-pill {
  display: inline-flex;
  align-items: center;
  gap: 0;
  padding: 3px;
  border-radius: 999px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgba(var(--v-theme-surface), 0.88);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.phase-pill__sep {
  width: 1px;
  height: 20px;
  background: rgba(var(--v-border-color), var(--v-border-opacity));
  flex-shrink: 0;
}

/* Phase mode label — communicates the current state without a toggle */
.phase-pill__mode-label {
  font-family: var(--font-sans);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding-inline: 10px;
  user-select: none;
}

.phase-pill__mode-label--stream {
  color: rgba(var(--v-theme-on-surface), 0.48);
}

.phase-pill__mode-label--reflect {
  color: rgb(var(--v-theme-primary));
}

/* Write more: quiet, so the easy path stays the reflect loop */
.phase-pill__write-more {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-family: var(--font-sans);
  font-size: 0.75rem;
  cursor: pointer;
}

.phase-pill__write-more:hover {
  background: rgba(var(--v-theme-on-surface), 0.06);
  color: rgb(var(--v-theme-on-surface));
}

/* Stamp button: the one-way transition trigger in stream mode */
.phase-pill__stamp-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px 5px 10px;
  border: 0;
  border-radius: 999px;
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
  font-family: var(--font-sans);
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.phase-pill__stamp-btn:hover:not(:disabled) {
  background: rgba(var(--v-theme-primary), 0.2);
}

.phase-pill__stamp-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

/* Draft navigator */
.phase-pill__nav {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  margin-inline: 2px;
}

.phase-pill__nav--history {
  background: rgba(var(--v-theme-secondary), 0.08);
  border-radius: 999px;
  padding-inline: 2px;
}

.phase-pill__nav-arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 28px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.5);
  cursor: pointer;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.phase-pill__nav-arrow:not(:disabled):hover {
  background: rgba(var(--v-theme-on-surface), 0.07);
  color: rgba(var(--v-theme-on-surface), 0.82);
}

.phase-pill__nav-arrow:disabled {
  opacity: 0.28;
  cursor: default;
}

.phase-pill__nav-label {
  font-family: var(--font-sans);
  font-size: 0.7rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.62);
  white-space: nowrap;
  padding-inline: 2px;
  user-select: none;
}

.phase-pill__nav-of {
  opacity: 0.55;
}

/* Next Draft button */
.phase-pill__reveal {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-inline-start: 4px;
  padding: 4px 10px 4px 8px;
  border: 0;
  border-radius: 999px;
  background: rgba(var(--v-theme-primary), 0.14);
  color: rgb(var(--v-theme-primary));
  font-family: var(--font-sans);
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease;
  animation: reveal-pulse 2.4s ease-in-out infinite;
}

.phase-pill__reveal:hover {
  background: rgba(var(--v-theme-primary), 0.24);
}

.phase-pill__reveal-count {
  line-height: 1;
  letter-spacing: 0.01em;
}

.phase-reveal-enter-active,
.phase-reveal-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.phase-reveal-enter-from,
.phase-reveal-leave-to {
  opacity: 0;
  transform: translateX(6px) scale(0.9);
}

@keyframes reveal-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(var(--v-theme-primary), 0); }
  50%       { box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.2); }
}
</style>
