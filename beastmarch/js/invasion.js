// js/invasion.js — fort invasions and base defense raids.
// Invasions reuse the overworld: the fort is a walled area, the gate is an entity with HP,
// and the highest-ranked living captain commands the defense as the boss.
"use strict";

const Invasion = {

  // ---------- Invading the fort ----------

  start(squadIds) {
    if (G.fortCaptured) { Game.toast("Bramblefang Fort already flies your banner.", true); return; }
    const boss = Captains.fortBoss(G.captains);
    if (!boss) { Game.toast("No captains remain to defend the fort. Walk in and claim it (press E at the gate).", false); return; }

    G.mode = "invasion";
    G.invasion = { squadIds: squadIds.slice(0, 3), bossId: boss.id, gateBroken: false };

    // Stage the player + squad outside the gate
    const st = G.map.fort.staging;
    G.player.x = st.x; G.player.y = st.y + 20;
    Combat.despawnAllAllies();
    for (const id of G.invasion.squadIds) {
      const c = G.roster.find(r => r.id === id);
      if (!c || c.injured) continue;
      c.counters.invasions++;
      const e = Combat.spawnCreature(c.speciesId, { x: st.x + randInt(-40, 40), y: st.y + 30 }, "ally", c.level);
      e.rosterId = c.id;
      e.hp = c.hp; e.maxHp = c.maxHp; e.atk = c.atk; e.def = c.def; e.spd = Math.max(c.spd, 70);
    }

    // The gate as a destructible entity
    G.gateEntity = {
      id: uid(), kind: "gate", type: "enemy",
      x: G.map.fort.gate.x, y: G.map.fort.gate.y,
      hp: 80, maxHp: 80, def: 2
    };
    G.entities.push(G.gateEntity);

    // Boss + extra defenders inside
    Combat.spawnCaptain(boss, G.map.fort.inside);
    Combat.spawnCreature("troll", G.map.fort.inside, "enemy", boss.rank + 1);
    Combat.spawnCreature("drake", { x: G.map.fort.inside.x - 60, y: G.map.fort.inside.y }, "enemy", boss.rank);
    // Wall archers flanking the gate — bring shields (or a boar to hide behind)
    const gt = G.map.fort.gate;
    Combat.spawnArcher((gt.tx - 3 + 0.5) * TILE_SIZE, (gt.ty + 0.5) * TILE_SIZE - 6);
    Combat.spawnArcher((gt.tx + 3 + 0.5) * TILE_SIZE, (gt.ty + 0.5) * TILE_SIZE - 6);

    Game.log(`⚔ You march on Bramblefang Fort. ${Captains.fullName(boss)} commands the defense.`, true);
    Game.closePanels();
  },

  onGateBroken(attacker) {
    if (G.invasion) G.invasion.gateBroken = true;
    // Open the gate tile so everyone can pass
    const g = G.map.fort.gate;
    G.map.tiles[g.ty * G.map.w + g.tx] = TILE.FLOOR;
    G.gateEntity = null;
    Game.log("The fort gate splinters apart! The way is open.", true);
    if (attacker && attacker.rosterId) {
      const c = G.roster.find(r => r.id === attacker.rosterId);
      if (c) {
        c.counters.gateBreaks++;
        Creatures.addTrait(c, "gatebreaker", "shattered the Bramblefang gate");
        Creatures.checkEvolution(c);
      }
    }
  },

  onBossDown() {
    G.fortCaptured = true;
    G.mode = "explore";
    Game.log("★ BRAMBLEFANG FORT IS YOURS. Your banner rises over the Thornwood.", true);
    // Squad rewards: xp, loyalty, raider trait chance, promotion checks
    for (const id of (G.invasion ? G.invasion.squadIds : [])) {
      const c = G.roster.find(r => r.id === id);
      if (!c) continue;
      Creatures.gainXP(c, 40);
      Creatures.addLoyalty(c, 8);
      if (chance(0.5)) Creatures.addTrait(c, "raider", "stormed Bramblefang Fort");
      Army.checkPromotion(c);
      Creatures.checkEvolution(c);
    }
    // Bring squad home, clear the walls
    this.recallSquad();
    this.clearArchers();
    G.invasion = null;
    // The warband will want it back...
    this.scheduleRaid(90, "The scattered warband regroups to retake the fort");
  },

  abort() {
    if (G.mode !== "invasion") return;
    G.mode = "explore";
    Game.log("You withdraw from the fort assault.");
    this.recallSquad();
    this.clearArchers();
    if (G.gateEntity) {
      const gi = G.entities.indexOf(G.gateEntity);
      if (gi >= 0) G.entities.splice(gi, 1);
      G.gateEntity = null;
    }
    G.invasion = null;
  },

  recallSquad() {
    Combat.despawnAllAllies();
    // Field the standing warband again if it was out
    if (G.warbandOut) for (const c of Army.deployed()) Combat.spawnAllyFor(c);
  },

  clearArchers() {
    for (let i = G.entities.length - 1; i >= 0; i--) {
      if (G.entities[i].kind === "archer") G.entities.splice(i, 1);
    }
  },

  // ---------- Base defense raids ----------

  scheduleRaid(seconds, why) {
    G.raid = { t: seconds, active: false };
    Game.log(`⚠ Scouts report: ${why}. Raid on your base in ~${Math.round(seconds)}s. Assign guards! (R)`, true);
  },

  updateRaid(dt) {
    if (!G.raid) return;
    if (!G.raid.active) {
      G.raid.t -= dt;
      if (G.raid.t <= 0) this.launchRaid();
    } else {
      // Raid ends when all raiders are gone
      const raiders = G.entities.filter(e => e.raider);
      const flag = G.entities.find(e => e.baseFlag);
      if (!flag) { this.raidResult(false); return; }
      if (raiders.length === 0) { this.raidResult(true); return; }
    }
  },

  launchRaid() {
    G.raid.active = true;
    const base = G.map.base;
    const caps = G.captains.filter(c => c.alive && !c.broken);
    const leader = caps.length ? pick(caps) : null;

    // The base flag is what raiders want to burn
    const flag = { id: uid(), kind: "gate", baseFlag: true, type: "ally", x: base.x, y: base.y, hp: 100, maxHp: 100, def: 0 };
    G.entities.push(flag);

    const spawn = { x: base.x + 160, y: base.y - 120 };
    for (let i = 0; i < 3; i++) {
      const e = Combat.spawnCreature(pick(["boar", "imp", "drake"]), spawn, "enemy", leader ? leader.rank + 1 : 2);
      e.raider = true; e.aggro = true;
      e.homeX = base.x; e.homeY = base.y; // they converge on the flag
    }
    if (leader) {
      const capE = Combat.spawnCaptain(leader, spawn);
      capE.raider = true; capE.aggro = true;
      Captains.remember(leader, "Led a raid on the Warden's base");
    }

    // Guards deploy as allies at the base
    for (const c of Army.guards()) {
      const e = Combat.spawnCreature(c.speciesId, { x: base.x + randInt(-50, 50), y: base.y + randInt(-30, 30) }, "ally", c.level);
      e.rosterId = c.id; e.guard = true;
      e.hp = c.hp; e.maxHp = c.maxHp; e.def = c.def + (c.traits.includes("defender") ? TRAITS.defender.guardDef : 0);
      e.atk = c.atk; e.spd = Math.max(c.spd, 65);
    }

    Game.log(`🔥 RAID! ${leader ? Captains.fullName(leader) : "The warband"} attacks your base! Defend the banner!`, true);
  },

  // Raiders converge on the flag: give them the flag as target via homeX/Y and proximity attack
  raidTargeting() {
    const flag = G.entities.find(e => e.baseFlag);
    if (!flag) return;
    for (const e of G.entities) {
      if (!e.raider || e.kind === "gate") continue;
      // If nothing closer to fight, chew on the flag
      const nearAlly = G.entities.some(o => (o.type === "ally" && !o.baseFlag && dist(e, o) < 100)) || dist(e, G.player) < 100;
      if (!nearAlly) {
        if (dist(e, flag) > 30) Combat.moveToward(e, flag, 1 / 60, 1);
        else if (e.hitCd <= 0) { e.hitCd = 0.9; Combat.dealDamage(e, flag); }
      }
    }
  },

  raidResult(success) {
    // Clean up
    for (let i = G.entities.length - 1; i >= 0; i--) {
      const e = G.entities[i];
      if (e.baseFlag) G.entities.splice(i, 1);
      else if (e.raider) G.entities.splice(i, 1);
      else if (e.guard) {
        const c = G.roster.find(r => r.id === e.rosterId);
        if (c) c.hp = Math.max(1, Math.floor(e.hp));
        G.entities.splice(i, 1);
      }
    }
    if (success) {
      Game.log("★ The raid is broken! Your banner still stands.", true);
      for (const c of Army.guards()) {
        c.counters.defenses++;
        Creatures.gainXP(c, 30);
        Creatures.addLoyalty(c, 6);
        if (chance(0.5)) Creatures.addTrait(c, "defender", "held the base against raiders");
        Army.checkPromotion(c);
        Creatures.checkEvolution(c);
      }
    } else {
      const loss = Math.min(G.player.gold, 20);
      G.player.gold -= loss;
      Game.log(`✖ Your banner was torn down. Raiders made off with ${loss} gold.`, true);
      const caps = G.captains.filter(c => c.alive && !c.broken);
      if (caps.length) Captains.promote(pick(caps), "sacked the Warden's base");
    }
    G.raid = null;
    // Another raid brews eventually
    this.scheduleRaid(randInt(180, 260), "warband drums echo in the deep woods");
  }
};
