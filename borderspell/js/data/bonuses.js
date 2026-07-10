// ============================================================
// data/bonuses.js — Territory types, income, and terrain bonuses
//
// To change a territory bonus, edit the numbers here.
// To add a new territory type (e.g. "swamp"):
//   1. Add an entry to territoryTypes below.
//   2. Use that type in data/territories.js.
//   3. (Optional) Add cards with requiredTerritoryType: "swamp".
//
// Terrain bonus kinds understood by the engine (js/bonuses.js):
//   defenderBonus   flat score added to the defender in this terrain
//   tagBonus        cards with a matching tag get +amount here
//   cardTypeBonus   cards of a matching type get +amount here
// ============================================================

const BONUS_DATA = {
  territoryTypes: {
    plains: {
      label: "Plains",
      income: 1,                 // Power per turn
      color: "#c9b26a",
      terrain: {}                // balanced, no bonus
    },
    forest: {
      label: "Forest",
      income: 1,
      color: "#5e8a4f",
      terrain: {
        // Cards tagged "forest" ambush for +1 here (both sides)
        tagBonus: { tag: "forest", amount: 1 }
      }
    },
    mountain: {
      label: "Mountain",
      income: 1,
      color: "#8d8d99",
      terrain: {
        // Defender gets +1 to their battle score
        defenderBonus: 1
      }
    },
    tower: {
      label: "Tower",
      income: 2,
      color: "#8a5fb0",
      terrain: {
        // Spell cards get +1 effect in tower battles (both sides)
        cardTypeBonus: { cardType: "spell", amount: 1 }
      }
    }
  },

  // Owning N territories of a type unlocks that type's cards up to this tier.
  // Add rows to allow deeper tiers later.
  tierUnlocks: [
    { owned: 1, tier: 1 },
    { owned: 2, tier: 2 },
    { owned: 3, tier: 3 }
  ]
};
