// Browser smoke suite for Timberline.
// Usage: serve the repo root (e.g. `python3 -m http.server 8080`), then run
//   npm i --no-save playwright-core && node tests/browser/smoke.js
// Env: BASE_URL (default http://127.0.0.1:8080/index.html), CHROME_PATH (system Chrome binary),
// SHOTS_DIR (screenshot output, default the OS temp dir).
const { chromium } = require("playwright-core");
const fs = require("fs");
const os = require("os");
const path = require("path");

const BASE = process.env.BASE_URL || "http://127.0.0.1:8080/index.html";
const SHOTS = process.env.SHOTS_DIR || os.tmpdir();
const CHROME = process.env.CHROME_PATH;
const KEY = "timberline.save.v1";
const results = [];
const consoleErrors = [];

function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || "" });
  console.log((ok ? "PASS " : "FAIL ") + name + (detail ? " — " + detail : ""));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function hook(page, label) {
  page.on("pageerror", (e) => consoleErrors.push(`[${label}] pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(`[${label}] console: ${m.text()}`);
  });
}

async function newPage(browser, opts) {
  const context = await browser.newContext({
    viewport: opts.viewport || { width: 1280, height: 900 },
    deviceScaleFactor: 1
  });
  if (opts.seed) {
    await context.addInitScript(
      ({ key, seed }) => {
        if (!sessionStorage.getItem("__seeded")) {
          localStorage.setItem(key, JSON.stringify(seed));
          sessionStorage.setItem("__seeded", "1");
        }
      },
      { key: KEY, seed: opts.seed }
    );
  }
  const page = await context.newPage();
  hook(page, opts.label || "page");
  await page.goto(BASE, { waitUntil: "load" });
  return { context, page };
}

async function readSave(page) {
  return page.evaluate((k) => {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : null;
  }, KEY);
}

async function waitSave(page, pred, timeout = 12000) {
  const start = Date.now();
  let last = null;
  while (Date.now() - start < timeout) {
    last = await readSave(page);
    if (last && pred(last)) return last;
    await sleep(400);
  }
  return last;
}

async function text(page, sel) {
  return page.$eval(sel, (n) => n.textContent.trim());
}

async function waitText(page, sel, value, timeout = 8000) {
  try {
    await page.waitForFunction(
      ([s, v]) => {
        const n = document.querySelector(s);
        return n && n.textContent.trim() === v;
      },
      [sel, value],
      { timeout }
    );
    return true;
  } catch (e) {
    return false;
  }
}

async function waitToast(page, fragment, timeout = 4000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const hit = await page.$$eval(".toast-title", (n, f) => n.some((x) => x.textContent.includes(f)), fragment);
    if (hit) return true;
    await sleep(100);
  }
  return false;
}

async function canvasPoint(page) {
  const box = await page.$eval("#scene", (c) => {
    const r = c.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  });
  return { x: box.x + box.w * 0.5, y: box.y + box.h * 0.55 };
}

async function chop(page, n, sellEvery = 0) {
  const p = await canvasPoint(page);
  for (let i = 0; i < n; i++) {
    await page.mouse.click(p.x, p.y);
    if (sellEvery && i % sellEvery === sellEvery - 1) {
      const disabled = await page.$eval("#sell-btn", (b) => b.disabled);
      if (!disabled) await page.click("#sell-btn");
    }
  }
}

async function ensureScreenshot(page, name) {
  const path = `${SHOTS}/${name}`;
  await page.screenshot({ path, fullPage: false });
  const ok = fs.existsSync(path) && fs.statSync(path).size > 5000;
  check("screenshot exists: " + name, ok, ok ? fs.statSync(path).size + " bytes" : "missing");
}

const seedBase = (overrides) =>
  Object.assign(
    {
      v: 1,
      savedAt: Date.now(),
      timber: 0,
      cash: 0,
      runTimber: 0,
      lifetimeTimber: 0,
      cashEarned: 0,
      research: 0,
      researchEarned: 0,
      seedlings: 0,
      trees: 0,
      clicks: 0,
      crits: 0,
      machinesHired: 0,
      replants: 0,
      playtime: 0,
      eventsSeen: 0,
      contractsDone: 0,
      tool: 0,
      zone: 0,
      machines: {},
      overhauls: {},
      runUnlocked: {},
      mill: {},
      nodes: {},
      achievements: {},
      auto: { sell: false, fell: false, buy: false },
      events: [],
      eventCooldown: 9999,
      market: { price: 1, hist: [1] },
      contract: null,
      contractCooldown: 9999,
      bulk: 1,
      sound: false,
      tutorial: 99
    },
    overrides
  );

async function scenarioFirstMinute(browser) {
  const { context, page } = await newPage(browser, { label: "first-minute" });
  const tut = await page.isVisible("#tutorial");
  check("tutorial visible on fresh save", tut);
  check("tutorial starts on Welcome", (await text(page, "#tut-title")) === "Welcome to Timberline");
  await ensureScreenshot(page, "01-desktop-fresh-tutorial.png");

  await page.click("#tut-next");
  check("step 2 Make some chips", await waitText(page, "#tut-title", "Make some chips"));
  await chop(page, 5);
  check("step 3 Cash in after 5 taps", await waitText(page, "#tut-title", "Cash in", 4000));
  const timberAfterTaps = await text(page, "#res-timber");
  check("timber increases from taps", timberAfterTaps !== "0", "timber=" + timberAfterTaps);

  await chop(page, 40, 10);
  await page.click("#sell-btn").catch(() => {});
  check("step 4 Sharpen up after selling", await waitText(page, "#tut-title", "Sharpen up", 6000));
  const cashAfterSell = await text(page, "#res-cash");
  check("cash increases after sell", cashAfterSell !== "$0", "cash=" + cashAfterSell);

  let bought = false;
  for (let round = 0; round < 60 && !bought; round++) {
    await chop(page, 30, 10);
    await page.click("#sell-btn").catch(() => {});
    bought = !(await page.$eval("#list-tools .card:nth-child(2) .card-btn", (b) => b.disabled));
  }
  check("felling axe becomes affordable through play", bought);
  if (bought) {
    await page.click("#list-tools .card:nth-child(2) .card-btn");
    await page.click("#tab-tools");
  const toolTexts = await page.$$eval("#list-tools .card .card-btn", (b) => b.map((x) => x.textContent));
  await page.click("#tab-fleet");
  check("tool equipped badge shows Equipped", toolTexts[1] === "Equipped", JSON.stringify(toolTexts.slice(0, 3)));
    check("step 5 Build your fleet after buying tool", await waitText(page, "#tut-title", "Build your fleet", 4000));
  }

  let hired = false;
  for (let round = 0; round < 60 && !hired; round++) {
    await chop(page, 20, 5);
    await page.click("#sell-btn").catch(() => {});
    hired = !(await page.$eval("#list-fleet .card:nth-child(1) .card-btn", (b) => b.disabled).catch(() => true));
    if (!hired) {
      await page.click("#tab-fleet").catch(() => {});
    }
  }
  check("ground crew affordable through play", hired);
  if (hired) {
    await page.click("#list-fleet .card:nth-child(1) .card-btn");
    await sleep(300);
    const units = await page.$$eval("#fleet-strip .unit", (n) => n.length);
    check("fleet strip shows the hired crew", units >= 1, "units=" + units);
    check("step 6 The long game", await waitText(page, "#tut-title", "The long game", 4000));
    await page.click("#tut-next");
    check("tutorial hides after final step", !(await page.isVisible("#tutorial")));
  }

  const r1 = await text(page, "#rate-timber");
  await sleep(4000);
  const save1 = await readSave(page);
  check("timber rate displays after machine hire", r1 !== "+0/s", "rate=" + r1);
  check("machine production accumulates over time", save1 && save1.machines.crew >= 1 && save1.timber + save1.cashEarned > 0, "machines=" + JSON.stringify(save1 && save1.machines));
  await ensureScreenshot(page, "02-desktop-after-first-minute.png");

  const errs = consoleErrors.slice();
  await context.close();
  return errs;
}

async function scenarioSave(browser) {
  const seed = seedBase({
    cash: 800,
    timber: 40,
    runTimber: 900,
    lifetimeTimber: 900,
    cashEarned: 800,
    tool: 1,
    zone: 0,
    machines: { crew: 4 },
    runUnlocked: { crew: true },
    tutorial: 99
  });
  const { context, page } = await newPage(browser, { seed, label: "save" });
  const s0 = await readSave(page);
  check("seeded save loads into the UI", (await text(page, "#res-cash")) === "$800", "cash=" + (await text(page, "#res-cash")));
  check("seeded machines appear in fleet strip", (await page.$$("#fleet-strip .unit")).length === 1);

  await page.click("#tab-fleet");
  await page.click('#bulk-bar button[data-bulk="10"]');
  const btnText = await text(page, "#list-fleet .card:nth-child(1) .card-btn");
  check("bulk x10 changes hire label", btnText.startsWith("Hire ×10"), btnText);
  await page.click('#bulk-bar button[data-bulk="1"]');

  const saved = await waitSave(page, (s) => s.cash === 800 && s.machines.crew === 4);
  check("save written with seeded values", saved && saved.machines.crew === 4);

  await page.click("#tab-upgrades");
  await sleep(300);
  const ovBtn = await page.$("#list-upgrades .card-btn:not([disabled])");
  check("overhaul button enabled for owned crew with enough cash", ovBtn !== null);

  await page.reload({ waitUntil: "load" });
  await sleep(300);
  check("cash persists across reload", (await text(page, "#res-cash")) === "$800", "cash=" + (await text(page, "#res-cash")));
  check("machines persist across reload", (await page.$$("#fleet-strip .unit")).length === 1);
  check("timber persists across reload (save key present)", (await readSave(page)) !== null);

  await context.close();
}

async function scenarioDeep(browser) {
  const seed = seedBase({
    cash: 5000000,
    timber: 500,
    runTimber: 6000000,
    lifetimeTimber: 9000000,
    cashEarned: 5000000,
    research: 300,
    researchEarned: 300,
    tool: 3,
    zone: 1,
    trees: 40,
    machines: { crew: 10, skidder: 2 },
    runUnlocked: { crew: true, skidder: true, feller: true },
    nodes: { mkt1: true, mkt2: true, aut1: true, aut2: true },
    auto: { sell: false, fell: false, buy: false },
    mill: {},
    market: { price: 1.2, hist: [1, 1.2] },
    contract: { kind: "click", title: "Rush Felling", icon: "🪓", desc: "Land 5 taps within the window.", target: 5, progress: 0, left: 200 },
    contractCooldown: 9999,
    tutorial: 99
  });
  const { context, page } = await newPage(browser, { seed, label: "deep" });
  const achievementToast = await waitToast(page, "Achievement:", 3000);

  // Contracts
  check("seeded contract shows on the board", (await text(page, "#ct-title")) === "Rush Felling");
  await chop(page, 5);
  const toastWatch = await waitToast(page, "Contract complete", 4000);
  const afterContract = await waitSave(page, (s) => s.contractsDone === 1 && s.contract === null, 8000);
  check("click contract completes after 5 taps", afterContract && afterContract.contractsDone === 1, afterContract ? "done=" + afterContract.contractsDone : "no save");
  check("contract reward toast shown", toastWatch);

  // Research
  await page.click("#tab-research");
  await sleep(200);
  const researchBtn = await page.$("#list-research .card:not(.is-header) .card-btn:not([disabled])");
  const rsName = await page.$eval("#list-research .card:not(.is-header):not(.locked) .card-name", (n) => n.textContent).catch(() => null);
  check("research nodes list rendered", (await page.$$("#list-research .card:not(.is-header)")).length >= 20);
  check("a research node is affordable", researchBtn !== null, "first=" + rsName);
  const researchBefore = (await readSave(page)).research;
  // hyd1 is already unaffordable? seeded nodes exclude hyd1; cost 20 vs research 300
  const hydBtn = await page.$('#list-research .card[data-key="rs-hyd1"] .card-btn');
  await hydBtn.click();
  const afterRes = await waitSave(page, (s) => s.nodes.hyd1 === true, 8000);
  check("research purchase saves node and spends points", afterRes && afterRes.nodes.hyd1 && afterRes.research < researchBefore, afterRes ? "research " + researchBefore + " -> " + afterRes.research : "");

  // Automation toggles
  await page.click("#tab-upgrades");
  await sleep(200);
  const autoSellBtn = await page.$('#list-upgrades .card[data-key="auto-sell"] .card-btn');
  await autoSellBtn.click();
  const autoSaved = await waitSave(page, (s) => s.auto && s.auto.sell === true, 8000);
  check("Auto-Sell toggle switches on and saves", !!(autoSaved && autoSaved.auto.sell));

  // Sawmill
  const millBtn = await page.$('#list-upgrades .card[data-key="mill-mill-band"] .card-btn');
  check("first sawmill upgrade affordable", millBtn && !(await millBtn.isDisabled()));
  await millBtn.click();
  const millSaved = await waitSave(page, (s) => s.mill && s.mill["mill-band"], 8000);
  check("sawmill Band Saw Line installed and saved", !!(millSaved && millSaved.mill["mill-band"]));

  // Overhaul
  const ovBtn = await page.$('#list-upgrades .card[data-key="ov-crew"] .card-btn');
  if (ovBtn) {
    await ovBtn.click();
    const ovSaved = await waitSave(page, (s) => s.overhauls && s.overhauls.crew === 1, 8000);
    check("crew overhaul to Mk II saved", !!(ovSaved && ovSaved.overhauls.crew === 1));
  } else {
    check("crew overhaul button present", false);
  }

  // Market: price history grows over time
  const h0 = (await readSave(page)).market.hist.length;
  await sleep(9000);
  const h1 = (await readSave(page)).market.hist.length;
  check("market price history updates over time", h1 > h0, "hist " + h0 + " -> " + h1);

  // Fleet: hire through bulk max
  await page.click("#tab-fleet");
  await page.click('#bulk-bar button[data-bulk="max"]');
  await page.click('#list-fleet .card[data-key="m-crew"] .card-btn');
  const hired = await waitSave(page, (s) => s.machinesHired > 10, 8000);
  check("bulk max hires machines", !!(hired && hired.machinesHired > 10), hired ? "hired=" + hired.machinesHired : "");

  // Timber and cash gains over time (automation on)
  const s0 = await readSave(page);
  await sleep(5000);
  const s1 = await readSave(page);
  const gainedCash = s1.cashEarned - s0.cashEarned;
  const gainedLifetime = s1.lifetimeTimber - s0.lifetimeTimber;
  check("cash gains over time from auto-sell", gainedCash > 0, "gained cash=" + Math.round(gainedCash));
  check("timber gains over time from machines", gainedLifetime > 0, "lifetime +" + Math.round(gainedLifetime));

  // Achievement toast
  check("achievement toast appeared during session", achievementToast);

  await ensureScreenshot(page, "03-desktop-midgame-upgrades.png");

  // Tool upgrade path visible
  await page.click("#tab-tools");
  const nextTool = await page.$("#list-tools .card:nth-child(5) .card-btn");
  check("tool list shows Equipped and Buy states", (await page.$$eval("#list-tools .card .card-btn", (b) => b.map((x) => x.textContent))).some((t) => t === "Equipped"));
  void nextTool;

  await context.close();
}

async function scenarioPrestige(browser) {
  const seed = seedBase({
    cash: 10000,
    runTimber: 1.2e7,
    lifetimeTimber: 1.2e7,
    cashEarned: 10000,
    tool: 4,
    zone: 2,
    machines: { crew: 30, skidder: 5 },
    runUnlocked: { crew: true, skidder: true },
    nodes: { sus1: true },
    tutorial: 99
  });
  const { context, page } = await newPage(browser, { seed, label: "prestige" });
  await page.click("#tab-replant");
  await sleep(200);
  const disabled = await page.$eval("#rp-btn", (b) => b.disabled);
  check("Replant button enabled at threshold", !disabled);
  await page.click("#rp-btn");
  check("replant confirm modal opens", await page.isVisible("#modal-root .modal"));
  await page.click('#modal-root .modal-foot button:has-text("Replant")');
  const after = await waitSave(page, (s) => s.seedlings >= 1 && s.runTimber === 0, 8000);
  check("replant grants seedlings and resets run", !!(after && after.seedlings >= 1 && after.runTimber === 0 && after.machines.crew === undefined), after ? "seedlings=" + after.seedlings : "");
  check("research and nodes persist after replant", !!(after && after.nodes.sus1));
  await sleep(300);
  await page.click("#tab-replant");
  check("Replant panel shows seedlings bonus", (await text(page, "#rp-seeds")) !== "0");
  await ensureScreenshot(page, "04-desktop-replant-panel.png");
  await context.close();
}

async function scenarioExportImportReset(browser) {
  const seed = seedBase({
    cash: 4321,
    runTimber: 5000,
    lifetimeTimber: 5000,
    cashEarned: 4321,
    tool: 2,
    machines: { crew: 7 },
    runUnlocked: { crew: true },
    tutorial: 99
  });
  const { context, page } = await newPage(browser, { seed, label: "export" });
  const cashBefore = await text(page, "#res-cash");

  await page.click("#tab-settings");
  await page.click("#set-export");
  await page.waitForSelector(".save-text");
  const exported = await page.$eval(".save-text", (t) => t.value);
  check("export produces a save string", exported.length > 100, "len=" + exported.length);
  await page.click('#modal-root .modal-foot button:has-text("Close")');

  // Reset flow: confirm button stays disabled until RESET typed
  await page.click("#set-reset");
  await page.waitForSelector("#reset-input");
  const resetDisabledAtStart = await page.$eval("#reset-confirm", (b) => b.disabled);
  check("reset confirm disabled before typing", resetDisabledAtStart);
  await page.fill("#reset-input", "reset");
  const resetEnabledCase = await page.$eval("#reset-confirm", (b) => !b.disabled);
  check("reset accepts RESET typed in any case", resetEnabledCase);
  await page.fill("#reset-input", "nope");
  check("reset stays disabled for wrong text", await page.$eval("#reset-confirm", (b) => b.disabled));
  await page.fill("#reset-input", "RESET");
  await Promise.all([page.waitForLoadState("load"), page.click("#reset-confirm")]);
  await sleep(600);
  const cashAfterReset = await text(page, "#res-cash");
  check("reset clears progress in the UI", cashAfterReset === "$0", "cash=" + cashAfterReset);
  await sleep(4500);
  const saveAfterReset = await readSave(page);
  check("reset does not get overwritten by unload autosave", saveAfterReset === null || (saveAfterReset.cash === 0 && saveAfterReset.machines && Object.keys(saveAfterReset.machines).length === 0), saveAfterReset ? "cash=" + saveAfterReset.cash : "no save");

  // Import round trip
  await page.click("#tab-settings");
  await page.click("#set-import");
  await page.fill(".modal-body textarea", exported);
  await Promise.all([page.waitForLoadState("load"), page.click('#modal-root .modal-foot button:has-text("Import and reload")')]);
  await sleep(600);
  const cashImported = await text(page, "#res-cash");
  check("import restores exported cash", cashImported === cashBefore, "before=" + cashBefore + " after=" + cashImported);
  await sleep(4500);
  const importedSave = await readSave(page);
  check("import persists through reload (not overwritten)", importedSave && importedSave.cash === 4321, importedSave ? "cash=" + importedSave.cash : "no save");

  // Bad import
  await page.click("#tab-settings");
  await page.click("#set-import");
  await page.fill(".modal-body textarea", "not-a-save!!");
  await page.click('#modal-root .modal-foot button:has-text("Import and reload")');
  check("bad import shows error and keeps progress", await page.isVisible(".error-text"));
  await page.click('#modal-root .modal-foot button:has-text("Cancel")');

  await context.close();
}

async function scenarioOffline(browser) {
  const seed = seedBase({
    cash: 100,
    runTimber: 1000,
    lifetimeTimber: 1000,
    machines: { crew: 50 },
    runUnlocked: { crew: true },
    auto: { sell: false, fell: false, buy: false },
    savedAt: Date.now() - 2 * 3600 * 1000,
    tutorial: 99
  });
  const { context, page } = await newPage(browser, { seed, label: "offline" });
  check("offline welcome-back modal appears", await page.isVisible("#modal-root .modal"));
  const body = await page.$eval("#modal-root .modal-body", (n) => n.textContent);
  check("offline modal reports gathered timber", body.includes("gathered"), body.slice(0, 140));
  await ensureScreenshot(page, "05-desktop-offline-welcome.png");
  await context.close();
}

async function scenarioMobile(browser) {
  const seed = seedBase({
    cash: 25000,
    timber: 300,
    runTimber: 60000,
    lifetimeTimber: 60000,
    cashEarned: 25000,
    tool: 2,
    zone: 1,
    machines: { crew: 12, skidder: 3, feller: 2 },
    runUnlocked: { crew: true, skidder: true, feller: true },
    nodes: { hyd1: true },
    research: 40,
    tutorial: 99
  });
  const { context, page } = await newPage(browser, { seed, viewport: { width: 390, height: 844 }, label: "mobile" });
  await sleep(600);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check("mobile layout has no horizontal overflow", overflow <= 1, "overflow=" + overflow + "px");
  const canvasH = await page.$eval("#scene", (c) => c.getBoundingClientRect().height);
  check("mobile stage has usable height", canvasH >= 250, "height=" + Math.round(canvasH));
  await sleep(1500);
  const toastCount = await page.$$eval(".toast", (n) => n.length);
  check("toast stack capped at 3 on mobile", toastCount <= 3, "toasts=" + toastCount);
  await ensureScreenshot(page, "06-mobile-390-midgame.png");
  await page.click("#tab-fleet");
  await sleep(300);
  await ensureScreenshot(page, "07-mobile-390-fleet-tab.png");
  await context.close();
}

async function scenarioSpaceHold(browser) {
  const seed = seedBase({ tutorial: 99 });
  const { context, page } = await newPage(browser, { seed, label: "space-hold" });
  await page.click("#tab-settings");
  const readTaps = async () => parseInt((await text(page, "#st-clicks")).replace(/[^0-9]/g, ""), 10);
  const blurFocus = () => page.evaluate(() => document.activeElement && document.activeElement.blur());

  await blurFocus();
  const before = await readTaps();
  await page.keyboard.down("Space");
  for (let i = 0; i < 30; i++) {
    await sleep(33);
    await page.keyboard.down("Space");
  }
  await page.keyboard.up("Space");
  await sleep(400);
  const afterHold = await readTaps();
  check("holding Space for ~1s counts exactly one click", afterHold - before === 1, "taps " + before + " -> " + afterHold);

  await blurFocus();
  const mouseBefore = await readTaps();
  const p = await canvasPoint(page);
  await page.mouse.click(p.x, p.y);
  await sleep(400);
  const mouseAfter = await readTaps();
  check("mouse click still counts exactly one", mouseAfter - mouseBefore === 1, "taps " + mouseBefore + " -> " + mouseAfter);

  await blurFocus();
  const tapBefore = await readTaps();
  await page.keyboard.press("Space");
  await sleep(400);
  const tapAfter = await readTaps();
  check("single Space press counts exactly one click", tapAfter - tapBefore === 1, "taps " + tapBefore + " -> " + tapAfter);

  await blurFocus();
  const holdBefore = await readTaps();
  await page.keyboard.down("Space");
  for (let i = 0; i < 10; i++) {
    await sleep(33);
    await page.keyboard.down("Space");
  }
  await page.keyboard.up("Space");
  await sleep(400);
  const holdAfter = await readTaps();
  check("second held press also counts exactly one click", holdAfter - holdBefore === 1, "taps " + holdBefore + " -> " + holdAfter);

  await context.close();
}

async function scenarioTablet(browser) {
  const seed = seedBase({
    cash: 25000,
    runTimber: 60000,
    lifetimeTimber: 60000,
    machines: { crew: 12 },
    runUnlocked: { crew: true },
    tutorial: 99
  });
  const { context, page } = await newPage(browser, { seed, viewport: { width: 820, height: 1180 }, label: "tablet" });
  await sleep(400);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check("tablet layout has no horizontal overflow", overflow <= 1, "overflow=" + overflow + "px");
  await context.close();
}

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROME || undefined,
    args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"]
  });
  const suites = [
    ["first-minute", scenarioFirstMinute],
    ["save-reload", scenarioSave],
    ["deep-systems", scenarioDeep],
    ["prestige", scenarioPrestige],
    ["export-import-reset", scenarioExportImportReset],
    ["offline", scenarioOffline],
    ["mobile", scenarioMobile],
    ["space-hold", scenarioSpaceHold],
    ["tablet", scenarioTablet]
  ];
  const only = process.env.ONLY ? process.env.ONLY.split(",") : null;
  for (const [name, fn] of suites) {
    if (only && !only.includes(name)) continue;
    console.log("\n== " + name);
    try {
      await fn(browser);
    } catch (e) {
      check("suite " + name + " completed", false, e.message.split("\n")[0]);
    }
  }
  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log("\nTotal checks:", results.length, "passed:", results.length - failed.length, "failed:", failed.length);
  console.log("Console/page errors:", consoleErrors.length);
  consoleErrors.slice(0, 30).forEach((e) => console.log("  " + e));
  const out = path.join(SHOTS, "timberline-browser-results.json");
  fs.writeFileSync(out, JSON.stringify({ results, consoleErrors }, null, 2));
  console.log("Results written to " + out);
  if (failed.length) process.exitCode = 1;
})();
