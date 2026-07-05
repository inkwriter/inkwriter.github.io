/* ============================================================
   utils.js — Small helper functions used everywhere.
   No game logic lives here, just dice, randomness, and names.
   ============================================================ */

const UTILS = {

  /** Random integer between min and max, inclusive. */
  randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /** Roll a d20. The heart of every choice in the game. */
  d20() {
    return this.randInt(1, 20);
  },

  /** Pick one random item from an array. */
  pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  /** Shuffle an array (returns a new array, original untouched). */
  shuffle(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  },

  /** Clamp a number between lo and hi. */
  clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  },

  /* ----------------------------------------------------------
     Random fantasy names. Add more parts here to expand the
     name pool — the generator just glues a first + last together.
     ---------------------------------------------------------- */
  firstNames: [
    "Mira", "Torben", "Ellowyn", "Garrick", "Sable", "Fenwick",
    "Isolde", "Bramble", "Kaelen", "Wren", "Oswin", "Thessaly",
    "Dunmor", "Petra", "Alaric", "Juniper", "Corvus", "Maribel",
    "Hadrian", "Tamsin", "Roderick", "Yvaine", "Bertrand", "Lark"
  ],
  lastNames: [
    "Thornfield", "Blackbriar", "Emberfall", "Duskwhistle", "Ironwood",
    "Ravensong", "Mossgard", "Stormbellow", "Quickfoot", "Ashvale",
    "Winterborne", "Copperkettle", "Grimtongue", "Halloway", "Nightbloom"
  ],

  /** Generate a random adventurer name like "Wren Blackbriar". */
  randomName() {
    return `${this.pick(this.firstNames)} ${this.pick(this.lastNames)}`;
  }
};
