<script setup>
import { useRouter } from "vue-router";
import { VAppBar } from "vuetify/components";
import { usePadStore } from "../store/padStore";
import { useSessionUi } from "../composables/useSessionUi";

// compact: render the same actions as a low plain flex row instead of a
// v-app-bar — v-app-bar is a Vuetify layout primitive that only makes sense
// docked directly under a real v-app (the standalone /thinkpad route); a
// dashboard widget cell needs the row form.
const props = defineProps({
  compact: { type: Boolean, default: false },
});

const router = useRouter();
const padStore = usePadStore();
const sessionUi = useSessionUi();

function goHome() {
  router.push({ name: "home" });
}
</script>

<template>
  <component
    :is="props.compact ? 'div' : VAppBar"
    v-bind="props.compact ? {} : { flat: true, color: 'transparent', elevation: 0, height: 68 }"
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
</style>
