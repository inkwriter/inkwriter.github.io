// js/sprites.js — 0x72 Dungeon Tileset II atlas (baked by tools/bake_assets.py).
// Frames live in assets/atlas.png; coordinates come from assets/manifest.js
// (a JS file rather than JSON so everything works from file:// with no fetch).
"use strict";

const Sprites = {
  img: null,
  ready: false,

  load(cb) {
    this.img = new Image();
    this.img.onload = () => { this.ready = true; cb(); };
    this.img.onerror = () => { console.error("atlas.png failed to load"); cb(); };
    this.img.src = "assets/atlas.png";
  },

  frame(name) { return ATLAS_FRAMES[name] || null; },

  // Draw a frame centered on cx with its FEET at feetY. flip mirrors horizontally.
  draw(ctx, name, cx, feetY, scale, flip) {
    const f = ATLAS_FRAMES[name];
    if (!f || !this.ready) return;
    const [x, y, w, h] = f;
    const dw = w * scale, dh = h * scale;
    ctx.save();
    if (flip) {
      ctx.translate(cx, 0); ctx.scale(-1, 1);
      ctx.drawImage(this.img, x, y, w, h, -dw / 2, feetY - dh, dw, dh);
    } else {
      ctx.drawImage(this.img, x, y, w, h, cx - dw / 2, feetY - dh, dw, dh);
    }
    ctx.restore();
  },

  // Draw a 16x16 terrain tile at map position (2x scale)
  tile(ctx, name, sx, sy, size) {
    const f = ATLAS_FRAMES[name];
    if (!f || !this.ready) return;
    ctx.drawImage(this.img, f[0], f[1], f[2], f[3], sx, sy, size || 32, size || 32);
  },

  // 4-frame idle/run animation name for a character sheet
  anim(sheet, moving, t, speed) {
    const i = 1 + Math.floor(t * (speed || 8)) % 4;
    return sheet + (moving ? "_run_f" : "_idle_f") + i;
  },

  // Soft shadow ellipse to ground characters
  shadow(ctx, cx, feetY, r) {
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(cx, feetY - 1, r, r * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
  }
};
