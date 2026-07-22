// keeps track of when each tab was last looked at, saves it so decay survives a
// restart, feeds the popup dashboard, and keeps the guilt badge up to date.

const statekey = "patina.state";

const defaults = {
  enabled: true,
  threshold: 3600000, // neglect (ms) before decay starts — default 1 hour
};

// stages are multiples of the threshold: 1x faded, 2x dusty, 4x cracked, 8x crumbling
function stageof(age, settings) {
  const t = settings.threshold;
  if (age < t) return 0;
  const r = age / t;
  if (r < 2) return 1;
  if (r < 4) return 2;
  if (r < 8) return 3;
  return 4;
}

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

// --- talk to content scripts + popup ---
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
      withstate((st) => stamp(st, tab, Date.now())).then(() => {
        updatebadge();
        reply && reply({ ok: true });
      });
      return true;

    case "GET_DASHBOARD":
      builddash().then(reply);
      return true;

    case "SET_SETTINGS":
      withstate((st) => {
        st.settings = { ...st.settings, ...msg.settings };
        return st.settings;
      }).then((s) => {
        pushsettings(s);
        updatebadge();
        reply(s);
      });
      return true;

    case "FOCUS_TAB":
      chrome.tabs.update(msg.tabId, { active: true });
      if (msg.windowId != null) chrome.windows.update(msg.windowId, { focused: true });
      reply && reply({ ok: true });
      return true;
  }
});

async function pushsettings(settings) {
  const tabs = await chrome.tabs.query({});
  for (const t of tabs) chrome.tabs.sendMessage(t.id, { type: "SETTINGS", settings }).catch(() => {});
}

// --- tab lifecycle ---
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const t = await chrome.tabs.get(tabId).catch(() => null);
  await withstate((st) => stamp(st, t || { id: tabId }, Date.now()));
  chrome.tabs.sendMessage(tabId, { type: "FORCE_RESTORE" }).catch(() => {});
  updatebadge();
});

chrome.tabs.onRemoved.addListener((tabId) => {
  withstate((st) => { delete st.tabs[tabId]; return true; }).then(updatebadge);
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

// tab ids change on restart, so re-seed each open tab's age from the per-url record
async function reconcile() {
  const tabs = await chrome.tabs.query({});
  await withstate((st) => {
    const next = {};
    for (const t of tabs) {
      const prev = st.tabs[t.id];
      const la = prev?.lastActive ?? st.urls[normurl(t.url)] ?? Date.now();
      next[t.id] = { url: t.url, title: t.title, lastActive: la };
    }
    st.tabs = next;
    return true;
  });
  const [act] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (act) await withstate((st) => stamp(st, act, Date.now()));
  makealarm();
  updatebadge();
}

chrome.runtime.onStartup.addListener(reconcile);
chrome.runtime.onInstalled.addListener(async () => {
  await withstate((st) => { st.settings = { ...defaults, ...st.settings }; return true; });
  chrome.action.setBadgeBackgroundColor({ color: "#7a5c33" });
  reconcile();
});

// --- housekeeping ---
function makealarm() { chrome.alarms.create("patina.tick", { periodInMinutes: 1 }); }
chrome.alarms.onAlarm.addListener((a) => {
  if (a.name !== "patina.tick") return;
  freshenactive();
  updatebadge();
});

async function freshenactive() {
  const tabs = await chrome.tabs.query({ active: true });
  if (!tabs.length) return;
  await withstate((st) => { for (const t of tabs) stamp(st, t, Date.now()); return true; });
}

makealarm();

// idea for later: auto-close tabs left crumbling for way too long
// async function reap(){ const st=await getstate(); const now=Date.now();
//   for(const t of await chrome.tabs.query({})){ const la=st.tabs[t.id]?.lastActive;
//     if(la && now-la > st.settings.threshold*40) chrome.tabs.remove(t.id); } }
