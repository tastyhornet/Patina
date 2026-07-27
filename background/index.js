// worker entry — pulls in each piece and wires the startup hooks
import { reconcile } from "./tabs.js";
import { makealarm } from "./alarms.js";
import { withstate, defaults } from "./state.js";
import "./messaging.js";

chrome.runtime.onStartup.addListener(reconcile);
chrome.runtime.onInstalled.addListener(async () => {
  await withstate((st) => { st.settings = { ...defaults, ...st.settings }; return true; });
  chrome.action.setBadgeBackgroundColor({ color: "#7a5c33" });
  reconcile();
});

makealarm();

// idea for later: auto-close tabs left crumbling for way too long
// async function reap(){ const st=await getstate(); const now=Date.now();
//   for(const t of await chrome.tabs.query({})){ const la=st.tabs[t.id]?.lastActive;
//     if(la && now-la > st.settings.threshold*40) chrome.tabs.remove(t.id); } }
