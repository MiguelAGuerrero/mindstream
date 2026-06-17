# Front-end path map

Route-mirrored layout: `App.vue` is the shell; features are top-level routes with co-located code.

## Routes

| URL | Route `name` | Page | Module |
|-----|--------------|------|--------|
| `/` | — | redirects → `/thinkpad` | `src/App.vue` (shell) |
| `/thinkpad` | `thinkpad` | `src/thinkpad/ThinkPadPage.vue` | `src/thinkpad/` |
| `/focus` | `focus` | `src/focus/FocusRunnerPage.vue` | `src/focus/` |
| `/sessions` | — | redirects → `/focus` | — |

Router: `src/router/index.js`  
Shell: `src/App.vue`  
Shell max-width values are inlined in `src/App.vue`. ThinkPad page sizing is inlined in `src/thinkpad/ThinkPadPage.vue`. Move vocabulary lives in `src/thinkpad/moves.js`.

## App shell (`src/App.vue`)

App bar, route chrome, `router-view`, document picker, pad/workflow bootstrap.

Imports from thinkpad: `padStore`, `DocumentPickerDialog`, `useSessionUi`, `useThinkPadPage`  
Imports from workflow: `workflowStore.ensureDefaults()`

## `src/thinkpad/` — `/thinkpad`

| Path | Role |
|------|------|
| `ThinkPadPage.vue` | Page orchestrator |
| `components/` | ThinkPadPanel, IdeasPanel, DraftPhaseBar |
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
| `components/` | ContextRail, FocusComposer, SessionPromptCard |
| `store/` | sessionRunStore |
| `model/` | session.js |
| `composables/` | useTimer |

## `src/workflow/` — deferred (bootstrap only)

| Path | Role |
|------|------|
| `store/workflowStore.js` | Template library bootstrap |
| `persistence/workflowLibraryDb.js` | IndexedDB |
| `model/workflowTemplate.js` | Normalization |

## Shared app infra

| Path | Role |
|------|------|
| `App.vue`, `main.js`, `style.css` | Bootstrap + app shell |
| `assets/` | Static assets |
| `router/index.js` | Route table |

## Removed (do not reference)

`src/domain/`, `src/stores/`, `src/models/`, `src/persistence/`, `src/layouts/`, `src/routes/`, `src/pages/`, `src/components/`, `src/composables/`, `src/shell/`, `src/utils/` (shell constants now in `src/constants/layout.js`)
