// ---------------------------------------------------------------------------
// The starter library, from docs/GENERIC_PROBLEM_SOLVING_WORKFLOWS.md. Seeded
// once into an empty library; after that they are ordinary workflows the user
// can edit or delete. Steps that produce a required output are decision steps.
// ---------------------------------------------------------------------------
const decide = (title, options = []) => ({ title, decision: { options } });

export const DEFAULT_WORKFLOWS = Object.freeze([
  {
    name: "Clarify the problem",
    gap: "The task is vague, overloaded, or emotionally noisy.",
    steps: [
      "State the problem in one sentence.",
      "Describe why this matters now.",
      "Define \"done\" in observable terms.",
      "List known constraints (time, scope, tools, dependencies).",
      "List unknowns blocking confident action.",
      "Reframe the problem into a focused question.",
      decide("Choose the smallest first move to reduce uncertainty."),
    ],
  },
  {
    name: "Research and synthesize",
    gap: "You need to learn, compare sources, or build context fast.",
    steps: [
      "Define the research question and the decision it informs.",
      "List assumptions to verify or falsify.",
      "Gather sources across at least two perspectives.",
      "Extract key claims, evidence quality, and limitations.",
      "Group findings into themes or patterns.",
      "Identify contradictions and unresolved gaps.",
      "Summarize what appears true, uncertain, and risky.",
      "Convert the synthesis into recommended next actions.",
    ],
  },
  {
    name: "Disambiguate options",
    gap: "There are several plausible paths and no clear pick yet.",
    steps: [
      "List all candidate options without judging.",
      "Define evaluation criteria and their importance.",
      "Score each option against the criteria (quick pass).",
      "Identify the top two contenders.",
      "Stress-test each contender against worst-case scenarios.",
      "Clarify what new evidence would change the ranking.",
      decide("Select one option to trial and define a fallback."),
    ],
  },
  {
    name: "Make a decision",
    gap: "There is enough context and you need to commit.",
    steps: [
      "State the decision to be made.",
      "Capture the available options and the default baseline.",
      "Write the strongest argument for each serious option.",
      decide("Choose the option with the best expected outcome under constraints."),
      "Record why the alternatives were not chosen.",
      "Define the immediate execution steps.",
      "Set a review point and reversal conditions.",
    ],
  },
  {
    name: "Plan execution",
    gap: "A decision exists but the path to carry it out is unclear.",
    steps: [
      "Define the target outcome and deadline window.",
      "Break the work into milestones and deliverables.",
      "Sequence milestones by dependency.",
      "Identify critical risks and mitigation actions.",
      decide("Define the first executable step."),
      "Set progress signals and a check-in cadence.",
      "Capture stop and replan triggers.",
    ],
  },
]);
