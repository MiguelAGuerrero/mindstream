<script setup>
// The app-wide PWA notices: a new version is ready (tap Reload instead of
// closing and reopening the app), you are offline, and the iPhone install steps.
import { onMounted, onBeforeUnmount } from "vue";
import { useRegisterSW } from "virtual:pwa-register/vue";
import { usePwa, requestPersistentStorage } from "./usePwa";

const { online, iosHelpOpen } = usePwa();

const CHECK_EVERY = 30 * 60 * 1000;
let registration = null;
let timer = null;
const { needRefresh, updateServiceWorker } = useRegisterSW({
  onRegisteredSW(_url, reg) {
    registration = reg;
    if (!reg) return;
    timer = setInterval(() => reg.update(), CHECK_EVERY);
  },
});
// Coming back to the app (phones rarely relaunch it) checks for a new deploy.
function onVisible() {
  if (document.visibilityState === "visible" && navigator.onLine) registration?.update();
}

onMounted(() => {
  requestPersistentStorage();
  document.addEventListener("visibilitychange", onVisible);
});
onBeforeUnmount(() => {
  clearInterval(timer);
  document.removeEventListener("visibilitychange", onVisible);
});
</script>

<template>
  <v-snackbar
    :model-value="needRefresh"
    :timeout="-1"
    location="bottom"
    content-class="ms-raised-notice"
    color="surface-bright"
  >
    A new version of Mindstream is ready.
    <template #actions>
      <v-btn variant="text" @click="needRefresh = false">Later</v-btn>
      <v-btn color="primary" variant="text" @click="updateServiceWorker(true)">Reload</v-btn>
    </template>
  </v-snackbar>

  <div v-if="!online" class="ms-offline" role="status" title="Your pads are saved on this device">
    <v-icon icon="mdi-cloud-off-outline" size="14" />
    Offline
  </div>

  <v-dialog v-model="iosHelpOpen" max-width="360">
    <v-card title="Add Mindstream to your Home Screen">
      <v-card-text>
        <ol class="ms-ios-steps">
          <li>Tap <v-icon icon="mdi-export-variant" size="18" /> <strong>Share</strong> in Safari's toolbar.</li>
          <li>Choose <strong>Add to Home Screen</strong>.</li>
          <li>Tap <strong>Add</strong>. Mindstream then opens full screen and works offline.</li>
        </ol>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" @click="iosHelpOpen = false">Done</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.ms-offline {
  position: fixed;
  /* bottom left: the one corner clear of the bar's buttons, the + button and
     the Write / Reflect bar (which sits to the right) */
  left: 12px;
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  z-index: 2500;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  background: rgb(var(--v-theme-surface-variant));
  color: rgb(var(--v-theme-on-surface-variant));
  pointer-events: none;
  white-space: nowrap;
}
.ms-ios-steps {
  padding-left: 1.2em;
  line-height: 1.8;
}
</style>
