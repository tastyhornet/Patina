// per-tab and per-url "last looked at" times, saved to storage

export const statekey = "patina.state";

export const defaults = {
  enabled: true,
  threshold: 3600000, // decay starts after this much neglect (ms)
  intensity: 1.0,
  stripdecay: true, // also age the favicon + title
  forcestage: 0, // preview: hold a stage (0 = off)
};

export function normurl(url) {
  if (!url) return "";
  try { const u = new URL(url); return u.origin + u.pathname; }
  catch { return url; }
}

export async function getstate() {
  const o = await chrome.storage.local.get(statekey);
  const s = o[statekey] || {};
  return {
    settings: { ...defaults, ...(s.settings || {}) },
    tabs: s.tabs || {},
    urls: s.urls || {},
  };
}

async function setstate(st) { await chrome.storage.local.set({ [statekey]: st }); }

// serialize reads/writes so concurrent messages don't clobber each other
let lock = Promise.resolve();
export function withstate(fn) {
  const run = lock.then(async () => {
    const st = await getstate();
    const res = await fn(st);
    await setstate(st);
    return res;
  });
  lock = run.catch(() => {});
  return run;
}

export function stamp(st, tab, when) {
  if (!tab) return;
  st.tabs[tab.id] = {
    url: tab.url || st.tabs[tab.id]?.url,
    title: tab.title || st.tabs[tab.id]?.title,
    lastActive: when,
  };
  const key = normurl(tab.url);
  if (key) st.urls[key] = when;
}
