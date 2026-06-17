import { ref, computed, reactive } from "vue";
import { storeToRefs } from "pinia";
import { usePadStore } from "../store/padStore";
import { formatRelativeTime } from "../utils/formatRelativeTime";

/** Welcome doc grid shown on a blank pad when other documents exist. */
export function useThinkPadWelcome({ thinkPad, sessionUi, isDraftFrozen }) {
  const padStore = usePadStore();
  const { currentPad: currentContext } = storeToRefs(padStore);
  const dismissed = ref(false);

  const isBlankPad = computed(() => {
    const ctx = currentContext.value;
    if (!ctx) return false;
    return (
      (ctx.title || "").trim() === "" &&
      (ctx.doc?.text ?? "").trim() === "" &&
      (ctx.threads ?? []).length === 0
    );
  });

  const recentItems = computed(() => {
    const currentId = currentContext.value?.id;
    return padStore.padPool
      .filter((pad) => pad.id !== currentId)
      .filter(
        (pad) =>
          (pad.title || "").trim() !== "" ||
          (pad.doc?.text ?? "").trim() !== "",
      )
      .map((pad) => ({
        contextId: pad.id,
        title: (pad.title || "").trim() || "Untitled",
        updatedAt: pad.updatedAt ?? null,
        previewText: (pad.doc?.text ?? "").trim(),
      }));
  });

  const showRecentPanel = computed(
    () => isBlankPad.value && !dismissed.value && recentItems.value.length > 0,
  );

  function handleSelectRecent(contextId) {
    thinkPad.restoreResumableContext({ id: contextId });
  }

  function handleThinkPadFocus() {
    const wasWelcome = !dismissed.value && isBlankPad.value;
    dismissed.value = true;
    if (wasWelcome) sessionUi.padExpanded = !isDraftFrozen.value;
  }

  return reactive({
    dismissed,
    isBlankPad,
    recentItems,
    showRecentPanel,
    handleSelectRecent,
    handleThinkPadFocus,
    formatRelativeTime,
  });
}
