// ============================================================
// data/factions.js — Factions (v2 placeholder)
//
// Factions are not used in v1. This file exists so the data shape
// is agreed on now and the engine can adopt it later without a
// restructure. A faction will eventually grant:
//   - a starting bonus
//   - a few faction-only cards (by card id)
//   - a passive rule handled by a named hook in the engine
// ============================================================

const FACTION_DATA = [
  {
    id: "none",
    name: "Unaligned",
    description: "No faction bonuses. Used by all players in v1.",
    startingBonus: {},          // e.g. { power: 2 } or { troops: 2 }
    factionCards: [],           // card ids added to this faction's pool
    passive: null               // e.g. "forestIncomePlusOne" (v2 hook name)
  }
];
