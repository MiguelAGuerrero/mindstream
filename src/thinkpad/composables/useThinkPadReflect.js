import { ref, computed, watch, onMounted, onUnmounted, reactive } from "vue";
import { useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import { usePadStore } from "../store/padStore";
import { parseBlocks } from "../domain/ideaParser.js";

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
        source: ann?.selectedText ?? "",
        moveId: ann?.move ?? null,
        stepId: s.stepId,
        at: s.at,
      };
    });
  });

  const displayThinkPad = computed(() => {
    if (padStore.isDraftHistoryView && padStore.viewingDraftEntry) {
      return { ...surface.viewPad, text: padStore.viewingDraftEntry.text };
    }
    return surface.viewPad;
  });

  function syncCandidateSpans() {
    if (isDraftFrozen.value) {
      const text = padStore.viewPad?.frozenText ?? padStore.viewPad?.text ?? "";
      candidateSpans.value = parseBlocks(text);
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
    () => padStore.viewPad?.text,
    (newText) => {
      if (!isDraftFrozen.value) return;
      candidateSpans.value = parseBlocks(newText ?? "");
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
    e.preventDefault();
    padStore.stampDraft({ padLocator: padStore.surfaceHead });
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
