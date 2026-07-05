/* ============================================================
   farm.js — Everything about the farm grid:
   building it, drawing it, and handling tile clicks for the
   Plant / Harvest / Move / Delete tools.

   Crops grow on REAL time. We only store plantedAt (a timestamp),
   so "how grown is this crop?" is always computed from the clock.
   That's what makes offline growth work for free.
   ============================================================ */

// The tile currently "picked up" by the Move tool (index or null).
let movingFromIndex = null;

// ---- Helpers ---------------------------------------------------------

function getCrop(id)  { return CROPS.find(c => c.id === id); }
function getDecor(id) { return DECORATIONS.find(d => d.id === id); }

// Growth progress from 0 to 1 for a planted tile.
function growthProgress(tile) {
  const crop = getCrop(tile.cropId);
  if (!crop) return 0;
  const elapsed = (Date.now() - tile.plantedAt) / 1000; // seconds
  return Math.min(elapsed / crop.growTime, 1);
}

// Seconds remaining until a crop is ready (0 if ready).
function secondsRemaining(tile) {
  const crop = getCrop(tile.cropId);
  const elapsed = (Date.now() - tile.plantedAt) / 1000;
  return Math.max(Math.ceil(crop.growTime - elapsed), 0);
}

// Format seconds as "1h 2m", "3m 20s", or "45s".
function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return h + "h " + m + "m";
  if (m > 0) return m + "m " + s + "s";
  return s + "s";
}

// ---- Farm-wide bonuses -----------------------------------------------

// Add up decoration effects (capped) plus permanent Heirloom Stars.
// Returns percentages: { sell, xp, stars }.
function farmBonuses() {
  let sell = 0, xp = 0;
  state.tiles.forEach(tile => {
    if (tile.type !== "decor") return;
    const decor = getDecor(tile.decorId);
    if (!decor || !decor.effect) return;
    if (decor.effect.type === "sell") sell += decor.effect.pct;
    if (decor.effect.type === "xp")   xp   += decor.effect.pct;
  });
  return {
    sell: Math.min(sell, BONUS_CAP),
    xp: Math.min(xp, BONUS_CAP),
    stars: state.seasonStars * STAR_SELL_BONUS
  };
}

// ---- Building the grid ------------------------------------------------

// Create one <button> per tile, once, at startup.
function buildGrid() {
  const grid = document.getElementById("farm-grid");
  grid.innerHTML = "";
  grid.style.setProperty("--grid-size", GRID_SIZE);

  state.tiles.forEach((tile, index) => {
    const el = document.createElement("button");
    el.className = "tile";
    el.dataset.index = index;
    el.addEventListener("click", () => onTileClick(index));
    grid.appendChild(el);
  });

  renderAllTiles();
}

// ---- Drawing tiles ------------------------------------------------------

// Redraw every tile (used at startup and after big changes).
function renderAllTiles() {
  state.tiles.forEach((_, index) => renderTile(index));
}

// Redraw a single tile based on its state.
function renderTile(index) {
  const tile = state.tiles[index];
  const el = document.querySelector('.tile[data-index="' + index + '"]');
  if (!el) return;

  el.className = "tile"; // reset classes
  el.innerHTML = "";
  el.title = "";
  el.dataset.stage = "";

  if (tile.type === "locked") {
    el.classList.add("locked");
    el.innerHTML = "<span class='tile-icon'>🔒</span>";
    el.title = "Locked — buy a Land Expansion in the shop";

  } else if (tile.type === "empty") {
    el.classList.add("empty");
    el.title = "Empty soil";

  } else if (tile.type === "decor") {
    const decor = getDecor(tile.decorId);
    el.classList.add("decor");
    el.innerHTML = "<span class='tile-icon'>" + decor.icon + "</span>";
    el.title = decor.name + (decor.effect
      ? " (+" + decor.effect.pct + "% " + (decor.effect.type === "sell" ? "coins" : "XP") + ")"
      : "");
    if (movingFromIndex === index) el.classList.add("moving");

  } else if (tile.type === "crop") {
    const crop = getCrop(tile.cropId);
    const progress = growthProgress(tile);
    const stage = cropStage(progress);
    el.dataset.stage = stage;

    if (stage === "ready") {
      // Fully grown — show the crop, glowing and ready.
      el.classList.add("crop", "ready");
      el.innerHTML = "<span class='tile-icon'>" + crop.icon + "</span>";
      el.title = crop.name + " — ready to harvest!";
    } else {
      // Still growing — sprout first, then a young plant.
      el.classList.add("crop", "growing");
      const stageIcon = stage === "sprout" ? "🌱" : "🌿";
      el.innerHTML =
        "<span class='tile-icon'>" + stageIcon + "</span>" +
        "<span class='tile-timer'>" + formatTime(secondsRemaining(tile)) + "</span>" +
        "<span class='tile-bar'><span class='tile-bar-fill' style='width:" +
        Math.round(progress * 100) + "%'></span></span>";
      el.title = crop.name + " — " + Math.round(progress * 100) + "% grown";
    }
  }
}

// Which visual stage a crop is in, based on progress 0..1.
function cropStage(progress) {
  if (progress >= 1) return "ready";
  return progress < 0.5 ? "sprout" : "young";
}

// Called once per second by app.js. To avoid restarting CSS animations
// and rebuilding DOM every second, we only do a FULL redraw when a crop
// changes stage (sprout → young → ready). Otherwise we just update the
// timer text and progress bar in place.
function tickCrops() {
  state.tiles.forEach((tile, index) => {
    if (tile.type !== "crop") return;
    const el = document.querySelector('.tile[data-index="' + index + '"]');
    if (!el) return;

    const progress = growthProgress(tile);
    const stage = cropStage(progress);

    if (el.dataset.stage !== stage) {
      renderTile(index); // stage changed — rebuild the tile
      return;
    }
    if (stage !== "ready") {
      // Same stage, still growing — cheap in-place update.
      const timer = el.querySelector(".tile-timer");
      const bar = el.querySelector(".tile-bar-fill");
      if (timer) timer.textContent = formatTime(secondsRemaining(tile));
      if (bar) bar.style.width = Math.round(progress * 100) + "%";
    }
  });
}

// ---- Tile interaction ----------------------------------------------------

function onTileClick(index) {
  const tile = state.tiles[index];

  if (tile.type === "locked") {
    showToast("That land is locked. Buy a Land Expansion in the shop! 🔒");
    return;
  }

  switch (state.tool) {
    case "plant":   handlePlantClick(index, tile);   break;
    case "harvest": handleHarvestClick(index, tile); break;
    case "move":    handleMoveClick(index, tile);    break;
    case "delete":  handleDeleteClick(index, tile);  break;
  }
}

// PLANT: put the selected seed on an empty tile.
// (Clicking a ready crop with the Plant tool also harvests it,
// which saves a lot of tool switching.)
function handlePlantClick(index, tile) {
  if (tile.type === "crop" && growthProgress(tile) >= 1) {
    harvestTile(index, tile);
    updateHUD();
    saveGame(state);
    return;
  }
  // If a decoration is selected in the shop, this click places it instead.
  if (tile.type === "empty" && typeof tryPlacePendingDecoration === "function") {
    if (tryPlacePendingDecoration(index)) return;
  }
  if (tile.type !== "empty") {
    showToast("You can only plant on empty soil.");
    return;
  }

  const crop = getCrop(state.selectedCrop);
  if (!crop) {
    showToast("Pick a seed from the shop first. 🌱");
    return;
  }
  if (levelFromXp(state.xp).level < crop.unlockLevel) {
    showToast(crop.name + " unlocks at level " + crop.unlockLevel + ".");
    return;
  }
  if (state.coins < crop.seedCost) {
    showToast("Not enough coins for " + crop.name + " (" + crop.seedCost + " 🪙).");
    return;
  }

  state.coins -= crop.seedCost;
  tile.type = "crop";
  tile.cropId = crop.id;
  tile.plantedAt = Date.now();

  playSound("plant");
  renderTile(index);
  updateHUD();
  saveGame(state);
}

// HARVEST: collect a fully grown crop.
function handleHarvestClick(index, tile) {
  if (tile.type !== "crop") {
    showToast("Nothing to harvest here.");
    return;
  }
  if (growthProgress(tile) < 1) {
    showToast("Still growing — " + formatTime(secondsRemaining(tile)) + " to go.");
    return;
  }
  harvestTile(index, tile);
  updateHUD();
  saveGame(state);
}

// The actual harvest: pay out coins + XP (with bonuses), clear the tile.
// Returns { coins, xp } actually gained so Harvest All can total them up.
// quiet = true skips the per-crop toast/sound; level-ups always announce.
function harvestTile(index, tile, quiet = false) {
  const crop = getCrop(tile.cropId);
  const bonuses = farmBonuses();

  // Heirloom Stars and "sell" decorations boost coins;
  // "xp" decorations boost XP. Rounded so numbers stay tidy.
  const coinsGained = Math.round(crop.sellValue * (1 + (bonuses.sell + bonuses.stars) / 100));
  const xpGained    = Math.round(crop.xp        * (1 + bonuses.xp / 100));

  const levelBefore = levelFromXp(state.xp).level;

  state.coins += coinsGained;
  state.xp += xpGained;
  state.harvested += 1;
  state.cropCounts[crop.id] = (state.cropCounts[crop.id] || 0) + 1;

  const levelAfter = levelFromXp(state.xp).level;
  if (levelAfter > levelBefore) {
    playSound("levelup");
    showToast("🎉 Level up! You reached level " + levelAfter + "!");
    renderShop(); // new crops/decorations may have unlocked
  } else if (!quiet) {
    playSound("harvest");
    showToast("Harvested " + crop.name + " " + crop.icon + " +" + coinsGained + " 🪙");
  }

  tile.type = "empty";
  tile.cropId = null;
  tile.plantedAt = null;

  renderTile(index);
  checkAchievements();
  return { coins: coinsGained, xp: xpGained };
}

// Harvest every ready crop at once, with a single summary toast.
function harvestAll() {
  let count = 0, coinsGained = 0, xpGained = 0;

  state.tiles.forEach((tile, index) => {
    if (tile.type === "crop" && growthProgress(tile) >= 1) {
      const gained = harvestTile(index, tile, true); // quiet
      coinsGained += gained.coins;
      xpGained += gained.xp;
      count++;
    }
  });

  if (count === 0) {
    showToast("No crops are ready yet.");
    return;
  }
  playSound("harvest");
  showToast("🧺 Harvested " + count + " crop" + (count === 1 ? "" : "s") +
    " for +" + coinsGained + " 🪙 and +" + xpGained + " XP");
  updateHUD();
  saveGame(state);
}

// MOVE: first click picks up a decoration, second click drops it.
function handleMoveClick(index, tile) {
  if (movingFromIndex === null) {
    if (tile.type !== "decor") {
      showToast("Pick up a decoration first (click one).");
      return;
    }
    movingFromIndex = index;
    renderTile(index);
    showToast("Picked up " + getDecor(tile.decorId).name + " — click an empty tile to place it.");
  } else {
    if (index === movingFromIndex) {
      // Clicking the same tile cancels the move.
      movingFromIndex = null;
      renderTile(index);
      showToast("Move cancelled.");
      return;
    }
    if (tile.type !== "empty") {
      showToast("You can only place it on empty soil.");
      return;
    }
    const from = state.tiles[movingFromIndex];
    tile.type = "decor";
    tile.decorId = from.decorId;
    from.type = "empty";
    from.decorId = null;

    const fromIndex = movingFromIndex;
    movingFromIndex = null;
    renderTile(fromIndex);
    renderTile(index);
    saveGame(state);
  }
}

// DELETE: remove a decoration, or dig up a planted crop (both with
// confirmation, neither with a refund). Digging up crops means a
// misplanted overnight Moonberry isn't a 16-hour mistake.
function handleDeleteClick(index, tile) {
  if (tile.type === "decor") {
    const decor = getDecor(tile.decorId);
    if (confirm("Remove this " + decor.name + "? (No refund)")) {
      tile.type = "empty";
      tile.decorId = null;
      renderTile(index);
      updateHUD(); // decoration bonuses may have changed
      saveGame(state);
      showToast(decor.name + " removed.");
    }
    return;
  }

  if (tile.type === "crop") {
    const crop = getCrop(tile.cropId);
    if (confirm("Dig up this " + crop.name + "? The seed is lost. (No refund)")) {
      tile.type = "empty";
      tile.cropId = null;
      tile.plantedAt = null;
      renderTile(index);
      saveGame(state);
      showToast(crop.name + " dug up. 🕳️");
    }
    return;
  }

  showToast("The delete tool removes decorations and planted crops.");
}

// ---- Placing decorations (called from shop.js) ----------------------------

function placeDecoration(index, decorId) {
  const tile = state.tiles[index];
  const decor = getDecor(decorId);

  if (tile.type !== "empty") {
    showToast("Decorations need an empty tile.");
    return false;
  }
  if (state.coins < decor.cost) {
    showToast("Not enough coins for " + decor.name + " (" + decor.cost + " 🪙).");
    return false;
  }

  state.coins -= decor.cost;
  tile.type = "decor";
  tile.decorId = decorId;

  playSound("plant");
  renderTile(index);
  updateHUD(); // decoration bonuses may have changed
  checkAchievements();
  saveGame(state);
  return true;
}

// ---- Expansion --------------------------------------------------------------

function buyExpansion() {
  if (state.expansions >= EXPANSIONS.length) {
    showToast("Your farm is already fully expanded!");
    return;
  }
  const next = EXPANSIONS[state.expansions];
  if (state.coins < next.cost) {
    showToast(next.name + " costs " + next.cost + " 🪙.");
    return;
  }
  state.coins -= next.cost;
  state.expansions += 1;
  applyLocks(state);

  playSound("levelup");
  showToast("🗺️ Your farm has grown to " + next.size + "×" + next.size + "!");
  renderAllTiles();
  renderShop();
  updateHUD();
  checkAchievements();
  saveGame(state);
}
