<script setup>
import { useRouter } from "vue-router";
import { VAppBar } from "vuetify/components";
import { useDisplay } from "vuetify";
import { usePadStore } from "../store/padStore";
import { useSessionUi } from "../composables/useSessionUi";

// compact: render the same actions as a low plain flex row instead of a
// v-app-bar — v-app-bar is a Vuetify layout primitive that only makes sense
// docked directly under a real v-app (the standalone /thinkpad route); a
// dashboard widget cell needs the row form.
// Mobile-first (Revision 14): opaque so the page never shows through when it
// scrolls beneath, and lower on phones to give the page more of the screen.
const { smAndDown } = useDisplay();
const props = defineProps({
  compact: { type: Boolean, default: false },
});

const router = useRouter();
const padStore = usePadStore();
const sessionUi = useSessionUi();

function goHome() {
  router.push({ name: "home" });
}

// Export the pad on screen as a Markdown file (roadmap Phase 4): the draft on
// top, threads nested below. For a local-only tool, this is also the backup.
function exportPad() {
  const text = padStore.currentPadMarkdown;
  const name = (padStore.currentPad?.title || "pad").replace(/[^\w\- ]+/g, "").trim().slice(0, 60) || "pad";
  const url = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.md`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
</script>

<template>
  <component
    :is="props.compact ? 'div' : VAppBar"
    v-bind="props.compact ? {} : { flat: true, color: 'background', elevation: 0, height: smAndDown ? 48 : 68 }"
    :class="props.compact ? 'thinkpad-appbar--compact' : undefined"
  >
    <div class="thinkpad-appbar-content">
      <v-btn
        variant="text"
        prepend-icon="mdi-plus"
        size="small"
        @click="padStore.newBlankPad()"
      >
        New
      </v-btn>
      <v-btn
        variant="text"
        prepend-icon="mdi-folder-open-outline"
        size="small"
        @click="sessionUi.documentPickerOpen = true"
      >
        Open…
      </v-btn>
      <v-btn
        v-if="padStore.currentPad && padStore.currentPadMarkdown.trim()"
        variant="text"
        prepend-icon="mdi-download-outline"
        size="small"
        title="Export this pad as Markdown (also your backup)"
        @click="exportPad"
      >
        Export
      </v-btn>
    </div>
  </component>
</template>

<style scoped>
.thinkpad-appbar-content {
  display: flex;
  align-items: center;
  align-self: stretch;
  gap: 8px;
  flex: 1;
  min-width: 0;
  padding: 0 12px;
}

.thinkpad-appbar--compact {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  height: 40px;
  border-bottom: 1px solid rgba(var(--v-border-color), calc(var(--v-border-opacity) * 0.6));
}

.thinkpad-appbar--compact .thinkpad-appbar-content {
  padding: 0 6px;
}

/* Mobile-first: comfortable tap targets on phones (Revision 14). */
@media (max-width: 600px) {
  .thinkpad-appbar-content :deep(.v-btn) {
    min-height: 40px;
  }
}
</style>
