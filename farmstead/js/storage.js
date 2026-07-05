/* ============================================================
   storage.js — Saving and loading with LocalStorage.
   The whole game state is one JSON object under a single key,
   which makes export/import trivial.
   ============================================================ */

const SAVE_KEY = "homestead-hollow-save-v2"; // v2: 10x10 grid, seasons

// How many tiles are unlocked, given how many expansions were bought.
function unlockedSizeFor(expansions) {
  if (expansions <= 0) return START_SIZE;
  const tier = Math.min(expansions, EXPANSIONS.length);
  return EXPANSIONS[tier - 1].size;
}

// Set each tile's locked/unlocked status based on expansions bought.
// Locked tiles form centered rings around the unlocked square.
function applyLocks(state) {
  const size = unlockedSizeFor(state.expansions);
  const offset = (GRID_SIZE - size) / 2;

  state.tiles.forEach((tile, index) => {
    const row = Math.floor(index / GRID_SIZE);
    const col = index % GRID_SIZE;
    const inside =
      row >= offset && row < GRID_SIZE - offset &&
      col >= offset && col < GRID_SIZE - offset;

    if (inside && tile.type === "locked") tile.type = "empty";
    if (!inside) tile.type = "locked";
  });
}

// Build a brand-new game state.
// `carryOver` is used by the Seasons system to keep lifetime progress.
function newGameState(carryOver) {
  const tiles = [];
  for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
    tiles.push({ type: "empty", cropId: null, plantedAt: null, decorId: null });
  }

  const state = {
    farmName: "My Homestead",
    coins: STARTING_COINS,
    xp: 0,
    harvested: 0,        // lifetime — survives seasons
    cropCounts: {},      // lifetime per-crop harvest counts (the almanac)
    expansions: 0,       // 0 = 6x6, 1 = 8x8, 2 = 10x10
    seasonStars: 0,      // permanent +10% sell value each
    tiles: tiles,
    achievements: [],
    sound: true,
    lastGiftDay: null,   // for the once-a-day gift
    lastPlayed: Date.now()
  };

  // Seasons keep the cozy, permanent things.
  if (carryOver) {
    state.farmName = carryOver.farmName;
    state.sound = carryOver.sound;
    state.achievements = carryOver.achievements;
    state.seasonStars = carryOver.seasonStars;
    state.harvested = carryOver.harvested;
    state.cropCounts = carryOver.cropCounts;
    state.lastGiftDay = carryOver.lastGiftDay;
  }

  applyLocks(state);
  return state;
}

// Save the current state to LocalStorage.
function saveGame(state) {
  state.lastPlayed = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.error("Save failed:", err);
    return false;
  }
}

// Load the saved state, or return null if there isn't one / it's broken.
function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw);
    if (!validSave(state)) return null;
    return state;
  } catch (err) {
    console.error("Load failed:", err);
    return null;
  }
}

// Shared sanity check for loads and imports.
function validSave(state) {
  if (!state || !Array.isArray(state.tiles)) return false;
  if (state.tiles.length !== GRID_SIZE * GRID_SIZE) return false;
  if (typeof state.coins !== "number" || typeof state.xp !== "number") return false;
  // Older saves might be missing newer fields — patch them in gently.
  if (typeof state.expansions !== "number") state.expansions = 0;
  if (typeof state.seasonStars !== "number") state.seasonStars = 0;
  if (!state.cropCounts) state.cropCounts = {};
  if (!Array.isArray(state.achievements)) state.achievements = [];
  return true;
}

// Wipe the save entirely.
function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}

// Export: download the save as a JSON file.
function exportSave(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "homestead-hollow-save.json";
  link.click();
  URL.revokeObjectURL(url);
}

// Import: parse pasted JSON text. Returns the state or null if invalid.
function importSave(jsonText) {
  try {
    const state = JSON.parse(jsonText);
    return validSave(state) ? state : null;
  } catch (err) {
    return null;
  }
}
