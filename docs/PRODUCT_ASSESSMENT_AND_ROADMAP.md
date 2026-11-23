# Mindstream — Product Assessment and Roadmap

**Date:** 2026-11-23
**Assessed at:** commit `b0fa956` (v0.1.0 plus the ThinkPad pruning batches and the Focus "complete" rename)
**Scope decisions (confirmed with Miguel):**

- **"Task executor" means you execute, the app guides.** No AI agent in this horizon.
- **Audience is Miguel, for now.** No onboarding, accounts, sync or launch work.
- This doc supersedes `PRODUCT_AGENT_CONTEXT.md` as the top-of-thread product context.

**How this was assessed:** read every design doc and all non-test source, ran `vitest` and `vite build`, and drove both tools in a real browser (stream, reflect, drill two levels, complete, next draft, Focus decompose, reload).

---

## 1. The identity, in one paragraph

Mindstream is a tool for **resolving a thought by recursion and then carrying out what it resolved into**. You dump a messy thought; you pick the part that needs work and descend into it as its own blank page; when that page converges to one idea, it folds back up and replaces the mess it came from. The same operation runs on tasks: a focus that is too big is decomposed into a sub-focus, which is completed and folds a takeaway back up. One primitive, two materials:

```
resolve(node):
  base case      -> you write the answer / do the task
  recursive case -> open a child seeded from the node, resolve it, fold the result up
```

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

**G1. The two halves do not touch.** ThinkPad and Focus share no data, no navigation and no vocabulary. `sessionRunStore.js` states it is "separate from padStore". A thought can converge in ThinkPad and there is no way to make it a focus; a completed focus cannot report back to the thought that produced it. Today Mindstream is a thinking tool and a separate sticky-note timer behind a launcher. The "and task executor" in the identity is not yet true as one product.

**G2. The executor forgets everything.** Focus state is in memory and is lost on reload (confirmed in the browser). An executor that cannot survive a refresh cannot hold a parked context "waiting on" something, which is the feature's whole reason to exist.

**G3. The recursion is the same idea implemented twice.** ThinkPad has threads, sub-threads and a parent anchor. Focus has contexts and a frame stack. Both are "descend, resolve, fold up", with different names, different shapes, and different fold-up semantics (ThinkPad splices text; Focus overwrites a single `result` string, so a second child's takeaway erases the first).

**G4. Reflect is a one-way door.** `resolveThreadIntoParent` in the store force-stamps the parent, and `restreamDraft` / `restreamFromDraftHistory` exist in the domain but are not wired to any UI. Once a pad is in Reflect there is no way to write freely in it again. The lifecycle doc says the escape hatch must exist ("never trapped"); the build has the trap without the hatch.

**G5. Designed vocabulary, undelivered.** `moves.js` defines nine moves in four families with prompts, write-back modes and intent mappings. The UI exposes three tags (Question, Expand, Flag), and the tag does not change what happens next: every tag opens the same blank sub-pad. The move's driving question, the thing that would make a drill *guided*, never reaches the screen. Likewise unwired: pins (`captureIdea`, `performMoveOnIdea`), the intent detector (does not exist), `promoteWithinPad` (no component emits `extract-step`), `resumeHint`, and the timebox config.

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

1. **One primitive.** Thought-nodes and task-nodes are the same kind of thing: a goal, a workspace, children, and a result that folds up. Build it once.
2. **Convergence is the gate.** Nothing ascends unresolved. Abandoning is allowed but is a visible, named act.
3. **Fold the result, archive the process.** The parent only ever receives the chunk. The path that produced it stays re-openable.
4. **One level in view.** At any moment you see one node, its goal, and a cue to where you are. Never a two-pane parent and child.
5. **The app guides, you execute.** The app asks the next question or shows the next focus. It never generates the answer.

**What it is not** (for this horizon): a note vault, an outliner you browse, a to-do list, a team tool, or an AI writer.

**Vocabulary to standardise** (one word per concept, in UI and code):

| Concept | Word | Retire |
|---|---|---|
| Top-level unit of work | **pad** | context (ThinkPad sense), document |
| A node in the recursion | **thread** | frame, drill (as a noun), sub-pad |
| Going down | **descend** | drill, focus (ThinkPad sense), decompose |
| Finishing a node | **complete** | resolve up, roll-up |
| What comes back up | **result** | chunk, takeaway, output |
| A thread whose result is an action | **task** | focus, context (Focus sense) |

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

### Phase 2 — Let moves guide the descent (about 1 to 2 weeks)

This is where "the app guides" becomes true for thinking (G5).

- **The tag chooses the question.** When you descend, the sub-pad shows the move's driving `prompt` under the goal ("Why might this be wrong?"), and the placeholder uses `resolutionPlaceholder`. Start with the three tags mapped to a default move each; offer the other moves in the family as a secondary choice. Do not bring back a nine-button palette.
- **Honour write-back.** `replace` moves substitute the span; `annotate` moves attach beside it. The model already supports both; the UI only ever replaces.
- **Pins in the keystream.** One keystroke in Stream marks the current block as "come back to this" (`captureIdea`). On stamp, pinned blocks are listed first as the reflect agenda.
- **Decide the fate of the rest.** Either build the intent detector as a later experiment or delete `INTENT_CLASSES`, `answers` and `escalatesTo` from `moves.js`. Dead vocabulary is a cost; pick one.

**Exit test:** descending with "Question" and with "Expand" on the same sentence produces visibly different prompts and a different shape of result in the parent.

### Phase 3 — One recursion, two materials (about 2 to 3 weeks)

The identity phase. It resolves G1, G2 and G3 together.

- **A task is a thread.** Add a `kind` to threads: `thought` (workspace is a text pad, result is text) or `task` (workspace is the focus card, result is a takeaway). Same tree, same parent anchor, same complete and fold-up. Retire `sessionRunStore`'s separate contexts and frame stack; the Focus route becomes a view over task threads in the pad store.
- **Persistence for free.** Because tasks now live in pads, they are saved by `padsDb`. Parked state and "waiting on" survive reload.
- **The bridge down.** In Reflect, a converged block gets a fourth action: "Do this". It creates a task thread anchored to that block and opens it in the runner.
- **The bridge up.** Completing a task folds its takeaway back to the anchored block as an annotation (not a replacement), so the thought records what happened when you acted on it. Completing a sub-task appends to the parent's results instead of overwriting them.
- **Stuck is a descent.** From the runner, "Think about this" opens a thought thread under the current task. Being blocked on a task and needing to think is the same move as being blocked on a thought.
- **One breadcrumb.** The trail can now read: pad, thought, thought, task, sub-task. The goal line and peek work the same at every level.
- **Record time.** Store elapsed time per task thread instead of resetting a display clock (D8).

**Exit test:** start from a dump, resolve it to a decision, turn the decision into a task, decompose it, get stuck, think your way out in a thought thread, complete everything, and reload at any point without losing your place. One tree, visible end to end.

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
- A workflow or template library. The old "Rep-it" direction; moves cover the guided part at a smaller grain.
- Multiple drills per span with AND/OR roll-up, and sibling re-validation after a fold-up. Real ideas, deferred in the contract, still deferred.

---

## 6. Sequencing rationale and risks

- **Why Phase 1 before unification:** Phase 3 moves tasks onto the thread model. If that model still has a one-way phase and root-only thread lists, the defects are inherited by the executor.
- **Why moves before unification:** it is small, it is independent, and it is the cheapest way to find out whether guided descent changes how you actually think with the tool. If it does not, that is worth knowing before Phase 3.
- **Largest risk: Phase 3 is a real refactor.** Mitigation: do it additively. Add `kind` and the task view first while the old Focus store still runs; switch the route over; delete the old store last. The pure reducers and test suite make this safe.
- **Second risk: ceremony.** Stamp, tag, descend, converge, complete, next draft is six acts for one idea. Watch for the point where you stop using Reflect on small thoughts. If that happens, the fix is a fast path (complete and reveal in one act when only one result is staged), not removing the gate.
- **A decision to make before Phase 3:** whether a task's workspace is only the focus card, or also has a scratch pad. Recommendation: card only at first. A task that needs writing should descend into a thought thread, which keeps the two materials honest.

---

## 7. Measures (for a tool with one user)

Count these from the data already stored; no analytics needed.

- **Resolved roots:** pads whose root reached a one-block converged state. The product's reason to exist.
- **Open-thread ratio:** threads left open with content, over threads created. Should fall after Phase 1.
- **Depth actually used:** distribution of max depth per pad. If it is always 1, recursion is not earning its place.
- **Thought-to-task conversion:** after Phase 3, share of resolved pads that produced at least one task, and share of those tasks completed.
- **Resume success:** after Phase 4, how often a return visit continues an existing thread instead of starting a new pad.
