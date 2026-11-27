<script setup>
// The Focus Runner page (route name: "focus"). Authoring is the source.
// Holds many isolated contexts: a left rail to switch between them (click), the
// active one shown center as a sticky note. Decompose / Resolve open a
// small text composer — no workflow is consulted (deferred). Stop sets the
// context aside immediately (optional reason on the rail when paused). Only this route
// touches the store.
import { computed, reactive, ref, watch, nextTick, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useSessionRunStore } from "./store/sessionRunStore";
import { useTimer } from "./composables/useTimer";
import { useFocusUi } from "./composables/useFocusUi";
import { useFocusBootstrap } from "./composables/useFocusBootstrap";
import { useFocusHandoff } from "./composables/useFocusHandoff";
import { stepsFromText } from "./model/decomposeHandoff.js";
import { formatElapsed } from "./model/session.js";
import ContextRail from "./components/ContextRail.vue";
import ContextBoard from "./components/ContextBoard.vue";
import ContextTrail from "./components/ContextTrail.vue";
import FocusComposer from "./components/FocusComposer.vue";
import HandoffReadyCard from "./components/HandoffReadyCard.vue";
import DecomposeReturnDialog from "./components/DecomposeReturnDialog.vue";
import SessionPromptCard from "./components/SessionPromptCard.vue";
import SendSheet from "../shelf/SendSheet.vue";

const runStore = useSessionRunStore();
const sendText = ref("");

// Deep link from the workspace's open loops (Phase 4): ?context=… opens it
// (resuming a parked one at its exact depth), then the query is dropped.
const deepRoute = useRoute();
const deepRouter = useRouter();
watch(
  [() => deepRoute.query.context, () => runStore.isLoaded],
  ([id, loaded]) => {
    if (!loaded || id == null || id === "") return;
    const match = runStore.contexts.find((c) => String(c.id) === String(id));
    if (match) runStore.switchContext(match.id);
    const { context: _c, ...rest } = deepRoute.query;
    deepRouter.replace({ name: "focus", query: rest });
  },
  { immediate: true },
);
const focusUi = useFocusUi();
// A task handed in from another tool (/focus?handoff=<id>) lands on a
// "ready to start" card; a missing or consumed handoff is just a plain session.
const handoff = useFocusHandoff();
const router = useRouter();

// Decompose elsewhere: the active context may have sent its focus to ThinkPad
// and be waiting on the answer. The handoff id lives on the context, so the
// wait survives navigating away and back.
const awaiting = computed(() => handoff.awaitingState(runStore.activeContext?.awaitingHandoffId));
// The tool we're waiting on ("ThinkPad", "Workflows"), or "" when not waiting.
const awaitingTool = computed(() =>
  awaiting.value?.status === "waiting" ? awaiting.value.sourceName || "another tool" : "",
);
const returnOpen = computed(() => awaiting.value?.status === "ready");
// Requests and contexts stay in step: a link back to an accepted request opens
// its context, and a request whose context is gone is answered (abandoned).
watch(
  [() => runStore.isLoaded, () => runStore.contexts.map((c) => c.id).join("|"), () => deepRoute.query.handoff],
  ([loaded]) => {
    if (!loaded) return;
    const contextId = handoff.reconcile(runStore.contexts);
    if (contextId != null) runStore.switchContext(contextId);
  },
  { immediate: true },
);
function clearAwaiting() {
  const ctx = runStore.activeContext;
  if (ctx) runStore.setAwaitingHandoff({ id: ctx.id, handoffId: null });
}
// A reply that came back empty or abandoned just ends the wait, quietly.
watch(
  () => awaiting.value?.status,
  (status) => {
    if (status === "dropped") clearAwaiting();
  },
  { immediate: true },
);

// Which context surface is showing. The board vs. the card is derived from
// activeContextId (null = board), so this only picks the *shape* of the picker.
const isStackView = computed(() => focusUi.viewMode === "stack");

// Whether the stack trail stands beside the card. Extracted because it drives
// both the v-if and the stage modifier, and those must never drift apart.
// The container query below decides whether it actually has room.
//
// Requiring rows is not belt-and-braces: an empty panel would still paint its
// border and hold its width while showing nothing, AND the --paneled modifier
// it sets would hide the card's inline trail — losing BOTH views of the
// ancestors at once. With no rows we render no panel, so the card re-centers
// and the inline trail comes back through its var() fallback.
const trailCards = computed(() => runStore.activeStackCards ?? []);
const showTrailPanel = computed(
  () => isStackView.value && runStore.hasFocus && !focusUi.expanded && trailCards.value.length > 0,
);

// Hydrate persisted contexts wherever the runner mounts (route or widget).
useFocusBootstrap();

// Each focus gets a fresh clock; display-only (no auto-advance).
const { value: timerValue, reset, resume, pause } = useTimer(1000);
const timerFormatted = computed(() => formatElapsed(timerValue.value));
function restartTimer() {
  reset();
  resume();
}
// The timer is in-memory and every restart zeroes it, so bank the elapsed
// seconds into the active context first; the total feeds the handoff result.
function bankElapsed() {
  const ctx = runStore.activeContext;
  if (!ctx || !(timerValue.value > 0)) return;
  runStore.addSpentSeconds({ id: ctx.id, seconds: timerValue.value });
}
onBeforeUnmount(bankElapsed);

// One composer dialog, three modes:
//   'drill'    → author a sub-focus to decompose into (required)
//   'reflect'  → an optional note on the current focus (opt-in; Resolve never asks)
//   'new'      → author a new top-level context without leaving the rail
const composer = reactive({ open: false, mode: "drill", value: "" });
const composerField = ref(null);

// Closure moment — completing at root shows a brief summary (habit-loop
// reward) instead of the card just vanishing; the rail keeps the durable record.
const closure = reactive({ open: false, title: "", takeaway: "", elapsed: "" });

const COPY = {
  drill: {
    title: "Decompose this focus",
    label: "What sub-problem do you want to work on?",
    hint: "Shift+Enter adds a line. Several lines queue as ordered steps.",
    confirm: "Decompose",
    requireText: true,
  },
  reflect: { title: "Reflect", label: "What did you notice or conclude?", confirm: "Save", requireText: false },
  new: { title: "New context", label: "What problem do you want to focus on?", confirm: "Create context", requireText: true },
};
const composerCopy = computed(() => COPY[composer.mode]);
const canConfirm = computed(() => !composerCopy.value.requireText || composer.value.trim().length > 0);

function openComposer(mode) {
  composer.mode = mode;
  composer.value = "";
  composer.open = true;
  nextTick(() => composerField.value?.focus?.());
}
function confirmComposer() {
  if (!canConfirm.value) return;
  bankElapsed();
  if (composer.mode === "drill") {
    // Several lines queue an ordered plan; a single line is one sub-focus.
    const steps = stepsFromText(composer.value);
    if (steps.length > 1) runStore.planSteps({ steps });
    else runStore.drillIntoFocus({ title: composer.value });
  }
  else if (composer.mode === "reflect") {
    // A note on the current focus. It does not complete it or reset the clock.
    runStore.reflectOnFocus({ text: composer.value });
    composer.open = false;
    return;
  }
  else if (composer.mode === "new") runStore.newContext({ title: composer.value });
  composer.open = false;
  restartTimer();
}

/** Resolve the current focus right away. Any reflection was recorded separately. */
function handleResolve() {
  bankElapsed();
  const takeaway = runStore.currentResult ?? "";
  if (runStore.depth === 1) {
    closure.title = runStore.currentFocus;
    closure.takeaway = takeaway;
    closure.elapsed = timerFormatted.value;
    closure.open = true;
    const ctx = runStore.activeContext;
    dropAwaitingOfActiveFrame();
    runStore.resolveFocus({ result: takeaway });
    handoff.reportEnd(ctx, { outcome: "resolved", text: takeaway });
  } else {
    dropAwaitingOfActiveFrame();
    runStore.resolveFocus({ result: takeaway });
  }
  restartTimer();
}

function openReflect() {
  openComposer("reflect");
  composer.value = runStore.currentResult ?? "";
}

const showStepSources = computed(
  () =>
    composer.mode === "drill" &&
    !awaiting.value &&
    (handoff.canPickSteps.value || handoff.canDecomposeElsewhere.value),
);

// Ask another tool for steps for the current focus: "pick" a workflow, or
// "decompose" it in ThinkPad. The answer comes back to this context either way.
// Navigating away unmounts this page, which banks the elapsed time itself.
function handleAskForSteps(kind) {
  const ctx = runStore.activeContext;
  const frame = runStore.activeFrame;
  if (!ctx || !frame || awaiting.value) return;
  const args = { focus: frame.title, frameId: frame.id, breadcrumb: runStore.breadcrumb };
  const sent = kind === "pick" ? handoff.sendPickSteps(args) : handoff.sendDecompose(args);
  if (!sent) return;
  runStore.setAwaitingHandoff({ id: ctx.id, handoffId: sent.id });
  composer.open = false;
  router.push(sent.route);
}
function handleOpenAwaiting() {
  const route = handoff.routeForAwaiting(runStore.activeContext?.awaitingHandoffId);
  if (route) router.push(route);
}
function handleCancelAwaiting() {
  handoff.cancelAwaiting(runStore.activeContext?.awaitingHandoffId);
  clearAwaiting();
}
function handleStartPlan(steps) {
  bankElapsed();
  runStore.planSteps({ steps, tag: awaiting.value?.tag ?? null });
  clearAwaiting();
  restartTimer();
}
function handleJumpToStep(index) {
  bankElapsed();
  runStore.jumpToStep({ index });
  restartTimer();
}
function handleStartStep(index) {
  bankElapsed();
  runStore.startStep({ index });
  restartTimer();
}

function handleStart(title) {
  runStore.newContext({ title });
  restartTimer();
}
function handleStartHandoff() {
  const seed = handoff.accept();
  if (!seed) return;
  runStore.newContext({
    title: seed.request.text,
    notes: seed.request.context.join(" › "),
    origin: seed.origin,
    handoffId: seed.handoffId,
  });
  // Started from a workflow (a routine): its steps become the plan, on step 1.
  if (seed.request.steps?.length) runStore.planSteps({ steps: seed.request.steps, tag: seed.request.tag });
  restartTimer();
}

/** Finish the running decision step with its chosen output. */
function handleDecide(choice) {
  bankElapsed();
  runStore.decideStep({ choice });
  restartTimer();
}

/** Keep the current plan's steps as a reusable workflow (opens its editor). */
function handleSaveAsWorkflow() {
  const plan = runStore.activePlan;
  if (!plan) return;
  const route = handoff.sendSaveSteps({ title: plan.title, steps: plan.steps, frameId: plan.frameId });
  if (route) router.push(route);
}
function handleBackToBoard() {
  bankElapsed();
  runStore.deactivate();
}
function handleSwitch(id) {
  bankElapsed();
  runStore.switchContext(id);
  restartTimer();
}
function openNewContext() {
  composer.mode = "new";
  composer.value = "";
  composer.open = true;
  nextTick(() => composerField.value?.focus?.());
}
// Leaving the focus that asked another tool for steps (Back, or resolving it
// without them) ends that ask; otherwise the steps would land on its parent.
function dropAwaitingOfActiveFrame() {
  const ctx = runStore.activeContext;
  const frame = runStore.activeFrame;
  if (!ctx?.awaitingHandoffId || !frame) return;
  if (handoff.askerOf(ctx.awaitingHandoffId) !== String(frame.id)) return;
  handoff.cancelAwaiting(ctx.awaitingHandoffId);
  runStore.setAwaitingHandoff({ id: ctx.id, handoffId: null });
}
function handleDiscardPlan() {
  bankElapsed();
  runStore.discardPlan();
  restartTimer();
}
function handleAbandon() {
  bankElapsed();
  dropAwaitingOfActiveFrame();
  runStore.abandonFocus();
  restartTimer();
}
function handleStopAside() {
  bankElapsed();
  runStore.parkActiveContext();
  restartTimer();
}
function handleCloseContext() {
  bankElapsed();
  // Whatever this context was still waiting on is no longer wanted.
  handoff.cancelAwaiting(runStore.activeContext?.awaitingHandoffId);
  handoff.reportEnd(runStore.activeContext, { outcome: "abandoned" });
  runStore.endActiveContext();
}
function handleUpdateWaitingOn({ id, reason }) {
  runStore.setWaitingOn({ id, reason });
}

// Stop the clock whenever no context is active (stopped / ended / stepped off).
watch(
  () => runStore.hasFocus,
  (has) => {
    if (!has) {
      pause();
      reset();
      focusUi.expanded = false;
    }
  },
);
// While a session runs the app shell hides launcher chrome (App.vue reads this).
watch(
  () => runStore.hasFocus,
  (has) => {
    focusUi.sessionActive = has;
  },
  { immediate: true },
);
</script>

<template>
  <div class="session-runner">
    <!-- Chrome band: the one place mounted in EVERY state and both hosts, so
         it can carry the view toggle (the rail and the board are each hidden
         in some state) and give "back to the board" a home. -->
    <div
      v-if="runStore.isLoaded && runStore.hasContexts && !focusUi.expanded"
      class="session-runner__bar"
    >
      <button
        v-if="runStore.hasFocus"
        type="button"
        class="session-runner__bar-back"
        title="Step off this context without changing it"
        @click="handleBackToBoard"
      >
        <v-icon icon="mdi-arrow-left" size="16" />
        <span>{{ isStackView ? "Board" : "Contexts" }}</span>
      </button>

      <v-spacer />

      <!-- The icon names the view you'd switch TO; the label says so outright. -->
      <button
        type="button"
        class="session-runner__bar-action"
        :aria-label="isStackView ? 'Switch to the context rail' : 'Switch to the stack board'"
        :title="isStackView ? 'Rail view' : 'Stack view'"
        @click="focusUi.toggleViewMode()"
      >
        <v-icon :icon="isStackView ? 'mdi-view-list-outline' : 'mdi-view-column-outline'" size="16" />
      </button>
    </div>

    <div
      class="session-runner__stage"
      :class="{
        'session-runner__stage--railed': !isStackView && runStore.hasContexts,
        'session-runner__stage--paneled': showTrailPanel,
      }"
    >
      <ContextRail
        v-if="!isStackView && runStore.hasContexts && !focusUi.expanded"
        :contexts="runStore.contextList"
        @switch="handleSwitch"
        @new="openNewContext"
        @update-waiting-on="handleUpdateWaitingOn"
      />

      <!-- Left of the card, where the rail sits in the other view: the stack
           reads top-left, the same direction a board column grows. Mutually
           exclusive with ContextRail (rail view vs. stack view). -->
      <ContextTrail
        v-if="showTrailPanel"
        :cards="trailCards"
        :resolved="runStore.currentResolved"
        :plan="runStore.activePlan"
        :can-save="handoff.canSaveSteps.value"
        @jump="handleJumpToStep"
        @save-workflow="handleSaveAsWorkflow"
        @discard-plan="handleDiscardPlan"
      />

      <div class="session-runner__main">
        <!-- Waits for load: loadContexts replaces `contexts`, which would drop a context started earlier. -->
        <HandoffReadyCard
          v-if="runStore.isLoaded && handoff.pending.value"
          :title="handoff.pending.value.text"
          :notes="handoff.pending.value.context.join(' › ')"
          :step-count="handoff.pending.value.steps?.length ?? 0"
          @start="handleStartHandoff"
          @dismiss="handoff.dismiss"
        />
        <FocusComposer v-else-if="runStore.isLoaded && !runStore.hasContexts" @submit="handleStart" />

        <!-- Keyed on the active FRAME, so completing or decomposing swaps the
             card: the one you finished lifts away and the level above settles
             into its place. This is where the stack pops in front of you —
             the board is unmounted while a card is up, so a transition there
             would never be seen. -->
        <Transition v-else-if="runStore.hasFocus" name="focus-pop" mode="out-in">
          <SessionPromptCard
            :key="runStore.activeFrame?.id"
            :focus="runStore.currentFocus"
            :result="runStore.currentResult"
            :timer-formatted="timerFormatted"
            :depth="runStore.depth"
            :breadcrumb="runStore.breadcrumb"
            :resolved="runStore.currentResolved"
            :expanded="focusUi.expanded"
            :waiting-on="runStore.activeContext?.waitingOn ?? ''"
            :notes="runStore.activeContext?.notes ?? ''"
            :awaiting-tool="awaitingTool"
            :plan="runStore.activePlan"
            @start-step="handleStartStep"
            @drill="openComposer('drill')"
            @resolve="handleResolve"
            @reflect="openReflect"
            @decide="handleDecide"
            @abandon="handleAbandon"
            @stop="handleStopAside"
            @send="sendText = runStore.currentFocus"
            @close="handleCloseContext"
            @toggle-expand="focusUi.expanded = !focusUi.expanded"
            @dismiss-waiting-on="runStore.clearWaitingOn({ id: runStore.activeContextId })"
            @open-awaiting="handleOpenAwaiting"
            @cancel-awaiting="handleCancelAwaiting"
          />
        </Transition>

        <!-- Nothing active: in stack view the board IS the picker; in rail view
             the rail is, so the main area just explains itself. -->
        <ContextBoard
          v-else-if="runStore.isLoaded && isStackView"
          :columns="runStore.contextBoard"
          @switch="handleSwitch"
          @new="openNewContext"
          @update-waiting-on="handleUpdateWaitingOn"
        />

        <div v-else-if="runStore.isLoaded" class="session-runner__pick">
          <p class="session-runner__pick-title">No context selected</p>
          <p class="session-runner__pick-hint text-medium-emphasis">
            Choose one from the rail, or create a new context.
          </p>
          <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" @click="openNewContext">
            New context
          </v-btn>
        </div>
      </div>
    </div>

    <v-snackbar
      v-model="closure.open"
      :timeout="4500"
      location="bottom"
      color="success"
      variant="tonal"
    >
      <div class="closure-line">
        <v-icon icon="mdi-check-circle" size="18" class="me-2" />
        <span>Resolved: {{ closure.title }}<span class="closure-elapsed"> · {{ closure.elapsed }}</span></span>
      </div>
      <div v-if="closure.takeaway" class="closure-takeaway">
        <v-icon icon="mdi-subdirectory-arrow-right" size="14" class="me-1" />{{ closure.takeaway }}
      </div>
    </v-snackbar>

    <DecomposeReturnDialog
      :open="returnOpen"
      :source-name="awaiting?.sourceName ?? ''"
      :parent-focus="runStore.currentFocus"
      :sub-focuses="awaiting?.steps ?? []"
      @start="handleStartPlan"
      @dismiss="clearAwaiting"
    />

    <v-dialog v-model="composer.open" max-width="520" scrim="rgba(0,0,0,0.35)">
      <v-card rounded="lg">
        <v-card-title class="px-6 pt-6 pb-1">{{ composerCopy.title }}</v-card-title>
        <v-card-text class="px-6 py-3">
          <v-textarea
            ref="composerField"
            v-model="composer.value"
            :label="composerCopy.label"
            variant="outlined"
            rows="2"
            auto-grow
            hide-details
            @keydown.enter.exact.prevent="confirmComposer"
          />
          <p v-if="composerCopy.hint" class="composer-hint">{{ composerCopy.hint }}</p>
          <div v-if="showStepSources" class="composer-sources">
            <span class="composer-sources__label">Or get steps from</span>
            <v-btn
              v-if="handoff.canPickSteps.value"
              size="small"
              variant="tonal"
              prepend-icon="mdi-format-list-numbered"
              @click="handleAskForSteps('pick')"
            >
              A workflow
            </v-btn>
            <v-btn
              v-if="handoff.canDecomposeElsewhere.value"
              size="small"
              variant="tonal"
              prepend-icon="mdi-notebook-outline"
              @click="handleAskForSteps('decompose')"
            >
              Think it through in ThinkPad
            </v-btn>
          </div>
        </v-card-text>
        <v-card-actions class="px-6 pb-5">
          <v-spacer />
          <v-btn variant="text" @click="composer.open = false">Cancel</v-btn>
          <v-btn color="primary" variant="flat" :disabled="!canConfirm" @click="confirmComposer">
            {{ composerCopy.confirm }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
    <SendSheet :text="sendText" from="focus" @close="sendText = ''" />
</template>

<style scoped>
/* Self-contained layout — deliberately NOT piggybacking on MainLayout's
   pad-coupled `isSessionRoute` styling. A slim chrome bar on top, then the
   stage: rail (left) + centered main in rail view, or the board filling main
   in stack view. */
.session-runner {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  width: 100%;
  height: 100%;
  min-height: 0;
  min-width: 0;
}

.session-runner__bar {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 8px;
  height: 36px;
  padding: 0 8px 0 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.session-runner__bar-back,
.session-runner__bar-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-family: var(--font-sans);
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease;
}

.session-runner__bar-back {
  gap: 4px;
  height: 26px;
  padding: 0 8px 0 5px;
  font-size: 0.8rem;
  font-weight: 600;
}

.session-runner__bar-action {
  width: 26px;
  height: 26px;
}

.session-runner__bar-back:hover,
.session-runner__bar-action:hover {
  background: rgba(var(--v-theme-on-surface), 0.08);
  color: rgb(var(--v-theme-on-surface));
}

.session-runner__bar-back:focus-visible,
.session-runner__bar-action:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 1px;
}

.session-runner__stage {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
}

.session-runner__stage--railed,
.session-runner__stage--paneled {
  flex-direction: row;
  align-items: stretch;
}

/* ONE place owns the trail-panel breakpoint. The side panel and the card's
   inline `.srun-trail` must flip together: with the panel up the inline trail
   is pure duplication, and with it hidden the trail is the only orientation
   left. A container query cannot READ a custom property — `@container
   (min-width: var(--x))` is a parse error that drops the whole block — but it
   CAN set one, and custom properties inherit straight through scoped-CSS
   boundaries. So both components just read the answer. */
/* Narrow (a phone): the panel is not hidden, it sits under the card, so the
   plan's steps can still be seen, switched and discarded by tap. */
.session-runner__stage--paneled {
  --focus-trail-panel: flex;
  --focus-trail-inline: block;
  flex-direction: column;
}

.session-runner__stage--paneled :deep(.ctx-trail) {
  order: 2;
  flex: 0 1 auto;
  width: 100%;
  max-height: 40%;
  border-inline-end: 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

/* 440px, NOT the ~620 this started at. Two reasons: the panel became a plain
   text list (170px floor) instead of a 248px deck of cards, and a default
   Focus widget cell is only ~608px on a 1280px screen — a 620 gate hid the
   panel in the exact place it most needs to appear, missing by 12px. Keep a
   wide margin here; a marginal threshold fails silently. */
@container (min-width: 440px) {
  .session-runner__stage--paneled {
    --focus-trail-panel: flex;
    --focus-trail-inline: none;
    flex-direction: row;
  }

  .session-runner__stage--paneled :deep(.ctx-trail) {
    order: 0;
    flex: 0 0 var(--ctx-trail-width);
    width: var(--ctx-trail-width);
    max-height: none;
    border-top: 0;
    border-inline-end: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }

  /* Gutter between the card's elevation-4 shadow and the panel's rule. Inside
     the query so the narrow, un-paneled case keeps the full width. */
  .session-runner__stage--paneled .session-runner__main {
    padding-inline: 16px;
  }
}

.session-runner__main {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  overflow-y: auto;
}

.session-runner__pick {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  padding: 24px;
  text-align: center;
}

.session-runner__pick-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.session-runner__pick-hint {
  margin: 0;
  font-size: 0.95rem;
  max-width: 28rem;
}

/* The stack pop. Decompose pushes a card in below the current one and resolve
   pops it back off, so the leaving card lifts UP and out (back under its
   parent) and the arriving one settles down into the vacated place. `out-in`
   keeps them from overlapping — you see one card at a time, like a real deck.
   These class names land on SessionPromptCard's root, which carries this
   file's scope id as the child component root. */
.focus-pop-enter-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.focus-pop-leave-active {
  transition: opacity 0.14s ease, transform 0.14s ease;
}

.focus-pop-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.985);
}

.focus-pop-leave-to {
  opacity: 0;
  transform: translateY(-16px) scale(0.97);
}

@media (prefers-reduced-motion: reduce) {
  .focus-pop-enter-active,
  .focus-pop-leave-active {
    transition: none;
  }
}

.composer-sources {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
}

.composer-sources__label {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.composer-hint {
  margin: 8px 2px 0;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.closure-line {
  display: flex;
  align-items: center;
  font-weight: 600;
}

.closure-elapsed {
  font-weight: 400;
  opacity: 0.75;
}

.closure-takeaway {
  display: flex;
  align-items: flex-start;
  margin-top: 4px;
  font-size: 0.85rem;
  opacity: 0.85;
}

/* Container query, not media query: the runner lives both full-route and in a
   dashboard widget cell, so "narrow" means MY box, not the screen. The nearest
   container is the widget shell body or the standalone route shell. 560px ≈
   rail (268px) + minimum usable card; below it the rail stacks on top.
   Stack view never matches: the board's answer to "narrow" is shrink-and-scroll
   its columns, not stack vertically. */
@container (max-width: 560px) {
  .session-runner__stage--railed {
    flex-direction: column;
  }
}

/* Mobile-first: comfortable tap targets for the bar on phones. */
@media (max-width: 600px) {
  .session-runner__bar-back,
  .session-runner__bar-action {
    min-height: 40px;
    min-width: 40px;
  }
}
</style>
