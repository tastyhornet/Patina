// low-level favicon pixel work — load an icon, then desaturate/sepia/crack/crumble it
(() => {
  const P = (window.__patina = window.__patina || {});
  const fx = {};

  fx.loadimg = (src, cross) =>
    new Promise((ok, no) => {
      const img = new Image();
      if (cross) img.crossOrigin = cross;
      img.onload = () => ok(img);
      img.onerror = no;
      img.src = src;
    });

  // fetch->blob is clean for same-origin icons; cors image as a backup
  fx.geticon = async (url) => {
    try {
      const res = await fetch(url, { cache: "force-cache" });
      if (!res.ok) throw 0;
      const blob = await res.blob();
      if (!blob || !blob.size) throw 0;
      const obj = URL.createObjectURL(blob);
      try { return await fx.loadimg(obj, null); }
      finally { URL.revokeObjectURL(obj); }
    } catch {
      return await fx.loadimg(url, "anonymous");
    }
  };

  fx.contain = (g, img, s) => {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return false;
    const sc = Math.min(s / iw, s / ih);
    const w = iw * sc, h = ih * sc;
    g.clearRect(0, 0, s, s);
    g.drawImage(img, (s - w) / 2, (s - h) / 2, w, h);
    return true;
  };

  // fallback disc when we can't read the real icon
  fx.disc = (g, s) => {
    g.clearRect(0, 0, s, s);
    const grd = g.createRadialGradient(s * 0.4, s * 0.35, 1, s / 2, s / 2, s / 2);
    grd.addColorStop(0, "#e9d6b0");
    grd.addColorStop(1, "#7a5c33");
    g.fillStyle = grd;
    g.beginPath();
    g.arc(s / 2, s / 2, s / 2 - 1, 0, Math.PI * 2);
    g.fill();
  };

  // desaturate + sepia + darken, with grain from stage 2
  fx.age = (g, s, d, stage, i) => {
    const im = g.getImageData(0, 0, s, s);
    const p = im.data;
    const grain = stage >= 2 ? 60 * d * i : 0;
    const br = 1 - 0.28 * d;
    for (let k = 0; k < p.length; k += 4) {
      if (p[k + 3] === 0) continue;
      let r = p[k], gg = p[k + 1], b = p[k + 2];
      const gray = 0.3 * r + 0.59 * gg + 0.11 * b;
      r += (gray - r) * d; gg += (gray - gg) * d; b += (gray - b) * d;
      r += (150 - r) * 0.22 * d; gg += (110 - gg) * 0.22 * d; b += (70 - b) * 0.22 * d;
      r *= br; gg *= br; b *= br;
      if (grain) { const n = (Math.random() - 0.5) * grain; r += n; gg += n; b += n; }
      p[k] = r < 0 ? 0 : r > 255 ? 255 : r;
      p[k + 1] = gg < 0 ? 0 : gg > 255 ? 255 : gg;
      p[k + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
    }
    g.putImageData(im, 0, 0);
  };

  fx.cracks = (g, s, d) => {
    g.save();
    g.strokeStyle = "rgba(28,16,6," + (0.5 + 0.4 * d).toFixed(2) + ")";
    g.lineWidth = Math.max(1, s / 26);
    g.lineJoin = "round";
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(s * 0.2, s * 0.13);
    g.lineTo(s * 0.5, s * 0.5);
    g.lineTo(s * 0.4, s * 0.72);
    g.lineTo(s * 0.66, s * 0.96);
    g.stroke();
    g.beginPath();
    g.moveTo(s * 0.5, s * 0.5);
    g.lineTo(s * 0.82, s * 0.38);
    g.stroke();
    g.restore();
  };

  // eat away pixels near the edges for the crumbling look
  fx.crumble = (g, s, d) => {
    const im = g.getImageData(0, 0, s, s);
    const p = im.data;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const e = Math.min(x, y, s - 1 - x, s - 1 - y);
        const pr = (1 - e / (s * 0.5)) * 0.5 * d;
        if (pr > 0 && Math.random() < pr) p[(y * s + x) * 4 + 3] = 0;
      }
    }
    g.putImageData(im, 0, 0);
  };

  P.fx = fx;
})();
