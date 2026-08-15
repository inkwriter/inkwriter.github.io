// js/army.js — roster, Command-budget warband deployment, rally, desertion.
// "follow" assignment = in the warband loadout. Tab toggles fielding them.
"use strict";

const Army = {
  add(creature) {
    G.roster.push(creature);
    Game.log(`${Creatures.displayName(creature)} joins your banner! (${creature.personality})`, true);
    Game.refreshPanels();
  },

  deployed() { return G.roster.filter(c => c.assignment === "follow" && !c.injured); },
  deployedCost() { return this.deployed().reduce((s, c) => s + Skills.creatureCost(c), 0); },
  guards() { return G.roster.filter(c => c.assignment === "guard" && !c.injured); },

  // Add a creature to the warband loadout (respecting the Command cap)
  deploy(c) {
    if (c.injured) { Game.toast(`${c.name} is too injured.`, true); return false; }
    if (c.assignment === "follow") return true;
    const cost = Skills.creatureCost(c);
    if (this.deployedCost() + cost > Skills.commandCap()) {
      Game.toast(`Not enough Command (${this.deployedCost()}/${Skills.commandCap()}). Recall someone or learn Warband skills.`, true);
      return false;
    }
    c.assignment = "follow";
    if (c.personality === "Loyal-hearted") Creatures.addLoyalty(c, 3);
    if (G.warbandOut && G.mode !== "invasion") Combat.spawnAllyFor(c);
    Game.refreshPanels();
    return true;
  },

  recall(c) {
    if (c.assignment === "follow") {
      c.assignment = "rest";
      Combat.despawnAllyFor(c);
      Game.refreshPanels();
    }
  },

  setAssignment(c, assignment) {
    if (assignment === "follow") { this.deploy(c); return; }
    if (c.injured && assignment !== "rest") { Game.toast(`${c.name} is too injured.`, true); return; }
    if (c.assignment === "follow") Combat.despawnAllyFor(c);
    c.assignment = assignment;
    if (assignment === "guard" && c.personality === "Grim") Creatures.addLoyalty(c, 2);
    Game.refreshPanels();
  },

  // Tab: field or dismiss the whole warband
  toggleRally() {
    if (G.mode === "invasion") { Game.toast("Your warband is committed to the assault.", true); return; }
    G.warbandOut = !G.warbandOut;
    if (G.warbandOut) {
      for (const c of this.deployed()) Combat.spawnAllyFor(c);
      if (this.deployed().length) Game.toast(`Warband fielded (${this.deployed().length} beasts). Tab to dismiss.`);
      else Game.toast("No creatures in your warband. Deploy some from the roster (R).", true);
    } else {
      for (const c of this.deployed()) Combat.despawnAllyFor(c);
      Game.toast("Warband dismissed to camp.");
    }
  },

  checkPromotion(c) {
    const deeds = c.counters.kills + c.counters.captainKills * 3 + c.counters.defenses * 2 + c.counters.invasions * 2;
    const wanted = Math.min(RANKS.length - 1, Math.floor(deeds / 5));
    if (wanted > c.rank) {
      c.rank = wanted;
      Creatures.recalc(c);
      c.history.push(`Promoted to ${RANKS[c.rank]}`);
      Creatures.addLoyalty(c, 5);
      Game.log(`▲ ${Creatures.displayName(c)} was promoted to ${RANKS[c.rank]}!`, true);
    }
  },

  tickLoyalty() {
    for (let i = G.roster.length - 1; i >= 0; i--) {
      const c = G.roster[i];
      if (c.loyalty < 15 && chance(0.3)) {
        G.roster.splice(i, 1);
        Combat.despawnAllyFor(c);
        const traitor = Captains.fromDeserter(c);
        G.captains.push(traitor);
        Game.log(`✖ ${Creatures.displayName(c)} abandons your banner and joins the enemy as ${Captains.fullName(traitor)}!`, true);
      } else if (c.loyalty < 25 && c.assignment !== "rest" && chance(0.2)) {
        Game.log(`${Creatures.displayName(c)} grumbles about its orders. Loyalty is failing.`);
      }
    }
  }
};
