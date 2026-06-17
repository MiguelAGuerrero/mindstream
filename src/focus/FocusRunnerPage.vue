<script setup>
// The Focus Runner page (route name: "focus"). Authoring is the source.
// Holds many isolated contexts: a left rail to switch between them (click), the
// active one shown center as a sticky note. Decompose / Resolve up / Park open a
// small text composer — no workflow is consulted (deferred). Only this route
// touches the store.
import { computed, reactive, ref, watch, nextTick } from "vue";
import { useSessionRunStore } from "./store/sessionRunStore";
import { useTimer } from "./composables/useTimer";
import { formatElapsed } from "./model/session.js";
import ContextRail from "./components/ContextRail.vue";
import FocusComposer from "./components/FocusComposer.vue";
import SessionPromptCard from "./components/SessionPromptCard.vue";

const runStore = useSessionRunStore();

// Each focus gets a fresh clock; display-only (no auto-advance).
const { value: timerValue, reset, resume, pause } = useTimer(1000);
const timerFormatted = computed(() => formatElapsed(timerValue.value));
function restartTimer() {
  reset();
  resume();
}

// One composer dialog, three modes:
//   'drill'   → author a sub-focus to decompose into (required)
//   'resolve' → author an optional takeaway to fold up
//   'park'    → author an optional "waiting on…" reason, then set aside
const composer = reactive({ open: false, mode: "drill", value: "" });
const composerField = ref(null);

const COPY = {
  drill: { title: "Decompose this focus", label: "What sub-problem do you want to work on?", confirm: "Decompose", requireText: true },
  resolve: { title: "Resolve up", label: "What did you conclude? (optional)", confirm: "Resolve up", requireText: false },
  park: { title: "Park this context", label: "What are you waiting on? (optional)", confirm: "Park", requireText: false },
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
  if (composer.mode === "drill") runStore.drillIntoFocus({ title: composer.value });
  else if (composer.mode === "resolve") runStore.resolveFocus({ result: composer.value });
  else if (composer.mode === "park") runStore.parkActiveContext({ reason: composer.value });
  composer.open = false;
  restartTimer();
}

function handleStart(title) {
  runStore.newContext({ title });
  restartTimer();
}
function handleSwitch(id) {
  runStore.switchContext(id);
  restartTimer();
}
function handleNew() {
  runStore.deactivate(); // step off → composer shows; existing contexts stay in the rail
}
function handleAbandon() {
  runStore.abandonFocus();
  restartTimer();
}
function handleStop() {
  runStore.endActiveContext();
}

// Stop the clock whenever no context is active (parked / ended / stepped off).
watch(
  () => runStore.hasFocus,
  (has) => {
    if (!has) {
      pause();
      reset();
    }
  },
);
</script>

<template>
  <div class="session-runner" :class="{ 'session-runner--railed': runStore.hasContexts }">
    <ContextRail
      v-if="runStore.hasContexts"
      :contexts="runStore.contextList"
      @switch="handleSwitch"
      @new="handleNew"
    />

    <div class="session-runner__main">
      <FocusComposer v-if="!runStore.hasFocus" @submit="handleStart" />

      <SessionPromptCard
        v-else
        :focus="runStore.currentFocus"
        :result="runStore.currentResult"
        :timer-formatted="timerFormatted"
        :depth="runStore.depth"
        :breadcrumb="runStore.breadcrumb"
        @drill="openComposer('drill')"
        @resolve="openComposer('resolve')"
        @abandon="handleAbandon"
        @park="openComposer('park')"
        @stop="handleStop"
      />
    </div>

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
</template>

<style scoped>
/* Self-contained layout — deliberately NOT piggybacking on MainLayout's
   pad-coupled `isSessionRoute` styling. Rail (left) + centered main. */
.session-runner {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.session-runner--railed {
  flex-direction: row;
}

.session-runner__main {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  overflow-y: auto;
}

@media (max-width: 959px) {
  .session-runner--railed {
    flex-direction: column;
  }
}
</style>
