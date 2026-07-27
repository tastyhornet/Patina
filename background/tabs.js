// tab lifecycle: keep each tab's "last seen" fresh and survive a restart
import { withstate, stamp, normurl } from "./state.js";
import { updatebadge } from "./badge.js";
import { makealarm } from "./alarms.js";

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
export async function reconcile() {
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
