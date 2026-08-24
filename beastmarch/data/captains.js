// data/captains.js — name parts, titles, personalities for generated goblin captains.
"use strict";

const RANKS = ["Grunt", "Raider", "Elite", "Captain", "Champion", "Warlord"];

const CAPTAIN_FIRST = ["Brakka", "Murk", "Vesh", "Grakka", "Nix", "Skarn", "Thugga", "Ozzik", "Renk", "Duzz", "Karg", "Snib"];
const CAPTAIN_TITLES = [
  "the Bone-Eater", "the Mud-Biter", "One-Eye", "the Proud", "Iron-Gut", "the Whisperer",
  "Boar-Rider", "the Cruel", "Thorn-Tongue", "the Sneak", "Gate-Watcher", "Red-Hand"
];
const CAPTAIN_PERSONALITIES = ["Cruel", "Cowardly", "Ambitious", "Cunning", "Brutish", "Vain", "Paranoid", "Fearless"];
const CAPTAIN_STRENGTHS = [
  { key: "thickHide", label: "Thick hide (+3 DEF)" },
  { key: "berserker", label: "Berserker (+3 ATK)" },
  { key: "quick", label: "Quick-footed (+20 SPD)" },
  { key: "packLeader", label: "Pack leader (fights with extra beast)" }
];
const CAPTAIN_WEAKNESSES = [
  { key: "slow", label: "Slow (-15 SPD)" },
  { key: "thinSkin", label: "Thin skin (-2 DEF)" },
  { key: "hotHead", label: "Hot-headed (charges recklessly)" },
  { key: "craven", label: "Craven (flees below 25% health)" }
];
const CAPTAIN_FEARS = ["the Warden's blade", "captured beasts", "fire", "the dark of the fort", "being forgotten"];
const CAPTAIN_MOCKS = [
  "{name} sends word: 'Your beasts will make fine soup, Warden.'",
  "{name} carves your mark into a tree — crossed out.",
  "{name} boasts of the day they will wear your cloak.",
  "{name} is telling the camps you bleed like any grunt."
];
const SCARS = ["a burned brow", "a missing tusk", "a torn ear", "a limp", "a scarred jaw", "one milky eye"];
