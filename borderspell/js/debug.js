// ============================================================
// debug.js — Collapsible debug panel for testing
// ============================================================

const Debug = {
  open: false,

  toggle() {
    this.open = !this.open;
    this.render();
  },

  render() {
    const panel = document.getElementById("debug-panel");
    panel.classList.toggle("open", this.open);
    if (!this.open) return;

    const stateEl = document.getElementById("debug-state");
    // Show a compact copy of the state (drop x/y noise from territories).
    stateEl.textContent = JSON.stringify(State.game, (key, value) =>
      (key === "x" || key === "y") ? undefined : value, 2);
  },

  // --- Debug actions (wired up in app.js) ---

  addPower() {
    State.currentPlayer().power += 5;
    State.logTurn(`[debug] ${State.currentPlayer().name} gains 5 Power.`);
  },

  drawCard() {
    Cards.draw(State.game.currentPlayerId, 1);
    State.logTurn(`[debug] ${State.currentPlayer().name} draws a card.`);
  },

  addTroops() {
    const id = State.game.selectedTerritoryId;
    if (!id) {
      UI.flash("[debug] Select a territory first.");
      return;
    }
    State.getTerritory(id).troops += 3;
    State.logTurn(`[debug] +3 troops in ${State.getTerritory(id).name}.`);
  },

  forceEndTurn() {
    State.game.battle = null; // abandon any battle in progress
    Turn.endTurn();
  },

  // Start a real battle from the first legal attack found.
  testBattle() {
    const g = State.game;
    if (g.battle) {
      UI.flash("[debug] A battle is already running.");
      return;
    }
    const pid = g.currentPlayerId;
    for (const t of State.territoriesOwnedBy(pid)) {
      if (!GameMap.canAttackFrom(pid, t.id).ok) continue;
      const target = t.neighbors.find(nId => State.getTerritory(nId).owner !== pid);
      if (target) {
        g.phase = "attack";
        g.attackFromId = t.id;
        State.logTurn(`[debug] Test battle: ${t.name} → ${State.getTerritory(target).name}.`);
        Battle.start(t.id, target);
        return;
      }
    }
    UI.flash("[debug] No legal attack found for the current player.");
  }
};
