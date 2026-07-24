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

})();
