# Mindstream

A local-first thinking workspace: ThinkPad (a document), Focus (a stepper) and Workflows (saved steps), with Home listing unfinished work. Vue 3, Vite, Vuetify, Pinia, TipTap, IndexedDB. One user, mobile-first.

- Run: `npm run dev`. Test: `npm test`. Phone-size browser check: `npm run test:e2e`. Build: `npm run build`.
- Product rules, decisions and the roadmap: use the `product` skill before feature work. It reads `.claude/skills/product/references/mindstream-rules.md` and `docs/PRODUCT_ASSESSMENT_AND_ROADMAP.md`.
- Deploy: pushing `master` publishes to GitHub Pages after `npm test` and `npm run test:e2e` pass.

## The lifecycle rule

**Anything a person can start, they can end by tap on a phone. Nothing is listed as unfinished without a way to end it. Every request between tools ends with an answer.**

This is the rule most often broken here, because a feature's happy path never exercises it: the person taps something by accident, or leaves halfway, and is stuck with a row or a mode that will not go away (roadmap Revisions 40 to 42). It is enforced by tests so that it does not depend on anyone remembering it. When you add or change a feature:

1. **Before building, answer for the new thing:** how does it end (finished, cancelled, set aside, removed), and which control does each? Where is it found again after a reload? Where is it listed or counted, and can it be ended from there? What does it ask of another tool, and what answers that in every ending, including "not now"? What happens to it when what it depends on is deleted, and to what depends on it? Prefer the ending that keeps the person's work (set aside, with Undo) over deleting.
2. **Declare it.** Every store action is classified in its tool's `lifecycle.js` (`src/thinkpad/`, `src/focus/`, `src/workflows/`, `src/shelf/`, `src/handoff/`): under `starts` with the actions that end it, or under `other`. `src/lifecycle.contract.test.js` fails on an unclassified action or a start with no ending. Do not move an action to `other` to get past the test; add the ending.
3. **Rows report their own ending.** A tool's `openLoops` entries carry `end: { label, action, args, undo? }` (an action on that tool's store, which Home runs) or `endsAt: "destination"` (the place the row opens has the controls). Home adds no endings of its own.
4. **Requests cannot be taken and left.** A receiver uses `accept(id, tool, ref)` naming the work it made, `answer(id, tool, reply)`, or `decline(id, tool)` from `src/handoff/handoffStore.js`. There is no bare "take". When a tool's work or asker can be deleted, it calls `settleAccepted` / `cancelOrphans` so the other side stops waiting.
5. **Add a flow to `e2e/leave-halfway.cjs`:** start the new thing, walk away, and check Home. Run it. It drives the real app at 390 by 844 with touch, which also catches controls that exist but cannot be reached (hidden at a breakpoint, covered, or pushed off the edge).

An exit test for a slice has two halves: do the thing, and start the thing then back out of it.

For a wider audit after a report ("does this happen elsewhere?"), the `ux-audit` skill has the method and a catalogue of related lapses.
