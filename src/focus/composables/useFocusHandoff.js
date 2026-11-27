import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useHandoffStore } from "../../handoff/handoffStore.js";
import { HANDOFF_QUERY_PARAM, WANTS, getTool, toolsFor } from "../../handoff/toolRegistry.js";
import { focusToRequest, stepsFromReply } from "../model/decomposeHandoff.js";

/**
 * Focus's side of the channel (roadmap §4.2).
 *
 * Receiving: reads `/focus?handoff=<id>`, exposes the pending request for the
 * "ready to start" screen, consumes it once on accept/dismiss, and replies when
 * the context resolves or is closed. A missing, consumed or malformed request
 * yields `pending === null` (a plain session), never an error.
 *
 * Sending: asks for steps for the current focus by verb ("think", "choose-steps")
 * and hands a plan over to be kept ("keep"). Focus never names the tool that
 * serves a verb; the registry finds it. Imports only the shared channel.
 */
export function useFocusHandoff() {
  const route = useRoute();
  const router = useRouter();
  const store = useHandoffStore();
  store.hydrate();

  const handoffId = computed(() => {
    const raw = route.query[HANDOFF_QUERY_PARAM];
    const id = Array.isArray(raw) ? raw[0] : raw;
    return typeof id === "string" && id ? id : null;
  });

  /** The request waiting for the user to begin, or null. Peeking never consumes. */
  const pending = computed(() => (handoffId.value ? store.peek(handoffId.value, "focus") : null));

  function stripQuery() {
    const { [HANDOFF_QUERY_PARAM]: _drop, ...rest } = route.query;
    return router.replace({ name: "focus", query: rest });
  }

  /**
   * Accept the pending request. `makeWork(seed)` creates the context for it and
   * returns that context's id, which the request is bound to; a request is
   * never taken without work standing behind it. Returns the seed, or null.
   */
  function accept(makeWork) {
    const h = pending.value;
    if (!h) { stripQuery(); return null; }
    const seed = { request: h, origin: h.replyTo, handoffId: h.id };
    const ref = makeWork(seed);
    const taken = ref != null && store.accept(h.id, "focus", String(ref));
    stripQuery();
    return taken ? seed : null;
  }

  /** "Not now": turn it down, so reload/back cannot bring it back and the asker stops waiting. */
  function dismiss() {
    const id = handoffId.value;
    if (id) store.decline(id, "focus");
    stripQuery();
  }

  /** Reply to the request the context started from. No-op for plain sessions. */
  function reportEnd(ctx, { outcome, text } = {}) {
    if (!ctx?.handoffId) return;
    store.reply(ctx.handoffId, {
      outcome,
      text,
      minutes: Math.round((ctx.spentSeconds || 0) / 60),
    });
  }

  /**
   * Keep requests and contexts in step once contexts are loaded:
   * - a link back to a request already accepted here opens its context
   *   (returns that context's id), instead of a blank runner;
   * - a request whose context is gone is answered as abandoned.
   * @param {Array<{id: number, handoffId?: string}>} contexts
   */
  function reconcile(contexts = []) {
    const byHandoff = new Map(contexts.filter((c) => c.handoffId).map((c) => [c.handoffId, c.id]));
    store.settleAccepted("focus", (h) => byHandoff.has(h.id));
    // And what Focus itself asked for: nothing waits on behalf of a context
    // that is gone or has stopped waiting.
    const awaited = new Set(contexts.map((c) => c.awaitingHandoffId).filter(Boolean));
    store.cancelOrphans("focus", (h) => awaited.has(h.id));
    const id = handoffId.value;
    if (!id || store.peek(id, "focus")) return null;
    stripQuery();
    return byHandoff.get(id) ?? null;
  }

  // --- Sending --------------------------------------------------------------

  const thinker = computed(() => toolsFor(WANTS.THINK)[0] ?? null);
  const chooser = computed(() => toolsFor(WANTS.CHOOSE_STEPS)[0] ?? null);
  const keeper = computed(() => toolsFor(WANTS.KEEP)[0] ?? null);
  /** Something can think a focus through and send steps back. */
  const canDecomposeElsewhere = computed(() => thinker.value != null);
  /** Something can supply saved steps. */
  const canPickSteps = computed(() => chooser.value != null);
  /** Something can keep a plan's steps. */
  const canSaveSteps = computed(() => keeper.value != null);

  // Ask for steps for the current focus. Returns `{ id, route }` for the caller
  // to remember and navigate to, or null when nothing can take it.
  function askForSteps(target, want, { focus, frameId, breadcrumb } = {}) {
    const body = focusToRequest({ focus, breadcrumb });
    if (!target || !body || frameId == null) return null;
    const handoff = store.create({
      replyTo: { tool: "focus", ref: String(frameId) },
      to: { tool: target.id },
      want,
      ...body,
    });
    return handoff ? { id: handoff.id, route: store.routeFor(handoff) } : null;
  }

  /** Ask for the focus to be thought through, with steps sent back. */
  function sendDecompose(args) {
    return askForSteps(thinker.value, WANTS.THINK, args);
  }

  /** Ask for saved steps for the focus. */
  function sendPickSteps(args) {
    return askForSteps(chooser.value, WANTS.CHOOSE_STEPS, args);
  }

  /** Hand a plan's steps over to be kept as a workflow. Returns the route to go to, or null. */
  function sendSaveSteps({ title, steps, frameId } = {}) {
    const target = keeper.value;
    if (!target || frameId == null) return null;
    const handoff = store.create({
      replyTo: { tool: "focus", ref: String(frameId) },
      to: { tool: target.id },
      want: WANTS.KEEP,
      text: title,
      steps,
    });
    return handoff ? store.routeFor(handoff) : null;
  }

  /**
   * Where a request this context sent stands:
   *   null                         nothing awaited
   *   { status: "waiting" }        no reply yet
   *   { status: "ready", steps }   the reply carries steps to work through
   *   { status: "dropped" }        it came back empty or abandoned
   * plus `sourceName` (the receiving tool, for wording) and `tag` (opaque; kept
   * with the plan so runs of the same workflow can be compared later).
   * @param {string|null|undefined} handoffId
   */
  function awaitingState(handoffId) {
    if (!handoffId) return null;
    const sourceName = getTool(store.get(handoffId, "focus")?.to.tool)?.name ?? "";
    const reply = store.replyFor(handoffId, "focus");
    if (!reply) return { status: "waiting", steps: [], sourceName, tag: null };
    const steps = reply.outcome === "abandoned" ? [] : stepsFromReply(reply);
    return steps.length
      ? { status: "ready", steps, sourceName, tag: reply.tag ?? null }
      : { status: "dropped", steps: [], sourceName, tag: null };
  }

  /** Route back to the receiver of a request still being worked on. */
  function routeForAwaiting(handoffId) {
    const h = handoffId ? store.get(handoffId, "focus") : null;
    return h ? store.routeFor(h) : null;
  }

  /** The frame (as a string id) that asked for this request, or null. */
  function askerOf(handoffId) {
    return handoffId ? store.get(handoffId, "focus")?.replyTo?.ref ?? null : null;
  }

  /** Stop waiting: the receiver can no longer accept it, and it ends as abandoned. */
  function cancelAwaiting(handoffId) {
    if (handoffId) store.cancel(handoffId, "focus");
  }

  return {
    pending,
    accept,
    dismiss,
    reconcile,
    reportEnd,
    canDecomposeElsewhere,
    canPickSteps,
    canSaveSteps,
    sendDecompose,
    sendPickSteps,
    sendSaveSteps,
    awaitingState,
    routeForAwaiting,
    cancelAwaiting,
    askerOf,
  };
}
