# Mindstream — Product Assessment and Roadmap

**Date:** 2026-11-23 (last revised 2026-11-24, Revision 21)
**Assessed at:** commit `b0fa956` (v0.1.0 plus the ThinkPad pruning batches and the Focus "complete" rename)
**Scope decisions (confirmed with Miguel):**

- **"Task executor" means you execute, the app guides.** No AI agent in this horizon.
- **Audience is Miguel, for now.** No onboarding, accounts, sync or launch work.
- This doc supersedes `PRODUCT_AGENT_CONTEXT.md` as the top-of-thread product context.

**Revision 2 (same day):** aligned with the in-flight direction Miguel described: text is the first-class unit every tool consumes, ThinkPad spans become runnable work in the Focus runner through workflows, and a Focus step can open its own think pad. The design for this is `docs/capture-templates-proposal.md` (v2) on branch `claude/great-dijkstra-ave9hv`. Only that proposal doc was visible on the remote; no implementation code was, so §2 and §3 still describe `master`. §4 to §6 were revised: Phases 2 and 3 now sequence the in-flight work instead of proposing a parallel design, and the earlier advice to leave out a workflow library and delete `escalatesTo` is withdrawn.

**Revision 3 (same day):** Miguel widened the frame. Mindstream is not one recursive tool; it is a **thinking workspace**: a suite of tools for processing and refining thoughts so you can answer questions, make decisions, and turn big goals into small actions you can take. ThinkPad and the runner are the first two tools, and others may join. §1 and §4 were rewritten around that, a tool contract was added (§4.1), and Phase 4 now treats Home as the workspace entry instead of removing it.

**Revision 4 (2026-11-24):** Miguel settled the architecture question. **Tools are decoupled.** Each tool stands alone, owns its own state, and is usable without the others. They share one principle (break a daunting thing, written as text, into pieces small enough to act on) and one message type (text), exchanged through a broker so any tool can import from and export to any other. The "one shared tree, tools are views" design from Revisions 2 and 3 is withdrawn. §4, Phase 3, Phase 4 and §6 were rewritten for the broker model.

**Revision 5 (2026-11-24):** "Decoupled" is refined to **loosely coupled through a shell**, the pattern used by plugin hosts such as VS Code and Obsidian and by the phone share sheet. Tools still own their state and never reference each other, but they cooperate through a workspace shell that owns the layout, a capability registry, and message routing. Miguel confirmed the workspace should feel like one place where several tools are open at once; a multi-tool layout feature exists but is not deployed and was not visible on the remote. Added §4.3 (the shell), a Send/Ask distinction on messages, and a shelf; Phase 3 and Phase 4 adjusted.

**Revision 6 (2026-11-24):** two decisions from Miguel. **The shelf is confirmed.** **ThinkPad has no step-by-step view:** a pad is a document that offloads the context of your thinking, interpretation and reasoning; working through steps one at a time is the runner's job, and ThinkPad must not re-implement it. A workflow run inside ThinkPad is shown as a document (the form view in the capture-templates proposal); to step through it, send it to the runner.

**Revision 7 (2026-11-24):** decisions confirmed by Miguel, several first settled in the capture-templates session.
- **The message carries content, not labels.** A workflow travels as its ordered list of prompts. The broker only matches capabilities and routes; it does no lookup or translation. The runner never learns workflow names or ThinkPad types. Replies carry plain notes. Basis: "smart endpoints, dumb pipes", FDC3 and Android intents, and the routing-slip pattern (§4.2).
- **"Resolve", not "Complete".** A resolution means you reached understanding, even with room for doubt; "complete" implies the task is solved. The recent rename on `master` is to be reverted.
- **Tags do not start a workflow.** Question, Expand and Flag offer shortcuts to workflows, but no workflow is tied to a type of move.
- **Steps declare what they produce:** text or an action.
- **The workflow library belongs to the workspace** and has its own page.
- **Reflection is not an app feature.** Nothing prompts it; it is a step or a workflow you choose to run.

**Revision 8 (2026-11-24):** merged the parallel build of the runner, the workflow library and the first two bridges (branch `feature/workflows-decision-steps`) and aligned it with Revision 7. What landed is in §2; what is designed but not built is in §5, "Backlog from the workflows build"; the points where the build departs from a settled rule are new questions in §6.
- **The message in §4.2 is now real** (`src/handoff/`): requests carry `text`, `context`, `steps`, `want`, `replyTo`, `tag`; replies carry `outcome`, `text`, `steps`, `notes`. Routing matches the `want` verbs each tool registers. Older stored records are read and converted.
- **Two extensions to the step shape**, both readable as plain prompts by a tool that ignores them: `expects: "call"` marks a decision step (the §7 "Call" type), and `options` lists the outputs to choose from. Miguel asked for decision steps: "any step that requires a decision can be marked as such … those outputs can be encoded as decisions on that step to proceed."
- **"Resolve" is restored** on the Focus card and in ThinkPad's drill bar. Identifier renames (`completeFocus`, `canComplete`) remain Phase 0 work.
- **Settled by Miguel in that session** (do not reopen without him):
  - A workflow is only its steps. Anything it needs you to consider or produce is a step, a call where an output is required. There are no workflow-level notes.
  - Notes belong to the run, in the context where it happened, never to the workflow.
  - The runner's card shows the current step and only the current step. A side panel showing every step is the fallback for seeing the plan and pivoting away from it.
  - The gap check at the end of a plan is offered only when there are open items.
  - The library supplies steps: anything that takes steps can get them from it through a request.

**Revision 9 (2026-11-24): Phase 0 done.** Miguel asked for Phase 0 to be performed and the result merged. Status changes only; no product decision was made. Phase 0 was built on a branch in parallel with the Revision 8 merge and then merged with it, so this note describes the combined state.
- The identifier rename is finished: `resolveFocus`, the card's `resolve` event, and in ThinkPad `canResolve`, `handleResolve`, `confirmResolve`, `resolveDialog`. The stored ThinkPad field `completedAt` keeps its name on purpose, since renaming it would need a data migration for no visible gain.
- D1 was fixed by the workflows build. D2 was fixed by the open-item gate. D3, D4 and D5 are fixed here.
- The README describes the product. The Rep-it-era docs, including `PRODUCT_IDEATION_CONTEXT.md` (already marked historical in Revision 8), are in `docs/archive/`. The unused Font Awesome dependency and audio files are gone.
- Correction: §3.4 said Font Awesome shipped in the bundle. It did not (nothing imported it), so removing it did not shrink the build.
- The runner's stack still labelled a resolved context "Completed"; it now says "Resolved". D10 (a deprecated Vuetify prop on `/workflows`) is fixed.
- New defect D9 logged. The phase-order question is open in §6.

**Revision 21 (2026-11-24): connections are snapshots; whole-draft synthesis replaces.** Settled by Miguel after the manual run:
- **A whole-draft synthesis resolves by replacing the text.** The root ends as its thesis; the raw material is archived in the synthesis thread.
- **A connection keeps a snapshot of the text it drew on, and does not change when that text changes.** His words: "A connection is a product of its context and time, and it must keep track of that context, even if that context changes." A later refinement of a source passage is a later move, not a correction the connection must follow. This settles the run's second break: quotes and connections hold their original text and draft version; only the pointer to the source's current location follows it, so the app can notice change.
- **Change is a prompt for reflection, not an error.** When a connection draws on text that was later refined, the app says so ("drawn from text that was later refined"), without blocking anything.
- **A connection need not argue.** It can simply be an insight, such as a proposed generalization, which may still hold as things change around it. The alert's wording must not imply the connection is now wrong.

**Revision 20 (2026-11-24): manual run of the revised synthesis model.** At Miguel's request the four recommended defaults in question 15 were walked through a five-day research session on a phone, as if built (`reports/Mindstream synthesis model manual run.md`). Two breaks were found: replacing a passage strands open threads anchored inside it, and "references follow into resolution" makes a thesis's evidence point at itself. Three gaps were also found: no cheap in-document link, no whole-draft gesture, and no visible answer for a pad. The run also reverses one review recommendation (keep each move's landing as a default). Question 15's defaults stand with these amendments; nothing is decided.

**Revision 19 (2026-11-24): adversarial review of the core model.** At Miguel's request a separate agent stress-tested Revisions 17 and 18 and the "four mechanics" proposal. Its report is in `reports/Mindstream core model adversarial review.md`; its cited repo facts were checked. Question 15 was rewritten around what survived. Nothing in it is decided.

**Revision 18 (2026-11-24): theme and thesis.** Settled by Miguel:
- **A theme** is a collection of text that represents a pattern: a connection shown repeatedly through a text, which is evidence that an idea is true and should be considered. A passage can serve several themes; redundancy is allowed, and themes let ideas persist on the document without blocking resolution.
- **A thesis** is an argument, made stronger by established themes and other evidence. It is what resolves upward and answers a question or makes a decision, carrying its evidence with it while you work at the higher level.

Miguel then asked whether producing a thesis is the point of the document, and whether the intellectual moves (doubt, challenge, connect, converge, synthesize) should collapse into one general structure, with the differences expressed as explicit, reusable workflows. The proposal is §6 question 15. The Arrange proposal (question 14) is on hold until that is answered.

**Revision 17 (2026-11-24): what a connection is.** Settled by Miguel: "A connection is a thought represented as text that references two or more different spans in the document." Because it connects, it does not replace the passages it references; it adds new content to the document, treated like any other idea or feeling, and like any text it can resolve an open item (for example, a doubt that two paragraphs answer together but neither does alone). This replaces the earlier proposal of Converge as a replacing move and Connect as a typed record; relation words such as "supports" or "contradicts" are dropped, since the sentence says it (capture-templates decision 11: a type exists only if the app treats it differently).

Miguel also named the cost: a connection has to sit somewhere in the sequence of a document that follows the order you dumped your thoughts, so it reads as a fragment. Supporting connections therefore needs a way to reorganize the document so understanding becomes thematic rather than scattered. Today moving text exists in the domain (`reorderBlock`) but is reachable only by selecting exactly one whole paragraph in Reflect, one step at a time. The proposal is §6 question 14.

**Revision 16 (2026-11-24): Reflect is a state, built.** The pill switches between Writing and Reflect. Entering Reflect freezes the draft and records a version when the text changed; going back to Write applies waiting results first, opens the study beat, and asks to settle overlapping results before it can. Write more is gone. Because the document is living again, drilled and hidden passages are re-found by their words on every edit; a passage whose words are gone is marked lost and is no longer painted. A thread resolving into a parent that is being written splices straight in. Verified in the browser (versions, applied results, edits in front of a drilled passage, overlap blocking Write, a hidden passage staying on its words after an edit). Still to do from the mobile list: the phone layout pass, then citations, then converging (question 13, awaiting Miguel).

**Revision 15 (2026-11-24): the Reflect mechanics and citing, approved; a new gap.** Miguel approved the recommendations for §6 questions 9 to 12 ("go ahead with those recommendations"):
- Leaving Reflect applies waiting results first (then the study beat), so writing always resumes on the newest draft.
- A draft version is recorded each time you enter Reflect.
- Write more is removed; going back to writing replaces it.
- Citing is both: attaching a link to a passage is a plain document action; "this needs a source" is a move, an open item until a link is attached or the item is decided. Pasted URLs become links; links are stored as Markdown-style text.

He also named a gap: **converging, comparing and connecting passages** ("absolutely critical in order to resolve thoughts and ideas on the document upwards"). Today every move, thread and result is tied to one continuous passage, so two passages cannot be worked into one understanding, and one passage cannot be marked as bearing on another. The proposal is §6 question 13.

**Revision 14 (2026-11-24): mobile-first as a design constraint, Reflect as a state, citations.** Settled by Miguel, prompted by walking through a research scenario ("how do I build an effective workout program?", gathered from YouTube over several days):
- **Mobile-first is a scope discipline, not a platform switch.** His words: "if it works on mobile, then it most certainly will work on desktop, because it's proven itself on a very limited surface." Every feature must work by touch on a phone screen, and that limit is what keeps the feature set small. Desktop stays supported. The earlier "no mobile layout" exclusion in §5 is withdrawn.
- **Freezing is not a first-class move; it is the state of being in Reflect.** A document is living and understanding evolves as you gather more; stamping it at one point "isn't a good model of how people really think." Reflect freezes the draft so you are not tempted to add to it while focusing on your thoughts; leaving Reflect returns to a living document. This supersedes the one-way stamp in `stream-reflect-lifecycle.md` §6 and Revision 11's "Write more is append-only, for now".
- **Citations and links are supported.** Pasting a link, or putting a link over a span of text, keeps track of what is external to the document. Miguel left open whether citing is an intellectual move or an action the document supports.

The mechanics of the Reflect change and the shape of citing are proposed in §6 questions 9 to 12, not yet decided.

**Revision 13 (2026-11-24): Phase 1 done.** Every Phase 1 item is built and its exit test passed in the browser, so it lands on `master` under Miguel's standing instruction (Revision 11). What changed for the person using ThinkPad:
- **Write more** (G4): an append-only way back to writing from Reflect.
- **Sub-pads list their own threads** (G6) at any depth, with Continue / Reopen.
- **Threads show their state**: open, ready to resolve, or resolved; the thread chip counts the open ones, and Back from an unresolved thread with work says where it went.
- **Study beat** (G7): after Next Draft, a card asks whether the gap to the goal narrowed and lists what changed, before → after.
- **Overlapping results** (D6) are settled in a dialog before the next draft.
- **Fixes**: D2 (why Resolve is disabled), D11 (a drag drilled the whole block), D12 (Next Draft stayed after running), D13 (the paragraph list fell out of step after Next Draft), and resolved threads now show as resolved.

**Revision 12 (2026-11-24): Write more built.** G4 is fixed, append-only as settled in Revision 11. Two pre-existing defects found while verifying it, D11 and D12, are logged in §3.3.

**Revision 11 (2026-11-24): three answers from Miguel.**
- **"Write more" is append-only, for now.** His words: "Write more is append only for now. In a way." Going back to writing adds a new piece of text after the frozen draft; it never reopens the frozen text for editing. "For now" means this can be revisited.
- **The phase order was not deliberate.** The gate and the bridges were built ahead of Phase 1 by circumstance, not by a decision to reorder. Miguel left the order to judgement; Phase 1 continues as written.
- **Every finished phase lands on `master`.** Standing instruction: when a phase's exit test passes, merge it to `master` without asking again.

**Revision 10 (2026-11-24): Phase 1 started.** Miguel said "merge and proceed" without answering the phase-order question, so Phase 1 is being taken in its written order. G6 is fixed: a sub-pad at any depth lists its own threads and shows Continue / Reopen, through a pure `drillThreadsAt`. D7 was checked in the browser and not reproduced. The "Write more" escape hatch (G4) is waiting on a decision, because this doc and `stream-reflect-lifecycle.md` §6 describe it differently (§6 question 8).

**How this was assessed:** read every design doc and all non-test source, ran `vitest` and `vite build`, and drove both tools in a real browser (stream, reflect, drill two levels, complete, next draft, Focus decompose, reload).

---

## 1. The identity, in one paragraph

Mindstream is a **thinking workspace**: a suite of tools that help you process and refine your thoughts until you can answer a question, make a decision, or name the next small thing to do. Its bias is toward **small actionable steps as the way to finish big, lofty things**. Each tool does a different job on the same material:

- **ThinkPad** is where you get out the thoughts that stand between you and the next decision, and refine them.
- **The runner** is where you work through a workflow one step at a time to carry out an action, whether that is an intellectual move (doubt this claim), a thinking pattern, or a practice that moves a goal forward.
- **Other tools** may join the suite later.

The tools are independent. You can sit down in the runner and iterate on something you are trying to get done without ever opening a ThinkPad. What makes them a suite is two things they share. The first is the message type: **text that stands for a thought** (a claim, a doubt, a question, a feeling, an intention, an action). Any tool can accept such text from another tool and send text back. The second is the principle each tool leans into in its own way, because it is how something overwhelming becomes approachable:

```
resolve(thing):
  small enough -> write the answer / do the step
  too big      -> open a smaller piece of it, resolve that, fold the result back up
```

Everything in the roadmap is judged by two questions: does it help a big thing become a next small step, and does its result get back to the thought that started it?

---

## 2. What exists today

| Area | State | Evidence |
|---|---|---|
| **ThinkPad: stream / reflect phases** | Working. Stamp freezes the draft, block chips appear, drafts are versioned and navigable. | `stampDraft`, `advanceToNextDraft`, `DraftPhaseBar.vue` |
| **ThinkPad: recursive drill** | Working to arbitrary depth, with breadcrumb, goal line and parent peek. | `drillIntoSpan`, `surfaceThreadId`, drill bar in `ThinkPadPage.vue` |
| **ThinkPad: fold-up** | Working. Completing a one-block sub-pad stages its text against the parent; "Next Draft" splices it in. | `resolveThreadIntoParent`, `revealReflectPass` |
| **ThinkPad: closing the loop** | *(Revision 13; Revision 16 replaced Write more with a Write ⇄ Reflect switch)* Write more (append-only) from Reflect; every sub-pad lists its own threads with their state (open, ready to resolve, resolved); a notice when Back leaves a thread open; overlapping results settled before Next Draft; a study beat after it. | `addWriteMore`, `drillThreadsAt`, `stagedConflicts`, `WriteMoreCard.vue`, `StudyBeatCard.vue` |
| **ThinkPad: persistence** | Working. IndexedDB, survives reload, document picker and "pick up where you left off" grid. | `padsDb.js`, `padPersistenceMapper.js` |
| **Focus runner** | *(Revision 8)* Persists to its own IndexedDB (contexts, stacks, parked state, `waitingOn`, time spent). A focus can hold an ordered **plan** of steps: done per step, out of order allowed, switch steps from the side panel, the card shows the current step only. Decision steps finish by choosing an output. Resolve never prompts; Reflect is an opt-in button per step. | `sessionRunStore.js`, `focusDb.js`, `ContextTrail.vue` |
| **ThinkPad: open-item gate** | *(Revision 8)* Built (Phase 2's first item): open items, the three decisions, open counts in the breadcrumb, Resolve refused while any item is undecided. | `openItems`, `disposeOpenItem`, `OpenItemsDialog.vue` |
| **Handoff (the §4.2 message)** | *(Revision 8)* Built as a store plus a registry, not yet a shell: requests, replies, `want` verbs, opaque `tag`, persisted pending requests. The URL carries only the request id. | `src/handoff/` |
| **Bridges** | *(Revision 8)* ThinkPad → runner ("Focus on this", `step-through`). Runner → ThinkPad ("Think it through", `think`): a pad opens with a side column for the steps to send back. Runner ↔ library (`choose-steps`, `keep`). | `useFocusHandoff.js` (both tools), `useDecomposeHandoff.js`, `DecomposeHandoffPanel.vue` |
| **Workflow library** | *(Revision 8)* Its own page (`/workflows`): library, editor (calls with options), picker. Workflows carry a version; runs carry `id@vN` as their tag. The five starter workflows from `GENERIC_PROBLEM_SOLVING_WORKFLOWS.md` seed once. | `src/workflows/` |
| **Domain quality** | Strong. Pure reducers, injected clock and ids, 490 passing tests (Revision 13). | `thinkPadModel.js` and its test files |
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

**G3. The runner's fold-up loses results.** Each tool decomposing in its own way is by design (Revision 4). The defect is narrower: completing a sub-focus overwrites a single `result` string on the parent, so a second child's takeaway erases the first.

**G4. Reflect is a one-way door.** *Fixed in Revision 12: Write more, append-only.* `resolveThreadIntoParent` in the store force-stamps the parent, and `restreamDraft` / `restreamFromDraftHistory` exist in the domain but are not wired to any UI. Once a pad is in Reflect there is no way to write freely in it again. The lifecycle doc says the escape hatch must exist ("never trapped"); the build has the trap without the hatch.

**G5. Designed vocabulary, undelivered.** `moves.js` defines nine moves in four families with prompts, write-back modes and intent mappings. The UI exposes three tags (Question, Expand, Flag), and the tag does not change what happens next: every tag opens the same blank sub-pad. The move's driving question, the thing that would make a drill *guided*, never reaches the screen. *The capture-templates proposal answers this with workflows of prompted steps, offered as shortcuts from the tags.* Likewise unwired: pins (`captureIdea`, `performMoveOnIdea`), the intent detector (does not exist), `promoteWithinPad` (no component emits `extract-step`), `resumeHint`, and the timebox config.

**G6. Recursion is asymmetric below the root.** *Fixed in Revision 10 for the thread list and Continue / Reopen; the root is still special in the model (see below).* `drillThreads` is only computed at the root (`useThinkPadSurface.js:40`), so the thread list and "Continue / Reopen" affordances do not appear inside a sub-pad. The root is also special in the model (`pad.doc` vs `thread.doc`), which is why a reframe cannot rewrite the root's goal. The contract already names root-as-frame as the fix.

**G7. Fold-up is harder to see than it should be.** *Fixed in Revision 13 by the study beat.* Completing a child returns you to the parent with a badge and a "Next Draft" button. The moment the product exists for, the mess being replaced by the result, happens one click later and without a before/after. The "study beat" from the lifecycle doc is not built.

### 3.3 Defects found

| # | Defect | Where | Status |
|---|---|---|---|
| D1 | 2 failing tests. They assert the pre-`b0fa956` behaviour (no `resolved` field; root complete stays on the context). | `focus/model/session.test.js`, `focus/store/sessionRunStore.test.js` | Fixed by the workflows build (Revision 8). |
| D2 | "Complete" is enabled on an empty sub-pad and silently does nothing. | `canComplete` in `useThinkPadSurface.js` vs the empty-text guard in `padStore.resolveThreadIntoParent` | Fixed by the open-item gate: `canResolve` refuses empty text, so the button is disabled. No tooltip says why. |
| D3 | Stray `<ThinkPadAppBar />` in the page template; Vue warns "Failed to resolve component" on every render. | `ThinkPadPage.vue:81` | Fixed (Phase 0). |
| D4 | `<router-view>` directly inside a transition; Vue Router warns and the fade does not apply. | `App.vue` | Fixed (Phase 0): the transition wraps the routed component. |
| D5 | Placeholder says "Right-click highlighted text to make a move"; there is no right-click handler. | `ThinkPadPanel.vue:178` | Fixed (Phase 0): the placeholder now points to Begin Reflect, where moves are available. |
| D6 | Overlapping staged moves are not detected at reveal (the lifecycle doc requires blocking). | `revealReflectPass` | Fixed (Revision 13): Next Draft becomes "Resolve overlap"; keep one result per group. Merging by hand is not offered. |
| D7 | In the automated run, a single click on a block in Reflect descended immediately instead of only showing the chips. Not reproduced by hand; worth a manual check. | block click routing in `ThinkPadPanel.vue` | Not reproduced (Revision 10): a single click on a word or a block in Reflect stays on the level. Closed unless it recurs. |
| D8 | Focus timer resets on every action and is display-only; time spent is never recorded. | `FocusRunnerPage.vue` | Fixed by the workflows build (Revision 8): time spent is recorded per focus. |
| D9 | `snapshot.json` is a browser devtools dump of an old Rep-it graph, not valid JSON, and imported by nothing. | `src/thinkpad/domain/snapshot.json` | Open. Likely safe to delete; confirm it is not wanted as a reference. |
| D10 | Vuetify warns that `dense` is deprecated on every visit to `/workflows`. | `WorkflowLibrary.vue` | Fixed (Revision 9): `density="comfortable"`. |
| D11 | Dragging across a few words inside a block in Reflect drills the whole block: the thread's title and anchor are the full sentence, and its result replaces the full sentence. Seen in automated browser runs (mouse drag); not yet checked by hand. Whether a drag should select words or the block is a design point. | block selection in `ThinkPadPanel.vue` (candidate-span handling) | Fixed (Revision 13): a click that ends a drag no longer widens the selection to the block. Dragging selects words; a whole block is acted on through its chips. |
| D12 | "Next Draft" stays in the Reflect pill after it has run (e.g. "Draft 2 / 2 · Next Draft"). Seen in automated browser runs, with and without Write more; cause not traced. | `DraftPhaseBar.vue` (`stagedCount`), `advanceToNextDraft` | Fixed (Revision 13): the button's infinite pulse kept Vue's `<Transition>` waiting; it now waits on the fade only. |
| D13 | After Next Draft, `doc.ideas` and `frozenIdeas` kept the previous draft while `text` showed the new one, although ideas are the source of truth. Anything rebuilding text from ideas undid the reveal; Write more did. Found by the Phase 1 exit test. | `advanceToNextDraft` | Fixed (Revision 13): both lists are reconciled from the revealed text, ids kept. |

### 3.4 Hygiene

*Revision 9: the first and third items below are resolved (README rewritten, Rep-it docs archived, `FRONTEND_PATHS.md` corrected, Font Awesome and the audio files removed). The bundle claim was wrong: Font Awesome was never imported, so only the Material Design Icons font ships. Naming is partly resolved: both tools now say Resolve.*

- **Docs describe three different products.** `README.md` is the Vite template. `PRODUCT_AGENT_CONTEXT.md` describes "Rep-it", a workflow-step session app, and points at files that no longer exist. `FRONTEND_PATHS.md` says `/` redirects to `/thinkpad` and lists a `src/workflow/` module; the app has a Home launcher and no workflow module. Since these docs are fed to agents as context, the drift costs real work.
- **Naming is unsettled.** Threads are called frames, threads, drills and sub-pads; pads are also contexts and documents; "focus" means both a ThinkPad drill (older docs) and the Focus tool.
- **Bundle.** 708 kB JS and 677 kB CSS, with both Material Design Icons and Font Awesome shipped; Font Awesome and the two audio files appear unused.

---

## 4. Product identity to commit to

**Statement.** Mindstream is a thinking workspace that turns big, unclear things into small actions you can take. You bring a goal, a question or a mess. The tools help you get it out, break it down, work a method on the hard parts, and come back with an answer, a decision or a next step. Whatever a tool produces returns to the thought that asked for it.

**Rules that follow from it.** Use these to accept or reject features and new tools.

0. **Text is the interface.** Every tool consumes a piece of text that stands for a thought and returns text anchored to it. A span is a workable thing, not decoration on a document. A feature that needs its own non-text input format is suspect.
1. **One principle, independent tools, one workspace.** Every tool breaks something daunting into pieces small enough to act on, and folds results back up. Each tool implements that in the way that suits its job, with its own state and its own model. They are coupled by the principle, the message type and the workspace shell that hosts them, never by shared data or by naming each other.
2. **Convergence is the gate.** Nothing ascends unresolved: one block, and no open items left undecided (the proposal's open-item gate). Abandoning is allowed but is a visible, named act.
3. **Fold the result, archive the process.** The parent only ever receives the chunk. The path that produced it stays re-openable.
4. **One level in view.** At any moment you see one node, its goal, and a cue to where you are. Never a two-pane parent and child.
5. **The app guides, you execute.** The app asks the next question or shows the next step of a workflow. It never generates the answer.
6. **Results come home.** However many levels a move descends, and however many tools it passes through, its result lands at the span or step that asked for it. Between tools this is done by a reply address carried on the message, not by shared data.
7. **Every session can end in a next small action.** Wherever you stop, the workspace can tell you the one next step. A tool that leaves you with a bigger pile than you brought is working against the product.

**What it is not** (for this horizon): a note vault, an outliner you browse, a general to-do list, a team tool, or an AI writer.

### 4.1 The tool contract

A suite needs a rule for what counts as a tool, or it becomes a pile of features. A Mindstream tool:

1. **Stands alone.** It is useful opened cold, with a blank prompt, and never requires another tool to be present.
2. **Owns its state.** Its own store, its own model, its own persistence. No tool reads or writes another tool's data.
3. **Speaks text through the shell.** It registers what it accepts and marks which of its text items can be sent. That is its entire surface to the rest of the suite. It never names another tool.
4. **Replies to what it was asked.** If it was opened by a request, finishing sends a reply to the sender. A request is never left silently unanswered: it ends resolved, as a sharper question, or abandoned.
5. **Ends in something smaller.** An answer, a decision, a sharper question, or a next step.

Against this contract today: both tools meet 1 and 5. ThinkPad meets 2. The runner does not persist, so it only half meets 2. Neither meets 3 or 4, because the broker does not exist yet.

### 4.2 The message

A sketch, to be hardened when built. The rule for anything added here: a tool that has never heard of the sender must be able to make sense of it. Only two shapes pass: **text**, and **an ordered list of text**.

```js
Message = {
  id,
  kind: "request" | "reply",
  text,            // the subject: the thought, claim, step or action to work on
  context: [],     // optional lines of surrounding context, outermost first (e.g. parent prompts)
  steps: [],       // optional ordered prompts to work through; each { prompt, produces: "text" | "action" }
  want: null,      // optional neutral verb from the shell's short list, e.g. "think", "step-through"
  replyTo: null,   // { tool, ref } set by the sender; opaque to the receiver
  tag: null,       // opaque to the receiver, handed back on the reply (e.g. workflow id + version)
  // replies only:
  inReplyTo: id,
  outcome: "resolved" | "question" | "abandoned",
  notes: [],       // optional plain lines that qualify the result
}
```

- **Content, not labels.** When you run a workflow on a claim, the request carries the workflow's prompts in `steps`. The receiver does not look anything up and does not interpret a name or a type. Its behaviour follows from the message's shape: with `steps`, a tool that can step through prompts does so; without, it treats the text as a single thing to work on.
- **The broker is a dumb pipe.** It matches a request against what tools registered (accepts text; accepts steps; serves which `want` verbs), shows a picker when more than one fits, routes, and brings the reply home. It never expands, translates or classifies.
- **`want` is not a move.** It is a neutral verb owned by the shell, kept to a handful. ThinkPad's words (doubt, claim, question, the tags) never go on the wire.
- **`tag` and `ref` are opaque.** `ref` means something only to the sender: an annotation id in ThinkPad, a frame id in the runner. `tag` lets the sender recognise what was run, for comparing runs later. The receiver stores both and hands them back untouched.
- **`notes` are plain lines.** If you went ahead with something unchecked, that line comes back with the result. ThinkPad shows notes as caveats under the span; another tool may show them differently.
- **`produces`** is what lets a tool decide whether it can take a set of steps: ThinkPad takes them only if every step produces text; the runner takes any.
- The sender keeps a **pending request** at its origin, shown as an open item, until the reply arrives.
- Requests nest. A ThinkPad span sends to the runner; a runner step sends to a new ThinkPad pad; each reply unwinds one hop.

**The irreducible coupling.** Something must know that "Doubt" means a particular set of prompts. That knowledge lives in the workflow library as data, owned by neither tool, and it travels in the message. What both tools must agree on is only the shape "an ordered list of prompts".

**The two examples Miguel gave, as messages:**

| Action | Request | Reply |
|---|---|---|
| Run the Doubt workflow on a claim in ThinkPad | `text`: the claim. `steps`: Doubt's prompts, read from the library by ThinkPad. `tag`: doubt, v3. `replyTo`: ThinkPad, the span's annotation. The runner opens on the claim at step 1 of 4. | `text`: the call. `notes`: anything accepted unchecked. ThinkPad places the call at the span through the existing splice and lists the notes beneath it. |
| A runner decompose step offers "Think this through" | `text`: the step's prompt. `context`: the parent prompts. `want`: "think". `replyTo`: runner, the frame. ThinkPad opens a pad titled with the prompt. | `text`: the pad's resolved text. The runner records it as the step's result. |

### 4.3 The workspace shell

The shell is the one shared thing. It is what makes separate tools feel like one workspace, and it is the only place that knows which tools exist.

- **Layout.** You open the tools you need and arrange them. Several can be up at once. This builds on the existing, not yet deployed, multi-tool layout work.
- **Registry.** Each tool registers what it accepts: text, steps (and whether action steps are allowed), and which `want` verbs it serves. Nothing else is needed for a new tool to become a destination everywhere.
- **Workflow library.** Workflows are a workspace thing, not a ThinkPad or runner construct. The library has its own page where you browse, edit and create them, and any tool can read from it. A workflow is an ordered list of prompts, each marked as producing text or an action.
- **"Send to…" on every text item.** One uniform action, built by the shell from the registry at the moment you open it. This is how a decompose step can offer ThinkPad without knowing ThinkPad exists. A tool may promote one option to a button where it is the obvious next move ("Think this through" on a decompose step); the button names a neutral `want` verb, and the registry resolves it to a tool.
- **Two kinds of hand-off.**
  - **Ask:** send text and expect a result back. The result returns to whatever asked, like a function returning to its caller. You never pick a destination by hand. This is the `request` / `reply` pair in §4.2.
  - **Send:** one-way. The text lands in the receiving tool and nothing comes back. This is a `request` with `replyTo: null`.
- **The shelf.** A workspace-level tray of text items that any tool can drop onto and pull from. It is the visible common space, it gives a one-way Send somewhere to land when no tool is the obvious target, and it is where a reply waits if its origin is gone. Tools still share no data; the shelf belongs to the shell. *(Confirmed by Miguel.)*
- **Routing and placement.** When an Ask opens another tool, the shell opens it beside the asker if there is room and in its place if not, and draws the link between them: which item asked, and where the answer will go.

One caution carried over from `recursive-resolve-contract.md` (rule 2 there): a permanent parent-and-child split divides attention. Side-by-side tools are fine when they are doing different jobs. When one tool is working on a piece of what the other is showing, dim or collapse the asker to its one relevant item so there is still a single place to look.

**Each tool has one job.** ThinkPad is a document: it holds the context of your thinking and lets you work on any part of it. The runner is a stepper: one thing in view, and what comes next. Neither grows the other's mode. If a pad's content needs stepping through, it is sent to the runner; if a step needs room to think, it is sent to ThinkPad.

**Future tools** are not planned here; the contract is the test for them. Anything that stands alone and speaks text through the broker can join without the existing tools changing.

**Vocabulary.** Each tool keeps the words that suit its job; only the words that cross between tools need to be shared.

| Scope | Concept | Word | Retire |
|---|---|---|---|
| Shared | What tools exchange | **text** (a message) | payload, import blob |
| Shared | Asking another tool to work on text | **request** / **reply** | |
| Shared | Something started and not yet settled | **open item** | |
| Shared | A method made of prompted steps | **workflow**; one execution is a **run** | template, session |
| ThinkPad | Top-level unit | **pad** | context, document |
| ThinkPad | A nested piece of a pad | **thread** | frame, drill (as a noun), sub-pad |
| ThinkPad | Going down | **drill** | focus (ThinkPad sense) |
| Runner | Top-level unit | **context** | |
| Runner | One unit of attention | **focus** | frame (in UI) |
| Runner | Going down | **decompose** | drill |

**Naming, settled:** the act of finishing a level is **Resolve**, and what comes back is a **resolution**. A resolution means you reached understanding, even with room for doubt. `master`'s rename of "Resolve up" to "Complete" (commits `fa086a9`, `a823faf`) has been reverted in both tools (ThinkPad with the gate, the runner in Phase 0). The stored field `completedAt` keeps its name, since renaming it would need a data migration for no user-visible gain.

---

## 5. Roadmap

Sized for one developer. Phases are ordered so each one makes the identity more true and leaves the app usable. Each has an exit test you can perform by hand.

### Phase 0 — Make the ground true (about 2 days) — done (Revision 9)

Nothing here changes behaviour; it stops the repo from misdescribing itself.

- Fix D1 to D5. For D2, disable the action on an empty sub-pad and say why in the tooltip.
- Revert the "Complete" rename to "Resolve" in both tools (UI labels, `completeFocus`, `canComplete`, tests). D1's failing tests get rewritten as part of this.
- Replace `README.md` with the identity statement from §4, the two routes, and how to run and test.
- Mark `PRODUCT_AGENT_CONTEXT.md`, `PRODUCT_IDEATION_CONTEXT.md`, `TRIAGE_IDEATION_CONTEXT.md`, `GRAPH_STATUS_AGENT_CONTEXT.md` and `feature-science-map.md` §3 as historical, or move them to `docs/archive/`. Correct `FRONTEND_PATHS.md`.
- Remove Font Awesome and the unused audio assets if confirmed unused.

*Done. All items shipped. D1 was fixed by the workflows build and D2 by the gate, though the tooltip saying why the button is disabled was not added; it is small and left for Phase 1. The README was rewritten rather than given the full §4 rules, which stay here. Verified before the merge with Revision 8: the browser console showed no warnings on `/`, `/thinkpad` or `/focus`, and the same check run against the code before the fixes showed the router warning on all three and the `ThinkPadAppBar` warning on `/thinkpad`. Verified after the merge: 457 tests pass, the build succeeds, the console shows no warnings on `/`, `/thinkpad`, `/focus` or `/workflows`, and creating and resolving a focus in the runner works, with "Resolved" on the card and in the stack. The merge also fixed D10 and the stack's "Completed" label.*

**Exit test:** `npm test` is green, the browser console is clean on both routes, and a fresh agent session given only `README.md` and this doc describes the product correctly.

### Phase 1 — Close the ThinkPad loop (about 1 to 2 weeks) — done (Revision 13)

Make the existing recursion complete and trustworthy before extending it.

- **Escape hatch (G4).** *Done (Revision 12).* Verified in the browser: added text appears after the frozen draft as workable paragraphs, the draft count goes up, a staged result still lands at Next Draft, half-written text survives a reload, Cancel and a blank addition change nothing. The force-stamp below is now reachable only after branching from an old draft; left as is. A named "Write more" action in the phase bar opens an empty writing area after the frozen draft; adding it makes a new draft version recorded as a stream pass. The frozen text is never reopened for editing. Stop `resolveThreadIntoParent` from force-stamping a parent that is still in Stream; either stage without freezing, or ask.
- **Symmetric recursion (G6).** *Done (Revision 10), except the root-as-thread unification, which did not fall out cheaply.* Compute `drillThreads` for the current surface at any depth so every sub-pad shows its own threads and Continue / Reopen. Take the root-as-thread unification from the contract (§13.3) only if it falls out cheaply.
- **Make the fold-up the moment (G7).** *Done (Revision 13).* After "Next Draft", show a short before/after of each replaced span, then the whole new draft. This is the study beat. Keep it skippable.
- **Open-thread hygiene.** *Done (Revision 13).* On the parent, mark threads as open, converged-not-completed, or completed. On Back from a thread with content, say it is being left open. Contract rule 6 calls unclosed drills "worse than no feature".
- **Reveal conflicts (D6).** *Done (Revision 13).* Block the reveal when two staged results overlap and let you pick.
- Check D7 by hand and fix if real. *Done (Revision 10): not reproduced.*

*Exit test passed (Revision 13), scripted in a real browser: a question-titled pad, a dump, two levels of drilling, a reload in the middle that came back to the same sub-pad, Write more on the first level, a typed synthesis to resolve a multi-block level, a thread left and found again from the thread menu, and a one-paragraph root at the end with the study beat asking about the pad's question. No phase trapped the run and no console warnings. It was not done by hand by Miguel.*

**Exit test:** take a real problem from dump to a one-paragraph resolved root in one sitting, going at least two levels deep, without ever being stuck in a phase and without losing track of an open thread.

### Phase 2 — Spans become workable: the gate, then workflows (about 2 to 3 weeks)

This is the in-flight work, sequenced in the proposal's own build order (§12, steps 1 to 3). It is where "the app guides" becomes true for thinking (G5).

- **Open-item gate first.** *Done (commit `6cf989f`), built before Phase 1.* `openItems`, `disposeOpenItem`, `canResolve`, replacing `canComplete`, with the four decisions (address, accept as doubt, lift, park). It is pure-core, useful without workflows, and it also fixes D2. Show open counts in the breadcrumb.
- **Workflows come from the library.** Add the workspace workflow library and its page. A workflow is an ordered list of prompts, each marked text or action. Retire `escalatesTo` in `moves.js` as a fixed link.
- **Tags stay light.** Question, Expand and Flag still open a plain sub-pad. Each also offers shortcuts to workflows, but none is bound to a tag, because which method fits depends on context. Where the shortcuts come from (pinned, recent, or the whole library) is still open.
- **Running a workflow in ThinkPad** shows it as a document: the prompts as headings, one resolution under each. There is no step-by-step view here.
- **A step is the same primitive again.** Write it directly (base case) or slot a workflow into it (recursive case). Slotted workflows fold up into the step through `resolveThreadIntoParent`. No new fold-up mechanism.
- **Resolution: a call or a sharper question.** Honour write-back at the origin: a call sits beside or replaces the span; a sharper question replaces it and stays open.
- **Pins in the keystream.** One keystroke in Stream marks the current block (`captureIdea`). Pins are notes, not open items, which matches the proposal's §8.1.

Hold back until the loop is in daily use: variants and save-as-variant, records and citation, behavioural types beyond call and question.

**Exit test:** select a claim, start Doubt, slot a workflow into one step two levels down, and resolve everything. The claim in the root pad now carries the call, with any accepted doubt shown as a caveat. Resolve was refused at least once because of an undecided open item.

### Phase 3 — The shell and the first two bridges (about 3 to 4 weeks)

The identity phase. It resolves G1 and G2 and delivers both bridges Miguel described, with the tools still decoupled.

- **Runner stands alone first.** Give the runner its own persistence (its own IndexedDB store, mirroring `padsDb`), so contexts, stacks, parked state and `waitingOn` survive reload (G2). Keep every child result on the parent instead of overwriting (G3). Record time per focus (D8).
- **Land the layout.** Finish and deploy the existing multi-tool layout as the shell's first job, with ThinkPad and the runner as the two tools it hosts. Everything below plugs into it.
- **Registry and "Send to…".** Tools register what they accept; the shell renders one "Send to…" action on any text item a tool marks as sendable. Ship one-way Send first: it is the smallest end-to-end slice and proves the registry.
- **The shelf.** Build it alongside Send, as its default landing place.
- **The broker (Ask).** A small module in the shell: tools register what they receive and what they offer; `send(request)` routes and navigates; `reply(message)` routes back. Pending requests are persisted by the sender, so a hop survives a reload. Pure and node-testable, in the style of the existing domain code.
- **ThinkPad as sender and receiver.** Send: an action on a span creates a pending open item and a request. Receive a reply: place the text at the anchor with the existing tolerant splice. Receive a request: open a new pad titled with the text, context shown above it; resolving the pad sends the reply.
- **Runner as sender and receiver.** Receive a request: open a context whose root focus is the text, and, if the request carries `steps`, working through them in order. Resolving the root sends the reply. Send: the decompose composer offers "Think in ThinkPad" beside typing a sub-focus.
- **Where you are across hops.** A tool opened by an Ask shows what asked, from where, and "Send back". With both tools on screen, the shell highlights the asking item and dims the rest of that tool; in a single-tool layout the same information is a thin strip at the top.
- **Requests that do not come back cleanly.** Abandoning sends an `abandoned` reply so the origin's open item can be decided, not orphaned. If the origin span moved or was edited, the tolerant splice already handles relocation; if it was deleted, the reply goes to the shelf.

One consequence for the capture-templates proposal: it models a run as a thread inside ThinkPad. With decoupled tools, a run executed in the runner lives in the runner's state, and ThinkPad holds only the pending open item and, later, the result. The open-item gate still works unchanged, since a pending request is an open item.

**Exit test:** (a) In ThinkPad, start Doubt on a claim; it opens in the runner; one step needs thinking, so you send it to ThinkPad, resolve that pad, and land back on the step with its result; finish the run; the claim in the original pad carries the call. (b) Separately, open the runner cold, author a focus, decompose it twice, and finish, never touching ThinkPad. Reload at any point in either without losing your place.

### Phase 4 — Resume and the open-loop ledger (about 1 to 2 weeks)

With the broker in place, the workspace home can answer "what is my next small step?".

- **Home is the workspace.** Opening Mindstream restores the layout you left: the same tools, in the same arrangement, each at the same place. The launcher becomes the shell's "open a tool" control. Add a workspace-level view of open loops, which each tool reports for itself: open threads from ThinkPad; active and parked contexts from the runner; and requests still waiting on a reply. Each shows its one next step and opens in its own tool.
- **Resume lands you exactly where you were:** same pad, same thread, same phase. Set `resumeHint` on leave and show it on return.
- **Parked tasks resurface.** A parked task shows how long it has waited; un-parking returns to its exact depth.
- **Export.** One pad to Markdown, with the resolved root on top and archived threads nested below. For a personal local-only tool, this is also the backup.

**Exit test:** after a week away, Home tells you every unfinished thread and waiting task, and one click puts you back at the exact node.

### Phase 5 — Feel and speed (ongoing, after the loop is whole)

- Keyboard for the whole loop: descend, complete, back, peek, stamp, next draft, pin.
- The atmospheric contrast between Stream and Reflect from the lifecycle doc §8, including the transition.
- A tree overview of a pad (read-only map of what was resolved into what), shown on demand.
- Code-split the routes and trim the icon fonts.

### Phase status after Revision 8

- **Phase 2:** the open-item gate and the library page are built. Tag shortcuts, ThinkPad's form view, slots and pins are not.
- **Phase 3:** runner persistence, the registry, and both bridges are built over a store, without the shell's layout, "Send to…" or the shelf. G2 (runner forgets) and D8 (time not recorded) are fixed. G3 is fixed for plans (each step keeps its own result) but not for one-off sub-focuses.

### Backlog from the workflows build

Designed in the session that produced Revision 8, not built. Each item names the phase it belongs to.

1. **Notes as one shared tool (Phase 4).** One notes surface any layout hosts beside a tool, not a notes feature per tool. A note reuses ThinkPad's idea record: `text`, an optional one-line result that folds up, an optional type (question, doubt, call, idea…), a status (parked, active, resolved), and an anchor generalized to a runner step. Scoped to the current step with earlier notes collapsed, plus "Open in ThinkPad". It would replace the runner's inline step reflections (`stepResults`). Notes belong to the run, in the context where it happened, never to the workflow.
2. **Open items in the runner, and the gap check (Phase 4).** On resolving a step with open notes, offer: carry up, resolve, or drop. At the end of a plan, **only when open items exist**, show each step's result against the goal and a gap status: closed, narrowed, still open, reframed. Depends on 1. This is the runner's counterpart of ThinkPad's gate.
3. **ThinkPad receives steps (Phase 2).** ThinkPad registers `steps: "none"` today. It should take text-only steps and show them as a document (the form view), per Revision 6.
4. **Marking a call outside the library (Phase 3).** Only the workflow editor can mark a step as a call. The runner's decompose composer and ThinkPad's reply column cannot.
5. **A routine from inside the runner (Phase 3).** Start a new context from a workflow in the runner's "New context" dialog. Today it starts from the library's "Run as new context".
6. **The steps panel in every layout (Phase 5).** It shows only in the stack view and when the runner is at least 440px wide. The rail view and narrow layouts need another place for it.
7. **Editing a plan mid-run (Phase 3).** Add, drop, reorder or reword steps for this run only, as the proposal's §5.3 pivots describe. Today you can only switch steps.
8. **Re-entry cue (Phase 4).** Turn Stop's "waiting on" into a "next move" line, and show the last result, the next move and the open-item count on resume.
9. **Time across a hop (Phase 3).** Elapsed time is banked when the runner unmounts and the clock restarts on return. There is no pause rule.
10. **Active context across reload (Phase 4).** `activeContextId` is not persisted; after a reload you reselect the context before its waiting chip shows.
11. **A one-note "think" from a running step (Phase 3).** From a step, ask ThinkPad to think about one question and return one note to the step, not a list of steps.
12. **Picker when several tools serve a verb (Phase 3).** `toolsFor()` returns every match; the senders take the first. No verb has two servers yet.
13. **`produces: "action"` in the editor (Phase 2).** The field is stored and travels; the editor does not offer it yet.
14. **Empty pad left behind (hygiene).** Arriving in ThinkPad from a request can leave an empty pad, which is reused later.

### Explicitly not on this roadmap

- AI generation or agent execution. Rule 5. If revisited, an agent would join as one more tool behind the broker, receiving and replying in text like any other.
- Accounts, sync, sharing, onboarding. *(Mobile layout was here; withdrawn in Revision 14: mobile-first is now the design constraint.)*
- From the proposal, for now: variants, records and citation, and the "comes back later" behaviours (prediction checks, call reviews). They depend on the run loop being in daily use first.
- Multiple drills per span with AND/OR roll-up, and sibling re-validation after a fold-up. Real ideas, deferred in the contract, still deferred.

---

## 6. Sequencing rationale and risks

- **Why Phase 1 before the broker:** replies land in ThinkPad through the fold-up and reveal path. If that path still has a one-way phase and root-only thread lists, every cross-tool result inherits those defects.
- **Why the gate before the broker:** a pending request is an open item, so the gate from Phase 2 is what makes an unanswered request visible and decidable at its origin.
- **Why runner persistence before the broker:** a reply addressed to a runner frame that vanished on reload cannot be delivered. Each tool has to be durable on its own before messages between them can be.
- **Why Send before Ask:** one-way Send needs only the registry and the shelf. It proves the shell with almost no failure modes, and Ask then adds the reply path on top.
- **Risk: the shell becomes the product.** Layout, registry, shelf and routing are all infrastructure. Keep each one as small as the two existing tools need, and add nothing for a hypothetical third tool until it exists.
- **Largest risk: requests that never come home.** In a decoupled design nothing forces a reply. The contract's point 4, the `abandoned` outcome and the open-loop list on Home exist for this. Test the unhappy paths as carefully as the happy one.
- **Second risk: getting lost across hops.** Span to runner to pad to drill is four levels across two tools. The return strip has to make "what asked for this, and how do I send it back" answerable at a glance.
- **Third risk: ceremony.** Stamp, tag, choose workflow, hop, fill steps, decide open items, resolve, next draft. Keep the direct path one gesture long: typing the answer in place must always be available.
- **Accepted cost: the principle is implemented per tool.** ThinkPad and the runner each have their own decompose and fold-up. That is the price of independence and it is the right one here. Share pure helpers where it is free; do not share models.

### Questions for Miguel

Open:

1. *(Settled in Revision 11: not deliberate; Phase 1 continues as written.)*
2. **The layout work.** Phase 3's shell layout, "Send to…" and the shelf are not built. If the multi-tool layout exists on an unpushed branch, pushing it would let it be checked.
3. **Where tag shortcuts come from:** pinned per tag, recent use, or the library only. Open in the capture-templates proposal.
4. **The runner's Reflect button vs decision 17.** Revision 7 says reflection is not an app feature. In the session that produced Revision 8, Miguel asked for "reflection [as] an opt-in side button per step". It is built that way: never prompted, never required. Keep it, or replace it with a reflection step you put in a workflow?
5. **Typed synthesis vs "one block".** Rule 2 says nothing ascends unless it is one block. The ThinkPad work that was uncommitted on `master` added a dialog that lets a thread with several blocks resolve with a typed synthesis. The merge keeps it, after the open-item gate: every open item must be decided first. Keep it, or require convergence?
6. **Does a call branch?** Today a call (decision step) only gates progress: you choose, and the plan moves to its next undone step. Should an option be able to lead to different next steps?
7. **Library access rule (capture-templates §10.8).** Built as proposed: the runner never reads the library. It asks with `choose-steps`, the library page answers, and only the library page writes (`keep`). Confirm before it hardens.
8. *(Settled in Revision 11: append-only, for now.)*

9. *(Settled in Revision 15: leaving Reflect applies waiting results first.)*
10. *(Settled in Revision 15: a version is recorded on entering Reflect.)*
11. *(Settled in Revision 15: Write more is removed.)*
12. *(Settled in Revision 15: citing is both a document action and a "needs a source" move.)*
13. *(Settled in Revision 17: a connection is a thought written as text that references two or more passages; it adds to the document and never replaces what it references.)*
14. *(On hold, Revision 18: depends on question 15.)* **Rearranging the document by theme.** Proposed:
    - **Arrange, inside Reflect.** A view of the draft as one card per paragraph. Tap a card, then move it up, down, or under a theme. Wording stays frozen; only order and grouping change, and leaving Arrange records a version. Arranging is reflective work (seeing the whole), so it belongs to Reflect, and the study beat can offer it.
    - **Themes are headings you write.** A heading is a line of text ("Training variables", "My constraints") that the paragraphs after it sit under; it can be collapsed to see the document's shape. The name of a theme is itself a thought. A heading behaves differently from a paragraph (it groups and collapses), so it passes the behaviour test for a type.
    - **Where a new connection lands:** directly after the last passage it references, showing small marks for each passage it points to. From there you move it in Arrange. Its references survive moving because passages are found by their words (Revision 16).
    - **Not an outliner you browse.** Arrange works on one draft at a time and is temporary; it is not navigation across notes, so the "not an outliner" line holds.

15. **The core model for synthesis.** An adversarial review (`reports/Mindstream core model adversarial review.md`, Revision 19) rejected the first proposal ("four mechanics, every move a library workflow") on four verified points: it treats theme, connection and citation as one object although the app must treat them differently (decision 11); moving the moves into the library breaks "a tool stands alone" (contract 1, decision 16); "one thesis per level" conflicts with decision 9 ("a call or a sharper question") and rule 7, and the root has no gate (capture-templates §8.4); and it ignores that resolving a passage would silently break every reference to it, since a passage whose words are gone is marked lost (Revision 16). Revised proposal, smaller:
    - **Synthesis happens in a thread, with quotes.** Drill on a passage, several passages, or the whole draft. In the sub-pad, one new action: *quote a passage in* (a copy that keeps a link to where it came from). You write the synthesis in thematic order from the start; headings in the sub-pad are themes; quoting the same passage under two headings gives redundancy. The thread's resolution is the thesis (or call), its quotes are its evidence.
    - **Where a result lands follows from its anchors:** exactly one passage, you choose replace or add; two or more, it is added. The per-move `writeBack` in `moves.js` goes.
    - **References follow a passage into its resolution**, with provenance, instead of going lost.
    - **The moves stay built in** (one prompt each, ThinkPad stands alone); library workflows are for multi-step methods; tags stay shortcuts.
    - **A thesis is a name for a resolution that argues**, not a new mechanic; rule 2 reads "one resolution". Evidence travels as pointers ("3 sources"), opening the archived working-out, so rule 3 holds.
    - **Settled in Revision 21:** whole-draft synthesis replaces; quotes and connections are snapshots of their source text and draft version, with a non-blocking "later refined" notice. Still open: whether replacing requires deciding open threads anchored inside the replaced text (the run's first break, now certain to occur, since a whole-draft replace contains every open thread at the root); whether a thesis may resolve with sources that still have open threads; whether the link action may target a passage (which would make it a connection, with snapshot semantics).
    - **Amendments from the manual run (Revision 20):** replace is gated on open threads anchored inside the passage; quotes point at the draft version they came from and never "follow" (only live anchors and links do); each move keeps its landing as a default you can override; the link action can target a passage in the document; quotes show "still open" and "changed since quoted"; a "Synthesize" action opens a thread on the whole draft; a pad's resolved thesis is marked as its answer and shown first.
    - **Deferred** until a real document shows the need: Arrange (question 14), a Themes view, inline reference marks, multi-select in the stream.

Settled:

- **Mobile-first?** Revision 14: yes, as a design constraint.
- **The Reflect mechanics and citing?** Revision 15: as recommended.
- **What is a connection?** Revision 17: a thought as text referencing two or more passages; it adds, never replaces.
- **Theme and thesis?** Revision 18: a theme is a recurring pattern of text; a thesis is an argument derived from themes and evidence, and is what resolves up.
- **Is the draft frozen by a stamp?** Revision 14: no; frozen only while in Reflect.
- **View or import?** Revisions 4 and 5: tools own their state and exchange text through the workspace shell.
- **The shelf.** Revision 6: yes.
- **Resolve or Complete?** Revision 7: Resolve. Done in code in Revision 9.
- **Does every tag map to a workflow?** Revision 7: no. Tags offer shortcuts; none is bound.

---

## 7. Measures (for a tool with one user)

Count these from the data already stored; no analytics needed.

- **Resolved roots:** pads whose root reached a one-block converged state. The product's reason to exist.
- **Open-thread ratio:** threads left open with content, over threads created. Should fall after Phase 1.
- **Depth actually used:** distribution of max depth per pad. If it is always 1, recursion is not earning its place.
- **Requests that came home:** after Phase 3, share of cross-tool requests that ended resolved or as a sharper question, versus abandoned or still pending.
- **Sessions ending in a next step:** share of sessions where, on leaving, some thread or run has a named next step. This is the workspace-level measure.
- **Resume success:** after Phase 4, how often a return visit continues an existing thread instead of starting a new pad.
