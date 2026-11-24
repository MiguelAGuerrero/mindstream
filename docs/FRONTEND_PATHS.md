# Front-end path map

Route-mirrored layout: `App.vue` is the shell; features are top-level routes with co-located code.

## Routes

| URL | Route `name` | Page | Module |
|-----|--------------|------|--------|
| `/` | `home` | `src/dashboard/DashboardPage.vue` (launcher, lists `src/handoff/toolRegistry.js`) | `src/dashboard/` |
| `/thinkpad` | `thinkpad` | `src/thinkpad/ThinkPadPage.vue` | `src/thinkpad/` |
| `/focus` | `focus` | `src/focus/FocusRunnerPage.vue` (`/focus?handoff=<id>` opens the ready-to-start screen) | `src/focus/` |
| `/workflows` | `workflows` | `src/workflows/WorkflowsPage.vue` (`?id=<id>` editor; `?handoff=<id>` pick or save steps) | `src/workflows/` |
| `/sessions` | — | redirects → `/focus` | — |

Router: `src/router/index.js`  
Shell: `src/App.vue`  
Shell max-width values are inlined in `src/App.vue`. ThinkPad page sizing is inlined in `src/thinkpad/ThinkPadPage.vue`. Move vocabulary lives in `src/thinkpad/moves.js`.

## App shell (`src/App.vue`)

App bar, route chrome, `router-view`. Provides Focus UI state (`provideFocusUi`) and routes audio events (`src/sfx`). Each tool bootstraps its own store on its route.

## `src/thinkpad/` — `/thinkpad`

| Path | Role |
|------|------|
| `ThinkPadPage.vue` | Page orchestrator |
| `ThinkPadLayout.vue` | Route layout; hosts DecomposeHandoffPanel as a side column while a `think` request is open |
| `components/` | ThinkPadPanel, IdeaGutter, DraftPhaseBar, DecomposeHandoffPanel |
| `composables/` | useThinkPadPage, useThinkPadWelcome, useThinkPadDrill, useThinkPadReflect, useSessionUi |
| `dialogs/` | DocumentPickerDialog, OpenItemsDialog (the open-item gate) |
| `editor/` | TipTap editor internals |
| `domain/` | thinkPadModel (incl. the open-item gate), padDomain, padPersistenceMapper, blockActions, ideas, moveHandoff, decomposeReturn |
| `store/` | padStore, idClock |
| `persistence/` | padsDb |
| `moves.js` | Move vocabulary (domain data + helpers) |
| `utils/` | formatRelativeTime |

## `src/focus/` — `/focus`

| Path | Role |
|------|------|
| `FocusRunnerPage.vue` | Page |
| `components/` | ContextRail, ContextBoard, ContextTrail (stack + plan steps side panel), FocusComposer, SessionPromptCard (current focus only; decision buttons), HandoffReadyCard, DecomposeReturnDialog |
| `store/` | sessionRunStore (contexts, plans: `planSteps`, `startStep`, `jumpToStep`, `decideStep`, `reflectOnFocus`) |
| `model/` | session.js (frames, contexts, plan fields), decomposeHandoff.js (Focus's handoff adapter) |
| `composables/` | useTimer, useFocusUi, useFocusBootstrap, useFocusHandoff |
| `persistence/` | focusDb (own IndexedDB `mindstream_focus`) |

## `src/handoff/` — tool registry and messages
Shared channel between tools (the message in `PRODUCT_ASSESSMENT_AND_ROADMAP.md` §4.2); tools never read each other's state.
- `toolRegistry.js`: tools (name, job, route, icon, what each `receives`: `wants` verbs and whether it takes `steps`) and the shell's verb list `WANTS` (`step-through`, `think`, `choose-steps`, `keep`). `toolsFor(want, steps)` is the broker's match. The launcher lists the tools.
- `steps.js`: the step every tool exchanges, `{ prompt, produces: "text" | "action", expects?: "call", options? }`.
- `handoffModel.js`: pure `createRequest` / `normalizeReply` / `normalizeHandoffRecord` (also reads the earlier `{ from, task, result }` records) / `summarizeReplies`. `handoffStorage.js`: localStorage blob. `handoffStore.js`: Pinia store (`create`, `peek`, `consume`, `reply`, `get`, `replyFor`, `bindTarget`, `openFor`, `cancel`, `summaryFor`, `routeFor`).
- The URL carries only the request id.

## `src/workflows/` — `/workflows`

| Path | Role |
|------|------|
| `WorkflowsPage.vue` | Page: library, editor, or picker |
| `components/` | WorkflowLibrary, WorkflowEditor (decision steps), WorkflowPicker |
| `composables/` | useWorkflowsHandoff (answers `choose-steps`, handles `keep`, "Run as new context" asks for `step-through`) |
| `store/` | workflowStore (workflows only, never runs; bumps `version` when steps change; seeds the starter library once) |
| `model/` | workflow.js, defaultWorkflows.js |
| `persistence/` | workflowsDb (own IndexedDB `mindstream_workflows`) |

## Shared app infra

| Path | Role |
|------|------|
| `App.vue`, `main.js`, `style.css` | Bootstrap + app shell |
| `assets/` | Static assets |
| `router/index.js` | Route table |

## Removed (do not reference)

`src/domain/`, `src/stores/`, `src/models/`, `src/persistence/`, `src/layouts/`, `src/routes/`, `src/pages/`, `src/components/`, `src/composables/`, `src/shell/`, `src/utils/` (shell constants now in `src/constants/layout.js`)
