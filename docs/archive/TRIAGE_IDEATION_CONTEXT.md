# TRIAGE_IDEATION_CONTEXT

> **Historical document.** Triage route and graph mutators were not implemented in the current think-pad architecture. See [`FRONTEND_PATHS.md`](../FRONTEND_PATHS.md).

## Purpose
This document is a context handoff for any agent or contributor working on the Triage feature in Rep-it. It captures the architectural decisions, the mental model behind the feature, and the distinctions that justify it as a *separate surface* rather than another workflow or panel. Read this before writing code that touches triage; it explains *why* the feature is shaped the way it is, not just what to build.

## TL;DR
Triage is a separate UI surface (not a panel, not a workflow) for users who feel overwhelmed and can't see the next step. It sits alongside workflows as a complementary mode: **workflows execute, triage orients**. Its outputs are tree nodes (when items get promoted) plus a persisted "dump artifact" attached as node-level overlay metadata. It is reached via a `?` gesture on the active step card. The v1 build implements only one technique — dependency mapping via free-form dump-and-digest — as a proof of concept. Other techniques (separation of concerns, defining constraints) come later, after we learn whether users reach the digest phase at all.

## The mental model: orientation vs execution
Rep-it currently has one dominant work mode: **execution**. The session surface paces forward through known steps; workflows pace forward through reusable step sequences. Both presume the user knows the shape of the work and just needs to do it.

Triage is the dual mode. The user feels overwhelmed — they can't tell which node is the next thing to act on, or whether the current node is even the right node. They don't need pacing; they need to **re-survey the field**. This is *sideways motion*, not forward.

Naming this mode matters because the app currently provides no vocabulary for it. Without a named mode, users either grind on the wrong step (wasted execution) or abandon the session (lost momentum). Triage is the "I'm stuck — help me sort the field" affordance that closes that gap.

The framing came from systems-level thinking, specifically the medical/operational concept of triage: when overwhelmed, sort the field by urgency and dependency before acting. The video that seeded this framing introduced three techniques: **dependency mapping**, **separation of concerns**, and **defining constraints**. Triage in Rep-it is the UI embodiment of that mental model — but it informs the surface, it isn't the surface itself. Pick the most generalizable technique as v1; the rest are extensions.

## Why triage can't be a workflow
A workflow is a *thinking algorithm* expressed as ordered steps with timeboxes. Workflows assume the user has already located their problem and just needs a structured procedure to apply to it. The Rep-it library already includes resolution-kind workflows ("Clarify", "Decide") that do something triage-adjacent, but they fail the test:

- Workflows are **execution rails**. They pace forward. Triage produces the field that execution will later traverse — not the traversal itself.
- Workflows are **named procedures**. Triage is **diagnostic before prescriptive**. The user doesn't yet know which procedure to apply; that's *why* they're triaging.
- Workflows materialize as injected child steps inside an existing node. Triage may produce children, but it may also redirect attention, park the node, or merge nodes. The structural moves are plural; a workflow's output is singular (completion of its steps).

Slotting triage as another resolution workflow would flatten its specialness and leave users with the same dead-end they get today: a procedure to run when they're already past the diagnostic phase.

## Why triage can't be a panel
The existing "What's Stopping You" panel ([StoppingStatePanel.vue](../src/components/StoppingStatePanel.vue)) was the first attempt at this affordance. It conflates two concerns:

1. **Parking** a step (`waiting` tag) — "I can't proceed because of an external blocker; come back later."
2. **Unblocking** a step (`confused` / `deciding` tags) — "I can't proceed because I don't yet see what to do."

Only the second is triage. The first is a different gesture entirely — closer to a `⏸` "park this" affordance. The panel also asks the user to pick the right tag *up front*, which fails for the same reason workflows do: the user is overwhelmed precisely because they can't categorize their own stuck-ness yet.

Beyond the tagging problem, a panel inside the session surface is **the wrong context**. Staying in the same view tells the user "you are still executing, just in a sub-mode." The whole point of triage is that the user has *stopped* executing. The surface should reflect that. Triage gets its own route — `/triage/:nodeId` — so the context switch is honest.

## The two-phase shape: dump → digest → promote
The video's dependency-mapping technique is two activities fused on purpose:
- **Frustrations** (affective signal: where friction is)
- **Nouns** (conceptual inventory: what the friction is about)

Pairing them gives a warm entry. The user isn't asked to "list dependencies" — they're invited to vent and name things. Dependency structure *emerges* from digesting the dump, not from authoring it.

This implies a two-phase surface:

**Phase 1 — Dump.** Low friction, high spillage. The user types frustrations and nouns into a flat list. No structure required. No categorization required. The artifact is plural and messy on purpose; that's the externalization that creates analytical distance.

**Phase 2 — Digest.** Curatorial. The user reviews their own dump and decides which items are actionable. Selected items get **promoted** into real tree children under the triaged node. Unpromoted items remain in the dump artifact as context. v1 supports only selection-based promotion (lightweight); a richer future version could let users mark relations between items ("X blocks Y").

Triage **ends when the user has performed one structural move** — promoted a child, redirected the active node, parked the node, or merged it. Pure dumping without a move is a saved-draft state (resumable, attached to the node), but not a completion. This keeps the discipline that distinguishes triage from journaling.

## The output question, resolved
The question that anchored the design: when triage finishes, do its outputs become tree nodes, or are they transient because the *real* output is actionable steps?

The dichotomy is too clean. Two-tier resolution:

- **Phase 1 dump** → persisted as **node-level overlay metadata** (same conceptual layer as notes or `nodeStateMap` — about a node, not in the tree). Survives resume. Visible if the user revisits the node. Doesn't clutter focus surfaces.
- **Phase 2 promotion** → selected items become **real tree children** via existing `graphMutators`. Unpromoted items stay in the dump artifact.

This honors the existing architecture (see [memory/project_tree_session_decoupling.md](../.claude/projects/C--Users-Migue-dev-mindstream/memory/project_tree_session_decoupling.md)): *tree = pure structural template, session/node-state = runtime overlay*. Triage outputs split the same way. The tree only acquires nodes the user explicitly chose to make actionable. The thinking that produced those nodes is recoverable but not navigable.

It also gives the gesture a clean exit condition: triage ends when the user has made a structural move. If they bail without promoting, the saved draft survives and the app has a soft signal it could later use ("you triaged this twice without promoting — want to try a different move?").

## Producing steps vs being steps
This is the most important distinction in this document, and the one to preserve as triage evolves.

In Rep-it today, **steps are the work**. The user adds a step, executes it, completes it, moves on. The step is both the thing-to-do and the unit of progress. This works when the user knows what to do.

Triage outputs are **work that produces steps**. The dump items, the dependency relations the user might draw, the constraints they might surface — none of these are steps. They are the *meta-work* the user does in order to *generate* a step.

The architectural consequence: triage outputs must not be confused with steps in the tree. If a dump item ("I keep getting confused about the auth flow") is auto-promoted to a child node, the tree gets polluted with un-actionable "steps." If every triage produces only step-children, the meta-work is destroyed and only the conclusion survives.

The two-tier output model preserves the distinction:
- **Step-shaped outputs** (promoted items) live in the tree as children. Executable.
- **Pre-step outputs** (the rest of the dump, dependency notes, constraint annotations) live as overlay on the triaged node. Generative, not executable.

When designing future triage techniques (separation of concerns, defining constraints), the same test applies: *is this output a step, or is this output the work of producing a step?* If it's the latter, it belongs in overlay metadata. If it's the former, it earns a tree node.

## Architectural positioning
Triage is a **new interaction surface** that consumes existing primitives:

- Tree mutations route through `graphMutators` (creating children for promoted items)
- Per-node metadata extends `nodeStateMap` or a new sibling structure (the dump artifact)
- Resumable contexts already serialize the tree + node-state, so the artifact persists "for free" once it lives on the node
- Cross-page state access goes through the Pinia stores ([sessionStore.js](../src/stores/sessionStore.js), [workflowStore.js](../src/stores/workflowStore.js))

It is **not**:
- A new resolution workflow (would flatten its specialness)
- A new panel inside the session surface (wrong context)
- A new top-level mode parallel to workflows (overreaches; triage is a focused gesture, not a parallel app mode)
- A free-form journaling surface (dilutes focus discipline)

The Pinia store refactor in Phase A was driven explicitly by triage's need for cross-page state consistency. Triage lives at `/triage/:nodeId`, a sibling route to `/session`. Both routes need to see and mutate the same context (the same problem tree, the same active node). The pre-refactor `provide("repitLayout", reactive({...}))` pattern would have worked for read access from the same MainLayout subtree, but Pinia stores are the cleaner expression of *this state is shared across surfaces*. Sub-step 3 of Phase A migrated four routes to direct store access; PlanRoute and SessionRoute still inject because their orchestration methods (`onStartSession`, `handleEngageWorkflow`, etc.) haven't been moved into stores yet. Triage doesn't depend on those methods, so it's unblocked.

## Data model implications
The dump artifact is the only new data shape triage introduces in v1.

**Shape (proposed):**
```
triageArtifacts: Map<nodeId, {
  items: [{ id, body, createdAt, kind: "frustration" | "noun" | "free", promoted: boolean, promotedToChildId: number | null }],
  startedAt: ISO8601,
  lastUpdatedAt: ISO8601,
  status: "draft" | "promoted" | "abandoned"
}>
```

Each `item` keeps `id` and `kind` even if `kind` only has one value at first. That gives the eventual structural digest version (separation of concerns, dependency relations) a place to land without a schema migration.

The artifact lives **on the session store**, parallel to `nodeStateMap` and `notesByNodeId`, and serializes into the resumable context snapshot in v6 (or extends v5 if we don't want to bump). It's overlay, not structural — same architectural layer as notes.

**Out of scope for v1:**
- **Cross-tree dependency edges** ("X blocks Y" between non-parent-child nodes). Today's tree is strictly hierarchical. Adding cross-edges is a domain-model expansion that should land deliberately, not as a side effect of v1 triage. v1 dump items can *describe* dependencies in their text body without those becoming first-class edges.
- **Constraints as first-class metadata.** Same reasoning. Users can write constraints into the dump as text. Promoting them to a typed metadata field comes when separation-of-concerns and constraint-defining triage moves are added.

## The trigger gesture
A `?` (or comparable glyph — `🩺`, `⚖`, decision pending) on the active step card. Single click → open triage surface for that node.

Constraints:
- **Per-node** — triage operates on a specific node, not on the session globally. The `nodeId` flows through the route param.
- **Opt-in** — the user has to recognize they're overwhelmed and reach for the gesture. v1 does not auto-surface a triage suggestion. Future: after N minutes on the same step with no progress, the app could nudge — but only after we've learned how often users reach for triage organically.
- **One-click** — no confirmation, no modal. Triage opening is the context switch. Closing without promoting yields a saved draft, not a destructive abandonment.

The "What's Stopping You" panel partially overlaps:
- `confused` / `deciding` tags collapse into the `?` triage gesture.
- `waiting` becomes a separate "park" affordance (not part of triage).
- The full panel is retired or demoted to a minimal "tag this step" footer.

## Exit conditions
Triage ends when **at least one structural move occurs**:
- Promoted: at least one dump item became a tree child
- Redirected: the user changed the active node (e.g., to a sibling)
- Parked: the user marked the triaged node as paused/parked with reason
- Merged: the user folded the triaged node into another node

Pure dumping → "saved draft" state. The user can return to the same triage artifact later. Multiple drafts in a row on the same node could surface a soft hint that triage isn't yielding for this node and a different move (workflow engagement, parking, asking someone) might help.

## v1 scope (proof of concept)
Build the minimum that lets us learn whether the gesture lands:

1. `?` gesture on the active step card → navigate to `/triage/:nodeId`
2. Triage surface (Phase 1 dump only):
   - Header showing the triaged node's title
   - A list input where the user types items one at a time
   - Items render in a flat list as they're added
   - Each item has: text, a kind selector (frustration / noun / free — minimal UI, default to "free"), a delete button
3. Phase 2 promotion (lightweight):
   - Each item has a "Promote to step" button
   - Click → item becomes a child of the triaged node, marked promoted in the artifact
4. Persistence:
   - Triage artifact saved on the node via the resumable context system
   - On re-entering triage for the same node, the existing dump appears
5. Exit:
   - "Done" button → returns to session surface (works whether or not anything was promoted)
   - At least one promotion in the session marks the artifact `promoted`; otherwise `draft`

What's explicitly NOT in v1:
- Dependency drawing between items
- Constraints as a typed field
- Auto-nudge on N minutes idle
- Separation-of-concerns (split node) gesture
- Merge gesture
- Park gesture (separate feature)
- Multiple concurrent dumps per node (one artifact per node, append-only across visits)

## Relationship to existing features
| Feature | Relationship to triage |
|---|---|
| Workflow execution (`/session`, workflow engagement) | Forward rail; triage is the sideways move when execution stalls. |
| Resolution-kind workflows (`Clarify`, `Decide`) | Procedural alternative once the user knows which procedure applies. Triage is upstream of this — it helps the user *find out* which procedure (if any) applies. |
| Subproblem creation | Triage's promotion gesture *uses* this primitive. The new piece is the dump-and-digest UX wrapping it. |
| Notes | Triage's dump artifact is shaped like notes (per-node, list, persisted via resumable contexts) but semantically distinct: notes are user-authored commentary on existing structure, dump items are seeds for new structure. |
| "What's Stopping You" panel | Largely retired. The `confused` / `deciding` tags collapse into triage; `waiting` becomes a separate park gesture. |

## Open questions to resolve before / during the v1 build
1. **Glyph for the trigger gesture.** `?` is the working candidate but feels generic. Options: `🩺`, `⚖`, custom icon, text "Triage". Resolve when designing the card UI.
2. **Item kind taxonomy.** Default to a single "free" kind, or surface "frustration / noun" up front to scaffold the externalization? Lean: free + "tag later" minimal; learn from usage.
3. **Promotion title.** When an item promotes to a child, is the child title the raw item body, or does the user get a confirmation step to edit it? Lean: confirmation step (one-line edit) — promotes user agency over the resulting tree shape.
4. **Multiple drafts.** If a user triages, walks away, returns, the artifact reappears. Do they continue the same dump, or start fresh? Lean: continue (append), with a "clear and start over" affordance.
5. **Schema version bump.** Do triage artifacts go into v5 as a new optional field, or do we bump to v6? Lean: optional field on v5, no version bump — backwards compatible, no migration burden.

## Naming history (rejected and adopted)
| Name | Spirit | Verdict |
|---|---|---|
| Shrink | Make the next step smaller | Rejected — presumes you know which thing is too big |
| Crack / Pry | Force open a stuck node | Rejected — too aggressive for the calm guided-cognition tone |
| Unfog | Clear the user's mental fog | Rejected — names the user state, not the tree action |
| Triage | Sort the field by urgency/dependency before acting | **Adopted** — precise, matches the systems-thinking framing |

## Source anchors
- [docs/PRODUCT_IDEATION_CONTEXT.md](PRODUCT_IDEATION_CONTEXT.md) — overall product mental model
- [docs/feature-science-map.md](feature-science-map.md) — feature → research mapping
- [src/components/StoppingStatePanel.vue](../src/components/StoppingStatePanel.vue) — the panel triage replaces
- [src/stores/sessionStore.js](../src/stores/sessionStore.js) — store with `createSubproblem` (the promotion primitive triage will use)
- [src/domain/graphMutators.js](../src/domain/graphMutators.js) — tree mutations
- [src/domain/sessionState.js](../src/domain/sessionState.js) — node-state overlay (where the dump artifact will live conceptually)
- [src/domain/resumableContextMapper.js](../src/domain/resumableContextMapper.js) — schema for resumable context persistence (dump artifact serialization happens here)
- [memory/project_tree_session_decoupling.md](../.claude/projects/C--Users-Migue-dev-mindstream/memory/project_tree_session_decoupling.md) — the tree-as-template / state-as-overlay decoupling that triage's two-tier output model honors
