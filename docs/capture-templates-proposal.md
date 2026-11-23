# Capture Templates: Design Proposal

**Date:** 2026-11-23
**Status:** Proposal. Nothing here is decided or built yet. §9 lists the open decisions.
**Builds on:** `src/thinkpad/moves.js` (the move vocabulary and its unused `escalatesTo` hook), `src/thinkpad/domain/thinkPadModel.js` (threads, sub-pads, `resolveThreadIntoParent`), `docs/recursive-resolve-contract.md`, `docs/stream-reflect-lifecycle.md`, `docs/GENERIC_PROBLEM_SOLVING_WORKFLOWS.md`.

**Requirements as given:**
- A move such as an *investigation* should provide a template for recording questions, observations, answers and the other parts of an investigation. The template can belong to the move itself or sit inside a workflow step, alongside the step's main prompt.
- Filling it in produces a **structured document**. Later steps in the same run, other pads or workflows, and the parent document can all use that document as input.
- Filling in the form **is** the deliberate practice of the method. It is not a separate feature.
- While writing, the form is **prompted prose sections**, not typed form fields.

---

## 1. The idea in one paragraph

A **capture template** turns a move's single driving question into a **method**: a short, ordered set of prompted sections. Performing the move opens a sub-pad with those sections already laid out. You write freely under them, in any order, using the existing stream and cultivate phases and moves. When you finish, the app **extracts a structured record** from your prose. You write one short converged takeaway (the *chunk*), and it folds back into the parent span just as moves do today. The full record is kept as a typed, immutable document. Later workflow steps, other pads and other workflows can pull its entries in as inputs. The section order *is* the method, so each time you fill in a template you practise that method once.

---

## 2. Where it fits: four scales

The header comment of `moves.js` already names three scales: **intent → move → workflow**. Templates fill the gap between a move and a workflow:

| Scale | What it is | Output | Exists today? |
|---|---|---|---|
| **Intent** | a passive noun: what kind of thought this is | a tag | yes (`INTENT_CLASSES`) |
| **Move** | an active verb: one question, one insight (the *lens*) | one string, spliced back | yes |
| **Capture template** | one move's question expanded into a method of prompted sections | a **record** plus a **chunk** spliced back | **new** |
| **Workflow** | an ordered chain of templates, with each step's outputs wired to later steps' inputs | a chain of records plus a final chunk | designed, not built |

**Recommendation for where templates attach** (you asked me to choose):

> **Templates belong to moves, and workflows are built from templates.**

- A move may name a `template`. Some moves are form-first, for example a new **Investigate** move, and performing them opens the form directly.
- Lens moves keep their one-line lens. Their existing `escalatesTo` becomes an **"Expand into form"** action that switches the thread to the move's template and carries what you already wrote into the first section.
- A workflow step *is* a template plus input bindings. Escalating to a workflow therefore uses the same form machinery, just several times in sequence.

This choice reuses everything the ThinkPad already does: sub-pads, drilling, stamping, the splice, and resolve-up. It also gives the unused `escalatesTo` field its job. The Focus runner is left out of v1 (§8).

---

## 3. Worked example: an Investigation

### 3.1 The template

```
Investigation (v1)                              writes back as: annotate
─────────────────────────────────────────────────────────────────────────
§ Question      kind: question        "What exactly am I trying to find out?"
                                      ← seeded from the highlighted span
§ Expect        kind: prediction      "Before looking: what do I expect to find,
                                       and how sure am I?"
§ Observe       kind: observation     "What did I actually see? Facts only, and
                                       note where I saw them."
§ Interpret     kind: inference       "What do those observations suggest?"
§ Answer        kind: answer          "Which questions can I now answer, and was
                                       my expectation right?"
§ Still open    kind: open-question   "What's unresolved, and what would settle it?"
§ Now I know    kind: finding  CHUNK  "What I now know is…"
```

### 3.2 Why this order is the practice

None of the following is a feature. Each point is a design rule for whoever writes a template:

- **Predict before you observe** (`Expect` comes before `Observe`). Writing down an expectation first is what makes the `Answer` prompt ("was my expectation right?") a calibration check rather than hindsight.
- **Keep observation separate from interpretation.** They are separate sections, so the form makes you sort each sentence into one or the other. That sorting is the skill.
- **Answer against the question.** `Answer` points back at `Question`, which closes the loop the investigation opened.
- **Name what's still open.** `Still open` is where the next piece of work comes from. It is the main output port (§5).
- **Converge last.** `Now I know` is the only required section. It turns the process into one chunk (principle #1 of the recursive-resolve contract: *fold the chunk, archive the process*).

Reading back old records then works as reviewing your practice, because each record has the same shape as the method.

### 3.3 What it looks like while you write

The sub-pad opens with the section headers in place and their prompts showing as placeholder hints. Your highlighted span is already under `Question`:

```
┌ Working on: Why did signups drop last week? ───────── Peek · Back · Complete ┐
│                                                                              │
│ § QUESTION                                                                   │
│   Why did signups drop last week?                                            │
│   Is it all channels or just paid?                                           │
│                                                                              │
│ § EXPECT                                                                     │
│   The pricing page change. ~60% sure.                                        │
│                                                                              │
│ § OBSERVE                                                                    │
│   Paid signups -40%, organic flat (dashboard, Mon–Sun).                      │
│                                                                              │
│   Pricing page deployed Tue; drop starts Thu.                                │
│                                                                              │
│ § INTERPRET                                                                  │
│   Timing doesn't line up with the pricing change.                            │
│                                                                              │
│ § ANSWER                                    (What did I find?)               │
│ § STILL OPEN                                (What's unresolved?)             │
│ § NOW I KNOW                                (What I now know is…)            │
└──────────────────────────────────────────────────────────────────────────────┘
       record: Q 2 · Expect 1 · Observe 2 · Interpret 1 · Open 0 · ☐ chunk
```

- **Capture first, structure later still holds.** Sections are places to write, not gates. You can write in any order, leave sections empty, or write first and move paragraphs into a section afterwards (the block reorder in `reorderBlock` already exists).
- **Each paragraph is one entry.** This matches the existing rule that a paragraph is an idea (`parseBlocks`, `docJSONToNodes`).
- **Moves still work inside the form.** Once you stamp the form into cultivate, you can apply a move to an entry: Doubt an observation, Support an inference, Branch an answer. Their insights land inside the section through the existing splice. A move inside a form can itself be form-backed. For example, investigating one observation produces a **child record** linked to its parent.

### 3.4 What comes out

On **Complete**, the app extracts the record, freezes it, and folds `Now I know` back into the parent span:

```jsonc
{
  "id": "rec_…",
  "templateId": "investigation", "templateVersion": 1,
  "kind": "investigation",
  "title": "Why did signups drop last week?",
  "source": { "padId": "pad_…", "threadId": "thread_…", "annotationId": "ann_…" },
  "parentRecordId": null,
  "createdAt": "…", "completedAt": "…", "revision": 1,
  "sections": {
    "question":  [{ "id": "q1", "kind": "question",      "text": "Why did signups drop last week?" },
                  { "id": "q2", "kind": "question",      "text": "Is it all channels or just paid?" }],
    "expect":    [{ "id": "e1", "kind": "prediction",    "text": "The pricing page change. ~60% sure." }],
    "observe":   [{ "id": "o1", "kind": "observation",   "text": "Paid signups -40%, organic flat (dashboard, Mon–Sun)." },
                  { "id": "o2", "kind": "observation",   "text": "Pricing page deployed Tue; drop starts Thu." }],
    "interpret": [{ "id": "i1", "kind": "inference",     "text": "Timing doesn't line up with the pricing change." }],
    "answer":    [{ "id": "a1", "kind": "answer",        "text": "Paid only. Not pricing; likely the ad account change Thu." }],
    "open":      [{ "id": "u1", "kind": "open-question", "text": "Did the ad targeting change on Thursday?" }],
    "chunk":     [{ "id": "c1", "kind": "finding",       "text": "The drop is paid-only and starts Thu, so pricing is ruled out; the ad change is the lead." }]
  },
  "carriedIn": [],
  "unsorted": []
}
```

- Empty sections stay in the record. An honest record shows what you skipped.
- Text written above the first header, or under a header the parser does not recognise, goes into `unsorted`. Nothing is lost.

---

## 4. Shared entry kinds: why records can feed *other* work

Every section declares a `kind` from **one shared vocabulary**. Inputs match on kind, not on which template produced the entry. That is what lets an Investigation feed an Experiment, or a Decision in a different pad, without either template knowing about the other.

```
question · prediction · observation · inference · answer · open-question
option · criterion · decision · action · risk · assumption · finding · lesson
```

Each kind maps onto the existing `INTENT_CLASSES`, so the planned intent detector and records use the same language:

| Entry kind | Intent class |
|---|---|
| question, open-question | QUESTION |
| inference, finding, answer, prediction | CLAIM |
| decision | DECISION |
| action | INTENTION |
| option | IDEA |
| assumption, risk | DOUBT |

---

## 5. Three ways a record's output is used

You chose all three of these.

### 5.1 Back into the document (the chunk)

- `Now I know` becomes the thread's step output and splices into the parent anchor through the existing `resolveThreadIntoParent` → `spliceStepIntoPad`.
- Each template sets its write-back: **annotate** for Investigation (findings add a perspective) and **replace** for Decision (mess becomes result), mirroring the moves.
- The anchor annotation gains a `recordId`. Clicking the folded insight opens the archived record read-only, so the process is collapsed but you can still check it.

### 5.2 Later steps in the same run (bindings)

A workflow is an ordered list of templates, where some of a step's sections are **bound** to earlier steps' outputs:

```
Investigate ──open──────────────▶ Experiment.question
     │                               │
     └──answer, observe──┐       result
                         ▼           ▼
                       Decide.evidence ◀───────
                         │
                       call (chunk) ──▶ replaces the original span
```

- When a step opens, its bound sections are **seeded with carried-in entries**. They are shown quoted, with a small provenance marker (`↳ from Investigate · u1`).
- You can edit or delete carried-in text in the new step, and the source record never changes.
- The carried-in references are stored on the record (`carriedIn: [{ section, recordId, entryId }]`), so every record knows what it was built on.
- A bound section with no matching entries simply opens empty.

### 5.3 Other pads and other workflows (the record library)

- Completed records are kept in their own **append-only store**. They outlive the pad's surface and can be queried by `kind`, `templateId` and source.
- **Bring in…** is available on any section. It opens a picker filtered to entries whose kind that section accepts, and inserts them as carried-in entries with provenance. It would reuse the `DocumentPickerDialog` pattern.
- **Start from record…** seeds a new pad or a new workflow run from a record's output ports. For example, every `open-question` becomes a candidate next investigation.
- Records are **immutable once completed**. Reopening a completed thread and completing it again mints `revision + 1`. Anything that already consumed revision 1 keeps pointing at it.

---

## 6. Data model sketch

Everything here is additive and follows the codebase conventions: tables hold data only and have no dependencies, so they can be tested in node; domain functions are pure and are given `now` and `makeId` rather than reading the clock or minting ids themselves.

### 6.1 New tables (`src/thinkpad/templates.js`, `src/thinkpad/workflows.js`)

```js
export const ENTRY_KINDS = Object.freeze([ "question", "prediction", /* … §4 */ ]);

export const CAPTURE_TEMPLATES = Object.freeze([{
  id: "investigation", version: 1, label: "Investigation",
  purpose: "Find something out without fooling yourself.",
  writeBack: "annotate",
  sections: [
    { key: "question",  label: "Question",   kind: "question",      prompt: "What exactly am I trying to find out?", seedFrom: "span",
      accepts: ["question", "open-question"] },
    { key: "expect",    label: "Expect",     kind: "prediction",    prompt: "Before looking: what do I expect to find, and how sure am I?" },
    { key: "observe",   label: "Observe",    kind: "observation",   prompt: "What did I actually see? Facts only, and note where.",
      accepts: ["observation"] },
    { key: "interpret", label: "Interpret",  kind: "inference",     prompt: "What do those observations suggest?" },
    { key: "answer",    label: "Answer",     kind: "answer",        prompt: "Which questions can I now answer, and was my expectation right?" },
    { key: "open",      label: "Still open", kind: "open-question", prompt: "What's unresolved, and what would settle it?" },
    { key: "chunk",     label: "Now I know", kind: "finding",       prompt: "What I now know is…", chunk: true },
  ],
}]);

export const WORKFLOWS = Object.freeze([{
  id: "investigate-test-decide", label: "Investigate → Test → Decide",
  steps: [
    { id: "s1", templateId: "investigation" },
    { id: "s2", templateId: "experiment", bind: { question: [{ step: "s1", section: "open" }] } },
    { id: "s3", templateId: "decision",   bind: { evidence: [{ step: "s1", section: "answer" },
                                                             { step: "s2", section: "result" }] } },
  ],
}]);
```

`moves.js` would get one optional field, `template: "<templateId>" | null`, and one new move:

```js
{ id: "investigate", label: "Investigate", icon: "mdi-magnify-scan", family: "examine",
  register: REGISTERS.REFLECTIVE, hint: "Find out, without fooling yourself.",
  prompt: "What do I need to find out, and what did I find?",
  answers: ["QUESTION", "DOUBT", "CLAIM"], writeBack: WRITE_BACK.ANNOTATE,
  template: "investigation", escalatesTo: "investigate-test-decide",
  resolutionPlaceholder: "What I now know is…" }
```

### 6.2 New fields on existing entities

| Where | Field | Meaning |
|---|---|---|
| `thread` | `form: { templateId, templateVersion, workflowRun?: { workflowId, stepId } } \| null` | `null` means a plain lens or drill thread, exactly as today |
| `thread` | `recordId: string \| null` | set when the form is completed |
| `annotation` | `recordId: string \| null` | lets the folded insight open its record |

### 6.3 New pure functions (`src/thinkpad/domain/captureForm.js`)

- `seedFormText(template, { span, carriedIn })` → the initial sub-pad text, with section headers and seeded entries.
- `parseForm(text, template)` → `{ sections: { key: Block[] }, unsorted: Block[] }`. It is built on `parseBlocks` and is **tolerant**: unknown or missing headers degrade into `unsorted` or empty sections and never throw.
- `extractRecord(thread, template, { now, makeId })` → a frozen `CaptureRecord`.
- `completeFormThread(pad, { threadId }, { now, makeId })` → `{ pad, record }`. It refuses when the chunk section is empty or longer than one block, then calls `resolveThreadIntoParent` with the chunk as `result`.
- `bindInputs(workflowStep, priorRecords)` and `entriesAccepting(section, records)`, both pure and used by §5.2 and §5.3.

### 6.4 Persistence

- Records go in a new `captureRecords` object store (`padsDb.js`, `DB_VERSION` 2 → 3), keyed by `id` and indexed by `kind`, `templateId` and `source.padId`.
- `padPersistenceMapper` normalises the new thread and annotation fields to `null` when they are missing.
- Templates are versioned (`templateVersion` on the thread and the record), so editing a template later does not silently change how old records are read.

---

## 7. Fit with the existing contracts

| Existing rule | What happens with forms |
|---|---|
| **A thread with more than one block can't be completed** (`threadIsOpen`, one-to-one substitution) | A form sub-pad is many blocks by design. For form threads the rule moves to the **chunk section**: that section must hold exactly one block. The rest of the form is the archived process. This is the same principle applied at section level. |
| **Capture-then-type** (resolve contract §3 #4) | Prose under headers, any order, nothing gates the writing, and structure is extracted afterwards. This is why you chose prose sections over typed fields. |
| **Fold the chunk, archive the process** (#1) | The chunk splices back. The record is the archive and can be opened again through `annotation.recordId`. |
| **Unclosed drills are worse than none** (#6) | Workflow step threads are created **when you advance to them**, never all at once. An abandoned run leaves at most one open step, which the panel shows. |
| **User-initiated, fading, never forced** (#7) | Templates appear only when you pick a template move or press *Expand into form*. Lens moves stay one line. |
| **Stream → stamp → cultivate** | A form sub-pad has a phase like any other sub-pad. Moves on entries happen after you stamp it. Draft history and reveal work unchanged because the form is still text. |

---

## 8. Not in v1

- **Templates you can edit in the app.** v1 ships built-in templates as data, like `MOVES`. An editor fits the original idea of *externalized methodologies* and comes later.
- **Explicit links between entries** (for example `a1 answers q2`). v1 relies on section order and position. A tolerant inline syntax such as `(re q2)` could come later.
- **Templates in the Focus runner.** Its frames would need to be persisted first. A frame could later adopt a template and show the section prompts on the sticky note.
- **Generated chunks.** You always write the convergence yourself, because that act is the practice.

---

## 9. Decisions to make before building

1. **How section headers are represented.** The recommendation is header paragraphs inside the text (for example `§ Observe`), styled and protected from edits by a TipTap extension using the same decoration approach as `thinkPadHighlightExtension`. Moves, annotations, stamping, draft history and the splice then all keep working on plain text. The alternative is a separate doc per section, which changes the pad locator and renders several editors. That is cleaner structurally but much more invasive.
2. **Who owns a record.** The recommendation is that records outlive their pad, because they are meant as inputs to other work. Deleting a pad would then leave its records in the library, marked as orphaned.
3. **Does Investigate replace Support's escalation?** Today `Support` escalates to *Research And Synthesize*. Investigate may cover that, or the two may stay separate.
4. **The starting template set.** The recommendation is Investigation, Experiment and Decision, which is enough to prove the binding chain in §5.2. Next would be Diagnose, Clarify and Reflect, taken from `GENERIC_PROBLEM_SOLVING_WORKFLOWS.md`.

---

## 10. Suggested build order

1. **Tables and pure core.** Add `templates.js`, `ENTRY_KINDS`, `parseForm`, `seedFormText` and `extractRecord`, all tested in node. Nothing in the UI changes.
2. **One form-backed move.** Add the Investigate move. Its sub-pad opens seeded, a header extension styles the sections, a live record strip shows counts, and Complete folds the chunk back. Records stay on the thread for now.
3. **Record library.** Add the `captureRecords` store, `annotation.recordId` with a read-only record viewer, and **Bring in…** / **Start from record…**.
4. **Workflow runs.** Add `workflows.js`, step threads created on advance, carried-in inputs with provenance, and wire `escalatesTo` to *Expand into form* / *Run workflow*.
