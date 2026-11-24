import { computed, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { useHandoffStore } from "../../handoff/handoffStore.js";
import { HANDOFF_QUERY_PARAM, INTENTS, getTool, routeForTool, toolsAccepting } from "../../handoff/toolRegistry.js";
import { useWorkflowStore } from "../store/workflowStore.js";
import { workflowLabel } from "../model/workflow.js";

/**
 * Workflows' side of the handoff channel. It is a SUPPLIER of steps:
 *   pick-steps  another tool asks for steps; you choose a workflow here and its
 *               steps go back as the result (copied, so the template can change
 *               later without touching that work).
 *   save-steps  another tool hands over steps to keep; a new workflow is made
 *               from them and opened for editing.
 * And it can start work elsewhere: "Run as new context" sends the steps to the
 * tool that runs sessions. Imports only the shared channel, never another tool.
 */
export function useWorkflowsHandoff() {
  const route = useRoute();
  const router = useRouter();
  const store = useHandoffStore();
  store.hydrate();
  const workflows = useWorkflowStore();
  const { isLoaded } = storeToRefs(workflows);

  const queryId = computed(() => {
    const raw = route.query[HANDOFF_QUERY_PARAM];
    const id = Array.isArray(raw) ? raw[0] : raw;
    return typeof id === "string" && id ? id : null;
  });

  // Peeking never consumes, so a reload keeps you in pick mode.
  const pending = computed(() => (queryId.value ? store.peek(queryId.value, "workflows") : null));

  /** A request for steps waiting on your choice, or null. */
  const pickRequest = computed(() => (pending.value?.to.intent === INTENTS.PICK_STEPS ? pending.value : null));
  const requesterName = computed(() => getTool(pickRequest.value?.from.tool)?.name ?? "");

  function back(handoff) {
    router.push(routeForTool(handoff.from.tool));
  }

  // Save: as soon as the library is loaded, turn the handed-over steps into a
  // new workflow and open it in the editor.
  watch(
    [pending, isLoaded],
    ([h, loaded]) => {
      if (!h || !loaded || h.to.intent !== INTENTS.SAVE_STEPS) return;
      const taken = store.consume(h.id, "workflows");
      if (!taken) return;
      const wf = workflows.create({ name: taken.task.title, steps: taken.task.steps ?? [] });
      store.writeResult(taken.id, { status: "completed", minutes: 0, output: { text: wf.id } });
      router.replace({ name: "workflows", query: { id: wf.id } });
    },
    { immediate: true },
  );

  /** Answer the pending request with this workflow's steps and go back. */
  function choose(workflowId) {
    const wf = workflows.byId(workflowId);
    const request = pickRequest.value;
    if (!wf || !wf.steps.length || !request) return false;
    const taken = store.consume(request.id, "workflows");
    if (!taken) return false;
    store.writeResult(taken.id, { status: "completed", minutes: 0, output: { items: wf.steps } });
    workflows.markUsed(wf.id);
    back(taken);
    return true;
  }

  /** Decline the pending request and go back. */
  function cancelPick() {
    const request = pickRequest.value;
    if (!request) return;
    const taken = store.consume(request.id, "workflows");
    if (taken) store.writeResult(taken.id, { status: "abandoned", minutes: 0 });
    back(request);
  }

  const runner = computed(() => toolsAccepting(INTENTS.START_SESSION)[0] ?? null);

  /** Start a new context somewhere that runs sessions, with this workflow's steps as its plan. */
  function runAsContext(workflowId) {
    const wf = workflows.byId(workflowId);
    const target = runner.value;
    if (!wf || !wf.steps.length || !target) return false;
    const handoff = store.create({
      from: { tool: "workflows", ref: wf.id },
      to: { tool: target.id, intent: INTENTS.START_SESSION },
      task: { title: workflowLabel(wf), steps: wf.steps },
    });
    if (!handoff) return false;
    workflows.markUsed(wf.id);
    router.push(store.routeFor(handoff));
    return true;
  }

  return { pickRequest, requesterName, choose, cancelPick, runAsContext, canRun: computed(() => !!runner.value) };
}
