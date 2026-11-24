import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useHandoffStore } from "../../handoff/handoffStore.js";
import { HANDOFF_QUERY_PARAM, INTENTS, getTool, toolsAccepting } from "../../handoff/toolRegistry.js";
import { focusToDecomposeTask, subFocusesFromResult } from "../model/decomposeHandoff.js";

/**
 * Focus's side of the handoff channel. Reads `/focus?handoff=<id>`, exposes
 * the pending task for the "ready to start" screen, consumes it once on
 * accept/dismiss, and reports the session result back through the store.
 * A missing, consumed, malformed or not-accepted handoff yields `pending ===
 * null` (a plain session) and never an error. Imports only the shared
 * handoff channel — never another tool.
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

  /** The handoff waiting for the user to begin, or null. Peeking never consumes. */
  const pending = computed(() => (handoffId.value ? store.peek(handoffId.value, "focus") : null));

  function stripQuery() {
    const { [HANDOFF_QUERY_PARAM]: _drop, ...rest } = route.query;
    return router.replace({ name: "focus", query: rest });
  }

  /** Consume the pending handoff; returns the session seed, or null if it is gone. */
  function accept() {
    const id = handoffId.value;
    const h = id ? store.consume(id, "focus") : null;
    stripQuery();
    if (!h) return null;
    return { task: h.task, origin: h.from, handoffId: h.id };
  }

  /** "Not now": consume without starting, so reload/back cannot bring it back. */
  function dismiss() {
    const id = handoffId.value;
    if (id) store.consume(id, "focus");
    stripQuery();
  }

  /** Write the session outcome back to the handoff the context started from. No-op for plain sessions. */
  function reportEnd(ctx, { status, reflection } = {}) {
    if (!ctx?.handoffId) return;
    store.writeResult(ctx.handoffId, {
      status,
      minutes: Math.round((ctx.spentSeconds || 0) / 60),
      reflection,
    });
  }

  // --- Outbound: ask another tool to decompose the current focus -------------

  const decomposeTarget = computed(() => toolsAccepting(INTENTS.DECOMPOSE)[0] ?? null);
  const pickTarget = computed(() => toolsAccepting(INTENTS.PICK_STEPS)[0] ?? null);
  const saveTarget = computed(() => toolsAccepting(INTENTS.SAVE_STEPS)[0] ?? null);
  /** True when some tool can take a decompose request. Gates the button. */
  const canDecomposeElsewhere = computed(() => decomposeTarget.value != null);
  /** True when some tool can supply saved steps (a workflow library). */
  const canPickSteps = computed(() => pickTarget.value != null);
  /** True when some tool can keep steps as a template. */
  const canSaveSteps = computed(() => saveTarget.value != null);

  // Ask `target` for steps for the current focus. Returns `{ id, route }` for
  // the caller to remember and navigate to, or null when nothing can take it.
  function askForSteps(target, intent, { focus, frameId, breadcrumb } = {}) {
    const task = focusToDecomposeTask({ focus, breadcrumb });
    if (!target || !task || frameId == null) return null;
    const handoff = store.create({
      from: { tool: "focus", ref: String(frameId) },
      to: { tool: target.id, intent },
      task,
    });
    return handoff ? { id: handoff.id, route: store.routeFor(handoff) } : null;
  }

  /** Send the focus out to be thought through and decomposed (ThinkPad). */
  function sendDecompose(args) {
    return askForSteps(decomposeTarget.value, INTENTS.DECOMPOSE, args);
  }

  /** Ask for saved steps for the focus (Workflows). */
  function sendPickSteps(args) {
    return askForSteps(pickTarget.value, INTENTS.PICK_STEPS, args);
  }

  /** Hand a plan's steps over to be kept as a template. Returns the route to go to, or null. */
  function sendSaveSteps({ title, steps, frameId } = {}) {
    const target = saveTarget.value;
    if (!target || frameId == null) return null;
    const handoff = store.create({
      from: { tool: "focus", ref: String(frameId) },
      to: { tool: target.id, intent: INTENTS.SAVE_STEPS },
      task: { title, steps },
    });
    return handoff ? store.routeFor(handoff) : null;
  }

  /**
   * Where a handoff this context sent stands:
   *   null                       nothing awaited
   *   {status:"waiting"}         the target has not returned yet
   *   {status:"ready", subFocuses}  it returned usable sub-focuses
   *   {status:"dropped"}         it came back empty or abandoned
   * @param {string|null|undefined} handoffId
   */
  function awaitingState(handoffId) {
    if (!handoffId) return null;
    // Which tool it went to, for wording ("Waiting on ThinkPad").
    const sourceName = getTool(store.get(handoffId, "focus")?.to.tool)?.name ?? "";
    const result = store.resultFor(handoffId, "focus");
    if (!result) return { status: "waiting", subFocuses: [], sourceName };
    const subFocuses = result.status === "completed" ? subFocusesFromResult(result) : [];
    return subFocuses.length
      ? { status: "ready", subFocuses, sourceName }
      : { status: "dropped", subFocuses: [], sourceName };
  }

  /** Route back to the target tool for a handoff still being worked on. */
  function routeForAwaiting(handoffId) {
    const h = handoffId ? store.get(handoffId, "focus") : null;
    return h ? store.routeFor(h) : null;
  }

  /** Stop waiting: the target can no longer accept it, and it records as abandoned. */
  function cancelAwaiting(handoffId) {
    if (handoffId) store.cancel(handoffId, "focus");
  }

  return {
    pending,
    accept,
    dismiss,
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
  };
}
