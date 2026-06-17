<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

const appReady = ref(false);

onMounted(() => {
  requestAnimationFrame(() => {
    appReady.value = true;
  });
});

const tools = [
  {
    name: "ThinkPad",
    icon: "mdi-notebook",
    route: "thinkpad",
  },
  {
    name: "Focus",
    icon: "mdi-timer",
    route: "focus",
  },
];
</script>

<template>
  <v-main>
    <v-container fluid>
      <v-row gap="16" class="mt-6">
    <v-col
      v-for="(tool, i) in tools"
      :key="tool.route"
      cols="12"
      md="2"
      class="pa-0 d-flex flex-column align-center ms-tool"
      :class="{ 'ms-tool--visible': appReady }"
      :style="{ transitionDelay: `${i * 0.2}s` }"
      @click="router.push({ name: tool.route })"
    >
      <span class="d-flex flex-column align-center justify-center ms-tool-icon rounded">
        <v-icon :icon="tool.icon" width="64" height="64" />
      </span>
      <span class="d-flex flex-column align-center justify-center pa-4">
        {{ tool.name }}
      </span>
    </v-col>
      </v-row>
    </v-container>
  </v-main>
</template>

<style scoped>
.ms-tool {
  aspect-ratio: 1/1;
  max-width: 128px;
  min-width: 64px;
  opacity: 0;
  scale: 0;
  transition: opacity 0.3s ease-in-out, scale 0.3s ease-in-out;
}

.ms-tool--visible {
  opacity: 1;
  scale: 1;
}

.ms-tool-icon {
  background: linear-gradient(to bottom, rgba(var(--v-theme-surface), 1), rgba(var(--v-theme-surface-variant), 1));
  border: 2px solid rgba(var(--v-theme-surface-variant), 1);
  box-shadow: 0 0 4px 0 rgba(0, 0, 0, 1);
  aspect-ratio: 1/1;
  min-width: 64px;
  width: 50%;
}

.ms-tool-icon:hover {
  transition: transform 0.3s ease-in-out;
  transform: scale(1.05);
  cursor: pointer;
}

.ms-tool-icon:focus-visible {
  outline: 2px solid rgba(var(--v-theme-primary), 1);
}
</style>
