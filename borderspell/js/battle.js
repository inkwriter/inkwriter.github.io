// ============================================================
// battle.js — Card battles
//
// Flow (hotseat):
//   1. Battle.start(fromId, toId) creates game.battle
//   2. Attacker picks up to N cards from their hand, commits
//   3. (handoff screen) Defender picks cards, commits
//      — neutral territories skip steps with no cards
//   4. resolve() scores both sides, applies casualties/capture
//   5. UI shows the result; Battle.close() clears it
//
// Scoring:
//   attacker score = committed troops + unit power + effects
//   defender score = troops + terrain defense + unit power + effects
//   Higher score wins. Ties go to the defender.
//   Each side loses floor(enemyScore / casualtyDivisor) troops,
//   minus any reduceDamage effects.
// ============================================================

const Battle = {
  // ---- Effect registry ----
  // Every card effect maps to one small handler here. To invent a new
  // effect action, add a handler and use its name in data/cards.js.
  // Handlers receive (side, enemySide, amount, battle).
  EFFECTS: {
    damage: (side, enemy, amt) => {
      enemy.scoreMods.push({ label: "enemy spell damage", amount: -amt });
    },
    heal: (side, enemy, amt) => {
      side.heal += amt;
    },
    buffAttack: (side, enemy, amt) => {
      // Only meaningful for the attacker; UI blocks it for defenders.
      side.scoreMods.push({ label: "attack buff", amount: amt });
    },
    buffDefense: (side, enemy, amt) => {
      side.scoreMods.push({ label: "defense buff", amount: amt });
    },
    addTroops: (side, enemy, amt) => {
      side.bonusTroops += amt;
    },
    reduceDamage: (side, enemy, amt) => {
      side.damageReduction += amt;
    },
    drawCard: (side, enemy, amt) => {
      if (side.playerId !== "neutral") Cards.draw(side.playerId, amt);
    },
    gainPower: (side, enemy, amt) => {
      if (side.playerId !== "neutral") State.getPlayer(side.playerId).power += amt;
    }
  },

  // Effects that only make sense for one role. The UI uses this to
  // gray out cards and explain why.
  roleLockedEffects: { buffAttack: "attacker", buffDefense: "defender" },

  // ---- Setup ----

  start(fromId, toId) {
    const g = State.game;
    const from = State.getTerritory(fromId);
    const to = State.getTerritory(toId);

    g.battle = {
      fromId,
      toId,
      attackerId: from.owner,
      defenderId: to.owner,
      committedTroops: from.troops - 1, // one troop always stays home
      stage: "attackerCards",           // -> handoff -> defenderCards -> resolved
      picks: { attacker: [], defender: [] }, // card iids selected (not yet paid)
      result: null
    };

    State.logBattle(`⚔ ${State.playerName(from.owner)} attacks ${to.name} from ${from.name} with ${g.battle.committedTroops} troops.`);
  },

  // Whose turn is it to pick cards right now?
  activeSideRole() {
    const b = State.game.battle;
    if (!b) return null;
    if (b.stage === "attackerCards") return "attacker";
    if (b.stage === "defenderCards") return "defender";
    return null;
  },

  activePlayerId() {
    const b = State.game.battle;
    const role = this.activeSideRole();
    if (!role) return null;
    return role === "attacker" ? b.attackerId : b.defenderId;
  },

  // ---- Card picking ----

  // Can this hand card be picked right now? Returns { ok, reason }.
  canPick(iid) {
    const b = State.game.battle;
    const role = this.activeSideRole();
    const playerId = this.activePlayerId();
    const player = State.getPlayer(playerId);
    const picks = b.picks[role];

    const instance = player.hand.find(c => c.iid === iid);
    if (!instance) return { ok: false, reason: "Card not in hand." };
    const def = State.cardDef(instance.cardId);

    if (picks.includes(iid)) return { ok: true }; // already picked → toggling off is fine

    if (picks.length >= GAME_CONFIG.maxCardsPlayedPerBattle) {
      return { ok: false, reason: `You may only play ${GAME_CONFIG.maxCardsPlayedPerBattle} cards per battle.` };
    }

    // Role-locked effects (Rally when defending, Shieldwall when attacking)
    const lockedRole = def.effect && this.roleLockedEffects[def.effect.action];
    if (lockedRole && lockedRole !== role) {
      return { ok: false, reason: `${def.name} only works when ${lockedRole === "attacker" ? "attacking" : "defending"}.` };
    }

    // Power check across all currently picked cards
    const totalCost = picks.reduce((sum, id) => {
      const c = player.hand.find(h => h.iid === id);
      return sum + State.cardDef(c.cardId).cost;
    }, 0);
    if (totalCost + def.cost > player.power) {
      return { ok: false, reason: `Not enough Power (${def.name} costs ${def.cost}, you have ${player.power - totalCost} unspent).` };
    }

    return { ok: true };
  },

  togglePick(iid) {
    const b = State.game.battle;
    const role = this.activeSideRole();
    if (!role) return { ok: false, reason: "No cards can be picked right now." };

    const picks = b.picks[role];
    const already = picks.indexOf(iid);
    if (already >= 0) {
      picks.splice(already, 1);
      return { ok: true };
    }
    const check = this.canPick(iid);
    if (!check.ok) return check;
    picks.push(iid);
    return { ok: true };
  },

  // Lock in the active side's cards and advance the battle.
  commitCards() {
    const b = State.game.battle;
    if (b.stage === "attackerCards") {
      if (b.defenderId === "neutral") {
        this.resolve(); // neutrals play no cards
      } else {
        b.stage = "handoff"; // show "pass the device" screen
      }
    } else if (b.stage === "defenderCards") {
      this.resolve();
    }
  },

  // Called from the handoff screen when the defender is ready.
  beginDefenderPicks() {
    const b = State.game.battle;
    if (b && b.stage === "handoff") b.stage = "defenderCards";
  },

  // ---- Resolution ----

  resolve() {
    const g = State.game;
    const b = g.battle;
    const from = State.getTerritory(b.fromId);
    const to = State.getTerritory(b.toId);
    const log = [];

    // Build a working object for each side.
    const attacker = this.makeSide("attacker", b.attackerId, b.committedTroops);
    const defender = this.makeSide("defender", b.defenderId, to.troops);

    // Terrain: defender bonus from the battlefield (the target territory).
    const terrainDef = Bonuses.terrainDefenderBonus(to);
    if (terrainDef > 0) {
      defender.scoreMods.push({ label: `${Bonuses.typeInfo(to.type).label} terrain`, amount: terrainDef });
    }

    // Pay for and apply each side's cards.
    this.playPickedCards(attacker, defender, b.picks.attacker, to, log);
    this.playPickedCards(defender, attacker, b.picks.defender, to, log);

    // Final scores.
    const atkScore = this.sideScore(attacker);
    const defScore = this.sideScore(defender);
    log.push(`Attacker score ${atkScore} vs Defender score ${defScore}.`);

    // Casualties: each side suffers from the other's score.
    const atkLoss = Math.min(
      attacker.troops + attacker.bonusTroops,
      Math.max(0, Math.floor(defScore / GAME_CONFIG.casualtyDivisor) - attacker.damageReduction)
    );
    const defLoss = Math.min(
      defender.troops + defender.bonusTroops,
      Math.max(0, Math.floor(atkScore / GAME_CONFIG.casualtyDivisor) - defender.damageReduction)
    );

    const attackerWins = atkScore > defScore; // ties favor the defender

    if (attackerWins) {
      // Survivors march in; healing recovers some of the fallen.
      let survivors = attacker.troops + attacker.bonusTroops - atkLoss;
      survivors = Math.min(attacker.troops + attacker.bonusTroops, survivors + Math.min(attacker.heal, atkLoss));
      survivors = Math.max(1, survivors);

      from.troops = 1; // the one left behind
      log.push(`${attacker.name} wins and captures ${to.name}! ${survivors} troops move in (lost ${atkLoss}). ${defender.name} loses the territory.`);
      GameMap.captureTerritory(b.toId, b.attackerId, survivors);

      if (g.phase !== "gameover" && GAME_CONFIG.captureRewardCards > 0) {
        Cards.draw(b.attackerId, GAME_CONFIG.captureRewardCards);
        log.push(`${attacker.name} draws ${GAME_CONFIG.captureRewardCards} card for the capture.`);
      }
    } else {
      // Attack repelled.
      let atkSurvivors = attacker.troops + attacker.bonusTroops - atkLoss;
      atkSurvivors = Math.min(attacker.troops + attacker.bonusTroops, atkSurvivors + Math.min(attacker.heal, atkLoss));
      from.troops = Math.max(1, 1 + atkSurvivors);

      let defSurvivors = defender.troops + defender.bonusTroops - defLoss;
      defSurvivors = Math.min(defender.troops + defender.bonusTroops, defSurvivors + Math.min(defender.heal, defLoss));
      to.troops = Math.max(1, defSurvivors);

      log.push(`${defender.name} holds ${to.name}! Attacker lost ${atkLoss} troops, defender lost ${defLoss}.`);
    }

    b.result = {
      attackerWins,
      atkScore,
      defScore,
      breakdown: { attacker: this.breakdownText(attacker), defender: this.breakdownText(defender) },
      log
    };
    b.stage = "resolved";
    log.forEach(line => State.logBattle(line));
  },

  makeSide(role, playerId, troops) {
    return {
      role,
      playerId,
      name: State.playerName(playerId),
      troops,            // troops at the start of the fight
      bonusTroops: 0,    // from addTroops effects
      scoreMods: [],     // { label, amount } — units, buffs, spell damage
      heal: 0,
      damageReduction: 0,
      playedCards: []
    };
  },

  // Pay Power, discard the cards, and run each card through the
  // effect registry (or add unit power to the score).
  playPickedCards(side, enemy, iids, battlefield, log) {
    if (side.playerId === "neutral") return;
    const player = State.getPlayer(side.playerId);

    iids.forEach(iid => {
      const instance = player.hand.find(c => c.iid === iid);
      if (!instance) return;
      const def = State.cardDef(instance.cardId);

      player.power -= def.cost;
      Cards.discardFromHand(side.playerId, iid);
      side.playedCards.push(def.name);

      const terrainBonus = Bonuses.terrainCardBonus(battlefield, def);

      if (def.type === "unit") {
        const power = def.power + terrainBonus;
        side.scoreMods.push({ label: def.name, amount: power });
        log.push(`${side.name} plays ${def.name} (+${power}${terrainBonus ? ", terrain +" + terrainBonus : ""}).`);
      } else if (def.effect) {
        const handler = this.EFFECTS[def.effect.action];
        if (!handler) {
          log.push(`${def.name} has unknown effect "${def.effect.action}" — skipped.`);
          return;
        }
        const amount = (def.effect.amount || 0) + terrainBonus;
        handler(side, enemy, amount, State.game.battle);
        log.push(`${side.name} plays ${def.name} (${def.effect.action} ${amount}).`);
      }
    });
  },

  sideScore(side) {
    const base = side.troops + side.bonusTroops;
    const mods = side.scoreMods.reduce((sum, m) => sum + m.amount, 0);
    return Math.max(0, base + mods);
  },

  breakdownText(side) {
    const parts = [`${side.troops + side.bonusTroops} troops`];
    side.scoreMods.forEach(m => {
      parts.push(`${m.amount >= 0 ? "+" : ""}${m.amount} ${m.label}`);
    });
    return parts.join(", ");
  },

  close() {
    State.game.battle = null;
  }
};

// Small helper used by battle logs — lives on State so any module can use it.
State.playerName = function (playerId) {
  if (playerId === "neutral") return GAME_CONFIG.neutral.name;
  return this.getPlayer(playerId).name;
};
