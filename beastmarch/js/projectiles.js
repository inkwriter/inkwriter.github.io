// js/projectiles.js — arrows (player bow + fort archers) and embers.
// Projectiles die on solid tiles, damage the opposing side, and embers
// burst into a burning AoE that enemy captains remember.
"use strict";

const Projectiles = {
  spawn(x, y, tx, ty, opt) {
    const d = Math.sqrt((tx - x) ** 2 + (ty - y) ** 2) || 1;
    G.projectiles.push({
      id: uid(), x, y,
      vx: (tx - x) / d * opt.speed, vy: (ty - y) / d * opt.speed,
      ang: Math.atan2(ty - y, tx - x),
      kind: opt.kind || "arrow", from: opt.from,
      dmg: opt.dmg, burst: opt.burst || 0, burstDmg: opt.burstDmg || 0,
      burn: opt.burn || 0, pierce: opt.pierce || 0,
      t: opt.life || 1.6, hitIds: []
    });
  },

  update(dt) {
    for (let i = G.projectiles.length - 1; i >= 0; i--) {
      const pr = G.projectiles[i];
      pr.t -= dt;
      pr.x += pr.vx * dt; pr.y += pr.vy * dt;
      let dead = pr.t <= 0;

      // Walls stop shots (arrows can fly over water; embers too)
      const tile = MapSys.tileAt(G.map, pr.x, pr.y);
      if (tile === TILE.TREE || tile === TILE.WALL || tile === TILE.ROCK) dead = true;

      if (!dead) {
        // Hit detection
        if (pr.from === "enemy") {
          const p = G.player;
          if (dist(pr, p) < 12 && p.invulnT <= 0) { Player.takeDamage(pr.dmg, null); dead = true; }
          if (!dead) for (const e of G.entities) {
            if (e.type === "ally" && !e.baseFlag && dist(pr, e) < 12) {
              Combat.applyHit(e, pr.dmg, null); dead = true; break;
            }
          }
        } else {
          for (const e of G.entities) {
            if (e.type === "ally") continue;
            if (pr.hitIds.includes(e.id)) continue;
            const r = e.kind === "gate" ? 20 : 12;
            if (dist(pr, e) < r) {
              if (pr.kind === "ember") { dead = true; break; } // burst handles damage
              Combat.applyHit(e, Math.max(1, pr.dmg - (e.def || 0)), "player");
              pr.hitIds.push(e.id);
              if (pr.pierce > 0) pr.pierce--; else { dead = true; }
              break;
            }
          }
        }
      }

      if (dead) {
        if (pr.kind === "ember") this.emberBurst(pr);
        else Game.burst(pr.x, pr.y, "#cdbf99", 3);
        G.projectiles.splice(i, 1);
      }
    }
  },

  emberBurst(pr) {
    Game.burst(pr.x, pr.y, "#e0a83a", 16, "ember");
    for (const e of [...G.entities]) {
      if (e.type === "ally" && !e.baseFlag) continue;
      if (e.baseFlag) continue;
      if (dist(pr, e) < pr.burst) {
        e.burnT = pr.burn; // damage over time
        Combat.applyHit(e, Math.max(1, pr.burstDmg - Math.floor((e.def || 0) / 2)), "player");
        // Fire leaves scars on the mind: captains burned by the ember learn to fear it
        if (e.kind === "captain") {
          const cap = G.captains.find(c => c.id === e.capId);
          if (cap && cap.fear !== "fire") {
            cap.fear = "fire";
            cap.grudge += 1;
            Captains.remember(cap, "Burned by the Warden's ember");
            Game.log(`${Captains.fullName(cap)} shrieks in the flames — it will fear fire forever.`, true);
          }
        }
      }
    }
  },

  draw(ctx, cam) {
    for (const pr of G.projectiles) {
      const sx = pr.x - cam.x, sy = pr.y - cam.y;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(pr.ang);
      const name = pr.kind === "ember" ? "ember" : "arrow";
      const f = ATLAS_FRAMES[name];
      if (f && Sprites.ready) {
        if (pr.kind === "ember") { // glow halo
          ctx.save(); ctx.globalCompositeOperation = "lighter";
          const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 16);
          g.addColorStop(0, "rgba(224,168,58,0.5)"); g.addColorStop(1, "rgba(224,168,58,0)");
          ctx.fillStyle = g; ctx.fillRect(-16, -16, 32, 32); ctx.restore();
        }
        ctx.drawImage(Sprites.img, f[0], f[1], f[2], f[3], -f[2], -f[3], f[2] * 2, f[3] * 2);
      }
      ctx.restore();
    }
  }
};
