// content scripts + popup talk to the worker through here
import { withstate, stamp, normurl } from "./state.js";
import { builddash } from "./dashboard.js";
import { updatebadge } from "./badge.js";

// push new settings out to every open tab
async function pushsettings(settings) {
  const tabs = await chrome.tabs.query({});
  for (const t of tabs) chrome.tabs.sendMessage(t.id, { type: "SETTINGS", settings }).catch(() => {});
}

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
