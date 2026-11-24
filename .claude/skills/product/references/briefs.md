# Brief templates

Read this when handing work to an agent or another session. A brief is the only context the receiver has. Fill in every part; cut what does not apply.

## What every brief needs

- **Goal:** the outcome wanted, in one or two sentences.
- **What is already known:** facts established, things ruled out, decisions that are settled. This stops the agent rediscovering or re-arguing them.
- **Where to look:** the files, documents and commands worth reading. Point at them; do not paste them.
- **Scope:** what is in, and what to leave alone.
- **What to hand back:** the form of the result and where to save it.
- **How sure to be:** ask it to mark each claim as verified, inferred or not found.

Do not hand an agent your hypothesis and ask it to check; it tends to come back confirmed. Give it the question and the evidence to look at.

## Assessment of an area

```
Assess how <area> works in the Mindstream repo at /home/user/mindstream.

Known: <what you have already established>.
Read: <files>, <docs>. Run `npm test`.
For each capability the docs describe, report whether it is (a) reachable from
the UI, (b) present in domain code but not wired to any component, or
(c) described only in a doc. Give file and line for each.
Do not change any file.
Report: a table of capabilities with state and evidence, then defects found,
each marked verified or inferred.
```

## Research angle

```
Research <narrow topic> as a comparable for a private app.

Context: <three or four sentences on the Mindstream mechanic in question;
the app is private, do not search for it>.
Questions: <specific questions>.
Sources: <primary docs and essays to read in full>.
Rules: quote exactly with a URL for each claim; label anything taken from a
search summary; "not found" means not found in this search; if a site is
blocked, name the host.
Save notes to <absolute path>.
```

## Build slice

```
Implement <slice> in the Mindstream repo at /home/user/mindstream on branch <branch>.

Read first: .claude/skills/product/references/mindstream-rules.md sections 3, 4
and 8, and <design doc section>.
Behaviour wanted: <concrete behaviour>. Exit test: <what a person does in the
app and sees>.
Out of scope: <list>.
Work test-first. Domain reducers stay pure and return the same reference on
no-op; clock and ids are passed in. Do not skip or weaken existing tests.
Report: files changed, tests added, the full test result, and anything you
found but did not fix.
```

## Independent review

Give the reviewer the code and the intended behaviour, not your opinion of it.

```
Review the changes on branch <branch> against <base> in /home/user/mindstream.

Intended behaviour: <behaviour and exit test>.
Rules the change must respect: .claude/skills/product/references/mindstream-rules.md
sections 3, 4 and 8.
Look for: behaviour that does not match the intent, a tool reaching into
another tool's state, reducers that are not pure, tests that do not test what
they claim.
Report each finding with file, line and a concrete failing scenario.
```

## Note to another session

```
<Which session you are and which document you own.>

Settled by Miguel, in his words to me: <decisions>.
Still proposed, not confirmed: <items>.
What this changes in your document: <sections>.
What I changed in mine: <revision, commit, branch>.
Open on both sides: <items>.
```

Say plainly which items the user confirmed to you directly and which you are only passing on.
