var LJ = globalThis.LJ || (globalThis.LJ = {});

LJ.Audio = (function () {
  let ctx = null;
  let out = null;
  let on = true;
  let lastChop = 0;

  function ensure() {
    if (!on) return null;
    if (!ctx) {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      out = ctx.createGain();
      out.gain.value = 0.45;
      out.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(type, f1, f2, dur, vol, delay) {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime + (delay || 0);
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t);
    if (f2 && f2 !== f1) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function noise(dur, vol, freq) {
    const c = ensure();
    if (!c) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = freq;
    const g = c.createGain();
    g.gain.value = vol;
    src.connect(f);
    f.connect(g);
    g.connect(out);
    src.start();
  }

  return {
    setOn(v) {
      on = !!v;
      if (on) ensure();
    },
    chop(crit) {
      const now = performance.now();
      if (now - lastChop < 55) return;
      lastChop = now;
      noise(0.09, crit ? 0.5 : 0.35, crit ? 2400 : 1600);
      tone("triangle", crit ? 620 : 260, 120, 0.08, 0.25);
      if (crit) tone("sine", 880, 1320, 0.25, 0.12, 0.03);
    },
    fell() {
      tone("sine", 180, 40, 0.5, 0.5);
      noise(0.25, 0.4, 500);
    },
    coin() {
      tone("square", 988, 988, 0.08, 0.06);
      tone("square", 1319, 1319, 0.12, 0.06, 0.07);
    },
    buy() {
      tone("triangle", 523, 784, 0.18, 0.2);
    },
    unlock() {
      [523, 659, 784, 1046].forEach((f, i) => tone("triangle", f, f, 0.2, 0.15, i * 0.09));
    },
    achievement() {
      [784, 988, 1319].forEach((f, i) => tone("sine", f, f, 0.3, 0.14, i * 0.07));
    },
    event() {
      tone("sawtooth", 220, 440, 0.3, 0.07);
    },
    research() {
      tone("sine", 660, 990, 0.25, 0.15);
    },
    zone() {
      [392, 494, 587, 784].forEach((f, i) => tone("triangle", f, f, 0.25, 0.15, i * 0.1));
    },
    contract() {
      [660, 880, 1100].forEach((f, i) => tone("triangle", f, f, 0.2, 0.14, i * 0.08));
    },
    error() {
      tone("square", 150, 110, 0.15, 0.08);
    }
  };
})();
