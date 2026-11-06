var LJ = globalThis.LJ || (globalThis.LJ = {});

LJ.Production = (function () {
  const D = LJ.DATA;
  const P = D.production;
  const U = LJ.util;
  const stageById = {};
  P.stages.forEach((st) => (stageById[st.id] = st));

  function finite(v) {
    return Number.isFinite(v) && v > 0 ? v : 0;
  }

  function tierRate(zone) {
    return Math.pow(P.rateGrowth, zone || 0);
  }

  function tierCost(zone) {
    return Math.pow(P.costGrowth, zone || 0);
  }

  function createRun() {
    return { queue: 0, sent: 0, processed: 0, earned: 0, warehouses: 0, factories: 0, nextLine: 1, lines: [] };
  }

  function capacityFor(warehouses) {
    return P.baseCapacity + warehouses * P.warehouse.capacity;
  }

  function capacity(s) {
    return capacityFor(s.prod.warehouses) * tierRate(s.zone);
  }

  function slots(s) {
    return 1 + s.prod.factories;
  }

  function normalizeLine(raw, id) {
    if (!raw || typeof raw !== "object" || !Array.isArray(raw.stages)) return null;
    const stages = [];
    const stations = [];
    raw.stages.forEach((sid, i) => {
      if (stages.length >= P.maxStages || !stageById[sid]) return;
      const n = Math.floor(Number(Array.isArray(raw.stations) ? raw.stations[i] : 1));
      stages.push(sid);
      stations.push(U.clamp(Number.isFinite(n) ? n : 1, 1, P.maxStations));
    });
    if (!stages.length) return null;
    return { id, stages, stations, done: finite(raw.done), earned: finite(raw.earned) };
  }

  function normalize(raw) {
    const s = createRun();
    if (!raw || typeof raw !== "object") return s;
    s.sent = finite(raw.sent);
    s.processed = finite(raw.processed);
    s.earned = finite(raw.earned);
    s.warehouses = Math.floor(finite(raw.warehouses));
    s.factories = Math.floor(finite(raw.factories));
    s.queue = Math.min(finite(raw.queue), capacityFor(s.warehouses) * Math.pow(P.rateGrowth, LJ.DATA.zones.length - 1));
    let nextLine = Math.max(1, Math.floor(finite(raw.nextLine)));
    const lines = [];
    if (Array.isArray(raw.lines)) {
      for (const l of raw.lines) {
        if (lines.length >= 1 + s.factories) break;
        const line = normalizeLine(l, nextLine);
        if (!line) continue;
        lines.push(line);
        nextLine++;
      }
    }
    s.lines = lines;
    s.nextLine = Math.max(nextLine, lines.length + 1);
    return s;
  }

  function lineRate(line, zone) {
    const t = tierRate(zone);
    let rate = Infinity;
    let bottleneck = 0;
    line.stages.forEach((id, i) => {
      const r = stageById[id].rate * t * line.stations[i];
      if (r < rate) {
        rate = r;
        bottleneck = i;
      }
    });
    return { rate, bottleneck };
  }

  function lineValue(line) {
    return line.stages.reduce((acc, id) => acc * stageById[id].value, 1);
  }

  function stationCost(line, i, zone) {
    return stageById[line.stages[i]].cost * tierCost(zone) * Math.pow(P.stationGrowth, line.stations[i]);
  }

  function buildLineCost(stageIds, zone) {
    return stageIds.reduce((acc, id) => acc + (stageById[id] ? stageById[id].cost : 0), 0) * tierCost(zone);
  }

  function warehouseCost(s) {
    return P.warehouse.cost * tierCost(s.zone) * Math.pow(P.warehouse.growth, s.prod.warehouses);
  }

  function factoryCost(s) {
    return P.factory.cost * tierCost(s.zone) * Math.pow(P.factory.growth, s.prod.factories);
  }

  function advance(s, dt, price) {
    const p = s.prod;
    if (!p || !(dt > 0) || p.queue <= 0 || !p.lines.length) return 0;
    let moved = 0;
    for (const line of p.lines) {
      if (p.queue <= 0) break;
      const take = Math.min(p.queue, lineRate(line, s.zone).rate * dt);
      if (!(take > 0)) continue;
      const gain = take * lineValue(line) * price;
      p.queue -= take;
      line.done += take;
      line.earned += gain;
      p.processed += take;
      p.earned += gain;
      s.cash += gain;
      s.cashEarned += gain;
      moved += take;
    }
    if (p.queue < 1e-6) p.queue = 0;
    return moved;
  }

  function summary(s, price) {
    const p = s.prod;
    let throughput = 0;
    let income = 0;
    for (const line of p.lines) {
      const r = lineRate(line, s.zone).rate;
      throughput += r;
      income += r * lineValue(line) * price;
    }
    return {
      capacity: capacity(s),
      queue: p.queue,
      throughput,
      income,
      slots: slots(s),
      lines: p.lines.length
    };
  }

  function send(s, amount) {
    const p = s.prod;
    const room = Math.max(0, capacity(s) - p.queue);
    const n = Math.min(amount, s.timber, room);
    if (!(n > 0)) return 0;
    s.timber -= n;
    p.queue += n;
    p.sent += n;
    return n;
  }

  function buyWarehouse(s) {
    const cost = warehouseCost(s);
    if (s.cash < cost) return false;
    s.cash -= cost;
    s.prod.warehouses++;
    return true;
  }

  function buyFactory(s) {
    const cost = factoryCost(s);
    if (s.cash < cost) return false;
    s.cash -= cost;
    s.prod.factories++;
    return true;
  }

  function buildLine(s, stageIds) {
    const p = s.prod;
    if (!stageIds.length || stageIds.length > P.maxStages || stageIds.some((id) => !stageById[id])) return false;
    if (p.lines.length >= slots(s)) return false;
    const cost = buildLineCost(stageIds, s.zone);
    if (s.cash < cost) return false;
    s.cash -= cost;
    p.lines.push({ id: p.nextLine++, stages: stageIds.slice(), stations: stageIds.map(() => 1), done: 0, earned: 0 });
    return true;
  }

  function buyStation(s, lineId, i) {
    const line = s.prod.lines.find((l) => l.id === lineId);
    if (!line || !line.stages[i] || line.stations[i] >= P.maxStations) return false;
    const cost = stationCost(line, i, s.zone);
    if (s.cash < cost) return false;
    s.cash -= cost;
    line.stations[i]++;
    return true;
  }

  function scrapLine(s, lineId) {
    const before = s.prod.lines.length;
    s.prod.lines = s.prod.lines.filter((l) => l.id !== lineId);
    return s.prod.lines.length < before;
  }

  return {
    createRun,
    normalize,
    advance,
    summary,
    lineRate,
    lineValue,
    stationCost,
    buildLineCost,
    warehouseCost,
    factoryCost,
    capacity,
    slots,
    tierRate,
    tierCost,
    send,
    buyWarehouse,
    buyFactory,
    buildLine,
    buyStation,
    scrapLine,
    stageById
  };
})();
