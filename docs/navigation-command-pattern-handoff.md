# Navigation Command Pattern — Handoff Document

> **Historical document.** Describes the removed graph/session navigation stack. See [`FRONTEND_PATHS.md`](./FRONTEND_PATHS.md) for current paths.

## Context

This document captures a diagnosis session and the resulting architectural decisions for
refactoring node selection, highlighting, and navigation in the session view of mindstream
(repit). It is intended as a complete brief for an implementation agent.

---

## The Bug Being Solved

**Symptom:** When a subtask completes and the user navigates up to the parent node (via
back-to-parent), the parent is not properly activated. The FocusTreePanel highlights the
first child instead of the parent, and any "plan next step" prompt entered by the user
either creates a node at the wrong tree level or is never surfaced.

### Root Cause: Two Navigation Pointers That Diverge

There are two separate computed values that attempt to answer "what is the current node":

| Pointer | Resolves to | Used by |
|---|---|---|
| `currentStep` (MainLayout.vue:436) | `children[currentChildIndex]` — always a child | FocusTreePanel `:active-node-id` prop |
| `currentExecutionNode` (MainLayout.vue:558) | parent when `preferFocusedNodeForExecution=true`, else child at index | `handleConfirmNextStepFromSession` insertion anchor, `currentStepCompleted` |

After `popContext()` sets `preferFocusedNodeForExecution = true`:
- `currentExecutionNode` = parent node
- `currentStep` = `children[0]` (first child) — unchanged

**Bug 1 — FocusTreePanel highlights wrong node**

`SessionRoute.vue:36`:
```js
:active-node-id="L.currentStep?.id ?? L.activeNodeId"
```
`currentStep` is always a child. The `?? activeNodeId` fallback never fires because
`currentStep` is non-null whenever the parent has children. So the tree highlights the
first child, not the parent the user navigated to.

**Bug 2 — Plan next step creates node at wrong scope and is never surfaced**

`handleConfirmNextStepFromSession` (MainLayout.vue:1599) uses `currentExecutionNode` as
its insertion anchor. After `popContext()`, `currentExecutionNode` = parent, so:

```js
const target = currentExecutionNode.value;          // = parent
const { parentId, siblingIds, currentIndex } =
  resolveSiblingScope({ focusedNodeId: target.id }); // = grandparent context
const containerId = parentId ?? target.id;           // = grandparent.id
```

The new step is inserted as a sibling of the parent (one level too high). Then:

```js
if (currentStepCompleted.value && ...) {    // checks parent.done = false
  setFocusPathToProblem(...)                // never called
}
```

The parent is not done, so the new node is created but never navigated to.

**Underlying model problem:** `preferFocusedNodeForExecution` is a binary flag that was
added to patch the parent/child ambiguity at the call site. It has an unintended
side-effect: it shifts `currentExecutionNode` to the parent, which then becomes the wrong
anchor for step creation. There is no separate tracking of "where the user is focused"
vs. "what was the last completed step."

---

## Architectural Decision: Unified Navigation Intent Resolver

### Pattern: Command Pattern with Delta Output

The chosen pattern is a **command pattern** where:

- A component emits an **intent** (e.g. `{ type: "complete-and-advance" }`)
- A **resolver** (pure function) takes `(intent, state) → delta | null`
- The **delta** is a partial state object — only the navigation keys that need to change
- A **dispatcher** in MainLayout applies the delta to Vue refs

This is explicitly **not** a reducer pattern. A reducer owns the full state transition and
returns complete new state. Here the resolver returns only the subset of state that
changes, and application is a separate step.

### Why Command Pattern for This Bug

The bug lives at the seam between "complete step" (structural mutation) and "navigate
after complete" (navigation state). These are currently answered independently at each
call site and produce diverging answers about what "current" means. A resolver that
handles `complete-and-advance` as a single intent co-resolves both consequences in one
place with full state context.

### What the Resolver Is Not

The resolver is **not** a runtime guard or defensive validation layer. It does not exist
to catch bugs at runtime via if-statements or sentinel values. It exists to canonicalize
an ambiguous intent ("`navigate-next`" means different things depending on where you are)
into an unambiguous delta given current state. Invalid transitions return `null`; the
caller ignores them. The "why" of rejected transitions lives in unit tests, not in runtime
diagnostics.

---

## Design Decisions and Justifications

### 1. Extend `selectionPolicy.js` rather than creating a new module

`selectionPolicy.js` already implements the right shape: pure function, intent + state →
resolved action. It currently covers tree-click selection via
`evaluateTreeSelectionIntent`. The decision is to extend it as the **unified node
interaction resolver** — the single module invoked for any intent involving navigating,
highlighting, or selecting nodes in a session.

**Scope of the unified module:** tree-click selection, navigate-next, navigate-prev,
complete-and-advance, back-to-parent, plan-next-step navigation consequence.

**Out of scope:** structural mutations (adding/removing nodes, marking done). Those stay
in `graphMutators.js` and `sessionState.js`. The resolver only handles the navigation
consequence of those mutations.

### 2. Return shape: `delta | null` — drop `allowed`, `reasonCode`, `severity`, `userMessageKey`

Current `evaluateTreeSelectionIntent` returns:
```js
{ allowed, resolvedTargetId, targetRootProblemId, reasonCode, severity, userMessageKey }
```

The app cannot act differently based on `reasonCode` or `severity` — these are diagnostic
fields useful only in test assertions. The new unified shape is:

```js
resolveNodeIntent(intent, state) → delta | null
```

Where `delta` is a partial navigation state object, e.g.:
```js
{ activeNodeId: 42, currentChildIndex: 0 }
```

`null` means no valid transition. Existing callers that check `result.allowed` migrate to
`result !== null`.

### 3. `preferFocusedNodeForExecution` is eliminated

This flag exists because `popContext()` could not produce an explicit resolved node for
the caller — it left a flag for the next read to interpret. When the resolver returns an
explicit `activeNodeId` in the delta, there is no ambiguity to resolve at read time. The
flag is removed.

### 4. `FocusTreePanel` active-node-id must come from resolved state

The `currentStep?.id ?? activeNodeId` expression in `SessionRoute.vue:36` is resolution
logic in a prop binding. It moves into the resolver. The component receives a single
pre-resolved `activeHighlightId` with no fallback logic.

### 5. `sessionNavigation.js` pure functions stay as utilities

`resolveExecutionNodeId`, `resolveSiblingScope`, `getAdjacentLeafId`,
`findPendingPlannedSuccessor` are building blocks the resolver composes. Their signatures
and behavior do not change.

### 6. Existing remap behavior in `evaluateTreeSelectionIntent` is a preserved invariant

Clicking a parent node that has an active descendant resolves to that descendant, not the
parent. This is a first-class policy decision that must be preserved explicitly in the
unified resolver. It cannot be silently dropped during migration.

---

## What Changes

| Location | Change |
|---|---|
| `src/domain/selectionPolicy.js` | Extended to unified node interaction resolver. New function `resolveNodeIntent(intent, state) → delta \| null`. Existing `evaluateTreeSelectionIntent` logic folded in, return shape migrated to delta. |
| `src/layouts/MainLayout.vue` | `handle*` functions become thin dispatchers: gather state snapshot, call resolver, apply delta. `preferFocusedNodeForExecution` ref removed. |
| `src/views/routes/SessionRoute.vue:36` | `:active-node-id` prop receives a single resolved value from layout state — no inline fallback logic. |
| `src/domain/sessionNavigation.js` | No changes — stays as utility layer the resolver composes. |
| `src/domain/graphMutators.js` / `sessionState.js` | No changes — structural mutations stay here. |

---

## What Stays the Same

- Tree node structure: `{ id, title, parentId, children }` — pure template, no runtime state
- Session state: `Map<nodeId, { done, elapsedSeconds }>` — runtime overlay
- `activeNodeId` as the single navigation pointer
- All existing routing and persistence logic

---

## Test Surface

The resolver being a pure function means tests follow this shape:

```js
const delta = resolveNodeIntent(
  { type: "complete-and-advance" },
  { activeNodeId, currentChildIndex, nodes, nodeStateMap }
);
expect(delta).toEqual({ activeNodeId: parentId, currentChildIndex: 0 });
```

Priority test cases:
- Complete leaf node → delta navigates to parent
- Complete leaf node that is the last child → delta navigates to next sibling scope
- Back-to-parent on a root node → returns null (no valid transition)
- Tree-click on parent with active descendant → remaps to descendant (preserved invariant)
- Plan-next-step with completed anchor → delta points to newly created sibling
- Navigate-next from last node → returns null

Existing `selectionPolicy.test.js` and `sessionNavigation.test.js` are the structural
model for new tests.

---

## Files to Read Before Implementing

- `src/domain/selectionPolicy.js` — existing resolver shape and remap logic
- `src/domain/sessionNavigation.js` — utility functions the resolver composes
- `src/layouts/MainLayout.vue` — lines 422–436 (pointer definitions), 558–566
  (`currentExecutionNode`), 746–758 (`popContext`), 1268–1280
  (`handleCompleteCurrentStep`), 1599–1671 (`handleConfirmNextStepFromSession`)
- `src/views/routes/SessionRoute.vue` — line 36 (the misresolved active-node-id prop)
- `src/domain/selectionPolicy.test.js` — test shape to follow
