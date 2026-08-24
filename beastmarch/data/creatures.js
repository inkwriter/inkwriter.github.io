// data/creatures.js — the 8 species of the Thornwood prototype.
// Visuals: `sheet` names a character sheet in the baked atlas (see tools/bake_assets.py);
// evolved creatures automatically use `<sheet>_evo`. `scale` is the draw scale.
// Adding a species = adding an entry here + a recolor line in the bake script.
"use strict";

const SPECIES = {
  boar: {
    name: "Thornback Boar", role: "Charger / siege beast",
    hp: 34, atk: 7, def: 4, spd: 55,
    ability: "Charge — heavy hits against gates and walls",
    strength: "Breaks barricades (bonus gate damage)",
    weakness: "Poor turning speed",
    gateBonus: 2,
    sheet: "boar", scale: 2,
    evolution: {
      to: "Siege Boar", desc: "Break 2 gates or reach level 6",
      check: (c) => c.counters.gateBreaks >= 2 || c.level >= 6,
      bonus: { hp: 20, atk: 5, def: 3 }
    }
  },
  imp: {
    name: "Bogling", role: "Poison scout",
    hp: 18, atk: 6, def: 1, spd: 85,
    ability: "Poison Stab — quick venomous jabs",
    strength: "Sneaky and fast",
    weakness: "Low health",
    sheet: "bogling", scale: 2,
    evolution: {
      to: "Mire Stalker", desc: "Land 8 kills",
      check: (c) => c.counters.kills >= 8,
      bonus: { hp: 10, atk: 6, spd: 15 }
    }
  },
  drake: {
    name: "Ash Drake", role: "Fire attacker",
    hp: 26, atk: 9, def: 2, spd: 65,
    ability: "Fire Breath — scorches close foes",
    strength: "Burns groups of enemies",
    weakness: "Fragile scales",
    sheet: "drake", scale: 2,
    evolution: {
      to: "Ember Wyrm", desc: "Defeat an enemy captain",
      check: (c) => c.counters.captainKills >= 1,
      bonus: { hp: 14, atk: 7 }
    }
  },
  troll: {
    name: "Stonejaw Troll", role: "Heavy siege defender",
    hp: 55, atk: 8, def: 7, spd: 35,
    ability: "Ground Slam — slow, crushing blows",
    strength: "High health and gate damage",
    weakness: "Slow movement",
    gateBonus: 1.5,
    sheet: "troll", scale: 1.7,
    evolution: {
      to: "Wallwarden Troll", desc: "Win 2 base defenses",
      check: (c) => c.counters.defenses >= 2,
      bonus: { hp: 30, def: 6 }
    }
  },
  fox: {
    name: "Blink Fox", role: "Duelist / scout",
    hp: 20, atk: 7, def: 1, spd: 95,
    ability: "Blink — flickers away from harm",
    strength: "Hard to hit (dodge chance)",
    weakness: "Fragile",
    dodge: 0.25,
    sheet: "fox", scale: 2,
    evolution: {
      to: "Ghost Fox", desc: "Survive near death 2 times",
      check: (c) => c.counters.nearDeaths >= 2,
      bonus: { atk: 4, spd: 20, hp: 8 }
    }
  },
  moth: {
    name: "Grave Moth", role: "Morale drain support",
    hp: 16, atk: 4, def: 1, spd: 70,
    ability: "Fear Aura — nearby foes falter (they hit slower)",
    strength: "Weakens enemy morale",
    weakness: "Low direct damage",
    fearAura: true, hover: true,
    sheet: "moth", scale: 2,
    evolution: {
      to: "Dread Moth", desc: "Fight in 3 battles beside the Warden",
      check: (c) => c.counters.battlesWithPlayer >= 3,
      bonus: { hp: 10, atk: 5 }
    }
  },
  harpy: {
    name: "Ironbeak Hawk", role: "Aerial ambusher",
    hp: 24, atk: 8, def: 2, spd: 80,
    ability: "Dive Attack — strikes first in a fight",
    strength: "First strike bonus damage",
    weakness: "Weak to ranged attacks",
    firstStrike: true, hover: true,
    sheet: "hawk", scale: 2,
    evolution: {
      to: "Storm Hawk", desc: "Join 2 invasions",
      check: (c) => c.counters.invasions >= 2,
      bonus: { atk: 6, spd: 15, hp: 8 }
    }
  },
  slime: {
    name: "Lantern Slime", role: "Utility support",
    hp: 22, atk: 3, def: 3, spd: 45,
    ability: "Lantern Glow — reveals hidden treasure nearby",
    strength: "Finds extra gold from fallen foes",
    weakness: "Weak combat stats",
    goldFinder: true,
    sheet: "slime", scale: 2,
    evolution: {
      to: "Beacon Slime", desc: "Reach level 5",
      check: (c) => c.level >= 5,
      bonus: { hp: 16, def: 4, atk: 3 }
    }
  }
  ,stag: {
    name: "Thornwood Stag", role: "Great Beast — the forest's roaming god",
    hp: 160, atk: 14, def: 8, spd: 70,
    ability: "Antler Sweep — crushing blows that scatter squads",
    strength: "Breaks gates in a single charge",
    weakness: "The old wounds of a hundred hunts",
    gateBonus: 4, greatBeast: true, commandCost: 3,
    sheet: "stag", scale: 2,
    evolution: {
      to: "Elder of the Thornwood", desc: "Fight 5 battles beside the Warden",
      check: (c) => c.counters.battlesWithPlayer >= 5,
      bonus: { hp: 60, atk: 8, def: 4 }
    }
  }
};

// Name pools for captured creatures — no creature is ever "Boar #3".
const CREATURE_NAMES = [
  "Grubhorn", "Mossback", "Snagtooth", "Bramble", "Ashwick", "Thistle", "Rooter",
  "Cindra", "Puddle", "Grimble", "Vex", "Sootwing", "Burrow", "Nettle", "Quill",
  "Marrow", "Fenwick", "Dusk", "Ember", "Twitch", "Boulder", "Wisp", "Gnarl",
  "Hollow", "Pyre", "Sedge", "Flick", "Rumble", "Shade", "Tangle"
];
