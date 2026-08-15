// js/creatures.js — the living roster. Every creature accumulates a history.
"use strict";

const Creatures = {
  make(speciesId, level) {
    const s = SPECIES[speciesId];
    const c = {
      id: uid(),
      speciesId,
      name: pick(CREATURE_NAMES),
      level: level || 1,
      xp: 0,
      rank: 0, // index into RANKS
      hp: 0, maxHp: 0, atk: 0, def: 0, spd: 0,
      loyalty: randInt(30, 55),
      personality: pick(PERSONALITIES),
      traits: [],
      evolved: false, evoName: null,
      injured: false, injuryT: 0,
      assignment: "rest", // rest | follow | guard | train
      counters: { kills: 0, captainKills: 0, gateBreaks: 0, defenses: 0, invasions: 0, nearDeaths: 0, battlesWithPlayer: 0 },
      history: []
    };
    this.recalc(c);
    c.hp = c.maxHp;
    return c;
  },

  displayName(c) {
    const s = SPECIES[c.speciesId];
    return c.name + " the " + (c.evoName || s.name.split(" ").pop());
  },

  recalc(c) {
    const s = SPECIES[c.speciesId];
    const lv = c.level - 1;
    c.maxHp = s.hp + lv * 5 + (c.evolved ? s.evolution.bonus.hp || 0 : 0);
    c.atk = s.atk + Math.floor(lv * 1.2) + (c.evolved ? s.evolution.bonus.atk || 0 : 0) + c.rank;
    c.def = s.def + Math.floor(lv * 0.6) + (c.evolved ? s.evolution.bonus.def || 0 : 0);
    c.spd = s.spd + (c.evolved ? s.evolution.bonus.spd || 0 : 0);
    for (const t of c.traits) if (TRAITS[t] && TRAITS[t].def) c.def += TRAITS[t].def;
    c.hp = Math.min(c.hp, c.maxHp);
  },

  xpNeeded(c) { return 20 + c.level * 15; },

  gainXP(c, amount) {
    c.xp += amount;
    let leveled = false;
    while (c.xp >= this.xpNeeded(c)) {
      c.xp -= this.xpNeeded(c);
      c.level++;
      leveled = true;
    }
    if (leveled) {
      this.recalc(c);
      c.hp = c.maxHp;
      Game.log(`${this.displayName(c)} reached level ${c.level}!`);
      this.checkEvolution(c);
    }
  },

  checkEvolution(c) {
    if (c.evolved) return;
    const evo = SPECIES[c.speciesId].evolution;
    if (evo.check(c)) {
      c.evolved = true;
      c.evoName = evo.to;
      this.recalc(c);
      c.hp = c.maxHp;
      c.history.push(`Evolved into ${evo.to}`);
      Game.log(`★ ${c.name} evolved into ${evo.to}!`, true);
      this.addLoyalty(c, 10);
    }
  },

  addTrait(c, traitId, reason) {
    if (c.traits.includes(traitId) || c.traits.length >= 3) return;
    c.traits.push(traitId);
    this.recalc(c);
    c.history.push(`Gained trait ${TRAITS[traitId].name}: ${reason}`);
    Game.log(`${this.displayName(c)} gained the trait "${TRAITS[traitId].name}" — ${reason}`);
  },

  addLoyalty(c, amount) {
    c.loyalty = clamp(c.loyalty + amount, c.traits.includes("loyal") ? 30 : 0, 100);
  },

  // Called when a creature's entity is downed in battle. No perma-death in the prototype —
  // it retreats injured and needs time (or gold) to recover.
  knockOut(c) {
    c.injured = true;
    c.injuryT = 60; // seconds until recovered
    c.hp = 1;
    if (c.assignment === "follow") c.assignment = "rest";
    this.addLoyalty(c, -5);
    c.counters.nearDeaths++;
    c.history.push("Carried back to camp, badly wounded");
    if (c.counters.nearDeaths >= 1 && !c.traits.includes("scarred") && chance(0.7)) {
      this.addTrait(c, "scarred", "survived a terrible wound");
    }
    if (c.personality === "Timid" && chance(0.4)) this.addTrait(c, "cowardly", "the wound broke its nerve");
    Game.log(`${this.displayName(c)} was knocked out and retreats to recover.`, true);
  },

  // Passive tick: injury recovery, training, low-loyalty desertion checks
  tick(c, dt) {
    if (c.injured) {
      c.injuryT -= dt;
      if (c.injuryT <= 0) {
        c.injured = false;
        c.hp = Math.floor(c.maxHp * 0.6);
        Game.log(`${this.displayName(c)} has recovered from its wounds.`);
      }
    } else {
      if (c.assignment === "rest" || c.assignment === "train") c.hp = Math.min(c.maxHp, c.hp + dt * 1.5);
      if (c.assignment === "train") {
        c._trainT = (c._trainT || 0) + dt;
        if (c._trainT >= 25) { c._trainT = 0; this.gainXP(c, 8); }
      }
    }
  }
};
