import { computed } from "vue";
import { useRouter } from "vue-router";
import { useHandoffStore } from "../../handoff/handoffStore.js";
import { toolsAccepting } from "../../handoff/toolRegistry.js";
import { padForThread } from "../domain/padDomain";
import { moveToFocusTask } from "../domain/moveHandoff.js";

const INTENT = "start-session";

/**
 * ThinkPad's side of the handoff channel: "Focus on this" turns the current
 * move into a task and opens the target tool with only the handoff id, and
 * `focusSummary` shows the results Focus wrote back. ThinkPad stays the source
 * of truth; nothing here reads from or links to a running session.
 *
 * @param {{ surface: object, currentContext: import('vue').Ref<object|null> }} deps
 *   surface: the useThinkPadSurface() result; currentContext: the current pad ref.
 */
export function useFocusHandoff({ surface, currentContext }) {
  const router = useRouter();
  const store = useHandoffStore();
  store.hydrate();

  const thread = computed(() => (surface.isAtRoot ? null : (surface.viewFrame ?? null)));

  const task = computed(() => {
    const t = thread.value;
    if (!t) return null;
    const anchor = t.parentAnchor;
    const parentDoc = anchor?.annotationId ? padForThread(currentContext.value, anchor.parentFrameId ?? null) : null;
    const annotation = (parentDoc?.annotations ?? []).find((a) => a.id === anchor?.annotationId) ?? null;
    return moveToFocusTask({ thread: t, annotation });
  });

  const target = computed(() => toolsAccepting(INTENT)[0] ?? null);
  const canFocus = computed(() => !!task.value && !!target.value);

  function focusOnThisMove() {
    if (!canFocus.value) return;
    const handoff = store.create({
      from: { tool: "thinkpad", ref: thread.value.id },
      to: { tool: target.value.id, intent: INTENT },
      task: task.value,
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
      reflection: s.lastReflection,
    };
  });

  return { canFocus, focusOnThisMove, focusSummary };
}
