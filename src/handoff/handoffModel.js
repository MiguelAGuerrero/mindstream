// ---------------------------------------------------------------------------
// Handoff model — a request from one tool and the reply that comes back,
// following the message in roadmap §4.2 (Revision 7). Created by a visible
// user action. Tools never read each other's state; they only exchange these.
//
//   request = { id, createdAt, kind: "request",
//               text,            the subject to work on
//               context: [],     surrounding lines, outermost first
//               steps?: [Step],  ordered prompts to work through (steps.js)
//               want,            a neutral verb from WANTS
//               replyTo: { tool, ref },   set by the sender, opaque to the receiver
//               tag,             opaque to the receiver, handed back on the reply
//               to: { tool, ref? },       where it was routed; ref = where the
//                                         receiver put the work, bound on arrival
//               consumedAt, reply }
//   reply   = { kind: "reply", inReplyTo, outcome: "resolved" | "question" | "abandoned",
//               text?, steps?, notes: [], tag, minutes? }
//
// `minutes` is an extra some receivers add (time spent); a tool that doesn't
// know it ignores it. Records written before this shape ({ from, to.intent,
// task, result }) are read and converted on load.
//
// Pure data: no Vue, no store, no persistence. Effects (id, time) are passed
// in by the caller so the model stays trivially unit-testable.
// ---------------------------------------------------------------------------
import { WANTS, getTool, serves } from "./toolRegistry.js";
import { cleanSteps } from "./steps.js";

export const OUTCOMES = Object.freeze(["resolved", "question", "abandoned"]);
const MAX_TEXT = 1000;
const MAX_LINE = 280;
const MAX_LINES = 10;

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function oneLine(value, max = MAX_LINE) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/** Plain lines: strings only, one line each, blanks dropped, capped. */
function cleanLines(lines) {
  return (Array.isArray(lines) ? lines : [])
    .map((l) => oneLine(l))
    .filter(Boolean)
    .slice(0, MAX_LINES);
}

function cleanAddress(address) {
  const tool = text(address?.tool);
  const ref = address?.ref == null ? "" : text(String(address.ref));
  return tool && ref ? { tool, ref } : null;
}

function cleanTag(tag) {
  return typeof tag === "string" && tag.trim() ? tag.trim() : null;
}

/**
 * Validate and build a request, or null when it can't be delivered: no reply
 * address, no subject text, or a target that doesn't serve `want` (with these steps).
 */
export function createRequest({ replyTo, to, want, text: subject, context, steps, tag } = {}, { id, now } = {}) {
  const address = cleanAddress(replyTo);
  if (!address) return null;
  const body = text(subject).slice(0, MAX_TEXT);
  if (!body) return null;
  const verb = text(want);
  const plan = cleanSteps(steps);
  const toTool = text(to?.tool);
  if (!getTool(toTool) || !serves(toTool, verb, plan)) return null;
  if (typeof id !== "string" || !id) return null;
  const request = {
    id,
    createdAt: typeof now === "string" ? now : null,
    kind: "request",
    text: body,
    context: cleanLines(context),
    want: verb,
    replyTo: address,
    tag: cleanTag(tag),
    to: { tool: toTool },
    consumedAt: null,
    reply: null,
  };
  if (plan.length) request.steps = plan;
  return request;
}

/**
 * Validate a reply to `request`. Null when the outcome is unknown. The
 * request's tag is handed back untouched unless the reply names its own (e.g.
 * the workflow a user chose).
 */
export function normalizeReply(reply, request = null) {
  if (!reply || typeof reply !== "object") return null;
  if (!OUTCOMES.includes(reply.outcome)) return null;
  const out = {
    kind: "reply",
    inReplyTo: request?.id ?? (typeof reply.inReplyTo === "string" ? reply.inReplyTo : null),
    outcome: reply.outcome,
    notes: cleanLines(reply.notes),
    tag: cleanTag(reply.tag) ?? request?.tag ?? null,
  };
  const body = text(reply.text).slice(0, MAX_TEXT);
  if (body) out.text = body;
  const steps = cleanSteps(reply.steps);
  if (steps.length) out.steps = steps;
  const minutes = reply.minutes;
  if (typeof minutes === "number" && Number.isFinite(minutes) && minutes >= 0) out.minutes = minutes;
  return out;
}

// --- Reading records written before the §4.2 shape ---------------------------

const LEGACY_WANT = Object.freeze({
  "start-session": WANTS.STEP_THROUGH,
  decompose: WANTS.THINK,
  "pick-steps": WANTS.CHOOSE_STEPS,
  "save-steps": WANTS.KEEP,
});

function fromLegacy(record) {
  if (!record.task || record.text !== undefined) return record;
  const result = record.result;
  const status = result?.status;
  const legacyReply = result
    ? {
        outcome: status === "completed" ? "resolved" : status === "abandoned" ? "abandoned" : null,
        text: result.reflection || result.output?.text || "",
        steps: result.output?.items,
        minutes: result.minutes,
      }
    : null;
  return {
    id: record.id,
    createdAt: record.createdAt,
    text: record.task?.title,
    context: record.task?.notes ? [record.task.notes] : [],
    steps: record.task?.steps,
    want: LEGACY_WANT[record.to?.intent] ?? record.to?.intent,
    replyTo: record.from,
    to: record.to,
    consumedAt: record.consumedAt,
    reply: legacyReply,
  };
}

/** Revive a stored record into a canonical request, or null when malformed. */
export function normalizeHandoffRecord(record) {
  if (!record || typeof record !== "object") return null;
  const r = fromLegacy(record);
  const base = createRequest(r, { id: text(r.id), now: r.createdAt });
  if (!base) return null;
  const targetRef = text(r.to?.ref);
  if (targetRef) base.to.ref = targetRef;
  base.reply = normalizeReply(r.reply, base);
  base.consumedAt = typeof r.consumedAt === "string" && r.consumedAt ? r.consumedAt : null;
  return base;
}

/**
 * Aggregate the replies across requests (e.g. every session run on one
 * ThinkPad move): `{ sessions, minutes, resolved, lastText }`, or null when
 * none has a reply yet.
 */
export function summarizeReplies(requests) {
  const answered = (Array.isArray(requests) ? requests : []).filter((h) => h?.reply);
  if (!answered.length) return null;
  const sorted = [...answered].sort((a, b) => String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")));
  const texts = sorted.map((h) => h.reply.text).filter(Boolean);
  return {
    sessions: answered.length,
    minutes: answered.reduce((sum, h) => sum + (h.reply.minutes ?? 0), 0),
    resolved: answered.filter((h) => h.reply.outcome === "resolved").length,
    lastText: texts.length ? texts[texts.length - 1] : "",
  };
}
