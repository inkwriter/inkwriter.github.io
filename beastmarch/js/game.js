// js/game.js — global state, the update/draw loop (zoomed camera, particles,
// canopy shadows, vignette, minimap, screen shake), and all UI panels
// (roster, captains, log, invasion, skill tree, action bar).
"use strict";

const G = {
  seed: 0, map: null, player: null,
  roster: [], captains: [], entities: [],
  projectiles: [], particles: [], canopy: [],
  skills: [], abilitySlots: [],
  mode: "explore",
  invasion: null, gateEntity: null,
  fortCaptured: false, stagBound: false, warbandOut: true,
  raid: null, ambush: null, hearthT: 0,
  time: 0, rivalT: 0, loyaltyT: 0,
  logEntries: [], floats: []
};

const Game = {
  keys: {},
  openPanel: null,
  zoom: 1.6, zoomTarget: 1.6,
  shakeT: 0, shakeMag: 0,
  mouse: { x: 480, y: 300, down: false, active: false },
  aimWorld: { x: 0, y: 0 },

  newGame() {
    G.seed = (Math.random() * 1e9) | 0;
    G.map = buildThornwood(G.seed);
    G.player = Player.make(G.map);
    G.roster = [];
    G.captains = Captains.generateAll();
    G.fortCaptured = false; G.stagBound = false; G.warbandOut = true;
    G.mode = "explore";
    G.invasion = null; G.gateEntity = null; G.ambush = null;
    G.time = 0; G.rivalT = 0; G.loyaltyT = 0; G.hearthT = 0;
    G.logEntries = []; G.floats = [];
    G.projectiles = []; G.particles = [];
    G.skills = []; G.abilitySlots = [];
    this.initCanopy();
    Combat.spawnWorld();
    this.buildMinimap();
    Invasion.scheduleRaid(240, "warband drums stir in the deep woods");
    this.log("You arrive in the Thornwood Marches. Reclaim these lands, Warden.");
    this.log("Weaken wild creatures (below 35% health) and press C to bind them to your banner.");
    this.log("A Great Beast roams the deep wood — the Thornwood Stag. Earn renown before you seek it.");
    this.refreshPanels();
  },

  initCanopy() {
    G.canopy = [];
    for (let i = 0; i < 5; i++) {
      G.canopy.push({
        x: rand() * G.map.w * TILE_SIZE, y: rand() * G.map.h * TILE_SIZE,
        r: 130 + rand() * 120,
        vx: 4 + rand() * 5, vy: 1.5 + rand() * 2
      });
    }
  },

  // ---------- Update ----------

  update(dt) {
    G.time += dt;

    // Camera breathing: tight when exploring, wide when commanding a battle
    this.zoomTarget = (G.mode === "invasion" || (G.raid && G.raid.active)) ? 1.15 : 1.6;
    this.zoom += (this.zoomTarget - this.zoom) * Math.min(1, dt * 3);
    this.shakeT = Math.max(0, this.shakeT - dt);

    // Aim point in world coordinates (used by bow + abilities)
    const canvas = document.getElementById("game");
    const cam = this.camera(canvas);
    this.aimWorld.x = this.mouse.x / this.zoom + cam.x;
    this.aimWorld.y = this.mouse.y / this.zoom + cam.y;

    Player.update(dt, this.keys);
    Combat.update(dt);
    Projectiles.update(dt);
    Rival.update(dt);
    Invasion.updateRaid(dt);
    if (G.raid && G.raid.active) Invasion.raidTargeting();

    for (const c of G.roster) Creatures.tick(c, dt);

    G.rivalT += dt;
    if (G.rivalT >= Rival.TICK_INTERVAL) { G.rivalT = 0; Rival.tick(); }
    G.loyaltyT += dt;
    if (G.loyaltyT >= 45) { G.loyaltyT = 0; Army.tickLoyalty(); }

    // Particles: ambient leaves + fireflies near water/base
    this.ambientT = (this.ambientT || 0) - dt;
    if (this.ambientT <= 0) {
      this.ambientT = 0.25;
      if (G.particles.length < 260) {
        // drifting leaf somewhere in view
        G.particles.push({
          x: cam.x + rand() * cam.w, y: cam.y - 10,
          vx: 8 + rand() * 14, vy: 18 + rand() * 14,
          t: 6, life: 6, kind: "leaf",
          color: pick(["#4f7a44", "#5f8a4a", "#78a058"])
        });
        // firefly near the base at all times (it's home)
        if (chance(0.5)) {
          G.particles.push({
            x: G.map.base.x + randInt(-70, 70), y: G.map.base.y + randInt(-50, 30),
            vx: randInt(-8, 8), vy: randInt(-8, 8),
            t: 4, life: 4, kind: "firefly", color: "#e0d06a"
          });
        }
      }
    }
    for (let i = G.particles.length - 1; i >= 0; i--) {
      const pa = G.particles[i];
      pa.t -= dt;
      pa.x += pa.vx * dt; pa.y += pa.vy * dt;
      if (pa.kind === "leaf") pa.x += Math.sin(G.time * 3 + pa.y * 0.05) * 12 * dt;
      if (pa.kind === "firefly") { pa.vx += randInt(-20, 20) * dt; pa.vy += randInt(-20, 20) * dt; }
      if (pa.t <= 0) G.particles.splice(i, 1);
    }

    // Canopy shadows drift over the wood
    for (const c of G.canopy) {
      c.x += c.vx * dt; c.y += c.vy * dt;
      if (c.x - c.r > G.map.w * TILE_SIZE) c.x = -c.r;
      if (c.y - c.r > G.map.h * TILE_SIZE) c.y = -c.r;
    }

    for (let i = G.floats.length - 1; i >= 0; i--) {
      const f = G.floats[i];
      f.t -= dt; f.y -= 20 * dt;
      if (f.t <= 0) G.floats.splice(i, 1);
    }

    this.updateHUD();
  },

  // ---------- Feedback helpers ----------

  shake(mag) { this.shakeT = 0.18; this.shakeMag = mag; },

  burst(x, y, color, n, spr) {
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2, sp = 30 + rand() * 70;
      G.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20,
        t: 0.5 + rand() * 0.4, life: 0.9, kind: spr ? "spr" : "dot", spr, color
      });
    }
  },

  // ---------- Draw ----------

  camera(canvas) {
    const w = canvas.width / this.zoom, h = canvas.height / this.zoom;
    const maxX = G.map.w * TILE_SIZE - w, maxY = G.map.h * TILE_SIZE - h;
    return {
      x: clamp(G.player.x - w / 2, 0, Math.max(0, maxX)),
      y: clamp(G.player.y - h / 2, 0, Math.max(0, maxY)),
      w, h
    };
  },

  draw(ctx, canvas) {
    const cam = this.camera(canvas);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#0c1410";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // World pass (zoomed + shaken)
    let ox = 0, oy = 0;
    if (this.shakeT > 0) { ox = randInt(-this.shakeMag, this.shakeMag); oy = randInt(-this.shakeMag, this.shakeMag); }
    ctx.setTransform(this.zoom, 0, 0, this.zoom, ox, oy);

    MapSys.draw(ctx, G.map, cam);
    Combat.draw(ctx, cam);
    Player.draw(ctx, cam);
    Projectiles.draw(ctx, cam);

    // Particles
    for (const pa of G.particles) {
      const sx = pa.x - cam.x, sy = pa.y - cam.y;
      if (sx < -20 || sy < -20 || sx > cam.w + 20 || sy > cam.h + 20) continue;
      const alpha = clamp(pa.t / pa.life, 0, 1);
      if (pa.kind === "firefly") {
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = alpha * (0.5 + 0.5 * Math.sin(G.time * 6 + pa.x));
        ctx.fillStyle = pa.color; ctx.fillRect(sx, sy, 2, 2);
        ctx.restore();
      } else if (pa.kind === "spr" && ATLAS_FRAMES[pa.spr]) {
        ctx.globalAlpha = alpha;
        Sprites.draw(ctx, pa.spr, sx, sy, 1.5, false);
        ctx.globalAlpha = 1;
      } else {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = pa.color;
        ctx.fillRect(sx - 1, sy - 1, pa.kind === "leaf" ? 3 : 2, 2);
        ctx.globalAlpha = 1;
      }
    }

    // Drifting canopy shadows — the LttP trick
    for (const c of G.canopy) {
      const sx = c.x - cam.x, sy = c.y - cam.y;
      if (sx < -c.r || sy < -c.r || sx > cam.w + c.r || sy > cam.h + c.r) continue;
      const g = ctx.createRadialGradient(sx, sy, c.r * 0.2, sx, sy, c.r);
      g.addColorStop(0, "rgba(8,14,10,0.13)"); g.addColorStop(1, "rgba(8,14,10,0)");
      ctx.fillStyle = g;
      ctx.fillRect(sx - c.r, sy - c.r, c.r * 2, c.r * 2);
    }

    // Floating combat text
    ctx.font = "bold 11px monospace"; ctx.textAlign = "center";
    for (const f of G.floats) {
      ctx.fillStyle = f.t > 0.4 ? "#e7dcbf" : "rgba(231,220,191,0.5)";
      ctx.fillText(f.text, f.x - cam.x, f.y - cam.y);
    }
    ctx.textAlign = "left";

    // Screen-space pass: vignette + crosshair + minimap
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const vg = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.height * 0.45,
                                        canvas.width / 2, canvas.height / 2, canvas.height * 0.85);
    vg.addColorStop(0, "rgba(12,20,16,0)");
    vg.addColorStop(1, "rgba(12,20,16,0.42)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (this.mouse.active) {
      const mx = this.mouse.x, my = this.mouse.y;
      ctx.strokeStyle = "#e0a83a"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(mx, my, 6, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mx - 10, my); ctx.lineTo(mx - 4, my);
      ctx.moveTo(mx + 4, my); ctx.lineTo(mx + 10, my);
      ctx.moveTo(mx, my - 10); ctx.lineTo(mx, my - 4);
      ctx.moveTo(mx, my + 4); ctx.lineTo(mx, my + 10);
      ctx.stroke();
    }

    this.drawMinimap(cam);
  },

  // ---------- Minimap ----------

  buildMinimap() {
    const el = document.getElementById("minimap");
    if (!el || !el.getContext) { this.mmReady = false; return; }
    this.mmTerrain = document.createElement("canvas");
    if (!this.mmTerrain.getContext) { this.mmReady = false; return; }
    const S = 2;
    this.mmTerrain.width = G.map.w * S; this.mmTerrain.height = G.map.h * S;
    const c = this.mmTerrain.getContext("2d");
    const COLORS = {
      [TILE.GRASS]: "#3a5f3a", [TILE.TREE]: "#1d3322", [TILE.WATER]: "#2c4a7a",
      [TILE.ROCK]: "#5c5c52", [TILE.PATH]: "#8a7650", [TILE.WALL]: "#6b6156",
      [TILE.GATE]: "#8a5a33", [TILE.FLOOR]: "#7a6f58", [TILE.BASE]: "#e0a83a"
    };
    for (let ty = 0; ty < G.map.h; ty++)
      for (let tx = 0; tx < G.map.w; tx++) {
        c.fillStyle = COLORS[G.map.tiles[ty * G.map.w + tx]] || "#000";
        c.fillRect(tx * S, ty * S, S, S);
      }
    el.width = this.mmTerrain.width + 6; el.height = this.mmTerrain.height + 6;
    el.style.width = el.width + "px"; el.style.height = el.height + "px";
    this.mmReady = true;
  },

  drawMinimap(cam) {
    if (!this.mmReady) return;
    const el = document.getElementById("minimap");
    const c = el.getContext("2d");
    const S = 2, PADm = 3;
    c.fillStyle = "#0c1410"; c.fillRect(0, 0, el.width, el.height);
    c.drawImage(this.mmTerrain, PADm, PADm);
    const dot = (wx, wy, color, size) => {
      c.fillStyle = color;
      c.fillRect(PADm + wx / TILE_SIZE * S - size / 2, PADm + wy / TILE_SIZE * S - size / 2, size, size);
    };
    for (const e of G.entities) {
      if (e.kind === "captain") dot(e.x, e.y, "#b8332f", 3);
      else if (e.speciesId === "stag" && e.type !== "ally") dot(e.x, e.y, "#8fba6a", 4);
      else if (e.type === "ally" && !e.baseFlag) dot(e.x, e.y, "#4f8a4f", 2);
    }
    dot(G.map.fort.gate.x, G.map.fort.gate.y, G.fortCaptured ? "#e0a83a" : "#b8332f", 4);
    dot(G.player.x, G.player.y, "#f5efd0", 3);
    c.strokeStyle = "rgba(231,220,191,0.5)"; c.lineWidth = 1;
    c.strokeRect(PADm + cam.x / TILE_SIZE * S, PADm + cam.y / TILE_SIZE * S, cam.w / TILE_SIZE * S, cam.h / TILE_SIZE * S);
    c.strokeStyle = "#cdbf99";
    c.strokeRect(0.5, 0.5, el.width - 1, el.height - 1);
  },

  // ---------- Log / toast / floats ----------

  log(msg, important) {
    G.logEntries.push({ t: Math.floor(G.time), msg });
    if (G.logEntries.length > 120) G.logEntries.shift();
    document.getElementById("chron-text").textContent = msg;
    if (important) this.toast(msg);
    if (this.openPanel === "log") this.renderLog();
  },

  toast(msg, bad) {
    const box = document.getElementById("toast");
    const el = document.createElement("div");
    el.className = "toast-msg" + (bad ? " bad" : "");
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(() => el.remove(), 3800);
    while (box.children.length > 4) box.firstChild.remove();
  },

  floatText(x, y, text) {
    G.floats.push({ x, y: y - 16, text, t: 0.8 });
  },

  updateHUD() {
    const p = G.player;
    document.getElementById("hp-bar").style.width = (p.hp / p.maxHp * 100) + "%";
    document.getElementById("hp-text").textContent = Math.ceil(p.hp) + "/" + p.maxHp;
    document.getElementById("gold-text").textContent = Math.floor(p.gold);
    document.getElementById("fort-status").textContent = G.fortCaptured ? "FORT: YOURS" : "FORT: ENEMY";
    document.getElementById("warden-line").textContent =
      `LV ${p.level} · Renown ${p.renown} · Command ${Army.deployedCost()}/${Skills.commandCap()}` +
      (p.skillPoints > 0 ? ` · ${p.skillPoints} SKILL PT (K)` : "");

    this._barT = (this._barT || 0) - 1 / 60;
    if (this._barT <= 0) { this._barT = 0.2; this.renderActionBar(); }

    const warn = document.getElementById("raid-warning");
    if (G.raid && !G.raid.active && G.raid.t < 60) {
      warn.style.display = "block";
      warn.textContent = "RAID INCOMING: " + Math.ceil(G.raid.t) + "s";
    } else if (G.raid && G.raid.active) {
      warn.style.display = "block";
      warn.textContent = "BASE UNDER ATTACK!";
    } else if (G.ambush) {
      warn.style.display = "block";
      warn.textContent = "YOU ARE BEING HUNTED";
    } else warn.style.display = "none";
  },

  // ---------- Action bar (abilities 1-4 + Focus + warband) ----------

  spriteCSS(el, frameName, maxH) {
    const f = ATLAS_FRAMES[frameName];
    if (!f || !Sprites.ready) return;
    const [x, y, w, h] = f;
    const scale = Math.min(2, (maxH || 40) / h);
    el.style.width = (w * scale) + "px";
    el.style.height = (h * scale) + "px";
    el.style.backgroundSize = (Sprites.img.width * scale) + "px " + (Sprites.img.height * scale) + "px";
    el.style.backgroundPosition = (-x * scale) + "px " + (-y * scale) + "px";
  },

  speciesFrame(c) {
    const s = SPECIES[c.speciesId];
    return (c.evolved ? s.sheet + "_evo" : s.sheet) + "_idle_f1";
  },

  renderActionBar() {
    const p = G.player;
    // Focus bar
    document.getElementById("focus-bar").style.width = (p.focus / p.focusMax * 100) + "%";
    document.getElementById("focus-text").textContent = Math.floor(p.focus) + "/" + p.focusMax;
    // Ability slots
    const box = document.getElementById("ability-slots");
    box.innerHTML = "";
    for (let i = 0; i < 4; i++) {
      const id = G.abilitySlots[i];
      const slot = document.createElement("div");
      slot.className = "ab-slot" + (id ? "" : " empty");
      if (!id) {
        slot.innerHTML = `<span class="ab-key">${i + 1}</span><span class="ab-name">—</span>`;
      } else {
        const ab = ABILITIES[id];
        const cd = p.abilityCds[id] || 0;
        const noFocus = p.focus < ab.focus;
        slot.innerHTML =
          `<span class="ab-key">${i + 1}</span>` +
          `<span class="ab-name">${ab.name}</span>` +
          `<span class="ab-cost${noFocus ? " dim" : ""}">${ab.focus}f</span>` +
          (cd > 0 ? `<div class="ab-cd" style="height:${Math.min(100, cd / ab.cd * 100)}%"></div>` : "");
        slot.onclick = () => Player.castSlot(i);
      }
      box.appendChild(slot);
    }
    // Warband chips
    const chips = document.getElementById("warband-chips");
    chips.innerHTML = "";
    const dep = Army.deployed();
    for (const c of dep) {
      const chip = document.createElement("div");
      chip.className = "wb-chip" + (G.warbandOut ? "" : " benched");
      chip.title = Creatures.displayName(c);
      chip.innerHTML = `<div class="wb-spr"></div><div class="wb-hp"><div style="width:${Math.floor(c.hp / c.maxHp * 100)}%"></div></div>`;
      this.spriteCSS(chip.querySelector(".wb-spr"), this.speciesFrame(c), 22);
      // live HP from the field
      const ent = G.entities.find(e => e.rosterId === c.id);
      if (ent) chip.querySelector(".wb-hp > div").style.width = Math.floor(ent.hp / ent.maxHp * 100) + "%";
      chips.appendChild(chip);
    }
    const lbl = document.getElementById("warband-label");
    lbl.textContent = dep.length ? (G.warbandOut ? "WARBAND (Tab)" : "BENCHED (Tab)") : "NO WARBAND (R)";
  },

  // ---------- Panels ----------

  togglePanel(name) {
    if (this.openPanel === name) { this.closePanels(); return; }
    this.closePanels();
    this.openPanel = name;
    document.getElementById("panel-" + name).style.display = "flex";
    this.refreshPanels();
  },

  closePanels() {
    this.openPanel = null;
    for (const id of ["roster", "captains", "log", "invasion", "skills"]) {
      document.getElementById("panel-" + id).style.display = "none";
    }
  },

  refreshPanels() {
    if (this.openPanel === "roster") this.renderRoster();
    if (this.openPanel === "captains") this.renderCaptains();
    if (this.openPanel === "log") this.renderLog();
    if (this.openPanel === "invasion") this.renderInvasion();
    if (this.openPanel === "skills") this.renderSkills();
  },

  renderRoster() {
    const box = document.getElementById("roster-list");
    if (!G.roster.length) {
      box.innerHTML = "<p>No creatures yet. Weaken a wild beast below 35% health and press <b>C</b> beside it.</p>";
      return;
    }
    box.innerHTML = `<p class="cmd-line">Command used: <b>${Army.deployedCost()}/${Skills.commandCap()}</b> — deployed creatures fight beside you (Tab to field/dismiss).</p>`;
    for (const c of G.roster) {
      const s = SPECIES[c.speciesId];
      const evo = s.evolution;
      const evoText = c.evolved ? `Evolved: ${c.evoName}` :
        (evo.check(c) ? `<span class="evo-ready">EVOLUTION READY</span>` : `Evolves: ${evo.desc}`);
      const cost = Skills.creatureCost(c);
      const card = document.createElement("div");
      card.className = "creature-card" + (c.injured ? " injured" : "");
      card.innerHTML = `
        <div class="c-thumb"></div>
        <div class="c-head">
          <span class="c-name">${Creatures.displayName(c)}${s.greatBeast ? " ★" : ""}</span>
          <span class="c-rank">${RANKS[c.rank]} · Lv ${c.level}${cost > 1 ? " · costs " + cost + " cmd" : ""}</span>
        </div>
        <div class="xp-bar"><div class="xp-fill" style="width:${Math.floor(c.xp / Creatures.xpNeeded(c) * 100)}%"></div></div>
        <div class="c-stats">HP ${Math.ceil(c.hp)}/${c.maxHp} · ATK ${c.atk} · DEF ${c.def} · Loyalty ${c.loyalty} · ${c.personality}${c.injured ? " · INJURED (" + Math.ceil(c.injuryT) + "s)" : ""}</div>
        <div class="c-stats">${s.ability}</div>
        <div class="c-traits">${c.traits.length ? c.traits.map(t => TRAITS[t].name).join(", ") : "No traits yet"} — ${evoText}</div>
        <div class="c-traits">${c.history.slice(-2).join(" · ") || "No deeds recorded"}</div>
        <div class="c-actions"></div>`;
      this.spriteCSS(card.querySelector(".c-thumb"), this.speciesFrame(c), 44);
      const actions = card.querySelector(".c-actions");
      const opts = [["deploy", "follow"], ["guard", "guard"], ["train", "train"], ["rest", "rest"]];
      for (const [label, a] of opts) {
        const b = document.createElement("button");
        b.className = "small";
        b.textContent = (c.assignment === a ? "● " : "") + label;
        b.onclick = () => { a === "follow" && c.assignment === "follow" ? Army.recall(c) : Army.setAssignment(c, a); };
        actions.appendChild(b);
      }
      box.appendChild(card);
    }
  },

  renderCaptains() {
    const box = document.getElementById("captain-list");
    box.innerHTML = "";
    const sorted = [...G.captains].sort((a, b) => b.rank - a.rank);
    for (const cap of sorted) {
      const card = document.createElement("div");
      card.className = "captain-card" + (cap.broken ? " dead" : "");
      card.innerHTML = `
        <span class="cap-name">${Captains.fullName(cap)}</span>
        <span class="cap-rank"> — ${RANKS[cap.rank]} · Lv ${cap.level} · ${cap.species}</span>
        <div class="cap-detail">${cap.personality} · ${cap.strength.label} · ${cap.weakness.label}</div>
        <div class="cap-detail">${cap.relationship}${cap.fear ? " · Fears " + cap.fear : ""}${cap.scars.length ? " · Bears " + cap.scars.join(", ") : ""}${cap.grudge >= 2 ? " · <b>PLOTTING REVENGE</b>" : ""}</div>
        <div class="cap-mem">${cap.memories.slice(-3).join(" · ") || "Knows nothing of you yet"}</div>`;
      box.appendChild(card);
    }
  },

  renderLog() {
    const box = document.getElementById("log-list");
    box.innerHTML = "";
    for (let i = G.logEntries.length - 1; i >= 0; i--) {
      const e = G.logEntries[i];
      const div = document.createElement("div");
      div.className = "log-entry";
      div.innerHTML = `<span class="log-time">${Math.floor(e.t / 60)}:${String(e.t % 60).padStart(2, "0")}</span>${e.msg}`;
      box.appendChild(div);
    }
  },

  renderInvasion() {
    const info = document.getElementById("invasion-info");
    const box = document.getElementById("invasion-list");
    const boss = Captains.fortBoss(G.captains);
    if (G.fortCaptured) {
      info.textContent = "Bramblefang Fort already flies your banner.";
      box.innerHTML = ""; return;
    }
    const dep = Army.deployed();
    info.innerHTML = boss
      ? `The fort is held by <b>${Captains.fullName(boss)}</b> (${RANKS[boss.rank]}, ${boss.personality}). Defenses: the great gate, wall archers, a Stonejaw Troll, an Ash Drake. <b>Your deployed warband marches with you</b> — adjust it in the roster (R). Boars, trolls, and the Stag smash gates fastest.`
      : "No captain remains to hold the fort — approach the gate and press E to claim it.";
    box.innerHTML = dep.length
      ? dep.map(c => `<div class="inv-row"><b>${Creatures.displayName(c)}</b> — ${RANKS[c.rank]} Lv ${c.level}, HP ${Math.ceil(c.hp)}/${c.maxHp}${SPECIES[c.speciesId].gateBonus ? " · gate-smasher" : ""}</div>`).join("")
      : "<p>Your warband is empty. You can still march alone... Warden.</p>";
  },

  renderSkills() {
    const p = G.player;
    document.getElementById("skills-head").innerHTML =
      `Level <b>${p.level}</b> · XP ${p.xp}/${Player.xpNeeded(p)} · Skill points: <b>${p.skillPoints}</b> · Renown: <b>${p.renown}</b> · Command: <b>${Skills.commandCap()}</b> · Focus: <b>${p.focusMax}</b>`;
    const box = document.getElementById("skills-cols");
    box.innerHTML = "";
    for (const branch of ["Warpath", "Folkcraft", "Wardenship"]) {
      const col = document.createElement("div");
      col.className = "skill-col";
      col.innerHTML = `<h3>${branch}</h3>`;
      for (const id in SKILL_TREE) {
        const n = SKILL_TREE[id];
        if (n.branch !== branch) continue;
        const learned = Skills.has(id);
        const can = Skills.canLearn(id);
        const node = document.createElement("div");
        node.className = "skill-node" + (learned ? " learned" : can ? " avail" : " locked");
        let reqTxt = "";
        if (!learned && !can) {
          const missing = n.req.filter(r => !Skills.has(r)).map(r => SKILL_TREE[r].name);
          if (missing.length) reqTxt = `Requires: ${missing.join(", ")}. `;
          if (n.renown && p.renown < n.renown) reqTxt += `Renown ${p.renown}/${n.renown}. `;
          if (p.skillPoints < 1 && missing.length === 0 && !(n.renown && p.renown < n.renown)) reqTxt = "No skill points.";
        }
        node.innerHTML = `<div class="sn-name">${learned ? "✓ " : ""}${n.name}${n.ability ? ' <span class="sn-ab">ABILITY</span>' : ""}</div>
          <div class="sn-desc">${n.desc} ${reqTxt}</div>`;
        if (can) node.onclick = () => { Skills.learn(id); this.renderSkills(); };
        col.appendChild(node);
      }
      box.appendChild(col);
    }
  },

  startInvasionFromPanel() {
    Invasion.start(Army.deployed().map(c => c.id));
  }
};
