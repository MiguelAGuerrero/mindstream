# Front-end path map

Checked against the source tree on 2026-11-24. If this file and the tree disagree, trust the tree and fix this file.

Each tool is a top-level route with its code in its own folder. The two tools share no stores, models or persistence (see the tool contract in `PRODUCT_ASSESSMENT_AND_ROADMAP.md` §4.1).

## Routes

| URL | Route `name` | Layout | Page |
|-----|--------------|--------|------|
| `/` | `home` | none | `src/home/Home.vue`: launcher with one card per tool |
| `/thinkpad` | `thinkpad` | `src/thinkpad/ThinkPadLayout.vue` | `src/thinkpad/ThinkPadPage.vue` |
| `/focus` | `focus` | `src/focus/FocusLayout.vue` | `src/focus/FocusRunnerPage.vue` |
| anything else | | | redirects to `/` |

Router: `src/router/index.js`.

## App shell

| Path | Role |
|------|------|
| `src/main.js` | Creates the app; registers Vuetify, Pinia, the router and the Material Design Icons font |
| `src/App.vue` | Global app bar (logo goes home) and the routed view inside a fade transition |
| `src/style.css` | Global styles |
| `src/assets/` | `mindstream-icon.svg`, `vue.svg` |

There is no workspace shell yet (registry, broker, shelf, layout). That is Phase 3 of the roadmap.

## `src/thinkpad/`: ThinkPad

| Path | Role |
|------|------|
| `ThinkPadLayout.vue` | Route layout: renders `ThinkPadAppBar`, sets page width, bootstraps pads |
| `ThinkPadPage.vue` | Page: document picker grid, drill bar, panel, ideas, open-items dialog |
| `components/` | `ThinkPadPanel` (TipTap editor surface), `DraftPhaseBar` (Stream/Reflect pill), `IdeasPanel` (move chips), `ThinkPadAppBar` |
| `composables/` | `useThinkPadSurface` (current surface, resolve, drill threads), `useThinkPadReflect`, `useThinkPadWelcome`, `useThinkPadBootstrap`, `useSessionUi` |
| `dialogs/` | `DocumentPickerDialog`, `OpenItemsDialog` (the open-item gate) |
| `editor/` | TipTap extensions: title, doc schema, highlights, block actions |
| `domain/` | Pure core. `thinkPadModel.js` (reducers), `padDomain.js` (public re-exports), `padPersistenceMapper.js` (normaliser, fills new fields), `blockActions.js`, `ideaParser.js`, `__testkit__.js` (deterministic clock and ids for tests) |
| `store/` | `padStore.js` (Pinia; passes clock and ids into the domain), `idClock.js` |
| `persistence/` | `padsDb.js` (IndexedDB) |
| `moves.js` | Move vocabulary: nine moves in four families. Only Question, Expand and Flag reach the UI |
| `utils/` | `formatRelativeTime.js` |

## `src/focus/`: Focus runner

| Path | Role |
|------|------|
| `FocusLayout.vue` | Route layout |
| `FocusRunnerPage.vue` | Page: context rail, the focus card, one composer dialog (decompose / resolve / park / new) |
| `components/` | `ContextRail`, `FocusComposer`, `SessionPromptCard` |
| `store/` | `sessionRunStore.js` (Pinia; in memory only, lost on reload) |
| `model/` | `session.js` (pure frame and context constructors) |
| `composables/` | `useTimer.js` |

## Tests

Tests sit beside the code as `*.test.js` and run in Node without a DOM (`npm test`).

## Removed (do not reference)

`src/workflow/`, `src/domain/`, `src/stores/`, `src/models/`, `src/persistence/`, `src/layouts/`, `src/routes/`, `src/pages/`, `src/components/`, `src/composables/`, `src/shell/`, `src/utils/`, `src/constants/`. Documents that describe these are in `docs/archive/`.
