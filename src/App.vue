<script setup>
// App shell — global app bar on the launcher; feature layouts own their chrome.
// ThinkPad: thinkpad/ThinkPadLayout, Focus: focus/FocusLayout. Each tool is its
// own full-screen route; the shell only provides storage, theme and settings.
// Provides the app-level focusUi instance (/focus expand mode or a running
// session hides the app bar).

import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { emitAudioEvent } from "./sfx";
import { provideFocusUi } from "./focus/composables/useFocusUi";

const route = useRoute();
const router = useRouter();
const focusUi = provideFocusUi();

const isHomeRoute = computed(() => route.name === "home");
// Hidden on /focus in expand mode and while a focus session runs: the brain
// icon is the only way back to the launcher, so nothing but the session's own
// end/pause controls exits (that route's chrome reads the app-level focusUi).
const showAppBar = computed(
  () => !(route.name === "focus" && (focusUi.expanded || focusUi.sessionActive)),
);
const showPreloader = ref(true);

function goHome() {
  emitAudioEvent("home", "goHome");
  router.push({ name: "home" });
}

</script>

<template>
  <v-responsive class="border rounded" aspect-ratio="1/1">
    <v-app>
      <v-app-bar flat color="surface" :elevation="0" height="68" :model-value="showAppBar">
        <div class="ms-appbar-content">
          <div class="app-icon">
            <v-icon icon="mdi-brain" width="256" height="256" @click="goHome" />
          </div>
          <div class="ms-appbar-right">
            <span class="text-subtitle-1 font-weight-medium">Mindstream</span>
          </div>
        </div>
      </v-app-bar>
      <router-view v-slot="{ Component }">
        <v-fade-transition>
          <component :is="Component" />
        </v-fade-transition>
      </router-view>
    </v-app>
  </v-responsive>
</template>

<style scoped>
.ms-appbar-content {
  display: flex;
  align-items: center;
  align-self: stretch;
  gap: 10px;
  flex: 1;
  min-width: 0;
  padding: 0 12px;
}

.ms-appbar-right {
  display: flex;
  flex-direction: column;
  gap: 0;
}
</style>
