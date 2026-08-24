# CAPE CITY COMICS — Issue #0 (v0.3)

*Every run is an issue.* A top-down superhero roguelite prototype for browser.
Built under Inkwriter Studios house rules: no ES modules, no build step, plain
script tags, works from `file://`. Just open `index.html`.

## How to play
1. Open `index.html` in any modern browser.
2. On the comic cover: reroll your hero name, pick a **Core Power** (Strength,
   Speed, Energy Blasts, or Ice) and a **Support** (Grapple Lines or Healing
   Factor), then START PATROL.

## Controls
| Input | Action |
|---|---|
| WASD / arrows | Move |
| Mouse | Aim |
| LMB | Basic attack |
| RMB | Special (Strength: pick up / **throw cars**; Speed: blur strike; Blast: piercing shot; **Ice: HOLD to channel the Frost Ray**) |
| SPACE | Mobility dash (Strength Lv3: landing slam) |
| Q | Guard (75% damage reduction) |
| F | Grapple: yank an enemy or zip toward your cursor |
| G | Second power (unlocked at Level 5) |
| E | Rescue: pick up a trapped civilian / set them down somewhere safe |
| **1–5** | **Signature abilities** — each core power has 5, unlocked as that power levels up (power cap is now Lv5) |

## New in v0.3
- **Native low-res rendering**: the world draws at a true 480×300 internal
  resolution and integer-upscales 2× — crisp, deliberate pixels (no more
  downsample mush) and a much closer, Zelda-style camera.
- **16-bit detail pass**: ink outlines and eyes on every character, brick
  coursing on walls, sidewalk slabs and cracks, grass tufts and flowers,
  asphalt speckle, outlined projectiles.
- **Ice rework** — Ice's RMB is now the **FROST RAY**: hold to channel a
  continuous beam. Chill now *stacks*: keep the ray (or repeated ice shots) on
  a target and they freeze solid — works on villains too (until they adapt).
  Ice landing repeatedly on the same ground tile **builds an ice wall** (~10s),
  and yes, a getaway car will crash straight into one. Ice walls and freezes
  last longer across the board.

## New in v0.2
- **Chunky pixel pipeline**: the world renders through a nearest-neighbor
  downsample (`PIXEL_SCALE` in `js/main.js`, default 2 — set 3 for maximum crunch).
  UI text stays crisp on top.
- **Signature ability kits (keys 1–5)** per core power, e.g. Strength: Haymaker,
  Stomp, Rubble Toss, Thunderclap, TITAN IMPACT. Speed gets an Afterimage decoy
  and Time Skip; Blast gets a Pierce Beam and Nova Ring; Ice gets placeable Ice
  Walls and the fire-dousing Blizzard Dome.
- Power levels now go to **5** (XP thresholds 25 / 70 / 130 / 220).

## What's in Issue #0
- **Downtown district** (procedural 40×40 city: buildings, parks, hydrants, parked cars)
- **3 event types** on rotation: robberies, building fires with trapped civilians, getaway chases
- **Systemic destruction**: windows shatter, walls crumble to throwable rubble,
  hydrants geyser (and douse fires), ice shots extinguish flames
- **4 XP tracks in miniature**: hero levels, per-power levels (1–3), reputation
  (Beloved ↔ Menace), and collateral damage in cold hard dollars
- **Nemesis villain**: flees when hurt, ranks up, *adapts to how you fought*
  (Spike Guard vs melee, Mirror Shield vs bolts, Heated Armor vs ice, Catcher's
  Mitt vs thrown cars) and taunts you about it when they return
- **The d20**: defeat a villain and fate rolls the die — full 7-band table from
  Unstable Mutation (1) to Heroic Breakthrough (20)
- **Comic framing**: cover to start, The Daily Cape newspaper to end,
  KRAK!/WHAM! impact words throughout

## Two K.O. rule
First knockout: you wake up at HQ and your nemesis gains a rank. Second: the
issue ends — but the paper still prints, and you can keep patrolling or start
a fresh issue.

## Files
```
index.html        shell + DOM overlays (cover, d20, choices, newspaper)
css/style.css     comic-book UI styling
js/data.js        ALL content: powers, villains, adaptations, headlines
js/engine.js      input, camera, chiptune synth, particles, speech bubbles
js/game.js        world gen, destruction, fire, entities, events, nemesis
js/main.js        rendering, HUD, loop, overlay wiring
docs/             full game design document
```

## Roadmap (see docs/cape-city-comics-gdd.md §18)
v0.2: power combos, more districts, villain relationships, saves (itch.io build)
v0.3: Evolution + Random Origin modes, rival heroes, the full 30-power roster
v0.4: Mastermind finale, issue-seed sharing, release
