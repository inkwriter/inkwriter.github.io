#!/usr/bin/env python3
"""
bake_assets.py — Beastmarch v0.3 asset pipeline.
Sources: 0x72 Dungeon Tileset II (CC0) frames in tools/raw/ + hand-pixeled
folk-bestiary sprites defined below. Every pixel is quantized to one curated
SNES-style master palette at the end — that's what makes it all feel like one game.
"""
import json, os, random
from PIL import Image

SRC = os.path.join(os.path.dirname(__file__), "raw")
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "assets")
os.makedirs(OUT_DIR, exist_ok=True)
random.seed(7)

def load(name):
    return Image.open(os.path.join(SRC, name + ".png")).convert("RGBA")

def tint(im, color, strength=1.0):
    out = im.copy(); px = out.load()
    cr, cg, cb = color
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a == 0: continue
            lum = ((0.299*r + 0.587*g + 0.114*b) / 255.0) ** 0.85
            nr, ng, nb = int(lum*cr), int(lum*cg), int(lum*cb)
            px[x, y] = (int(r+(nr-r)*strength), int(g+(ng-g)*strength), int(b+(nb-b)*strength), a)
    return out

def brighten(im, f):
    out = im.copy(); px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a: px[x, y] = (min(255,int(r*f)), min(255,int(g*f)), min(255,int(b*f)), a)
    return out

def gold_edge(im):
    out = im.copy(); px = out.load(); srcp = im.load()
    W, H = im.size
    for y in range(H):
        for x in range(W):
            r, g, b, a = srcp[x, y]
            if a == 0: continue
            for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                nx, ny = x+dx, y+dy
                if nx<0 or ny<0 or nx>=W or ny>=H or srcp[nx,ny][3]==0:
                    px[x, y] = (min(255,r+90), min(255,g+70), b//2+40, a); break
    return out

def from_grid(rows, pal):
    h = len(rows); w = max(len(r) for r in rows)
    im = Image.new("RGBA", (w, h), (0,0,0,0)); px = im.load()
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != ".": px[x, y] = pal[ch] + (255,)
    return im

sprites = {}

# ============================================================
# HAND-PIXELED FOLK BESTIARY (all face right; engine flips)
# ============================================================
BOAR_PAL = {"B":(138,90,51),"D":(94,60,31),"W":(239,230,204),"E":(26,18,8),"P":(185,138,94)}
BOAR_1 = [
"................",
"......DDDDD.....",
".....DBBBBBD....",
"....DBBBBBBBDD..",
"..DDBBBBBBBBBBD.",
".DBBBBBBBBBEBBD.",
".DBBBBBBBBBBBPD.",
".DBBBBBBBBBPPW..",
"..DBBBBBBBD..W..",
"...DBD..DBD.....",
"...DDD..DDD.....",
"................"]
BOAR_2 = [
"................",
"......DDDDD.....",
".....DBBBBBD....",
"....DBBBBBBBDD..",
"..DDBBBBBBBBBBD.",
".DBBBBBBBBBEBBD.",
".DBBBBBBBBBBBPD.",
".DBBBBBBBBBPPW..",
"..DBBBBBBBD..W..",
"....DBD.DBD.....",
"...DDD...DDD....",
"................"]
FOX_PAL = {"O":(201,123,46),"W":(239,230,204),"D":(94,60,31),"E":(26,18,8)}
FOX_1 = [
"................",
"...........O.O.",
"..WO.......OOOO",
".WWOO......OEOO",
".WOOOOOOOOOOOOO",
"..OOOOOOOOOOOW.",
"...OOOOOOOOOO..",
"....OO....OO...",
"....DO....DO...",
"................",
"................"]
FOX_2 = [
"................",
"...........O.O.",
"..WO.......OOOO",
".WWOO......OEOO",
".WOOOOOOOOOOOOO",
"..OOOOOOOOOOOW.",
"...OOOOOOOOOO..",
"...OO......OO..",
"....OD.....OD..",
"................",
"................"]
MOTH_PAL = {"P":(154,134,184),"L":(201,188,224),"D":(74,63,92),"E":(224,208,106)}
MOTH_1 = [
"....P......P....",
"...PPP....PPP...",
"..PPLPP..PPLPP..",
"..PLLLP..PLLLP..",
"..PPLPPDDPPLPP..",
"...PPPDDDDPPP...",
"....PPDEEDPP....",
".....PDDDDP.....",
"......DDDD......",
".......DD.......",
".......DD.......",
"................"]
MOTH_2 = [
"................",
"................",
".PP..........PP.",
".PLPP......PPLP.",
".PLLLPP..PPLLLP.",
".PPLLPPDDPPLLPP.",
"..PPPPDDDDPPPP..",
"....PPDEEDPP....",
".....PDDDDP.....",
"......DDDD......",
".......DD.......",
"................"]
HAWK_PAL = {"T":(92,122,138),"W":(231,220,191),"Y":(224,168,58),"E":(26,18,8)}
HAWK_1 = [
"..T..........T..",
".TTT........TTT.",
".TTTT......TTTT.",
"..TTTTT..TTTTT..",
"...TTTTTTTTTT...",
"....TTTTTTTT....",
"....TWTTTTW.....",
"....TTTET.YY....",
".....TTTTT......",
"......TWT.......",
".......W........",
"................",
"................"]
HAWK_2 = [
"................",
"................",
"TTT..........TTT",
".TTTTT....TTTTT.",
"..TTTTTTTTTTTT..",
"....TTTTTTTT....",
"....TWTTTTW.....",
"....TTTET.YY....",
".....TTTTT......",
"......TWT.......",
".......W........",
"................",
"................"]
STAG_PAL = {"B":(122,90,58),"D":(74,53,36),"M":(95,138,74),"G":(138,168,106),
            "A":(216,207,174),"E":(26,18,8),"W":(239,230,204)}
STAG_1 = [
"....A....A......A....A..........",
"....A...AA......AA...A..........",
"....AA..A..A..A..A..AA..........",
".....A.AA..A..A..AA.A...........",
".....AAA...AAAA...AAA...........",
"......A.....AA.....A............",
"............AA..................",
"...........DBBD.................",
"...........DBEBD................",
"...........DBBBW................",
"...........DBBD.................",
"..........DBBD..................",
".........DBBBD..................",
".......DDBBBBD..................",
".....DDBBBBBBDDDDDDDD...........",
"...DDBBBBMMBBBBBBBBBBDD.........",
"..DBBBBMMGGMBBBBBBBBBBBD........",
".DBBBBBMGGGMBBBBBBMMBBBBD.......",
".DBBBBBBMMMBBBBBMMGGMBBBD.......",
".DBBBBBBBBBBBBBBMGGMBBBBD.......",
".DBBBBBBBBBBBBBBBMMBBBBBD.......",
"..DBBBBBBBBBBBBBBBBBBBBD........",
"..DBBDBBBDDBBBBBDBBBDBBD........",
"..DBB.DBB..DBB..DBB.DBB.........",
"..DBB.DBB..DBB..DBB.DBB.........",
"..DBB.DBB..DBB..DBB.DBB.........",
"..DDB.DDB..DDB..DDB.DDB.........",
"..DDD.DDD..DDD..DDD.DDD.........",
"................................",
"................................"]
STAG_2 = [r for r in STAG_1[:22]] + [
"..DBBDBBBDDBBBBBDBBBDBBD........",
"...DBB.DBB.DBB.DBB..DBB.........",
"...DBB.DBB.DBB.DBB..DBB.........",
"..DBB...DBBDBB..DBB.DBB.........",
"..DDB...DDB.DDB..DDBDDB.........",
"..DDD...DDD.DDD..DDD.DDD........",
"................................",
"................................"]

HAND = {"boar":(BOAR_1,BOAR_2,BOAR_PAL),"fox":(FOX_1,FOX_2,FOX_PAL),
        "moth":(MOTH_1,MOTH_2,MOTH_PAL),"hawk":(HAWK_1,HAWK_2,HAWK_PAL),
        "stag":(STAG_1,STAG_2,STAG_PAL)}
for name,(f1,f2,pal) in HAND.items():
    a, b = from_grid(f1,pal), from_grid(f2,pal)
    for kind in ("idle","run"):
        sprites[f"{name}_{kind}_f1"] = a; sprites[f"{name}_{kind}_f2"] = b
        sprites[f"{name}_{kind}_f3"] = a; sprites[f"{name}_{kind}_f4"] = b

# ============================================================
# DTII-BASED SHEETS (de-demoned): (out, src, idle, run, tint, strength)
# ============================================================
CHAR = [
    ("bogling",   "swampy",     [1,2,3,4],[1,2,3,4],(96,150,70),  0.55),
    ("drake",     "lizard",     [1,2,3,4],[1,2,3,4],(215,90,48),  0.75),
    ("troll",     "ogre",       [1,2,3,4],[1,2,3,4],(140,148,132),0.85),
    ("slime",     "muddy",      [1,2,3,4],[1,2,3,4],(222,196,90), 0.9),
    ("capt",      "orc_masked", [1,2,3,4],[1,2,3,4],None,0),
    ("capt_elite","orc_warrior",[1,2,3,4],[1,2,3,4],None,0),
    ("boss",      "orc_shaman", [1,2,3,4],[1,2,3,4],None,0),
    ("turncoat",  "orc_masked", [1,2,3,4],[1,2,3,4],(120,60,140), 0.6),
    ("warden",    "knight",     [1,2,3,4],[1,2,3,4],None,0),
]
for out, src, idle, run, color, s in CHAR:
    for i, f in enumerate(idle,1):
        im = load(f"{src}_idle_f{f}")
        if color: im = tint(im,color,s)
        sprites[f"{out}_idle_f{i}"] = im
    for i, f in enumerate(run,1):
        im = load(f"{src}_run_f{f}")
        if color: im = tint(im,color,s)
        sprites[f"{out}_run_f{i}"] = im
sprites["warden_hit_f1"] = load("knight_hit_f1")

# Evolved variants for all species incl. the stag
for sp in ["boar","bogling","drake","troll","fox","moth","hawk","slime","stag"]:
    for kind in ("idle","run"):
        for i in (1,2,3,4):
            sprites[f"{sp}_evo_{kind}_f{i}"] = gold_edge(brighten(sprites[f"{sp}_{kind}_f{i}"],1.12))

# ============================================================
# TERRAIN — darker impassables for readability, organic hedge
# ============================================================
GRASS,GRASS2 = (92,134,70),(84,124,64)
PATH,WATER   = (168,142,96),(44,74,122)
ROCK         = (100,100,92)
floors = [load(f"floor_{i}") for i in range(1,9)]
for i,f in enumerate(floors,1):
    sprites[f"tile_fort_{i}"]  = f
    sprites[f"tile_grass_{i}"] = tint(f,GRASS if i%2 else GRASS2,0.92)
    sprites[f"tile_path_{i}"]  = tint(f,PATH,0.85)
    sprites[f"tile_water_{i}"] = tint(f,WATER,0.97)
wall_mid, wall_top = load("wall_mid"), load("wall_top")
sprites["tile_wall"], sprites["tile_wall_top"] = wall_mid, wall_top
sprites["tile_rock"] = tint(load("crate"),ROCK,0.9)

# Organic thorn hedge: 16x22, leafy cap over a dark green face with leaf noise
HEDGE_D,HEDGE_M,HEDGE_L,THORN = (30,52,30),(44,74,40),(64,96,52),(214,200,160)
hedge = Image.new("RGBA",(16,22),(0,0,0,0))
cap  = tint(wall_top,HEDGE_M,0.95).resize((16,7),Image.NEAREST)
face = tint(wall_mid,HEDGE_D,0.95).resize((16,15),Image.NEAREST)
hedge.paste(cap,(0,0)); hedge.paste(face,(0,7))
hp_ = hedge.load()
for _ in range(46):  # leaf clumps
    x,y = random.randint(0,15), random.randint(0,20)
    hp_[x,y] = (HEDGE_L if random.random()<0.55 else HEDGE_M)+(255,)
for _ in range(5):   # pale thorns
    x,y = random.randint(1,14), random.randint(2,18)
    hp_[x,y] = THORN+(255,)
sprites["hedge"] = hedge

sprites["door_closed"]=load("door_closed"); sprites["door_open"]=load("door_open")
sprites["banner_red"]=load("banner_red"); sprites["skull"]=load("skull")
for i in (0,1,2,3): sprites[f"coin_f{i}"]=load(f"coin_f{i}")

# ============================================================
# DECORATIONS + PROJECTILES (hand-pixeled)
# ============================================================
DEC = {
 "flower_a": (["........","...R....","..RYR...","...R....","...G....","...G....","........","........"],
              {"R":(216,90,58),"Y":(224,208,106),"G":(58,92,52)}),
 "flower_b": (["........","...P....","..PWP...","...P....","...G....","...G....","........","........"],
              {"P":(154,134,184),"W":(245,239,208),"G":(58,92,52)}),
 "mushroom": (["........","..RRR...",".RWRWR..",".RRRRR..","...W....","...W....","........","........"],
              {"R":(184,51,47),"W":(231,220,191)}),
 "pebble":   (["........","........","........","..GG....",".GLGG...",".GGGG...","........","........"],
              {"G":(107,107,96),"L":(165,163,150)}),
 "tuft":     (["........",".L..L...","L.LL.L..",".LLLL...","..LL....","........","........","........"],
              {"L":(64,96,52)}),
 "arrow":    (["..........DH","SSSSSSSSSSHH","..........DH"],
              {"S":(122,90,58),"H":(205,191,153),"D":(94,60,31)}),
 "ember":    ([".RRR...","ROOOR..","ROWOR..","ROOOR..",".RRR...","......."],
              {"R":(184,51,47),"O":(224,168,58),"W":(245,239,208)}),
 "thorn_p":  (["..G..",".GGG.","GGWGG",".GGG.","..G.."],
              {"G":(58,92,52),"W":(214,200,160)}),
}
for name,(rows,pal) in DEC.items():
    sprites[name] = from_grid(rows,pal)

# ============================================================
# MASTER PALETTE QUANTIZATION — the SNES unifier
# ============================================================
PALETTE = [
 (12,20,16),(26,18,8),(23,48,31),(36,69,44),
 (44,74,48),(58,95,58),(79,122,68),(95,138,74),(120,160,88),(143,186,106),
 (58,42,24),(94,60,31),(122,82,48),(138,90,51),(168,118,72),(196,154,102),
 (205,191,153),(231,220,191),(242,234,210),
 (74,85,72),(107,107,96),(125,138,122),(138,138,125),(165,163,150),
 (39,74,99),(61,101,145),(92,122,138),(122,158,194),
 (122,31,28),(184,51,47),(216,90,58),
 (224,168,58),(224,208,106),(245,215,138),
 (74,63,92),(122,104,160),(154,134,184),
 (216,185,138),(245,239,208)
]
def nearest(c):
    r,g,b = c
    best, bd = PALETTE[0], 1e9
    for p in PALETTE:
        d = (r-p[0])**2*0.9 + (g-p[1])**2*1.2 + (b-p[2])**2*0.8
        if d < bd: bd, best = d, p
    return best
_cache = {}
def quantize(im):
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r,g,b,a = px[x,y]
            if a == 0: continue
            key = (r,g,b)
            if key not in _cache: _cache[key] = nearest(key)
            q = _cache[key]
            px[x,y] = q + (a,)
    return im

# ============================================================
# PACK
# ============================================================
names = sorted(sprites.keys(), key=lambda n:(sprites[n].height,n))
PAD,MAXW = 1,1024
x=y=shelf=0; placements={}
for n in names:
    im = sprites[n]
    if x+im.width+PAD > MAXW: x=0; y+=shelf+PAD; shelf=0
    placements[n]=(x,y,im.width,im.height); x+=im.width+PAD; shelf=max(shelf,im.height)
atlas = Image.new("RGBA",(MAXW,y+shelf+PAD),(0,0,0,0))
for n,(px_,py_,w,h) in placements.items(): atlas.paste(sprites[n],(px_,py_))
quantize(atlas)
atlas.save(os.path.join(OUT_DIR,"atlas.png"))
with open(os.path.join(OUT_DIR,"manifest.js"),"w") as f:
    f.write('// Generated by tools/bake_assets.py\n"use strict";\nconst ATLAS_FRAMES = ')
    f.write(json.dumps(placements,separators=(",",":"))); f.write(";\n")
print(f"atlas: {MAXW}x{y+shelf+PAD}, {len(placements)} frames")
