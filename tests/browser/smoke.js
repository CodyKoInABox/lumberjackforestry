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
    deviceScaleFactor: 1,
    hasTouch: !!opts.touch,
    isMobile: !!opts.touch
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

const MOBILE_VIEWPORTS = [
  { name: "360x740", width: 360, height: 740 },
  { name: "390x844", width: 390, height: 844 },
  { name: "430x932", width: 430, height: 932 },
  { name: "820x1180-tablet", width: 820, height: 1180 },
  { name: "landscape-844x390", width: 844, height: 390 },
  { name: "landscape-740x360", width: 740, height: 360 }
];

const richSeed = () =>
  seedBase({
    cash: 25000,
    timber: 300,
    runTimber: 60000,
    lifetimeTimber: 60000,
    cashEarned: 25000,
    tool: 2,
    zone: 1,
    machines: { crew: 12, skidder: 3, feller: 2, drone: 1 },
    runUnlocked: { crew: true, skidder: true, feller: true, drone: true },
    nodes: { hyd1: true },
    research: 40,
    tutorial: 99
  });

async function layoutReport(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const small = [...document.querySelectorAll("button, [role=tab], a[href]")]
      .filter((n) => n.getClientRects().length > 0)
      .map((n) => {
        const r = n.getBoundingClientRect();
        return { label: (n.id || n.getAttribute("aria-label") || n.textContent || n.tagName).trim().slice(0, 28), w: Math.round(r.width), h: Math.round(r.height) };
      })
      .filter((t) => t.w < 44 || t.h < 44);
    const sceneRect = document.getElementById("scene").getBoundingClientRect();
    const covered = [];
    const controls = [
      ["scene", document.getElementById("scene")],
      ["sell", document.getElementById("sell-btn")],
      ...[...document.querySelectorAll(".tabs [role=tab]")].map((t) => [t.id, t])
    ];
    for (const [label, node] of controls) {
      if (!node || node.getClientRects().length === 0) continue;
      const r = node.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      if (x < 0 || y < 0 || x > vw || y > vh) continue;
      const hit = document.elementFromPoint(x, y);
      if (!hit || !(node === hit || node.contains(hit))) covered.push(label + " <- " + (hit ? hit.className || hit.tagName : "none"));
    }
    return {
      overflow: document.documentElement.scrollWidth - vw,
      small,
      sceneInside: sceneRect.left >= -1 && sceneRect.right <= vw + 1,
      sceneW: Math.round(sceneRect.width),
      sceneH: Math.round(sceneRect.height),
      covered
    };
  });
}

async function scenarioMobileLayout(browser) {
  for (const vp of MOBILE_VIEWPORTS) {
    const { context, page } = await newPage(browser, { seed: richSeed(), viewport: { width: vp.width, height: vp.height }, label: "layout-" + vp.name });
    await sleep(700);
    const base = await layoutReport(page);
    check("[" + vp.name + "] no horizontal overflow", base.overflow <= 1, "overflow=" + base.overflow + "px");
    check("[" + vp.name + "] stage fits the viewport", base.sceneInside && base.sceneW >= 200 && base.sceneH >= 120, "scene=" + base.sceneW + "x" + base.sceneH);
    check("[" + vp.name + "] tap targets are at least 44px", base.small.length === 0, base.small.length ? "small: " + base.small.slice(0, 6).map((t) => t.label + " " + t.w + "x" + t.h).join("; ") : "all ok");

    await page.click("#tab-fleet");
    await sleep(250);
    await page.evaluate(() => {
      const cards = document.querySelectorAll("#list-fleet .card");
      cards[cards.length - 1].scrollIntoView({ block: "center" });
    });
    await sleep(250);
    const lastVisible = await page.evaluate(() => {
      const cards = document.querySelectorAll("#list-fleet .card");
      const r = cards[cards.length - 1].getBoundingClientRect();
      return r.top >= 0 && r.bottom <= window.innerHeight + 1;
    });
    check("[" + vp.name + "] buy panel scrolls to the last machine", lastVisible, "cards=" + (await page.$$eval("#list-fleet .card", (n) => n.length)));

    await page.click("#tab-upgrades");
    await sleep(250);
    await page.evaluate(() => {
      const cards = document.querySelectorAll("#list-upgrades .card");
      if (cards.length) cards[cards.length - 1].scrollIntoView({ block: "center" });
    });
    await sleep(250);
    const upgradesOk = await page.evaluate(() => {
      const cards = document.querySelectorAll("#list-upgrades .card");
      if (!cards.length) return false;
      const r = cards[cards.length - 1].getBoundingClientRect();
      return r.top >= 0 && r.bottom <= window.innerHeight + 1;
    });
    check("[" + vp.name + "] upgrade panel scrolls to the last card", upgradesOk);

    await page.click("#tab-fleet");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.evaluate(() => LJ.UI.toast({ icon: "🧪", title: "Layout check", text: "Toast placement at " + window.innerWidth + "px" }));
    await sleep(350);
    const withToast = await layoutReport(page);
    check("[" + vp.name + "] toasts do not cover main controls", withToast.covered.length === 0, withToast.covered.join("; ") || "clear");
    await ensureScreenshot(page, "mobile-" + vp.name + "-midgame.png");

    await page.click("#tab-settings");
    await sleep(200);
    await page.click("#set-reset");
    await sleep(300);
    const modal = await page.evaluate(() => {
      const box = document.querySelector("#modal-root .modal");
      if (!box) return null;
      const r = box.getBoundingClientRect();
      const btns = [...box.querySelectorAll("button")].map((b) => {
        const br = b.getBoundingClientRect();
        return Math.min(br.width, br.height);
      });
      return { inside: r.left >= -1 && r.top >= -1 && r.right <= window.innerWidth + 1 && r.bottom <= window.innerHeight + 1, minBtn: btns.length ? Math.round(Math.min(...btns)) : 0 };
    });
    check("[" + vp.name + "] reset modal fits the viewport", !!modal && modal.inside, JSON.stringify(modal));
    check("[" + vp.name + "] modal buttons are at least 44px", !!modal && modal.minBtn >= 44, modal ? "min=" + modal.minBtn : "no modal");
    await ensureScreenshot(page, "mobile-" + vp.name + "-modal.png");
    await page.keyboard.press("Escape");
    await sleep(200);
    await context.close();
  }
}

async function scenarioTouch(browser) {
  const { context, page } = await newPage(browser, { seed: richSeed(), viewport: { width: 390, height: 844 }, label: "touch", touch: true });
  await sleep(500);
  await page.click("#tab-settings");
  await sleep(200);
  const taps = async () => parseInt((await text(page, "#st-clicks")).replace(/[^0-9]/g, ""), 10);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(150);
  const p = await canvasPoint(page);

  let before = await taps();
  await page.touchscreen.tap(p.x, p.y);
  await sleep(350);
  check("touch tap on the forest counts exactly one click", (await taps()) - before === 1);

  const cdp = await context.newCDPSession(page);
  before = await taps();
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: p.x, y: p.y }] });
  await sleep(900);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await sleep(350);
  check("long-press on the forest counts exactly one click", (await taps()) - before === 1);

  await page.tap("#tab-fleet");
  await sleep(200);
  check("tapping a tab switches the panel", await page.$eval("#panel-fleet", (n) => !n.hidden));

  const hireBefore = await page.$$eval("#list-fleet .card-btn:not([disabled])", (n) => n.length);
  await page.evaluate(() => document.getElementById("tab-fleet").blur());
  const firstBuy = await page.$("#list-fleet .card:not(.locked) .card-btn:not([disabled])");
  const stripBefore = await text(page, "#fleet-strip");
  if (firstBuy) {
    await firstBuy.scrollIntoViewIfNeeded();
    const box = await firstBuy.boundingBox();
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await sleep(350);
  }
  const stripAfter = await text(page, "#fleet-strip");
  check("tapping a buy button hires a machine", !!firstBuy && stripAfter !== stripBefore, "buyable=" + hireBefore + " strip " + stripBefore.slice(0, 30) + " -> " + stripAfter.slice(0, 30));

  await page.click("#tab-settings");
  await sleep(150);
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  before = await taps();
  await page.keyboard.down("Space");
  for (let i = 0; i < 20; i++) {
    await sleep(40);
    await page.keyboard.down("Space");
  }
  await page.keyboard.up("Space");
  await sleep(350);
  check("held Space still counts one click", (await taps()) - before === 1);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(150);
  const p2 = await canvasPoint(page);
  before = await taps();
  await page.touchscreen.tap(p2.x, p2.y);
  await sleep(350);
  check("touch tap still works after the Space fix", (await taps()) - before === 1);
  await ensureScreenshot(page, "mobile-touch-390-after-taps.png");
  await context.close();
}

async function scenarioVisuals(browser) {
  const seed = seedBase({ cash: 500, runUnlocked: { crew: true }, tutorial: 99 });
  const { context, page } = await newPage(browser, { seed, viewport: { width: 1280, height: 900 }, label: "visuals" });
  await sleep(400);
  await page.click("#tab-tools");
  await page.click('#list-tools .card:has-text("Felling Axe") .card-btn');
  await sleep(350);
  check("no tool toolbar is drawn on the game screen", (await page.$("#scene-tools")) === null);

  await page.click("#tab-fleet");
  await page.click('#list-fleet .card:has-text("Ground Crew") .card-btn');
  await sleep(400);
  const drawn = await page.$eval("#scene", (c) => ({ crew: c.dataset.crewDrawn, machines: c.dataset.machinesDrawn }));
  check("forest scene draws only the tree (no crew or machine sprites)", drawn.crew === undefined && drawn.machines === undefined, JSON.stringify(drawn));

  const photos = await page.$$eval("#list-fleet .card-photo", (imgs) => imgs.map((i) => ({ src: i.getAttribute("src"), ok: i.complete && i.naturalWidth > 0 })));
  const allLoaded = photos.length === 13 && photos.every((p) => p.ok);
  check("buy screen shows a loaded image for each of the 13 machines", allLoaded, "images=" + photos.length + " loaded=" + photos.filter((p) => p.ok).length);
  const relative = photos.every((p) => p.src && !/^(\/|https?:)/.test(p.src));
  check("machine photos use relative paths", relative);
  await ensureScreenshot(page, "08-desktop-buy-screen-photos.png");
  await context.close();
}

async function scenarioFeatures(browser) {
  const achSeed = seedBase({ cash: 0, machines: { crew: 20 }, runUnlocked: { crew: true }, tutorial: 99 });
  let { context, page } = await newPage(browser, { seed: achSeed, viewport: { width: 1280, height: 900 }, label: "ach" });
  const ach = await waitSave(page, (sv) => sv.achievements && sv.achievements["crew-of-twenty"] === true, 12000);
  check("Crew of Twenty achievement unlocks from a new save field", !!(ach && ach.achievements["crew-of-twenty"]));
  await context.close();

  const fleetSeed = seedBase({ cash: 0, machines: { crew: 3, skidder: 1, drone: 1 }, runUnlocked: { crew: true, skidder: true, drone: true }, tutorial: 99 });
  ({ context, page } = await newPage(browser, { seed: fleetSeed, viewport: { width: 1280, height: 900 }, label: "strip" }));
  await waitFor(async () => (await page.$$("#fleet-strip .unit")).length === 3, 3000);
  check("active fleet strip lists each owned machine type", (await page.$$("#fleet-strip .unit")).length === 3);
  await context.close();

  const sellSeed = seedBase({ cash: 0, timber: 500, runTimber: 500, lifetimeTimber: 500, tutorial: 99 });
  ({ context, page } = await newPage(browser, { seed: sellSeed, viewport: { width: 1280, height: 900 }, label: "hotkey" }));
  await sleep(300);
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press("s");
  const sv = await waitSave(page, (x) => x.timber < 1 && x.cash > 0, 9000);
  check("S key sells all timber", !!sv && sv.timber < 1 && sv.cash > 0, "timber=" + (sv && sv.timber) + " cash=" + (sv && sv.cash));
  await context.close();

  ({ context, page } = await newPage(browser, { seed: seedBase({ tutorial: 99 }), viewport: { width: 1280, height: 900 }, label: "cb" }));
  await sleep(300);
  await page.click("#tab-settings");
  await page.click("#set-colorblind");
  await sleep(150);
  const onNow = await page.evaluate(() => document.documentElement.classList.contains("cb"));
  check("colour-blind palette toggles on", onNow);
  await page.reload({ waitUntil: "load" });
  await sleep(300);
  const persisted = await page.evaluate(() => document.documentElement.classList.contains("cb"));
  const prefs = await page.evaluate(() => JSON.parse(localStorage.getItem("timberline.prefs.v1") || "{}"));
  check("colour-blind preference survives reload without touching the save", persisted && prefs.colorblind === true && !!(await readSave(page)));
  await page.click("#tab-settings");
  await page.click("#set-colorblind");
  await sleep(100);
  check("colour-blind palette toggles off", !(await page.evaluate(() => document.documentElement.classList.contains("cb"))));
  await context.close();
}

const productionSeed = () =>
  seedBase({
    replants: 1,
    cash: 3000000,
    timber: 2000,
    runTimber: 60000,
    lifetimeTimber: 60000,
    tutorial: 99,
    prod: {
      queue: 200,
      warehouses: 1,
      factories: 1,
      nextLine: 3,
      lines: [
        { id: 1, stages: ["saw", "plane", "dry", "pack"], stations: [2, 2, 1, 1], done: 40, earned: 900 },
        { id: 2, stages: ["saw", "pack"], stations: [1, 1], done: 0, earned: 0 }
      ]
    }
  });

async function scenarioProduction(browser) {
  let { context, page } = await newPage(browser, { seed: seedBase({ tutorial: 99 }), viewport: { width: 1280, height: 900 }, label: "prod-locked" });
  await sleep(400);
  check("production tab stays hidden before the first replant", await page.$eval("#tab-production", (n) => n.hidden));
  const migrated = await waitSave(page, (sv) => sv.prod && Array.isArray(sv.prod.lines), 8000);
  check("an old save without production data loads and gains a safe default", !!migrated && migrated.prod.queue === 0 && migrated.prod.lines.length === 0);
  await context.close();

  const sendSeed = seedBase({ replants: 1, seedlings: 1, cash: 0, timber: 1000, tutorial: 99 });
  ({ context, page } = await newPage(browser, { seed: sendSeed, viewport: { width: 1280, height: 900 }, label: "prod-send" }));
  await sleep(300);
  check("production tab appears after the first replant", !(await page.$eval("#tab-production", (n) => n.hidden)));
  await page.click("#tab-production");
  await sleep(200);
  await page.click("#pr-send-all");
  const sent = await waitSave(page, (sv) => sv.prod && sv.prod.queue > 0, 9000);
  check(
    "Send all moves timber into the queue, capped by warehouse capacity",
    !!sent && sent.prod.queue === 300 && Math.abs(sent.timber - 700) < 1e-6,
    "queue=" + (sent && sent.prod.queue) + " timber=" + (sent && sent.timber)
  );
  check("queue readout shows 300 / 300", (await text(page, "#pr-queue")) === "300 / 300", await text(page, "#pr-queue"));
  await context.close();

  ({ context, page } = await newPage(browser, { seed: seedBase({ replants: 1, cash: 5000000, tutorial: 99 }), viewport: { width: 1280, height: 900 }, label: "prod-factory" }));
  await sleep(300);
  await page.click("#tab-production");
  await page.click("#pb-fa-btn");
  const fac = await waitSave(page, (sv) => sv.prod && sv.prod.factories === 1, 9000);
  check("buying a factory adds a line slot and charges cash", !!fac && fac.cash < 5000000 && fac.cash > 3000000, "factories=" + (fac && fac.prod.factories) + " cash=" + (fac && fac.cash));
  check("line slots readout shows 0 / 2 after a factory", (await text(page, "#pr-slots")) === "0 / 2", await text(page, "#pr-slots"));
  await context.close();

  ({ context, page } = await newPage(browser, { seed: seedBase({ replants: 1, cash: 2000000, tutorial: 99 }), viewport: { width: 1280, height: 900 }, label: "prod-build" }));
  await sleep(300);
  await page.click("#tab-production");
  await page.click('#pb-chips [data-stage="saw"]');
  await page.click('#pb-chips [data-stage="plane"]');
  await page.click("#pb-build");
  const built = await waitSave(page, (sv) => sv.prod && sv.prod.lines.length === 1, 9000);
  check(
    "building a line from picked stages charges the stage costs",
    !!built && built.prod.lines[0].stages.join(",") === "saw,plane" && built.cash === 2000000 - 170000,
    "stages=" + (built && built.prod.lines[0].stages.join(",")) + " cash=" + (built && built.cash)
  );
  await page.click(".prod-line .flow-add");
  const staffed = await waitSave(page, (sv) => sv.prod && sv.prod.lines[0].stations[0] === 2, 9000);
  check("buying a station on a stage speeds that stage up", !!staffed, "stations=" + (staffed && JSON.stringify(staffed.prod.lines[0].stations)));
  await page.click(".prod-scrap");
  await page.click("#modal-root .btn.danger");
  const scrapped = await waitSave(page, (sv) => sv.prod && sv.prod.lines.length === 0, 9000);
  check("scrapping a line from its confirm dialog removes it", !!scrapped);
  await context.close();

  const runSeed = seedBase({
    replants: 1,
    cash: 0,
    tutorial: 99,
    prod: {
      queue: 300,
      warehouses: 0,
      factories: 0,
      nextLine: 2,
      lines: [{ id: 1, stages: ["saw", "plane"], stations: [1, 1], done: 0, earned: 0 }]
    }
  });
  ({ context, page } = await newPage(browser, { seed: runSeed, viewport: { width: 1280, height: 900 }, label: "prod-run" }));
  const worked = await waitSave(page, (sv) => sv.prod && sv.prod.processed > 0 && sv.cash > 0, 12000);
  check(
    "a running line turns queued timber into cash and drains the queue",
    !!worked && worked.prod.queue < 300 && worked.prod.earned > 0,
    "processed=" + (worked && worked.prod.processed) + " cash=" + (worked && worked.cash)
  );
  await page.click("#tab-production");
  await sleep(300);
  await ensureScreenshot(page, "production-desktop.png");
  await context.close();
}

async function scenarioSellFloor(browser) {
  const ignored = seedBase({ tutorial: 99, timber: 1000, nodes: { mkt2: true }, auto: { sell: true }, autoSellMin: 1.2, market: { price: 1, hist: [1] } });
  let { context, page } = await newPage(browser, { seed: ignored, viewport: { width: 1280, height: 900 }, label: "floor-old" });
  const sold = await waitSave(page, (sv) => sv.timber < 1 && sv.cash > 0, 9000);
  check("without Price Floors, Auto-Sell ignores a saved floor", !!sold && sold.cash > 0, "timber=" + (sold && sold.timber));
  await context.close();

  const gated = seedBase({ tutorial: 99, timber: 1000, nodes: { mkt2: true, mkt5: true }, auto: { sell: true }, autoSellMin: 1.2, market: { price: 1, hist: [1] } });
  ({ context, page } = await newPage(browser, { seed: gated, viewport: { width: 1280, height: 900 }, label: "floor-gate" }));
  const startedAt = Date.now();
  const held = await waitSave(page, (sv) => sv.savedAt > startedAt + 4500, 12000);
  check("below the floor, Auto-Sell holds timber", !!held && Math.abs(held.timber - 1000) < 1e-6 && held.cash === 0, "timber=" + (held && held.timber) + " cash=" + (held && held.cash));
  await page.click("#tab-upgrades");
  await sleep(300);
  check("the floor status says it is holding below the floor", /holding/.test(await text(page, "#sell-floor-now")), await text(page, "#sell-floor-now"));
  await page.click('#sell-floor [data-floor="0.8"]');
  const after = await waitSave(page, (sv) => sv.autoSellMin === 0.8 && sv.timber < 1 && sv.cash > 0, 9000);
  check("above the floor, Auto-Sell sells and the floor is saved", !!after, "timber=" + (after && after.timber) + " cash=" + (after && after.cash));
  check("the floor status says it is selling above the floor", /selling/.test(await text(page, "#sell-floor-now")), await text(page, "#sell-floor-now"));
  await ensureScreenshot(page, "sell-floor-upgrades.png");
  await context.close();

  const buy = seedBase({ tutorial: 99, research: 1000, nodes: { mkt2: true }, auto: { sell: true } });
  ({ context, page } = await newPage(browser, { seed: buy, viewport: { width: 1280, height: 900 }, label: "floor-buy" }));
  await sleep(300);
  await page.click("#tab-upgrades");
  check("the floor control stays hidden until Price Floors is researched", await page.$eval("#sell-floor", (n) => n.hidden));
  await page.click("#tab-research");
  await page.click('#list-research .card:has-text("Price Floors") .card-btn');
  const researched = await waitSave(page, (sv) => sv.nodes && sv.nodes.mkt5, 9000);
  check("Price Floors can be researched", !!researched);
  await page.click("#tab-upgrades");
  await sleep(250);
  check("the floor control appears after research", !(await page.$eval("#sell-floor", (n) => n.hidden)));
  await context.close();
}

async function scenarioAutoProduction(browser) {
  const viewport = { width: 1280, height: 900 };
  const base = { replants: 1, cash: 0, timber: 1000, tutorial: 99 };

  let { context, page } = await newPage(browser, {
    seed: seedBase({ ...base, autoProd: true, prod: { queue: 300, warehouses: 0, factories: 0, nextLine: 1, lines: [] } }),
    viewport,
    label: "autoprod-full"
  });
  const overflowSold = await waitSave(page, (sv) => sv.prod && sv.prod.overflow > 0 && sv.timber < 1, 9000);
  check(
    "with production full, the overflow is sold",
    !!overflowSold && Math.abs(overflowSold.prod.overflow - 1000) < 1e-6 && overflowSold.cash > 0 && overflowSold.prod.queue === 300,
    "overflow=" + (overflowSold && overflowSold.prod.overflow) + " cash=" + (overflowSold && overflowSold.cash)
  );
  await context.close();

  ({ context, page } = await newPage(browser, {
    seed: seedBase({ ...base, autoProd: true, prod: { queue: 0, warehouses: 0, factories: 0, nextLine: 1, lines: [] } }),
    viewport,
    label: "autoprod-room"
  }));
  const split = await waitSave(page, (sv) => sv.prod && sv.prod.overflow > 0 && sv.timber < 1, 9000);
  check(
    "with room, production takes what fits and the rest is sold",
    !!split && Math.abs(split.prod.queue - 300) < 1e-6 && Math.abs(split.prod.overflow - 700) < 1e-6,
    "queue=" + (split && split.prod.queue) + " overflow=" + (split && split.prod.overflow)
  );
  await context.close();

  ({ context, page } = await newPage(browser, {
    seed: seedBase({
      ...base,
      autoProd: true,
      nodes: { mkt2: true, mkt5: true },
      auto: { sell: true },
      autoSellMin: 1.2,
      market: { price: 1, hist: [1] },
      prod: { queue: 0, warehouses: 0, factories: 0, nextLine: 1, lines: [] }
    }),
    viewport,
    label: "autoprod-floor"
  }));
  const startedAt = Date.now();
  const held = await waitSave(page, (sv) => sv.savedAt > startedAt + 4500, 12000);
  check(
    "a closed floor holds the overflow while production still fills",
    !!held && Math.abs(held.prod.queue - 300) < 1e-6 && Math.abs(held.timber - 700) < 1e-6 && held.prod.overflow === 0 && held.cash === 0,
    "queue=" + (held && held.prod.queue) + " timber=" + (held && held.timber) + " cash=" + (held && held.cash)
  );
  await context.close();

  ({ context, page } = await newPage(browser, {
    seed: seedBase({ ...base, prod: { queue: 0, warehouses: 0, factories: 0, nextLine: 1, lines: [] } }),
    viewport,
    label: "autoprod-manual"
  }));
  await sleep(300);
  check("the main tab offers a send to production choice", !(await page.$eval("#route-group", (n) => n.hidden)));
  await page.click("#btn-send-prod");
  const manual = await waitSave(page, (sv) => sv.prod && sv.prod.queue > 0, 9000);
  check("the main-tab send moves timber into production", !!manual && Math.abs(manual.timber - 700) < 1e-6 && Math.abs(manual.prod.queue - 300) < 1e-6);
  await page.click("#btn-autoprod");
  const toggled = await waitSave(page, (sv) => sv.autoProd === true, 9000);
  check("the auto overflow toggle saves on", !!toggled);
  check("the main tab shows the sent and sold split", (await text(page, "#route-status")).includes("To production: 300"), await text(page, "#route-status"));
  await ensureScreenshot(page, "auto-production-main.png");
  await context.close();

  ({ context, page } = await newPage(browser, { seed: seedBase({ timber: 500, tutorial: 99 }), viewport, label: "autoprod-locked" }));
  await sleep(300);
  check("the send choice stays hidden before the first replant", await page.$eval("#route-group", (n) => n.hidden));
  await context.close();
}

async function scenarioProductionMobile(browser) {
  for (const vp of MOBILE_VIEWPORTS) {
    const { context, page } = await newPage(browser, { seed: productionSeed(), viewport: { width: vp.width, height: vp.height }, label: "prod-" + vp.name });
    await sleep(500);
    const mainReport = await layoutReport(page);
    check("[production " + vp.name + "] main-tab send controls fit with 44px targets", mainReport.overflow <= 1 && mainReport.small.length === 0, mainReport.small.length ? "small: " + mainReport.small.slice(0, 4).map((t) => t.label + " " + t.w + "x" + t.h).join("; ") : "overflow=" + mainReport.overflow);
    await page.click("#tab-production");
    await sleep(300);
    const report = await layoutReport(page);
    check("[production " + vp.name + "] no horizontal overflow", report.overflow <= 1, "overflow=" + report.overflow + "px");
    check("[production " + vp.name + "] tap targets are at least 44px", report.small.length === 0, report.small.length ? "small: " + report.small.slice(0, 6).map((t) => t.label + " " + t.w + "x" + t.h).join("; ") : "all ok");
    const lastStep = await page.evaluate(() => {
      const btns = document.querySelectorAll("#prod-lines .flow-add");
      const b = btns[btns.length - 1];
      if (!b) return false;
      b.scrollIntoView({ block: "center" });
      const r = b.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= window.innerHeight + 1;
    });
    check("[production " + vp.name + "] the last line stage can be reached by scrolling", lastStep);
    await ensureScreenshot(page, "production-" + vp.name + ".png");
    await context.close();
  }
}

async function waitFor(pred, timeout) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await pred()) return true;
    await sleep(150);
  }
  return false;
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

async function scenarioBiodiversity(browser) {
  const bioSeed = (overrides) => seedBase(Object.assign({ tutorial: 99, zone: 0, bio: { sapling: 50, pine: 20 } }, overrides || {}));

  const { context, page } = await newPage(browser, { seed: bioSeed({ replants: 1 }), label: "bio-meter" });
  await sleep(300);
  await page.click("#tab-replant");
  await sleep(300);
  const rows = await page.$$eval("#bio-list .bio-row", (n) => n.map((r) => ({ name: r.querySelector(".bio-name").textContent, value: r.querySelector(".bio-value").textContent })));
  check("the meter lists every zone", rows.length === 6, "rows=" + rows.length);
  check("the meter shows the zone's score", rows[0].name === "Sapling Hill" && rows[0].value === "50 / 100", JSON.stringify(rows[0]));
  check("the meter marks the current zone", (await page.$$eval("#bio-list .bio-row.here", (n) => n.length)) === 1);
  await ensureScreenshot(page, "biodiversity-meter.png");
  await context.close();

  const ratio = await (async () => {
    const { context: rc, page: rp } = await newPage(browser, { seed: bioSeed({}), label: "bio-ratio" });
    await sleep(200);
    const r = await rp.evaluate(() => {
      const mk = (bio) =>
        LJ.Engine.stats(LJ.Engine.normalize({ v: 1, zone: 0, bio, machines: { crew: 10 }, runUnlocked: { crew: true } }, Date.now())).machineMult;
      return mk({ sapling: 100 }) / mk({});
    });
    await rc.close();
    return r;
  })();
  check("a full meter in this zone adds 50% to machine output", Math.abs(ratio - 1.5) < 1e-9, "ratio=" + ratio);

  const { context: rc2, page: rp2 } = await newPage(browser, {
    seed: bioSeed({ runTimber: 1e7, lifetimeTimber: 1e7, bio: {} }),
    label: "bio-replant"
  });
  await sleep(300);
  await rp2.click("#tab-replant");
  await rp2.click("#rp-btn");
  await rp2.click("#modal-root .modal-foot .btn.primary");
  const replanted = await waitSave(rp2, (s) => s.replants === 1, 6000);
  check("a replant adds biodiversity in the zone it was done in", !!replanted && replanted.bio.taiga === 15, replanted ? JSON.stringify(replanted.bio) : "no save");
  await rc2.close();

  const { context: fc, page: fp } = await newPage(browser, {
    seed: bioSeed({ tool: 0, bio: { sapling: 10 } }), label: "bio-fell"
  });
  await sleep(300);
  await chop(fp, 40);
  const felled = await waitSave(fp, (s) => s.trees >= 2, 8000);
  check("felling trees costs a little biodiversity", !!felled && felled.bio.sapling < 10 && felled.bio.sapling > 0, felled ? JSON.stringify(felled.bio) + " trees=" + felled.trees : "no save");
  await fc.close();

  const { context: mc, page: mp } = await newPage(browser, {
    seed: bioSeed({ replants: 1 }), viewport: { width: 360, height: 740 }, touch: true, label: "bio-mobile"
  });
  await sleep(300);
  await mp.tap("#tab-replant");
  await sleep(300);
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const tracks = await mp.$$eval("#bio-list .bio-track", (n) => n.map((t) => t.getBoundingClientRect().width));
  check("360px: biodiversity meter fits with no horizontal overflow", overflow <= 1 && tracks.every((w) => w > 20), "overflow=" + overflow + " tracks=" + tracks.map(Math.round).join(","));
  await mc.close();
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
    ["mobile-layout", scenarioMobileLayout],
    ["touch", scenarioTouch],
    ["visuals", scenarioVisuals],
    ["features", scenarioFeatures],
    ["production", scenarioProduction],
    ["production-mobile", scenarioProductionMobile],
    ["sell-floor", scenarioSellFloor],
    ["auto-production", scenarioAutoProduction],
    ["tablet", scenarioTablet],
    ["biodiversity", scenarioBiodiversity]
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
