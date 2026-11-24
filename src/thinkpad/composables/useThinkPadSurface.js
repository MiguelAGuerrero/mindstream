import { ref, computed, reactive } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { usePadStore } from "../store/padStore";
import { drillThreadsAt, padForThread, threadIsOpen } from "../domain/padDomain";
import { getMoveById, getStanceDisplay, ANNOTATION_TAG_LIST, ANNOTATION_TAG_DISPLAY } from "../moves";

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

  const canResolve = computed(() => {
    const thread = activeThread.value;
    if (!thread) return false;
    return (thread.doc?.text ?? "").trim().length > 0;
  });

  const resolveDialog = reactive({ open: false, value: "" });
  const acknowledgeOpen = ref(false);
  const synthesisAcknowledged = ref(false);
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
    if (frame.synthesis) return { label: "Synthesis", icon: "mdi-set-merge", symbol: "" };

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

  // The passage this thread was opened on, with its tag, so the tag can be
  // changed by tap from inside the thread (touch has no hover on the passage).
  const currentAnchor = computed(() => {
    const anchor = viewFrame.value?.parentAnchor;
    const pad = currentContext.value;
    if (!anchor?.annotationId || !pad) return null;
    const parentLocator = anchor.parentFrameId ?? null;
    const ann = (padForThread(pad, parentLocator)?.annotations ?? []).find((a) => a.id === anchor.annotationId);
    return ann ? { annotationId: ann.id, padLocator: parentLocator, tag: ann.tag ?? null } : null;
  });
  const tagChoices = ANNOTATION_TAG_LIST.map((id) => ({ id, ...ANNOTATION_TAG_DISPLAY[id] }));
  function setCurrentTag(tag) {
    const a = currentAnchor.value;
    if (!a) return;
    padStore.tagAnnotation({ annotationId: a.annotationId, padLocator: a.padLocator, tag: a.tag === tag ? null : tag });
  }

  // Threads drilled from the level on screen, at any depth (G6).
  const drillThreads = computed(() => drillThreadsAt(currentContext.value, surfaceHead.value));

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

  // Set when Back leaves a thread that has work but is not resolved, so the
  // page can say where it went. Informational only; nothing blocks Back.
  const leftOpen = ref(null);

  function handleAscend() {
    const head = padStore.surfaceHead;
    padStore.ascendThread();
    const left = drillThreads.value.find((d) => d.threadId === head);
    leftOpen.value = left && left.hasWork && left.status !== "resolved"
      ? { title: left.title, status: left.status }
      : null;
  }

  function handleResolve() {
    const head = padStore.surfaceHead;
    if (typeof head !== "string" || !head || !canResolve.value) return;
    // The open-item gate first: every move started here must be decided.
    if (openItems.value.length) {
      gateOpen.value = true;
      return;
    }
    gateOpen.value = false;
    // A synthesis replaces the whole draft: threads still open there are
    // acknowledged first (not resolved); their work moves under the thesis.
    if (padStore.synthesisAcknowledge.length && !synthesisAcknowledged.value) {
      acknowledgeOpen.value = true;
      return;
    }
    synthesisAcknowledged.value = false;
    // Not converged to one block: ask for the synthesized result.
    if (needsSynthesis.value) {
      resolveDialog.value = "";
      resolveDialog.open = true;
      return;
    }
    padStore.resolveThreadIntoParent({ threadId: head });
  }

  function confirmAcknowledge() {
    acknowledgeOpen.value = false;
    synthesisAcknowledged.value = true;
    handleResolve();
  }

  function confirmResolve() {
    const text = resolveDialog.value.trim();
    if (!text) return;
    const head = padStore.surfaceHead;
    if (typeof head !== "string" || !head) return;
    padStore.resolveThreadIntoParent({ threadId: head, result: text });
    resolveDialog.open = false;
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
    canResolve,
    needsSynthesis,
    resolveDialog,
    resolveMove,
    confirmResolve,
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
    currentAnchor,
    tagChoices,
    setCurrentTag,
    leftOpen,
    acknowledgeOpen,
    confirmAcknowledge,
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
    handleResolve,
    handleDisposeOpenItem,
    handleClearDisposition,
    handleGoToOpenItem,
    restoreResumableContext,
    handleDeleteDocument,
  });
}
