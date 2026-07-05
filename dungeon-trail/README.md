# ⚔️ Dungeon Trail: The Road to the Last Dungeon

A fantasy survival journey game in the spirit of **Oregon Trail**, with a
D&D adventuring-party twist. Lead four adventurers 100 miles across a
dangerous kingdom — forest, swamp, mountains, and a haunted road — and
arrive alive and strong enough to survive the Last Dungeon.

Runs 100% in the browser. No backend, no build step, no dependencies.
Just HTML, CSS, and JavaScript. Mobile-friendly, styled like a green-phosphor
CRT terminal — the way the trail was meant to be traveled.

---

## 🎮 How to Play

1. Open `index.html` in any modern browser (or visit the GitHub Pages URL).
2. Pick a difficulty. **Adventurer** is the intended experience.
3. Each press of **Travel Onward** is one day:
   - The party moves 4–8 miles and eats 1 food per living member.
   - Random encounters appear most days. Each choice is a d20 roll —
     having a living member of the right class adds **+5**.
   - Choices marked **"Always works"** never fail, but usually cost something.
4. Watch your four survival meters:
   - **FOOD** — hit 0 and the party starves (health loss every day; 5 straight days ends the run)
   - **MRLE (morale)** — hits 0, the party gives up and goes home
   - **Party health** — a member at 0 HP dies. Everyone dead = game over
   - **GOLD** — buys food, potions, rest, and healing in towns
5. A town appears once per region. Stock up — the road ahead is always worse.
6. Use potions any time to heal your most injured member (+20 HP, cures poison).
7. Reach mile 100 and survive **three final challenges** to win.

### Status Effects

| Effect | What it does |
|---|---|
| Poisoned | Loses 2 HP each day (potion or healer cures it) |
| Cursed | Party morale drains faster |
| Exhausted | Slows the whole party's travel; wears off with rest |
| Wounded | Lingering injury (healer cures it) |
| Blessed | +2 on the next dice roll, then spent |
| Inspired | Morale losses are halved while it lasts |

---

## 🌐 Hosting on GitHub Pages

1. Create a new repository on GitHub (e.g. `dungeon-trail`).
2. Upload all files, keeping the folder structure:
   ```
   index.html
   css/styles.css
   js/app.js
   js/classes.js
   js/events.js
   js/utils.js
   README.md
   ```
3. In the repo: **Settings → Pages → Source: Deploy from a branch →
   Branch: `main`, folder: `/ (root)` → Save**.
4. Your game goes live at `https://YOUR-USERNAME.github.io/dungeon-trail/`
   within a minute or two.

---

## 🛠️ Modding Guide

The whole game is designed to be edited. Everything below requires only a
text editor.

### Add a new event

Open `js/events.js` and copy any object in `EVENTS.pool`. Change the `id`
(must be unique), pick a `region` (`"Greenwood Forest"`, `"Blackfen Swamp"`,
`"Ashen Mountains"`, `"The Haunted Road"`, or `"Any"`), write your
description and choices, and save. The game picks it up automatically.

Choice rules:
- Give a choice a `difficulty` (usually 9–14) and it becomes a d20 roll.
  Add `classBonus: "Rogue"` (etc.) to grant +5 when that class is alive.
- Omit `difficulty` and the choice **always succeeds** — good for safe
  options with a built-in cost.

Effect fields (all optional, negatives subtract):
`gold`, `food`, `potions`, `morale`, `partyHealth` (spread across members),
`status: "Poisoned"` (applies to a random member), `cureStatus: "Cursed"`
(or `"All"` to cleanse everything).

### Add a new class

Open `js/classes.js` and add an entry to `CLASSES.definitions`:

```js
Paladin: {
  name: "Paladin",
  icon: "🛡️",
  maxHealth: 28,
  blurb: "Smites first, asks questions never.",
  bonus: 5
}
```

Then reference `classBonus: "Paladin"` in any event. To make it appear in
generated parties, that's it — `generateParty()` reads the class list
automatically (Fighter and Cleric are always included; edit `generateParty()`
in `classes.js` to change that).

### Adjust starting resources & tuning

Open `js/app.js` and edit the `CONFIG` object at the top:
difficulty presets, journey length (`targetDistance`), travel speed, food
consumption, encounter frequency, potion strength, and more — all in one
place with comments.

### Add regions

Add an entry to `EVENTS.regions` in `js/events.js` with `from`/`to`
distance bounds and a `townAt` mile marker, then give it some events.
If you extend past mile 100, raise `CONFIG.targetDistance` to match.

---

## 💾 How Save/Load Works

The **Save** button writes the entire game state (party, resources, day,
distance, log, statuses, seen events) as JSON to the browser's
`localStorage` under the key `dungeonTrailSave`. **Load** reads it back.

Notes:
- Saves live in the browser, per device and per site — clearing site data
  deletes them.
- Saving mid-encounter is allowed, but loading resumes at the start of a
  travel day (the pending encounter is skipped).
- Only one save slot exists. Starting a new game doesn't delete the save
  until you save again.

---

## 📁 File Map

| File | Purpose |
|---|---|
| `index.html` | Screens and layout skeleton |
| `css/styles.css` | Retro green-phosphor CRT terminal theme (mobile-first) |
| `js/utils.js` | Dice, randomness, name generator |
| `js/classes.js` | Class definitions and party generation |
| `js/events.js` | Regions, 24 encounters, towns, final dungeon |
| `js/app.js` | Game engine: daily loop, effects, save/load, rendering |

Made for the open road. Roll well. 🎲
