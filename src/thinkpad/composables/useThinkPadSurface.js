import { ref, computed, reactive } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { usePadStore } from "../store/padStore";
import { padForThread, threadIsOpen } from "../domain/padDomain";
import { getMoveById, getStanceDisplay } from "../moves";

/**
 * ThinkPad surface — navigation stack head, drill UI, and pad mutations.
 * Single composable replacing the former useThinkPadPage + useThinkPadDrill split.
 */
export function useThinkPadSurface() {
  const route = useRoute();
  const router = useRouter();
  const padStore = usePadStore();
  const { currentPad: currentContext } = storeToRefs(padStore);

  const surfaceHead = computed(() => padStore.surfaceHead);
  const isAtRoot = computed(() => surfaceHead.value === null);
  const threadPath = computed(() => padStore.threadPath);
  const viewPad = computed(() => padStore.viewPad);

  const activeThread = computed(() => {
    const path = threadPath.value;
    return path.length > 0 ? path[path.length - 1] : null;
  });

  const needsSynthesis = computed(() => {
    const thread = activeThread.value;
    return !!thread && threadIsOpen(thread);
  });

  const canComplete = computed(() => {
    const thread = activeThread.value;
    if (!thread) return false;
    return (thread.doc?.text ?? "").trim().length > 0;
  });

  const completeDialog = reactive({ open: false, value: "" });
  const resolveMove = getMoveById("resolve");

  // Converged: the surface thread's sub-pad holds one non-empty block — the
  // precondition for resolving up, before the open-item gate is consulted.
  const converged = computed(() => {
    const path = threadPath.value;
    const thread = path.length > 0 ? path[path.length - 1] : null;
    return !!thread && (thread.doc?.text ?? "").trim() !== "" && !threadIsOpen(thread);
  });

  // The open-item gate (capture-templates-proposal §8): moves started on this
  // surface that haven't resolved, and items lifted up from below.
  const openItems = computed(() => padStore.openItemsAt(surfaceHead.value));
  const decidedItems = computed(() => padStore.decidedItemsAt(surfaceHead.value));
  const gateOpen = ref(false);

  // Levels an item on this surface can be lifted to: the root document, then each
  // ancestor thread — never the surface itself.
  const liftTargets = computed(() => {
    if (isAtRoot.value) return [];
    const ancestors = threadPath.value.slice(0, -1);
    return [
      { locator: null, label: currentContext.value?.title || "Document" },
      ...ancestors.map((f) => ({ locator: f.id, label: f.steps?.[0]?.title || "Untitled" })),
    ];
  });

  /** Open-item count for a breadcrumb level (null = root document). */
  function openCountAt(padLocator = null) {
    return padStore.openCountAt(padLocator);
  }

  const viewFrame = computed(() => {
    const path = threadPath.value;
    return path.length ? path[path.length - 1] : null;
  });

  const surfaceTitle = computed(() =>
    viewFrame.value ? (viewFrame.value.steps?.[0]?.title ?? "") : (currentContext.value?.title ?? ""),
  );

  const currentGoal = computed(() => viewFrame.value?.steps?.[0]?.title || "Untitled thread");

  const currentStance = computed(() => {
    const frame = viewFrame.value;
    const pad = currentContext.value;
    if (!frame || !pad) return getStanceDisplay();

    let moveId = frame.move || "";
    let tag = null;
    const anchor = frame.parentAnchor;
    if (anchor?.annotationId) {
      const parentDoc = padForThread(pad, anchor.parentFrameId ?? null);
      const ann = (parentDoc?.annotations ?? []).find((a) => a.id === anchor.annotationId);
      if (ann) {
        if (!moveId && ann.move) moveId = ann.move;
        tag = ann.tag ?? null;
      }
    }
    return getStanceDisplay({ moveId, tag });
  });

  const drillThreads = computed(() => {
    if (!currentContext.value || !isAtRoot.value) return [];
    const annotations = currentContext.value.doc?.annotations ?? [];
    return (currentContext.value.threads ?? [])
      .filter((t) => t.parentAnchor)
      .map((t) => {
        const ann = annotations.find((a) => a.id === t.parentAnchor?.annotationId);
        return {
          threadId: t.id,
          annotationId: t.parentAnchor.annotationId,
          title: t.steps?.[0]?.title ?? "Untitled",
          anchorText: ann?.selectedText ?? "",
          hasWork: (t.doc?.text ?? "").trim() !== "",
          completed: !!(t.steps?.[0]?.completedAt),
          tag: ann?.tag ?? null,
        };
      });
  });

  const peekOpen = ref(false);
  const peekParentLocator = computed(() => {
    const path = threadPath.value;
    return path.length >= 2 ? path[path.length - 2].id : null;
  });
  const peekPad = computed(
    () => padForThread(currentContext.value, peekParentLocator.value) ?? { text: "", annotations: [] },
  );
  const peekHighlightStepId = computed(() => viewFrame.value?.steps?.[0]?.id ?? null);
  const peekParentFrame = computed(() => {
    const parentId = peekParentLocator.value;
    if (!parentId || !currentContext.value) return null;
    return threadPath.value.find((f) => f.id === parentId) ?? null;
  });
  const peekTitle = computed(() =>
    peekParentFrame.value
      ? (peekParentFrame.value.steps?.[0]?.title ?? "")
      : (currentContext.value?.title ?? "Document"),
  );

  const padListItems = computed(() => {
    return padStore.padPool.map((pad) => {
      const threads = pad.threads ?? [];
      const rootThread = threads.length ? threads[threads.length - 1] : null;
      let leafThread = rootThread;
      while (leafThread && (leafThread.subThreads ?? []).length > 0) {
        leafThread = leafThread.subThreads[leafThread.subThreads.length - 1];
      }
      const leafStep = leafThread?.steps?.[0] ?? null;
      const rootSteps = rootThread?.steps ?? [];
      const rootHasOneIncompleteStep =
        rootSteps.length === 1 && !rootSteps[0].completedAt;
      const singleStepMatchesTitle =
        threads.length === 1 &&
        rootHasOneIncompleteStep &&
        (rootSteps[0].title || "").trim() === (pad.title || "").trim() &&
        (rootThread.subThreads ?? []).length === 0;
      const isAtRootPad = !leafStep || singleStepMatchesTitle;
      const activeTitle = leafStep?.title?.trim() || pad.title || "Untitled";
      return {
        id: pad.id,
        rootTitle: pad.title,
        activeTitle,
        isAtRoot: isAtRootPad,
        updatedAt: pad.updatedAt,
        resumeHint: pad.resumeHint ?? null,
        previewText: (pad.doc?.text ?? "").trim(),
        createdAt: pad.createdAt ?? null,
      };
    });
  });

  function handleThinkPadTextUpdate(text, padLocator, nodes) {
    const target = padLocator === undefined ? padStore.surfaceHead : padLocator;
    padStore.setPadText({ padLocator: target, text, nodes });
  }

  function handleExtractStep({ title, selectionStart, selectionEnd, selectedText, move = "", writeBack = "replace" }) {
    if (!title) return;
    padStore.promoteWithinPad({
      padLocator: padStore.surfaceHead,
      title,
      selectionStart,
      selectionEnd,
      selectedText,
      move,
      writeBack,
    });
  }

  function handleHideSpan({ selectionStart, selectionEnd, selectedText }) {
    padStore.hideSpanInPad({ padLocator: padStore.surfaceHead, selectionStart, selectionEnd, selectedText });
  }

  function handleRevealHidden() {
    padStore.revealHiddenInPad({ padLocator: padStore.surfaceHead });
  }

  function handleTagAnnotation({ annotationId, tag }) {
    padStore.tagAnnotation({ annotationId, tag, padLocator: padStore.surfaceHead });
  }

  function handleDrillIntoSpan({ title, selectionStart, selectionEnd, selectedText, tag = null }) {
    if (typeof selectionStart !== "number" || typeof selectionEnd !== "number") return;
    padStore.drillIntoSpan({
      parentThreadId: padStore.surfaceHead,
      title,
      selectionStart,
      selectionEnd,
      selectedText,
      tag,
    });
  }

  function jumpToSurface(index = 0) {
    padStore.jumpToSurfaceIndex(index);
  }

  function navigateToThread(threadId) {
    padStore.navigateToThread(threadId);
  }

  function handleAscend() {
    padStore.ascendThread();
  }

  function handleComplete() {
    const head = padStore.surfaceHead;
    if (typeof head !== "string" || !head || !canComplete.value) return;
    // The open-item gate first: every move started here must be decided.
    if (openItems.value.length) {
      gateOpen.value = true;
      return;
    }
    gateOpen.value = false;
    // Not converged to one block: ask for the synthesized result.
    if (needsSynthesis.value) {
      completeDialog.value = "";
      completeDialog.open = true;
      return;
    }
    padStore.resolveThreadIntoParent({ threadId: head });
  }

  function confirmComplete() {
    const text = completeDialog.value.trim();
    if (!text) return;
    const head = padStore.surfaceHead;
    if (typeof head !== "string" || !head) return;
    padStore.resolveThreadIntoParent({ threadId: head, result: text });
    completeDialog.open = false;
  }

  function handleDisposeOpenItem({ id, kind, note = "", target = null } = {}) {
    padStore.disposeOpenItem({ padLocator: padStore.surfaceHead, id, kind, note, target });
  }

  function handleClearDisposition({ id } = {}) {
    padStore.clearDisposition({ padLocator: padStore.surfaceHead, id });
  }

  function handleGoToOpenItem(threadId) {
    gateOpen.value = false;
    if (threadId) padStore.navigateToThread(threadId);
  }

  function handleSurfaceTitleUpdate(title) {
    if (padStore.surfaceHead) padStore.setThreadGoal(title);
    else padStore.setCurrentPadTitle(title);
  }

  function activatePad(padId) {
    if (typeof padId !== "string" || !padId) return;
    if (!padStore.padPool.some((c) => c.id === padId)) return;
    padStore.persistCurrent();
    padStore.activatePad(padId);
    if (route.name !== "thinkpad") router.push({ name: "thinkpad" });
  }

  function restoreResumableContext(payload = {}) {
    activatePad(payload?.id ?? null);
  }

  function handleDeleteDocument(padId) {
    if (!padId) return;
    const wasActive = padStore.currentPadId === padId;
    padStore.deletePad(padId);
    if (wasActive) {
      padStore.ensureBlankPad();
      if (route.name !== "thinkpad") router.push({ name: "thinkpad" });
    }
  }

  return reactive({
    surfaceHead,
    isAtRoot,
    threadPath,
    viewPad,
    canComplete,
    needsSynthesis,
    completeDialog,
    resolveMove,
    confirmComplete,
    converged,
    openItems,
    decidedItems,
    gateOpen,
    liftTargets,
    openCountAt,
    viewFrame,
    surfaceTitle,
    currentGoal,
    currentStance,
    drillThreads,
    peekOpen,
    peekPad,
    peekHighlightStepId,
    peekTitle,
    padListItems,
    handleThinkPadTextUpdate,
    handleSurfaceTitleUpdate,
    handleExtractStep,
    handleDrillIntoSpan,
    handleTagAnnotation,
    handleHideSpan,
    handleRevealHidden,
    jumpToSurface,
    navigateToThread,
    handleAscend,
    handleComplete,
    handleDisposeOpenItem,
    handleClearDisposition,
    handleGoToOpenItem,
    restoreResumableContext,
    handleDeleteDocument,
  });
}
