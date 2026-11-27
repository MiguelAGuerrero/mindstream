<script setup>
// The workspace's front door. Above the tools, "Pick up" lists what each tool
// reports as unfinished (roadmap Phase 4): open threads in ThinkPad, live and
// parked contexts in the runner, and requests still waiting on a reply. Each
// shows its one next step and opens exactly where it left off. Home only
// lists what the tools report; it reads no tool's data itself.
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { emitAudioEvent } from "../sfx";
import { TOOLS, getTool, routeForTool } from "../handoff/toolRegistry";
import { usePadStore } from "../thinkpad/store/padStore";
import { useSessionRunStore } from "../focus/store/sessionRunStore";
import { useHandoffStore } from "../handoff/handoffStore";
import { useShelfStore } from "../shelf/shelfStore";
import SendSheet from "../shelf/SendSheet.vue";

const router = useRouter();
const pads = usePadStore();
const runs = useSessionRunStore();
const handoffs = useHandoffStore();
const shelf = useShelfStore();
const sending = ref(null); // the shelf item being sent on
const undo = ref(null); // { text, run } for the last thing set aside here

onMounted(async () => {
  handoffs.hydrate();
  if (!pads.isLoaded) await pads.loadPads();
  if (!runs.isLoaded) await runs.loadContexts();
});

function waited(iso) {
  const days = Math.round((Date.now() - Date.parse(iso ?? "")) / 86400000);
  if (!Number.isFinite(days) || days < 0) return "";
  return days === 0 ? "today" : days === 1 ? "1 day" : `${days} days`;
}

// Each tool reports its own unfinished work, and with each row how it ends:
// `end` (an action on the reporting store, run from here) or
// `endsAt: "destination"` (the place the row opens has the controls). Home
// adds nothing of its own, so a row cannot be listed without a way to end it
// (src/lifecycle.contract.test.js checks that).
const sources = [
  { store: runs, to: (l) => ({ name: "focus", query: { context: String(l.place.context) } }), meta: (l) => (l.since ? `waiting ${waited(l.since)}` : "") },
  { store: pads, to: (l) => ({ name: "thinkpad", query: { pad: l.place.pad, thread: l.place.thread } }), meta: (l) => l.where },
  { store: handoffs, to: (l) => handoffs.routeFor({ id: l.place.handoff, to: { tool: l.tool } }), meta: (l) => l.where },
];
const loops = computed(() => sources.flatMap(({ store, to, meta }) =>
  store.openLoops.map((l) => ({ ...l, meta: meta(l), to: to(l), store }))));

function endLoop(l) {
  if (!l.end) return;
  l.store[l.end.action](l.end.args);
  if (l.end.undo) {
    undo.value = { text: l.end.done ?? `${l.end.label}: “${l.title}”.`, run: () => l.store[l.end.undo](l.end.args) };
  }
}

function openTool(tool) {
  emitAudioEvent(tool.id, "tool", "select");
  router.push(routeForTool(tool.id));
}
</script>

<template>
  <v-main>
    <v-container class="py-6" style="max-width: 880px">
      <section v-if="loops.length" class="home-loops" aria-label="Pick up">
        <h2 class="home-loops__title">Pick up</h2>
        <ul class="home-loops__list">
          <li v-for="l in loops" :key="`${l.tool}:${l.id}`" class="home-shelf__item">
            <button type="button" class="home-loops__row" @click="router.push(l.to)">
              <v-icon :icon="getTool(l.tool)?.icon ?? 'mdi-circle-small'" size="18" class="home-loops__icon" />
              <span class="home-loops__text">
                <span class="home-loops__name">{{ l.title }}</span>
                <span class="home-loops__next">{{ l.next }}<template v-if="l.meta"> · {{ l.meta }}</template></span>
              </span>
              <v-icon icon="mdi-chevron-right" size="18" class="home-loops__go" />
            </button>
            <v-btn v-if="l.end" icon="mdi-close" size="small" variant="text" :aria-label="l.end.label" :title="l.end.label" @click="endLoop(l)" />
          </li>
        </ul>
      </section>

      <section v-if="shelf.items.length" class="home-loops" aria-label="Shelf">
        <h2 class="home-loops__title">Shelf</h2>
        <ul class="home-loops__list">
          <li v-for="item in shelf.items" :key="item.id" class="home-shelf__item">
            <button type="button" class="home-loops__row" @click="sending = item">
              <v-icon icon="mdi-tray-full" size="18" class="home-loops__icon" />
              <span class="home-loops__text">
                <span class="home-loops__name">{{ item.text }}</span>
                <span class="home-loops__next">Send on…<template v-if="getTool(item.from)"> · from {{ getTool(item.from).name }}</template></span>
              </span>
            </button>
            <v-btn icon="mdi-close" size="small" variant="text" aria-label="Remove from the shelf" @click="shelf.remove(item.id)" />
          </li>
        </ul>
      </section>
      <v-snackbar :model-value="!!undo" :timeout="6000" location="bottom" @update:model-value="(v) => { if (!v) undo = null; }">
        {{ undo?.text }}
        <template #actions>
          <v-btn variant="text" color="primary" @click="undo.run(); undo = null">Undo</v-btn>
        </template>
      </v-snackbar>
      <SendSheet :text="sending?.text ?? ''" from="shelf" @sent="sending && shelf.remove(sending.id)" @close="sending = null" />

      <h2 v-if="loops.length || shelf.items.length" class="home-loops__title">Tools</h2>
      <v-row>
        <v-col v-for="tool in TOOLS" :key="tool.id" cols="12" sm="6">
          <v-card class="h-100" rounded="lg" variant="outlined" hover :aria-label="`Open ${tool.name}`" @click="openTool(tool)">
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

<style scoped>
.home-loops { margin-bottom: 24px; }
.home-loops__title {
  margin: 0 0 8px;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
.home-loops__list {
  list-style: none;
  margin: 0;
  padding: 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.home-loops__list li { border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); }
.home-loops__row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 56px;
  padding: 8px 4px;
  border: none;
  background: none;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.home-loops__row:hover .home-loops__name { color: rgb(var(--v-theme-primary)); }
.home-loops__icon { color: rgba(var(--v-theme-on-surface), 0.55); }
.home-loops__text { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.home-loops__name { font-size: 0.95rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.home-loops__next { font-size: 0.8rem; color: rgba(var(--v-theme-on-surface), 0.6); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.home-loops__go { color: rgba(var(--v-theme-on-surface), 0.4); }
.home-shelf__item { display: flex; align-items: center; }
/* The row shares the line with its end button: without this it keeps its full
   width and pushes the button off the right edge of a phone (found by the
   leave-halfway test). */
.home-shelf__item .home-loops__row { flex: 1 1 auto; width: auto; min-width: 0; }
.home-shelf__item .v-btn { flex: 0 0 auto; }
</style>
