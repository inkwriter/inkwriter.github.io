// js/rivalSystem.js — the "living world" ticker. Every ~75s the enemy faction acts:
// duels, promotions, taunts, revenge plots. Grudges eventually become ambushes.
"use strict";

const Rival = {
  TICK_INTERVAL: 75,

  tick() {
    const caps = G.captains.filter(c => c.alive && !c.broken);
    if (caps.length === 0) return;

    // Revenge plots take priority: a captain with a heavy grudge hunts the player.
    const grudged = caps.filter(c => c.grudge >= 2);
    if (grudged.length && chance(0.6)) {
      const hunter = pick(grudged);
      G.ambush = { capId: hunter.id, t: 18 };
      Game.log(`⚠ ${Captains.fullName(hunter)} is hunting you through the Thornwood...`, true);
      Captains.remember(hunter, "Set out to take revenge on the Warden");
      return;
    }

    const roll = rand();
    if (roll < 0.3 && caps.length >= 2) {
      // Duel for rank between two captains
      const a = pick(caps); let b = pick(caps);
      if (a === b) return;
      const winner = a.rank + rand() * 3 > b.rank + rand() * 3 ? a : b;
      const loser = winner === a ? b : a;
      Captains.promote(winner, `won a duel against ${Captains.fullName(loser)}`);
      Captains.demote(loser, `lost a duel to ${Captains.fullName(winner)}`);
      loser.personality === "Vain" && Captains.remember(loser, "Humiliated before the warband");
    } else if (roll < 0.5) {
      // Training — a captain grows stronger offscreen
      const cap = pick(caps);
      cap.level++;
      Game.log(`${Captains.fullName(cap)} drills fresh recruits. The warband grows stronger.`);
    } else if (roll < 0.7) {
      // Taunt, flavored by memory if one exists
      const cap = pick(caps);
      const mock = pick(CAPTAIN_MOCKS).replace("{name}", Captains.fullName(cap));
      Game.log(mock);
    } else {
      // Reinforce a camp with a fresh beast
      const cap = pick(caps);
      Combat.spawnCampReinforcement();
      Game.log(`${Captains.fullName(cap)} sends a fresh beast to patrol the Marches.`);
    }
  },

  // Countdown to an ambush spawning near the player
  update(dt) {
    if (G.ambush) {
      G.ambush.t -= dt;
      if (G.ambush.t <= 0) {
        const cap = G.captains.find(c => c.id === G.ambush.capId);
        G.ambush = null;
        if (cap && cap.alive && !cap.broken) {
          Combat.spawnAmbush(cap);
          Game.log(`${Captains.fullName(cap)} springs from the brush — REVENGE!`, true);
        }
      }
    }
  }
};
