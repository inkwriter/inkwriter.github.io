// js/captains.js — generated enemy captains with memory, rank, grudges.
"use strict";

const Captains = {
  generateAll() {
    const captains = [];
    const usedNames = new Set(), usedTitles = new Set();
    // One Warlord, one Champion, rest lower ranks. 7 total.
    const ranks = [5, 4, 3, 3, 2, 1, 1];
    for (let i = 0; i < ranks.length; i++) {
      let name = pick(CAPTAIN_FIRST); while (usedNames.has(name)) name = pick(CAPTAIN_FIRST);
      usedNames.add(name);
      let title = pick(CAPTAIN_TITLES); while (usedTitles.has(title)) title = pick(CAPTAIN_TITLES);
      usedTitles.add(title);
      captains.push({
        id: uid(),
        name, title,
        species: "Goblin " + pick(["Beast-Rider", "Shaman", "Skirmisher", "Brute", "Trapper"]),
        rank: ranks[i],
        level: 1 + ranks[i],
        personality: pick(CAPTAIN_PERSONALITIES),
        strength: pick(CAPTAIN_STRENGTHS),
        weakness: pick(CAPTAIN_WEAKNESSES),
        fear: null,
        scars: [],
        memories: [],
        grudge: 0,           // toward the player; high grudge fuels revenge ambushes
        relationship: "Unknown to you",
        defeats: 0, victories: 0,
        alive: true, broken: false, // broken = driven from the Marches
        location: i === 0 || i === 1 ? "fort" : "camp" + (i % 3)
      });
    }
    return captains;
  },

  fullName(cap) { return `${cap.name} ${cap.title}`; },

  remember(cap, text) {
    cap.memories.push(text);
    if (cap.memories.length > 6) cap.memories.shift();
  },

  promote(cap, why) {
    if (cap.rank >= RANKS.length - 1) return;
    cap.rank++;
    cap.level += 2;
    Game.log(`▲ ${this.fullName(cap)} was promoted to ${RANKS[cap.rank]} — ${why}`, true);
    this.remember(cap, `Promoted to ${RANKS[cap.rank]} (${why})`);
  },

  demote(cap, why) {
    if (cap.rank <= 0) return;
    cap.rank--;
    Game.log(`▼ ${this.fullName(cap)} was demoted to ${RANKS[cap.rank]} — ${why}`);
    this.remember(cap, `Demoted to ${RANKS[cap.rank]} (${why})`);
  },

  // Player defeated this captain in battle. They may survive, scar, and plot revenge.
  onDefeatedByPlayer(cap) {
    cap.defeats++;
    cap.relationship = cap.defeats >= 2 ? "Your nemesis" : "Your rival";
    if (chance(0.55) && !cap.broken) {
      // Survives — retreats with a scar, a fear, and a grudge
      const scar = pick(SCARS.filter(s => !cap.scars.includes(s)));
      if (scar) cap.scars.push(scar);
      if (!cap.fear) cap.fear = pick(CAPTAIN_FEARS);
      cap.grudge += 2;
      this.remember(cap, "Defeated by the Warden — escaped with " + (scar || "its life"));
      Game.log(`${this.fullName(cap)} escaped with ${scar || "its life"}... it will remember this.`, true);
      if (cap.defeats >= 2) this.demote(cap, "repeated defeat by the Warden");
    } else {
      cap.broken = true;
      cap.alive = false;
      this.remember(cap, "Broken and driven from the Marches by the Warden");
      Game.log(`☠ ${this.fullName(cap)} is broken — driven from the Thornwood for good.`, true);
    }
  },

  onDefeatedPlayer(cap) {
    cap.victories++;
    cap.grudge = Math.max(0, cap.grudge - 1);
    cap.relationship = "Holds you in contempt";
    this.remember(cap, "Struck down the Warden in battle");
    this.promote(cap, "struck down the Warden");
  },

  // Pick the highest-ranked living captain to command the fort during invasions
  fortBoss(captains) {
    const alive = captains.filter(c => c.alive && !c.broken);
    alive.sort((a, b) => b.rank - a.rank);
    return alive[0] || null;
  },

  // Turn a deserting player creature into an enemy captain (betrayal path)
  fromDeserter(creature) {
    return {
      id: uid(),
      name: creature.name, title: "the Turncoat",
      species: SPECIES[creature.speciesId].name,
      rank: 1, level: creature.level,
      personality: "Bitter",
      strength: pick(CAPTAIN_STRENGTHS), weakness: pick(CAPTAIN_WEAKNESSES),
      fear: null, scars: [], memories: ["Abandoned the Warden's banner"],
      grudge: 3, relationship: "Your former soldier",
      defeats: 0, victories: 0, alive: true, broken: false, location: "camp0"
    };
  }
};
