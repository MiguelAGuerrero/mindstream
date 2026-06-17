# Agentic Graph Audit Handoff Plan

> **Historical document.** Audit targets the removed graph/session stack. See [`FRONTEND_PATHS.md`](./FRONTEND_PATHS.md) for current paths.

Use this plan to run a read-only architecture audit in a new agent session.

## Goal

Validate whether the current problem/sub-problem/workflow/step model satisfies a graph-first design where steps are first-class nodes, links are node-to-node, and timer/selector state is coherent and reconstructible.

## Scope

- `C:/Users/Migue/dev/mindstream/src/layouts/MainLayout.vue`
- `C:/Users/Migue/dev/mindstream/src/domain/graphMutators.js`
- `C:/Users/Migue/dev/mindstream/src/domain/resumableContextMapper.js`
- `C:/Users/Migue/dev/mindstream/src/persistence/resumableSessionsDb.js`
- `C:/Users/Migue/dev/mindstream/src/composables/useTimer.js`
- `C:/Users/Migue/dev/mindstream/src/composables/useSessionRunner.js`
- `C:/Users/Migue/dev/mindstream/src/domain/workflowSessionRunner.js`
- `C:/Users/Migue/dev/mindstream/src/views/WorkflowRun.vue`
- `C:/Users/Migue/dev/mindstream/src/components/FocusTreePanel.vue`
- `C:/Users/Migue/dev/mindstream/src/views/routes/SessionRoute.vue`
- `C:/Users/Migue/dev/mindstream/src/domain/sessionNavigation.js`

## Execution Rules

- Read-only audit only.
- Do not edit code or plan files.
- Every claim must cite concrete file-path and symbol/function evidence.
- Prefer minimal-change migration recommendations.

## Work Plan

1. **Schema extraction**
   - Extract canonical shapes for `problem`, `step`, `link/edge`, focus/navigation context, timer state, persistence snapshot.
2. **Ownership/dependency mapping**
   - Map writer/reader ownership of timer tick, elapsed mutation, selector mutation, persistence write, restore read.
3. **Invariant scoring**
   - Score required invariants as PASS/FAIL/PARTIAL, with risk and root-cause classification.
4. **Bug semantics validation**
   - Validate the single-card vs extra-card bug flow (`Re-enable CORS` -> `x-token-header`) and determine where context mutation is incorrectly triggered.
5. **Target model design**
   - Propose canonical graph schema with stable node IDs, explicit edge types, and single authoritative timer ownership.
6. **Migration and verification**
   - Produce phased migration plan and test scenarios that prove correctness of per-step timers and card semantics.

## Required Invariants

- I1 Stable step identity
- I2 Graph-first links
- I3 Root-is-step compatibility
- I4 Derived workflows
- I5 Derived sub-problems
- I6 Timer ownership
- I7 Timer granularity
- I8 Selector coherence
- I9 Persistence round-trip
- I10 Recursive metadata strategy
- I11 Context creation gate
- I12 Root non-self-parenting
- I13 Step-vs-context separation
- I14 Card cardinality rule

## Bug Scenario (Must Audit)

1. Start root problem: `Re-enable CORS`.
2. Add next step: `x-token-header` through normal next-step flow.
3. Current bug: redundant parent/self interpretation and/or extra card/context appears.
4. Expected: one card, ordered list items in same context, no new card unless explicit context creation action.

## Required Output Format (Exact)

1. **Current Model Snapshot**
2. **Invariant Scorecard** (`Invariant | Status | Evidence | Risk`)
3. **Critical Defects (Top 5)**
4. **Focus Navigation Semantics Audit**
5. **Target Canonical Graph Schema**
6. **Migration Plan (Phased)**
7. **Verification Tests**

## Acceptance Criteria

- Explicitly explains why per-step timer behavior is currently fragile.
- Demonstrates how graph-first step-node modeling resolves timer ownership/persistence ambiguity.
- Clearly identifies why the focus-card duplication bug occurs and how to prevent non-explicit context creation.
