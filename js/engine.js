var LJ = globalThis.LJ || (globalThis.LJ = {});

LJ.Engine = (function () {
  const D = LJ.DATA;
  const U = LJ.util;
  const SAVE_KEY = "timberline.save.v1";
  const SAVE_VERSION = 1;
  const OFFLINE_CAP = 8 * 3600;
  const OFFLINE_MIN = 60;
  const REPLANT_BASE = 1e7;
  const REPLANT_GROWTH = 2.2;
  const OVERHAUL_MAX = 3;
  const SELL_FLOORS = [0, 0.8, 1, 1.2, 1.5];
  const CREW_COMFORT = 10;
  const MORALE_RECOVER = 0.03;
  const MORALE_DRAIN = 0.003;
  const MORALE_FLOOR_MULT = 0.8;
  const SKILL_XP = [1e4, 1e5, 1e6, 1e7, 1e8];
  const SKILL_STEP = 0.04;
  const bus = [];
  let savesLocked = false;

  const byId = {};
  [D.tools, D.machines, D.zones, D.research, D.events, D.achievements, D.sawmill].forEach((list) =>
    list.forEach((item) => (byId[item.id] = item))
  );

  function emit(type, data) {
    bus.push(Object.assign({ type }, data));
  }

  function drain() {
    return bus.splice(0, bus.length);
  }

  function zoneIndex(runTimber) {
    let idx = 0;
    D.zones.forEach((z, i) => {
      if (runTimber >= z.unlock) idx = i;
    });
    return idx;
  }

  function newTree(s) {
    const idx = zoneIndex(s.runTimber);
    const max = Math.max(1, Math.round(D.zones[idx].hp * U.rand(0.85, 1.15)));
    return { hp: max, max, zone: idx, seed: Math.random() };
  }

  function runDefaults() {
    return {
      timber: 0,
      cash: 0,
      runTimber: 0,
      tool: 0,
      zone: 0,
      machines: {},
      overhauls: {},
      runUnlocked: {},
      mill: {},
      tree: null,
      events: [],
      eventCooldown: 45,
      market: { price: 1, hist: [1] },
      marketTimer: 0,
      autoAcc: 0,
      autoBuyTimer: 0,
      contract: null,
      contractCooldown: 20,
      morale: 100,
      prod: LJ.Production.createRun()
    };
  }

  function createState(now) {
    const s = Object.assign(
      {
        v: SAVE_VERSION,
        savedAt: now,
        research: 0,
        researchEarned: 0,
        lifetimeTimber: 0,
        cashEarned: 0,
        seedlings: 0,
        trees: 0,
        clicks: 0,
        crits: 0,
        machinesHired: 0,
        replants: 0,
        playtime: 0,
        eventsSeen: 0,
        contractsDone: 0,
        bulk: 1,
        sound: true,
        tutorial: 0,
        nodes: {},
        achievements: {},
        auto: { sell: false, fell: false, buy: false },
        autoSellMin: 0,
        autoProd: false,
        crewXp: 0
      },
      runDefaults()
    );
    s.tree = newTree(s);
    return s;
  }

  function sanitizeCounts(raw, ids, max) {
    const out = {};
    if (!raw || typeof raw !== "object") return out;
    for (const id of Object.keys(raw)) {
      const v = raw[id];
      if (ids[id] && Number.isFinite(v) && v > 0) out[id] = Math.min(max, Math.floor(v));
    }
    return out;
  }

  function sanitizeFlags(raw, ids) {
    const out = {};
    if (!raw || typeof raw !== "object") return out;
    for (const id of Object.keys(raw)) if (ids[id] && raw[id]) out[id] = true;
    return out;
  }

  function normalize(raw, now) {
    const s = createState(now);
    if (!raw || typeof raw !== "object") return s;
    for (const k of Object.keys(s)) {
      const v = raw[k];
      if (v === undefined || v === null) continue;
      if (typeof v === typeof s[k] && (typeof v !== "number" || Number.isFinite(v))) s[k] = v;
    }
    const machineIds = {};
    D.machines.forEach((m) => (machineIds[m.id] = true));
    const toolIds = {};
    D.tools.forEach((t, i) => (toolIds[t.id] = i));
    const nodeIds = {};
    D.research.forEach((n) => (nodeIds[n.id] = true));
    const achIds = {};
    D.achievements.forEach((a) => (achIds[a.id] = true));
    const millIds = {};
    D.sawmill.forEach((m) => (millIds[m.id] = true));
    const eventIds = {};
    D.events.forEach((e) => (eventIds[e.id] = true));

    s.machines = sanitizeCounts(raw.machines, machineIds, 1e9);
    s.overhauls = sanitizeCounts(raw.overhauls, machineIds, OVERHAUL_MAX);
    s.runUnlocked = sanitizeFlags(raw.runUnlocked, machineIds);
    s.nodes = sanitizeFlags(raw.nodes, nodeIds);
    s.achievements = sanitizeFlags(raw.achievements, achIds);
    s.mill = sanitizeFlags(raw.mill, millIds);
    s.auto = {
      sell: !!(raw.auto && raw.auto.sell),
      fell: !!(raw.auto && raw.auto.fell),
      buy: !!(raw.auto && raw.auto.buy)
    };
    s.autoSellMin = SELL_FLOORS.includes(Number(raw.autoSellMin)) ? Number(raw.autoSellMin) : 0;
    s.autoProd = !!raw.autoProd;
    s.crewXp = Number.isFinite(raw.crewXp) && raw.crewXp > 0 ? raw.crewXp : 0;
    s.morale = Number.isFinite(raw.morale) ? U.clamp(raw.morale, 0, 100) : 100;
    s.tool = U.clamp(Math.floor(Number(raw.tool) || 0), 0, D.tools.length - 1);
    s.zone = U.clamp(Math.floor(Number(raw.zone) || 0), 0, D.zones.length - 1);
    s.events = Array.isArray(raw.events)
      ? raw.events.filter((e) => e && eventIds[e.id] && e.left > 0).map((e) => ({ id: e.id, left: e.left }))
      : [];
    const mk = raw.market || {};
    s.market = {
      price: U.clamp(Number(mk.price) || 1, 0.45, 2.2),
      hist: Array.isArray(mk.hist) ? mk.hist.filter((x) => Number.isFinite(x)).slice(-40) : [1]
    };
    if (!s.market.hist.length) s.market.hist = [s.market.price];
    s.contract = raw.contract && typeof raw.contract === "object" ? raw.contract : null;
    const t = raw.tree;
    if (t && Number.isFinite(t.hp) && Number.isFinite(t.max) && t.max > 0) {
      s.tree = { hp: t.hp, max: t.max, zone: U.clamp(t.zone | 0, 0, D.zones.length - 1), seed: Math.random() };
    } else {
      s.tree = newTree(s);
    }
    s.bulk = raw.bulk === "max" ? "max" : [1, 10, 100].includes(raw.bulk) ? raw.bulk : 1;
    s.prod = LJ.Production.normalize(raw.prod);
    return s;
  }

  function encodeSave(s) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(s))));
  }

  function decodeSave(text) {
    const json = decodeURIComponent(escape(atob(String(text).trim())));
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object" || parsed.v !== SAVE_VERSION) throw new Error("Not a Timberline save.");
    return parsed;
  }

  function seedMultiplier(s) {
    return 1 + 0.6 * Math.log10(1 + s.seedlings) * (s.nodes.sus4 ? 1.5 : 1);
  }

  function crewSkillLevel(s) {
    return SKILL_XP.filter((t) => s.crewXp >= t).length;
  }

  function crewStats(s) {
    const skill = crewSkillLevel(s);
    const moraleMult = MORALE_FLOOR_MULT + ((1 - MORALE_FLOOR_MULT) * s.morale) / 100;
    const skillMult = 1 + SKILL_STEP * skill;
    return {
      morale: s.morale,
      moraleMult,
      skill,
      skillMult,
      max: SKILL_XP.length,
      xp: s.crewXp,
      next: SKILL_XP[skill] || null,
      crewMult: moraleMult * skillMult
    };
  }

  function stats(s) {
    const n = s.nodes;
    const ev = {};
    s.events.forEach((e) => (ev[e.id] = true));
    const tool = D.tools[s.tool] || D.tools[0];
    const ach = Object.keys(s.achievements).length;
    const seedMult = seedMultiplier(s);
    const gm = seedMult * (n.sus2 ? 1.1 : 1) * (1 + 0.01 * ach);
    const hydro = (n.hyd1 ? 0.15 : 0) + (n.hyd2 ? 0.25 : 0) + (n.hyd3 ? 0.6 : 0) + (n.hyd4 ? 1 : 0);
    const machineMult =
      (1 + hydro) * (n.sus3 ? 1.2 : 1) * gm * (ev.beetle ? 0.75 : 1) * (ev.sunny ? 1.2 : 1);
    const crew = crewStats(s);
    const millBonus = D.sawmill.reduce((acc, m) => acc + (s.mill[m.id] ? m.price : 0), 0);
    const price =
      s.market.price * (1 + (n.mkt1 ? 0.15 : 0) + (n.mkt3 ? 0.4 : 0) + millBonus) * (ev.boom ? 1.6 : 1);
    const rates = {};
    let total = 0;
    for (const m of D.machines) {
      const c = s.machines[m.id] || 0;
      if (!c) {
        rates[m.id] = 0;
        continue;
      }
      const boost = m.id === "crew" ? (n.crw1 ? 1.2 : 1) * crew.crewMult : 1;
      const r = m.rate * c * boost * Math.pow(2, s.overhauls[m.id] || 0) * machineMult;
      rates[m.id] = r;
      total += r;
    }
    const clickDmg = tool.power * (1 + (n.fel1 ? 0.5 : 0) + (n.fel3 ? 1 : 0));
    const critChance = U.clamp(
      0.05 + (n.fel2 ? 0.1 : 0) + (n.fel4 ? 0.1 : 0) + (n.crw2 ? 0.03 : 0) + (ev.lucky ? 0.25 : 0),
      0,
      1
    );
    const critMult = n.fel4 ? 6 : 4;
    const autoHits = s.auto.fell && n.aut1 ? (n.aut3 ? 2 : 1) : 0;
    return {
      tool,
      gm,
      clickDmg,
      critChance,
      critMult,
      machineMult,
      price,
      rates,
      total,
      autoHits,
      events: ev,
      ach,
      millBonus,
      crew
    };
  }

  function addCrewXp(s, g) {
    if (!(g > 0)) return;
    const before = crewSkillLevel(s);
    s.crewXp += g;
    const after = crewSkillLevel(s);
    if (after > before) emit("crewSkill", { level: after, mult: 1 + SKILL_STEP * after });
  }

  function updateMorale(s, dt) {
    const extra = Math.max(0, (s.machines.crew || 0) - CREW_COMFORT);
    s.morale = U.clamp(s.morale + (MORALE_RECOVER - MORALE_DRAIN * extra) * dt, 0, 100);
  }

  function addTimber(s, g) {
    if (!(g > 0)) return;
    s.timber += g;
    s.runTimber += g;
    s.lifetimeTimber += g;
    if (s.contract && s.contract.kind === "deliver") s.contract.progress += g;
  }

  function hit(s, st, auto) {
    const crit = Math.random() < st.critChance;
    const raw = st.clickDmg * (crit ? st.critMult : 1);
    const gain = raw * st.gm;
    addTimber(s, gain);
    if (!auto) {
      s.clicks++;
      if (s.contract && s.contract.kind === "click") s.contract.progress += 1;
    }
    if (crit) s.crits++;
    s.tree.hp -= raw;
    if (auto) emit("hit", { gain, crit });
    if (s.tree.hp <= 0) fell(s);
    return { gain, crit };
  }

  function fell(s) {
    const z = D.zones[s.tree.zone];
    s.trees++;
    s.research += z.research;
    s.researchEarned += z.research;
    emit("fell", { zone: s.tree.zone, research: z.research });
    s.tree = newTree(s);
  }

  function sell(s, st, auto) {
    if (s.timber <= 0) return 0;
    const gain = s.timber * st.price;
    s.timber = 0;
    s.cash += gain;
    s.cashEarned += gain;
    if (!auto) emit("sell", { amount: gain });
    return gain;
  }

  function updateMarket(s) {
    const m = s.market;
    const vol = s.nodes.mkt4 ? 0.5 : 1;
    const drift = ((Math.random() - 0.5) * 0.18 + (1 - m.price) * 0.06) * vol;
    m.price = U.clamp(m.price + drift, 0.45, 2.2);
    m.hist.push(Math.round(m.price * 100) / 100);
    if (m.hist.length > 40) m.hist.shift();
  }

  function costFor(s, m, n) {
    if (n <= 0) return 0;
    const owned = s.machines[m.id] || 0;
    const first = m.cost * Math.pow(m.growth, owned);
    return (first * (Math.pow(m.growth, n) - 1)) / (m.growth - 1);
  }

  function maxAffordable(s, m) {
    const owned = s.machines[m.id] || 0;
    const first = m.cost * Math.pow(m.growth, owned);
    if (s.cash < first) return 0;
    let n = Math.floor(Math.log(1 + (s.cash * (m.growth - 1)) / first) / Math.log(m.growth));
    n = Math.min(n, 1e6);
    while (n > 0 && costFor(s, m, n) > s.cash) n--;
    return Math.max(0, n);
  }

  function hire(s, id, want) {
    const m = byId[id];
    if (!m || !s.runUnlocked[id]) return 0;
    const n = want === "max" ? maxAffordable(s, m) : want;
    if (n <= 0) return 0;
    const cost = costFor(s, m, n);
    if (cost > s.cash) return 0;
    s.cash -= cost;
    s.machines[id] = (s.machines[id] || 0) + n;
    s.machinesHired += n;
    if (s.contract && s.contract.kind === "machines") s.contract.progress += n;
    emit("hire", { id, n, cost });
    return n;
  }

  function overhaulCost(m, level) {
    return m.cost * 12 * Math.pow(6, level);
  }

  function canOverhaul(s, id) {
    const m = byId[id];
    if (!m || !s.runUnlocked[id] || !(s.machines[id] > 0)) return false;
    return (s.overhauls[id] || 0) < OVERHAUL_MAX;
  }

  function overhaul(s, id) {
    if (!canOverhaul(s, id)) return false;
    const m = byId[id];
    const lvl = s.overhauls[id] || 0;
    const cost = overhaulCost(m, lvl);
    if (s.cash < cost) return false;
    s.cash -= cost;
    s.overhauls[id] = lvl + 1;
    emit("overhaul", { id, level: lvl + 1 });
    return true;
  }

  function buyTool(s) {
    const next = s.tool + 1;
    const t = D.tools[next];
    if (!t || s.cash < t.cost) return false;
    s.cash -= t.cost;
    s.tool = next;
    emit("tool", { id: t.id });
    return true;
  }

  function buyMill(s, id) {
    const m = byId[id];
    if (!m || s.mill[id] || s.cash < m.cost) return false;
    s.cash -= m.cost;
    s.mill[id] = true;
    emit("mill", { id });
    return true;
  }

  function canResearch(s, node) {
    if (!node || s.nodes[node.id]) return false;
    if (node.req && !s.nodes[node.req]) return false;
    return s.research >= node.cost;
  }

  function research(s, id) {
    const node = byId[id];
    if (!canResearch(s, node)) return false;
    s.research -= node.cost;
    s.nodes[id] = true;
    emit("research", { id });
    return true;
  }

  const AUTO_NODE = { sell: "mkt2", fell: "aut1", buy: "aut2" };

  function toggleAuto(s, key) {
    if (!AUTO_NODE[key] || !s.nodes[AUTO_NODE[key]]) return false;
    s.auto[key] = !s.auto[key];
    return true;
  }

  function autoOn(s, key) {
    return !!s.auto[key] && !!s.nodes[AUTO_NODE[key]];
  }

  function sellFloorOpen(s, st) {
    return !s.nodes.mkt5 || st.price >= s.autoSellMin;
  }

  function setSellFloor(s, floor) {
    if (!s.nodes.mkt5 || !SELL_FLOORS.includes(floor)) return false;
    s.autoSellMin = floor;
    return true;
  }

  function prodUnlocked(s) {
    return s.replants >= 1;
  }

  function sendAllToProduction(s) {
    if (!prodUnlocked(s)) return 0;
    return LJ.Production.send(s, s.timber);
  }

  function toggleAutoProd(s) {
    if (!prodUnlocked(s)) return false;
    s.autoProd = !s.autoProd;
    return true;
  }

  function routeToProduction(s, st) {
    if (!prodUnlocked(s) || !(s.timber > 0)) return 0;
    LJ.Production.send(s, s.timber);
    if (!(s.timber > 0) || !sellFloorOpen(s, st)) return 0;
    const overflow = s.timber;
    const gain = sell(s, st, true);
    s.prod.overflow += overflow;
    s.prod.overflowCash += gain;
    return gain;
  }

  function replantRequirement(s) {
    return REPLANT_BASE * Math.pow(REPLANT_GROWTH, s.replants);
  }

  function replantGain(s) {
    return Math.max(1, Math.floor(Math.sqrt(s.runTimber / REPLANT_BASE) * (s.nodes.sus1 ? 1.25 : 1)));
  }

  function canReplant(s) {
    return s.runTimber >= replantRequirement(s);
  }

  function replant(s, now) {
    if (!canReplant(s)) return 0;
    const gain = replantGain(s);
    s.seedlings += gain;
    s.replants++;
    Object.assign(s, runDefaults());
    s.tree = newTree(s);
    s.savedAt = now;
    emit("replant", { gain });
    return gain;
  }

  function checkUnlocks(s) {
    for (const m of D.machines) {
      if (!s.runUnlocked[m.id] && s.runTimber >= m.unlock) {
        s.runUnlocked[m.id] = true;
        if (m.unlock > 0) emit("unlock", { id: m.id });
      }
    }
    const z = zoneIndex(s.runTimber);
    if (z !== s.zone) {
      s.zone = z;
      emit("zone", { zone: z });
    }
  }

  function checkAchievements(s) {
    for (const a of D.achievements) {
      if (!s.achievements[a.id] && a.test(s)) {
        s.achievements[a.id] = true;
        emit("achievement", { id: a.id });
      }
    }
  }

  function autoBuy(s, st) {
    let best = null;
    let bestScore = 0;
    for (const m of D.machines) {
      if (!s.runUnlocked[m.id]) continue;
      const cost = costFor(s, m, 1);
      if (cost > s.cash) continue;
      const score = (m.rate * Math.pow(2, s.overhauls[m.id] || 0) * st.machineMult) / cost;
      if (score > bestScore) {
        bestScore = score;
        best = { kind: "hire", id: m.id };
      }
    }
    if (s.nodes.aut4) {
      for (const m of D.machines) {
        if (!canOverhaul(s, m.id)) continue;
        const cost = overhaulCost(byId[m.id], s.overhauls[m.id] || 0);
        if (cost > s.cash) continue;
        const score = (m.rate * Math.pow(2, s.overhauls[m.id] || 0) * st.machineMult) / cost;
        if (score > bestScore) {
          bestScore = score;
          best = { kind: "overhaul", id: m.id };
        }
      }
    }
    if (!best) return;
    if (best.kind === "hire") hire(s, best.id, 1);
    else overhaul(s, best.id);
  }

  function updateEvents(s, dt, st) {
    for (const e of s.events) e.left -= dt;
    s.events = s.events.filter((e) => e.left > 0);
    s.eventCooldown -= dt;
    if (s.eventCooldown > 0) return;
    s.eventCooldown = U.rand(70, 150);
    spawnEvent(s, st);
  }

  function spawnEvent(s, st) {
    const total = D.events.reduce((a, e) => a + e.weight, 0);
    let r = Math.random() * total;
    let pick = D.events[0];
    for (const e of D.events) {
      r -= e.weight;
      if (r <= 0) {
        pick = e;
        break;
      }
    }
    s.eventsSeen++;
    if (pick.instant) {
      const gain = (st.total * 60 + 25) * st.price;
      s.cash += gain;
      s.cashEarned += gain;
      emit("event", { id: pick.id, cash: gain });
      return;
    }
    s.events = s.events.filter((e) => e.id !== pick.id);
    s.events.push({ id: pick.id, left: pick.duration });
    emit("event", { id: pick.id });
  }

  function contractAmount(s, st, tpl) {
    const z = s.zone;
    if (tpl.kind === "deliver") return Math.max(200, Math.round(st.total * 240 * U.rand(0.8, 1.2)));
    if (tpl.kind === "click") return Math.round(30 + s.tool * 12 + z * 10);
    return Math.max(2, Math.round(2 + z * 1.5 + s.trees / 400));
  }

  function contractReward(s, st, c) {
    const bonus = s.nodes.crw4 ? 1.25 : 1;
    const zoneMul = 1 + s.zone;
    const research = 1 + Math.floor(s.zone / 2);
    if (c.kind === "deliver") return { cash: c.target * st.price * 1.5 * bonus, research };
    if (c.kind === "click") return { cash: c.target * 40 * zoneMul * bonus, research };
    return { cash: c.target * 300 * zoneMul * bonus, research };
  }

  function updateContracts(s, dt, st) {
    if (s.contract) {
      const c = s.contract;
      c.left -= dt;
      if (c.progress >= c.target) {
        const r = contractReward(s, st, c);
        s.cash += r.cash;
        s.cashEarned += r.cash;
        s.research += r.research;
        s.researchEarned += r.research;
        s.contractsDone++;
        s.contract = null;
        s.contractCooldown = U.rand(25, 45);
        emit("contract", { title: c.title, cash: r.cash, research: r.research });
      } else if (c.left <= 0) {
        s.contract = null;
        s.contractCooldown = U.rand(40, 70);
        emit("contractFail", { title: c.title });
      }
      return;
    }
    s.contractCooldown -= dt;
    if (s.contractCooldown > 0) return;
    const tpl = U.pick(D.contractTemplates);
    const target = contractAmount(s, st, tpl);
    s.contract = {
      kind: tpl.kind,
      title: tpl.title,
      icon: tpl.icon,
      desc: tpl.desc.replace("{amount}", U.fmt(target)),
      target,
      progress: 0,
      left: tpl.time
    };
  }

  function tick(s, dt) {
    if (!(dt > 0)) return;
    const st = stats(s);
    s.playtime += dt;
    addTimber(s, st.total * dt);
    addCrewXp(s, st.rates.crew * dt);
    updateMorale(s, dt);
    if (st.autoHits) {
      s.autoAcc += st.autoHits * dt;
      while (s.autoAcc >= 1) {
        s.autoAcc -= 1;
        hit(s, st, true);
      }
    }
    if (s.autoProd) routeToProduction(s, st);
    if (autoOn(s, "sell") && s.timber > 0 && sellFloorOpen(s, st)) sell(s, st, true);
    s.marketTimer += dt;
    while (s.marketTimer >= 4) {
      s.marketTimer -= 4;
      updateMarket(s);
    }
    updateEvents(s, dt, st);
    updateContracts(s, dt, st);
    LJ.Production.advance(s, dt, st.price);
    if (autoOn(s, "buy")) {
      s.autoBuyTimer += dt;
      if (s.autoBuyTimer >= 1) {
        s.autoBuyTimer = 0;
        autoBuy(s, st);
      }
    }
    checkUnlocks(s);
    checkAchievements(s);
  }

  function offline(s, seconds) {
    const secs = Math.min(seconds, OFFLINE_CAP);
    if (!(secs >= OFFLINE_MIN)) return null;
    s.events = [];
    const st = stats(s);
    const eff = s.nodes.crw3 ? 0.75 : 0.5;
    const produced = st.total * secs * eff;
    addCrewXp(s, st.rates.crew * secs * eff);
    s.playtime += secs;
    let cash = 0;
    const selling = autoOn(s, "sell") && sellFloorOpen(s, st);
    let kept = selling ? 0 : produced;
    if (s.autoProd && prodUnlocked(s)) {
      const before = s.timber;
      addTimber(s, produced);
      cash += routeToProduction(s, st);
      if (autoOn(s, "sell") && sellFloorOpen(s, st)) cash += sell(s, st, true);
      kept = Math.max(0, s.timber - before);
    } else if (selling) {
      cash = produced * st.price;
      s.cash += cash;
      s.cashEarned += cash;
      s.lifetimeTimber += produced;
      s.runTimber += produced;
    } else {
      addTimber(s, produced);
    }
    const prodBefore = s.cash;
    LJ.Production.advance(s, secs * eff, st.price);
    cash += s.cash - prodBefore;
    checkUnlocks(s);
    checkAchievements(s);
    return { seconds: secs, timber: kept, cash, eff };
  }

  function save(s, now) {
    if (savesLocked) return false;
    s.savedAt = now;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(s));
      return true;
    } catch (e) {
      return false;
    }
  }

  function load(now) {
    let raw = null;
    try {
      raw = localStorage.getItem(SAVE_KEY);
    } catch (e) {
      raw = null;
    }
    if (!raw) return { state: createState(now), away: null, fresh: true };
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      try {
        localStorage.setItem(SAVE_KEY + ".corrupt", raw);
      } catch (err) {}
      return { state: createState(now), away: null, fresh: true, corrupt: true };
    }
    const s = normalize(parsed, now);
    const away = offline(s, (now - (s.savedAt || now)) / 1000);
    return { state: s, away, fresh: false };
  }

  function lockSaves() {
    savesLocked = true;
  }

  function wipe() {
    lockSaves();
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {}
  }

  return {
    createState,
    normalize,
    stats,
    crewSkillLevel,
    seedMultiplier,
    tick,
    hit,
    sell,
    hire,
    costFor,
    maxAffordable,
    overhaulCost,
    canOverhaul,
    overhaul,
    buyTool,
    buyMill,
    canResearch,
    research,
    toggleAuto,
    autoOn,
    sellFloorOpen,
    setSellFloor,
    SELL_FLOORS,
    prodUnlocked,
    sendAllToProduction,
    toggleAutoProd,
    replantGain,
    replantRequirement,
    canReplant,
    replant,
    zoneIndex,
    offline,
    save,
    load,
    lockSaves,
    wipe,
    encodeSave,
    decodeSave,
    drain,
    byId,
    OVERHAUL_MAX
  };
})();
