<script setup>
// App shell — global app bar on home; feature layouts own their chrome.
// ThinkPad: thinkpad/ThinkPadLayout, Focus: focus/FocusLayout.

import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const isHomeRoute = computed(() => route.name === "home");
const showPreloader = ref(true);

function goHome() {
  router.push({ name: "home" });
}
</script>

<template>
  <v-responsive class="border rounded" aspect-ratio="1/1">
    <v-app>
      <v-app-bar flat color="surface" :elevation="0" height="68">
        <div class="ms-appbar-content">
          <div class="app-icon">
            <v-icon icon="mdi-brain" width="256" height="256" @click="goHome" />
          </div>
          <div class="ms-appbar-right">
            <span class="text-subtitle-1 font-weight-medium">Mindstream</span>
          </div>
        </div>
      </v-app-bar>
      <v-fade-transition>
        <router-view />
      </v-fade-transition>
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
