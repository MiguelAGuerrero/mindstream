# ThinkPad journey audit (phase one)

Every ThinkPad journey reachable in the app, driven in a browser at iPhone size (390 × 664) with desktop spot checks (1280 × 860), on build 5eecaff (Revision 34). Each step was screenshotted and judged from what was on screen plus measured sizes. Screenshots: https://claude.ai/artifact/1PGncJr78BZxhFMJ8NFcpa (private to the owner).

## Status (same day)

All findings are fixed on master except #12 (partly fixed: plain wording and wrapping titles; the gate and the takeaway are still two dialogs) and #14 (withdrawn: a measurement error; the desktop screenshots were halved when the contact sheet was made, and at real size the page is 816px wide and centred in both modes). Commits: high f9c9e01, medium 2e6427f, low ed6b91d. Reflect's Pages view was rebuilt as a real page viewer in b2f6d11, which also fixes #10.

## Findings, ranked

### 1. [High] Notice covers Back and Resolve in a thread

- **What happens:** After you leave a thread, the “still open / ready to resolve” notice appears at the top of the phone screen, over the thread strip. Vuetify pauses its 4-second timer while the pointer rests on it, and after tapping Back the pointer is exactly there, so it can stay up until you tap elsewhere. It was still showing after 17 seconds in the test.
- **Why it matters:** Back and Resolve are unreachable, and the notice talks about a thread you may have just reopened. This is a regression from Revision 33, which moved the notice to the top.
- **Direction:** Show it above the bottom bar instead of over the strip, or as a small inline line, and don't let hover hold it.
- **Screens:** E7a2-back-to-thread, E3b-reopened

### 2. [High] Deleting a pad is instant, with no confirmation or undo

- **What happens:** In Open…, the bin icon on a card deletes the pad on the first tap. In the test the workout pad vanished.
- **Why it matters:** One mis-tap loses a whole pad, with no way back. On touch the icon only shows on the card you just touched, so it is easy to hit by accident.
- **Direction:** Ask to confirm, or delete with an Undo notice for a few seconds.
- **Screens:** A5a-open-dialog, A5b-after-delete

### 3. [High] Selection controls are too small for a thumb

- **What happens:** Selection picker buttons measure 23–26px tall. The paragraph chips (Question, Expand, Flag) measure 20px. The picker also sits on the line you selected, hiding it, and after revealing hidden text it ran off the right edge of the screen.
- **Why it matters:** These are the core Reflect moves. At this size they are hard to hit, and the hidden selection removes the context you need to choose.
- **Direction:** Give each control at least 40px of height on phones. Place the picker below the selection, or use a bottom sheet. Keep it inside the screen.
- **Screens:** D2a-picker, C3a-tap-paragraph, D3b-reveal

### 4. [High] You can't see where threads and questions are open in the text

- **What happens:** After opening a thread on “bad knee” and going Back, the words look like every other passage. The same happens with a question opened on “Fri lower”. The only trace is the “1 thread” chip in the top bar.
- **Why it matters:** Threads are the main unit of work. Without a mark on the text you can't find them again, or see which parts of the draft are still being worked on.
- **Direction:** Paint anchored passages, with a distinct style for open and resolved, and make the mark tap-to-open.
- **Screens:** E2a-back-open, E7a2-back-to-thread

### 5. [High] Escape to close a dialog also puts the pad into Reflect

- **What happens:** Escape while writing is the shortcut for Reflect. Pressing Escape to close Open… (or any dialog) also triggers it, so the pad freezes and records a draft without you asking.
- **Why it matters:** This affects desktop and keyboard users. It makes an unwanted draft and changes the mode under you.
- **Direction:** Ignore Escape when a dialog or menu is open, or drop the shortcut.
- **Screens:** A6a-menu-in-pad

### 6. [Medium] The dimmed “focus” state lingers after actions

- **What happens:** After Hide, Needs source, closing Send, or returning from a thread, one paragraph stays bright with its chips under it, and the rest of the page is dimmed. It is often a paragraph you never touched.
- **Why it matters:** The document looks greyed out and harder to read, and the chips suggest you are in the middle of something.
- **Direction:** Clear the focus state after an action and on return from a thread.
- **Screens:** D3a-hidden, D6a-needs-source, E6c-after-resolve, F1a-result-waiting

### 7. [Medium] The thread strip is titled “Focus”

- **What happens:** Every thread strip reads “Focus” with a crosshair icon (the default stance), not the passage or question. After a workflow round trip the title disappears and a “1 session · 0 min” chip takes its place.
- **Why it matters:** In a nested thread you can't tell where you are without expanding the strip.
- **Direction:** Title the strip with the thread's question or passage, and show the stance as a small chip.
- **Screens:** E1a-thread-open, H1e-back-in-thinkpad

### 8. [Medium] The thin bar overflows inside threads

- **What happens:** With Pages, threads, Synthesize and Workflow all showing, Workflow is cut off at the right edge, and the threads chip wraps onto two lines (“thread · 1”).
- **Why it matters:** Actions are hidden or look broken.
- **Direction:** Move lower-priority actions into the ⋮ menu, and use icon-only chips on phones.
- **Screens:** E5a-resolved-nested, E7a2-back-to-thread

### 9. [Medium] Waiting results are invisible until Next Draft

- **What happens:** A resolved result waits behind a small lightbulb next to its paragraph. The draft text doesn't change, so you can't see what Next Draft will do.
- **Why it matters:** You press Next Draft without knowing the effect, and the lightbulb is easy to miss.
- **Direction:** Show the waiting result inline, for example as a faint before → after, or open a preview when the lightbulb is tapped.
- **Screens:** F1a-result-waiting, E5a-resolved-nested

### 10. [Medium] Reflect opens on the last page

- **What happens:** After writing a long dump, entering Reflect opened at 6 / 6. Reflect is for reading the draft as a whole, so it should start at page 1.
- **Why it matters:** You land at the end of your text and have to page back.
- **Direction:** Open Reflect on page 1, or on the page holding the paragraph you were last working on.
- **Screens:** C1a-reflect-pages, C1c-page-1

### 11. [Medium] Paragraph spacing is missing or inconsistent

- **What happens:** While writing there is no gap between paragraphs, so a dump reads as one wall of text. In Reflect most paragraphs are spaced, but some pairs show no gap; after Next Draft, more pairs did. The data keeps them separate (each has its own marker), so this is visual.
- **Why it matters:** Paragraphs are the units you work with in Reflect. When their edges are hard to see, everything else is harder.
- **Direction:** Use the same paragraph spacing in both modes, and fix the spacing rule that collapses some gaps.
- **Screens:** A2d-written, C1c-page-1, F3a-next-draft

### 12. [Medium] Resolving a thread is a chain of dialogs with jargon

- **What happens:** Resolve can open the open-items gate, then “Synthesize your takeaway”, or for a synthesis “Converge over open threads?”. The gate offers “Address it here”, “Accept as doubt”, “Lift to…” and “Park as its own work”. On a phone the converge title is clipped.
- **Why it matters:** It's hard to know what each choice does. Two dialogs in a row feel like a form, and the dialogs cover the thread text you would want to look at while writing the takeaway.
- **Direction:** Use plain verbs (Keep as a caveat, Move up, Make it its own pad). Merge the gate and the takeaway into one sheet. Let the title wrap.
- **Screens:** E7b-gate, E7c-gate-decided, E7d-after-gate, G2a-synth-resolve

### 13. [Medium] Untitled pads are hard to tell apart

- **What happens:** A pad started with “Just start writing” is “Untitled” in the list, in Open… and in its title, and exports as pad.md. Open… also lists empty pads and still uses the old large cards.
- **Why it matters:** With two or three untitled pads you can't tell which is which.
- **Direction:** Use the first words of the text when there's no title. Hide empty pads in Open…, and give Open… the same list style as the welcome screen.
- **Screens:** A4a-resume-list, A5a-open-dialog

### 14. [Medium] On desktop the page is a small card that moves

- **What happens:** At 1280×860 the page is a card about 400px wide with small text and lots of empty space. It sits right of centre while writing and left of centre in Reflect, so it jumps when you switch.
- **Why it matters:** Desktop gets less room than a phone, and the jump is disorienting.
- **Direction:** Give the page a fixed reading width (about 70 characters), centred in both modes, and let it grow to the window height.
- **Screens:** I2a-desk-writing, I3a-desk-picker

### 15. [Low] Enter in the title doesn't move you to the text

- **What happens:** Pressing Enter after naming a pad leaves the cursor nowhere, so you have to tap into the text.
- **Why it matters:** A small break in flow.
- **Direction:** Move the cursor into the text on Enter.
- **Screens:** B1a-title-tap, B1b-title-set

### 16. [Low] Threads and syntheses use the generic writing hint

- **What happens:** A question thread and a synthesis both open with “Write freely. Switch to Reflect when you want to work on what you wrote.”
- **Why it matters:** It's a missed chance to say what this space is for, such as answering the question, or quoting passages and naming themes with #.
- **Direction:** Use a hint per thread kind.
- **Screens:** D1a-paragraph-question, G1a-synthesis-open

### 17. [Low] Workflow opens on a blank screen

- **What happens:** The Workflow screen took over a second to appear, showing only the Mindstream bar meanwhile. This was in development mode; a production build should be quicker.
- **Why it matters:** It looks broken for a moment.
- **Direction:** Show a loading state.
- **Screens:** H1a-workflow, H1c-workflow-wait

### 18. [Low] A past draft doesn't say it's read-only

- **What happens:** Reading Draft 1 from the history drawer looks like the live page. The only clue is “Draft 1 / 2” in the bar, and the only way back is through the drawer or the arrows.
- **Why it matters:** You may try to edit, or not know how to return.
- **Direction:** Show a small “Reading Draft 1 · Back to current” strip.
- **Screens:** F4b-old-draft

### 19. [Low] The picker's second row looks disabled

- **What happens:** Link, Needs source, Send… and Hide from view are small grey text under the tag buttons.
- **Why it matters:** They read as unavailable.
- **Direction:** Give them the same contrast as other controls.
- **Screens:** D2a-picker

### 20. [Low] An empty thread disappears silently on Back

- **What happens:** Going Back from a thread you didn't write in removes it. That is a good default, but nothing says so.
- **Why it matters:** You may look for it later under Threads.
- **Direction:** Say “Empty thread removed” briefly.
- **Screens:** none

### 21. [Low] The new-pad field clips its first letter

- **What happens:** When the typed question fills the field, its first letter is cut off (“łow do I build…”).
- **Why it matters:** Cosmetic.
- **Direction:** Let the field grow to two lines, or scroll properly.
- **Screens:** A2b-dialog-typed

## Journeys walked

- **A. Start and come back** (friction): First run, the + dialog, Just start writing, the recent list, Open…, delete, Export, Home.
- **B. Write** (friction): Naming a pad, a 30-paragraph dump, scrolling back to the top.
- **C. Read in Reflect** (friction): Pages, page turns, Document view, tapping a paragraph, back to writing.
- **D. Mark passages** (friction): Selecting words, the picker, Hide and reveal, URL and passage links, Needs source, Send….
- **E. Work in threads** (broken): Opening, leaving open, reopening, nesting, peeking at the parent, resolving one idea, the takeaway, the open-items gate.
- **F. Drafts and history** (friction): A waiting result, overlapping results, Next Draft, the history drawer, reading an old draft.
- **G. Synthesize** (friction): Starting a synthesis, quoting a passage, resolving over an open thread.
- **H. Other tools** (works): Workflow from a thread and back; Focus on this.
- **I. Desktop** (friction): The same core flow at 1280×860.

## Works well

- The + button and New think-pad dialog: focused field, Create disabled until you type, a clear skip option.
- The phone document list: scannable, with where you left off on one line.
- Writing scrolls as one column, and the caret stays in view at the end of a long dump.
- Pages and Document view, the page turner, and the remembered choice.
- The link dialog: paste a URL or pick a paragraph, and the tap-a-link sheet with Remove and Open.
- The Send to… sheet: clear, two choices, Cancel.
- The overlap dialog explains the conflict, and “becomes” makes each result easy to compare.
- The revision history drawer reads well and makes old drafts easy to reach.
- The quote dialog and the quoted passage styling.
- Peek parent: a quick, readable look at the level above.
- Workflow round trip: the steps come back as headings to write under.
- No console errors in any journey.

## Not walked yet

- Per-tag shortcuts (declaring and using one).
- Lift to… across several levels, and Undo in the gate.
- Reordering paragraphs (the Move up / down buttons never appeared on a phone).
- Deep links (opening a pad or thread from a link).
- Install to the home screen and offline use.
- Real-device feel: swipe physics, iOS selection handles, and the on-screen keyboard over the dialog.
- The reply strip from a returned hand-off.
