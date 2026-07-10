// ============================================================
// app.js — Entry point: starts the game and wires up clicks
//
// Pattern: every click calls a rules function (Turn/Battle/etc.),
// shows the reason if the action was invalid, then re-renders.
// ============================================================

const App = {
  init() {
    Turn.startGame();
    this.bindEvents();
    UI.render();
  },

  reset() {
    Turn.startGame();
    UI.render();
  },

  bindEvents() {
    // --- Map clicks (event delegation on the tiles container) ---
    document.getElementById("map-tiles").addEventListener("click", e => {
      const tile = e.target.closest("[data-territory]");
      if (!tile) return;
      this.onTerritoryClick(tile.dataset.territory);
    });

    // --- Header buttons ---
    document.getElementById("btn-skip-reinforce").addEventListener("click", () => {
      Turn.beginAttackPhase();
      UI.render();
    });
    document.getElementById("btn-end-turn").addEventListener("click", () => {
      Turn.endTurn();
      UI.render();
    });
    document.getElementById("btn-reset").addEventListener("click", () => this.reset());

    // --- Battle modal (delegated: modal is re-rendered constantly) ---
    document.getElementById("battle-overlay").addEventListener("click", e => {
      const card = e.target.closest("[data-card]");
      if (card) {
        const result = Battle.togglePick(card.dataset.card);
        if (!result.ok) UI.flash(result.reason);
        UI.render();
        return;
      }
      const action = e.target.closest("[data-action]");
      if (!action) return;
      if (action.dataset.action === "commit-cards") Battle.commitCards();
      if (action.dataset.action === "begin-defense") Battle.beginDefenderPicks();
      if (action.dataset.action === "close-battle") Battle.close();
      UI.render();
    });

    // --- Game over banner ---
    document.getElementById("gameover-banner").addEventListener("click", e => {
      if (e.target.closest("[data-action='reset']")) this.reset();
    });

    // --- Debug panel ---
    document.getElementById("debug-toggle").addEventListener("click", () => Debug.toggle());
    document.getElementById("debug-reset").addEventListener("click", () => this.reset());
    document.getElementById("debug-power").addEventListener("click", () => { Debug.addPower(); UI.render(); });
    document.getElementById("debug-draw").addEventListener("click", () => { Debug.drawCard(); UI.render(); });
    document.getElementById("debug-troops").addEventListener("click", () => { Debug.addTroops(); UI.render(); });
    document.getElementById("debug-endturn").addEventListener("click", () => { Debug.forceEndTurn(); UI.render(); });
    document.getElementById("debug-battle").addEventListener("click", () => { Debug.testBattle(); UI.render(); });
  },

  // Route a territory click based on the current phase.
  onTerritoryClick(territoryId) {
    const g = State.game;
    if (g.battle) return;              // no map actions mid-battle
    g.selectedTerritoryId = territoryId; // always update the details panel

    if (g.phase === "reinforce") {
      const t = State.getTerritory(territoryId);
      if (t.owner === g.currentPlayerId) {
        const result = Turn.placeTroop(territoryId);
        if (!result.ok) UI.flash(result.reason);
      }
      // Clicking enemy/neutral land in this phase just inspects it.
    } else if (g.phase === "attack") {
      const result = Turn.handleAttackClick(territoryId);
      if (!result.ok) UI.flash(result.reason);
    }

    UI.render();
  }
};

// Start once the page is ready.
document.addEventListener("DOMContentLoaded", () => App.init());
