// ---------------------------------------------------------------------------
// Moves — the quick-action vocabulary for annotating ThinkPad text.
//
// A "move" is a *stance you take toward a span of your own thinking*. It is the
// missing middle between two scales the app already has:
//
//   intent   (status detector) — a passive NOUN: what kind of thought this is
//   move     (this file)       — an active VERB:  one question, one insight
//   workflow (deferred)          — a heavyweight PROCEDURE: many steps, an artifact
//
// Every move has the same shape:  span → one driving question → a short insight
// written back into the document. A move can `escalatesTo` a full workflow when
// one question is not enough.
//
// Kept data-only and dependency-free so it is node-testable (vitest, no jsdom)
// and so all three consumers read from one table:
//   1. the selection popover in ThinkPadPanel.vue (the manual palette),
//   2. the lens prompt seed (a move's `prompt`),
//   3. the move-type chip rendered in IdeasPanel (reflect mode).
// ---------------------------------------------------------------------------

/**
 * Annotation tags — the three stances a user takes toward a highlighted span.
 * Tags are the lightweight first-level classification of a thought before (or
 * instead of) drilling into it. The deep move (which specific move) lives inside
 * the drill-down thread; the tag is the outer signal.
 *   question — "I'm uncertain about this"   (maps to clarify/doubt moves)
 *   expand   — "This needs elaboration"      (maps to branch/implications moves)
 *   converge — "Resolved or decided"         (maps to resolve move)
 */
export const ANNOTATION_TAGS = Object.freeze({
  QUESTION: "question",
  EXPAND: "expand",
  CONVERGE: "converge",
});
export const ANNOTATION_TAG_LIST = Object.freeze(["question", "expand", "converge"]);

/**
 * Canonical epistemic-intent classes, in detection precedence order
 * (first-match-wins). This is the ONE place the taxonomy is declared; the
 * future per-sentence detector (detectIntents.js) should import from here so a
 * second copy can never drift. Moves reference these strings in `answers`.
 */
export const INTENT_CLASSES = Object.freeze([
  "QUESTION",
  "PROBLEM",
  "DOUBT",
  "DECISION",
  "INTENTION",
  "IDEA",
  "CLAIM",
]);

/**
 * Phase register — when a move can be enacted relative to the stream/cultivate
 * cycle. Generative moves belong to the expand family; they can be enacted
 * WHILE writing (the detector recognises and auto-pins them in stream phase).
 * Reflective moves are cultivate-only: invoked deliberately on a frozen span.
 * See docs/stream-reflect-lifecycle.md §7.
 */
export const REGISTERS = Object.freeze({ GENERATIVE: "generative", REFLECTIVE: "reflective" });

/**
 * Write-back behaviour — how a move's output lands in the document.
 *   REPLACE  — output overwrites the anchored span (convergence: mess → result).
 *   ANNOTATE — output attaches beside the span, original kept (accretion).
 * Maps onto the existing annotation `resolved`/`placement` fields and
 * `resolveStepIntoDocument`. Only the convergent moves replace; everything that
 * adds a perspective annotates so the motivating thought is preserved.
 */
export const WRITE_BACK = Object.freeze({ REPLACE: "replace", ANNOTATE: "annotate" });

/**
 * Families group moves by the kind of stance they take — used to order and
 * (later) colour the palette. Ordered to trace the natural thinking arc.
 */
export const MOVE_FAMILIES = Object.freeze([
  { id: "sharpen", label: "Sharpen", hint: "Improve the formulation",            symbol: "◎" },
  { id: "examine", label: "Examine", hint: "Test a claim from both sides",        symbol: "?" },
  { id: "expand",  label: "Expand",  hint: "Generate new paths, links, consequences", symbol: "!" },
  { id: "converge", label: "Converge", hint: "Commit to an answer",              symbol: "✓" },
]);

/**
 * The default move set (Core 6 + Extended 3). Ordered for display: the divergence
 * → convergence cycle first, then the extended depth moves.
 *
 * Each move:
 *   id          stable kebab key (also the annotation `move` value seed)
 *   label       display name; shown on the move chip
 *   icon        mdi glyph for the palette button
 *   family      one of MOVE_FAMILIES.id
 *   hint        one-line tooltip — what the move does, imperative
 *   prompt      the driving question; seeds the lens prompt for the spawned step
 *   answers     intent classes this move is the natural response to
 *   writeBack   WRITE_BACK.REPLACE | WRITE_BACK.ANNOTATE
 *   escalatesTo a workflow template NAME (reserved for future workflow library),
 *               or null when no heavyweight procedure fits — escalation is optional
 */
export const MOVES = Object.freeze([
  // ---- Core 6 -------------------------------------------------------------
  {
    id: "clarify",
    label: "Clarify",
    icon: "mdi-target",
    family: "sharpen",
    register: REGISTERS.REFLECTIVE,
    hint: "Say what you actually mean, precisely.",
    prompt: "What do I actually mean here — in plain, specific terms?",
    answers: ["PROBLEM", "DOUBT"],
    writeBack: WRITE_BACK.REPLACE,
    escalatesTo: "Clarify The Problem",
    resolutionPlaceholder: "This actually means...",
  },
  {
    id: "doubt",
    label: "Doubt",
    icon: "mdi-sword-cross",
    family: "examine",
    register: REGISTERS.REFLECTIVE,
    hint: "Attack it — why might this be wrong?",
    prompt: "Why might this be wrong? What would have to be true for it to fail?",
    answers: ["CLAIM", "DECISION"],
    writeBack: WRITE_BACK.ANNOTATE,
    escalatesTo: "Review And Improve",
    resolutionPlaceholder: "I doubt this because...",
  },
  {
    id: "support",
    label: "Support",
    icon: "mdi-format-quote-close",
    family: "examine",
    register: REGISTERS.REFLECTIVE,
    hint: "Back it up with evidence or an example.",
    prompt: "What's my basis for this — evidence, an example, or a reason?",
    answers: ["CLAIM"],
    writeBack: WRITE_BACK.ANNOTATE,
    escalatesTo: "Research And Synthesize",
    resolutionPlaceholder: "This holds because...",
  },
  {
    id: "branch",
    label: "Branch",
    icon: "mdi-source-branch",
    family: "expand",
    register: REGISTERS.GENERATIVE,
    hint: "Lay out other ways to see or do this.",
    prompt: "What are other ways to see or do this?",
    answers: ["DECISION", "IDEA"],
    writeBack: WRITE_BACK.ANNOTATE,
    escalatesTo: "Disambiguate Options",
    resolutionPlaceholder: "Another way to see this...",
  },
  {
    id: "experiment",
    label: "Experiment",
    icon: "mdi-flask-outline",
    family: "expand",
    register: REGISTERS.GENERATIVE,
    hint: "Name the smallest test that would tell you.",
    prompt: "What's the smallest thing I could try that would tell me?",
    answers: ["INTENTION", "IDEA", "QUESTION"],
    writeBack: WRITE_BACK.ANNOTATE,
    escalatesTo: "Plan Execution",
    resolutionPlaceholder: "The smallest test I could run is...",
  },
  {
    id: "resolve",
    label: "Resolve",
    icon: "mdi-flag-checkered",
    family: "converge",
    register: REGISTERS.REFLECTIVE,
    hint: "Make the call and write the conclusion.",
    prompt: "Given what I now see, what's my call?",
    answers: ["QUESTION", "DECISION"],
    writeBack: WRITE_BACK.REPLACE,
    escalatesTo: "Make A Decision",
    resolutionPlaceholder: "My call is...",
  },

  // ---- Extended 3 ---------------------------------------------------------
  {
    id: "implications",
    label: "Implications",
    icon: "mdi-arrow-decision",
    family: "expand",
    register: REGISTERS.GENERATIVE,
    hint: "Trace what follows if this holds.",
    prompt: "If this holds, what follows? What does it change?",
    answers: ["CLAIM", "DECISION"],
    writeBack: WRITE_BACK.ANNOTATE,
    escalatesTo: null,
    resolutionPlaceholder: "If this holds, then...",
  },
  {
    id: "connect",
    label: "Connect",
    icon: "mdi-link-variant",
    family: "expand",
    register: REGISTERS.GENERATIVE,
    hint: "Link this to another thought or thread.",
    prompt: "What does this relate to — another thread, a prior decision, a pattern?",
    answers: ["IDEA"],
    writeBack: WRITE_BACK.ANNOTATE,
    escalatesTo: null,
    resolutionPlaceholder: "This connects to...",
  },
  {
    id: "reframe",
    label: "Reframe",
    icon: "mdi-rotate-3d-variant",
    family: "sharpen",
    register: REGISTERS.REFLECTIVE,
    hint: "Restate the whole thing from a new angle.",
    prompt: "What's a different framing of this whole thing?",
    answers: ["PROBLEM"],
    writeBack: WRITE_BACK.ANNOTATE,
    escalatesTo: "Clarify The Problem",
    resolutionPlaceholder: "A better framing is...",
  },
]);

/** Look up a move by id. Returns null when unknown. */
export function getMoveById(id) {
  return MOVES.find((m) => m.id === id) ?? null;
}

/**
 * Return the family symbol (◎ ? ! ✓) for a move id.
 * Falls back to null when the move or family is unknown.
 */
export function getSymbolForMove(id) {
  const move = getMoveById(id);
  if (!move) return null;
  return MOVE_FAMILIES.find((f) => f.id === move.family)?.symbol ?? null;
}

/**
 * Moves that are a natural response to a detected intent, in display order.
 * Used to rank/highlight the palette once a sentence's intent is known (and by
 * the future auto-suggest path). Returns [] for an unknown intent.
 */
export function movesForIntent(intent) {
  if (!INTENT_CLASSES.includes(intent)) return [];
  return MOVES.filter((m) => m.answers.includes(intent));
}

/** Moves grouped by family, in MOVE_FAMILIES order — for laying out the palette. */
export function movesByFamily() {
  return MOVE_FAMILIES.map((family) => ({
    family,
    moves: MOVES.filter((m) => m.family === family.id),
  }));
}

/**
 * Moves filtered by phase register. Pass REGISTERS.GENERATIVE for moves the
 * detector can auto-pin during stream, or REGISTERS.REFLECTIVE for cultivate-
 * only moves invoked deliberately on a frozen span. Returns [] for unknown register.
 */
export function movesByRegister(register) {
  if (register !== REGISTERS.GENERATIVE && register !== REGISTERS.REFLECTIVE) return [];
  return MOVES.filter((m) => m.register === register);
}
