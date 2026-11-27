#!/usr/bin/env node
// Leave-halfway smoke test (CLAUDE.md, roadmap Revision 42).
//
// The rule: anything a person can start can be ended by tap on a phone, and
// nothing stays listed as unfinished with no way to end it. Each flow below
// starts something, walks away from it, and then checks Home's "Pick up".
// It drives the real app at phone size with touch; no test doubles.
//
//   npm run test:e2e            starts its own dev server
//   E2E_URL=http://… npm run test:e2e   uses a server that is already running
//
// When you add something a person can start, add its flow here.

const { spawn } = require("node:child_process");
const { chromium } = require("playwright");

const PORT = 5187;
const BASE = process.env.E2E_URL || `http://localhost:${PORT}`;
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true };
const END_CONTROLS = '[aria-label="End context"], [aria-label="Set aside"], [aria-label="Stop waiting"]';

function check(condition, message) {
  if (!condition) throw new Error(message);
}

// Taps by coordinates: a locator click scrolls clipped containers and breaks
// the page view, and a tap is what a phone does anyway.
async function tap(page, locator, { at = "center" } = {}) {
  await locator.first().waitFor({ state: "visible", timeout: 8000 });
  let box = await locator.first().boundingBox();
  check(box, `nothing to tap: ${locator}`);
  // Below the fold: scroll to it first, as a person would.
  const { height } = page.viewportSize();
  if (box.y < 0 || box.y + box.height > height) {
    await locator.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    box = await locator.first().boundingBox();
  }
  const x = at === "start" ? box.x + Math.min(40, box.width / 2) : box.x + box.width / 2;
  const y = at === "start" ? box.y + Math.min(10, box.height / 2) : box.y + box.height / 2;
  await page.touchscreen.tap(x, y);
  await page.waitForTimeout(450);
}

async function goHome(page) {
  await page.goto(`${BASE}/`);
  await page.locator(".v-card").first().waitFor({ state: "visible", timeout: 8000 });
  await page.waitForTimeout(600);
}

const pickUpRows = (page) => page.locator(".home-loops__list").first().locator("li");
async function pickUp(page) {
  const section = page.locator('section[aria-label="Pick up"]');
  if (!(await section.count())) return [];
  return section.locator(".home-loops__next").allInnerTexts();
}

/** Every Pick up row must be endable: from the row, or at the place it opens. */
async function assertEveryRowCanBeEnded(page) {
  await goHome(page);
  const section = page.locator('section[aria-label="Pick up"]');
  const count = (await section.count()) ? await section.locator("li").count() : 0;
  for (let i = 0; i < count; i++) {
    await goHome(page);
    const row = section.locator("li").nth(i);
    const text = (await row.innerText()).replace(/\s+/g, " ").trim();
    if (await row.locator("button.v-btn").count()) continue; // ends from the row
    await tap(page, row.locator(".home-loops__row"));
    await page.waitForTimeout(900);
    check(await page.locator(END_CONTROLS).count(), `Pick up row "${text}" cannot be ended: no control on the row, none where it opens`);
  }
}

/** A pad with one paragraph, in Reflect, with a thread opened on that paragraph. */
async function padWithThread(page, { write = "A first thought." } = {}) {
  await page.goto(`${BASE}/thinkpad`);
  await tap(page, page.locator(".thinkpad-new-fab"));
  await page.locator(".thinkpad-new-dialog textarea").first().fill("Leave-halfway check");
  await tap(page, page.getByRole("button", { name: "Create" }));
  await tap(page, page.locator(".ProseMirror"));
  await page.keyboard.type("I have stalled at the same weight for a month.");
  await tap(page, page.getByTitle(/^Reflect/));
  await page.waitForTimeout(600);
  await tap(page, page.locator(".ProseMirror p"), { at: "start" });
  await tap(page, page.locator(".thinkpad-tag-btn--thread"));
  await page.locator(".drill-bar").waitFor({ state: "visible", timeout: 8000 });
  if (write) {
    await tap(page, page.locator(".ProseMirror"));
    await page.keyboard.type(write);
    await page.waitForTimeout(500);
  }
}

const FLOWS = {
  "a thread left unfinished can be set aside from Home": async (page) => {
    await padWithThread(page);
    await goHome(page);
    check((await pickUp(page)).length === 1, `expected one Pick up row, saw ${JSON.stringify(await pickUp(page))}`);
    await tap(page, page.getByRole("button", { name: "Set aside" }));
    check((await pickUp(page)).length === 0, "the row is still listed after Set aside");
    await page.reload();
    await page.waitForTimeout(1000);
    check((await pickUp(page)).length === 0, "the row came back after a reload");
  },

  "a thread can be set aside from inside it": async (page) => {
    await padWithThread(page);
    await tap(page, page.getByRole("button", { name: "Set aside" }));
    check((await page.locator(".drill-bar").count()) === 0, "still inside the thread after Set aside");
    await goHome(page);
    check((await pickUp(page)).length === 0, "the thread is still listed on Home");
  },

  '"Focus on this" then "Not now" leaves nothing waiting': async (page) => {
    await padWithThread(page);
    await tap(page, page.getByRole("button", { name: "Focus on this" }));
    await tap(page, page.getByRole("button", { name: "Not now" }));
    await goHome(page);
    const rows = await pickUp(page);
    check(!rows.some((r) => /Waiting on/.test(r)), `a request is still waiting: ${JSON.stringify(rows)}`);
  },

  '"Focus on this" then walking away can be stopped from Home': async (page) => {
    await padWithThread(page);
    await tap(page, page.getByRole("button", { name: "Focus on this" }));
    await page.getByRole("button", { name: "Start focus" }).waitFor({ state: "visible", timeout: 8000 });
    await goHome(page);
    check((await pickUp(page)).some((r) => /Waiting on Focus/.test(r)), "expected a Waiting on Focus row");
    await tap(page, page.getByRole("button", { name: "Stop waiting" }));
    check(!(await pickUp(page)).some((r) => /Waiting on/.test(r)), "still waiting after Stop waiting");
  },

  "a started focus request opens its context, and ending it clears the wait": async (page) => {
    await padWithThread(page);
    await tap(page, page.getByRole("button", { name: "Focus on this" }));
    await tap(page, page.getByRole("button", { name: "Start focus" }));
    await goHome(page);
    await tap(page, page.locator(".home-loops__row", { hasText: "Waiting on Focus" }));
    await page.locator('[aria-label="End context"]').waitFor({ state: "visible", timeout: 8000 });
    await tap(page, page.locator('[aria-label="End context"]'));
    await goHome(page);
    check(!(await pickUp(page)).some((r) => /Waiting on|Continue/.test(r)), `rows remain: ${JSON.stringify(await pickUp(page))}`);
  },

  "a context started in Focus can be stepped off and ended": async (page) => {
    await page.goto(`${BASE}/focus`);
    const field = page.locator("textarea, input").first();
    await field.waitFor({ state: "visible", timeout: 8000 });
    await field.fill("Ship the release");
    await field.press("Enter");
    await page.locator('[aria-label="End context"]').waitFor({ state: "visible", timeout: 8000 });
    await tap(page, page.locator(".session-runner__bar-back"));
    check((await page.locator('[aria-label="End context"]').count()) === 0, "could not step off the context");
    await assertEveryRowCanBeEnded(page);
  },

  "a focus that asked ThinkPad for steps stops waiting when its context is ended": async (page) => {
    await page.goto(`${BASE}/focus`);
    const field = page.locator("textarea, input").first();
    await field.waitFor({ state: "visible", timeout: 8000 });
    await field.fill("Plan the move");
    await field.press("Enter");
    await tap(page, page.getByRole("button", { name: "Decompose" }));
    await tap(page, page.locator(".composer-sources .v-btn").nth(1)); // think it through elsewhere
    await page.waitForURL(/thinkpad/, { timeout: 8000 });
    await page.waitForTimeout(1200);
    await goHome(page);
    check((await pickUp(page)).some((r) => /Waiting on ThinkPad/.test(r)), `expected a Waiting on ThinkPad row, saw ${JSON.stringify(await pickUp(page))}`);
    await tap(page, page.locator(".home-loops__row", { hasText: "Continue" }));
    await tap(page, page.locator('[aria-label="End context"]'));
    await goHome(page);
    check(!(await pickUp(page)).some((r) => /Waiting on/.test(r)), `still waiting: ${JSON.stringify(await pickUp(page))}`);
  },

  "running a workflow as a context leaves nothing waiting": async (page) => {
    await page.goto(`${BASE}/workflows`);
    await tap(page, page.getByText("Research and synthesize"));
    await tap(page, page.getByRole("button", { name: /Run as new context/ }));
    await tap(page, page.getByRole("button", { name: "Start focus" }));
    await goHome(page);
    check(!(await pickUp(page)).some((r) => /Waiting on/.test(r)), `something is waiting: ${JSON.stringify(await pickUp(page))}`);
    await assertEveryRowCanBeEnded(page);
  },
};

async function waitForServer(url, ms = 30000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try { if ((await fetch(url)).ok) return; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`the app did not come up at ${url}`);
}

(async () => {
  let server = null;
  if (!process.env.E2E_URL) {
    server = spawn("npx", ["vite", "--port", String(PORT), "--strictPort"], { stdio: "ignore", detached: true });
    await waitForServer(BASE);
  }
  const browser = await chromium.launch();
  const failures = [];
  try {
    for (const [name, flow] of Object.entries(FLOWS)) {
      let error = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        // A fresh browser context per attempt: empty storage, nothing carried over.
        const context = await browser.newContext(PHONE);
        const page = await context.newPage();
        const consoleErrors = [];
        page.on("pageerror", (e) => consoleErrors.push(e.message));
        try {
          await flow(page);
          await assertEveryRowCanBeEnded(page);
          check(!consoleErrors.length, `page errors: ${consoleErrors.join(" | ")}`);
          error = null;
        } catch (e) {
          error = e;
          await page.screenshot({ path: `e2e/failure-${name.replace(/[^a-z0-9]+/gi, "-").slice(0, 50)}.png` }).catch(() => {});
        }
        await context.close();
        if (!error) break;
      }
      console.log(`${error ? "FAIL" : "ok  "}  ${name}${error ? `\n      ${error.message.split("\n")[0]}` : ""}`);
      if (error) failures.push(name);
    }
  } finally {
    await browser.close();
    if (server) { try { process.kill(-server.pid); } catch { /* already gone */ } }
  }
  console.log(failures.length ? `\n${failures.length} of ${Object.keys(FLOWS).length} flows failed` : `\nall ${Object.keys(FLOWS).length} flows passed`);
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
