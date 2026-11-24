# Stream vs Reflect — Phase Lifecycle (Design)

**Date:** 2026-06-04
**Status:** Design converged in conversation. Conceptual model + an implementation sketch grounded in the v9 entity-state model. **Not** a locked implementation contract — several decisions remain open (§10). Treat this as the brief that a future "lock it" pass (à la `recursive-resolve-contract.md`) would harden.
**Builds on:** `src/domain/thinkPadModel.js` (v9), the think-pad-first redesign, the park-vs-perform ideas model (`captureIdea` / `ideasForPanel`), `docs/recursive-resolve-contract.md`, `docs/batch-reflection-research.md`, and the status-detector direction.
**Origin (Miguel's words):** *"some of the 'mental moves' are things that I do in the act of writing… I'm not going to pause my stream of thoughts to annotate the thing I'm writing as an expansion of another. So I'm deliberating on how to clearly communicate reflection vs mind-streaming phases."*

---

## 1. The problem

The move vocabulary silently assumes one phase. `src/constants/moves.js` opens by defining a move as *"a stance you take toward a span of your own thinking."* That definition is inherently **reflective**: it presupposes the span already exists and you are now *regarding* it.

But some moves — the whole **`expand` family** (`branch`, `connect`, `implications`, `experiment`) — are things you *enact while writing*. You don't pause mid-stream to annotate "this expands that"; you just write the expansion. Tellingly, "expand" isn't even a move in the table — it's a `MOVE_FAMILIES` entry that fractured into four children, because a generative act resists being pinned to a single stance.

So two different activities wear the same "move" badge:

- **Generative acts** — enacted *in* the writing (the `expand` family). You do them; you don't label them.
- **Reflective stances** — taken *toward* already-written spans (`doubt`, `support`, `resolve`, `clarify`, `reframe`).

The app today has no representation of the **generative** phase, so it asks you to annotate things you would never stop to annotate. The fix is not a better palette — it is to make the two phases first-class.

---

## 2. The core reframe — phase is a property of the *material*, not a UI mode

A visual toggle only changes what you *see*. The stronger move is to make the phase a property of the **draft itself**:

- **Stream** — the draft is a **mutable** working surface. The only thing that changes the text is *typing*.
- **Reflect** — you **stamp** the draft and it becomes **read-only**. From here, text changes only via *moves*, whose outputs compose the next version.

Because reflection literally *cannot* free-edit the text, the mode is enforced by the substrate, not by a switch you might forget. The editability of the draft **is** the message. (The atmospheric design in §8 then *expresses* that state — but it is decorating a real state, not faking one.)

This turns "communicate reflection vs streaming" into a sharper line — **who holds initiative:**

| Phase | The user | The system | Draft |
|---|---|---|---|
| **Stream** | writes | only observes — the detector runs, nothing demands a response | mutable |
| **Reflect** | operates (moves) | assists — palette, gutter, panels come alive | frozen; output = a new version |

---

## 3. The lifecycle — seed → cultivate → re-seed

The two phases are not co-equal states you bounce between freely. They form a **lifecycle**, which is what lets the app be opinionated about it (Miguel: *"the mindstream phase is the first dump, but after that the user opts in to engage with their thoughts in a move-reflect-move… there has to be some opinionation and discipline enforced."*)

```
seed       → the first dump. Flow IS the default canvas. Get it all out.
             pins accrue (yours + the detector's) but nothing executes.

  ⟶ stamp  → freeze the draft (read-only). Pins surface as the move-agenda.

cultivate  → work-then-reveal. The resting state after the first stamp.
             (1) WORK PASS — complete moves against frozen vN; outputs stage
                 but do not splice. The document stays a stable map.
             (2) REVEAL PASS — apply all staged diffs atomically; mint vN+1.
             (3) STUDY BEAT — read vN+1 as a whole object; reassess the gap
                 against the goal declared at stamp (skippable, default on).

  ⟶ re-stream (escape hatch) → deliberately fork a NEW dump when reflection
             turns up something that needs raw generation. Then fall back to cultivate.
```

- **Seed** and **re-seed** are the *same primitive* (a stream) in different roles — one obligatory, one opt-in. The model stays small.
- The cultivate grain is **batch per pass** (work → reveal → study), not move-reflect-move on a mutating base. See `docs/batch-reflection-research.md` for the cognitive rationale. Sibling-span overlap at reveal is handled explicitly (§10.8) rather than sidestepped by incremental splice.

---

## 4. The pin — capturing the ebb-and-flow *during* typing

Streaming is not cleanly phased at the micro scale; you ebb in and out of tiny reflective eddies while writing (Miguel: *"something has to be available during the act of typing to capture that moment of ebbing and flowing"*). The **pin** is that capture — and it already exists in the model:

> A pin is a **parked idea**: `captureIdea(context, { selectionStart, selectionEnd, intent?, note? })` → an annotation with `stepId: null`. `src/domain/problemThreadModel.js:717` already describes it as *"the lowest-friction entry point… records that a span caught the user's interest, optionally typed by `intent`, without committing to any action."*

Design rules for the pin:

1. **It lives in the keystream, never the mouse.** A single keystroke (or an inline token the parser lifts out) — no right-click, no menu, no mode change. This is the thing "available during the act of typing."
2. **It does not execute.** The draft is still mutable; the pin only *records a deferred move-intent*. Choosing *which* move is a reflective act and is deferred to cultivate, where choosing is the whole point and costs no flow.
3. **Two sources, one shape.** A pin dropped by *you* (one keystroke) and a pin dropped by the *detector* (`detectIntents.js`, in progress) are the same parked-idea record, differing only in provenance. Both bloom as the agenda when you stamp.

On **stamp**, every parked idea on the draft becomes the proposed move-agenda for the cultivate pass. The micro-captures become the macro pass's backlog. (`ideasForPanel` already projects parked/active/resolved — the agenda is the `parked` set.) This is the affective hook: entering reflection feels like *receiving* ("here's everything that got noticed while you were flowing"), not chores.

---

## 5. The draft-version loop

This is the genuinely new machinery. Today the draft (`context.thinkPad = { text, annotations }`, `src/domain/problemThreadModel.js:113`) is always mutable, and `resolveStepIntoPad` (`:1150`) splices a move's output into `pad.text` **in place**. The version loop is a *state layer* over that splice:

### 5.1 What's new (additive, schema-v9 style)

- **A frozen/version state on the draft.** When you stamp, the current `text` becomes an immutable snapshot (version N) and the draft flips read-only. Added additively, default-filled by the normalizer, no schema bump — the exact pattern by which `focusFrameId`, `step.output`, and `frame.thinkPad` were added (see `recursive-resolve-contract.md` §5).
- **`stampDraft` reducer** — push the current text as version N, set read-only, freeze the agenda from parked ideas.
- **Read-only enforced in the reducer.** `setPadText` (`:897`) must no-op on a frozen draft. *This is where the discipline becomes physical* — free typing into a frozen draft is simply not a representable operation.
- **Versions advance at reveal boundaries, not per move.** During the work pass, move outputs **stage** against frozen vN; `resolveStepIntoPad` runs only inside **`revealReflectPass`**, applying all staged splices against the frozen snapshot and minting vN+1 in one step. **The existing splice logic is reused, not rewritten** — what's added is staging, the snapshot boundary, and the no-free-edit rule during work.

### 5.2 What the version model cleans up

- **REPLACE vs ANNOTATE stop being about *preservation*.** `WRITE_BACK` (`src/constants/moves.js:46`) currently uses `annotate` to *keep* the motivating text beside the output. With versions, version N preserves everything by definition, so the two write-backs collapse to *"how version N+1 reads"* — accretion vs convergence — not *"do we lose the original."*
- **It is consistent with "state on entities, no runtime event log."** Versioning is **snapshots at boundaries**, not keystroke-level event sourcing. The existing append-only `context.history` (`:1422`) remains a reflective *side-log* (it "NEVER derives runtime state") — the version chain is the actual draft lineage; history can annotate it.
- **The version timeline becomes a visible record of the rhythm.** Every transition is either a *stream-pass* (you wrote more) or a *reflect-pass* (a reveal of N staged moves → one new version). The history shows stream, reflect, stream, reflect — the ebb and flow — with no label needed.
- **Recursive resolve nests cleanly.** A drill-down sub-pad (`frame.thinkPad`) is its own stream→stamp→version loop whose converged result folds up as one diff in the parent (this is exactly `resolveFrameIntoParent`, §6.4 of the recursive-resolve contract).

---

## 6. Discipline with an escape hatch

> **Superseded (roadmap Revision 14, 2026-11-24).** Miguel decided that freezing is not a first-class, one-way stamp: a document is living, Reflect freezes it only while you are reflecting, and leaving Reflect returns to writing. The rest of this section describes the earlier design and is kept for its reasoning about discipline. See `PRODUCT_ASSESSMENT_AND_ROADMAP.md` §6 questions 9 to 11 for the open mechanics.

The escape back to flow must exist (you sometimes need to dump again mid-cultivation) but must not erode the loop. If bailing to flow is frictionless, people edit-in-place forever and never enter reflection — which is the entire value.

> **Symmetric ceremony, asymmetric gravity.** Both crossings are deliberate, *named* acts — you **stamp** to reflect, you **re-stream** to flow; neither happens by drifting or by clicking into the text. But the resting state after the first dump is reflect, every loop gesture is one keystroke, and re-streaming costs a conscious act. You are never trapped, never drifting, and the easy path is always the loop.

Two concrete enforcements:

1. **Re-stream forks a visibly-new dump.** You cannot pour raw text into a frozen draft, so escaping always creates a *new, labeled* stream segment. Re-dumping becomes honest: the timeline reads "reflected ×4, then re-dumped," so avoidance-by-dumping is something you can see. **Visibility is the discipline.**
   - *Mechanism note:* this reuses the **independent-sibling-frame shape** that `promoteSpanToMove` / `performMoveOnIdea` (`:654` / `:771`) already produce (own root frame, own pad, depth 1) — but as a free-write dump with no `parentAnchor`, rather than a span-anchored move. So it is a *new constructor in an existing family*, not an existing reducer verbatim.
2. **Flow is never the default canvas again** after the first stamp — it is *summoned*. The opinion lives in the defaults.

**Do not build:** nagging ("you've escaped 3 times without finishing a move"). The structure enforces the loop; the app should not moralize on top of it (consistent with `recursive-resolve-contract.md` research-rule #7: user-initiated and fading, never forced).

---

## 7. The move vocabulary — generative vs reflective

Tag each move with a **register** (Miguel confirmed the split matches his felt experience):

| Register | Moves | Where it lives | How it's made |
|---|---|---|---|
| **Generative** | the `expand` family — `branch`, `connect`, `implications`, `experiment` | enacted in **stream**; still *invokable* in cultivate | you write it; the detector *recognizes* and pins it. Never a demanded mid-stream annotation. |
| **Reflective** | `doubt`, `support`, `resolve`, `clarify`, `reframe` | **cultivate** only | invoked deliberately from the palette, on a frozen span. |

- Generative moves are **not removed** from the palette — in cultivate you may still deliberately "branch" a span. The register answers one question: *can this be enacted-while-writing and recognized by the detector?* Generative = yes; reflective = no (reflect-only).
- This dissolves the "three senses of expand": **enacted** (just write — stream), **relational** ("B expands A" — a structural read, cultivate), **tool-invoked** ("expand this for me" — a cultivate move). The palette today fuses the last two and ignores the first; the register + the detector give the first a home.
- Implementation: a `register` field on each entry in `MOVES`; the (in-progress) `detectIntents.js` auto-pins generative recognitions; the cultivate palette orders/filters by register.

---

## 8. Atmospheric design — making the phase *felt* (Miguel: *"evoke feelings that make engaging with that mode intuitive or streamlined"*)

The two modes should be **sensory opposites**, so you feel which one you're in before reading any label:

- **Stream** — narrow column, warm / low-contrast, the current line lit and the rest dimmed (typewriter focus), no edges, no panels, no chips, no counts. *Nothing on screen can be evaluated.* The quiet is the feature.
- **Reflect** — the room "lights up": cooler / daylight palette, margins populate, the gutter blooms with the pins that accrued, spans grow handles.

The **transition is the craftable moment** — a ~400–600ms ease where the world widens and the agenda surfaces. Lights-down to write, lights-up to look; that round-trip is the rhythm the hands learn. Entering reflect should read as *receiving* the system's quiet noticing, not as starting a chore.

---

## 9. How this maps onto the v9 model

| Concern | Exists today | New for this design |
|---|---|---|
| Draft substrate | `context.thinkPad = { text, annotations }` (`:113`) | a frozen/version state on it |
| The pin | `captureIdea` → parked idea, `stepId: null` (`:717`) | one-keystroke in-stream capture UI; detector auto-pin |
| Park→perform progression | `ideasForPanel`: parked / active / resolved (`:1464`) | add **staged**; parked set = stamped agenda |
| Performing a move | `promoteSpanToMove` / `performMoveOnIdea` (`:654` / `:771`) | lens → **stage** (not resolve) during work pass |
| Write-back | `resolveStepIntoPad` splices in place (`:1150`) | only inside `revealReflectPass`; staging during work |
| Staging / reveal | — | `stageStepOutput`, `revealReflectPass`, study beat |
| Re-stream | sibling-frame shape (own root frame + pad) | a *free-write dump* variant (no `parentAnchor`) |
| Read-only | none — `setPadText` always writes (`:897`) | reducer-level freeze guard |
| Reflection signal | `activeFrameId: null` commented "reflection mode" (`:101`) | promote to the explicit draft phase |
| Rhythm log | `context.history` append-only side-log (`:1422`) | the version chain as the visible stream/reflect timeline |
| Moves | `MOVES`, `MOVE_FAMILIES`, `INTENT_CLASSES`, `WRITE_BACK` | a `register` field; detector wiring |
| Recursion | `focusFrameId`, `resolveFrameIntoParent` | a drill = a nested stream→stamp→version loop |

**Conventions any new reducer must follow** (unchanged from the functional-core refactor): pure `(context, args, { now, makeId }) → context | { context, ... }`, same reference on no-op, no clock/id minting in the core (the shell supplies `now` / `makeId` via `src/stores/idClock.js`), additive persistence default-filled in `contextPersistenceMapper.js` with no schema bump.

---

## 10. Open questions / deferred decisions

1. **Versioning grain.** **Locked: per-pass.** During cultivate, the document stays frozen at vN while moves **stage**; **one version** (vN+1) is minted at **reveal**. Study beat reads the whole. Rationale: `docs/batch-reflection-research.md` §1–2. Per-move splice (today's behavior) is superseded for root cultivate.
2. **Cost of re-streaming.** Is re-stream *merely deliberate* (a named action, equal weight to stamp) or *genuinely harder* than a stamp (more friction, to bias harder toward staying in the loop)? Open.
3. **Detector pins vs user pins — visual treatment.** Surface auto-pins *as* pins alongside yours (one unified "to look at" field) or keep them distinct (mine = solid, system's = faint/suggested)? Open.
4. **Pin granularity.** Bare pin (one keystroke, zero choice — pure defer) only, or also an *optionally-typed* pin in stream (`/doubt`-style) for the rare case you know the move and want to mark it — still never executing live? Leaning: bare default, optional typed. Confirm.
5. **Scope of versioning.** Root draft only (`context.thinkPad`) in v1, or every pad (each `frame.thinkPad`, symmetric with recursive-resolve making sub-pads first-class)? Likely root-only v1.
6. **Relationship to `context.history`.** Does the version chain subsume parts of the side-log, or do they stay fully separate (history = reflective annotations *about* versions)?
7. **Re-stream as new dump vs new context.** Does a re-seed stay within the same `context` (a new mutable version/segment) or spawn a sibling root frame? §6 leans sibling-frame-family; verify against how the surface (`focusFrameId`) should behave across a re-dump.
8. **Conflict resolution at reveal.** When multiple staged moves target overlapping spans on vN, **block reveal** and surface a resolution UI (pick one / unstage / merge manually). Apply splices in **reverse document order** (end → start) so non-overlapping passes stay offset-valid. Partial reveal allowed — commit a subset of staged moves; unstaged pins carry forward. Full spec: `docs/batch-reflection-research.md` §4.3.

---

## 11. The through-line

It all traces back to the opening complaint and closes it: in the **seed** dump you just *write* the expansion — never pausing to annotate — and the detector pins it; the move only matters in **cultivate**, where choosing one is the whole point. The thing that felt wrong becomes **structurally impossible to do wrong**. Stream produces a field of pins (yours and the system's); reflection is where they bloom, get **staged** against a stable map, **revealed** as one new version, and **studied** as a whole. The draft's version chain is the visible record of the two phases breathing in and out. Batch grain: `docs/batch-reflection-research.md`.
