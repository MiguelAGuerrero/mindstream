<script setup>
// "Send to…" (roadmap §4.3): one-way. The text lands in the chosen tool as a
// new item (a pad, a context) or on the shelf, and nothing comes back. The
// destinations come from the registry, so no tool names another.
import { computed } from "vue";
import { useRouter } from "vue-router";
import { TOOLS, WANTS, serves } from "../handoff/toolRegistry.js";
import { useHandoffStore } from "../handoff/handoffStore.js";
import { useShelfStore } from "./shelfStore.js";

const props = defineProps({
  /** The text to send; the sheet is open while it is non-empty. */
  text: { type: String, default: "" },
  /** The sending tool's id (left out of the destinations), or "shelf". */
  from: { type: String, default: null },
});
const emit = defineEmits(["close", "sent"]);
const router = useRouter();
const handoffs = useHandoffStore();
const shelf = useShelfStore();

const VERBS = [
  { want: WANTS.THINK, label: (t) => `Think it through in ${t.name}` },
  { want: WANTS.STEP_THROUGH, label: (t) => `Work on it in ${t.name}` },
];
const destinations = computed(() => {
  const out = [];
  for (const tool of TOOLS) {
    if (tool.id === props.from) continue;
    const verb = VERBS.find((v) => serves(tool.id, v.want));
    if (verb) out.push({ id: tool.id, icon: tool.icon, label: verb.label(tool), want: verb.want });
  }
  if (props.from !== "shelf") out.push({ id: "shelf", icon: "mdi-tray-arrow-down", label: "Put it on the shelf", want: null });
  return out;
});

function send(dest) {
  if (dest.id === "shelf") {
    shelf.add({ text: props.text, from: props.from });
    emit("sent", dest);
    emit("close");
    return;
  }
  handoffs.hydrate();
  const h = handoffs.create({ oneWay: true, to: { tool: dest.id }, want: dest.want, text: props.text });
  if (h) emit("sent", dest); // before close, so the sender still knows what was sent
  emit("close");
  if (h) router.push(handoffs.routeFor(h));
}
</script>

<template>
  <v-dialog :model-value="!!text" max-width="480" scrim="rgba(0,0,0,0.35)" @update:model-value="(v) => { if (!v) emit('close'); }">
    <v-card rounded="lg">
      <v-card-title class="px-6 pt-6 pb-1">Send to…</v-card-title>
      <v-card-text class="px-6 py-3">
        <blockquote class="send-sheet__text">{{ text }}</blockquote>
        <button v-for="d in destinations" :key="d.id" type="button" class="send-sheet__dest" @click="send(d)">
          <v-icon :icon="d.icon" size="18" />
          <span>{{ d.label }}</span>
        </button>
      </v-card-text>
      <v-card-actions class="px-6 pb-5">
        <v-spacer />
        <v-btn variant="text" @click="emit('close')">Cancel</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.send-sheet__text {
  margin: 0 0 14px;
  padding-inline-start: 0.85rem;
  border-inline-start: 3px solid rgba(var(--v-theme-primary), 0.5);
  font-style: italic;
  max-height: 6.5em;
  overflow: hidden;
}
.send-sheet__dest {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 48px;
  margin-bottom: 6px;
  padding: 8px 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.send-sheet__dest:hover { border-color: rgb(var(--v-theme-primary)); }
</style>
