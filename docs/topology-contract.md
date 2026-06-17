# ThinkPad Topology — Design Contract (v1)

**Date:** 2026-06-09
**Status:** Design note. Topology *declared*, not yet implemented. This is the substrate contract the synthesis tool (and a structural `connect`) will build on.
**Scope decision:** Declare the model a **DAG = single-parent ownership tree + typed reference edges**. Land it the *incremental* way (reference arrays on the existing nested model), not by normalizing to an edge table. Keep single-parent **ownership**; allow many-parent **reference**.
**Builds on:** the v9 entity-state model (`src/domain/thinkPadModel.js`), `docs/recursive-resolve-contract.md` (the drill-down roll-up = the `owns`-tree fold), and the "promoted thoughts become independent sibling threads" rework.
**Motivated by:** the synthesis-tool design (a *synthesis* node = a first-class **face** standing on a second-class **grounding**, constructed top-down (Outline) or bottom-up (Synthesize), retained not deleted (Ground)). Synthesis is the first operation that needs many-to-many, which forced the topology question.

---

## 1. Why this exists

The model today mixes **two edge mechanisms used inconsistently** — array containment (`thread.subThreads[]`, `thread.steps[]`, `doc.annotations[]`) and id foreign-keys (`annotation.stepId`, `thread.parentAnchor`, `pad.viewThreadId`). That hybrid is not wrong; it is **undeclared**, which is what makes it feel like a Frankenstein. Three consequences:

1. **No many-to-many anywhere.** Every structural relation is single-parent containment or a single-target FK. A node that belongs to two parents cannot be expressed.
2. **Synthesis is blocked.** A synthesis grounds *many* ideas, and one idea may ground *many* syntheses — many-to-many by definition. The current model can only fake it by **duplicating** the shared idea under each parent, and divergent duplication of a shared idea is precisely how a draft fragments into unstitched threads.
3. **`connect` is faked as prose.** The one move whose job is to relate two ideas (`src/constants/moves.js`, `id: "connect"`) has `writeBack: ANNOTATE` — it writes the sentence *"This connects to…"* into `doc.text`. The relationship lives in prose, not in a queryable edge.

The fix is **not** to collapse to a pure tree (that forbids synthesis) and **not** to normalize everything into an edge table (a needless core rewrite). The fix is to **name the hybrid as a contract**: one node type, a single-parent `owns` spanning tree, plus typed `ref` edges layered on top. That structure is a DAG, and it is the same architecture used by filesystems + symlinks, the DOM tree + id references, and scene graphs + instance refs.

---

## 2. The through-line: "tree" was never the real axis

The real distinction is **containment edges vs. reference edges**, not relational-vs-tree.

The intuition that pulled toward "tree" is that a tree has a clean **fold-up** — one unambiguous path to a root, so "resolve upward" is well-defined. But the property that actually buys the clean fold is not *single-parent*; it is **acyclic**:

> A valid bottom-up reduction order (a topological order) exists **iff** the dependency graph is acyclic.

A tree gives the fold *by throwing away sharing*. A DAG gives the **same fold** *and* permits sharing. A tree is the over-constrained DAG. So we keep the part of the tree instinct that earns its keep and drop the part that forbids the feature:

- **Keep single-parent _ownership_.** Drill-down rolls a result up into exactly one `parentAnchor` ([`resolveThreadIntoParent`, thinkPadModel.js:1269](../src/domain/thinkPadModel.js)); "resolve into which parent?" is only unambiguous with one owner. Single-parent ownership also makes deletion/GC trivial (delete the subtree).
- **Allow many-parent _reference_.** Synthesis and `connect` are reference edges. A shared ground has one owner and many referrers.

**One owner per node (the tree). Many references per node (the graph).**

---

## 3. The node model

There is **one logical node type**, distinguished by `kind`. In v1 nodes keep their existing physical, nested representation — "node" is the conceptual contract (a thing with a stable id that edges may target), **not** a mandate to normalize into a flat store.

| `kind` | Current carrier | Identity |
|---|---|---|
| `pad` | the pad record | `makeId("pad")` |
| `thread` | `pad.threads[]` / `thread.subThreads[]` | `makeId("thread")` |
| `step` | `thread.steps[]` | `makeId("step")` |
| `idea` | `doc.annotations[]` (incl. parked captures) | `makeId("idea")` / `makeId("ann")` |
| `synthesis` | **new** — a `thread` variant (see §5) | `makeId("thread")` |

**Identity rule:** a node's identity is its **id**. Positional offsets (`annotation.selectionStart/End`) are *attributes of an anchor edge*, never identity — they may drift and re-find; the id never does.

**Blocks are not nodes.** `parseBlocks(text)` ([ideaParser.js:24](../src/domain/ideaParser.js)) is an ephemeral content-hash projection of `doc.text`; its id changes on every edit. A block becomes a node **only by capture** (`captureIdea` → an `idea`). Therefore: **grounds must reference nodes, so a raw block is promoted-on-use** — auto-captured into an `idea` the first time it is grounded (the same promotion `promoteSpanToMove` already performs for moves).

---

## 4. The two edge kinds

Every relationship is exactly one of two kinds. Both are directed.

### 4.1 `owns` — containment; the spanning tree
Single-parent, lifecycle-coupled, **ordered**. The union of all `owns` edges is a **tree** (every node has ≤ 1 owner).

| `owns` edge | Carrier today |
|---|---|
| pad → thread | `pad.threads[]` |
| thread → thread | `thread.subThreads[]` |
| thread → step | `thread.steps[]` |
| pad/thread → idea | `doc.annotations[]` |

### 4.2 `ref` — reference; the cross-links
Many-to-one or many-to-many, **no ownership**. Subkinds:

| `ref` subkind | Direction | Carrier today |
|---|---|---|
| `anchors` | idea → step; thread → parent idea/thread | `annotation.stepId`; `thread.parentAnchor.{annotationId, parentFrameId}` |
| `views` | pad → thread | `pad.viewThreadId` / `activeThreadId` / `viewStack[]` |
| `applies` | idea → move-vocabulary row | `annotation.move` → `MOVES[].id` |
| `provenance` | draft → {idea, step, move} | `draftHistory[].contributions[]` |
| **`grounds`** | **synthesis → idea/thread/synthesis** | **new (§5)** |
| **`connect`** | **idea ↔ idea** | **new — replaces the prose-faked `connect` move** |

### 4.3 The fold-graph and acyclicity
Only the edges that impose a *reduction dependency* participate in the fold:

> **fold-graph = `owns` ∪ `grounds`.**

- `owns` folds child → parent (drill-down roll-up; existing recursive-resolve). Acyclic by construction (single-parent).
- `grounds` folds ground → face (a face depends on its grounds). Must be acyclic: a synthesis may not transitively ground itself.
- `anchors` and `views` are **navigational/positional back-pointers**, not dependencies — excluded from the fold-graph (e.g. `parentAnchor` is just the inverse pointer of an `owns` edge).
- `connect` is an **inert cross-reference** in v1 — a "see also", not a dependency. It does **not** fold and therefore cannot create fold-cycles.

**Invariant:** inserting a `grounds` edge must be rejected if it would create a cycle in the fold-graph (see §8).

---

## 5. The synthesis node

A `synthesis` is a **`thread` variant** — it reuses the thread shape (so it lives in the `owns`-tree as a root-level sibling, owns a `doc`/face surface, and can itself be drilled) and adds one field:

```
synthesis = {
  ...thread,                 // id, steps[], subThreads[], doc, createdAt …
  kind: "synthesis",         // default "thread" for every existing node
  grounds: GroundRef[],      // ordered REFERENCE edges — NOT contained children
}

GroundRef = {
  nodeId: string,            // an idea / thread / synthesis id (a relational-tier node)
  order:  number,            // position in the grounding (slot order / drawer order)
}
```

- **The face** (the first-class Point) is **the synthesis's own pad**. A synthesis is a thread variant, and every thread already owns a `doc` — so the face is *written and cultivated in its own sub-pad* (`synthesis.doc.text`) through the normal stream→reflect loop, never a flat string field. Folding the grounds up *seeds* that pad; the user then cultivates the face there.
- **The grounding** is `grounds[]` — *references*, not children. The grounded nodes are owned elsewhere; the synthesis only points at them. This is what makes a ground shareable (many syntheses may list the same `nodeId`) and what makes deletion safe (§6).
- **Closure / recursion.** A `synthesis` id may appear in another synthesis's `grounds[]`. Nesting is reference-recursion over one node type — the rigorous form of "resolve upward."
- **Two construction directions, one node.** *Outline* (top-down: mint the face, attach grounds) and *Synthesize* (bottom-up: select grounds, generate the face) both produce this same object. Outline is organization; Synthesize is the generative engine.
- **Integration with the moves vocabulary.** Synthesis is the structural upgrade of `connect`: add a `synthesize`/`converge` move whose write-back **mints a synthesis node + `grounds` edges** instead of splicing prose. That is the one move that creates an edge rather than a sentence.

---

## 6. Lifecycle: tombstone, don't cascade

A tree hides this; a DAG forces it. When an `owns`-parent is deleted, what happens to a node that other nodes still *reference*?

- **Deleting an `owns`-parent** marks the subtree `dead: true` (a tombstone) but **retains** any node with inbound `ref` edges (`grounds`/`connect`/`provenance`). Reference-counted, not cascaded.
- **A grounded node never vanishes underneath its face.** A dead ground renders as a tombstone inside every synthesis that grounds it — this is exactly the "grounding drawer" behavior the synthesis design wants (nothing a synthesis stands on can silently disappear).
- **Hard-delete only at zero inbound refs.** A `dead` node with no remaining inbound `ref` edge may be garbage-collected.

**Referential-integrity invariant:** no *live* `ref` edge may point at a hard-deleted node. (Tombstone first; hard-delete only when ref-count hits zero.)

---

## 7. The fold, now well-defined

"Resolve upward" = a **topological fold over the fold-graph** (`owns` ∪ `grounds`). Because that graph is acyclic, the order always exists.

- **Drill-down** = post-order fold over `owns` (today's `resolveThreadIntoParent`).
- **Synthesis** = topological fold over `grounds` (a face is computed after all its grounds; a shared ground is computed once and reused).

Same operation, two edge kinds. This is the precise definition of the "value that folds up" the synthesis design kept circling: the fold is well-typed because the topology is acyclic.

---

## 8. Acyclicity enforcement

- `owns` is acyclic by construction — every push appends a fresh child under one parent.
- `grounds` is checked at insert. A new reducer (`groundSynthesis(pad, { synthesisId, nodeId, order })`) must:
  1. Reject if `nodeId === synthesisId` (no self-ground).
  2. Reject if `synthesisId` is reachable from `nodeId` by following `grounds` edges (adding the edge would close a cycle).
  3. Auto-capture `nodeId` to an `idea` first if it is a raw block (§3).
  4. Append `{ nodeId, order }` to `synthesis.grounds[]`, same-ref on a duplicate.

---

## 9. Mapping the current model → the contract (no rewrite)

| Current field | Edge kind | Change |
|---|---|---|
| `pad.threads[]`, `thread.subThreads[]`, `thread.steps[]`, `doc.annotations[]` | `owns` | keep |
| `annotation.stepId`, `thread.parentAnchor` | `ref:anchors` | keep |
| `pad.viewThreadId` / `activeThreadId` / `viewStack[]` | `ref:views` | keep |
| `annotation.move` | `ref:applies` | keep |
| `draftHistory[].contributions[]` | `ref:provenance` | keep |
| `parseBlocks` block | — (not a node) | promote-on-use → `idea` |
| `connect` move (prose) | `ref:connect` | upgrade prose → edge (later slice) |
| — | `ref:grounds` | **add** (`synthesis.grounds[]`) |
| — | `node.kind` | **add** (default `"thread"`) |
| — | `node.dead` + tombstone reveal | **add** (default `false`) |

**No schema version, no migration.** The app is pre-deployment and keeps no persisted-format backwards compatibility — there is no `schemaVersion` and no legacy-field tolerance (both removed 2026-06-09). The normalizer simply default-fills new fields: `kind: "thread"`, `grounds: []`, `dead: false`. `normalizeThread` ([padPersistenceMapper.js](../src/domain/padPersistenceMapper.js)) is the single chokepoint.

---

## 10. Two paths — and why incremental wins

- **Incremental (this contract).** Keep the nested model; add `grounds[]`/`kind`/`dead` reference fields; declare the two edge kinds in the model header. Preserves the structural-sharing immutability the core relies on (`updateThreadAtPath`, `patchThreadTree`) and the "it's just nested JSON" persistence. **Recommended.**
- **Foundational (deferred non-goal).** Flatten to `nodes{}` + `edges[]` (an in-memory graph store). Maximally uniform and fully queryable, but rewrites every reducer and forces hand-rolled referential integrity and edge ordering. Only worth it if *all* relations must be queryable, not just grounds.

Do not go foundational to escape "Frankenstein." Once the two edge kinds are **declared**, the nested-tree-plus-reference-arrays model *is* coherent.

---

## 11. Non-goals (v1)

- Full edge-table normalization (§10).
- Cross-pad grounds (v1: a synthesis grounds nodes within its own pad).
- Folding `connect` edges (v1: `connect` is an inert cross-reference).
- A general cyclic graph (v1 stays a DAG).
- Automatic cluster detection (attractor → suggested grounds) — the discovery layer for bottom-up Synthesize is a separate feature; this contract only guarantees the *structure* it would write into.

---

## 12. Open questions / deferred decisions

1. **Ground ordering semantics:** the drawer wants two orders — *provenance* (resolution time) and *argument* (structure). v1 picks one (`order` as manual/structure); the other is derived or deferred.
2. **Should `connect` ever fold,** or remain a pure lateral cross-reference?
3. **Tombstone GC trigger:** eager ref-count on delete vs. a periodic sweep.
4. **Draft-phase × grounds:** a synthesis owns a cultivable pad, so advancing its face-draft already works — the open part is whether re-grounding (adding/removing a ground) should invalidate or re-seed the in-progress face draft.

---

## 13. Invariants (acceptance bar)

1. **Owns is a tree.** Every node has ≤ 1 `owns`-parent.
2. **Fold-graph is acyclic.** `owns ∪ grounds` has no cycle; `groundSynthesis` rejects cycle-closing edges (§8).
3. **Grounds reference nodes only.** Never a raw `parseBlocks` block; promote-on-use first.
4. **Tombstone, never cascade.** No node with inbound `ref` edges is hard-deleted; no live `ref` edge points at a hard-deleted node.
5. **No schema versioning.** New fields default-fill in the normalizer; the app keeps no persisted-format backwards compatibility (pre-deployment). There is no `schemaVersion`.
6. **Reducers pure and reference-stable** (same-ref on no-op), consistent with the rest of `thinkPadModel.js`.

---

## 14. Files to read before implementing

- `src/domain/thinkPadModel.js` — `createThread` (the node shape to add `kind`/`grounds` to), `resolveThreadIntoParent` (the `owns` fold to generalize), `patchThreadById`/`patchThreadTree` (immutable node patching), `ideasForPanel` (the selection surface bottom-up Synthesize reads from).
- `src/domain/padPersistenceMapper.js` — `normalizeThread` (the single default-fill chokepoint for `kind`/`grounds`/`dead`).
- `src/domain/ideaParser.js` — `parseBlocks` (why blocks are not nodes; the promote-on-use boundary).
- `src/constants/moves.js` — the `connect` move (the prose-faked edge) and where a `synthesize` move would slot.
- `docs/recursive-resolve-contract.md` — the `owns`-tree fold this generalizes.
