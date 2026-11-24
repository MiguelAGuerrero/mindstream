# Adversarial review: one core model for connection, theme, thesis and moves

Labels: **[repo]** read in the repo, **[inf]** inferred, **[op]** opinion.

## 1. Distillation

**What Miguel asserted**
- A1. A connection is a thought, written as text, that references two or more passages. It adds to the document and never replaces them. [repo: Revision 17]
- A2. Connections placed in the order you wrote things read as fragments, so something must let you reorganize the document by theme. [repo: Rev 17, Q14]
- A3. A theme is a collection of text that shows a recurring pattern. It is "a stronger version of connection" because it appears repeatedly. One passage can belong to several themes (redundancy is allowed), and themes do not block resolution. [repo: Rev 18]
- A4. A thesis is an argument, made stronger by themes and evidence. It is what resolves upward, and it carries its evidence with it. [repo: Rev 18]
- A5. Doubting or challenging something needs its own investigation, and a challenge needs evidence against the claim. A connection is not a resolution. [quote 3]

**What he was only wondering about**
- W1. Whether producing a thesis is the goal of the document.
- W2. Whether converging is a "mini thesis" or just a summary. He wavered between the two ("mini thesis or a summary rather").
- W3. Whether moves are not drill-in and drill-out actions at all, but categories, each shown its own way in the app.
- W4. Whether the moves should merge into one general workflow, or each be written as an explicit, reusable workflow.

**Tensions**
- **Heading or set?** He says "heading could be a theme". A heading groups by position, so each passage sits under one heading. He also says a passage can serve several themes, which needs a set. Q14's headings and Rev 18's redundancy cannot both be true. [inf]
- **Thesis vs rule 3.** Rule 3 says "the parent receives the result only". Quote 2 says the thesis "carries its evidence in context with it". The proposal's "shown collapsed" hides the conflict without settling it. [repo + inf]
- **Thesis vs decision 9 and rule 7.** A level ends in "a call or a sharper question", and every session can end in a next small action. A thesis is an argument. A sharper question is not one, and an action is not one either. If the thesis becomes the goal (W1), the identity in §1 changes. [repo + inf]
- **Repetition vs rule 5.** If a theme is defined by recurrence, something has to notice the recurrence. If the app notices it, the app is doing the inference, which edges toward the AI the product rules out. If the person notices it, a theme is just a labelled set. [inf]
- **Redundant cross-cutting themes** amount to tags and backlinks, which is note-vault territory. A Themes view comes close to "an outliner you browse". [op]
- **Mobile.** Referencing two or more passages that are not next to each other means selecting several spans by touch. That is the hardest gesture on a phone, and A1 depends on it. [inf]

## 2. Attacking the proposal

**Over-unified: theme is not the same object as connection or citation.** [inf, op] Apply decision 11 honestly.
- A citation points outside the document. It opens a URL, and attaching one closes the "needs a source" open item (Rev 15). The app treats it differently, so it is a type.
- A connection is written once, with fixed members.
- A theme has a name, its membership grows over time, it can be counted, and a thesis cites it. "Add this passage to the theme" is an action no connection has.

By decision 11, a theme is a type. The proposal folds three behaviours into "references" and then needs a special "Themes view" to undo the fold.

**Under-specified: the replace-or-add seam.** The choice is not free.
- An investigation on three separate passages cannot "replace" them, because there is no single place for the result to go. Revision 17 already dropped replacing convergence across passages. So with more than one anchor, the result can only be added. [repo + inf]
- It also undoes `moves.js`, where each move fixes its `writeBack`: clarify and resolve replace, the rest annotate. That may be right, but the proposal does not say it deletes this. [repo]

**Unaddressed: what happens to references when their passage is replaced.**
- Passages are found by their words. When the words are gone, the passage is marked lost (Rev 16). [repo]
- So converging a passage silently breaks every connection and theme that points at it. The more you resolve, the more references you lose. The proposal does not mention this, and it is the main failure mode. [inf]

**"One thesis per level" overloads the word.**
- Calling a Clarify result a "thesis" erases Miguel's own line between pattern and argument (A3, A4), and his doubt in W2. [op]
- The root document has no gate (capture-templates §8.4), and raw stream passages may never converge. So "one thesis" either does not apply at the root, or it pressures every dump to become an argument. That would be premature structure, which is Shipman and Marshall's failure mode (`reports/Mindstream comparable apps research.md`, the paragraph "Argument-mapping research is a warning about formality"). [repo + op]

**Moving the moves into the library breaks the tool contract.**
- Contract 1 says a tool "stands alone", and the library is a shell page (decision 16). If Doubt exists only as a library workflow, ThinkPad opened cold has no moves. [repo + inf]
- The header of `moves.js` defines a move as the "missing middle" between an intent and a heavy workflow: one question, one insight. Making each a one-step library workflow puts Preview and Method ceremony on a phone for a single prompt. [repo + op]

**Lost enforcement: mostly none, and that is fine.**
- The gate is structural (§8.1). Any investigation that has been started is an open item, so a doubt run as a workflow still blocks. [repo]
- "A challenge requires evidence" cannot be enforced without the app judging content, and rule 5 forbids that. Accepting it as a caveat is the honest escape. [op]
- The one closure the app does detect is "needs a source", which closes when a link is attached. It must survive as an explicit exception. [repo]

**Emergent complexity on a phone.** The proposal brings:
- selecting several passages at once,
- reference marks shown inline,
- a reference picker,
- a replace-or-add choice at resolve,
- collapsed evidence under the parent,
- a Themes view,
- handling for lost references,
- and Arrange (Q14), which is still pending.

That is about eight new surfaces against a "small surface" discipline. [inf]

## 3. Steelman alternative: synthesize in a drilled pad, not in the stream

Leave the stream as raw, ordered material and add no reference object to it. To synthesize, drill on the whole draft, or on any set of passages. The sub-pad opens blank, as today, with one extra action: **quote a parent passage in**.
- A quote is a copy that keeps a link back to its origin.
- You write the synthesis in thematic order from the start.
- Headings in the sub-pad are themes. Quoting the same passage under two headings gives the redundancy Miguel wants, with no set object.
- The sub-pad's resolution is the thesis, or the call. Its quotes are its evidence, archived with the process, so rule 3 holds.

**What it removes:** Arrange, the Themes view, inline reference marks, multi-select in the stream, and the lost-reference problem (quotes are copies).

**What it costs:**
- Quotes drift from a living source document. Rev 16 made documents living again.
- Connections are not visible when you reread the raw stream.

**When it beats the proposal:** for gather-then-synthesize work, like Miguel's workout-research scenario (Rev 14). On mobile, "drill, then quote" is two taps per passage.

**When it loses:** when the document keeps growing for weeks and you want connections to stay live against new text. [op]

**Prior art.**
- Matuschak's "outline substitution", and Patchwork's model of merging a branch as one unit, both treat synthesis as a separate working copy that folds back (`reports/Mindstream comparables primary source check.md`, "Resolve and fold-back"). [repo]
- The Roam discourse-graph extension infers relations from ordinary writing instead of having users draw them (comparable apps research, the same paragraph). That supports quoting over a reference graph. [repo]

## 4. The irreducible core (my model)

Four mechanics:
1. **Passage:** text.
2. **Investigation:** a blank sub-pad opened on one or more passages. It may be seeded by a built-in prompt (a move) or by library steps (a workflow). It is an open item until it is decided.
3. **Resolution:** one piece of text plus pointers to its anchors and to whatever it quoted.
   - It replaces its passage only when it has exactly one contiguous anchor. Otherwise it is added.
   - References follow a passage into its resolution. They are never marked lost.
4. **Gate:** as built.

On this model:
- A connection is an added resolution of an investigation on two or more passages.
- A theme is either a heading in a synthesis pad (section 3), or, if it must live inline, an added resolution whose anchor list can grow.
- A thesis is a name for a resolution that argues. It is not a mechanic.

**Decisions for Miguel**

1. **Is a thesis the goal of every level?**
   - Recommendation: no. Keep decision 9 ("a call or a sharper question") and rule 7.
   - "Thesis" names one kind of resolution, and rule 2 reads "one resolution", not "one thesis".
2. **Does evidence travel up as content or as pointers?**
   - Recommendation: as pointers. The parent shows the resolution plus "3 sources", which opens the archived working-out. Rule 3 holds.
   - Matuschak's "graveyard" warning applies: the archive must be one tap away (primary source check, "Tagging and the gate").
3. **Where do connections and themes live: inline in the stream, or in a synthesis sub-pad?**
   - Recommendation: build the synthesis sub-pad with quote-in first. It reuses drill and is cheap on mobile.
   - Defer Arrange (Q14) and the Themes view until a real document shows the sub-pad is not enough.
4. **Do the nine moves move into the library?**
   - Recommendation: no. Keep them as built-in one-line prompts so ThinkPad stands alone. Library workflows are for methods with several steps; tags stay as shortcuts (decision 22).
   - Delete the per-move `writeBack`: the number of anchors decides, with a choice only when there is exactly one.
5. **What happens to a reference when its passage is resolved?**
   - Recommendation: it follows the passage to its resolution, with provenance. Decide this before building anything that references, or every resolve will break your themes.
