# GENERIC_PROBLEM_SOLVING_WORKFLOWS

## Purpose
This document defines baseline reusable problem-solving workflows that can be used across many task types. These are intentionally generic defaults that can later be specialized into concrete templates per domain (product, engineering, writing, analysis, planning).

Each workflow is designed to map to Rep-it's model:
- A **workflow template** is attached to a problem node.
- When engaged, it injects ordered child **steps**.
- Steps are short, action-oriented prompts suitable for session execution.

## Design Rules For Baseline Workflows
- Keep workflows short (5-9 steps) so they are usable in one focused session.
- Use verb-first step prompts ("Clarify...", "List...", "Rank...").
- Include explicit divergence/convergence moments.
- End with a concrete output or decision artifact.
- Prefer reusable language over domain-specific jargon.

## Baseline Workflow Library (Defaults)

### 1) Clarify The Problem
**Use when:** the task is vague, overloaded, or emotionally noisy.  
**Output:** a clean problem statement and success criteria.

1. State the problem in one sentence.
2. Describe why this matters now.
3. Define "done" in observable terms.
4. List known constraints (time, scope, tools, dependencies).
5. List unknowns blocking confident action.
6. Reframe the problem into a focused question.
7. Choose the smallest first move to reduce uncertainty.

### 2) Research And Synthesize
**Use when:** you need to learn, compare sources, or build context fast.  
**Output:** synthesized findings plus implications for next action.

1. Define the research question and decision it informs.
2. List assumptions to verify or falsify.
3. Gather sources across at least two perspectives.
4. Extract key claims, evidence quality, and limitations.
5. Group findings into themes or patterns.
6. Identify contradictions and unresolved gaps.
7. Summarize what appears true, uncertain, and risky.
8. Convert synthesis into recommended next actions.

### 3) Disambiguate Options
**Use when:** there are multiple plausible paths and no clear pick yet.  
**Output:** narrowed option set with explicit trade-offs.

1. List all candidate options without judging.
2. Define evaluation criteria and importance weights.
3. Score each option against criteria (quick pass).
4. Identify the top two contenders.
5. Stress-test each contender against worst-case scenarios.
6. Clarify what new evidence would change the ranking.
7. Select one option to trial and define fallback.

### 4) Make A Decision
**Use when:** enough context exists and commitment is required.  
**Output:** clear decision record with rationale and review trigger.

1. State the decision to be made.
2. Capture available options and default baseline.
3. Write the strongest argument for each serious option.
4. Choose the option with best expected outcome under constraints.
5. Record why alternatives were not chosen.
6. Define immediate execution steps.
7. Set a review point and reversal conditions.

### 5) Plan Execution
**Use when:** decision exists but execution path is unclear.  
**Output:** an ordered, testable, realistic execution plan.

1. Define target outcome and deadline window.
2. Break work into milestones and deliverables.
3. Sequence milestones by dependency.
4. Identify critical risks and mitigation actions.
5. Define first executable step for session mode.
6. Set progress signals and check-in cadence.
7. Capture stop/replan triggers.

### 6) Diagnose A Problem (Debug)
**Use when:** something is failing and root cause is unknown.  
**Output:** root-cause hypothesis and validated fix plan.

1. Describe expected behavior vs observed behavior.
2. Bound the problem (where it does and does not occur).
3. List plausible root-cause hypotheses.
4. Rank hypotheses by likelihood and test cost.
5. Run smallest discriminating test for top hypothesis.
6. Update hypothesis ranking from evidence.
7. Confirm root cause with a reproducing check.
8. Define fix, verification steps, and guardrail test.

### 7) Create Something New
**Use when:** producing a draft, design, feature concept, or artifact.  
**Output:** first complete version plus revision targets.

1. Define audience, purpose, and quality bar.
2. Gather constraints and reference examples.
3. Sketch rough structure before detail work.
4. Produce a fast first draft end-to-end.
5. Review against purpose and constraints.
6. Revise highest-impact weak points first.
7. Finalize version and list future improvements.

### 8) Review And Improve
**Use when:** evaluating an existing output for quality or risk.  
**Output:** prioritized improvements and accepted risk list.

1. Define review lens (quality, correctness, UX, risk, clarity).
2. Inspect artifact against explicit criteria.
3. Separate critical issues from minor polish.
4. Propose fixes with effort and impact estimates.
5. Apply highest-impact low-to-medium effort fixes first.
6. Re-check against original success criteria.
7. Decide ship now, iterate, or rollback.

### 9) Reflect And Learn
**Use when:** closing a session, project slice, or repeated workflow run.  
**Output:** actionable lessons and next-cycle adjustments.

1. Record what was attempted and what happened.
2. Note what helped progress most.
3. Note where friction or stalls occurred.
4. Identify one incorrect assumption.
5. Capture one practice to keep and one to drop.
6. Define one process adjustment for next run.
7. Set the next starting step while context is fresh.

## Suggested Metadata Shape (For Workflow Defaults)
Use this shape when seeding baseline workflows into local storage or fixtures.

```json
{
  "id": "clarify-problem",
  "name": "Clarify The Problem",
  "category": "problem-framing",
  "goal": "Turn ambiguity into a focused, executable question.",
  "recommendedWhen": "Task is vague or overloaded.",
  "steps": [
    "State the problem in one sentence.",
    "Describe why this matters now.",
    "Define 'done' in observable terms."
  ],
  "tags": ["default", "generic", "baseline"],
  "version": 1
}
```

## Derivation Guidance (From Generic -> Specific)
- Keep the baseline step intent; only specialize wording and examples.
- Add domain checks near the end (for example: tests, stakeholder review, publish checklist).
- Do not exceed ~12 steps unless there is a strong reason.
- Preserve clear completion outputs for resumability and re-entry cues.

## Recommended Initial Default Set
If only a few templates are shown initially, start with:
1. Clarify The Problem
2. Research And Synthesize
3. Disambiguate Options
4. Make A Decision
5. Plan Execution
6. Diagnose A Problem

This set covers the most common cognitive jobs while staying compact.
