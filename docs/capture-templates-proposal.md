# Capture Templates — Design Proposal (v2.1)

**Date:** 2026-11-23, revised 2026-11-24
**Status:** Proposal. This version replaces v1. It records the model reached in a design conversation with Miguel. §10 lists what is still open.
**v2.1:** aligned with the loosely coupled workspace in `docs/PRODUCT_ASSESSMENT_AND_ROADMAP.md` (branch `claude/keen-sagan-c5wtji`, Revisions 4–7: shell, registry, Send/Ask, shelf, content-carrying messages). That doc owns the message envelope, the tool contract and the shell. This doc owns the **workflow definition**: its shape, steps, slots, variants and `produces`. The items that came out of coordination between the two design sessions were confirmed or withdrawn by Miguel on 2026-11-24 (decisions 15–22).
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
| 13 | A workflow is a **tool-agnostic template**; any tool that accepts workflows runs it its own way. A form is the ThinkPad's way, for workflows that produce text | §3 |
| 14 | Harvesting workflows from practice is **deferred** | — |
| 15 | Steps declare `produces: "text" \| "action"`. This is the basis of the Focus runner. Each tool's registration decides what it accepts; the shell only filters | §3.1 |
| 16 | The workflow library belongs to the **shell**: workflows are not a ThinkPad or runner construct, and the library **can be its own page** in the workspace. Workflows travel **as content**, not by reference (decision 20) | §3.1 |
| 17 | ~~A workflow may suggest a follow-up (`then`)~~ **Withdrawn.** Reflection is not built into the app. It is just a step you can choose to put in a workflow, defined by you, never prompted automatically | §6.3 |
| 18 | **The shelf is confirmed.** Confirmed in roadmap Revision 6 | §8.2 |
| 19 | **The ThinkPad has no step-by-step view.** A pad is a document that holds the context of your thinking. A run in the ThinkPad is shown only as a document (the form view). Stepping through a workflow means sending it to the runner. Confirmed in roadmap Revision 6 | §4.1 |
| 20 | **The workflow travels as a routing slip** (the roadmap's option B, chosen by Miguel). A request carries the workflow **as content**: `steps: [{ prompt, produces }]`. The workflow's id and version ride along only as an **opaque `tag`** the receiver hands back unread, for comparing runs later. An optional `want` verb comes from a short shell-owned list (e.g. "think", "step-through"); ThinkPad words never go on the wire. A reply carries `outcome` (resolved / question / abandoned) plus plain **`notes`**. The broker is a dumb pipe: it matches registrations, shows a picker if several fit, routes, and returns the reply. The envelope is defined in roadmap §4.2 (Revision 7) | §3.1, §6.3 |
| 21 | **Name: Resolve, not Complete.** A resolution means you've reached a place of understanding, which still holds when you leave room for doubt. "Complete" implies the task is solved | throughout |
| 22 | **Moves and tags don't start workflows by default, and no workflow is tied to a type of move.** Question, Expand and Flag offer **shortcuts** to workflows, but which workflow fits depends on context, so there is no fixed mapping | §3 |

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

Move, template and workflow from v1 collapse into **workflow**. Investigate is a workflow you can run on a span.

**No workflow is tied to a type of move** (decision 22). Which workflow fits a question or a claim depends on context.
- Choosing Question, Expand or Flag on a span opens a blank sub-pad, as it does today.
- Alongside that, the tag offers **shortcuts** to workflows you might want, and a way into the full library.
- The hard-coded `escalatesTo` field in `moves.js` is retired as a fixed link. At most it becomes one input to which shortcuts are offered.
- Likewise, a step's `slot` is the default that a variant saved, not a rule.

### 3.1 A workflow is tool-agnostic

**A workflow is a template: a series of prompts you work through.** It belongs to no tool.
- **Every tool runs workflows.** A move on a pad is a one-step workflow. Free-form moves are an unscripted workflow. A Focus session is a workflow you write as you go.
- **Each tool runs a workflow its own way.** The runner shows one step at a time. **The ThinkPad shows a form.** A form only makes sense for workflows whose steps produce text: a sketching workflow has no form, but a "reflect on that session" workflow does.

How this fits the workspace shell (decisions 15, 16, 20):
- **The workflow declares, each tool decides, the shell filters.** Each step has `produces: "text" | "action"`, defaulting to `"text"`. This is the basis of the Focus runner.
  - Each tool's registration says what it accepts. The ThinkPad accepts a workflow only if every step produces text. The runner accepts any.
  - The shell asks each registered tool and builds "Run with…" or "Send to…" from the answers. The shell never interprets workflows.
  - Keep exactly these two values until a third one would make some tool behave differently (§7's test).
- **Library.** Workflow definitions live in a **shell-level library**, a sibling of the shelf. They are not a ThinkPad or runner construct, and they are not copied per tool, because copies would drift and runs would stop being comparable.
  - The library **can be its own page** in the workspace, where you browse, write and edit workflows.
  - **Who reads and writes the library** *(proposed by the roadmap session; not yet confirmed by Miguel; §10 item 8)*:
    - **Receivers never read it.** The receiving tool works only with what it was sent.
    - **Senders may read it through the shell**, to list workflows and attach their steps. Senders include the library page, and a tag shortcut starting a workflow from a span.
    - **Only the library page writes to it**, including save as variant.
  - Pivots made during a run stay in the running tool's own state.
  - **Save as variant** sends the run's changed list of prompts back, with the opaque tag, as ordinary text. The library page files it as a variant of the tagged workflow.
- **Travel: a routing slip** (decision 20). The roadmap owns the envelope; this is what it means for workflows:
  - A request carries the subject as `text` (the claim being doubted, the step prompt) plus the workflow's steps as content: `steps: [{ prompt, produces: "text" | "action" }]`.
  - An optional `want` verb from a short shell-owned list (e.g. "think", "step-through") says what's being asked. ThinkPad words (doubt, claim, the tags) never go on the wire.
  - The workflow's `{ id, version }` rides along only as an **opaque tag**. The receiver stores it and hands it back unread, so runs of the same workflow can be compared later. No tool looks it up.
  - Tools register what they accept: text; steps, with or without action steps; which `want` verbs. The ThinkPad accepts steps only if all of them produce text. The runner accepts any steps. The runner never interprets a workflow id or a ThinkPad type.
  - A reply carries `outcome` (resolved / question / abandoned) plus optional plain **`notes`**. "Caveat" is how the ThinkPad chooses to *display* notes; it is not a term that travels between tools.
- **A definition knows no tool.** The `Workflow` type never mentions threads, docs, TipTap or runner frames. How a run is represented belongs to the tool running it (§9).

**It fits the existing recursion exactly.** `recursive-resolve-contract.md` defines two ways to resolve a span: type the output (the *lens*) or open a sub-pad (the *drill*). A step works the same way:

- **writing a step directly** is the lens;
- **slotting a workflow** is the drill, whose resolution rolls up into the step through `resolveThreadIntoParent`.

---

## 4. Views and filling

### 4.1 The ThinkPad shows a run as a document
- **Form view is the only view in the ThinkPad.** Every step is laid out in order with its resolution. A slotted workflow appears folded under its step, and you can drill in to see its process. This is for reading where you stand, and on a phone it is the same document, stacked.
- **Stepping through goes to the runner.** "Step through in runner" sends the workflow to the runner, using a Send or Ask through the shell. The ThinkPad does not re-implement the runner. A pad is a document that holds the context of your thinking and reasoning; it is not a step-by-step tool. (Decision 19.)
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
- **The citation channel** is read-only references to entries in any record, with a link back. Citing never changes where a record's value rolled up.
  - Within one tool, a citation can read the record directly.
  - Across tools, the tool contract forbids reading another tool's data, so a citation would go through the shell as text plus a reference back. This is deferred, along with records.

### 6.3 Across tools
How resolution and roll-up work when the asking level and the working level are in different tools. The envelope belongs to the roadmap; the routing-slip shape is decision 20.
- **Outcomes already line up.** The roadmap's reply outcomes `resolved | question | abandoned` are this doc's *a call | a sharper question | Back*.
- **A pending Ask is an open item.** If the ThinkPad sends a span to the runner, the span's open item stays until the reply arrives. The gate counts it like any unresolved move.
- **Accepted doubts travel as plain notes on the reply.** The ThinkPad displays the notes it receives as caveats. An item lifted out of another tool's level arrives as a note at the origin, to begin with.
- **Reflection is not built into the app** (decision 17). If you want to reflect on a practice, you put a reflection step in that workflow yourself, or run a reflection workflow when you choose to. Nothing prompts you.
  - A reflection step is an ordinary `produces: "text"` step.
  - In the runner, you can work a text step there, or Send or Ask it to the ThinkPad like any other text, and the reply lands on that step.
  - Changing the method itself stays a deliberate save-as-variant.

---

## 7. Types are defined by behaviour

Everything is text representing a thought, so a type is justified **only if it changes what the app does** at one of three points:

1. **Roll-up:** whether it closes a loop at the origin or keeps one open.
2. **What's offered next.** This extends the existing `movesForIntent()`. These are **suggestions of moves, not bindings to workflows** (decision 22).
3. **What comes back later:** something the app returns to after time passes or when evidence arrives.

| Type | Loop | Offered next | Comes back |
|---|---|---|---|
| Question | open (pinned at origin) | Investigate, Experiment, Clarify | until answered |
| Hunch / feeling | open, not yet put into words | Clarify; turn it into a prediction | no. Never asked to defend itself, so no Doubt by default |
| Claim (finding, interpretation) | closed, open to challenge | Doubt, Support, Implications | no |
| Prediction | closed for now, checked later | (none yet) | asks "was I right?" when related evidence arrives; this is the calibration loop |
| Call | closed | Plan, Experiment | at a review date or reversal condition |
| Intention | closed here | a Send with intent "act", which the registry resolves (today to the runner) | in whichever tool took it |
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
| **Park it as its own work** | It's bigger than this inquiry | It leaves through a **one-way Send**. The default destination is the shelf; you can also choose a new pad or another tool through the registry. It keeps a link back and never blocks here |

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
// Shared, tool-agnostic workflow definition. Data only, node-testable (like MOVES).
// Lives in the shell-level library, not under src/thinkpad/ or src/focus/.
Workflow = {
  id, label, version,
  variantOf: workflowId | null,      // "Investigate · Research" → "investigate"
  steps: [{
    id, prompt,
    expects: Type | null,            // what the step resolves to (§7)
    produces: "text" | "action",     // default "text"; tools decide what they accept
    slot: workflowId | null,         // the default a variant saved; never a rule
  }],
}
// Must render as plain text (numbered prompts) for tools that don't understand workflows.

// ── ThinkPad's representation of a run (only when the ThinkPad is the tool running it) ──
// The run is a thread; its doc is the form view (step headers + one resolution under each).
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
6. **Where tag shortcuts come from.** Decision 22 says tags offer shortcuts to workflows without a fixed mapping. What decides which shortcuts appear? Options:
   - workflows you've pinned to that tag yourself;
   - the ones you've used most recently with it;
   - only the library, with no shortcuts until you pin some.
7. ~~**Renaming "Complete" back to "Resolve" in code.**~~ **Done.** ThinkPad says Resolve since the gate (`6cf989f`); the Focus runner since Phase 0 (roadmap Revision 8).
8. **Library access rule (proposed).** Receivers never read the library; senders read it through the shell; only the library page writes to it (§3.1). The roadmap session is raising this with Miguel.

---

## 11. Mockup

The canvas now shows the v2 model:
- **Investigate · Research** in form view, with open counts in the breadcrumb and step 4 filled by a workflow.
- **Investigate · Debugging**: a step added during the run, and step 4's workflow being swapped.
- **The Resolve gate**, with the four decisions and the scope check.
- **The result rolled up** with its caveat, plus the parked question.
- **On phone**: the preview with a variant picker, and the form view stacked as a document. "Step through in runner" sends the workflow to the runner (decision 19).

The workflow-step and cite screens are carried over from v1.

---

## 12. Suggested build order

1. **Pure core.** `openItems`, `disposeOpenItem` and `canResolve`, then wire `canResolve` into `canComplete`. This adds the gate on top of what exists today and is useful even before workflows.
2. **Workflow definitions and ThinkPad runs.** Add the shared, tool-agnostic workflow module. In the ThinkPad, a run thread's doc becomes the form view, steps are written directly or slotted (drill), and the Preview/Method sheet appears. Running a workflow across tools waits on the roadmap's sequence: the runner gets its own persistence and one-way Send ships before any cross-tool Ask.
3. **Resolution.** Call versus sharper question, caveats, lift and park, and the roll-up to the origin.
4. **Variants.** Pivots local to the run, then save as variant at resolve.
5. **Records and citation.** The frozen run store, plus Cite.
6. **Behavioural types.** Next-move suggestions, plus things that come back: prediction checks, call reviews, Focus hand-off.
