// a tab you're actually looking at shouldn't age, so bump it once a minute
import { withstate, stamp } from "./state.js";
import { updatebadge } from "./badge.js";

export function makealarm() { chrome.alarms.create("patina.tick", { periodInMinutes: 1 }); }

async function freshenactive() {
  const tabs = await chrome.tabs.query({ active: true });
  if (!tabs.length) return;
  await withstate((st) => { for (const t of tabs) stamp(st, t, Date.now()); return true; });
}

chrome.alarms.onAlarm.addListener((a) => {
  if (a.name !== "patina.tick") return;
  freshenactive();
  updatebadge();
});
