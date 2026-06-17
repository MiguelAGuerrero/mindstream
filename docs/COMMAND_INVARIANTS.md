# Command Invariants Playbook

Use this document during planning and implementation for any UI-state mutation that flows through the command resolver.

## Purpose

Build features and fixes by defining invariant contracts first, then encoding transitions as pure commands that return explicit state deltas.

This prevents bugs where UI behavior appears correct in one place but diverges in another derived path.

## Core Pattern

Design and implement in this order:

1. User event
2. Intent
3. Command policy (pure resolver)
4. Delta apply
5. Derived selectors and UI consequences

In this architecture:

- UI emits intents (`back-to-parent`, `tree-click`, `next`, etc.)
- Resolver decides if transition is valid
- Resolver returns `delta | null`
- Layout applies delta once
- UI renders from derived state (`currentExecutionNode`, `canGoNext`, etc.)

## Invariant-First Workflow

For each intent, define:

- Preconditions: what must be true before transition
- Postconditions: what must be true after transition
- Preserved invariants: what always remains true
- Fallback policy: what to do on inconsistent data

Only after this is written should code changes begin.

## Command Spec Template

Copy this block for each new command or behavior change:

```md
### Intent: <intent-name>

#### Event
- Trigger: <UI event(s)>

#### Required State Inputs
- <list only the fields needed by resolver>

#### Preconditions
- <condition 1>
- <condition 2>

#### Postconditions
- <state effect 1>
- <state effect 2>

#### Preserved Invariants
- <invariant 1>
- <invariant 2>

#### Fallback / Degraded Behavior
- <explicit policy when assumptions fail>

#### Resolver Output
- Returns: `delta | null`
- Delta shape example: `{ activeNodeId, currentChildIndex, ... }`

#### Derived Consequences (Selectors)
- <selector 1> should become <expected value>
- <selector 2> should become <expected value>

#### Tests Required
1. Resolver unit: intent -> expected delta/null
2. Selector composition: derived behavior from resulting state
3. Integration wiring: event dispatch -> command -> apply -> UI consequence
```

## Project-Specific Invariants (Current)

These should remain true unless explicitly redesigned:

- `activeNodeId` is the single navigation pointer.
- `currentExecutionNode` is derived from `activeNodeId + currentChildIndex` via resolver utilities.
- `canGoNext` and next-action behavior must depend on the same navigation computation.
- Resolver transitions must return explicit deltas, not hidden interpretation flags.
- Fallback behavior must be deterministic and tested.

## Example: back-to-parent

Intent: `back-to-parent`

- Preconditions:
  - `activeNodeId` exists
  - active node has a parent
- Postconditions:
  - `activeNodeId` becomes parent id
  - `currentChildIndex` anchors to index of previous active child in parent children
- Preserved invariant:
  - parent context keeps child anchor instead of resetting arbitrarily
- Fallback:
  - if child is not present in parent children, index falls back to `0`

This specific invariant prevents incorrect `canGoNext` values and wrong next-step UI affordances after popping context.

## PR / Review Checklist

Before merging command-related changes:

- [ ] Intent contract is written using the template
- [ ] Preconditions, postconditions, and preserved invariants are explicit
- [ ] Resolver remains pure (no side effects)
- [ ] Delta is explicit and minimal
- [ ] Fallback behavior is explicit
- [ ] Resolver tests cover success, null, and fallback cases
- [ ] Selector-level test verifies UI-critical derived behavior
- [ ] Existing command invariants are not regressed

## Agent Prompt Snippet

Use this snippet when asking future agents to plan or implement command-flow changes:

```md
Follow `docs/COMMAND_INVARIANTS.md`.
For each behavior change:
1) write intent contract (pre/post/invariants/fallback),
2) implement resolver delta changes,
3) add resolver and selector-level tests,
4) verify UI behavior from derived selectors, not direct event assumptions.
```

