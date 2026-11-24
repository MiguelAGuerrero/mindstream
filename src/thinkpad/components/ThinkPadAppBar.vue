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
  const base = padStore.currentPad?.title?.trim() || (padStore.currentPad?.doc?.text ?? "").trim().split(/\s+/).slice(0, 6).join(" ") || "pad";
  const name = base.replace(/[^\w\- ]+/g, "").trim().slice(0, 60) || "pad";
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
    v-bind="props.compact ? {} : { flat: true, color: 'background', elevation: 0, height: smAndDown ? 44 : 68 }"
    :class="props.compact ? 'thinkpad-appbar--compact' : undefined"
  >
    <!-- Phones: one thin bar. Home, the page's own actions (moved in from the
         page, see ThinkPadPanel), and New / Open / Export under a menu. -->
    <div v-if="smAndDown && !props.compact" class="thinkpad-appbar-content thinkpad-appbar-content--thin">
      <v-btn icon="mdi-brain" variant="text" size="small" title="Home" aria-label="Home" @click="goHome" />
      <div id="thinkpad-bar-host" class="thinkpad-bar-host" />
      <v-menu location="bottom end">
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" icon="mdi-dots-vertical" variant="text" size="small" title="New, open, export" aria-label="More" />
        </template>
        <v-list density="compact" min-width="180">
          <v-list-item prepend-icon="mdi-plus" title="New" @click="padStore.newBlankPad(); sessionUi.newPadDialogOpen = true" />
          <v-list-item prepend-icon="mdi-folder-open-outline" title="Open…" @click="sessionUi.documentPickerOpen = true" />
          <v-list-item
            v-if="padStore.currentPad && padStore.currentPadMarkdown.trim()"
            prepend-icon="mdi-download-outline"
            title="Export as Markdown"
            @click="exportPad"
          />
        </v-list>
      </v-menu>
    </div>
    <div v-else class="thinkpad-appbar-content">
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

.thinkpad-appbar-content--thin {
  gap: 2px;
  padding: 0 2px;
}

.thinkpad-bar-host {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1 1 auto;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
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
