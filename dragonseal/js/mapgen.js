/* ============================================================
   MAPGEN.JS — Tile maps. The village is hand-authored; every
   other zone is generated (rooms + corridors) from a fixed seed
   in data.js, so the world is the same every visit.
   Tile codes: 0 = void, 1 = floor, 2 = wall.
   ============================================================ */

const T_VOID = 0, T_FLOOR = 1, T_WALL = 2;
const TILE = 16;      // source tile px
const TSCALE = 3;     // on-screen scale
const TS = TILE * TSCALE; // world px per tile (48)

/* Deterministic RNG (mulberry32) so zone layouts never change. */
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- Procedural zone (rooms + corridors) ---------- */
function genZone(zone) {
  const g = zone.gen;
  const rng = makeRng(g.seed);
  const W = g.w, H = g.h;
  const grid = Array.from({ length: H }, () => new Array(W).fill(T_VOID));

  // 1) Place non-overlapping rooms
  const rooms = [];
  let guard = 0;
  while (rooms.length < g.rooms && guard++ < 400) {
    const rw = g.rmin + Math.floor(rng() * (g.rmax - g.rmin + 1));
    const rh = g.rmin + Math.floor(rng() * (g.rmax - g.rmin + 1));
    const rx = 2 + Math.floor(rng() * (W - rw - 4));
    const ry = 2 + Math.floor(rng() * (H - rh - 4));
    const room = { x: rx, y: ry, w: rw, h: rh,
                   cx: rx + Math.floor(rw / 2), cy: ry + Math.floor(rh / 2) };
    if (rooms.some(o => rx < o.x + o.w + 2 && rx + rw + 2 > o.x &&
                        ry < o.y + o.h + 2 && ry + rh + 2 > o.y)) continue;
    rooms.push(room);
    for (let y = ry; y < ry + rh; y++)
      for (let x = rx; x < rx + rw; x++) grid[y][x] = T_FLOOR;
  }

  // 2) Connect rooms with 2-wide L corridors
  const carve = (x, y) => {
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const yy = y + dy, xx = x + dx;
      if (yy > 0 && yy < H - 1 && xx > 0 && xx < W - 1) grid[yy][xx] = T_FLOOR;
    }
  };
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1], b = rooms[i];
    let x = a.cx, y = a.cy;
    while (x !== b.cx) { carve(x, y); x += Math.sign(b.cx - x); }
    while (y !== b.cy) { carve(x, y); y += Math.sign(b.cy - y); }
    carve(x, y);
  }

  // 3) Wrap floors in walls
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (grid[y][x] !== T_VOID) continue;
    outer: for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const yy = y + dy, xx = x + dx;
      if (yy >= 0 && yy < H && xx >= 0 && xx < W && grid[yy][xx] === T_FLOOR) {
        grid[y][x] = T_WALL; break outer;
      }
    }
  }

  // 4) Entrance room = first; boss room = farthest from it
  const start = rooms[0];
  let bossRoom = rooms[0], bd = -1;
  for (const r of rooms) {
    const d = Math.hypot(r.cx - start.cx, r.cy - start.cy);
    if (d > bd) { bd = d; bossRoom = r; }
  }

  // 5) Chests in random middle rooms
  const chests = [];
  const midRooms = rooms.filter(r => r !== start && r !== bossRoom);
  for (let i = 0; i < Math.min(TUNE.chestPerZone, midRooms.length); i++) {
    const r = midRooms.splice(Math.floor(rng() * midRooms.length), 1)[0];
    chests.push({ tx: r.cx, ty: r.cy, opened: false });
  }

  // 6) Enemy spawn points: floor tiles away from the entrance & boss room
  const spawnPoints = [];
  guard = 0;
  while (spawnPoints.length < zone.count && guard++ < 3000) {
    const x = 1 + Math.floor(rng() * (W - 2));
    const y = 1 + Math.floor(rng() * (H - 2));
    if (grid[y][x] !== T_FLOOR) continue;
    if (Math.hypot(x - start.cx, y - start.cy) < 9) continue;
    if (x >= bossRoom.x && x < bossRoom.x + bossRoom.w &&
        y >= bossRoom.y && y < bossRoom.y + bossRoom.h) continue;
    spawnPoints.push({ tx: x, ty: y });
  }

  // 7) Decorations (crates, skulls, flasks…) on random floor tiles
  const decos = [];
  const decoKeys = (zone.theme && zone.theme.deco) || [];
  if (decoKeys.length) {
    for (let i = 0; i < Math.floor(W * H / 55); i++) {
      const x = 1 + Math.floor(rng() * (W - 2));
      const y = 1 + Math.floor(rng() * (H - 2));
      if (grid[y][x] !== T_FLOOR) continue;
      if (Math.hypot(x - start.cx, y - start.cy) < 4) continue;
      decos.push({ tx: x, ty: y, spr: decoKeys[Math.floor(rng() * decoKeys.length)] });
    }
  }

  // 8) Per-tile floor variants (visual variety, deterministic)
  const floorVar = Array.from({ length: H }, () => new Array(W).fill(0));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const r = rng();
    floorVar[y][x] = r < 0.72 ? 1 : 1 + Math.ceil(r * 7); // mostly floor_1
  }

  return {
    w: W, h: H, grid, floorVar, rooms,
    spawnT: { tx: start.cx, ty: start.cy },
    portalT: { tx: start.cx, ty: start.cy - Math.floor(start.h / 2) + 1 },
    bossT: { tx: bossRoom.cx, ty: bossRoom.cy },
    bossRoom, chests, spawnPoints, decos,
  };
}

/* ---------- Brightwood Village (hand-authored) ----------
   # wall · . floor · P world-gate portal · S shopkeeper
   Q quest captain · F fountain (solid, animated) · C storage chest */
const VILLAGE_MAP = [
  '##############################',
  '#............................#',
  '#..S......FF........Q........#',
  '#.........FF.................#',
  '#............................#',
  '#............................#',
  '#....##..............##......#',
  '#....##..............##......#',
  '#............................#',
  '#............................#',
  '#.............P..............#',
  '#............................#',
  '#....##..............##......#',
  '#....##..............##......#',
  '#............................#',
  '#..C.........................#',
  '#............................#',
  '##############################',
];

function genVillage() {
  const H = VILLAGE_MAP.length, W = VILLAGE_MAP[0].length;
  const grid = Array.from({ length: H }, () => new Array(W).fill(T_FLOOR));
  const rng = makeRng(7);
  const floorVar = Array.from({ length: H }, () => new Array(W).fill(1));
  const npcs = [], decos = [];
  let portalT = { tx: 15, ty: 10 }, fountainT = null, chestT = null;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = VILLAGE_MAP[y][x];
    const r = rng();
    floorVar[y][x] = r < 0.72 ? 1 : 1 + Math.ceil(r * 7);
    if (c === '#') grid[y][x] = T_WALL;
    else if (c === 'P') portalT = { tx: x, ty: y };
    else if (c === 'S') npcs.push({ kind: 'shop', tx: x, ty: y, spr: 'lizard_f_idle_anim', label: 'Mira — Trading Post' });
    else if (c === 'Q') npcs.push({ kind: 'quest', tx: x, ty: y, spr: 'knight_f_idle_anim', label: 'Captain Elara' });
    else if (c === 'F') { grid[y][x] = T_WALL; if (!fountainT) fountainT = { tx: x, ty: y }; }
    else if (c === 'C') chestT = { tx: x, ty: y };
  }
  return {
    w: W, h: H, grid, floorVar, rooms: [],
    spawnT: { tx: portalT.tx, ty: portalT.ty + 2 },
    portalT, npcs, decos, fountainT,
    chests: chestT ? [{ tx: chestT.tx, ty: chestT.ty, opened: false, daily: true }] : [],
    spawnPoints: [],
  };
}

/* Cache generated maps (they're deterministic anyway). */
const _mapCache = {};
function getMap(zoneId) {
  if (_mapCache[zoneId]) return _mapCache[zoneId];
  const zone = ZONES.find(z => z.id === zoneId);
  const m = zone.kind === 'town' ? genVillage() : genZone(zone);
  _mapCache[zoneId] = m;
  return m;
}
