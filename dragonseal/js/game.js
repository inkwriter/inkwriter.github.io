/* ============================================================
   GAME.JS — Top-down engine: movement & collision, combat,
   abilities, enemy AI, all boss fights, zone travel, loot,
   leveling, saving. Content lives in js/data.js.
   ============================================================ */

/* ---------------- CANVAS ---------------- */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const VW = canvas.width, VH = canvas.height;

/* ---------------- GLOBAL STATE ---------------- */
const G = {
  state: 'title', overlay: null, time: 0,
  zone: null, map: null,
  player: null, companion: null,
  enemies: [], boss: null,
  projectiles: [], traps: [], drops: [], particles: [], dmgNums: [],
  telegraphs: [], burnZones: [], timers: [],
  npcs: [],
  camera: { x: 0, y: 0 }, shake: 0,
  aim: { x: 0, y: 0 }, mouseScreen: { x: 480, y: 270 }, mouseDown: false,
  keys: {},
  progress: { unlocked: 1, bosses: {}, seals: 0 }, // unlocked = index into ZONES
  villageChestOpened: false,
  gameWon: false,
};

/* ---------------- HELPERS ---------------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const distE = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function norm(x, y) { const l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l }; }
function schedule(t, fn) { G.timers.push({ t, fn }); }

function addParticles(x, y, n, color, spd = 130, life = 0.5) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = rand(spd * 0.3, spd);
    G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: rand(life * 0.5, life), max: life, color, r: rand(2, 5) });
  }
}
function addDmgNum(x, y, text, color, big = false) {
  G.dmgNums.push({ x: x + rand(-10, 10), y: y - 20, text, color, t: 0.9, big });
}

/* ---------------- TILE COLLISION ---------------- */
function isSolidTile(tx, ty) {
  const m = G.map;
  if (!m || tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return true;
  return m.grid[ty][tx] !== T_FLOOR;
}
function circleHitsWall(x, y, r) {
  const x0 = Math.floor((x - r) / TS), x1 = Math.floor((x + r) / TS);
  const y0 = Math.floor((y - r) / TS), y1 = Math.floor((y + r) / TS);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (!isSolidTile(tx, ty)) continue;
    const cx = clamp(x, tx * TS, tx * TS + TS), cy = clamp(y, ty * TS, ty * TS + TS);
    if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < r * r) return true;
  }
  return false;
}
/* Axis-separated circle move — slides along walls. */
function moveCircle(ent, dx, dy, ghost) {
  if (ghost) { ent.x += dx; ent.y += dy; return; }
  if (dx !== 0 && !circleHitsWall(ent.x + dx, ent.y, ent.r)) ent.x += dx;
  if (dy !== 0 && !circleHitsWall(ent.x, ent.y + dy, ent.r)) ent.y += dy;
}
function tileCenter(t) { return { x: t.tx * TS + TS / 2, y: t.ty * TS + TS / 2 }; }
function findOpenSpot(x, y, r) {
  if (!circleHitsWall(x, y, r)) return { x, y };
  for (let d = TS / 2; d < TS * 6; d += TS / 2) {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      const nx = x + Math.cos(a) * d, ny = y + Math.sin(a) * d;
      if (!circleHitsWall(nx, ny, r)) return { x: nx, y: ny };
    }
  }
  return { x, y };
}

/* ---------------- INPUT ---------------- */
function initInput() {
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    G.keys[e.code] = true;
    handleKeyPress(e);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { G.keys[e.code] = false; });
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    G.mouseScreen.x = (e.clientX - rect.left) * (VW / rect.width);
    G.mouseScreen.y = (e.clientY - rect.top) * (VH / rect.height);
  });
  canvas.addEventListener('mousedown', (e) => {
    if (G.state !== 'playing' || G.overlay) return;
    G.mouseDown = true;
    if (G.player && !G.player.dead) doBasicAttack(G.player);
    e.preventDefault();
  });
  window.addEventListener('mouseup', () => { G.mouseDown = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

function handleKeyPress(e) {
  const p = G.player;
  if (e.code === 'Escape') {
    if (G.state !== 'playing') return;
    if (G.overlay) UI.closeOverlay(); else UI.showPause();
    return;
  }
  if (G.state !== 'playing') return;
  if (e.code === 'KeyI') { G.overlay === 'inventory' ? UI.closeOverlay() : UI.showInventory(); return; }
  if (e.code === 'KeyK') { G.overlay === 'skills' ? UI.closeOverlay() : UI.showSkills(); return; }
  if (e.code === 'KeyM') { G.overlay === 'map' ? UI.closeOverlay() : UI.showMap(); return; }
  if (G.overlay || !p || p.dead) return;
  if (e.code === 'Space') doDodge(p);
  if (e.code === 'KeyJ') doBasicAttack(p);
  if (e.code === 'KeyQ') drinkPotion(p);
  if (e.code === 'KeyE' || e.code === 'KeyF') tryInteract(p);
  const slot = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4 }[e.code];
  if (slot !== undefined) useAbility(p, slot);
}

/* ---------------- STATS ---------------- */
const ULT_IDS = new Set(['r_smoke', 'r_shadow', 'r_frenzy', 'k_guard', 'k_break', 'k_wall', 'w_shield', 'w_meteor', 'w_golem']);

function recalcStats(p) {
  const c = CLASSES[p.classId];
  let hp = c.baseHp + c.hpPerLvl * (p.level - 1);
  let atk = c.baseAtk + c.atkPerLvl * (p.level - 1);
  let spl = c.baseSpl + c.splPerLvl * (p.level - 1);
  let armor = c.armor, crit = c.crit;
  let cdr = 0, speedP = 0, dodgeP = 0, pet = 0, boss = 0, atkP = 0, splP = 0;
  const flags = {};
  const addStats = (s) => {
    if (!s) return;
    hp += s.hp || 0; armor += s.armor || 0; atk += s.atk || 0; spl += s.spl || 0;
    crit += s.crit || 0; cdr += s.cdr || 0; speedP += s.speed || 0; dodgeP += s.dodge || 0;
    pet += s.pet || 0; boss += s.boss || 0; atkP += s.atkP || 0; splP += s.splP || 0;
  };
  if (p.subclassId) addStats(CLASSES[p.classId].subclasses[p.subclassId].pstats);
  for (const id of p.nodes) {
    const node = findNode(p.classId, id);
    if (node) { addStats(node.stats); if (node.flag) flags[node.flag] = true; }
  }
  for (const slot of GEAR_SLOTS) {
    const it = p.equipment[slot];
    if (!it) continue;
    addStats(it.stats);
    if (it.effect) flags[it.effect] = true;
  }
  if (flags.shadow_edge) crit += 15;
  if (flags.boss_slayer) boss += 30;

  const hpRatio = p.maxHp ? p.hp / p.maxHp : 1;
  p.maxHp = Math.round(hp);
  p.hp = clamp(Math.round(p.maxHp * hpRatio), 1, p.maxHp);
  p.attack = atk * (1 + atkP / 100);
  p.spell = spl * (1 + splP / 100);
  p.armor = armor;
  p.crit = clamp(crit, 0, 75);
  p.cdr = clamp(cdr, 0, 40);
  p.moveSpeed = c.speed * (1 + speedP / 100);
  p.dodgeCdMax = c.dodgeCd * (1 - clamp(dodgeP, 0, 60) / 100) * (flags.tumbler ? 0.6 : 1);
  p.petMult = 1 + pet / 100;
  p.bossMult = 1 + boss / 100;
  p.flags = flags;
}

function findNode(classId, id) {
  const tree = SKILL_TREES[classId];
  for (const n of tree.base) if (n.id === id) return n;
  for (const sub of Object.keys(CLASSES[classId].subclasses)) {
    for (const br of tree[sub].branches) for (const n of br.nodes) if (n.id === id) return n;
  }
  return null;
}
const hasFlag = (p, f) => !!(p.flags && p.flags[f]);

function abilityCd(p, id) {
  let cd = ABILITIES[id].cd * (1 - p.cdr / 100);
  if (hasFlag(p, 'windstep') && (id === 'r_dash' || id === 'w_blink')) cd *= 0.7;
  if (hasFlag(p, 'sealkeeper') && ULT_IDS.has(id)) cd *= 0.8;
  return cd;
}

/* ---------------- ITEMS ---------------- */
function rollRarity(forceMin = 0) {
  const total = RARITIES.reduce((s, r) => s + r.weight, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < RARITIES.length; i++) {
    roll -= RARITIES[i].weight;
    if (roll <= 0) return Math.max(i, forceMin);
  }
  return forceMin;
}
function genItem(ilvl, forceRarityIdx = null) {
  const ri = forceRarityIdx !== null ? forceRarityIdx : rollRarity();
  const rarity = RARITIES[ri];
  if (rarity.id === 'legendary') {
    const leg = LEGENDARIES[randi(0, LEGENDARIES.length - 1)];
    const stats = {};
    for (const [k, v] of Object.entries(leg.stats)) stats[k] = Math.round(v * (1 + ilvl * 0.06));
    return { name: leg.name, slot: leg.slot, rarity: 'legendary', ilvl, stats, effect: leg.effect, fx: leg.fx };
  }
  const slot = GEAR_SLOTS[randi(0, GEAR_SLOTS.length - 1)];
  const base = ITEM_BASES[slot][randi(0, ITEM_BASES[slot].length - 1)];
  const prefix = ITEM_PREFIX[rarity.id][randi(0, ITEM_PREFIX[rarity.id].length - 1)];
  const pool = STAT_POOL.slice();
  const stats = {};
  for (let i = 0; i < rarity.stats; i++) {
    const s = pool.splice(randi(0, pool.length - 1), 1)[0];
    stats[s.key] = Math.max(1, Math.round((s.base + s.per * ilvl) * rand(0.8, 1.25)));
  }
  return { name: prefix + ' ' + base, slot, rarity: rarity.id, ilvl, stats };
}
function rarityData(id) { return RARITIES.find(r => r.id === id); }
function statLabel(key) { return STAT_POOL.find(s => s.key === key); }

/* ---------------- PLAYER ---------------- */
function createPlayer(classId) {
  const p = {
    classId, subclassId: null,
    x: 0, y: 0, r: 11,
    moveX: 0, moveY: 0, facing: 1, moving: false, animT: 0,
    dashT: 0, dashDir: null, lungeT: 0,
    dodgeT: 0, dodgeCd: 0, dodgeDir: null, rooted: 0,
    hp: 1, maxHp: 1, level: 1, xp: 0, gold: 40, potions: 2, skillPoints: 1,
    nodes: [], inventory: [], equipment: {},
    abilities: CLASSES[classId].abilities.slice(),
    cds: {}, basicCd: 0, buffs: {}, shieldHp: 0,
    invuln: 0, dead: false, hitFlash: 0,
  };
  recalcStats(p);
  p.hp = p.maxHp;
  return p;
}

function xpNeeded(level) { return Math.floor(TUNE.xpBase * Math.pow(level, TUNE.xpPow)); }

function addXp(p, amount) {
  amount = Math.round(amount);
  p.xp += amount;
  addDmgNum(p.x, p.y - 10, '+' + amount + ' XP', '#4aa3f0');
  while (p.xp >= xpNeeded(p.level) && p.level < TUNE.maxLevel) {
    p.xp -= xpNeeded(p.level);
    p.level++;
    p.skillPoints++;
    recalcStats(p);
    p.hp = p.maxHp;
    addParticles(p.x, p.y - 15, 24, '#f0c840', 200, 0.8);
    UI.toast('Level ' + p.level + '! +1 skill point (K)', '#f0c840');
    if (p.level >= 6 && !p.subclassId) schedule(0.6, () => UI.showSubclassSelect());
  }
}

function chooseSubclass(p, subId) {
  p.subclassId = subId;
  const sub = CLASSES[p.classId].subclasses[subId];
  p.abilities[4] = sub.ult;
  if (sub.pet) G.companion = createCompanion(sub.pet, false);
  recalcStats(p);
  p.hp = p.maxHp;
  UI.toast('You are now a' + (subId === 'assassin' || subId === 'elementalist' ? 'n ' : ' ') + sub.name + '!', '#f0a030');
  UI.buildAbilityBar();
}

function drinkPotion(p) {
  if (p.potions <= 0) { UI.toast('No potions! Buy more in the village.', '#e05858'); return; }
  if (p.hp >= p.maxHp) { UI.toast('Already at full health.', '#c8c8c8'); return; }
  p.potions--;
  const heal = Math.round(p.maxHp * 0.5);
  p.hp = clamp(p.hp + heal, 0, p.maxHp);
  addDmgNum(p.x, p.y, '+' + heal, '#7ec850', true);
  addParticles(p.x, p.y - 14, 14, '#7ec850', 110, 0.6);
}

function doDodge(p) {
  if (p.dodgeCd > 0 || p.dodgeT > 0 || p.rooted > 0) return;
  let dir = norm(p.moveX, p.moveY);
  if (p.moveX === 0 && p.moveY === 0) dir = aimDir(p);
  p.dodgeT = 0.22; p.dodgeDir = dir;
  p.dodgeCd = p.dodgeCdMax;
  p.invuln = Math.max(p.invuln, 0.3);
  addParticles(p.x, p.y - 8, 8, '#e8f8e8', 90, 0.3);
}

/* ---------------- COMBAT HELPERS ---------------- */
function aimDir(p) { return norm(G.aim.x - p.x, G.aim.y - (p.y - 12)); }
function statFor(p, kind) { return kind === 'spl' ? p.spell : p.attack; }
function forEachEnemy(fn) {
  for (const e of G.enemies) if (e.hp > 0) fn(e);
  if (G.boss && G.boss.hp > 0) fn(G.boss);
}

/* Melee swing: hits enemies inside a circle pushed toward the aim. */
function meleeArc(p, o) {
  const d = aimDir(p);
  const range = o.range || 32;
  const cx = p.x + d.x * range, cy = p.y - 8 + d.y * range;
  const rad = (o.arc || 30) + 8;
  let hitAny = false;
  forEachEnemy((e) => {
    if (Math.hypot(e.x - cx, e.y - 10 - cy) < rad + e.r) {
      hitEnemy(e, statFor(p, o.kind || 'atk') * o.mult, {
        p, knock: o.knock ? { x: d.x * o.knock, y: d.y * o.knock } : null,
        stun: o.stun, forceCrit: o.forceCrit,
      });
      hitAny = true;
    }
  });
  slashFx(cx, cy);
  return hitAny;
}
function slashFx(x, y) { addParticles(x, y, 6, '#f0f0e0', 120, 0.22); }

function aoeAt(cx, cy, radius, dmg, o = {}) {
  const p = o.p || G.player;
  forEachEnemy((e) => {
    if (Math.hypot(e.x - cx, e.y - cy) < radius + e.r) {
      const kd = norm(e.x - cx, e.y - cy);
      hitEnemy(e, dmg, { p, knock: o.knock ? { x: kd.x * o.knock, y: kd.y * o.knock } : null,
                         stun: o.stun, freeze: o.freeze });
    }
  });
}

function hitEnemy(e, amount, o = {}) {
  const p = o.p || G.player;
  let dmg = amount, crit = false;
  if (!o.noCrit) {
    crit = o.forceCrit || Math.random() * 100 < p.crit;
    if (crit) dmg *= 1.75;
  }
  if (p.buffs.shout && o.kind !== 'pet') dmg *= 1.35;
  if (e.isBoss) dmg *= p.bossMult * (e.shielded ? 0.3 : 1);
  dmg = Math.max(1, Math.round(dmg));
  e.hp -= dmg;
  e.flash = 0.12;
  if (o.knock && !e.isBoss) { e.kx = o.knock.x * 2.2; e.ky = o.knock.y * 2.2; }
  if (o.stun && !e.isBoss) e.stun = Math.max(e.stun || 0, o.stun);
  if (o.freeze && !e.isBoss) e.freeze = Math.max(e.freeze || 0, o.freeze);
  else if (o.freeze && e.isBoss) e.slowT = Math.max(e.slowT || 0, o.freeze); // bosses are slowed, not frozen
  addDmgNum(e.x, e.y - e.r, dmg, o.silentColor || (crit ? '#f0c840' : '#ffffff'), crit);
  addParticles(e.x, e.y - 10, crit ? 9 : 4, '#ff9090', 120, 0.3);
  if (e.hp <= 0) killEnemy(e);
}

function applyPoison(e, dps, dur) { e.dots.push({ dps, t: dur, acc: 0 }); }

function hitPlayer(amount, fromX, fromY) {
  const p = G.player;
  if (!p || p.dead || p.invuln > 0) return;
  let dmg = amount * (1 - p.armor / (p.armor + 60));
  if (p.buffs.guard) dmg *= (1 - p.buffs.guard.reduce);
  dmg = Math.max(1, Math.round(dmg));
  if (p.shieldHp > 0) {
    const absorbed = Math.min(p.shieldHp, dmg);
    p.shieldHp -= absorbed; dmg -= absorbed;
    addDmgNum(p.x, p.y - 28, '-' + absorbed, '#b478f0');
  }
  if (dmg > 0) {
    p.hp -= dmg;
    addDmgNum(p.x, p.y - 20, '-' + dmg, '#e05858', true);
  }
  p.invuln = 0.7; p.hitFlash = 0.25;
  if (fromX !== undefined) {
    const kd = norm(p.x - fromX, p.y - (fromY !== undefined ? fromY : p.y));
    const kb = hasFlag(p, 'steadfast') ? 60 : 130;
    moveCircle(p, kd.x * kb * 0.12, kd.y * kb * 0.12);
  }
  G.shake = Math.max(G.shake, 5);
  UI.flashDamage();
  if (p.hp <= 0) playerDie();
}

function playerDie() {
  const p = G.player;
  p.dead = true; p.hp = 0;
  addParticles(p.x, p.y - 12, 30, '#e05858', 200, 0.8);
  const lost = Math.floor(p.gold * 0.1);
  p.gold -= lost;
  schedule(1.2, () => UI.showDead(lost));
}

function respawnPlayer() {
  const p = G.player;
  p.dead = false; p.shieldHp = 0; p.buffs = {}; p.rooted = 0;
  p.hp = p.maxHp; p.invuln = 1.5;
  UI.closeOverlay();
  enterZone('village');
}

/* ---------------- ABILITIES (EDIT HERE for behavior) ---------------- */
function doBasicAttack(p) {
  if (p.basicCd > 0 || p.dead || G.overlay) return;
  const c = CLASSES[p.classId];
  p.basicCd = c.basic.cd;
  const d = aimDir(p);
  if (c.basic.ranged) {
    fireProj({ x: p.x, y: p.y - 12, vx: d.x * 420, vy: d.y * 420,
               dmg: p.spell * c.basic.mult, kind: 'spl', type: 'spark', friendly: true });
  } else {
    meleeArc(p, { range: c.basic.range, arc: c.basic.arc, mult: c.basic.mult, knock: 60 });
  }
}

function useAbility(p, slot) {
  const id = p.abilities[slot];
  if (!id || p.dead) return;
  if ((p.cds[id] || 0) > 0) return;
  const impl = ABILITY_IMPL[id];
  if (!impl) return;
  if (impl(p) !== false) p.cds[id] = abilityCd(p, id);
}

const ABILITY_IMPL = {
  /* --- Rogue --- */
  r_slash(p) {
    for (let i = 0; i < 3; i++)
      schedule(i * 0.1, () => { if (!p.dead) meleeArc(p, { range: 30, arc: 26, mult: 0.75, knock: 40 }); });
  },
  r_dash(p) {
    p.dashT = 0.2; p.dashDir = aimDir(p); p.dashHit = new Set();
    p.invuln = Math.max(p.invuln, 0.25);
    addParticles(p.x, p.y - 10, 10, '#c8e8c8', 140, 0.3);
  },
  r_knife(p) {
    const d = aimDir(p);
    fireProj({ x: p.x, y: p.y - 12, vx: d.x * 460, vy: d.y * 460,
               dmg: p.attack * 1.4, type: 'knife', friendly: true,
               poison: hasFlag(p, 'knife_poison') ? p.attack * 0.35 : 0 });
  },
  r_trap(p) {
    const mult = hasFlag(p, 'trap_potent') ? 1.8 : 1.2;
    G.traps.push({ x: p.x, y: p.y, r: 22, arm: 0.5, life: 25,
                   dmg: p.attack * mult, poison: p.attack * 0.4 });
  },
  r_smoke(p) {
    p.buffs.smoke = { t: 2.5 };
    p.invuln = Math.max(p.invuln, 2.5);
    addParticles(p.x, p.y - 10, 26, '#b8b8c8', 110, 1.0);
  },
  r_shadow(p) {
    let best = null, bd = 380;
    forEachEnemy((e) => { const d = distE(p, e); if (d < bd) { bd = d; best = e; } });
    if (best) {
      const away = norm(best.x - p.x, best.y - p.y); // land on the far side
      const spot = findOpenSpot(best.x + away.x * (best.r + 24), best.y + away.y * (best.r + 24), p.r);
      p.x = spot.x; p.y = spot.y;
      addParticles(p.x, p.y - 10, 16, '#8060c0', 160, 0.5);
      hitEnemy(best, p.attack * 2.6, { p, forceCrit: true });
    } else {
      const d = aimDir(p);
      const spot = findOpenSpot(p.x + d.x * 150, p.y + d.y * 150, p.r);
      p.x = spot.x; p.y = spot.y;
      addParticles(p.x, p.y - 10, 12, '#8060c0', 140, 0.4);
    }
    p.invuln = Math.max(p.invuln, 0.3);
  },
  r_frenzy(p) {
    if (!G.companion) { UI.toast('No companion to command!', '#e05858'); return false; }
    G.companion.frenzy = 6;
    addParticles(G.companion.x, G.companion.y - 8, 16, '#e05858', 140, 0.6);
    UI.toast('Pack Frenzy!', '#e05858');
  },
  /* --- Knight --- */
  k_slash(p) {
    meleeArc(p, { range: 36, arc: 36, mult: 1.6, knock: 160 });
  },
  k_bash(p) {
    p.lungeT = 0.16; p.dashDir = aimDir(p); p.lungeHit = new Set();
  },
  k_slam(p) {
    const r = hasFlag(p, 'big_slam') ? 130 : 88;
    aoeAt(p.x, p.y, r, p.attack * 1.8, { p, knock: 150, stun: 0.7 });
    G.shake = Math.max(G.shake, 7);
    addParticles(p.x, p.y, 20, '#c8a060', 170, 0.5);
  },
  k_shout(p) {
    p.buffs.shout = { t: 8 };
    addParticles(p.x, p.y - 20, 14, '#f0c840', 120, 0.6);
    UI.toast('Battle Shout: +35% attack!', '#f0c840');
  },
  k_guard(p) {
    p.buffs.guard = { t: 4, reduce: 0.7 };
    if (hasFlag(p, 'old_gate')) p.hp = clamp(p.hp + Math.round(p.maxHp * 0.1), 0, p.maxHp);
  },
  k_break(p) {
    aoeAt(p.x, p.y, 150, p.attack * 2.6, { p, knock: 240, stun: 1.4 });
    G.shake = Math.max(G.shake, 13);
    addParticles(p.x, p.y, 34, '#e07830', 230, 0.7);
  },
  k_wall(p) {
    p.buffs.guard = { t: 5, reduce: 0.9 };
    if (hasFlag(p, 'old_gate')) p.hp = clamp(p.hp + Math.round(p.maxHp * 0.1), 0, p.maxHp);
    UI.toast('Shield Wall!', '#b8c4d4');
  },
  /* --- Wizard --- */
  w_bolt(p) {
    const d = aimDir(p);
    const pierce = (hasFlag(p, 'bolt_pierce') ? 1 : 0) + (hasFlag(p, 'storm_bolt') ? 1 : 0);
    fireProj({ x: p.x, y: p.y - 12, vx: d.x * 460, vy: d.y * 460,
               dmg: p.spell * 1.3, kind: 'spl', type: 'bolt', friendly: true, pierce });
  },
  w_blink(p) {
    addParticles(p.x, p.y - 10, 12, '#78d8f0', 130, 0.4);
    const d = aimDir(p);
    let dd = Math.min(160, Math.hypot(G.aim.x - p.x, G.aim.y - p.y));
    while (dd > 0 && circleHitsWall(p.x + d.x * dd, p.y + d.y * dd, p.r)) dd -= 8;
    p.x += d.x * dd; p.y += d.y * dd;
    p.invuln = Math.max(p.invuln, 0.3);
    addParticles(p.x, p.y - 10, 12, '#78d8f0', 130, 0.4);
  },
  w_fire(p) {
    const d = aimDir(p);
    fireProj({ x: p.x, y: p.y - 12, vx: d.x * 340, vy: d.y * 340,
               dmg: p.spell * 1.9, kind: 'spl', type: 'fireball', friendly: true,
               explode: hasFlag(p, 'big_fireball') ? 90 : 56 });
  },
  w_nova(p) {
    const r = hasFlag(p, 'big_nova') ? 145 : 104;
    aoeAt(p.x, p.y, r, p.spell * 0.9, { p, freeze: 2.5 });
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      G.particles.push({ x: p.x + Math.cos(a) * r * 0.5, y: p.y + Math.sin(a) * r * 0.5,
                         vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, t: 0.5, max: 0.5, color: '#78d8f0', r: 4 });
    }
  },
  w_shield(p) {
    p.shieldHp = Math.round(p.maxHp * 0.4);
    addParticles(p.x, p.y - 12, 16, '#b478f0', 130, 0.6);
  },
  w_meteor(p) {
    const dx = G.aim.x - p.x, dy = G.aim.y - p.y;
    const dd = Math.min(300, Math.hypot(dx, dy));
    const d = norm(dx, dy);
    const tx = p.x + d.x * dd, ty = p.y + d.y * dd;
    addTele(tx, ty, 110, 0.75, 0, { friendly: true, color: 'rgba(240,160,60,', onDone: () => {
      explodeAt(tx, ty, 118, p.spell * 3.2, true);
      G.shake = Math.max(G.shake, 12);
    }});
  },
  w_golem(p) {
    G.companion = createCompanion('golem', true);
    if (hasFlag(p, 'golem_heart')) G.companion.t += 8;
    UI.toast('Stone Golem rises!', '#9a8a74');
  },
};

/* ---------------- COMPANIONS ---------------- */
function createCompanion(type, temp) {
  const p = G.player;
  return {
    type, temp, t: temp ? 15 : Infinity,
    x: p.x - 30, y: p.y, r: type === 'golem' ? 14 : 10,
    atkT: 0, frenzy: 0, facing: 1, animT: 0, moving: false,
    spr: type === 'wolf' ? 'imp_idle_anim' : type === 'wisp' ? 'wall_fountain_basin_blue_anim' : 'ogre_idle_anim',
  };
}
// Note: sprite choices — wolf uses a recolor-friendly small beast, wisp a glow orb.
// EDIT HERE to reskin companions.
const COMPANION_SPR = { wolf: 'wolf_gray', wisp: 'wisp_spirit', golem: 'golem_stone' };

function companionDmg(c) {
  const p = G.player;
  const base = c.type === 'golem' ? 15 + 4.5 * p.level : c.type === 'wolf' ? 9 + 3.2 * p.level : 8 + 2.8 * p.level;
  let d = base * p.petMult;
  if (c.frenzy > 0) d *= 2;
  return d;
}

function updateCompanion(c, dt) {
  const p = G.player;
  if (c.temp) {
    c.t -= dt;
    if (c.t <= 0) {
      addParticles(c.x, c.y - 8, 14, '#9a8a74', 130, 0.5);
      const sub = p.subclassId && CLASSES[p.classId].subclasses[p.subclassId];
      G.companion = sub && sub.pet ? createCompanion(sub.pet, false) : null;
      return;
    }
  }
  if (c.frenzy > 0) c.frenzy -= dt;
  c.animT += dt * 8;
  c.atkT -= dt * (c.frenzy > 0 ? 2 : 1) * ((hasFlag(p, 'swift_pet') ? 1.25 : 1) * (hasFlag(p, 'pack_bond') ? 1.3 : 1));

  let target = null, bd = 360;
  forEachEnemy((e) => { const d = distE(p, e); if (d < bd) { bd = d; target = e; } });
  const goal = target ? target : { x: p.x - 26 * p.facing, y: p.y + 8 };
  const dx = goal.x - c.x, dy = goal.y - c.y;
  const dd = Math.hypot(dx, dy);
  const speed = c.type === 'golem' ? 120 : 195;
  c.moving = dd > 26;
  if (c.moving) {
    const d = norm(dx, dy);
    moveCircle(c, d.x * speed * dt, d.y * speed * dt);
    c.facing = dx >= 0 ? 1 : -1;
  }
  if (distE(c, p) > 460) { const s = findOpenSpot(p.x, p.y + 20, c.r); c.x = s.x; c.y = s.y; }

  if (target && c.atkT <= 0) {
    if (c.type === 'wisp') {
      if (distE(c, target) < 240) {
        c.atkT = 1.5;
        const d = norm(target.x - c.x, target.y - c.y);
        fireProj({ x: c.x, y: c.y - 10, vx: d.x * 340, vy: d.y * 340,
                   dmg: companionDmg(c), kind: 'pet', type: 'spark', friendly: true });
      }
    } else if (distE(c, target) < c.r + target.r + 14) {
      c.atkT = c.type === 'golem' ? 1.4 : 1.1;
      hitEnemy(target, companionDmg(c), { p, kind: 'pet', knock: { x: (target.x - c.x) * 3, y: (target.y - c.y) * 3 } });
      addParticles(target.x, target.y - 8, 6, '#e8e8e8', 110, 0.3);
    }
  }
}

/* ---------------- PROJECTILES / TRAPS / TELEGRAPHS ---------------- */
function fireProj(o) {
  G.projectiles.push(Object.assign({ x: 0, y: 0, vx: 0, vy: 0, r: 6, t: 3, hit: new Set(), ghost: false }, o));
}

function updateProjectiles(dt) {
  const p = G.player;
  for (let i = G.projectiles.length - 1; i >= 0; i--) {
    const pr = G.projectiles[i];
    pr.t -= dt;
    pr.x += pr.vx * dt; pr.y += pr.vy * dt;
    let remove = pr.t <= 0;
    if (!remove && !pr.ghost && circleHitsWall(pr.x, pr.y, 4)) remove = true;
    if (!remove) {
      if (pr.friendly) {
        forEachEnemy((e) => {
          if (remove) return;
          if (!pr.hit.has(e) && Math.hypot(pr.x - e.x, pr.y - (e.y - 10)) < pr.r + e.r) {
            pr.hit.add(e);
            hitEnemy(e, pr.dmg, { p, kind: pr.kind, knock: { x: pr.vx * 0.25, y: pr.vy * 0.25 } });
            if (pr.poison) applyPoison(e, pr.poison, 3);
            if (pr.explode) remove = true;
            else if ((pr.pierce || 0) > 0) pr.pierce--;
            else remove = true;
          }
        });
      } else if (!p.dead && p.invuln <= 0 &&
                 Math.hypot(pr.x - p.x, pr.y - (p.y - 10)) < pr.r + p.r) {
        hitPlayer(pr.dmg, pr.x, pr.y);
        remove = true;
      }
    }
    if (remove) {
      if (pr.explode) explodeAt(pr.x, pr.y, pr.explode, pr.dmg, pr.friendly);
      G.projectiles.splice(i, 1);
    }
  }
}

function explodeAt(x, y, radius, dmg, friendly) {
  addParticles(x, y, 24, friendly ? '#e07830' : '#e05050', 210, 0.5);
  G.shake = Math.max(G.shake, 5);
  if (friendly) aoeAt(x, y, radius, dmg, { knock: 150 });
  else {
    const p = G.player;
    if (p && !p.dead && p.invuln <= 0 && Math.hypot(p.x - x, p.y - y) < radius + p.r) hitPlayer(dmg, x, y);
  }
}

function updateTraps(dt) {
  for (let i = G.traps.length - 1; i >= 0; i--) {
    const t = G.traps[i];
    if (t.arm > 0) { t.arm -= dt; continue; }
    t.life -= dt;
    let used = false;
    forEachEnemy((e) => {
      if (!used && Math.hypot(e.x - t.x, e.y - t.y) < t.r + e.r) {
        hitEnemy(e, t.dmg, { p: G.player, stun: 0.4 });
        applyPoison(e, t.poison, 3);
        addParticles(t.x, t.y, 12, '#8ac83c', 140, 0.5);
        used = true;
      }
    });
    if (used || t.life <= 0) G.traps.splice(i, 1);
  }
}

/* Telegraphed danger circles (boss attacks, meteors). */
function addTele(x, y, r, delay, dmg, o = {}) {
  G.telegraphs.push({ x, y, r, t: 0, total: delay, dmg,
    friendly: !!o.friendly, root: o.root || 0, burn: o.burn || null,
    color: o.color || (o.friendly ? 'rgba(240,200,60,' : 'rgba(230,70,70,'),
    onDone: o.onDone || null });
}
function updateTelegraphs(dt) {
  const p = G.player;
  for (let i = G.telegraphs.length - 1; i >= 0; i--) {
    const t = G.telegraphs[i];
    t.t += dt;
    if (t.t >= t.total) {
      G.telegraphs.splice(i, 1);
      if (t.onDone) { t.onDone(); continue; }
      addParticles(t.x, t.y, 18, t.friendly ? '#f0c840' : '#e05050', 180, 0.45);
      if (!t.friendly && p && !p.dead && p.invuln <= 0 &&
          Math.hypot(p.x - t.x, p.y - t.y) < t.r + p.r) {
        hitPlayer(t.dmg, t.x, t.y);
        if (t.root) { p.rooted = Math.max(p.rooted, t.root); UI.toast('Rooted!', '#8ac83c'); }
      }
      if (t.burn) G.burnZones.push({ x: t.x, y: t.y, r: t.r, t: t.burn.t, dps: t.burn.dps, tick: 0 });
    }
  }
}
function updateBurnZones(dt) {
  const p = G.player;
  for (let i = G.burnZones.length - 1; i >= 0; i--) {
    const b = G.burnZones[i];
    b.t -= dt; b.tick -= dt;
    if (b.tick <= 0 && p && !p.dead && Math.hypot(p.x - b.x, p.y - b.y) < b.r + p.r) {
      b.tick = 0.5;
      if (p.invuln <= 0) hitPlayer(b.dps * 0.5, b.x, b.y);
    }
    if (b.t <= 0) G.burnZones.splice(i, 1);
  }
}

/* ---------------- ENEMIES ---------------- */
function scaleStats(base, ilvl) {
  return {
    hp: Math.round(base.hp * (1 + 0.30 * (ilvl - 1))),
    dmg: Math.round(base.dmg * (1 + 0.15 * (ilvl - 1))),
    xp: Math.round(base.xp * (1 + 0.20 * (ilvl - 1))),
  };
}

function spawnEnemy(type, x, y, zone) {
  const t = ENEMY_TYPES[type];
  const s = scaleStats(t, zone.ilvl);
  const spot = findOpenSpot(x, y, t.r);
  const e = {
    type, name: t.name, spr: t.spr, scale: t.scale, r: t.r,
    x: spot.x, y: spot.y,
    hp: s.hp, maxHp: s.hp, dmg: s.dmg, xp: s.xp,
    behavior: t.behavior, speed: t.speed || 0,
    facing: -1, stun: 0, freeze: 0, slowT: 0, touchCd: 0,
    shootT: rand(0.5, 1.6), hopT: rand(0.3, 1.2), wanderT: 0, wx: 0, wy: 0,
    dashing: 0, telegraph: 0, dashDx: 0, dashDy: 0, dashCd: 0,
    kx: 0, ky: 0, dots: [], flash: 0, animT: rand(0, 4), moving: false, isBoss: false,
  };
  G.enemies.push(e);
  return e;
}

function weightedType(table) {
  const total = table.reduce((s, e) => s + e[1], 0);
  let r = Math.random() * total;
  for (const [t, w] of table) { r -= w; if (r <= 0) return t; }
  return table[0][0];
}

function updateEnemies(dt) {
  const p = G.player;
  for (let i = G.enemies.length - 1; i >= 0; i--) {
    const e = G.enemies[i];
    if (e.hp <= 0) { G.enemies.splice(i, 1); continue; }
    tickEnemyCommon(e, dt);
    // knockback decay
    if (e.kx || e.ky) {
      moveCircle(e, e.kx * dt, e.ky * dt);
      e.kx *= Math.pow(0.02, dt); e.ky *= Math.pow(0.02, dt);
      if (Math.abs(e.kx) < 4) e.kx = 0;
      if (Math.abs(e.ky) < 4) e.ky = 0;
    }
    if (e.freeze > 0 || e.stun > 0) { e.moving = false; continue; }
    const slowMul = e.slowT > 0 ? 0.5 : 1;

    const t = ENEMY_TYPES[e.type];
    if (e.behavior === 'totem') continue; // banners just stand there
    const dx = p.x - e.x, dy = p.y - e.y;
    const dd = Math.hypot(dx, dy);
    const aggro = t.range ? t.range + 60 : 280;
    const near = dd < aggro && !p.dead;
    e.moving = false;
    if (dx !== 0) e.facing = dx > 0 ? 1 : -1;

    if (e.behavior === 'blob') {
      e.hopT -= dt;
      if (e.hopping > 0) {
        e.hopping -= dt;
        moveCircle(e, e.hvx * dt * slowMul, e.hvy * dt * slowMul);
        e.moving = true;
      } else if (e.hopT <= 0) {
        e.hopT = 1.1 + rand(-0.2, 0.3);
        const d = near ? norm(dx + rand(-30, 30), dy + rand(-30, 30)) : norm(rand(-1, 1), rand(-1, 1));
        e.hvx = d.x * t.speed * 3.4; e.hvy = d.y * t.speed * 3.4;
        e.hopping = 0.32;
      }
    } else if (e.behavior === 'chase') {
      if (near && dd > e.r + p.r + 2) {
        const d = norm(dx, dy);
        moveCircle(e, d.x * t.speed * slowMul * dt, d.y * t.speed * slowMul * dt);
        e.moving = true;
      } else if (!near) wander(e, t.speed * 0.4, dt);
    } else if (e.behavior === 'ranged') {
      if (near) {
        const want = t.range * 0.62;
        let mvx = 0, mvy = 0;
        if (dd < want - 26) { const d = norm(-dx, -dy); mvx = d.x; mvy = d.y; }
        else if (dd > t.range) { const d = norm(dx, dy); mvx = d.x; mvy = d.y; }
        if (mvx || mvy) { moveCircle(e, mvx * t.speed * slowMul * dt, mvy * t.speed * slowMul * dt); e.moving = true; }
        e.shootT -= dt;
        if (e.shootT <= 0 && dd < t.range) {
          e.shootT = t.shootCd;
          const d = norm(dx, dy - 10);
          fireProj({ x: e.x, y: e.y - 12, vx: d.x * t.projSpeed, vy: d.y * t.projSpeed,
                     dmg: e.dmg, type: 'arrow', friendly: false });
        }
      } else wander(e, t.speed * 0.4, dt);
    } else if (e.behavior === 'charger') {
      if (e.dashing > 0) {
        e.dashing -= dt;
        moveCircle(e, e.dashDx * dt, e.dashDy * dt);
        e.moving = true;
      } else if (e.telegraph > 0) {
        e.telegraph -= dt;
        if (e.telegraph <= 0) {
          const d = norm(p.x - e.x, p.y - e.y);
          e.dashDx = d.x * t.dashSpeed; e.dashDy = d.y * t.dashSpeed;
          e.dashing = 0.45; e.dashCd = 2.6;
        }
      } else {
        e.dashCd -= dt;
        if (near && dd < 210 && e.dashCd <= 0) {
          e.telegraph = 0.5;
          addDmgNum(e.x, e.y - e.r - 8, '!', '#e05858', true);
        } else if (near && dd > e.r + p.r + 2) {
          const d = norm(dx, dy);
          moveCircle(e, d.x * t.speed * slowMul * dt, d.y * t.speed * slowMul * dt);
          e.moving = true;
        } else if (!near) wander(e, t.speed * 0.4, dt);
      }
    } else if (e.behavior === 'turret') {
      e.shootT -= dt;
      if (near && e.shootT <= 0 && dd < t.range) {
        e.shootT = t.shootCd;
        const d = norm(dx, dy - 10);
        fireProj({ x: e.x, y: e.y - 12, vx: d.x * t.projSpeed, vy: d.y * t.projSpeed,
                   dmg: e.dmg, type: 'orb', friendly: false });
      }
    }

    // Contact damage
    e.touchCd -= dt;
    if (!p.dead && p.invuln <= 0 && e.touchCd <= 0 && dd < e.r + p.r + 2) {
      e.touchCd = 0.8;
      hitPlayer(e.dmg * (e.dashing > 0 ? 1.3 : 1), e.x, e.y);
    }
  }
}

function wander(e, speed, dt) {
  e.wanderT -= dt;
  if (e.wanderT <= 0) {
    e.wanderT = rand(1.2, 2.8);
    if (Math.random() < 0.5) { e.wx = 0; e.wy = 0; }
    else { const d = norm(rand(-1, 1), rand(-1, 1)); e.wx = d.x; e.wy = d.y; }
  }
  if (e.wx || e.wy) { moveCircle(e, e.wx * speed * dt, e.wy * speed * dt); e.moving = true; }
}

function tickEnemyCommon(e, dt) {
  e.animT += dt * 8;
  if (e.flash > 0) e.flash -= dt;
  if (e.freeze > 0) e.freeze -= dt;
  if (e.stun > 0) e.stun -= dt;
  if (e.slowT > 0) e.slowT -= dt;
  for (let d = e.dots.length - 1; d >= 0; d--) {
    const dot = e.dots[d];
    dot.t -= dt;
    dot.acc += dot.dps * dt;
    if (dot.acc >= 5) {
      hitEnemy(e, dot.acc, { p: G.player, noCrit: true, silentColor: '#8ac83c' });
      dot.acc = 0;
    }
    if (dot.t <= 0) e.dots.splice(d, 1);
  }
}

function killEnemy(e) {
  const p = G.player;
  addParticles(e.x, e.y - 8, 18, '#f0f0d0', 180, 0.6);
  if (e.isBoss) { onBossKilled(e); return; }
  if (e.isCrystal) { UI.toast('Seal crystal shattered!', '#78d8f0'); return; }
  if (e.isBanner) { UI.toast('Dark banner destroyed!', '#f0c840'); return; }
  addXp(p, e.xp);
  dropGold(e.x, e.y, Math.round(e.xp * 0.35 + rand(0, 4)));
  if (Math.random() < TUNE.dropChance) dropItem(e.x, e.y, genItem(G.zone.ilvl + randi(0, 2)));
  if (Math.random() < TUNE.potionDrop) G.drops.push(makeDrop(e.x, e.y, 'potion'));
}

/* ---------------- DROPS ---------------- */
function makeDrop(x, y, type, data) {
  return { x: x + rand(-14, 14), y: y + rand(-14, 14), type, data, t: 60, bob: rand(0, 6) };
}
function dropGold(x, y, amount) {
  const coins = clamp(Math.ceil(amount / 4), 1, 4);
  for (let i = 0; i < coins; i++) G.drops.push(makeDrop(x, y, 'gold', Math.ceil(amount / coins)));
}
function dropItem(x, y, item) { G.drops.push(makeDrop(x, y, 'item', item)); }

function updateDrops(dt) {
  const p = G.player;
  for (let i = G.drops.length - 1; i >= 0; i--) {
    const d = G.drops[i];
    d.t -= dt;
    const dd = Math.hypot(d.x - p.x, d.y - p.y);
    if (!p.dead && dd < 80) {
      d.x += (p.x - d.x) * 7 * dt;
      d.y += (p.y - d.y) * 7 * dt;
    }
    if (!p.dead && dd < p.r + 10) {
      if (d.type === 'gold') { p.gold += d.data; addDmgNum(p.x, p.y - 14, '+' + d.data + 'g', '#f0c840'); }
      else if (d.type === 'potion') { p.potions++; UI.toast('Health Potion (Q to drink)', '#7ec850'); }
      else if (d.type === 'item') {
        if (p.inventory.length >= 24) { p.gold += rarityData(d.data.rarity).sell; UI.toast('Bag full — sold for gold.', '#c8c8c8'); }
        else { p.inventory.push(d.data); UI.toast(d.data.name + ' (' + rarityData(d.data.rarity).name + ')', rarityData(d.data.rarity).color); }
      }
      G.drops.splice(i, 1); continue;
    }
    if (d.t <= 0) G.drops.splice(i, 1);
  }
}

/* ---------------- INTERACT ---------------- */
function nearTile(p, t, range = 60) {
  if (!t) return false;
  const c = tileCenter(t);
  return Math.hypot(p.x - c.x, p.y - c.y) < range;
}

function tryInteract(p) {
  const m = G.map;
  // NPCs
  for (const n of G.npcs) {
    if (Math.hypot(p.x - n.x, p.y - n.y) < 60) {
      if (n.kind === 'shop') UI.showShop();
      else if (n.kind === 'quest') UI.showCaptain();
      return;
    }
  }
  // Chests
  for (const c of m.chests) {
    if (!c.opened && nearTile(p, c, 56)) {
      if (c.daily && G.villageChestOpened) { UI.toast('The storage chest is empty for now.', '#c8c8c8'); return; }
      c.opened = true;
      if (c.daily) G.villageChestOpened = true;
      const cc = tileCenter(c);
      addParticles(cc.x, cc.y, 20, '#f0c840', 170, 0.7);
      dropGold(cc.x, cc.y, randi(15, 30) + G.zone.ilvl * 3);
      dropItem(cc.x, cc.y, genItem(G.zone.ilvl + 1, Math.max(rollRarity(), 2)));
      return;
    }
  }
  // Seal shrine (appears after the boss falls)
  if (G.shrineActive && nearTile(p, m.bossT, 80)) {
    onShrineUsed();
    return;
  }
  // Portal
  if (nearTile(p, m.portalT, 64)) { UI.showMap(); return; }
}

function nearestInteract(p) {
  for (const n of G.npcs) if (Math.hypot(p.x - n.x, p.y - n.y) < 60) return 'E — Talk to ' + n.label;
  for (const c of G.map.chests) {
    if (!c.opened && nearTile(p, c, 56)) return 'E — Open chest';
  }
  if (G.shrineActive && nearTile(p, G.map.bossT, 80)) return 'E — Restore the seal';
  if (nearTile(p, G.map.portalT, 64)) return 'E — World map';
  return null;
}

/* ---------------- ZONES ---------------- */
function zoneIndex(id) { return ZONES.findIndex(z => z.id === id); }

function enterZone(id) {
  const zone = ZONES.find(z => z.id === id);
  if (!zone) return;
  G.zone = zone;
  G.map = getMap(id);
  // fresh chests each visit (except the village daily chest)
  if (zone.kind !== 'town') for (const c of G.map.chests) c.opened = false;
  G.enemies = []; G.boss = null; G.projectiles = []; G.traps = [];
  G.drops = []; G.telegraphs = []; G.burnZones = []; G.timers = [];
  G.shrineActive = false;
  G.npcs = (G.map.npcs || []).map(n => {
    const c = tileCenter(n);
    return { ...n, x: c.x, y: c.y, animT: rand(0, 4) };
  });
  const p = G.player;
  const s = tileCenter(G.map.spawnT);
  p.x = s.x; p.y = s.y; p.rooted = 0; p.invuln = 1.0;
  if (G.companion) { G.companion.x = p.x - 30; G.companion.y = p.y; }
  G.camera.x = p.x - VW / 2; G.camera.y = p.y - VH / 2;
  // Populate enemies
  if (zone.kind === 'gen') {
    for (const sp of G.map.spawnPoints) {
      const c = tileCenter(sp);
      spawnEnemy(weightedType(zone.enemies), c.x, c.y, zone);
    }
  }
  UI.toast(zone.name + (zone.kind === 'gen' ? ' — ilvl ' + zone.ilvl : ''), '#f0c840');
  UI.updateZoneLabel();
  saveGame();
}

/* ---------------- BOSSES ---------------- */
function maybeStartBoss() {
  const z = G.zone;
  if (!z || z.kind !== 'gen' || !z.boss || G.boss) return;
  if (G.progress.bosses[z.id]) return;
  const p = G.player, bc = tileCenter(G.map.bossT);
  if (Math.hypot(p.x - bc.x, p.y - bc.y) > TS * 5.5) return;
  const B = BOSS_TYPES[z.boss];
  const s = { hp: Math.round(B.hp * (1 + 0.10 * (z.ilvl - 1))), dmg: Math.round(B.dmg * (1 + 0.08 * (z.ilvl - 1))) };
  G.boss = {
    isBoss: true, bossId: z.boss, name: B.name, title: B.title,
    spr: B.spr, scale: B.scale, r: B.r,
    x: bc.x, y: bc.y, hp: s.hp, maxHp: s.hp, dmg: s.dmg, xp: B.xp,
    ai: B.ai, tm: {}, phase: 1, summoned: {}, shielded: false,
    facing: -1, stun: 0, freeze: 0, slowT: 0, touchCd: 0,
    dashing: 0, telegraph: 0, dashDx: 0, dashDy: 0,
    kx: 0, ky: 0, dots: [], flash: 0, animT: 0, moving: false,
  };
  UI.showBossBar((B.title === 'Elite' ? '☠ ' : '♛ ') + B.name);
  UI.toast(B.name + ' awakens!', '#e07830');
  G.shake = 8;
}

/* --- Shared boss attack helpers --- */
function bossFan(b, n, spreadDeg, speed, dmgMul, type) {
  const p = G.player;
  const base = Math.atan2(p.y - b.y, p.x - b.x);
  const spread = spreadDeg * Math.PI / 180;
  for (let i = 0; i < n; i++) {
    const a = base + (n === 1 ? 0 : -spread / 2 + spread * i / (n - 1));
    fireProj({ x: b.x, y: b.y - 14, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
               dmg: b.dmg * dmgMul, type: type || 'orb', friendly: false });
  }
}
function bossRing(b, n, speed, dmgMul, type) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + G.time;
    fireProj({ x: b.x, y: b.y - 14, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
               dmg: b.dmg * dmgMul, type: type || 'orb', friendly: false });
  }
}
function bossSummon(b, type, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    spawnEnemy(type, b.x + Math.cos(a) * 70, b.y + Math.sin(a) * 70, G.zone);
  }
  UI.toast('Reinforcements!', '#8ac83c');
}
function bossChase(b, dt, speed) {
  const p = G.player;
  const dd = distE(b, p);
  if (dd > b.r + p.r + 4) {
    const d = norm(p.x - b.x, p.y - b.y);
    const mul = b.slowT > 0 ? 0.55 : 1;
    moveCircle(b, d.x * speed * mul * dt, d.y * speed * mul * dt);
    b.moving = true;
  }
  b.facing = p.x >= b.x ? 1 : -1;
}
function bossDashStart(b, speed, tele = 0.55) {
  b.telegraph = tele; b.pendSpeed = speed;
  addDmgNum(b.x, b.y - b.r - 14, '!', '#e05858', true);
}
function tickBossDash(b, dt) {
  const p = G.player;
  if (b.dashing > 0) {
    b.dashing -= dt;
    moveCircle(b, b.dashDx * dt, b.dashDy * dt);
    b.moving = true;
    return true;
  }
  if (b.telegraph > 0) {
    b.telegraph -= dt;
    if (b.telegraph <= 0) {
      const d = norm(p.x - b.x, p.y - b.y);
      b.dashDx = d.x * b.pendSpeed; b.dashDy = d.y * b.pendSpeed;
      b.dashing = 0.5;
      G.shake = Math.max(G.shake, 5);
    }
    return true;
  }
  return false;
}
function tmReady(b, key, interval, dt) {
  b.tm[key] = (b.tm[key] === undefined ? interval * rand(0.4, 0.9) : b.tm[key]) - dt;
  if (b.tm[key] <= 0) { b.tm[key] = interval; return true; }
  return false;
}

/* --- Per-boss AI (EDIT HERE to change fights) --- */
const BOSS_AI = {
  captain(b, dt) { // Bandit Captain: charger + knife fans + goblin adds
    if (tickBossDash(b, dt)) return;
    bossChase(b, dt, 95);
    if (tmReady(b, 'dash', 4.5, dt)) bossDashStart(b, 420);
    if (tmReady(b, 'fan', 3.2, dt)) bossFan(b, 3, 34, 260, 0.8, 'knife');
    if (b.hp < b.maxHp * 0.5 && !b.summoned.a) { b.summoned.a = true; bossSummon(b, 'goblin', 2); }
  },
  gearmaster(b, dt) { // bombs, hop-dashes, goblin waves
    if (tickBossDash(b, dt)) return;
    bossChase(b, dt, 70);
    if (tmReady(b, 'bomb', 2.1, dt)) {
      const p = G.player;
      addTele(p.x + rand(-30, 30), p.y + rand(-30, 30), 58, 0.85, b.dmg * 1.1);
    }
    if (tmReady(b, 'dash', 6, dt)) bossDashStart(b, 460);
    if (b.hp < b.maxHp * 0.66 && !b.summoned.a) { b.summoned.a = true; bossSummon(b, 'goblin', 2); }
    if (b.hp < b.maxHp * 0.33 && !b.summoned.b) { b.summoned.b = true; bossSummon(b, 'gob_archer', 2); }
  },
  burrower(b, dt) { // surfaces & sprays crystal, burrows under you, rockfall
    const p = G.player;
    if (b.under > 0) { // burrowed: invulnerable, glides toward the player
      b.under -= dt;
      const d = norm(p.x - b.x, p.y - b.y);
      b.x += d.x * 190 * dt; b.y += d.y * 190 * dt; // ghosts through walls while underground
      if (b.under <= 0) {
        const s = findOpenSpot(b.x, b.y, b.r);
        b.x = s.x; b.y = s.y;
        b.shielded = false; b.hidden = false;
        explodeAt(b.x, b.y, 90, b.dmg * 1.2, false);
        G.shake = Math.max(G.shake, 9);
      }
      return;
    }
    bossChase(b, dt, 45);
    if (tmReady(b, 'spray', 2.4, dt)) bossRing(b, 8, 210, 0.75, 'shard');
    if (tmReady(b, 'burrow', 8, dt)) {
      b.under = 2.2; b.shielded = true; b.hidden = true;
      addTele(p.x, p.y, 90, 2.2, 0, { onDone: () => {} }); // warning marker
      addParticles(b.x, b.y, 20, '#78d8f0', 180, 0.6);
    }
    if (b.hp < b.maxHp * 0.5 && tmReady(b, 'rocks', 3.5, dt)) {
      for (let i = 0; i < 3; i++) addTele(p.x + rand(-140, 140), p.y + rand(-140, 140), 48, 1.0, b.dmg * 0.9);
    }
  },
  mossback(b, dt) { // slow tank: slams, vine roots, living vines
    if (tickBossDash(b, dt)) return;
    const p = G.player;
    bossChase(b, dt, 52);
    if (tmReady(b, 'slam', 4.2, dt)) addTele(b.x, b.y, 120, 0.9, b.dmg * 1.2);
    if (tmReady(b, 'vine', 5.5, dt)) addTele(p.x, p.y, 54, 0.8, b.dmg * 0.8, { root: 1.2, color: 'rgba(120,200,60,' });
    if (b.hp < b.maxHp * 0.66 && !b.summoned.a) { b.summoned.a = true; bossSummon(b, 'mud_sprite', 2); }
    if (b.hp < b.maxHp * 0.33 && !b.summoned.b) { b.summoned.b = true; bossSummon(b, 'mud_sprite', 3); }
  },
  stormwing(b, dt) { // flying: swoops through walls, gusts, lightning breath
    const p = G.player;
    b.fly = true;
    if (b.dashing > 0) { b.dashing -= dt; b.x += b.dashDx * dt; b.y += b.dashDy * dt; b.moving = true; return; }
    if (b.telegraph > 0) {
      b.telegraph -= dt;
      if (b.telegraph <= 0) {
        const d = norm(p.x - b.x, p.y - b.y);
        b.dashDx = d.x * 520; b.dashDy = d.y * 520; b.dashing = 0.55;
      }
      return;
    }
    // hover in a circle around the player
    b.orbit = (b.orbit || 0) + dt * 0.9;
    const gx = p.x + Math.cos(b.orbit) * 190, gy = p.y + Math.sin(b.orbit) * 190;
    const d = norm(gx - b.x, gy - b.y);
    b.x += d.x * 140 * dt; b.y += d.y * 140 * dt;
    b.moving = true; b.facing = p.x >= b.x ? 1 : -1;
    if (tmReady(b, 'swoop', 5, dt)) { bossDashStart(b, 520, 0.6); }
    if (tmReady(b, 'breath', 3.4, dt)) bossFan(b, 5, 52, 250, 0.7, 'bolt');
    if (tmReady(b, 'gust', 7, dt)) {
      const kd = norm(p.x - b.x, p.y - b.y);
      moveCircle(p, kd.x * 60, kd.y * 60);
      if (p.invuln <= 0) hitPlayer(b.dmg * 0.4, b.x, b.y);
      addParticles(p.x, p.y - 10, 16, '#c8e8f8', 200, 0.5);
    }
    if (b.hp < b.maxHp * 0.5 && !b.summoned.a) { b.summoned.a = true; bossSummon(b, 'wyrmling', 2); }
  },
  flameknight(b, dt) { // dashes that leave fire, flame novas
    if (tickBossDash(b, dt)) {
      if (b.dashing > 0 && tmReady(b, 'trail', 0.12, dt))
        G.burnZones.push({ x: b.x, y: b.y, r: 26, t: 3, dps: b.dmg * 0.5, tick: 0 });
      return;
    }
    bossChase(b, dt, 92);
    if (tmReady(b, 'dash', 4.4, dt)) bossDashStart(b, 470);
    if (tmReady(b, 'nova', 5.2, dt)) addTele(b.x, b.y, 130, 0.8, b.dmg * 1.1, { burn: { t: 3, dps: b.dmg * 0.4 } });
    if (tmReady(b, 'fan', 3.6, dt)) bossFan(b, 3, 30, 260, 0.75, 'fireball_e');
  },
  deathknight(b, dt) { // 3 phases: duel → spectral court → dragonfire
    const p = G.player;
    const frac = b.hp / b.maxHp;
    b.phase = frac > 0.66 ? 1 : frac > 0.33 ? 2 : 3;
    if (tickBossDash(b, dt)) return;
    bossChase(b, dt, b.phase === 3 ? 105 : 88);
    if (tmReady(b, 'dash', b.phase === 3 ? 3.2 : 4.6, dt)) bossDashStart(b, 480, 0.5);
    if (tmReady(b, 'slash', 2.6, dt)) bossFan(b, 3, 40, 280, 0.8, 'shard');
    if (b.phase >= 2) {
      if (!b.summoned.knights) {
        b.summoned.knights = true;
        bossSummon(b, 'spectral_knight', 2);
        // Dark banner: destroy it or the Death Knight hits 30% harder
        const bn = spawnEnemy('fallen_soldier', b.x + 90, b.y, G.zone);
        bn.name = 'Dark Banner'; bn.behavior = 'totem'; bn.spr = 'wall_banner_red';
        bn.scale = 3; bn.r = 12; bn.hp = bn.maxHp = Math.round(b.maxHp * 0.06);
        bn.isBanner = true; b.banner = bn;
        UI.toast('A dark banner empowers the Death Knight — destroy it!', '#e05858');
      }
      if (tmReady(b, 'ring', 5, dt)) bossRing(b, 8, 220, 0.7, 'shard');
    }
    if (b.phase === 3) {
      if (!b.summoned.relic) { b.summoned.relic = true; UI.toast('The Death Knight draws on the dragon relic!', '#e07830'); }
      if (tmReady(b, 'fire', 3.4, dt)) addTele(p.x, p.y, 62, 0.75, b.dmg, { burn: { t: 2.5, dps: b.dmg * 0.4 } });
    }
    // Banner buff
    b.buffed = !!(b.banner && b.banner.hp > 0);
  },
  priest(b, dt) { // teleports, fans, wyrmling waves
    const p = G.player;
    bossChase(b, dt, 60);
    if (tmReady(b, 'blink', 5.5, dt)) {
      addParticles(b.x, b.y - 10, 16, '#b478f0', 160, 0.5);
      const a = Math.random() * Math.PI * 2;
      const s = findOpenSpot(p.x + Math.cos(a) * 180, p.y + Math.sin(a) * 180, b.r);
      b.x = s.x; b.y = s.y;
      addParticles(b.x, b.y - 10, 16, '#b478f0', 160, 0.5);
    }
    if (tmReady(b, 'fan', 2.4, dt)) bossFan(b, 4, 46, 270, 0.7, 'orb');
    if (tmReady(b, 'mark', 5, dt)) addTele(p.x, p.y, 58, 0.8, b.dmg * 0.9, { color: 'rgba(190,90,220,' });
    if (b.hp < b.maxHp * 0.66 && !b.summoned.a) { b.summoned.a = true; bossSummon(b, 'wyrmling', 2); }
    if (b.hp < b.maxHp * 0.33 && !b.summoned.b) { b.summoned.b = true; bossSummon(b, 'wyrmling', 2); }
  },
  dragon(b, dt) { // 3 phases: ground → sky terror → seal crystals
    const p = G.player;
    const frac = b.hp / b.maxHp;
    const phase = frac > 0.66 ? 1 : frac > 0.33 ? 2 : 3;
    if (phase !== b.phase) {
      b.phase = phase;
      if (phase === 2) { UI.toast('The dragon takes to the sky!', '#e07830'); b.fly = true; }
      if (phase === 3) {
        b.fly = false;
        UI.toast('Seal crystals shield the dragon — shatter them!', '#78d8f0');
        b.crystals = [];
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2;
          const s = findOpenSpot(b.x + Math.cos(a) * 150, b.y + Math.sin(a) * 150, 12);
          const c = spawnEnemy('crystal_slime', s.x, s.y, G.zone);
          c.name = 'Seal Crystal'; c.behavior = 'totem'; c.spr = 'flask_big_blue';
          c.scale = 3.4; c.r = 13; c.hp = c.maxHp = Math.round(b.maxHp * 0.045);
          c.isCrystal = true;
          b.crystals.push(c);
        }
      }
    }
    if (phase === 3) b.shielded = b.crystals.some(c => c.hp > 0);

    if (phase === 2) { // airborne: orbit + fire rain + swoops
      b.orbit = (b.orbit || 0) + dt * 0.8;
      const gx = p.x + Math.cos(b.orbit) * 220, gy = p.y + Math.sin(b.orbit) * 220;
      const d = norm(gx - b.x, gy - b.y);
      b.x += d.x * 150 * dt; b.y += d.y * 150 * dt;
      b.moving = true; b.facing = p.x >= b.x ? 1 : -1;
      if (tmReady(b, 'rain', 2.2, dt))
        for (let i = 0; i < 3; i++) addTele(p.x + rand(-150, 150), p.y + rand(-150, 150), 52, 1.0, b.dmg * 0.9, { burn: { t: 2, dps: b.dmg * 0.35 } });
      if (tmReady(b, 'swoopP2', 5.5, dt)) { b.telegraph = 0.6; b.pendSpeed = 560; addDmgNum(b.x, b.y - b.r - 14, '!', '#e05858', true); }
      if (b.telegraph > 0) {
        b.telegraph -= dt;
        if (b.telegraph <= 0) { const dd = norm(p.x - b.x, p.y - b.y); b.dashDx = dd.x * 560; b.dashDy = dd.y * 560; b.dashing = 0.5; }
      }
      if (b.dashing > 0) { b.dashing -= dt; b.x += b.dashDx * dt; b.y += b.dashDy * dt; }
      if (!b.summoned.adds && frac < 0.5) { b.summoned.adds = true; bossSummon(b, 'cultist', 2); }
      // contact handled below by shared code
    } else { // ground phases
      if (tickBossDash(b, dt)) return;
      bossChase(b, dt, phase === 3 ? 70 : 58);
      if (tmReady(b, 'claw', 3.0, dt)) {
        const d = aimFrom(b, p);
        addTele(b.x + d.x * 70, b.y + d.y * 70, 66, 0.6, b.dmg * 1.1);
      }
      if (tmReady(b, 'breath', 4.0, dt)) bossFan(b, 7, 64, 240, 0.7, 'fireball_e');
      if (tmReady(b, 'stomp', 5.5, dt)) bossRing(b, 10, 200, 0.65, 'fireball_e');
      if (phase === 3 && tmReady(b, 'barrage', 4.5, dt))
        addTele(p.x, p.y, 70, 0.8, b.dmg, { burn: { t: 2.5, dps: b.dmg * 0.4 } });
    }
  },
};
function aimFrom(a, b) { return norm(b.x - a.x, b.y - a.y); }

function updateBoss(dt) {
  const b = G.boss;
  if (!b || b.hp <= 0) return;
  tickEnemyCommon(b, dt);
  b.moving = false;
  if (b.stun > 0) return;
  BOSS_AI[b.ai](b, dt);
  // Contact damage
  const p = G.player;
  b.touchCd -= dt;
  if (!b.hidden && !p.dead && p.invuln <= 0 && b.touchCd <= 0 && distE(b, p) < b.r + p.r + 2) {
    b.touchCd = 0.8;
    hitPlayer(b.dmg * (b.buffed ? 1.3 : 1) * (b.dashing > 0 ? 1.3 : 1), b.x, b.y);
  }
}

function onBossKilled(b) {
  const p = G.player, z = G.zone;
  G.shake = 14;
  addParticles(b.x, b.y - 12, 60, '#f0c840', 280, 1.2);
  addXp(p, b.xp);
  dropGold(b.x, b.y, Math.round(b.xp * 0.5));
  dropItem(b.x - 16, b.y, genItem(z.ilvl + 2, 4));                      // guaranteed legendary
  dropItem(b.x + 16, b.y, genItem(z.ilvl + 2, Math.max(rollRarity(), 2)));
  G.progress.bosses[z.id] = true;
  const zi = zoneIndex(z.id);
  if (zi + 1 < ZONES.length && G.progress.unlocked <= zi + 1) {
    G.progress.unlocked = zi + 2 > ZONES.length ? ZONES.length : Math.max(G.progress.unlocked, zi + 2);
  }
  if (z.quest) {
    p.gold += z.quest.gold;
    UI.toast('Quest complete: ' + z.quest.name + '! +' + z.quest.gold + ' gold', '#f0c840');
    if (z.quest.seal) {
      G.progress.seals = Math.max(G.progress.seals, z.quest.seal);
      G.shrineActive = true;
      UI.toast('A seal shrine has risen — restore it! (E)', '#78d8f0');
    }
  }
  if (zi + 1 < ZONES.length) UI.toast('New zone unlocked: ' + ZONES[Math.min(zi + 1, ZONES.length - 1)].name + ' (M)', '#4aa3f0');
  UI.hideBossBar();
  // clean up leftover mechanics
  for (const e of G.enemies) if (e.isCrystal || e.isBanner) e.hp = 0;
  G.boss = null;
  if (z.id === 'heart') { G.gameWon = true; schedule(1.5, () => UI.showVictory()); }
  saveGame();
}

function onShrineUsed() {
  G.shrineActive = false;
  const p = G.player;
  p.hp = p.maxHp;
  addParticles(p.x, p.y - 10, 30, '#78d8f0', 200, 1.0);
  UI.toast('Seal restored (' + G.progress.seals + '/6). The land breathes easier.', '#78d8f0');
  saveGame();
}

/* ---------------- SAVE / LOAD ---------------- */
const SAVE_KEY = 'dragonseal_td_v1';
function saveGame() {
  const p = G.player;
  if (!p) return;
  const data = {
    classId: p.classId, subclassId: p.subclassId, level: p.level, xp: p.xp,
    gold: p.gold, potions: p.potions, skillPoints: p.skillPoints,
    nodes: p.nodes, inventory: p.inventory, equipment: p.equipment,
    progress: G.progress, gameWon: G.gameWon,
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) {}
}
function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
function loadGame() {
  let d;
  try { d = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return false; }
  if (!d) return false;
  const p = createPlayer(d.classId);
  p.level = d.level; p.xp = d.xp; p.gold = d.gold; p.potions = d.potions;
  p.skillPoints = d.skillPoints; p.nodes = d.nodes || [];
  p.inventory = d.inventory || []; p.equipment = d.equipment || {};
  if (d.subclassId) {
    p.subclassId = d.subclassId;
    const sub = CLASSES[p.classId].subclasses[d.subclassId];
    p.abilities[4] = sub.ult;
    if (sub.pet) G.companion = createCompanion(sub.pet, false);
  }
  recalcStats(p); p.hp = p.maxHp;
  G.player = p;
  G.progress = d.progress || { unlocked: 1, bosses: {}, seals: 0 };
  G.gameWon = !!d.gameWon;
  return true;
}
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }

/* ---------------- GAME FLOW ---------------- */
function startNewGame(classId) {
  G.player = createPlayer(classId);
  G.companion = null;
  G.progress = { unlocked: 1, bosses: {}, seals: 0 };
  G.gameWon = false; G.villageChestOpened = false;
  G.state = 'playing';
  UI.closeOverlay();
  UI.buildAbilityBar();
  enterZone('village');
  UI.toast('Welcome to Brightwood Village. Talk to Captain Elara, then take the gate!', '#f0c840');
}
function continueGame() {
  if (!loadGame()) { UI.showClassSelect(); return; }
  G.state = 'playing';
  UI.closeOverlay();
  UI.buildAbilityBar();
  enterZone('village');
  UI.toast('Welcome back, hero. Seals restored: ' + G.progress.seals + '/6', '#f0c840');
}

/* ---------------- MAIN UPDATE ---------------- */
function update(dt) {
  G.time += dt;
  if (G.state !== 'playing' || G.overlay) return;
  const p = G.player;
  if (!p) return;

  for (let i = G.timers.length - 1; i >= 0; i--) {
    G.timers[i].t -= dt;
    if (G.timers[i].t <= 0) { const fn = G.timers[i].fn; G.timers.splice(i, 1); fn(); }
  }

  // World-space aim from mouse
  G.aim.x = G.mouseScreen.x + G.camera.x;
  G.aim.y = G.mouseScreen.y + G.camera.y;

  // Cooldowns & buffs
  p.basicCd = Math.max(0, p.basicCd - dt);
  p.dodgeCd = Math.max(0, p.dodgeCd - dt);
  for (const k of Object.keys(p.cds)) p.cds[k] = Math.max(0, p.cds[k] - dt);
  for (const k of Object.keys(p.buffs)) {
    p.buffs[k].t -= dt;
    if (p.buffs[k].t <= 0) delete p.buffs[k];
  }
  if (p.invuln > 0) p.invuln -= dt;
  if (p.hitFlash > 0) p.hitFlash -= dt;
  if (p.rooted > 0) p.rooted -= dt;

  if (!p.dead) {
    let mx = 0, my = 0;
    if (G.keys.KeyA || G.keys.ArrowLeft) mx -= 1;
    if (G.keys.KeyD || G.keys.ArrowRight) mx += 1;
    if (G.keys.KeyW || G.keys.ArrowUp) my -= 1;
    if (G.keys.KeyS || G.keys.ArrowDown) my += 1;
    p.moveX = mx; p.moveY = my;
    const speedMul = (p.buffs.smoke ? 1.4 : 1) * (p.rooted > 0 ? 0 : 1);
    p.moving = false;
    if (p.dashT > 0) {
      p.dashT -= dt;
      moveCircle(p, p.dashDir.x * 620 * dt, p.dashDir.y * 620 * dt);
      p.moving = true;
      forEachEnemy((e) => {
        if (!p.dashHit.has(e) && distE(p, e) < p.r + e.r + 6) {
          p.dashHit.add(e);
          hitEnemy(e, p.attack * 1.5, { p, knock: { x: p.dashDir.x * 140, y: p.dashDir.y * 140 } });
        }
      });
    } else if (p.lungeT > 0) {
      p.lungeT -= dt;
      moveCircle(p, p.dashDir.x * 480 * dt, p.dashDir.y * 480 * dt);
      p.moving = true;
      forEachEnemy((e) => {
        if (!p.lungeHit.has(e) && distE(p, e) < p.r + e.r + 6) {
          p.lungeHit.add(e);
          hitEnemy(e, p.attack * 1.2, { p, knock: { x: p.dashDir.x * 170, y: p.dashDir.y * 170 }, stun: 1.4 });
        }
      });
    } else if (p.dodgeT > 0) {
      p.dodgeT -= dt;
      moveCircle(p, p.dodgeDir.x * 480 * dt, p.dodgeDir.y * 480 * dt);
      p.moving = true;
    } else if (mx || my) {
      const d = norm(mx, my);
      moveCircle(p, d.x * p.moveSpeed * speedMul * dt, d.y * p.moveSpeed * speedMul * dt);
      p.moving = speedMul > 0;
    }
    p.animT += dt * (p.moving ? 10 : 5);
    p.facing = G.aim.x >= p.x ? 1 : -1;

    // Hold mouse to keep attacking
    if (G.mouseDown && p.basicCd <= 0) doBasicAttack(p);

    maybeStartBoss();
  }

  if (G.companion) updateCompanion(G.companion, dt);
  updateEnemies(dt);
  updateBoss(dt);
  updateProjectiles(dt);
  updateTraps(dt);
  updateTelegraphs(dt);
  updateBurnZones(dt);
  updateDrops(dt);

  for (let i = G.particles.length - 1; i >= 0; i--) {
    const pt = G.particles[i];
    pt.t -= dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt;
    pt.vx *= 0.96; pt.vy *= 0.96;
    if (pt.t <= 0) G.particles.splice(i, 1);
  }
  for (let i = G.dmgNums.length - 1; i >= 0; i--) {
    const n = G.dmgNums[i];
    n.t -= dt; n.y -= 38 * dt;
    if (n.t <= 0) G.dmgNums.splice(i, 1);
  }

  // Camera
  const m = G.map;
  const tx = clamp(p.x - VW / 2, 0, Math.max(0, m.w * TS - VW));
  const ty = clamp(p.y - VH / 2, 0, Math.max(0, m.h * TS - VH));
  G.camera.x += (tx - G.camera.x) * clamp(9 * dt, 0, 1);
  G.camera.y += (ty - G.camera.y) * clamp(9 * dt, 0, 1);
  if (G.shake > 0) G.shake = Math.max(0, G.shake - 28 * dt);
}

/* ---------------- RENDER ---------------- */
function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#14121e';
  ctx.fillRect(0, 0, VW, VH);
  if (G.state !== 'playing' || !G.player || !G.map) { UI.updateHUD(); return; }
  if (!ASSETS_READY) {
    ctx.fillStyle = '#f0e6cc';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('Loading sprites…', VW / 2 - 80, VH / 2);
    return;
  }

  const shx = G.shake > 0 ? rand(-G.shake, G.shake) * 0.5 : 0;
  const shy = G.shake > 0 ? rand(-G.shake, G.shake) * 0.5 : 0;
  const camX = Math.round(G.camera.x - shx), camY = Math.round(G.camera.y - shy);
  ctx.setTransform(1, 0, 0, 1, -camX, -camY);

  renderTiles(camX, camY);
  renderGroundFx();
  renderEntities();
  renderTopFx();

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  renderDarkness(camX, camY);
  renderCompass();
  UI.updateHUD();
}

function renderTiles(camX, camY) {
  const m = G.map, theme = G.zone.theme || {};
  const x0 = Math.max(0, Math.floor(camX / TS) - 1), x1 = Math.min(m.w - 1, Math.ceil((camX + VW) / TS) + 1);
  const y0 = Math.max(0, Math.floor(camY / TS) - 1), y1 = Math.min(m.h - 1, Math.ceil((camY + VH) / TS) + 1);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const v = m.grid[ty][tx];
      const px = tx * TS, py = ty * TS;
      if (v === T_FLOOR) {
        drawTinted(ctx, 'floor_' + clamp(m.floorVar[ty][tx], 1, 8), theme.tint || null, px, py, TSCALE);
      } else if (v === T_WALL) {
        const below = ty + 1 < m.h ? m.grid[ty + 1][tx] : T_VOID;
        drawTinted(ctx, below === T_FLOOR ? 'wall_mid' : 'wall_top_mid', theme.wallTint || null, px, py, TSCALE);
      }
      // T_VOID stays dark
    }
  }
  // Decorations
  for (const d of (m.decos || [])) {
    if (d.tx < x0 || d.tx > x1 || d.ty < y0 || d.ty > y1) continue;
    drawTileSpr(ctx, d.spr, 0, d.tx * TS + 8, d.ty * TS + 4, 2);
  }
  // Fountain (village)
  if (m.fountainT) {
    const f = m.fountainT;
    drawTileSpr(ctx, 'wall_fountain_top', 0, f.tx * TS, (f.ty - 1) * TS, TSCALE);
    drawTileSpr(ctx, 'wall_fountain_mid_blue_anim', G.time * 6, f.tx * TS, f.ty * TS, TSCALE);
    drawTileSpr(ctx, 'wall_fountain_basin_blue_anim', G.time * 6, f.tx * TS, (f.ty + 1) * TS, TSCALE);
  }
  // Portal (world gate)
  if (m.portalT) {
    const c = tileCenter(m.portalT);
    drawTileSpr(ctx, 'floor_ladder', 0, m.portalT.tx * TS, m.portalT.ty * TS, TSCALE);
    const pul = 8 + Math.sin(G.time * 3) * 3;
    ctx.strokeStyle = 'rgba(120,216,240,0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(c.x, c.y, 20 + pul, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1;
  }
  // Chests
  for (const c of m.chests) {
    drawSpr(ctx, 'chest_full_open_anim', c.opened ? 2 : 0, c.tx * TS + TS / 2, c.ty * TS + TS - 4, TSCALE, false);
  }
  // Seal shrine
  if (G.shrineActive && m.bossT) {
    const c = tileCenter(m.bossT);
    drawSpr(ctx, 'column_top', 0, c.x, c.y - 36, TSCALE, false);
    drawSpr(ctx, 'column_mid', 0, c.x, c.y + 12, TSCALE, false);
    ctx.fillStyle = `rgba(120,216,240,${0.5 + Math.sin(G.time * 4) * 0.25})`;
    ctx.beginPath(); ctx.arc(c.x, c.y - 44, 9, 0, Math.PI * 2); ctx.fill();
  }
}

function renderGroundFx() {
  // Telegraph circles
  for (const t of G.telegraphs) {
    const frac = clamp(t.t / t.total, 0, 1);
    ctx.fillStyle = t.color + '0.16)';
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = t.color + '0.34)';
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r * frac, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = t.color + '0.8)';
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.stroke();
  }
  // Burn zones
  for (const b of G.burnZones) {
    ctx.fillStyle = `rgba(230,120,40,${0.2 + Math.sin(G.time * 8 + b.x) * 0.08})`;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
  }
  // Traps
  for (const t of G.traps) {
    drawSpr(ctx, 'floor_spikes_anim', t.arm > 0 ? 0 : 1 + G.time * 4 % 3, t.x, t.y + 10, 2.2, false, t.arm > 0 ? 0.6 : 1);
  }
  // Drops
  for (const d of G.drops) {
    const bob = Math.sin(G.time * 4 + d.bob) * 3;
    if (d.type === 'gold') drawSpr(ctx, 'coin_anim', G.time * 7 + d.bob, d.x, d.y + bob, 2.6, false);
    else if (d.type === 'potion') drawSpr(ctx, 'flask_red', 0, d.x, d.y + bob, 2.2, false);
    else {
      const col = rarityData(d.data.rarity).color;
      if (['rare', 'epic', 'legendary'].includes(d.data.rarity)) {
        ctx.fillStyle = col + '55';
        ctx.beginPath(); ctx.arc(d.x, d.y - 8 + bob, 16, 0, Math.PI * 2); ctx.fill();
      }
      drawSpr(ctx, d.data.slot === 'weapon' ? 'weapon_regular_sword' : 'chest_empty_open_anim', 0, d.x, d.y + bob, 2, false);
      ctx.strokeStyle = col;
      ctx.strokeRect(d.x - 9, d.y - 20 + bob, 18, 22);
    }
  }
}

function renderEntities() {
  const list = [];
  const p = G.player;
  for (const e of G.enemies) list.push(e);
  if (G.boss) list.push(G.boss);
  if (G.companion) list.push(G.companion);
  for (const n of G.npcs) list.push(n);
  if (!p.dead) list.push(p);
  list.sort((a, b) => a.y - b.y);

  for (const ent of list) {
    // shadow
    if (!ent.hidden) {
      ctx.fillStyle = 'rgba(10,8,16,0.35)';
      ctx.beginPath();
      ctx.ellipse(ent.x, ent.y + 2, (ent.r || 10) * 1.1, (ent.r || 10) * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (ent === p) drawPlayer(p);
    else if (ent.kind) drawNpc(ent);
    else if (ent === G.companion) drawCompanion(ent);
    else drawEnemy(ent);
  }
}

function drawPlayer(p) {
  const blink = p.invuln > 0 && !p.buffs.smoke && Math.floor(G.time * 14) % 2 === 0;
  if (blink) return;
  const spr = CLASSES[p.classId].spr + (p.moving ? '_run_anim' : '_idle_anim');
  drawSpr(ctx, spr, p.animT, p.x, p.y + 6, TSCALE, p.facing === -1, p.buffs.smoke ? 0.45 : undefined);
  if (p.buffs.guard) {
    ctx.strokeStyle = 'rgba(184,196,212,0.9)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(p.x, p.y - 12, 24, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1;
  }
  if (p.shieldHp > 0) {
    ctx.strokeStyle = 'rgba(180,120,240,0.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y - 12, 28, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1;
  }
  if (p.rooted > 0) {
    ctx.strokeStyle = '#8ac83c'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(p.x, p.y, 14, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1;
  }
}

function drawNpc(n) {
  drawSpr(ctx, n.spr, G.time * 5 + n.animT, n.x, n.y + 6, TSCALE, false);
  if (Math.hypot(G.player.x - n.x, G.player.y - n.y) < 90) {
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#20242e';
    ctx.fillText(n.label, n.x - ctx.measureText(n.label).width / 2 + 1, n.y - 58 + 1);
    ctx.fillStyle = '#f0e6cc';
    ctx.fillText(n.label, n.x - ctx.measureText(n.label).width / 2, n.y - 58);
  }
}

function drawCompanion(c) {
  const key = COMPANION_SPR[c.type];
  drawSpr(ctx, key, c.animT, c.x, c.y + 4, c.type === 'golem' ? 2 : 2.2, c.facing === -1);
  if (c.frenzy > 0) {
    ctx.fillStyle = 'rgba(224,88,88,0.6)';
    ctx.fillRect(c.x - 10, c.y - sprH(key, 2.2) - 8, 20, 3);
  }
  if (c.temp) {
    ctx.fillStyle = 'rgba(240,230,204,0.7)';
    ctx.fillRect(c.x - 12, c.y + 8, 24 * clamp(c.t / 15, 0, 1), 3);
  }
}

function drawEnemy(e) {
  if (e.hidden) { // burrowed boss — show moving dirt
    ctx.fillStyle = 'rgba(120,180,240,0.5)';
    ctx.beginPath(); ctx.arc(e.x, e.y, 16 + Math.sin(G.time * 10) * 4, 0, Math.PI * 2); ctx.fill();
    return;
  }
  const alpha = e.flash > 0 ? 0.55 : (e.telegraph > 0 && Math.floor(G.time * 10) % 2 === 0 ? 0.6 : undefined);
  drawSpr(ctx, e.spr, e.animT, e.x, e.y + 6, e.scale, e.facing === 1, alpha);
  if (e.freeze > 0) {
    ctx.fillStyle = 'rgba(120,216,240,0.45)';
    const h = sprH(e.spr, e.scale);
    ctx.fillRect(e.x - e.r - 3, e.y + 6 - h, e.r * 2 + 6, h);
  }
  if (e.dots.length) {
    ctx.fillStyle = '#8ac83c';
    ctx.fillRect(e.x - 2, e.y - sprH(e.spr, e.scale) - 4, 5, 5);
  }
  if (!e.isBoss && e.hp < e.maxHp) {
    const w = e.r * 2 + 6;
    ctx.fillStyle = '#20242e';
    ctx.fillRect(e.x - w / 2, e.y - sprH(e.spr, e.scale) - 2, w, 5);
    ctx.fillStyle = e.isCrystal ? '#78d8f0' : '#e05858';
    ctx.fillRect(e.x - w / 2 + 1, e.y - sprH(e.spr, e.scale) - 1, (w - 2) * clamp(e.hp / e.maxHp, 0, 1), 3);
  }
  if (e.isBoss && e.shielded) {
    ctx.strokeStyle = 'rgba(120,216,240,0.8)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(e.x, e.y - 14, e.r + 12, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1;
  }
}

function renderTopFx() {
  for (const pr of G.projectiles) {
    if (pr.type === 'bolt') {
      ctx.fillStyle = '#78d8f0';
      ctx.beginPath(); ctx.arc(pr.x, pr.y, 6, 0, Math.PI * 2); ctx.fill();
    } else if (pr.type === 'spark') {
      ctx.fillStyle = '#b478f0';
      ctx.beginPath(); ctx.arc(pr.x, pr.y, 4, 0, Math.PI * 2); ctx.fill();
    } else if (pr.type === 'fireball' || pr.type === 'fireball_e') {
      ctx.fillStyle = '#e07830';
      ctx.beginPath(); ctx.arc(pr.x, pr.y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f0c840';
      ctx.beginPath(); ctx.arc(pr.x, pr.y, 3.5, 0, Math.PI * 2); ctx.fill();
    } else if (pr.type === 'knife') {
      drawSpr(ctx, 'weapon_knife', 0, pr.x, pr.y + 6, 2, pr.vx < 0);
    } else if (pr.type === 'arrow') {
      ctx.strokeStyle = '#c8a060'; ctx.lineWidth = 3;
      const a = Math.atan2(pr.vy, pr.vx);
      ctx.beginPath(); ctx.moveTo(pr.x, pr.y);
      ctx.lineTo(pr.x - Math.cos(a) * 12, pr.y - Math.sin(a) * 12); ctx.stroke();
      ctx.lineWidth = 1;
    } else if (pr.type === 'shard') {
      ctx.fillStyle = '#a8d8f0';
      ctx.beginPath(); ctx.arc(pr.x, pr.y, 5, 0, Math.PI * 2); ctx.fill();
    } else { // orb
      ctx.fillStyle = '#c86ae0';
      ctx.beginPath(); ctx.arc(pr.x, pr.y, 6, 0, Math.PI * 2); ctx.fill();
    }
  }
  for (const pt of G.particles) {
    ctx.globalAlpha = clamp(pt.t / pt.max, 0, 1);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - pt.r / 2, pt.y - pt.r / 2, pt.r, pt.r);
  }
  ctx.globalAlpha = 1;
  for (const n of G.dmgNums) {
    ctx.globalAlpha = clamp(n.t / 0.9, 0, 1);
    ctx.font = (n.big ? 'bold 17px' : 'bold 12px') + ' monospace';
    ctx.fillStyle = '#14121e';
    ctx.fillText(n.text, n.x + 1, n.y + 1);
    ctx.fillStyle = n.color;
    ctx.fillText(n.text, n.x, n.y);
  }
  ctx.globalAlpha = 1;
}

/* Moody zones get a darkness vignette with a light around the hero. */
function renderDarkness(camX, camY) {
  const theme = G.zone.theme || {};
  if (!theme.dark) return;
  const p = G.player;
  const px = p.x - camX, py = p.y - camY - 10;
  const grad = ctx.createRadialGradient(px, py, 90, px, py, 340);
  grad.addColorStop(0, 'rgba(8,8,18,0)');
  grad.addColorStop(1, `rgba(8,8,18,${clamp(theme.dark + 0.35, 0, 0.75)})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VW, VH);
}

/* Compass arrow: points to the boss (or the portal once it's dead). */
function renderCompass() {
  const z = G.zone;
  if (!z || z.kind !== 'gen') return;
  const p = G.player;
  const target = (!G.progress.bosses[z.id] || G.shrineActive) ? G.map.bossT : G.map.portalT;
  if (!target) return;
  const c = tileCenter(target);
  const dx = c.x - p.x, dy = c.y - p.y;
  if (Math.hypot(dx, dy) < 200) return;
  const a = Math.atan2(dy, dx);
  const sx = p.x - G.camera.x + Math.cos(a) * 60;
  const sy = p.y - G.camera.y - 10 + Math.sin(a) * 60;
  const killed = G.progress.bosses[z.id];
  ctx.fillStyle = killed && !G.shrineActive ? 'rgba(120,216,240,0.9)' : 'rgba(240,160,60,0.9)';
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(a);
  ctx.beginPath();
  ctx.moveTo(10, 0); ctx.lineTo(-6, -6); ctx.lineTo(-6, 6);
  ctx.fill();
  ctx.restore();
}

/* ---------------- MAIN LOOP / BOOT ---------------- */
let _last = 0;
function loop(ts) {
  const dt = Math.min((ts - _last) / 1000, 0.05);
  _last = ts;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

window.addEventListener('load', () => {
  initInput();
  UI.init();
  UI.showTitle(hasSave());
  requestAnimationFrame(loop);
});

setInterval(() => { if (G.state === 'playing' && !G.overlay) saveGame(); }, 20000);
