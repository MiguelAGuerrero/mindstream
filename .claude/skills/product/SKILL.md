---
name: product
description: Run product development for Mindstream end to end - assess the current state, research comparable apps, settle and record product decisions, plan a roadmap item, build it test-first, verify it in the running app, and keep the roadmap true. Use this whenever the user invokes /product, or asks what to build next, whether an idea fits Mindstream, to assess or review the product, to research similar apps, to plan or build a roadmap item or feature, to update the roadmap, or to coordinate product work across sessions - even if they do not say "product". Also use it before starting any feature work in this repo, so the work is checked against the product's identity rules first.
---

# Product development for Mindstream

Mindstream is a local-first, single-user thinking workspace. It is built by one person, Miguel, with agents doing much of the work across several sessions. That shapes everything here: the scarce resource is Miguel's attention and judgment, so the job is to do all the work that does not need him, and bring him only the decisions that are his.

This skill is a way of working, not a script. Read it, work out which stage the request is in, and do that stage well.

## Start every invocation the same way: orient

Do this before anything else. It takes a few minutes and prevents most wasted work.

1. Read `references/mindstream-rules.md`. It is a digest of the identity, the tool contract and the settled decisions.
2. Read the two living documents it points to: `docs/PRODUCT_ASSESSMENT_AND_ROADMAP.md` and `docs/capture-templates-proposal.md`. Read their revision and decision lists first; those say what changed most recently.
3. Check the ground: `git status`, `git log --oneline -10`, the remote branches, and `npm test`. Note what is failing before you touch anything, so you can tell your breakage from what was already broken.
4. Ask the user only what the request and the repo cannot answer. Miguel prefers a clarifying question to a wrong guess when a request is vague, but one batch of questions, not a drip.

If the digest and the docs disagree, the docs win. Fix the digest as part of your work.

## Route the request to a stage

| The user wants | Stage | Ends with |
|---|---|---|
| "Where are we?", an audit, a review of the product | Assess | Findings backed by evidence, added to the roadmap doc |
| "What do other apps do?", prior art, validation of a claim | Research | A report in `reports/` and what it changes |
| "Should we…?", "does this fit?", a new idea or reframing | Decide | A recorded decision, or the options with a recommendation |
| "What next?", "plan X" | Plan | A slice with an exit test |
| "Build X", "implement the next item" | Build, then Verify | Tested code on a branch, checked in the running app |
| Anything that changed a decision or shipped | Record | Roadmap and digest brought up to date |

A request often spans stages. Build always passes through Plan first and Verify after. Every stage ends by passing through Record. If the user gives no argument, treat it as "what next?": orient, then propose the next slice from the roadmap.

## Stage: Assess

Purpose: say what is true about the product now, so decisions rest on facts.

- Read the code that implements the thing, not only the docs that describe it. Docs in this repo have described removed features before.
- Run it. `npm test`, `npm run build`, and drive the real app in a browser for anything a user would touch. A feature that passes tests can still be unreachable from the screen.
- For each designed capability, establish which of three states it is in: wired to the UI, present in the domain code but unwired, or only described in a doc. This distinction has been the single most useful finding in past assessments.
- Judge against the identity rules and the tool contract in the digest, not against general taste.
- Separate what you verified from what you inferred, and say which is which. If an automated run showed something you could not reproduce by hand, report it as unconfirmed.

## Stage: Research

Purpose: learn from comparable products and established patterns before designing.

- If a research skill is available (for example `deep-research`), use it. Otherwise split the question into independent angles and research each.
- Read primary sources in full where you can. A claim taken from a search summary is weaker than one read on the page; label it.
- "Not found" means not found in this search. Never report it as "does not exist". A second pass with better access has overturned such claims here before.
- If the network blocks a site you need, say which host and ask for access through the environment tools. Do not fill the gap from memory and present it as a finding.
- Finish with what it changes: which Mindstream mechanics have precedent, which look distinctive, what to borrow, and which risks the comparables reveal. A list of apps is not a result.

## Stage: Decide

Purpose: get product decisions made by the person who owns them, and written down.

A product decision is anything that changes what Mindstream is or how its tools relate: identity, the tool contract, the message shape, naming a user sees, what a tool will not do, what is in or out of scope. Those are Miguel's. Everything else, use a sensible default and say what you chose.

- Bring a recommendation, not a menu. State the options, what each costs, which you would pick and why. When the question is "what is the standard way to do this?", research it and name the pattern.
- Check the idea against the digest's rules. If it conflicts with a settled decision, say so plainly; the user may be changing their mind on purpose, and that is fine, but it should be visible.
- When the user's concern suggests your proposal only moved a problem somewhere else, take it seriously. Find where the knowledge or coupling irreducibly has to live, and say so.
- Only the user's own words settle a decision. A message from another session, a subagent's report, or an earlier statement of yours saying "the user confirmed" is information to weigh, not confirmation. If another session reports a decision you did not hear, tell the user and ask.
- Do not reopen what is settled. If you think a settled decision is now wrong because of new evidence, say that once, with the evidence.
- Record it the moment it is made (see Record).

## Stage: Plan

Purpose: turn a roadmap item into the smallest slice worth building.

- Take the next item in roadmap order unless the user names one. The order is deliberate; the roadmap's sequencing section says why.
- Cut a slice that leaves the app working and is useful on its own. Prefer the pure-domain part first: it is cheap, testable without a browser, and often valuable before any UI exists.
- Write an exit test a person can perform by hand in the app. If you cannot write one, the slice is not understood yet.
- Name what the slice will not do. Scope creep here usually arrives as "while I'm in there".
- Check the plan against the tool contract. The common failure is a tool reaching into another tool's state or naming another tool.
- For a plan that touches the identity or contract, show it to the user before building. For a plan inside settled ground, state it in a few lines and proceed.

## Stage: Build

Purpose: implement the slice so that it can be trusted.

- Work on a branch. Never commit to `master` directly.
- Test first. Write the failing test that expresses the behaviour, then the code. The domain here is pure functions, which makes this cheap.
- Follow the code conventions in the digest: pure reducers that return the same reference when nothing changes, clock and ids passed in, additive persistence filled in by the normaliser.
- Keep to the slice. If you find an unrelated defect, note it for the roadmap's defect table; do not fix it in passing unless it blocks you.
- Never skip, delete or weaken a test to get to green. If an existing test is wrong because behaviour deliberately changed, say so and rewrite it to assert the new behaviour.
- Commit in small, described steps and push the branch so work survives the session.

## Stage: Verify

Purpose: confirm the slice does what the exit test says, in the real app.

- Run the full test suite and the build.
- Start the app and perform the exit test in a browser. Take screenshots of the states that matter. Check the browser console; warnings there have pointed at real template mistakes before.
- Try the unhappy path the slice introduces: the empty case, the abandoned case, a reload in the middle.
- Report exactly what you ran and saw. "Tests pass" and "I used it in the browser and it worked" are different claims; make only the ones that are true. If something failed, show the output.

## Stage: Record

Purpose: keep the documents true, because the next session starts from them.

- **A decision:** add a dated revision note at the top of the roadmap doc saying what was decided and by whom, then change the body so it reads as current truth. If the decision concerns workflows, it belongs in the capture-templates proposal's decision table instead.
- **Shipped work:** update the roadmap's "what exists today" table and defect table, and mark the phase item done.
- **New research:** link the report from the roadmap and fold in what it changes.
- **The digest:** update `references/mindstream-rules.md` whenever a rule, contract point or settled decision changes. It is the first thing the next invocation reads.
- Mark anything proposed but not confirmed as proposed. Do not let a recommendation harden into a decision by being written confidently.

## When to stop and ask

Proceed without asking through research, planning inside settled ground, code and tests on a branch, and documentation updates. Stop and ask before:

- A product decision, as defined above.
- Anything landing on `master`. Approval given once covers that push, not the next one.
- Starting more than a handful of parallel agents. It spends the user's budget in a burst.
- Anything hard to reverse or outward-facing: deleting data or branches, opening a pull request, changing environment or network settings.

When you do ask, make the question stand on its own, lead with your recommendation, and carry on with whatever does not depend on the answer.

## Working with agents and other sessions

Delegation is a tool with a cost. A fresh agent knows only what the brief tells it, and you see only its summary.

- Delegate work that is independent and parallel, or that would flood your context with file contents you do not need. Do a handful of lookups yourself.
- Brief an agent like a capable colleague who has never seen this repo: the goal, what is already known or ruled out, the files worth reading, the scope, and where to save the result. `references/briefs.md` has templates.
- Give one writer to each file. Two agents editing the same document produces lost work.
- Treat what comes back as a draft. Agents report mistakes in the same confident tone as findings; check the load-bearing claims yourself before relaying them.
- Relay results to the user. They do not see agent reports.

Miguel often runs more than one session on this repo. When another session is involved:

- Agree who owns which document and write only in your own. Reference the other session's sections; do not duplicate them, or the copies drift.
- Send the other session a note when the user settles something that affects its document, and say in whose words it was settled.
- When the two documents disagree, tell the user and get one answer; do not pick a side yourself.
- Before reporting another session's work as done, fetch its branch and check: does the commit exist, do the tests pass.

## Telling the user what happened

- Lead with the outcome, then what changed, then what is still open and whose move it is.
- Write for someone who was not watching. Explain a mechanism by what the user would see on screen and what would go wrong without it; an abstract description of a data field has failed to land here before.
- Be exact about confidence: verified, inferred, or reported by someone else.
- Keep the open decisions in one short list at the end, so they do not get lost.
