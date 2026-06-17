<script setup>
// Focus route shell — full-height column; page owns the runner layout.
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
  min-height: 0;
}

.focus-shell {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  padding: 0 !important;
}
</style>
