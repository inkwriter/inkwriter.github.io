# 🌾 Homestead Hollow

A cozy, original, single-player farming game that runs entirely in your browser. Plant crops, wait for them to grow (they keep growing even while the tab is closed), harvest them for coins and XP, buy better seeds, decorate your farm, and expand your land.

Built for the long haul: 10 crops across 10 levels (including overnight growers), two land expansions, decorations with gentle farm-wide bonuses, a daily gift, a lifetime crop almanac, 13 badges — and a **Seasons** system where finishing a farm earns a permanent 🌟 Heirloom Star and starts a fresh one, a little richer each time.

No accounts. No servers. No build tools. Just HTML, CSS, and vanilla JavaScript, with your save stored in your own browser.

## How to run it locally

1. Download or clone this folder.
2. Open `index.html` in any modern browser. That's it.

> Tip: if you want to serve it (optional), any static server works, e.g. `python -m http.server` from the project folder, then visit `http://localhost:8000`.

## How to host it on GitHub Pages

1. Create a new GitHub repository and push these files to it (keep the folder structure as-is, with `index.html` at the root).
2. In the repo, go to **Settings → Pages**.
3. Under **Source**, choose **Deploy from a branch**, pick your branch (usually `main`) and the `/ (root)` folder, then save.
4. After a minute or two, your game will be live at `https://YOUR-USERNAME.github.io/YOUR-REPO/`.

No Node, npm, build steps, API keys, or server code required.

## How the save system works

- The entire game state (grid, coins, XP, level, decorations, timestamps, settings) is one JSON object saved to **LocalStorage** under the key `homestead-hollow-save-v1`.
- The game autosaves every minute, after every meaningful action (plant, harvest, purchase), and when the tab is hidden or closed.
- **Offline growth:** crops store the timestamp when they were planted. Growth is always computed as `(now - plantedAt) / growTime`, so when you come back after closing the browser, anything that finished while you were away is ready to harvest.
- **Export** opens a dialog where you can copy the save JSON to your clipboard or download it as a file. **Import** opens the same dialog to paste JSON or load a downloaded save file (a real dialog is used instead of `prompt()` because some mobile browsers truncate long pasted text). **Reset** wipes everything after a confirmation.
- Saves are per-browser and per-site. Clearing site data in your browser will delete the save — export first if you care about it!

## How to add a new crop

Open `js/data.js` and add an object to the `CROPS` array:

```js
{
  id: "tomato",          // unique, lowercase, no spaces
  name: "Tomatoes",
  icon: "🍅",            // any emoji
  seedCost: 30,          // coins to plant
  sellValue: 66,         // coins on harvest
  xp: 22,                // XP on harvest
  growTime: 600,         // seconds of real time (600 = 10 minutes)
  unlockLevel: 3,        // player level required
  description: "Juicy and dependable."
}
```

Save the file and refresh — the crop appears in the seed shop automatically. No other code changes needed.

## How to add a new decoration

Same idea, in the `DECORATIONS` array in `js/data.js`:

```js
{
  id: "windmill",
  name: "Windmill",
  icon: "🌀",
  cost: 200,
  unlockLevel: 5,
  effect: { type: "sell", pct: 2 },  // or { type: "xp", pct: N }, or null for cosmetic
  description: "Spins majestically in the breeze."
}
```

Decorations with an `effect` add a small farm-wide bonus while placed: `sell` boosts coin payouts, `xp` boosts XP gains. Bonuses from all placed decorations stack, capped at `BONUS_CAP` percent per type, and show up as the ✨ pill in the HUD.

## How to change grow times, prices, and balance

Everything tunable lives in `js/data.js`:

- **Crop stats:** edit `seedCost`, `sellValue`, `xp`, `growTime` (seconds), and `unlockLevel` on any crop.
- **Decoration prices:** edit `cost` and `unlockLevel` on any decoration.
- **Starting money:** `STARTING_COINS`.
- **Leveling speed:** `XP_PER_LEVEL` (default 100 XP per level).
- **Farm size:** `GRID_SIZE` (total grid) and `START_SIZE` (unlocked at start). Note: changing grid size invalidates old saves by design — the loader checks tile count.
- **Expansions:** the `EXPANSIONS` array — each entry is a `{ size, cost, name }` tier. Add a third tier by making the grid bigger and appending an entry.
- **Leveling curve:** `xpNeededFor(level)` — the XP needed to climb each level. Default is `100 + (level-1) * 50`, so early levels are quick and later ones are earned.
- **Seasons:** `SEASON_MIN_LEVEL` (when New Season unlocks) and `STAR_SELL_BONUS` (percent per Heirloom Star).
- **Daily gift:** `DAILY_GIFT_BASE` and `DAILY_GIFT_PER_LEVEL`.
- **Decoration bonuses:** each decoration's `effect` field, e.g. `{ type: "sell", pct: 2 }` or `{ type: "xp", pct: 3 }` (or `null` for pure cosmetics). Total bonuses are capped by `BONUS_CAP` per type.

## Project structure

```
/index.html        page structure
/css/styles.css    all styling (palette, tiles, day/night sky, responsive layout)
/js/data.js        game content: crops, decorations, achievements, constants
/js/storage.js     save / load / export / import (LocalStorage)
/js/farm.js        grid logic: planting, growing, harvesting, moving, deleting
/js/shop.js        shop tabs, seed & decoration selection
/js/app.js         startup, HUD, tools, toasts, sound, day/night, achievements
```

Scripts are plain files loaded in order (no ES modules), so it works when opened straight from the filesystem *and* on GitHub Pages with zero configuration.

## The long game (replayability)

- **Seasons:** at level 10, the shop's Decorations tab offers 🌸 **New Season**. Accepting retires the farm — coins, XP, tiles, and expansions reset — in exchange for a permanent 🌟 **Heirloom Star** worth +10% sell value on everything, forever. Farm name, badges, sound setting, and the almanac all carry over. Stars stack, so a third-season farm earns 20% more than a first-season one.
- **Almanac:** every crop tracks its lifetime harvest total (shown on its seed card), and totals survive seasons — "Grown 214" wheat is a quiet little trophy.
- **Daily gift:** the first visit each calendar day grants a small coin present that scales with level. A gentle reason to check in with the farm each morning.

## Extras included

- 🌗 The page background tints with the real time of day (dawn/day/dusk/night).
- 🏷️ Click the farm name on the sign to rename your farm.
- 🏅 Thirteen achievement badges (hover them to see how to earn each one).
- 🔊 Tiny synthesized sound effects (no audio files) with a mute toggle.
- 🗺️ Two land expansion tiers (6×6 → 8×8 → 10×10).
- 🌦️ A random, purely cosmetic weather line in the header.
- 🧺✨ A **Harvest All** button that collects every ready crop with one click.
- 🕳️ The Delete tool can also **dig up planted crops** (confirmed, no refund), so a misplanted slow crop isn't a long mistake.

Have fun, and happy farming! 🧑‍🌾
