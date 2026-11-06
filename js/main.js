(function () {
  const D = LJ.DATA;
  const E = LJ.Engine;
  const U = LJ.util;
  const A = LJ.Audio;
  const Scene = LJ.Scene;
  const UI = LJ.UI;
  const canvas = document.getElementById("scene");

  function processEvents() {
    for (const ev of E.drain()) {
      switch (ev.type) {
        case "hit":
          Scene.autoHit(ev);
          A.chop(ev.crit);
          break;
        case "fell":
          Scene.fellTree(ev.zone);
          A.fell();
          break;
        case "sell":
          A.coin();
          break;
        case "hire":
          A.buy();
          break;
        case "overhaul":
        case "mill":
          A.buy();
          break;
        case "tool": {
          const t = E.byId[ev.id];
          A.buy();
          UI.toast({ icon: t.icon, title: "New tool: " + t.name, text: t.blurb });
          break;
        }
        case "unlock": {
          const m = E.byId[ev.id];
          A.unlock();
          UI.toast({ icon: m.icon, title: "Unlocked: " + m.name, text: m.blurb, tone: "gold" });
          break;
        }
        case "zone": {
          const z = D.zones[ev.zone];
          Scene.setZone(ev.zone);
          A.zone();
          UI.toast({ icon: "🗺️", title: "New terrain: " + z.name, text: z.blurb, tone: "gold" });
          break;
        }
        case "replant":
          Scene.setZone(0);
          break;
        case "research":
          A.research();
          break;
        case "event": {
          const def = E.byId[ev.id];
          A.event();
          const extra = ev.cash ? " Cash +" + U.money(ev.cash) + "." : "";
          UI.toast({ icon: def.icon, title: def.name, text: def.desc + extra });
          break;
        }
        case "contract":
          A.contract();
          UI.toast({
            icon: "📋",
            title: "Contract complete: " + ev.title,
            text: "+" + U.money(ev.cash) + " and " + U.fmt(ev.research) + " research.",
            tone: "gold"
          });
          break;
        case "contractFail":
          A.error();
          UI.toast({ icon: "⌛", title: "Contract expired", text: ev.title, tone: "warn" });
          break;
        case "achievement": {
          const a = E.byId[ev.id];
          A.achievement();
          UI.toast({ icon: a.icon, title: "Achievement: " + a.name, text: a.desc, tone: "gold" });
          break;
        }
        default:
          break;
      }
    }
  }

  function chop(x, y) {
    const s = game.s;
    const r = E.hit(s, E.stats(s), false);
    Scene.chopAt(x, y, r);
    A.chop(r.crit);
    processEvents();
    UI.refresh();
  }

  const loaded = E.load(Date.now());
  const game = { s: loaded.state };

  Scene.init(canvas);
  Scene.setZone(game.s.zone);
  UI.init(game);
  LJ.Fullscreen.init({
    notify: (text) => UI.toast({ icon: "🖥️", title: "Fullscreen unavailable", text, tone: "warn" })
  });

  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    canvas.focus({ preventScroll: true });
    const r = canvas.getBoundingClientRect();
    chop(e.clientX - r.left, e.clientY - r.top);
  });

  document.addEventListener("keydown", (e) => {
    if (e.code !== "KeyS" || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target !== document.body && e.target !== canvas) return;
    if (!document.getElementById("modal-root").hidden) return;
    const sell = document.getElementById("sell-btn");
    if (sell.disabled) return;
    sell.click();
  });

  let spaceHeld = false;
  document.addEventListener("keydown", (e) => {
    if (e.code !== "Space") return;
    if (e.target !== document.body && e.target !== canvas) return;
    if (!document.getElementById("modal-root").hidden) return;
    e.preventDefault();
    if (e.repeat || spaceHeld) return;
    spaceHeld = true;
    const r = canvas.getBoundingClientRect();
    chop(r.width * 0.5, r.height * 0.55);
  });
  document.addEventListener("keyup", (e) => {
    if (e.code === "Space") spaceHeld = false;
  });
  globalThis.addEventListener("blur", () => {
    spaceHeld = false;
  });

  let lastTick = Date.now();
  setInterval(() => {
    const now = Date.now();
    const dt = (now - lastTick) / 1000;
    lastTick = now;
    if (dt > 60) {
      UI.showAway(E.offline(game.s, dt));
    } else {
      E.tick(game.s, Math.max(0, dt));
    }
    processEvents();
  }, 100);

  setInterval(() => UI.refresh(), 250);

  function saveNow() {
    E.save(game.s, Date.now());
  }
  setInterval(saveNow, 4000);
  globalThis.addEventListener("pagehide", saveNow);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveNow();
  });

  function frame(now) {
    Scene.render(now);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  processEvents();
  if (loaded.away) UI.showAway(loaded.away);
  UI.refresh();
})();
