# Capture Templates — Design Proposal (v2)

**Date:** 2026-11-23
**Status:** Proposal. This version replaces v1. It records the model reached in a design conversation with Miguel. §10 lists what is still open.
**Mockup:** the design canvas *Capture Templates Mockup*, a private artifact (see §11).
**Builds on:** `src/thinkpad/moves.js`, `src/thinkpad/domain/thinkPadModel.js` (threads, sub-pads, `resolveThreadIntoParent`, `discardThread`), `src/thinkpad/composables/useThinkPadSurface.js` (`canComplete`), `docs/recursive-resolve-contract.md`, `docs/stream-reflect-lifecycle.md`, `docs/GENERIC_PROBLEM_SOLVING_WORKFLOWS.md`.

---

## 1. The idea in one paragraph

A move like **Investigate** is a **workflow of steps**, and a "form" is one way of looking at that workflow. Each step has a prompt and resolves into exactly **one** thing. You can write that thing directly, or **slot a workflow** into the step, and the slotted workflow's resolution becomes the step's resolution. The abstract move stays general: a *research* investigation and a *debugging* investigation are the same steps with different workflows in some slots. Each level resolves into **one call or one sharper question**, and that resolution **rolls up to the context that produced the move**. A level **cannot resolve while it still has open items**: moves you started there and haven't settled. Each open item must be resolved, accepted as room for doubt, lifted to the level it belongs to, or parked as its own work. Filling in the steps *is* practising the method. There is no separate practice feature.

---

## 2. Decisions so far

| # | Decision | Where |
|---|---|---|
| 1 | Capture is prompted prose, not typed form fields | §4 |
| 2 | Filling in the steps is the deliberate practice; it is not a separate feature | §1 |
| 3 | Form preview opens from a **Preview** button as a sheet (side sheet on desktop, bottom sheet on phone), reopenable as **Method** while filling | §4.3 |
| 4 | A form is a **view over a workflow of steps** | §3 |
| 5 | Each step can have a **workflow slotted** into it; variants differ by what fills the slots | §5 |
| 6 | Each step resolves into **one** thing; **lists live in the process** of the slotted workflow | §4.2 |
| 7 | Steps are **ordered but jumpable** | §4.1 |
| 8 | Mid-run pivots are **local to the run**; resolving offers **save as variant** | §5.3 |
| 9 | Every level resolves into **a call or a sharper question**, which rolls up to its origin | §6 |
| 10 | Only resolutions move work forward; reuse anywhere else is **citation** | §6.2 |
| 11 | Types are defined by **behaviour**: a type exists only if the app treats it differently | §7 |
| 12 | **Open-item gate:** a level can't resolve up while it has unresolved, undecided moves | §8 |

---

## 3. One concept: a workflow of steps

```
Investigate  (the abstract move: a contract)
  1 Define the question    expects: question
  2 Propose a hypothesis   expects: prediction
  3 Define a failure case  expects: claim ("I'm wrong if…")
  4 Investigate the case   expects: claim (a finding)
  ─ Resolve                → a call  |  a sharper question     ⤴ rolls up to the origin span
```

Move, template and workflow from v1 collapse into **workflow**. A move such as Investigate is a workflow that sits in the palette. Its `escalatesTo` field becomes the slot defaults.

**It fits the existing recursion exactly.** `recursive-resolve-contract.md` defines two ways to resolve a span: type the output (the *lens*) or open a sub-pad (the *drill*). A step works the same way:

- **writing a step directly** is the lens;
- **slotting a workflow** is the drill, whose resolution rolls up into the step through `resolveThreadIntoParent`.

---

## 4. Views and filling

### 4.1 Two views over the same run
- **Form view.** Every step is laid out in order with its resolution. A slotted workflow appears folded under its step, and you can drill in to see its process. This is the document view, for reading where you stand.
- **Step view.** One step at a time, like the Focus runner's sticky note. This is better for focused work and for phones.
- **Ordered but jumpable.** Steps are suggested in order, but you can write in any step at any time. Capture never waits on structure.

### 4.2 One resolution per step; lists live in the process
- A step resolves into **one** statement.
- When a step needs a list (say, several observations), slot a workflow into it. The list lives in that workflow, and the step's resolution summarises it.
- The list is kept in the record, so nothing is lost. It is the process, not the output.

### 4.3 Preview / Method
- Every workflow move in the palette has a **Preview** button.
- It opens a sheet showing:
  - the steps and what each one expects;
  - how the workflow ends (a call or a sharper question);
  - where the result will roll up.
- Nothing starts until you press Start.
- While you're filling in the steps, the same sheet is one tap away as **Method**.

---

## 5. Slots and variants

### 5.1 Slotting
- Any step can hold a workflow instead of a hand-written answer.
- In a research investigation, step 4 holds `Scan sources → Critique sources → Synthesize`.
- In a debugging investigation, step 4 holds `Reproduce → Bisect → Confirm root cause`.

### 5.2 What fits a slot
- A step declares what it `expects`, as a type from §7.
- The app **suggests** workflows whose resolution type matches.
- You can put any workflow into any slot. A mismatch is a hint, not a block.

### 5.3 Variants and pivots
- **A variant is a saved set of slot fillings.** `Investigate · Research` and `Investigate · Debugging` are both still Investigate. They share one contract and roll up the same way, so their records stay comparable, which is the point for practice.
- **Pivots happen mid-run.** You can swap what fills a slot, add or drop a step, or branch off. These changes apply **to this run only**.
- **Saving is offered at resolve.** If the run's shape changed, Resolve offers "Save as variant…".
- This puts `GENERIC_PROBLEM_SOLVING_WORKFLOWS.md`'s guidance, *keep the baseline step intent; only specialise*, into practice.

---

## 6. Resolution and roll-up

### 6.1 Every level ends in one thing
- **A call.** It's settled. The call sits beside the origin span, and that span's open item closes.
- **A sharper question.** It isn't settled. The new question replaces the original at the origin and stays pinned there as an open item. Optionally, it continues as the next step in a workflow.

The rest of the level is its **process**. It is kept as a record that you can reopen at any time.

### 6.2 Two channels
- **The resolution channel** carries one item, upward, or forward to the next workflow step on its way up. In `Investigate → Test → Decide`:
  - Investigate resolves as a question;
  - that question is Experiment's question;
  - Experiment's answer becomes Decide's evidence;
  - Decide's call is the workflow's single resolution, and it rolls up to the origin span.
- **The citation channel** is read-only references to entries in any record, from any pad or workflow, with a link back. Citing never changes where a record's value rolled up.

---

## 7. Types are defined by behaviour

Everything is text representing a thought, so a type is justified **only if it changes what the app does** at one of three points:

1. **Roll-up:** whether it closes a loop at the origin or keeps one open.
2. **What's offered next.** This extends the existing `movesForIntent()`.
3. **What comes back later:** something the app returns to after time passes or when evidence arrives.

| Type | Loop | Offered next | Comes back |
|---|---|---|---|
| Question | open (pinned at origin) | Investigate, Experiment, Clarify | until answered |
| Hunch / feeling | open, not yet put into words | Clarify; turn it into a prediction | no. Never asked to defend itself, so no Doubt by default |
| Claim (finding, interpretation) | closed, open to challenge | Doubt, Support, Implications | no |
| Prediction | closed for now, checked later | (none yet) | asks "was I right?" when related evidence arrives; this is the calibration loop |
| Call | closed | Plan, Experiment | at a review date or reversal condition |
| Intention | closed here | hands off to the Focus runner | in the Focus runner |
| Waiting on | blocked | (none) | parked with a reason (`waitingOn` already exists) |

Typing is light and optional:
- Untyped text is a plain note.
- **Resolve** always asks the one question that matters: *a call or a sharper question?* The finer type is a skippable second tap.
- A future intent detector may suggest types, but never forces one.
- Distinctions like observation versus inference **are not types**. They belong in step prompts, as part of the method.

---

## 8. The open-item gate

### 8.1 What an open item is
An open item is **a move you started at this level that hasn't resolved**: Doubt, Support, Sharpen, a drill into a span, or a slotted workflow.

In data terms, it is an annotation in this level's doc with `stepId` set and `resolved !== true`. The gate is structural, so it needs no type detection.

These are **not** open items:
- **Pins you never worked** (parked ideas, `stepId: null`). They're notes, not commitments.
- **Questions written in prose.** They become open items only when you act on them.

So writing never creates debt, but starting a move does. That keeps capture-then-type intact.

### 8.2 The gate
- A level **cannot resolve upward while it has open items nobody has decided on**.
- This extends today's `canComplete` (`useThinkPadSurface.js`), which only checks `!threadIsOpen(thread)`.
- **Resolve** lists the remaining open items, and each one needs one of these decisions:

| Decision | Meaning | Effect |
|---|---|---|
| **Address it here** | It bears on this level's question and I can do it now | Work it. Its resolution rolls up into this level |
| **Accept as room for doubt** | It matters, but I'm going ahead | It travels up **attached to the resolution as a stated caveat**. It does not block the parent, though the parent can reopen it |
| **Lift it** | It's out of scope here, but belongs higher | Choose an ancestor from the breadcrumb. It becomes an open item *there*, subject to that level's gate |
| **Park it as its own work** | It's bigger than this inquiry | It leaves as a parked idea, a new pad or a Focus context, with a link back. It never blocks here |

An **untouched** drill can also be removed with the existing `discardThread`, which refuses to delete any drill where work happened, so no context is lost.

### 8.3 The scope check
To place a profound question surfaced deep in the details at the right level, each open item gets one question, anchored on the goal shown in the drill bar:

> **"Would answering this change the answer to *[this level's question]*?"**
> Yes, and I can answer it now → **Address** · Yes, but not now → **Accept as doubt** · No, but it bears on something above → **Lift** · No, it's its own thing → **Park**

### 8.4 Keeping it visible
- The breadcrumb shows open counts, for example `Growth notes · 2 open › Investigate · 1 open`. You see the debt before you reach the gate.
- **Back** (abandon) still leaves a level without resolving, so nothing rolls up.
- The **root document** has nothing above it, so its open count serves as the "where you stand" summary rather than a gate.

### 8.5 Why it doesn't regress forever
The rule is the same at every level:
- A sharper-question resolution hands the parent exactly one new open item.
- Accepted doubts come up as caveats, not as new blockers.
- Lifted items land where they belong.
- Parked items leave entirely.

---

## 9. Data model sketch (all additive)

```js
// src/thinkpad/workflows.js — data only, node-testable (like MOVES)
Workflow = {
  id, label, version,
  variantOf: workflowId | null,      // "Investigate · Research" → "investigate"
  steps: [{ id, prompt, expects: Type | null, slot: workflowId | null }],
}

// A run is a thread; its doc is the form view (step headers + one resolution under each).
thread.run = { workflowId, workflowVersion, shapeChanged: boolean } | null
//   A step written directly: text under its header (the lens).
//   A step with a slotted workflow: a subThread anchored at that header; its resolution
//   splices in through resolveThreadIntoParent (the drill). Unresolved = an open item.

annotation.disposition = { kind: "accepted" | "lifted" | "parked", note, target?, at } | null
step.resolution        = { text, type: Type | null, caveats: string[] }   // caveats = accepted doubts
```

**New pure functions:**
- `openItems(pad, padLocator)`: annotations with `stepId`, `!resolved` and no disposition.
- `disposeOpenItem(pad, { annotationId, kind, target, note })`.
- `canResolve(pad, padLocator)`: `!threadIsOpen` and `openItems().length === 0`.
- `resolveRun(pad, { threadId, resolution })`: attaches caveats from accepted items and moves lifted items to their target pad, then calls `resolveThreadIntoParent`.

**Records.** A record is the frozen run thread (its doc, step resolutions and archived sub-threads), keyed by run and revision. It is stored for citation and append-only.

---

## 10. Still open

1. **How far up caveats show.** Every caveat that reached the root keeps the final answer honest but could get noisy. The default proposed here: show caveats one level up, with deeper ones available on demand.
2. **Merge Call and Intention?** It depends on whether "I decided X" and "I will do X" need different follow-through.
3. **How section headers are represented in the run doc.** Header paragraphs protected by a TipTap extension (recommended), or a separate doc per step.
4. **Do records outlive their pad?** Proposed: yes, marked as orphaned.
5. **Starter workflows:** Investigate (with Research and Debugging variants), Experiment, Decide.

---

## 11. Mockup

The canvas now shows the v2 model:
- **Investigate · Research** in form view, with open counts in the breadcrumb and step 4 filled by a workflow.
- **Investigate · Debugging**: a step added during the run, and step 4's workflow being swapped.
- **The Resolve gate**, with the four decisions and the scope check.
- **The result rolled up** with its caveat, plus the parked question.
- **On phone**: the preview with a variant picker, and the step view.

The workflow-step and cite screens are carried over from v1.

---

## 12. Suggested build order

1. **Pure core.** `openItems`, `disposeOpenItem` and `canResolve`, then wire `canResolve` into `canComplete`. This adds the gate on top of what exists today and is useful even before workflows.
2. **Workflow table and runs.** Add `workflows.js`; a run thread's doc becomes the form view; steps are written directly or slotted (drill); Preview/Method sheet.
3. **Resolution.** Call versus sharper question, caveats, lift and park, and the roll-up to the origin.
4. **Variants.** Pivots local to the run, then save as variant at resolve.
5. **Records and citation.** The frozen run store, plus Cite.
6. **Behavioural types.** Next-move suggestions, plus things that come back: prediction checks, call reviews, Focus hand-off.
