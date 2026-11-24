import { computed, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { useHandoffStore } from "../../handoff/handoffStore.js";
import { HANDOFF_QUERY_PARAM, routeForTool } from "../../handoff/toolRegistry.js";
import { usePadStore } from "../store/padStore";
import { itemsFromDraft } from "../domain/decomposeReturn.js";

/**
 * ThinkPad's side of "decompose this". Another tool sends a task with only a
 * handoff id in the URL. This opens a pad titled from the task, binds the
 * handoff to that pad so it can be found again, and, while that pad is on
 * screen, offers a way to return the steps you wrote. Imports only the shared
 * handoff channel, never another tool.
 */
export function useDecomposeHandoff() {
  const route = useRoute();
  const router = useRouter();
  const store = useHandoffStore();
  store.hydrate();
  const padStore = usePadStore();
  const { currentPadId, isLoaded } = storeToRefs(padStore);

  const queryId = computed(() => {
    const raw = route.query[HANDOFF_QUERY_PARAM];
    const id = Array.isArray(raw) ? raw[0] : raw;
    return typeof id === "string" && id ? id : null;
  });

  function stripQuery() {
    const { [HANDOFF_QUERY_PARAM]: _drop, ...rest } = route.query;
    return router.replace({ name: "thinkpad", query: rest });
  }

  // Arrival. Wait for pads to load so the new pad is not merged away. A fresh
  // handoff opens a new pad. One already accepted and still unanswered (the
  // "open" link back from Focus) reopens the pad it was bound to.
  watch(
    [queryId, isLoaded],
    ([id, loaded]) => {
      if (!id || !loaded) return;
      const fresh = store.peek(id, "thinkpad");
      if (fresh) {
        const accepted = store.consume(id, "thinkpad");
        if (accepted) {
          const pad = padStore.newPad({ outcome: accepted.task.title });
          store.bindTarget(accepted.id, "thinkpad", pad.id);
        }
      } else {
        const known = store.get(id, "thinkpad");
        if (known?.to.ref && !known.result) padStore.activatePad(known.to.ref);
      }
      stripQuery();
    },
    { immediate: true },
  );

  /** The unanswered decompose request attached to the pad on screen, or null. */
  const open = computed(() => (currentPadId.value ? store.openFor("thinkpad", currentPadId.value) : null));

  function minutesSince(iso) {
    const ms = Date.now() - Date.parse(iso ?? "");
    return Number.isFinite(ms) && ms > 0 ? Math.round(ms / 60000) : 0;
  }

  function goBack(handoff) {
    router.push(routeForTool(handoff.from.tool));
  }

  /** Send the steps back and return to the tool that asked. False when there is nothing to send. */
  function returnSteps(draft) {
    const handoff = open.value;
    const items = itemsFromDraft(draft);
    if (!handoff || !items.length) return false;
    const wrote = store.writeResult(handoff.id, {
      status: "completed",
      minutes: minutesSince(handoff.consumedAt),
      output: { items },
    });
    if (wrote) goBack(handoff);
    return wrote;
  }

  /** Give up without an answer and return to the tool that asked. */
  function drop() {
    const handoff = open.value;
    if (!handoff) return false;
    store.writeResult(handoff.id, { status: "abandoned", minutes: minutesSince(handoff.consumedAt) });
    goBack(handoff);
    return true;
  }

  return { open, returnSteps, drop };
}
