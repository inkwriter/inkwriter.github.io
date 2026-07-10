# Borderspell

Risk-style territory control on the outside, simplified card battles on the inside. Two players share one computer. Territory ownership unlocks stronger cards and spells. Capture the enemy capital to win.

Built with plain HTML, CSS, and JavaScript. No frameworks, no build tools, no dependencies.

## How to run it locally

1. Download or clone the folder.
2. Double-click `index.html`. That's it — it runs straight from the file system.

Any modern browser works. If you prefer a local server (nice for auto-reload workflows), run `python -m http.server` in the folder and open `http://localhost:8000`.

## How to host it on GitHub Pages

1. Create a repository (for example `borderspell`) and push this folder's contents to it, with `index.html` at the repository root.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set Source to **Deploy from a branch**, pick your `main` branch and the `/ (root)` folder, then save.
4. After a minute the game is live at `https://YOURNAME.github.io/borderspell/`.

The game uses plain `<script>` tags (not ES modules), so it works identically on GitHub Pages and when opened as a local file.

## How to play

Each turn runs automatically through income and card draw, then you act:

1. **Reinforce** — click your territories to place your troops (base 3, +1 per 3 territories owned).
2. **Attack** — click one of your territories with 2+ troops, then click a bordering enemy territory. You get 2 attacks per turn.
3. **Battle** — each side secretly picks up to 2 cards from their hand (the game shows a hand-off screen so the defender can pick in private), pays their Power cost, and the scores are compared:
   - Attacker score = committed troops + unit power + effects
   - Defender score = troops + terrain bonus + unit power + effects
   - Higher score wins; ties go to the defender. Both sides can take casualties.
4. **End turn.**

Owning territory types unlocks cards: 1 Tower unlocks tier 1 Tower spells, 2 Towers unlock tier 2, and so on — same for Plains, Forest, and Mountain. New unlocks are shuffled into your deck the moment you capture the territory.

The 🛠 button (bottom-right) opens the debug panel: inspect full game state, add Power/troops, draw cards, force end turn, or spin up a test battle.

## Project structure

```
index.html            page skeleton + script load order
css/styles.css        all styling
js/config.js          GAME_CONFIG — every balance number
js/data/territories.js  the map
js/data/cards.js        every card
js/data/bonuses.js      territory types, income, terrain, tier unlocks
js/data/factions.js     v2 placeholder
js/state.js           the single game-state object + helpers
js/bonuses.js         reads bonus data: income, terrain, tiers
js/cards.js           decks, hands, draw/discard, unlock pool
js/map.js             adjacency, attack validity, capture
js/turn.js            turn/phase cycle
js/battle.js          battle flow + the effect registry
js/ui.js              renders state to the screen (no rules in here)
js/debug.js           debug panel
js/app.js             startup + click wiring
```

Rule of thumb: **data lives in `js/data/` and `js/config.js`; rules live in the engine files; ui.js only draws.** If you're changing content or balance, you should never need to open an engine file.

## How to add a new territory

Open `js/data/territories.js` and add an object:

```js
{ id: "saltmarsh", name: "Saltmarsh", type: "forest", owner: "neutral", troops: 2,
  x: 40, y: 40, neighbors: ["oldwood", "midvale"] },
```

- `x`/`y` are percentages of the map area (y grows downward).
- Neighbors only need to be listed on one side — links are made two-way automatically at load.
- Optional fields: `capital: true`, `bonus: 1` (extra flat Power income).

Refresh the page and it's on the map.

## How to add a new card

Open `js/data/cards.js` and add an object:

```js
{ id: "swamp-hydra", name: "Swamp Hydra", type: "unit", cost: 4, power: 6,
  requiredTerritoryType: "forest", tier: 3, copies: 1, tags: ["beast", "forest"],
  text: "Something ancient stirs in the mire." },
```

- **Units** need `power`. **Spells/tactics** need an `effect: { action, amount }`.
- Available effect actions: `damage`, `heal`, `buffAttack`, `buffDefense`, `addTroops`, `reduceDamage`, `drawCard`, `gainPower`.
- Leave out `requiredTerritoryType` to make it a basic card everyone starts with.
- To invent a *new* effect action, add one small handler to `Battle.EFFECTS` in `js/battle.js` — that registry is the only engine code that ever needs to know an effect exists.

## How to change territory bonuses

Open `js/data/bonuses.js`. Each territory type has `income` and a `terrain` block. The engine understands three terrain bonus kinds:

- `defenderBonus: 1` — flat score for the defender (Mountain uses this)
- `tagBonus: { tag: "forest", amount: 1 }` — cards with that tag get +1 here (Forest ambush)
- `cardTypeBonus: { cardType: "spell", amount: 1 }` — cards of that type get +1 here (Tower)

You can mix them; a type can have all three. Tier unlock thresholds (`tierUnlocks`) live in the same file.

## How to adjust balance settings

Everything numeric lives in `js/config.js`: starting Power, hand sizes, cards drawn per turn, cards per battle, casualty math, reinforcements, attacks per turn, capture rewards, and player names/colors. Change a number, refresh, play.

## Design notes / v1 simplifications

- **Cards are only played during battles.** Even Power/draw cards resolve as battle plays. Playing cards during the reinforce phase is an easy v2 addition (the effect registry already supports it).
- **Ties go to the defender**, and attacking always commits all troops but one.
- **Losing a territory type doesn't remove cards you already unlocked** — forgiving, and avoids fishing cards out of hands mid-game.
- **Neutral territories** defend with troops + terrain only, no cards.
- Battles resolve in one pass — no stack, no instants, no combat phases, by design.

## Version 2 ideas

Roughly in order of effort:

- **Save/load with localStorage** — the whole game is one JSON-serializable object (`State.game`), so this is a `JSON.stringify`/`parse` pair plus two buttons.
- **Card drafting on capture** — replace the automatic capture draw with a pick-1-of-3 modal.
- **Playing cards outside battle** — allow `gainPower`/`addTroops`/`drawCard` cards during the reinforce phase.
- **Factions** — `data/factions.js` already defines the shape: starting bonuses, faction-only cards, and a named passive hook.
- **New territory types** (City, Temple, Swamp, Ruins, Port) — pure data additions plus cards for each.
- **Structures** (fort, shrine, barracks) — add a `structures` array to territories and a build action in the reinforce phase.
- **Neutral monsters** — give neutral territories a `guardianCards` list that plays automatically in defense.
- **AI opponent** — a simple greedy bot: reinforce the frontline, attack when its projected score wins.
- **Better map visuals** — the map is already SVG-backed; territory shapes/polygons could replace the chits.
- **Online multiplayer** — much later; would need a real backend.
