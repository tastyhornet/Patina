// keeps track of when each tab was last looked at, saved so decay survives a restart

const statekey = "patina.state";

const defaults = {
  enabled: true,
  threshold: 3600000, // neglect (ms) before decay starts — default 1 hour
};

async function getstate() {
  const o = await chrome.storage.local.get(statekey);
  const s = o[statekey] || {};
  return {
    settings: { ...defaults, ...(s.settings || {}) },
    tabs: s.tabs || {},
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
  st.tabs[tab.id] = { url: tab.url, title: tab.title, lastActive: when };
}

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const t = await chrome.tabs.get(tabId).catch(() => null);
  await withstate((st) => stamp(st, t || { id: tabId }, Date.now()));
});
