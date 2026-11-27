import { computed, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { useHandoffStore } from "../../handoff/handoffStore.js";
import { HANDOFF_QUERY_PARAM, routeForTool } from "../../handoff/toolRegistry.js";
import { usePadStore } from "../store/padStore";
import { itemsFromDraft } from "../domain/decomposeReturn.js";
import { formTextFromSteps } from "../domain/formFromSteps.js";

/**
 * ThinkPad as a receiver of "think this through" (roadmap §4.2, `want: "think"`).
 * Another tool sends a request with only its id in the URL. This opens a pad
 * titled with the request's `text`, binds the request to that pad so it can be
 * found again, and, while that pad is on screen, offers a way to reply with the
 * steps you wrote. Imports only the shared channel, never another tool.
 */
export function useDecomposeHandoff() {
  const route = useRoute();
  const router = useRouter();
  const store = useHandoffStore();
  store.hydrate();
  const padStore = usePadStore();
  const { currentPadId, isLoaded, pads } = storeToRefs(padStore);

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
  // request opens a new pad. One already accepted and still unanswered (the
  // "open" link back from the sender) reopens the pad it was bound to.
  watch(
    [queryId, isLoaded],
    ([id, loaded]) => {
      if (!id || !loaded) return;
      const fresh = store.peek(id, "thinkpad");
      if (fresh) {
        const pad = padStore.newPad({ outcome: fresh.text });
        if (!fresh.oneWay && fresh.steps?.length) {
          // A workflow run: written out as a document, a heading per step. The
          // sender waits on nothing, so the request is answered on arrival.
          padStore.setPadText({ text: formTextFromSteps(fresh.steps) });
          store.answer(id, "thinkpad", { outcome: "resolved", notes: ["Written out as a document in a new pad."] });
        } else {
          // A one-way Send, or a request to think it through: the pad is the
          // work, and the request is bound to it so it can be found and settled.
          store.accept(id, "thinkpad", pad.id);
        }
      } else {
        const known = store.get(id, "thinkpad");
        if (known?.to.ref && !known.reply) padStore.activatePad(known.to.ref);
      }
      stripQuery();
    },
    { immediate: true },
  );

  // A request is answered even when its pad is gone: deleting the pad that
  // was opened for it ends the request as abandoned, so the asker stops waiting.
  watch(
    [isLoaded, () => pads.value.map((p) => p.id).join("|")],
    ([loaded]) => {
      if (!loaded) return;
      const ids = new Set(pads.value.map((p) => p.id));
      store.settleAccepted("thinkpad", (h) => !!h.to.ref && ids.has(h.to.ref));
    },
    { immediate: true },
  );

  // The mirror case: a request ThinkPad sent from a thread stops when that
  // thread (or its pad) is gone, so nothing keeps waiting on its behalf.
  function threadIds(list) {
    const ids = new Set();
    const visit = (t) => { ids.add(t.id); (t.subThreads ?? []).forEach(visit); };
    for (const pad of list) (pad.threads ?? []).forEach(visit);
    return ids;
  }
  watch(
    [isLoaded, pads],
    ([loaded]) => {
      if (!loaded) return;
      if (!store.waitingFrom("thinkpad").length) return;
      const alive = threadIds(pads.value);
      store.cancelOrphans("thinkpad", (h) => alive.has(h.replyTo.ref));
    },
    { immediate: true },
  );

  /** The unanswered request attached to the pad on screen, or null. */
  const open = computed(() => (currentPadId.value ? store.openFor("thinkpad", currentPadId.value) : null));

  function minutesSince(iso) {
    const ms = Date.now() - Date.parse(iso ?? "");
    return Number.isFinite(ms) && ms > 0 ? Math.round(ms / 60000) : 0;
  }

  function goBack(handoff) {
    router.push(routeForTool(handoff.replyTo.tool));
  }

  /** Reply with the steps and return to the tool that asked. False when there is nothing to send. */
  function returnSteps(draft) {
    const handoff = open.value;
    const steps = itemsFromDraft(draft);
    if (!handoff || !steps.length) return false;
    const sent = store.reply(handoff.id, {
      outcome: "resolved",
      steps,
      minutes: minutesSince(handoff.consumedAt),
    });
    if (sent) goBack(handoff);
    return sent;
  }

  /** Give up without an answer (an `abandoned` reply) and return to the tool that asked. */
  function drop() {
    const handoff = open.value;
    if (!handoff) return false;
    store.reply(handoff.id, { outcome: "abandoned", minutes: minutesSince(handoff.consumedAt) });
    goBack(handoff);
    return true;
  }

  return { open, returnSteps, drop };
}
