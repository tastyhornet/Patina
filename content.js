// paints the aging overlay on the page itself, inside a closed shadow dom
if (window.top === window.self) {
  (() => {
    let settings = null;
    let lastactive = Date.now(); // last time the tab was on screen
    let shownstage = 0;
    let restoring = false;
    let lastreport = 0;
    let host = null;
    let root = null;

    const grain =
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

    const crackimg =
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 700' preserveAspectRatio='none'%3E%3Cg fill='none' stroke='%23241a10' stroke-width='1.3' stroke-opacity='0.75'%3E%3Cpath d='M-10,150 L170,175 L235,120 L410,205 L520,165 L690,240 L850,195 L1010,250'/%3E%3Cpath d='M235,120 L260,10 M410,205 L470,330 L430,470 M690,240 L730,120 M690,240 L640,360 L700,520'/%3E%3Cpath d='M-10,520 L150,500 L300,560 L470,540 L620,600 L800,560 L1010,610'/%3E%3Cpath d='M300,560 L280,690 M620,600 L660,700 M150,500 L120,410'/%3E%3Cpath d='M60,-10 L95,140 L60,300 L110,430 L70,600'/%3E%3Cpath d='M930,-10 L900,160 L950,320 L905,470'/%3E%3C/g%3E%3C/svg%3E\")";

    const css = `
      :host { all: initial; }
      #root {
        position: fixed; inset: 0; z-index: 2147483647; pointer-events: none;
        opacity: 1; transition: opacity .6s ease;
      }
      #root.clean { display: none; }
      #root > div { position: absolute; inset: 0; }
      .filter {
        -webkit-backdrop-filter: var(--bf, none); backdrop-filter: var(--bf, none);
        transition: -webkit-backdrop-filter 1.1s ease, backdrop-filter 1.1s ease;
      }
      .tint {
        background: #6b4f2a; mix-blend-mode: multiply;
        opacity: var(--tint, 0); transition: opacity 1.1s ease;
      }
      .grain {
        background-image: ${grain}; background-size: 150px 150px;
        mix-blend-mode: overlay; opacity: var(--grain, 0);
        transition: opacity 1.1s ease; animation: flicker 1.4s steps(4) infinite;
      }
      .cracks {
        background-image: ${crackimg}; background-size: 100% 100%;
        mix-blend-mode: multiply; opacity: var(--cracks, 0);
        transition: opacity 1.4s ease;
      }
      .vignette {
        background: radial-gradient(120% 120% at 50% 42%,
          transparent 45%, rgba(30,18,6,.55) 100%);
        opacity: var(--vig, 0); transition: opacity 1.1s ease;
      }
      .ash { overflow: hidden; opacity: var(--ash, 0); transition: opacity 1.1s ease; }
      .mote {
        position: absolute; bottom: -12px; border-radius: 50%;
        background: rgba(70,52,34,.55); filter: blur(.4px);
        animation: rise linear infinite;
      }
      .sweep {
        background: radial-gradient(circle at 50% 50%,
          rgba(255,246,225,.92), rgba(255,246,225,0) 60%);
        mix-blend-mode: screen; opacity: 0; transform: scale(0);
        transform-origin: 50% 50%;
      }
      @keyframes flicker {
        0% { background-position: 0 0; }
        25% { background-position: -40px 30px; }
        50% { background-position: 30px -20px; }
        75% { background-position: -20px -30px; }
        100% { background-position: 0 0; }
      }
      @keyframes rise {
        0%   { transform: translate(0,0); opacity: 0; }
        12%  { opacity: .75; }
        100% { transform: translate(24px,-112vh); opacity: 0; }
      }
      @keyframes bloom {
        0%   { opacity: 0; transform: scale(0); }
        28%  { opacity: .55; }
        100% { opacity: 0; transform: scale(3.2); }
      }
      #root.restoring .filter,
      #root.restoring .tint,
      #root.restoring .grain,
      #root.restoring .cracks,
      #root.restoring .vignette,
      #root.restoring .ash {
        opacity: 0 !important;
        -webkit-backdrop-filter: none !important; backdrop-filter: none !important;
        transition: opacity .5s ease-out, backdrop-filter .5s ease-out;
      }
      #root.restoring .sweep { animation: bloom .9s ease-out forwards; }
    `;

    // fade curve, same numbers as the background worker
    function decayof(age, threshold) {
      if (age < threshold) return { d: 0, stage: 0 };
      const r = age / threshold;
      const stage = r < 2 ? 1 : r < 4 ? 2 : r < 8 ? 3 : 4;
      let d = Math.min(1, Math.log2(r) / 3.5);
      d = Math.max(0.12, d);
      return { d, stage };
    }

    function build() {
      host = document.createElement("div");
      host.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none;";
      host.setAttribute("aria-hidden", "true");
      const shadow = host.attachShadow({ mode: "closed" });
      const style = document.createElement("style");
      style.textContent = css;
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

    function apply(d, stage) {
      if (!host) build();
      const i = Math.max(0.3, Math.min(1.8, settings?.intensity ?? 1));
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
    }

    function clean() {
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
      root.classList.add("restoring");
      setTimeout(() => {
        root.classList.remove("restoring");
        clean();
        restoring = false;
      }, 950);
    }

    function report(now, force) {
      if (force || now - lastreport > 12000) {
        lastreport = now;
        chrome.runtime.sendMessage({ type: "REPORT", lastActive: lastactive }).catch(() => {});
      }
    }

    function tick() {
      if (restoring) return;
      if (!settings || !settings.enabled) {
        clean();
        return;
      }
      const now = Date.now();
      if (document.visibilityState === "visible") {
        lastactive = now;
        report(now, false);
        clean();
        return;
      }
      const { d, stage } = decayof(now - lastactive, settings.threshold);
      if (stage === 0) clean();
      else apply(d, stage);
    }

    function onreveal() {
      const now = Date.now();
      const { d, stage } = decayof(now - lastactive, settings?.threshold ?? Infinity);
      if (stage > 0) {
        apply(d, stage);
        requestAnimationFrame(() => requestAnimationFrame(restore));
      } else {
        clean();
      }
      lastactive = now;
      chrome.runtime.sendMessage({ type: "RESET" }).catch(() => {});
    }

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") onreveal();
      else {
        lastactive = Date.now();
        report(lastactive, true);
      }
    });
    window.addEventListener("focus", () => {
      if (document.visibilityState === "visible") onreveal();
    });

    chrome.runtime.onMessage.addListener((msg) => {
      if (msg?.type === "SETTINGS") settings = msg.settings;
      else if (msg?.type === "FORCE_RESTORE") onreveal();
    });

    function boot(attempt = 0) {
      chrome.runtime.sendMessage({ type: "HELLO" }, (resp) => {
        if (chrome.runtime.lastError || !resp) {
          if (attempt < 5) setTimeout(() => boot(attempt + 1), 400);
          return;
        }
        settings = resp.settings;
        lastactive = resp.lastActive;
        if (document.visibilityState === "visible") lastactive = Date.now();
        tick();
        setInterval(tick, 2000);
      });
    }

    boot();

    // idea for later: nudge with a toast on the page instead of the whole overlay
    // function toast(text){ const t=document.createElement('div'); t.textContent=text; ... }
  })();
}
