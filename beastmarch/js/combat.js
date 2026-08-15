// js/combat.js — entities: wild creatures, camp enemies, captains, fort archers,
// the Thornwood Stag, warband allies, gates. Real-time AI, status effects
// (burn/root/frenzy), separation steering, capture, atlas rendering.
"use strict";

const Combat = {
  RADIUS: 12,

  // ---------- Spawning ----------

  spawnWorld() {
    G.entities = [];
    const map = G.map;
    const wildSpecies = ["boar", "imp", "fox", "slime", "moth"];
    for (const den of map.dens) {
      const n = randInt(2, 3);
      for (let i = 0; i < n; i++) this.spawnCreature(pick(wildSpecies), den, "wild", randInt(1, 2));
    }
    const campSpecies = ["boar", "imp", "drake", "troll", "harpy"];
    const campCaps = G.captains.filter(c => c.alive && !c.broken && c.location.startsWith("camp"));
    map.camps.forEach((camp, i) => {
      const n = randInt(1, 2);
      for (let j = 0; j < n; j++) this.spawnCreature(pick(campSpecies), camp, "enemy", randInt(2, 3));
      const cap = campCaps.find(c => c.location === "camp" + i);
      if (cap) this.spawnCaptain(cap, camp);
    });
    if (!G.fortCaptured) {
      this.spawnCreature("troll", map.fort.inside, "enemy", 3);
      this.spawnCreature("drake", map.fort.inside, "enemy", 3);
    }
    // The Thornwood Stag — one Great Beast roams the deep wood
    if (!G.stagBound && !G.roster.some(c => c.speciesId === "stag")) {
      const mid = { x: map.w * TILE_SIZE * 0.35, y: map.h * TILE_SIZE * 0.35 };
      const stag = this.spawnCreature("stag", mid, "wild", 5);
      stag.greatBeast = true;
    }
  },

  spawnCreature(speciesId, near, type, level) {
    const s = SPECIES[speciesId];
    const lv = level || 1;
    const e = {
      id: uid(), kind: "creature", type,
      speciesId, level: lv,
      x: near.x + randInt(-40, 40), y: near.y + randInt(-40, 40),
      hp: s.hp + lv * 5, maxHp: s.hp + lv * 5,
      atk: s.atk + lv, def: s.def, spd: s.spd,
      homeX: near.x, homeY: near.y,
      aggro: false, hitCd: 0, flashT: 0, wanderT: 0, dx: 0, dy: 0,
      enraged: 0, burnT: 0, rootT: 0, frenzyT: 0, face: 1
    };
    this.findOpenSpot(e);
    G.entities.push(e);
    return e;
  },

  spawnCaptain(cap, near) {
    const lv = cap.level;
    const str = cap.strength.key, wk = cap.weakness.key;
    const e = {
      id: uid(), kind: "captain", type: "enemy", capId: cap.id,
      x: near.x + randInt(-30, 30), y: near.y + randInt(-30, 30),
      hp: 40 + lv * 8 + cap.rank * 10, maxHp: 40 + lv * 8 + cap.rank * 10,
      atk: 8 + lv + (str === "berserker" ? 3 : 0),
      def: 3 + cap.rank + (str === "thickHide" ? 3 : 0) - (wk === "thinSkin" ? 2 : 0),
      spd: 60 + (str === "quick" ? 20 : 0) - (wk === "slow" ? 15 : 0),
      homeX: near.x, homeY: near.y,
      aggro: false, hitCd: 0, flashT: 0, wanderT: 0, dx: 0, dy: 0,
      enraged: 0, burnT: 0, rootT: 0, frenzyT: 0, face: 1
    };
    this.findOpenSpot(e);
    G.entities.push(e);
    if (cap.strength.key === "packLeader") this.spawnCreature(pick(["boar", "imp"]), near, "enemy", cap.rank);
    return e;
  },

  // Fort wall archer: stationary, shoots arrows at intruders
  spawnArcher(x, y) {
    const e = {
      id: uid(), kind: "archer", type: "enemy",
      x, y, hp: 16, maxHp: 16, atk: 5, def: 1, spd: 0,
      homeX: x, homeY: y, aggro: false, hitCd: 0, flashT: 0,
      wanderT: 0, dx: 0, dy: 0, enraged: 0, burnT: 0, rootT: 0, frenzyT: 0, face: 1
    };
    G.entities.push(e);
    return e;
  },

  spawnAllyFor(c) {
    if (G.entities.some(e => e.rosterId === c.id)) return;
    const s = SPECIES[c.speciesId];
    const e = this.spawnCreature(c.speciesId, { x: G.player.x + randInt(-30, 30), y: G.player.y + randInt(20, 40) }, "ally", c.level);
    e.rosterId = c.id;
    e.hp = c.hp; e.maxHp = c.maxHp; e.atk = c.atk; e.def = c.def;
    e.spd = Math.max(c.spd, s.greatBeast ? c.spd : 70);
    if (c.traits.includes("beastBonded")) e.atk += TRAITS.beastBonded.followAtk;
    return e;
  },

  despawnAllyFor(c) {
    for (let i = G.entities.length - 1; i >= 0; i--) {
      const e = G.entities[i];
      if (e.rosterId === c.id) {
        c.hp = Math.max(1, Math.floor(e.hp));
        G.entities.splice(i, 1);
      }
    }
  },

  despawnAllAllies() {
    for (let i = G.entities.length - 1; i >= 0; i--) {
      const e = G.entities[i];
      if (e.type === "ally" && e.rosterId) {
        const c = G.roster.find(r => r.id === e.rosterId);
        if (c) c.hp = Math.max(1, Math.floor(e.hp));
        G.entities.splice(i, 1);
      }
    }
  },

  spawnAmbush(cap) {
    const p = G.player;
    const near = { x: p.x + randInt(-90, 90), y: p.y - 100 };
    const capE = this.spawnCaptain(cap, near);
    capE.aggro = true;
    for (let i = 0; i < 2; i++) {
      const e = this.spawnCreature(pick(["imp", "fox", "boar"]), near, "enemy", cap.rank);
      e.aggro = true;
    }
  },

  spawnCampReinforcement() {
    const camp = pick(G.map.camps);
    this.spawnCreature(pick(["boar", "imp", "drake", "harpy"]), camp, "enemy", randInt(2, 3));
  },

  findOpenSpot(e) {
    let tries = 0;
    while (!MapSys.walkable(G.map, e.x, e.y, this.RADIUS, false) && tries < 30) {
      e.x = e.homeX + randInt(-60, 60); e.y = e.homeY + randInt(-60, 60); tries++;
    }
  },

  // ---------- Update ----------

  update(dt) {
    for (let i = G.entities.length - 1; i >= 0; i--) {
      const e = G.entities[i];
      if (e.kind === "gate") continue;
      e.hitCd = Math.max(0, e.hitCd - dt);
      e.flashT = Math.max(0, e.flashT - dt);
      e.enraged = Math.max(0, e.enraged - dt);
      e.frenzyT = Math.max(0, (e.frenzyT || 0) - dt);
      e.rootT = Math.max(0, (e.rootT || 0) - dt);
      // Burning: damage over time, small ember particles
      if (e.burnT > 0) {
        e.burnT -= dt;
        e.hp -= 3 * dt;
        if (chance(dt * 8)) Game.burst(e.x + randInt(-8, 8), e.y + randInt(-10, 4), "#e0a83a", 1);
        if (e.hp <= 0) { this.onEntityDown(e, "player"); continue; }
      }

      if (e.kind === "archer") this.updateArcher(e, dt);
      else if (e.type === "ally") this.updateAlly(e, dt);
      else this.updateEnemy(e, dt);
    }
    this.separateAllies(dt);
  },

  // Warband members shouldn't stack into one pixel pile
  separateAllies(dt) {
    const allies = G.entities.filter(e => e.type === "ally" && !e.baseFlag && e.kind !== "gate");
    for (let i = 0; i < allies.length; i++) {
      for (let j = i + 1; j < allies.length; j++) {
        const a = allies[i], b = allies[j];
        const d = dist(a, b);
        if (d < 22 && d > 0.01) {
          const push = (22 - d) * 2.2 * dt;
          const ux = (a.x - b.x) / d, uy = (a.y - b.y) / d;
          this.tryMove(a, ux * push, uy * push);
          this.tryMove(b, -ux * push, -uy * push);
        }
      }
    }
  },

  updateArcher(e, dt) {
    // Pick the closest intruder and loose an arrow
    let target = G.player, best = dist(e, G.player);
    for (const o of G.entities) {
      if (o.type === "ally" && !o.baseFlag) { const d = dist(e, o); if (d < best) { best = d; target = o; } }
    }
    if (best < 280 && e.hitCd <= 0) {
      e.hitCd = 1.6;
      e.face = target.x < e.x ? -1 : 1;
      Projectiles.spawn(e.x, e.y - 8, target.x, target.y, { kind: "arrow", from: "enemy", speed: 240, dmg: 5 });
    }
  },

  updateEnemy(e, dt) {
    if (e.rootT > 0) return; // snared in briars
    const p = G.player;
    let target = p, best = dist(e, p);
    for (const o of G.entities) {
      if (o.type === "ally") { const d = dist(e, o); if (d < best) { best = d; target = o; } }
    }
    const isStag = e.speciesId === "stag";
    const aggroRange = e.kind === "captain" ? 210 : (isStag ? 150 : (e.type === "wild" ? 120 : 180));
    if (best < aggroRange) e.aggro = true;
    if (best > 340) e.aggro = false;

    if (e.kind === "captain") {
      const cap = G.captains.find(c => c.id === e.capId);
      if (cap && cap.weakness.key === "craven" && e.hp < e.maxHp * 0.25) {
        this.moveToward(e, { x: e.homeX, y: e.homeY }, dt, 1.4);
        return;
      }
    }

    if (e.aggro) {
      if (best > 26) this.moveToward(e, target, dt, e.enraged > 0 ? 1.3 : 1);
      else if (e.hitCd <= 0) {
        e.hitCd = this.nearFearMoth(e) ? 1.3 : (isStag ? 1.1 : 0.85);
        this.dealDamage(e, target);
      }
    } else {
      e.wanderT -= dt;
      if (e.wanderT <= 0) { e.wanderT = randInt(1, 3); e.dx = rand() * 2 - 1; e.dy = rand() * 2 - 1; }
      this.tryMove(e, e.dx * e.spd * 0.3 * dt, e.dy * e.spd * 0.3 * dt);
      const leash = isStag ? 400 : 130;
      if (dist(e, { x: e.homeX, y: e.homeY }) > leash) this.moveToward(e, { x: e.homeX, y: e.homeY }, dt, 0.5);
    }
  },

  updateAlly(e, dt) {
    if (e.rootT > 0) return;
    const p = G.player;
    let target = null, best = 170;
    for (const o of G.entities) {
      if ((o.type === "enemy" || (o.type === "wild" && o.aggro)) && o.kind !== "gate") {
        const d = dist(e, o); if (d < best) { best = d; target = o; }
      }
    }
    if (!target && G.mode === "invasion" && G.gateEntity && G.gateEntity.hp > 0 && dist(e, G.gateEntity) < 120) {
      target = G.gateEntity; best = dist(e, G.gateEntity);
    }
    if (target) {
      if (best > 26) this.moveToward(e, target, dt, 1);
      else if (e.hitCd <= 0) { e.hitCd = 0.8; this.dealDamage(e, target); }
    } else if (dist(e, p) > 60) {
      this.moveToward(e, p, dt, 1.1);
    }
  },

  moveToward(e, target, dt, mult) {
    const d = dist(e, target) || 1;
    this.tryMove(e, (target.x - e.x) / d * e.spd * mult * dt, (target.y - e.y) / d * e.spd * mult * dt);
  },

  tryMove(e, vx, vy) {
    if (MapSys.walkable(G.map, e.x + vx, e.y, this.RADIUS, false)) e.x += vx;
    if (MapSys.walkable(G.map, e.x, e.y + vy, this.RADIUS, false)) e.y += vy;
    if (Math.abs(vx) + Math.abs(vy) > 0.05) {
      e.movingT = 0.12;
      if (Math.abs(vx) > 0.02) e.face = vx < 0 ? -1 : 1;
    }
  },

  nearFearMoth(e) {
    for (const o of G.entities) {
      if (o.type === "ally" && o.speciesId && SPECIES[o.speciesId].fearAura && dist(e, o) < 90) return true;
    }
    return false;
  },

  // ---------- Damage ----------

  // Central hit application: flash, float text, aggro, death handling.
  applyHit(target, dmg, source) {
    const s = target.speciesId ? SPECIES[target.speciesId] : null;
    if (s && s.dodge && chance(s.dodge)) { Game.floatText(target.x, target.y, "blink!"); return; }
    target.hp -= dmg;
    target.flashT = 0.15;
    if (target.type === "wild" || target.type === "enemy") target.aggro = true;
    Game.floatText(target.x, target.y, "-" + Math.floor(dmg));
    Game.burst(target.x, target.y, "#b8332f", 3);
    if (target.hp <= 0) this.onEntityDown(target, source);
  },

  dealDamage(attacker, target) {
    let atk = attacker.atk || 5;
    if (attacker.frenzyT > 0) atk += 3;
    if (attacker.rosterId) {
      const c = G.roster.find(r => r.id === attacker.rosterId);
      if (c) {
        if (c.traits.includes("vengeful") && attacker.hp < attacker.maxHp * 0.5) atk += TRAITS.vengeful.rageAtk;
        if (c.traits.includes("raider") && G.mode === "invasion") atk += TRAITS.raider.invadeAtk;
        if (target.kind === "captain" && c.traits.includes("captainSlayer")) atk = Math.floor(atk * TRAITS.captainSlayer.vsCaptain);
        if (target.kind === "gate") {
          const s = SPECIES[c.speciesId];
          if (s.gateBonus) atk = Math.floor(atk * s.gateBonus);
          if (c.traits.includes("gatebreaker")) atk = Math.floor(atk * TRAITS.gatebreaker.vsGate);
        }
      }
    }
    if (target === G.player) { Player.takeDamage(atk, attacker); return; }
    this.applyHit(target, Math.max(1, atk - (target.def || 0) + randInt(-1, 1)), attacker);
  },

  playerAttack() {
    const p = G.player;
    const REACH = 54, ARC = 0.8;
    const aimAng = Math.atan2(p.fy, p.fx);
    let hit = false;
    for (const e of [...G.entities]) {
      if (e.type === "ally" && !e.baseFlag) continue;
      if (e.baseFlag) continue;
      const d = dist(p, e);
      const reach = e.kind === "gate" ? REACH + 14 : REACH;
      if (d > reach) continue;
      let diff = Math.abs(Math.atan2(e.y - p.y, e.x - p.x) - aimAng);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff > ARC && d > 20) continue;
      let atk = p.atk;
      if (e.kind === "gate") atk = Math.floor(atk * 0.7);
      this.applyHit(e, Math.max(1, atk - (e.def || 0) + randInt(-1, 2)), "player");
      hit = true;
    }
    if (hit) Game.shake(1.5);
    return hit;
  },

  onEntityDown(e, attacker) {
    const idx = G.entities.indexOf(e);
    if (idx === -1) return;

    if (e.kind === "gate") {
      G.entities.splice(idx, 1);
      Invasion.onGateBroken(attacker);
      return;
    }

    Game.burst(e.x, e.y, e.type === "ally" ? "#4f8a4f" : "#b8332f", 10);

    if (e.type === "ally") {
      G.entities.splice(idx, 1);
      const c = G.roster.find(r => r.id === e.rosterId);
      if (c) {
        Creatures.knockOut(c);
        for (const o of G.entities) {
          if (o.type === "ally" && o.rosterId && dist(o, e) < 120) {
            const w = G.roster.find(r => r.id === o.rosterId);
            if (w && chance(0.4)) Creatures.addTrait(w, "vengeful", `watched ${c.name} fall`);
          }
        }
        if (attacker && attacker.kind === "captain") {
          const cap = G.captains.find(x => x.id === attacker.capId);
          if (cap) { Captains.remember(cap, `Struck down the Warden's beast ${c.name}`); cap.victories++; }
        }
      }
      return;
    }

    if (e.kind === "captain") {
      G.entities.splice(idx, 1);
      const cap = G.captains.find(c => c.id === e.capId);
      if (cap) {
        Captains.onDefeatedByPlayer(cap);
        G.player.renown++;
        Game.log(`Renown rises to ${G.player.renown}. The Marches speak your name.`);
        this.awardXP(35 + cap.rank * 10, attacker, true);
        Player.gainXP(25 + cap.rank * 8);
        G.player.gold += 8 + cap.rank * 3;
        if (G.mode === "invasion" && G.invasion && cap.id === G.invasion.bossId) Invasion.onBossDown();
      }
      return;
    }

    if (e.kind === "archer") {
      G.entities.splice(idx, 1);
      this.awardXP(8, attacker, false);
      Player.gainXP(6);
      return;
    }

    // Wild/enemy creature downed
    G.entities.splice(idx, 1);
    let gold = randInt(2, 5);
    for (const o of G.entities) {
      if (o.type === "ally" && o.speciesId && SPECIES[o.speciesId].goldFinder && dist(o, e) < 120) { gold += 3; break; }
    }
    G.player.gold += gold;
    Game.floatText(e.x, e.y, "+" + gold + "g");
    this.awardXP(10 + e.level * 4, attacker, false);
    Player.gainXP(6 + e.level * 2);
  },

  awardXP(amount, attacker, wasCaptain) {
    let earner = null;
    if (attacker && attacker.rosterId) earner = G.roster.find(r => r.id === attacker.rosterId);
    if (!earner) earner = Army.deployed()[0] || null;
    if (earner) {
      earner.counters.kills++;
      if (wasCaptain) {
        earner.counters.captainKills++;
        Creatures.addTrait(earner, "captainSlayer", "felled an enemy captain");
      }
      earner.counters.battlesWithPlayer++;
      Creatures.gainXP(earner, amount);
      Creatures.addLoyalty(earner, 2);
      Army.checkPromotion(earner);
      Creatures.checkEvolution(earner);
      const ent = G.entities.find(x => x.rosterId === earner.id);
      if (ent) { ent.atk = earner.atk; ent.maxHp = earner.maxHp; }
    }
    if (G.mode === "invasion" && G.invasion) {
      for (const id of G.invasion.squadIds) {
        const c = G.roster.find(r => r.id === id);
        if (c && c !== earner) Creatures.gainXP(c, Math.floor(amount / 2));
      }
    }
  },

  // ---------- Capture ----------

  tryCapture() {
    const p = G.player;
    let best = null, bd = 52;
    for (const e of G.entities) {
      if (e.kind !== "creature" || e.type === "ally") continue;
      if (e.hp / e.maxHp > 0.35) continue;
      const d = dist(p, e);
      if (d < bd) { bd = d; best = e; }
    }
    if (!best) { Game.toast("No weakened creature in reach. (Weaken below 35% health, then get close.)", true); return; }
    if (G.roster.length >= 12) { Game.toast("Your army is full (12).", true); return; }

    // Great Beasts demand renown
    if (best.greatBeast && G.player.renown < 3) {
      Game.toast(`The Stag's eyes hold no fear of you. (Renown ${G.player.renown}/3 — defeat more captains first.)`, true);
      Game.log("The Thornwood Stag shrugs off your binding — you are not yet worthy of its trust.");
      best.hp = Math.min(best.maxHp, best.hp + best.maxHp * 0.15);
      best.aggro = true;
      return;
    }

    const hpRatio = best.hp / best.maxHp;
    let odds = 0.35 + (1 - hpRatio) * 0.6;
    if (Skills.has("binder")) odds += 0.15;
    if (best.enraged > 0) odds -= 0.2;
    if (best.greatBeast) odds -= 0.15;
    if (chance(clamp(odds, 0.1, 0.95))) {
      const c = Creatures.make(best.speciesId, best.level);
      c.hp = Math.max(1, Math.floor(best.hp));
      Army.add(c);
      if (best.greatBeast) {
        G.stagBound = true;
        Game.log(`★★ THE THORNWOOD STAG BOWS ITS ANTLERS. ${c.name} the Great Beast joins your banner!`, true);
      }
      G.entities.splice(G.entities.indexOf(best), 1);
      Game.floatText(best.x, best.y, "CAPTURED!");
      Game.burst(best.x, best.y, "#e0a83a", 16);
    } else {
      best.enraged = 6;
      best.hp = Math.min(best.maxHp, best.hp + best.maxHp * 0.1);
      best.aggro = true;
      Game.floatText(best.x, best.y, "broke free!");
      Game.toast("It broke free and is enraged!", true);
    }
  },

  // ---------- Drawing ----------

  captainSheet(cap) {
    if (!cap) return "capt";
    if (cap.title === "the Turncoat") return "turncoat";
    if (cap.rank >= 5) return "boss";
    if (cap.rank >= 3) return "capt_elite";
    return "capt";
  },

  draw(ctx, cam) {
    const sorted = [...G.entities].sort((a, b) => a.y - b.y);
    // Light pass: lantern slimes and hearthlight glow warm pools
    for (const e of sorted) {
      if (e.type === "ally" && e.speciesId && SPECIES[e.speciesId].goldFinder) {
        const sx = e.x - cam.x, sy = e.y - cam.y;
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        const g = ctx.createRadialGradient(sx, sy, 4, sx, sy, 52);
        g.addColorStop(0, "rgba(224,196,90,0.22)"); g.addColorStop(1, "rgba(224,196,90,0)");
        ctx.fillStyle = g; ctx.fillRect(sx - 52, sy - 52, 104, 104);
        ctx.restore();
      }
    }
    for (const e of sorted) {
      const sx = e.x - cam.x, sy = e.y - cam.y;
      if (sx < -80 || sy < -80 || sx > cam.w + 80 || sy > cam.h + 80) continue;
      e.movingT = Math.max(0, (e.movingT || 0) - 1 / 60);

      if (e.kind === "gate") {
        if (e.baseFlag) {
          ctx.fillStyle = "#3a2a18"; ctx.fillRect(sx - 2, sy - 26, 4, 40);
          Sprites.draw(ctx, "banner_red", sx + 8, sy - 2, 2, false);
          this.drawBar(ctx, sx, sy - 34, e.hp / e.maxHp, "#e0a83a");
        } else {
          this.drawBar(ctx, sx, sy - 26, e.hp / e.maxHp, "#e0a83a");
        }
        continue;
      }

      if (e.kind === "creature" && e.type !== "ally" && e.hp / e.maxHp <= 0.35) {
        ctx.strokeStyle = "#e0a83a"; ctx.lineWidth = 2;
        const r = (e.greatBeast ? 30 : 16) + Math.sin(G.time * 6) * 2;
        ctx.beginPath(); ctx.arc(sx, sy + 8, r, 0, Math.PI * 2); ctx.stroke();
      }

      let sheet, scale = 2, hover = 0;
      if (e.kind === "captain") {
        const cap = G.captains.find(c => c.id === e.capId);
        sheet = this.captainSheet(cap);
      } else if (e.kind === "archer") {
        sheet = "capt"; scale = 2;
      } else {
        const s = SPECIES[e.speciesId];
        sheet = s.sheet;
        scale = s.scale || 2;
        if (e.rosterId) {
          const c = G.roster.find(r => r.id === e.rosterId);
          if (c && c.evolved) sheet = s.sheet + "_evo";
        }
        if (s.hover) hover = Math.sin(G.time * 4 + e.id) * 3 - 4;
      }

      const feetY = sy + 12 + hover;
      const moving = (e.movingT || 0) > 0;
      Sprites.shadow(ctx, sx, sy + 13, (e.speciesId === "stag" ? 22 : 10 * (scale / 2) + 2));
      const frame = Sprites.anim(sheet, moving, G.time + e.id * 0.37);
      Sprites.draw(ctx, frame, sx, feetY, scale, e.face === -1);

      if (e.flashT > 0) {
        ctx.save();
        ctx.globalAlpha = 0.65; ctx.globalCompositeOperation = "lighter";
        Sprites.draw(ctx, frame, sx, feetY, scale, e.face === -1);
        ctx.restore();
      }
      if (e.rootT > 0) { // briar snare
        ctx.strokeStyle = "#4f7a44"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sx, sy + 10, 12, 0, Math.PI * 2); ctx.stroke();
      }

      if (e.kind === "captain") {
        const cap = G.captains.find(c => c.id === e.capId);
        if (cap) {
          ctx.fillStyle = "rgba(12,20,16,0.7)";
          ctx.font = "9px monospace"; ctx.textAlign = "center";
          const label = cap.name + " \u00b7 " + RANKS[cap.rank];
          const tw = ctx.measureText(label).width;
          ctx.fillRect(sx - tw / 2 - 3, sy - 42, tw + 6, 12);
          ctx.fillStyle = "#e7dcbf";
          ctx.fillText(label, sx, sy - 33);
          ctx.textAlign = "left";
        }
      }
      if (e.speciesId === "stag" && e.type !== "ally") {
        ctx.fillStyle = "rgba(12,20,16,0.7)"; ctx.font = "9px monospace"; ctx.textAlign = "center";
        ctx.fillRect(sx - 52, sy - 66, 104, 12);
        ctx.fillStyle = "#8fba6a";
        ctx.fillText("THE THORNWOOD STAG", sx, sy - 57);
        ctx.textAlign = "left";
      }

      if (e.hp < e.maxHp) this.drawBar(ctx, sx, sy - (e.speciesId === "stag" ? 50 : 24), e.hp / e.maxHp, e.type === "ally" ? "#4f8a4f" : "#b8332f");
      if (e.type === "ally") { ctx.fillStyle = "#4f8a4f"; ctx.fillRect(sx - 2, sy - (e.hp < e.maxHp ? 30 : 26), 5, 5); }
      if (e.enraged > 0) { ctx.fillStyle = "#b8332f"; ctx.font = "bold 13px monospace"; ctx.fillText("!", sx - 2, sy - 28); }
    }
  },

  drawBar(ctx, cx, cy, ratio, color) {
    ctx.fillStyle = "#0c1410"; ctx.fillRect(cx - 14, cy, 28, 4);
    ctx.fillStyle = color; ctx.fillRect(cx - 13, cy + 1, 26 * clamp(ratio, 0, 1), 2);
  }
};
