// ============================================================
// map.js — Map questions: adjacency, valid attacks, capture
// ============================================================

const GameMap = {
  // Territory data only needs neighbors listed on one side.
  // This makes every link two-way so the rest of the code can trust it.
  normalizeNeighbors(game) {
    Object.values(game.territories).forEach(t => {
      t.neighbors.forEach(nId => {
        const n = game.territories[nId];
        if (!n) {
          console.warn(`Territory "${t.id}" lists unknown neighbor "${nId}".`);
          return;
        }
        if (!n.neighbors.includes(t.id)) n.neighbors.push(t.id);
      });
    });
  },

  areNeighbors(idA, idB) {
    return State.getTerritory(idA).neighbors.includes(idB);
  },

  // Can `playerId` launch an attack FROM this territory?
  // Returns { ok, reason } so the UI can explain refusals.
  canAttackFrom(playerId, territoryId) {
    const t = State.getTerritory(territoryId);
    if (t.owner !== playerId) return { ok: false, reason: "You don't own that territory." };
    if (t.troops < 2) return { ok: false, reason: "You need at least 2 troops to attack (1 must stay behind)." };
    const hasEnemyNeighbor = t.neighbors.some(nId => State.getTerritory(nId).owner !== playerId);
    if (!hasEnemyNeighbor) return { ok: false, reason: "No enemy territories border it." };
    return { ok: true };
  },

  // Can the current attack origin hit this target?
  canAttackTarget(playerId, fromId, targetId) {
    const target = State.getTerritory(targetId);
    if (target.owner === playerId) return { ok: false, reason: "You already own that territory." };
    if (!this.areNeighbors(fromId, targetId)) return { ok: false, reason: "That territory doesn't border your attack origin." };
    return { ok: true };
  },

  // Hand a territory to a new owner with the given troops,
  // then refresh both sides' card unlocks and check for a win.
  captureTerritory(territoryId, newOwnerId, troops) {
    const t = State.getTerritory(territoryId);
    const oldOwnerId = t.owner;
    t.owner = newOwnerId;
    t.troops = troops;

    Cards.refreshUnlocks(newOwnerId);
    // Note: losing territories doesn't remove already-unlocked cards in v1.

    if (t.capital && oldOwnerId !== "neutral") {
      Turn.declareWinner(newOwnerId, `${State.getPlayer(newOwnerId).name} captured the enemy capital, ${t.name}!`);
    }
  }
};
