/* ============================================================
   data.js — All game content lives here.
   Want to add a crop, change a price, or tweak a grow time?
   This is the only file you need to touch.
   ============================================================ */

// ---- Grid settings --------------------------------------------------
// The farm is a 10x10 grid. The player starts with the inner 6x6
// unlocked and can buy two expansions: to 8x8, then to the full 10x10.
const GRID_SIZE = 10;
const START_SIZE = 6;
const EXPANSIONS = [
  { size: 8,  cost: 500,  name: "Land Expansion I"  },
  { size: 10, cost: 2500, name: "Land Expansion II" }
];

// ---- Player settings -------------------------------------------------
const STARTING_COINS = 50;

// XP needed to go from `level` to `level + 1`. The curve rises gently
// so early levels feel quick and later ones feel earned.
function xpNeededFor(level) {
  return 100 + (level - 1) * 50; // Lv1→2: 100, Lv2→3: 150, Lv3→4: 200...
}

// Turn total XP into { level, into, needed } for game logic and the HUD.
function levelFromXp(xp) {
  let level = 1;
  let remaining = xp;
  while (remaining >= xpNeededFor(level)) {
    remaining -= xpNeededFor(level);
    level++;
  }
  return { level: level, into: remaining, needed: xpNeededFor(level) };
}

// ---- Seasons (the replay loop) ----------------------------------------
// At SEASON_MIN_LEVEL the player can start a New Season: the farm resets,
// but they earn a permanent Heirloom Star. Each star boosts all future
// sell prices by STAR_SELL_BONUS percent — forever, across all seasons.
const SEASON_MIN_LEVEL = 10;
const STAR_SELL_BONUS = 10; // percent per star

// ---- Daily gift ----------------------------------------------------------
// A little present on the first visit of each calendar day.
const DAILY_GIFT_BASE = 25;      // coins
const DAILY_GIFT_PER_LEVEL = 5;  // + this many coins per player level

// ---- Decoration bonus caps -------------------------------------------------
// Decorations with effects add up farm-wide, but each bonus type is capped
// so the optimal farm still has room for crops (and pure whimsy).
const BONUS_CAP = 25; // max +25% coins and max +25% XP from decorations

// ---- Crops ------------------------------------------------------------------
// growTime is in SECONDS of real time. Crops keep growing while the
// browser is closed, because we save the planting timestamp.
const CROPS = [
  {
    id: "wheat", name: "Wheat", icon: "🌾",
    seedCost: 5, sellValue: 9, xp: 4, growTime: 60, unlockLevel: 1,
    description: "Fast and reliable. The backbone of every farm."
  },
  {
    id: "corn", name: "Corn", icon: "🌽",
    seedCost: 12, sellValue: 24, xp: 9, growTime: 180, unlockLevel: 1,
    description: "A little patience for a bigger payout."
  },
  {
    id: "carrot", name: "Carrots", icon: "🥕",
    seedCost: 20, sellValue: 44, xp: 16, growTime: 420, unlockLevel: 2,
    description: "Crunchy, orange, and worth the wait."
  },
  {
    id: "strawberry", name: "Strawberries", icon: "🍓",
    seedCost: 45, sellValue: 105, xp: 35, growTime: 1200, unlockLevel: 3,
    description: "Sweet berries that fetch a sweet price."
  },
  {
    id: "tomato", name: "Tomatoes", icon: "🍅",
    seedCost: 70, sellValue: 165, xp: 55, growTime: 2400, unlockLevel: 4,
    description: "Juicy, dependable, and always in demand."
  },
  {
    id: "pumpkin", name: "Pumpkins", icon: "🎃",
    seedCost: 90, sellValue: 230, xp: 75, growTime: 3600, unlockLevel: 5,
    description: "Slow-growing giants of the field."
  },
  {
    id: "sunflower", name: "Sunflowers", icon: "🌻",
    seedCost: 150, sellValue: 400, xp: 130, growTime: 7200, unlockLevel: 6,
    description: "They follow the sun. Plant before lunch!"
  },
  {
    id: "grape", name: "Grapes", icon: "🍇",
    seedCost: 250, sellValue: 690, xp: 210, growTime: 14400, unlockLevel: 7,
    description: "Fine vines take a fine while."
  },
  {
    id: "watermelon", name: "Watermelons", icon: "🍉",
    seedCost: 400, sellValue: 1150, xp: 340, growTime: 28800, unlockLevel: 8,
    description: "An all-day grower with a picnic-sized payoff."
  },
  {
    id: "moonberry", name: "Moonberries", icon: "🫐",
    seedCost: 800, sellValue: 2600, xp: 700, growTime: 57600, unlockLevel: 10,
    description: "Legend says they only ripen under moonlight. Plant at dusk, harvest at dawn."
  }
];

// ---- Decorations ---------------------------------------------------------------
// Some decorations now have gentle farm-wide effects:
//   { type: "sell", pct: 2 }  → all crops sell for +2% coins
//   { type: "xp",   pct: 2 }  → all harvests give +2% XP
// Effects stack across placed decorations, capped at BONUS_CAP per type.
// effect: null means purely cosmetic — whimsy is allowed.
const DECORATIONS = [
  { id: "fence",     name: "Fence",          icon: "🚧", cost: 15,  unlockLevel: 1,  effect: null,                       description: "Keeps nothing out, looks great." },
  { id: "flowerbed", name: "Flower Bed",     icon: "🌷", cost: 25,  unlockLevel: 1,  effect: { type: "xp",   pct: 1 },   description: "A splash of color. Gardening is learning! (+1% XP)" },
  { id: "haybale",   name: "Hay Bale",       icon: "🌾", cost: 30,  unlockLevel: 2,  effect: null,                       description: "Rustic. Round. Rollable (in spirit)." },
  { id: "scarecrow", name: "Scarecrow",      icon: "🎭", cost: 60,  unlockLevel: 3,  effect: { type: "xp",   pct: 2 },   description: "Stands guard so you can focus. (+2% XP)" },
  { id: "tree",      name: "Tree",           icon: "🌳", cost: 80,  unlockLevel: 3,  effect: { type: "sell", pct: 1 },   description: "Shade improves everyone's mood. (+1% coins)" },
  { id: "mushroom",  name: "Mushroom Patch", icon: "🍄", cost: 120, unlockLevel: 4,  effect: { type: "xp",   pct: 1 },   description: "Something small and secret. (+1% XP)" },
  { id: "well",      name: "Well",           icon: "⛲", cost: 150, unlockLevel: 4,  effect: { type: "sell", pct: 2 },   description: "Fresh water, fresher produce. (+2% coins)" },
  { id: "windmill",  name: "Windmill",       icon: "🌀", cost: 250, unlockLevel: 5,  effect: { type: "sell", pct: 3 },   description: "Mills grain into extra profit. (+3% coins)" },
  { id: "pond",      name: "Lily Pond",      icon: "🪷", cost: 300, unlockLevel: 6,  effect: { type: "xp",   pct: 3 },   description: "A peaceful place to think. (+3% XP)" },
  { id: "lantern",   name: "Lantern",        icon: "🏮", cost: 350, unlockLevel: 7,  effect: { type: "sell", pct: 2 },   description: "Evening markets pay better. (+2% coins)" },
  { id: "statue",    name: "Harvest Statue", icon: "🗿", cost: 600, unlockLevel: 9,  effect: { type: "sell", pct: 4 },   description: "A monument to good soil. (+4% coins)" }
];

// ---- Achievements ------------------------------------------------------------------
// check(state) returns true when the achievement is earned.
// Harvest counts and crop counts are LIFETIME totals — they survive seasons.
const ACHIEVEMENTS = [
  { id: "first-harvest", name: "First Harvest",     icon: "🥇", check: s => s.harvested >= 1,    description: "Harvest your first crop." },
  { id: "green-thumb",   name: "Green Thumb",       icon: "🖐️", check: s => s.harvested >= 25,   description: "Harvest 25 crops." },
  { id: "crop-baron",    name: "Crop Baron",        icon: "🎩", check: s => s.harvested >= 100,  description: "Harvest 100 crops." },
  { id: "legend",        name: "Legendary Farmer",  icon: "🏆", check: s => s.harvested >= 500,  description: "Harvest 500 crops (lifetime)." },
  { id: "nest-egg",      name: "Nest Egg",          icon: "🪙", check: s => s.coins >= 500,      description: "Hold 500 coins at once." },
  { id: "level-five",    name: "Seasoned Farmer",   icon: "⭐", check: s => levelFromXp(s.xp).level >= 5,  description: "Reach level 5." },
  { id: "level-ten",     name: "Master of the Hollow", icon: "👑", check: s => levelFromXp(s.xp).level >= 10, description: "Reach level 10." },
  { id: "landowner",     name: "Landowner",         icon: "🗺️", check: s => s.expansions >= 1,   description: "Expand your farm once." },
  { id: "estate",        name: "The Whole Estate",  icon: "🏞️", check: s => s.expansions >= 2,   description: "Unlock every last tile." },
  { id: "decorator",     name: "Decorator",         icon: "🎀", check: s => s.tiles.filter(t => t.type === "decor").length >= 8, description: "Have 8 decorations placed at once." },
  { id: "heirloom",      name: "Heirloom",          icon: "🌟", check: s => s.seasonStars >= 1,  description: "Complete a season and earn your first star." },
  { id: "dynasty",       name: "Dynasty",           icon: "✨", check: s => s.seasonStars >= 3,  description: "Earn three Heirloom Stars." },
  { id: "moonlit",       name: "Moonlit Harvest",   icon: "🌙", check: s => (s.cropCounts.moonberry || 0) >= 1, description: "Harvest a Moonberry." }
];

// ---- Fun, no-effect weather lines shown in the header ---------------------------------
const WEATHER_LINES = [
  "☀️ Clear skies over the farm",
  "🌤️ A few lazy clouds drifting by",
  "🌦️ Light drizzle — the crops love it",
  "🌬️ A gentle breeze through the fields",
  "🌈 A rainbow after morning rain",
  "🌫️ Misty morning on the homestead",
  "🐦 Birdsong from the old tree line",
  "🍂 Leaves skittering across the lane"
];
