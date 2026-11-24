# Mindstream rules digest

A compact summary of what is settled, for checking proposals quickly. The sources of truth are:

- `docs/PRODUCT_ASSESSMENT_AND_ROADMAP.md`: identity, tool contract, message, shell, phases, risks. Read its revision notes first.
- `docs/capture-templates-proposal.md`: workflows, the open-item gate, resolution. Read its decisions table first.
- `reports/`: research on comparable apps.

If this digest disagrees with those documents, they win, and this file should be corrected. Last synced with roadmap Revision 18 and proposal decisions 1 to 22.

## Contents

1. What Mindstream is
2. Identity rules
3. The tool contract
4. The message between tools
5. The workspace shell
6. Settled decisions that are easy to get wrong
7. Vocabulary
8. Code conventions
9. Known open questions
10. Outdated documents

## 1. What Mindstream is

A thinking workspace: a suite of independent tools that help one person process and refine their thoughts until they can answer a question, make a decision, or name the next small thing to do. Its bias is small actionable steps as the way to finish big, daunting things.

- **ThinkPad** is a document. You free-write (Stream), freeze the draft (Reflect), drill a passage into its own blank sub-pad, converge it to one idea, and resolve that back up to replace the passage. It holds the context of your thinking.
- **The Focus runner** is a stepper. One focus in view; decompose it into a smaller one; finish with a takeaway; park a context that is waiting on something. It is usable on its own, without ThinkPad.
- **Workflows** is the library of reusable methods, a tool with its own page (`/workflows`). Using a workflow copies its steps into the tool that asked.
- More tools may join.

Phase 0 and Phase 1 are done (Revisions 9 and 13); next in order is Phase 2's remainder. What is built (roadmap Revision 8): the runner persists and holds plans of steps with decision steps; the message in §4 is real in `src/handoff/` (a store plus a registry of `want` verbs, not yet the shell's layout, "Send to…" or shelf); bridges exist between ThinkPad, the runner and the library.

Scope for now: one user (Miguel), local-first in the browser, no accounts, no sync, no AI generation. The person does the thinking; the app guides.

Stack: Vue 3, Vite, Vuetify, Pinia, TipTap, IndexedDB. Tests with Vitest. Run with `npm run dev`, test with `npm test`, build with `npm run build`.

## 2. Identity rules

Use these to accept or reject a feature or a new tool.

0. **Text is the interface.** Every tool takes in text that stands for a thought and returns text. A feature needing its own non-text input format is suspect.
1. **One principle, independent tools, one workspace.** Each tool breaks something daunting into pieces small enough to act on and folds results back up, in its own way, with its own state.
2. **Convergence is the gate.** Nothing ascends unresolved: one block, and no open items left undecided.
3. **Fold the result, archive the process.** The parent receives the result only. The working-out stays re-openable.
4. **One level in view.** A cue to where you are, never a permanent parent-and-child split.
5. **The app guides, you execute.** It asks the next question or shows the next step. It never generates the answer.
6. **Results come home.** A result lands at the passage or step that asked for it, however many tools it passed through.
7. **Every session can end in a next small action.** A tool that leaves a bigger pile than you brought is working against the product.

Not, for this horizon: a note vault, an outliner you browse, a general to-do list, a team tool, an AI writer.

## 3. The tool contract

A Mindstream tool:

1. **Stands alone.** Useful opened cold; never requires another tool.
2. **Owns its state.** Its own store, model and persistence. No tool reads or writes another tool's data.
3. **Speaks text through the shell.** It registers what it accepts and marks which of its text can be sent. It never names another tool.
4. **Replies to what it was asked.** A request ends resolved, as a sharper question, or abandoned. Never silently unanswered.
5. **Ends in something smaller.** An answer, a decision, a sharper question, or a next step.

Each tool has one job. ThinkPad does not grow a step-by-step view; the runner does not grow a document. If a pad's content needs stepping through, it is sent to the runner; if a step needs room to think, it is sent to ThinkPad.

## 4. The message between tools

Only two shapes may cross between tools: text, and an ordered list of prompts.

```js
Message = {
  id,
  kind: "request" | "reply",
  text,            // the subject to work on
  context: [],     // optional surrounding lines, outermost first
  steps: [],       // optional ordered prompts: { prompt, produces: "text" | "action" }
  want: null,      // optional neutral verb from the shell's short list, e.g. "think"
  replyTo: null,   // { tool, ref }, opaque to the receiver
  tag: null,       // opaque to the receiver, handed back (e.g. workflow id + version)
  // replies only:
  inReplyTo: id,
  outcome: "resolved" | "question" | "abandoned",
  notes: [],       // plain lines that qualify the result
}
```

- **Content, not labels.** A workflow travels as its list of prompts. The receiver looks nothing up and interprets no name or type. Its behaviour follows from the message's shape.
- **The broker is a dumb pipe.** It matches what tools registered, shows a picker when several fit, routes, and returns the reply. It does not expand, translate or classify. Putting logic in the broker was proposed and rejected.
- **ThinkPad's words stay in ThinkPad.** Doubt, claim, question and the tags never go on the wire. ThinkPad shows reply `notes` as caveats; that is its display choice.
- **The test for any new field:** could a tool that has never heard of the sender make sense of it?
- **A routing slip is linear.** Steps on a message are decided up front and run in order. Nesting or branching happens inside the receiving tool, by the person's hand, not in the message.

Named patterns this follows: smart endpoints and dumb pipes; FDC3 and Android intents for matching and picking; Routing Slip, Return Address, Correlation Identifier and Request-Reply from Enterprise Integration Patterns.

## 5. The workspace shell

The one shared thing. It owns:

- **Layout.** Several tools open at once; reopening restores the arrangement and each tool's place.
- **Registry.** What each tool accepts: text, steps (with or without action steps), which `want` verbs.
- **"Send to…"** on every text item, built from the registry. A tool may promote one option to a button by naming a `want` verb.
- **Ask and Send.** Ask expects a result back at the origin; Send is one-way.
- **The shelf.** A workspace tray for text in transit; where one-way sends and orphaned replies land.
- **The workflow library.** A workspace page. Workflows are not a ThinkPad or runner construct.

Caution: when one tool is working on a piece of what another shows, dim the asker down to the item that asked, so there is one place to look.

## 6. Settled decisions that are easy to get wrong

- **"Resolve", not "Complete".** A resolution means understanding was reached, even with room for doubt. Both tools now say Resolve (runner: `resolveFocus`). The stored ThinkPad field `completedAt` keeps its name on purpose; renaming it would need a migration.
- **Tags do not start workflows.** Question, Expand and Flag open a plain sub-pad and offer shortcuts to workflows. No workflow is bound to a tag or a type of move.
- **A level ends in a call or a sharper question.** A sharper question is a legitimate result.
- **Open-item gate.** A level cannot resolve while moves started there are undecided. Each is addressed, accepted as a stated caveat, lifted to an ancestor, or parked. Built in ThinkPad.
- **Steps declare what they produce:** text or an action. ThinkPad accepts a set of steps only if all produce text; the runner accepts any. A step may also carry `expects: "call"` with `options`: a decision step, finished by choosing an output (Revision 8).
- **A workflow is only its steps.** No workflow-level notes; notes belong to the run. The runner's card shows the current step only; a side panel is the fallback for the whole plan (Revision 8, settled by Miguel).
- **Mobile-first is a design constraint** (Revision 14). Every feature must work by touch on a phone; nothing hover-only or drag-only. "If it works on mobile, it works on desktop." The phone's small surface is what limits the feature set. Desktop stays supported.
- **Freezing is a state of Reflect, not a move** (Revisions 14 and 15). The document is living; Reflect freezes it while you reflect. Entering Reflect records a draft version; leaving it applies waiting results first (then the study beat) and returns to writing. Write more is removed. Supersedes the one-way stamp (lifecycle doc §6).
- **Citations and links are supported** (Revisions 14 and 15). Attaching a link to a passage is a document action (not an open item); "this needs a source" is a move (an open item). Pasted URLs become links, stored as Markdown-style text.
- **Phases follow the roadmap order.** The gate and bridges landing before Phase 1 was circumstance, not a reorder (Revision 11).
- **Every finished phase lands on `master`** once its exit test passes, without asking again (Miguel, Revision 11). Work inside an unfinished phase stays on the branch.
- **A connection is a thought written as text that references two or more passages** (Revision 17). It adds content and never replaces what it references; it can resolve an open item like any text. No relation types ("supports", "contradicts"): the sentence says it.
- **Theme and thesis** (Revision 18). A theme is a collection of text representing a recurring pattern (evidence an idea is true); a passage may serve several. A thesis is an argument derived from themes and evidence; it is what resolves upward, carrying its evidence.
- **Reflection is not an app feature.** Nothing prompts it. It is a step or a workflow the person chooses.
- **Human executes.** No AI agent in this horizon. If revisited, an agent would be one more tool behind the shell.
- **No shared data model between tools.** Considered and rejected in favour of message passing. The strongest counter-argument (Ink and Switch, "one shared reality") is known; do not re-propose a shared tree without new evidence.

## 7. Vocabulary

| Scope | Concept | Word |
|---|---|---|
| Shared | What tools exchange | text (a message) |
| Shared | Asking another tool to work on text | request / reply; Ask / Send |
| Shared | A move started and not yet settled | open item |
| Shared | A method made of prompted steps | workflow; one execution is a run |
| Shared | Finishing a level | resolve; what comes back is a resolution |
| ThinkPad | Top-level unit | pad |
| ThinkPad | A nested piece of a pad | thread |
| ThinkPad | Going down | drill |
| Runner | Top-level unit | context |
| Runner | One unit of attention | focus |
| Runner | Going down | decompose |

## 8. Code conventions

- **Functional core, imperative shell.** Domain reducers in `src/thinkpad/domain/` are pure: `(pad, args, { now, makeId }) -> pad` or `-> { pad, ... }`. They read no clock and mint no ids; the store passes those in from `src/thinkpad/store/idClock.js`.
- **Same reference on no-op.** A reducer that changes nothing returns the object it was given. Stores rely on this.
- **Additive persistence.** New fields are default-filled in `padPersistenceMapper.js`. Old records must load unchanged.
- **Tests sit beside the code** as `*.test.js`, run in Node without a DOM. Keep domain logic free of Vue so it stays testable that way.
- **Paths:** `src/thinkpad/` and `src/focus/` are separate modules. `docs/FRONTEND_PATHS.md` maps them; if it disagrees with the tree, trust the tree and fix the doc.

## 9. Known open questions

Check the documents for the current list. At last sync:

- Revision 8 questions: the runner's opt-in Reflect button vs decision 17; ThinkPad's typed synthesis vs "one block"; whether a call can branch; the library access rule as built.
- Whether the intellectual moves collapse into one core (passages, references, investigations, the thesis) with every move as a library workflow (roadmap §6 question 15, Revision 18). Arranging by theme (question 14) waits on it.
- Where tag shortcuts to workflows come from: pinned per tag, recent use, or the library only.
- Who may read the workflow library. Built as: the runner never reads it, asks with `choose-steps`; only the library page writes. Not yet confirmed by Miguel.
- How much of the shell already exists in the undeployed multi-tool layout work.
- Whether ThinkPad's one-way stamp into Reflect is too formal. Research found a published critique of mandatory drafts ("formality on demand"); the roadmap already calls for a "Write more" escape.

## 10. Outdated documents

`docs/stream-reflect-lifecycle.md` §6 (one-way stamp, "flow is never the default canvas again") is superseded by Revision 14.

Everything in `docs/archive/` describes an earlier product ("Rep-it", a workflow-step session app) or removed code. Do not use it as current context. `docs/feature-science-map.md` is also historical as a product description; its research principles still hold. `README.md` and `docs/FRONTEND_PATHS.md` were brought up to date in Phase 0 (Revision 8).

`docs/recursive-resolve-contract.md` and `docs/stream-reflect-lifecycle.md` remain the design basis for ThinkPad, though they use older file paths and names.
