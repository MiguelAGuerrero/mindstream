# Mindstream — Product Assessment and Roadmap

**Date:** 2026-11-23 (last revised 2026-11-24, Revision 8)
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

**Revision 8 (2026-11-24): Phase 0 done.** Miguel asked for Phase 0 to be performed. Status changes only; no product decision was made. The Focus runner now says Resolve throughout (button, dialog, badge, `resolveFocus`), which completes the Revision 7 rename. D1, D3, D4 and D5 are fixed, and D2 was already fixed by the open-item gate (`6cf989f`), which this doc had not recorded. The README describes the product, the Rep-it-era docs are in `docs/archive/`, `FRONTEND_PATHS.md` matches the tree, and the unused Font Awesome dependency and audio files are gone. §2, §3.3, §3.4 and Phase 0 were updated to match. One correction: §3.4 said Font Awesome shipped in the bundle; it did not (nothing imported it), so removing it did not shrink the build. New defect D9 logged. The order question (the gate was built before Phase 1) is open in §6.

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
| **ThinkPad: persistence** | Working. IndexedDB, survives reload, document picker and "pick up where you left off" grid. | `padsDb.js`, `padPersistenceMapper.js` |
| **ThinkPad: open-item gate** | Working (added after this assessment). A level cannot resolve while moves started there are undecided; each is addressed, accepted as a caveat, lifted or parked. Resolve shows the open count. | `openItems`, `canResolve` in `thinkPadModel.js`; `OpenItemsDialog.vue`; commit `6cf989f` |
| **Focus runner** | Working in memory only. Contexts, decompose stack, resolve with takeaway (at the root this marks the context resolved and moves to the next live one), park with "waiting on". | `sessionRunStore.js` |
| **Domain quality** | Strong. Pure reducers, injected clock and ids, 289 passing tests (Revision 8). | `thinkPadModel.js` and its test files |
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

**G4. Reflect is a one-way door.** `resolveThreadIntoParent` in the store force-stamps the parent, and `restreamDraft` / `restreamFromDraftHistory` exist in the domain but are not wired to any UI. Once a pad is in Reflect there is no way to write freely in it again. The lifecycle doc says the escape hatch must exist ("never trapped"); the build has the trap without the hatch.

**G5. Designed vocabulary, undelivered.** `moves.js` defines nine moves in four families with prompts, write-back modes and intent mappings. The UI exposes three tags (Question, Expand, Flag), and the tag does not change what happens next: every tag opens the same blank sub-pad. The move's driving question, the thing that would make a drill *guided*, never reaches the screen. *The capture-templates proposal answers this with workflows of prompted steps, offered as shortcuts from the tags.* Likewise unwired: pins (`captureIdea`, `performMoveOnIdea`), the intent detector (does not exist), `promoteWithinPad` (no component emits `extract-step`), `resumeHint`, and the timebox config.

**G6. Recursion is asymmetric below the root.** `drillThreads` is only computed at the root (`useThinkPadSurface.js:40`), so the thread list and "Continue / Reopen" affordances do not appear inside a sub-pad. The root is also special in the model (`pad.doc` vs `thread.doc`), which is why a reframe cannot rewrite the root's goal. The contract already names root-as-frame as the fix.

**G7. Fold-up is harder to see than it should be.** Completing a child returns you to the parent with a badge and a "Next Draft" button. The moment the product exists for, the mess being replaced by the result, happens one click later and without a before/after. The "study beat" from the lifecycle doc is not built.

### 3.3 Defects found

| # | Defect | Where | Status |
|---|---|---|---|
| D1 | 2 failing tests. They assert the pre-`b0fa956` behaviour (no `resolved` field; root complete stays on the context). | `focus/model/session.test.js`, `focus/store/sessionRunStore.test.js` | Fixed (Phase 0): rewritten to assert the current behaviour, plus a test for skipping parked and resolved contexts. |
| D2 | "Complete" is enabled on an empty sub-pad and silently does nothing. | `canComplete` in `useThinkPadSurface.js` vs the empty-text guard in `padStore.resolveThreadIntoParent` | Fixed by the open-item gate: `canResolve` refuses empty text, so the button is disabled. No tooltip says why. |
| D3 | Stray `<ThinkPadAppBar />` in the page template; Vue warns "Failed to resolve component" on every render. | `ThinkPadPage.vue:81` | Fixed (Phase 0). |
| D4 | `<router-view>` directly inside a transition; Vue Router warns and the fade does not apply. | `App.vue` | Fixed (Phase 0): the transition wraps the routed component. |
| D5 | Placeholder says "Right-click highlighted text to make a move"; there is no right-click handler. | `ThinkPadPanel.vue:178` | Fixed (Phase 0): the placeholder now points to Begin Reflect, where moves are available. |
| D6 | Overlapping staged moves are not detected at reveal (the lifecycle doc requires blocking). | `revealReflectPass` | Open (Phase 1). |
| D7 | In the automated run, a single click on a block in Reflect descended immediately instead of only showing the chips. Not reproduced by hand; worth a manual check. | block click routing in `ThinkPadPanel.vue` | Open (Phase 1). |
| D8 | Focus timer resets on every action and is display-only; time spent is never recorded. | `FocusRunnerPage.vue` | Open (Phase 3). |
| D9 | `snapshot.json` is a browser devtools dump of an old Rep-it graph, not valid JSON, and imported by nothing. | `src/thinkpad/domain/snapshot.json` | Open. Likely safe to delete; confirm it is not wanted as a reference. |

### 3.4 Hygiene

*Revision 8: the first and third items below are resolved (README rewritten, Rep-it docs archived, `FRONTEND_PATHS.md` corrected, Font Awesome and the audio files removed). The bundle claim was wrong: Font Awesome was never imported, so only the Material Design Icons font ships. Naming is partly resolved: both tools now say Resolve.*

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
7. **Every session can end in a next small action.** Wherever you stop, the workspace can tell you the one next step. A tool that leaves you with a bigger pile than you brought is working against the product.
6. **Results come home.** However many levels a move descends, and however many tools it passes through, its result lands at the span or step that asked for it. Between tools this is done by a reply address carried on the message, not by shared data.

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

### Phase 0 — Make the ground true (about 2 days) — done (Revision 8)

Nothing here changes behaviour; it stops the repo from misdescribing itself.

- Fix D1 to D5. For D2, disable the action on an empty sub-pad and say why in the tooltip.
- Revert the "Complete" rename to "Resolve" in both tools (UI labels, `completeFocus`, `canComplete`, tests). D1's failing tests get rewritten as part of this.
- Replace `README.md` with the identity statement from §4, the two routes, and how to run and test.
- Mark `PRODUCT_AGENT_CONTEXT.md`, `PRODUCT_IDEATION_CONTEXT.md`, `TRIAGE_IDEATION_CONTEXT.md`, `GRAPH_STATUS_AGENT_CONTEXT.md` and `feature-science-map.md` §3 as historical, or move them to `docs/archive/`. Correct `FRONTEND_PATHS.md`.
- Remove Font Awesome and the unused audio assets if confirmed unused.

*Done. All items shipped. D2 was fixed by the gate. The README was rewritten rather than given the full §4 rules, which stay here. Verified: 289 tests pass, the build succeeds, and the browser console showed no warnings on `/`, `/thinkpad` or `/focus`; the same check run against the code before the fixes showed the router warning on all three and the `ThinkPadAppBar` warning on `/thinkpad`.*

**Exit test:** `npm test` is green, the browser console is clean on both routes, and a fresh agent session given only `README.md` and this doc describes the product correctly.

### Phase 1 — Close the ThinkPad loop (about 1 to 2 weeks)

Make the existing recursion complete and trustworthy before extending it.

- **Escape hatch (G4).** Wire `restreamDraft` as a named "Write more" action in the phase bar. Stop `resolveThreadIntoParent` from force-stamping a parent that is still in Stream; either stage without freezing, or ask.
- **Symmetric recursion (G6).** Compute `drillThreads` for the current surface at any depth so every sub-pad shows its own threads and Continue / Reopen. Take the root-as-thread unification from the contract (§13.3) only if it falls out cheaply.
- **Make the fold-up the moment (G7).** After "Next Draft", show a short before/after of each replaced span, then the whole new draft. This is the study beat. Keep it skippable.
- **Open-thread hygiene.** On the parent, mark threads as open, converged-not-completed, or completed. On Back from a thread with content, say it is being left open. Contract rule 6 calls unclosed drills "worse than no feature".
- **Reveal conflicts (D6).** Block the reveal when two staged results overlap and let you pick.
- Check D7 by hand and fix if real.

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

### Explicitly not on this roadmap

- AI generation or agent execution. Rule 5. If revisited, an agent would join as one more tool behind the broker, receiving and replying in text like any other.
- Accounts, sync, sharing, mobile layout, onboarding.
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

1. **Phase order.** The open-item gate (Phase 2's first item) was built before Phase 1. Was that a deliberate reordering, or should Phase 1 (the "Write more" escape hatch, symmetric recursion, the study beat) come next as written? The case for Phase 1 first is in this section's first bullet.
2. **The layout work.** It was not on the remote, so Phase 3's first item is sized blind. Pushing that branch would let me check how much of the shell already exists.
3. **Where is other in-flight code?** If implementation exists on an unpushed branch, §2 and §3 should be re-checked against it.
4. **Where tag shortcuts come from:** pinned per tag, recent use, or the library only. Open in the capture-templates proposal.

Settled:

- **View or import?** Revisions 4 and 5: tools own their state and exchange text through the workspace shell.
- **The shelf.** Revision 6: yes.
- **Resolve or Complete?** Revision 7: Resolve. Done in code in Revision 8.
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
