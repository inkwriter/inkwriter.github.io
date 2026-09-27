#!/usr/bin/env python3
"""Regenerates assets/extra.png + js/atlas.js from assets/tileset.png.
Add new recolor variants to the `variants` dict below, then run:
    python3 tools/bake_assets.py
Requires: pip install pillow"""
from PIL import Image
import colorsys, json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sheet = Image.open(os.path.join(ROOT, 'assets/tileset.png')).convert('RGBA')
tl = {}
for line in open(os.path.join(ROOT, 'tools/tiles_list.txt')):
    p = line.split()
    if len(p) >= 6: tl[p[0]] = tuple(int(v) for v in p[1:6])

def crop_anim(name):
    x, y, w, h, f = tl[name]
    return sheet.crop((x, y, x + w * f, y + h)), w, h, f

def hueshift(img, dh, sat=1.0, val=1.0, alpha=1.0):
    out = img.copy(); px = out.load()
    for j in range(out.height):
        for i in range(out.width):
            r, g, b, a = px[i, j]
            if a == 0: continue
            h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255)
            h = (h + dh) % 1.0; s = min(1, s*sat); v = min(1, v*val)
            r2, g2, b2 = colorsys.hsv_to_rgb(h, s, v)
            px[i, j] = (int(r2*255), int(g2*255), int(b2*255), int(a*alpha))
    return out

# EDIT HERE: variant name -> (source anim, hue/sat/val/alpha transform)
variants = {
  'crystal_slime':   ('muddy_idle_anim',       dict(dh=0.55, sat=1.1, val=1.15)),
  'gob_archer':      ('goblin_idle_anim',      dict(dh=0.10, val=0.95)),
  'frost_bones':     ('skelet_idle_anim',      dict(dh=0.55, sat=0.5, val=1.05)),
  'wyrmling':        ('chort_idle_anim',       dict(dh=0.45, sat=0.9)),
  'ember_hound':     ('wogol_idle_anim',       dict(dh=0.0,  sat=1.2, val=1.05)),
  'cultist':         ('necromancer_idle_anim', dict(dh=0.85, sat=1.1)),
  'spectral_knight': ('knight_m_idle_anim',    dict(dh=0.55, sat=0.6, val=1.2, alpha=0.75)),
  'flame_knight':    ('knight_m_idle_anim',    dict(dh=0.47, sat=1.35, val=1.0)),
  'death_knight':    ('knight_m_idle_anim',    dict(dh=0.5,  sat=1.1, val=0.42)),
  'wyvern':          ('big_demon_idle_anim',   dict(dh=0.55, sat=0.95, val=1.1)),
  'bog_shambler':    ('zombie_idle_anim',      dict(dh=0.08, sat=1.1, val=0.9)),
  'gear_goblin':     ('goblin_idle_anim',      dict(dh=0.0)),
  'wolf_gray':       ('wogol_idle_anim',       dict(dh=0.0,  sat=0.12, val=0.95)),
  'wisp_spirit':     ('imp_idle_anim',         dict(dh=0.55, sat=0.75, val=1.35, alpha=0.8)),
  'golem_stone':     ('ogre_idle_anim',        dict(dh=0.0,  sat=0.15, val=0.85)),
}

maxw = max(tl[s][2] * tl[s][4] for s, _ in variants.values())
totalh = sum(tl[s][3] for s, _ in variants.values())
extra = Image.new('RGBA', (maxw, totalh)); atlas = {}; y = 0
for name, (src, kw) in variants.items():
    img, w, h, f = crop_anim(src)
    extra.paste(hueshift(img, **kw), (0, y))
    atlas[name] = dict(sheet=1, x=0, y=y, w=w, h=h, f=f); y += h
extra.save(os.path.join(ROOT, 'assets/extra.png'))
for name, (x, yy, w, h, f) in tl.items():
    atlas[name] = dict(sheet=0, x=x, y=yy, w=w, h=h, f=f)
with open(os.path.join(ROOT, 'js/atlas.js'), 'w') as fp:
    fp.write('/* AUTO-GENERATED sprite atlas - 0x72 DungeonTilesetII v1.3 (CC0) + baked recolors.\n')
    fp.write('   sheet 0 = assets/tileset.png, sheet 1 = assets/extra.png\n')
    fp.write('   Regenerate with tools/bake_assets.py */\n')
    fp.write('const ATLAS = ' + json.dumps(atlas) + ';\n')
print('baked', extra.size, len(atlas), 'atlas entries')
