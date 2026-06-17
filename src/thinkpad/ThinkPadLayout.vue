<script setup>
import { onUnmounted } from "vue";
import ThinkPadAppBar from "./components/ThinkPadAppBar.vue";
import { useSessionUi } from "./composables/useSessionUi";
import { useThinkPadBootstrap } from "./composables/useThinkPadBootstrap";

// Shell content column max-width (px) — owned by the ThinkPad route layout.
const THINKPAD_PAGE_MAX_WIDTH = 880;

const sessionUi = useSessionUi();

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
      :class="sessionUi.padExpanded ? 'thinkpad-shell--expanded pa-0' : 'pa-4'"
    >
    <ThinkPadAppBar />
      <v-row class="fill-height thinkpad-row" align="stretch">
        <v-col cols="12" md class="fill-height d-flex flex-column thinkpad-content-col">
          <v-container
            fluid
            :max-width="THINKPAD_PAGE_MAX_WIDTH"
            min-height="0"
            class="pa-0 w-100 d-flex flex-column flex-grow-1 h-100 min-h-0 thinkpad-content-wrap mx-auto justify-center flex-grow-1 h-screen h-md-auto"
          >
            <router-view />
          </v-container>
        </v-col>
      </v-row>
    </v-container>
  </v-main>
</template>

<style scoped>
.v-row {
  min-height: 0;
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
    height: 100%;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    justify-content: center;
  }
}
</style>
