// data/maps.js — builds the Thornwood Marches from a seed.
// Tile IDs: 0 grass, 1 tree, 2 water, 3 rock, 4 path, 5 wall, 6 gate, 7 fort floor, 8 base flag tile
"use strict";

const TILE = { GRASS: 0, TREE: 1, WATER: 2, ROCK: 3, PATH: 4, WALL: 5, GATE: 6, FLOOR: 7, BASE: 8 };
const TILE_SIZE = 32;
const SOLID_TILES = new Set([TILE.TREE, TILE.WATER, TILE.ROCK, TILE.WALL, TILE.GATE]);

function buildThornwood(seed) {
  const rng = mulberry32(seed);
  const W = 52, H = 40;
  const t = new Array(W * H).fill(TILE.GRASS);
  const at = (x, y) => t[y * W + x];
  const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < W && y < H) t[y * W + x] = v; };

  // Border of trees
  for (let x = 0; x < W; x++) { set(x, 0, TILE.TREE); set(x, 1, TILE.TREE); set(x, H - 1, TILE.TREE); set(x, H - 2, TILE.TREE); }
  for (let y = 0; y < H; y++) { set(0, y, TILE.TREE); set(1, y, TILE.TREE); set(W - 1, y, TILE.TREE); set(W - 2, y, TILE.TREE); }

  // Scattered forest + rocks
  for (let i = 0; i < 260; i++) {
    const x = 2 + Math.floor(rng() * (W - 4)), y = 2 + Math.floor(rng() * (H - 4));
    set(x, y, rng() < 0.85 ? TILE.TREE : TILE.ROCK);
  }

  // A lake, roughly mid-south
  for (let y = 24; y < 31; y++) for (let x = 18; x < 28; x++) {
    if (rng() < 0.9) set(x, y, TILE.WATER);
  }

  // Main path: base (SW) to fort (NE)
  let px = 6, py = H - 6;
  while (px < W - 12 || py > 8) {
    set(px, py, TILE.PATH); set(px + 1, py, TILE.PATH);
    if (px < W - 12 && (py <= 8 || rng() < 0.55)) px++; else py--;
  }

  // Player base (SW clearing + flag)
  for (let y = H - 9; y < H - 3; y++) for (let x = 3; x < 11; x++) set(x, y, TILE.GRASS);
  set(6, H - 6, TILE.BASE);
  const base = { x: 6.5 * TILE_SIZE, y: (H - 6.5) * TILE_SIZE };

  // Bramblefang Fort (NE): walled rectangle, gate on south wall
  const fx0 = W - 15, fy0 = 3, fx1 = W - 3, fy1 = 13;
  for (let y = fy0; y <= fy1; y++) for (let x = fx0; x <= fx1; x++) {
    if (y === fy0 || y === fy1 || x === fx0 || x === fx1) set(x, y, TILE.WALL);
    else set(x, y, TILE.FLOOR);
  }
  const gateTx = fx0 + Math.floor((fx1 - fx0) / 2);
  set(gateTx, fy1, TILE.GATE);
  set(gateTx, fy1 + 1, TILE.PATH); set(gateTx, fy1 + 2, TILE.PATH);
  const fort = {
    gate: { tx: gateTx, ty: fy1, x: (gateTx + 0.5) * TILE_SIZE, y: (fy1 + 0.5) * TILE_SIZE },
    inside: { x: (gateTx + 0.5) * TILE_SIZE, y: (fy0 + 4) * TILE_SIZE },
    staging: { x: (gateTx + 0.5) * TILE_SIZE, y: (fy1 + 3.5) * TILE_SIZE },
    rect: { x0: fx0, y0: fy0, x1: fx1, y1: fy1 }
  };

  // Clear spawn zones and define dens/camps
  function clearing(cx, cy, r) {
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
      if (x > 1 && y > 1 && x < W - 2 && y < H - 2 && at(x, y) !== TILE.WATER) set(x, y, TILE.GRASS);
    }
    return { x: (cx + 0.5) * TILE_SIZE, y: (cy + 0.5) * TILE_SIZE };
  }
  const dens = [clearing(12, 12, 2), clearing(34, 30, 2), clearing(14, 26, 2)];
  const camps = [clearing(26, 10, 3), clearing(38, 22, 3), clearing(20, 18, 3)];

  // Ensure base + path near player start are walkable
  clearing(6, H - 6, 3);
  set(6, H - 6, TILE.BASE);

  return { w: W, h: H, tiles: t, base, fort, dens, camps, playerStart: { x: base.x + 40, y: base.y } };
}
