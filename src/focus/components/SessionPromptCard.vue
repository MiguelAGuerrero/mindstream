<script setup>
// The authored focus — a centered sticky note. Its content is whatever you
// typed, not a prescribed workflow step. The one move is DECOMPOSE (drill into
// an authored sub-focus); RESOLVE records an optional takeaway on the active
// focus (root or drilled). When drilled you can also go BACK (abandon).
import { computed } from "vue";

const props = defineProps({
  focus: { type: String, default: "" },
  result: { type: String, default: null },
  timerFormatted: { type: String, default: "0:00" },
  depth: { type: Number, default: 1 },
  breadcrumb: { type: Array, default: () => [] },
  resolved: { type: Boolean, default: false },
});

const emit = defineEmits(["drill", "resolve", "abandon", "park", "stop"]);

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
            prepend-icon="mdi-pause-circle-outline"
            @click="emit('park')"
          >
            Park
          </v-btn>
        </template>
        <v-btn
          icon="mdi-close"
          size="small"
          variant="text"
          aria-label="End context"
          @click="emit('stop')"
        />
      </div>

      <!-- the authored focus -->
      <div class="srun-body">
        <p class="srun-eyebrow">{{ resolved ? "RESOLVED" : "FOCUSING ON" }}</p>
        <h2 class="srun-focus">{{ focus }}</h2>
        <p v-if="result" class="srun-result">
          <v-icon size="16" icon="mdi-subdirectory-arrow-right" class="mr-1" />{{ result }}
        </p>
        <p v-if="!resolved" class="srun-timer" aria-live="polite">{{ timerFormatted }}</p>
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

        <v-btn
          class="srun-resolve"
          color="primary"
          variant="flat"
          block
          prepend-icon="mdi-arrow-up-bold"
          @click="emit('resolve')"
        >
          Resolve
        </v-btn>
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

.srun-decompose {
  flex-shrink: 0;
  margin-bottom: 0.6rem;
}

.srun-resolve {
  flex-shrink: 0;
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
