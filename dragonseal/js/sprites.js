/* ============================================================
   SPRITES.JS — Sheet loading + atlas drawing helpers.
   All art: 0x72 DungeonTilesetII v1.3 (CC0) + baked recolors.
   ============================================================ */

const SHEETS = [new Image(), new Image()];
let _sheetsLoaded = 0;
let ASSETS_READY = false;
SHEETS[0].src = 'assets/tileset.png';
SHEETS[1].src = 'assets/extra.png';
for (const img of SHEETS) {
  img.onload = () => { if (++_sheetsLoaded >= 2) ASSETS_READY = true; };
  img.onerror = () => { console.error('Failed to load sprite sheet', img.src); };
}

/* Draw one frame of an atlas entry.
   (dx, dy) = feet position: horizontal center, bottom edge.
   flip mirrors horizontally. */
function drawSpr(ctx, key, frame, dx, dy, scale, flip, alpha) {
  const a = ATLAS[key];
  if (!a) return;
  const f = a.f > 1 ? Math.floor(frame) % a.f : 0;
  const sx = a.x + f * a.w, sy = a.y;
  const dw = a.w * scale, dh = a.h * scale;
  if (alpha !== undefined) ctx.globalAlpha = alpha;
  if (flip) {
    ctx.save();
    ctx.translate(Math.round(dx), Math.round(dy - dh));
    ctx.scale(-1, 1);
    ctx.drawImage(SHEETS[a.sheet], sx, sy, a.w, a.h, Math.round(-dw / 2), 0, dw, dh);
    ctx.restore();
  } else {
    ctx.drawImage(SHEETS[a.sheet], sx, sy, a.w, a.h,
                  Math.round(dx - dw / 2), Math.round(dy - dh), dw, dh);
  }
  if (alpha !== undefined) ctx.globalAlpha = 1;
}

/* Plain top-left tile draw (for map tiles / decorations). */
function drawTileSpr(ctx, key, frame, dx, dy, scale) {
  const a = ATLAS[key];
  if (!a) return;
  const f = a.f > 1 ? Math.floor(frame) % a.f : 0;
  ctx.drawImage(SHEETS[a.sheet], a.x + f * a.w, a.y, a.w, a.h,
                Math.round(dx), Math.round(dy), a.w * scale, a.h * scale);
}

/* Tinted tile cache: bake "tile + colored overlay" once per
   (key, tint) so zones get distinct biome palettes for free. */
const _tintCache = {};
function drawTinted(ctx, key, tint, dx, dy, scale) {
  const a = ATLAS[key];
  if (!a) return;
  const id = key + '|' + tint;
  let cv = _tintCache[id];
  if (!cv) {
    cv = document.createElement('canvas');
    cv.width = a.w; cv.height = a.h;
    const c = cv.getContext('2d');
    c.drawImage(SHEETS[a.sheet], a.x, a.y, a.w, a.h, 0, 0, a.w, a.h);
    if (tint) {
      c.globalCompositeOperation = 'source-atop';
      c.fillStyle = tint;
      c.fillRect(0, 0, a.w, a.h);
    }
    _tintCache[id] = cv;
  }
  ctx.drawImage(cv, Math.round(dx), Math.round(dy), a.w * scale, a.h * scale);
}

function sprH(key, scale) { const a = ATLAS[key]; return a ? a.h * scale : 0; }
