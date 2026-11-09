var LJ = globalThis.LJ || (globalThis.LJ = {});

LJ.UI = (function () {
  const D = LJ.DATA;
  const E = LJ.Engine;
  const U = LJ.util;
  const A = LJ.Audio;
  const $ = (id) => document.getElementById(id);

  const TABS = ["tools", "fleet", "upgrades", "research", "replant", "production", "log", "settings"];
  const AUTOS = [
    { key: "sell", node: "mkt2", title: "Auto-Sell", icon: "🧾", desc: "Sells all timber on every tick at the market price." },
    { key: "fell", node: "aut1", title: "Auto-Fell", icon: "🤚", desc: "Your saw swings on its own." },
    { key: "buy", node: "aut2", title: "Auto-Hire", icon: "🤖", desc: "Buys the best value machine each second." }
  ];

  const TUTORIAL = [
    {
      title: "Welcome to Timberline",
      text: "Every swing turns standing trees into timber, and timber into money. Press Next to begin.",
      tab: "tools",
      target: null,
      done: null
    },
    {
      title: "Make some chips",
      text: "Tap the tree or press Space. Five manual taps and you move on.",
      tab: null,
      target: "stage",
      done: (s) => s.clicks >= 5
    },
    {
      title: "Cash in",
      text: "Sell your timber at the market price with Sell all.",
      tab: null,
      target: "sell-btn",
      done: (s) => s.cashEarned > 0
    },
    {
      title: "Sharpen up",
      text: "Buy the Felling Axe in the Gear tab. More damage per tap means faster trees.",
      tab: "tools",
      target: "tab-tools",
      done: (s) => s.tool >= 1
    },
    {
      title: "Build your fleet",
      text: "Hire a Ground Crew in the Fleet tab. Machines earn timber while you do something else.",
      tab: "fleet",
      target: "tab-fleet",
      done: (s) => Object.values(s.machines).some((v) => v > 0)
    },
    {
      title: "The long game",
      text: "Contracts pay bonuses, Research unlocks automation, and Replant resets your run for permanent seedlings. Good luck.",
      tab: null,
      target: null,
      done: null
    }
  ];

  const cache = {};
  let game = null;
  let activeTab = "tools";
  let tutorialStep = -1;
  let hinted = null;

  function el(id) {
    if (!cache[id]) cache[id] = $(id);
    return cache[id];
  }

  function setText(node, text) {
    if (node && node.textContent !== text) node.textContent = text;
  }

  function create(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function buildCard() {
    const card = create("div", "card");
    const icon = create("div", "card-icon");
    const body = create("div", "card-body");
    const name = create("div", "card-name");
    const desc = create("div", "card-desc");
    const meta = create("div", "card-meta");
    const btn = create("button", "card-btn");
    btn.type = "button";
    body.append(name, desc, meta);
    card.append(icon, body, btn);
    card._parts = { icon, name, desc, meta, btn };
    btn.addEventListener("click", () => {
      const it = card._item;
      if (it && it.onClick) it.onClick();
    });
    card.addEventListener("click", (e) => {
      const it = card._item;
      if (!it || !it.onInfo || e.target.closest(".card-btn")) return;
      it.onInfo();
    });
    card.addEventListener("keydown", (e) => {
      const it = card._item;
      if (!it || !it.onInfo || e.key !== "Enter" || e.target !== card) return;
      e.preventDefault();
      it.onInfo();
    });
    return card;
  }

  function updateCard(card, it) {
    card._item = it;
    const p = card._parts;
    card.className =
      "card" + (it.state ? " " + it.state : "") + (it.header ? " is-header" : "") + (it.onInfo ? " has-info" : "");
    if (it.onInfo) card.tabIndex = 0;
    else card.removeAttribute("tabindex");
    if (it.header) {
      setText(p.name, it.name);
      p.icon.hidden = true;
      p.desc.hidden = true;
      p.meta.hidden = true;
      p.btn.hidden = true;
      return;
    }
    p.icon.hidden = !it.icon && !it.photo;
    setText(p.icon, it.photo ? "" : it.icon || "");
    p.icon.classList.toggle("has-photo", !!it.photo);
    if (it.photo) {
      if (!p.photo) {
        p.photo = create("img", "card-photo");
        p.photo.alt = "";
        p.photo.decoding = "async";
        p.icon.appendChild(p.photo);
      }
      if (p.photo.getAttribute("src") !== it.photo) p.photo.src = it.photo;
    } else if (p.photo) {
      p.photo.remove();
      p.photo = null;
    }
    setText(p.name, it.name);
    p.desc.hidden = !it.desc;
    setText(p.desc, it.desc || "");
    p.meta.hidden = !it.meta;
    setText(p.meta, it.meta || "");
    p.btn.hidden = !it.btn;
    setText(p.btn, it.btn || "");
    p.btn.disabled = !!it.disabled || !it.onClick;
    p.btn.classList.toggle("is-on", !!it.on);
    p.btn.classList.toggle("is-off", it.on === false);
  }

  function reconcile(container, items) {
    if (!container) return;
    const existing = new Map();
    for (const child of container.children) existing.set(child.dataset.key, child);
    const wanted = new Set();
    items.forEach((it, idx) => {
      wanted.add(it.key);
      let card = existing.get(it.key);
      if (!card) {
        card = buildCard();
        card.dataset.key = it.key;
      }
      updateCard(card, it);
      const current = container.children[idx];
      if (current !== card) container.insertBefore(card, current || null);
    });
    for (const [key, node] of existing) if (!wanted.has(key)) node.remove();
  }

  function switchTab(id) {
    activeTab = id;
    for (const t of TABS) {
      const panel = el("panel-" + t);
      if (panel) panel.hidden = t !== id;
      const btn = el("tab-" + t);
      if (btn) {
        btn.setAttribute("aria-selected", String(t === id));
        btn.classList.toggle("active", t === id);
      }
    }
    refresh();
  }

  function renderTop(s, st) {
    setText(el("res-timber"), U.fmt(s.timber));
    setText(el("rate-timber"), "+" + U.fmt(st.total) + "/s");
    setText(el("res-cash"), U.money(s.cash));
    setText(el("rate-cash"), "Market ×" + st.price.toFixed(2));
    setText(el("res-research"), U.fmt(Math.floor(s.research)));
    const seeds = el("res-seeds-chip");
    seeds.hidden = !(s.seedlings > 0);
    setText(el("res-seeds"), U.fmt(s.seedlings));
    el("btn-sound").setAttribute("aria-pressed", String(!!s.sound));
    setText(el("btn-sound"), s.sound ? "🔊" : "🔇");
  }

  function renderStage(s, st) {
    const z = D.zones[s.zone];
    const next = D.zones[s.zone + 1];
    setText(el("zone-name"), z.name);
    setText(el("zone-sub"), z.blurb);
    setText(
      el("zone-next"),
      next ? "Next terrain: " + next.name + " at " + U.fmt(next.unlock) + " run timber" : "Final terrain unlocked"
    );
    const pct = U.clamp((s.tree.hp / s.tree.max) * 100, 0, 100);
    el("tree-bar-fill").style.width = pct.toFixed(1) + "%";
    setText(el("tree-bar-label"), "Tree " + U.fmt(Math.max(0, Math.ceil(s.tree.hp))) + " / " + U.fmt(s.tree.max));
    const crit = Math.round(st.critChance * 100);
    setText(
      el("click-info"),
      "Tap " + U.fmt(st.clickDmg * st.gm) + " · Crit " + crit + "% ×" + st.critMult
    );
    const sellValue = s.timber * st.price;
    setText(el("sell-btn-label"), "Sell all · " + U.money(sellValue));
    el("sell-btn").disabled = s.timber < 1;
    const hist = s.market.hist;
    const last = hist[hist.length - 1];
    const prev = hist.length > 1 ? hist[hist.length - 2] : last;
    setText(el("market-arrow"), last > prev ? "▲" : last < prev ? "▼" : "■");
    el("market-arrow").className = "market-arrow " + (last > prev ? "up" : last < prev ? "down" : "flat");
    const pts = hist.length < 2 ? "0,20 100,20" : hist.map((v, i) => {
      const x = (i / (hist.length - 1)) * 100;
      const y = 36 - ((U.clamp(v, 0.45, 2.2) - 0.45) / 1.75) * 32;
      return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
    const line = el("spark-line");
    if (line.getAttribute("points") !== pts) line.setAttribute("points", pts);
    const chip = el("event-chip");
    if (s.events.length) {
      chip.hidden = false;
      setText(
        chip,
        s.events
          .map((e) => {
            const def = E.byId[e.id];
            return def.icon + " " + def.name + " " + Math.ceil(e.left) + "s";
          })
          .join("  ·  ")
      );
    } else {
      chip.hidden = true;
    }
  }

  function renderContract(s) {
    const c = s.contract;
    const card = el("contract-card");
    card.classList.toggle("idle", !c);
    if (!c) {
      setText(el("ct-title"), "No contract on the board");
      setText(el("ct-desc"), "The next job posts in a moment.");
      el("ct-bar").style.width = "0%";
      setText(el("ct-time"), "");
      setText(el("ct-icon"), "📋");
      return;
    }
    setText(el("ct-icon"), c.icon);
    setText(el("ct-title"), c.title);
    setText(el("ct-desc"), c.desc);
    const pct = U.clamp((c.progress / c.target) * 100, 0, 100);
    el("ct-bar").style.width = pct.toFixed(1) + "%";
    setText(el("ct-time"), U.duration(c.left) + " left · " + U.fmt(Math.floor(c.progress)) + " / " + U.fmt(c.target));
  }

  let fleetSignature = "";
  function renderFleetStrip(s, st) {
    const parts = D.machines.map((m) => (s.machines[m.id] || 0) + ":" + (s.overhauls[m.id] || 0));
    const sig = parts.join("|");
    const strip = el("fleet-strip");
    if (sig === fleetSignature) return;
    fleetSignature = sig;
    strip.textContent = "";
    let idx = 0;
    for (const m of D.machines) {
      const n = s.machines[m.id] || 0;
      if (!n) continue;
      const unit = create("div", "unit");
      unit.style.setProperty("--i", String(idx++));
      unit.title = m.name + " ×" + n;
      unit.append(create("span", "unit-icon", m.icon), create("span", "unit-count", "×" + U.fmt(n)));
      strip.appendChild(unit);
    }
    if (!idx) {
      strip.appendChild(create("div", "fleet-empty", "Your fleet is empty. Hire a Ground Crew to get rolling."));
    }
  }

  function renderTools(s) {
    const items = D.tools.map((t, i) => {
      const owned = i <= s.tool;
      const next = i === s.tool + 1;
      const equipped = i === s.tool;
      const state = owned ? "owned" : next ? (s.cash >= t.cost ? "can" : "cant") : "locked";
      return {
        key: "tool-" + t.id,
        icon: t.icon,
        name: t.name,
        desc: t.blurb,
        meta: "Power " + U.fmt(t.power) + " per tap" + (owned ? "" : " · " + U.money(t.cost)),
        state,
        btn: equipped ? "Equipped" : owned ? "Owned" : next ? "Buy " + U.money(t.cost) : "Locked",
        disabled: !next || s.cash < t.cost,
        onClick: next && s.cash >= t.cost ? () => E.buyTool(s) && refresh() : null
      };
    });
    reconcile(el("list-tools"), items);
  }

  function link(label, url) {
    const a = create("a", "", label);
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    return a;
  }

  function creditLine(c) {
    const p = create("p", "machine-credit");
    p.append((c.url ? "Photo: " : "Illustration: ") + c.author + ", ");
    p.append(c.licenceUrl ? link(c.licence, c.licenceUrl) : c.licence);
    if (c.url) {
      p.append(" · ");
      p.append(link("Wikimedia Commons", c.url));
    }
    return p;
  }

  function sourcesLine(list) {
    const p = create("p", "machine-sources", "Sources: ");
    list.forEach((s, i) => {
      if (i) p.append(", ");
      p.append(link(s.label, s.url));
    });
    return p;
  }

  function openMachineInfo(m) {
    const info = (LJ.MachineInfo && LJ.MachineInfo[m.id]) || {};
    const wrap = create("div", "machine-info");
    const figure = create("figure", "machine-photo");
    const img = create("img", "machine-photo-img");
    img.src = m.photo;
    img.alt = m.name;
    img.width = 240;
    img.height = 180;
    figure.appendChild(img);
    if (info.credit) figure.appendChild(creditLine(info.credit));
    wrap.appendChild(figure);
    const rows = [
      ["Maker", info.maker],
      ["Model", info.model],
      ["Type", info.type],
      ["Typical use", info.use],
      ["Weight", info.weight],
      ["Engine power", info.power],
      ["Width or capacity", info.size]
    ];
    const dl = create("dl", "machine-specs");
    for (const [k, v] of rows) if (v) dl.append(create("dt", "", k), create("dd", "", v));
    if (dl.children.length) wrap.appendChild(dl);
    if (info.identified) wrap.appendChild(create("p", "machine-note", "The photo's file page names this model."));
    if (info.note) wrap.appendChild(create("p", "machine-note", info.note));
    if (info.sources && info.sources.length) wrap.appendChild(sourcesLine(info.sources));
    openModal({ title: m.name, body: wrap, actions: [{ label: "Close", primary: true }] });
  }

  function renderFleet(s, st) {
    const items = D.machines.map((m) => {
      if (!s.runUnlocked[m.id]) {
        return {
          key: "m-" + m.id,
          icon: "🔒",
          photo: m.photo,
          name: m.name,
          desc: "Reach " + U.fmt(m.unlock) + " run timber to unlock.",
          state: "locked",
          btn: "Locked",
          disabled: true,
          onInfo: () => openMachineInfo(m)
        };
      }
      const owned = s.machines[m.id] || 0;
      const ov = s.overhauls[m.id] || 0;
      const each = m.rate * Math.pow(2, ov) * st.machineMult;
      const want = s.bulk;
      const max = E.maxAffordable(s, m);
      const n = want === "max" ? Math.max(1, max) : want;
      const cost = E.costFor(s, m, n);
      const affordable = s.cash >= cost && n > 0;
      return {
        key: "m-" + m.id,
        icon: m.icon,
        photo: m.photo,
        name: m.name,
        desc: m.blurb,
        meta:
          "Owned " + U.fmt(owned) + " · " + U.fmt(each) + "/s each · " + U.fmt(st.rates[m.id] || 0) + "/s total · Mk " + U.roman(ov),
        state: owned ? "owned" : affordable ? "can" : "cant",
        btn: "Hire ×" + U.fmt(n) + " · " + U.money(cost),
        disabled: !affordable,
        onClick: affordable
          ? () => {
              if (E.hire(s, m.id, want === "max" ? "max" : want)) refresh();
            }
          : null,
        onInfo: () => openMachineInfo(m)
      };
    });
    reconcile(el("list-fleet"), items);
  }

  function renderUpgrades(s, st) {
    const items = [];
    items.push({ key: "hdr-ov", name: "Overhauls", header: true });
    for (const m of D.machines) {
      if (!s.runUnlocked[m.id] || !(s.machines[m.id] > 0)) continue;
      const lvl = s.overhauls[m.id] || 0;
      if (lvl >= E.OVERHAUL_MAX) {
        items.push({ key: "ov-" + m.id, icon: m.icon, name: m.name, desc: "Fully overhauled. Output ×" + Math.pow(2, lvl) + ".", state: "owned", btn: "Mk " + U.roman(lvl) + " · Maxed", disabled: true });
        continue;
      }
      const cost = E.overhaulCost(m, lvl);
      const can = s.cash >= cost;
      items.push({
        key: "ov-" + m.id,
        icon: m.icon,
        name: m.name,
        desc: "Mk " + U.roman(lvl) + " → Mk " + U.roman(lvl + 1) + ": doubles every unit's output.",
        meta: "Now ×" + Math.pow(2, lvl) + " · next ×" + Math.pow(2, lvl + 1),
        state: can ? "can" : "cant",
        btn: "Overhaul · " + U.money(cost),
        disabled: !can,
        onClick: can ? () => E.overhaul(s, m.id) && refresh() : null
      });
    }
    if (!items.length || items.length === 1) {
      items.push({ key: "ov-none", icon: "🔧", name: "No machines to overhaul yet", desc: "Hire a machine first. Overhauls double its output.", state: "locked" });
    }

    items.push({ key: "hdr-mill", name: "Sawmill & Sales", header: true });
    const nextMill = D.sawmill.find((m) => !s.mill[m.id]);
    for (const m of D.sawmill) {
      const owned = !!s.mill[m.id];
      const next = m === nextMill;
      const can = next && s.cash >= m.cost;
      items.push({
        key: "mill-" + m.id,
        icon: m.icon,
        name: m.name,
        desc: m.blurb,
        state: owned ? "owned" : can ? "can" : next ? "cant" : "locked",
        btn: owned ? "Installed" : "Install · " + U.money(m.cost),
        disabled: !can,
        onClick: can ? () => E.buyMill(s, m.id) && refresh() : null
      });
    }

    items.push({ key: "hdr-auto", name: "Automation", header: true });
    for (const a of AUTOS) {
      const unlocked = !!s.nodes[a.node];
      const on = !!s.auto[a.key];
      let desc = a.desc;
      if (a.key === "fell") desc = "Your saw swings on its own " + (s.nodes.aut3 ? "twice" : "once") + " per second.";
      if (!unlocked) {
        items.push({
          key: "auto-" + a.key,
          icon: "🔒",
          name: a.title,
          desc,
          meta: "Requires " + E.byId[a.node].name + " in Research.",
          state: "locked",
          btn: "Locked",
          disabled: true
        });
        continue;
      }
      items.push({
        key: "auto-" + a.key,
        icon: a.icon,
        name: a.title,
        desc,
        meta: on ? "Running" : "Paused",
        state: on ? "owned" : "can",
        btn: on ? "On" : "Off",
        on,
        disabled: false,
        onClick: () => E.toggleAuto(s, a.key) && refresh()
      });
    }
    reconcile(el("list-upgrades"), items);
    renderSellFloor(s, st);
  }

  function renderSellFloor(s, st) {
    const box = el("sell-floor");
    box.hidden = !s.nodes.mkt5;
    if (box.hidden) return;
    for (const b of box.querySelectorAll("[data-floor]")) {
      const on = Number(b.dataset.floor) === s.autoSellMin;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", String(on));
    }
    setText(el("sell-floor-value"), s.autoSellMin > 0 ? "Floor ×" + s.autoSellMin.toFixed(2) : "Floor: any price");
    const now = "Market ×" + st.price.toFixed(2) + " · ";
    let status;
    if (!E.autoOn(s, "sell")) status = "Turn on Auto-Sell to use the floor.";
    else if (E.sellFloorOpen(s, st)) status = "Above the floor: Auto-Sell is selling.";
    else status = "Below the floor: Auto-Sell is holding timber.";
    setText(el("sell-floor-now"), now + status);
  }

  function renderResearch(s) {
    const items = [];
    for (const b of D.research_branches) {
      items.push({ key: "hdr-" + b.id, name: b.name, header: true });
      for (const n of D.research.filter((x) => x.branch === b.id)) {
        const owned = !!s.nodes[n.id];
        const reqOk = !n.req || !!s.nodes[n.req];
        const can = reqOk && !owned && s.research >= n.cost;
        const state = owned ? "owned" : !reqOk ? "locked" : can ? "can" : "cant";
        items.push({
          key: "rs-" + n.id,
          icon: owned ? "✅" : reqOk ? "🧪" : "🔒",
          name: n.name,
          desc: n.desc,
          meta: owned ? "Researched" : reqOk ? "Cost " + U.fmt(n.cost) + " research" : "Requires " + E.byId[n.req].name,
          state,
          btn: owned ? "Done" : reqOk ? "Research " + U.fmt(n.cost) : "Locked",
          disabled: !can,
          onClick: can ? () => E.research(s, n.id) && refresh() : null
        });
      }
    }
    reconcile(el("list-research"), items);
  }

  function renderReplant(s) {
    const can = E.canReplant(s);
    const gain = E.replantGain(s);
    setText(el("rp-seeds"), U.fmt(s.seedlings));
    setText(el("rp-bonus"), "+" + U.fmt(Math.round((E.seedMultiplier(s) - 1) * 100)) + "% output");
    setText(el("rp-run"), U.fmt(s.runTimber));
    const need = E.replantRequirement(s);
    setText(el("rp-need"), U.fmt(need));
    el("rp-bar").style.width = U.clamp((s.runTimber / need) * 100, 0, 100).toFixed(1) + "%";
    setText(el("rp-gain"), can ? "+" + U.fmt(gain) + " seedlings" : "Unlocks at " + U.fmt(need) + " run timber");
    el("rp-btn").disabled = !can;
    setText(el("rp-btn"), can ? "Replant the forest" : "Not yet");
  }

  function renderLog(s) {
    const items = D.achievements.map((a) => {
      const owned = !!s.achievements[a.id];
      return { key: "ach-" + a.id, icon: a.icon, name: a.name, desc: a.desc, state: owned ? "owned" : "locked", btn: null };
    });
    const count = Object.keys(s.achievements).length;
    setText(el("log-count"), count + " / " + D.achievements.length + " unlocked · +" + count + "% output");
    reconcile(el("list-log"), items);
  }

  function renderSettings(s) {
    const pairs = [
      ["st-lifetime", U.fmt(s.lifetimeTimber)],
      ["st-run", U.fmt(s.runTimber)],
      ["st-cash", U.money(s.cashEarned)],
      ["st-trees", U.fmt(s.trees)],
      ["st-clicks", U.fmt(s.clicks)],
      ["st-crits", U.fmt(s.crits)],
      ["st-hired", U.fmt(s.machinesHired)],
      ["st-contracts", U.fmt(s.contractsDone)],
      ["st-replants", U.fmt(s.replants)],
      ["st-events", U.fmt(s.eventsSeen)],
      ["st-playtime", U.duration(s.playtime)]
    ];
    for (const [id, v] of pairs) setText(el(id), v);
    setText(el("set-sound"), s.sound ? "Sound: on" : "Sound: off");
    el("set-sound").setAttribute("aria-pressed", String(!!s.sound));
  }

  function renderBulk(s) {
    for (const b of el("bulk-bar").querySelectorAll("button")) {
      const v = b.dataset.bulk === "max" ? "max" : Number(b.dataset.bulk);
      b.classList.toggle("active", v === s.bulk);
      b.setAttribute("aria-pressed", String(v === s.bulk));
    }
  }

  function renderBadges(s, st) {
    const toolAffordable = D.tools[s.tool + 1] && s.cash >= D.tools[s.tool + 1].cost ? 1 : 0;
    const researchReady = D.research.filter((n) => !s.nodes[n.id] && (!n.req || s.nodes[n.req]) && s.research >= n.cost).length;
    const upgradeReady = D.sawmill.find((m) => !s.mill[m.id] && s.cash >= m.cost) ? 1 : 0;
    const badges = { tools: toolAffordable, research: researchReady, upgrades: upgradeReady };
    for (const k of Object.keys(badges)) {
      const b = el("badge-" + k);
      if (!b) continue;
      b.hidden = !badges[k];
      setText(b, String(badges[k]));
    }
  }

  function renderTutorial(s) {
    const box = el("tutorial");
    if (s.tutorial >= TUTORIAL.length) {
      box.hidden = true;
      clearHint();
      return;
    }
    while (s.tutorial < TUTORIAL.length) {
      const step = TUTORIAL[s.tutorial];
      if (step.done && step.done(s)) {
        s.tutorial++;
        continue;
      }
      break;
    }
    if (s.tutorial >= TUTORIAL.length) {
      box.hidden = true;
      clearHint();
      return;
    }
    const step = TUTORIAL[s.tutorial];
    box.hidden = false;
    if (tutorialStep !== s.tutorial) {
      tutorialStep = s.tutorial;
      setText(el("tut-title"), step.title);
      setText(el("tut-text"), step.text);
      setText(el("tut-count"), "Step " + (s.tutorial + 1) + " of " + TUTORIAL.length);
      el("tut-next").hidden = !!step.done;
      if (step.tab) switchTab(step.tab);
      applyHint(step.target);
      const dots = el("tut-dots");
      dots.textContent = "";
      TUTORIAL.forEach((_, i) => {
        const d = create("span", "dot" + (i === s.tutorial ? " on" : i < s.tutorial ? " done" : ""));
        dots.appendChild(d);
      });
    }
  }

  function applyHint(id) {
    clearHint();
    if (!id) return;
    const node = $(id);
    if (node) {
      node.classList.add("hint");
      hinted = node;
    }
  }

  function clearHint() {
    if (hinted) hinted.classList.remove("hint");
    hinted = null;
  }

  function refresh() {
    if (!game) return;
    const s = game.s;
    const st = E.stats(s);
    renderTop(s, st);
    renderStage(s, st);
    LJ.ProductionUI.renderRouting(s, st);
    renderContract(s);
    renderFleetStrip(s, st);
    renderBadges(s, st);
    renderTutorial(s);
    const prodTab = el("tab-production");
    if (prodTab) prodTab.hidden = !(s.replants >= 1);
    switch (activeTab) {
      case "tools":
        renderTools(s, st);
        break;
      case "fleet":
        renderBulk(s);
        renderFleet(s, st);
        break;
      case "upgrades":
        renderUpgrades(s, st);
        break;
      case "research":
        renderResearch(s);
        break;
      case "replant":
        renderReplant(s);
        break;
      case "production":
        LJ.ProductionUI.render(s, st);
        break;
      case "log":
        renderLog(s);
        break;
      case "settings":
        renderSettings(s);
        break;
    }
  }

  function toast(opts) {
    const box = el("toasts");
    const t = create("div", "toast" + (opts.tone ? " " + opts.tone : ""));
    t.append(create("div", "toast-icon", opts.icon || "✨"));
    const body = create("div", "toast-body");
    body.append(create("div", "toast-title", opts.title || ""));
    if (opts.text) body.append(create("div", "toast-text", opts.text));
    t.appendChild(body);
    box.appendChild(t);
    while (box.children.length > 3) box.firstElementChild.remove();
    setTimeout(() => {
      t.classList.add("out");
      setTimeout(() => t.remove(), 400);
    }, 3200);
  }

  function popText(anchor, text) {
    const r = anchor.getBoundingClientRect();
    const p = create("div", "pop", text);
    p.style.left = r.left + r.width / 2 + "px";
    p.style.top = r.top + "px";
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1000);
  }

  function openModal(opts) {
    const root = el("modal-root");
    root.textContent = "";
    const box = create("div", "modal");
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.appendChild(create("h2", "modal-title", opts.title));
    const body = create("div", "modal-body");
    if (typeof opts.body === "string") body.appendChild(create("p", "", opts.body));
    else if (opts.body) body.appendChild(opts.body);
    box.appendChild(body);
    const foot = create("div", "modal-foot");
    const close = () => {
      root.hidden = true;
      root.textContent = "";
      document.removeEventListener("keydown", onKey);
    };
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    for (const a of opts.actions || []) {
      const b = create("button", "btn" + (a.primary ? " primary" : "") + (a.danger ? " danger" : "") + (a.ghost ? " ghost" : ""), a.label);
      b.type = "button";
      b.disabled = !!a.disabled;
      b.addEventListener("click", () => {
        if (a.onClick) a.onClick(close);
        if (a.keepOpen !== true) close();
      });
      if (a.id) b.id = a.id;
      foot.appendChild(b);
    }
    if (opts.actions && opts.actions.length) box.appendChild(foot);
    root.appendChild(box);
    root.hidden = false;
    root.onclick = (e) => {
      if (e.target === root && !opts.sticky) close();
    };
    document.addEventListener("keydown", onKey);
    const focusTarget = box.querySelector("input, textarea, .btn.primary") || box.querySelector("button");
    if (focusTarget) focusTarget.focus();
    return { close, box };
  }

  function showAway(away) {
    if (!away || away.seconds < 60) return;
    const lines = [];
    lines.push("You were away for " + U.duration(away.seconds) + ".");
    if (away.timber > 0) lines.push("Your machines gathered " + U.fmt(away.timber) + " timber.");
    if (away.cash > 0) lines.push("Auto-sell turned it into " + U.money(away.cash) + ".");
    if (away.timber <= 0 && away.cash <= 0) lines.push("No machines were working. Hire some crew for next time.");
    lines.push("Offline progress runs at " + Math.round(away.eff * 100) + "% efficiency.");
    const body = create("div", "away-body");
    for (const l of lines) body.appendChild(create("p", "", l));
    openModal({ title: "Welcome back", body, actions: [{ label: "Back to the forest", primary: true }] });
  }

  function openReset() {
    const body = create("div", "");
    body.appendChild(
      create(
        "p",
        "",
        "This erases every run, machine, research node, achievement and statistic in this browser. It cannot be undone."
      )
    );
    const input = create("input", "confirm-input");
    input.placeholder = "Type RESET to confirm";
    input.autocomplete = "off";
    input.id = "reset-input";
    body.appendChild(input);
    const m = openModal({
      title: "Erase all progress?",
      body,
      sticky: true,
      actions: [
        { label: "Cancel", ghost: true },
        {
          id: "reset-confirm",
          label: "Erase everything",
          danger: true,
          disabled: true,
          keepOpen: true,
          onClick: () => {
            E.wipe();
            globalThis.location.reload();
          }
        }
      ]
    });
    const confirmBtn = m.box.querySelector("#reset-confirm");
    input.addEventListener("input", () => {
      confirmBtn.disabled = input.value.trim().toUpperCase() !== "RESET";
    });
    input.focus();
  }

  function openExport() {
    const text = E.encodeSave(game.s);
    const area = create("textarea", "save-text");
    area.readOnly = true;
    area.value = text;
    area.rows = 6;
    openModal({
      title: "Export save",
      body: area,
      actions: [
        {
          label: "Copy",
          primary: true,
          keepOpen: true,
          onClick: () => {
            area.select();
            const done = () => toast({ icon: "📋", title: "Save copied", text: "Paste it into Import on any device." });
            if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => document.execCommand("copy") && done());
            else {
              document.execCommand("copy");
              done();
            }
          }
        },
        { label: "Close", ghost: true }
      ]
    });
    area.focus();
    area.select();
  }

  function openImport() {
    const area = create("textarea", "save-text");
    area.rows = 6;
    area.placeholder = "Paste a Timberline save string here";
    const err = create("p", "error-text");
    err.hidden = true;
    const body = create("div", "");
    body.append(create("p", "", "Importing replaces the current save and reloads the game."), area, err);
    openModal({
      title: "Import save",
      body,
      sticky: true,
      actions: [
        { label: "Cancel", ghost: true },
        {
          label: "Import and reload",
          primary: true,
          keepOpen: true,
          onClick: () => {
            try {
              const parsed = E.decodeSave(area.value);
              const state = E.normalize(parsed, Date.now());
              E.save(state, Date.now());
              E.lockSaves();
              globalThis.location.reload();
            } catch (e) {
              err.textContent = "That save string did not load. Check it and try again.";
              err.hidden = false;
            }
          }
        }
      ]
    });
    area.focus();
  }

  function openReplant() {
    const s = game.s;
    const gain = E.replantGain(s);
    const body = create(
      "p",
      "",
      "Replanting resets this run: timber, cash, machines, tools, sawmill, contracts and terrain. You keep research, achievements and statistics, and earn " +
        U.fmt(gain) +
        " seedlings for permanent output bonuses."
    );
    openModal({
      title: "Replant the forest?",
      body,
      actions: [
        { label: "Not yet", ghost: true },
        {
          label: "Replant",
          primary: true,
          onClick: () => {
            const got = E.replant(game.s, Date.now());
            if (got) toast({ icon: "🌱", title: "Forest replanted", text: "+" + U.fmt(got) + " seedlings." });
            refresh();
          }
        }
      ]
    });
  }

  function bind() {
    for (const t of TABS) {
      const btn = el("tab-" + t);
      if (btn) btn.addEventListener("click", () => switchTab(t));
    }
    el("sell-btn").addEventListener("click", () => {
      const s = game.s;
      const gain = E.sell(s, E.stats(s), false);
      if (gain > 0) popText(el("sell-btn"), "+" + U.money(gain));
      refresh();
    });
    for (const b of el("bulk-bar").querySelectorAll("button")) {
      b.addEventListener("click", () => {
        game.s.bulk = b.dataset.bulk === "max" ? "max" : Number(b.dataset.bulk);
        refresh();
      });
    }
    el("rp-btn").addEventListener("click", openReplant);
    for (const b of el("sell-floor").querySelectorAll("[data-floor]")) {
      b.addEventListener("click", () => {
        if (E.setSellFloor(game.s, Number(b.dataset.floor))) refresh();
      });
    }
    el("set-sound").addEventListener("click", toggleSound);
    el("set-colorblind").addEventListener("click", toggleColorblind);
    el("btn-sound").addEventListener("click", toggleSound);
    el("btn-help").addEventListener("click", startTutorial);
    el("set-help").addEventListener("click", startTutorial);
    el("set-export").addEventListener("click", openExport);
    el("set-import").addEventListener("click", openImport);
    el("set-reset").addEventListener("click", openReset);
    el("tut-next").addEventListener("click", () => {
      game.s.tutorial++;
      refresh();
    });
    el("tut-skip").addEventListener("click", () => {
      game.s.tutorial = TUTORIAL.length;
      refresh();
    });
  }

  const PREFS_KEY = "timberline.prefs.v1";
  let prefs = readPrefs();

  function readPrefs() {
    try {
      const raw = JSON.parse(localStorage.getItem(PREFS_KEY));
      return raw && typeof raw === "object" ? raw : {};
    } catch (e) {
      return {};
    }
  }

  function savePrefs() {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch (e) {
      /* storage can be full or disabled; the palette still applies for this visit */
    }
  }

  function applyPrefs() {
    const on = prefs.colorblind === true;
    document.documentElement.classList.toggle("cb", on);
    const b = el("set-colorblind");
    setText(b, "Colour-blind palette: " + (on ? "on" : "off"));
    b.setAttribute("aria-pressed", String(on));
  }

  function toggleColorblind() {
    prefs.colorblind = !(prefs.colorblind === true);
    savePrefs();
    applyPrefs();
  }

  function toggleSound() {
    game.s.sound = !game.s.sound;
    A.setOn(game.s.sound);
    refresh();
  }

  function startTutorial() {
    game.s.tutorial = 0;
    tutorialStep = -1;
    refresh();
  }

  function init(g) {
    game = g;
    bind();
    LJ.ProductionUI.init(g, { toast, openModal, refresh });
    A.setOn(game.s.sound);
    applyPrefs();
    switchTab(activeTab);
  }

  return {
    init,
    refresh,
    toast,
    popText,
    showAway,
    switchTab,
    TUTORIAL_LENGTH: TUTORIAL.length
  };
})();
