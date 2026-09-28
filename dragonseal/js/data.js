/* ============================================================
   DATA.JS — All game content. EDIT THIS FILE to tune:
   classes, subclasses, abilities, skill trees, enemies, bosses,
   zones, loot tables, quests, shop prices.
   ============================================================ */

/* ---------- ITEM RARITIES ---------- */
const RARITIES = [
  { id: 'common',    name: 'Common',    color: '#c8c8c8', weight: 44, stats: 1, sell: 6   },
  { id: 'uncommon',  name: 'Uncommon',  color: '#7ec850', weight: 30, stats: 2, sell: 15  },
  { id: 'rare',      name: 'Rare',      color: '#4aa3f0', weight: 17, stats: 3, sell: 40  },
  { id: 'epic',      name: 'Epic',      color: '#b478f0', weight: 7,  stats: 4, sell: 100 },
  { id: 'legendary', name: 'Legendary', color: '#f0a030', weight: 2,  stats: 4, sell: 260 },
];

const GEAR_SLOTS = ['weapon', 'offhand', 'helmet', 'chest', 'gloves', 'boots', 'ring', 'amulet'];

const ITEM_BASES = {
  weapon:  ['Blade', 'Longsword', 'Dagger', 'Warhammer', 'Oaken Staff', 'Runed Wand', 'Hunting Bow'],
  offhand: ['Buckler', 'Kite Shield', 'Spell Tome', 'Quiver', 'Lantern Charm'],
  helmet:  ['Cap', 'Helm', 'Hood', 'Circlet'],
  chest:   ['Tunic', 'Breastplate', 'Robe', 'Scale Vest'],
  gloves:  ['Gloves', 'Gauntlets', 'Wraps'],
  boots:   ['Boots', 'Greaves', 'Striders'],
  ring:    ['Band', 'Ring', 'Signet', 'Loop'],
  amulet:  ['Amulet', 'Pendant', 'Talisman', 'Locket'],
};
const ITEM_PREFIX = {
  common:    ['Worn', 'Plain', 'Simple', 'Sturdy'],
  uncommon:  ['Fine', 'Polished', 'Keen', "Traveler's"],
  rare:      ['Gleaming', 'Enchanted', 'Valiant', 'Skyforged'],
  epic:      ['Heroic', 'Radiant', 'Stormbound', 'Dragonmarked'],
  legendary: [],
};

/* Stat pool. value = base + itemLevel * per.
   Keys: hp, armor, atk, spl, crit, cdr, speed, dodge, pet, boss */
const STAT_POOL = [
  { key: 'hp',    name: 'Health',             base: 10, per: 4,   pct: false },
  { key: 'armor', name: 'Armor',              base: 3,  per: 1,   pct: false },
  { key: 'atk',   name: 'Attack Damage',      base: 2,  per: 1.3, pct: false },
  { key: 'spl',   name: 'Spell Power',        base: 2,  per: 1.3, pct: false },
  { key: 'crit',  name: 'Critical Chance',    base: 3,  per: 0.4, pct: true  },
  { key: 'cdr',   name: 'Cooldown Reduction', base: 3,  per: 0.3, pct: true  },
  { key: 'speed', name: 'Movement Speed',     base: 4,  per: 0.3, pct: true  },
  { key: 'dodge', name: 'Dodge Recharge',     base: 5,  per: 0.5, pct: true  },
  { key: 'pet',   name: 'Companion Damage',   base: 6,  per: 1,   pct: true  },
  { key: 'boss',  name: 'Boss Damage',        base: 4,  per: 0.7, pct: true  },
];

/* ---------- LEGENDARY ITEMS (EDIT HERE to add more) ----------
   `effect` is a hook id consumed by game.js. */
const LEGENDARIES = [
  { name: 'Emberstaff',            slot: 'weapon',  stats: { spl: 16, cdr: 8 },    effect: 'big_fireball',
    fx: 'Fireball explosions are 60% larger.' },
  { name: 'Dragonbone Blade',      slot: 'weapon',  stats: { atk: 16, crit: 6 },   effect: 'boss_slayer',
    fx: '+30% damage to bosses.' },
  { name: 'Boots of Windstep',     slot: 'boots',   stats: { speed: 14, dodge: 15 }, effect: 'windstep',
    fx: 'Dash & Blink cooldowns reduced 30%.' },
  { name: 'Wolf Fang Ring',        slot: 'ring',    stats: { pet: 25, hp: 25 },    effect: 'pack_bond',
    fx: 'Companions attack 30% faster.' },
  { name: 'Shadowglass Dagger',    slot: 'weapon',  stats: { atk: 12, speed: 8 },  effect: 'shadow_edge',
    fx: '+15% critical chance.' },
  { name: 'Stormcall Amulet',      slot: 'amulet',  stats: { spl: 12, crit: 6 },   effect: 'storm_bolt',
    fx: 'Magic Bolt pierces one extra enemy.' },
  { name: 'Shield of the Old Gate',slot: 'offhand', stats: { armor: 14, hp: 35 },  effect: 'old_gate',
    fx: 'Guard abilities also heal 10% HP.' },
  { name: 'Golemheart Pendant',    slot: 'amulet',  stats: { pet: 20, armor: 8 },  effect: 'golem_heart',
    fx: 'Summoned golems last 8s longer.' },
  { name: 'Sealkeeper Signet',     slot: 'ring',    stats: { boss: 15, cdr: 8 },   effect: 'sealkeeper',
    fx: 'Ultimate abilities recharge 20% faster.' },
];

/* ---------- ABILITIES ----------
   Meta only — behavior lives in ABILITY_IMPL (game.js). */
const ABILITIES = {
  // Rogue
  r_slash:  { name: 'Quick Slash',    icon: '⚔', cd: 1.5,  desc: 'A lightning-fast triple flurry toward your aim.' },
  r_dash:   { name: 'Dash Strike',    icon: '➜', cd: 4,    desc: 'Dash toward your cursor, slicing everything in your path.' },
  r_knife:  { name: 'Throwing Knife', icon: '🗡', cd: 2.5,  desc: 'Hurl a knife toward your cursor.' },
  r_trap:   { name: 'Poison Trap',    icon: '✱', cd: 8,    desc: 'Place a trap that poisons enemies who step on it.' },
  r_smoke:  { name: 'Smoke Bomb',     icon: '☁', cd: 14,   desc: 'Vanish for 2.5s: untouchable and 40% faster.' },
  r_shadow: { name: 'Shadow Step',    icon: '✦', cd: 10,   desc: 'Teleport behind the nearest enemy for a guaranteed critical.' },
  r_frenzy: { name: 'Pack Frenzy',    icon: '♞', cd: 16,   desc: 'Your beast rages for 6s: +100% damage and attack speed.' },
  // Knight
  k_slash:  { name: 'Heavy Slash',    icon: '⚔', cd: 1.8,  desc: 'A wide, crushing arc toward your aim.' },
  k_bash:   { name: 'Shield Bash',    icon: '🛡', cd: 5,    desc: 'Lunge forward, damaging and stunning enemies.' },
  k_slam:   { name: 'Ground Slam',    icon: '⬇', cd: 7,    desc: 'Slam the earth — a shockwave around you.' },
  k_shout:  { name: 'Battle Shout',   icon: '♪', cd: 14,   desc: '+35% attack damage for 8s.' },
  k_guard:  { name: 'Guard Stance',   icon: '⛨', cd: 15,   desc: 'Block 70% of damage for 4s.' },
  k_break:  { name: 'Groundbreaker',  icon: '✹', cd: 16,   desc: 'A massive quake that damages and stuns all nearby foes.' },
  k_wall:   { name: 'Shield Wall',    icon: '▓', cd: 18,   desc: 'Block 90% of damage for 5s.' },
  // Wizard
  w_bolt:   { name: 'Magic Bolt',     icon: '✧', cd: 1.2,  desc: 'A swift arcane bolt toward your cursor.' },
  w_blink:  { name: 'Blink',          icon: '⇢', cd: 5,    desc: 'Teleport toward your cursor.' },
  w_fire:   { name: 'Fireball',       icon: '☄', cd: 4,    desc: 'A blazing orb that explodes on impact.' },
  w_nova:   { name: 'Frost Nova',     icon: '❄', cd: 9,    desc: 'Freeze nearby enemies solid for 2.5s.' },
  w_shield: { name: 'Arcane Shield',  icon: '◈', cd: 15,   desc: 'Absorb damage equal to 40% of your max HP.' },
  w_meteor: { name: 'Meteor',         icon: '☀', cd: 16,   desc: 'Call a meteor down on your cursor. Huge area damage.' },
  w_golem:  { name: 'Summon Golem',   icon: '⛰', cd: 22,   desc: 'A stone golem fights beside you for 15s.' },
};

/* ---------- CLASSES ---------- */
const CLASSES = {
  rogue: {
    name: 'Rogue', icon: '🗡', spr: 'elf_m',
    tagline: 'Fast, technical, deadly.',
    desc: 'High mobility and burst damage. Fragile, but hard to catch.',
    baseHp: 85,  hpPerLvl: 9,
    baseAtk: 11, atkPerLvl: 2.4,
    baseSpl: 6,  splPerLvl: 1,
    armor: 4, crit: 12, speed: 175, dodgeCd: 1.6,
    basic: { name: 'Stab', cd: 0.32, mult: 0.7, range: 30, arc: 26 },
    abilities: ['r_slash', 'r_dash', 'r_knife', 'r_trap', 'r_smoke'],
    subclasses: {
      assassin: { name: 'Assassin', icon: '✦',
        desc: 'Shadows, poison and critical strikes. Smoke Bomb becomes Shadow Step.',
        ult: 'r_shadow', passive: '+12% Critical Chance', pstats: { crit: 12 } },
      tamer: { name: 'Tamer', icon: '♞',
        desc: 'A loyal wolf fights at your side. Smoke Bomb becomes Pack Frenzy.',
        ult: 'r_frenzy', passive: 'Gain a wolf companion', pstats: {}, pet: 'wolf' },
    },
  },
  knight: {
    name: 'Knight', icon: '⛨', spr: 'knight_m',
    tagline: 'The unbreakable wall.',
    desc: 'Heavy armor and heavy hits. Slow, but nearly unstoppable.',
    baseHp: 130, hpPerLvl: 14,
    baseAtk: 13, atkPerLvl: 2.8,
    baseSpl: 4,  splPerLvl: 0.6,
    armor: 14, crit: 5, speed: 150, dodgeCd: 2.2,
    basic: { name: 'Swing', cd: 0.45, mult: 0.85, range: 34, arc: 34 },
    abilities: ['k_slash', 'k_bash', 'k_slam', 'k_shout', 'k_guard'],
    subclasses: {
      champion: { name: 'Champion', icon: '✹',
        desc: 'All-out offense with earth-shattering blows. Guard Stance becomes Groundbreaker.',
        ult: 'k_break', passive: '+15% Attack Damage', pstats: { atkP: 15 } },
      sentry: { name: 'Sentry', icon: '▓',
        desc: "The kingdom's shield. Guard Stance becomes Shield Wall.",
        ult: 'k_wall', passive: '+10 Armor, +45 Health', pstats: { armor: 10, hp: 45 } },
    },
  },
  wizard: {
    name: 'Wizard', icon: '☄', spr: 'wizzard_m',
    tagline: 'Raw elemental power.',
    desc: 'Devastating ranged spells and crowd control. Handle with care.',
    baseHp: 75,  hpPerLvl: 8,
    baseAtk: 5,  atkPerLvl: 0.8,
    baseSpl: 15, splPerLvl: 3,
    armor: 2, crit: 8, speed: 160, dodgeCd: 1.9,
    basic: { name: 'Spark', cd: 0.42, mult: 0.55, ranged: true },
    abilities: ['w_bolt', 'w_blink', 'w_fire', 'w_nova', 'w_shield'],
    subclasses: {
      elementalist: { name: 'Elementalist', icon: '☀',
        desc: 'Fire, ice and storm woven together. Arcane Shield becomes Meteor.',
        ult: 'w_meteor', passive: '+15% Spell Power', pstats: { splP: 15 } },
      summoner: { name: 'Summoner', icon: '◈',
        desc: 'An arcane wisp serves you always. Arcane Shield becomes Summon Golem.',
        ult: 'w_golem', passive: 'Gain a wisp companion', pstats: {}, pet: 'wisp' },
    },
  },
};

/* ---------- SKILL TREES ----------
   Node: { id, name, desc, stats:{...}, flag }
   Flags hook into game.js: tumbler, knife_poison, bolt_pierce,
   big_fireball, big_nova, big_slam, swift_pet, trap_potent, steadfast */
const SKILL_TREES = {
  rogue: {
    base: [
      { id: 'r1', name: 'Fleet Foot',      desc: '+8% Movement Speed',      stats: { speed: 8 } },
      { id: 'r2', name: 'Keen Edge',       desc: '+10% Attack Damage',      stats: { atkP: 10 } },
      { id: 'r3', name: 'Tumbler',         desc: 'Dodge roll recharges 40% faster', stats: {}, flag: 'tumbler' },
      { id: 'r4', name: 'Sharpened Steel', desc: '+8% Critical Chance',     stats: { crit: 8 } },
      { id: 'r5', name: 'Shadow Reflex',   desc: '+10% Cooldown Reduction', stats: { cdr: 10 } },
    ],
    assassin: { branches: [
      { name: 'Shadow', nodes: [
        { id: 'as1', name: 'Shadow Blend',  desc: '+8% Movement Speed',      stats: { speed: 8 } },
        { id: 'as2', name: 'Night Veil',    desc: '+8% Cooldown Reduction',  stats: { cdr: 8 } },
        { id: 'as3', name: 'Umbral Power',  desc: '+15% Attack Damage',      stats: { atkP: 15 } },
      ]},
      { name: 'Poison', nodes: [
        { id: 'ap1', name: 'Venom Coat',    desc: 'Throwing Knife poisons enemies', stats: {}, flag: 'knife_poison' },
        { id: 'ap2', name: 'Toxin Master',  desc: '+10% Attack Damage',      stats: { atkP: 10 } },
        { id: 'ap3', name: 'Lingering Rot', desc: '+30 Health',              stats: { hp: 30 } },
      ]},
      { name: 'Critical', nodes: [
        { id: 'ac1', name: 'Exposed Gaps',    desc: '+8% Critical Chance',   stats: { crit: 8 } },
        { id: 'ac2', name: 'Killer Instinct', desc: '+8% Critical Chance',   stats: { crit: 8 } },
        { id: 'ac3', name: 'Deathblow',       desc: '+20% Boss Damage',      stats: { boss: 20 } },
      ]},
    ]},
    tamer: { branches: [
      { name: 'Beast', nodes: [
        { id: 'tb1', name: 'Loyal Heart', desc: '+20% Companion Damage',     stats: { pet: 20 } },
        { id: 'tb2', name: 'Alpha Bond',  desc: 'Companion attacks 25% faster', stats: {}, flag: 'swift_pet' },
        { id: 'tb3', name: 'Wild Fury',   desc: '+30% Companion Damage',     stats: { pet: 30 } },
      ]},
      { name: 'Traps', nodes: [
        { id: 'tt1', name: 'Sharp Snares',   desc: 'Poison Trap deals +50% damage', stats: {}, flag: 'trap_potent' },
        { id: 'tt2', name: "Trapper's Eye",  desc: '+8% Critical Chance',    stats: { crit: 8 } },
        { id: 'tt3', name: 'Field Craft',    desc: '+8% Cooldown Reduction', stats: { cdr: 8 } },
      ]},
      { name: 'Command', nodes: [
        { id: 'tc1', name: "Hunter's Pace", desc: '+8% Movement Speed',      stats: { speed: 8 } },
        { id: 'tc2', name: 'Steady Hand',   desc: '+12% Attack Damage',      stats: { atkP: 12 } },
        { id: 'tc3', name: 'Pack Leader',   desc: '+35 Health',              stats: { hp: 35 } },
      ]},
    ]},
  },
  knight: {
    base: [
      { id: 'k1', name: 'Toughness',     desc: '+30 Health',              stats: { hp: 30 } },
      { id: 'k2', name: 'Iron Skin',     desc: '+8 Armor',                stats: { armor: 8 } },
      { id: 'k3', name: 'Juggernaut',    desc: 'Take 50% less knockback', stats: {}, flag: 'steadfast' },
      { id: 'k4', name: 'Weapon Drills', desc: '+12% Attack Damage',      stats: { atkP: 12 } },
      { id: 'k5', name: 'Veteran',       desc: '+8% Cooldown Reduction',  stats: { cdr: 8 } },
    ],
    champion: { branches: [
      { name: 'Two-Handed', nodes: [
        { id: 'ch1', name: 'Mighty Grip',   desc: '+12% Attack Damage',    stats: { atkP: 12 } },
        { id: 'ch2', name: 'Crushing Arcs', desc: 'Ground Slam is 50% larger', stats: {}, flag: 'big_slam' },
        { id: 'ch3', name: 'Executioner',   desc: '+20% Boss Damage',      stats: { boss: 20 } },
      ]},
      { name: 'Valor', nodes: [
        { id: 'cv1', name: 'Bold Heart',   desc: '+35 Health',             stats: { hp: 35 } },
        { id: 'cv2', name: 'War Rhythm',   desc: '+8% Cooldown Reduction', stats: { cdr: 8 } },
        { id: 'cv3', name: "Hero's Surge", desc: '+10% Attack Damage',     stats: { atkP: 10 } },
      ]},
      { name: 'Impact', nodes: [
        { id: 'ci1', name: 'Heavy Steps',    desc: '+6% Critical Chance',  stats: { crit: 6 } },
        { id: 'ci2', name: 'Stunning Blows', desc: '+10% Attack Damage',   stats: { atkP: 10 } },
        { id: 'ci3', name: 'Aftershock',     desc: '+15% Boss Damage',     stats: { boss: 15 } },
      ]},
    ]},
    sentry: { branches: [
      { name: 'Shield Mastery', nodes: [
        { id: 'ss1', name: 'Braced Guard',      desc: '+8 Armor',              stats: { armor: 8 } },
        { id: 'ss2', name: 'Shield Discipline', desc: '+8% Cooldown Reduction', stats: { cdr: 8 } },
        { id: 'ss3', name: 'Immovable',         desc: '+45 Health',            stats: { hp: 45 } },
      ]},
      { name: 'Banners', nodes: [
        { id: 'sb1', name: 'Rally Point',     desc: '+10% Attack Damage', stats: { atkP: 10 } },
        { id: 'sb2', name: 'Standard Bearer', desc: '+30 Health',         stats: { hp: 30 } },
        { id: 'sb3', name: "Kingdom's Call",  desc: '+15% Boss Damage',   stats: { boss: 15 } },
      ]},
      { name: 'Fortress', nodes: [
        { id: 'sf1', name: 'Stone Stance', desc: '+6 Armor',  stats: { armor: 6 } },
        { id: 'sf2', name: 'Bulwark',      desc: '+35 Health', stats: { hp: 35 } },
        { id: 'sf3', name: 'Living Wall',  desc: '+10 Armor', stats: { armor: 10 } },
      ]},
    ]},
  },
  wizard: {
    base: [
      { id: 'w1', name: 'Arcane Study',  desc: '+12% Spell Power',        stats: { splP: 12 } },
      { id: 'w2', name: 'Mage Armor',    desc: '+25 Health',              stats: { hp: 25 } },
      { id: 'w3', name: 'Swift Casting', desc: '+10% Cooldown Reduction', stats: { cdr: 10 } },
      { id: 'w4', name: 'Focused Mind',  desc: '+8% Critical Chance',     stats: { crit: 8 } },
      { id: 'w5', name: 'Deep Reserves', desc: '+12% Spell Power',        stats: { splP: 12 } },
    ],
    elementalist: { branches: [
      { name: 'Fire', nodes: [
        { id: 'ef1', name: 'Kindling',    desc: 'Fireball explosions are 60% larger', stats: {}, flag: 'big_fireball' },
        { id: 'ef2', name: 'Inner Flame', desc: '+12% Spell Power', stats: { splP: 12 } },
        { id: 'ef3', name: 'Inferno',     desc: '+20% Boss Damage', stats: { boss: 20 } },
      ]},
      { name: 'Ice', nodes: [
        { id: 'ei1', name: 'Deep Chill',    desc: 'Frost Nova is 40% larger', stats: {}, flag: 'big_nova' },
        { id: 'ei2', name: 'Frozen Focus',  desc: '+8% Critical Chance', stats: { crit: 8 } },
        { id: 'ei3', name: 'Glacier Heart', desc: '+30 Health',          stats: { hp: 30 } },
      ]},
      { name: 'Lightning', nodes: [
        { id: 'el1', name: 'Static Charge', desc: 'Magic Bolt pierces one enemy', stats: {}, flag: 'bolt_pierce' },
        { id: 'el2', name: 'Storm Speed',   desc: '+8% Movement Speed', stats: { speed: 8 } },
        { id: 'el3', name: 'Thunder God',   desc: '+15% Spell Power',   stats: { splP: 15 } },
      ]},
    ]},
    summoner: { branches: [
      { name: 'Minions', nodes: [
        { id: 'sm1', name: 'Bright Wisp',     desc: '+20% Companion Damage', stats: { pet: 20 } },
        { id: 'sm2', name: 'Eager Servant',   desc: 'Companion attacks 25% faster', stats: {}, flag: 'swift_pet' },
        { id: 'sm3', name: 'Greater Binding', desc: '+30% Companion Damage', stats: { pet: 30 } },
      ]},
      { name: 'Command Magic', nodes: [
        { id: 'sc1', name: 'Twin Focus',   desc: '+12% Spell Power',       stats: { splP: 12 } },
        { id: 'sc2', name: 'Quick Sigils', desc: '+8% Cooldown Reduction', stats: { cdr: 8 } },
        { id: 'sc3', name: 'Overlord',     desc: '+15% Boss Damage',       stats: { boss: 15 } },
      ]},
      { name: 'Support Magic', nodes: [
        { id: 'sp1', name: 'Warding Light', desc: '+25 Health', stats: { hp: 25 } },
        { id: 'sp2', name: 'Soothing Hum',  desc: '+6 Armor',   stats: { armor: 6 } },
        { id: 'sp3', name: 'Guardian Pact', desc: '+35 Health', stats: { hp: 35 } },
      ]},
    ]},
  },
};

/* ---------- ENEMIES ----------
   spr = atlas key prefix (idle anim). Behaviors (AI in game.js):
   'blob' hop-lunges · 'chase' melee pursuit · 'ranged' kites & shoots
   'charger' telegraphed dash · 'turret' stationary caster
   Base stats scale with zone ilvl via scaleStats() in game.js. */
const ENEMY_TYPES = {
  // — Brightwood Forest —
  slime:      { name: 'Forest Slime',   spr: 'swampy_idle_anim',     scale: 2.6, r: 13,
                hp: 26, dmg: 8,  xp: 12, behavior: 'blob',    speed: 55 },
  goblin:     { name: 'Goblin Scout',   spr: 'goblin_idle_anim',     scale: 2.6, r: 12,
                hp: 38, dmg: 11, xp: 18, behavior: 'chase',   speed: 105 },
  bandit:     { name: 'Bandit',         spr: 'masked_orc_idle_anim', scale: 2.6, r: 13,
                hp: 55, dmg: 14, xp: 26, behavior: 'charger', speed: 90, dashSpeed: 340 },
  // — Goblin Hollow —
  gob_archer: { name: 'Goblin Archer',  spr: 'gob_archer',           scale: 2.6, r: 12,
                hp: 30, dmg: 10, xp: 20, behavior: 'ranged',  speed: 85, range: 240, shootCd: 2.1, projSpeed: 260 },
  gob_brute:  { name: 'Goblin Brute',   spr: 'orc_warrior_idle_anim',scale: 2.6, r: 14,
                hp: 75, dmg: 16, xp: 32, behavior: 'chase',   speed: 80 },
  // — Crystaldeep Mines —
  crystal_slime: { name: 'Crystal Slime', spr: 'crystal_slime',      scale: 2.6, r: 13,
                hp: 45, dmg: 12, xp: 24, behavior: 'blob',    speed: 60 },
  frost_bones:{ name: 'Dusty Bones',    spr: 'frost_bones',          scale: 2.6, r: 12,
                hp: 50, dmg: 13, xp: 26, behavior: 'chase',   speed: 95 },
  deep_orc:   { name: 'Deep Orc',       spr: 'orc_shaman_idle_anim', scale: 2.6, r: 13,
                hp: 44, dmg: 12, xp: 26, behavior: 'ranged',  speed: 80, range: 250, shootCd: 2.4, projSpeed: 240 },
  // — Moonlit Marsh —
  bog_shambler:{ name: 'Bog Shambler',  spr: 'bog_shambler',         scale: 2.6, r: 13,
                hp: 70, dmg: 15, xp: 30, behavior: 'chase',   speed: 70 },
  marsh_witch:{ name: 'Marsh Witch',    spr: 'necromancer_idle_anim',scale: 2.6, r: 13,
                hp: 48, dmg: 14, xp: 32, behavior: 'turret',  range: 280, shootCd: 2.2, projSpeed: 220 },
  mud_sprite: { name: 'Mud Sprite',     spr: 'muddy_idle_anim',      scale: 2.6, r: 12,
                hp: 40, dmg: 11, xp: 22, behavior: 'blob',    speed: 65 },
  // — Skyguard Keep —
  keep_raider:{ name: 'Keep Raider',    spr: 'masked_orc_idle_anim', scale: 2.6, r: 13,
                hp: 80, dmg: 17, xp: 38, behavior: 'charger', speed: 95, dashSpeed: 360 },
  keep_knight:{ name: 'Rogue Knight',   spr: 'knight_f_idle_anim',   scale: 2.6, r: 13,
                hp: 95, dmg: 18, xp: 42, behavior: 'chase',   speed: 90 },
  storm_adept:{ name: 'Storm Adept',    spr: 'wizzard_f_idle_anim',  scale: 2.6, r: 12,
                hp: 55, dmg: 16, xp: 40, behavior: 'ranged',  speed: 85, range: 270, shootCd: 2.0, projSpeed: 280 },
  // — Emberfall Ruins —
  ember_imp:  { name: 'Ember Imp',      spr: 'imp_idle_anim',        scale: 2.6, r: 11,
                hp: 55, dmg: 16, xp: 40, behavior: 'ranged',  speed: 110, range: 200, shootCd: 1.8, projSpeed: 260 },
  ember_hound:{ name: 'Ash Hound',      spr: 'ember_hound',          scale: 2.6, r: 12,
                hp: 75, dmg: 18, xp: 44, behavior: 'charger', speed: 110, dashSpeed: 400 },
  flame_squire:{ name: 'Flame Squire',  spr: 'flame_knight',         scale: 2.6, r: 13,
                hp: 110, dmg: 20, xp: 50, behavior: 'chase',  speed: 85 },
  // — Blackstone Battlefield —
  fallen_soldier:{ name: 'Fallen Soldier', spr: 'skelet_idle_anim',  scale: 2.6, r: 12,
                hp: 85, dmg: 19, xp: 48, behavior: 'chase',   speed: 100 },
  spectral_knight:{ name: 'Spectral Knight', spr: 'spectral_knight', scale: 2.6, r: 13,
                hp: 100, dmg: 21, xp: 55, behavior: 'charger', speed: 95, dashSpeed: 380 },
  dark_herald:{ name: 'Dark Herald',    spr: 'necromancer_idle_anim',scale: 2.6, r: 13,
                hp: 70, dmg: 20, xp: 55, behavior: 'turret',  range: 300, shootCd: 2.0, projSpeed: 240 },
  // — Dragonspire Peak —
  wyrmling:   { name: 'Wyrmling',       spr: 'wyrmling',             scale: 2.6, r: 12,
                hp: 90, dmg: 22, xp: 60, behavior: 'chase',   speed: 120 },
  cultist:    { name: 'Dragon Cultist', spr: 'cultist',              scale: 2.6, r: 13,
                hp: 80, dmg: 22, xp: 62, behavior: 'ranged',  speed: 90, range: 280, shootCd: 1.9, projSpeed: 280 },
  peak_ogre:  { name: 'Peak Ogre',      spr: 'ogre_idle_anim',       scale: 2.4, r: 20,
                hp: 200, dmg: 26, xp: 90, behavior: 'chase',  speed: 65 },
};

/* ---------- BOSSES ----------
   Attack patterns live in BOSS_AI (game.js). hp/dmg scale with ilvl. */
const BOSS_TYPES = {
  bandit_captain: { name: 'Bandit Captain', title: 'Elite',  spr: 'masked_orc_idle_anim', scale: 4, r: 20,
                    hp: 380, dmg: 16, xp: 140, ai: 'captain' },
  gearmaster:     { name: 'Goblin Gearmaster', title: 'Boss', spr: 'ogre_idle_anim',      scale: 3.4, r: 26,
                    hp: 900, dmg: 18, xp: 300, ai: 'gearmaster' },
  burrower:       { name: 'Crystal Burrower', title: 'Boss',  spr: 'crystal_slime',       scale: 4.5, r: 26,
                    hp: 1300, dmg: 20, xp: 420, ai: 'burrower' },
  mossback:       { name: 'Mossback Guardian', title: 'Boss', spr: 'big_zombie_idle_anim',scale: 3.2, r: 30,
                    hp: 1900, dmg: 24, xp: 560, ai: 'mossback' },
  stormwing:      { name: 'Stormwing Wyvern', title: 'Boss',  spr: 'wyvern',              scale: 3.2, r: 30,
                    hp: 2500, dmg: 26, xp: 720, ai: 'stormwing' },
  flame_knight:   { name: 'The Flame Knight', title: 'Elite', spr: 'flame_knight',        scale: 4, r: 20,
                    hp: 2400, dmg: 30, xp: 800, ai: 'flameknight' },
  death_knight:   { name: 'The Death Knight', title: 'Boss',  spr: 'death_knight',        scale: 4.2, r: 22,
                    hp: 4200, dmg: 32, xp: 1200, ai: 'deathknight' },
  high_priest:    { name: 'Cultist High Priest', title: 'Elite', spr: 'cultist',          scale: 4, r: 20,
                    hp: 3800, dmg: 34, xp: 1000, ai: 'priest' },
  ancient_dragon: { name: 'The Ancient Dragon', title: 'Final Boss', spr: 'big_demon_idle_anim', scale: 4.5, r: 42,
                    hp: 8000, dmg: 38, xp: 3000, ai: 'dragon' },
};

/* ---------- ZONES ----------
   EDIT HERE to add zones. kind: 'town' | 'gen' (procedural).
   theme tints reuse the stone tileset per-biome.
   gen: rooms count / room size range / map size. */
const ZONES = [
  { id: 'village', name: 'Brightwood Village', ilvl: 1, kind: 'town',
    desc: 'Safe town — shop, quests & rest.' },
  { id: 'forest', name: 'Brightwood Forest', ilvl: 1, kind: 'gen',
    desc: 'Slimes and goblin scouts in the green.',
    theme: { tint: 'rgba(60,160,70,0.28)', wallTint: 'rgba(40,120,60,0.30)', deco: ['crate', 'flask_big_green'] },
    gen: { w: 46, h: 40, rooms: 9, rmin: 6, rmax: 11, seed: 101 },
    enemies: [['slime', 5], ['goblin', 4], ['bandit', 2]], count: 16,
    boss: 'bandit_captain',
    quest: { name: 'Green Menace', desc: 'Defeat the Bandit Captain in Brightwood Forest.', gold: 60 } },
  { id: 'hollow', name: 'Goblin Hollow', ilvl: 3, kind: 'gen',
    desc: 'The goblins\' tunnel warren. Something big is in charge.',
    theme: { tint: 'rgba(150,120,40,0.22)', wallTint: 'rgba(120,90,30,0.25)', deco: ['crate', 'skull'] },
    gen: { w: 50, h: 44, rooms: 11, rmin: 5, rmax: 10, seed: 202 },
    enemies: [['goblin', 4], ['gob_archer', 4], ['gob_brute', 2], ['slime', 2]], count: 20,
    boss: 'gearmaster',
    quest: { name: 'The Gearmaster', desc: 'Defeat the Goblin Gearmaster and restore the 1st seal.', gold: 120, seal: 1 } },
  { id: 'mines', name: 'Crystaldeep Mines', ilvl: 6, kind: 'gen',
    desc: 'Glittering tunnels. The walls hum — and burrow.',
    theme: { tint: 'rgba(70,140,220,0.24)', wallTint: 'rgba(50,90,180,0.28)', deco: ['crate', 'flask_big_blue'] },
    gen: { w: 54, h: 46, rooms: 12, rmin: 5, rmax: 9, seed: 303 },
    enemies: [['crystal_slime', 4], ['frost_bones', 4], ['deep_orc', 3]], count: 22,
    boss: 'burrower',
    quest: { name: 'What Lies Beneath', desc: 'Slay the Crystal Burrower and restore the 2nd seal.', gold: 200, seal: 2 } },
  { id: 'marsh', name: 'Moonlit Marsh', ilvl: 9, kind: 'gen',
    desc: 'Poison pools and hidden paths under a pale moon.',
    theme: { tint: 'rgba(60,110,90,0.34)', wallTint: 'rgba(30,70,60,0.38)', deco: ['flask_big_green', 'skull'], dark: 0.25 },
    gen: { w: 56, h: 48, rooms: 12, rmin: 6, rmax: 11, seed: 404 },
    enemies: [['bog_shambler', 4], ['marsh_witch', 3], ['mud_sprite', 4]], count: 24,
    boss: 'mossback',
    quest: { name: 'The Sleeping Grove', desc: 'Calm the Mossback Guardian and restore the 3rd seal.', gold: 300, seal: 3 } },
  { id: 'keep', name: 'Skyguard Keep', ilvl: 12, kind: 'gen',
    desc: 'A fortress in the clouds, overrun by raiders and worse.',
    theme: { tint: 'rgba(140,150,200,0.18)', wallTint: 'rgba(90,100,160,0.22)', deco: ['wall_banner_blue', 'crate'] },
    gen: { w: 56, h: 48, rooms: 13, rmin: 6, rmax: 10, seed: 505 },
    enemies: [['keep_raider', 4], ['keep_knight', 3], ['storm_adept', 3]], count: 24,
    boss: 'stormwing',
    quest: { name: 'Lord of the Ramparts', desc: 'Ground the Stormwing Wyvern and restore the 4th seal.', gold: 420, seal: 4 } },
  { id: 'ruins', name: 'Emberfall Ruins', ilvl: 15, kind: 'gen',
    desc: 'The old dragon temple. The embers never went out.',
    theme: { tint: 'rgba(220,110,40,0.22)', wallTint: 'rgba(180,70,30,0.26)', deco: ['skull', 'wall_banner_red'], dark: 0.15 },
    gen: { w: 56, h: 48, rooms: 13, rmin: 5, rmax: 10, seed: 606 },
    enemies: [['ember_imp', 4], ['ember_hound', 3], ['flame_squire', 3]], count: 26,
    boss: 'flame_knight',
    quest: { name: 'Trial of Embers', desc: 'Defeat the Flame Knight, keeper of the temple relic.', gold: 550 } },
  { id: 'battlefield', name: 'Blackstone Battlefield', ilvl: 18, kind: 'gen',
    desc: 'Where the old war ended. A fallen guardian waits.',
    theme: { tint: 'rgba(110,110,130,0.30)', wallTint: 'rgba(60,60,80,0.40)', deco: ['skull', 'wall_banner_red'], dark: 0.3 },
    gen: { w: 58, h: 50, rooms: 13, rmin: 6, rmax: 11, seed: 707 },
    enemies: [['fallen_soldier', 4], ['spectral_knight', 3], ['dark_herald', 3]], count: 26,
    boss: 'death_knight',
    quest: { name: 'The Fallen Guardian', desc: 'Face the Death Knight and restore the 5th seal.', gold: 800, seal: 5 } },
  { id: 'peak', name: 'Dragonspire Peak', ilvl: 22, kind: 'gen',
    desc: 'The final climb. Cultists sing the dragon awake.',
    theme: { tint: 'rgba(180,90,160,0.18)', wallTint: 'rgba(120,50,110,0.24)', deco: ['skull', 'crate'], dark: 0.2 },
    gen: { w: 58, h: 50, rooms: 14, rmin: 5, rmax: 10, seed: 808 },
    enemies: [['wyrmling', 4], ['cultist', 4], ['peak_ogre', 2]], count: 28,
    boss: 'high_priest',
    quest: { name: 'Silence the Choir', desc: 'Defeat the Cultist High Priest at the summit.', gold: 1000 } },
  { id: 'heart', name: "Dragon's Heart", ilvl: 26, kind: 'gen',
    desc: 'The Ancient Dragon stirs. Restore the last seal — or else.',
    theme: { tint: 'rgba(220,60,60,0.22)', wallTint: 'rgba(160,40,40,0.30)', deco: ['skull', 'wall_banner_red'], dark: 0.2 },
    gen: { w: 44, h: 40, rooms: 7, rmin: 8, rmax: 13, seed: 909 },
    enemies: [['wyrmling', 4], ['cultist', 4]], count: 14,
    boss: 'ancient_dragon',
    quest: { name: 'The Last Seal', desc: 'Defeat the Ancient Dragon and save Aldervale.', gold: 2000, seal: 6 } },
];

/* ---------- SHOP ---------- */
const SHOP = {
  potionPrice: 30,
  itemPriceBase: 70,  // + itemLevel * 18
  rerollPrice: 20,
};

/* ---------- MISC TUNING ---------- */
const TUNE = {
  maxLevel: 30,
  xpBase: 42, xpPow: 1.42,
  dropChance: 0.24,      // item drop chance per kill
  potionDrop: 0.08,
  chestPerZone: 3,
  respawnOnEnter: true,  // zones repopulate when you re-enter
};
