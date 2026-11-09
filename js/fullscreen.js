var LJ = globalThis.LJ || (globalThis.LJ = {});

LJ.Fullscreen = (function () {
  const UNSUPPORTED =
    "Fullscreen is not available in this browser. On iPhone, add Timberline to your Home Screen to play full screen.";
  let btn = null;
  let notify = () => {};

  function container() {
    return document.querySelector(".app");
  }

  function supported() {
    const root = container();
    const enabled = document.fullscreenEnabled || document.webkitFullscreenEnabled;
    return !!(root && enabled && (root.requestFullscreen || root.webkitRequestFullscreen));
  }

  function active() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  function enter() {
    const root = container();
    const request = root.requestFullscreen ? root.requestFullscreen() : root.webkitRequestFullscreen();
    if (request && typeof request.catch === "function") request.catch(() => notify(UNSUPPORTED));
  }

  function exit() {
    const leave = document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen();
    if (leave && typeof leave.catch === "function") leave.catch(() => {});
  }

  function toggle() {
    if (!supported()) {
      notify(UNSUPPORTED);
      return;
    }
    if (active()) exit();
    else enter();
  }

  function sync() {
    const on = active();
    if (!btn) return;
    btn.setAttribute("aria-pressed", String(on));
    btn.setAttribute("aria-label", on ? "Exit fullscreen" : "Enter fullscreen");
    btn.title = on ? "Exit fullscreen (F)" : "Fullscreen (F)";
    btn.textContent = on ? "⤡" : "⤢";
  }

  function init(opts) {
    btn = document.getElementById("btn-fullscreen");
    notify = opts.notify;
    if (btn) btn.addEventListener("click", toggle);
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    document.addEventListener("keydown", (e) => {
      if (e.code !== "KeyF" || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target !== document.body && e.target !== document.getElementById("scene")) return;
      if (!document.getElementById("modal-root").hidden) return;
      toggle();
    });
    sync();
  }

  return { init, toggle, supported, active };
})();
