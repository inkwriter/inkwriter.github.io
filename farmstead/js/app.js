/* ============================================================
   app.js — Startup and glue code.
   Loads (or creates) the save, wires up all the buttons,
   runs the once-per-second game tick, and handles the HUD,
   toasts, sound, day/night sky, seasons, the daily gift,
   and achievements.
   ============================================================ */

// The single global game state (created or loaded on startup).
let state = null;

// ---- Toast messages ----------------------------------------------------

let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 3000);
}

// ---- HUD (coins, level, XP bar, stars, bonuses, harvest count) --------------

function updateHUD() {
  const lv = levelFromXp(state.xp);

  document.getElementById("hud-coins").textContent = state.coins;
  document.getElementById("hud-level").textContent = lv.level;
  document.getElementById("hud-harvested").textContent = state.harvested;

  // XP bar shows progress within the current level.
  document.getElementById("hud-xp-text").textContent = lv.into + " / " + lv.needed + " XP";
  document.getElementById("hud-xp-fill").style.width = (lv.into / lv.needed * 100) + "%";

  // Heirloom Stars (hidden until the first season is complete).
  const starsEl = document.getElementById("hud-stars");
  starsEl.hidden = state.seasonStars === 0;
  starsEl.textContent = "🌟 ×" + state.seasonStars;
  starsEl.title = "Heirloom Stars: +" + (state.seasonStars * STAR_SELL_BONUS) +
    "% sell value, permanent";

  // Decoration bonuses.
  const bonuses = farmBonuses();
  const bonusEl = document.getElementById("hud-bonuses");
  if (bonuses.sell === 0 && bonuses.xp === 0 && bonuses.stars === 0) {
    bonusEl.hidden = true;
  } else {
    bonusEl.hidden = false;
    bonusEl.textContent = "✨ +" + (bonuses.sell + bonuses.stars) + "% coins · +" +
      bonuses.xp + "% XP";
    bonusEl.title = "From decorations (capped at +" + BONUS_CAP +
      "% each) and Heirloom Stars";
  }
}

// ---- Tools ------------------------------------------------------------------

function setTool(tool) {
  state.tool = tool;
  movingFromIndex = null; // cancel any half-finished move
  document.querySelectorAll(".tool-btn[data-tool]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tool === tool);
  });
  document.getElementById("tool-label").textContent =
    { plant: "Plant 🌱", harvest: "Harvest 🧺", move: "Move ↔️", delete: "Delete 🗑️" }[tool];
}

// ---- Sound (tiny synthesized blips — no audio files needed) ------------------

let audioCtx = null;
function playSound(kind) {
  if (!state.sound) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;

    // Each sound is 1–3 short sine notes.
    const notes = {
      plant:   [[440, 0.00, 0.08]],
      harvest: [[523, 0.00, 0.08], [659, 0.09, 0.10]],
      levelup: [[523, 0.00, 0.10], [659, 0.11, 0.10], [784, 0.22, 0.16]]
    }[kind] || [];

    notes.forEach(([freq, delay, length]) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.12, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + length);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + length + 0.05);
    });
  } catch (err) {
    // Audio is a nice-to-have; never let it break the game.
  }
}

function toggleSound() {
  state.sound = !state.sound;
  document.getElementById("sound-btn").textContent = state.sound ? "🔊" : "🔇";
  showToast(state.sound ? "Sound on" : "Sound off");
  saveGame(state);
}

// ---- Achievements --------------------------------------------------------------

function checkAchievements() {
  ACHIEVEMENTS.forEach(a => {
    if (!state.achievements.includes(a.id) && a.check(state)) {
      state.achievements.push(a.id);
      showToast(a.icon + " Achievement unlocked: " + a.name + "!");
      playSound("levelup");
      renderAchievements();
    }
  });
}

function renderAchievements() {
  const row = document.getElementById("achievements");
  row.innerHTML = "";
  ACHIEVEMENTS.forEach(a => {
    const earned = state.achievements.includes(a.id);
    const badge = document.createElement("span");
    badge.className = "badge" + (earned ? " earned" : "");
    badge.textContent = a.icon;
    badge.title = a.name + " — " + a.description + (earned ? " ✓" : "");
    row.appendChild(badge);
  });
}

// ---- Seasons (the replay loop) ----------------------------------------------------

function startNewSeason() {
  const lv = levelFromXp(state.xp).level;
  if (lv < SEASON_MIN_LEVEL) {
    showToast("New Seasons unlock at level " + SEASON_MIN_LEVEL + ".");
    return;
  }
  const ok = confirm(
    "Start a New Season?\n\n" +
    "Your farm, coins, XP, and expansions reset —\n" +
    "but you earn a permanent 🌟 Heirloom Star (+" + STAR_SELL_BONUS + "% sell value),\n" +
    "and your badges and crop almanac carry over."
  );
  if (!ok) return;

  // Carry the permanent things into a fresh farm.
  state = newGameState({
    farmName: state.farmName,
    sound: state.sound,
    achievements: state.achievements,
    seasonStars: state.seasonStars + 1,
    harvested: state.harvested,
    cropCounts: state.cropCounts,
    lastGiftDay: state.lastGiftDay
  });
  state.tool = "plant";
  state.selectedCrop = null;

  buildGrid();
  renderShop();
  renderAchievements();
  updateHUD();
  setTool("plant");
  playSound("levelup");
  checkAchievements(); // the Heirloom badge earns itself here
  saveGame(state);
  showToast("🌸 A new season begins! Heirloom Stars: " + state.seasonStars + " 🌟");
}

// ---- Daily gift ---------------------------------------------------------------------

function checkDailyGift() {
  const today = new Date().toDateString();
  if (state.lastGiftDay === today) return;

  state.lastGiftDay = today;
  const lv = levelFromXp(state.xp).level;
  const gift = DAILY_GIFT_BASE + lv * DAILY_GIFT_PER_LEVEL;
  state.coins += gift;
  saveGame(state);
  updateHUD();
  showToast("🎁 Daily gift: +" + gift + " 🪙 — welcome back to the farm!");
}

// ---- Day/night sky (cosmetic, based on the real clock) ---------------------------

function updateSky() {
  const hour = new Date().getHours();
  let phase = "day";
  if (hour >= 5 && hour < 8)        phase = "dawn";
  else if (hour >= 8 && hour < 17)  phase = "day";
  else if (hour >= 17 && hour < 20) phase = "dusk";
  else                              phase = "night";
  document.body.dataset.sky = phase;
}

// ---- Farm name --------------------------------------------------------------------

function editFarmName() {
  const name = prompt("Name your farm:", state.farmName);
  if (name && name.trim()) {
    state.farmName = name.trim().slice(0, 30);
    document.getElementById("farm-name").textContent = state.farmName;
    saveGame(state);
  }
}

// ---- Save / Reset buttons -----------------------------------------------------------

function onSaveClick() {
  if (saveGame(state)) showToast("Game saved. 💾");
  else showToast("Save failed — is LocalStorage available?");
}

function onResetClick() {
  if (!confirm("Reset EVERYTHING and start a new farm? This wipes stars, badges, " +
               "and the almanac too. It cannot be undone.")) return;
  clearSave();
  state = newGameState();
  state.tool = "plant";
  state.selectedCrop = null;
  buildGrid();
  renderShop();
  renderAchievements();
  updateHUD();
  setTool("plant");
  document.getElementById("farm-name").textContent = state.farmName;
  showToast("Fresh farm, fresh start! 🌄");
}

// ---- Export / Import dialog -----------------------------------------------
// window.prompt() truncates long text on some mobile browsers, and save
// JSON is long — so we use a real <dialog> with a textarea instead.

function openExportDialog() {
  const dialog = document.getElementById("save-dialog");
  document.getElementById("dialog-title").textContent = "📤 Export save";
  document.getElementById("dialog-hint").textContent =
    "Copy this JSON somewhere safe, or download it as a file.";
  document.getElementById("dialog-text").value = JSON.stringify(state);

  // Show export buttons, hide import buttons.
  document.getElementById("dialog-copy").hidden = false;
  document.getElementById("dialog-download").hidden = false;
  document.getElementById("dialog-file-btn").hidden = true;
  document.getElementById("dialog-import").hidden = true;

  dialog.showModal();
}

function openImportDialog() {
  const dialog = document.getElementById("save-dialog");
  document.getElementById("dialog-title").textContent = "📥 Import save";
  document.getElementById("dialog-hint").textContent =
    "Paste your save JSON below, or load the downloaded file.";
  document.getElementById("dialog-text").value = "";

  document.getElementById("dialog-copy").hidden = true;
  document.getElementById("dialog-download").hidden = true;
  document.getElementById("dialog-file-btn").hidden = false;
  document.getElementById("dialog-import").hidden = false;

  dialog.showModal();
}

function onDialogCopy() {
  const text = document.getElementById("dialog-text").value;
  // Modern clipboard API with a select-the-text fallback.
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => showToast("Save copied to clipboard. 📋"))
      .catch(() => showToast("Copy failed — select the text and copy manually."));
  } else {
    document.getElementById("dialog-text").select();
    showToast("Press Ctrl+C (or Cmd+C) to copy.");
  }
}

function onDialogFilePicked(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    document.getElementById("dialog-text").value = reader.result;
    showToast("File loaded — press Import to apply it.");
  };
  reader.readAsText(file);
  event.target.value = ""; // allow re-picking the same file
}

function onDialogImport() {
  const imported = importSave(document.getElementById("dialog-text").value);
  if (!imported) {
    showToast("That doesn't look like a valid save. ❌");
    return;
  }
  state = imported;
  if (!state.tool) state.tool = "plant";
  buildGrid();
  renderShop();
  renderAchievements();
  updateHUD();
  setTool(state.tool);
  document.getElementById("farm-name").textContent = state.farmName;
  saveGame(state);
  document.getElementById("save-dialog").close();
  showToast("Save imported — welcome back! 📥");
}

// ---- Welcome-back message (offline progress summary) ---------------------------------

function offlineWelcome() {
  const away = Date.now() - (state.lastPlayed || Date.now());
  if (away < 60000) return; // less than a minute — skip the message

  const readyCount = state.tiles.filter(
    t => t.type === "crop" && growthProgress(t) >= 1
  ).length;

  if (readyCount > 0) {
    showToast("Welcome back! " + readyCount + " crop" +
      (readyCount === 1 ? " is" : "s are") + " ready to harvest. 🧺");
  }
}

// ---- Startup ------------------------------------------------------------------------

function init() {
  // Load the save, or start a new game.
  state = loadGame() || newGameState();
  if (!state.tool) state.tool = "plant";
  if (!("selectedCrop" in state)) state.selectedCrop = null;

  // Header bits.
  document.getElementById("farm-name").textContent = state.farmName;
  document.getElementById("weather").textContent =
    WEATHER_LINES[Math.floor(Math.random() * WEATHER_LINES.length)];
  document.getElementById("sound-btn").textContent = state.sound ? "🔊" : "🔇";

  // Build the UI.
  buildGrid();
  renderShop();
  renderAchievements();
  updateHUD();
  setTool(state.tool);
  updateSky();
  offlineWelcome();
  checkDailyGift();

  // Wire up buttons.
  document.getElementById("farm-name").addEventListener("click", editFarmName);
  document.getElementById("sound-btn").addEventListener("click", toggleSound);
  document.getElementById("save-btn").addEventListener("click", onSaveClick);
  document.getElementById("reset-btn").addEventListener("click", onResetClick);
  document.getElementById("export-btn").addEventListener("click", openExportDialog);
  document.getElementById("import-btn").addEventListener("click", openImportDialog);
  document.getElementById("harvest-all-btn").addEventListener("click", harvestAll);

  // Export/import dialog buttons.
  document.getElementById("dialog-copy").addEventListener("click", onDialogCopy);
  document.getElementById("dialog-download").addEventListener("click", () => {
    exportSave(state);
    showToast("Save downloaded as JSON. 📤");
  });
  document.getElementById("dialog-file-btn").addEventListener("click",
    () => document.getElementById("dialog-file").click());
  document.getElementById("dialog-file").addEventListener("change", onDialogFilePicked);
  document.getElementById("dialog-import").addEventListener("click", onDialogImport);
  document.getElementById("dialog-close").addEventListener("click",
    () => document.getElementById("save-dialog").close());

  document.querySelectorAll(".tool-btn[data-tool]").forEach(btn => {
    btn.addEventListener("click", () => setTool(btn.dataset.tool));
  });
  document.querySelectorAll(".shop-tab").forEach(btn => {
    btn.addEventListener("click", () => setShopTab(btn.dataset.tab));
  });

  // The game tick: update growing crops once per second,
  // refresh the sky once per minute, autosave once per minute.
  setInterval(tickCrops, 1000);
  setInterval(updateSky, 60000);
  setInterval(() => saveGame(state), 60000);

  // Save when the tab is closed or hidden.
  window.addEventListener("beforeunload", () => saveGame(state));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) saveGame(state);
  });
}

document.addEventListener("DOMContentLoaded", init);
