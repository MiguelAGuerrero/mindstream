# Mindstream — Product Assessment and Roadmap

**Date:** 2026-11-23
**Assessed at:** commit `b0fa956` (v0.1.0 plus the ThinkPad pruning batches and the Focus "complete" rename)
**Scope decisions (confirmed with Miguel):**

- **"Task executor" means you execute, the app guides.** No AI agent in this horizon.
- **Audience is Miguel, for now.** No onboarding, accounts, sync or launch work.
- This doc supersedes `PRODUCT_AGENT_CONTEXT.md` as the top-of-thread product context.

**Revision 2 (same day):** aligned with the in-flight direction Miguel described: text is the first-class unit every tool consumes, ThinkPad spans become runnable work in the Focus runner through workflows, and a Focus step can open its own think pad. The design for this is `docs/capture-templates-proposal.md` (v2) on branch `claude/great-dijkstra-ave9hv`. Only that proposal doc was visible on the remote; no implementation code was, so §2 and §3 still describe `master`. §4 to §6 were revised: Phases 2 and 3 now sequence the in-flight work instead of proposing a parallel design, and the earlier advice to leave out a workflow library and delete `escalatesTo` is withdrawn.

**How this was assessed:** read every design doc and all non-test source, ran `vitest` and `vite build`, and drove both tools in a real browser (stream, reflect, drill two levels, complete, next draft, Focus decompose, reload).

---

## 1. The identity, in one paragraph

Mindstream is a tool for **resolving a thought by recursion and then carrying out what it resolved into**. You dump a messy thought; you pick the part that needs work and descend into it as its own blank page; when that page converges to one idea, it folds back up and replaces the mess it came from. The same operation runs on tasks: a focus that is too big is decomposed into a sub-focus, which is completed and folds a takeaway back up. One primitive, two materials:

```
resolve(node):
  base case      -> you write the answer / do the task
  recursive case -> open a child seeded from the node, resolve it, fold the result up
```

The material the primitive works on is always **text that stands for a thought**: a claim, a doubt, a question, an intention. Any tool in the app should be able to take such a piece of text as its input and hand back text that replaces or sits beside it.

That primitive is the product. Everything in the roadmap is judged by whether it makes the descend / converge / fold-up loop clearer, safer or faster.

---

## 2. What exists today

| Area | State | Evidence |
|---|---|---|
| **ThinkPad: stream / reflect phases** | Working. Stamp freezes the draft, block chips appear, drafts are versioned and navigable. | `stampDraft`, `advanceToNextDraft`, `DraftPhaseBar.vue` |
| **ThinkPad: recursive drill** | Working to arbitrary depth, with breadcrumb, goal line and parent peek. | `drillIntoSpan`, `surfaceThreadId`, drill bar in `ThinkPadPage.vue` |
| **ThinkPad: fold-up** | Working. Completing a one-block sub-pad stages its text against the parent; "Next Draft" splices it in. | `resolveThreadIntoParent`, `revealReflectPass` |
| **ThinkPad: persistence** | Working. IndexedDB, survives reload, document picker and "pick up where you left off" grid. | `padsDb.js`, `padPersistenceMapper.js` |
| **Focus runner** | Working in memory only. Contexts, decompose stack, complete with takeaway, park with "waiting on". | `sessionRunStore.js` |
| **Domain quality** | Strong. Pure reducers, injected clock and ids, 251 passing tests. | `thinkPadModel.js` and its test files |
| **Research base** | Unusually deep; design rules are traceable to literature. | `recursive-resolve-contract.md` §3, `research-productivity-science.md` |

The recursive ThinkPad loop is real and it works. In the browser run, a two-level drill folded a converged sentence back into its parent and minted "Draft 2 / 2" exactly as the contract describes. That is the hard part, and it is built.

---

## 3. Assessment

### 3.1 Strengths to protect

1. **The fold-up is a true recursion, not a link.** A child's result replaces the parent span, and the child is archived, not pasted. Outliners and backlink tools do not do this.
2. **Phase is a property of the material.** A frozen draft cannot be typed into. The discipline is structural, so it does not rely on willpower.
3. **The convergence gate.** A sub-pad with more than one block cannot be completed (`threadIsOpen`). "Converge before you ascend" is enforced by the model. This is the most opinionated and most distinctive rule in the app.
4. **The functional core.** Reducers are pure and reference-stable, which makes the roadmap below cheap to build and safe to test.

### 3.2 Identity gaps (ordered by how much they blur the product)

**G1. The two halves do not touch.** ThinkPad and Focus share no data, no navigation and no vocabulary. `sessionRunStore.js` states it is "separate from padStore". A thought can converge in ThinkPad and there is no way to make it a focus; a completed focus cannot report back to the thought that produced it. Today Mindstream is a thinking tool and a separate sticky-note timer behind a launcher. The "and task executor" in the identity is not yet true as one product. *The in-flight work targets exactly this gap, in both directions.*

**G2. The executor forgets everything.** Focus state is in memory and is lost on reload (confirmed in the browser). An executor that cannot survive a refresh cannot hold a parked context "waiting on" something, which is the feature's whole reason to exist.

**G3. The recursion is the same idea implemented twice.** ThinkPad has threads, sub-threads and a parent anchor. Focus has contexts and a frame stack. Both are "descend, resolve, fold up", with different names, different shapes, and different fold-up semantics (ThinkPad splices text; Focus overwrites a single `result` string, so a second child's takeaway erases the first).

**G4. Reflect is a one-way door.** `resolveThreadIntoParent` in the store force-stamps the parent, and `restreamDraft` / `restreamFromDraftHistory` exist in the domain but are not wired to any UI. Once a pad is in Reflect there is no way to write freely in it again. The lifecycle doc says the escape hatch must exist ("never trapped"); the build has the trap without the hatch.

**G5. Designed vocabulary, undelivered.** `moves.js` defines nine moves in four families with prompts, write-back modes and intent mappings. The UI exposes three tags (Question, Expand, Flag), and the tag does not change what happens next: every tag opens the same blank sub-pad. The move's driving question, the thing that would make a drill *guided*, never reaches the screen. *The capture-templates proposal answers this by making a move a workflow of prompted steps.* Likewise unwired: pins (`captureIdea`, `performMoveOnIdea`), the intent detector (does not exist), `promoteWithinPad` (no component emits `extract-step`), `resumeHint`, and the timebox config.

**G6. Recursion is asymmetric below the root.** `drillThreads` is only computed at the root (`useThinkPadSurface.js:40`), so the thread list and "Continue / Reopen" affordances do not appear inside a sub-pad. The root is also special in the model (`pad.doc` vs `thread.doc`), which is why a reframe cannot rewrite the root's goal. The contract already names root-as-frame as the fix.

**G7. Fold-up is harder to see than it should be.** Completing a child returns you to the parent with a badge and a "Next Draft" button. The moment the product exists for, the mess being replaced by the result, happens one click later and without a before/after. The "study beat" from the lifecycle doc is not built.

### 3.3 Defects found

| # | Defect | Where |
|---|---|---|
| D1 | 2 failing tests. They assert the pre-`b0fa956` behaviour (no `resolved` field; root complete stays on the context). | `focus/model/session.test.js`, `focus/store/sessionRunStore.test.js` |
| D2 | "Complete" is enabled on an empty sub-pad and silently does nothing. | `canComplete` in `useThinkPadSurface.js` vs the empty-text guard in `padStore.resolveThreadIntoParent` |
| D3 | Stray `<ThinkPadAppBar />` in the page template; Vue warns "Failed to resolve component" on every render. | `ThinkPadPage.vue:81` |
| D4 | `<router-view>` directly inside a transition; Vue Router warns and the fade does not apply. | `App.vue` |
| D5 | Placeholder says "Right-click highlighted text to make a move"; there is no right-click handler. | `ThinkPadPanel.vue:178` |
| D6 | Overlapping staged moves are not detected at reveal (the lifecycle doc requires blocking). | `revealReflectPass` |
| D7 | In the automated run, a single click on a block in Reflect descended immediately instead of only showing the chips. Not reproduced by hand; worth a manual check. | block click routing in `ThinkPadPanel.vue` |
| D8 | Focus timer resets on every action and is display-only; time spent is never recorded. | `FocusRunnerPage.vue` |

### 3.4 Hygiene

- **Docs describe three different products.** `README.md` is the Vite template. `PRODUCT_AGENT_CONTEXT.md` describes "Rep-it", a workflow-step session app, and points at files that no longer exist. `FRONTEND_PATHS.md` says `/` redirects to `/thinkpad` and lists a `src/workflow/` module; the app has a Home launcher and no workflow module. Since these docs are fed to agents as context, the drift costs real work.
- **Naming is unsettled.** Threads are called frames, threads, drills and sub-pads; pads are also contexts and documents; "focus" means both a ThinkPad drill (older docs) and the Focus tool.
- **Bundle.** 708 kB JS and 677 kB CSS, with both Material Design Icons and Font Awesome shipped; Font Awesome and the two audio files appear unused.

---

## 4. Product identity to commit to

**Statement.** Mindstream is a recursive resolver. You bring one unresolved thing. You descend into whatever part is too big to answer directly, and nothing can come back up until it has converged to one idea. What comes up replaces the mess it came from. When a thought resolves into something to *do*, it runs through the same loop as a focus.

**Five rules that follow from it.** Use these to accept or reject features.

0. **Text is the interface.** Every tool consumes a piece of text that stands for a thought and returns text anchored to it. A span is a workable thing, not decoration on a document. A feature that needs its own non-text input format is suspect.
1. **One primitive.** Thought-nodes and task-nodes are the same kind of thing: a goal, a workspace, children, and a result that folds up. Build it once.
2. **Convergence is the gate.** Nothing ascends unresolved: one block, and no open items left undecided (the proposal's open-item gate). Abandoning is allowed but is a visible, named act.
3. **Fold the result, archive the process.** The parent only ever receives the chunk. The path that produced it stays re-openable.
4. **One level in view.** At any moment you see one node, its goal, and a cue to where you are. Never a two-pane parent and child.
5. **The app guides, you execute.** The app asks the next question or shows the next step of a workflow. It never generates the answer.
6. **The anchor chain is never broken.** However many levels a move descends, and whichever tool it runs in, its result lands at the span that produced it. This is only possible if the work stays in one tree, so moving work between tools means changing the view, not copying the data.

**What it is not** (for this horizon): a note vault, an outliner you browse, a to-do list, a team tool, or an AI writer.

**The two tools, restated.** ThinkPad is the *document view* of the tree: many spans visible, you choose where to work. The Focus runner is the *step view* of the same tree: one step visible, the app tells you what is next. The proposal already describes these as "form view" and "step view" of a run (§4.1). Under this reading the runner stops being a separate tool with its own state.

**Vocabulary to standardise** (one word per concept, in UI and code):

| Concept | Word | Retire |
|---|---|---|
| Top-level unit of work | **pad** | context (ThinkPad sense), document |
| A node in the recursion | **thread** | frame, drill (as a noun), sub-pad |
| Going down | **descend** | drill, focus (ThinkPad sense), decompose |
| Finishing a node | **complete** | resolve up, roll-up |
| What comes back up | **result** | chunk, takeaway, output |
| A thread whose result is an action | **task** | focus, context (Focus sense) |
| A method made of prompted steps | **workflow** | template, form (as nouns for the thing itself) |
| One execution of a workflow on a span | **run** | session |
| A move started at a level and not yet settled | **open item** | |

One naming conflict to settle: `master` just renamed "Resolve up" to "Complete", while the proposal uses "Resolve" and "resolution" throughout. Pick one before the workflow UI is built. "Resolve" fits better once a level can end in *a call or a sharper question*, since a sharper question is resolved but not complete.

---

## 5. Roadmap

Sized for one developer. Phases are ordered so each one makes the identity more true and leaves the app usable. Each has an exit test you can perform by hand.

### Phase 0 — Make the ground true (about 2 days)

Nothing here changes behaviour; it stops the repo from misdescribing itself.

- Fix D1 to D5. For D2, disable Complete on an empty sub-pad and say why in the tooltip.
- Replace `README.md` with the identity statement from §4, the two routes, and how to run and test.
- Mark `PRODUCT_AGENT_CONTEXT.md`, `PRODUCT_IDEATION_CONTEXT.md`, `TRIAGE_IDEATION_CONTEXT.md`, `GRAPH_STATUS_AGENT_CONTEXT.md` and `feature-science-map.md` §3 as historical, or move them to `docs/archive/`. Correct `FRONTEND_PATHS.md`.
- Remove Font Awesome and the unused audio assets if confirmed unused.

**Exit test:** `npm test` is green, the browser console is clean on both routes, and a fresh agent session given only `README.md` and this doc describes the product correctly.

### Phase 1 — Close the ThinkPad loop (about 1 to 2 weeks)

Make the existing recursion complete and trustworthy before extending it.

- **Escape hatch (G4).** Wire `restreamDraft` as a named "Write more" action in the phase bar. Stop `resolveThreadIntoParent` from force-stamping a parent that is still in Stream; either stage without freezing, or ask.
- **Symmetric recursion (G6).** Compute `drillThreads` for the current surface at any depth so every sub-pad shows its own threads and Continue / Reopen. Take the root-as-thread unification from the contract (§13.3) if it falls out cheaply; otherwise leave it for Phase 3.
- **Make the fold-up the moment (G7).** After "Next Draft", show a short before/after of each replaced span, then the whole new draft. This is the study beat. Keep it skippable.
- **Open-thread hygiene.** On the parent, mark threads as open, converged-not-completed, or completed. On Back from a thread with content, say it is being left open. Contract rule 6 calls unclosed drills "worse than no feature".
- **Reveal conflicts (D6).** Block the reveal when two staged results overlap and let you pick.
- Check D7 by hand and fix if real.

**Exit test:** take a real problem from dump to a one-paragraph resolved root in one sitting, going at least two levels deep, without ever being stuck in a phase and without losing track of an open thread.

### Phase 2 — Spans become workable: the gate, then workflows (about 2 to 3 weeks)

This is the in-flight work, sequenced in the proposal's own build order (§12, steps 1 to 3). It is where "the app guides" becomes true for thinking (G5).

- **Open-item gate first.** `openItems`, `disposeOpenItem`, `canResolve`, wired into `canComplete`, with the four decisions (address, accept as doubt, lift, park). It is pure-core, useful without workflows, and it also fixes D2. Show open counts in the breadcrumb.
- **A move is a workflow.** Add the workflow table; `escalatesTo` becomes slot defaults. Starting "Doubt" on a claim creates a run thread anchored to that span. Keep the palette small: the three tags stay as the entry, each offering its workflows.
- **A step is the same primitive again.** Write it directly (base case) or slot a workflow into it (recursive case). Slotted workflows fold up into the step through `resolveThreadIntoParent`. No new fold-up mechanism.
- **Resolution: a call or a sharper question.** Honour write-back at the origin: a call sits beside or replaces the span; a sharper question replaces it and stays open.
- **Pins in the keystream.** One keystroke in Stream marks the current block (`captureIdea`). Pins are notes, not open items, which matches the proposal's §8.1.

Hold back until the loop is in daily use: variants and save-as-variant, records and citation, behavioural types beyond call and question.

**Exit test:** select a claim, start Doubt, slot a workflow into one step two levels down, and resolve everything. The claim in the root pad now carries the call, with any accepted doubt shown as a caveat. Resolve was refused at least once because of an undecided open item.

### Phase 3 — One tree, two views (about 2 to 3 weeks)

The identity phase. It resolves G1, G2 and G3 together, and delivers both bridges Miguel described.

- **The runner is the step view of a run.** The Focus route renders a run thread from the pad store one step at a time: prompt, the origin span as context, one resolution. Decompose is "slot a workflow or sub-step here". Complete is the same fold-up as in ThinkPad. Retire `sessionRunStore`'s separate contexts and frame stack.
- **Bridge down: span to runner.** From a span in Reflect, "Run in Focus" opens that span's run in step view. Nothing is imported or copied; the surface pointer moves. This is what keeps rule 6 true: a step resolved five levels down still lands at its anchor, because it never left the tree.
- **Bridge up: step to pad.** From any step in the runner, "Think here" opens that step's own think pad, which is just the thread's `doc`. Stream, reflect and drill all work there. When it converges, its one block is the step's resolution and you are back in step view.
- **Freestanding focus still exists.** "What are you working on?" creates a pad whose root is a task with no origin span. It is the same thread kind without a parent anchor, so authored focuses and span-born runs are one thing.
- **Persistence for free.** Runs live in pads, so `padsDb` saves them. Parked state and `waitingOn` survive reload (G2).
- **Results accumulate.** A level keeps every child's resolution in its process and summarises to one; a second child no longer erases the first (G3).
- **One breadcrumb** across both views, with open counts: pad, span, run, step, slotted run, step.
- **Record time** per step instead of resetting a display clock (D8).

**Exit test:** dump a thought, start Doubt on a claim, run it in the Focus runner, hit a step that needs thinking, open its pad, drill once inside it, converge, return to the runner, finish the run, and see the claim updated in the original pad. Reload at any point without losing your place.

### Phase 4 — Resume and the open-loop ledger (about 1 to 2 weeks)

With one tree, the home screen can answer "what should I pick up?".

- **Replace the launcher.** Home becomes a list of open loops across all pads: open thought threads, active tasks, and parked tasks with what they are waiting on. Two icons become one entry point.
- **Resume lands you exactly where you were:** same pad, same thread, same phase. Set `resumeHint` on leave and show it on return.
- **Parked tasks resurface.** A parked task shows how long it has waited; un-parking returns to its exact depth.
- **Export.** One pad to Markdown, with the resolved root on top and archived threads nested below. For a personal local-only tool, this is also the backup.

**Exit test:** after a week away, Home tells you every unfinished thread and waiting task, and one click puts you back at the exact node.

### Phase 5 — Feel and speed (ongoing, after the loop is whole)

- Keyboard for the whole loop: descend, complete, back, peek, stamp, next draft, pin.
- The atmospheric contrast between Stream and Reflect from the lifecycle doc §8, including the transition.
- A tree overview of a pad (read-only map of what was resolved into what), shown on demand.
- Code-split the routes and trim the icon fonts.

### Explicitly not on this roadmap

- AI generation or agent execution. Rule 5. If revisited, Phase 3's `kind` field is where an `agent` executor would attach.
- Accounts, sync, sharing, mobile layout, onboarding.
- From the proposal, for now: variants, records and citation, and the "comes back later" behaviours (prediction checks, call reviews). They depend on the run loop being in daily use first.
- Multiple drills per span with AND/OR roll-up, and sibling re-validation after a fold-up. Real ideas, deferred in the contract, still deferred.

---

## 6. Sequencing rationale and risks

- **Why Phase 1 before unification:** Phase 3 moves tasks onto the thread model. If that model still has a one-way phase and root-only thread lists, the defects are inherited by the executor.
- **Why the gate before workflows, and workflows before the runner:** the gate is small, pure and immediately useful. Workflows then exist as run threads in ThinkPad's form view, where they can be tested with the UI that already works. Only then does the runner become a second view over something proven.
- **Largest risk: building the bridge as an import.** If spans are copied into the Focus store, the anchor chain breaks at the copy, every fold-up needs a sync step, and G3 becomes permanent. The description "imported into the focus state" could be read that way. Recommendation: the runner reads run threads from the pad store and Focus keeps no state of its own beyond which run and step are in view.
- **Second risk: ceremony.** Stamp, tag, choose workflow, fill steps, decide open items, resolve, next draft. Workflows add acts. Keep the direct path one gesture long: writing a step by hand must always be available, and a single staged result should be able to resolve and reveal in one act.
- **Third risk: Phase 3 is a real refactor.** Do it additively: add the step view over run threads while the old Focus store still runs, switch the route, delete the old store last.

### Questions for Miguel

1. **View or import?** Is the Focus runner meant to be a view over the same run thread (recommended above), or a separate state that spans are copied into and synced back from?
2. **Where is the in-flight code?** Only the proposal doc is on the remote. If implementation exists on an unpushed branch, §2 and §3 should be re-checked against it.
3. **Resolve or Complete?** See the naming note in §4.
4. **Does every tag map to a workflow?** Doubt is the example given. Should Question, Expand and Flag each open a workflow by default, or do some stay as a plain blank sub-pad?

---

## 7. Measures (for a tool with one user)

Count these from the data already stored; no analytics needed.

- **Resolved roots:** pads whose root reached a one-block converged state. The product's reason to exist.
- **Open-thread ratio:** threads left open with content, over threads created. Should fall after Phase 1.
- **Depth actually used:** distribution of max depth per pad. If it is always 1, recursion is not earning its place.
- **Thought-to-task conversion:** after Phase 3, share of resolved pads that produced at least one task, and share of those tasks completed.
- **Resume success:** after Phase 4, how often a return visit continues an existing thread instead of starting a new pad.
