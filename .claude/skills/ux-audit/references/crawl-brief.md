# Brief for a subagent crawl

Copy this, fill the angle-bracket parts, and send it as the whole prompt. It is written for an agent that knows nothing about the project or this conversation, which is what a fresh subagent is.

Why each part is there:

- **Read-only, with a named scratch folder.** You are editing the same repository at the same time. An agent that "helpfully" fixes things creates conflicts and hides what it found.
- **The rule, with its sub-cases numbered.** Without it the agent reports general polish issues.
- **What is already known.** Otherwise most of the report repeats what you have.
- **How to run and drive the app, including its quirks.** An agent that cannot get past the first screen returns nothing; tell it the selectors and gestures you already worked out.
- **Evidence and a coverage list.** So you can check claims quickly and know what was not looked at.

---

```
You are auditing <one line: what the app is>, repo at <path>, branch <branch>, for ONE class of defect. READ-ONLY: do not edit, commit, or change any file in the repo. Write scripts and screenshots only under <scratch path>/crawl/ (create it).

## The defect class
"<the rule, in a few words>". Concretely, any of:
1. <sub-case, e.g. a state, mode, dialog, run, or request the user can enter (possibly by accident) with no visible way to cancel, close or remove it from where they are>
2. <sub-case, e.g. something that keeps showing as unfinished after the user tried to end it>
3. <sub-case, e.g. a row or link that leads to a screen where the thing it names is not shown>
4. <sub-case, e.g. a control that only works with hover, right-click, drag or keyboard; every exit must work by tap on a 390x844 touch screen>

The owner hit one instance already: <the reported bug, in one or two sentences, and whether it is fixed>. Find OTHER instances.

## Already known: do not re-report
- <each known finding, one line, with "fixed" or "being fixed">

## The app
<Routes and what each screen is for; the main actions on each; where the code for each lives; where shared plumbing lives. Point at a short rules or vocabulary doc if there is one.>

## How to work
- Start the app: <exact command, port>. Stop it when done: <command>.
- Drive it with <tool>. Primary pass: viewport <W>x<H> with touch. Spot-check desktop only where the UI differs.
- Known quirks: <e.g. "clicking by locator scrolls a clipped container and breaks the layout; tap by coordinates from boundingBox() instead">.
- How to get into the main states: <selectors and steps you already know work>.
- Read the source alongside driving the app: for each thing that can be started, find the code path that ends it and confirm it is reachable by tap. Source reading is as valid as browser evidence, but say which you used.
- Walk each screen systematically: list every entry point (buttons, menu items, pickers, dialogs, sheets, modes), enter it, then try to leave without completing it. Also: enter, go to the home screen by the app's own control, come back. Also reload mid-state.

## What to return
A findings list, most severe first. For each:
(a) exact steps to reproduce by tap on a phone,
(b) what the user is stuck with,
(c) evidence: file:line of the responsible code and/or a screenshot path,
(d) VERIFIED in the browser or INFERRED from source,
(e) the smallest fix you would suggest.
Then a short list of entry points you checked and found fine, so the coverage is known. Do not pad: if something has a working tap exit, it is not a finding. Be exact about what you did not get to.
```

---

## When the report comes back

- Read every finding against the current code before acting. The agent may have audited code you have since changed, and "inferred" findings are sometimes wrong.
- A finding labelled as "the same as a known item, but a different cause" is usually right and worth a separate fix.
- Keep its "checked and found fine" and "not covered" lists: they go into your own report's coverage section.
- Relay the findings to the user in your own words. They do not see the agent's report.
