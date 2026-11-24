// ---------------------------------------------------------------------------
// A workflow run as a document (capture-templates decisions 13 and 19).
//
// ThinkPad has no step-by-step view; a run that arrives here is written out as
// a document: each step's prompt is a theme heading ("# …") and you write the
// answer under it. A decision step lists its options. Plain text in, plain
// text out, so nothing about the workflow is looked up or remembered here.
// ---------------------------------------------------------------------------

function oneLine(value) {
  return String(value ?? "").replace(/^\s*#+\s*/, "").replace(/\s+/g, " ").trim();
}

export function formTextFromSteps(steps) {
  if (!Array.isArray(steps)) return "";
  const blocks = [];
  for (const step of steps) {
    const prompt = oneLine(step?.prompt);
    if (!prompt) continue;
    blocks.push(`# ${prompt}`);
    const options = Array.isArray(step?.options) ? step.options.map(oneLine).filter(Boolean) : [];
    if (step?.expects === "call" && options.length) blocks.push(`Choose: ${options.join(" / ")}`);
  }
  return blocks.join("\n\n");
}
