var LJ = globalThis.LJ || (globalThis.LJ = {});

LJ.Scene = (function () {
  const D = LJ.DATA;
  const U = LJ.util;
  const FALL_TIME = 0.55;
  const GROW_TIME = 0.5;
  const GROW_DELAY = 0.45;

  let canvas = null;
  let c = null;
  let w = 0;
  let h = 0;
  let theme = D.zones[0];
  let time = 0;
  let shake = 0;
  let particles = [];
  let texts = [];
  let stumps = [];
  let leaves = [];
  let fall = null;
  let grow = 1;
  let leafTimer = 0;
  let lastFrame = 0;

  function init(el) {
    canvas = el;
    c = canvas.getContext("2d");
    resize();
    globalThis.addEventListener("resize", resize);
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    w = r.width;
    h = r.height;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function setArea(area) {
    theme = area || D.zones[0];
  }

  function area() {
    return theme;
  }

  function treeBase() {
    return { x: w * 0.5, y: h * 0.84 };
  }

  function treeHeight(th) {
    return Math.min(h * 0.62, w * 0.6) * th.size;
  }

  function chopAt(x, y, r) {
    shake = Math.min(12, shake + (r.crit ? 9 : 4));
    const n = r.crit ? 16 : 7;
    for (let i = 0; i < n; i++) {
      particles.push({
        kind: "chip",
        x,
        y,
        vx: U.rand(-160, 160),
        vy: U.rand(-320, -120) * (r.crit ? 1.3 : 1),
        life: U.rand(0.5, 0.9),
        max: 0.9,
        size: U.rand(2, 4.5),
        color: r.crit ? "#ffd166" : Math.random() < 0.5 ? "#c98b4e" : "#e6b07a",
        rot: Math.random() * 6
      });
    }
    if (r.crit) {
      particles.push({ kind: "burst", x, y, life: 0.45, max: 0.45, size: 6, color: "#fff3b0" });
    }
    texts.push({
      x: x + U.rand(-12, 12),
      y: y - 8,
      text: (r.crit ? "CRIT +" : "+") + U.fmt(r.gain),
      color: r.crit ? "#ffd166" : "#e9ffe0",
      life: 0.9,
      max: 0.9,
      size: r.crit ? 22 : 16
    });
  }

  function autoHit(r) {
    const b = treeBase();
    chopAt(b.x + U.rand(-h * 0.08, h * 0.08), b.y - treeHeight(theme) * 0.4, { gain: r.gain, crit: r.crit });
    shake = Math.min(shake, 4);
  }

  function fellTree(source) {
    const th = source || theme;
    fall = { t: 0, theme: th, dir: Math.random() < 0.5 ? -1 : 1 };
    grow = -GROW_DELAY / GROW_TIME;
    const b = treeBase();
    stumps.push({ x: b.x, y: b.y, t: 0, theme: th });
    if (stumps.length > 3) stumps.shift();
    const H = treeHeight(th);
    for (let i = 0; i < 18; i++) {
      leaves.push(makeLeaf(b.x + U.rand(-H * 0.25, H * 0.25), b.y - H * 0.7 + U.rand(-H * 0.15, H * 0.15), th, true));
    }
  }

  function makeLeaf(x, y, th, burst) {
    return {
      x,
      y,
      vx: burst ? U.rand(-120, 120) : U.rand(15, 45),
      vy: burst ? U.rand(-200, -60) : U.rand(10, 30),
      life: burst ? U.rand(2, 3.2) : U.rand(6, 10),
      max: 10,
      sway: Math.random() * 6,
      size: U.rand(4, 7),
      color: Math.random() < 0.5 ? th.leaf : th.leaf2,
      burst: !!burst
    };
  }

  function easeOutBack(x) {
    const k = 1.70158;
    const p = x - 1;
    return 1 + (k + 1) * p * p * p + k * p * p;
  }

  function drawSky() {
    const g = c.createLinearGradient(0, 0, 0, h * 0.85);
    g.addColorStop(0, theme.sky[0]);
    g.addColorStop(1, theme.sky[1]);
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    const sx = w * 0.82;
    const sy = h * 0.18;
    const glow = c.createRadialGradient(sx, sy, 0, sx, sy, h * 0.35);
    glow.addColorStop(0, theme.sun);
    glow.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = glow;
    c.fillRect(0, 0, w, h);
    c.fillStyle = theme.sun;
    c.beginPath();
    c.arc(sx, sy, h * 0.045, 0, Math.PI * 2);
    c.fill();
  }

  function drawRidge(base, amp, freq, phase, color) {
    c.beginPath();
    c.moveTo(0, h);
    for (let x = 0; x <= w + 8; x += 8) {
      const y = base + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 2.7 + phase * 1.3) * amp * 0.35;
      c.lineTo(x, y);
    }
    c.lineTo(w, h);
    c.closePath();
    c.fillStyle = color;
    c.fill();
  }

  function drawGround() {
    const base = h * 0.8;
    const g = c.createLinearGradient(0, base, 0, h);
    g.addColorStop(0, theme.ground);
    g.addColorStop(1, theme.near);
    c.fillStyle = g;
    c.fillRect(0, base, w, h - base);
    c.fillStyle = "rgba(0,0,0,0.16)";
    c.beginPath();
    c.ellipse(w * 0.5, h * 0.84, w * 0.2, h * 0.03, 0, 0, Math.PI * 2);
    c.fill();
  }

  function drawConifer(th, H, type) {
    c.fillStyle = th.trunk;
    if (type === "sapling") {
      c.fillRect(-H * 0.03, -H * 0.5, H * 0.06, H * 0.5);
      c.fillStyle = th.leaf;
      c.beginPath();
      c.arc(0, -H * 0.62, H * 0.3, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = th.leaf2;
      c.beginPath();
      c.arc(H * 0.14, -H * 0.5, H * 0.18, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.arc(-H * 0.12, -H * 0.46, H * 0.16, 0, Math.PI * 2);
      c.fill();
      return;
    }
    if (type === "kauri") {
      c.fillRect(-H * 0.05, -H * 0.78, H * 0.1, H * 0.78);
      c.fillStyle = th.leaf;
      c.beginPath();
      c.ellipse(0, -H * 0.84, H * 0.3, H * 0.2, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = th.leaf2;
      c.beginPath();
      c.ellipse(H * 0.12, -H * 0.66, H * 0.2, H * 0.14, 0, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.ellipse(-H * 0.14, -H * 0.62, H * 0.18, H * 0.13, 0, 0, Math.PI * 2);
      c.fill();
      return;
    }
    if (type === "redwood") {
      c.fillStyle = th.trunk;
      c.fillRect(-H * 0.07, -H * 0.82, H * 0.14, H * 0.82);
      const layers = 7;
      for (let i = 0; i < layers; i++) {
        const bottom = -H * (0.3 + 0.55 * (i / layers));
        const top = bottom - H * (0.6 / layers) * 2.1;
        const half = H * 0.28 * (1 - (0.6 * i) / layers);
        c.fillStyle = i % 2 ? th.leaf2 : th.leaf;
        c.beginPath();
        c.moveTo(0, top);
        c.lineTo(half, bottom);
        c.lineTo(-half, bottom);
        c.closePath();
        c.fill();
      }
      return;
    }
    const layers = { pine: 3, spruce: 5, fir: 6, oldgrowth: 5, larch: 7, cedar: 8 }[type] || 4;
    c.fillRect(-H * 0.025, -H * 0.24, H * 0.05, H * 0.24);
    for (let i = 0; i < layers; i++) {
      const bottom = -H * (0.22 + 0.62 * (i / layers));
      const top = bottom - H * (0.62 / layers) * 1.9;
      const half = H * 0.26 * (1 - (0.5 * i) / layers);
      c.fillStyle = i % 2 ? th.leaf2 : th.leaf;
      c.beginPath();
      c.moveTo(0, top);
      c.lineTo(half, bottom);
      c.lineTo(-half, bottom);
      c.closePath();
      c.fill();
    }
  }

  function drawTreeAt(th, x, y, scale, angle, alpha) {
    const H = treeHeight(th);
    c.save();
    c.globalAlpha = alpha;
    c.translate(x, y);
    c.rotate(angle);
    c.scale(scale, scale);
    drawConifer(th, H, th.tree);
    c.restore();
  }

  function drawStumps(dt) {
    for (const s of stumps) {
      s.t += dt;
      const a = Math.max(0, Math.min(1, (3.5 - s.t) / 1));
      if (a <= 0) continue;
      c.save();
      c.globalAlpha = a;
      c.fillStyle = s.theme.trunk;
      c.beginPath();
      c.ellipse(s.x, s.y, h * 0.05, h * 0.012, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#e0b98a";
      c.beginPath();
      c.ellipse(s.x, s.y - h * 0.004, h * 0.035, h * 0.007, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
    stumps = stumps.filter((s) => s.t < 3.5);
  }

  function drawLivingTree(dt) {
    const b = treeBase();
    shake *= Math.exp(-dt * 10);
    const sway = Math.sin(time * 1.4) * 0.008 + Math.sin(time * 40) * shake * 0.004;
    if (fall) {
      fall.t += dt;
      const k = Math.min(1, fall.t / FALL_TIME);
      const ang = fall.dir * (Math.PI / 2) * k * k;
      const fade = fall.t > FALL_TIME ? Math.max(0, 1 - (fall.t - FALL_TIME) * 4) : 1;
      if (fade > 0) drawTreeAt(fall.theme, b.x, b.y, 1, ang, fade);
      if (fall.t > FALL_TIME + 0.2) fall = null;
    }
    if (grow < 1) grow = Math.min(1, grow + dt / GROW_TIME);
    const s = grow <= 0 ? 0 : easeOutBack(grow);
    if (s > 0.001) {
      const squash = 1 + Math.max(0, shake) * 0.004;
      drawTreeAt(theme, b.x + Math.sin(time * 60) * shake * 0.5, b.y, s * squash, sway, 1);
    }
  }

  function drawAmbient(dt) {
    leafTimer -= dt;
    if (leafTimer <= 0 && !fall) {
      leafTimer = U.rand(0.8, 2.2);
      leaves.push(makeLeaf(U.rand(w * 0.1, w * 0.9), -10, theme, false));
    }
    leaves = leaves.filter((l) => {
      l.life -= dt;
      l.sway += dt * 2;
      if (l.burst) {
        l.vy += 260 * dt;
        l.vx *= Math.exp(-dt * 1.5);
      }
      l.x += (l.vx + Math.sin(l.sway) * 18) * dt;
      l.y += l.vy * dt;
      if (l.life <= 0 || l.y > h + 20) return false;
      c.save();
      c.globalAlpha = Math.min(1, l.life);
      c.fillStyle = l.color;
      c.beginPath();
      c.ellipse(l.x, l.y, l.size, l.size * 0.45, Math.sin(l.sway) * 0.8, 0, Math.PI * 2);
      c.fill();
      c.restore();
      return true;
    });
  }

  function drawParticles(dt) {
    particles = particles.filter((p) => {
      p.life -= dt;
      if (p.life <= 0) return false;
      if (p.kind === "burst") {
        const k = p.life / p.max;
        c.save();
        c.globalAlpha = k;
        c.strokeStyle = p.color;
        c.lineWidth = 2;
        c.beginPath();
        c.arc(p.x, p.y, (1 - k) * 46 + 4, 0, Math.PI * 2);
        c.stroke();
        c.restore();
        return true;
      }
      p.vy += 900 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += dt * 10;
      c.save();
      c.globalAlpha = Math.min(1, p.life / p.max + 0.2);
      c.translate(p.x, p.y);
      c.rotate(p.rot);
      c.fillStyle = p.color;
      c.fillRect(-p.size, -p.size * 0.4, p.size * 2, p.size * 0.8);
      c.restore();
      return true;
    });
  }

  function drawTexts(dt) {
    texts = texts.filter((t) => {
      t.life -= dt;
      if (t.life <= 0) return false;
      t.y -= 46 * dt;
      const a = Math.min(1, t.life / t.max + 0.1);
      c.save();
      c.globalAlpha = a;
      c.font = "800 " + t.size + "px system-ui, sans-serif";
      c.textAlign = "center";
      c.lineWidth = 4;
      c.strokeStyle = "rgba(10,25,18,0.75)";
      c.strokeText(t.text, t.x, t.y);
      c.fillStyle = t.color;
      c.fillText(t.text, t.x, t.y);
      c.restore();
      return true;
    });
  }

  function render(now) {
    const dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0;
    lastFrame = now;
    time += dt;
    if (!c || !w || !h) return;
    c.clearRect(0, 0, w, h);
    drawSky();
    drawRidge(h * 0.52, h * 0.05, 0.011, 1, theme.far);
    drawRidge(h * 0.66, h * 0.04, 0.02, 2.4, theme.near);
    drawGround();
    drawStumps(dt);
    drawLivingTree(dt);
    drawAmbient(dt);
    drawParticles(dt);
    drawTexts(dt);
  }

  return { init, resize, setArea, area, chopAt, autoHit, fellTree, render };
})();
