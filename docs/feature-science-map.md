# Feature-to-Science Map: Rep-it / Mindstream

> **Partially historical.** Implementation references below describe the removed workflow/session UI where noted. See [`FRONTEND_PATHS.md`](./FRONTEND_PATHS.md) for current paths.

**Date:** 2026-04-16
**Purpose:** Map every implemented feature to the psychological principle it (intentionally or accidentally) leverages, score alignment, and identify refinement opportunities.

---

## Legend

| Alignment | Meaning |
|-----------|---------|
| **STRONG** | Feature directly implements the principle with clear fidelity |
| **PARTIAL** | Feature touches the principle but misses key aspects |
| **LATENT** | Infrastructure exists but the principle is not yet surfaced to the user |
| **ABSENT** | Principle is relevant but has no corresponding feature |

---

## 1. Single-Step Focus (Show One Step at a Time)

**Implemented in:** `Session.vue` — displays only the current step title as a large heading. No step list visible in the main panel.

**Principles aligned:**
| Principle | Alignment | Notes |
|-----------|-----------|-------|
| Working Memory (Cowan's 4 chunks) | **STRONG** | One step = one chunk. User's WM is free for actual work. |
| Cognitive Load Theory (Sweller) | **STRONG** | Eliminates extraneous load of "what's next?" decisions. Converts freed capacity into germane load. |
| Progressive Disclosure | **STRONG** | Only current step is prominent. |
| Dual Process (Kahneman) | **STRONG** | Navigation requires near-zero System 2 engagement. |

**Refinement opportunities:**
- *None critical.* This is one of the app's strongest design choices. The single-step view is the core cognitive lever.
- **Minor:** Consider showing a subtle "2 of 5" progress indicator (not the full list) to satisfy the Completion Effect (Sweller) without breaking the single-focus benefit. Currently there is no step-position indicator in the session view.

---

## 2. Timer / Timebox System

**Implemented in:** `useTimer.js`, `sessionTimerSync.js`, `sessionState.js`. Timer counts up per step. Timeboxes of 5/10/15 minutes. Red text on expiry.

**Principles aligned:**
| Principle | Alignment | Notes |
|-----------|-----------|-------|
| Pomodoro / Time-boxing research | **PARTIAL** | Timer exists but defaults to 5/10/15 min, not the research-supported 25-min interval. No break prompts. |
| Flow (Csikszentmihalyi) | **PARTIAL** | Clear progress signal exists (elapsed time), but no challenge-skill calibration. |
| Attention Restoration (Kaplan) | **ABSENT** | No break suggestions after timebox expiry. Timer expires → red text, but no restoration prompt. |
| Goal-Setting (Locke & Latham) | **PARTIAL** | Timebox sets a challenge, but the "soft nudge only" design undercuts the specificity/challenge principle. |
| Habit Loop — Reward | **PARTIAL** | No completion celebration or reward signal when timebox ends successfully. |

**Refinement opportunities:**
- **Break prompts after session completion.** When a timebox expires or the user finishes all steps, show a brief "Take a 5-min break" prompt. This operationalizes Attention Restoration Theory. Currently the app just shows red timer text — which feels punitive rather than restorative.
- **Suggest longer timeboxes.** 5/10/15 are useful for quick tasks, but Pomodoro research supports 25-minute intervals as the sweet spot. Consider adding 25 min as a first-class option.
- **Completion reward signal.** When all steps are done within the timebox, provide a clear positive feedback moment (could be as simple as a checkmark animation + "Session complete" card). This closes the habit loop.

---

## 3. Focus Stack / Subproblem Drilling

**Implemented in:** `sessionNavigation.js` — `pushFocus()`, `popContext()`. Breadcrumb in Session.vue. "Back to parent" link.

**Principles aligned:**
| Principle | Alignment | Notes |
|-----------|-----------|-------|
| Means-Ends Analysis (Newell & Simon) | **STRONG** | Drilling into subproblems IS means-ends analysis. User identifies sub-goal, works it, pops back. |
| Task Decomposition (Goal-Setting) | **STRONG** | Subproblems = sub-goals. The hierarchy maps directly to goal decomposition. |
| Working Memory off-loading | **STRONG** | The breadcrumb externalizes "where was I?" so the user doesn't have to remember. |
| Distributed Cognition (Hutchins) | **STRONG** | The tree structure holds the problem decomposition as a cognitive artifact. |
| Computational Thinking — Decomposition | **STRONG** | Creating subproblems mid-session teaches decomposition as a natural reflex. |

**Refinement opportunities:**
- **Visualize the problem space.** The focus stack is currently just a breadcrumb. Consider a minimal tree visualization (even just an indented outline on the side panel) that shows the user's traversal through the problem space. This makes the means-ends analysis *visible*, reinforcing the algorithmic thinking pattern. The `FocusTreePanel.vue` exists but could be framed more explicitly as "your problem space."
- **Name the pattern.** The app teaches means-ends analysis without naming it. A subtle label like "Problem → Sub-problems" in the UI would make the cognitive pattern explicit, which accelerates internalization (ACT-R declarative stage benefits from naming).

---

## 4. Workflow Templates (Reusable Step Sequences)

**Implemented in:** `workflowLibraryDb.js`, `WorkflowEditor.vue`, `WorkflowRun.vue`. Templates with named steps + per-step durations. Built-in presets: "Solve loop", "Frame the problem", etc.

**Principles aligned:**
| Principle | Alignment | Notes |
|-----------|-----------|-------|
| Distributed Cognition (Hutchins) | **STRONG** | Workflows are cognitive artifacts that encode expertise. "Past-you helps present-you." |
| Implementation Intentions (Gollwitzer) | **PARTIAL** | Workflows ARE if-then plans, but the app doesn't frame them as contextual triggers. No "when X happens, run this workflow" binding. |
| ACT-R — Declarative stage | **STRONG** | Workflow steps provide the explicit declarative knowledge needed for the cognitive stage. |
| Pattern Recognition (Computational Thinking) | **STRONG** | Reusable templates = recognized patterns extracted from experience. |
| Habit Loop — Routine | **STRONG** | The workflow IS the routine in the cue-routine-reward loop. |

**Refinement opportunities:**
- **Contextual triggers.** Allow users to associate a workflow with a trigger context: "Use this workflow when starting a new feature" or "Use this when debugging." This operationalizes Gollwitzer's implementation intentions, which have a d=0.65 effect size — one of the strongest interventions in the research. Currently workflows are library items with no situational binding.
- **Workflow repetition tracking.** Track how many times a workflow has been run. This data feeds Fitts & Posner stage assessment, spaced repetition scheduling, and scaffold fading decisions. Currently `workflowInstances` are logged but not surfaced to the user.
- **Preset framing as "thinking algorithms."** The built-in presets ("Solve loop", "Frame the problem") are already algorithmic thinking templates. Making this explicit in the UI — "These are algorithms for thinking" — sharpens the mental model the app presents and connects to Computational Thinking.

---

## 5. Workflow Injection (Linking Workflows to Steps)

**Implemented in:** `graphMutators.js` — `injectWorkflowSteps()`. A step can have a `workflowId`; engaging it copies workflow steps as children.

**Principles aligned:**
| Principle | Alignment | Notes |
|-----------|-----------|-------|
| Scaffolding (Vygotsky ZPD) | **STRONG** | This IS scaffolding. User has a step they don't know how to do → engage a workflow → scaffold appears as child steps. |
| Cognitive Load — Worked Example Effect | **STRONG** | Injected workflow steps are a worked example for "how to do this step." |
| Behavioral Chunking | **PARTIAL** | The injection expands a chunk into sub-steps. But there's no mechanism to re-collapse it after mastery (the "fading" part of scaffolding). |

**Refinement opportunities:**
- **Scaffold fading.** After a user has engaged the same workflow injection N times, offer to "collapse" or simplify it. "You've done this 5 times — want to skip the sub-steps next time?" This implements the critical fading mechanism from scaffolding theory. Currently injection is always full expansion with no memory of past use.
- **"I know this" shortcut.** Allow the user to mark an injected workflow as mastered, skipping expansion in future sessions. This respects the Dreyfus progression from rule-following to intuition.

---

## 6. Resumable Sessions

**Implemented in:** `resumableSessionsDb.js`, `resumableContextMapper.js`. Full snapshot to IndexedDB: tree, state, active node, timer, config.

**Principles aligned:**
| Principle | Alignment | Notes |
|-----------|-----------|-------|
| Working Memory off-loading | **STRONG** | "Where was I?" is fully externalized. Zero cognitive cost to resume. |
| Distributed Cognition — Temporal | **STRONG** | Past-session-you saved context for present-you. This is temporal distribution of cognition. |
| Habit Loop — Friction reduction | **STRONG** | One-click resume eliminates the System 2 cost of "what was I doing?" |

**Refinement opportunities:**
- **Resume context summary.** When resuming, briefly show: "You were on step 3 of 5: 'Execute the plan'. 7:23 elapsed." This primes the user's working memory with just enough context to re-enter the problem space without having to reconstruct it. Currently the resume card shows root problem + current step title but not position or elapsed time.
- **Session history (not just last session).** Allow resuming from multiple past sessions. This supports users who interleave multiple problem-solving threads across days.

---

## 7. Step Completion Tracking

**Implemented in:** `sessionState.js` — `nodeStateMap` with `done` boolean per node. Toggle checkbox in Session.vue. Timer pauses when step is done.

**Principles aligned:**
| Principle | Alignment | Notes |
|-----------|-----------|-------|
| Goal-Setting — Feedback | **STRONG** | Checkbox = immediate feedback. Done/not-done is unambiguous. |
| Flow — Immediate feedback | **STRONG** | Instant visual change on completion. |
| Completion Effect (Sweller) | **PARTIAL** | Individual steps complete, but no workflow-level progress indicator. |
| Habit Loop — Reward | **PARTIAL** | Step completion provides micro-reward, but no macro-reward at workflow completion. |

**Refinement opportunities:**
- **Workflow-level completion signal.** When all steps are done, show a distinct "workflow complete" moment. Not a gamified celebration, but a clear cognitive closure signal. This leverages the Zeigarnik Effect (incomplete tasks occupy working memory; explicit completion releases them).
- **Progress fraction visible.** A subtle "3/5" or thin progress bar reinforces the Completion Effect without cluttering the single-step focus.

---

## 8. Plan Mode (Step Editor Before Session)

**Implemented in:** `WorkflowBuilder.vue`. User defines steps before running. Add/remove/reorder steps. Link workflows to steps.

**Principles aligned:**
| Principle | Alignment | Notes |
|-----------|-----------|-------|
| Implementation Intentions (Gollwitzer) | **STRONG** | Planning steps in advance IS forming implementation intentions. |
| Computational Thinking — Algorithmic design | **STRONG** | User is literally writing an algorithm for their work session. |
| Means-Ends Analysis | **STRONG** | User is pre-computing a path through the problem space. |
| ACT-R — Declarative encoding | **STRONG** | Writing steps forces explicit declarative encoding of the process. |

**Refinement opportunities:**
- **Guided planning prompts.** The plan mode is currently a blank step list. Consider optional prompts: "What's the goal?", "What's the first concrete action?", "What will you check at the end?" This guides the decomposition process and makes the computational thinking explicit. Currently it relies on the user already knowing how to decompose.
- **Template suggestions during planning.** "This looks like a debugging session — want to use the 'Solve loop' template?" This connects user intent to existing cognitive artifacts.

---

## 9. Focus / Quick Start Mode

**Implemented in:** Home.vue — "Focus" button creates one auto-step and starts immediately.

**Principles aligned:**
| Principle | Alignment | Notes |
|-----------|-----------|-------|
| Dual Process — System 2 conservation | **STRONG** | Minimal decisions to start. User may arrive System 2-depleted; one click gets them working. |
| Habit Loop — Friction reduction | **STRONG** | Lowest possible barrier to entry. |
| Pomodoro — Time constraint | **PARTIAL** | Timebox selected, but single auto-step means no structured workflow guidance. |

**Refinement opportunities:**
- **Focus mode + workflow suggestion.** After quick-starting a focus session, offer a non-intrusive suggestion: "Want to add structure? Try the Solve Loop." This bridges the gap between "just start working" and "follow a process" without forcing it. Respects SDT autonomy while offering scaffolding.

---

## 10. Intervention System (Partially Implemented)

**Implemented in:** `resumableContextMapper.js` schema — `pendingIntervention`, `expiryCount`, `lastExpiryReason`, `obstacleTag`, `interventionLog`, `stepRunState`. States: "active", "expired-awaiting-decision", "paused-for-reframe".

**Principles aligned:**
| Principle | Alignment | Notes |
|-----------|-----------|-------|
| Deliberate Practice — Target weaknesses | **LATENT** | Obstacle tagging could identify where users struggle. Infrastructure exists but isn't surfaced. |
| Attention Restoration (Kaplan) | **LATENT** | "Paused-for-reframe" could be a restoration micro-break. Not yet connected to the UI. |
| Flow — Challenge-skill recalibration | **LATENT** | Reframing after expiry could adjust difficulty. Not yet implemented. |
| Metacognition / Self-regulation | **LATENT** | Interventions could prompt reflection ("What's blocking you?"). Schema supports it. |

**Refinement opportunities:**
- **This is the highest-leverage area for refinement.** The schema already supports a rich intervention model, but none of it surfaces in the UI yet.
- **Obstacle reflection prompt.** When a timebox expires, instead of just red text, prompt: "What's blocking this step?" with quick-select tags (e.g., "unclear goal", "too complex", "need more info", "distracted"). This operationalizes deliberate practice's "target weaknesses" principle and builds a dataset for self-improvement.
- **Reframe as restoration.** "Paused-for-reframe" should feel restorative, not punitive. Frame it as: "Take a breath. Restate what you're trying to do." This aligns with Attention Restoration Theory — the reframe is the restoration.
- **Intervention log as learning data.** Surface aggregated intervention data: "You tend to get stuck on 'Execute' steps — consider breaking them down further." This closes the deliberate practice feedback loop.

---

## 11. Audio Cues

**Implemented in:** `playWorkflowCue()` — sound on auto-advance in workflow runs.

**Principles aligned:**
| Principle | Alignment | Notes |
|-----------|-----------|-------|
| Flow — Immediate feedback | **PARTIAL** | Audio is a feedback channel, but only on auto-advance. No sound on manual completion. |
| Habit Loop — Reward signal | **PARTIAL** | Could serve as reward cue, but currently just a transition signal. |
| Attention — Multi-sensory engagement | **PARTIAL** | Audio engages a second sensory channel, which is good for attention maintenance. |

**Refinement opportunities:**
- **Distinct sounds for distinct events.** Completion sound (reward), expiry sound (gentle nudge), session-complete sound (closure). Different tones for different meanings. Currently there's one cue for one event.
- **Ambient mode.** Optional low-key ambient sound during active work (research shows certain background sounds support focus). This is lower priority but aligns with attention maintenance research.

---

## 12. Constrained Mode / Power Settings

**Implemented in:** `WorkflowBuilder.vue` power settings — constrained mode, force intervention on expiry, extension allowances.

**Principles aligned:**
| Principle | Alignment | Notes |
|-----------|-----------|-------|
| Goal-Setting — Challenge | **STRONG** | Constraints increase challenge, which increases performance (Locke & Latham). |
| Flow — Challenge-skill balance | **PARTIAL** | Constraints raise challenge, but there's no dynamic adjustment based on user skill. |
| Self-Determination — Autonomy | **STRONG** | User opts into constraints voluntarily. This is autonomous constraint, not imposed. |

**Refinement opportunities:**
- **Graduated constraint presets.** "Gentle" (no time pressure), "Focused" (timebox + soft nudge), "Deep work" (strict timebox + intervention on expiry + limited extensions). Named presets reduce decision cost while offering appropriate challenge levels for different skill stages.

---

## ABSENT PRINCIPLES — Not Yet Implemented

These principles are well-supported by research and highly relevant to the app's goals, but have no corresponding feature:

### A. Spaced Repetition for Workflow Practice
**Theory:** Ebbinghaus forgetting curve + spaced repetition research
**Gap:** No mechanism to remind users to practice workflows at expanding intervals.
**Recommendation:** After a user creates or first runs a workflow, schedule gentle prompts: "Run your 'Solve Loop' today — last practiced 3 days ago." Intervals expand as the workflow becomes habitual.

### B. Mastery / Competence Progression
**Theory:** Fitts & Posner stages, Dreyfus model, SDT competence need
**Gap:** No tracking of user improvement over time. Every workflow run is treated identically whether it's the 1st or 50th.
**Recommendation:** Track per-workflow metrics: run count, avg time per step over runs, completion rate. Surface a simple "You've run this 12 times — avg step time decreased 40%" insight. This feeds the competence need (SDT) and helps users see their own skill acquisition arc.

### C. Scaffold Fading
**Theory:** Vygotsky ZPD, Dreyfus novice→expert, ACT-R proceduralization
**Gap:** Workflows never simplify with mastery. A user who has run "Solve Loop" 50 times sees the same 4 steps with the same detail as on run 1.
**Recommendation:** After N runs, offer: "You seem to have this down. Want a condensed version?" Allow collapsing familiar workflow steps into single checkpoints. The measure of success is the user needing the tool less.

### D. Explicit Habit Loop Closure (Reward)
**Theory:** Duhigg/Wood habit loop, Goal-Setting feedback
**Gap:** No explicit reward moment at session/workflow completion. Session just... ends. User clicks "Exit" and returns to home.
**Recommendation:** Show a brief completion card: "Session complete. 4/4 steps done in 12:34." This is the reward that closes the habit loop and signals cognitive closure (Zeigarnik Effect).

### E. Workflow Sharing / Social Dimension
**Theory:** SDT relatedness need, Distributed Cognition (social distribution)
**Gap:** Fully local-first, no sharing mechanism.
**Recommendation:** Export/import workflow templates as JSON or shareable links. "An expert creates, a novice benefits" (Hutchins). This is lower priority for a local-first tool but important for long-term motivation.

---

## SYNTHESIS: The Mental Model Rep-it Presents

### Current mental model (implicit):
> "Enter what you're working on → follow steps → use a timer → done."

### Refined mental model (explicit, science-backed):
> "You're building **thinking algorithms** — reusable procedures that turn chaotic problem-solving into structured execution. Each time you run a workflow, your brain is compiling it from conscious rule-following into automatic expertise. The app holds the process so your mind can focus on the substance. Over time, you'll need the steps less — that's the goal."

### How to sharpen this in the UI:
1. **Name it.** Call workflows "thinking algorithms" or "problem-solving procedures" — not just "workflows." Language shapes mental models.
2. **Show the arc.** "Run 1: Learning the steps → Run 5: Getting faster → Run 15: Automatic." Even a simple progress label reframes the experience as skill acquisition, not task management.
3. **Frame completion as training.** "Session complete — one more rep toward mastery" instead of just returning to home. This connects to deliberate practice framing.
4. **Make the scaffold explicit.** "This workflow is training wheels for [skill]. The goal is to not need it." This is counterintuitive for an app (most want you dependent), but it builds trust and aligns with scaffolding theory.

---

## PRIORITY REFINEMENTS (Ranked by Impact × Feasibility)

| # | Refinement | Theory Basis | Impact | Effort |
|---|-----------|-------------|--------|--------|
| 1 | Completion card at session end (close the habit loop) | Habit Loop, Zeigarnik, Goal-Setting | **HIGH** | Low |
| 2 | Step position indicator ("2 of 5") | Completion Effect, Flow feedback | **HIGH** | Low |
| 3 | Obstacle reflection prompt on timebox expiry | Deliberate Practice, Metacognition | **HIGH** | Medium |
| 4 | Workflow run counter + improvement insight | SDT Competence, Fitts & Posner | **HIGH** | Medium |
| 5 | Contextual triggers for workflows (implementation intentions) | Gollwitzer (d=0.65) | **HIGH** | Medium |
| 6 | Resume context summary (step position + elapsed) | Working Memory, Distributed Cognition | **MEDIUM** | Low |
| 7 | Break prompt after session | Attention Restoration, Pomodoro | **MEDIUM** | Low |
| 8 | 25-min timebox option | Pomodoro research | **MEDIUM** | Trivial |
| 9 | Scaffold fading ("simplify after N runs") | Vygotsky, Dreyfus | **MEDIUM** | High |
| 10 | Distinct audio cues for different events | Habit Loop, Multi-sensory | **LOW** | Medium |
| 11 | Graduated constraint presets | Flow, Goal-Setting | **LOW** | Medium |
| 12 | Spaced repetition reminders | Ebbinghaus, Habit Formation | **LOW** | High |

---

## Appendix: Theory Quick Reference

| Theory | Key Author(s) | Core Claim | Rep-it Relevance |
|--------|--------------|------------|-------------------|
| ACT-R | Anderson | Knowledge compiles from declarative → procedural through practice | Workflows accelerate this compilation |
| Fitts & Posner | Fitts, Posner | Skill moves through cognitive → associative → autonomous stages | App should adapt to user's stage |
| Dreyfus Model | Dreyfus & Dreyfus | Novice → Expert: rule-following → intuition | Scaffold fading matches this arc |
| Habit Loop | Duhigg, Wood | Cue → Routine → Reward drives habit formation | App needs all three elements |
| Implementation Intentions | Gollwitzer | If-then plans dramatically improve goal attainment (d=0.65) | Workflows ARE if-then plans |
| Working Memory | Miller, Cowan | 3-4 active chunks max | One step at a time is correct |
| Cognitive Load | Sweller | Minimize extraneous, maximize germane load | App frees capacity for real work |
| Flow | Csikszentmihalyi | Clear goals + feedback + challenge-skill balance = absorption | Timer + steps + completion tracking |
| Attention Restoration | Kaplan | Directed attention fatigues; needs recovery | Break prompts after sessions |
| SDT | Deci & Ryan | Autonomy + competence + relatedness drive motivation | User owns workflows, sees growth |
| Scaffolding | Vygotsky | Support in ZPD, then fade as competence grows | Workflows simplify with mastery |
| Distributed Cognition | Hutchins | Cognition spans people, tools, and time | App is external process memory |
| Means-Ends Analysis | Newell & Simon | Problem solving = search through state space | Focus stack IS state-space navigation |
| Deliberate Practice | Ericsson | Structured practice targeting weaknesses beats raw hours | Track where users struggle |
