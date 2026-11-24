<script setup>
// The decompose trail of the ACTIVE context, listed beside the prompt card:
// root at the top, the frame you're on at the bottom, marked with a caret.
// Same content the card's one-line `.srun-trail` carries, opened out.
//
// A plain text list on purpose — no card chrome, no shingle. The board's deck
// draws stacks you're choosing between; this one just says where you are while
// you work, so it stays quiet next to the card that holds your attention.
//
// Below the stack, the plan's steps (when there is one) as the always-available
// fallback: the card shows only the current focus, so this is where you see the
// whole plan and switch to another step.
//
// The stack is read-only by design. Getting back up is Back / Resolve, one level at a
// time, because those are the moves that fold a takeaway into the parent —
// clicking an ancestor would have to truncate the array with nowhere to put
// the skipped results.
import { onMounted, ref, watch } from "vue";

const props = defineProps({
  /** Frames root → current, from the store's activeStackCards getter. */
  cards: { type: Array, default: () => [] },
  /** Tints the current row to match the card's border. Must come from the
   *  same source the card uses (currentResolved) so they can't disagree.
   *  `parked` is unreachable here: parking clears the active context. */
  resolved: { type: Boolean, default: false },
  /** The plan the active card is part of (the store's activePlan), or null. */
  plan: { type: Object, default: null },
  /** Whether some tool can keep these steps as a workflow. */
  canSave: { type: Boolean, default: false },
});

// Steps are the one clickable part: switching steps is how you pivot when what
// you discover changes the plan. The stack above stays read-only (see header).
const emit = defineEmits(["jump", "save-workflow"]);

// The current frame is always the LAST row, so a stack taller than the panel
// would open scrolled away from the one thing you're working on.
const list = ref(null);
function pinToCurrent() {
  const el = list.value;
  if (el) el.scrollTop = el.scrollHeight;
}
// onMounted rather than `immediate: true` — the ref isn't bound yet at setup.
onMounted(pinToCurrent);
// Keyed on the current frame's id, not on length: that also catches switching
// to a DIFFERENT context that happens to sit at the same depth. `post` flush
// runs after the DOM patch, so no nextTick. The panel is a sibling of the
// card's <Transition>, so it never remounts — hence the watch.
watch(() => props.cards.at(-1)?.id, pinToCurrent, { flush: "post" });
</script>

<template>
  <aside class="ctx-trail" :class="{ 'ctx-trail--resolved': props.resolved }" aria-label="Focus stack">
    <ol v-if="props.cards.length" ref="list" class="ctx-trail__list">
      <li
        v-for="card in props.cards"
        :key="card.id"
        class="ctx-trail__row"
        :class="{ 'ctx-trail__row--current': card.isActive }"
        :aria-current="card.isActive ? 'true' : undefined"
        :title="card.title"
      >
        <span class="ctx-trail__title">{{ card.title }}</span>
        <!-- An ancestor that already folded a takeaway up into itself. Purely
             decorative: v-icon renders aria-hidden unless it's clickable, and
             the mark repeats what the card shows anyway. -->
        <v-icon v-if="!card.isActive && card.result" size="13" icon="mdi-check" class="ctx-trail__mark" />
      </li>
    </ol>

    <section v-if="props.plan" class="ctx-steps" aria-label="Plan steps">
      <p class="ctx-steps__label">
        STEPS · {{ props.plan.done.filter(Boolean).length }} / {{ props.plan.steps.length }}
      </p>
      <ol class="ctx-steps__list">
        <li
          v-for="(step, i) in props.plan.steps"
          :key="i"
          class="ctx-steps__row"
          :class="{
            'ctx-steps__row--done': props.plan.done[i],
            'ctx-steps__row--current': props.plan.running && i === props.plan.index,
          }"
        >
          <button
            type="button"
            class="ctx-steps__step"
            :title="props.plan.running && i === props.plan.index ? step.prompt : `Switch to: ${step.prompt}`"
            :disabled="props.plan.running && i === props.plan.index"
            :aria-current="props.plan.running && i === props.plan.index ? 'step' : undefined"
            @click="emit('jump', i)"
          >
            <v-icon
              size="13"
              class="ctx-steps__icon"
              :icon="props.plan.done[i] ? 'mdi-check' : props.plan.running && i === props.plan.index ? 'mdi-circle-medium' : 'mdi-circle-outline'"
            />
            <span class="ctx-steps__title">{{ step.prompt }}</span>
            <v-icon v-if="step.expects === 'call'" size="13" icon="mdi-call-split" class="ctx-steps__decision" title="Decision" />
          </button>
          <p v-if="props.plan.choices?.[i]" class="ctx-steps__choice" :title="props.plan.choices[i]">
            → {{ props.plan.choices[i] }}
          </p>
          <p v-if="props.plan.results[i]" class="ctx-steps__note" :title="props.plan.results[i]">
            {{ props.plan.results[i] }}
          </p>
        </li>
      </ol>
      <v-btn
        v-if="props.canSave"
        size="small"
        variant="text"
        prepend-icon="mdi-content-save-outline"
        class="ctx-steps__save"
        @click="emit('save-workflow')"
      >
        Save as workflow
      </v-btn>
    </section>
  </aside>
</template>

<style scoped>
.ctx-trail {
  /* Fluid so the panel survives a dashboard widget cell. A plain text list
     needs far less room than the deck of cards this started as, so the floor
     is low: 170px still fits ~24 characters at 0.85rem, and the card keeps
     ~400px in a default widget. Below the breakpoint in FocusRunnerPage it is
     display:none entirely. */
  --ctx-trail-width: clamp(170px, 20cqw, 240px);
  --ctx-trail-inset: 14px;
  /* Gutter the caret sits in, so every row's TEXT starts at the same x and the
     list keeps one clean left edge instead of the current row jutting in. */
  --ctx-trail-marker: 14px;

  /* Set by the @container block in FocusRunnerPage; the fallback keeps the
     panel visible anywhere the variable was never declared. */
  display: var(--focus-trail-panel, flex);
  flex-direction: column;
  /* flex-shrink defaults to 1 — without the 0 the panel gets squeezed rather
     than holding its width. align-items: stretch does NOT cover this. */
  flex: 0 0 var(--ctx-trail-width);
  width: var(--ctx-trail-width);
  min-width: 0;
  min-height: 0;
  box-sizing: border-box;
  /* Sits left of the card, so the rule goes on its trailing edge (mirrors
     under dir=rtl, same as the rail's). */
  border-inline-end: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.ctx-trail__list {
  display: flex;
  flex-direction: column;
  /* Shrinks (and scrolls) rather than filling the panel, so the steps sit right
     under the stack instead of being pushed to the bottom. */
  flex: 0 1 auto;
  min-height: 0;
  margin: 0;
  padding: 16px var(--ctx-trail-inset);
  list-style: none;
  overflow-y: auto;
}

.ctx-trail__row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex: 0 0 auto;
  min-width: 0;
  /* Hanging caret: the gutter is padding on every row, and the marker is
     absolutely placed into it, so ancestors and the current row share one
     text edge. */
  position: relative;
  padding: 5px 0 5px var(--ctx-trail-marker);
}

.ctx-trail__row--current::before {
  content: "▸";
  position: absolute;
  inset-inline-start: 0;
  font-size: 0.75rem;
  line-height: inherit;
  color: rgb(var(--v-theme-primary));
}

.ctx-trail--resolved .ctx-trail__row--current::before {
  color: rgb(var(--v-theme-success));
}

.ctx-trail__title {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 0.85rem;
  font-weight: 400;
  line-height: 1.4;
  color: rgba(var(--v-theme-on-surface), 0.55);
  /* Rows stay one line; the full text is on the title attribute. */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ctx-trail__row--current .ctx-trail__title {
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.ctx-trail--resolved .ctx-trail__row--current .ctx-trail__title {
  color: rgb(var(--v-theme-success));
}

.ctx-steps {
  display: flex;
  flex-direction: column;
  flex: 0 1 auto;
  min-height: 0;
  padding: 12px var(--ctx-trail-inset) 16px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.ctx-steps__label {
  margin: 0 0 6px;
  font-size: 0.65rem;
  letter-spacing: 0.16em;
  font-weight: 700;
  color: rgba(var(--v-theme-on-surface), 0.45);
}

.ctx-steps__list {
  margin: 0;
  padding: 0;
  list-style: none;
  overflow-y: auto;
  min-height: 0;
}

.ctx-steps__row {
  min-width: 0;
}

.ctx-steps__step {
  display: flex;
  align-items: baseline;
  gap: 6px;
  width: 100%;
  min-width: 0;
  padding: 4px 4px 4px 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  font: inherit;
  text-align: start;
  color: rgba(var(--v-theme-on-surface), 0.6);
  cursor: pointer;
}

.ctx-steps__step:hover:not(:disabled) {
  background: rgba(var(--v-theme-on-surface), 0.06);
  color: rgb(var(--v-theme-on-surface));
}

.ctx-steps__step:disabled {
  cursor: default;
}

.ctx-steps__step:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 1px;
}

.ctx-steps__icon {
  flex-shrink: 0;
  align-self: center;
}

.ctx-steps__title {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 0.85rem;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ctx-steps__decision {
  flex-shrink: 0;
  align-self: center;
  color: rgba(var(--v-theme-on-surface), 0.45);
}

.ctx-steps__row--done .ctx-steps__step {
  color: rgba(var(--v-theme-on-surface), 0.4);
}

.ctx-steps__row--done .ctx-steps__icon {
  color: rgba(var(--v-theme-primary), 0.7);
}

.ctx-steps__row--current .ctx-steps__step {
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.ctx-steps__row--current .ctx-steps__icon {
  color: rgb(var(--v-theme-primary));
}

.ctx-steps__save {
  align-self: flex-start;
  margin-top: 6px;
  text-transform: none;
}

.ctx-steps__choice {
  margin: 0 0 2px 19px;
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.35;
  color: rgb(var(--v-theme-primary));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ctx-steps__note {
  margin: 0 0 4px 19px;
  font-size: 0.78rem;
  line-height: 1.35;
  color: rgba(var(--v-theme-on-surface), 0.55);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ctx-trail__mark {
  flex-shrink: 0;
  align-self: center;
  color: rgba(var(--v-theme-primary), 0.7);
}
</style>
