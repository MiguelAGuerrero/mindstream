---
name: ux-audit
description: Audit an app's interface for a whole class of usability lapses, not just the one bug that was reported, then fix what is found and write the rule down so it does not come back. Covers dead ends (things a person can start but cannot cancel, close or remove), requests and background work left waiting forever, list rows and links that lead nowhere, counts with nothing behind them, controls that only work by hover, drag or keyboard, controls hidden or covered on a phone, and destructive actions with no undo. Use this whenever the user reports a UI or UX problem and asks whether it happens elsewhere, says "there's no way to close/cancel/abort/dismiss/undo this", "I'm stuck", "it won't go away", "audit the app", "crawl the app", "find similar issues", "check the flows", or treats one bug as "an example of a general concern". Also use it before building or reviewing any feature that adds something a person can start (a mode, dialog, run, timer, request, draft, list item), to check its whole lifecycle up front, even if the user does not say "audit".
---

# UX audit: from one lapse to the class it belongs to

A reported interface bug is usually one member of a family. The person who found it was stuck once; the same design gap is almost always present wherever the same shape recurs. Fixing the one report leaves the rest for them to find by getting stuck again. This skill turns a single report into a rule, checks the whole app against that rule, fixes what breaks it, and records the rule where the next agent will read it.

It has two modes:

- **Audit** (something is already built): sections 1 to 6, in order.
- **Prevent** (something is about to be built or reviewed): section 7. It is short; use it every time a change adds anything a person can start.

## 1. State the rule the bug broke

Before looking for more bugs, write one or two sentences that the reported bug violates and that could be checked against any screen. This is the most important step: a vague rule ("the UX should be clean") finds nothing, and a rule copied from the report ("the focus timer needs a close button") finds only the report.

Aim for the level in between: general enough to apply across the app, concrete enough that a specific screen either passes or fails.

> Report: "I accidentally opened a focus timer from the notes tool and it won't let me close it out."
> Rule: "Everything a person can start has a way to end it, reachable by tap from where they are. Everything one part of the app asks of another ends with an answer."

`references/lapse-classes.md` lists the classes that recur, each with the rule, how to detect it, and the usual fix. Read it now. Pick the class the report belongs to, and note the neighbouring classes: an audit for one usually turns up members of two or three others, and they are worth reporting even when they are outside the rule you started with.

If the project has its own product rules or design principles (a rules digest, a CLAUDE.md, a roadmap), read them first and phrase the rule in their vocabulary. Fixes have to respect those rules, and the rule you write should end up beside them.

## 2. Take an inventory before hunting

Dead ends are found by enumeration, not by browsing. List every thing of the relevant kind before testing any of them, so that coverage is known and the gaps can be reported honestly.

For "can be started", the inventory is every:

- **Mode** the screen can be in (edit / read, a history view, a picker mode, expanded, a frozen draft).
- **Overlay**: dialog, sheet, drawer, menu, popover, snackbar with an action.
- **Long-lived item**: a draft, thread, run, timer, session, parked or paused thing, queued item.
- **Request** from one part of the app to another, or to a server: anything created now and answered later.
- **Mark** on content: tags, flags, highlights, "needs X" markers, pins.
- **List row** that reports unfinished work (an inbox, "continue", "pick up", notifications, badges).

Find them from the code as well as the screen: search for the verbs that create things (`create`, `start`, `open`, `add`, `push`, `begin`, `enter`, `mark`, `set…Open`), for stores' action lists, and for every `v-if`/conditional that switches a whole surface. For each entry, write down where it is started and what code path ends it. An entry with no ending path is a finding before the app is even opened.

## 3. Audit in two passes that check each other

**Pass A, the plumbing, by reading.** Trace each lifecycle through the code: where is it created, what are all the ways it can end, and what happens to it when the thing it depends on goes away? Most of the worst findings live here and cannot be seen by clicking around, because they only show up later as something that never clears:

- Every path that *takes* something must also *answer* or *release* it. Look for consume-without-reply, dismiss handlers that only hide, and "not now" buttons.
- Every owner that can be deleted must settle what it owned or was waiting on. Deleting a document, closing a session, or backing out of a screen should not leave a request, a badge or a list row pointing at nothing.
- Every "back" or "abandon" must release what the abandoned step asked for, or the answer will land on the wrong thing later.

**Pass B, the screens, by driving the real app.** Run it and walk the inventory at phone size with touch input. For each entry: enter it, then try to leave without finishing. Also: enter it, navigate away using the app's own navigation, come back; and reload in the middle. Record what is left behind.

Phone size first, because it is the strictest: no hover, no right-click, no Escape key, little room. A control that is hidden at a breakpoint, covered by a fixed bar, or reachable only by hover is a dead end for a phone user even though the feature "exists".

`scripts/ui_probe.cjs` checks one screen mechanically for the things eyes miss: controls covered by another element, tap targets too small to hit, buttons with no name, and sideways overflow. Run it on each distinct screen state (it takes a URL and optional setup steps); see the header of the script. It finds symptoms, not lifecycle bugs, so it supplements the walk and does not replace it.

**Delegating the crawl.** The screen pass is long, independent and floods context with screenshots, so it is a good job for a subagent while you do the plumbing pass yourself. Use the template in `references/crawl-brief.md`: it makes the agent read-only, gives it the rule, lists what is already known so it does not report it back, and demands evidence labels. Treat what comes back as a draft: confirm each finding in the code before acting on it, because a crawl reports mistakes in the same confident tone as real findings, and it may have been looking at code you changed in the meantime.

**Label every finding** as *verified* (you or the crawl reproduced it in the running app), *inferred* (read from source, not reproduced), or *reported* (an agent said so and you have not checked). These are different claims; do not merge them.

## 4. Fix causes, and add an escape hatch

A dead end usually has two layers, and both deserve a fix:

- **The cause, where it is created.** Make the lifecycle complete at its source: the handler that takes a request also answers it; deleting an owner settles what it owned; the model has an inverse for every action that adds something. This stops new instances.
- **The escape hatch, where it is seen.** Wherever unfinished things are listed, give each row a way to end it from the list. This clears instances that already exist in the user's data and catches the causes not yet found. A fix to the cause alone leaves the user's existing stuck rows stuck.

Guidance that keeps fixes from creating new problems:

- **Prefer the reversible ending.** When "end this" could mean "delete it" or "put it away", choose the one that keeps the person's work and can be undone, and offer Undo at the moment of the action. Deleting work to tidy a list is the wrong trade. If only deletion makes sense, confirm first.
- **Reuse the product's existing concept** for the ending (parked, archived, dismissed, declined) rather than inventing a new state. A new state needs its own exits and its own place to be seen, which is how this class of bug starts.
- **Give every new state a way back and a place to be seen.** If something can be set aside, it must say so where it lives, and offer the way to bring it back there. Then check the new state against the rule too.
- **Put the logic where it can be tested without a screen.** Write the failing test for the lifecycle rule first (the request ends answered; the removed owner leaves nothing waiting), then the code. Interface wiring comes last.
- **Stay inside the audit.** Note unrelated defects for the project's defect list; fix one in passing only if it blocks verifying a fix (and say so).
- **Decide what is the owner's call.** What an ending *means* for the person's work is a product decision. If the user asked to be consulted, ask once with a recommendation; if they asked for autonomy, take the reversible default and record it as a default, not as their decision.

## 5. Verify in the running app

Tests passing is not the same claim as "a person can now get out". For each fix, repeat the original steps in the browser at phone size and confirm the thing is gone, stays gone after a reload, and that the console is clean. Take a screenshot of each state that matters and look at it: a button that exists but is clipped, covered or mislabelled ("0 open") is still a lapse.

If a browser tool mis-drives the app (for example, auto-scrolling an element into view inside a clipped container), tap by coordinates instead, and check whether the trouble is the tool or a real defect by reproducing it on the code before your change.

## 6. Report, and write the rule down

Report in this shape, leading with the outcome:

```
## The rule audited against
<the one or two sentences from step 1>

## Fixed
<grouped by area; one line each: what a person was stuck with, what they can do now>

## Left as is
<findings deliberately not changed, each with the reason>

## Not covered
<inventory entries not exercised; viewports not driven; flows not run>

## Decisions taken as defaults
<anything that was the owner's call, what was chosen, how to change it>
```

"Not covered" is not optional. An audit that claims completeness it does not have teaches the user to stop trusting audits.

Then make the rule durable, because the point is that the next change does not reintroduce the lapse:

- Add the rule, in one short paragraph, to whatever the project's agents read before building (a rules digest, CLAUDE.md, a contributing guide). Name the helper functions a new feature should use.
- Record the audit in the project's change log or roadmap: the rule, what was fixed, what was left, what was not covered.
- If the project has a skill or checklist for planning features, point it at section 7 below.

## 7. Prevent: the lifecycle table

Before building (or approving) anything a person can start, fill in this table for it. It takes a few minutes and it is the cheapest point at which to find these lapses. Any empty cell is a design gap to settle before code is written, not after a user is stuck.

| Question | Answer for this feature |
|---|---|
| How is it started, and can that happen by accident (one tap, a mis-tap, a default)? | |
| What are all the ways it ends: finished, cancelled, set aside, removed? Which control does each, and is it visible by tap on a phone? | |
| If it is left half-done and the person navigates away or reloads, where do they find it again? | |
| Where is it listed or counted as unfinished? Can it be ended from each of those places? Does every count have a list behind it? | |
| What does it ask of other parts of the app or a server, and what answers each ask in every ending above, including "not now"? | |
| What does it depend on (a document, a session, a parent)? When that is deleted or left, what happens to this? | |
| What depends on it? When this ends or is deleted, who is told? | |
| Which ending destroys work? Is there an Undo or a confirmation? Is the default ending the reversible one? | |
| What does the person see after each action (a notice, a changed label, the row gone)? | |
| Does anything here need hover, drag, right-click or a keyboard? What is the tap equivalent? | |

When reviewing someone else's change, ask the same questions of the diff: every new `create`/`start`/`open` should have its matching end in the same change, and every new list or badge should have a way to clear each item.
