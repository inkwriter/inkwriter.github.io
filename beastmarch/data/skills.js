// data/skills.js — the Warden's skill tree: Warpath (steel), Folkcraft (granny
// magic and ember-craft), Wardenship (command). Ability nodes grant a hotbar
// skill on 1-4; passive nodes modify stats via Skills.bonus() lookups.
"use strict";

const SKILL_TREE = {
  // ---- Warpath ----
  cleave:   { branch: "Warpath", name: "Cleaving Arc", desc: "ABILITY: sweep your blade in a full circle. 25 Focus.", ability: "cleave", req: [] },
  lunge:    { branch: "Warpath", name: "Lunging Strike", desc: "ABILITY: dash to your cursor and strike one foe hard. 20 Focus.", ability: "lunge", req: ["cleave"] },
  swift:    { branch: "Warpath", name: "Swift Blade", desc: "Sword cooldown -20%.", req: [] },
  piercer:  { branch: "Warpath", name: "Piercer", desc: "Arrows punch through one extra enemy.", req: ["swift"] },
  roller:   { branch: "Warpath", name: "Fleet Foot", desc: "Dodge roll cooldown -30%.", req: [] },

  // ---- Folkcraft ----
  ember:    { branch: "Folkcraft", name: "Emberball", desc: "ABILITY: hurl a burning coal that bursts and ignites. 30 Focus.", ability: "ember", req: [] },
  ember2:   { branch: "Folkcraft", name: "Stoked Coals", desc: "Emberball burst is wider and burns longer.", req: ["ember"] },
  thorn:    { branch: "Folkcraft", name: "Thornsnare", desc: "ABILITY: briars erupt at your cursor, rooting foes. 25 Focus.", ability: "thorn", req: ["ember"] },
  hearth:   { branch: "Folkcraft", name: "Hearthlight", desc: "ABILITY: a warm ember mends you and nearby allies over time. 35 Focus.", ability: "hearth", req: [] },
  deepwell: { branch: "Folkcraft", name: "Deep Well", desc: "+40 max Focus.", req: [] },

  // ---- Wardenship ----
  command1: { branch: "Wardenship", name: "Warband I", desc: "+1 Command (field more creatures).", req: [] },
  command2: { branch: "Wardenship", name: "Warband II", desc: "+1 Command. Requires Renown 3.", req: ["command1"], renown: 3 },
  rally:    { branch: "Wardenship", name: "Rally", desc: "ABILITY: your warband mends and fights in a frenzy. 30 Focus.", ability: "rally", req: ["command1"] },
  binder:   { branch: "Wardenship", name: "Bindmaster", desc: "+15% capture chance.", req: [] },
  beastlord:{ branch: "Wardenship", name: "Beastlord", desc: "Great Beasts cost 2 Command instead of 3. Requires Renown 5.", req: ["command2"], renown: 5 }
};

const ABILITIES = {
  cleave: { name: "Cleaving Arc", focus: 25, cd: 4,
    cast() {
      const p = G.player;
      let hits = 0;
      for (const e of [...G.entities]) {
        if (e.type === "ally" || e.baseFlag) continue;
        if (dist(p, e) < 70) {
          const dmg = Math.max(1, Math.floor(p.atk * 1.2) - (e.def || 0));
          Combat.applyHit(e, dmg, "player"); hits++;
        }
      }
      Game.burst(p.x, p.y, "#e7dcbf", 14);
      return hits > 0 || true;
    } },
  lunge: { name: "Lunging Strike", focus: 20, cd: 5,
    cast() {
      const p = G.player, aim = Game.aimWorld;
      const d = dist(p, aim) || 1;
      const ux = (aim.x - p.x) / d, uy = (aim.y - p.y) / d;
      const len = Math.min(d, 130);
      for (let s = 0; s < len; s += 8) { // walk the dash path, stop at walls
        const nx = p.x + ux * 8, ny = p.y + uy * 8;
        if (!MapSys.walkable(G.map, nx, ny, 10, false)) break;
        p.x = nx; p.y = ny;
      }
      Game.burst(p.x, p.y, "#cdbf99", 8);
      let best = null, bd = 46;
      for (const e of G.entities) {
        if (e.type === "ally" || e.baseFlag || e.kind === "gate") continue;
        const dd = dist(p, e); if (dd < bd) { bd = dd; best = e; }
      }
      if (best) Combat.applyHit(best, Math.max(1, p.atk * 2 - (best.def || 0)), "player");
      p.invulnT = Math.max(p.invulnT, 0.25);
      return true;
    } },
  ember: { name: "Emberball", focus: 30, cd: 3,
    cast() {
      const p = G.player, aim = Game.aimWorld;
      Projectiles.spawn(p.x, p.y, aim.x, aim.y, {
        kind: "ember", from: "player", speed: 260, dmg: 8,
        burst: Skills.has("ember2") ? 60 : 45,
        burstDmg: Skills.has("ember2") ? 18 : 14,
        burn: Skills.has("ember2") ? 4.5 : 3
      });
      return true;
    } },
  thorn: { name: "Thornsnare", focus: 25, cd: 6,
    cast() {
      const aim = Game.aimWorld, p = G.player;
      const tx = dist(p, aim) > 210 ? null : aim;
      const at = tx || { x: p.x + p.fx * 200, y: p.y + p.fy * 200 };
      let rooted = 0;
      for (const e of G.entities) {
        if (e.type === "ally" || e.baseFlag || e.kind === "gate") continue;
        if (dist(at, e) < 55) {
          e.rootT = 2.5;
          Combat.applyHit(e, 4, "player");
          rooted++;
        }
      }
      Game.burst(at.x, at.y, "#4f7a44", 16, "thorn_p");
      return true;
    } },
  hearth: { name: "Hearthlight", focus: 35, cd: 12,
    cast() {
      G.hearthT = 6;
      Game.burst(G.player.x, G.player.y, "#e0a83a", 12);
      Game.log("A hearthlight kindles around you — wounds begin to close.");
      return true;
    } },
  rally: { name: "Rally", focus: 30, cd: 14,
    cast() {
      let n = 0;
      for (const e of G.entities) {
        if (e.type !== "ally" || e.baseFlag) continue;
        e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.3);
        e.frenzyT = 6; n++;
        Game.burst(e.x, e.y, "#e0a83a", 6);
      }
      if (n === 0) { Game.toast("No warband in the field to rally.", true); return false; }
      Game.log("The Warden's horn sounds — the warband rallies!");
      return true;
    } }
};

// Skill state helpers (learned set lives in G.skills)
const Skills = {
  has(id) { return G.skills && G.skills.includes(id); },
  canLearn(id) {
    const n = SKILL_TREE[id];
    if (!n || this.has(id) || G.player.skillPoints < 1) return false;
    if (n.renown && G.player.renown < n.renown) return false;
    return n.req.every(r => this.has(r));
  },
  learn(id) {
    if (!this.canLearn(id)) return false;
    G.skills.push(id);
    G.player.skillPoints--;
    const n = SKILL_TREE[id];
    if (n.ability && !G.abilitySlots.includes(n.ability) && G.abilitySlots.length < 4) {
      G.abilitySlots.push(n.ability);
    }
    if (id === "deepwell") { G.player.focusMax += 40; }
    Game.log(`You learn ${n.name}.` + (n.ability ? ` (key ${G.abilitySlots.indexOf(n.ability) + 1})` : ""));
    return true;
  },
  commandCap() {
    let c = 2;
    if (this.has("command1")) c++;
    if (this.has("command2")) c++;
    return c;
  },
  creatureCost(c) {
    const s = SPECIES[c.speciesId];
    if (s.greatBeast) return this.has("beastlord") ? 2 : (s.commandCost || 3);
    return 1;
  }
};
