// js/save.js — LocalStorage persistence. The map rebuilds from its seed;
// entities respawn fresh; roster, captains, player, and world flags persist.
"use strict";

const Save = {
  KEY: "beastmarch_save_v1",

  save() {
    // Sync fielded warband HP back to the roster before saving
    Combat.despawnAllAllies();
    const data = {
      seed: G.seed,
      time: G.time,
      player: {
        x: G.player.x, y: G.player.y, hp: G.player.hp, maxHp: G.player.maxHp, gold: G.player.gold,
        level: G.player.level, xp: G.player.xp, skillPoints: G.player.skillPoints,
        renown: G.player.renown, focusMax: G.player.focusMax
      },
      skills: G.skills, abilitySlots: G.abilitySlots,
      stagBound: G.stagBound,
      roster: G.roster,
      captains: G.captains,
      fortCaptured: G.fortCaptured,
      raidT: G.raid && !G.raid.active ? G.raid.t : 120,
      log: G.logEntries.slice(-40),
      uidCounter: _uid
    };
    try {
      localStorage.setItem(this.KEY, JSON.stringify(data));
      Game.toast("March recorded. (Saved)");
    } catch (e) {
      Game.toast("Save failed: " + e.message, true);
    }
    // Field the warband again
    if (G.warbandOut) for (const c of Army.deployed()) Combat.spawnAllyFor(c);
  },

  load() {
    let data;
    try { data = JSON.parse(localStorage.getItem(this.KEY)); } catch (e) { data = null; }
    if (!data) { Game.toast("No saved march found.", true); return false; }

    _uid = data.uidCounter || 1000;
    G.seed = data.seed;
    G.map = buildThornwood(G.seed);
    if (data.fortCaptured) {
      const g = G.map.fort.gate;
      G.map.tiles[g.ty * G.map.w + g.tx] = TILE.FLOOR;
    }
    G.time = data.time || 0;
    G.player = Player.make(G.map);
    Object.assign(G.player, data.player);
    G.player.face = G.player.face || 1;
    G.player.moving = false;
    G.roster = data.roster || [];
    G.captains = data.captains || [];
    G.fortCaptured = !!data.fortCaptured;
    G.stagBound = !!data.stagBound;
    G.skills = data.skills || [];
    G.abilitySlots = data.abilitySlots || [];
    G.projectiles = []; G.particles = []; G.warbandOut = true; G.hearthT = 0;
    Game.initCanopy();
    G.logEntries = data.log || [];
    G.mode = "explore";
    G.invasion = null; G.gateEntity = null; G.ambush = null;
    G.raid = { t: data.raidT || 120, active: false };
    Combat.spawnWorld();
    Game.buildMinimap();
    if (G.warbandOut) for (const c of Army.deployed()) Combat.spawnAllyFor(c);
    Game.toast("The march resumes. (Loaded)");
    Game.refreshPanels();
    return true;
  },

  reset() {
    if (!confirm("Reset the world? All creatures, captains, and grudges will be forgotten.")) return;
    localStorage.removeItem(this.KEY);
    Game.newGame();
    Game.toast("A new march begins.");
  }
};
