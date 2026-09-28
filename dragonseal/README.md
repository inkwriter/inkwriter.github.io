# ⚔ Dragonseal — A Retro Top-Down Action RPG

A complete, browser-playable action RPG in the spirit of classic Zelda and
Diablo. Choose a class, fight across **10 zones**, defeat **9 bosses**
(including a 3-phase Death Knight and a 3-phase Ancient Dragon), collect
Diablo-style loot, level to 30, and restore all six dragon seals.

Real 16×16 pixel art (0x72's CC0 Dungeon Tileset II), animated characters and
monsters, procedurally generated dungeons with fixed seeds, and zero
dependencies. **No backend, no build step, no npm, no engine** — plain
HTML + CSS + JS, ready for GitHub Pages.

---

## Playing locally

Open `index.html` in any modern browser. If saves don't persist from a
`file://` page, run `python -m http.server` in the folder and visit
`http://localhost:8000`.

## Hosting on GitHub Pages

1. Create a repo and upload everything (including the `assets/` and `js/` folders).
2. Repo → **Settings → Pages** → Deploy from branch → `main`, `/ (root)`.
3. Play at `https://YOURNAME.github.io/REPONAME/`.

---

## Controls

| Input | Action |
|---|---|
| WASD / arrows | Move (8-directional) |
| Mouse | Aim |
| Left click / J | Basic attack (hold to auto-attack) |
| Space | Dodge roll — brief invincibility |
| 1–5 | Abilities (cooldown-based) |
| Q | Drink health potion |
| E | Interact — NPCs, chests, shrines, portals |
| I / K / M | Inventory / Skill tree / World map |
| Esc | Pause & controls |

## The campaign

Brightwood Village is the hub — shop, quest captain, world gate. Each combat
zone hides a boss guarding a dragon seal; kill it to unlock the next zone.
Follow the **amber compass arrow** to the boss, the **blue arrow** back to the
portal. Zones repopulate on re-entry, so any zone can be farmed for loot.

1. **Brightwood Village** — hub
2. **Brightwood Forest** (ilvl 1) — Bandit Captain
3. **Goblin Hollow** (3) — Goblin Gearmaster · *Seal 1*
4. **Crystaldeep Mines** (6) — Crystal Burrower (burrows under you!) · *Seal 2*
5. **Moonlit Marsh** (9) — Mossback Guardian (slams & roots) · *Seal 3*
6. **Skyguard Keep** (12) — Stormwing Wyvern (flies through walls) · *Seal 4*
7. **Emberfall Ruins** (15) — The Flame Knight (fire trails)
8. **Blackstone Battlefield** (18) — **The Death Knight**, 3 phases: sword duel →
   spectral court + dark banner (destroy it!) → dragon relic fire · *Seal 5*
9. **Dragonspire Peak** (22) — Cultist High Priest (teleports)
10. **Dragon's Heart** (26) — **The Ancient Dragon**, 3 phases: ground assault →
    airborne fire rain → seal-crystal shield phase · *Seal 6*

## Systems

- **3 classes × 2 subclasses** (chosen at level 6): Rogue → Assassin/Tamer,
  Knight → Champion/Sentry, Wizard → Elementalist/Summoner. Tamer and Summoner
  get permanent companions; Summoner's ultimate adds a temporary stone golem.
- **Skill trees** — class chain + 3 subclass branches; passives plus behavior
  nodes (faster dodge, piercing bolts, poisoned knives, bigger novas…).
- **Loot** — 8 gear slots, 5 rarities, random stat rolls, 9 legendaries with
  ability-modifying effects. Bosses always drop a legendary.
- Telegraphed boss attacks, burn zones, roots, freezes, stuns, poisons, crits,
  knockback, screen shake, damage numbers, boss compass, biome-tinted maps
  with darkness vignettes, animated fountain, localStorage autosave.

## Where to edit things

| Change… | File |
|---|---|
| Classes, abilities meta, skill trees | `js/data.js` |
| Ability *behavior* | `js/game.js` → `ABILITY_IMPL` |
| Enemies & AI stats | `js/data.js` → `ENEMY_TYPES` |
| Boss stats / boss attack patterns | `js/data.js` → `BOSS_TYPES` · `js/game.js` → `BOSS_AI` |
| Zones, biome tints, enemy tables, quests | `js/data.js` → `ZONES` |
| Map generation & the village layout | `js/mapgen.js` |
| Loot, rarities, legendaries | `js/data.js` |
| Sprite recolors (add new variants) | `tools/bake_assets.py` (needs Python + Pillow) |

Every generated zone uses a fixed seed (`ZONES[n].gen.seed`) — change the seed
for a new layout, and the connectivity is guaranteed by the generator design
(rooms are carved first, then linked in sequence).

## Art credits

All sprites and tiles: **[0x72 — 16×16 DungeonTileset II v1.3](https://0x72.itch.io/dungeontileset-ii)**
by Robert Norenberg, released **CC0** (public domain). The recolored variants
in `assets/extra.png` are derived from it via `tools/bake_assets.py`.
CC0 requires no credit, but the pack is excellent — go say thanks.

## Ideas for what's next

- Sound: Web Audio chiptune loop per biome + hit/pickup blips (no libraries needed).
- Elemental combos (frozen + fire = shatter bonus) — hook in `hitEnemy`.
- A blacksmith NPC: pay gold to reroll one stat on an item.
- Endless mode: after the dragon, scale ilvl per re-clear.
- Gamepad support via `navigator.getGamepads()`.

## Known limitations

- Characters flip left/right only (the tileset has no up/down facings — this
  is standard for games built on it).
- Balance is first-pass: tuned so each zone is challenging at its ilvl with
  gear from the previous zone, but not scientifically.
- Desktop keyboard + mouse only.
