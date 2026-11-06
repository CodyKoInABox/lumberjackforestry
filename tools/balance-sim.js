"use strict";
// Headless balance sim for Timberline. Loads js/data.js, util.js and engine.js via vm
// and drives the public Engine API with three scripted player profiles.
//
// usage: node tools/balance-sim.js [gameJsDir] [--timeline=fast|average|slow]
// env:   SEEDS (default 12), MAX_HOURS (default 40)
//
// Times are wall-clock game hours; "active-play" counts only seconds the player is at the keyboard.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const args = process.argv.slice(2);
const gameDir = path.resolve(args.find((a) => !a.startsWith("--")) || path.join(__dirname, "..", "js"));
const timelineArg = args.find((a) => a.startsWith("--timeline="));
const TIMELINE = timelineArg ? timelineArg.split("=")[1] : null;
const SEEDS = Number(process.env.SEEDS || 12);
const MAX_HOURS = Number(process.env.MAX_HOURS || 40);

function loadGame(dir) {
  globalThis.LJ = {};
  for (const f of ["data.js", "util.js", "engine.js"]) {
    vm.runInThisContext(fs.readFileSync(path.join(dir, f), "utf8"), { filename: f });
  }
  return globalThis.LJ;
}

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// cps: manual taps per second while active. active/away: session lengths in s (away=0 means always on).
// cadence: seconds between decision passes while active.
const PROFILES = {
  fast: { label: "Fast clicker", cps: 5, cadence: 5, active: Infinity, away: 0 },
  average: { label: "Average idle", cps: 1, cadence: 15, active: 1200, away: 2400 },
  slow: { label: "Slow player", cps: 0.3, cadence: 30, active: 600, away: 3000 }
};

function simulate(L, profile, seed) {
  const E = L.Engine;
  const D = L.DATA;
  Math.random = mulberry32(seed);

  const s = E.createState(0);
  const ms = {};
  let t = 0;
  let replants = 0;
  let clickAcc = 0;
  const cap = MAX_HOURS * 3600;
  const totalNodes = D.research.length;
  const effCps = profile.away ? (profile.cps * profile.active) / (profile.active + profile.away) : profile.cps;
  const timeline = [];
    let nextSnap = 1800;

  let act = 0;
  const msA = {};
  const mark = (k) => {
    if (ms[k] === undefined) {
      ms[k] = t;
      msA[k] = act;
    }
  };

  function checkMilestones() {
    for (let k = 1; k < D.zones.length; k++) if (s.zone >= k) mark("zone" + k);
    for (let i = 1; i < D.tools.length; i++) if (s.tool >= i) mark("tool:" + D.tools[i].id);
    for (const m of D.machines) {
      if (s.runUnlocked[m.id]) mark("unlock:" + m.id);
      if (s.machines[m.id] > 0) mark("hire:" + m.id);
    }
    const n = Object.keys(s.nodes).length;
    if (n >= 1) mark("research1");
    if (n >= totalNodes / 2) mark("research50pct");
    if (n >= totalNodes) mark("tree_done");
    if (s.nodes.aut1) mark("node:aut1");
    if (s.nodes.mkt2) mark("node:mkt2");
    if (s.auto.sell) mark("auto_sell");
    if (s.auto.buy) mark("auto_buy");
    for (const m of D.sawmill) if (s.mill[m.id]) mark("mill:" + m.id);
    for (const m of D.machines) if (s.overhauls[m.id] >= 1) mark("overhaul1:" + m.id);
    if (full()) mark("full");
  }

  function bestPurchase(st) {
    let best = null;
    const consider = (roi, act) => {
      if (roi > 0 && (!best || roi > best.roi)) best = { roi, act };
    };
    const hitsPerSec = effCps + st.autoHits;
    const nextTool = D.tools[s.tool + 1];
    if (nextTool && s.cash >= nextTool.cost) {
      const dmgPerTap = st.clickDmg / st.tool.power;
      const dPow = (nextTool.power - st.tool.power) * dmgPerTap;
      const avgCrit = 1 + st.critChance * (st.critMult - 1);
      const dCash = hitsPerSec * dPow * st.gm * avgCrit * st.price;
      consider(dCash / nextTool.cost, { kind: "tool" });
    }
    for (const m of D.machines) {
      if (!s.runUnlocked[m.id]) continue;
      const cost = E.costFor(s, m, 1);
      if (cost > s.cash) continue;
      const boost = m.id === "crew" && s.nodes.crw1 ? 1.2 : 1;
      const dCash = m.rate * boost * Math.pow(2, s.overhauls[m.id] || 0) * st.machineMult * st.price;
      consider(dCash / cost, { kind: "hire", id: m.id });
    }
    for (const m of D.machines) {
      if (!E.canOverhaul(s, m.id)) continue;
      const cost = E.overhaulCost(m, s.overhauls[m.id] || 0);
      if (cost > s.cash) continue;
      consider((st.rates[m.id] || 0) * st.price / cost, { kind: "overhaul", id: m.id });
    }
    const nextMill = D.sawmill.find((m) => !s.mill[m.id]);
    if (nextMill && s.cash >= nextMill.cost) {
      const dCash = st.total * s.market.price * nextMill.price;
      consider(dCash / nextMill.cost, { kind: "mill", id: nextMill.id });
    }
    return best;
  }

  function decide() {
    const st0 = E.stats(s);
    for (const [key, node] of [["sell", "mkt2"], ["fell", "aut1"], ["buy", "aut2"]]) {
      if (s.nodes[node] && !s.auto[key]) E.toggleAuto(s, key);
    }
    if (!E.autoOn(s, "sell") && s.timber > 0) E.sell(s, st0, false);

    for (;;) {
      let pick = null;
      for (const n of D.research) if (E.canResearch(s, n) && (!pick || n.cost < pick.cost)) pick = n;
      if (!pick) break;
      E.research(s, pick.id);
    }

    if (E.canReplant(s)) {
      E.replant(s, 0);
      replants++;
      mark("first_replant");
      if (replants === 3) mark("replant3");
    }

    for (let guard = 0; guard < 2000; guard++) {
      const b = bestPurchase(E.stats(s));
      if (!b) break;
      const a = b.act;
      if (a.kind === "tool") E.buyTool(s);
      else if (a.kind === "hire") E.hire(s, a.id, 1);
      else if (a.kind === "overhaul") E.overhaul(s, a.id);
      else E.buyMill(s, a.id);
    }
  }

  function step(sec) {
    const st = E.stats(s);
    clickAcc += profile.cps * sec;
    const clicks = Math.floor(clickAcc);
    clickAcc -= clicks;
    for (let i = 0; i < clicks; i++) E.hit(s, st, false);
    E.tick(s, sec);
    E.drain();
    t += sec;
    act += sec;
  }

  function snapshot() {
    const st = E.stats(s);
    timeline.push({
      h: +(t / 3600).toFixed(2),
      zone: s.zone,
      runTimber: s.runTimber,
      cashPerSec: +(st.total * st.price).toExponential(2),
      tool: D.tools[s.tool].id,
      machines: Object.values(s.machines).reduce((a, b) => a + b, 0),
      researchEarned: +s.researchEarned.toFixed(1),
      trees: s.trees,
      clicks: s.clicks,
      nodes: Object.keys(s.nodes).length,
      autoFell: !!s.auto.fell,
      replants
    });
  }

  function full() {
    return ms.tree_done !== undefined && ms.zone5 !== undefined &&
      ms["tool:laser-saw"] !== undefined && ms["unlock:titan"] !== undefined;
  }

  while (t < cap && ms.full === undefined) {
    if (profile.away) {
      const activeEnd = t + profile.active;
      while (t < Math.min(activeEnd, cap)) {
        step(1);
        checkMilestones();
        if (t >= nextSnap) { snapshot(); nextSnap += 1800; }
        if (Math.round(t) % profile.cadence === 0) decide();
      }
      if (t >= cap) break;
      const awayLen = profile.away;
      for (let c = 0; c < awayLen; c += 60) {
        t += 60;
        E.offline(s, 60);
        checkMilestones();
      }
      decide();
      if (t >= nextSnap) { snapshot(); nextSnap += 1800; }
    } else {
      step(1);
      checkMilestones();
      if (t >= nextSnap) { snapshot(); nextSnap += 1800; }
      if (Math.round(t) % profile.cadence === 0) decide();
    }
  }
  checkMilestones();
  decide();
  checkMilestones();
  return { ms, msA, timeline };
}

function median(xs) {
  const v = xs.filter((x) => x !== undefined).sort((a, b) => a - b);
  if (!v.length) return undefined;
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

function main() {
  const L = loadGame(gameDir);
  const D = L.DATA;
  const keys = [
    "first_replant",
    "replant3",
    "zone1", "zone2", "zone3", "zone4", "zone5",
    ...D.tools.slice(1).map((t) => "tool:" + t.id),
    ...D.machines.map((m) => "unlock:" + m.id),
    "research1",
    "research50pct",
    ...D.sawmill.map((m) => "mill:" + m.id),
    "overhaul1:crew",
    "overhaul1:harvester",
    "overhaul1:processor",
    "tree_done",
    "full"
  ];
  const out = {};
  for (const [pk, p] of Object.entries(PROFILES)) {
    const runs = [];
    for (let seed = 1; seed <= SEEDS; seed++) runs.push(simulate(L, p, seed * 7919 + 17));
    const row = {};
    for (const k of keys) {
      const vals = runs.map((r) => r.ms[k]);
      const valsA = runs.map((r) => r.msA[k]);
      const reached = vals.filter((v) => v !== undefined).length;
      row[k] = { med: median(vals), medA: median(valsA), reached };
    }
    out[pk] = row;
    if (TIMELINE === pk) {
      console.log(JSON.stringify(runs[0].timeline, null, 0).replace(/\},\{/g, "},\n{"));
    }
  }
  const fmtH = (sec) => (sec === undefined ? "never" : (sec / 3600).toFixed(2) + "h");
  console.log("milestone".padEnd(28) + Object.keys(PROFILES).map((k) => k.padStart(14)).join(""));
  for (const k of keys) {
    const cells = Object.keys(PROFILES).map((pk) => {
      const c = out[pk][k];
      return (c.med === undefined ? "never" : fmtH(c.med)) + (c.reached < SEEDS ? "(" + c.reached + "/" + SEEDS + ")" : "");
    });
    console.log(k.padEnd(28) + cells.map((c) => c.padStart(14)).join(""));
  }
  for (const pk of Object.keys(PROFILES)) {
    const f = out[pk].full;
    console.log(`active-play to full run (${pk}): ${f.medA === undefined ? "never" : (f.medA / 3600).toFixed(2) + "h"}`);
  }
}

main();
