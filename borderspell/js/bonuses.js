// ============================================================
// bonuses.js — Reads BONUS_DATA and answers rules questions:
// income, terrain effects, and which card tiers are unlocked.
// All numbers come from data/bonuses.js — none live here.
// ============================================================

const Bonuses = {
  typeInfo(type) {
    return BONUS_DATA.territoryTypes[type] || { label: type, income: 0, terrain: {}, color: "#999" };
  },

  // Power income for one territory (type income + optional flat bonus).
  territoryIncome(territory) {
    return this.typeInfo(territory.type).income + (territory.bonus || 0);
  },

  // Total Power a player collects at the start of their turn.
  playerIncome(playerId) {
    return State.territoriesOwnedBy(playerId)
      .reduce((sum, t) => sum + this.territoryIncome(t), 0);
  },

  // Troops a player may place this turn.
  reinforcementCount(playerId) {
    const owned = State.territoriesOwnedBy(playerId).length;
    return GAME_CONFIG.troopsPerTurnBase +
      Math.floor(owned / GAME_CONFIG.territoriesPerExtraTroop);
  },

  // Highest tier unlocked when owning `count` territories of a type.
  tierForCount(count) {
    let tier = 0;
    BONUS_DATA.tierUnlocks.forEach(rule => {
      if (count >= rule.owned && rule.tier > tier) tier = rule.tier;
    });
    return tier;
  },

  // Flat score bonus the defender gets from the battlefield terrain.
  terrainDefenderBonus(territory) {
    return this.typeInfo(territory.type).terrain.defenderBonus || 0;
  },

  // Extra effect/power a specific card gets from the battlefield terrain.
  // (Forest ambush for "forest"-tagged cards, tower boost for spells, etc.)
  terrainCardBonus(territory, cardDef) {
    const terrain = this.typeInfo(territory.type).terrain;
    let bonus = 0;
    if (terrain.tagBonus && (cardDef.tags || []).includes(terrain.tagBonus.tag)) {
      bonus += terrain.tagBonus.amount;
    }
    if (terrain.cardTypeBonus && cardDef.type === terrain.cardTypeBonus.cardType) {
      bonus += terrain.cardTypeBonus.amount;
    }
    return bonus;
  }
};
