import { ref, computed, watch, onMounted, onUnmounted, reactive } from "vue";
import { useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import { usePadStore } from "../store/padStore";
import { ideaRanges, readDocIdeas, readFrozenIdeas, parseIdeasFromText } from "../domain/ideas.js";

/** Stream/reflect phase: ideas panel, candidate spans, pad expand state, persistence. */
export function useThinkPadReflect({ surface, sessionUi, isBlankPad, dismissed, peekOpen }) {
  const route = useRoute();
  const padStore = usePadStore();
  const { isDraftFrozen } = storeToRefs(padStore);

  const candidateSpans = ref([]);
  const peekedStepId = ref(null);

  const ideas = computed(() => {
    const staged = padStore.stagedOutputs;
    const annotations = padStore.viewPad?.annotations ?? [];
    return staged.map((s) => {
      const ann = annotations.find((a) => a.id === s.annotationId || a.stepId === s.stepId);
      return {
        id: s.id,
        ideaId: s.ideaId ?? s.blockId ?? ann?.ideaId ?? ann?.blockId ?? null,
        source: ann?.selectedText ?? "",
        moveId: ann?.move ?? null,
        stepId: s.stepId,
        annotationId: s.annotationId ?? ann?.id ?? null,
        text: s.text ?? "",
        at: s.at,
      };
    });
  });

  const displayThinkPad = computed(() => {
    if (padStore.isDraftHistoryView && padStore.viewingDraftEntry) {
      return { ...surface.viewPad, text: padStore.viewingDraftEntry.text };
    }
    const pad = surface.viewPad;
    if (!pad) return pad;
    if ((pad.phase ?? "stream") === "cultivate") {
      const ideas = readFrozenIdeas(pad);
      return {
        ...pad,
        text: pad.frozenText ?? pad.text ?? "",
        ideas,
      };
    }
    return { ...pad, ideas: readDocIdeas(pad) };
  });

  function syncCandidateSpans() {
    if (isDraftFrozen.value) {
      const pad = padStore.viewPad;
      const ideas = readFrozenIdeas(pad);
      if (ideas.length > 0) {
        candidateSpans.value = ideaRanges(ideas);
        return;
      }
      const frozenText = pad?.frozenText ?? pad?.text ?? "";
      candidateSpans.value = frozenText.trim() ? parseIdeasFromText(frozenText) : [];
    } else {
      candidateSpans.value = [];
    }
  }

  function syncPadExpanded(frozen = isDraftFrozen.value) {
    if (!isBlankPad.value || dismissed.value) {
      sessionUi.padExpanded = !surface.isAtRoot ? true : !frozen;
    } else {
      sessionUi.padExpanded = false;
    }
  }

  watch(isDraftFrozen, (frozen) => {
    syncCandidateSpans();
    syncPadExpanded(frozen);
  }, { immediate: true });

  watch(
    () => [
      padStore.viewPad?.ideas,
      padStore.viewPad?.blocks,
      padStore.viewPad?.frozenIdeas,
      padStore.viewPad?.frozenBlocks,
    ],
    () => {
      if (!isDraftFrozen.value) return;
      syncCandidateSpans();
    },
  );

  watch(() => padStore.isDraftHistoryView, (inHistory) => {
    sessionUi.padExpanded = inHistory ? false : (!surface.isAtRoot ? true : !isDraftFrozen.value);
  });

  watch(
    () => padStore.currentPadId,
    () => {
      dismissed.value = false;
      sessionUi.padExpanded = isBlankPad.value ? false : !isDraftFrozen.value;
      syncCandidateSpans();
    },
  );

  watch(
    () => surface.surfaceHead,
    () => {
      sessionUi.padExpanded = !surface.isAtRoot ? true : !isDraftFrozen.value;
      syncCandidateSpans();
    },
  );

  function handleEscapeExpand(e) {
    if (e.key !== "Escape" || !sessionUi.padExpanded) return;
    if (peekOpen.value) return;
    // Escape closing a dialog, menu or sheet must not also freeze the draft.
    if (e.defaultPrevented || document.querySelector(".v-overlay--active")) return;
    if (e.target?.closest?.(".v-overlay, [role=dialog], [role=menu]")) return;
    e.preventDefault();
    padStore.enterReflect({ padLocator: padStore.surfaceHead });
  }

  function flushLivePadToStorage() {
    if (route.name === "thinkpad") padStore.persistCurrent();
  }

  function onVisibilityChange() {
    if (document.visibilityState === "hidden") flushLivePadToStorage();
  }

  onMounted(() => {
    window.addEventListener("keydown", handleEscapeExpand);
    window.addEventListener("pagehide", flushLivePadToStorage);
    document.addEventListener("visibilitychange", onVisibilityChange);
  });

  onUnmounted(() => {
    window.removeEventListener("keydown", handleEscapeExpand);
    window.removeEventListener("pagehide", flushLivePadToStorage);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  });

  function setPeekedStepId(stepId) {
    peekedStepId.value = stepId;
  }

  return reactive({
    ideas,
    displayThinkPad,
    candidateSpans,
    peekedStepId,
    isDraftFrozen,
    setPeekedStepId,
  });
}
