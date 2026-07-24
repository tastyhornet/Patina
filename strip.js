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

})();
