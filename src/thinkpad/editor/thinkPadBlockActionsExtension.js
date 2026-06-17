// ---------------------------------------------------------------------------
// ThinkPadBlockActions — TipTap extension that appends hover-revealed action
// buttons to each paragraph block in reflect mode.
//
// The domain layer (computeBlockActionStates) owns the WHAT: which blocks
// have drills, what tags they carry. This extension owns the HOW: finding
// those paragraphs by their UniqueID in the ProseMirror doc and inserting a
// Decoration.widget at the end of each paragraph's content.
//
// CSS in ThinkPadPanel.vue handles show/hide via `p:hover .thinkpad-block-actions`
// — no JS hover tracking needed.
// ---------------------------------------------------------------------------

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const thinkPadBlockActionsKey = new PluginKey("thinkPadBlockActions");

const TAG_CONFIG = [
  { tag: "question", glyph: "?", label: "Question", title: "Question — I'm uncertain about this" },
  { tag: "expand",   glyph: "!", label: "Expand",   title: "Expand — this needs more thought" },
  { tag: "converge", glyph: "⚑", label: "Flag",     title: "Flag — resolved or decided" },
];

function makeGlyphBtn(className, dataTag, title, glyph, label) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = className;
  btn.title = title;
  btn.setAttribute("data-tag", dataTag);
  const glyphEl = document.createElement("span");
  glyphEl.className = "thinkpad-block-action__glyph";
  glyphEl.textContent = glyph;
  btn.appendChild(glyphEl);
  const labelEl = document.createElement("span");
  labelEl.className = "thinkpad-block-action__label";
  labelEl.textContent = label;
  btn.appendChild(labelEl);
  return btn;
}

/** Build the inline widget DOM for one block. Vanilla DOM — no Vue. */
function createBlockWidget(state, onBlockAction) {
  const { nodeId, text, drill } = state;

  const root = document.createElement("span");
  root.className = "thinkpad-block-actions";
  root.setAttribute("contenteditable", "false");
  root.setAttribute("data-node-id", nodeId);

  if (drill) {
    // Existing drill: show a re-open affordance styled by its tag.
    const label = drill.completed ? "Reopen" : "Continue";
    const title = drill.completed ? "Re-open (resolved)" : "Continue drill";
    const btn = makeGlyphBtn(
      `thinkpad-block-action thinkpad-block-action--reopen${drill.tag ? ` thinkpad-block-action--${drill.tag}` : ""}`,
      "reopen",
      title,
      "↗",
      label,
    );
    root.appendChild(btn);
  } else {
    // No drill yet: show the three stance buttons.
    for (const { tag, glyph, label, title } of TAG_CONFIG) {
      const btn = makeGlyphBtn(
        `thinkpad-block-action thinkpad-block-action--${tag}`,
        tag,
        title,
        glyph,
        label,
      );
      root.appendChild(btn);
    }
  }

  root.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const btn = e.target.closest("[data-tag]");
    if (btn) onBlockAction(nodeId, btn.dataset.tag, text);
  });

  return root;
}

/** Traverse the doc and insert a widget at the end of every matching paragraph. */
function buildBlockDecorations(doc, blockStates, onBlockAction) {
  if (!blockStates?.length || !onBlockAction) return DecorationSet.empty;
  const stateByNodeId = new Map(blockStates.map((s) => [s.nodeId, s]));
  const decos = [];

  doc.descendants((node, pos) => {
    if (node.type.name !== "paragraph") return true;
    const nodeId = node.attrs?.id;
    if (!nodeId) return true;
    const state = stateByNodeId.get(nodeId);
    if (!state) return true;

    // pos + node.nodeSize - 1 is the last position inside the paragraph
    // (after all content, before the closing bracket). side: -1 keeps the
    // widget to the left of that position — inside the <p>, after the text.
    const widgetPos = pos + node.nodeSize - 1;
    decos.push(
      Decoration.widget(
        widgetPos,
        () => createBlockWidget(state, onBlockAction),
        {
          side: -1,
          // Stable key lets ProseMirror reuse the DOM node across re-renders
          // rather than recreating it on every doc change.
          key: `block-action-${nodeId}`,
          stopEvent: () => true,
        },
      ),
    );
    return true;
  });

  return DecorationSet.create(doc, decos);
}

export const ThinkPadBlockActions = Extension.create({
  name: "thinkPadBlockActions",

  addOptions() {
    return {
      /** [{ nodeId, text, start, end, drill }] from computeBlockActionStates */
      blockStates: [],
      /** (nodeId: string, tag: string, text: string) => void */
      onBlockAction: null,
    };
  },

  addCommands() {
    return {
      setBlockStates:
        (blockStates) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            dispatch(tr.setMeta(thinkPadBlockActionsKey, { blockStates }));
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const initialStates = this.options.blockStates ?? [];
    const onBlockAction = this.options.onBlockAction;

    return [
      new Plugin({
        key: thinkPadBlockActionsKey,
        state: {
          init: (_config, editorState) => ({
            blockStates: initialStates,
            decos: buildBlockDecorations(editorState.doc, initialStates, onBlockAction),
          }),
          apply: (tr, value, _old, newState) => {
            const meta = tr.getMeta(thinkPadBlockActionsKey);
            const blockStates = meta?.blockStates ?? value.blockStates;
            if (meta || tr.docChanged) {
              return {
                blockStates,
                decos: buildBlockDecorations(newState.doc, blockStates, onBlockAction),
              };
            }
            return value;
          },
        },
        props: {
          decorations(state) {
            return thinkPadBlockActionsKey.getState(state)?.decos ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});
