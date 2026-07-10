// ============================================================
// config.js — Game balance settings
// Change numbers here to rebalance the game. No code changes needed.
// ============================================================

const GAME_CONFIG = {
  // --- Economy ---
  startingPower: 3,        // Power each player begins the game with
  startingHandSize: 5,     // Cards drawn at game start
  maxHandSize: 8,          // Drawing past this discards the drawn card
  cardsDrawnPerTurn: 1,    // Cards drawn automatically at start of turn

  // --- Battles ---
  maxCardsPlayedPerBattle: 2, // Cards each side may play in one battle
  casualtyDivisor: 3,         // Losses = floor(enemyScore / casualtyDivisor)
  attacksPerTurn: 2,          // Attacks allowed per turn

  // --- Reinforcements ---
  troopsPerTurnBase: 3,          // Base troops to place each turn
  territoriesPerExtraTroop: 3,   // +1 troop per this many territories owned

  // --- Rewards & win condition ---
  captureRewardCards: 1,          // Cards drawn after capturing a territory
  winCondition: "captureCapital", // v1 supports only this condition

  // --- Players ---
  players: [
    { id: "p1", name: "Player 1", color: "#b23a2e" },
    { id: "p2", name: "Player 2", color: "#2e5cb2" }
  ],
  neutral: { id: "neutral", name: "Neutral", color: "#7d7a6c" }
};
