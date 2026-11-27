#!/usr/bin/env node
// ui_probe.cjs: check one screen state for interface symptoms that eyes miss.
//
// It reports, for the page as it stands after loading (and after optional
// setup steps):
//   covered   a control whose centre is under another element (a popup under a
//             fixed bar, a button behind a sheet), so a tap cannot reach it
//   small     a tap target under --min-tap px (default 40) in either direction
//   unnamed   a button or link with no text, aria-label or title
//   clipped   a control partly outside the viewport sideways
//   overflow  the page scrolls sideways
//
// It finds symptoms on one screen. It does not find lifecycle bugs (a request
// never answered, a row that never clears); those need the audit in SKILL.md.
//
// Usage:
//   node ui_probe.cjs <url> [--viewport 390x844] [--no-touch] [--min-tap 40]
//                     [--steps steps.cjs] [--shot out.png] [--json]
//
// --steps is a CommonJS file exporting `async (page) => { ... }` that drives the
// page into the state to check (open a dialog, enter a mode). Example:
//   module.exports = async (page) => { await page.getByRole('button', { name: 'New' }).click(); };
//
// Needs Playwright (`require('playwright')`). Exit code is 0 even with findings;
// read the output.

const path = require("path");

function parseArgs(argv) {
  const out = { url: null, viewport: { width: 390, height: 844 }, touch: true, minTap: 40, steps: null, shot: null, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--viewport") { const [w, h] = argv[++i].split("x").map(Number); out.viewport = { width: w, height: h }; }
    else if (a === "--no-touch") out.touch = false;
    else if (a === "--min-tap") out.minTap = Number(argv[++i]);
    else if (a === "--steps") out.steps = path.resolve(argv[++i]);
    else if (a === "--shot") out.shot = path.resolve(argv[++i]);
    else if (a === "--json") out.json = true;
    else if (!out.url) out.url = a;
  }
  return out;
}

// Playwright may be installed globally, in the project being audited, or
// beside this script; look in all three so the probe runs from wherever the
// skill happens to live.
function loadPlaywright() {
  const tried = [];
  const roots = [__dirname, process.cwd()];
  try { roots.push(require("child_process").execSync("npm root -g", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim()); } catch { /* no npm */ }
  for (const name of ["playwright", "@playwright/test", "playwright-core"]) {
    try { return require(name); } catch { tried.push(name); }
    for (const root of roots) {
      try { return require(require.resolve(name, { paths: [root] })); } catch { /* next */ }
    }
  }
  throw new Error(`Playwright not found (tried ${tried.join(", ")} from ${roots.join(", ")}). Run this from the project that has it installed, or set NODE_PATH to its node_modules.`);
}

async function probe(page, minTap) {
  return page.evaluate((minTap) => {
    const SELECTOR = 'button, a[href], input:not([type="hidden"]), textarea, select, [role="button"], [role="menuitem"], [role="tab"], [role="link"], [tabindex]:not([tabindex="-1"])';
    const vw = window.innerWidth, vh = window.innerHeight;
    const describe = (el) => {
      const cls = typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
      const text = (el.innerText || el.getAttribute("aria-label") || el.getAttribute("title") || el.getAttribute("placeholder") || "").trim().replace(/\s+/g, " ").slice(0, 40);
      return `<${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${cls}>${text ? ` "${text}"` : ""}`;
    };
    const shown = (el) => {
      const s = getComputedStyle(el);
      if (s.visibility === "hidden" || s.display === "none" || Number(s.opacity) === 0 || s.pointerEvents === "none") return false;
      if (el.closest("[inert], [aria-hidden='true']")) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const findings = { covered: [], small: [], unnamed: [], clipped: [], overflow: [] };
    const seen = new Set();
    let count = 0;
    for (const el of document.querySelectorAll(SELECTOR)) {
      if (!shown(el) || el.disabled) continue;
      const r = el.getBoundingClientRect();
      // Only what is on screen now: the rest is reached by scrolling.
      if (r.bottom <= 0 || r.top >= vh) continue;
      count++;
      const label = describe(el);
      const at = `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`;
      const cx = Math.min(Math.max(r.left + r.width / 2, 0), vw - 1);
      const cy = Math.min(Math.max(r.top + r.height / 2, 0), vh - 1);
      const top = document.elementFromPoint(cx, cy);
      if (top && top !== el && !el.contains(top) && !top.contains(el)) {
        // A label or wrapper that forwards the tap to this control is not cover.
        const forwards = top.closest("label") && top.closest("label").contains(el);
        if (!forwards) findings.covered.push({ el: label, at, by: describe(top) });
      }
      const isField = /^(input|textarea|select)$/i.test(el.tagName);
      if (!isField && (r.width < minTap || r.height < minTap)) {
        // Inline links inside running text are exempt; they flow with the line.
        const inline = el.tagName === "A" && getComputedStyle(el).display.startsWith("inline") && el.parentElement && el.parentElement.innerText.trim().length > (el.innerText || "").trim().length + 20;
        if (!inline) findings.small.push({ el: label, at });
      }
      const name = (el.innerText || "").trim() || el.getAttribute("aria-label") || el.getAttribute("title") || el.getAttribute("alt") || (el.labels && el.labels[0] && el.labels[0].innerText) || el.getAttribute("placeholder") || el.getAttribute("aria-labelledby");
      if (!name) findings.unnamed.push({ el: label, at });
      if (r.left < -1 || r.right > vw + 1) findings.clipped.push({ el: label, at });
      seen.add(el);
    }
    const doc = document.documentElement;
    if (doc.scrollWidth > vw + 1) findings.overflow.push({ el: "page", at: `content is ${doc.scrollWidth}px wide in a ${vw}px viewport` });
    return { controls: count, viewport: `${vw}x${vh}`, findings };
  }, minTap);
}

(async () => {
  const args = parseArgs(process.argv.slice(2));
  if (!args.url) { console.error("usage: node ui_probe.cjs <url> [--viewport WxH] [--no-touch] [--min-tap N] [--steps file.cjs] [--shot out.png] [--json]"); process.exit(2); }
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: args.viewport, hasTouch: args.touch });
    const page = await context.newPage();
    const consoleProblems = [];
    page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") consoleProblems.push(`${m.type()}: ${m.text().slice(0, 200)}`); });
    page.on("pageerror", (e) => consoleProblems.push(`pageerror: ${e.message.slice(0, 200)}`));
    await page.goto(args.url, { waitUntil: "load" });
    await page.waitForTimeout(1200);
    if (args.steps) { await require(args.steps)(page); await page.waitForTimeout(500); }
    const result = await probe(page, args.minTap);
    result.url = page.url();
    result.console = consoleProblems;
    if (args.shot) await page.screenshot({ path: args.shot });
    if (args.json) { console.log(JSON.stringify(result, null, 2)); return; }
    const f = result.findings;
    console.log(`${result.url}  (${result.viewport}, ${result.controls} controls on screen)`);
    const section = (title, rows, fmt) => { if (rows.length) { console.log(`\n${title} (${rows.length})`); rows.forEach((r) => console.log("  " + fmt(r))); } };
    section("COVERED: a tap at the centre hits something else", f.covered, (r) => `${r.el}  [${r.at}]  under ${r.by}`);
    section(`SMALL: tap target under ${args.minTap}px`, f.small, (r) => `${r.el}  [${r.at}]`);
    section("UNNAMED: no text, aria-label or title", f.unnamed, (r) => `${r.el}  [${r.at}]`);
    section("CLIPPED: partly outside the viewport sideways", f.clipped, (r) => `${r.el}  [${r.at}]`);
    section("OVERFLOW: the page scrolls sideways", f.overflow, (r) => r.at);
    section("CONSOLE", result.console, (r) => r);
    if (!Object.values(f).some((rows) => rows.length) && !result.console.length) console.log("\nNo findings on this screen state.");
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
