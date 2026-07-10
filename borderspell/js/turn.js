// ============================================================
// turn.js — The turn cycle
//
// A turn runs:
//   1. startTurn(): gain Power, draw cards      (automatic)
//   2. "reinforce" phase: place troops           (player clicks)
//   3. "attack" phase: launch battles            (player clicks)
//   4. endTurn(): pass to the next player
// ============================================================

const Turn = {
  // Kick off a brand new game.
  startGame() {
    State.createInitialState();
    const g = State.game;

    g.playerOrder.forEach(pid => {
      Cards.buildStartingDeck(pid);
      Cards.draw(pid, GAME_CONFIG.startingHandSize);
    });

    State.logTurn("A new game begins. Capture the enemy capital to win!");
    this.startTurn(g.playerOrder[0]);
  },

  // Begin a player's turn: income + draw, then reinforce phase.
  startTurn(playerId) {
    const g = State.game;
    g.currentPlayerId = playerId;
    g.turnNumber += 1;
    g.selectedTerritoryId = null;
    g.attackFromId = null;

    const player = State.currentPlayer();

    // 1. Gain Power from territories
    const income = Bonuses.playerIncome(playerId);
    player.power += income;

    // 2. Draw card(s)
    Cards.draw(playerId, GAME_CONFIG.cardsDrawnPerTurn);

    // 3. Grant reinforcements and attacks for the turn
    g.reinforcementsLeft = Bonuses.reinforcementCount(playerId);
    player.attacksLeft = GAME_CONFIG.attacksPerTurn;

    g.phase = "reinforce";
    State.logTurn(`— ${player.name}'s turn. +${income} Power, drew ${GAME_CONFIG.cardsDrawnPerTurn} card, ${g.reinforcementsLeft} troops to place.`);
  },

  // Reinforce phase: click an owned territory to place one troop.
  // Returns { ok, reason } so the UI can explain problems.
  placeTroop(territoryId) {
    const g = State.game;
    if (g.phase !== "reinforce") return { ok: false, reason: "You can only place troops in the Reinforce phase." };
    if (g.reinforcementsLeft <= 0) return { ok: false, reason: "No reinforcements left." };

    const t = State.getTerritory(territoryId);
    if (t.owner !== g.currentPlayerId) return { ok: false, reason: "You can only reinforce territories you own." };

    t.troops += 1;
    g.reinforcementsLeft -= 1;
    if (g.reinforcementsLeft === 0) {
      State.logTurn(`${State.currentPlayer().name} finished placing troops.`);
      this.beginAttackPhase();
    }
    return { ok: true };
  },

  // Move on to the attack phase (also used by the "skip" button).
  beginAttackPhase() {
    const g = State.game;
    if (g.reinforcementsLeft > 0) {
      State.logTurn(`${State.currentPlayer().name} skips ${g.reinforcementsLeft} unplaced troops.`);
      g.reinforcementsLeft = 0;
    }
    g.phase = "attack";
  },

  // Attack phase: first click picks the origin, second picks the target.
  handleAttackClick(territoryId) {
    const g = State.game;
    const pid = g.currentPlayerId;
    const player = State.currentPlayer();
    const t = State.getTerritory(territoryId);

    // Clicking one of your own territories (re)selects the attack origin.
    if (t.owner === pid) {
      const check = GameMap.canAttackFrom(pid, territoryId);
      if (!check.ok) return check;
      g.attackFromId = territoryId;
      return { ok: true };
    }

    // Clicking an enemy territory launches the attack.
    if (!g.attackFromId) return { ok: false, reason: "Select one of your territories to attack from first." };
    if (player.attacksLeft <= 0) return { ok: false, reason: "No attacks left this turn." };

    // The origin may have emptied out after an earlier battle this turn.
    const originCheck = GameMap.canAttackFrom(pid, g.attackFromId);
    if (!originCheck.ok) {
      g.attackFromId = null;
      return { ok: false, reason: `Pick a new attack origin. ${originCheck.reason}` };
    }

    const check = GameMap.canAttackTarget(pid, g.attackFromId, territoryId);
    if (!check.ok) return check;

    player.attacksLeft -= 1;
    Battle.start(g.attackFromId, territoryId);
    return { ok: true };
  },

  // 7. End turn — pass play to the next surviving player.
  endTurn() {
    const g = State.game;
    if (g.phase === "gameover") return;
    if (g.battle) return; // can't end turn mid-battle

    State.logTurn(`${State.currentPlayer().name} ends their turn.`);
    const idx = g.playerOrder.indexOf(g.currentPlayerId);
    const nextId = g.playerOrder[(idx + 1) % g.playerOrder.length];
    this.startTurn(nextId);
  },

  declareWinner(playerId, message) {
    const g = State.game;
    g.phase = "gameover";
    g.winnerId = playerId;
    g.battle = null;
    State.logTurn(message);
    State.logBattle(message);
  }
};
