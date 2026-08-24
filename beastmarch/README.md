# Beastmarch: Wardens of the Thornwood

A browser prototype: top-down SNES-style action-adventure + creature capture + army building
+ a living rival system. No server, no build step — pure HTML/CSS/JS + Canvas + LocalStorage.

v0.3 — the big one. Folk bestiary (demons out, Appalachian-flavored beasts in — including
five hand-pixeled originals and THE THORNWOOD STAG, a capturable Great Beast). SNES beauty
pass: master-palette quantization, tall organic hedges, collision edge-lines, decorations,
water foam, drifting canopy shadows, fireflies, falling leaves, vignette, lantern-slime
light pools, 1.6x zoom (widens automatically in battles), and a minimap. Combat: mouse-aim
sword + bow, dodge roll, and a 15-node skill tree (Warpath / Folkcraft / Wardenship) with
Focus-powered abilities — Emberball included, and captains it burns develop a fear of fire.
Command system: field a whole warband at once, grown through renown.

Art: 0x72's Dungeon Tileset II (CC0, Robert Norenberg — https://0x72.itch.io/dungeontileset-ii)
plus original hand-pixeled sprites, all baked by `tools/bake_assets.py`.

## Run it

Unzip and open `index.html` in any browser. That's it.

## Controls

| Key | Action |
|---|---|
| WASD / Arrows | Move |
| Mouse | Aim — the Warden faces your cursor |
| LMB (hold ok) | Sword — melee cone, builds Focus on hit |
| RMB | Shortbow — arrow toward the cursor |
| Space | Dodge roll (brief invulnerability) |
| 1-4 | Abilities from the skill tree (cost Focus) |
| Tab | Field / dismiss your warband |
| K | Skill tree |
| C | Capture a weakened creature (below 35% HP, stand close) |
| E | Interact (heal at your banner for 5g; claim an undefended fort) |
| R | Roster — deploy creatures to your warband (Command budget) |
| M | Enemy captains · I | Invasion · L | Chronicle · Esc | Close/retreat |

## The loop

1. Fight wild creatures near dens. Weaken them below 35% (a gold ring appears), press **C**.
2. Open the roster (**R**). Set one creature to **follow**, others to **guard**, **train**, or **rest**.
3. Raid goblin camps. Defeat captains — some die, some *escape with scars, fears, and grudges*.
4. Captains with grudges will hunt you. Watch the War Chronicle ticker and the M screen.
5. Prep an invasion (**I**): pick up to 3 creatures. Boars and trolls smash the gate fastest.
6. Kill the fort's boss captain to take Bramblefang Fort. The warband will raid you back —
   assign guards before the countdown ends.
7. Creatures gain XP, ranks, traits (Gatebreaker, Scarred, Vengeful...), and evolve based on
   *what they actually did* — not just level.

## New in v0.3

- **The Warden progresses**: XP, levels, skill points, and Renown (captains defeated).
- **Skill tree** (K): Warpath (Cleaving Arc, Lunging Strike, passives), Folkcraft
  (Emberball, Thornsnare, Hearthlight), Wardenship (+Command, Rally, Bindmaster, Beastlord).
- **Focus**: regenerates slowly, but sword hits build it fast — weave steel and spellcraft.
- **Warband Command**: deploy multiple creatures at once (base 2, grows via the tree).
  The Stag costs 3 Command (2 with Beastlord). Tab rallies or benches the whole band.
- **The Thornwood Stag**: a Great Beast roams the wood. It cannot be bound until your
  Renown reaches 3 — earn its respect by breaking captains first.
- **Emberball feeds the nemesis system**: burn a captain and it permanently fears fire.
- **Fort wall archers** make invasions tactical — dodge, use cover, or send the boar first.

## Systems in the prototype

- **8 species**, each with one conditional evolution (e.g. Thornback Boar → Siege Boar via gate-breaking)
- **Traits** earned from battle history; they carry real combat modifiers
- **Loyalty**: neglect it and creatures desert — and return as enemy "Turncoat" captains
- **7 generated captains** with rank, personality, strength/weakness, memory, scars, fears, grudges
- **World ticker** (~75s): duels, promotions, training, taunts, revenge plots — the faction acts offscreen
- **Invasion** with a destructible gate and a boss; **base defense raids** against your banner
- **Knock-out instead of death**: injured creatures recover over 60s
- **Save/load** via LocalStorage; the map rebuilds deterministically from a stored seed

## Art pipeline

`tools/bake_assets.py` reads source frames from `tools/raw/` and bakes
`assets/atlas.png` + `assets/manifest.js`. Each species maps to a DTII character
sheet with a luminance-preserving tint (boar = brown chort, harpy = storm-blue
big demon, slime = golden muddy...), and every species gets an auto-generated
`_evo` variant with a golden rim light for its evolved form. To reskin a species,
change one line in the `CHAR` table and re-run the script.

## Extending it

- **New species**: add one entry to `data/creatures.js` (stats, sheet, evolution) + one recolor line in `tools/bake_assets.py`.
- **New traits**: add to `data/traits.js`, apply modifiers in `Combat.dealDamage`.
- **New rival events**: add branches to `Rival.tick()` in `js/rivalSystem.js`.
- **New regions**: `data/maps.js` returns a map object — add a second builder and a region
  switcher in `Game`. All spawning reads from `map.dens` / `map.camps` / `map.fort`.
- **More evolutions per species**: turn `evolution` into an array and pick the first
  matching condition in `Creatures.checkEvolution`.

## File map

```
index.html          shell + UI panels
styles.css          SNES-cartridge UI (thornwood green / bone / thorn red)
data/creatures.js   species, sprites, evolutions
data/captains.js    name parts, ranks, personalities
data/traits.js      trait definitions + modifiers
data/maps.js        Thornwood map builder (seeded)
js/util.js          RNG + helpers
js/map.js           tile render + collision
js/creatures.js     XP / level / loyalty / traits / evolution
js/captains.js      captain gen, memory, promote/demote
js/rivalSystem.js   world ticker + revenge ambushes
js/army.js          roster, assignments, desertion
js/combat.js        entities, AI, damage, capture, sprites
js/invasion.js      fort invasions + base defense raids
js/player.js        the Warden
js/save.js          LocalStorage persistence
js/game.js          state, loop, UI panels
js/sprites.js       atlas loader + animation
js/main.js          boot + input
assets/             baked atlas.png + manifest.js
tools/              bake_assets.py + raw source frames
```

## Art credits

All sprites and tiles: **0x72 — 16x16 Dungeon Tileset II** by Robert Norenberg,
released **CC0** (public domain): https://0x72.itch.io/dungeontileset-ii
Recolored variants are derived from it via `tools/bake_assets.py`.
CC0 requires no credit, but the pack is excellent — go say thanks.
