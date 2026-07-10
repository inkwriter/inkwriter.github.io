// ============================================================
// cards.js — Decks, hands, and the territory-based card pool
//
// Each player's deck contains card INSTANCES ({ iid, cardId }) so
// duplicate copies can be told apart. Definitions stay in CARD_DATA.
// ============================================================

const Cards = {
  // --- Pool: which card ids can this player use right now? ---
  // Basic cards (no requiredTerritoryType) are always available.
  // Typed cards need `tier` <= unlocked tier for that territory type.
  availableCardIds(playerId) {
    const counts = State.territoryTypeCounts(playerId);
    return CARD_DATA
      .filter(def => {
        if (!def.requiredTerritoryType) return true;
        const owned = counts[def.requiredTerritoryType] || 0;
        return (def.tier || 1) <= Bonuses.tierForCount(owned);
      })
      .map(def => def.id);
  },

  // Create one card instance.
  makeInstance(cardId) {
    return { iid: "c" + (State.game.nextInstanceId++), cardId };
  },

  // Build a player's starting deck from their current pool.
  buildStartingDeck(playerId) {
    const player = State.getPlayer(playerId);
    player.unlockedCardIds = this.availableCardIds(playerId);
    player.deck = [];
    player.unlockedCardIds.forEach(cardId => {
      const def = State.cardDef(cardId);
      const copies = def.copies || 1;
      for (let i = 0; i < copies; i++) {
        player.deck.push(this.makeInstance(cardId));
      }
    });
    this.shuffle(player.deck);
  },

  // Called whenever territory ownership changes: any newly unlocked
  // cards are shuffled into the deck. (Lost unlocks keep already-drawn
  // cards — simple and forgiving for v1.)
  refreshUnlocks(playerId) {
    const player = State.getPlayer(playerId);
    const nowAvailable = this.availableCardIds(playerId);
    const newIds = nowAvailable.filter(id => !player.unlockedCardIds.includes(id));

    newIds.forEach(cardId => {
      const def = State.cardDef(cardId);
      const copies = def.copies || 1;
      for (let i = 0; i < copies; i++) {
        player.deck.push(this.makeInstance(cardId));
      }
      State.logTurn(`${player.name} unlocked ${def.name} (tier ${def.tier || 1} ${def.requiredTerritoryType}).`);
    });

    if (newIds.length > 0) this.shuffle(player.deck);
    player.unlockedCardIds = nowAvailable;
  },

  // Fisher–Yates shuffle, in place.
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  },

  // Draw n cards. Reshuffles the discard pile if the deck runs out.
  // Cards drawn past maxHandSize are discarded (burned).
  draw(playerId, n) {
    const player = State.getPlayer(playerId);
    for (let i = 0; i < n; i++) {
      if (player.deck.length === 0) {
        if (player.discard.length === 0) {
          State.logTurn(`${player.name} has no cards left to draw.`);
          return;
        }
        player.deck = player.discard;
        player.discard = [];
        this.shuffle(player.deck);
        State.logTurn(`${player.name} reshuffles their discard pile.`);
      }
      const card = player.deck.pop();
      if (player.hand.length >= GAME_CONFIG.maxHandSize) {
        player.discard.push(card);
        State.logTurn(`${player.name}'s hand is full — a card is discarded.`);
      } else {
        player.hand.push(card);
      }
    }
  },

  // Move a card instance from hand to discard.
  discardFromHand(playerId, iid) {
    const player = State.getPlayer(playerId);
    const idx = player.hand.findIndex(c => c.iid === iid);
    if (idx >= 0) player.discard.push(player.hand.splice(idx, 1)[0]);
  }
};
