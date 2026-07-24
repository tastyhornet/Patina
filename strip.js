// tab-strip aging — swaps the favicon + title so decay shows without opening the tab.
// chrome won't let us paint the real tab strip, but the favicon and title we can touch.

(() => {
  const strip = (window.__patina = window.__patina || {});

  let links = null; // {el, orig}
  let origtitle = "";
  let token = 0;
  let lastkey = "";
  let active = false;

  // grab whatever icon links the page has, or make one
  strip.collect = () => {
    let found = [...document.querySelectorAll('link[rel~="icon"]')];
    if (!found.length) {
      const l = document.createElement("link");
      l.rel = "icon";
      l.href = location.origin + "/favicon.ico";
      (document.head || document.documentElement).appendChild(l);
      found = [l];
    }
    links = found.map((el) => ({ el, orig: el.getAttribute("href") }));
    origtitle = document.title;
  };

  function baseurl() {
    const href = links?.[0]?.orig;
    if (href) {
      try { return new URL(href, location.href).href; } catch {}
    }
    return location.origin + "/favicon.ico";
  }

  function seticon(url) {
    if (!links) return;
    for (const { el } of links) el.setAttribute("href", url);
  }

  function loadimg(src, cross) {
    return new Promise((ok, no) => {
      const img = new Image();
      if (cross) img.crossOrigin = cross;
      img.onload = () => ok(img);
      img.onerror = no;
      img.src = src;
    });
  }

  // fetch->blob is clean for same-origin icons; cors image as a backup
  async function geticon(url) {
    try {
      const res = await fetch(url, { cache: "force-cache" });
      if (!res.ok) throw 0;
      const blob = await res.blob();
      if (!blob || !blob.size) throw 0;
      const obj = URL.createObjectURL(blob);
      try { return await loadimg(obj, null); }
      finally { URL.revokeObjectURL(obj); }
    } catch {
      return await loadimg(url, "anonymous");
    }
  }

  function contain(g, img, s) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return false;
    const sc = Math.min(s / iw, s / ih);
    const w = iw * sc, h = ih * sc;
    g.clearRect(0, 0, s, s);
    g.drawImage(img, (s - w) / 2, (s - h) / 2, w, h);
    return true;
  }

  // desaturate + sepia + darken, with grain from stage 2
  function age(g, s, d, stage, i) {
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
  }

  async function drawfavicon(d, stage, i) {
    const t = ++token;
    let img = null;
    try { img = await geticon(baseurl()); } catch { img = null; }
    if (t !== token) return;
    const s = 32;
    const paint = () => {
      const c = document.createElement("canvas");
      c.width = c.height = s;
      const g = c.getContext("2d", { willReadFrequently: true });
      if (img) contain(g, img, s);
      age(g, s, d, stage, i);
      return c;
    };
    let url;
    try { url = paint().toDataURL("image/png"); }
    catch { img = null; url = paint().toDataURL("image/png"); }
    if (t !== token) return;
    seticon(url);
  }

})();
