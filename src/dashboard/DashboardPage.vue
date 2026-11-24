<script setup>
// Launcher — the app's front door. It only lists the registered tools and
// opens each one on its own full-screen route; no tool renders inside another.
import { useRouter } from "vue-router";
import { emitAudioEvent } from "../sfx";
import { TOOLS, routeForTool } from "../handoff/toolRegistry";

const router = useRouter();

function openTool(tool) {
  emitAudioEvent(tool.id, "tool", "select");
  router.push(routeForTool(tool.id));
}

function hoverTool(tool) {
  emitAudioEvent(tool.id, "tool", "hover");
}
</script>

<template>
  <v-main>
    <v-container class="py-8" style="max-width: 880px">
      <v-row>
        <v-col v-for="tool in TOOLS" :key="tool.id" cols="12" sm="6">
          <v-card
            class="h-100"
            rounded="lg"
            variant="outlined"
            hover
            :aria-label="`Open ${tool.name}`"
            @click="openTool(tool)"
            @mouseenter="hoverTool(tool)"
          >
            <v-card-item :prepend-icon="tool.icon">
              <v-card-title>{{ tool.name }}</v-card-title>
              <v-card-subtitle class="text-wrap">{{ tool.job }}</v-card-subtitle>
            </v-card-item>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </v-main>
</template>
