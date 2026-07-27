// page-side controller: track hidden time, pick the stage, drive overlay + favicon
if (window.top === window.self) {
  (() => {
    const P = window.__patina;
    const overlay = P.overlay;
    const strip = P.strip;
    const decayof = P.decayof;

    let settings = null;
    let lastactive = Date.now(); // last time the tab was on screen
    let lastreport = 0;

    function report(now, force) {
      if (force || now - lastreport > 12000) {
        lastreport = now;
        chrome.runtime.sendMessage({ type: "REPORT", lastActive: lastactive }).catch(() => {});
      }
    }

    function tick() {
      if (overlay.restoring) return;
      if (!settings || !settings.enabled) {
        overlay.clean();
        return;
      }
      // preview mode: hold a stage no matter what (popup preview / testing)
      if (settings.forcestage) {
        const dmap = { 1: 0.2, 2: 0.45, 3: 0.7, 4: 0.95 };
        overlay.apply(dmap[settings.forcestage] ?? 0.95, settings.forcestage, settings.intensity, settings.stripdecay);
        return;
      }
      const now = Date.now();
      if (document.visibilityState === "visible") {
        lastactive = now;
        report(now, false);
        overlay.clean();
        return;
      }
      const { d, stage } = decayof(now - lastactive, settings.threshold);
      if (stage === 0) overlay.clean();
      else overlay.apply(d, stage, settings.intensity, settings.stripdecay);
    }

    function onreveal() {
      if (settings?.forcestage) return;
      const now = Date.now();
      const { d, stage } = decayof(now - lastactive, settings?.threshold ?? Infinity);
      if (stage > 0) {
        overlay.apply(d, stage, settings?.intensity, settings?.stripdecay);
        requestAnimationFrame(() => requestAnimationFrame(overlay.restore));
      } else {
        overlay.clean();
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
