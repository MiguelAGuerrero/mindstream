# Manual run: the synthesis model under its recommended defaults

**Date:** 2026-11-24 · **Asked by:** Miguel · **Status:** a thought experiment. Nothing here is built.

## What was assumed

The four recommendations from roadmap §6 question 15 (Revision 19), as if implemented:

1. **Synthesis happens in a thread, using quotes.** Drill on a passage, several passages, or the whole draft. Inside the thread, *quote a passage in*: a copy with a link back to its origin. Headings in the thread are themes. The thread's resolution is the thesis. Its quotes are its evidence.
2. **A level ends in a call or a sharper question** (decision 9). A thesis is a kind of call.
3. **References follow a passage into its resolution** instead of being marked lost.
4. **Moves stay built in,** one prompt each. Library workflows are for multi-step methods.

These carry over from what is already built:
- Reflect is a state (Revision 16).
- Citations are links (Revision 15).
- The landing of a result follows its anchors: one passage means a choice between replace and add; several passages means add.
- The gate counts undecided drilled passages and lifted items at the level being resolved (`openItems` in `thinkPadModel.js`).
- The root has no gate (capture-templates §8.4).

Each step is marked **holds**, **friction** or **breaks**.

---

## The run: "How do I build an effective workout program?", on a phone, over five days

### Day 1: gathering while watching

You create a pad with the question as its title. While watching three videos, you dump six passages in Write mode, pasting each video link after the line it came from:

- **P1** Nippard: progressive overload matters most.
- **P2** Another video: 10 to 20 hard sets per muscle per week is the driver.
- **P3** Israetel: train 0 to 3 reps from failure.
- **P4** I have 4 days a week, about 60 minutes each.
- **P5** Bad knee: deep squats hurt.
- **P6** Full body or upper/lower? Unclear.

**Holds.** This is plain writing plus links, and it is fine on a phone.

**Friction.** Copying a link means leaving YouTube, switching apps and pasting. That is a capture cost, not a model problem, and it is already noted (Revision 14).

### Day 1: first Reflect

You switch to Reflect, which records version 1. You open three moves:
- **Doubt** on P1 ("matters most" against P2).
- **Question** on P6.
- **Question** on P5 ("which leg lifts spare the knee?").

The root now has three open items. Because the root has no gate, they are a count you can see, not a block.

**Holds.**

### Day 2: the doubt thread, quoting in a rival claim

Inside the Doubt thread on P1, you quote in P2 so the two claims sit side by side. You write:

> "They aren't rivals. Overload is how you progress within a volume target."

You resolve. The thread was opened on one passage, so you choose between replace and add.

- **Replace.** P1 becomes the reconciliation. The claim "Nippard says overload matters most" leaves the draft, though it remains readable in the thread.
- **Add.** P1 stays and the reconciliation sits after it.

**Friction: a choice on every resolve.** On a phone, asking "replace or add?" every time is a tap and a decision, many times a session. Most moves have an obvious answer:
- A Clarify result should replace.
- A Doubt result usually should add, because it is a verdict on the claim.

This is exactly the per-move `writeBack` the review recommended deleting. The run says to keep it **as the default**, and let you override it at resolve time. That is one tap if the default is right, two if it is wrong.

**Holds: quoting across passages.** P2's quote is a copy with a link back, and P2 is untouched in the draft. The redundancy you wanted, the same idea serving two places, comes for free.

### Day 2: the question threads

**The P6 thread.** You quote in P4 (four days) and P2 (volume) and write:

> "Upper/lower, four times a week, hits each muscle twice."

It is a call, so it replaces P6, because the question is answered. **Holds.**

**The P5 thread (the knee).** You write two candidate ideas and are not sure yet. You go Back, and the notice says it is still open. **Holds.**

You switch to Write. The waiting results are applied, which records version 2, and the study beat lists P1 → reconciliation and P6 → upper/lower call. **Holds.**

### Day 3: new evidence, and the connection you can't make cheaply

A new video says that training each muscle twice a week beats once. You write it as **P7**. You want to note that P7 backs your upper/lower call.

Under the model, a connection only exists inside a thread: open a thread on P7, quote in the upper/lower call, write "this backs the twice-weekly frequency", and resolve it as an add. That is four steps to record one observation.

The alternative is to just write "this supports my upper/lower call" in Write mode. That is easy, but it is plain prose with no reference behind it.

**Gap.** There is no cheap way to point at another passage from the main document. Revision 15 approved links as citations to URLs. Extending the same link action to point at a passage in the document would make this two taps, with no thread. The link would need rule 3 below so it survives when its target is resolved.

### Day 4: synthesis

In Reflect you start a synthesis on the whole draft.

**Gap: a gesture.** Today, drilling starts from a text selection. Selecting the whole draft on a phone is awkward. The level needs a "Synthesize" action that opens a thread anchored on the whole draft.

The thread opens blank. You quote passages in under headings you write:

- **Drivers of growth:** the P1 reconciliation, P2, P3, P7.
- **My constraints:** P4, P5.
- **Structure:** the upper/lower call.

**Holds: the quote picker.** The picker shows the parent level's passages. That is a look upward, like the existing parent peek, so "one level in view" still holds. Quoting from sibling threads is not needed, because their results are already in the parent.

You write the thesis:

> "Four-day upper/lower; 10 to 15 hard sets per muscle per week at 1 to 3 reps from failure; progress load or reps weekly; legs through knee-friendly lifts."

**Friction: evidence that isn't settled.** The thesis says "knee-friendly lifts", but the P5 knee thread is still open. The synthesis thread can still resolve, because the gate counts items started *in* the thread, and P5's thread was started at the root. So nothing stops a thesis from resting on an open question. That is honest, since a thesis can carry a caveat. But it should be visible: a quote whose source has an open thread shows a small "still open" mark, and the resolved thesis carries the note "1 source still open", shown as a caveat the way reply notes already are.

### Day 4: resolving the synthesis

The thread is anchored on the whole draft, which is one continuous passage, so you choose between replace and add.

**Replace.** The root becomes the thesis alone, and the dump is archived in the thread. This is the one-paragraph resolved root that Phase 1's exit test aimed for. It also **breaks** twice:

1. **The open knee thread loses its passage.** It is anchored on P5, which no longer exists in the root. Under default 3, its reference follows P5 into the resolution, so it now points at the thesis. When the knee thread resolves later, the splice looks for P5's words in the thesis, does not find them, and **appends the result to the end** (`spliceStepIntoPad` falls back to appending). The result lands in the wrong place, silently.
2. **The evidence would point at itself.** Every quote in the synthesis thread links back to P1 to P7. Those passages were all replaced by the thesis, so under default 3 every link now points at the thesis. The thesis's evidence would be itself.

**Add.** The thesis sits after the dump, and the knee thread keeps its passage. The root reads as the raw material followed by the conclusion. This holds, but the pad card previews the *start* of the root text (`previewText` in `useThinkPadWelcome.js`), so the pick-up grid shows "Nippard: progressive overload…" instead of your answer.

### Day 5: the knee thread resolves late

You settle on split squats, Romanian deadlifts and leg curls, and resolve the knee thread with replace.

- **With the Day 4 add:** P5 is replaced in the root. The synthesis thread's quote of P5 is a copy, so it still reads "deep squats hurt", while its link now leads to the new text. The thesis was built on the old wording.
  - **Friction, and worth surfacing:** "source changed since quoted". The app can detect it by comparing the quote with the current source text. It is a non-blocking mark that prompts you to re-check, and it is display, not judgement, so rule 5 holds.
- **With the Day 4 replace:** see break 1 above. The result lands at the end of the thesis.

Then you tap Focus on this, and the thesis goes to the runner as a plan: week 1, day 1. **Holds**, through the existing bridge.

---

## What the run found

Ranked by consequence.

| # | Finding | Kind | Proposed resolution |
|---|---|---|---|
| 1 | Replacing a passage that contains the anchors of open threads strands them. Their results append at the end later. | Breaks | Extend the gate. Resolving with **replace** requires deciding any open threads anchored inside the replaced passage. Otherwise only **add** is offered. |
| 2 | "References follow a passage into its resolution" makes a thesis's evidence point at the thesis itself when it replaces its own sources. | Breaks | Provenance points at the **draft version** the quote came from ("Draft 3, passage P2"), not only the live passage. Following into a resolution applies to live anchors (open threads, links), never to quotes, which are already copies. |
| 3 | A replace-or-add choice on every resolve is too many decisions on a phone. | Friction | Keep each move's landing as the **default** (Clarify replaces, Doubt adds, and so on), and let you override it. This reverses the review's "delete `writeBack`". |
| 4 | There is no cheap connection outside a thread. Recording "P7 backs my call" takes four steps. | Gap | Let the approved **link** action target a passage in the document as well as a URL. Its target follows resolution (finding 2). |
| 5 | A thesis can rest on a quote whose source has an open thread, or whose source has changed since it was quoted. | Friction | Two non-blocking marks on quotes: "still open" and "changed since quoted". The resolved thesis carries "N sources still open" as a caveat. |
| 6 | A whole-draft synthesis has no gesture on a phone. | Gap | A "Synthesize" action on the level, opening a thread anchored on the whole draft. |
| 7 | The pad does not show its answer. With **add**, the card previews the dump. With **replace**, the dump is gone from view. | Gap | Mark a pad's resolved thesis as **its answer**. The card and, later, Home (Phase 4) show it first. The root keeps its raw material below, which fits **add**. |
| 8 | The document grows: redundancy plus added results lengthen it on a small screen. | Friction | Watch it, don't solve it yet. Collapsing raw material under the answer (finding 7) may be enough. |

What held without change:
- the gathering itself;
- quoting rival claims side by side;
- redundancy, at no cost;
- answering a question by replacement;
- the study beat;
- "one level in view", with the quote picker as a look upward;
- the bridge to the runner;
- built-in moves, because nothing in the run wanted a multi-step library workflow until synthesis, and synthesis is a thread, not a workflow.

## What this implies for the four defaults

1. **Synthesis in a thread with quotes:** stands, with findings 6 and 7 added.
2. **A call or a sharper question, with a thesis as a call:** stands. In the run, the study beat after the thesis naturally produced a sharper question ("which knee-friendly lifts exactly?"). The root has no gate, so it needs finding 7 instead.
3. **References follow into resolution:** stands **only for live anchors**. It must not apply to quotes (finding 2), and replace must be gated on open threads inside the passage (finding 1).
4. **Moves stay built in:** stands. Each move keeps its landing default (finding 3), which reverses the review's recommendation to delete it.

## Open questions this raises for Miguel

1. When a synthesis resolves on the whole draft, should the default be **add** (the answer below the raw material) or **replace** (the answer alone, with the dump archived)? The run favours **add**, with the answer shown first on the card (finding 7).
2. Should a thesis be allowed to resolve while sources it quotes still have open threads, carrying a caveat? The run says **yes**: a thesis can be honest about its open edges.
3. Should links point at passages in the document as well as at URLs (finding 4)?
