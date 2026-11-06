var LJ = globalThis.LJ || (globalThis.LJ = {});

LJ.util = (function () {
  const SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];

  function trim(v) {
    return String(Number(v.toFixed(2)));
  }

  function fmt(n) {
    if (!Number.isFinite(n)) return "∞";
    const sign = n < 0 ? "-" : "";
    const a = Math.abs(n);
    if (a < 1000) return sign + (a < 10 ? trim(a) : String(Math.floor(a)));
    let idx = Math.floor(Math.log10(a) / 3);
    let v = a / Math.pow(1000, idx);
    if (Number(v.toFixed(2)) >= 1000) {
      idx++;
      v = a / Math.pow(1000, idx);
    }
    if (idx >= SUFFIXES.length) return sign + a.toExponential(2).replace("+", "");
    return sign + trim(v) + SUFFIXES[idx];
  }

  function money(n) {
    return (n < 0 ? "-$" : "$") + fmt(Math.abs(n));
  }

  function duration(sec) {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return h + "h " + m + "m";
    if (m > 0) return m + "m " + s + "s";
    return s + "s";
  }

  function roman(n) {
    return ["I", "II", "III", "IV", "V", "VI"][n] || String(n + 1);
  }

  function clamp(v, a, b) {
    return Math.min(b, Math.max(a, v));
  }

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  return { fmt, money, duration, roman, clamp, rand, pick };
})();
