import { computed, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { useHandoffStore } from "../../handoff/handoffStore.js";
import { HANDOFF_QUERY_PARAM, WANTS, getTool, routeForTool, toolsFor } from "../../handoff/toolRegistry.js";
import { useWorkflowStore } from "../store/workflowStore.js";
import { workflowLabel, workflowTag } from "../model/workflow.js";

/**
 * The library page's side of the channel (roadmap §4.2, §4.3). It supplies steps:
 *   choose-steps  a tool asks for steps; you choose a workflow here and its steps
 *                 go back in the reply as content (copied, so the workflow can
 *                 change later without touching that run), with its tag.
 *   keep          a tool hands over steps to keep; a new workflow is made from
 *                 them and opened for editing. Only this page writes the library.
 * And it can start a run elsewhere: "Run as new context" asks for the steps to be
 * stepped through. It never names the tool that serves a verb.
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
  const pickRequest = computed(() => (pending.value?.want === WANTS.CHOOSE_STEPS ? pending.value : null));
  const requesterName = computed(() => getTool(pickRequest.value?.replyTo.tool)?.name ?? "");

  function back(request) {
    router.push(routeForTool(request.replyTo.tool));
  }

  // Keep: as soon as the library is loaded, turn the handed-over steps into a
  // new workflow and open it in the editor.
  watch(
    [pending, isLoaded],
    ([h, loaded]) => {
      if (!h || !loaded || h.want !== WANTS.KEEP) return;
      const taken = store.consume(h.id, "workflows");
      if (!taken) return;
      const wf = workflows.create({ label: taken.text, steps: taken.steps ?? [] });
      store.reply(taken.id, { outcome: "resolved", text: workflowLabel(wf), tag: workflowTag(wf) });
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
    store.reply(taken.id, { outcome: "resolved", text: workflowLabel(wf), steps: wf.steps, tag: workflowTag(wf) });
    workflows.markUsed(wf.id);
    back(taken);
    return true;
  }

  /** Decline the pending request (an `abandoned` reply) and go back. */
  function cancelPick() {
    const request = pickRequest.value;
    if (!request) return;
    const taken = store.consume(request.id, "workflows");
    if (taken) store.reply(taken.id, { outcome: "abandoned" });
    back(request);
  }

  function runnerFor(wf) {
    return wf ? toolsFor(WANTS.STEP_THROUGH, wf.steps)[0] ?? null : null;
  }

  /** Ask for this workflow's steps to be stepped through, as a new context there. */
  function runAsContext(workflowId) {
    const wf = workflows.byId(workflowId);
    const target = runnerFor(wf);
    if (!wf || !wf.steps.length || !target) return false;
    const handoff = store.create({
      replyTo: { tool: "workflows", ref: wf.id },
      to: { tool: target.id },
      want: WANTS.STEP_THROUGH,
      text: workflowLabel(wf),
      steps: wf.steps,
      tag: workflowTag(wf),
    });
    if (!handoff) return false;
    workflows.markUsed(wf.id);
    router.push(store.routeFor(handoff));
    return true;
  }

  return {
    pickRequest,
    requesterName,
    choose,
    cancelPick,
    runAsContext,
    canRun: computed(() => toolsFor(WANTS.STEP_THROUGH).length > 0),
  };
}
