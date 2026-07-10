// ============================================================
// state.js — The single source of truth for the game
//
// Everything the game knows lives in one plain object: `game`.
// Rules modules (turn.js, battle.js, cards.js) change this object.
// ui.js only READS it and draws the screen.
// ============================================================

const State = {
  game: null, // the live game state (see createInitialState)

  // Build a brand new game from the data files.
  createInitialState() {
    // Deep-copy territory data so resets don't corrupt the originals.
    const territories = {};
    TERRITORY_DATA.forEach(t => {
      territories[t.id] = {
        id: t.id,
        name: t.name,
        type: t.type,
        owner: t.owner,
        troops: t.troops,
        neighbors: t.neighbors.slice(),
        capital: !!t.capital,
        bonus: t.bonus || 0,
        x: t.x,
        y: t.y
      };
    });

    // Players
    const players = {};
    GAME_CONFIG.players.forEach(p => {
      players[p.id] = {
        id: p.id,
        name: p.name,
        color: p.color,
        power: GAME_CONFIG.startingPower,
        deck: [],     // array of card instances { iid, cardId }
        hand: [],
        discard: [],
        unlockedCardIds: [], // recalculated from owned territories
        attacksLeft: 0,
        eliminated: false
      };
    });

    this.game = {
      territories,
      players,
      playerOrder: GAME_CONFIG.players.map(p => p.id),
      currentPlayerId: GAME_CONFIG.players[0].id,
      turnNumber: 0,
      phase: "setup",          // "reinforce" | "attack" | "gameover"
      reinforcementsLeft: 0,
      selectedTerritoryId: null,
      attackFromId: null,      // territory chosen as attack origin
      battle: null,            // active battle object (see battle.js)
      winnerId: null,
      turnLog: [],
      battleLog: [],
      nextInstanceId: 1        // counter for unique card instance ids
    };

    GameMap.normalizeNeighbors(this.game);
    return this.game;
  },

  // --- Small helpers used everywhere ---

  currentPlayer() {
    return this.game.players[this.game.currentPlayerId];
  },

  getPlayer(id) {
    return this.game.players[id];
  },

  getTerritory(id) {
    return this.game.territories[id];
  },

  territoriesOwnedBy(playerId) {
    return Object.values(this.game.territories).filter(t => t.owner === playerId);
  },

  // { plains: 2, forest: 1, ... } for a player
  territoryTypeCounts(playerId) {
    const counts = {};
    this.territoriesOwnedBy(playerId).forEach(t => {
      counts[t.type] = (counts[t.type] || 0) + 1;
    });
    return counts;
  },

  otherPlayerId(playerId) {
    return this.game.playerOrder.find(id => id !== playerId);
  },

  // Look up a card definition by id.
  cardDef(cardId) {
    return CARD_DATA.find(c => c.id === cardId);
  },

  // --- Logging ---

  logTurn(message) {
    this.game.turnLog.push({ turn: this.game.turnNumber, message });
    if (this.game.turnLog.length > 60) this.game.turnLog.shift();
  },

  logBattle(message) {
    this.game.battleLog.push({ turn: this.game.turnNumber, message });
    if (this.game.battleLog.length > 60) this.game.battleLog.shift();
  }
};
