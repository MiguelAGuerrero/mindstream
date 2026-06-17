# Recursive Resolve — Design Contract (v1)

**Date:** 2026-06-03
**Status:** Design locked, not yet implemented. This is a complete brief for an implementation agent.
**Scope decision:** Tight v1 slice. Double-loop roll-up (a drill can rewrite the parent span *and/or* re-frame the parent goal). One drill per span in v1. Naive tolerant splice on roll-up, with the Sussman risk named and a hook reserved.
**Builds on:** the v9 entity-state model (`src/domain/thinkPadModel.js`), the think-pad-first redesign, and the "promoted thoughts become sibling root frames" rework.
**Supersedes:** `docs/feature-science-map.md` §3 ("Focus Stack / Subproblem Drilling") — that section describes the *previous* workflow-era subproblem feature (`pushFocus()` / `popContext()` over a node tree). This contract is its reincarnation for the **think-pad surface**: the unit you drill into is now a *document*, not a step, and drilling **folds a synthesized result back up** instead of just popping.

---

## 1. What this is

When you are thinking on the think-pad and one span needs more work than the surrounding document should distract you with, you **focus** it: the span opens its **own nested think-pad**, seeded from that span, and the rest of the document goes away. You think there in isolation. When the sub-pad converges (mess → result), you **resolve it up**: the converged result splices back into the parent span, and you ascend one level. Drill-downs nest recursively.

The intent (Miguel's words): *"delineate levels of thinking and limit the overhead of holding the broader context in your head while focusing on a particular thought or thread — while always keeping that context accessible to verify a move is heading toward clarity on the original problem rather than a rabbit hole."*

A move on the pad is *a transformation of text that represents a change in thought.* A drill-down is the **recursive** form of that primitive: a move whose output is computed by an entire nested thinking session rather than typed directly.

---

## 2. The core idea (the through-line for the whole feature)

```
resolve(span):
  base case   → LENS:  you type the output directly                  → splice at the anchor
  recursive   → DRILL: open a sub-pad seeded from the span,
                       resolve its moves until it converges,
                       capture the converged result (the "chunk")     → splice at the anchor
```

Two facts make this implementable with very little new surface area:

1. **The workspace is a pure function of one new pointer, `context.focusFrameId`.** `null` = the root document (`context.thinkPad`). Set it to a frame id and the *same* components re-render for that level:
   - pad = `padForFrame(focusFrameId)` (root → `context.thinkPad`, else `frame.thinkPad`)
   - threads (IdeasPanel) = the focused node's children (`context.stack` at root, else `frame.childrenStack`)
   - insights (MovesPanel) = the focused pad's resolved annotations
   - breadcrumb / goal-bug = the ancestor chain from root to `focusFrameId`

2. **The roll-up is `resolveStepIntoDocument` generalized by one parameter.** That keystone reducer already does tolerant anchor location (exact range → re-find by text → append fallback) and trailing-annotation offset-shifting against `context.thinkPad`. Generalize it to `resolveStepIntoPad(context, { stepId, padLocator })` where `padLocator` names *which* pad holds the anchor (the root doc, or a frame's pad). The drill roll-up is then this same tested logic targeting the **parent** pad.

The lens is the degenerate sub-pad (a single output field). v1 keeps the lens as-is for the base case and adds the recursive case beside it; consolidating them is a deferred north-star, not v1 work.

---

## 3. Research foundations (why the design is shaped this way)

Five independent literatures were surveyed (cognitive load, classical problem-solving, reflective practice / metacognition, design-rationale & argumentation, and the tools-for-thought UI lineage). Full theory background overlaps with `docs/research-productivity-science.md`; what follows are the **load-bearing principles specific to this feature**, each stated as a design rule. They are independently corroborated across ≥2 of the five domains, which is why they are treated as constraints rather than opinions.

| # | Principle | Established grounding | Design rule it dictates |
|---|-----------|----------------------|-------------------------|
| 1 | **Fold the chunk, archive the process.** | Miller (chunking/recoding); AND-OR back-propagation; outliner roll-up fields. | Roll-up splices back the *converged result* as one unit. The sub-pad's full content is **kept but collapsed** (re-openable for audit), never pasted inline — pasting the transcript "destroys the chunk and re-imposes the load you removed." |
| 2 | **Cue always-on, content on-demand.** | Sweller split-attention + signaling; Hutchins "speed bug"; Storm & Stone saving-enhanced memory. | The always-visible element is a thin **goal-bug + breadcrumb** (near-zero load). The full parent is **peek-on-demand** (one gesture, collapsed). **Never** a permanent two-pane parent\|child — that is the split-source format the literature shows is *worse*. |
| 3 | **The peek must be instant and trusted.** | Clark & Chalmers extended-mind "trust-and-glue" conditions. | Peek latency and parent freshness are *acceptance criteria*, not polish. If the peek is slow or the parent can drift stale, users revert to holding context in their heads and the whole load-reduction benefit collapses. |
| 4 | **Capture-then-type, never type-then-capture.** | Conklin et al. (named failure modes: "cognitive overhead," "premature structuring," "impede the flow of thought"); Elbow's premature-editor. | Never gate writing on choosing a move or a focus. Free text first; structure second, optional. (Already true on the pad — preserve it in the sub-pad.) |
| 5 | **The guardrail needs two loops.** | Flavell monitoring; Argyris & Schön double-loop; Rittel wicked problems. | Roll-up must be able to **rewrite the parent's framing/goal**, not only substitute a tidy result. A rigid "stay on the goal" peek traps users executing a wrong frame perfectly. → This is why v1 chose **double-loop** roll-up. |
| 6 | **Unclosed drills are worse than no feature.** | Leroy attention residue; Zeigarnik open loops. | Make "resolve → fold up" an explicit, satisfying closure. **Surface abandoned/unresolved sub-pads.** Do not let drills silently proliferate. |
| 7 | **User-initiated and fading, never forced.** | Kalyuga expertise-reversal; van Gelder ("onerous"); stretchtext's non-adoption. | Don't auto-spawn pads, don't over-signal, keep depth-state legible, let power users ignore the scaffolding. |

**Vocabulary worth carrying into the UI/code** (so the design speaks the established language): a drill is an *auxiliary problem* (Pólya) and the roll-up is a *"Looking Back"* beat; a move is an *epistemic action* (Kirsh & Maglio — done to think, not to ship) and Schön's *"move"* on materials that *"talk back"*; the roll-up returns a *chunk* (Miller); the always-on marker is a *goal-bug* (Hutchins); the framing check is *single-/double-loop* (Argyris & Schön); a span is safely drillable to the degree it is *near-decomposable* (Simon) and should **not** be force-decomposed if it is *wicked* (Rittel); the roll-up correctness risk is the *Sussman anomaly* (goal clobbering); the disorientation risk the breadcrumb fights is *"lost in hyperspace"* (Conklin).

**Named red flags the implementation must not walk into:** two-pane parent peek (violates #2); pasting the child transcript into the parent (violates #1); abandonable/unresolvable/hard-to-return drills (violates #6); slow or stale peek (violates #3); forced/auto drills or over-signalling (violates #7); silent roll-up that overwrites without preserving (violates #1 and the Sussman caution).

---

## 4. v1 scope

**In:**
- `frame.thinkPad` on the model (each frame can own a document). Additive; no schema bump.
- `frame.parentAnchor` back-reference (which annotation, in which pad, this frame resolves into). Additive.
- `context.focusFrameId` surface pointer. Additive.
- A path-aware document surface: `src/pages/ThinkPadPage.vue` renders the pad/threads/insights for `focusFrameId`.
- A **Focus** action (select span → child sub-pad seeded from the span → surface swaps to it).
- **Breadcrumb + goal-bug** (the always-on cue) and a **one-gesture peek** of the parent (read-only, anchor highlighted, surrounding text).
- **Resolve-up** (`resolveFrameIntoParent`): single-loop span replacement **plus** optional double-loop goal rewrite; archive (don't delete) the sub-pad; ascend.
- **Ascend without resolving** (abandon): non-destructive; discard empty drills.

**Explicitly deferred (document as "Future" in code comments; do not build in v1):**
- Multiple drills per parent with AND/OR integration semantics (v1 = one drill per span).
- Conflict-aware roll-up (Sussman re-validation of siblings) — v1 names the risk and reserves a hook only.
- Unifying `context.thinkPad` into a root frame (v1 keeps the root pad special).
- Consolidating the lens and the drill into one `resolve` entry point.
- Full split-pane / "sliding panes" peek mode (v1 peek = collapsed popover/overlay).
- New move types (`qualify`, `criterion`) surfaced by the argumentation research.
- Unifying `focusFrameId` (surface) with `activeFrameId` (session/timer engagement).

---

## 5. Data model changes (all additive within schema v9)

These follow the exact pattern by which `activeFrameId`, `step.output`, and `context.history` were added inside v9 — additive fields, default-filled by the normalizer, no `CONTEXT_SCHEMA_VERSION` bump, old records load fine.

### 5.1 `frame.thinkPad`
Each frame may own a document, identical in shape to `context.thinkPad`:
```
frame.thinkPad = { text: string, annotations: Annotation[] }
```
- Reuse the existing `normalizeThinkPad(value)` in `contextPersistenceMapper.js`.
- The **root document remains `context.thinkPad`** (the depth-0 surface). Frame pads are the depth ≥ 1 surfaces.
- A freshly promoted *move* frame (existing `promoteSpanToMove`) gets an empty `thinkPad` and continues to resolve via the lens — unchanged. A *focus* frame gets a **seeded** `thinkPad` (see 6.1).

### 5.2 `frame.parentAnchor`
Tells the roll-up *where this frame folds into*:
```
frame.parentAnchor = {
  annotationId: string,        // the anchor annotation in the parent pad
  parentFrameId: string | null // which pad holds it: null = context.thinkPad (root), else a frame's pad
} | null
```
- `null` for legacy / non-drilled frames (e.g. existing promoted-move frames anchored in `context.thinkPad` — their anchor is already discoverable by `stepId`, so `parentAnchor` is optional context for them).

### 5.3 `context.focusFrameId`
The surface pointer (mirror of `activeFrameId`, but **any depth**):
```
context.focusFrameId = string | null   // null = root document surface
```
- Distinct from `activeFrameId` (which is root-only and tied to the timer/ThreadSessionCard). The pad is **off the clock** at every level, so `focusFrameId` deliberately does not touch the timer in v1.

### 5.4 Normalizer edits (`contextPersistenceMapper.js`)
Single chokepoint: every migration path funnels through `normalizeFrameV9` / `normalizeV9Context`, so editing these two covers v6/v7/v8 records too.
- In `normalizeFrameV9(value)`: add
  ```js
  thinkPad: normalizeThinkPad(value.thinkPad),          // {text:"",annotations:[]} when absent
  parentAnchor: normalizeParentAnchor(value.parentAnchor) // null when absent
  ```
- In `normalizeV9Context(value)`: add
  ```js
  focusFrameId: typeof value.focusFrameId === "string" && value.focusFrameId ? value.focusFrameId : null,
  ```
- Add a small `normalizeParentAnchor` helper (validate `annotationId` string, `parentFrameId` string|null).
- `buildContextSnapshot` round-trips through `normalizeV9Context`, so persistence is automatic.

---

## 6. Reducer contract (`problemThreadModel.js`, re-exported via `contextModel.js`)

All reducers are pure `(context, args) → context` (or `→ { context, ... }`), return the **same reference** when nothing changes (the store relies on this for its no-op guards), and follow the **functional-core / imperative-shell** convention now in force: the domain reads no clock and mints no ids — every timestamp arrives as `now` (an ISO string) and every id as `makeId(prefix)`, both passed in via the trailing options object `{ now, makeId }`. The shell (`contextStore.js`) mints them through `src/stores/idClock.js` (`nowIso()`, `makeId`). So `focusSpan` and `resolveFrameIntoParent` MUST take `{ now, makeId }` and mint their frame/step/annotation ids via `makeId("frame")` / `makeId("step")` / `makeId("ann")` — never inline. Likewise the persistence normalizers take an injected `{ now }` (no fabricated timestamps). Note: as of the pre-Slice-1 cleanup the constructors split `now` between the first arg and the options; Slice 1 normalizes all of `createFrame`/`createMultiStepFrame`/`createContext` to carry `now` in the trailing `{ now, makeId }` while it is editing those signatures anyway.

### 6.1 `focusSpan` — create a sub-pad and descend
```
focusSpan(context, {
  parentFrameId,          // null = focusing from the root doc; else the frame whose pad we're in
  title,                  // the goal/seed for this level (authored prompt; defaults to selectedText)
  selectionStart, selectionEnd, selectedText,
  move = "", writeBack = "replace",
  stepId = null, annotationId = null, frameId = null,
}, { now }) → { context, frame, annotationId }
```
Behavior:
1. Create a frame with one step (`step.title = title` — the breadcrumb label / goal, exactly like a promoted move) **and** a seeded `thinkPad`. **Seed the sub-pad body with `selectedText`** (research #2/#3: the child must be self-intelligible so the user rarely needs to peek). Set `frame.parentAnchor = { annotationId, parentFrameId }`.
2. Push the frame: onto `context.stack` if `parentFrameId == null`; else onto that frame's `childrenStack` (reuse `updateFrameAtPath`).
3. Add the anchor annotation to the **parent pad** (`context.thinkPad` when `parentFrameId == null`, else the parent frame's `thinkPad`) via a pad-targeted `addThinkPadAnnotation` (see 6.3). The annotation is `resolved: false`, anchored to the span — identical shape to today's promotion anchors.
4. The store sets `focusFrameId = frame.id` after this reducer (descend onto the new surface). (Keeping the pointer move in the store action, not the reducer, mirrors how `focusThread` works.)

`focusSpan` is intentionally a sibling of `promoteSpanToMove` (which stays for the base/lens case). They share the anchor/annotation machinery; `focusSpan` adds the seeded pad + `parentAnchor` + child-vs-root placement.

### 6.2 `resolveStepIntoPad` — generalize the keystone
Refactor `resolveStepIntoDocument(context, { stepId })` so its body becomes:
```
resolveStepIntoPad(context, { stepId, padLocator }, { now }) → context
```
- `padLocator`: `null` → `context.thinkPad` (today's behavior); else a frame id → that frame's `thinkPad`.
- Keep `resolveStepIntoDocument` as a thin wrapper (`padLocator = null`) so existing callers and tests are untouched.
- All current logic is preserved: find the unresolved annotation for `stepId` **in the located pad**, take `step.output`, locate the anchor (exact range → `indexOf` re-find → append fallback), `replace` vs `annotate` write-back, **shift trailing annotations in that pad by `delta`**, mark the annotation resolved and re-point its offsets to the output span.

### 6.3 Pad-targeted variants of the existing pad reducers
The pad-mutation reducers currently hardcode `context.thinkPad`. Give each a `padLocator`-aware variant (or thread `padLocator` through), so a sub-pad is a first-class surface:
- `setThinkPadText` → `setPadText(context, { padLocator, text })`
- `addThinkPadAnnotation` → `addPadAnnotation(context, { padLocator, annotation })`
- `promoteSpanToMove` → accept a `padLocator` (which pad the move is promoted *within*; default `null` = root, fully backward compatible)
- `getContextMoves` → `getPadMoves(context, padLocator)` (resolved annotations of the located pad)

Implementation note: a pad locator resolves to either `context.thinkPad` or a `frame.thinkPad` reachable via the frame tree; reuse `updateFrameAtPath` / a `patchFrameById` helper to write a frame's pad immutably (same idiom as `patchStepByIdInStack`).

### 6.4 `resolveFrameIntoParent` — the roll-up (THE keystone of this feature)
```
resolveFrameIntoParent(context, {
  frameId,
  result,                 // the converged "chunk" to fold up (defaults to the sub-pad text; editable at fold-up)
  reframe = null,         // optional double-loop: { goal: string } rewrites the parent frame's goal
}, { now }) → { context, resolved: boolean, delta: { padLocator, shiftFrom, amount } | null }
```
Behavior:
1. Look up the frame and its `parentAnchor = { annotationId, parentFrameId }`.
2. **Single-loop (always):** set the frame's `step.output = result`, then call `resolveStepIntoPad(context, { stepId: frame.steps[0].id, padLocator: parentFrameId })`. This splices the chunk into the **parent** pad at the anchor using the tested tolerant logic. (Honors research #1: the *result* folds up; see step 5 for the *process*.)
3. **Double-loop (optional, when `reframe` present):** also rewrite the framing.
   - If `parentFrameId != null` (parent is a frame): set that parent frame's `step.title` to `reframe.goal` (path-addressed). This updates the parent's breadcrumb label / goal-bug — the drill changed what the parent is *about*. (Honors research #5.)
   - If `parentFrameId == null` (parent is the root doc, which has no goal object): the reframe degrades to span-replacement only; rewriting the *root's* framing is a manual title edit in v1. Document this asymmetry inline — it is the price of keeping `context.thinkPad` special (see Deferred: root-as-frame).
4. Return `delta` describing what region of the parent pad changed (`shiftFrom`, `amount`). **This is the reserved Sussman hook** (see 6.6).
5. **Archive, do not delete.** The sub-pad (`frame.thinkPad`) and the frame stay in the tree. The parent anchor is now `resolved: true` (renders green; re-opening that span re-enters the sub-pad by setting `focusFrameId = frameId`). Nothing is destroyed — consistent with v9's "steps never shrink" and research #1 ("archive the process").
6. Idempotent and a no-op when `result` is empty (mirror `resolveStepIntoDocument`).

The store action then ascends: `focusFrameId = parent` (the parent frame, or `null` if `parentFrameId == null`), and bumps `docVersion` so the now-visible parent surface re-reads the spliced text.

### 6.5 `setFocusFrame` + projections
```
setFocusFrame(context, frameId | null, { now }) → context   // validate frameId exists somewhere in the tree (any depth)
findFocusPath(context) → Frame[]                            // root → focused leaf (drives the breadcrumb)
padForFrame(context, frameId | null) → { text, annotations} // the surface object
```
- `setFocusFrame` parallels `setActiveFrame` but, unlike it, accepts a frame at **any** depth (not just the root stack). `null` returns to the root document.
- `findFocusPath` walks from the root to the `focusFrameId` frame collecting ancestors. (A tree search per render is fine for these small trees; matches the existing `findActivePath` / `findStepDeep` style.)

### 6.6 The reserved Sussman hook (v1: name it, don't build it)
`resolveFrameIntoParent` returns `delta`. A future conflict checker can diff the changed parent region against sibling anchors to detect goal-clobbering (a child result that invalidates a sibling span). **v1 does not act on it.** Leave a single clearly-commented seam:
```js
// SUSSMAN HOOK (deferred): a child's roll-up can invalidate sibling spans in the
// parent pad ("goal clobbering"). v1 splices naively. `delta` is returned so a
// future conflict-aware pass can re-validate siblings and surface clobbers rather
// than overwrite silently. See docs/recursive-resolve-contract.md §6.6.
```

---

## 7. UI / UX surfaces

### 7.1 Path-aware ThinkPad page (the central change)
Today `src/pages/ThinkPadPage.vue` hardcodes the root surface: `threads = currentContext.stack`, pad = `L.currentThinkPad` (= `context.thinkPad`), insights = `getContextMoves(currentContext)`. Make all three a function of `focusFrameId`:
- pad ← `padForFrame(focusFrameId)`
- threads (IdeasPanel) ← children of the focused node (`context.stack` at root, else `frame.childrenStack`)
- insights (MovesPanel) ← `getPadMoves(context, focusFrameId)`
- the pad `:key` (today `` `${contextId}:${docVersion}` ``) gains `focusFrameId` so descending/ascending cleanly remounts the surface.

This makes `IdeasPanel` and `MovesPanel` **recursive for free**: every pad shows its own sub-threads and its own resolved insights. They are already prop-driven; feed them path-relative data and they need no internal change.

### 7.2 Breadcrumb + goal-bug (the always-on cue — research #2)
A thin, persistent strip above the pad while `focusFrameId != null`:
- **Breadcrumb:** root → … → current, from `findFocusPath`. Each crumb is the frame's goal (`step.title`); click to ascend to that level (`setFocusFrame`). Include a one-click "home"/root and a keyboard zoom-out (proven necessary by Workflowy/Org-narrowing's "lost in hyperspace" failure mode).
- **Goal-bug:** a one-line *"You are working on: «current goal»"* — the single always-visible marker the user checks trajectory against (Hutchins's speed bug). This is the anti-rabbit-hole guardrail; keep it minimal (over-signalling violates #7).

### 7.3 The peek (research #2/#3 — collapsed, instant, never a pane)
From the breadcrumb/goal-bug, a one-gesture **peek** of the parent pad:
- read-only render of the parent pad (reuse `ThinkPadPanel` in a read-only mode, or a lightweight viewer) with the **focused span highlighted** via the existing `computeHighlightSegments` (`.thinkpad-hl--anchored`) and scrolled into view (`scrollIntoView`).
- shows the *surrounding text* (the span in situ) and *where it sits in the whole parent* — exactly the two things requested.
- collapsed by default; opens instantly; closes on dismiss. **Not** a permanent second pane. While drilled, treat the parent as frozen/peek-only (also reinforces the "stop looking at the whole document" goal).

### 7.4 The Focus action (entry point)
In the pad's selection popover (`ThinkPadPanel.vue`), add **Focus** alongside the existing move palette + freeform "Add as step." It emits a new event (e.g. `focus-span`) carrying `{ title, selectionStart, selectionEnd, selectedText }`, parallel to today's `extract-step`. Capture-then-type is preserved: the user writes, selects, *then* chooses Focus (research #4).

### 7.5 The lens stays (base case)
`StepLens.vue` is unchanged and remains the convergence tool for non-drilled moves. It is the degenerate sub-pad. Opening the lens on a step inside *any* pad still works once the lens reads from `padForFrame(focusFrameId)` instead of always `context.thinkPad` for its source text.

### 7.6 Closure & abandoned-drill hygiene (research #6)
- "Resolve up" is an explicit, satisfying action with a brief "Looking Back" capture (the editable `result`).
- Ascending *without* resolving is allowed (abandon). On abandon, **discard a sub-pad that has no body and no resolved children** (mirror the existing `_findReusableBlankPad` instinct) so empty drills don't litter the breadcrumb.
- Surface unresolved drills: a sub-pad that has content but no roll-up should be visible as an open thread on its parent's IdeasPanel (it already is, since threads = children) and visually marked "in progress" so none are silently abandoned.

---

## 8. Store + layout wiring

### 8.1 `contextStore.js` actions (thin wrappers over the reducers, following the existing `_replaceCurrent` + `appendHistory` pattern)
- `focusSpan({ parentFrameId, title, ... })` → reducer + set `focusFrameId` + `appendHistory({ type: "promote", ... })` (reuse an existing history type for v1; a dedicated `focus`/`resolveUp` type is a trivial later addition to `HISTORY_TYPES`).
- `setFocusFrame(frameId | null)` / `ascendFocus()`.
- `setPadText({ padLocator, text })`, `promoteWithinPad(...)`, etc. — pad-targeted store actions delegating to the new reducer variants.
- `resolveFrameIntoParent({ frameId, result, reframe })` → reducer + ascend + history.

### 8.2 `MainLayout.vue` (`mindstreamLayout` / the `L` injection)
- Add `focusFrameId` (computed from the store), `padForFocus` (computed `padForFrame`), `focusPath` (computed `findFocusPath`).
- Add handlers: `handleFocusSpan`, `handleAscend`, `handleResolveUp`, `handlePeekParent`, and make `handleThinkPadTextUpdate` / `handleExtractStep` / lens source-text **path-aware** (route to `focusFrameId`'s pad).
- `lensSourceText` currently reads `context.thinkPad.annotations`; make it read the focused pad.
- Reuse the existing `docWriteCount` / `docVersion` re-mount trick after `resolveFrameIntoParent`.
- `focusFrameId` is independent of the timer (the pad is off the clock at every depth); do **not** wire it into the `watch(timerValue, …)` tick.

---

## 9. What changes / what stays the same

| Location | Change |
|---|---|
| `src/domain/thinkPadModel.js` | New: `focusSpan`, `resolveFrameIntoParent`, `setFocusFrame`, `findFocusPath`, `padForFrame`, pad-targeted variants (`setPadText`, `addPadAnnotation`, `getPadMoves`), `resolveStepIntoPad`. `resolveStepIntoDocument` becomes a thin `padLocator=null` wrapper. New frame fields `thinkPad`, `parentAnchor`; new context field `focusFrameId`. |
| `src/domain/padDomain.js` | Re-export the new reducers/projections. |
| `src/domain/padPersistenceMapper.js` | `normalizeFrameV9`: default-fill `thinkPad` (reuse `normalizeThinkPad`) + `parentAnchor`. `normalizeV9Context`: default-fill `focusFrameId`. Add `normalizeParentAnchor`. **No schema bump.** |
| `src/stores/padStore.js` | New actions (8.1); existing pad actions gain `padLocator`. |
| `src/composables/useThinkPadPage.js` | Focus state + handlers; pad reads become path-aware. |
| `src/pages/ThinkPadPage.vue` | Surface (pad/threads/insights/`:key`) becomes a function of `focusFrameId`; breadcrumb + goal-bug + peek (7.2–7.3). |
| `src/components/ThinkPadPanel.vue` | Add a **Focus** entry to the selection popover (emits `focus-span`); support a read-only mode for the peek. |
| `src/components/IdeasPanel.vue` | No internal change — fed path-relative data. |
| New: `docs/` cross-ref | Update `feature-science-map.md` §3 to point here as its think-pad successor (optional, nice-to-have). |

**Stays the same:** the v9 entity-state invariants (state on entities, no runtime event log); `steps[]` never shrinks; the tolerant anchor/offset-shift logic; the lens as base-case convergence; the timer model (pad off the clock); the promote-to-move flow for non-drilled moves; persistence at `CONTEXT_SCHEMA_VERSION = 9`.

---

## 10. Invariants & failure modes to guard (acceptance bar)

1. **Additive & backward-compatible.** Old contexts load unchanged: frames get empty `thinkPad`, `parentAnchor: null`, contexts get `focusFrameId: null`. No migration, no schema bump.
2. **Surface = f(`focusFrameId`).** Nothing else decides which pad/threads/insights show. `null` ⇒ root document.
3. **Roll-up folds the chunk, archives the process** (research #1). The sub-pad is preserved and re-openable; only the `result` splices up.
4. **Peek is a cue + on-demand content, never a pane** (research #2). Goal-bug + breadcrumb always on; full parent collapsed, instant, read-only.
5. **No abandoned-loop litter** (research #6). Empty drills discarded on abandon; unresolved drills visibly surfaced.
6. **Double-loop available** (research #5): roll-up can rewrite the parent span and/or the parent frame's goal.
7. **Sussman risk named, splice naive** (v1 scope): `delta` returned, hook commented, siblings not yet re-validated.
8. **Capture-then-type preserved** (research #4): Focus is post-selection, never gates writing.
9. **Reducers are pure and reference-stable** (same-ref on no-op), consistent with the rest of `problemThreadModel.js`.

---

## 11. Test surface

Mirror the existing `src/domain/thinkPadFirst.test.js` / `contextModel.test.js` / `contextStore.test.js` styles. Priority cases:

**Model:**
- `focusSpan` from root → pushes a depth-1 frame on `context.stack` with a seeded `thinkPad` and an anchor annotation in `context.thinkPad`; `parentAnchor.parentFrameId == null`.
- `focusSpan` from a frame → pushes a child on that frame's `childrenStack` with the anchor in *that frame's* pad; `parentAnchor.parentFrameId == frameId`.
- `resolveStepIntoPad` with `padLocator = frameId` splices into that frame's pad and shifts *that pad's* trailing annotations (parity with the existing `resolveStepIntoDocument` tests, one level down).
- `resolveFrameIntoParent` single-loop: result replaces the parent span; anchor → `resolved`; sub-pad preserved; `delta` returned.
- `resolveFrameIntoParent` double-loop: with `reframe`, the parent frame's `step.title` is rewritten; from root, reframe degrades to span-only (documented asymmetry).
- Roll-up is idempotent; empty `result` is a no-op; tolerant re-find still works when the parent text moved.
- `findFocusPath` returns the correct root→leaf chain at depth 0/1/2; `setFocusFrame` validates any-depth ids and rejects unknown ids (same-ref).
- Persistence round-trip: a context with nested `frame.thinkPad` + `parentAnchor` + `focusFrameId` survives `buildContextSnapshot` → `normalizeV9Context`; a pre-feature v9 record normalizes to the new defaults.

**Store/integration:**
- focus → type in sub-pad → resolve up → ascend: parent span shows the result; `focusFrameId` returns to parent; `docVersion` bumped.
- abandon an empty drill → frame discarded, breadcrumb clean.

---

## 12. Files to read before implementing

- `src/domain/thinkPadModel.js` — keystone reducers and pad/thread model.
- `src/domain/padPersistenceMapper.js` — `normalizeThinkPad`, frame/context normalizers.
- `src/stores/padStore.js` — action pattern to mirror, including `{ now, makeId }` threading.
- `src/stores/idClock.js` — the shell's effect capabilities (`nowIso()`, `makeId`).
- `src/composables/useThinkPadPage.js` — page handlers and `docVersion`.
- `src/pages/ThinkPadPage.vue` — path-aware surface, breadcrumb, peek.
- `src/components/ThinkPadPanel.vue` — the selection popover (where Focus is added) and the highlight mirror.
- `src/components/thinkPadHighlights.js` — `computeHighlightSegments` (reused by the peek).
- Memory / prior art: `docs/feature-science-map.md` §3 (the superseded subproblem feature), `docs/research-productivity-science.md` (shared theory base).

---

## 13. Open questions / deferred decisions (for after v1)

1. **Multiple drills per parent** with AND (integrate all) vs OR (select best) roll-up semantics — the AND-OR-tree model is the formal home for this. v1 is one-drill-per-span.
2. **Conflict-aware roll-up** (act on the Sussman `delta`): re-validate siblings, surface clobbers instead of overwriting.
3. **Root-as-frame unification** — make `context.thinkPad` the root frame's pad so depth-1 reframing becomes symmetric and the surface logic loses its special case.
4. **Lens/focus consolidation** — one `resolve` entry with the lens as the depth-0 degenerate sub-pad.
5. **Peek as sliding/stacked panes** ("Andy Matuschak mode") for very deep drilling — the tools-for-thought lineage's proven deep-rabbit-hole mitigation, if the collapsed popover proves insufficient.
6. **New move types** `qualify` (Toulmin) and `criterion`/`goal` (QOC/DRL) surfaced by the argumentation research.
7. **Unify `focusFrameId` with `activeFrameId`** and decide whether drilling should engage the session/timer.
