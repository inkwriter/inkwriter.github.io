// ============================================================
// data/territories.js — The map
//
// To add a territory:
//   1. Add an object to this list with a unique id.
//   2. Give it x/y coordinates (0–100, percentage of the map area).
//   3. List its neighbors by id. Links are made two-way automatically,
//      so you only need to list a connection on ONE side.
//   4. Set owner to "p1", "p2", or "neutral".
//
// Fields:
//   id        unique string
//   name      display name
//   type      "plains" | "forest" | "mountain" | "tower" (see data/bonuses.js)
//   owner     starting owner id
//   troops    starting troop count
//   neighbors array of territory ids
//   x, y      map position in percent (y grows downward)
//   capital   (optional) true if this is a player's capital
//   bonus     (optional) extra flat Power income each turn
// ============================================================

const TERRITORY_DATA = [
  // --- Player 1 homeland (southwest) ---
  { id: "haven",       name: "Haven",        type: "plains",   owner: "p1", troops: 5, capital: true,
    x: 12, y: 84, neighbors: ["westfield", "greenmarch"] },
  { id: "westfield",   name: "Westfield",    type: "plains",   owner: "p1", troops: 3,
    x: 32, y: 88, neighbors: ["moonspire", "stonegate"] },
  { id: "greenmarch",  name: "Greenmarch",   type: "forest",   owner: "p1", troops: 3,
    x: 10, y: 56, neighbors: ["moonspire", "oldwood"] },
  { id: "moonspire",   name: "Moonspire",    type: "tower",    owner: "p1", troops: 3,
    x: 30, y: 64, neighbors: ["midvale"] },
  { id: "stonegate",   name: "Stonegate",    type: "mountain", owner: "p1", troops: 3,
    x: 52, y: 82, neighbors: ["midvale", "silvertower"] },

  // --- Neutral middle belt ---
  { id: "oldwood",     name: "Oldwood",      type: "forest",   owner: "neutral", troops: 2,
    x: 26, y: 34, neighbors: ["graypeak", "midvale"] },
  { id: "midvale",     name: "Midvale",      type: "plains",   owner: "neutral", troops: 3, bonus: 1,
    x: 46, y: 52, neighbors: ["silvertower", "thornfen"] },
  { id: "silvertower", name: "Silvertower",  type: "tower",    owner: "neutral", troops: 3,
    x: 64, y: 68, neighbors: ["hightower", "eastfield"] },
  { id: "graypeak",    name: "Graypeak",     type: "mountain", owner: "neutral", troops: 2,
    x: 50, y: 22, neighbors: ["thornfen", "ironridge"] },

  // --- Player 2 homeland (northeast) ---
  { id: "thornfen",    name: "Thornfen",     type: "forest",   owner: "p2", troops: 3,
    x: 68, y: 40, neighbors: ["eastfield", "ironridge"] },
  { id: "ironridge",   name: "Ironridge",    type: "mountain", owner: "p2", troops: 3,
    x: 72, y: 12, neighbors: ["citadel"] },
  { id: "eastfield",   name: "Eastfield",    type: "plains",   owner: "p2", troops: 3,
    x: 87, y: 46, neighbors: ["citadel", "hightower"] },
  { id: "hightower",   name: "Hightower",    type: "tower",    owner: "p2", troops: 3,
    x: 89, y: 74, neighbors: [] },
  { id: "citadel",     name: "Citadel",      type: "plains",   owner: "p2", troops: 5, capital: true,
    x: 89, y: 14, neighbors: [] }
];
