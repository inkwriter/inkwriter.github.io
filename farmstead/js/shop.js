/* ============================================================
   shop.js — The shop sidebar with two tabs: Seeds and Decorations.

   How selection works:
   - Picking a SEED sets state.selectedCrop and switches to Plant.
   - Picking a DECORATION sets pendingDecoration; the next click on
     an empty tile places (and pays for) it.
   ============================================================ */

let activeShopTab = "seeds";      // "seeds" or "decor"
let pendingDecoration = null;     // decoration id waiting to be placed

// Draw the whole shop panel for the active tab.
function renderShop() {
  const list = document.getElementById("shop-list");
  list.innerHTML = "";

  // Highlight the active tab button.
  document.querySelectorAll(".shop-tab").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === activeShopTab);
  });

  if (activeShopTab === "seeds") {
    CROPS.forEach(crop => list.appendChild(buildSeedCard(crop)));
  } else {
    DECORATIONS.forEach(decor => list.appendChild(buildDecorCard(decor)));
    list.appendChild(buildExpansionCard());
    list.appendChild(buildSeasonCard());
  }
}

// One card in the seed shop. Shows the lifetime harvest count — a tiny
// almanac that makes long-term play visible ("You've grown 214 wheat!").
function buildSeedCard(crop) {
  const playerLevel = levelFromXp(state.xp).level;
  const locked = playerLevel < crop.unlockLevel;
  const grown = state.cropCounts[crop.id] || 0;

  const card = document.createElement("button");
  card.className = "shop-card" +
    (locked ? " locked" : "") +
    (state.selectedCrop === crop.id ? " selected" : "");

  card.innerHTML =
    "<span class='shop-icon'>" + crop.icon + "</span>" +
    "<span class='shop-info'>" +
      "<span class='shop-name'>" + crop.name +
        (locked ? " <small>(Lv " + crop.unlockLevel + ")</small>" : "") + "</span>" +
      "<span class='shop-desc'>" + crop.description + "</span>" +
      "<span class='shop-stats'>Seed " + crop.seedCost + " 🪙 · Sells " +
        crop.sellValue + " 🪙 · " + formatTime(crop.growTime) +
        (grown > 0 ? " · Grown " + grown : "") + "</span>" +
    "</span>";

  card.addEventListener("click", () => {
    if (locked) {
      showToast(crop.name + " unlocks at level " + crop.unlockLevel + ".");
      return;
    }
    state.selectedCrop = crop.id;
    pendingDecoration = null;
    setTool("plant");
    renderShop();
    showToast(crop.name + " selected — click empty soil to plant.");
    saveGame(state);
  });

  return card;
}

// One card in the decoration shop.
function buildDecorCard(decor) {
  const playerLevel = levelFromXp(state.xp).level;
  const locked = playerLevel < decor.unlockLevel;

  const card = document.createElement("button");
  card.className = "shop-card" +
    (locked ? " locked" : "") +
    (pendingDecoration === decor.id ? " selected" : "");

  card.innerHTML =
    "<span class='shop-icon'>" + decor.icon + "</span>" +
    "<span class='shop-info'>" +
      "<span class='shop-name'>" + decor.name +
        (locked ? " <small>(Lv " + decor.unlockLevel + ")</small>" : "") + "</span>" +
      "<span class='shop-desc'>" + decor.description + "</span>" +
      "<span class='shop-stats'>" + decor.cost + " 🪙</span>" +
    "</span>";

  card.addEventListener("click", () => {
    if (locked) {
      showToast(decor.name + " unlocks at level " + decor.unlockLevel + ".");
      return;
    }
    pendingDecoration = decor.id;
    setTool("plant"); // reuse the plant tool's click for placement
    renderShop();
    showToast(decor.name + " selected — click empty soil to place it.");
  });

  return card;
}

// Special card: the next land expansion tier (or a "fully grown" note).
function buildExpansionCard() {
  const maxed = state.expansions >= EXPANSIONS.length;
  const next = maxed ? null : EXPANSIONS[state.expansions];

  const card = document.createElement("button");
  card.className = "shop-card expansion" + (maxed ? " locked" : "");
  card.innerHTML =
    "<span class='shop-icon'>🗺️</span>" +
    "<span class='shop-info'>" +
      "<span class='shop-name'>" + (maxed ? "Land Expansion" : next.name) + "</span>" +
      "<span class='shop-desc'>" +
        (maxed ? "Purchased — every last tile is yours!"
               : "Grow your farm to " + next.size + "×" + next.size + ".") + "</span>" +
      "<span class='shop-stats'>" + (maxed ? "Complete ✓" : next.cost + " 🪙") + "</span>" +
    "</span>";
  card.addEventListener("click", buyExpansion);
  return card;
}

// Special card: start a New Season (the prestige / replay loop).
function buildSeasonCard() {
  const playerLevel = levelFromXp(state.xp).level;
  const ready = playerLevel >= SEASON_MIN_LEVEL;

  const card = document.createElement("button");
  card.className = "shop-card season" + (ready ? "" : " locked");
  card.innerHTML =
    "<span class='shop-icon'>🌸</span>" +
    "<span class='shop-info'>" +
      "<span class='shop-name'>New Season" +
        (ready ? "" : " <small>(Lv " + SEASON_MIN_LEVEL + ")</small>") + "</span>" +
      "<span class='shop-desc'>Retire this farm and earn a permanent 🌟 Heirloom Star " +
        "(+" + STAR_SELL_BONUS + "% sell value, forever). Badges and your almanac carry over.</span>" +
      "<span class='shop-stats'>Stars earned: " + state.seasonStars + " 🌟</span>" +
    "</span>";
  card.addEventListener("click", startNewSeason);
  return card;
}

// Called from farm.js when the Plant tool clicks an empty tile and a
// decoration is pending. Returns true if the click was "consumed".
function tryPlacePendingDecoration(index) {
  if (!pendingDecoration) return false;
  const placed = placeDecoration(index, pendingDecoration);
  if (placed) {
    pendingDecoration = null;
    renderShop();
  }
  return true; // consume the click either way (error toast already shown)
}

// Switch tabs.
function setShopTab(tab) {
  activeShopTab = tab;
  renderShop();
}
