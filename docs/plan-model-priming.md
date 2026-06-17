# Plan: Priming the Means-Ends Mental Model

**Date:** 2026-04-16
**Goal:** Make the app's mental model explicit and intentional — not just a structured todo list, but a tool that trains users to think algorithmically through gap-reduction.

---

## The Core Cognitive Framework We're Encoding

**Means-Ends Analysis (Newell & Simon, 1961)**

```
Current State ──── GAP ────► Goal State
                     │
              identify operator
              that reduces gap
                     │
              apply operator
                     │
              reassess gap
              (recurse if needed)
```

Every session in Rep-it IS this loop. The problem title is the current state. Done is the goal state. Each step is an operator. Drilling into a subproblem is identifying a sub-gap that's blocking an operator. Popping back is returning to the parent gap with the sub-gap resolved.

The app already implements this structurally. The plan is to surface it linguistically and at key interaction moments, so the user internalizes the pattern rather than just experiencing the mechanics.

---

## What "Priming" Means

Priming is not labeling everything with "means-ends analysis." It's choosing language and interaction patterns at key moments so the user's inner monologue naturally shifts toward:

> "What's the gap? What would close it? What's blocking the close? Break that block into its own gap."

This is cheap (mostly language/prompt changes), immediately impactful, and sets up the scaffolding for every downstream feature.

---

## Layer 1: Accessible Measures (Language & Framing — No Architecture Changes)

These can be done by changing strings and prompt text. They prime the mental model with zero feature complexity.

### 1.1 Two-Field Session Start

**Current:** One input — "What are you working on?"

**Proposed:** Two inputs:
- **"What's the current situation?"** (current state)
- **"What does done look like?"** (goal state)

The second field can be optional to keep quick-start frictionless. But when filled, it creates a declared gap that the session is explicitly trying to close. This becomes the session's north star — visible throughout.

**Why this is the single highest-leverage change:** It forces the user to articulate both ends of the gap *before* choosing operators (steps). Users who can't answer "what does done look like?" are not ready to plan steps — and the app surfacing this forces the right cognitive preparation.

**UX consideration:** Keep "Focus" mode as one field (quick start, no friction). Only two fields in "Plan" mode.

---

### 1.2 Persistent Gap Header in Session View

**Current:** Session shows [step title] + [timer]. Parent context is a small breadcrumb.

**Proposed:** Show a compact, persistent gap statement above the step:

```
┌─────────────────────────────────────┐
│ Goal: shipping the auth refactor    │  ← goal state (small, muted)
├─────────────────────────────────────┤
│ Plan: extract token validation      │  ← current step (prominent)
│                          04:23 ►    │
└─────────────────────────────────────┘
```

The goal state is a constant reminder of *why* this step exists. It anchors the current operator to the gap it's supposed to close.

**Cognitive function:** Reduces the risk of the user completing steps mechanically without checking whether the gap is actually closing. Keeps System 2 (analytical) engaged on the right question.

---

### 1.3 Subproblem Composer Reframe

**Current prompt:** "What subproblem are you solving?"

**Proposed prompt:** "What's blocking the goal?" or "What gap needs solving first?"

This is one word-level change, but it encodes the correct means-ends structure: a subproblem is not just a nested task — it's an identified blocker in the path to the goal state. The language makes the *reason for drilling down* explicit.

When the user types their subproblem, they're identifying a sub-gap. When they pop back, they've closed it. The vocabulary makes the recursive structure conscious.

---

### 1.4 Step Planning Prompt Reframe

**Current:** Blank step input, placeholder "Step title"

**Proposed:** Prompt text above the step list in Plan mode:

> "What operations will close the gap? Each step should move the situation closer to done."

And each step input's placeholder: `"What's the next move?"`

This frames steps as *operators*, not tasks. The difference is subtle but important: tasks are things you do; operators are things that transform state. The vocabulary nudge trains the user to think about what each step *changes*, not just what it *is*.

---

### 1.5 Session Close / Exit Reflection

**Current:** Exit button → saves → returns to home. No reflection moment.

**Proposed:** On exit, a one-second pause with a minimal reflection card:

```
┌──────────────────────────────────────┐
│  Session done.                       │
│                                      │
│  Goal: shipping the auth refactor    │
│                                      │
│  Gap status:                         │
│  ● Closed — solved it               │
│  ○ Narrowed — made progress         │
│  ○ Still open — blocked             │
│                                      │
│  [Continue]                          │
└──────────────────────────────────────┘
```

**Why this matters:**
- Closes the habit loop (Duhigg) — the reward signal that the brain needs to reinforce the routine
- Activates the Zeigarnik Effect — explicit closure releases the cognitive load of the open problem
- Builds a data point for each session: "was the gap closed?" This is the first seed of mastery tracking
- The three options are themselves means-ends language: did the gap close, narrow, or stay open?

The third option ("Still open — blocked") naturally leads into the intervention/obstacle system, making that schema (already built) finally surface in the UI.

---

## Layer 2: Workflow Injection as "Known Operators for Known Gaps"

This is the conceptual refinement you raised — workflows should be recognized constructs, not dissolved copies.

### The Reframe

In means-ends terms: **a workflow template is a pre-computed sequence of operators proven to close a specific class of gap.**

"Solve Loop" closes the gap: *"I have an unclear problem and need a solution."*
"Frame the Problem" closes the gap: *"I don't understand the problem well enough to solve it."*
"Gather Evidence" closes the gap: *"I'm reasoning from insufficient information."*

Framing workflows this way:
1. Helps users choose the *right* workflow (matching gap type to operator sequence)
2. Makes workflow injection semantically meaningful — "engage this workflow" = "apply this proven operator sequence to my current gap"
3. Creates a richer vocabulary for the workflow library: each workflow has a declared gap type it closes

### Data Model Additions (Discussed, Not Yet Implemented)

**On each workflow template:**
```js
{
  id: ...,
  name: "Solve Loop",
  gapType: "unclear problem needing solution",  // ← new: what gap does this close?
  steps: [...],
}
```

**On injected child nodes (stamping provenance):**
```js
{
  id: ...,
  title: "What problem are you solving?",
  sourceWorkflow: {
    templateId: 7,
    templateName: "Solve Loop",
    stepIndex: 0,
  }
}
```

**On the session (workflow-run as first-class concept):**
```js
workflowRuns: [
  {
    templateId: 7,
    templateName: "Solve Loop",
    parentNodeId: "node_abc",
    childIds: ["node_1", "node_2", "node_3", "node_4"],
    runIndex: 3,        // ← this is the 3rd time this workflow has been run
    startedAt: "...",
    completedAt: null,
  }
]
```

This is the foundation for mastery tracking, scaffold fading, and run-count insights — none of which can be built without this identity layer.

---

## Layer 3: Obstacle / Intervention System (Making the Dark Schema Light)

The schema already has `obstacleTag`, `interventionLog`, `stepRunState`. This is deliberate practice infrastructure sitting unused.

### Means-Ends Obstacle Framing

When a timebox expires, instead of just red text, surface:

```
┌─────────────────────────────────────────┐
│  Time's up on this step.               │
│                                         │
│  What's maintaining the gap?           │
│  ○ The goal is unclear                 │
│  ○ This step is too big                │
│  ○ I need information I don't have     │
│  ○ I got distracted                    │
│  ○ Other                               │
│                                         │
│  [Take an extension]  [Reframe step]   │
│  [Move on]                             │
└─────────────────────────────────────────┘
```

The language "What's maintaining the gap?" is means-ends diagnostic language. The options map to specific remedies:
- "Goal unclear" → suggests engaging "Frame the Problem" workflow
- "Step too big" → suggests drilling into a subproblem (creating a sub-gap)
- "Need information" → suggests "Gather Evidence" workflow
- "Distracted" → extension, no judgment

This operationalizes deliberate practice (Ericsson): you're not just tracking time, you're tracking *where the friction is* so the user can improve over time.

---

## Priority Sequence

### Phase 1: Language (Zero architecture, immediate impact)
1. Two-field session start in Plan mode (current + goal state)
2. Subproblem composer: "What's blocking the goal?"
3. Step planning prompt framing
4. Session close reflection card with gap status

### Phase 2: Persistent Context (Minimal architecture)
5. Goal state visible in session header
6. Step position indicator ("2 of 5")

### Phase 3: Workflow Identity (Architecture work)
7. `gapType` field on workflow templates
8. `sourceWorkflow` stamp on injected child nodes
9. `workflowRuns` array on session state
10. Workflow library surfacing run counts

### Phase 4: Obstacle System
11. Obstacle prompt on timebox expiry
12. Obstacle tag stored to `interventionLog`
13. Aggregate obstacle patterns surfaced over time

---

## The Refined Mental Model (What the User Should Internalize)

> "I have a gap between where things are and where they need to be.
> I select or design operators (steps) that progressively close that gap.
> When an operator fails, I identify what's maintaining the gap and treat that as a sub-gap.
> Workflows are proven operator sequences for known gap types.
> Each session is one traversal of this loop — recorded, resumable, and improvable over time."

This is the inner monologue the app should train. Phase 1 changes alone — all language — begin building it.
