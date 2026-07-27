// paints the aging overlay on the page itself, inside a closed shadow dom
if (window.top === window.self) {
  (() => {
    const P = (window.__patina = window.__patina || {});
    const strip = P;

    let settings = null;
    let lastactive = Date.now(); // last time the tab was on screen
    let shownstage = 0;
    let restoring = false;
    let lastreport = 0;
    let host = null;
    let root = null;

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
      if (settings?.stripdecay) strip.update?.(d, stage, i);
    }

    function clean() {
      strip.restore?.();
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
      strip.restore?.();
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
      // preview mode: hold a stage no matter what (popup preview / testing)
      if (settings.forcestage) {
        const dmap = { 1: 0.2, 2: 0.45, 3: 0.7, 4: 0.95 };
        apply(dmap[settings.forcestage] ?? 0.95, settings.forcestage);
        return;
      }
      const now = Date.now();
      if (document.visibilityState === "visible") {
        lastactive = now;
        report(now, false);
        clean();
        return;
      }
      const { d, stage } = P.decayof(now - lastactive, settings.threshold);
      if (stage === 0) clean();
      else apply(d, stage);
    }

    function onreveal() {
      if (settings?.forcestage) return;
      const now = Date.now();
      const { d, stage } = P.decayof(now - lastactive, settings?.threshold ?? Infinity);
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
        strip.collect?.();
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
