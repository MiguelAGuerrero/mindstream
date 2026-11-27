# Classes of interface lapse

Each class has: the rule, what breaking it looks like to a person, how to detect it, and the usual fix. The first five came from one real audit (a thinking app with three tools that pass requests to each other); the rest are the neighbours that the same kind of design gap produces. Use the rules as starting points and rephrase them in the project's own vocabulary.

## Contents

1. No way out
2. Asked and never answered
3. Orphans: the owner is gone, its things remain
4. Rows and links that lead nowhere
5. Counts with nothing behind them
6. Out of reach by touch
7. There but not visible
8. Destroys work without a way back
9. Nothing happened (no feedback)
10. Did it twice
11. Lost on reload or navigation
12. Built but not wired
13. Says the wrong thing

---

## 1. No way out

**Rule.** Everything a person can start has a way to end it, reachable from where they are.

**Looks like.** A mode with no "back". A started run whose only exits are "finish" or "delete everything". A mark on content that can be added but not removed. A view toggle that hides the only navigation.

**Detect.** Inventory every start (see SKILL.md section 2). For each, find the code that ends it and the control bound to it. Check exits for every variant of the screen: a "back" button guarded by a view-mode condition is missing in the other mode. Check that the non-destructive exit exists: "stop" and "delete" are not a substitute for "step away".

**Fix.** Add the inverse action to the model (remove for add, bring back for set aside), then the control. If the only existing exit destroys work, add a reversible one.

## 2. Asked and never answered

**Rule.** Every request ends with an answer: done, declined, or abandoned. Never silence.

**Looks like.** "Waiting on …" that never clears. A spinner that never stops. A badge that stays after the thing was dismissed.

**Detect.** Find every place a request is taken (consumed, accepted, dequeued, dismissed) and confirm the same path, in every branch, also answers or releases it. "Not now", "later", "skip" and close-the-dialog handlers are where this most often breaks: they hide the request without ending it. Search for handlers that only set a flag or strip a URL parameter.

**Fix.** A decline is an answer: record it as one. Give the requester a way to stop waiting on its own side too, so it does not depend on the receiver behaving.

## 3. Orphans: the owner is gone, its things remain

**Rule.** When something is deleted, closed or left, everything it owned or was waiting on is settled in the same action.

**Looks like.** A list row for a document that no longer exists. A reply that arrives for a step the person already backed out of and lands on the wrong one. Steps still "waiting" on a session that was closed.

**Detect.** For each thing that can be deleted or abandoned, list what refers to it by id (requests, pending slots, reminders, list rows) and what it refers to. Check both directions: the receiver's work is deleted (the asker must be told), and the asker is deleted (the request must be cancelled). Check "back" as well as "delete": abandoning a sub-step should release what that sub-step asked for.

**Fix.** Settle at the moment of deletion where the code knows what is being removed. Add a reconcile pass on load as a safety net for records already orphaned: anything accepted whose work is gone is answered as abandoned; anything waiting whose asker is gone is cancelled.

## 4. Rows and links that lead nowhere

**Rule.** Every row or link opens the thing it names, in a state where it can be acted on.

**Looks like.** Tapping "Waiting on X" opens X's blank start screen. A deep link to an item opens its parent list. A notification opens the app's home.

**Detect.** For every list of unfinished things, tap each kind of row in each state the item can be in (new, accepted, parked, finished) and check the destination shows that item. Read the route builder: a link built from an id the destination only understands in one state is dead in the others.

**Fix.** Make the destination resolve the id in every state: open the matching item, or say plainly it is gone and clear the row.

## 5. Counts with nothing behind them

**Rule.** Every count, badge or "N open" can be opened into a list of the N things, and each can be settled from there.

**Looks like.** "2 open" with one visible item. A counter that can never reach zero. A gate that blocks on items the person cannot find.

**Detect.** For each number shown, find the query that produces it and the view that lists the same query. If they are different queries, find an item the count includes and the list omits. Items moved, lifted or forwarded to a level that has no view of them are the usual culprits.

**Fix.** Drive the count and the list from one source. Do not offer a destination (move to…, forward to…) that has no place to show what arrives.

## 6. Out of reach by touch

**Rule.** Everything works by tap on a phone-sized touch screen. Hover, drag, right-click and keyboard shortcuts are extras.

**Looks like.** A tag picker that only appears on hover. Escape as the only way to close. Reordering by drag only. A tap that opens a popup which the same tap then closes.

**Detect.** Drive the app with touch emulation at about 390 by 844. Search the styles and handlers for `:hover` rules that reveal controls, `mouseenter`, `contextmenu`, `keydown` handlers with no button equivalent, and drag handlers with no alternative. `scripts/ui_probe.cjs` flags tap targets under 40 px.

**Fix.** Add the tap path, then keep the shortcut.

## 7. There but not visible

**Rule.** A control that exists in the code is on screen, uncovered, at every supported width.

**Looks like.** A panel set to `display: none` below a breakpoint, taking its features with it. A popup positioned under a fixed bar. A button clipped by its container. A sheet whose primary button sits under the phone's home indicator.

**Detect.** Search styles for `display: none` inside width or container queries and ask what becomes unreachable. Run `scripts/ui_probe.cjs` for covered controls. Look at screenshots rather than trusting that an element "is visible" to the test tool. Check positioning code that assumes a fixed size for something whose size varies (a popup that wraps to more rows on a narrow screen).

**Fix.** Re-flow instead of hiding (stack the panel under the content). Measure real size before placing popups; flip to the side with room.

## 8. Destroys work without a way back

**Rule.** An action that removes a person's work confirms first or offers Undo, and the default way to end something keeps the work.

**Looks like.** A one-tap delete. "Close" that discards notes. A replace-all with no preview. Tidying a list by deleting what was in it.

**Detect.** List every delete, replace, discard and clear. For each: is there a confirmation or an Undo, and is there a gentler ending next to it?

**Fix.** Offer the reversible ending (set aside, archive) as the default and keep deletion as the explicit second choice. Show Undo for a few seconds after the action.

## 9. Nothing happened (no feedback)

**Rule.** Every action shows its result, and a control that cannot be used says why.

**Looks like.** A tap with no visible change. A disabled button with no explanation. An item that silently moved somewhere else.

**Detect.** For each action in the inventory, note what changes on screen. Check disabled controls for a reason reachable by tap (a title attribute alone is hover-only).

**Fix.** A short notice that says what happened and where the thing went, with the way back.

## 10. Did it twice

**Rule.** Doing the same thing twice by accident leaves one of it.

**Looks like.** Two identical requests after going back and tapping again. Duplicate rows after a double tap.

**Detect.** For each start, do it, leave before finishing, and do it again. Count the results.

**Fix.** Replace or reuse the pending one for the same subject instead of adding another.

## 11. Lost on reload or navigation

**Rule.** Leaving and coming back, or reloading, returns the person to what they were doing or tells them where it went.

**Looks like.** A half-filled dialog gone after a reload. A mode that resets. A consumed link that shows something different the second time.

**Detect.** Reload in the middle of each multi-step flow. Use the browser's back button. Open the same link twice.

**Fix.** Keep in-progress state where reload can restore it, or make the first step idempotent so the link works again.

## 12. Built but not wired

**Rule.** A capability the code has is reachable from the screen, or it is not claimed as a feature.

**Looks like.** A domain function with tests and no caller. A "decision" the model supports that no control sets. A card that exists but can only be reached by paging from another card.

**Detect.** For each capability the docs or the model describe, find the control that invokes it. Classify each as wired, present but unwired, or only described.

**Fix.** Wire it, or record it honestly as not yet reachable.

## 13. Says the wrong thing

**Rule.** Labels, counts and states on screen are true and readable without knowing the internals.

**Looks like.** "0 open" on a button that opens three things. An icon-only button with no name. A session counter that counts cancelled requests. A status word from the data model shown raw.

**Detect.** Read every label in the screenshots against the state you know the app is in. `scripts/ui_probe.cjs` lists buttons with no accessible name.

**Fix.** Derive the label from the same data as the thing it describes; name every icon button.
