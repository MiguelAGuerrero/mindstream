<script setup>
// Focus route shell — scrollable main column; page owns the runner layout.
</script>

<template>
  <v-main class="focus-main pa-4">
    <v-container fluid class="fill-height focus-shell overflow-y-auto">
      <router-view />
    </v-container>
  </v-main>
</template>
