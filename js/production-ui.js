var LJ = globalThis.LJ || (globalThis.LJ = {});

LJ.ProductionUI = (function () {
  const P = LJ.Production;
  const E = LJ.Engine;
  const D = LJ.DATA.production;
  const U = LJ.util;
  const $ = (id) => document.getElementById(id);
  let ctx = null;
  let pick = [];
  let linesKey = "";

  function setText(node, text) {
    if (node && node.textContent !== text) node.textContent = text;
  }

  function create(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function lineKey(line) {
    return line.id + ":" + line.stages.join(",") + ":" + line.stations.join(",");
  }

  function confirmScrap(id) {
    ctx.openModal({
      title: "Scrap line " + id + "?",
      body: "Scrapping removes the line and its stations. Nothing is refunded, but the slot frees up for a new line.",
      actions: [
        { label: "Keep line", ghost: true },
        {
          label: "Scrap line",
          danger: true,
          onClick: () => {
            P.scrapLine(ctx.state(), id);
            ctx.refresh();
          }
        }
      ]
    });
  }

  function buildLineCard(line) {
    const card = create("article", "prod-line");
    card.dataset.line = String(line.id);
    const head = create("header", "prod-line-head");
    head.append(create("span", "prod-line-name", "Line " + line.id), create("span", "prod-line-rate"));
    const scrap = create("button", "btn ghost prod-scrap", "Scrap line");
    scrap.type = "button";
    scrap.addEventListener("click", () => confirmScrap(line.id));
    head.append(scrap);
    const flow = create("div", "flow");
    line.stages.forEach((sid, i) => {
      if (i > 0) flow.append(create("span", "flow-arrow", "→"));
      const def = P.stageById[sid];
      const step = create("div", "flow-step");
      const top = create("div", "flow-top");
      top.append(create("span", "flow-icon", def.icon), create("span", "flow-name", def.name));
      const add = create("button", "card-btn flow-add");
      add.type = "button";
      add.addEventListener("click", () => {
        const s = ctx.state();
        if (P.buyStation(s, line.id, i)) ctx.refresh();
      });
      step.append(top, create("span", "flow-tag"), create("span", "flow-meta"), add);
      flow.append(step);
    });
    card.append(head, flow, create("p", "prod-line-foot"));
    return card;
  }

  function updateLine(card, line, s, price) {
    const lr = P.lineRate(line, s.zone);
    const income = lr.rate * P.lineValue(line) * price;
    setText(card.querySelector(".prod-line-rate"), U.fmt(lr.rate) + "/s · " + U.money(income) + "/s");
    setText(card.querySelector(".prod-line-foot"), U.fmt(Math.floor(line.done)) + " processed · " + U.money(line.earned) + " earned");
    const steps = card.querySelectorAll(".flow-step");
    steps.forEach((step, i) => {
      const def = P.stageById[line.stages[i]];
      const n = line.stations[i];
      const bottleneck = i === lr.bottleneck;
      step.classList.toggle("is-bottleneck", bottleneck);
      setText(step.querySelector(".flow-tag"), bottleneck ? "Bottleneck" : "");
      setText(step.querySelector(".flow-meta"), "Stations ×" + n + " · " + U.fmt(def.rate * P.tierRate(s.zone) * n) + "/s");
      const btn = step.querySelector(".flow-add");
      const maxed = n >= D.maxStations;
      const cost = P.stationCost(line, i, s.zone);
      setText(btn, maxed ? "Max stations" : "+1 station · " + U.money(cost));
      btn.disabled = maxed || s.cash < cost;
    });
  }

  function renderLines(s, price) {
    const box = $("prod-lines");
    const lines = s.prod.lines;
    const key = lines.map(lineKey).join("|");
    if (key !== linesKey) {
      linesKey = key;
      box.textContent = "";
      lines.forEach((line) => box.append(buildLineCard(line)));
    }
    lines.forEach((line, idx) => updateLine(box.children[idx], line, s, price));
    $("prod-empty").hidden = lines.length > 0;
  }

  function renderSummary(s, sum) {
    const room = Math.max(0, sum.capacity - s.prod.queue);
    setText($("pr-queue"), U.fmt(Math.floor(s.prod.queue)) + " / " + U.fmt(sum.capacity));
    $("pr-cap-bar").style.width = U.clamp((s.prod.queue / sum.capacity) * 100, 0, 100).toFixed(1) + "%";
    setText($("pr-room"), room >= 1 ? "Room for " + U.fmt(Math.floor(room)) + " more" : "Queue full. Build a warehouse.");
    setText($("pr-throughput"), U.fmt(sum.throughput) + "/s");
    setText($("pr-income"), U.money(sum.income) + "/s");
    setText($("pr-slots"), sum.lines + " / " + sum.slots);
    setText($("pr-sent"), U.fmt(Math.floor(s.prod.sent)));
    setText($("pr-overflow"), U.fmt(Math.floor(s.prod.overflow)) + " · " + U.money(s.prod.overflowCash));
    const canSend = s.timber >= 1 && room >= 1;
    $("pr-send-quarter").disabled = !canSend;
    $("pr-send-half").disabled = !canSend;
    $("pr-send-all").disabled = !canSend;
  }

  function renderBuys(s, sum) {
    const wc = P.warehouseCost(s);
    setText($("pb-wh-name"), D.warehouse.name + " ×" + U.fmt(s.prod.warehouses));
    setText($("pb-wh-desc"), D.warehouse.blurb);
    setText($("pb-wh-meta"), "Queue " + U.fmt(sum.capacity) + " → " + U.fmt(sum.capacity + D.warehouse.capacity));
    setText($("pb-wh-btn"), "Buy · " + U.money(wc));
    $("pb-wh-btn").disabled = s.cash < wc;

    const fc = P.factoryCost(s);
    setText($("pb-fa-name"), D.factory.name + " ×" + U.fmt(s.prod.factories));
    setText($("pb-fa-desc"), D.factory.blurb);
    setText($("pb-fa-meta"), "Line slots " + sum.slots + " → " + (sum.slots + 1));
    setText($("pb-fa-btn"), "Buy · " + U.money(fc));
    $("pb-fa-btn").disabled = s.cash < fc;
  }

  function orderedPick() {
    return D.stages.map((st) => st.id).filter((id) => pick.includes(id));
  }

  function renderBuild(s, sum) {
    for (const b of document.querySelectorAll("#pb-chips .chip-btn")) {
      b.setAttribute("aria-pressed", String(pick.includes(b.dataset.stage)));
    }
    const ids = orderedPick();
    const full = sum.lines >= sum.slots;
    const cost = P.buildLineCost(ids, s.zone);
    let info;
    if (!ids.length) info = "Pick at least one stage. Stages run in the order shown.";
    else if (full) info = "No free line slot. Buy a factory for another.";
    else info = "Cost " + U.money(cost) + " · " + ids.map((id) => P.stageById[id].name).join(" → ");
    setText($("pb-info"), info);
    $("pb-build").disabled = !ids.length || full || s.cash < cost;
  }

  function render(s, st) {
    const sum = P.summary(s, st.price);
    renderSummary(s, sum);
    renderBuys(s, sum);
    renderLines(s, st.price);
    renderBuild(s, sum);
  }

  function renderRouting(s, st) {
    const group = $("route-group");
    group.hidden = !E.prodUnlocked(s);
    if (group.hidden) return;
    const sum = P.summary(s, st.price);
    const room = Math.max(0, sum.capacity - s.prod.queue);
    $("btn-send-prod").disabled = !(s.timber >= 1 && room >= 1);
    const b = $("btn-autoprod");
    setText(b, "Auto overflow: " + (s.autoProd ? "on" : "off"));
    b.setAttribute("aria-pressed", String(s.autoProd));
    setText(
      $("route-status"),
      "To production: " +
        U.fmt(Math.floor(s.prod.sent)) +
        " · Sold as overflow: " +
        U.fmt(Math.floor(s.prod.overflow)) +
        " (" +
        U.money(s.prod.overflowCash) +
        ")"
    );
  }

  function bind() {
    const sends = { "pr-send-quarter": 0.25, "pr-send-half": 0.5, "pr-send-all": 1 };
    for (const [id, frac] of Object.entries(sends)) {
      $(id).addEventListener("click", () => {
        const s = ctx.state();
        P.send(s, frac >= 1 ? s.timber : Math.floor(s.timber * frac));
        ctx.refresh();
      });
    }
    $("pb-wh-btn").addEventListener("click", () => {
      if (P.buyWarehouse(ctx.state())) ctx.refresh();
    });
    $("pb-fa-btn").addEventListener("click", () => {
      if (P.buyFactory(ctx.state())) ctx.refresh();
    });
    for (const b of document.querySelectorAll("#pb-chips .chip-btn")) {
      b.addEventListener("click", () => {
        const id = b.dataset.stage;
        pick = pick.includes(id) ? pick.filter((x) => x !== id) : pick.concat(id);
        ctx.refresh();
      });
    }
    $("pb-build").addEventListener("click", () => {
      const ids = orderedPick();
      if (P.buildLine(ctx.state(), ids)) {
        pick = [];
        ctx.toast({ icon: "🏭", title: "Line built", text: ids.map((id) => P.stageById[id].name).join(" → ") + " is running." });
        ctx.refresh();
      }
    });
  }

  function bindRouting() {
    $("btn-send-prod").addEventListener("click", () => {
      if (E.sendAllToProduction(ctx.state())) ctx.refresh();
    });
    $("btn-autoprod").addEventListener("click", () => {
      if (E.toggleAutoProd(ctx.state())) ctx.refresh();
    });
  }

  function init(game, c) {
    ctx = Object.assign({ state: () => game.s }, c);
    bind();
    bindRouting();
  }

  return { init, render, renderRouting };
})();
