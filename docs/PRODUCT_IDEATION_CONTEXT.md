# PRODUCT_IDEATION_CONTEXT

> **Partially historical.** See [`FRONTEND_PATHS.md`](./FRONTEND_PATHS.md) for current route and store paths.

## Purpose
This document gives another agent enough product context to generate useful feature ideas for Rep-it without re-reading the full codebase. It combines current product reality with near-term direction.

## Product in One Paragraph
Rep-it is a local-first guided work-session app for turning ambiguous work into a runnable sequence of prompts, then executing one prompt at a time with a timer, constrained navigation, and resumable context. Users can start quickly from Home, plan/edit steps before running, drill into subproblems, and resume interrupted threads from local persistence. Near-term product direction is to make reusable workflows more composable during live sessions while preserving the app's core value: clear next action plus high-fidelity resume.

## Core Mental Model (User-Facing)
Use this vocabulary consistently in ideation:

- **Context (thread root):** top-level problem space a user is working in.
- **Problem node:** a node in a tree that can hold child nodes (subproblems or executable steps).
- **Step (execution leaf):** the currently actionable prompt in session mode.
- **Plan surface:** where users define/edit ordered steps.
- **Session surface:** where users execute one visible step at a time with timer and navigation controls.
- **Workflow template:** reusable named step sequence users can attach to work.
- **Engaged workflow:** a workflow materialized into a step as injected child steps.
- **Resumable context:** persisted local snapshot of tree, runtime state, and UI surface.

## Primary User Flow
1. **Home intake:** user defines "done outcome" and "first move", picks a timebox, then chooses Focus or Plan.
2. **Plan (optional):** user edits ordered steps and optional workflow attachments, then starts a session.
3. **Session run loop:** user completes current step, navigates next/previous, plans back/next steps, creates subproblems, and can return to parent context.
4. **Interrupt/resume:** user exits with resume-later or stop-now; snapshots allow return to running or planning state.

## Current Capability Baseline (Implemented)
### Focus Surfaces
- Home, Plan, Session routing is active and guarded through `MainLayout` + router context checks.
- Home supports dual-path start (quick Focus or explicit Plan) and resume card behavior.
- Session supports one-step display, completion toggle, adjacent-step navigation, subproblem creation, and parent return.

### Workflow Surfaces
- `/workflows` is its own tool: library, editor, and a picker that answers other tools' requests for steps.
- A workflow is a template only: name, the gap it closes, ordered steps, a use count. Using it copies (stamps) its steps; later edits never touch work already started.
- Any step can be a decision step with a set of outputs (or a free answer). Running it finishes by choosing an output, not by Complete.
- Workflows supply steps through the handoff: decompose a Focus step ("A workflow" in the Decompose dialog), start a new context ("Run as new context"), or receive a Focus plan ("Save as workflow").

See **Build State and Backlog** below for what is built and what is designed but not built.

### Domain + Persistence Foundation
- Tree/graph mutations are centralized in pure domain mutators.
- Runtime completion and elapsed-time state are tracked per node.
- Resume snapshots include graph shape, session state, route surface, and notes in IndexedDB.
- Domain behavior has broad unit-test coverage for navigation, state, projections, and mapping.

## UX Principles Evident in the Product
- **Guided cognition, not blank-page paralysis:** the document is always anchored to a stated outcome (the goal frames the page); free writing is encouraged, but structure must *emerge* from it — highlighted spans become runnable steps that converge into timed, single-step execution. The enemy is the unbounded blank canvas / note vault, not free text itself.
- **Constraint-first progress:** completion and navigation rules intentionally shape focused execution behavior.
- **Progressive disclosure:** advanced guardrails and workflow operations are available but not dominant in primary flow.
- **Interruption resilience:** resume fidelity is a core promise, not an edge feature.
- **Context preservation:** focus tree and note projection keep users oriented across nested work.

## Friction and Conceptual Tensions (High-Signal for Ideation)
- Terminology overlap (`focus`, `plan`, `session`, `context`, `problem`, `thread`) can increase onboarding load.
- Two workflow modes (standalone run vs in-session engagement) are powerful but cognitively expensive.
- Attach vs engage semantics are clear in code but may feel subtle in UX copy and affordances.
- Completion-gated navigation reinforces discipline but may conflict with exploratory user behavior.
- Intervention-related state exists, but full intervention UX appears only partially surfaced.

## Near-Term Product Direction (Hypotheses, Not Commitments)
These are directional hypotheses intended to guide ideation:

- Make workflows feel like reusable "thinking algorithms" that can be attached, engaged, and eventually simplified with mastery.
- Improve clarity of cross-surface transitions so users always understand where they are (home/plan/session/workflow-run) and why.
- Convert interruption handling from "save state" into "fast cognitive re-entry" (resume context cues).
- Expand support for practice-oriented feedback loops (completion signals, reflection points, and lightweight progression cues).

## Build State and Backlog (2026-11-23)

### Built
- **Handoff between tools** (`src/handoff/`): tools never import each other. A source creates a handoff (`from`, `to.intent`, `task`); the target consumes it once and writes a `result` (`status`, `minutes`, `output: { text?, items? }`). Intents: `start-session`, `decompose`, `pick-steps`, `save-steps`.
- **Shared step type** (`src/handoff/steps.js`): `{ title, decision?: { options } }`, used by workflows, ThinkPad returns, and Focus plans.
- **Focus plans**: a focus can hold an ordered plan. Steps are done per step (out of order is allowed). Completing a step moves to the next undone one. Leaving a step via the panel keeps its note and does not mark it done.
- **Focus card shows only the current focus.** No next step, no step list. Between steps it offers one "Continue plan" button.
- **Steps side panel** (beside the card): the whole plan, each step's choice and reflection, click to switch steps, "Save as workflow".
- **Complete never prompts.** Reflect is an opt-in button per step. A step's reflection is kept on the plan when the step closes.
- **Decision steps**: chosen output stored on the plan, separate from the reflection.
- **Decompose via ThinkPad**: ThinkPad opens a pad with a side column for the steps to send back.
- **Workflows tool**: see Workflow Surfaces above. The five starter workflows from `GENERIC_PROBLEM_SOLVING_WORKFLOWS.md` seed once.

### Decisions settled (do not reopen without the user)
- A workflow is only its steps. Anything it needs you to consider or produce is encoded as a step, a decision step where an output is required. There are **no workflow-level notes**.
- Notes belong to the **execution**, in the context where the workflow ran, never to the template.
- Templates are stamped: copied on use, never linked to a run.
- The card shows the current step and only the current step. The side panel is the fallback for seeing the whole plan and pivoting.
- Gap status at plan end is offered **only when there are open items**.
- Workflows are a supplier of steps: anything that ingests steps can consume them through the handoff.

### Designed, not built
1. **Notes pane (shared notes tool).** One notes tool that any layout hosts in a side slot (via a pane registry, so Focus does not import ThinkPad), not separate notes for each tool. A note reuses ThinkPad's idea record: `text`, optional one-line `result` (the chunk that folds up), optional `intent` (question, doubt, decision, idea…), `status` (parked/active/resolved), and an `anchor` generalized to a Focus step. The pane is scoped to the current step with earlier notes collapsed, plus "Open in ThinkPad". It replaces the inline `stepResults` reflections. Grounding: `recursive-resolve-contract.md` §3 (fold the chunk; cue always-on, content on demand) and `batch-reflection-research.md` §2.5 (saving-enhanced memory).
2. **Open items and gap status.** On completing a step that has open notes (question/doubt), a one-line "carry up, resolve, or drop". At plan end, when open items exist, a whole-plan read showing each step's result against the goal and a gap status: Closed, Narrowed, Still open, Reframed. Depends on 1.
3. **ThinkPad consumes workflows** (`pick-steps` from ThinkPad, e.g. start an investigation from a workflow). Open: do steps land as threads or as prompts in the document?
4. **Decision authoring outside workflows**: mark a step as a decision in the Focus Decompose dialog and in ThinkPad's returned steps. Today only the workflow editor can.
5. **New context from a workflow inside Focus** (the New context dialog). Today a routine is started from the workflow editor's "Run as new context".
6. **Steps panel in every layout.** It only shows in stack view with a Focus area at least 440px wide. Rail view and narrow layouts need another home (e.g. a drawer).
7. **Editing a plan mid-run**: reorder, rename, add, or remove steps. Today you can only switch steps.
8. **Re-entry cue.** Rename Stop's "waiting on" to a "next move" line, and show the last result, the next move, and open-note count on resume (Altmann & Trafton resumption cues).
9. **Timer across a handoff.** No pause rule: elapsed time is banked when Focus unmounts and the clock restarts on return.
10. **Active context across reload.** `activeContextId` is not persisted, so after a reload the waiting chip shows only once you reselect that context.
11. **`deliberate` side-thought handoff**: from a running step, open ThinkPad to think about one question and return a single note to the step.
12. **Blank pad leftover**: arriving in ThinkPad from a handoff can leave an empty pad behind (harmless; reused later).

### Open questions
- Should a decision's chosen output be able to branch the plan (different next steps per option)? Not requested; today a decision gates progress only.

## Agent Ideation Prompts (Problem -> Hypothesis -> Validation Signal)
- **Problem:** users may not understand when to plan vs focus.  
  **Hypothesis:** contextual guidance on Home improves correct entry-point choice.  
  **Validation signal:** lower back-and-forth switching between Plan and Session in first run.

- **Problem:** workflow attach/engage concepts are mentally heavy.  
  **Hypothesis:** explicit affordance and copy framing ("attach template" vs "run inside this step") reduces misfires.  
  **Validation signal:** fewer abandoned workflow interactions before engagement.

- **Problem:** resume experience restores state but may not restore momentum.  
  **Hypothesis:** richer resume summary (position + elapsed + intended next move) increases completion after resume.  
  **Validation signal:** higher resumed-session completion rate.

- **Problem:** intervention capability is under-leveraged.  
  **Hypothesis:** lightweight obstacle tagging on expiry improves future step planning quality.  
  **Validation signal:** fewer repeated expiry loops on similar step types.

- **Problem:** users do not see learning progression from repeated workflow use.  
  **Hypothesis:** simple run-history feedback strengthens habit retention and template reuse.  
  **Validation signal:** increased repeat runs per workflow over time.

## Assumptions for Ideation Sessions
- Local-first persistence and offline-friendly behavior remain default.
- Product scope stays individual-focused (not team PM/collaboration unless explicitly requested).
- Session-first ergonomics are prioritized over broad feature breadth.
- Domain invariants around graph integrity, selection, and resumability must be preserved.

## Non-Goals for Near-Term Ideation
- Multi-user collaboration and cloud synchronization.
- Transforming Rep-it into a general-purpose task manager or note vault.
- Note-vault sprawl: free-form editing that is **not** anchored to an outcome and never converges into single-step execution. (The think-pad document — a goal-framed surface whose highlights become runnable steps, then get overwritten by their results — is in scope; an unbounded notes app is not.)

## Source Anchors
- `docs/FRONTEND_PATHS.md` (current paths)
- `src/handoff/` (tool registry, handoff, shared step type)
- `src/workflows/`, `src/focus/`, `src/thinkpad/`
- Historical (removed views, kept for intent): the anchors below.
- `docs/PRODUCT_AGENT_CONTEXT.md`
- `docs/feature-science-map.md`
- `src/router/index.js`
- `src/layouts/MainLayout.vue`
- `src/views/Home.vue`
- `src/views/Session.vue`
- `src/views/WorkflowBuilder.vue`
