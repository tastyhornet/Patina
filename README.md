# Patina

Tabs you stop looking at start to rot. They fade, pick up grain and dust, crack, and eventually crumble like something you left in a sunny window for a month. Open one again and it snaps back to normal.

## Why I made this

I'm a tab hoarder. Like 40 open at any time, half of them "I'll read that later" articles I never read. Closing them feels wrong, keeping them feels worse.

So instead of another "you have too many tabs" nag, I wanted the tabs themselves to look guilty. Ignore one long enough and its little favicon starts falling apart in the strip. Weirdly, it works on me.

Same core idea as a few "tab decay" extensions floating around, but I took it in an aged-paper direction and did the aging with real canvas work instead of a flat filter.

## How rotten it gets

Neglect is measured in multiples of a threshold you pick. Call it `t`.

| After | Stage | What you see |
|-------|-------|--------------|
| `1×t` | Faded | warm sepia wash, soft vignette |
| `2×t` | Dusty | film grain creeps in, colours drain |
| `4×t` | Cracked | fracture lines spider across the page |
| `8×t` | Crumbling | drifting ash, almost monochrome |

The fade underneath is a smooth curve (a log thing), so a tab keeps darkening between the named stages instead of jumping. Four stages, but really a slider.

## It doesn't touch your pages

This was the part I cared about most. The decay is a `pointer-events: none` overlay in a closed shadow DOM, drawn with `backdrop-filter`.

I never put a `filter` on the page root, because that quietly breaks every `position: fixed` header on the web. Clicks and scrolls pass straight through, and the page's own JavaScript never knows it's there. It runs at `document_idle`, so it's not fighting the page load either.

## The tab-strip trick

Here's the thing nobody can get around: Chrome won't let an extension paint the actual tab strip. That's browser furniture, hands off. But a parked background tab is exactly where you only ever see its favicon and title. So Patina ages those instead.

- The favicon gets redrawn on a canvas, Fresh to Crumbling, and swapped in live. Reopen the tab, original comes back.
- The title picks up a small marker at the rougher stages (`· `, then `·· `, then `🕸 `).

If a favicon can't be read (rare cross-origin case) it falls back to a generic aged disc so you still get the signal. Toggle the whole thing with "Age the favicon & title too" in the popup.

## Poking around the code

| File | What it's doing |
|------|-----------------|
| `manifest.json` | MV3 wiring |
| `background.js` | remembers when each tab was last seen, saves it, runs the badge + dashboard |
| `strip.js` | favicon + title aging (the canvas stuff) |
| `content.js` | the page overlay and the restore bloom |
| `popup.*` | the Hall of Neglect list + settings |
| `icons/` | cracked-parchment icons |

`background.js` is the one that matters for surviving a restart. Tab IDs get reshuffled when Chrome reopens, so it also keeps a per-URL record and re-seeds each tab's age from that on startup. Otherwise every rotten tab would come back shiny.

## Running it yourself

1. Go to `chrome://extensions`
2. Flip on Developer mode (top right)
3. Load unpacked, pick this folder
4. Set the threshold to "5 seconds (test)" in the popup, open a couple tabs, click away, and watch one rot in real time

Chromium browsers all work (Chrome, Edge, Brave). Firefox loads it too from `about:debugging`, just swap the MV3 background line to `"background": { "scripts": ["background.js"] }`.

## Settings

In the popup:

- **Decay begins after**: 5s and 15s test speeds for messing around, then 1 min / 15 min / 1 hour / 6 hours / 1 day / 1 week for real use
- **Intensity**: how hard it hits
- **Age the favicon & title too**: the tab-strip aging on or off

There's a Hall of Neglect list under that, tabs ranked by how long you've ignored them, worst on top. Click one to jump to it (and restore it). The toolbar badge just counts how many are currently rotting, in case you needed the guilt number.

## Publishing it

If you want this on the Chrome Web Store, the store side needs a dev account ($5 one-time, with an ID check) and a review pass before it goes live. Rough steps:

1. Zip the folder contents (the files, not the wrapping folder)
2. Register on the Chrome Web Store dev dashboard
3. Upload, write the listing, note that it stores nothing off-device
4. Submit, wait for review, share the link once it's live

Firefox's AMO is free if you'd rather go that route.

## Your data

Stays on your machine. The only thing saved is a timestamp per tab and per URL for "last looked at," in `chrome.storage.local`. Nothing leaves the browser. No analytics, no accounts, none of that.
