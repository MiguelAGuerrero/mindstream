// ---------------------------------------------------------------------------
// ThinkPadHighlights — a TipTap extension that paints annotation spans as
// ProseMirror inline decorations.
//
// This replaces the old "transparent textarea over a mirror div" trick. The
// mirror approach had to keep a second element pixel-aligned with the textarea
// (font, scroll, wrapping) — brittle by construction. Decorations are rendered
// by the editor itself at real document positions, so there is nothing to keep
// in sync.
//
// Phase 1 scope: annotation offsets are still point-in-time snapshots stored on
// the domain model (same as the textarea era). We recompute decorations from
// those stored offsets whenever the doc or the annotation list changes. This
// faithfully reproduces today's behaviour — including the fact that editing
// before a span lets it drift — until Phase 4 makes marks own positions.
// ---------------------------------------------------------------------------

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { computeHighlightSegments, findBareUrls } from "./thinkPadHighlights";
import { charToPos, docJSONToText } from "./thinkPadDoc";

export const thinkPadHighlightKey = new PluginKey("thinkPadHighlights");

/** Build a DecorationSet for the current doc from snapshot annotation offsets and
 *  optional candidate spans (paragraph blocks surfaced in cultivate mode).
 *  focusedBlockIndex (null = no focus) triggers the single-block viewing strategy:
 *  the focused span gets --candidate-focused, all others get --candidate-receded. */
function buildDecorations(doc, annotations, candidateSpans, focusedBlockIndex) {
  try {
    const text = docJSONToText(doc.toJSON());
    const decos = [];

    // Annotation highlights — anchored / resolved / hidden.
    const segments = computeHighlightSegments(text, annotations ?? []);
    for (const seg of segments) {
      if (seg.kind === "plain") continue;
      const tagCls = seg.tag ? ` thinkpad-hl--tag-${seg.tag}` : "";
      const cls =
        seg.kind === "resolved"
          ? "thinkpad-hl thinkpad-hl--resolved"
          : seg.kind === "hidden"
            ? "thinkpad-hl thinkpad-hl--hidden"
            : seg.kind === "link"
              ? "thinkpad-hl thinkpad-hl--link"
              : seg.kind === "source"
                ? "thinkpad-hl thinkpad-hl--source"
                : `thinkpad-hl thinkpad-hl--anchored${tagCls}`;
      // Annotated (non-plain) spans carry their id + char range as data attributes
      // so the panel's click/hover handlers can route to the right annotation without
      // a ProseMirror position-to-char round-trip.
      const attrs = { class: cls };
      if (seg.annotationId && seg.kind !== "hidden") {
        attrs["data-annotation-id"] = seg.annotationId;
        attrs["data-annotation-start"] = String(seg.start);
        attrs["data-annotation-end"] = String(seg.end);
        attrs["data-annotation-kind"] = seg.kind;
      }
      decos.push(Decoration.inline(charToPos(seg.start), charToPos(seg.end), attrs));
    }

    // Bare URLs read as links (Revision 15); the text itself is unchanged.
    for (const u of findBareUrls(text)) {
      decos.push(Decoration.inline(charToPos(u.start), charToPos(u.end), {
        class: "thinkpad-url",
        "data-href": u.href,
      }));
    }

    // Candidate spans — rendered after annotations so committed work wins on overlap.
    // Each span carries data attributes so a click handler can recover the char range.
    // When focusedBlockIndex is non-null, differentiate focused vs receded classes so
    // CSS can implement the single-block viewing strategy without DOM restructuring.
    const hasFocus = focusedBlockIndex !== null && focusedBlockIndex !== undefined;
    for (let i = 0; i < (candidateSpans ?? []).length; i++) {
      const span = candidateSpans[i];
      const from = charToPos(span.start);
      const to = charToPos(span.end);
      if (from >= to) continue;
      const focusCls = hasFocus
        ? i === focusedBlockIndex
          ? " thinkpad-hl--candidate-focused"
          : " thinkpad-hl--candidate-receded"
        : "";
      decos.push(
        Decoration.inline(from, to, {
          class: `thinkpad-hl thinkpad-hl--candidate${focusCls}`,
          "data-candidate-start": String(span.start),
          "data-candidate-end": String(span.end),
          "data-candidate-index": String(i),
        }),
      );
    }

    return DecorationSet.create(doc, decos);
  } catch {
    // Never let a decoration miscalculation take down the editor.
    return DecorationSet.empty;
  }
}

export const ThinkPadHighlights = Extension.create({
  name: "thinkPadHighlights",

  addOptions() {
    return { annotations: [], candidateSpans: [], focusedBlockIndex: null };
  },

  addCommands() {
    return {
      // Push a fresh annotation list; recomputes decorations on the next tick.
      setAnnotations:
        (annotations) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            dispatch(tr.setMeta(thinkPadHighlightKey, { annotations: annotations ?? [] }));
          }
          return true;
        },
      // Push a fresh candidate span list (paragraph blocks for cultivate mode).
      setCandidateSpans:
        (candidateSpans) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            dispatch(tr.setMeta(thinkPadHighlightKey, { candidateSpans: candidateSpans ?? [] }));
          }
          return true;
        },
      // Set which candidate block is focused (null = no focus, all blocks at rest).
      setFocusedBlockIndex:
        (index) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            dispatch(tr.setMeta(thinkPadHighlightKey, { focusedBlockIndex: index ?? null }));
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const initialAnnotations = this.options.annotations ?? [];
    const initialCandidateSpans = this.options.candidateSpans ?? [];
    const initialFocusedBlockIndex = this.options.focusedBlockIndex ?? null;
    return [
      new Plugin({
        key: thinkPadHighlightKey,
        state: {
          init: (_config, state) => ({
            annotations: initialAnnotations,
            candidateSpans: initialCandidateSpans,
            focusedBlockIndex: initialFocusedBlockIndex,
            decos: buildDecorations(state.doc, initialAnnotations, initialCandidateSpans, initialFocusedBlockIndex),
          }),
          apply: (tr, value, _oldState, newState) => {
            const meta = tr.getMeta(thinkPadHighlightKey);
            // Recompute when any tracked state changes OR the doc changes
            // (positions of snapshot-offset highlights are relative to text).
            if (meta) {
              const annotations = meta.annotations ?? value.annotations;
              const candidateSpans = meta.candidateSpans ?? value.candidateSpans;
              // Use `in` check so that explicitly passing null ("clear focus") is
              // distinguished from "not present in this meta dispatch".
              const focusedBlockIndex = "focusedBlockIndex" in meta ? meta.focusedBlockIndex : value.focusedBlockIndex;
              return {
                annotations,
                candidateSpans,
                focusedBlockIndex,
                decos: buildDecorations(newState.doc, annotations, candidateSpans, focusedBlockIndex),
              };
            }
            if (tr.docChanged) {
              return {
                annotations: value.annotations,
                candidateSpans: value.candidateSpans,
                focusedBlockIndex: value.focusedBlockIndex,
                decos: buildDecorations(newState.doc, value.annotations, value.candidateSpans, value.focusedBlockIndex),
              };
            }
            return value;
          },
        },
        props: {
          decorations(state) {
            return thinkPadHighlightKey.getState(state)?.decos ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});
