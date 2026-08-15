// js/player.js — the Warden: WASD move, mouse aim, LMB sword, RMB bow,
// SPACE dodge roll, 1-4 abilities (Focus), XP/levels, renown.
"use strict";

const Player = {
  make(map) {
    return {
      x: map.playerStart.x, y: map.playerStart.y,
      hp: 60, maxHp: 60, atk: 9,
      spd: 130, fx: 0, fy: 1, face: 1, moving: false,
      attackCd: 0, swingT: 0, invulnT: 0, bowCd: 0,
      dodgeCd: 0, dodgeT: 0, ddx: 0, ddy: 0,
      focus: 60, focusMax: 100,
      level: 1, xp: 0, skillPoints: 1, renown: 0,
      abilityCds: {},
      gold: 10
    };
  },

  xpNeeded(p) { return 30 + p.level * 25; },

  gainXP(amount) {
    const p = G.player;
    p.xp += amount;
    while (p.xp >= this.xpNeeded(p)) {
      p.xp -= this.xpNeeded(p);
      p.level++;
      p.skillPoints++;
      p.maxHp += 2; p.hp = p.maxHp;
      p.focus = p.focusMax;
      Game.burst(p.x, p.y, "#e0a83a", 18);
      Game.log(`★ The Warden reaches level ${p.level}! Skill point earned (K to open the tree).`, true);
    }
  },

  update(dt, keys) {
    const p = G.player;
    p.attackCd = Math.max(0, p.attackCd - dt);
    p.swingT = Math.max(0, p.swingT - dt);
    p.invulnT = Math.max(0, p.invulnT - dt);
    p.bowCd = Math.max(0, p.bowCd - dt);
    p.dodgeCd = Math.max(0, p.dodgeCd - dt);
    for (const k in p.abilityCds) p.abilityCds[k] = Math.max(0, p.abilityCds[k] - dt);

    // Focus: slow regen; melee hits add more (see attack())
    p.focus = Math.min(p.focusMax, p.focus + 4 * dt);

    // Hearthlight heal-over-time
    if (G.hearthT > 0) {
      G.hearthT -= dt;
      p.hp = Math.min(p.maxHp, p.hp + 4 * dt);
      for (const e of G.entities) if (e.type === "ally" && !e.baseFlag) e.hp = Math.min(e.maxHp, e.hp + 4 * dt);
      if (chance(dt * 6)) Game.burst(p.x + randInt(-14, 14), p.y + randInt(-14, 14), "#e0a83a", 1);
    }

    // Dodge roll in progress: fast dash, invulnerable
    if (p.dodgeT > 0) {
      p.dodgeT -= dt;
      const nx = p.x + p.ddx * 480 * dt, ny = p.y + p.ddy * 480 * dt;
      if (MapSys.walkable(G.map, nx, p.y, 10, false)) p.x = nx;
      if (MapSys.walkable(G.map, p.x, ny, 10, false)) p.y = ny;
      p.moving = true;
      if (chance(0.5)) Game.burst(p.x, p.y + 10, "#cdbf99", 1);
    } else {
      let dx = 0, dy = 0;
      if (keys["ArrowLeft"] || keys["a"]) dx -= 1;
      if (keys["ArrowRight"] || keys["d"]) dx += 1;
      if (keys["ArrowUp"] || keys["w"]) dy -= 1;
      if (keys["ArrowDown"] || keys["s"]) dy += 1;
      p.moving = !!(dx || dy);
      if (dx || dy) {
        const len = Math.sqrt(dx * dx + dy * dy);
        dx /= len; dy /= len;
        p.lastDx = dx; p.lastDy = dy;
        const nx = p.x + dx * p.spd * dt, ny = p.y + dy * p.spd * dt;
        if (MapSys.walkable(G.map, nx, p.y, 10, false)) p.x = nx;
        if (MapSys.walkable(G.map, p.x, ny, 10, false)) p.y = ny;
      }
      // Facing: aim at the mouse; fall back to move direction
      if (Game.mouse && Game.mouse.active) {
        const aim = Game.aimWorld;
        const ax = aim.x - p.x, ay = aim.y - p.y;
        const alen = Math.sqrt(ax * ax + ay * ay) || 1;
        p.fx = ax / alen; p.fy = ay / alen;
        p.face = ax < 0 ? -1 : 1;
      } else if (dx || dy) {
        p.fx = dx; p.fy = dy;
        if (Math.abs(dx) > 0.01) p.face = dx < 0 ? -1 : 1;
      }
    }

    // Hold LMB to keep swinging
    if (Game.mouse && Game.mouse.down && !Game.openPanel) this.attack();
    // Slow ambient regen
    p.hp = Math.min(p.maxHp, p.hp + dt * 0.6);
  },

  attack() {
    const p = G.player;
    if (p.attackCd > 0 || p.dodgeT > 0) return;
    p.attackCd = Skills.has("swift") ? 0.28 : 0.35;
    p.swingT = 0.15;
    const hit = Combat.playerAttack();
    if (hit) p.focus = Math.min(p.focusMax, p.focus + 8); // steel feeds the folkcraft
  },

  shoot() {
    const p = G.player;
    if (p.bowCd > 0 || p.dodgeT > 0) return;
    p.bowCd = 0.5;
    const aim = Game.aimWorld;
    Projectiles.spawn(p.x, p.y - 6, aim.x, aim.y - 6, {
      kind: "arrow", from: "player", speed: 340, dmg: 6,
      pierce: Skills.has("piercer") ? 1 : 0
    });
  },

  dodge() {
    const p = G.player;
    if (p.dodgeCd > 0 || p.dodgeT > 0) return;
    p.dodgeCd = Skills.has("roller") ? 0.63 : 0.9;
    p.dodgeT = 0.22;
    p.invulnT = Math.max(p.invulnT, 0.26);
    // Roll in move direction, or facing if standing still
    p.ddx = p.lastDx !== undefined && p.moving ? p.lastDx : p.fx;
    p.ddy = p.lastDy !== undefined && p.moving ? p.lastDy : p.fy;
    if (!p.ddx && !p.ddy) { p.ddx = p.fx; p.ddy = p.fy; }
  },

  castSlot(i) {
    const id = G.abilitySlots[i];
    if (!id) { Game.toast(`No skill on ${i + 1} yet — press K to learn abilities.`, true); return; }
    const ab = ABILITIES[id];
    const p = G.player;
    if ((p.abilityCds[id] || 0) > 0) return;
    if (p.focus < ab.focus) { Game.toast(`Not enough Focus for ${ab.name}. Land sword hits to build it.`, true); return; }
    if (ab.cast() !== false) {
      p.focus -= ab.focus;
      p.abilityCds[id] = ab.cd;
    }
  },

  takeDamage(amount, attacker) {
    const p = G.player;
    if (p.invulnT > 0) return;
    const dmg = Math.max(1, amount + randInt(-1, 1));
    p.hp -= dmg;
    p.invulnT = 0.5;
    Game.floatText(p.x, p.y, "-" + dmg);
    Game.shake(3);
    if (p.hp <= 0) this.defeated(attacker);
  },

  defeated(attacker) {
    const p = G.player;
    if (attacker && attacker.kind === "captain") {
      const cap = G.captains.find(c => c.id === attacker.capId);
      if (cap) Captains.onDefeatedPlayer(cap);
    }
    Game.log("✖ You were struck down... you wake at your base, weakened.", true);
    if (G.mode === "invasion") Invasion.abort();
    for (const e of G.entities) e.aggro = false;
    const loss = Math.min(p.gold, 5);
    p.gold -= loss;
    p.hp = Math.floor(p.maxHp * 0.5);
    p.focus = 0;
    p.x = G.map.playerStart.x; p.y = G.map.playerStart.y;
    p.invulnT = 2;
    const fol = Army.deployed()[0];
    if (fol) Creatures.addLoyalty(fol, -3);
  },

  interact() {
    const p = G.player;
    if (dist(p, G.map.base) < 60) {
      if (p.gold >= 5) {
        p.gold -= 5;
        p.hp = p.maxHp;
        for (const c of G.roster) if (!c.injured) c.hp = c.maxHp;
        for (const e of G.entities) if (e.type === "ally" && !e.baseFlag) e.hp = e.maxHp;
        Game.toast("The warband rests by the banner. Fully healed (-5 gold).");
      } else Game.toast("Healing at the banner costs 5 gold.", true);
      return;
    }
    if (!G.fortCaptured && dist(p, G.map.fort.gate) < 70 && !Captains.fortBoss(G.captains)) {
      G.fortCaptured = true;
      Game.log("★ With no captain left to hold it, Bramblefang Fort is yours.", true);
      return;
    }
    Game.toast("Nothing to do here. (Heal at your banner, claim forts at gates.)");
  },

  draw(ctx, cam) {
    const p = G.player;
    const sx = p.x - cam.x, sy = p.y - cam.y;
    Sprites.shadow(ctx, sx, sy + 13, 11);
    if (!(p.invulnT > 0 && p.dodgeT <= 0 && Math.floor(G.time * 12) % 2)) {
      const frame = p.invulnT > 1.4 ? "warden_hit_f1" : Sprites.anim("warden", p.moving, G.time);
      ctx.save();
      if (p.dodgeT > 0) { // lean into the roll
        ctx.translate(sx, sy);
        ctx.rotate(p.face * (0.22 - p.dodgeT) * 6);
        ctx.translate(-sx, -sy);
      }
      Sprites.draw(ctx, frame, sx, sy + 12, 2, p.face === -1);
      ctx.restore();
    }
    if (p.swingT > 0) {
      ctx.strokeStyle = "#e7dcbf"; ctx.lineWidth = 3;
      ctx.beginPath();
      const ang = Math.atan2(p.fy, p.fx);
      ctx.arc(sx, sy, 30, ang - 0.7, ang + 0.7);
      ctx.stroke();
    }
  }
};
