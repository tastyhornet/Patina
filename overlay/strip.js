// swaps the favicon + title so decay shows without opening the tab
(() => {
  const P = (window.__patina = window.__patina || {});
  const fx = P.fx;

  let links = null; // {el, orig}
  let origtitle = "";
  let token = 0;
  let lastkey = "";
  let active = false;

  // grab whatever icon links the page has, or make one
  function collect() {
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
  }

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

  const marks = ["", "", "· ", "·· ", "🕸 "];
  function stripmark(t) { return t.replace(/^(?:·+ |🕸 )/, ""); }

  async function drawfavicon(d, stage, i) {
    const t = ++token;
    let img = null;
    try { img = await fx.geticon(baseurl()); } catch { img = null; }
    if (t !== token) return;
    const s = 32;
    const paint = () => {
      const c = document.createElement("canvas");
      c.width = c.height = s;
      const g = c.getContext("2d", { willReadFrequently: true });
      if (!img || !fx.contain(g, img, s)) fx.disc(g, s);
      fx.age(g, s, d, stage, i);
      if (stage >= 3) fx.cracks(g, s, d);
      if (stage >= 4) fx.crumble(g, s, d);
      return c;
    };
    let url;
    try { url = paint().toDataURL("image/png"); }
    catch { img = null; url = paint().toDataURL("image/png"); }
    if (t !== token) return;
    seticon(url);
  }

  // called from the overlay as a tab ages
  function update(d, stage, i) {
    active = true;
    const key = stage + ":" + Math.round(d * 5); // only redraw on real change
    if (key !== lastkey) {
      lastkey = key;
      drawfavicon(d, stage, i);
    }
    const next = (marks[stage] || "") + stripmark(document.title);
    if (document.title !== next) document.title = next;
  }

  function restore() {
    if (!active) return;
    active = false;
    lastkey = "";
    token++; // cancel any pending draw
    if (links) for (const { el, orig } of links) {
      if (orig == null) el.removeAttribute("href");
      else el.setAttribute("href", orig);
    }
    const clean = stripmark(document.title);
    if (document.title !== clean) document.title = clean;
  }

  P.strip = { collect, update, restore };

  // idea for later: tint the favicon blue instead of aging it, like a tab going cold
  // strip.frost = (d) => { ... hue-rotate toward blue + white frost specks ... }
})();
