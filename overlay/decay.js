// fade curve, same numbers as the background worker
(() => {
  const P = (window.__patina = window.__patina || {});
  P.decayof = function (age, threshold) {
    if (age < threshold) return { d: 0, stage: 0 };
    const r = age / threshold;
    const stage = r < 2 ? 1 : r < 4 ? 2 : r < 8 ? 3 : 4;
    let d = Math.min(1, Math.log2(r) / 3.5);
    d = Math.max(0.12, d);
    return { d, stage };
  };
})();
