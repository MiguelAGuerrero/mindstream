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
| `ThinkPadLayout.vue` | Route layout; hosts DecomposeHandoffPanel as a side column while a decompose request is open |
| `components/` | ThinkPadPanel, IdeaGutter, DraftPhaseBar, DecomposeHandoffPanel |
| `composables/` | useThinkPadPage, useThinkPadWelcome, useThinkPadDrill, useThinkPadReflect, useSessionUi |
| `dialogs/` | DocumentPickerDialog |
| `editor/` | TipTap editor internals |
| `domain/` | thinkPadModel, padDomain, padPersistenceMapper, blockActions, ideaParser |
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

## `src/handoff/` — tool registry and handoffs
Shared channel between tools; tools never read each other's state.
- `toolRegistry.js`: tools (name, job, route, icon, accepted intents) and `INTENTS` (`start-session`, `decompose`, `pick-steps`, `save-steps`). The launcher lists it.
- `steps.js`: the shared step type `{ title, decision?: { options } }` every tool exchanges.
- `handoffModel.js`: pure create/normalize/summarize; `task.steps` and `result.output: { text?, items? }`. `handoffStorage.js`: localStorage blob. `handoffStore.js`: Pinia store (`create`, `peek`, `consume`, `writeResult`, `get`, `resultFor`, `bindTarget`, `openFor`, `cancel`, `summaryFor`, `routeFor`).
- The URL carries only the handoff id.

## `src/workflows/` — `/workflows`

| Path | Role |
|------|------|
| `WorkflowsPage.vue` | Page: library, editor, or picker |
| `components/` | WorkflowLibrary, WorkflowEditor (decision steps), WorkflowPicker |
| `composables/` | useWorkflowsHandoff (answers `pick-steps`, handles `save-steps`, "Run as new context") |
| `store/` | workflowStore (templates only; seeds the starter library once) |
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
