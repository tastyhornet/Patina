// keeps track of when each tab was last looked at, saved so decay survives a restart

const statekey = "patina.state";

const defaults = {
  enabled: true,
  threshold: 3600000, // neglect (ms) before decay starts — default 1 hour
};

function normurl(url) {
  if (!url) return "";
  try { const u = new URL(url); return u.origin + u.pathname; }
  catch { return url; }
}

async function getstate() {
  const o = await chrome.storage.local.get(statekey);
  const s = o[statekey] || {};
  return {
    settings: { ...defaults, ...(s.settings || {}) },
    tabs: s.tabs || {}, // {tabid: {url, title, lastActive}}
    urls: s.urls || {}, // {url: lastActive} — restart fallback
  };
}
async function setstate(st) { await chrome.storage.local.set({ [statekey]: st }); }

// serialize reads/writes so concurrent messages don't clobber each other
let lock = Promise.resolve();
function withstate(fn) {
  const run = lock.then(async () => {
    const st = await getstate();
    const res = await fn(st);
    await setstate(st);
    return res;
  });
  lock = run.catch(() => {});
  return run;
}

function stamp(st, tab, when) {
  if (!tab) return;
  st.tabs[tab.id] = {
    url: tab.url || st.tabs[tab.id]?.url,
    title: tab.title || st.tabs[tab.id]?.title,
    lastActive: when,
  };
  const key = normurl(tab.url);
  if (key) st.urls[key] = when;
}

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const t = await chrome.tabs.get(tabId).catch(() => null);
  await withstate((st) => stamp(st, t || { id: tabId }, Date.now()));
});

chrome.tabs.onRemoved.addListener((tabId) => {
  withstate((st) => { delete st.tabs[tabId]; return true; });
});

chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.url || info.title) {
    withstate((st) => {
      const prev = st.tabs[tabId];
      stamp(st, tab, prev?.lastActive ?? Date.now());
      return true;
    });
  }
});

// --- talk to content scripts ---
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  const tab = sender.tab;

  switch (msg?.type) {
    case "HELLO": // content boots, asks how neglected it is
      withstate((st) => {
        let la = tab ? st.tabs[tab.id]?.lastActive : undefined;
        if (la == null && tab) la = st.urls[normurl(tab.url)];
        if (la == null) la = Date.now();
        stamp(st, tab, la);
        return { lastActive: la, settings: st.settings };
      }).then(reply);
      return true;

    case "REPORT": // content tells us when it was last visible
      withstate((st) => stamp(st, tab, msg.lastActive)).then(() => reply && reply({ ok: true }));
      return true;

    case "RESET": // tab was visited, it's fresh again
      withstate((st) => stamp(st, tab, Date.now())).then(() => reply && reply({ ok: true }));
      return true;
  }
});
