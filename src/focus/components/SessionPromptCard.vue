<script setup>
// The authored focus — a centered sticky note. Its content is whatever you
// typed, not a prescribed workflow step. The one move is DECOMPOSE (drill into
// an authored sub-focus); COMPLETE records an optional takeaway on the active
// focus (root or drilled). When drilled you can also go BACK (abandon).
import { computed, ref } from "vue";

const props = defineProps({
  focus: { type: String, default: "" },
  result: { type: String, default: null },
  timerFormatted: { type: String, default: "0:00" },
  depth: { type: Number, default: 1 },
  breadcrumb: { type: Array, default: () => [] },
  resolved: { type: Boolean, default: false },
  expanded: { type: Boolean, default: false },
  /** Re-entry cue — the reason this context was parked, kept through resume. */
  waitingOn: { type: String, default: "" },
  /** One read-only line of task context (e.g. from a handoff). */
  notes: { type: String, default: "" },
  /** The tool this focus was sent to for steps and has not come back from ("" when none). */
  awaitingTool: { type: String, default: "" },
  /**
   * The ordered plan this card belongs to: `{ steps, index, running }`. `running`
   * means this card IS step `index`; otherwise this card holds the plan and you
   * can start a step.
   */
  plan: { type: Object, default: null },
});

const emit = defineEmits([
  "drill",
  "resolve",
  "abandon",
  "stop",
  "send",
  "close",
  "toggle-expand",
  "dismiss-waiting-on",
  "open-awaiting",
  "cancel-awaiting",
  "start-step",
  "reflect",
  "decide",
]);

/** The decision the current step asks for (only while it is the running step). */
const decision = computed(() => (props.plan?.running && !props.resolved ? props.plan.decision : null));
const answer = ref("");
function submitAnswer() {
  const value = answer.value.trim();
  if (!value) return;
  emit("decide", value);
  answer.value = "";
}

/** This card is the frame that holds a plan, between steps (not one of the steps). */
const holdingPlan = computed(() => !!props.plan && !props.plan.running && !props.resolved);

const isDrilled = computed(() => props.depth > 1);
// The decompose trail excludes the current focus (shown big below it).
const trail = computed(() => props.breadcrumb.slice(0, -1).join("  ›  "));
</script>

<template>
  <div class="srun-wrap">
    <v-card
      class="srun-note"
      :class="{ 'srun-note--resolved': resolved }"
      rounded="lg"
      elevation="4"
    >
      <!-- trail + level controls -->
      <div class="srun-top">
        <div class="srun-trail" :title="trail">{{ trail }}</div>
        <v-spacer />
        <v-btn
          icon="mdi-send-outline"
          size="small"
          variant="text"
          aria-label="Send to…"
          title="Send this focus elsewhere (one-way)"
          @click="emit('send')"
        />
        <v-btn
          :icon="expanded ? 'mdi-arrow-collapse' : 'mdi-arrow-expand'"
          size="small"
          variant="text"
          :aria-label="expanded ? 'Collapse' : 'Expand'"
          @click="emit('toggle-expand')"
        />
        <template v-if="!resolved">
          <v-btn
            v-if="isDrilled"
            size="small"
            variant="text"
            prepend-icon="mdi-arrow-left"
            @click="emit('abandon')"
          >
            Back
          </v-btn>
          <v-btn
            size="small"
            variant="text"
            prepend-icon="mdi-stop-circle-outline"
            @click="emit('stop')"
          >
            Stop
          </v-btn>
        </template>
        <v-btn
          icon="mdi-close"
          size="small"
          variant="text"
          aria-label="End context"
          @click="emit('close')"
        />
      </div>

      <!-- the authored focus -->
      <div class="srun-body">
        <div v-if="!resolved && waitingOn" class="srun-waiting">
          <v-chip
            size="small"
            variant="tonal"
            color="warning"
            prepend-icon="mdi-pause-circle-outline"
            closable
            @click:close="emit('dismiss-waiting-on')"
          >
            Was waiting on: {{ waitingOn }}
          </v-chip>
        </div>
        <div v-if="!resolved && awaitingTool" class="srun-waiting">
          <v-chip
            size="small"
            variant="tonal"
            color="primary"
            prepend-icon="mdi-timer-sand"
            closable
            close-label="Stop waiting"
            @click="emit('open-awaiting')"
            @click:close="emit('cancel-awaiting')"
          >
            Waiting on {{ awaitingTool }} for steps · open
          </v-chip>
        </div>
        <p class="srun-eyebrow">{{ resolved ? "RESOLVED" : "FOCUSING ON" }}</p>
        <h2 class="srun-focus">{{ focus }}</h2>
        <p v-if="notes && !resolved" class="srun-notes text-medium-emphasis text-truncate" :title="notes">{{ notes }}</p>
        <p v-if="result" class="srun-result">
          <v-icon size="16" icon="mdi-subdirectory-arrow-right" class="mr-1" />{{ result }}
        </p>
        <p v-if="!resolved" class="srun-timer" aria-live="polite">{{ timerFormatted }}</p>
        <!-- Only the focus you are on. A plan's steps live in the side panel. -->
        <div v-if="holdingPlan" class="srun-plan">
          <p v-if="plan.allDone" class="srun-plan__label">ALL STEPS DONE</p>
          <v-btn
            v-else
            variant="tonal"
            prepend-icon="mdi-play"
            @click="emit('start-step', plan.index)"
          >
            Continue plan
          </v-btn>
        </div>
        <div v-if="resolved" class="srun-resolved-badge">
          <v-icon size="16" icon="mdi-check-circle" class="mr-1" />Resolved
        </div>
      </div>

      <!-- action buttons — hidden when resolved -->
      <template v-if="!resolved">
        <v-btn
          class="srun-decompose"
          variant="tonal"
          block
          prepend-icon="mdi-arrow-down-circle-outline"
          @click="emit('drill')"
        >
          Decompose
        </v-btn>

        <!-- A decision step finishes by choosing its output, not by Resolve. -->
        <div v-if="decision" class="srun-decide" role="group" aria-label="Decide to continue">
          <p class="srun-decide__label">
            <v-icon size="14" icon="mdi-call-split" class="mr-1" />DECIDE TO CONTINUE
          </p>
          <div v-if="decision.options.length" class="srun-decide__options">
            <v-btn
              v-for="option in decision.options"
              :key="option"
              color="primary"
              variant="tonal"
              class="srun-decide__option"
              @click="emit('decide', option)"
            >
              {{ option }}
            </v-btn>
          </div>
          <form v-else class="srun-decide__free" @submit.prevent="submitAnswer">
            <v-text-field
              v-model="answer"
              label="Your decision"
              variant="outlined"
              density="compact"
              hide-details
            />
            <v-btn type="submit" color="primary" variant="flat" :disabled="!answer.trim()">Decide</v-btn>
          </form>
        </div>

        <div class="srun-resolve-row">
          <v-btn
            v-if="!decision"
            class="srun-resolve"
            color="primary"
            variant="flat"
            prepend-icon="mdi-arrow-up-bold"
            @click="emit('resolve')"
          >
            Resolve
          </v-btn>
          <v-btn
            class="srun-reflect"
            variant="tonal"
            :prepend-icon="result ? 'mdi-pencil-outline' : 'mdi-comment-text-outline'"
            :aria-label="result ? 'Edit reflection' : 'Add a reflection'"
            @click="emit('reflect')"
          >
            Reflect
          </v-btn>
        </div>
      </template>
    </v-card>
  </div>
</template>

<style scoped>
.srun-wrap {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
}

.srun-note {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 460px;
  max-height: 90vh;
  padding: 1.5rem;
  background-color: rgb(var(--v-theme-surface));
  border-top: 4px solid rgb(var(--v-theme-primary));
}

.srun-note--resolved {
  border-top-color: rgb(var(--v-theme-success));
  opacity: 0.85;
}

.srun-top {
  display: flex;
  align-items: center;
  min-height: 32px;
  margin-bottom: 0.5rem;
}

.srun-trail {
  /* Hidden when the ContextTrail panel is showing the same ancestors in full;
     FocusRunnerPage's @container block owns that decision and hands the answer
     down as a custom property. The fallback keeps the trail visible in rail
     view and anywhere the variable was never declared. */
  display: var(--focus-trail-inline, block);
  font-size: 0.8125rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.55);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.srun-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0.5rem 0 1.25rem;
}

.srun-waiting {
  margin-bottom: 0.75rem;
}

.srun-eyebrow {
  font-size: 0.7rem;
  letter-spacing: 0.16em;
  font-weight: 700;
  margin: 0 0 0.4rem;
  color: rgba(var(--v-theme-on-surface), 0.45);
}

.srun-focus {
  font-size: clamp(1.4rem, 4.5vw, 2.4rem);
  line-height: 1.3;
  font-weight: 600;
  margin: 0 0 0.75rem;
  color: rgb(var(--v-theme-on-surface));
}

.srun-notes {
  font-size: 0.9rem;
  margin: -0.35rem 0 0.75rem;
}
.srun-result {
  display: flex;
  align-items: flex-start;
  font-size: 0.9rem;
  margin: 0 0 0.75rem;
  color: rgb(var(--v-theme-primary));
}

.srun-timer {
  font-size: 1rem;
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.55);
}

.srun-plan {
  margin-top: 1rem;
  min-height: 0;
}

.srun-plan__label {
  margin: 0 0 0.35rem;
  font-size: 0.65rem;
  letter-spacing: 0.16em;
  font-weight: 700;
  color: rgba(var(--v-theme-on-surface), 0.45);
}

.srun-decompose {
  flex-shrink: 0;
  margin-bottom: 0.6rem;
}

.srun-decide {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
  margin-bottom: 0.6rem;
}

.srun-decide__label {
  display: flex;
  align-items: center;
  margin: 0;
  font-size: 0.65rem;
  letter-spacing: 0.16em;
  font-weight: 700;
  color: rgba(var(--v-theme-on-surface), 0.55);
}

.srun-decide__options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.srun-decide__option {
  flex: 1 1 auto;
  text-transform: none;
}

.srun-decide__free {
  display: flex;
  gap: 8px;
  align-items: center;
}

.srun-resolve-row {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.srun-resolve {
  flex: 1 1 auto;
}

.srun-reflect {
  flex: 0 0 auto;
  margin-left: auto;
}

.srun-resolved-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.8rem;
  font-weight: 600;
  color: rgb(var(--v-theme-success));
  margin-top: 0.5rem;
}
</style>
