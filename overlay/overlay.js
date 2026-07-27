// the aging overlay: a closed shadow dom, pointer-events none, clicks pass through
(() => {
  const P = (window.__patina = window.__patina || {});

  let host = null;
  let root = null;
  let shownstage = 0;
  let restoring = false;

  function build() {
    host = document.createElement("div");
    host.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none;";
    host.setAttribute("aria-hidden", "true");
    const shadow = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = P.css;
    root = document.createElement("div");
    root.id = "root";
    root.className = "clean";
    const layer = (cls) => {
      const d = document.createElement("div");
      d.className = cls;
      return d;
    };
    const filter = layer("filter");
    const tint = layer("tint");
    const grainl = layer("grain");
    const crackl = layer("cracks");
    const vignette = layer("vignette");
    const ash = layer("ash");
    const sweep = layer("sweep");
    for (let i = 0; i < 16; i++) {
      const m = document.createElement("div");
      m.className = "mote";
      const size = 2 + Math.random() * 4;
      m.style.width = m.style.height = size + "px";
      m.style.left = Math.random() * 100 + "%";
      m.style.animationDuration = 7 + Math.random() * 9 + "s";
      m.style.animationDelay = -Math.random() * 12 + "s";
      ash.appendChild(m);
    }
    root.append(filter, tint, grainl, crackl, vignette, ash, sweep);
    shadow.append(style, root);
    (document.documentElement || document.body).appendChild(host);
  }

  // paint stage at fade depth d; intensity + stripdecay come from settings
  function apply(d, stage, intensity, stripdecay) {
    if (!host) build();
    const i = Math.max(0.3, Math.min(1.8, intensity ?? 1));
    const clamp = (v) => Math.max(0, Math.min(1, v));
    const r = root.style;
    r.setProperty(
      "--bf",
      `sepia(${(0.15 + 0.55 * d).toFixed(3)}) ` +
        `saturate(${(1 - 0.85 * d).toFixed(3)}) ` +
        `brightness(${(1 - 0.2 * d).toFixed(3)}) ` +
        `contrast(${(1 - 0.14 * d).toFixed(3)})`
    );
    r.setProperty("--tint", clamp((0.12 + 0.34 * d) * i).toFixed(3));
    r.setProperty("--grain", stage >= 2 ? clamp((0.14 + 0.3 * d) * i).toFixed(3) : (0.05 * i).toFixed(3));
    r.setProperty("--cracks", stage >= 3 ? clamp((0.3 + 0.5 * d) * i).toFixed(3) : "0");
    r.setProperty("--vig", clamp((0.1 + 0.5 * d) * i).toFixed(3));
    r.setProperty("--ash", stage >= 4 ? "1" : "0");
    root.classList.remove("clean");
    root.style.opacity = "1";
    shownstage = stage;
    if (stripdecay) P.strip?.update?.(d, stage, i);
  }

  function clean() {
    P.strip?.restore?.();
    if (!root) return;
    if (!root.classList.contains("clean")) root.classList.add("clean");
    shownstage = 0;
  }

  // show the aged page for a beat then bloom it back
  function restore() {
    if (restoring || !root || shownstage === 0) {
      clean();
      return;
    }
    restoring = true;
    P.strip?.restore?.();
    root.classList.add("restoring");
    setTimeout(() => {
      root.classList.remove("restoring");
      clean();
      restoring = false;
    }, 950);
  }

  P.overlay = {
    apply, clean, restore,
    get restoring() { return restoring; },
    get stage() { return shownstage; },
  };
})();
