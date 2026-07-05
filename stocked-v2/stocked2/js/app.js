/* ============================================================
   Stocked — app.js
   All app logic lives here. Vanilla JS, no build step.
   Data flow: Google Sheet <-> Apps Script web app <-> fetch()
   ============================================================ */

"use strict";

/* ------------------------------------------------------------
   1. DEMO DATA — used when CONFIG.DEMO_MODE is true
   ------------------------------------------------------------ */

const DEMO = {
  inventory: [
    { itemId: "ITM-0001", itemName: "Onion, yellow", category: "Produce", location: "Pantry", quantity: 1, unit: "count", minQuantity: "", expirationDate: "", storeSection: "Produce", staple: false, defaultLocation: "Pantry", notes: "", lastUpdated: "2026-06-10", status: "active" },
    { itemId: "ITM-0002", itemName: "Chicken breast", category: "Meat", location: "Freezer", quantity: 2, unit: "lb", minQuantity: "", expirationDate: "2026-08-01", storeSection: "Meat", staple: false, defaultLocation: "Freezer", notes: "Costco pack", lastUpdated: "2026-06-08", status: "active" },
    { itemId: "ITM-0003", itemName: "Heavy cream", category: "Dairy", location: "Fridge", quantity: 0, unit: "pint", minQuantity: "", expirationDate: "", storeSection: "Dairy", staple: false, defaultLocation: "Fridge", notes: "", lastUpdated: "2026-06-05", status: "active" },
    { itemId: "ITM-0004", itemName: "Toilet paper", category: "Paper Goods", location: "Bathroom Closet", quantity: 8, unit: "roll", minQuantity: 12, expirationDate: "", storeSection: "Paper Goods", staple: true, defaultLocation: "Bathroom Closet", notes: "Mega rolls", lastUpdated: "2026-06-09", status: "active" },
    { itemId: "ITM-0005", itemName: "Laundry detergent", category: "Cleaning", location: "Laundry Room", quantity: 1, unit: "bottle", minQuantity: 1, expirationDate: "", storeSection: "Cleaning", staple: true, defaultLocation: "Laundry Room", notes: "Free & clear", lastUpdated: "2026-06-01", status: "active" },
    { itemId: "ITM-0006", itemName: "Toothpaste", category: "Toiletries", location: "Bathroom Closet", quantity: 1, unit: "tube", minQuantity: 2, expirationDate: "", storeSection: "Toiletries", staple: true, defaultLocation: "Bathroom Closet", notes: "", lastUpdated: "2026-05-28", status: "active" },
    { itemId: "ITM-0007", itemName: "Cumin, ground", category: "Spices", location: "Spice Rack", quantity: 1, unit: "jar", minQuantity: "", expirationDate: "2027-01-01", storeSection: "Spices", staple: false, defaultLocation: "Spice Rack", notes: "", lastUpdated: "2026-04-12", status: "active" },
    { itemId: "ITM-0008", itemName: "Spinach, fresh", category: "Produce", location: "Fridge", quantity: 1, unit: "bag", minQuantity: "", expirationDate: "2026-06-13", storeSection: "Produce", staple: false, defaultLocation: "Fridge", notes: "", lastUpdated: "2026-06-09", status: "active" },
    { itemId: "ITM-0009", itemName: "AA batteries", category: "Household", location: "Garage", quantity: 6, unit: "count", minQuantity: 4, expirationDate: "", storeSection: "Household", staple: true, defaultLocation: "Garage", notes: "", lastUpdated: "2026-03-30", status: "active" },
    { itemId: "ITM-0010", itemName: "Pasta, fettuccine", category: "Dry Goods", location: "Pantry", quantity: 2, unit: "box", minQuantity: "", expirationDate: "", storeSection: "Dry Goods", staple: false, defaultLocation: "Pantry", notes: "", lastUpdated: "2026-05-20", status: "active" },
  ],
  locations: [
    { locationId: "LOC-001", locationName: "Fridge", zone: "Kitchen", sortOrder: 1, status: "active" },
    { locationId: "LOC-002", locationName: "Freezer", zone: "Kitchen", sortOrder: 2, status: "active" },
    { locationId: "LOC-003", locationName: "Pantry", zone: "Kitchen", sortOrder: 3, status: "active" },
    { locationId: "LOC-004", locationName: "Kitchen Cabinets", zone: "Kitchen", sortOrder: 4, status: "active" },
    { locationId: "LOC-005", locationName: "Spice Rack", zone: "Kitchen", sortOrder: 5, status: "active" },
    { locationId: "LOC-006", locationName: "Bathroom Closet", zone: "Bathroom", sortOrder: 6, status: "active" },
    { locationId: "LOC-007", locationName: "Laundry Room", zone: "Utility", sortOrder: 7, status: "active" },
    { locationId: "LOC-008", locationName: "Garage", zone: "Storage", sortOrder: 8, status: "active" },
  ],
  categories: [
    { categoryId: "CAT-001", categoryName: "Produce", type: "food", defaultStoreSection: "Produce", status: "active" },
    { categoryId: "CAT-002", categoryName: "Meat", type: "food", defaultStoreSection: "Meat", status: "active" },
    { categoryId: "CAT-003", categoryName: "Dairy", type: "food", defaultStoreSection: "Dairy", status: "active" },
    { categoryId: "CAT-004", categoryName: "Dry Goods", type: "food", defaultStoreSection: "Dry Goods", status: "active" },
    { categoryId: "CAT-005", categoryName: "Spices", type: "food", defaultStoreSection: "Spices", status: "active" },
    { categoryId: "CAT-006", categoryName: "Paper Goods", type: "household", defaultStoreSection: "Paper Goods", status: "active" },
    { categoryId: "CAT-007", categoryName: "Toiletries", type: "household", defaultStoreSection: "Toiletries", status: "active" },
    { categoryId: "CAT-008", categoryName: "Cleaning", type: "household", defaultStoreSection: "Cleaning", status: "active" },
    { categoryId: "CAT-009", categoryName: "Household", type: "household", defaultStoreSection: "Household", status: "active" },
  ],
  recipes: [
    { recipeId: "RCP-0001", recipeName: "Tacos", description: "Weeknight ground beef tacos", servings: 4, mealType: "dinner", tags: "quick, kid-friendly", instructions: "Brown beef with seasoning; warm tortillas; assemble.", notes: "", timesCooked: 12, status: "active" },
    { recipeId: "RCP-0002", recipeName: "Chili", description: "Slow cooker chili", servings: 6, mealType: "dinner", tags: "crockpot, freezes-well", instructions: "Saute onions, brown beef, dump everything in the crock pot on low 6 hrs.", notes: "Double it for the freezer", timesCooked: 5, status: "active" },
    { recipeId: "RCP-0003", recipeName: "Chicken Alfredo", description: "Creamy pasta night", servings: 4, mealType: "dinner", tags: "comfort", instructions: "Boil pasta; pan-sear chicken; make cream sauce; combine.", notes: "", timesCooked: 3, status: "active" },
  ],
  recipeIngredients: [
    { recipeId: "RCP-0001", ingredientName: "Onion", linkedItemId: "ITM-0001", quantity: 1, unit: "count", optional: false, substitutionNotes: "", storeSection: "" },
    { recipeId: "RCP-0001", ingredientName: "Ground beef", linkedItemId: "", quantity: 1, unit: "lb", optional: false, substitutionNotes: "Ground turkey works", storeSection: "Meat" },
    { recipeId: "RCP-0001", ingredientName: "Tortillas", linkedItemId: "", quantity: 1, unit: "pack", optional: false, substitutionNotes: "", storeSection: "Dry Goods" },
    { recipeId: "RCP-0001", ingredientName: "Cilantro", linkedItemId: "", quantity: 1, unit: "bunch", optional: true, substitutionNotes: "", storeSection: "Produce" },
    { recipeId: "RCP-0002", ingredientName: "Onion", linkedItemId: "ITM-0001", quantity: 2, unit: "count", optional: false, substitutionNotes: "", storeSection: "" },
    { recipeId: "RCP-0002", ingredientName: "Ground beef", linkedItemId: "", quantity: 2, unit: "lb", optional: false, substitutionNotes: "", storeSection: "Meat" },
    { recipeId: "RCP-0002", ingredientName: "Cumin", linkedItemId: "ITM-0007", quantity: 1, unit: "tbsp", optional: false, substitutionNotes: "", storeSection: "" },
    { recipeId: "RCP-0002", ingredientName: "Canned tomatoes", linkedItemId: "", quantity: 2, unit: "can", optional: false, substitutionNotes: "", storeSection: "Canned" },
    { recipeId: "RCP-0003", ingredientName: "Chicken breast", linkedItemId: "ITM-0002", quantity: 2, unit: "lb", optional: false, substitutionNotes: "Thighs OK", storeSection: "" },
    { recipeId: "RCP-0003", ingredientName: "Heavy cream", linkedItemId: "ITM-0003", quantity: 1, unit: "pint", optional: false, substitutionNotes: "Half-and-half in a pinch", storeSection: "" },
    { recipeId: "RCP-0003", ingredientName: "Fettuccine", linkedItemId: "ITM-0010", quantity: 1, unit: "box", optional: false, substitutionNotes: "", storeSection: "" },
    { recipeId: "RCP-0003", ingredientName: "Parmesan", linkedItemId: "", quantity: 1, unit: "wedge", optional: true, substitutionNotes: "", storeSection: "Dairy" },
  ],
  shoppingList: [],
  mealPlan: [
    { weekOf: "2026-06-15", day: "Monday", mealSlot: "Dinner", recipeId: "RCP-0001", notes: "", status: "active" },
    { weekOf: "2026-06-15", day: "Tuesday", mealSlot: "Dinner", recipeId: "RCP-0003", notes: "", status: "active" },
    { weekOf: "2026-06-15", day: "Wednesday", mealSlot: "Dinner", recipeId: "RCP-0002", notes: "", status: "active" },
  ],
  settings: { expiring_soon_days: "5", store_sections: "Produce,Meat,Dairy,Frozen,Canned,Dry Goods,Spices,Paper Goods,Toiletries,Cleaning,Household,Pharmacy,Other", api_token: "change-me", next_item_id: "11", next_line_id: "1" },
};

/* ------------------------------------------------------------
   2. STATE
   ------------------------------------------------------------ */

const state = {
  data: null,                 // { inventory, locations, categories, recipes, recipeIngredients, shoppingList, mealPlan, settings }
  mealWeekStart: "",
  view: "inventory",
  locationFilter: "all",
  search: "",
  lowOnly: false,
  selectedRecipes: new Set(),
  loading: false,
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const todayISO = () => new Date().toISOString().slice(0, 10);
const localISO = (date) => {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};
const startOfWeekISO = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay(); // Sunday 0, Monday 1
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return localISO(d);
};
const addDaysISO = (iso, days) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return localISO(d);
};
const norm = (s) => String(s ?? "").trim().toLowerCase();

/* ------------------------------------------------------------
   3. API LAYER
   In demo mode, mutations run against the in-memory DEMO object.
   In live mode, GET fetches everything; POST sends one action.
   POST uses Content-Type text/plain to avoid a CORS preflight
   (the standard Apps Script web-app pattern).
   ------------------------------------------------------------ */

async function apiGetAll() {
  if (CONFIG.DEMO_MODE) {
    return structuredClone(DEMO);
  }
  const url = `${CONFIG.SCRIPT_URL}?action=getAll&token=${encodeURIComponent(CONFIG.API_TOKEN)}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json;
}

async function apiPost(action, payload) {
  if (CONFIG.DEMO_MODE) {
    return demoMutate(action, payload);
  }
  const res = await fetch(CONFIG.SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ token: CONFIG.API_TOKEN, action, payload }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json;
}

/* Demo-mode mutation handlers mirror the Apps Script actions. */
function demoMutate(action, p) {
  const d = DEMO;
  const nextId = (key, prefix, pad) => {
    const n = parseInt(d.settings[key] || "1", 10);
    d.settings[key] = String(n + 1);
    return `${prefix}-${String(n).padStart(pad, "0")}`;
  };
  switch (action) {
    case "addItem": {
      const item = { ...p, itemId: nextId("next_item_id", "ITM", 4), lastUpdated: todayISO(), status: "active" };
      d.inventory.push(item);
      return { ok: true, item };
    }
    case "updateItem": {
      const it = d.inventory.find((i) => i.itemId === p.itemId);
      if (!it) return { error: "Item not found" };
      Object.assign(it, p.fields, { lastUpdated: todayISO() });
      return { ok: true };
    }
    case "addRecipe": {
      const id = `RCP-${String(d.recipes.length + 1).padStart(4, "0")}`;
      d.recipes.push({ ...p.recipe, recipeId: id, timesCooked: 0, status: "active" });
      p.ingredients.forEach((ing) => d.recipeIngredients.push({ ...ing, recipeId: id }));
      return { ok: true, recipeId: id };
    }
    case "updateRecipe": {
      const r = d.recipes.find((x) => x.recipeId === p.recipeId);
      if (!r) return { error: "Recipe not found" };
      Object.assign(r, p.recipe);
      d.recipeIngredients = d.recipeIngredients.filter((ri) => ri.recipeId !== p.recipeId);
      p.ingredients.forEach((ing) => d.recipeIngredients.push({ ...ing, recipeId: p.recipeId }));
      return { ok: true };
    }
    case "addLines": {
      p.lines.forEach((line) => {
        d.shoppingList.push({ ...line, lineId: nextId("next_line_id", "SL", 4), dateAdded: todayISO(), status: "needed" });
      });
      return { ok: true };
    }
    case "updateLine": {
      const l = d.shoppingList.find((x) => x.lineId === p.lineId);
      if (!l) return { error: "Line not found" };
      Object.assign(l, p.fields);
      return { ok: true };
    }
    case "markPurchased": {
      const l = d.shoppingList.find((x) => x.lineId === p.lineId);
      if (!l) return { error: "Line not found" };
      l.status = "purchased";
      if (p.inventoryDelta) {
        const it = d.inventory.find((i) => i.itemId === p.inventoryDelta.itemId);
        if (it) {
          it.quantity = Number(it.quantity || 0) + Number(p.inventoryDelta.qty || 0);
          it.lastUpdated = todayISO();
        }
      }
      return { ok: true };
    }
    case "cookRecipe": {
      p.deductions.forEach((ded) => {
        const it = d.inventory.find((i) => i.itemId === ded.itemId);
        if (it) {
          it.quantity = Math.max(0, Number(it.quantity || 0) - Number(ded.qty || 0));
          it.lastUpdated = todayISO();
        }
      });
      const r = d.recipes.find((x) => x.recipeId === p.recipeId);
      if (r) r.timesCooked = Number(r.timesCooked || 0) + 1;
      return { ok: true };
    }
    case "saveMealPlan": {
      d.mealPlan = d.mealPlan.filter((m) => !(m.weekOf === p.weekOf && m.mealSlot === "Dinner"));
      (p.entries || []).forEach((entry) => d.mealPlan.push({ ...entry, weekOf: p.weekOf, mealSlot: "Dinner", status: "active" }));
      return { ok: true };
    }
    case "clearDone": {
      d.shoppingList = d.shoppingList.filter((l) => l.status === "needed");
      return { ok: true };
    }
    default:
      return { error: `Unknown action: ${action}` };
  }
}

/* ------------------------------------------------------------
   4. CORE LOGIC — the comparison engine
   ------------------------------------------------------------ */

/** Matching key: linked item ID wins; otherwise normalized name + unit. */
function ingredientKey(ing) {
  return ing.linkedItemId ? `id:${ing.linkedItemId}` : `nm:${norm(ing.ingredientName)}|${norm(ing.unit)}`;
}

/**
 * Compare selected recipes against inventory.
 * Returns { need, partial, have, optional } arrays of aggregate objects:
 * { name, unit, totalNeeded, haveQty, buyQty, recipes[], linkedItemId,
 *   storeSection, category, unlinked, unitMismatch, subNotes }
 */
function compareRecipesToInventory(recipeIds, includeOptional) {
  const d = state.data;
  const agg = new Map();
  const recipeCounts = recipeIds.reduce((acc, id) => {
    if (id) acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {});

  for (const ing of d.recipeIngredients) {
    const multiplier = recipeCounts[ing.recipeId] || 0;
    if (!multiplier) continue;
    const isOptional = ing.optional === true || ing.optional === "TRUE";
    if (isOptional && !includeOptional) {
      // still surface optional ingredients informationally
    }
    const key = ingredientKey(ing) + (isOptional ? "|opt" : "");
    const recipe = d.recipes.find((r) => r.recipeId === ing.recipeId);
    const baseRecipeName = recipe ? recipe.recipeName : ing.recipeId;
    const recipeName = multiplier > 1 ? `${baseRecipeName} x${multiplier}` : baseRecipeName;

    if (!agg.has(key)) {
      const linked = ing.linkedItemId ? d.inventory.find((i) => i.itemId === ing.linkedItemId) : null;
      agg.set(key, {
        name: linked ? linked.itemName : ing.ingredientName,
        unit: ing.unit,
        totalNeeded: 0,
        recipes: [],
        linkedItemId: ing.linkedItemId || "",
        linked,
        isOptional,
        unlinked: !ing.linkedItemId,
        unitMismatch: linked ? norm(linked.unit) !== norm(ing.unit) : false,
        storeSection: linked ? linked.storeSection : (ing.storeSection || "Other"),
        category: linked ? linked.category : "",
        subNotes: ing.substitutionNotes || "",
      });
    }
    const a = agg.get(key);
    a.totalNeeded += Number(ing.quantity || 0) * multiplier;
    if (!a.recipes.includes(recipeName)) a.recipes.push(recipeName);
    if (ing.substitutionNotes && !a.subNotes.includes(ing.substitutionNotes)) {
      a.subNotes = a.subNotes ? `${a.subNotes}; ${ing.substitutionNotes}` : ing.substitutionNotes;
    }
  }

  const need = [], partial = [], have = [], optional = [];

  for (const a of agg.values()) {
    if (a.isOptional) {
      a.haveQty = a.linked && !a.unitMismatch ? Number(a.linked.quantity || 0) : null;
      a.buyQty = a.totalNeeded;
      if (includeOptional) {
        if (a.haveQty !== null && a.haveQty >= a.totalNeeded) have.push(a);
        else optional.push(a);
      } else {
        optional.push(a);
      }
      continue;
    }
    if (!a.linked || a.unitMismatch) {
      // can't compare — always buy the full amount, flag for a human check
      a.haveQty = null;
      a.buyQty = a.totalNeeded;
      need.push(a);
      continue;
    }
    const haveQty = Number(a.linked.quantity || 0);
    a.haveQty = haveQty;
    a.buyQty = Math.max(0, a.totalNeeded - haveQty);
    if (a.buyQty === 0) have.push(a);
    else if (haveQty > 0) partial.push(a);
    else need.push(a);
  }

  return { need, partial, have, optional };
}

/** Staples & threshold items below their minimum, not already on the list. */
function lowStockSuggestions() {
  const d = state.data;
  const onList = new Set(
    d.shoppingList.filter((l) => l.status === "needed").map((l) => l.linkedItemId).filter(Boolean)
  );
  return d.inventory.filter((it) => {
    if (it.status !== "active") return false;
    const min = Number(it.minQuantity);
    if (!min || isNaN(min)) return false;
    return Number(it.quantity || 0) < min && !onList.has(it.itemId);
  }).map((it) => ({
    item: it,
    buyQty: Number(it.minQuantity) - Number(it.quantity || 0),
  }));
}

function expiringSoon() {
  const days = Number(state.data.settings.expiring_soon_days || 5);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);
  const cutoffISO = cutoff.toISOString().slice(0, 10);
  return state.data.inventory.filter((it) =>
    it.status === "active" && it.expirationDate && Number(it.quantity) > 0 &&
    it.expirationDate <= cutoffISO
  );
}

/* ------------------------------------------------------------
   5. RENDERING
   ------------------------------------------------------------ */

function render() {
  renderBadge();
  if (state.view === "inventory") renderInventory();
  if (state.view === "recipes") renderRecipes();
  if (state.view === "mealplan") renderMealPlan();
  if (state.view === "shopping") renderShopping();
}

function renderBadge() {
  const n = state.data.shoppingList.filter((l) => l.status === "needed").length;
  const badge = $("#listBadge");
  badge.hidden = n === 0;
  badge.textContent = n;
}

/* ---------- Inventory ---------- */

function renderInventory() {
  const d = state.data;

  // location chips
  const chips = $("#locationChips");
  const active = d.inventory.filter((i) => i.status === "active");
  const counts = {};
  active.forEach((i) => { counts[i.location] = (counts[i.location] || 0) + 1; });
  const locs = d.locations.filter((l) => l.status === "active").sort((a, b) => a.sortOrder - b.sortOrder);
  chips.innerHTML =
    chipHTML("all", "All", active.length, state.locationFilter === "all") +
    locs.map((l) => chipHTML(l.locationName, l.locationName, counts[l.locationName] || 0, state.locationFilter === l.locationName)).join("");
  chips.querySelectorAll(".chip").forEach((c) =>
    c.addEventListener("click", () => { state.locationFilter = c.dataset.loc; renderInventory(); })
  );

  // banners
  const low = lowStockSuggestions();
  const lowBanner = $("#lowStockBanner");
  if (low.length) {
    lowBanner.hidden = false;
    lowBanner.innerHTML = `<strong>${low.length} staple${low.length > 1 ? "s" : ""} running low.</strong>
      ${esc(low.map((x) => x.item.itemName).join(", "))}
      <button class="btn btn-danger btn-sm" id="bannerAddLow">Add to list</button>`;
    $("#bannerAddLow").addEventListener("click", addLowStockToList);
  } else lowBanner.hidden = true;

  const exp = expiringSoon();
  const expBanner = $("#expiringBanner");
  if (exp.length) {
    expBanner.hidden = false;
    expBanner.innerHTML = `<strong>Use first:</strong> ${exp.map((i) => `${esc(i.itemName)} (${esc(i.expirationDate)})`).join(", ")}`;
  } else expBanner.hidden = true;

  // grouped item list
  let items = active;
  if (state.locationFilter !== "all") items = items.filter((i) => i.location === state.locationFilter);
  if (state.search) items = items.filter((i) => norm(i.itemName).includes(norm(state.search)) || norm(i.category).includes(norm(state.search)));
  if (state.lowOnly) items = items.filter((i) => Number(i.minQuantity) && Number(i.quantity || 0) < Number(i.minQuantity));

  const groups = $("#inventoryGroups");
  if (!items.length) {
    groups.innerHTML = `<div class="empty-state">Nothing here yet. Add your first item and it shows up under its location.</div>`;
    return;
  }

  const byLoc = {};
  items.forEach((i) => { (byLoc[i.location] = byLoc[i.location] || []).push(i); });
  const locOrder = locs.map((l) => l.locationName).filter((n) => byLoc[n]);
  Object.keys(byLoc).forEach((n) => { if (!locOrder.includes(n)) locOrder.push(n); });

  groups.innerHTML = locOrder.map((locName) => {
    const rows = byLoc[locName]
      .sort((a, b) => a.itemName.localeCompare(b.itemName))
      .map(itemRowHTML).join("");
    return `<div class="loc-group">
      <h3>${esc(locName)} <span class="loc-count">${byLoc[locName].length}</span></h3>
      <div class="item-card-list">${rows}</div>
    </div>`;
  }).join("");

  groups.querySelectorAll("[data-step]").forEach((b) =>
    b.addEventListener("click", () => stepQty(b.dataset.itemId, Number(b.dataset.step)))
  );
  groups.querySelectorAll(".item-edit").forEach((b) =>
    b.addEventListener("click", () => openItemModal(b.dataset.itemId))
  );
}

function chipHTML(loc, label, count, isActive) {
  return `<button class="chip ${isActive ? "active" : ""}" data-loc="${esc(loc)}">${esc(label)}<span class="chip-count">${count}</span></button>`;
}

function itemRowHTML(it) {
  const qty = Number(it.quantity || 0);
  const min = Number(it.minQuantity);
  const pills = [];
  if (qty === 0) pills.push(`<span class="pill pill-out">Out</span>`);
  else if (min && qty < min) pills.push(`<span class="pill pill-low">Low</span>`);
  if (it.staple === true || it.staple === "TRUE") pills.push(`<span class="pill pill-staple">Staple</span>`);
  if (it.expirationDate && expiringSoon().some((e) => e.itemId === it.itemId)) pills.push(`<span class="pill pill-expiring">Use first</span>`);

  const metaBits = [it.category];
  if (min) metaBits.push(`min ${min}`);
  if (it.expirationDate) metaBits.push(`exp ${it.expirationDate}`);
  if (it.notes) metaBits.push(it.notes);

  return `<div class="item-row">
    <div class="item-main">
      <div class="item-name">${esc(it.itemName)} ${pills.join(" ")}</div>
      <div class="item-meta">${esc(metaBits.filter(Boolean).join(" · "))}</div>
    </div>
    <div class="qty-stepper">
      <button data-step="-1" data-item-id="${it.itemId}" aria-label="Decrease ${esc(it.itemName)}">&minus;</button>
      <span class="qty-val">${qty}<small>${esc(it.unit)}</small></span>
      <button data-step="1" data-item-id="${it.itemId}" aria-label="Increase ${esc(it.itemName)}">+</button>
    </div>
    <button class="item-edit" data-item-id="${it.itemId}">Edit</button>
  </div>`;
}

/* ---------- Recipes ---------- */

function renderRecipes() {
  const d = state.data;
  const grid = $("#recipeGrid");
  const recipes = d.recipes.filter((r) => r.status === "active");

  if (!recipes.length) {
    grid.innerHTML = `<div class="empty-state">No recipes saved yet. Add one to start building lists.</div>`;
  } else {
    grid.innerHTML = recipes.map((r) => {
      const ings = d.recipeIngredients.filter((ri) => ri.recipeId === r.recipeId);
      const tags = String(r.tags || "").split(",").map((t) => t.trim()).filter(Boolean);
      const sel = state.selectedRecipes.has(r.recipeId);
      return `<div class="recipe-card ${sel ? "selected" : ""}" data-recipe-id="${r.recipeId}">
        <div class="recipe-card-top">
          <div>
            <h4 class="recipe-name">${esc(r.recipeName)}</h4>
            <p class="recipe-desc">${esc(r.description || "")} · ${esc(r.servings)} servings · ${ings.length} ingredients</p>
          </div>
          <input type="checkbox" class="recipe-check" ${sel ? "checked" : ""} aria-label="Select ${esc(r.recipeName)}">
        </div>
        <div class="recipe-tags">${tags.map((t) => `<span class="recipe-tag">${esc(t)}</span>`).join("")}</div>
        <div class="recipe-actions">
          <button class="btn btn-ghost btn-sm" data-act="view">View</button>
          <button class="btn btn-ghost btn-sm" data-act="cook">Mark cooked</button>
        </div>
      </div>`;
    }).join("");

    grid.querySelectorAll(".recipe-card").forEach((card) => {
      const id = card.dataset.recipeId;
      card.querySelector(".recipe-check").addEventListener("change", (e) => {
        e.target.checked ? state.selectedRecipes.add(id) : state.selectedRecipes.delete(id);
        renderRecipes();
      });
      card.querySelector('[data-act="view"]').addEventListener("click", () => openRecipeModal(id));
      card.querySelector('[data-act="cook"]').addEventListener("click", () => openCookModal(id));
    });
  }

  const bar = $("#selectionBar");
  const n = state.selectedRecipes.size;
  bar.hidden = n === 0;
  $("#selectionCount").textContent = `${n} recipe${n === 1 ? "" : "s"} selected`;
}


/* ---------- Meal plan ---------- */

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function getMealWeekStart() {
  return state.mealWeekStart || startOfWeekISO();
}

function getMealPlanEntries() {
  const weekOf = getMealWeekStart();
  return DAYS.map((day) => {
    const selected = state.data.mealPlan.find((m) =>
      m.status !== "archived" && m.weekOf === weekOf && m.day === day && m.mealSlot === "Dinner"
    );
    return {
      weekOf,
      day,
      mealSlot: "Dinner",
      recipeId: selected ? selected.recipeId : "",
      notes: selected ? (selected.notes || "") : "",
      status: "active",
    };
  });
}

function recipeOptions(selectedId) {
  const recipes = state.data.recipes.filter((r) => r.status === "active").sort((a, b) => a.recipeName.localeCompare(b.recipeName));
  return `<option value="">No planned dinner</option>` + recipes.map((r) =>
    `<option value="${esc(r.recipeId)}" ${r.recipeId === selectedId ? "selected" : ""}>${esc(r.recipeName)}</option>`
  ).join("");
}

function renderMealPlan() {
  if (!state.mealWeekStart) state.mealWeekStart = startOfWeekISO();
  const weekInput = $("#mealWeekStart");
  if (weekInput && weekInput.value !== state.mealWeekStart) weekInput.value = state.mealWeekStart;

  const entries = getMealPlanEntries();
  const grid = $("#mealPlanGrid");
  grid.innerHTML = entries.map((entry, idx) => `
    <div class="meal-plan-row">
      <div class="meal-day">${esc(entry.day)}<small>${esc(addDaysISO(entry.weekOf, idx))}</small></div>
      <select class="input meal-recipe" data-day="${esc(entry.day)}" aria-label="Dinner recipe for ${esc(entry.day)}">
        ${recipeOptions(entry.recipeId)}
      </select>
    </div>`).join("");
}

function currentMealPlanFromUI() {
  const weekOf = $("#mealWeekStart").value || getMealWeekStart();
  return $$(".meal-recipe").map((sel) => ({
    weekOf,
    day: sel.dataset.day,
    mealSlot: "Dinner",
    recipeId: sel.value,
    notes: "",
    status: "active",
  })).filter((entry) => entry.recipeId);
}

async function saveMealPlan() {
  const weekOf = $("#mealWeekStart").value || getMealWeekStart();
  state.mealWeekStart = weekOf;
  const entries = currentMealPlanFromUI();
  await apiPost("saveMealPlan", { weekOf, entries });
  await reload();
  toast(`Saved ${entries.length} dinner${entries.length === 1 ? "" : "s"} for the week.`);
}

function openBuildMealPlanListModal() {
  const entries = currentMealPlanFromUI();
  const recipeIds = entries.map((e) => e.recipeId);
  if (!recipeIds.length) { toast("Pick at least one dinner first."); return; }

  const includeOptional = $("#mealIncludeOptional").checked;
  const cmp = compareRecipesToInventory(recipeIds, includeOptional);

  const row = (a, detail) => `<div class="cmp-row">
    <span><strong>${esc(a.name)}</strong> <span class="cmp-detail">— ${esc(a.recipes.join(", "))}</span>
    ${a.subNotes ? `<span class="cmp-detail"><br>sub: ${esc(a.subNotes)}</span>` : ""}</span>
    <span class="cmp-detail">${detail}</span>
  </div>`;

  const groupHTML = (key, title, rows) =>
    rows.length ? `<div class="cmp-group ${key}"><h4>${title} (${rows.length})</h4>${rows.join("")}</div>` : "";

  const needRows = cmp.need.map((a) => row(a, a.unlinked
    ? `buy ${a.totalNeeded} ${esc(a.unit)} · not tracked — check shelf`
    : a.unitMismatch
      ? `buy ${a.totalNeeded} ${esc(a.unit)} · units differ — check shelf`
      : `buy ${a.buyQty} ${esc(a.unit)}`));
  const partialRows = cmp.partial.map((a) => row(a, `have ${a.haveQty}, buy ${a.buyQty} ${esc(a.unit)}`));
  const haveRows = cmp.have.map((a) => row(a, `have ${a.haveQty ?? "✓"} — skip`));
  const optRows = cmp.optional.map((a) => row(a, `optional · ${a.totalNeeded} ${esc(a.unit)}`));

  const toAdd = [...cmp.need, ...cmp.partial, ...(includeOptional ? cmp.optional : [])].filter((a) => a.buyQty > 0);

  openModal("Meal plan pantry check", `
    ${groupHTML("need", "Need to buy", needRows)}
    ${groupHTML("partial", "Partially have", partialRows)}
    ${groupHTML("have", "Already have", haveRows)}
    ${groupHTML("optional", includeOptional ? "Optional — will add" : "Optional — not added", optRows)}
    <div class="form-actions">
      <button class="btn btn-ghost" id="mpCancel">Cancel</button>
      <button class="btn btn-primary" id="mpConfirm">Add ${toAdd.length} item${toAdd.length === 1 ? "" : "s"} to list</button>
    </div>`);

  $("#mpCancel").addEventListener("click", closeModal);
  $("#mpConfirm").addEventListener("click", async () => {
    const lines = toAdd.map((a) => ({
      itemName: a.name,
      linkedItemId: a.linkedItemId,
      quantityToBuy: a.buyQty,
      unit: a.unit,
      category: a.category,
      storeSection: a.storeSection || "Other",
      whatFor: `Meal plan: ${a.recipes.join(", ")}`,
      sourceType: "meal_plan",
      notes: a.unlinked ? "Not tracked — verify" : a.unitMismatch ? "Units differ — verify" : (a.haveQty ? `Have ${a.haveQty} of ${a.totalNeeded} needed` : ""),
    }));
    if (lines.length) await apiPost("addLines", { lines });
    closeModal();
    await reload();
    switchView("shopping");
    toast(`${lines.length} meal-plan item${lines.length === 1 ? "" : "s"} added to the list.`);
  });
}

/* ---------- Shopping list (the receipt) ---------- */

const SECTION_ORDER = () =>
  String(state.data.settings.store_sections || "").split(",").map((s) => s.trim()).filter(Boolean);

function renderShopping() {
  const d = state.data;
  const receipt = $("#receipt");
  const lines = d.shoppingList.filter((l) => l.status !== "cleared");

  const header = `<div class="receipt-header">
    <div class="store-name">Stocked</div>
    <div class="receipt-sub">${new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })} · the house list</div>
  </div>`;

  if (!lines.length) {
    receipt.innerHTML = header + `<div class="receipt-empty">List is empty.<br>Pick recipes or hit “Check staples” to fill it up.</div>`;
    $("#listFooter").hidden = true;
    return;
  }

  const order = SECTION_ORDER();
  const bySection = {};
  lines.forEach((l) => {
    const sec = l.storeSection || "Other";
    (bySection[sec] = bySection[sec] || []).push(l);
  });
  const sections = order.filter((s) => bySection[s]);
  Object.keys(bySection).forEach((s) => { if (!sections.includes(s)) sections.push(s); });

  const needed = lines.filter((l) => l.status === "needed").length;
  const done = lines.filter((l) => l.status === "purchased").length;

  receipt.innerHTML = header + sections.map((sec) => `
    <div class="receipt-section">
      <div class="receipt-section-title">${esc(sec)}</div>
      ${bySection[sec].map(receiptLineHTML).join("")}
    </div>`).join("") + `
    <div class="receipt-total"><span>${needed} to buy</span><span>${done} in the cart</span></div>`;

  receipt.querySelectorAll(".receipt-line").forEach((el) =>
    el.addEventListener("click", () => onLineTap(el.dataset.lineId))
  );

  $("#listFooter").hidden = !(done || lines.some((l) => l.status === "skipped"));
}

function receiptLineHTML(l) {
  const cls = l.status === "purchased" ? "purchased" : l.status === "skipped" ? "skipped" : "";
  const check = l.status === "purchased" ? "✓" : l.status === "skipped" ? "✕" : "";
  return `<button class="receipt-line ${cls}" data-line-id="${l.lineId}">
    <span class="rl-check">${check}</span>
    <span>
      <span class="rl-name">${esc(l.itemName)}</span>
      ${l.whatFor ? `<span class="rl-for">for: ${esc(l.whatFor)}</span>` : ""}
      ${l.notes ? `<span class="rl-note">${esc(l.notes)}</span>` : ""}
    </span>
    <span class="rl-qty">${esc(l.quantityToBuy)} ${esc(l.unit)}</span>
  </button>`;
}

/* ------------------------------------------------------------
   6. ACTIONS
   ------------------------------------------------------------ */

async function stepQty(itemId, delta) {
  const it = state.data.inventory.find((i) => i.itemId === itemId);
  if (!it) return;
  const newQty = Math.max(0, Number(it.quantity || 0) + delta);
  it.quantity = newQty; // optimistic
  renderInventory();
  try {
    await apiPost("updateItem", { itemId, fields: { quantity: newQty } });
  } catch (e) {
    toast(`Save failed: ${e.message}`);
    await reload();
  }
}

async function addLowStockToList() {
  const sugg = lowStockSuggestions();
  if (!sugg.length) { toast("All staples are stocked."); return; }
  const lines = sugg.map(({ item, buyQty }) => ({
    itemName: item.itemName,
    linkedItemId: item.itemId,
    quantityToBuy: buyQty,
    unit: item.unit,
    category: item.category,
    storeSection: item.storeSection || "Other",
    whatFor: `Low stock (${item.quantity}/${item.minQuantity})`,
    sourceType: "low_stock",
    notes: "",
  }));
  await apiPost("addLines", { lines });
  await reload();
  toast(`Added ${lines.length} low-stock item${lines.length > 1 ? "s" : ""} to the list.`);
}

function onLineTap(lineId) {
  const l = state.data.shoppingList.find((x) => x.lineId === lineId);
  if (!l) return;
  if (l.status === "needed") return openPurchaseModal(l);
  // tapping a purchased/skipped line returns it to needed
  apiPost("updateLine", { lineId, fields: { status: "needed" } }).then(reload);
}

/* ---------- Modals: item add/edit ---------- */

function openItemModal(itemId) {
  const d = state.data;
  const it = itemId ? d.inventory.find((i) => i.itemId === itemId) : null;
  const locOpts = d.locations.filter((l) => l.status === "active")
    .map((l) => `<option ${it && it.location === l.locationName ? "selected" : ""}>${esc(l.locationName)}</option>`).join("");
  const catOpts = d.categories.filter((c) => c.status === "active")
    .map((c) => `<option ${it && it.category === c.categoryName ? "selected" : ""}>${esc(c.categoryName)}</option>`).join("");
  const secOpts = SECTION_ORDER()
    .map((s) => `<option ${it && it.storeSection === s ? "selected" : ""}>${esc(s)}</option>`).join("");

  openModal(it ? `Edit ${it.itemName}` : "Add item", `
    <div class="form-grid">
      <div class="form-field full"><label>Item name</label><input class="input" id="fName" value="${esc(it?.itemName || "")}"></div>
      <div class="form-field"><label>Category</label><select class="input" id="fCat">${catOpts}</select></div>
      <div class="form-field"><label>Location</label><select class="input" id="fLoc">${locOpts}</select></div>
      <div class="form-field"><label>Quantity</label><input class="input" id="fQty" type="number" min="0" step="any" value="${esc(it?.quantity ?? 1)}"></div>
      <div class="form-field"><label>Unit</label><input class="input" id="fUnit" value="${esc(it?.unit || "count")}" placeholder="count, lb, roll…"></div>
      <div class="form-field"><label>Min quantity (low-stock alert)</label><input class="input" id="fMin" type="number" min="0" step="any" value="${esc(it?.minQuantity ?? "")}"></div>
      <div class="form-field"><label>Expiration date</label><input class="input" id="fExp" type="date" value="${esc(it?.expirationDate || "")}"></div>
      <div class="form-field"><label>Store section</label><select class="input" id="fSec">${secOpts}</select></div>
      <div class="form-field"><label>Staple?</label><label class="toggle" style="margin-top:8px"><input type="checkbox" id="fStaple" ${it && (it.staple === true || it.staple === "TRUE") ? "checked" : ""}><span>Recurring staple</span></label></div>
      <div class="form-field full"><label>Notes</label><input class="input" id="fNotes" value="${esc(it?.notes || "")}"></div>
    </div>
    <div class="form-actions">
      ${it ? `<button class="btn btn-ghost" id="fArchive">Archive</button>` : ""}
      <button class="btn btn-primary" id="fSave">${it ? "Save changes" : "Add item"}</button>
    </div>`);

  $("#fSave").addEventListener("click", async () => {
    const fields = {
      itemName: $("#fName").value.trim(),
      category: $("#fCat").value,
      location: $("#fLoc").value,
      quantity: Number($("#fQty").value || 0),
      unit: $("#fUnit").value.trim() || "count",
      minQuantity: $("#fMin").value === "" ? "" : Number($("#fMin").value),
      expirationDate: $("#fExp").value,
      storeSection: $("#fSec").value,
      staple: $("#fStaple").checked,
      defaultLocation: $("#fLoc").value,
      notes: $("#fNotes").value.trim(),
    };
    if (!fields.itemName) { toast("Item needs a name."); return; }
    if (it) await apiPost("updateItem", { itemId: it.itemId, fields });
    else await apiPost("addItem", fields);
    closeModal();
    await reload();
    toast(it ? "Item updated." : "Item added.");
  });

  if (it) $("#fArchive")?.addEventListener("click", async () => {
    await apiPost("updateItem", { itemId: it.itemId, fields: { status: "archived" } });
    closeModal();
    await reload();
    toast("Item archived.");
  });
}

/* ---------- Modals: recipe view/add/edit ---------- */

function ingRowHTML(ing = {}) {
  return `<div class="ing-editor-row">
    <input class="input" placeholder="Ingredient" value="${esc(ing.ingredientName || "")}" data-f="name">
    <input class="input" placeholder="Qty" type="number" min="0" step="any" value="${esc(ing.quantity ?? "")}" data-f="qty">
    <input class="input" placeholder="Unit" value="${esc(ing.unit || "")}" data-f="unit">
    <button class="btn btn-ghost btn-sm ing-del" title="Remove">✕</button>
  </div>`;
}

function openRecipeModal(recipeId) {
  const d = state.data;
  const r = recipeId ? d.recipes.find((x) => x.recipeId === recipeId) : null;
  const ings = recipeId ? d.recipeIngredients.filter((ri) => ri.recipeId === recipeId) : [{}, {}, {}];

  openModal(r ? r.recipeName : "Add recipe", `
    <div class="form-grid">
      <div class="form-field full"><label>Recipe name</label><input class="input" id="rName" value="${esc(r?.recipeName || "")}"></div>
      <div class="form-field full"><label>Description</label><input class="input" id="rDesc" value="${esc(r?.description || "")}"></div>
      <div class="form-field"><label>Servings</label><input class="input" id="rServ" type="number" min="1" value="${esc(r?.servings || 4)}"></div>
      <div class="form-field"><label>Tags (comma separated)</label><input class="input" id="rTags" value="${esc(r?.tags || "")}"></div>
      <div class="form-field full"><label>Ingredients</label><div id="ingRows">${ings.map(ingRowHTML).join("")}</div>
        <button class="btn btn-ghost btn-sm" id="rAddIng">+ Ingredient</button>
        <p class="view-hint" style="margin:8px 0 0">Tip: name ingredients the same as your inventory items and Stocked links them automatically when comparing.</p>
      </div>
      <div class="form-field full"><label>Instructions</label><textarea class="input" id="rInstr" rows="4">${esc(r?.instructions || "")}</textarea></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary" id="rSave">${r ? "Save recipe" : "Add recipe"}</button>
    </div>`);

  const bindDel = () => $$("#ingRows .ing-del").forEach((b) => b.onclick = () => { b.parentElement.remove(); });
  bindDel();
  $("#rAddIng").addEventListener("click", () => {
    $("#ingRows").insertAdjacentHTML("beforeend", ingRowHTML());
    bindDel();
  });

  $("#rSave").addEventListener("click", async () => {
    const name = $("#rName").value.trim();
    if (!name) { toast("Recipe needs a name."); return; }
    // auto-link ingredients to inventory by exact (normalized) name match
    const ingredients = $$("#ingRows .ing-editor-row").map((row) => {
      const get = (f) => row.querySelector(`[data-f="${f}"]`).value.trim();
      const ingName = get("name");
      if (!ingName) return null;
      const match = state.data.inventory.find((i) => norm(i.itemName) === norm(ingName) || norm(i.itemName).startsWith(norm(ingName) + ","));
      return {
        ingredientName: ingName,
        linkedItemId: match ? match.itemId : "",
        quantity: Number(get("qty") || 1),
        unit: get("unit") || "count",
        optional: false,
        substitutionNotes: "",
        storeSection: match ? match.storeSection : "Other",
      };
    }).filter(Boolean);

    const recipe = {
      recipeName: name,
      description: $("#rDesc").value.trim(),
      servings: Number($("#rServ").value || 4),
      mealType: r?.mealType || "dinner",
      tags: $("#rTags").value.trim(),
      instructions: $("#rInstr").value,
      notes: r?.notes || "",
    };
    if (r) await apiPost("updateRecipe", { recipeId: r.recipeId, recipe, ingredients });
    else await apiPost("addRecipe", { recipe, ingredients });
    closeModal();
    await reload();
    toast(r ? "Recipe saved." : "Recipe added.");
  });
}

/* ---------- Build shopping list flow ---------- */

function openBuildListModal() {
  const recipeIds = [...state.selectedRecipes];
  const includeOptional = $("#includeOptional").checked;
  const cmp = compareRecipesToInventory(recipeIds, includeOptional);

  const row = (a, detail) => `<div class="cmp-row">
    <span><strong>${esc(a.name)}</strong> <span class="cmp-detail">— ${esc(a.recipes.join(", "))}</span>
    ${a.subNotes ? `<span class="cmp-detail"><br>sub: ${esc(a.subNotes)}</span>` : ""}</span>
    <span class="cmp-detail">${detail}</span>
  </div>`;

  const groupHTML = (key, title, rows) =>
    rows.length ? `<div class="cmp-group ${key}"><h4>${title} (${rows.length})</h4>${rows.join("")}</div>` : "";

  const needRows = cmp.need.map((a) => row(a, a.unlinked
    ? `buy ${a.totalNeeded} ${esc(a.unit)} · not tracked — check shelf`
    : a.unitMismatch
      ? `buy ${a.totalNeeded} ${esc(a.unit)} · units differ — check shelf`
      : `buy ${a.buyQty} ${esc(a.unit)}`));
  const partialRows = cmp.partial.map((a) => row(a, `have ${a.haveQty}, buy ${a.buyQty} ${esc(a.unit)}`));
  const haveRows = cmp.have.map((a) => row(a, `have ${a.haveQty ?? "✓"} — skip`));
  const optRows = cmp.optional.map((a) => row(a, `optional · ${a.totalNeeded} ${esc(a.unit)}`));

  const toAdd = [...cmp.need, ...cmp.partial, ...(includeOptional ? cmp.optional : [])].filter((a) => a.buyQty > 0);

  openModal("Pantry check", `
    ${groupHTML("need", "Need to buy", needRows)}
    ${groupHTML("partial", "Partially have", partialRows)}
    ${groupHTML("have", "Already have", haveRows)}
    ${groupHTML("optional", includeOptional ? "Optional — will add" : "Optional — not added", optRows)}
    <div class="form-actions">
      <button class="btn btn-ghost" id="cmpCancel">Cancel</button>
      <button class="btn btn-primary" id="cmpConfirm">Add ${toAdd.length} item${toAdd.length === 1 ? "" : "s"} to list</button>
    </div>`);

  $("#cmpCancel").addEventListener("click", closeModal);
  $("#cmpConfirm").addEventListener("click", async () => {
    const lines = toAdd.map((a) => ({
      itemName: a.name,
      linkedItemId: a.linkedItemId,
      quantityToBuy: a.buyQty,
      unit: a.unit,
      category: a.category,
      storeSection: a.storeSection || "Other",
      whatFor: a.recipes.join(", "),
      sourceType: "recipe",
      notes: a.unlinked ? "Not tracked — verify" : a.unitMismatch ? "Units differ — verify" : (a.haveQty ? `Have ${a.haveQty} of ${a.totalNeeded} needed` : ""),
    }));
    if (lines.length) await apiPost("addLines", { lines });
    state.selectedRecipes.clear();
    closeModal();
    await reload();
    switchView("shopping");
    toast(`${lines.length} item${lines.length === 1 ? "" : "s"} added to the list.`);
  });
}

/* ---------- Mark purchased ---------- */

function openPurchaseModal(line) {
  const d = state.data;
  const linked = line.linkedItemId ? d.inventory.find((i) => i.itemId === line.linkedItemId) : null;

  if (linked) {
    openModal(`Got it: ${line.itemName}`, `
      <p>Mark <strong>${esc(line.quantityToBuy)} ${esc(line.unit)}</strong> purchased and add it back to
      <strong>${esc(linked.defaultLocation || linked.location)}</strong>?</p>
      <p class="view-hint">${esc(linked.itemName)}: ${esc(linked.quantity)} → ${Number(linked.quantity || 0) + Number(line.quantityToBuy || 0)} ${esc(linked.unit)}</p>
      <div class="form-actions">
        <button class="btn btn-ghost" id="pSkip">Skip item</button>
        <button class="btn btn-ghost" id="pOnly">Purchased only</button>
        <button class="btn btn-primary" id="pBoth">Purchased + restock</button>
      </div>`);
    $("#pBoth").addEventListener("click", async () => {
      await apiPost("markPurchased", { lineId: line.lineId, inventoryDelta: { itemId: linked.itemId, qty: Number(line.quantityToBuy || 0) } });
      closeModal(); await reload(); toast(`${line.itemName} restocked.`);
    });
    $("#pOnly").addEventListener("click", async () => {
      await apiPost("markPurchased", { lineId: line.lineId });
      closeModal(); await reload();
    });
  } else {
    const locOpts = d.locations.filter((l) => l.status === "active")
      .map((l) => `<option>${esc(l.locationName)}</option>`).join("");
    openModal(`Got it: ${line.itemName}`, `
      <p>This item isn't tracked in inventory yet. Add it?</p>
      <div class="form-field"><label>Location</label><select class="input" id="pLoc">${locOpts}</select></div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="pSkip">Skip item</button>
        <button class="btn btn-ghost" id="pOnly">Purchased only</button>
        <button class="btn btn-primary" id="pAdd">Purchased + track it</button>
      </div>`);
    $("#pAdd").addEventListener("click", async () => {
      await apiPost("addItem", {
        itemName: line.itemName, category: line.category || "", location: $("#pLoc").value,
        quantity: Number(line.quantityToBuy || 1), unit: line.unit || "count", minQuantity: "",
        expirationDate: "", storeSection: line.storeSection || "Other", staple: false,
        defaultLocation: $("#pLoc").value, notes: "",
      });
      await apiPost("markPurchased", { lineId: line.lineId });
      closeModal(); await reload(); toast(`${line.itemName} added to inventory.`);
    });
    $("#pOnly").addEventListener("click", async () => {
      await apiPost("markPurchased", { lineId: line.lineId });
      closeModal(); await reload();
    });
  }
  $("#pSkip").addEventListener("click", async () => {
    await apiPost("updateLine", { lineId: line.lineId, fields: { status: "skipped" } });
    closeModal(); await reload();
  });
}

/* ---------- Mark cooked ---------- */

function openCookModal(recipeId) {
  const d = state.data;
  const r = d.recipes.find((x) => x.recipeId === recipeId);
  const ings = d.recipeIngredients.filter((ri) => ri.recipeId === recipeId);

  const deductions = [];
  const rows = ings.map((ing) => {
    const linked = ing.linkedItemId ? d.inventory.find((i) => i.itemId === ing.linkedItemId) : null;
    if (!linked) return `<div class="cmp-row"><span>${esc(ing.ingredientName)}</span><span class="cmp-detail">not tracked — no change</span></div>`;
    if (norm(linked.unit) !== norm(ing.unit)) return `<div class="cmp-row"><span>${esc(ing.ingredientName)}</span><span class="cmp-detail">units differ — adjust by hand</span></div>`;
    const newQty = Math.max(0, Number(linked.quantity || 0) - Number(ing.quantity || 0));
    deductions.push({ itemId: linked.itemId, qty: Number(ing.quantity || 0) });
    return `<div class="cmp-row"><span>${esc(linked.itemName)}</span><span class="cmp-detail">${esc(linked.quantity)} → ${newQty} ${esc(linked.unit)}</span></div>`;
  }).join("");

  openModal(`Cooked: ${r.recipeName}`, `
    <p class="view-hint">Confirm and these amounts come out of inventory.</p>
    ${rows}
    <div class="form-actions">
      <button class="btn btn-ghost" id="ckCancel">Cancel</button>
      <button class="btn btn-primary" id="ckConfirm">Confirm — deduct from inventory</button>
    </div>`);

  $("#ckCancel").addEventListener("click", closeModal);
  $("#ckConfirm").addEventListener("click", async () => {
    await apiPost("cookRecipe", { recipeId, deductions });
    closeModal();
    await reload();
    toast(`${r.recipeName} cooked — inventory updated.`);
  });
}

/* ---------- Manual list item ---------- */

function openManualModal() {
  const secOpts = SECTION_ORDER().map((s) => `<option>${esc(s)}</option>`).join("");
  openModal("Add to shopping list", `
    <div class="form-grid">
      <div class="form-field full"><label>Item</label><input class="input" id="mName"></div>
      <div class="form-field"><label>Quantity</label><input class="input" id="mQty" type="number" min="0" step="any" value="1"></div>
      <div class="form-field"><label>Unit</label><input class="input" id="mUnit" value="count"></div>
      <div class="form-field full"><label>Store section</label><select class="input" id="mSec">${secOpts}</select></div>
    </div>
    <div class="form-actions"><button class="btn btn-primary" id="mSave">Add to list</button></div>`);
  $("#mSave").addEventListener("click", async () => {
    const name = $("#mName").value.trim();
    if (!name) { toast("Item needs a name."); return; }
    // link to inventory if the name matches a tracked item
    const match = state.data.inventory.find((i) => norm(i.itemName) === norm(name));
    await apiPost("addLines", { lines: [{
      itemName: match ? match.itemName : name,
      linkedItemId: match ? match.itemId : "",
      quantityToBuy: Number($("#mQty").value || 1),
      unit: $("#mUnit").value.trim() || "count",
      category: match ? match.category : "",
      storeSection: $("#mSec").value,
      whatFor: "Manual",
      sourceType: "manual",
      notes: "",
    }] });
    closeModal(); await reload(); toast("Added to the list.");
  });
}

/* ------------------------------------------------------------
   7. MODAL / TOAST / NAV PLUMBING
   ------------------------------------------------------------ */

function openModal(title, bodyHTML) {
  $("#modalTitle").textContent = title;
  $("#modalBody").innerHTML = bodyHTML;
  $("#modalOverlay").hidden = false;
  document.body.style.overflow = "hidden";
}
function closeModal() {
  $("#modalOverlay").hidden = true;
  document.body.style.overflow = "";
}

let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}

function switchView(view) {
  state.view = view;
  $$(".tab").forEach((t) => {
    const active = t.dataset.view === view;
    t.classList.toggle("active", active);
    active ? t.setAttribute("aria-current", "page") : t.removeAttribute("aria-current");
  });
  $$(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${view}`));
  render();
}

async function reload() {
  if (CONFIG.DEMO_MODE) {
    state.data = structuredClone(DEMO);
  } else {
    state.data = await apiGetAll();
  }
  render();
}

/* ------------------------------------------------------------
   8. INIT
   ------------------------------------------------------------ */

async function init() {
  $$(".tab").forEach((t) => t.addEventListener("click", () => switchView(t.dataset.view)));
  $("#modalClose").addEventListener("click", closeModal);
  $("#modalOverlay").addEventListener("click", (e) => { if (e.target.id === "modalOverlay") closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  $("#btnAddItem").addEventListener("click", () => openItemModal(null));
  $("#btnAddRecipe").addEventListener("click", () => openRecipeModal(null));
  $("#btnBuildList").addEventListener("click", openBuildListModal);
  $("#btnClearSel").addEventListener("click", () => { state.selectedRecipes.clear(); renderRecipes(); });
  $("#mealWeekStart").addEventListener("change", (e) => { state.mealWeekStart = e.target.value; renderMealPlan(); });
  $("#btnSaveMealPlan").addEventListener("click", saveMealPlan);
  $("#btnBuildMealPlanList").addEventListener("click", openBuildMealPlanListModal);
  $("#btnAddManual").addEventListener("click", openManualModal);
  $("#btnCheckStaples").addEventListener("click", addLowStockToList);
  $("#btnClearPurchased").addEventListener("click", async () => {
    await apiPost("clearDone", {});
    await reload();
    toast("Cleared purchased and skipped items.");
  });
  $("#invSearch").addEventListener("input", (e) => { state.search = e.target.value; renderInventory(); });
  $("#lowOnly").addEventListener("change", (e) => { state.lowOnly = e.target.checked; renderInventory(); });

  const dot = $("#syncDot"), label = $("#syncLabel");
  try {
    state.data = await apiGetAll();
    if (CONFIG.DEMO_MODE) {
      label.textContent = "Demo mode";
    } else {
      dot.classList.add("live");
      label.textContent = "Synced to Sheet";
    }
    render();
  } catch (e) {
    dot.classList.add("error");
    label.textContent = "Connection error";
    $("#inventoryGroups").innerHTML = `<div class="empty-state">Couldn't reach the Sheet.<br>Check SCRIPT_URL and API_TOKEN in js/config.js, then refresh.<br><small>${esc(e.message)}</small></div>`;
  }
}

init();
