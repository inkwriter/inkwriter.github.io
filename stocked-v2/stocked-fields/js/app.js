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
    { itemId: "ITM-0004", itemName: "Toilet paper", category: "Paper Goods", location: "Bathroom Closet", quantity: 8, unit: "roll", minQuantity: 12, expirationDate: "", storeSection: "Paper Goods", staple: true, defaultLocation: "Bathroom Closet", notes: "Mega rolls", lastUpdated: "2026-06-09", status: "active", barcodes: "030400020161" },
    { itemId: "ITM-0005", itemName: "Laundry detergent", category: "Cleaning", location: "Laundry Room", quantity: 1, unit: "bottle", minQuantity: 1, expirationDate: "", storeSection: "Cleaning", staple: true, defaultLocation: "Laundry Room", notes: "Free & clear", lastUpdated: "2026-06-01", status: "active", barcodes: "" },
    { itemId: "ITM-0006", itemName: "Toothpaste", category: "Toiletries", location: "Bathroom Closet", quantity: 1, unit: "tube", minQuantity: 2, expirationDate: "", storeSection: "Toiletries", staple: true, defaultLocation: "Bathroom Closet", notes: "", lastUpdated: "2026-05-28", status: "active" },
    { itemId: "ITM-0007", itemName: "Cumin, ground", category: "Spices", location: "Spice Rack", quantity: 1, unit: "jar", minQuantity: "", expirationDate: "2027-01-01", storeSection: "Spices", staple: false, defaultLocation: "Spice Rack", notes: "", lastUpdated: "2026-04-12", status: "active" },
    { itemId: "ITM-0008", itemName: "Spinach, fresh", category: "Produce", location: "Fridge", quantity: 1, unit: "bag", minQuantity: "", expirationDate: "2026-06-13", storeSection: "Produce", staple: false, defaultLocation: "Fridge", notes: "", lastUpdated: "2026-06-09", status: "active" },
    { itemId: "ITM-0009", itemName: "AA batteries", category: "Household", location: "Garage", quantity: 6, unit: "count", minQuantity: 4, expirationDate: "", storeSection: "Household", staple: true, defaultLocation: "Garage", notes: "", lastUpdated: "2026-03-30", status: "active" },
    { itemId: "ITM-0010", itemName: "Pasta, fettuccine", category: "Dry Goods", location: "Pantry", quantity: 2, unit: "box", minQuantity: "", expirationDate: "", storeSection: "Dry Goods", staple: false, defaultLocation: "Pantry", notes: "", lastUpdated: "2026-05-20", status: "active", barcodes: "076808280081" },
    { itemId: "ITM-0011", itemName: "Ground beef", category: "Meat", location: "Freezer", quantity: 1, unit: "lb", minQuantity: "", expirationDate: "", storeSection: "Meat", staple: false, defaultLocation: "Freezer", notes: "", lastUpdated: "2026-06-10", status: "active", barcodes: "" },
    { itemId: "ITM-0012", itemName: "Milk", category: "Dairy", location: "Fridge", quantity: 1, unit: "gal", minQuantity: 1, expirationDate: "", storeSection: "Dairy", staple: true, defaultLocation: "Fridge", notes: "", lastUpdated: "2026-06-10", status: "active", barcodes: "", shelfLifeDays: 10 },
    { itemId: "ITM-0014", itemName: "Flour", category: "Dry Goods", location: "Pantry", quantity: 2, unit: "lb", minQuantity: "", expirationDate: "", storeSection: "Dry Goods", staple: true, defaultLocation: "Pantry", notes: "", lastUpdated: "2026-06-10", status: "active", barcodes: "", conversions: "1 lb = 3.6 cup" },
    { itemId: "ITM-0015", itemName: "Butter", category: "Dairy", location: "Fridge", quantity: 2, unit: "stick", minQuantity: "", expirationDate: "", storeSection: "Dairy", staple: false, defaultLocation: "Fridge", notes: "", lastUpdated: "2026-06-10", status: "active", barcodes: "", shelfLifeDays: 30 },
    { itemId: "ITM-0013", itemName: "Eggs", category: "Dairy", location: "Fridge", quantity: 12, unit: "count", minQuantity: 6, expirationDate: "", storeSection: "Dairy", staple: true, defaultLocation: "Fridge", notes: "", lastUpdated: "2026-06-10", status: "active", barcodes: "" },
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
    { recipeId: "RCP-0004", recipeName: "Pancakes", description: "Saturday pancakes", servings: 4, mealType: "breakfast", tags: "weekend", instructions: "Whisk dry, whisk wet, combine, griddle.", notes: "", timesCooked: 6, status: "active" },
    { recipeId: "RCP-0003", recipeName: "Chicken Alfredo", description: "Creamy pasta night", servings: 4, mealType: "dinner", tags: "comfort", instructions: "Boil pasta; pan-sear chicken; make cream sauce; combine.", notes: "", timesCooked: 3, status: "active" },
  ],
  recipeIngredients: [
    { recipeId: "RCP-0001", ingredientName: "Onion", linkedItemId: "ITM-0001", quantity: 1, unit: "count", optional: false, substitutionNotes: "", storeSection: "" },
    { recipeId: "RCP-0001", ingredientName: "Ground beef", linkedItemId: "", quantity: 1, unit: "lb", optional: false, substitutionNotes: "Ground turkey works", storeSection: "Meat" },
    { recipeId: "RCP-0001", ingredientName: "Tortillas", linkedItemId: "", quantity: 1, unit: "pack", optional: false, substitutionNotes: "", storeSection: "Dry Goods" },
    { recipeId: "RCP-0001", ingredientName: "Cilantro", linkedItemId: "", quantity: 1, unit: "bunch", optional: true, substitutionNotes: "", storeSection: "Produce" },
    { recipeId: "RCP-0002", ingredientName: "Onion", linkedItemId: "ITM-0001", quantity: 2, unit: "count", optional: false, substitutionNotes: "", storeSection: "" },
    { recipeId: "RCP-0002", ingredientName: "Hamburger meat", linkedItemId: "", quantity: 2, unit: "lb", optional: false, substitutionNotes: "", storeSection: "Meat" },
    { recipeId: "RCP-0002", ingredientName: "Cumin", linkedItemId: "ITM-0007", quantity: 1, unit: "tbsp", optional: false, substitutionNotes: "", storeSection: "" },
    { recipeId: "RCP-0002", ingredientName: "Canned tomatoes", linkedItemId: "", quantity: 2, unit: "can", optional: false, substitutionNotes: "", storeSection: "Canned" },
    { recipeId: "RCP-0003", ingredientName: "Chicken breast", linkedItemId: "ITM-0002", quantity: 2, unit: "lb", optional: false, substitutionNotes: "Thighs OK", storeSection: "" },
    { recipeId: "RCP-0003", ingredientName: "Heavy cream", linkedItemId: "ITM-0003", quantity: 1, unit: "pint", optional: false, substitutionNotes: "Half-and-half in a pinch", storeSection: "" },
    { recipeId: "RCP-0003", ingredientName: "Fettuccine", linkedItemId: "ITM-0010", quantity: 1, unit: "box", optional: false, substitutionNotes: "", storeSection: "" },
    { recipeId: "RCP-0004", ingredientName: "Flour", linkedItemId: "", quantity: 1.5, unit: "cup", optional: false, substitutionNotes: "", storeSection: "" },
    { recipeId: "RCP-0004", ingredientName: "Milk", linkedItemId: "", quantity: 1.25, unit: "cup", optional: false, substitutionNotes: "", storeSection: "" },
    { recipeId: "RCP-0004", ingredientName: "Eggs", linkedItemId: "", quantity: 1, unit: "count", optional: false, substitutionNotes: "", storeSection: "" },
    { recipeId: "RCP-0004", ingredientName: "Butter", linkedItemId: "", quantity: 3, unit: "tbsp", optional: false, substitutionNotes: "", storeSection: "" },
    { recipeId: "RCP-0003", ingredientName: "Parmesan", linkedItemId: "", quantity: 1, unit: "wedge", optional: true, substitutionNotes: "", storeSection: "Dairy" },
  ],
  shoppingList: [],
  mealPlan: [
    { weekOf: "2026-06-15", day: "Monday", mealSlot: "Dinner", recipeId: "RCP-0001", notes: "", status: "active" },
    { weekOf: "2026-06-15", day: "Tuesday", mealSlot: "Dinner", recipeId: "RCP-0003", notes: "", status: "active" },
    { weekOf: "2026-06-15", day: "Wednesday", mealSlot: "Dinner", recipeId: "RCP-0002", notes: "", status: "active" },
  ],
  aliases: [],
  usage: { "ITM-0012": 9, "ITM-0013": 8, "ITM-0004": 5, "ITM-0011": 4, "ITM-0001": 4, "ITM-0010": 2 },
  settings: { expiring_soon_days: "5", store_sections: "Produce,Meat,Dairy,Frozen,Canned,Dry Goods,Spices,Paper Goods,Toiletries,Cleaning,Household,Pharmacy,Other", api_token: "change-me", next_item_id: "16", next_line_id: "1" },
};

/* ------------------------------------------------------------
   2. STATE
   ------------------------------------------------------------ */

const state = {
  data: null,                 // { inventory, locations, categories, recipes, recipeIngredients, shoppingList, mealPlan, settings }
  mealWeekStart: "",
  mealDrafts: {},
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
  // tolerate an older Code.gs that doesn't send these yet
  json.aliases = json.aliases || [];
  json.usage = json.usage || {};
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
      const item = { barcodes: "", ...p, itemId: nextId("next_item_id", "ITM", 4), lastUpdated: todayISO(), status: "active" };
      d.inventory.push(item);
      d.usage[item.itemId] = (d.usage[item.itemId] || 0) + 1;
      return { ok: true, item: structuredClone(item) };
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
      const added = [];
      p.lines.forEach((line) => {
        const full = { ...line, lineId: nextId("next_line_id", "SL", 4), dateAdded: todayISO(), status: "needed" };
        d.shoppingList.push(full);
        added.push(full.lineId);
        if (line.linkedItemId) d.usage[line.linkedItemId] = (d.usage[line.linkedItemId] || 0) + 1;
      });
      return { ok: true, lineIds: added };
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
          it.quantity = Math.max(0, Math.round((Number(it.quantity || 0) - Number(ded.qty || 0)) * 1000) / 1000);
          it.lastUpdated = todayISO();
        }
      });
      const r = d.recipes.find((x) => x.recipeId === p.recipeId);
      if (r) r.timesCooked = Number(r.timesCooked || 0) + 1;
      return { ok: true };
    }
    case "saveMealPlan": {
      d.mealPlan = d.mealPlan.filter((m) => m.weekOf !== p.weekOf);
      (p.entries || []).forEach((entry) => d.mealPlan.push({ ...entry, weekOf: p.weekOf, mealSlot: entry.mealSlot || "Dinner", status: "active" }));
      return { ok: true };
    }
    case "addRecipes": {
      const ids = [];
      (p.recipes || []).forEach((r) => {
        const id = `RCP-${String(d.recipes.length + 1).padStart(4, "0")}`;
        d.recipes.push({ ...r.recipe, recipeId: id, timesCooked: 0, status: "active" });
        (r.ingredients || []).forEach((ing) => d.recipeIngredients.push({ ...ing, recipeId: id }));
        ids.push(id);
      });
      return { ok: true, recipeIds: ids };
    }
    case "clearDone": {
      d.shoppingList = d.shoppingList.filter((l) => l.status === "needed");
      return { ok: true };
    }
    case "quickAdd": {
      const it = d.inventory.find((i) => i.itemId === p.itemId);
      if (!it) return { error: "Item not found" };
      it.quantity = Math.max(0, Math.round((Number(it.quantity || 0) + Number(p.qty || 0)) * 1000) / 1000);
      it.lastUpdated = todayISO();
      d.usage[p.itemId] = Math.max(0, (d.usage[p.itemId] || 0) + (p.undo ? -1 : 1));
      return { ok: true, quantity: it.quantity };
    }
    case "linkBarcode": {
      const k = barcodeKey(p.barcode);
      let target = null;
      d.inventory.forEach((it) => {
        const list = itemBarcodes(it);
        if (it.itemId === p.itemId) { target = it; if (!list.some((c) => barcodeKey(c) === k)) list.push(p.barcode); it.barcodes = list.join(","); }
        else it.barcodes = list.filter((c) => barcodeKey(c) !== k).join(",");
      });
      if (!target) return { error: "Item not found" };
      if (Number(p.qty)) target.quantity = Math.max(0, Number(target.quantity || 0) + Number(p.qty));
      return { ok: true, barcodes: target.barcodes, quantity: Number(p.qty) ? target.quantity : null };
    }
    case "saveAliases": {
      (p.aliases || []).forEach((a) => {
        const alias = String(a.alias).trim().toLowerCase();
        d.aliases = d.aliases.filter((x) => x.alias !== alias);
        d.aliases.push({ alias, itemId: a.itemId, dateAdded: todayISO(), source: a.source || "confirmed" });
      });
      return { ok: true };
    }
    case "removeAlias": {
      d.aliases = d.aliases.filter((x) => x.alias !== String(p.alias).trim().toLowerCase());
      return { ok: true };
    }
    case "deleteLine": {
      d.shoppingList = d.shoppingList.filter((l) => l.lineId !== p.lineId);
      return { ok: true };
    }
    case "deleteLines": {
      const ids = new Set(p.lineIds || []);
      d.shoppingList = d.shoppingList.filter((l) => !ids.has(l.lineId));
      return { ok: true };
    }
    default:
      return { error: `Unknown action: ${action}` };
  }
}

/* ------------------------------------------------------------
   4. CORE LOGIC — the comparison engine
   ------------------------------------------------------------ */

/**
 * Compare selected recipes against inventory.
 * Returns { need, partial, have, optional } arrays of aggregate objects:
 * { name, unit, totalNeeded, haveQty, buyQty, recipes[], linkedItemId,
 *   storeSection, category, unlinked, unitMismatch, subNotes, asked }
 *
 * Amounts for a tracked item are converted into the item's own unit
 * (2 tbsp cumin → 0.13 jar once you've said 1 jar = 16 tbsp). If a
 * conversion isn't known, that ingredient is flagged, never guessed.
 */
function compareRecipesToInventory(recipeIds, includeOptional) {
  const d = state.data;
  const agg = new Map();
  const recipeCounts = recipeIds.reduce((acc, id) => {
    if (id) acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {});

  for (const rawIng of d.recipeIngredients) {
    const multiplier = recipeCounts[rawIng.recipeId] || 0;
    if (!multiplier) continue;
    // Unlinked rows still count as linked when the name matches an item
    // exactly or matches an alias you confirmed. Nothing fuzzier.
    const link = effectiveLink(rawIng);
    const linked = link ? link.item : null;
    const ing = { ...rawIng, linkedItemId: linked ? linked.itemId : "" };
    const isOptional = ing.optional === true || ing.optional === "TRUE";
    const rawQty = Number(ing.quantity || 0) * multiplier;

    let key, inItemUnits = null;
    if (linked) {
      inItemUnits = convertQty(rawQty, ing.unit, linked.unit, linked);
      key = inItemUnits === null ? `id:${linked.itemId}|u:${unitKey(ing.unit)}` : `id:${linked.itemId}`;
    } else {
      key = `nm:${normKey(ing.ingredientName)}|${unitKey(ing.unit)}`;
    }
    key += isOptional ? "|opt" : "";

    const recipe = d.recipes.find((r) => r.recipeId === ing.recipeId);
    const baseRecipeName = recipe ? recipe.recipeName : ing.recipeId;
    const recipeName = multiplier > 1 ? `${baseRecipeName} x${multiplier}` : baseRecipeName;

    if (!agg.has(key)) {
      const mismatch = linked ? inItemUnits === null : false;
      agg.set(key, {
        name: linked ? linked.itemName : ing.ingredientName,
        unit: linked && !mismatch ? linked.unit : ing.unit,
        totalNeeded: 0,
        asked: {},          // what the recipes said, by unit: { tbsp: 2 }
        recipes: [],
        linkedItemId: linked ? linked.itemId : "",
        linked,
        isOptional,
        unlinked: !linked,
        ingredientName: ing.ingredientName,
        unitMismatch: mismatch,
        storeSection: linked ? linked.storeSection : (ing.storeSection || "Other"),
        category: linked ? linked.category : "",
        subNotes: ing.substitutionNotes || "",
      });
    }
    const a = agg.get(key);
    a.totalNeeded += inItemUnits !== null ? inItemUnits : rawQty;
    const u = String(ing.unit || "count");
    a.asked[u] = (a.asked[u] || 0) + rawQty;
    if (!a.recipes.includes(recipeName)) a.recipes.push(recipeName);
    if (ing.substitutionNotes && !a.subNotes.includes(ing.substitutionNotes)) {
      a.subNotes = a.subNotes ? `${a.subNotes}; ${ing.substitutionNotes}` : ing.substitutionNotes;
    }
  }

  const need = [], partial = [], have = [], optional = [];

  for (const a of agg.values()) {
    a.askedLabel = Object.entries(a.asked).map(([u, q]) => `${fmtQty(q)} ${u}`).join(" + ");
    a.converted = !!(a.linked && !a.unitMismatch && Object.keys(a.asked).some((u) => unitKey(u) !== unitKey(a.unit)));
    if (a.isOptional) {
      a.haveQty = a.linked && !a.unitMismatch ? Number(a.linked.quantity || 0) : null;
      a.buyQty = roundBuy(a.totalNeeded, a.unit);
      if (includeOptional) {
        if (a.haveQty !== null && a.haveQty >= a.totalNeeded - 1e-9) have.push(a);
        else optional.push(a);
      } else {
        optional.push(a);
      }
      continue;
    }
    if (!a.linked || a.unitMismatch) {
      // can't compare — always buy the full amount, flag for a human check
      a.haveQty = null;
      a.buyQty = roundBuy(a.totalNeeded, a.unit);
      need.push(a);
      continue;
    }
    const haveQty = Number(a.linked.quantity || 0);
    a.haveQty = haveQty;
    const short = a.totalNeeded - haveQty;
    a.buyQty = short > 1e-9 ? roundBuy(short, a.unit) : 0;
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
    return isLow(it) && !onList.has(it.itemId);
  }).map((it) => ({
    item: it,
    buyQty: lowBuyQty(it),
  }));
}

/** An opened package still counts as one: 0.9 of a gallon isn't "low"
 *  just because recipes took a cup out of it. */
function stockCount(it) {
  return Math.ceil(Number(it.quantity || 0) - 1e-9);
}
function isLow(it) {
  const min = Number(it.minQuantity);
  return !!min && !isNaN(min) && stockCount(it) < min;
}
function lowBuyQty(it) {
  return Math.max(1, Math.ceil(Number(it.minQuantity) - stockCount(it)));
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

  renderQuickChips("inventory");

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
  if (state.lowOnly) items = items.filter(isLow);

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
  else if (isLow(it)) pills.push(`<span class="pill pill-low">Low</span>`);
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
      <span class="qty-val">${fmtQty(qty)}<small>${esc(it.unit)}</small></span>
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
            <p class="recipe-desc">${r.description ? esc(r.description) + " · " : ""}${esc(r.mealType || "dinner")} · ${esc(fmtQty(r.servings))} servings · ${ings.length} ingredients</p>
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
const SLOTS = ["Breakfast", "Lunch", "Dinner"];
// not a recipe, but worth writing down (and nothing to buy)
const SPECIAL_MEALS = { __leftovers: "Leftovers", __out: "Eating out", __fend: "Fend for yourself" };

function getMealWeekStart() {
  return state.mealWeekStart || startOfWeekISO();
}

/** Saved plan for a week as { "Monday|Dinner": "RCP-0001" | "__leftovers" | "" } */
function savedWeek(weekOf) {
  const out = {};
  state.data.mealPlan.forEach((m) => {
    if (m.status === "archived" || m.weekOf !== weekOf) return;
    const special = Object.keys(SPECIAL_MEALS).find((k) => SPECIAL_MEALS[k] === m.notes);
    out[`${m.day}|${m.mealSlot || "Dinner"}`] = m.recipeId || special || "";
  });
  return out;
}

/** Unsaved picks survive tab switches and week hopping until you save. */
function weekPicks(weekOf) {
  state.mealDrafts = state.mealDrafts || {};
  return state.mealDrafts[weekOf] || savedWeek(weekOf);
}

function isDraftDirty(weekOf) {
  const draft = state.mealDrafts?.[weekOf];
  if (!draft) return false;
  const saved = savedWeek(weekOf);
  const keys = new Set([...Object.keys(draft), ...Object.keys(saved)]);
  return [...keys].some((k) => (draft[k] || "") !== (saved[k] || ""));
}

function recipeOptions(selectedId, slot) {
  const want = slot.toLowerCase();
  const recipes = state.data.recipes.filter((r) => r.status === "active").sort((a, b) => a.recipeName.localeCompare(b.recipeName));
  const fits = recipes.filter((r) => { const t = norm(r.mealType); return t === want || t === "any" || (!t && want === "dinner"); });
  const other = recipes.filter((r) => !fits.includes(r));
  const opt = (r) => `<option value="${esc(r.recipeId)}" ${r.recipeId === selectedId ? "selected" : ""}>${esc(r.recipeName)}</option>`;
  return `<option value="">—</option>`
    + (fits.length ? `<optgroup label="${esc(slot)} recipes">${fits.map(opt).join("")}</optgroup>` : "")
    + (other.length ? `<optgroup label="${fits.length ? "Other recipes" : "Recipes"}">${other.map(opt).join("")}</optgroup>` : "")
    + `<optgroup label="No cooking">${Object.entries(SPECIAL_MEALS).map(([k, v]) => `<option value="${k}" ${k === selectedId ? "selected" : ""}>${esc(v)}</option>`).join("")}</optgroup>`;
}

function renderMealPlan() {
  if (!state.mealWeekStart) state.mealWeekStart = startOfWeekISO();
  const weekOf = state.mealWeekStart;
  const weekInput = $("#mealWeekStart");
  if (weekInput && weekInput.value !== weekOf) weekInput.value = weekOf;

  const picks = weekPicks(weekOf);
  const today = localISO(new Date());
  $("#mealPlanGrid").innerHTML = `
    <div class="meal-head" aria-hidden="true"><span></span>${SLOTS.map((s) => `<span>${s}</span>`).join("")}</div>` +
    DAYS.map((day, idx) => {
      const date = addDaysISO(weekOf, idx);
      return `<div class="meal-plan-row ${date === today ? "today" : ""}">
        <div class="meal-day">${esc(day)}<small>${esc(date)}</small></div>
        ${SLOTS.map((slot) => {
          const v = picks[`${day}|${slot}`] || "";
          return `<label class="meal-slot"><span class="meal-slot-label">${slot}</span>
            <select class="input meal-recipe ${v ? "picked" : ""}" data-day="${esc(day)}" data-slot="${slot}" aria-label="${slot} on ${esc(day)}">
              ${recipeOptions(v, slot)}
            </select></label>`;
        }).join("")}
      </div>`;
    }).join("");

  $$(".meal-recipe").forEach((sel) => sel.addEventListener("change", () => {
    const draft = { ...weekPicks(weekOf) };
    draft[`${sel.dataset.day}|${sel.dataset.slot}`] = sel.value;
    state.mealDrafts[weekOf] = draft;
    sel.classList.toggle("picked", !!sel.value);
    drawMealDirty();
  }));
  drawMealDirty();
}

function drawMealDirty() {
  const weekOf = getMealWeekStart();
  const dirty = isDraftDirty(weekOf);
  const el = $("#mealDirty");
  if (el) el.hidden = !dirty;
  const n = Object.values(weekPicks(weekOf)).filter(Boolean).length;
  const c = $("#mealCount");
  if (c) c.textContent = `${n} of 21 meals planned`;
}

function currentMealPlanFromUI() {
  const weekOf = getMealWeekStart();
  const picks = weekPicks(weekOf);
  const entries = [];
  for (const day of DAYS) for (const slot of SLOTS) {
    const v = picks[`${day}|${slot}`];
    if (!v) continue;
    entries.push(SPECIAL_MEALS[v]
      ? { weekOf, day, mealSlot: slot, recipeId: "", notes: SPECIAL_MEALS[v], status: "active" }
      : { weekOf, day, mealSlot: slot, recipeId: v, notes: "", status: "active" });
  }
  return entries;
}

async function saveMealPlan() {
  const weekOf = getMealWeekStart();
  const entries = currentMealPlanFromUI();
  const btn = $("#btnSaveMealPlan");
  btn.disabled = true;
  try {
    await apiPost("saveMealPlan", { weekOf, entries });
    state.data.mealPlan = state.data.mealPlan.filter((m) => m.weekOf !== weekOf).concat(entries);
    delete state.mealDrafts[weekOf];
    renderMealPlan();
    toast(`Saved ${entries.length} meal${entries.length === 1 ? "" : "s"} for the week.`);
  } catch (e) {
    toast(`Save failed: ${e.message}`);
  } finally { btn.disabled = false; }
}

function copyLastWeek() {
  const weekOf = getMealWeekStart();
  const prev = weekPicks(addDaysISO(weekOf, -7));
  if (!Object.values(prev).some(Boolean)) { toast("Nothing planned the week before."); return; }
  state.mealDrafts[weekOf] = { ...prev };
  renderMealPlan();
  toast("Copied last week — tap Save week to keep it.");
}

function openBuildMealPlanListModal() {
  const recipeIds = currentMealPlanFromUI().map((e) => e.recipeId).filter(Boolean);
  if (!recipeIds.length) { toast("Pick at least one recipe first."); return; }
  openPantryCheck(recipeIds, $("#mealIncludeOptional").checked, "mealplan");
}

/* ---------- Shopping list (the receipt) ---------- */

const SECTION_ORDER = () =>
  String(state.data.settings.store_sections || "").split(",").map((s) => s.trim()).filter(Boolean);

function renderShopping() {
  const d = state.data;
  const receipt = $("#receipt");
  const lines = d.shoppingList.filter((l) => l.status !== "cleared");
  renderQuickChips("shopping");

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
  receipt.querySelectorAll(".rl-del").forEach((el) =>
    el.addEventListener("click", () => removeLines([el.dataset.del]))
  );

  $("#listFooter").hidden = false;
  $("#btnClearPurchased").hidden = !(done || lines.some((l) => l.status === "skipped"));
}

function receiptLineHTML(l) {
  const cls = l.status === "purchased" ? "purchased" : l.status === "skipped" ? "skipped" : "";
  const check = l.status === "purchased" ? "✓" : l.status === "skipped" ? "✕" : "";
  return `<div class="receipt-row ${cls}">
    <button class="receipt-line ${cls}" data-line-id="${esc(l.lineId)}">
      <span class="rl-check">${check}</span>
      <span>
        <span class="rl-name">${esc(l.itemName)}</span>
        ${l.whatFor ? `<span class="rl-for">for: ${esc(l.whatFor)}</span>` : ""}
        ${l.notes ? `<span class="rl-note">${esc(l.notes)}</span>` : ""}
      </span>
      <span class="rl-qty">${esc(fmtQty(l.quantityToBuy))} ${esc(l.unit)}</span>
    </button>
    <button class="rl-del" data-del="${esc(l.lineId)}" aria-label="Remove ${esc(l.itemName)} from the list" title="Remove">×</button>
  </div>`;
}

/** Take lines off the list (optimistic), with Undo that puts them back. */
async function removeLines(lineIds, label) {
  const ids = new Set(lineIds);
  const removed = state.data.shoppingList.filter((l) => ids.has(l.lineId));
  if (!removed.length) return;
  state.data.shoppingList = state.data.shoppingList.filter((l) => !ids.has(l.lineId));
  render();
  try {
    await apiPost("deleteLines", { lineIds: [...ids] });
  } catch (e) {
    toast(`Couldn't remove: ${e.message}`);
    await reload();
    return;
  }
  toast(label || (removed.length === 1 ? `Removed ${removed[0].itemName}.` : `Removed ${removed.length} items.`), {
    label: "Undo",
    onClick: async () => {
      const lines = removed.map(({ lineId, dateAdded, ...rest }) => rest);
      try {
        await apiPost("addLines", { lines });
        await reload();
        toast(`Put back ${removed.length === 1 ? removed[0].itemName : removed.length + " items"}.`);
      } catch (e) { toast(`Undo failed: ${e.message}`); }
    },
  });
}

function openClearListModal() {
  const needed = state.data.shoppingList.filter((l) => l.status === "needed");
  const all = state.data.shoppingList;
  // group by where they came from, so a mistaken batch can go in one tap
  const groups = {};
  needed.forEach((l) => { const k = l.whatFor || "Other"; (groups[k] = groups[k] || []).push(l); });
  const keys = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);
  openModal("Remove from the list", `
    <p class="view-hint">Added the wrong things? Remove one batch, or start the list over. You can undo right after.</p>
    ${keys.length > 1 ? keys.map((k, i) => `<div class="cmp-row"><span><strong>${esc(k)}</strong> <span class="cmp-detail">· ${groups[k].length} item${groups[k].length === 1 ? "" : "s"}</span></span>
      <button class="btn btn-ghost btn-sm" data-group="${i}">Remove</button></div>`).join("") : ""}
    <div class="form-actions">
      <button class="btn btn-ghost" id="clrCancel">Cancel</button>
      <button class="btn btn-danger" id="clrAll">Clear whole list (${all.length})</button>
    </div>`);
  $("#clrCancel").addEventListener("click", closeModal);
  $$("[data-group]").forEach((b) => b.addEventListener("click", () => {
    const k = keys[Number(b.dataset.group)];
    closeModal();
    removeLines(groups[k].map((l) => l.lineId), `Removed ${groups[k].length} item${groups[k].length === 1 ? "" : "s"} for “${k}”.`);
  }));
  $("#clrAll").addEventListener("click", () => {
    closeModal();
    removeLines(all.map((l) => l.lineId), `Cleared ${all.length} items.`);
  });
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

/* ---------- Quick add: chips, autocomplete, scanner all land here ---------- */

/** +n / -n to an item's stock. Optimistic; relative on the server. */
async function quickAdjust(itemId, delta, { silent = false, undo = false } = {}) {
  const it = itemById(itemId);
  if (!it) return null;
  const before = Number(it.quantity || 0);
  it.quantity = Math.max(0, Math.round((before + delta) * 1000) / 1000);
  state.data.usage = state.data.usage || {};
  state.data.usage[itemId] = Math.max(0, (state.data.usage[itemId] || 0) + (undo ? -1 : 1));
  if (state.view === "inventory") renderInventory();
  try {
    const res = await apiPost("quickAdd", { itemId, qty: delta, undo });
    if (res.quantity != null) it.quantity = res.quantity;
  } catch (e) {
    it.quantity = before;
    toast(`Save failed: ${e.message}`);
    if (state.view === "inventory") renderInventory();
    return null;
  }
  if (state.view === "inventory") renderInventory();
  if (!silent) {
    const actions = [];
    if (delta > 0 && isPerishable(it)) actions.push({ label: "Use-by", onClick: () => openUseByModal(it, before) });
    actions.push({
      label: "Undo",
      onClick: () => quickAdjust(itemId, -delta, { silent: true, undo: true }).then((r) => r && toast(`Undone — ${it.itemName} back to ${fmtQty(r.quantity)}.`)),
    });
    toast(`${it.itemName} +${delta} → ${fmtQty(it.quantity)} ${it.unit}`, actions);
  }
  return { quantity: it.quantity, before };
}

/** Put an inventory item on the shopping list. Returns false if it's already there. */
async function addItemToList(item, { silent = false } = {}) {
  const already = state.data.shoppingList.find((l) => l.status === "needed" && l.linkedItemId === item.itemId);
  if (already) {
    if (!silent) toast(`${item.itemName} is already on the list.`);
    return false;
  }
  const qty = isLow(item) ? lowBuyQty(item) : 1;
  const line = {
    itemName: item.itemName,
    linkedItemId: item.itemId,
    quantityToBuy: qty,
    unit: item.unit || "count",
    category: item.category || "",
    storeSection: item.storeSection || "Other",
    whatFor: "Quick add",
    sourceType: "manual",
    notes: "",
  };
  let res;
  try {
    res = await apiPost("addLines", { lines: [line] });
  } catch (e) {
    toast(`Save failed: ${e.message}`);
    return false;
  }
  const lineId = res.lineIds?.[0] || `SL-TMP-${Date.now()}`;
  state.data.shoppingList.push({ ...line, lineId, status: "needed", dateAdded: todayISO() });
  state.data.usage = state.data.usage || {};
  state.data.usage[item.itemId] = (state.data.usage[item.itemId] || 0) + 1;
  render();
  if (!silent) {
    toast(`${item.itemName} added to the list.`, {
      label: "Undo",
      onClick: async () => {
        state.data.shoppingList = state.data.shoppingList.filter((l) => l.lineId !== lineId);
        render();
        if (res.lineIds?.[0]) await apiPost("deleteLine", { lineId });
      },
    });
  }
  return true;
}

function quickChipItems(view) {
  const onList = new Set(state.data.shoppingList.filter((l) => l.status === "needed").map((l) => l.linkedItemId).filter(Boolean));
  const isStaple = (i) => (i.staple === true || i.staple === "TRUE" ? 1 : 0);
  return activeItems()
    .filter((i) => view !== "shopping" || !onList.has(i.itemId))
    .sort((a, b) => usageOf(b.itemId) - usageOf(a.itemId) || isStaple(b) - isStaple(a) || String(b.lastUpdated).localeCompare(String(a.lastUpdated)))
    .slice(0, 12);
}

function renderQuickChips(view) {
  const el = $(view === "shopping" ? "#listQuickChips" : "#invQuickChips");
  if (!el) return;
  const items = quickChipItems(view);
  el.innerHTML = items.map((i) => view === "shopping"
    ? `<button class="chip chip-quick" data-item-id="${esc(i.itemId)}" aria-label="Add ${esc(i.itemName)} to the list">+ ${esc(i.itemName)}</button>`
    : `<button class="chip chip-quick" data-item-id="${esc(i.itemId)}" aria-label="Add one ${esc(i.itemName)}">${esc(i.itemName)}<span class="chip-count">${esc(i.quantity)}</span></button>`
  ).join("");
  el.hidden = !items.length;
  el.querySelectorAll(".chip-quick").forEach((c) => c.addEventListener("click", () => {
    const it = itemById(c.dataset.itemId);
    if (!it) return;
    view === "shopping" ? addItemToList(it) : quickAdjust(it.itemId, 1);
  }));
}

/* ---------- Use-by dates on restock ---------- */

/** Worth asking for a date? Items with a "keeps for" setting, a date already,
 *  or in a fresh-food category. */
function isPerishable(item) {
  return Number(item.shelfLifeDays) > 0 || !!item.expirationDate || ["Produce", "Meat", "Dairy"].includes(item.category);
}

function shortDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function daysFromToday(iso) {
  const a = new Date(localISO(new Date()) + "T00:00:00"), b = new Date(iso + "T00:00:00");
  return Math.round((b - a) / 86400000);
}

function useByChoices(item) {
  const today = localISO(new Date());
  const usual = Number(item.shelfLifeDays);
  const out = [];
  if (usual > 0) out.push({ label: "Usual", date: addDaysISO(today, usual), usual: true });
  for (const [n, label] of [[3, "3 days"], [7, "1 week"], [14, "2 weeks"], [30, "1 month"]]) {
    if (n !== usual) out.push({ label, date: addDaysISO(today, n) });
  }
  return out;
}

function useByPickerHTML(item) {
  return `<div class="useby">
    ${useByChoices(item).map((c) => `<button type="button" class="chip chip-date ${c.usual ? "strong" : ""}" data-date="${c.date}">${esc(c.label)}<span class="chip-count">${esc(shortDate(c.date))}</span></button>`).join("")}
    <input type="date" class="input input-sm useby-date" aria-label="Pick a use-by date">
  </div>`;
}

/** Wires a picker; onPick(isoDate) fires once per choice. */
function bindUseByPicker(root, onPick) {
  root.querySelectorAll(".chip-date").forEach((b) => b.addEventListener("click", () => {
    root.querySelectorAll(".chip-date").forEach((x) => x.classList.toggle("active", x === b));
    onPick(b.dataset.date);
  }));
  root.querySelector(".useby-date")?.addEventListener("change", (e) => {
    root.querySelectorAll(".chip-date").forEach((x) => x.classList.remove("active"));
    if (e.target.value) onPick(e.target.value);
  });
}

/**
 * Save a use-by date after restocking. The item keeps the EARLIER date
 * (older stock gets used first) unless the old stock was gone or
 * already past its date. Also learns "keeps for N days".
 */
async function saveUseBy(item, date, prevQty) {
  const today = localISO(new Date());
  const old = item.expirationDate;
  const keepOld = old && Number(prevQty) > 0 && old >= today && old < date;
  const fields = { expirationDate: keepOld ? old : date };
  const days = daysFromToday(date);
  if (days > 0) fields.shelfLifeDays = days;
  try {
    await apiPost("updateItem", { itemId: item.itemId, fields });
    Object.assign(item, fields);
    if (state.view === "inventory") renderInventory();
    return fields.expirationDate;
  } catch (e) { toast(`Save failed: ${e.message}`); return null; }
}

function openUseByModal(item, prevQty) {
  openModal(`Use by — ${item.itemName}`, `
    <p class="view-hint">When should the new ${esc(item.itemName)} be used by? Stocked shows it in “Use first” a few days ahead.</p>
    ${useByPickerHTML(item)}
    <div class="form-actions"><button class="btn btn-ghost" id="ubSkip">Skip</button></div>`);
  $("#ubSkip").addEventListener("click", closeModal);
  bindUseByPicker($(".modal .useby"), async (date) => {
    const kept = await saveUseBy(item, date, prevQty);
    if (!kept) return;
    closeModal();
    toast(kept === date ? `${item.itemName}: use by ${shortDate(date)}.` : `Saved. The older ${item.itemName} still goes first (${shortDate(kept)}).`);
  });
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
    whatFor: `Low stock (${fmtQty(item.quantity)}/${item.minQuantity})`,
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

function openItemModal(itemId, prefill = {}) {
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
      <div class="form-field full"><label>Item name</label><input class="input" id="fName" value="${esc(it?.itemName || prefill.itemName || "")}"></div>
      <div class="form-field"><label>Category</label><select class="input" id="fCat">${catOpts}</select></div>
      <div class="form-field"><label>Location</label><select class="input" id="fLoc">${locOpts}</select></div>
      <div class="form-field"><label>Quantity</label><input class="input" id="fQty" type="number" min="0" step="any" value="${esc(it?.quantity ?? 1)}"></div>
      <div class="form-field"><label>Unit</label><input class="input" id="fUnit" value="${esc(it?.unit || "count")}" placeholder="count, lb, roll…"></div>
      <div class="form-field"><label>Min quantity (low-stock alert)</label><input class="input" id="fMin" type="number" min="0" step="any" value="${esc(it?.minQuantity ?? "")}"></div>
      <div class="form-field"><label>Expiration date</label><input class="input" id="fExp" type="date" value="${esc(it?.expirationDate || "")}"></div>
      <div class="form-field"><label>Store section</label><select class="input" id="fSec">${secOpts}</select></div>
      <div class="form-field"><label>Staple?</label><label class="toggle" style="margin-top:8px"><input type="checkbox" id="fStaple" ${it && (it.staple === true || it.staple === "TRUE") ? "checked" : ""}><span>Recurring staple</span></label></div>
      <div class="form-field full"><label>Notes</label><input class="input" id="fNotes" value="${esc(it?.notes || "")}"></div>
      <div class="form-field"><label>Keeps for (days) <span class="label-hint">— asks for a use-by date on restock</span></label><input class="input" id="fShelf" type="number" min="0" step="1" value="${esc(it?.shelfLifeDays ?? "")}" placeholder="e.g. 7"></div>
      <div class="form-field"><label>Unit conversions <span class="label-hint">— for recipes</span></label><input class="input" id="fConv" value="${esc(it?.conversions || "")}" placeholder="e.g. 1 jar = 16 tbsp"></div>
      ${it ? `
      <div class="form-field full">
        <label>Also called <span class="label-hint">— recipe names that mean this item</span></label>
        <div class="tag-list" id="fAliases"></div>
        <form class="inline-add" id="fAliasForm">
          <input class="input" id="fAliasInput" placeholder="e.g. hamburger meat">
          <button class="btn btn-ghost btn-sm" type="submit">Add</button>
        </form>
      </div>
      <div class="form-field full">
        <label>Barcodes <span class="label-hint">— saved when you scan</span></label>
        <div class="tag-list" id="fBarcodes"></div>
      </div>` : ""}
    </div>
    <div class="form-actions">
      ${it ? `<button class="btn btn-ghost" id="fArchive">Archive</button>` : ""}
      <button class="btn btn-primary" id="fSave">${it ? "Save changes" : "Add item"}</button>
    </div>`);

  if (it) {
    drawItemAliases(it);
    drawItemBarcodes(it);
    $("#fAliasForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const raw = $("#fAliasInput").value;
      const ok = await addAliasFromItem(it, raw);
      if (ok) { $("#fAliasInput").value = ""; drawItemAliases(it); }
    });
  } else {
    // typing a name you already track jumps to that item instead of making a duplicate
    attachAutocomplete($("#fName"), {
      onPick: (existing) => { openItemModal(existing.itemId); toast(`You already track ${existing.itemName} — editing it.`); },
    });
  }

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
      shelfLifeDays: $("#fShelf").value === "" ? "" : Math.max(0, Math.round(Number($("#fShelf").value))),
      conversions: $("#fConv").value.trim(),
    };
    if (!fields.itemName) { toast("Item needs a name."); return; }
    if (fields.conversions && parseConversions(fields.conversions).length !== fields.conversions.split(";").filter((x) => x.trim()).length) {
      toast("Conversions look like: 1 jar = 16 tbsp; 1 stick = 8 tbsp"); return;
    }
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

function drawItemAliases(it) {
  const el = $("#fAliases");
  if (!el) return;
  const list = aliasesFor(it.itemId);
  el.innerHTML = list.length
    ? list.map((a) => `<span class="tag">${esc(a.alias)}<button type="button" data-alias="${esc(a.alias)}" aria-label="Remove alias ${esc(a.alias)}">×</button></span>`).join("")
    : `<span class="tag-empty">None yet. Linking a recipe ingredient adds one.</span>`;
  el.querySelectorAll("[data-alias]").forEach((b) => b.addEventListener("click", async () => {
    const alias = b.dataset.alias;
    try {
      await apiPost("removeAlias", { alias });
      state.data.aliases = state.data.aliases.filter((a) => a.alias !== alias);
      drawItemAliases(it);
      toast(`“${alias}” no longer means ${it.itemName}.`);
    } catch (e) { toast(`Save failed: ${e.message}`); }
  }));
}

function drawItemBarcodes(it) {
  const el = $("#fBarcodes");
  if (!el) return;
  const codes = itemBarcodes(it);
  el.innerHTML = codes.length
    ? codes.map((c) => `<span class="tag tag-mono">${esc(c)}<button type="button" data-code="${esc(c)}" aria-label="Remove barcode ${esc(c)}">×</button></span>`).join("")
    : `<span class="tag-empty">None yet. Scan the package to attach one.</span>`;
  el.querySelectorAll("[data-code]").forEach((b) => b.addEventListener("click", async () => {
    const next = codes.filter((c) => c !== b.dataset.code).join(",");
    try {
      await apiPost("updateItem", { itemId: it.itemId, fields: { barcodes: next } });
      it.barcodes = next;
      drawItemBarcodes(it);
    } catch (e) { toast(`Save failed: ${e.message}`); }
  }));
}

/** Validate + save one alias typed on the item screen. */
async function addAliasFromItem(it, raw) {
  const alias = normKey(raw);
  if (!alias) return false;
  if (normKey(it.itemName) === alias) { toast("That's already the item's name."); return false; }
  const other = activeItems().find((i) => i.itemId !== it.itemId && normKey(i.itemName) === alias);
  if (other) { toast(`“${raw.trim()}” is the name of another item (${other.itemName}).`); return false; }
  const existing = state.data.aliases.find((a) => a.alias === alias);
  if (existing && existing.itemId !== it.itemId) {
    const owner = itemById(existing.itemId);
    toast(`“${alias}” already means ${owner ? owner.itemName : existing.itemId}. Remove it there first.`);
    return false;
  }
  if (existing) return true;
  try {
    await saveAliases([{ alias, itemId: it.itemId, source: "manual" }]);
    return true;
  } catch (e) { toast(`Save failed: ${e.message}`); return false; }
}

async function saveAliases(list) {
  if (!list.length) return;
  await apiPost("saveAliases", { aliases: list });
  state.data.aliases = state.data.aliases || [];
  list.forEach((a) => {
    state.data.aliases = state.data.aliases.filter((x) => x.alias !== a.alias);
    state.data.aliases.push({ alias: a.alias, itemId: a.itemId, dateAdded: todayISO(), source: a.source || "confirmed" });
  });
}

/* ---------- Modals: recipe view/add/edit ---------- */

function ingRowHTML(ing = {}) {
  const optional = ing.optional === true || ing.optional === "TRUE";
  return `<div class="ing-editor" data-link="${esc(ing.linkedItemId || "")}" data-mode="${ing.linkedItemId ? "stored" : ""}"
      data-orig="${esc(ing.ingredientName || "")}" data-optional="${optional ? "1" : ""}" data-sub="${esc(ing.substitutionNotes || "")}">
    <div class="ing-editor-row">
      <input class="input" placeholder="Ingredient" value="${esc(ing.ingredientName || "")}" data-f="name" aria-label="Ingredient name">
      <input class="input" placeholder="Qty" type="number" min="0" step="any" value="${esc(ing.quantity ?? "")}" data-f="qty" aria-label="Quantity">
      <input class="input" placeholder="Unit" value="${esc(ing.unit || "")}" data-f="unit" aria-label="Unit">
      <button type="button" class="btn btn-ghost btn-sm ing-del" title="Remove">✕</button>
    </div>
    <div class="ing-status"></div>
  </div>`;
}

/** What an ingredient row in the editor currently points at. */
function rowLink(row) {
  const name = row.querySelector('[data-f="name"]').value.trim();
  const mode = row.dataset.mode;
  const id = row.dataset.link;
  if (id && (mode === "user" || (mode === "stored" && normKey(name) === normKey(row.dataset.orig)))) {
    const item = itemById(id);
    if (item) return { item, via: mode === "user" ? "picked" : "linked" };
  }
  if (mode === "unlinked") {
    // explicitly unlinked: only an exact item name still wins
    const r = resolveName(name);
    return r && r.via === "name" ? r : null;
  }
  return resolveName(name);
}

function drawIngStatus(row) {
  const el = row.querySelector(".ing-status");
  const name = row.querySelector('[data-f="name"]').value.trim();
  if (!name) { el.innerHTML = ""; el.className = "ing-status"; return; }
  const link = rowLink(row);
  const unit = row.querySelector('[data-f="unit"]').value.trim();

  if (link) {
    const via = link.via === "alias" ? ` <span class="ing-via">· you said “${esc(normKey(name))}” means this</span>`
      : link.via === "picked" ? ` <span class="ing-via">· picked just now</span>` : "";
    const unitWarn = unit && convertQty(1, unit, link.item.unit, link.item) === null
      ? ` <span class="ing-warn">· you track it in ${esc(link.item.unit)} — Stocked will ask how many ${esc(unit)} that is</span>` : "";
    el.className = "ing-status linked";
    el.innerHTML = `<span>✓ ${esc(link.item.itemName)}${via}${unitWarn}</span>
      <button type="button" class="linkish" data-act="change">change</button>`;
  } else {
    const strong = suggestMatches(name, 3).filter((s) => s.strong);
    el.className = "ing-status unlinked";
    el.innerHTML = strong.length
      ? `<span>Not tracked · Is this <strong>${esc(strong[0].item.itemName)}</strong>?</span>
         <button type="button" class="btn btn-ghost btn-sm" data-act="yes" data-item-id="${esc(strong[0].item.itemId)}">Yes</button>
         <button type="button" class="linkish" data-act="change">other…</button>`
      : `<span>Not tracked</span> <button type="button" class="linkish" data-act="change">link to an item…</button>`;
  }

  el.querySelector('[data-act="yes"]')?.addEventListener("click", (e) => pickRowLink(row, e.currentTarget.dataset.itemId));
  el.querySelector('[data-act="change"]')?.addEventListener("click", () => showRowPicker(row, !!link));
}

function pickRowLink(row, itemId) {
  if (itemId === "__none") {
    row.dataset.link = "";
    row.dataset.mode = "unlinked";
  } else {
    row.dataset.link = itemId;
    row.dataset.mode = "user";
    row.dataset.pickedKey = normKey(row.querySelector('[data-f="name"]').value);
  }
  drawIngStatus(row);
}

function showRowPicker(row, isLinked) {
  const el = row.querySelector(".ing-status");
  const name = row.querySelector('[data-f="name"]').value.trim();
  const sugg = suggestMatches(name, 5);
  const suggIds = new Set(sugg.map((s) => s.item.itemId));
  const rest = activeItems().filter((i) => !suggIds.has(i.itemId)).sort((a, b) => a.itemName.localeCompare(b.itemName));
  el.className = "ing-status picking";
  el.innerHTML = `<select class="input input-sm" aria-label="Link ${esc(name)} to an inventory item">
      <option value="">Link “${esc(name)}” to…</option>
      ${isLinked ? `<option value="__none">Not tracked (unlink)</option>` : ""}
      ${sugg.length ? `<optgroup label="Suggested">${sugg.map((s) => `<option value="${esc(s.item.itemId)}">${esc(s.item.itemName)}</option>`).join("")}</optgroup>` : ""}
      <optgroup label="All items">${rest.map((i) => `<option value="${esc(i.itemId)}">${esc(i.itemName)}</option>`).join("")}</optgroup>
    </select>
    <button type="button" class="linkish" data-act="cancel">cancel</button>`;
  const sel = el.querySelector("select");
  sel.focus();
  sel.addEventListener("change", () => { if (sel.value) pickRowLink(row, sel.value); });
  el.querySelector('[data-act="cancel"]').addEventListener("click", () => drawIngStatus(row));
}

function bindIngRow(row) {
  row.querySelector(".ing-del").onclick = () => row.remove();
  const nameInput = row.querySelector('[data-f="name"]');
  let t;
  const onEdit = () => {
    // a pick belongs to the name it was made for
    if (row.dataset.mode === "user" && normKey(nameInput.value) !== row.dataset.pickedKey) {
      row.dataset.link = ""; row.dataset.mode = "";
    }
    clearTimeout(t);
    t = setTimeout(() => drawIngStatus(row), 250);
  };
  nameInput.addEventListener("input", onEdit);
  row.querySelector('[data-f="unit"]').addEventListener("input", onEdit);
  drawIngStatus(row);
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
      <div class="form-field"><label>Meal</label><select class="input" id="rMeal">
        ${["breakfast", "lunch", "dinner", "side", "snack", "any"].map((m) => `<option value="${m}" ${norm(r?.mealType || "dinner") === m ? "selected" : ""}>${m[0].toUpperCase() + m.slice(1)}</option>`).join("")}
      </select></div>
      <div class="form-field"><label>Tags (comma separated)</label><input class="input" id="rTags" value="${esc(r?.tags || "")}"></div>
      <div class="form-field full"><label>Ingredients</label><div id="ingRows">${ings.map(ingRowHTML).join("")}</div>
        <button type="button" class="btn btn-ghost btn-sm" id="rAddIng">+ Ingredient</button>
        <label class="toggle remember-toggle"><input type="checkbox" id="rRemember" checked>
          <span>Remember my matches for future recipes</span></label>
      </div>
      <div class="form-field full"><label>Instructions</label><textarea class="input" id="rInstr" rows="4">${esc(r?.instructions || "")}</textarea></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary" id="rSave">${r ? "Save recipe" : "Add recipe"}</button>
    </div>`);

  $$("#ingRows .ing-editor").forEach(bindIngRow);
  $("#rAddIng").addEventListener("click", () => {
    $("#ingRows").insertAdjacentHTML("beforeend", ingRowHTML());
    const rows = $$("#ingRows .ing-editor");
    bindIngRow(rows[rows.length - 1]);
    rows[rows.length - 1].querySelector("input").focus();
  });

  $("#rSave").addEventListener("click", async () => {
    const name = $("#rName").value.trim();
    if (!name) { toast("Recipe needs a name."); return; }
    const remember = $("#rRemember").checked;
    const newAliases = [];

    const ingredients = $$("#ingRows .ing-editor").map((row) => {
      const get = (f) => row.querySelector(`[data-f="${f}"]`).value.trim();
      const ingName = get("name");
      if (!ingName) return null;
      const link = rowLink(row);
      let linkedItemId = "";
      if (link) {
        const key = normKey(ingName);
        const byName = resolveName(ingName);
        if (link.via === "picked" && remember && key !== normKey(link.item.itemName) && !(byName && byName.via === "name")) {
          // remembered as an alias: this and every future recipe resolves it
          newAliases.push({ alias: key, itemId: link.item.itemId, source: "recipe" });
        } else if (link.via !== "alias") {
          linkedItemId = link.item.itemId;
        }
      }
      return {
        ingredientName: ingName,
        linkedItemId,
        quantity: Number(get("qty") || 1),
        unit: get("unit") || "count",
        optional: row.dataset.optional === "1",
        substitutionNotes: row.dataset.sub || "",
        storeSection: link ? (link.item.storeSection || "Other") : "Other",
      };
    }).filter(Boolean);

    const recipe = {
      recipeName: name,
      description: $("#rDesc").value.trim(),
      servings: Number($("#rServ").value || 4),
      mealType: $("#rMeal").value,
      tags: $("#rTags").value.trim(),
      instructions: $("#rInstr").value,
      notes: r?.notes || "",
    };
    const btn = $("#rSave");
    btn.disabled = true;
    try {
      const uniq = [...new Map(newAliases.map((a) => [a.alias, a])).values()];
      await saveAliases(uniq);
      if (r) await apiPost("updateRecipe", { recipeId: r.recipeId, recipe, ingredients });
      else await apiPost("addRecipe", { recipe, ingredients });
      closeModal();
      await reload();
      toast(`${r ? "Recipe saved" : "Recipe added"}${uniq.length ? ` · remembered ${uniq.map((a) => `“${a.alias}”`).join(", ")}` : ""}.`);
    } catch (e) {
      btn.disabled = false;
      toast(`Save failed: ${e.message}`);
    }
  });
}

/* ---------- Build shopping list flow ---------- */

function openBuildListModal() {
  openPantryCheck([...state.selectedRecipes], $("#includeOptional").checked, "recipes");
}

/**
 * The pantry check shared by the Recipes and Meal Plan tabs.
 * Untracked ingredients get a "Link" button so you can match them
 * right where it matters; the match is remembered as an alias.
 */
function openPantryCheck(recipeIds, includeOptional, ctx) {
  const cmp = compareRecipesToInventory(recipeIds, includeOptional);

  const row = (a, detail) => `<div class="cmp-row">
    <span><strong>${esc(a.name)}</strong> <span class="cmp-detail">— ${esc(a.recipes.join(", "))}</span>
    ${a.subNotes ? `<span class="cmp-detail"><br>sub: ${esc(a.subNotes)}</span>` : ""}</span>
    <span class="cmp-detail cmp-right">${detail}${a.unlinked ? ` <button type="button" class="btn btn-ghost btn-sm cmp-link" data-name="${esc(a.ingredientName)}">Link</button>` : ""}</span>
  </div>`;

  const groupHTML = (key, title, rows) =>
    rows.length ? `<div class="cmp-group ${key}"><h4>${title} (${rows.length})</h4>${rows.join("")}</div>` : "";

  // "needs 2 tbsp (0.13 jar)" when a conversion was used
  const needs = (a) => a.converted ? `needs ${esc(a.askedLabel)} (${fmtQty(a.totalNeeded)} ${esc(a.unit)}) · ` : "";
  const needRows = cmp.need.map((a) => row(a, a.unlinked
    ? `buy ${fmtQty(a.buyQty)} ${esc(a.unit)} · not tracked`
    : a.unitMismatch
      ? `needs ${esc(a.askedLabel)} · you track ${esc(a.linked.unit)} <button type="button" class="btn btn-ghost btn-sm cmp-conv" data-item-id="${esc(a.linkedItemId)}" data-unit="${esc(Object.keys(a.asked)[0])}">Set conversion</button>`
      : `${needs(a)}buy ${fmtQty(a.buyQty)} ${esc(a.unit)}`));
  const partialRows = cmp.partial.map((a) => row(a, `${needs(a)}have ${fmtQty(a.haveQty)}, buy ${fmtQty(a.buyQty)} ${esc(a.unit)}`));
  const haveRows = cmp.have.map((a) => row(a, `${needs(a)}have ${a.haveQty == null ? "✓" : fmtQty(a.haveQty) + " " + esc(a.unit)} — skip`));
  const optRows = cmp.optional.map((a) => row(a, `optional · ${esc(a.askedLabel)}`));

  const toAdd = [...cmp.need, ...cmp.partial, ...(includeOptional ? cmp.optional : [])].filter((a) => a.buyQty > 0);
  const untracked = cmp.need.filter((a) => a.unlinked).length;

  openModal(ctx === "mealplan" ? "Meal plan pantry check" : "Pantry check", `
    ${untracked ? `<p class="view-hint cmp-hint">${untracked} ingredient${untracked === 1 ? " isn't" : "s aren't"} matched to your inventory, so ${untracked === 1 ? "it's" : "they're"} listed in full. Tap <strong>Link</strong> if you already track it under another name.</p>` : ""}
    ${groupHTML("need", "Need to buy", needRows)}
    ${groupHTML("partial", "Partially have", partialRows)}
    ${groupHTML("have", "Already have", haveRows)}
    ${groupHTML("optional", includeOptional ? "Optional — will add" : "Optional — not added", optRows)}
    <div class="form-actions">
      <button class="btn btn-ghost" id="cmpCancel">Cancel</button>
      <button class="btn btn-primary" id="cmpConfirm">Add ${toAdd.length} item${toAdd.length === 1 ? "" : "s"} to list</button>
    </div>`);

  $$(".cmp-link").forEach((b) => b.addEventListener("click", () =>
    openLinkIngredientModal(b.dataset.name, () => openPantryCheck(recipeIds, includeOptional, ctx))
  ));
  $$(".cmp-conv").forEach((b) => b.addEventListener("click", () =>
    openConversionModal(itemById(b.dataset.itemId), b.dataset.unit, () => openPantryCheck(recipeIds, includeOptional, ctx))
  ));
  $("#cmpCancel").addEventListener("click", closeModal);
  $("#cmpConfirm").addEventListener("click", async () => {
    const lines = toAdd.map((a) => ({
      itemName: a.name,
      linkedItemId: a.linkedItemId,
      quantityToBuy: a.buyQty,
      unit: a.unit,
      category: a.category,
      storeSection: a.storeSection || "Other",
      whatFor: ctx === "mealplan" ? `Meal plan: ${a.recipes.join(", ")}` : a.recipes.join(", "),
      sourceType: ctx === "mealplan" ? "meal_plan" : "recipe",
      notes: a.unlinked ? "Not tracked — verify" : a.unitMismatch ? "Units differ — verify" : (a.haveQty ? `Have ${fmtQty(a.haveQty)} of ${fmtQty(a.totalNeeded)} needed` : a.converted ? `Recipes need ${a.askedLabel}` : ""),
    }));
    const res = lines.length ? await apiPost("addLines", { lines }) : {};
    if (ctx === "recipes") state.selectedRecipes.clear();
    closeModal();
    await reload();
    switchView("shopping");
    const added = res.lineIds || [];
    toast(`${lines.length} ${ctx === "mealplan" ? "meal-plan " : ""}item${lines.length === 1 ? "" : "s"} added to the list.`,
      added.length ? { label: "Undo", onClick: () => removeLines(added, `Took those ${added.length} items back off.`) } : null);
  });
}

/** Match one ingredient name to an item, remembered as an alias. */
function openLinkIngredientModal(ingName, back) {
  const sugg = suggestMatches(ingName, 6);
  const key = normKey(ingName);
  openModal(`Link “${ingName}”`, `
    <p class="view-hint">Which inventory item is <strong>${esc(ingName)}</strong>? Stocked will remember it,
      so every recipe that says “${esc(key)}” counts against that item from now on.</p>
    ${sugg.length ? `<div class="form-field"><label>Suggested</label><div class="suggest-row">
      ${sugg.map((s) => `<button class="chip chip-suggest ${s.strong ? "strong" : ""}" data-item-id="${esc(s.item.itemId)}">${esc(s.item.itemName)}</button>`).join("")}
    </div></div>` : ""}
    <div class="form-field"><label>${sugg.length ? "Or search all items" : "Search your items"}</label>
      <input class="input" id="lnkSearch" placeholder="Start typing…"></div>
    <div id="lnkChosen"></div>
    <div class="form-actions">
      <button class="btn btn-ghost" id="lnkBack">Back</button>
      <button class="btn btn-primary" id="lnkSave" disabled>Link it</button>
    </div>`);

  let chosen = null;
  const choose = (item) => {
    chosen = item;
    $("#lnkChosen").innerHTML = `<div class="picked-card">“${esc(key)}” → <strong>${esc(item.itemName)}</strong>
      <span class="cmp-detail">(${esc(item.quantity)} ${esc(item.unit)} · ${esc(item.location)})</span></div>`;
    $$(".chip-suggest").forEach((c) => c.classList.toggle("active", c.dataset.itemId === item.itemId));
    $("#lnkSave").disabled = false;
  };
  $$(".chip-suggest").forEach((c) => c.addEventListener("click", () => choose(itemById(c.dataset.itemId))));
  attachAutocomplete($("#lnkSearch"), { onPick: (item) => { choose(item); $("#lnkSearch").value = item.itemName; } });
  $("#lnkBack").addEventListener("click", back);
  $("#lnkSave").addEventListener("click", async () => {
    if (!chosen) return;
    try {
      await saveAliases([{ alias: key, itemId: chosen.itemId, source: "pantry-check" }]);
      toast(`Got it — “${key}” means ${chosen.itemName}.`);
      back();
    } catch (e) { toast(`Save failed: ${e.message}`); }
  });
}

/** "How many tbsp in 1 jar of Cumin?" — asked once, saved on the item. */
function openConversionModal(item, recipeUnit, back) {
  if (!item) return back();
  openModal(`Units for ${item.itemName}`, `
    <p class="view-hint">Recipes measure this in <strong>${esc(recipeUnit)}</strong>, but you count it in
      <strong>${esc(item.unit)}</strong>. Tell Stocked once and it'll do the math from now on.</p>
    <div class="conv-row">
      <span>1 ${esc(item.unit)} of ${esc(item.itemName)} =</span>
      <input class="input" id="convQty" type="number" min="0" step="any" inputmode="decimal" placeholder="e.g. 16">
      <span>${esc(recipeUnit)}</span>
    </div>
    <p class="view-hint conv-hint">Look at the package: a spice jar is usually about 12–16 tbsp, a stick of butter is 8 tbsp,
      a head of garlic about 10 cloves. A rough number is fine.</p>
    <div class="form-actions">
      <button class="btn btn-ghost" id="convBack">Back</button>
      <button class="btn btn-primary" id="convSave">Save</button>
    </div>`);
  $("#convQty").focus();
  $("#convBack").addEventListener("click", back);
  $("#convSave").addEventListener("click", async () => {
    const n = Number($("#convQty").value);
    if (!(n > 0)) { toast("Enter how many."); return; }
    const entry = formatConversion(1, unitKey(item.unit), n, unitKey(recipeUnit));
    const next = [String(item.conversions || "").trim(), entry].filter(Boolean).join("; ");
    try {
      await apiPost("updateItem", { itemId: item.itemId, fields: { conversions: next } });
      item.conversions = next;
      toast(`Saved: ${entry}.`);
      back();
    } catch (e) { toast(`Save failed: ${e.message}`); }
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
      <p class="view-hint">${esc(linked.itemName)}: ${esc(fmtQty(linked.quantity))} → ${fmtQty(Number(linked.quantity || 0) + Number(line.quantityToBuy || 0))} ${esc(linked.unit)}</p>
      ${isPerishable(linked) ? `<div class="form-field"><label>Use by <span class="label-hint">— optional</span></label>${useByPickerHTML(linked)}</div>` : ""}
      <div class="form-actions">
        <button class="btn btn-ghost" id="pSkip">Skip item</button>
        <button class="btn btn-ghost" id="pOnly">Purchased only</button>
        <button class="btn btn-primary" id="pBoth">Purchased + restock</button>
      </div>`);
    let useBy = "";
    const picker = $(".modal .useby");
    if (picker) bindUseByPicker(picker, (date) => { useBy = date; });
    $("#pBoth").addEventListener("click", async () => {
      const prevQty = Number(linked.quantity || 0);
      await apiPost("markPurchased", { lineId: line.lineId, inventoryDelta: { itemId: linked.itemId, qty: Number(line.quantityToBuy || 0) } });
      if (useBy) await saveUseBy(linked, useBy, prevQty);
      closeModal(); await reload(); toast(`${line.itemName} restocked${useBy ? ` · use by ${shortDate(useBy)}` : ""}.`);
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

  // total per item, in the item's own unit
  const perItem = new Map();
  const rows = [];
  for (const ing of ings) {
    const linked = effectiveLink(ing)?.item || null;
    if (!linked) { rows.push(`<div class="cmp-row"><span>${esc(ing.ingredientName)}</span><span class="cmp-detail">not tracked — no change</span></div>`); continue; }
    const amt = convertQty(Number(ing.quantity || 0), ing.unit, linked.unit, linked);
    if (amt === null) {
      rows.push(`<div class="cmp-row"><span>${esc(ing.ingredientName)}</span><span class="cmp-detail cmp-right">${esc(fmtQty(ing.quantity))} ${esc(ing.unit)} vs ${esc(linked.unit)} — no change
        <button type="button" class="btn btn-ghost btn-sm cmp-conv" data-item-id="${esc(linked.itemId)}" data-unit="${esc(ing.unit)}">Set conversion</button></span></div>`);
      continue;
    }
    const cur = perItem.get(linked.itemId) || { item: linked, qty: 0, asked: [] };
    cur.qty += amt;
    cur.asked.push(`${fmtQty(ing.quantity)} ${ing.unit}`);
    perItem.set(linked.itemId, cur);
  }
  const deductions = [];
  for (const { item, qty, asked } of perItem.values()) {
    const q = Math.round(qty * 1000) / 1000;
    const newQty = Math.max(0, Number(item.quantity || 0) - q);
    deductions.push({ itemId: item.itemId, qty: q });
    const note = asked.some((x) => unitKey(x.split(" ").slice(1).join(" ")) !== unitKey(item.unit)) ? ` <span class="cmp-detail">(${esc(asked.join(" + "))})</span>` : "";
    rows.unshift(`<div class="cmp-row"><span>${esc(item.itemName)}${note}</span><span class="cmp-detail">${esc(fmtQty(item.quantity))} → ${fmtQty(newQty)} ${esc(item.unit)}</span></div>`);
  }

  openModal(`Cooked: ${r.recipeName}`, `
    <p class="view-hint">Confirm and these amounts come out of inventory.</p>
    ${rows.join("")}
    <div class="form-actions">
      <button class="btn btn-ghost" id="ckCancel">Cancel</button>
      <button class="btn btn-primary" id="ckConfirm">Confirm — deduct from inventory</button>
    </div>`);

  $$(".cmp-conv").forEach((b) => b.addEventListener("click", () =>
    openConversionModal(itemById(b.dataset.itemId), b.dataset.unit, () => openCookModal(recipeId))
  ));
  $("#ckCancel").addEventListener("click", closeModal);
  $("#ckConfirm").addEventListener("click", async () => {
    await apiPost("cookRecipe", { recipeId, deductions });
    closeModal();
    await reload();
    toast(`${r.recipeName} cooked — inventory updated.`);
  });
}

/* ---------- Manual list item ---------- */

function openManualModal(prefillName = "") {
  const secOpts = SECTION_ORDER().map((s) => `<option>${esc(s)}</option>`).join("");
  openModal("Add to shopping list", `
    <div class="form-grid">
      <div class="form-field full"><label>Item</label><input class="input" id="mName"></div>
      <div class="form-field"><label>Quantity</label><input class="input" id="mQty" type="number" min="0" step="any" value="1"></div>
      <div class="form-field"><label>Unit</label><input class="input" id="mUnit" value="count"></div>
      <div class="form-field full"><label>Store section</label><select class="input" id="mSec">${secOpts}</select></div>
    </div>
    <div class="form-actions"><button class="btn btn-primary" id="mSave">Add to list</button></div>`);
  if (prefillName) $("#mName").value = prefillName;
  attachAutocomplete($("#mName"), {
    onPick: (item) => {
      $("#mName").value = item.itemName;
      $("#mUnit").value = item.unit || "count";
      if (item.storeSection) $("#mSec").value = item.storeSection;
    },
  });
  $("#mSave").addEventListener("click", async () => {
    const name = $("#mName").value.trim();
    if (!name) { toast("Item needs a name."); return; }
    // link to inventory if the name matches a tracked item (or an alias of one)
    const match = resolveName(name)?.item || null;
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

let modalOnClose = null;
function openModal(title, bodyHTML, { onClose = null } = {}) {
  if (modalOnClose) { const fn = modalOnClose; modalOnClose = null; fn(); }
  modalOnClose = onClose;
  $("#modalTitle").textContent = title;
  $("#modalBody").innerHTML = bodyHTML;
  $("#modalOverlay").hidden = false;
  document.body.style.overflow = "hidden";
}
function closeModal() {
  if (modalOnClose) { const fn = modalOnClose; modalOnClose = null; fn(); }
  $("#modalOverlay").hidden = true;
  document.body.style.overflow = "";
}

let toastTimer;
/** toast("Saved") or toast("Milk +1", { label: "Undo", onClick }) */
function toast(msg, action = null) {
  const t = $("#toast");
  const actions = !action ? [] : Array.isArray(action) ? action : [action];
  t.innerHTML = `<span>${esc(msg)}</span>${actions.map((a, i) => `<button class="toast-btn" type="button" data-i="${i}">${esc(a.label)}</button>`).join("")}`;
  t.querySelectorAll(".toast-btn").forEach((b) => b.addEventListener("click", () => {
    t.hidden = true;
    clearTimeout(toastTimer);
    actions[Number(b.dataset.i)].onClick();
  }, { once: true }));
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, actions.length ? 6000 : 2600);
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
  $("#btnImportRecipes").addEventListener("click", () => openImportModal());
  $("#btnBuildList").addEventListener("click", openBuildListModal);
  $("#btnClearSel").addEventListener("click", () => { state.selectedRecipes.clear(); renderRecipes(); });
  $("#mealWeekStart").addEventListener("change", (e) => { state.mealWeekStart = e.target.value ? startOfWeekISO(e.target.value + "T00:00:00") : ""; renderMealPlan(); });
  $("#btnPrevWeek").addEventListener("click", () => { state.mealWeekStart = addDaysISO(getMealWeekStart(), -7); renderMealPlan(); });
  $("#btnNextWeek").addEventListener("click", () => { state.mealWeekStart = addDaysISO(getMealWeekStart(), 7); renderMealPlan(); });
  $("#btnCopyWeek").addEventListener("click", copyLastWeek);
  $("#btnSaveMealPlan").addEventListener("click", saveMealPlan);
  $("#btnBuildMealPlanList").addEventListener("click", openBuildMealPlanListModal);
  $("#btnAddManual").addEventListener("click", () => openManualModal());

  // quick add: type → pick → done
  attachAutocomplete($("#invQuickInput"), {
    submitOnPick: true,
    onPick: (item) => quickAdjust(item.itemId, 1),
    onCreate: (text) => { $("#invQuickInput").value = ""; openItemModal(null, { itemName: text }); },
    createLabel: (text) => `+ New item “${text}”…`,
  });
  attachAutocomplete($("#listQuickInput"), {
    submitOnPick: true,
    onPick: (item) => addItemToList(item),
    onCreate: (text) => { $("#listQuickInput").value = ""; openManualModal(text); },
    createLabel: (text) => `+ Add “${text}” to the list…`,
  });
  $("#btnScanInv").addEventListener("click", () => openScanner("restock"));
  $("#btnScanList").addEventListener("click", () => openScanner("list"));
  $("#btnCheckStaples").addEventListener("click", addLowStockToList);
  $("#btnClearList").addEventListener("click", openClearListModal);
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
