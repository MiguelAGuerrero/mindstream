<script setup>
import { ref, watch, nextTick, computed, onBeforeUnmount, onMounted } from "vue";
import { onClickOutside } from "@vueuse/core";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import HardBreak from "@tiptap/extension-hard-break";
import History from "@tiptap/extension-history";
import Placeholder from "@tiptap/extension-placeholder";
import UniqueID from "@tiptap/extension-unique-id";
import { textToDocJSON, docJSONToText, docJSONToNodes, posToChar, charToPos, textToInlineJSON } from "../editor/thinkPadDoc";
import { ThinkPadHighlights } from "../editor/thinkPadHighlightExtension";
import { ThinkPadBlockActions } from "../editor/thinkPadBlockActionsExtension";
import { computeBlockActionStates, computeGutterRows } from "../domain/blockActions";
import { readDocIdeas } from "../domain/ideas";
import IdeaGutter from "./IdeaGutter.vue";
import { emitAudioEvent } from "../../sfx";
import { titleDisplayMode } from "../editor/thinkPadTitle";

/** Think-pad page gutter only — 0.5in at 96dpi (matches letter sheet constants). */
// Scales with the screen: 0.5in on a desktop page, down to 16px on a phone.
const pageMarginInset = "clamp(16px, 5vw, 48px)";

const props = defineProps({
  thinkPad: { type: Object, default: () => ({ text: "", annotations: [] }) },
  /** Document title — rendered as an inline, editable header above the body. */
  title: { type: String, default: "" },
  currentStepTitle: { type: String, default: "" },
  active: { type: Boolean, default: false },
  /** Expanded (wide working surface) vs the default moderate card. */
  expanded: { type: Boolean, default: false },
  /** Embedded in session notes grid instead of a drawer panel. */
  embedded: { type: Boolean, default: false },
  /** On-cue highlighting: when set, ONLY this step's annotation span is painted
   *  (e.g. while its move is hovered in the Moves panel). Null → nothing
   *  highlighted, so a heavily-annotated page stays calm and readable. */
  highlightStepId: { type: [String, null], default: null },
  /** Read-only surface (the parent "peek"): no editing, no popover, no emits. */
  readOnly: { type: Boolean, default: false },
  /** Reflect (cultivate) mode: the document is stamped and the user is making
   *  moves. Enables the bubble menu even though the surface is readOnly for
   *  typing. False in stream mode — writing should be uninterrupted. */
  reflectMode: { type: Boolean, default: false },
  /** Which pad this panel edits — null = root document, a frame id = that sub-pad.
   *  Emitted back with update:text so a late flush (debounce or unmount) routes to
   *  THIS pad, not whichever surface is focused when it fires. (wrong-pad race) */
  padLocator: { type: [String, null], default: null },
  /**
   * Drill-down threads anchored to spans in this surface.
   * Each entry: { threadId, annotationId, title, anchorText, hasWork, completed }.
   * When non-empty, a subtle outline trigger appears in the bar and the selection
   * popover offers "Re-open" for any span that already has a drill.
   */
  drillThreads: { type: Array, default: () => [] },
  /** Candidate spans from parseBlocks — painted as clickable suggestion handles in
   *  cultivate mode. Each entry: { id, start, end, text }. Empty outside cultivate. */
  candidateSpans: { type: Array, default: () => [] },
  /** Staged move outputs shown as inline markers beside their anchor blocks. */
  stagedIdeas: { type: Array, default: () => [] },
});

const emit = defineEmits(["update:text", "update:nodes", "update:title", "extract-step", "drill-span", "hide-span", "reveal-hidden", "focus", "reopen-drill", "tag-span", "reorder-block", "idea-peek", "link-span", "source-span", "open-link", "send-span"]);

const bodyRef = ref(null);
const marginsRef = ref(null);
const scrollRef = ref(null);
const editorWrapRef = ref(null);
const popoverRef = ref(null);
const hoverPickerRef = ref(null);
const editorHostRef = ref(null);
const titleRef = ref(null);
const localTitle = ref(props.title ?? "");
// "heading" (short, label-like) vs "quote" (long, sentence-like). Reactive to
// live typing so the title morphs as it crosses the length boundary.
const titleMode = computed(() => titleDisplayMode(localTitle.value));
const selectionState = ref(null);
const popoverPos = ref({ top: 0, left: 0 });
// Hover state for annotated spans — shows a small tag picker near the span.
const hoveredAnnotationId = ref(null);
const hoverPickerPos = ref({ top: 0, left: 0, below: false });
let hoverHideTimer = null;
// Block-focus state for the single-block viewing strategy in reflect mode.
// hoveredBlockIdx: transient (clears on mouse-leave).
// focusedBlockIdx: persists after click until selection is dismissed.
// activeBlockIdx drives both the decoration class and the CSS focus-mode class.
const hoveredBlockIdx = ref(null);
const focusedBlockIdx = ref(null);
const activeBlockIdx = computed(() => focusedBlockIdx.value ?? hoveredBlockIdx.value);
// When a full candidate block is the active selection, this is its index in
// candidateSpans — used to show reorder controls in the mini picker.
const selectedBlockIdx = computed(() => {
  if (!selectionState.value || !props.candidateSpans?.length) return null;
  const { start, end } = selectionState.value;
  const idx = props.candidateSpans.findIndex((s) => s.start === start && s.end === end);
  return idx >= 0 ? idx : null;
});
let textDebounceTimer = null;
// Guards so programmatic content/focus changes don't masquerade as user intent.
let programmaticContent = false;
let programmaticFocus = false;
// Bubble-menu gate: only reveal the toolbar once the mouse is released (not
// while dragging to select). Keyboard selections bypass this — they fire
// onSelectionUpdate without a preceding mousedown, so they show immediately.
let isMouseDown = false;
let selectionPending = false;
const currentNodes = ref([]);

const storedIdeas = computed(() => readDocIdeas(props.thinkPad));

/** Live editor nodes win for block widgets — they carry the UniqueID attrs PM matches on. */
const docIdeas = computed(() => {
  const live = currentNodes.value.filter((n) => n?.id);
  if (live.length > 0) return live;
  return storedIdeas.value;
});

const popoverStyle = computed(() => ({
  top: `${popoverPos.value.top}px`,
  left: `${popoverPos.value.left}px`,
  // Flip to below-selection when there isn't room above (near the top of the viewport).
  transform: popoverPos.value.below
    ? "translate(-50%, 8px)"
    : "translate(-50%, calc(-100% - 8px))",
}));

const hoverPickerStyle = computed(() => ({
  top: `${hoverPickerPos.value.top}px`,
  left: `${hoverPickerPos.value.left}px`,
  transform: hoverPickerPos.value.below
    ? "translate(-50%, 6px)"
    : "translate(-50%, calc(-100% - 6px))",
}));

// The annotation(s) to actually paint right now — driven by the hovered move in
// the Moves panel. Empty when nothing is cued, so the page shows no highlights
// by default. Depends on both the cue and the annotation geometry.
const cuedAnnotations = computed(() => {
  const id = props.highlightStepId;
  if (!id) return [];
  return (props.thinkPad?.annotations ?? []).filter((a) => a.stepId === id && !a.lost);
});

// Hidden spans collapse ALWAYS (independent of the hover cue); the cued span
// (a hovered move) paints on top. The editor's decoration set is the union.
const hiddenAnnotations = computed(() =>
  // A passage whose words are gone is `lost`; painting it would mark the wrong text.
  (props.thinkPad?.annotations ?? []).filter((a) => a.hidden === true && !a.lost),
);
// Links and "needs a source" marks are always painted, so you can see and tap them.
const markedAnnotations = computed(() =>
  (props.thinkPad?.annotations ?? []).filter((a) => (a.link || a.needsSource === true) && !a.lost && a.hidden !== true),
);
const paintedAnnotations = computed(() => [...hiddenAnnotations.value, ...markedAnnotations.value, ...cuedAnnotations.value]);
const hiddenCount = computed(() => hiddenAnnotations.value.length);

const blockStates = computed(() => {
  if (!props.reflectMode) return [];
  return computeBlockActionStates(
    docIdeas.value,
    props.thinkPad?.annotations ?? [],
    props.drillThreads ?? [],
  );
});

const gutterRows = computed(() => {
  if (!props.reflectMode) return [];
  return computeGutterRows(docIdeas.value, props.stagedIdeas ?? []);
});

function handleIdeaPeek(stepId) {
  emit("idea-peek", stepId);
}

function setHoveredBlockIdx(idx) {
  const next = typeof idx === "number" && idx >= 0 ? idx : null;
  if (next === hoveredBlockIdx.value) return;
  hoveredBlockIdx.value = next;
  if (next !== null) emitAudioEvent("thinkpad", "idea", "hover");
}


/** Scroll the writing column so the caret stays visible. ProseMirror's default
 *  walks ancestors with overflow:hidden on __body and misses __scroll. */
const SCROLL_CARET_MARGIN = { top: 12, bottom: 28 };

function scrollSelectionIntoView(view) {
  const scrollEl = scrollRef.value;
  if (!scrollEl) return false;
  const { head } = view.state.selection;
  const coords = view.coordsAtPos(head);
  const box = scrollEl.getBoundingClientRect();
  if (coords.top < box.top + SCROLL_CARET_MARGIN.top) {
    scrollEl.scrollTop += coords.top - box.top - SCROLL_CARET_MARGIN.top;
  } else if (coords.bottom > box.bottom - SCROLL_CARET_MARGIN.bottom) {
    scrollEl.scrollTop += coords.bottom - box.bottom + SCROLL_CARET_MARGIN.bottom;
  }
  return true;
}

const editor = useEditor({
  content: textToDocJSON(props.thinkPad?.text ?? "", storedIdeas.value),
  editable: !props.readOnly,
  extensions: [
    Document,
    Paragraph,
    Text,
    HardBreak,
    History,
    UniqueID.configure({ types: ["paragraph"] }),
    Placeholder.configure({
      placeholder: "Write freely. Switch to Reflect when you want to work on what you wrote.",
    }),
    ThinkPadHighlights.configure({
      annotations: paintedAnnotations.value,
      candidateSpans: props.candidateSpans ?? [],
    }),
    ThinkPadBlockActions.configure({
      blockStates: [],
      onBlockAction: handleBlockAction,
    }),
  ],
  onUpdate({ editor: ed }) {
    if (programmaticContent) return;
    const json = ed.getJSON();
    const nodes = docJSONToNodes(json);
    // Always keep currentNodes current so blockStates (and block action widgets)
    // stay in sync — including in readOnly/reflect mode where UniqueID stamps
    // IDs after mount via appendTransaction.
    currentNodes.value = nodes;
    syncNodeIdsToStore(nodes);
    if (props.readOnly) return;
    const text = docJSONToText(json);
    clearTimeout(textDebounceTimer);
    textDebounceTimer = setTimeout(() => {
      textDebounceTimer = null;
      emit("update:text", text, props.padLocator, nodes);
      emit("update:nodes", nodes, props.padLocator);
    }, 600);
  },
  onSelectionUpdate({ editor: ed }) {
    const { from, to } = ed.state.selection;
    if (from === to) {
      selectionPending = false;
      if (selectionState.value) dismissSelection();
    } else if (props.reflectMode) {
      // Mouse drag in progress — wait for mouseup so the popover doesn't
      // flicker while the user is still selecting. Keyboard selection has no
      // preceding mousedown, so isMouseDown is false and we show immediately.
      if (isMouseDown) {
        selectionPending = true;
      } else {
        openSelectionPopover(ed.view, from, to);
      }
    }
    scrollSelectionIntoView(ed.view);
  },
  onFocus() {
    if (programmaticFocus) {
      programmaticFocus = false;
      return;
    }
    emit("focus");
  },
  onBlur() {
    // Commit any pending (debounced) edit the moment focus leaves the editor —
    // e.g. clicking Back / Resolve / a move. This runs BEFORE the click's
    // handler, so a level change reads fresh store state (an untouched drill isn't
    // wrongly discarded) and the edit is never lost. Routing by padLocator keeps
    // it on THIS pad. (wrong-pad text race)
    if (props.readOnly) return;
    flushText();
  },
  editorProps: {
    handleScrollToSelection: scrollSelectionIntoView,
    scrollMargin: SCROLL_CARET_MARGIN,
    // Paste as PLAIN TEXT into the single paragraph: every newline becomes a
    // HardBreak. Without this, ProseMirror's default parser splits blank lines
    // into paragraphs the one-paragraph schema rejects, silently dropping text
    // (the old textarea kept newlines verbatim — this preserves that).
    handlePaste: (_view, event) => {
      const text = event.clipboardData?.getData("text/plain");
      if (text == null || text === "") return false;
      event.preventDefault();
      // Blank lines in pasted text split into separate paragraph nodes;
      // single \n within a paragraph becomes a HardBreak.
      const paras = text.split(/\n\n+/);
      const content = paras.map((p) => {
        const inline = textToInlineJSON(p);
        return inline.length ? { type: "paragraph", content: inline } : { type: "paragraph" };
      });
      if (content.length) editor.value?.commands.insertContent(content);
      return true;
    },
    handleDOMEvents: {
      mousedown: () => { isMouseDown = true; return false; },
      // Hover detection for two kinds of decoration spans:
      //   [data-annotation-id] — an existing annotation → show the tag picker
      //   [data-candidate-index] — a candidate block → single-block view dim/focus
      mouseover: (view, event) => {
        if (!props.reflectMode) return false;

        // Annotated span hover → show the stance tag picker near the span.
        const annTarget = event.target?.closest?.("[data-annotation-id]");
        if (annTarget) {
          clearTimeout(hoverHideTimer);
          const annotationId = annTarget.dataset.annotationId;
          if (annotationId !== hoveredAnnotationId.value) {
            hoveredAnnotationId.value = annotationId;
            const rect = annTarget.getBoundingClientRect();
            const below = rect.top < 60;
            hoverPickerPos.value = {
              top: below ? rect.bottom : rect.top,
              left: rect.left + rect.width / 2,
              below,
            };
          }
          return false;
        }

        // Candidate span hover — single-block viewing strategy (existing logic).
        const target = event.target?.closest?.("[data-candidate-index]");
        if (target) {
          const idx = parseInt(target.dataset.candidateIndex, 10);
          setHoveredBlockIdx(isNaN(idx) ? null : idx);
          return false;
        }
        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
        if (!coords) { setHoveredBlockIdx(null); return false; }
        const charPos = posToChar(coords.pos);
        const spans = props.candidateSpans ?? [];
        const idx = spans.findIndex((s) => charPos >= s.start && charPos < s.end);
        setHoveredBlockIdx(idx >= 0 ? idx : null);
        return false;
      },
      mouseleave: () => {
        hoveredBlockIdx.value = null;
        scheduleHoverHide();
        return false;
      },
      // Click routing:
      //   [data-annotation-id] → drill into the annotation (or re-open its drill)
      //   [data-candidate-start] → open the tag picker for that block
      click: (view, event) => {
        if (!props.reflectMode) return false;
        // A drag inside one block also fires a click on release. The drag's own
        // selection already opened the picker (handleDocMouseUp); treating this
        // click as a block click would widen it to the whole block (D11).
        if (!view.state.selection.empty) return false;

        // A link: open its sheet (URL or the linked paragraph as it was).
        const linkTarget = event.target?.closest?.('[data-annotation-kind="link"]');
        if (linkTarget) {
          emit("open-link", { annotationId: linkTarget.dataset.annotationId });
          return true;
        }
        // A bare URL in the text opens in a new tab.
        const urlTarget = event.target?.closest?.("[data-href]");
        if (urlTarget) {
          window.open(urlTarget.dataset.href, "_blank", "noopener");
          return true;
        }

        // Annotated span click: focus into the thought (drill / re-open).
        const annTarget = event.target?.closest?.("[data-annotation-id]");
        if (annTarget) {
          const annotationId = annTarget.dataset.annotationId;
          // Re-open if a drill thread already exists for this annotation.
          const drill = (props.drillThreads ?? []).find((d) => d.annotationId === annotationId);
          if (drill) {
            emit("reopen-drill", { threadId: drill.threadId });
            return true;
          }
          // No drill yet → open the mini picker at this span so user can tag + thread.
          const charStart = parseInt(annTarget.dataset.annotationStart ?? "NaN", 10);
          const charEnd = parseInt(annTarget.dataset.annotationEnd ?? "NaN", 10);
          if (isNaN(charStart) || isNaN(charEnd)) return false;
          const pmStart = charToPos(charStart);
          const pmEnd = charToPos(charEnd);
          const text = view.state.doc.textBetween(pmStart, pmEnd, "\n", "\n");
          selectionState.value = { start: charStart, end: charEnd, text: text || annTarget.dataset.annotationId };
          positionAboveSelection(view, pmStart);
          return true;
        }

        // Candidate span click: treat the pre-highlighted block as a selection
        // and show the tag picker for it.
        const target = event.target?.closest?.("[data-candidate-start]");
        if (!target) return false;
        const charStart = parseInt(target.dataset.candidateStart, 10);
        const charEnd = parseInt(target.dataset.candidateEnd, 10);
        if (isNaN(charStart) || isNaN(charEnd)) return false;
        const idx = parseInt(target.dataset.candidateIndex, 10);
        focusedBlockIdx.value = isNaN(idx) ? null : idx;
        const pmStart = charToPos(charStart);
        const pmEnd = charToPos(charEnd);
        const text = view.state.doc.textBetween(pmStart, pmEnd, "\n", "\n");
        if (!text) return false;
        selectionState.value = { start: charStart, end: charEnd, text };
        positionAboveSelection(view, pmStart);
        return true;
      },
    },
  },
});

onClickOutside(
  popoverRef,
  () => {
    if (selectionState.value) dismissSelection();
  },
  { ignore: [editorHostRef, hoverPickerRef] },
);

watch(
  () => props.active,
  (isActive) => {
    if (isActive) {
      setEditorContent(props.thinkPad?.text ?? "", storedIdeas.value);
      localTitle.value = props.title ?? "";
      dismissSelection();
      nextTick(autoGrowTitle);
      nextTick(focusPad);
    } else {
      clearTimeout(textDebounceTimer);
    }
  },
);

// Repaint only the cued span(s). Fires when the hovered move changes OR the
// underlying annotation geometry changes (promote / resolve / edit).
watch(paintedAnnotations, (annotations) => {
  editor.value?.commands.setAnnotations(annotations ?? []);
});

// Push candidate spans into the decoration plugin whenever they change.
// Also clear block focus — the old index no longer maps to the new span list.
watch(() => props.candidateSpans, (spans) => {
  hoveredBlockIdx.value = null;
  focusedBlockIdx.value = null;
  editor.value?.commands.setCandidateSpans(spans ?? []);
}, { deep: true });

// Push the active block index into the decoration plugin so it can assign the
// correct CSS class (focused vs receded) without Vue knowing about ProseMirror internals.
watch(activeBlockIdx, (idx) => {
  editor.value?.commands.setFocusedBlockIndex(idx ?? null);
});

// Peek panels mount read-only; keep the editor's editable flag in sync if it flips.
watch(() => props.readOnly, (ro) => {
  editor.value?.setEditable(!ro);
});

// Seed currentNodes once the editor is ready (useEditor resolves asynchronously).
watch(editor, (ed) => {
  if (!ed) return;
  nextTick(() => {
    const nodes = docJSONToNodes(ed.getJSON());
    currentNodes.value = nodes;
    syncNodeIdsToStore(nodes);
  });
}, { immediate: true });

// Push block state changes into the extension whenever reflect mode, annotations,
// drill threads, or the doc itself changes.
watch(blockStates, (states) => {
  editor.value?.commands.setBlockStates(states);
}, { deep: true });

// Sync editor content when the underlying text changes externally (e.g. after
// advanceToNextDraft splices new text into the doc without going through the
// editor's onUpdate path). Skip if a user edit is still debouncing — the
// editor is the source of truth during that window.
watch(() => props.thinkPad?.text, (newText) => {
  if (textDebounceTimer !== null) return;
  const ed = editor.value;
  if (!ed) return;
  const currentText = docJSONToText(ed.getJSON());
  if (currentText !== (newText ?? "")) {
    setEditorContent(newText ?? "", storedIdeas.value);
  }
});

/** Replace the editor's content without emitting an update (avoids a feedback loop). */
function setEditorContent(text, ideas = storedIdeas.value) {
  const ed = editor.value;
  if (!ed) return;
  programmaticContent = true;
  ed.commands.setContent(textToDocJSON(text, ideas), { emitUpdate: false });
  programmaticContent = false;
  // Sync nodes after a programmatic content swap so blockStates stays current.
  nextTick(() => {
    const nodes = docJSONToNodes(ed.getJSON());
    currentNodes.value = nodes;
    syncNodeIdsToStore(nodes);
  });
}

/** Align doc.ideas in the store with editor UniqueID attrs (same text, stable ids). */
function syncNodeIdsToStore(nodes) {
  if (!nodes.length) return;
  const stored = storedIdeas.value;
  const same =
    stored.length === nodes.length
    && stored.every((idea, i) => idea.id === nodes[i]?.id && idea.text === nodes[i]?.text);
  if (same) return;
  const ed = editor.value;
  if (!ed) return;
  emit("update:text", docJSONToText(ed.getJSON()), props.padLocator, nodes);
}

function openSelectionPopover(view, from, to) {
  const text = view.state.doc.textBetween(from, to, "\n", "\n");
  if (!text) { dismissSelection(); return; }
  // posToChar maps PM positions back to the flat-string offsets the domain model
  // stores — the drill-span payload is byte-for-byte what the textarea emitted.
  selectionState.value = { start: posToChar(from), end: posToChar(to), text };
  positionAboveSelection(view, from);
}

// Position the bubble menu relative to the selection start using viewport-fixed
// coordinates (position:fixed), so the card is never clipped by the panel's
// overflow:hidden. Centered on the writing column, not the mouse cursor.
// Flips to below-selection when there isn't enough room above (near viewport top).
const BUBBLE_CARD_MAX_HEIGHT = 460;
function positionAboveSelection(view, from) {
  const coords = view.coordsAtPos(from);
  const margins = marginsRef.value;
  const colRect = margins?.getBoundingClientRect();
  const colCenter = colRect
    ? (colRect.left + colRect.right) / 2
    : coords.left;
  const below = coords.top < BUBBLE_CARD_MAX_HEIGHT + 8;
  popoverPos.value = { top: coords.top, left: colCenter, below };
}

function dismissSelection() {
  selectionState.value = null;
  focusedBlockIdx.value = null;
}

/** Move the currently-selected block one slot up or down.
 *  Only active when a full candidate block is selected (selectedBlockIdx != null). */
function reorderBlockUp() {
  const idx = selectedBlockIdx.value;
  if (idx == null || idx === 0) return;
  emit("reorder-block", { fromIdx: idx, toIdx: idx - 1, padLocator: props.padLocator });
  dismissSelection();
}

function reorderBlockDown() {
  const idx = selectedBlockIdx.value;
  if (idx == null || idx >= (props.candidateSpans?.length ?? 0) - 1) return;
  emit("reorder-block", { fromIdx: idx, toIdx: idx + 1, padLocator: props.padLocator });
  dismissSelection();
}

// How a thread's state reads in the thread menu (open-thread hygiene, Phase 1).
const THREAD_STATUS_LABEL = { open: "open", converged: "ready to resolve", resolved: "resolved" };
const unresolvedThreadCount = computed(() =>
  (props.drillThreads ?? []).filter((d) => d.status !== "resolved").length,
);

function drillTagIcon(tag) {
  if (tag === "question") return "mdi-help-circle-outline";
  if (tag === "expand") return "mdi-exclamation-thick";
  if (tag === "converge") return "mdi-flag-outline";
  return "mdi-arrow-top-right";
}

function drillTagColor(tag, completed) {
  if (completed) return "success";
  if (tag === "question") return "warning";
  if (tag === "expand") return "info";
  if (tag === "converge") return "primary";
  return undefined;
}

// Drill threads whose annotation overlaps the current selection — used to
// offer "Re-open" in the popover instead of (or alongside) "Focus (drill in)".
// Builds a Map per evaluation so no manual cache invalidation is needed.
const overlappingDrills = computed(() => {
  if (!selectionState.value || !props.drillThreads.length) return [];
  const { start, end } = selectionState.value;
  const drillMap = new Map(props.drillThreads.map((d) => [d.annotationId, d]));
  return (props.thinkPad?.annotations ?? [])
    .filter((a) => {
      const drill = drillMap.get(a.id);
      return drill && a.selectionStart < end && a.selectionEnd > start;
    })
    .map((a) => drillMap.get(a.id));
});

/** Re-enter an existing drill-down thread from the selection popover. */
function refocusDrill(drill) {
  emit("reopen-drill", { threadId: drill.threadId });
  dismissSelection();
}

/**
 * Drill into the selected span with an explicit stance tag.
 * The tag becomes metadata on the drill annotation — a first-level signal of
 * the user's relationship to this thought before the deeper work begins.
 */
function drillWithTag(tag) {
  if (!selectionState.value) return;
  const title = selectionState.value.text;
  flushText();
  emit("drill-span", {
    title,
    selectionStart: selectionState.value.start,
    selectionEnd: selectionState.value.end,
    selectedText: selectionState.value.text,
    tag,
  });
  dismissSelection();
}

/** Change the stance tag on an existing annotation via the hover picker. */
function changeAnnotationTag(tag) {
  if (!hoveredAnnotationId.value) return;
  emit("tag-span", { annotationId: hoveredAnnotationId.value, tag });
  hoveredAnnotationId.value = null;
}

function scheduleHoverHide() {
  clearTimeout(hoverHideTimer);
  hoverHideTimer = setTimeout(() => { hoveredAnnotationId.value = null; }, 180);
}

function clearHoverTimer() {
  clearTimeout(hoverHideTimer);
}

/** Link the selected text to a URL or another paragraph (the page asks which). */
function linkSelection() {
  if (!selectionState.value) return;
  flushText();
  emit("link-span", {
    selectionStart: selectionState.value.start,
    selectionEnd: selectionState.value.end,
    selectedText: selectionState.value.text,
  });
  dismissSelection();
}

/** Mark the selected text as needing a source: an open item until a link covers it. */
function sourceSelection() {
  if (!selectionState.value) return;
  flushText();
  emit("source-span", {
    selectionStart: selectionState.value.start,
    selectionEnd: selectionState.value.end,
    selectedText: selectionState.value.text,
  });
  dismissSelection();
}

/** Send the selected text elsewhere, one-way (the page shows the destinations). */
function sendSelection() {
  if (!selectionState.value) return;
  emit("send-span", { selectedText: selectionState.value.text });
  dismissSelection();
}

/** Hide the selected text from view — a pure visibility toggle, not a move. The
 *  parent records a hidden marker; the text stays in the doc and can be revealed. */
function hideSelection() {
  if (!selectionState.value) return;
  emit("hide-span", {
    selectionStart: selectionState.value.start,
    selectionEnd: selectionState.value.end,
    selectedText: selectionState.value.text,
  });
  dismissSelection();
}

/**
 * Handle a block widget button click. Routing:
 *   - tag="reopen" + existing drill → re-enter the existing thread
 *   - any other tag → create a new drill anchored to the whole block
 * The block's char range (start/end) is taken from blockStates so the domain
 * reducer receives the same selectionStart/End it would from a text selection.
 */
function handleBlockAction(nodeId, tag, text) {
  if (!props.reflectMode) return;
  const block = blockStates.value.find((b) => b.nodeId === nodeId);
  if (!block) return;
  if (tag === "reopen" && block.drill) {
    emit("reopen-drill", { threadId: block.drill.threadId });
    return;
  }
  flushText();
  emit("drill-span", {
    title: text,
    selectionStart: block.start,
    selectionEnd: block.end,
    selectedText: text,
    tag: tag === "reopen" ? undefined : tag,
  });
}

/** Drill into the selection immediately (no tag — plain thread). */
function focusSelection() {
  if (!selectionState.value) return;
  const title = selectionState.value.text;
  // Flush THIS pad to the store before descending — while viewThreadId still
  // points here. Otherwise a pending debounced edit would flush on unmount AFTER
  // the descend and land stale text on the freshly-seeded sub-pad.
  flushText();
  emit("drill-span", {
    title,
    selectionStart: selectionState.value.start,
    selectionEnd: selectionState.value.end,
    selectedText: selectionState.value.text,
  });
  dismissSelection();
}

let titleResizeObserver = null;

/** Keep the title textarea exactly as tall as its content: it sits on one line
 *  when short (reads as a heading) and wraps into a multi-line quote when long.
 *  Reset to "auto" first so it can shrink as well as grow. */
function autoGrowTitle() {
  const el = titleRef.value;
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.max(el.scrollHeight, 1)}px`;
}

/** Measure on the NEXT tick, after Vue has patched the length-driven mode class
 *  (heading↔quote). Measuring synchronously in @input reads scrollHeight at the
 *  pre-flip font size, mis-sizing the field exactly when the mode changes. */
function scheduleAutoGrow() {
  nextTick(autoGrowTitle);
}

/** Commit the title (on blur / Enter / flush). Independent of the body text.
 *  The title is one conceptual line, so any newlines a paste smuggled into the
 *  textarea collapse to a single space before committing. */
function commitTitle() {
  const next = localTitle.value.replace(/\s*[\r\n]+\s*/g, " ").trim();
  if (next !== localTitle.value) {
    localTitle.value = next; // reflect the cleanup back into the field
    nextTick(autoGrowTitle);
  }
  if (next !== (props.title ?? "")) emit("update:title", next);
}

function handleTitleKeydown(e) {
  if (e.key !== "Enter") return;
  e.preventDefault(); // never insert a newline; Enter commits and leaves the field
  e.target.blur(); // blur commits via @blur
}

function flushText() {
  clearTimeout(textDebounceTimer);
  textDebounceTimer = null;
  const ed = editor.value;
  if (ed) {
    const json = ed.getJSON();
    const text = docJSONToText(json);
    const nodes = docJSONToNodes(json);
    if (text !== (props.thinkPad?.text ?? "")) emit("update:text", text, props.padLocator, nodes);
    emit("update:nodes", nodes, props.padLocator);
  }
  commitTitle();
}

// A freshly-mounted active pad (cold launch, or switching documents) focuses
// the body so the user can type immediately. The active-watch only fires on
// transitions, so the initial mount needs its own focus.
function focusPad() {
  programmaticFocus = true;
  editor.value?.commands.focus("end");
}

// Resolves a pending selection (set during mouse-drag) once the mouse button
// is released. Attached to document so it fires even when the mouseup happens
// outside the editor element.
function handleDocMouseUp() {
  isMouseDown = false;
  if (!selectionPending) return;
  selectionPending = false;
  const ed = editor.value;
  if (!ed || !props.reflectMode) return;
  const { from, to } = ed.state.selection;
  if (from !== to) openSelectionPopover(ed.view, from, to);
}

onMounted(() => {
  document.addEventListener("mouseup", handleDocMouseUp);
  titleResizeObserver = new ResizeObserver(() => autoGrowTitle());
  nextTick(() => {
    autoGrowTitle();
    if (marginsRef.value) titleResizeObserver.observe(marginsRef.value);
  });
  if (props.active) nextTick(focusPad);
});

// Flush pending text/title when the panel unmounts (e.g. switching documents
// via the Open… picker remounts the panel) so nothing in the debounce buffer
// is lost. useEditor tears the editor down on unmount on its own.
onBeforeUnmount(() => {
  document.removeEventListener("mouseup", handleDocMouseUp);
  titleResizeObserver?.disconnect();
  titleResizeObserver = null;
  clearTimeout(hoverHideTimer);
  flushText();
});

defineExpose({ flushText, dismissSelection });
</script>

<template>
  <div
    class="thinkpad-panel d-flex flex-column w-100 h-100 min-h-0 min-w-0"
    :class="{
      'thinkpad-panel--embedded': embedded,
      'thinkpad-panel--card': !embedded,
      'thinkpad-panel--expanded': expanded && !embedded,
    }"
  >
    <div v-if="!embedded" class="thinkpad-panel__bar d-flex align-center flex-shrink-0">
      <button
        v-if="hiddenCount"
        type="button"
        class="thinkpad-reveal-chip"
        :title="`Show ${hiddenCount} hidden`"
        @click="emit('reveal-hidden')"
      >
        <v-icon icon="mdi-eye-off-outline" size="13" />
        <span>{{ hiddenCount }} hidden</span>
      </button>
      <v-menu v-if="drillThreads.length && reflectMode" location="bottom start" offset="4">
        <template #activator="{ props: menuProps }">
          <button
            type="button"
            class="thinkpad-reveal-chip"
            v-bind="menuProps"
            :title="`${drillThreads.length} thread${drillThreads.length !== 1 ? 's' : ''}, ${unresolvedThreadCount} not resolved`"
          >
            <v-icon icon="mdi-call-split" size="13" />
            <span>{{ drillThreads.length }} thread{{ drillThreads.length !== 1 ? 's' : '' }}<template v-if="unresolvedThreadCount"> · {{ unresolvedThreadCount }} open</template></span>
          </button>
        </template>
        <v-list density="compact" min-width="220" max-width="280" max-height="320">
          <v-list-subheader>Threads</v-list-subheader>
          <v-list-item
            v-for="drill in drillThreads"
            :key="drill.threadId"
            @click="emit('reopen-drill', { threadId: drill.threadId })"
          >
            <template #prepend>
              <v-icon
                :icon="drillTagIcon(drill.tag)"
                :color="drillTagColor(drill.tag, drill.completed)"
                size="14"
              />
            </template>
            <v-list-item-title class="text-body-2 text-truncate">{{ drill.title }}</v-list-item-title>
            <v-list-item-subtitle class="text-caption">
              {{ THREAD_STATUS_LABEL[drill.status] ?? "" }}<template v-if="drill.caveats"> · {{ drill.caveats }} caveat{{ drill.caveats === 1 ? "" : "s" }}</template>
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-menu>
      <v-spacer />
      <slot name="bar-end" />
    </div>
    <div ref="bodyRef" class="thinkpad-panel__body flex-grow-1">
      <!-- Margin frame: inset from the paper edge (card mode). Content scrolls inside
           __content only — the gutter is structural space, not padding on a scroller. -->
      <div ref="marginsRef" class="thinkpad-panel__margins">
        <header class="thinkpad-panel__header">
          <!-- Title lives in the margin frame (not the scroller) so it stays aligned
               with the writing column and remains visible while the body scrolls. -->
          <slot name="title">
            <textarea
              v-if="!embedded"
              ref="titleRef"
              v-model="localTitle"
              rows="1"
              class="thinkpad-title"
              :class="`thinkpad-title--${titleMode}`"
              placeholder="Untitled"
              aria-label="Document title"
              :readonly="readOnly"
              @input="scheduleAutoGrow"
              @blur="commitTitle"
              @keydown="handleTitleKeydown"
            />
          </slot>
          <p
            v-if="currentStepTitle && !embedded"
            class="thinkpad-panel__step-caption text-caption text-medium-emphasis text-truncate"
          >
            {{ currentStepTitle }}
          </p>
        </header>
        <div ref="scrollRef" class="thinkpad-panel__scroll">
          <div
            ref="editorWrapRef"
            class="thinkpad-editor-wrap"
            :class="{ 'thinkpad-editor-wrap--with-gutter': reflectMode && gutterRows.length }"
          >
            <div class="thinkpad-editor-wrap__body">
              <div
                ref="editorHostRef"
                class="thinkpad-editor"
                :class="{ 'thinkpad-editor--focus-mode': reflectMode && activeBlockIdx !== null }"
              >
                <EditorContent v-if="editor" :editor="editor" class="thinkpad-editor__content" />
              </div>
            </div>
            <IdeaGutter
              v-if="reflectMode && gutterRows.length"
              :rows="gutterRows"
              :editor="editor"
              :wrap-el="editorWrapRef"
              @peek="handleIdeaPeek"
            />
          </div>
        </div>
      </div>

      <!-- Mini tag picker — replaces the 9-move palette. Three glyphs represent
           the user's stance; picking one drills in immediately with that tag.
           Re-open entries appear first when a drill already exists for this span. -->
      <div
        v-if="selectionState"
        ref="popoverRef"
        class="thinkpad-mini-picker"
        :style="popoverStyle"
        role="menu"
        aria-label="Tag this thought"
      >
        <template v-if="overlappingDrills.length">
          <button
            v-for="drill in overlappingDrills"
            :key="drill.threadId"
            type="button"
            class="thinkpad-mini-picker__reopen"
            :title="drill.hasWork ? 'Continue your previous work' : 'Untouched — re-enter'"
            @click="refocusDrill(drill)"
          >
            <v-icon icon="mdi-arrow-top-right-thick" size="13" />
            <span>{{ drill.title }}</span>
          </button>
          <div class="thinkpad-mini-picker__sep" />
        </template>

        <div class="thinkpad-mini-picker__glyphs">
          <button
            type="button"
            class="thinkpad-tag-btn thinkpad-tag-btn--question"
            title="Question — I'm uncertain about this"
            @click="drillWithTag('question')"
          >
            <span class="thinkpad-tag-glyph">?</span>
            <span class="thinkpad-tag-label">Question</span>
          </button>
          <button
            type="button"
            class="thinkpad-tag-btn thinkpad-tag-btn--expand"
            title="Expand — this needs more thought"
            @click="drillWithTag('expand')"
          >
            <span class="thinkpad-tag-glyph">!</span>
            <span class="thinkpad-tag-label">Expand</span>
          </button>
          <button
            type="button"
            class="thinkpad-tag-btn thinkpad-tag-btn--converge"
            title="Flag — resolved or decided"
            @click="drillWithTag('converge')"
          >
            <span class="thinkpad-tag-glyph">⚑</span>
            <span class="thinkpad-tag-label">Flag</span>
          </button>
          <div class="thinkpad-mini-picker__sep thinkpad-mini-picker__sep--v" />
          <button
            type="button"
            class="thinkpad-tag-btn thinkpad-tag-btn--thread"
            title="Thread — open a sub-pad without tagging"
            @click="focusSelection"
          >
            <v-icon icon="mdi-arrow-top-right" size="13" />
            <span class="thinkpad-tag-label">Thread</span>
          </button>
          <!-- Reorder controls — only shown when a full candidate block is selected -->
          <template v-if="selectedBlockIdx !== null">
            <div class="thinkpad-mini-picker__sep thinkpad-mini-picker__sep--v" />
            <button
              type="button"
              class="thinkpad-tag-btn thinkpad-tag-btn--sm"
              :disabled="selectedBlockIdx === 0"
              title="Move block up"
              @click="reorderBlockUp"
            >
              <v-icon icon="mdi-arrow-up" size="13" />
            </button>
            <button
              type="button"
              class="thinkpad-tag-btn thinkpad-tag-btn--sm"
              :disabled="selectedBlockIdx >= (candidateSpans?.length ?? 0) - 1"
              title="Move block down"
              @click="reorderBlockDown"
            >
              <v-icon icon="mdi-arrow-down" size="13" />
            </button>
          </template>
          <button
            type="button"
            class="thinkpad-mini-picker__dismiss"
            title="Dismiss"
            @click="dismissSelection"
          >
            <v-icon icon="mdi-close" size="13" />
          </button>
        </div>

        <div v-if="!overlappingDrills.length" class="thinkpad-mini-picker__hide-row">
          <button type="button" class="thinkpad-mini-picker__hide-link" @click="linkSelection">
            <v-icon icon="mdi-link-variant" size="12" />
            <span>Link</span>
          </button>
          <button type="button" class="thinkpad-mini-picker__hide-link" @click="sourceSelection">
            <v-icon icon="mdi-book-search-outline" size="12" />
            <span>Needs source</span>
          </button>
          <button type="button" class="thinkpad-mini-picker__hide-link" @click="sendSelection">
            <v-icon icon="mdi-send-outline" size="12" />
            <span>Send…</span>
          </button>
          <button type="button" class="thinkpad-mini-picker__hide-link" @click="hideSelection">
            <v-icon icon="mdi-eye-off-outline" size="12" />
            <span>Hide from view</span>
          </button>
        </div>
      </div>

      <!-- Hover tag picker — appears over an existing annotated span on hover,
           letting the user change the stance tag without opening the drill. -->
      <div
        v-if="hoveredAnnotationId && !selectionState"
        ref="hoverPickerRef"
        class="thinkpad-hover-picker"
        :style="hoverPickerStyle"
        role="menu"
        aria-label="Change stance tag"
        @mouseenter="clearHoverTimer"
        @mouseleave="scheduleHoverHide"
      >
        <button
          type="button"
          class="thinkpad-tag-btn thinkpad-tag-btn--question thinkpad-tag-btn--sm"
          title="Question"
          @click="changeAnnotationTag('question')"
        >
          <span class="thinkpad-tag-glyph">?</span>
        </button>
        <button
          type="button"
          class="thinkpad-tag-btn thinkpad-tag-btn--expand thinkpad-tag-btn--sm"
          title="Expand"
          @click="changeAnnotationTag('expand')"
        >
          <span class="thinkpad-tag-glyph">!</span>
        </button>
        <button
          type="button"
          class="thinkpad-tag-btn thinkpad-tag-btn--converge thinkpad-tag-btn--sm"
          title="Flag"
          @click="changeAnnotationTag('converge')"
        >
          <span class="thinkpad-tag-glyph">⚑</span>
        </button>
        <div class="thinkpad-mini-picker__sep thinkpad-mini-picker__sep--v" />
        <button
          type="button"
          class="thinkpad-tag-btn thinkpad-tag-btn--sm"
          title="Clear tag"
          @click="changeAnnotationTag(null)"
        >
          <v-icon icon="mdi-close" size="11" />
        </button>
      </div>
    </div>
    <footer v-if="!embedded" class="thinkpad-panel__footer">
      <slot name="footer" />
    </footer>
  </div>
</template>

<style scoped>
/* Default surface: a document page (Google-Docs-like paper). The owning route
   sizes it to Letter proportions and centers it; here we paint the paper chrome.
   __body fills the sheet; __margins is the inset frame; __header + __scroll. */
.thinkpad-panel--card {
  --thinkpad-chrome-height: 32px;
  --thinkpad-footer-height: 44px;
  --thinkpad-margin-inset: v-bind(pageMarginInset);
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 3px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.16), 0 12px 28px rgba(0, 0, 0, 0.14);
  overflow: hidden;
}

/* Chrome trim — overlaid on the sheet edge so it does not steal document height. */
.thinkpad-panel--card .thinkpad-panel__bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2;
  height: var(--thinkpad-chrome-height);
  min-height: var(--thinkpad-chrome-height);
  padding: 4px 8px;
  box-sizing: border-box;
  background: rgba(168, 176, 190, 0.2);
  border-bottom: 1px solid rgba(168, 176, 190, 0.32);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
}

.thinkpad-panel--card .thinkpad-panel__body {
  position: absolute;
  top: var(--thinkpad-chrome-height);
  right: 0;
  bottom: var(--thinkpad-footer-height);
  left: 0;
  flex: none;
  width: auto;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.thinkpad-panel--card .thinkpad-panel__footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--thinkpad-footer-height);
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 0 12px;
  border-top: 1px solid rgba(var(--v-border-color), calc(var(--v-border-opacity) * 0.6));
  background: rgba(var(--v-theme-surface), 0.96);
  z-index: 2;
}

.thinkpad-panel--card .thinkpad-reveal-chip {
  padding: 2px 8px;
  font-size: 0.68rem;
}

/* Writing frame — one margin token for inset, vertical gaps, and chrome offset. */
.thinkpad-panel--card .thinkpad-panel__margins {
  position: absolute;
  top: 0;
  right: var(--thinkpad-margin-inset);
  bottom: 0;
  left: var(--thinkpad-margin-inset);
  display: flex;
  flex-direction: column;
  gap: 0;
  padding-top: var(--thinkpad-margin-inset);
  min-width: 0;
  min-height: 0;
}

.thinkpad-panel--embedded .thinkpad-panel__margins {
  position: static;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.thinkpad-panel__header {
  flex-shrink: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--thinkpad-margin-inset, 0);
  margin: 0;
  padding: 0;
}

.thinkpad-panel--card .thinkpad-panel__header {
  position: relative;
  z-index: 1;
  gap: var(--thinkpad-margin-inset);
  padding-bottom: var(--thinkpad-margin-inset);
  background: rgb(var(--v-theme-surface));
  /* Bottom edge only — no lateral or top bleed. */
  box-shadow: 0 6px 8px -6px rgba(0, 0, 0, 0.28);
}

.thinkpad-panel--card .thinkpad-panel__header .thinkpad-title,
.thinkpad-panel--card .thinkpad-panel__header :deep(.thinkpad-quote),
.thinkpad-panel--card .thinkpad-panel__step-caption {
  margin: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.thinkpad-panel--card .thinkpad-panel__header :deep(.thinkpad-quote) {
  display: block;
  padding-inline-start: 0.85rem;
  border-inline-start: 3px solid rgba(var(--v-theme-primary), 0.5);
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-family: var(--font-sans);
  font-size: 1.15rem;
  font-style: italic;
  font-weight: 500;
  line-height: 1.4;
  white-space: normal;
}

.thinkpad-panel__scroll {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
}

/* Pull the scroller under the title band so content passes beneath its shadow. */
.thinkpad-panel--card .thinkpad-panel__scroll {
  margin-top: calc(-1 * var(--thinkpad-margin-inset));
  padding-top: var(--thinkpad-margin-inset);
}

/* Reveal chip — an unobtrusive cue that some text is hidden; click to show all. */
.thinkpad-reveal-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 9px;
  border: 0;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-family: var(--font-sans);
  font-size: 0.72rem;
  cursor: pointer;
  transition: background-color 0.13s ease, color 0.13s ease;
}

.thinkpad-reveal-chip:hover {
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
}


/* Re-open items in the popover: a distinct accent vs the "new drill" item. */
.thinkpad-selection-popover__action--reopen :deep(.v-list-item-title) {
  color: rgb(var(--v-theme-primary));
  font-weight: 500;
}

.thinkpad-panel__body {
  position: relative;
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.thinkpad-panel--embedded .thinkpad-panel__body {
  min-height: 8rem;
}

/* Inline document title — in the margin frame header, above the scrolling body.
   Editing it never touches the body text.
   It's a textarea (not an input) so a long title can wrap: short titles read as
   a heading, long ones condense into a quote (see the --heading / --quote
   variants, chosen by length in titleDisplayMode). */
.thinkpad-title {
  flex-shrink: 0;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font-family: var(--font-sans);
  outline: none;
  /* textarea-as-title: hug the content, no scrollbar or drag handle */
  display: block;
  resize: none;
  overflow: hidden;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  word-break: break-word;
  /* No transition on font-size/padding: the heading↔quote switch must be
     instant so autoGrowTitle measures scrollHeight at the final font size
     (a mid-transition measurement would mis-size the textarea height). */
}

/* Short title → a deliberate heading. */
.thinkpad-title--heading {
  font-size: clamp(1.35rem, 1rem + 2vw, 1.75rem);
  font-weight: 600;
  font-style: normal;
  line-height: 1.25;
  letter-spacing: -0.01em;
  min-height: calc(clamp(1.35rem, 1rem + 2vw, 1.75rem) * 1.25);
}

/* Long title → condensed into a pulled quote: smaller, italic, and accented with
   a left rule. Mirrors the read-only sub-pad quote (.thinkpad-quote) so every
   "quote" surface reads the same, whether editable or not. */
.thinkpad-title--quote {
  padding-inline-start: 0.85rem;
  border-inline-start: 3px solid rgba(var(--v-theme-primary), 0.5);
  font-size: 1.2rem;
  font-weight: 500;
  font-style: italic;
  line-height: 1.4;
  letter-spacing: normal;
  min-height: calc(1.2rem * 1.4);
}

.thinkpad-title::placeholder {
  color: rgba(var(--v-theme-on-surface), 0.32);
  font-weight: 600;
  font-style: normal;
}

/* The TipTap writing surface grows with content; __scroll is the scrollport. */
.thinkpad-editor {
  position: relative;
  min-height: 12rem;
  min-width: 0;
}

.thinkpad-panel--embedded .thinkpad-editor {
  min-height: 7rem;
}

.thinkpad-editor :deep(.ProseMirror) {
  min-height: 12rem;
  outline: none;
  font-family: var(--font-sans);
  font-size: 1rem;
  line-height: 1.65;
  letter-spacing: normal;
  tab-size: 2;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  word-break: break-word;
  caret-color: rgb(var(--v-theme-primary));
  color: inherit;
}

.thinkpad-panel--embedded .thinkpad-editor :deep(.ProseMirror) {
  min-height: 7rem;
}

.thinkpad-editor :deep(.ProseMirror p) {
  margin: 0;
}

/* Placeholder: the empty paragraph renders the prompt via a ::before overlay. */
.thinkpad-editor :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
  color: rgba(var(--v-theme-on-surface), 0.38);
}

/* Annotation highlights — painted by the ThinkPadHighlights decoration plugin
   (decoration spans live inside the editor DOM, hence :deep). */
.thinkpad-editor :deep(.thinkpad-hl) {
  border-radius: 3px;
}

.thinkpad-editor :deep(.thinkpad-hl--anchored) {
  background: rgba(var(--v-theme-primary), 0.18);
  box-shadow: 0 0 0 1px rgba(var(--v-theme-primary), 0.22);
}

.thinkpad-editor :deep(.thinkpad-hl--resolved) {
  background: rgba(var(--v-theme-success), 0.16);
}

/* Hidden span: a pure visibility toggle — collapse it out of the document flow.
   The text stays in the model; revealing drops the marker and it reappears. */
.thinkpad-editor :deep(.thinkpad-hl--link),
.thinkpad-editor :deep(.thinkpad-url) {
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
  cursor: pointer;
}

.thinkpad-editor :deep(.thinkpad-hl--quote) {
  font-style: italic;
  color: rgba(var(--v-theme-on-surface), 0.78);
  border-left: 3px solid rgba(var(--v-theme-primary), 0.5);
  padding-left: 8px;
  cursor: pointer;
}

.thinkpad-editor :deep(.thinkpad-theme) {
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
}

.thinkpad-editor :deep(.thinkpad-hl--source) {
  text-decoration: underline wavy rgba(var(--v-theme-warning), 0.8);
  text-decoration-thickness: 1px;
  text-underline-offset: 4px;
}

.thinkpad-editor :deep(.thinkpad-hl--hidden) {
  display: none;
}

/* Candidate spans — paragraph blocks surfaced as suggestion handles in cultivate
   mode. Neutral tone (not blue/green) signals "available to declare" vs committed. */
.thinkpad-editor :deep(.thinkpad-hl--candidate) {
  background: rgba(var(--v-theme-on-surface), 0.05);
  border-bottom: 1px dashed rgba(var(--v-theme-on-surface), 0.22);
  border-radius: 2px;
  cursor: pointer;
}

.thinkpad-editor:not(.thinkpad-editor--focus-mode) :deep(.thinkpad-hl--candidate:hover) {
  background: rgba(var(--v-theme-on-surface), 0.09);
  border-bottom-color: rgba(var(--v-theme-on-surface), 0.4);
}

/* Single-block viewing strategy for reflect mode.
   When a block is hovered or clicked, dim the entire editor body and restore
   only the focused span. Color inheritance makes this work: .ProseMirror sets
   a low-opacity text color; the focused span overrides it inline. */
.thinkpad-editor--focus-mode :deep(.ProseMirror) {
  color: rgba(var(--v-theme-on-surface), 0.28);
  transition: color 0.12s ease;
}

.thinkpad-editor--focus-mode :deep(.thinkpad-hl--candidate-focused) {
  color: rgba(var(--v-theme-on-surface), 0.87);
  background: rgba(var(--v-theme-on-surface), 0.07);
  border-bottom: 1px dashed rgba(var(--v-theme-on-surface), 0.45);
}

.thinkpad-editor--focus-mode :deep(.thinkpad-hl--candidate-receded) {
  color: rgba(var(--v-theme-on-surface), 0.16);
  background: rgba(var(--v-theme-on-surface), 0.02);
  border-bottom-color: rgba(var(--v-theme-on-surface), 0.07);
  cursor: pointer;
}

/* ── Mini picker (on fresh selection) ───────────────────────────────── */
.thinkpad-mini-picker {
  position: fixed;
  z-index: 200;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
  padding: 6px;
  min-width: 210px;
  max-width: min(640px, calc(100vw - 32px));
  width: max-content;
}

.thinkpad-mini-picker__glyphs {
  display: flex;
  align-items: center;
  gap: 3px;
}

.thinkpad-mini-picker__sep {
  height: 1px;
  background: rgba(var(--v-border-color), var(--v-border-opacity));
  margin: 3px 0;
}

.thinkpad-mini-picker__sep--v {
  width: 1px;
  height: 20px;
  margin: 0 2px;
}

.thinkpad-mini-picker__reopen {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  padding: 4px 6px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgb(var(--v-theme-primary));
  font-family: var(--font-sans);
  font-size: 0.74rem;
  cursor: pointer;
  width: 100%;
}

.thinkpad-mini-picker__reopen span {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
}

.thinkpad-mini-picker__reopen:hover {
  background: rgba(var(--v-theme-primary), 0.1);
}

.thinkpad-mini-picker__dismiss {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.45);
  cursor: pointer;
  margin-left: auto;
}

.thinkpad-mini-picker__dismiss:hover {
  background: rgba(var(--v-theme-on-surface), 0.08);
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.thinkpad-mini-picker__hide-row {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 14px;
  padding-top: 1px;
}

.thinkpad-mini-picker__hide-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 5px;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.4);
  font-family: var(--font-sans);
  font-size: 0.7rem;
  cursor: pointer;
}

.thinkpad-mini-picker__hide-link:hover {
  background: rgba(var(--v-theme-on-surface), 0.07);
  color: rgba(var(--v-theme-on-surface), 0.65);
}

/* ── Tag buttons (shared by mini picker + hover picker) ─────────────── */
.thinkpad-tag-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 7px;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.75);
  font-family: var(--font-sans);
  font-size: 0.78rem;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.12s, border-color 0.12s, color 0.12s;
  flex-shrink: 0;
}

.thinkpad-tag-btn--sm {
  padding: 4px 7px;
  font-size: 0.74rem;
}

.thinkpad-tag-glyph {
  font-size: 1em;
  font-weight: 700;
  line-height: 1;
}

.thinkpad-tag-label {
  font-size: 0.72rem;
}

/* Question — blue/indigo */
.thinkpad-tag-btn--question {
  border-color: rgba(var(--v-theme-primary), 0.35);
  color: rgb(var(--v-theme-primary));
}
.thinkpad-tag-btn--question:hover {
  background: rgba(var(--v-theme-primary), 0.12);
  border-color: rgba(var(--v-theme-primary), 0.6);
}

/* Expand — amber/warning */
.thinkpad-tag-btn--expand {
  border-color: rgba(var(--v-theme-warning), 0.4);
  color: rgb(var(--v-theme-warning));
}
.thinkpad-tag-btn--expand:hover {
  background: rgba(var(--v-theme-warning), 0.12);
  border-color: rgba(var(--v-theme-warning), 0.65);
}

/* Converge / Flag — green */
.thinkpad-tag-btn--converge {
  border-color: rgba(var(--v-theme-success), 0.4);
  color: rgb(var(--v-theme-success));
}
.thinkpad-tag-btn--converge:hover {
  background: rgba(var(--v-theme-success), 0.12);
  border-color: rgba(var(--v-theme-success), 0.65);
}

/* Thread (no-tag drill) — neutral */
.thinkpad-tag-btn--thread {
  border-color: rgba(var(--v-border-color), var(--v-border-opacity));
  color: rgba(var(--v-theme-on-surface), 0.65);
}
.thinkpad-tag-btn--thread:hover {
  background: rgba(var(--v-theme-on-surface), 0.07);
}

.thinkpad-tag-btn:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 1px;
}

/* ── Tag-colored highlights inside the editor ───────────────────────── */
.thinkpad-editor :deep(.thinkpad-hl--tag-question) {
  background: rgba(var(--v-theme-primary), 0.14);
  border-bottom: 2px solid rgba(var(--v-theme-primary), 0.55);
}

.thinkpad-editor :deep(.thinkpad-hl--tag-expand) {
  background: rgba(var(--v-theme-warning), 0.13);
  border-bottom: 2px solid rgba(var(--v-theme-warning), 0.5);
}

.thinkpad-editor :deep(.thinkpad-hl--tag-converge) {
  background: rgba(var(--v-theme-success), 0.13);
  border-bottom: 2px solid rgba(var(--v-theme-success), 0.5);
}

/* ── Hover picker (over existing annotated span) ────────────────────── */
.thinkpad-hover-picker {
  position: fixed;
  z-index: 201;
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 4px 6px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.16);
}

/* Re-open action inside the popover */
.thinkpad-selection-popover__action--reopen :deep(.v-list-item-title) {
  color: rgb(var(--v-theme-primary));
}

/* ── Block action widgets ────────────────────────────────────────────── */
/* The widget is a Decoration.widget inserted at the end of each paragraph
   by ThinkPadBlockActions. It lives inside <p> so p:hover reveals it.
   CSS handles show/hide — no JS hover tracking required.               */

.thinkpad-editor :deep(.thinkpad-block-actions) {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: 8px;
  vertical-align: middle;
  opacity: 0;
  pointer-events: none;
  user-select: none;
  white-space: nowrap;
  transition: opacity 0.12s ease;
}

.thinkpad-editor :deep(p:hover .thinkpad-block-actions),
.thinkpad-editor :deep(.thinkpad-block-actions:focus-within) {
  opacity: 1;
  pointer-events: auto;
}

.thinkpad-editor :deep(.thinkpad-block-action) {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 20px;
  padding: 0 6px 0 5px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  background: rgb(var(--v-theme-surface));
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-family: var(--font-sans);
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.1s, border-color 0.1s, color 0.1s;
}

.thinkpad-editor :deep(.thinkpad-block-action__glyph) {
  font-size: 0.74rem;
  font-weight: 700;
}

.thinkpad-editor :deep(.thinkpad-block-action__label) {
  font-size: 0.68rem;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.thinkpad-editor :deep(.thinkpad-block-action--question) {
  color: rgb(var(--v-theme-primary));
  border-color: rgba(var(--v-theme-primary), 0.3);
}
.thinkpad-editor :deep(.thinkpad-block-action--question:hover) {
  background: rgba(var(--v-theme-primary), 0.1);
  border-color: rgba(var(--v-theme-primary), 0.55);
}

.thinkpad-editor :deep(.thinkpad-block-action--expand) {
  color: rgb(var(--v-theme-warning));
  border-color: rgba(var(--v-theme-warning), 0.35);
}
.thinkpad-editor :deep(.thinkpad-block-action--expand:hover) {
  background: rgba(var(--v-theme-warning), 0.1);
  border-color: rgba(var(--v-theme-warning), 0.6);
}

.thinkpad-editor :deep(.thinkpad-block-action--converge) {
  color: rgb(var(--v-theme-success));
  border-color: rgba(var(--v-theme-success), 0.35);
}
.thinkpad-editor :deep(.thinkpad-block-action--converge:hover) {
  background: rgba(var(--v-theme-success), 0.1);
  border-color: rgba(var(--v-theme-success), 0.6);
}

.thinkpad-editor :deep(.thinkpad-block-action--reopen) {
  color: rgb(var(--v-theme-primary));
  border-color: rgba(var(--v-theme-primary), 0.4);
}
.thinkpad-editor :deep(.thinkpad-block-action--reopen:hover) {
  background: rgba(var(--v-theme-primary), 0.1);
  border-color: rgba(var(--v-theme-primary), 0.65);
}

.thinkpad-editor-wrap {
  position: relative;
  --thinkpad-grid-gap: 10px;
}

.thinkpad-editor-wrap--with-gutter {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 28px;
  column-gap: var(--thinkpad-grid-gap);
  align-items: start;
}

.thinkpad-editor-wrap__body {
  min-width: 0;
}

/* Phones: the footer holds the Writing/Reflect pill, whose buttons are 40px
   tall here for tapping; give the strip room so the pill is not clipped. */
@media (max-width: 600px) {
  .thinkpad-panel--card {
    --thinkpad-footer-height: 56px;
    --thinkpad-chrome-height: 48px; /* room for 40px bar actions (Synthesize, Quote) */
  }
}
</style>
