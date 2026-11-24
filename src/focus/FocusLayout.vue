<script setup>
// Focus route shell — full-height column; page owns the runner layout.
import { onUnmounted } from "vue";
import { useFocusUi } from "./composables/useFocusUi";

const focusUi = useFocusUi();

onUnmounted(() => {
  focusUi.expanded = false;
  focusUi.sessionActive = false;
});
</script>

<template>
  <v-main class="focus-main">
    <v-container fluid class="fill-height focus-shell">
      <router-view />
    </v-container>
  </v-main>
</template>

<style scoped>
.focus-main {
  display: flex;
  flex-direction: column;
  /* Pin the route to the viewport so the column is height-DEFINITE. Without
     this nothing above v-main has a definite height (body is display:block,
     height:auto) and Vuetify's v-main is `flex: 1 0 auto`, so the whole chain
     is content-driven — which means `overflow-y: auto` on the rail's list or
     the trail's deck can never engage and a deep stack grows the page instead
     of scrolling inside itself. v-main sits at viewport top and offsets the
     app bar with padding-top, so 100dvh is exactly the right cap.
     Route-only: the widget host takes its height from the grid cell. */
  max-height: 100vh;
  max-height: 100dvh;
  flex: 1 1 auto;
  min-height: 0;
}

.focus-shell {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  padding: 0 !important;
  /* Container for the runner's @container rules on the standalone route
     (the dashboard widget provides its own via the shell body). */
  container-type: inline-size;
}
</style>
