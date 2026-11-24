import { ref, computed, reactive } from "vue";
import { storeToRefs } from "pinia";
import { usePadStore } from "../store/padStore";
import { formatRelativeTime } from "../utils/formatRelativeTime";

/** Welcome doc grid shown on a blank pad when other documents exist. */
function threadTitleOf(pad, threadId) {
  if (!threadId) return null;
  let found = null;
  const visit = (threads) => {
    for (const t of threads ?? []) {
      if (found) return;
      if (t.id === threadId) { found = t.steps?.[0]?.title ?? null; return; }
      visit(t.subThreads);
    }
  };
  visit(pad.threads);
  return found;
}

function firstWords(text, max = 48) {
  const t = String(text ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

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
        // No title: the first words, so untitled pads can be told apart.
        title: (pad.title || "").trim() || firstWords(pad.doc?.text) || "Untitled",
        updatedAt: pad.updatedAt ?? null,
        previewText: (pad.doc?.text ?? "").trim(),
        // Where you were in it, so a return lands with context (Phase 4 resume).
        whereLeft: threadTitleOf(pad, pad.surfaceThreadId),
      }));
  });

  const showRecentPanel = computed(
    () => isBlankPad.value && !dismissed.value && recentItems.value.length > 0,
  );

  // A fresh, blank pad opens by asking what the user is trying to answer instead
  // of presenting an empty, untitled page. The draft is the in-progress answer.
  const questionDraft = ref("");
  const showQuestionPrompt = computed(
    () => isBlankPad.value && !dismissed.value,
  );

  function handleSelectRecent(contextId) {
    thinkPad.restoreResumableContext({ id: contextId });
  }

  function handleThinkPadFocus() {
    const wasWelcome = !dismissed.value && isBlankPad.value;
    dismissed.value = true;
    if (wasWelcome) sessionUi.padExpanded = !isDraftFrozen.value;
  }

  /** Commit the framing question as the pad title. Setting the title flips the
   *  pad out of its blank state, so the prompt yields to the writing surface
   *  (which mounts focused), expanded for working — mirroring handleThinkPadFocus. */
  function submitQuestion() {
    const question = questionDraft.value.replace(/\s*[\r\n]+\s*/g, " ").trim();
    if (!question) return;
    thinkPad.handleSurfaceTitleUpdate(question);
    questionDraft.value = "";
    dismissed.value = true;
    sessionUi.padExpanded = !isDraftFrozen.value;
  }

  return reactive({
    dismissed,
    isBlankPad,
    recentItems,
    showRecentPanel,
    questionDraft,
    showQuestionPrompt,
    submitQuestion,
    handleSelectRecent,
    handleThinkPadFocus,
    formatRelativeTime,
  });
}
