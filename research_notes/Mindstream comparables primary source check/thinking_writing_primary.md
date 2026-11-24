# Primary-source check: tools-for-thought and writing apps versus Mindstream's ThinkPad

Research date: 2026-11-24. Method: pages were downloaded with curl and read as text, not via search summaries. Quotes are verbatim from the page at the URL given.

Read in full: Ink & Switch "Upwelling" (March 2023), the whole Patchwork "Version Control" notebook, entries 01 to 11 (Feb to Jul 2024), and the "Universal Version Control" landing page. Andy Matuschak: 12 notes (listed below). Allume: home page, FAQ, v4 memo, linked-cards memo. Tana: "Proposals and actions" page.

Read in part (targeted sections only): Ink & Switch "Malleable software" (June 2025; sections "Sharing data between tools", "Composing the user interface", "Patchwork"), "Peritext" (Nov 2021; intro, motivation, conclusion), "Muse" (April 2019; sections on cards, zooming navigation, shelf, excerpting). Workflowy "What's new" page (Panes entry read in full, rest scanned by keyword). Tana "Docs" page (keyword scan). Allume updates page (v4.x entries).

NOT readable (blocked by this session's network policy, HTTP 403 from the egress proxy or DNS refusal):
- `community.workflowy.com`: every Workflowy help URL (`workflowy.com/help/panes`, `/help/mirrors`, `/help/navigate-around`, `/help/sidebar-navigation`, `/learn/mirrors`) now 301-redirects to this host. No Workflowy help article could be read.
- `outliner.tana.inc`: `tana.inc/docs` and all old doc paths 308-redirect here. No Tana Outliner documentation could be read.
- `publish-01.obsidian.md` and `help.obsidian.md`: `docs.obsidian.md` returns only an Obsidian Publish shell that loads its content from the first host. No Obsidian documentation could be read.
- `www.gnu.org` (Org manual) failed in this session, so Org capture/refile could not be quoted.

## Verdicts on claims (a), (b), (c)

### Takeaway
(a) and (b) are confirmed by the primary sources that were reachable and contradicted by none, but remain unverified for Workflowy's zoom and mirror help text, Tana Outliner and Obsidian because those hosts were blocked. (c) needs narrowing: Ink & Switch's Upwelling prototype (2023) already has an immutable merged history that can only be changed through a separate, titled, reviewable unit merged as a batch, so the novelty is in what the permitted operations are, not in freezing as such.

### Cited Findings
- Claim (a), "outliners zoom into existing content; none opens a blank working page". Status: CONFIRMED for Workflowy panes; REFINED by Muse; UNVERIFIED for Workflowy zoom, Tana Outliner, Obsidian. Workflowy (7 Sep 2026): "Each pane is a view of an existing node, not a duplicate. Any edits you make in a pane update the original everywhere it appears." — [Workflowy What's new](https://workflowy.com/whats-new/)
- Refinement to (a): the Muse prototype did open a blank child workspace inside the current one: "In Muse we achieve this instant-start by dragging from the edge of the screen to create a new nested board." and the figure caption "Pulling in new a blank board—as a card nested in the current board—from the edge of the screen." The blank board is a new card, not a drill into an existing piece of text, and it carries no goal line or parent excerpt. — [Ink & Switch: Muse](https://www.inkandswitch.com/muse/) (April 2019)
- Claim (b), "no tool substitutes a condensed child result into the parent span; mirrors, embeds and synced blocks keep identical content in two places". Status: CONFIRMED for the sources read (Workflowy panes, Allume linked cards, Matuschak's description of Obsidian); UNVERIFIED for Workflowy mirrors help, Tana Outliner and Obsidian's own docs. Allume linked cards: "Linked cards are identical and tied together by locations. All linked cards are equal in rank; there’s no “original” card. Any changes you make to one linked card will be reflected on all others." — [Allume memo: Linked cards](https://allume.com/memos/2022-09-linked-cards/) (Sept 2022; the page notes linked cards became available to everyone in Muse 2.3)
- Nearest thing to (b) in the sources: merging a branch or draft of the whole document back into the main version. Patchwork: "Eventually, any given branch can be merged back to the main doc—or discarded if it turned out to be a direction that didn’t work out." and "When you merge the branch, it’s deleted. There’s no cleanup step." This is a full-document variant merged by diff, not a separate workspace whose condensed outcome replaces one span, and the branch is deleted rather than archived. — [Patchwork notebook 06, Simple branching](https://www.inkandswitch.com/patchwork/notebook/2024-version-control/) (5 Mar 2024)
- Claim (c), "no tool freezes a draft and allows only structured revision operations". Status: REFINED (partly contradicted as worded). Upwelling: "Instead of writers editing the document directly, a document is built out of layers, and every edit occurs within one." and "A merged layer can no longer be modified; to make any further edits, the writers must create a new draft." and "Changes to the document must be made on a draft. When the draft is ready, it is merged onto the stack." — [Ink & Switch: Upwelling](https://www.inkandswitch.com/upwelling/) (March 2023)
- What still holds of (c): inside an Upwelling draft editing is unrestricted: "Within the draft, a writer can edit the document as they would in any other text editor: by inserting or deleting text, by changing its formatting (e.g., from roman to italic), or by leaving comments." No source read restricts revision to a fixed vocabulary of operations. — [Upwelling](https://www.inkandswitch.com/upwelling/)

### Inferences
- Safe wording for a report: "No tool found opens an existing passage as a blank nested page with the passage held as a prompt, and none replaces a span with the condensed result of separate work. Freezing the base text and admitting changes only as reviewed batches has clear prior art in Upwelling; ThinkPad differs in being single-user and in restricting the change operation itself."
- Muse's blank nested board plus Heptabase's sub-whiteboards (first pass) show "blank child workspace" exists on canvases. What is unmatched is binding that blank space to a specific span of a parent text and returning a result to it.

### Gaps
- Workflowy zoom, breadcrumb and mirror behaviour in the help articles, Tana Outliner, and Obsidian embeds/block references/page preview could not be checked. For those three products the first pass's search-summary findings remain the only evidence. Hosts to allow: `community.workflowy.com`, `outliner.tana.inc`, `help.obsidian.md`, `publish-01.obsidian.md`.

## Ink & Switch: drafts, branches, batch review and versions of prose; Malleable Software on shared data

### Takeaway
Upwelling and Patchwork are the strongest prior art for ThinkPad's version model: titled drafts merged as a batch onto an immutable, linear stack (Upwelling), and low-ceremony branches from main only, shown as single items in a history timeline with user-marked milestones (Patchwork). Neither describes replacing one passage with the outcome of separate work, and both are framed around multi-author collaboration, with Upwelling explicitly out of scope for solo writing.

### Cited Findings
Upwelling (March 2023), [https://www.inkandswitch.com/upwelling/](https://www.inkandswitch.com/upwelling/):
- Scope: "As we are interested in the social process of writing, Upwelling is designed for multi-author collaboration, not for individual writing." It is "a research prototype, not a finished product".
- Model: "Layers are titled, have one or more authors, and support comments for discussion or review. A layer can be edited until it is merged and joins the stack. The stack contains the complete editing history of the document."
- Drafts: "An Upwelling document is always edited within a layer. We call unmerged layers “drafts”. To change the document, a writer creates a draft and gives it a title to describe their intent to other contributors."
- Batch: "A merged layer is placed on the top of the stack. The stack captures the full editing history of the document, starting from the moment it was created as an empty document, and each merged layer represents a batch of changes relative to the previous (lower) layer."
- Accept or reject per batch: "The primary means for accepting or rejecting changes in Upwelling is per-draft: an editor can choose to merge or, alternatively, delete a whole draft at once."
- Linear versions: "rebasing every layer onto the stack before it is merged ensures that the stack forms a linear version history, which is easier to read than a complex history with branching and merging."
- No nested drafts, by design: "A key insight of Upwelling is therefore that there should be no dependence between one draft and another". They tried Git-like dependent drafts and "found that it made the model more difficult for users to understand and did not add meaningful value."
- Comparing versions: "Clicking on a layer in the stack updates the highlighted text to reflect all changes that have been made between that point in time and the current draft." Deletions are hidden behind a marker rather than struck through, "allowing the reviewer to see the deleted text by hovering the mouse over the ➰ symbol."
- Folk practice of fold-back (interview quote, Newspaper Editor): "If you don’t want the editor or writer to see what you’re doing until you’re done, sometimes you make a copy of the doc and work in the copy, then paste it back (otherwise you have 17 canonical documents and people are editing the wrong thing)."
- Freeze after review, as a newsroom practice not a product feature: "once an editor has read a draft article, writers are no longer allowed to modify it and any further updates require explicit review and sign-off from the editor."
- Read-only multi-draft preview is proposed only as future work: "the document would probably have to be read-only when viewing multiple drafts at the same time."

Patchwork notebook, "Version Control" (Feb to Jul 2024), [https://www.inkandswitch.com/patchwork/notebook/2024-version-control/](https://www.inkandswitch.com/patchwork/notebook/2024-version-control/):
- 02 Writing prose (15 Feb 2024): "Some writing tools offer basic version control capabilities: Google Docs’ suggestion mode, Word’s track changes, Scrivener’s named snapshots. But these features are limited compared to the powerful capabilities that software engineers have in their version control tools."
- 02 on Upwelling: "One of its core ideas was the concept of “drafts” as a form of lightweight branching, granting creative privacy to authors on multi-author documents."
- 03 Dynamic history (22 Feb 2024): dynamic history is "Auto-save every character typed into a doc", "Offer flexible views of the history depending on the task", "Allow users to mark important milestones".
- 05 Edit groups (29 Feb 2024): a criticism of formality that applies to ThinkPad's one-way freeze: Upwelling "was even more formal, requiring authors to create an explicit “draft layer” before making any edits." The stated principle is "formality on demand: choose the level of structure you want, and avoid needless ceremony."
- 05 finding against batching for prose: "Because writing edits often consist of many small changes that could be independently merged, it’s possible that grouping edits into atomically revertable units isn’t a common need in this domain."
- 06 Simple branching (5 Mar 2024): "There’s no branching from branches. You can only create branches from main, and merge back to main. (This seems sufficient for most writing use cases, although we’ve already encountered occasional cases where it’s not enough.)" Solo use is reported: "we’re finding the prototype compelling for individual use (e.g. trying experimental directions)".
- 06 retroactive branch: "You can also create a branch retroactively with your current edit session, including a mouse-over diff that shows what changes will go into the branch (and be removed from main) if you pick this."
- 09 Version history as chat (28 Mar 2024): "Branch merges shown a single item in the history encourages us to use branches as a unit to encapsulate work. We’ve enjoyed how this makes a batch of changes feel more satisfying to finish and merge." Also: "There are markers for significant moments: merged branches appear prominently, and users can mark significant milestones."
- 04 Diff visualizations (23 Feb 2024): "Our team’s favorites so far are the hover-to-show-deleted (full document) and the minibar (summary)." and "We’ve found that character count isn’t the right metric for prose, but word/sentence counts are better."

Peritext (November 2021), [https://www.inkandswitch.com/peritext/](https://www.inkandswitch.com/peritext/) (intro, motivation and conclusion read; algorithm sections skimmed):
- It is a merge algorithm, not a workflow: "Peritext is only the first step towards a system for asynchronous collaboration: it simply allows two versions of a rich-text document to be merged automatically."
- "Asynchronous collaboration requires a Git-like model where multiple versions (branches) of a document can exist side-by-side, and those versions can be merged when the users are ready to do so."

Malleable Software (June 2025), [https://www.inkandswitch.com/essay/malleable-software/](https://www.inkandswitch.com/essay/malleable-software/) (relevant sections read):
- "If we’re going to use different software tools together in coordination to get a job done, it’s essential that those tools can operate on one shared reality."
- "In modern cloud and mobile platforms, each application manages its own data in a private silo." and "When data is instead shared among applications, it empowers end users to compose tools in more flexible ways. One well-known example is the desktop filesystem."
- "We believe a missing ingredient in today’s ecosystem is a modern equivalent to the filesystem, with better support for collaboration."
- The essay does not set up "shared data versus messages" as an explicit opposition. Its one passage on messages is about Dynamicland: "Communication between these objects happens through a global database. As a result, it’s possible to add new tools into the system that intercept messages between existing objects, modifing the behavior of existing tools. When a system doesn’t assume up front that certain connections exist between senders and receivers of information, it’s easier to additively extend the system with new uses of that information."
- It concedes shared data is not enough for UI parts: "We’ve also gradually discovered many reasons why UI components need to communicate in richer ways."
- On Patchwork there: "Two Patchwork tools can edit/view the same underlying Automerge document."

Muse design article (April 2019), [https://www.inkandswitch.com/muse/](https://www.inkandswitch.com/muse/) (relevant sections read):
- Returning to the parent is the inverse zoom gesture: "It also means you never lose your orientation, as every successive screen flows smoothly from the last (and you can always pinch in to get back)."
- Peek: "The user can “peek” into documents by zooming in and then back out in one gesture."
- "An important implication of the zooming design is that there’s no “opening” or “closing” documents."
- Scratch space that travels with you: "In Muse, we try to replicate this concept of an informal scratch space with something we call the shelf. The shelf can be summoned and dismissed with a swipe, and it moves with you as you zoom around the space."
- Excerpt with provenance and peek-at-source: "Excerpts also know where they came from, and can take you back to that context." and "By default, the movement is just a peek, and the user returns to their previous location when letting go."

### Inferences
- Upwelling maps onto ThinkPad closely: stack = numbered draft versions; draft layer = a staged set of resolves; merge = apply together as the next version; "a merged layer can no longer be modified" = freeze. Differences: Upwelling drafts are whole-document, flat (no nesting), multi-author, and freely edited; ThinkPad's unit of work is a nested page tied to one span.
- Patchwork's own later judgement cuts against ThinkPad's rigidity: they moved from mandatory drafts to "formality on demand" and editing main by default. A report should present the one-way freeze as a deliberate bet against that finding, justified by single-user thinking rather than collaboration.
- Borrowable: Upwelling's titled drafts (title states intent, like ThinkPad's goal line); hover-to-reveal deletions; choosing any earlier layer as the comparison base; Patchwork's merged-branch-as-one-timeline-item and user-marked milestones; word or sentence counts for change size; Muse's hold-to-peek at the source that returns you on release.
- No Ink & Switch piece read describes a nested workspace whose outcome replaces a passage. The Upwelling editor's copy, work, paste-back habit is the closest described behaviour, and it is a workaround, not a feature.

### Gaps
- Peritext, Malleable Software and Muse were not read end to end; statements above are limited to the sections named.
- Jacquard and Backstitch (listed on the Universal Version Control page) and Patchwork notes after July 2024 were not read.
- The Upwelling demo itself was not tried.

## Andy Matuschak's notes: stacked panes, evergreen notes, garage door, writing as refinement

### Takeaway
His notes state the evergreen-note and incremental-writing ideas first-hand, and several support ThinkPad's rationale (small self-contained units as checkpoints, a release valve for tangents, distrust of "graveyard" sections). The stacked-pane pattern is NOT described in prose in any note read; it is only a behaviour of the site, so the first pass's second-hand attribution stands uncorrected and unconfirmed in his own words.

### Cited Findings
The notes carry no visible publication dates; they are living documents, read 2026-11-24.
- Evergreen notes: "Evergreen notes are written and organized to evolve, contribute, and accumulate over time, across projects." Listed principles include "Evergreen notes should be atomic", "Evergreen notes should be concept-oriented", "Evergreen notes should be densely linked", "Prefer associative ontologies to hierarchical taxonomies". — [Evergreen notes](https://notes.andymatuschak.org/Evergreen_notes)
- Garage door: "One of my favorite ways that creative people communicate is by “working with their garage door up,” to riff on a passage from Robin Sloan (below). This is the opposite of the Twitter account which mostly posts announcements of finished work". It is about public sharing of process, not about note structure. — [Work with the garage door up](https://notes.andymatuschak.org/Work_with_the_garage_door_up)
- Site navigation, first-hand: "For now, there’s no index or navigational aids: you’ll need to follow a link to some starting point." Nothing on that page describes stacked or sliding panes. — [About these notes](https://notes.andymatuschak.org/About_these_notes)
- Stacked panes: the page HTML contains the identifier `stackedNotes`, which shows the site implements a stack, but no note read explains or argues for it. — [Evergreen notes (page source)](https://notes.andymatuschak.org/Evergreen_notes)
- Blank page as the problem: "A naive writing process begins with a rough inkling about what one wants to write and a blank page. Progress from this point requires an enormous amount of activation energy and cognitive effort: there’s nothing external, so you must juggle all of the piece-to-be in your head." — [Executable strategy for writing](https://notes.andymatuschak.org/zCknixwETdFm1MWdWPwMcXs)
- Assembly by substitution of whole notes, then rewriting: "Attach existing notes to each point in the outline; write new notes as needed." / "Concatenate all the note texts together to get an initial manuscript" / "Rewrite it." The quoted Zettelkasten source says "I replaced the IDs with the content of the Zettels. Voilá. A manuscript was ready." — [Executable strategy for writing](https://notes.andymatuschak.org/zCknixwETdFm1MWdWPwMcXs); [Create speculative outlines while you write](https://notes.andymatuschak.org/z79rMNNuLrUj6R8q1CXSpDm)
- Small units as checkpoints: "These small, self-contained notes represent regular checkpoints." Against large manuscripts: "Different parts of the document are at different levels of fidelity. The document is large enough that it’s easy to lose one’s place or to forget where other relevant points are when one returns." — [Evergreen notes permit smooth incremental progress in writing](https://notes.andymatuschak.org/zNqLdKMiTo9EHA9EWYGXs7b)
- Release valve: "by making non-linear structures available for work-in-progress, you create a release valve for tangential thought—which in turn can free the author to focus on their “primary” line of thinking." Also: "Linear authoring environments like word processors force the author to create bubbles of non-linearity inside their linear work, e.g. by making appendices or colored “stray notes” sections or using Google Comments. These approaches all feel strained and unnatural". — [Release valves for non-linear thought may support improved linear output](https://notes.andymatuschak.org/zDGk8tvVDD1mbTgpMMB5UGh)
- Archiving that is not trusted: "if you’re revising an essay, you might struggle with an interesting paragraph which doesn’t really belong. It feels destructive to delete the paragraph, and if you move it to a “graveyard” section, you don’t trust that you’ll ever see it again." and "Typical software systems are over-formal. They insist on finality". — [Software interfaces often harmfully frame destructive operations as final decisions, not contingent preferences](https://notes.andymatuschak.org/z4xE8FBHhDo5pTvJuCBPRYC)
- Writing inbox: "a quick way to capture transient notes which clearly isolates them from evergreen notes; and a place to put notes you want to develop further and a practice which reliably drains it". — [A writing inbox for transient and incomplete notes](https://notes.andymatuschak.org/zUP4GuzPF33dWkZPiu9N6V5)
- Scratch then develop: "I’ll use my Daily working log as a scratch space, splatting a dozen or so one-liners into a haphazard bulleted list. After emptying my head, I’ll write about any that seem interesting." — [My morning writing practice](https://notes.andymatuschak.org/zHTevHGZQPu8QHpRhUmtsuK)
- Maturity ladder: "the practice of writing and revising notes is, at its core, about trying to move up the following rough ladder", from "Ephemeral scratchings" through "Prompts and incomplete notes in writing inbox" to evergreen notes and "Outline notes". — [Taxonomy of note types](https://notes.andymatuschak.org/zTDjZQbKAT9pALtsk2HfePx)
- His reading of Obsidian (second-hand for Obsidian, undated): "transclusion and linking supported to individual paragraphs, heading sections" and "cannot edit transcluded content at transclusion sites". — [Networked note-writing software](https://notes.andymatuschak.org/zJRmoVPc9vyv8QxSD5voijR)

### Inferences
- These notes support ThinkPad's design rationale more than they supply prior art. The sub-pad is a "release valve" that is tied back to the main line; resolve plus archive answers the "graveyard you don't trust" problem only if the archive is easy to reach from the resolved span.
- His method is the reverse of ThinkPad's order: he writes small notes first and concatenates them into a manuscript; ThinkPad free-writes the manuscript first and then decomposes. His substitution step inserts whole notes unchanged, so it does not contradict claim (b).
- His warning that "Typical software systems are over-formal. They insist on finality" is a caution about ThinkPad's freeze and gate.

### Gaps
- No first-hand rationale for stacked panes was found on notes.andymatuschak.org. A web search restricted to finding one returned only third-party plugin discussion ([Obsidian forum](https://forum.obsidian.md/t/sliding-panes-andy-matushcak-mode-plugin/7652/54)). He may have explained it elsewhere (social media, talks); not checked.
- Only 12 notes were read; the site has no index, so a relevant note may have been missed.

## Workflowy: zoom, breadcrumbs, panes, mirrors

### Takeaway
Only the "What's new" page and the home page are readable; all help articles now live on a blocked host. What is readable confirms panes are live views of existing nodes (shipped August 2026, announced 7 September 2026) and shows no feature that opens an empty workspace on zoom or replaces an item with a summary of its children.

### Cited Findings
- Panes are new: "Much requested, and finally here, you can now open Panes in Workflowy. Panes keep multiple parts of your Workflowy outline open side by side in the same window." Entry titled "Update 2026.08: Panes and more...", dated September 7, 2026. — [Workflowy What's new](https://workflowy.com/whats-new/)
- "Each pane is a view of an existing node, not a duplicate. Any edits you make in a pane update the original everywhere it appears." — [Workflowy What's new](https://workflowy.com/whats-new/)
- "To create a new pane, press the 'New pane' button in the header. To open a specific node, hold Alt (Option on Mac) and click its bullet, choose Open in Pane from the node menu, or type /open in pane." and "Panes are available in desktop browsers and the Workflowy desktop apps. No mobile support (yet)." — [Workflowy What's new](https://workflowy.com/whats-new/)
- Mirrors are treated as copies of the same node throughout the changelog, for example "Turning a numbered node into another type now updates properly in Mirror copies." and "Exports now include mirrored descendants even if they weren't expanded on screen." — [Workflowy What's new](https://workflowy.com/whats-new/)
- Summarising exists only as an AI text action, not a structural roll-up: "Pro subscribers with AI enabled can use AI Quick Actions. Edit and create content right in your notes. You can summarize, create outlines, extract tasks, fix grammar, and shorten text. Type /ai to use them." — [Workflowy What's new](https://workflowy.com/whats-new/)

### Inferences
- The first pass quoted the panes help page as saying "A pane is another view of an existing item, not a duplicate. Each pane has its own breadcrumbs, search, back and forward history, scroll position, and page controls." The changelog wording matches its first sentence; the second sentence (per-pane breadcrumbs) could not be re-checked.
- The "New pane" button may open a pane on something other than a chosen node (for example home); what it opens is not stated in the changelog. Nothing suggests it is a blank scratch page.
- A keyword scan of the changelog (zoom, mirror, pane, breadcrumb, summar, replace, version, history, lock, read-only) found no "replace parent with children summary", no draft freezing and no versioned drafts. Absence in a changelog is weak evidence.

### Gaps
- Exact zoom, breadcrumb and mirror behaviour from the help articles: unverified. All of `workflowy.com/help/*` and `/learn/*` redirect to `community.workflowy.com`, which this session cannot reach.
- Whether zooming into an empty item shows an empty workspace (it presumably shows an item with no children, which is functionally blank) could not be confirmed from a primary page.

## Tana: zoom, panels, references, roll-ups

### Takeaway
The Tana documentation the first pass meant is unreadable: `tana.inc/docs` now redirects to `outliner.tana.inc`, which is blocked. A product change the first pass missed: tana.inc now documents a different, document-and-meeting product called "Tana", with the outliner branded "Tana Outliner" as a separate app. The new Tana has a relevant mechanism: every AI change is a reviewable proposal with versions, accepted singly or all at once.

### Cited Findings
- Two products: "If you use both Tana and Tana Outliner, you can connect them so everything in your Outliner graph is available to Tana’s AI chat." and "Remote MCP is in beta and requires a paid Tana Outliner plan." — [Tana guide: Connect Tana to Tana Outliner](https://tana.inc/learn/guides/connect-tana-outliner)
- The outliner is described there as a hierarchy with references: the AI can "Read and navigate: read a node and its children, and walk the tree around it" and "The AI follows references rather than reading only the node you named". — [Tana guide: Connect Tana to Tana Outliner](https://tana.inc/learn/guides/connect-tana-outliner)
- Proposals (page metadata dateModified 2026-11-20): "AI in Tana never changes your content, or writes into a connected service, without your approval. Every change arrives as a proposal you review". — [Tana: Proposals and actions](https://tana.inc/learn/features/proposals)
- Three structured operations: "Every proposal is one of three operations, matching what AI can do to your content: Create", "Update (labeled “To be updated”): Changes to an existing document, shown as a diff against the original.", "Delete". — [Tana: Proposals and actions](https://tana.inc/learn/features/proposals)
- Batch apply: "Click Accept All to apply all pending proposals at once." — [Tana: Proposals and actions](https://tana.inc/learn/features/proposals)
- Versions and read-only states: "Each revision is a new version. Use the version picker to compare versions and accept the one you prefer." and "A discarded proposal and an older version are read-only: they say so, and an older version offers View latest". — [Tana: Proposals and actions](https://tana.inc/learn/features/proposals)
- Humans still edit freely: "Proposals are editable while pending, so you can modify content directly before accepting." and Docs offer "real-time collaborative editing". — [Tana: Proposals and actions](https://tana.inc/learn/features/proposals); [Tana: Docs](https://tana.inc/learn/features/docs)
- Completion roll-up in new Tana docs is a count only: "A heading whose section has checkboxes shows a progress bar with a count, such as 5/12, and the doc shows one under its title." — [Tana: Docs](https://tana.inc/learn/features/docs)
- Mentions open a peek: "a Doc opens in a peek side panel, other kinds navigate to the item." — [Tana: Docs](https://tana.inc/learn/features/docs)

### Inferences
- Tana's proposal flow is staged, structured, batch-applied and versioned, which resembles ThinkPad's staging, but the restriction applies to the AI, not to the human author. It does not contradict claim (c) for human writing.
- The checklist progress bar is a metadata roll-up (count), consistent with the first pass's unverified view that Tana rolls up values rather than prose.

### Gaps
- Tana Outliner zoom, panels, breadcrumbs, references versus copies, and any "done" roll-up: unverified. Host to allow: `outliner.tana.inc`.
- The Tana Docs page was keyword-scanned, not read in full.

## Obsidian: embeds, block references, workspaces, page preview

### Takeaway
Nothing from Obsidian's own documentation could be read. `docs.obsidian.md` serves an Obsidian Publish shell whose content is fetched from `publish-01.obsidian.md`, and `help.obsidian.md` is the user help host; both are blocked. All Obsidian claims remain unverified against primary sources.

### Cited Findings
- The only statement obtained is second-hand, from Andy Matuschak's undated note: Obsidian is "prose-oriented", with "transclusion and linking supported to individual paragraphs, heading sections" and "cannot edit transcluded content at transclusion sites". — [Networked note-writing software](https://notes.andymatuschak.org/zJRmoVPc9vyv8QxSD5voijR)

### Inferences
- If Matuschak's description is still accurate, Obsidian embeds are read-only windows onto the source, which is identity-preserving transclusion and consistent with claim (b). His note may predate current Obsidian behaviour.
- `docs.obsidian.md` is, by its page shell, the developer documentation site; the user-facing pages on embeds and page preview are on `help.obsidian.md`. The brief's host would not have had them even if reachable. (Inference from the Publish shell and background knowledge, not from a page read.)

### Gaps
- Note embeds, block references, workspaces, stacked tabs and page preview: all unverified. Hosts to allow: `help.obsidian.md`, `publish-01.obsidian.md`, `publish.obsidian.md`.

## Allume (formerly Muse): status and nested boards

### Takeaway
Allume v4.0 has shipped: the changelog dates 4.0 to 11 June 2026 and 4.0.2 to 30 June 2026, resolving the first pass's open question. It is still a nested-canvas tool run by one developer; you return to a parent by pinching out or via a breadcrumb trail, and content shared across boards is by identical linked cards, with no fold-back.

### Cited Findings
- Status: "## 4.0 Jun 11th, 2026 ... Muse is now Allume: The app has a new name and brand." Later entries: "4.0.1 Jun 23rd, 2026", "4.0.2 Jun 30th, 2026". No later release was listed when read. — [Allume Updates](https://allume.com/updates)
- "Muse is now Allume. The app you know hasn't changed — same team, same data, same workflow. Only the name is new". The memo is dated "May 2, 2026" on the page although its URL slug says 2026-07. — [Allume memo: Allume, Glass, AI, and more](https://allume.com/memos/2026-07-allume-v4/)
- Ownership: "The company and app are still run by Adam Wulf." and the name change is because the Muse name and trademarks "have now been sold". — [Allume FAQ](https://allume.com/allume-faq)
- Positioning: "still an independent shop, still run by me, still building for individual thinkers over teams." — [Allume memo: Allume, Glass, AI, and more](https://allume.com/memos/2026-07-allume-v4/)
- Nested boards: "Each Allume board is like a whiteboard that can hold even more whiteboards. Stay in the ideation flow, worry about organizing later." Home page headline: "Let your ideas branch and grow inside nested boards." — [Allume home](https://allume.com/)
- Returning to a parent: breadcrumbs exist and truncate: "Breadcrumb Ellipsis Menu: Tap the ellipsis in a long breadcrumb trail to jump to any hidden step along the path." (4.0) and "Breadcrumbs (Mac): Restored Command-click on a breadcrumb to open that step in a new tab." (4.0.1). Pinch navigation persists: "Pinch to Navigate: Fixed a crash when pinching to navigate away from an image." — [Allume Updates](https://allume.com/updates)
- v4.0 adds AI access but not AI writing in the app: "Connect Claude, ChatGPT, or even a local model with LM Studio, and use AI to browse, search, and organize your library." with "three modes: off, read-only, and read-write. By default, the MCP and CLI are both turned off". — [Allume memo: Allume, Glass, AI, and more](https://allume.com/memos/2026-07-allume-v4/)
- Data posture and platforms: "Local-first data with instant sync" and "Native to iPad & Mac"; pricing on the page: Free ("2 workspaces", "100 cards per workspace"), Unlimited "$9.99/month" or "$99.99/year", Setapp "$14.99/month". — [Allume home](https://allume.com/)
- Deliberate limits: "Allume is about putting down the broad strokes of an idea. Details must wait." — [Allume home](https://allume.com/)

### Inferences
- Allume's breadcrumb ellipsis menu is the same truncation device the first pass noted in Workflowy; it is now confirmed from a primary changelog for Allume.
- Nothing on the pages read describes a board's content being summarised or substituted into its parent; the parent shows the child board as a card (a miniature of the same content), which is identity-preserving.

### Gaps
- The user guide redirects to `museapp.notion.site` (not fetched), so the exact gestures for entering and leaving boards in v4 were not read; the pinch behaviour is quoted from the 2019 research article and the 2026 changelog only.
- No release notes after 30 June 2026 were found; whether development continued through November 2026 is not shown on the page.

## Additional prior art for "drill into a blank scratch space and fold the result back"

### Takeaway
The reachable sources point to four partial precedents and no complete one: Upwelling's draft-then-merge and the editors' copy, work, paste-back habit; Patchwork's throwaway branch; Muse's blank nested board, shelf and excerpt "wormhole"; and Matuschak's outline-then-concatenate method. Org-mode capture/refile, stretchtext and transclusion-with-summary could not be checked against primary pages in this session.

### Cited Findings
- Copy, work privately, paste back (folk practice): "Others reported copying and pasting the entire document into a new file, working there in private, and then pasting the edited text back into the original editor window when finished." — [Upwelling](https://www.inkandswitch.com/upwelling/)
- Draft as a "potential future version": "Essentially, a draft is a potential future version of the document, and merging the draft makes it a permanent part of the document history." — [Upwelling](https://www.inkandswitch.com/upwelling/)
- Branch as a disposable experiment: "This allows a writer to experiment without worrying about messing up the main version." — [Patchwork notebook 06](https://www.inkandswitch.com/patchwork/notebook/2024-version-control/)
- AI summaries of a batch of edits, the nearest thing to "condensed outcome" in the sources, but describing the change, not replacing text: "We’ve found that the brief AI summaries are a remarkably useful way to understand writing edits at a high level—more successful than any of our other diff visualizations so far." — [Patchwork notebook 09](https://www.inkandswitch.com/patchwork/notebook/2024-version-control/)
- Blank child workspace with zero ceremony: "Our benchmark for ease is turning to a new page in a paper notebook." — [Ink & Switch: Muse](https://www.inkandswitch.com/muse/)
- Excerpt that remembers its source and lets you peek back: "When you press the black dot on the bottom-right corner of an excerpt, you “wormhole” to the source PDF for that excerpt, and then to the individual page, with the excerpted area highlighted." — [Ink & Switch: Muse](https://www.inkandswitch.com/muse/)
- Transclusion named as the concept behind excerpting: "excerpting (also known as highlighting, quoting, or transclusions)". — [Ink & Switch: Muse](https://www.inkandswitch.com/muse/)
- Compound documents with in-place sub-editors (OpenDoc, OLE): "Selecting one of these parts opens up an editor in-place, with no flipping back and forth between windows or digging through the file system required." — [Malleable software](https://www.inkandswitch.com/essay/malleable-software/)
- Outline items replaced by full note text: "I replaced the IDs with the content of the Zettels. Voilá. A manuscript was ready." (Zettelkasten.de, as quoted by Matuschak) — [Create speculative outlines while you write](https://notes.andymatuschak.org/z79rMNNuLrUj6R8q1CXSpDm)

### Inferences
- ThinkPad's drill-and-resolve can be described as a span-scoped, single-user, nested version of Upwelling's draft-and-merge, with two additions no source has: the child starts blank rather than as a copy, and a convergence condition (one paragraph) gates the merge.
- The inverse of Muse's wormhole (from a resolved paragraph, hold to peek at the archived working-out, release to return) is a ready-made interaction for provenance.
- Upwelling's finding that nested or dependent drafts confused users is a risk signal for deep drill nesting, although it was observed in multi-author use.

### Gaps
- Org-mode indirect buffers and capture/refile: www.gnu.org was unreachable this session, so nothing beyond the first pass's Org quotes is added. Background knowledge only, unverified here: `org-capture` opens a small temporary buffer for a new entry and files it to a target on finishing, which is a scratch-then-file pattern but files new material rather than replacing a span.
- Stretchtext (Ted Nelson), transclusion-with-summary and editor scratch buffers were not mentioned in any page read and were not researched on other hosts.
- No source read describes a tool in which separate work, once condensed, replaces a passage while the working-out is archived. This is "not found in the sources read", not proof of absence.
