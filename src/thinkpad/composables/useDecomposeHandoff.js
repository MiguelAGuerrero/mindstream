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
        const accepted = store.consume(id, "thinkpad");
        if (accepted?.oneWay) {
          // A one-way Send: a new pad titled with the text, nothing to send back.
          padStore.newPad({ outcome: accepted.text });
        } else if (accepted?.steps?.length) {
          // A workflow run: written out as a document, a heading per step. The
          // sender waits on nothing, so the request is answered on arrival.
          const pad = padStore.newPad({ outcome: accepted.text });
          padStore.setPadText({ text: formTextFromSteps(accepted.steps) });
          store.reply(accepted.id, { outcome: "resolved", notes: ["Written out as a document in a new pad."] });
          void pad;
        } else if (accepted) {
          const pad = padStore.newPad({ outcome: accepted.text });
          store.bindTarget(accepted.id, "thinkpad", pad.id);
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
      for (const h of store.acceptedBy("thinkpad")) {
        if (!h.to.ref || !ids.has(h.to.ref)) store.reply(h.id, { outcome: "abandoned" });
      }
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
      const sent = store.waitingFrom("thinkpad");
      if (!sent.length) return;
      const alive = threadIds(pads.value);
      for (const h of sent) if (!alive.has(h.replyTo.ref)) store.cancel(h.id, "thinkpad");
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
