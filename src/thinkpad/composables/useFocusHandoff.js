import { computed } from "vue";
import { useRouter } from "vue-router";
import { useHandoffStore } from "../../handoff/handoffStore.js";
import { WANTS, toolsFor } from "../../handoff/toolRegistry.js";
import { padForThread } from "../domain/padDomain";
import { moveToRequest } from "../domain/moveHandoff.js";

/**
 * ThinkPad as a sender: "Focus on this" asks for the current move to be stepped
 * through (`want: "step-through"`) and opens whatever serves that verb with only
 * the request id. `focusSummary` shows what came back. ThinkPad stays the
 * source of truth; it never reads another tool's state.
 *
 * @param {{ surface: object, currentContext: import('vue').Ref<object|null> }} deps
 *   surface: the useThinkPadSurface() result; currentContext: the current pad ref.
 */
export function useFocusHandoff({ surface, currentContext }) {
  const router = useRouter();
  const store = useHandoffStore();
  store.hydrate();

  const thread = computed(() => (surface.isAtRoot ? null : (surface.viewFrame ?? null)));

  const body = computed(() => {
    const t = thread.value;
    if (!t) return null;
    const anchor = t.parentAnchor;
    const parentDoc = anchor?.annotationId ? padForThread(currentContext.value, anchor.parentFrameId ?? null) : null;
    const annotation = (parentDoc?.annotations ?? []).find((a) => a.id === anchor?.annotationId) ?? null;
    return moveToRequest({ thread: t, annotation });
  });

  const target = computed(() => toolsFor(WANTS.STEP_THROUGH)[0] ?? null);
  const canFocus = computed(() => !!body.value && !!target.value);

  function focusOnThisMove() {
    if (!canFocus.value) return;
    const handoff = store.create({
      replyTo: { tool: "thinkpad", ref: thread.value.id },
      to: { tool: target.value.id },
      want: WANTS.STEP_THROUGH,
      ...body.value,
    });
    if (!handoff) return;
    router.push(store.routeFor(handoff));
  }

  /** e.g. { label: "2 sessions · 50 min", reflection } for this move, or null. */
  const focusSummary = computed(() => {
    const t = thread.value;
    const s = t ? store.summaryFor("thinkpad", t.id) : null;
    if (!s) return null;
    return {
      label: `${s.sessions} ${s.sessions === 1 ? "session" : "sessions"} · ${s.minutes} min`,
      reflection: s.lastText,
    };
  });

  return { canFocus, focusOnThisMove, focusSummary };
}
