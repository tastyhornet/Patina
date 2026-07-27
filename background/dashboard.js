// data for the popup's hall of neglect, worst tab first
import { getstate, normurl } from "./state.js";
import { stageof } from "./stages.js";

export async function builddash() {
  const st = await getstate();
  const now = Date.now();
  const tabs = await chrome.tabs.query({});
  const list = tabs.map((t) => {
    const la = st.tabs[t.id]?.lastActive ?? st.urls[normurl(t.url)] ?? now;
    const age = now - la;
    return {
      id: t.id,
      windowId: t.windowId,
      title: t.title || t.url || "(untitled)",
      url: t.url || "",
      favIconUrl: t.favIconUrl || "",
      age,
      stage: t.active ? 0 : stageof(age, st.settings),
      active: t.active,
    };
  }).sort((a, b) => b.age - a.age);
  return { settings: st.settings, list };
}
