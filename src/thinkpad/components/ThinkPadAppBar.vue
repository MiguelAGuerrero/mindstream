<script setup>
import { useRouter } from "vue-router";
import { usePadStore } from "../store/padStore";
import { useSessionUi } from "../composables/useSessionUi";

const router = useRouter();
const padStore = usePadStore();
const sessionUi = useSessionUi();

function goHome() {
  router.push({ name: "home" });
}
</script>

<template>
  <v-app-bar flat color="transparent" :elevation="0" height="68">
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
    </div>
  </v-app-bar>
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
</style>
