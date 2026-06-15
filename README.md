# STILLWATER — a cozy lake-fishing game

A vertical, touch-first fishing game in the spirit of *Cast n Chill*, built as a single
self-contained `index.html`. Drift the boat with deep parallax, drop into a split-screen
underwater view to fish, watch the day pass, and reel in everything from bluegill to a
lake sturgeon.

## Play / Deploy
- **Just open `index.html`** in any browser. Everything (art + code) is inlined — no server needed.
- **Deploy:** drop `index.html` into a GitHub repo and point Vercel / Cloudflare Pages at it. One file.
- **On iPhone:** open the deployed URL in Safari → Share → *Add to Home Screen*. It launches
  fullscreen like a native app (PWA meta + safe-area insets for the notch & home indicator are handled).

## Controls
- **Cruise:** left / right arrows drive the boat (release to coast to a stop anywhere). **CAST LINE** drops you into fishing.
- **Fishing:** drag in the water to set your lure depth, `<  >` swaps lures, **HOLD TO REEL**.
  When a fish bites it fights — keep reeling, but when it **struggles** (gold burst, button turns
  red "LET IT RUN") release or the line snaps. Reel it to the surface to land it.
- **Top bar:** clock (tap to scrub time / pick Dawn·Noon·Golden·Night), coins, menu, sound.

## Editing
This `dist/` folder is the **editable source**:
- `game.js`   — all game logic (well-sectioned).
- `assets/`   — every sprite as a separate PNG (swap art freely, keep the filenames).
- `build.py`  — re-inlines `game.js` + `assets/` back into `index.html`.

```
python3 build.py     # after editing game.js or any asset
```

### Quick knobs (top of game.js)
- `SPECIES[]`  — fish: depth band, rarity, value, fight difficulty, which lures attract them, night-only flag.
- `LURES[]`    — bait: cost + default depth.
- `S.dayLen`   — real seconds for a full 24h cycle (default 600 = 10 min/day).
- `SKY[]`      — time-of-day color keyframes (sky top, horizon, water, ambient light, stars).
- `CHAR_HSL`   — the angler outfit colors (recolored from the denim shirt at runtime via masks).

### Dev console (in the browser)
`SW.s` (live state), `SW.time(18.2)`, `SW.money(500)`, `SW.forceCatch()`, `SW.scene()`.

## Ideas to extend
- New **locations**: clone the scenery seed + swap `mountains/treeline/shoreline` art and the `SPECIES` pool per area; gate them behind coins.
- **Weather** (rain/fog overlays), a **dog companion**, an **idle/auto-fish** toggle, a **photo mode**.
- Real PWA install: add a `manifest.json` + icon and a tiny service worker to cache `index.html`.
