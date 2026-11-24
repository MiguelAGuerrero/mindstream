<script setup>
import { onUnmounted } from "vue";
import ThinkPadAppBar from "./components/ThinkPadAppBar.vue";
import DecomposeHandoffPanel from "./components/DecomposeHandoffPanel.vue";
import { provideSessionUi } from "./composables/useSessionUi";
import { useThinkPadBootstrap } from "./composables/useThinkPadBootstrap";

// Shell content column max-width (px) — owned by the ThinkPad route layout.
const THINKPAD_PAGE_MAX_WIDTH = 880;

// Route-scoped chrome state; the dashboard widget host provides its own.
const sessionUi = provideSessionUi();

useThinkPadBootstrap();

onUnmounted(() => {
  sessionUi.padExpanded = false;
});
</script>

<template>
  <v-main class="thinkpad-main">
    <v-container
      fluid
      class="fill-height thinkpad-shell"
      :class="sessionUi.padExpanded ? 'thinkpad-shell--expanded pa-0' : 'pa-0 pa-sm-4'"
    >
    <ThinkPadAppBar />
      <v-row class="fill-height thinkpad-row" align="stretch">
        <v-col cols="12" md class="fill-height d-flex flex-column thinkpad-content-col">
          <v-container
            fluid
            :max-width="THINKPAD_PAGE_MAX_WIDTH"
            min-height="0"
            class="pa-0 w-100 d-flex flex-column flex-grow-1 h-100 min-h-0 thinkpad-content-wrap mx-auto justify-center flex-grow-1"
          >
            <router-view />
          </v-container>
        </v-col>
        <DecomposeHandoffPanel />
      </v-row>
    </v-container>
  </v-main>
</template>

<style scoped>
.v-row {
  min-height: 0;
}

.thinkpad-shell {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.thinkpad-row {
  flex: 1 1 auto;
  min-height: 0;
}

/* Phones and tablets: the page fills the screen below the app bars, not a
   full screen height pushed down beneath them (which forced ~100px of scroll).
   dvh also accounts for the browser's own toolbars. */
@media (max-width: 959.98px) {
  .thinkpad-content-wrap {
    height: calc(100dvh - var(--v-layout-top, 0px));
  }
}

@media (min-width: 960px) {
  .thinkpad-main {
    height: 100%;
    overflow: hidden;
  }

  .thinkpad-shell {
    height: 100%;
    overflow: hidden;
  }

  .thinkpad-row {
    min-height: 0;
    overflow: hidden;
  }

  .thinkpad-content-col {
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .thinkpad-content-wrap {
    flex: 1 1 auto;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    align-items: stretch;
    justify-content: flex-start;
  }

  .thinkpad-content-wrap > :deep(*) {
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
  }
}
</style>
