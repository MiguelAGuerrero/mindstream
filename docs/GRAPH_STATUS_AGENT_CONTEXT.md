# Rep-it Graph/Status Agent Context

> **Historical document.** Describes the removed graph/session workflow stack. See [`FRONTEND_PATHS.md`](./FRONTEND_PATHS.md) for current paths (`src/pages/ThinkPadPage.vue`, `src/stores/padStore.js`, `src/domain/thinkPadModel.js`).

Use this as handoff context for any agent changing graph representation, status/completion rules, navigation constraints, or mutator behavior.

## Current model in practice

- Primary state still lives in `src/App.vue`:
  - `problems`: node entities (`id`, `title`, `steps[]`)
  - `subproblemLinks`: directed edges (`parentProblemId -> childProblemId`)
  - `focusStack`: active path for session navigation/runtime
- Graph mutator primitives were extracted to `src/domain/graphMutators.js` and are now used by `App.vue` in key paths.
- Tree rendering is relationship-derived (projection), not a distinct persisted "context" object.

## Node/edge semantics

- A "problem" is the graph node.
- A "subproblem/context-switch sibling" is represented by adding a child node and a link.
- A "step" is currently still embedded on node (`problem.steps[]`) rather than a first-class node.
- "Context" is interpretive: a subtree around currently focused node, not a separate entity type.

## Status/completion semantics (authoritative)

From `src/domain/graphMutators.js`:

- Step defaults (`normalizeStep`):
  - `done: false`, `title: ""`, `workflowId: null`
- Problem completion (`computeProblemCompletionMap`):
  - `selfComplete`: node has at least one step AND all node steps have `done === true`
  - `childrenComplete`: all linked children recursively complete
  - `problemComplete = selfComplete && childrenComplete`
  - cycle guard: revisiting a node yields `false` for safety
- Focusability (`canFocusProblem`):
  - leaf node => focusable
  - non-leaf => focusable only when all children are complete

## Guardrails currently enforced

- In tree interactions (`App.vue`), selecting a context or selecting a step in another context is blocked if `canFocusProblem(problemId)` is false.
- UI completion exists in session via `complete-step` action (`Session.vue`) and updates through `markStepDone`.
- Root "next step" behavior is linear step append when at root focus depth.
- Branch-level "next step" behavior creates sibling context under current parent.

## Known architectural tension

- Graph is node/edge-based, but steps are still embedded arrays on nodes.
- This creates a hybrid model:
  - Good: minimal migration risk and preserves existing workflow editor/session behavior.
  - Cost: step identity/order is local to node, not globally addressable as graph nodes.
- If migrating to full node-first graph, steps should become child nodes with explicit edge ordering.

## Mutators and invariants to preserve

Mutators in `src/domain/graphMutators.js`:

- `createProblemEntity`
- `appendStepToProblem`
- `markStepDone`
- `addSubproblemLink` (duplicate edge protection)
- `createChildProblemAndLink`
- `getChildProblemIdsByParent`
- `computeProblemCompletionMap`
- `canFocusProblem`

Do not break these invariants:

- No duplicate parent-child edges for same pair.
- Unknown IDs are no-op for step mutations.
- Completion traversal must remain cycle-safe.
- Root-level step appends remain ordered siblings on same node.
- Creating branch children must not mutate/remove root step siblings.
- Parent focus lock must hold while any child subproblem is incomplete.

## Test coverage status

Unit tests live in `src/domain/graphMutators.test.js` and include:

- Core flows:
  - child creation + edge creation
  - sibling insertion order
  - root step append ordering
  - target-only step completion
- Edge cases:
  - duplicate edge prevention
  - unknown ID no-op behavior
  - invalid/already-complete step handling
  - cycle guard in completion traversal
  - mixed tree semantics
- Bug regressions:
  - root next-steps stay linear/no links
  - root steps preserved after subproblem branch creation
  - parent focus locked until all children complete

## Where to modify safely

- Domain-first logic changes: `src/domain/graphMutators.js` (+ update tests first)
- App orchestration/adaptation: `src/App.vue`
- Tree interaction/rendering: `src/components/FocusTreePanel.vue`
- Session step actions: `src/views/Session.vue`, `src/composables/useSessionRunner.js`

## Recommended change workflow for future agents

1. Add/adjust failing tests in `src/domain/graphMutators.test.js` to encode intended behavior.
2. Update `src/domain/graphMutators.js` minimally to satisfy invariants.
3. Wire/adjust adapters in `src/App.vue`.
4. Run:
   - `npm test`
   - `npm run build`
5. Re-check regressions around:
   - root step sibling preservation
   - branch focus lock behavior
   - context-switch and next-step branching semantics
