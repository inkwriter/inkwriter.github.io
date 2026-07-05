/* ============================================================
   classes.js — Adventurer classes and party creation.

   TO ADD A NEW CLASS:
   1. Add an entry to CLASSES.definitions below.
   2. Reference its name in any event's "classBonus" field.
   That's it — the rest of the game picks it up automatically.
   ============================================================ */

const CLASSES = {

  /* Every class has:
     - name:     shown on party cards and used by classBonus checks
     - icon:     emoji shown in the UI
     - maxHealth: starting/maximum HP
     - blurb:    one-line flavor description
     - bonus:    the flat number added to d20 rolls when an event's
                 classBonus matches and a living member has this class */
  definitions: {
    Fighter: {
      name: "Fighter",
      icon: "FTR",
      maxHealth: 30,
      blurb: "Holds the line when steel is drawn.",
      bonus: 5
    },
    Rogue: {
      name: "Rogue",
      icon: "ROG",
      maxHealth: 22,
      blurb: "Traps, shadows, and locked things.",
      bonus: 5
    },
    Cleric: {
      name: "Cleric",
      icon: "CLR",
      maxHealth: 26,
      blurb: "Healing hands and holy words.",
      bonus: 5
    },
    Wizard: {
      name: "Wizard",
      icon: "WIZ",
      maxHealth: 18,
      blurb: "Knows exactly one spell for this.",
      bonus: 5
    },
    Ranger: {
      name: "Ranger",
      icon: "RGR",
      maxHealth: 26,
      blurb: "Hunts, tracks, and finds the path.",
      bonus: 5
    },
    Bard: {
      name: "Bard",
      icon: "BRD",
      maxHealth: 22,
      blurb: "Can talk the party out of (or into) anything.",
      bonus: 5
    }
  },

  /** List of all class names, e.g. ["Fighter", "Rogue", ...] */
  allNames() {
    return Object.keys(this.definitions);
  },

  /**
   * Create one party member object.
   * Status effect is null when healthy, or one of:
   * "Poisoned", "Cursed", "Exhausted", "Wounded", "Blessed", "Inspired"
   */
  createMember(className, name) {
    const def = this.definitions[className];
    return {
      name: name || UTILS.randomName(),
      className: def.name,
      icon: def.icon,
      health: def.maxHealth,
      maxHealth: def.maxHealth,
      status: null,
      alive: true
    };
  },

  /**
   * Auto-generate a starting party of 4 with unique classes.
   * A Fighter and a Cleric are always included so new players
   * have a fair shot; the other two slots are random.
   * Change this function if you want full-random parties or
   * player-chosen parties later.
   */
  generateParty() {
    const guaranteed = ["Fighter", "Cleric"];
    const others = UTILS.shuffle(
      this.allNames().filter(c => !guaranteed.includes(c))
    ).slice(0, 2);
    const lineup = UTILS.shuffle([...guaranteed, ...others]);

    // Make sure no two members share a first name.
    const usedNames = new Set();
    return lineup.map(className => {
      let name = UTILS.randomName();
      while (usedNames.has(name)) name = UTILS.randomName();
      usedNames.add(name);
      return this.createMember(className, name);
    });
  },

  /** Does the party have a living member of this class? */
  hasLiving(party, className) {
    return party.some(m => m.alive && m.className === className);
  }
};
