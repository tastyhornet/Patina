// the toolbar guilt number — how many background tabs are decaying
import { getstate, normurl } from "./state.js";
import { stageof } from "./stages.js";

export async function updatebadge() {
  const st = await getstate();
  const now = Date.now();
  const tabs = await chrome.tabs.query({});
  let n = 0;
  for (const t of tabs) {
    if (t.active) continue;
    const la = st.tabs[t.id]?.lastActive ?? st.urls[normurl(t.url)];
    if (la != null && stageof(now - la, st.settings) >= 1) n++;
  }
  chrome.action.setBadgeText({ text: n ? String(n) : "" });
}
