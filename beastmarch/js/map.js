// js/map.js — Thornwood rendering: biome-tinted DTII tiles, TALL organic hedges
// (Zelda-bush style, overlapping the tile above), collision edge-lines so
// blocked terrain reads instantly, deterministic decorations, water foam.
"use strict";

const MapSys = {
  tileAt(map, wx, wy) {
    return this.tileAtTx(map, Math.floor(wx / TILE_SIZE), Math.floor(wy / TILE_SIZE));
  },
  tileAtTx(map, tx, ty) {
    if (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h) return TILE.TREE;
    return map.tiles[ty * map.w + tx];
  },

  walkable(map, x, y, r, ignoreGate) {
    for (const [ox, oy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) {
      const tile = this.tileAt(map, x + ox, y + oy);
      if (tile === TILE.GATE && ignoreGate) continue;
      if (SOLID_TILES.has(tile)) return false;
    }
    return true;
  },

  variant(tx, ty, n) { return 1 + ((tx * 7 + ty * 13 + ((tx * ty) | 0)) % n); },
  hash(tx, ty) { return ((tx * 73856093) ^ (ty * 19349663)) >>> 0; },

  draw(ctx, map, cam) {
    const ts = TILE_SIZE;
    const x0 = Math.max(0, Math.floor(cam.x / ts)), y0 = Math.max(0, Math.floor(cam.y / ts) - 1);
    const x1 = Math.min(map.w - 1, Math.ceil((cam.x + cam.w) / ts)), y1 = Math.min(map.h - 1, Math.ceil((cam.y + cam.h) / ts) + 1);

    // ---- Pass 1: ground + water + decorations ----
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const tile = map.tiles[ty * map.w + tx];
        const sx = tx * ts - cam.x, sy = ty * ts - cam.y;
        const v = this.variant(tx, ty, 4);
        switch (tile) {
          case TILE.GRASS: {
            Sprites.tile(ctx, "tile_grass_" + v, sx, sy);
            // deterministic decorations: ~1 in 7 grass tiles gets a touch of life
            const h = this.hash(tx, ty) % 29;
            if (h === 0) Sprites.draw(ctx, "flower_a", sx + 10 + (this.hash(ty, tx) % 12), sy + ts - 4, 2, false);
            else if (h === 1) Sprites.draw(ctx, "flower_b", sx + 8 + (this.hash(ty, tx) % 14), sy + ts - 4, 2, false);
            else if (h === 2) Sprites.draw(ctx, "mushroom", sx + 12, sy + ts - 4, 2, false);
            else if (h === 3) Sprites.draw(ctx, "pebble", sx + 16, sy + ts - 6, 2, false);
            else if (h <= 6) Sprites.draw(ctx, "tuft", sx + 6 + (this.hash(ty, tx) % 16), sy + ts - 6, 2, false);
            break;
          }
          case TILE.PATH:
            Sprites.tile(ctx, "tile_path_" + v, sx, sy);
            break;
          case TILE.WATER: {
            Sprites.tile(ctx, "tile_water_" + v, sx, sy);
            ctx.fillStyle = "rgba(255,255,255,0.07)";
            ctx.fillRect(sx + ((tx * 5 + ((G.time * 6) | 0)) % 24), sy + 10 + (ty % 3) * 6, 8, 2);
            // foam where water meets land
            ctx.fillStyle = "rgba(231,220,191,0.35)";
            if (!this.isWaterish(map, tx, ty - 1)) ctx.fillRect(sx, sy, ts, 3);
            if (!this.isWaterish(map, tx, ty + 1)) ctx.fillRect(sx, sy + ts - 3, ts, 3);
            if (!this.isWaterish(map, tx - 1, ty)) ctx.fillRect(sx, sy, 3, ts);
            if (!this.isWaterish(map, tx + 1, ty)) ctx.fillRect(sx + ts - 3, sy, 3, ts);
            break;
          }
          case TILE.TREE: case TILE.ROCK:
            // ground under; the obstacle itself draws in pass 2
            Sprites.tile(ctx, "tile_grass_" + v, sx, sy);
            break;
          case TILE.WALL: {
            const below = this.tileAtTx(map, tx, ty + 1);
            Sprites.tile(ctx, below === TILE.WALL ? "tile_wall_top" : "tile_wall", sx, sy);
            break;
          }
          case TILE.GATE:
            Sprites.tile(ctx, "tile_fort_" + v, sx, sy);
            Sprites.tile(ctx, "door_closed", sx, sy);
            break;
          case TILE.FLOOR:
            Sprites.tile(ctx, "tile_fort_" + v, sx, sy);
            break;
          case TILE.BASE:
            Sprites.tile(ctx, "tile_path_" + v, sx, sy);
            ctx.fillStyle = "#3a2a18"; ctx.fillRect(sx + 14, sy - 14, 4, 44);
            Sprites.draw(ctx, "banner_red", sx + ts / 2 + 8, sy + 12, 2, false);
            break;
        }
        // Collision edge-lines: dark seam wherever open ground meets blocked
        if (!SOLID_TILES.has(tile) && tile !== TILE.GATE) {
          ctx.fillStyle = "rgba(10,16,12,0.45)";
          if (this.solidAt(map, tx, ty - 1)) ctx.fillRect(sx, sy, ts, 2);
          if (this.solidAt(map, tx, ty + 1)) ctx.fillRect(sx, sy + ts - 2, ts, 2);
          if (this.solidAt(map, tx - 1, ty)) ctx.fillRect(sx, sy, 2, ts);
          if (this.solidAt(map, tx + 1, ty)) ctx.fillRect(sx + ts - 2, sy, 2, ts);
        }
      }
    }

    // ---- Pass 2: tall hedges + rocks (drawn top-to-bottom so lower rows overlap) ----
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const tile = map.tiles[ty * map.w + tx];
        const sx = tx * ts - cam.x, sy = ty * ts - cam.y;
        if (tile === TILE.TREE) {
          // 16x22 hedge drawn at 2x → 32x44, feet at the tile bottom (rises 12px above)
          Sprites.draw(ctx, "hedge", sx + ts / 2, sy + ts, 2, this.hash(tx, ty) % 2 === 0);
        } else if (tile === TILE.ROCK) {
          Sprites.draw(ctx, "tile_rock", sx + ts / 2, sy + ts - 2, 1.6, false);
        }
      }
    }
  },

  isWaterish(map, tx, ty) { return this.tileAtTx(map, tx, ty) === TILE.WATER; },
  solidAt(map, tx, ty) {
    const t = this.tileAtTx(map, tx, ty);
    return SOLID_TILES.has(t);
  }
};
