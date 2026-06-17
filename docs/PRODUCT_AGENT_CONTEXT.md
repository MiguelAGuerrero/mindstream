# Rep-it — product context for agents

> **Partially historical.** Route and store paths below may reference removed views. See [`FRONTEND_PATHS.md`](./FRONTEND_PATHS.md) for current paths.

Use this document as **system or top-of-thread context** when handing work to another agent. Trim sections if the model has a tight context limit.

---

You are assisting with **product development** for **Rep-it** (the user-facing brand). The codebase/repo may be named *mindstream*; IndexedDB uses `rep-it_local` (legacy `mindstream_local` is migrated on first load) for local-only persistence.
The stack is **Vue 3 + Vite + Vuetify**, with **local persistence** (IndexedDB) for resumable sessions.

## What the product is

Rep-it is a **local, browser-based guided work-session app**. Users name what they’re working on (**problems**), define or choose an ordered list of **prompts** (**steps**), and **run a session**: one step visible at a time, with a **timer**, next/previous navigation, and the ability to **exit** with “resume later” or “stop now.”

## Product intent (why it exists)

1. **Attention + procedure**: Hold focus not only with time on task but with **clear “what to think/do next” prompts**—bridging Pomodoro-style sessions and structured thinking.
2. **Externalized methodologies**: Let users **capture processes they learned elsewhere** (courses, mentors, playbooks) as **reusable workflows** and **practice them** in-session, not only store them in notes.
3. **Resumable cognitive threads**: Preserve **where the user was** (focus stack, step index, timer, linked problems) so they can **continue the same thread** after interruption—local-first, not team project management.

## Core domain model (language to use consistently)

- **Problem**: A named intention with an ordered list of **steps** (each step is primarily a text prompt).
- **Session / run**: Timed traversal of steps for the focused problem.
- **Focus stack**: Nested **subproblems** (breadcrumb “focus path”); user can drill down and pop back.
- **Context switch**: A **sibling** problem under the same parent—parallel branches, not only linear depth.
- **Workflow**: A **named, reusable** template of steps (product direction: workflows should be **first-class**—including **injecting** a workflow’s steps into the current session as normal navigable steps, not only opening a nested subproblem).
- **Resumable context**: Snapshot persisted locally (problems in thread, links, stack, step index, timer).

## Strategic gap to protect

The product is **not** primarily a todo app, note vault, or team PM tool. Differentiation is: **structured prompts during real work + stack navigation + faithful resume**. Features should reinforce **step clarity, stack clarity, and resume fidelity**.

## Audiences (prioritize product decisions)

- Self-directed learners and **craft practitioners** (e.g. devs) who want **runnable playbooks**.
- Knowledge workers with **ill-defined** tasks who benefit from **prompted** sequences.
- People in **high-interruption** contexts who need **one next prompt** and **pick up where they left off**.

## Product development principles for this codebase

- Prefer changes that make **workflows** creatable, discoverable, and **composable** (e.g. inject steps into current problem vs. optional deep subproblem).
- Preserve or improve **resumable snapshot** correctness when adding state (new fields must serialize/deserialize safely).
- Keep the UX **session-first**: minimal friction from intent → running → resume.
- Avoid scope creep into **team collaboration, cloud sync, or full document editing** unless explicitly requested.

## Current implementation notes (for engineering-aware product work)

- Main orchestration lives in **`src/App.vue`** (state machine: home → creating-steps → running).
- **`src/views/WorkflowBuilder.vue`** + **`src/components/StepEditor.vue`** handle step editing; step editor can suggest **workflow names** when registered.
- **`src/views/Session.vue`** is the in-session shell (navigation, subproblem, context switch, engage workflow).
- **`src/persistence/resumableSessionsDb.js`**: IndexedDB store for resumable threads.
- **Presets** (e.g. “Solve loop”, cognitive drill-down sequences) exist in logic but may not all be exposed in UI—treat as **product backlog** for surfacing and tuning.
- For graph/status invariants and mutator-test guidance, read **`docs/GRAPH_STATUS_AGENT_CONTEXT.md`** before changing node/edge representation, completion logic, or focus rules.

When proposing features, tie them to **user outcomes** (run a method, stay in thread, resume accurately) and call out **tradeoffs** (e.g. inline injected steps vs. nested stack depth, editing vs. frozen templates).
