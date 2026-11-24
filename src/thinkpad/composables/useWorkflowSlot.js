import { computed, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { useHandoffStore } from "../../handoff/handoffStore.js";
import { WANTS, toolsFor } from "../../handoff/toolRegistry.js";
import { usePadStore } from "../store/padStore";

/**
 * Slot a workflow into a thread (roadmap Phase 2). ThinkPad asks whichever
 * tool supplies saved steps (`choose-steps`; it never names the library), the
 * pad remembers the waiting thread, and when the reply arrives its steps are
 * written into that thread as a document. A cancelled or empty reply is
 * simply forgotten.
 */
export function useWorkflowSlot() {
  const router = useRouter();
  const handoffs = useHandoffStore();
  handoffs.hydrate();
  const padStore = usePadStore();
  const { pads, isLoaded } = storeToRefs(padStore);

  const chooser = computed(() => toolsFor(WANTS.CHOOSE_STEPS)[0] ?? null);
  const canUseWorkflow = computed(() => chooser.value != null);

  function useWorkflow({ threadId, title } = {}) {
    const target = chooser.value;
    const text = typeof title === "string" && title.trim() ? title.trim() : "Steps for this thread";
    if (!target || !threadId) return false;
    const handoff = handoffs.create({
      replyTo: { tool: "thinkpad", ref: threadId },
      to: { tool: target.id },
      want: WANTS.CHOOSE_STEPS,
      text,
    });
    if (!handoff) return false;
    padStore.addPendingSlot({ handoffId: handoff.id, threadId });
    router.push(handoffs.routeFor(handoff));
    return true;
  }

  // Settle any replies that came back while we were away.
  function settle() {
    for (const pad of pads.value) {
      for (const slot of pad.pendingSlots ?? []) {
        const sent = handoffs.get(slot.handoffId, "thinkpad");
        if (!sent) { padStore.settleSlot({ handoffId: slot.handoffId, dropped: true }); continue; }
        const reply = handoffs.replyFor(slot.handoffId, "thinkpad");
        if (!reply) continue;
        const steps = reply.outcome === "abandoned" ? [] : (reply.steps ?? []);
        padStore.settleSlot({ handoffId: slot.handoffId, steps, dropped: !steps.length });
      }
    }
  }
  watch(isLoaded, (loaded) => { if (loaded) settle(); }, { immediate: true });

  return { canUseWorkflow, useWorkflow, settle };
}
