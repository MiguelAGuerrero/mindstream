# Mindstream

Mindstream is a thinking workspace that turns big, unclear things into small actions you can take. You bring a goal, a question or a mess. The tools help you get it out, break it down, work a method on the hard parts, and come back with an answer, a decision or a next step. Whatever a tool produces returns to the thought that asked for it.

It is a personal, local-first tool: one user, everything stored in the browser (IndexedDB), no accounts, no sync, and no AI generation. The app guides; you do the thinking.

## The tools

The workspace is a suite of independent tools. Each one stands alone, owns its own state and storage, and is useful without the others. Today there are three.

- **ThinkPad** (`/thinkpad`) is a document. You write freely (Stream), then freeze the draft (Reflect) and make moves on parts of it. A move drills a passage into its own blank sub-pad. You work the sub-pad down to one idea and resolve it, and that idea replaces the passage in the next draft. A sub-pad cannot resolve while it has undecided open items.
- **The Focus runner** (`/focus`) is a stepper. One focus is in view. You can decompose it into a smaller focus or a plan of steps, resolve it with a takeaway, or park the whole context while it waits on something. A decision step finishes by choosing one of its outputs.
- **Workflows** (`/workflows`) is the library of reusable methods. A workflow is an ordered list of steps; using one copies its steps into the tool that asked.

The home page (`/`) is a launcher for all three.

The tools never read each other's data. They pass text and lists of steps to each other as requests and replies (`src/handoff/`): ThinkPad can send a passage to the runner to focus on, the runner can send a step to ThinkPad to think through, and the runner can ask the library for steps. The fuller workspace shell (several tools on screen at once, "Send to…" on any text, a shared shelf) is planned in the roadmap.

## Run it

```sh
npm install
npm run dev     # start the dev server
npm test        # run the test suite (Vitest, Node, no browser)
npm run build   # production build into dist/
```

Stack: Vue 3, Vite, Vuetify, Pinia, TipTap, IndexedDB.

## Where to read next

- `docs/PRODUCT_ASSESSMENT_AND_ROADMAP.md`: identity, the tool contract, the message between tools, what exists, and the roadmap. Start with its revision notes.
- `docs/capture-templates-proposal.md`: workflows, the open-item gate and resolution. Start with its decisions table.
- `docs/FRONTEND_PATHS.md`: where the code lives.
- `docs/recursive-resolve-contract.md` and `docs/stream-reflect-lifecycle.md`: the design basis for ThinkPad (they use some older file paths and names).
- `reports/`: research on comparable apps.
- `docs/archive/`: documents about an earlier product. Do not use them as current context.
