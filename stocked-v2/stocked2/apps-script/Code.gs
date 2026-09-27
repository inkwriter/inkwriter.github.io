/**
 * ============================================================
 * Stocked — Google Apps Script backend (Code.gs)
 * ============================================================
 * Paste this into Extensions → Apps Script inside your Google
 * Sheet, run setupSheet() once, then deploy as a Web App.
 * See README.md for the full walkthrough.
 *
 * Endpoints:
 *   GET  ?action=getAll&token=...   → all tabs as JSON
 *   POST { token, action, payload } → one mutation, logged
 *
 * Upgrades run by themselves on the first request after you deploy:
 *   v3 — "Barcodes" column on Inventory + new "Aliases" tab
 *   v4 — "Shelf Life Days" and "Conversions" columns on Inventory,
 *        three-slot meal plan, bulk recipe import
 * Existing rows are never touched.
 * ============================================================
 */

const SCHEMA_VERSION = "4";

// ---------- Tab definitions (single source of truth) ----------

const TABS = {
  Inventory: ["Item ID","Item Name","Category","Location","Quantity","Unit","Min Quantity","Expiration Date","Store Section","Staple","Default Location","Notes","Last Updated","Status","Barcodes","Shelf Life Days","Conversions"],
  Locations: ["Location ID","Location Name","Zone","Sort Order","Status"],
  Categories: ["Category ID","Category Name","Type","Default Store Section","Status"],
  Recipes: ["Recipe ID","Recipe Name","Description","Servings","Meal Type","Tags","Instructions","Notes","Times Cooked","Status"],
  RecipeIngredients: ["Recipe ID","Ingredient Name","Linked Item ID","Quantity","Unit","Optional","Substitution Notes","Store Section"],
  ShoppingList: ["Line ID","Item Name","Linked Item ID","Quantity to Buy","Unit","Category","Store Section","What It's For","Source Type","Status","Date Added","Notes"],
  MealPlan: ["Week Of","Day","Meal Slot","Recipe ID","Notes","Status"],
  Settings: ["Key","Value"],
  ChangeLog: ["Timestamp","Action","Target","Old Value","New Value","Source"],
  Aliases: ["Alias","Item ID","Date Added","Source"],
};

// camelCase keys used in JSON, mapped per tab in header order
const KEYS = {
  Inventory: ["itemId","itemName","category","location","quantity","unit","minQuantity","expirationDate","storeSection","staple","defaultLocation","notes","lastUpdated","status","barcodes","shelfLifeDays","conversions"],
  Locations: ["locationId","locationName","zone","sortOrder","status"],
  Categories: ["categoryId","categoryName","type","defaultStoreSection","status"],
  Recipes: ["recipeId","recipeName","description","servings","mealType","tags","instructions","notes","timesCooked","status"],
  RecipeIngredients: ["recipeId","ingredientName","linkedItemId","quantity","unit","optional","substitutionNotes","storeSection"],
  ShoppingList: ["lineId","itemName","linkedItemId","quantityToBuy","unit","category","storeSection","whatFor","sourceType","status","dateAdded","notes"],
  MealPlan: ["weekOf","day","mealSlot","recipeId","notes","status"],
  Aliases: ["alias","itemId","dateAdded","source"],
};

// ---------- One-time setup: builds every tab + sample data ----------

function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(TABS).forEach(function (name) {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.appendRow(TABS[name]);
      sh.getRange(1, 1, 1, TABS[name].length).setFontWeight("bold");
      sh.setFrozenRows(1);
    }
  });

  const settings = ss.getSheetByName("Settings");
  if (settings.getLastRow() < 2) {
    settings.getRange(2, 1, 5, 2).setValues([
      ["api_token", "change-me"],
      ["expiring_soon_days", "5"],
      ["store_sections", "Produce,Meat,Dairy,Frozen,Canned,Dry Goods,Spices,Paper Goods,Toiletries,Cleaning,Household,Pharmacy,Other"],
      ["next_item_id", "1"],
      ["next_line_id", "1"],
    ]);
  }

  const loc = ss.getSheetByName("Locations");
  if (loc.getLastRow() < 2) {
    loc.getRange(2, 1, 8, 5).setValues([
      ["LOC-001","Fridge","Kitchen",1,"active"],
      ["LOC-002","Freezer","Kitchen",2,"active"],
      ["LOC-003","Pantry","Kitchen",3,"active"],
      ["LOC-004","Kitchen Cabinets","Kitchen",4,"active"],
      ["LOC-005","Spice Rack","Kitchen",5,"active"],
      ["LOC-006","Bathroom Closet","Bathroom",6,"active"],
      ["LOC-007","Laundry Room","Utility",7,"active"],
      ["LOC-008","Garage","Storage",8,"active"],
    ]);
  }

  const cat = ss.getSheetByName("Categories");
  if (cat.getLastRow() < 2) {
    cat.getRange(2, 1, 9, 5).setValues([
      ["CAT-001","Produce","food","Produce","active"],
      ["CAT-002","Meat","food","Meat","active"],
      ["CAT-003","Dairy","food","Dairy","active"],
      ["CAT-004","Dry Goods","food","Dry Goods","active"],
      ["CAT-005","Spices","food","Spices","active"],
      ["CAT-006","Paper Goods","household","Paper Goods","active"],
      ["CAT-007","Toiletries","household","Toiletries","active"],
      ["CAT-008","Cleaning","household","Cleaning","active"],
      ["CAT-009","Household","household","Household","active"],
    ]);
  }

  ensureSchema();
}

/**
 * Brings an existing Sheet up to the current schema without
 * touching data: creates missing tabs, appends missing header
 * columns, and keeps barcode/alias columns as plain text so
 * Sheets doesn't strip leading zeros off UPCs.
 * Runs automatically on the first request after a deploy.
 */
function ensureSchema() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(TABS).forEach(function (name) {
    let sh = ss.getSheetByName(name);
    if (!sh) {
      try { sh = ss.insertSheet(name); } catch (e) { sh = ss.getSheetByName(name); }
    }
    const want = TABS[name];
    if (sh.getLastRow() === 0) {
      sh.appendRow(want);
      sh.getRange(1, 1, 1, want.length).setFontWeight("bold");
      sh.setFrozenRows(1);
      return;
    }
    const have = sh.getLastColumn();
    if (have < want.length) {
      if (sh.getMaxColumns() < want.length) {
        sh.insertColumnsAfter(sh.getMaxColumns(), want.length - sh.getMaxColumns());
      }
      sh.getRange(1, have + 1, 1, want.length - have)
        .setValues([want.slice(have)])
        .setFontWeight("bold");
    }
  });

  const inv = ss.getSheetByName("Inventory");
  const bcCol = TABS.Inventory.indexOf("Barcodes") + 1;
  inv.getRange(1, bcCol, inv.getMaxRows(), 1).setNumberFormat("@");
  const cvCol = TABS.Inventory.indexOf("Conversions") + 1;
  inv.getRange(1, cvCol, inv.getMaxRows(), 1).setNumberFormat("@");
  const al = ss.getSheetByName("Aliases");
  al.getRange(1, 1, al.getMaxRows(), 1).setNumberFormat("@");

  setSetting("schema_version", SCHEMA_VERSION);
}

function ensureSchemaIfNeeded(settings) {
  if ((settings || readSettings()).schema_version !== SCHEMA_VERSION) ensureSchema();
}

// ---------- Helpers ----------

function sheet(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

function readTab(name) {
  const sh = sheet(name);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const values = sh.getRange(2, 1, last - 1, TABS[name].length).getValues();
  const keys = KEYS[name];
  return values.map(function (row) {
    const obj = {};
    keys.forEach(function (k, i) {
      let v = row[i];
      if (v instanceof Date) v = Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
      if (k === "barcodes" || k === "alias") v = String(v);
      obj[k] = v;
    });
    return obj;
  });
}

function readSettings() {
  const sh = sheet("Settings");
  const last = sh.getLastRow();
  const out = {};
  if (last < 2) return out;
  sh.getRange(2, 1, last - 1, 2).getValues().forEach(function (r) {
    if (r[0]) out[String(r[0])] = String(r[1]);
  });
  return out;
}

function setSetting(key, value) {
  const sh = sheet("Settings");
  const last = sh.getLastRow();
  const keys = sh.getRange(2, 1, Math.max(last - 1, 1), 1).getValues().map(function (r) { return String(r[0]); });
  const idx = keys.indexOf(key);
  if (idx >= 0) sh.getRange(idx + 2, 2).setValue(value);
  else sh.appendRow([key, value]);
}

function nextId(counterKey, prefix, pad) {
  const settings = readSettings();
  const n = parseInt(settings[counterKey] || "1", 10);
  setSetting(counterKey, String(n + 1));
  let s = String(n);
  while (s.length < pad) s = "0" + s;
  return prefix + "-" + s;
}

function findRow(tabName, keyCol, keyVal) {
  const sh = sheet(tabName);
  const last = sh.getLastRow();
  if (last < 2) return -1;
  const col = sh.getRange(2, keyCol, last - 1, 1).getValues();
  for (let i = 0; i < col.length; i++) {
    if (String(col[i][0]) === String(keyVal)) return i + 2; // sheet row number
  }
  return -1;
}

function updateFields(tabName, rowNum, fields) {
  const keys = KEYS[tabName];
  const sh = sheet(tabName);
  Object.keys(fields).forEach(function (k) {
    const i = keys.indexOf(k);
    if (i >= 0) sh.getRange(rowNum, i + 1).setValue(fields[k]);
  });
}

function objToRow(tabName, obj) {
  return KEYS[tabName].map(function (k) { return obj[k] !== undefined ? obj[k] : ""; });
}

function log(action, target, oldVal, newVal) {
  sheet("ChangeLog").appendRow([new Date(), action, target, String(oldVal || ""), String(newVal || ""), "webapp"]);
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function checkToken(token, settings) {
  const expected = (settings || readSettings()).api_token || "";
  return expected !== "" && token === expected;
}

// ---------- GET: read everything ----------

function doGet(e) {
  try {
    const settings = readSettings();
    if (!checkToken(e.parameter.token, settings)) return json({ error: "Bad token" });
    if (e.parameter.action !== "getAll") return json({ error: "Unknown action" });
    if (settings.schema_version !== SCHEMA_VERSION) {
      const lock = LockService.getScriptLock();
      lock.waitLock(10000);
      try { ensureSchemaIfNeeded(); } finally { lock.releaseLock(); }
    }
    const inventory = readTab("Inventory");
    return json({
      inventory: inventory,
      aliases: readTab("Aliases"),
      usage: usageCounts(inventory),
      locations: readTab("Locations"),
      categories: readTab("Categories"),
      recipes: readTab("Recipes"),
      recipeIngredients: readTab("RecipeIngredients"),
      shoppingList: readTab("ShoppingList"),
      mealPlan: readTab("MealPlan"),
      settings: readSettings(),
    });
  } catch (err) {
    return json({ error: String(err) });
  }
}

// ---------- POST: one mutation per request ----------

function doPost(e) {
  // A document lock prevents two phones writing at the same instant.
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const body = JSON.parse(e.postData.contents);
    const settings = readSettings();
    if (!checkToken(body.token, settings)) return json({ error: "Bad token" });
    ensureSchemaIfNeeded(settings);
    const p = body.payload || {};

    switch (body.action) {

      case "addItem": {
        const itemId = nextId("next_item_id", "ITM", 4);
        const item = Object.assign({}, p, {
          itemId: itemId,
          lastUpdated: todayStr(),
          status: "active",
        });
        sheet("Inventory").appendRow(objToRow("Inventory", item));
        log("add_item", itemId, "", item.itemName + " qty=" + item.quantity);
        return json({ ok: true, item: item });
      }

      case "updateItem": {
        const row = findRow("Inventory", 1, p.itemId);
        if (row < 0) return json({ error: "Item not found: " + p.itemId });
        const oldQty = sheet("Inventory").getRange(row, 5).getValue();
        const fields = Object.assign({}, p.fields, { lastUpdated: todayStr() });
        updateFields("Inventory", row, fields);
        log("update_item", p.itemId, "qty=" + oldQty, JSON.stringify(p.fields));
        return json({ ok: true });
      }

      case "addRecipe": {
        const recipeId = nextRecipeId();
        const recipe = Object.assign({}, p.recipe, { recipeId: recipeId, timesCooked: 0, status: "active" });
        sheet("Recipes").appendRow(objToRow("Recipes", recipe));
        (p.ingredients || []).forEach(function (ing) {
          sheet("RecipeIngredients").appendRow(objToRow("RecipeIngredients", Object.assign({}, ing, { recipeId: recipeId })));
        });
        log("add_recipe", recipeId, "", recipe.recipeName);
        return json({ ok: true, recipeId: recipeId });
      }

      case "updateRecipe": {
        const row = findRow("Recipes", 1, p.recipeId);
        if (row < 0) return json({ error: "Recipe not found" });
        updateFields("Recipes", row, p.recipe);
        // replace ingredient rows: delete old, append new
        deleteIngredientRows(p.recipeId);
        (p.ingredients || []).forEach(function (ing) {
          sheet("RecipeIngredients").appendRow(objToRow("RecipeIngredients", Object.assign({}, ing, { recipeId: p.recipeId })));
        });
        log("update_recipe", p.recipeId, "", p.recipe.recipeName || "");
        return json({ ok: true });
      }

      case "addLines": {
        const lineIds = [];
        (p.lines || []).forEach(function (line) {
          const lineId = nextId("next_line_id", "SL", 4);
          const full = Object.assign({}, line, { lineId: lineId, dateAdded: todayStr(), status: "needed" });
          sheet("ShoppingList").appendRow(objToRow("ShoppingList", full));
          log("add_line", lineId, full.linkedItemId || "", full.itemName + " x" + full.quantityToBuy);
          lineIds.push(lineId);
        });
        return json({ ok: true, lineIds: lineIds });
      }

      case "updateLine": {
        const row = findRow("ShoppingList", 1, p.lineId);
        if (row < 0) return json({ error: "Line not found" });
        updateFields("ShoppingList", row, p.fields);
        log("update_line", p.lineId, "", JSON.stringify(p.fields));
        return json({ ok: true });
      }

      case "markPurchased": {
        const row = findRow("ShoppingList", 1, p.lineId);
        if (row < 0) return json({ error: "Line not found" });
        updateFields("ShoppingList", row, { status: "purchased" });
        if (p.inventoryDelta) {
          const iRow = findRow("Inventory", 1, p.inventoryDelta.itemId);
          if (iRow > 0) {
            const cur = Number(sheet("Inventory").getRange(iRow, 5).getValue() || 0);
            const next = cur + Number(p.inventoryDelta.qty || 0);
            updateFields("Inventory", iRow, { quantity: next, lastUpdated: todayStr() });
            log("restock", p.inventoryDelta.itemId, "qty=" + cur, "qty=" + next);
          }
        }
        log("mark_purchased", p.lineId, "needed", "purchased");
        return json({ ok: true });
      }

      case "cookRecipe": {
        (p.deductions || []).forEach(function (ded) {
          const iRow = findRow("Inventory", 1, ded.itemId);
          if (iRow > 0) {
            const cur = Number(sheet("Inventory").getRange(iRow, 5).getValue() || 0);
            const next = Math.max(0, Math.round((cur - Number(ded.qty || 0)) * 1000) / 1000);
            updateFields("Inventory", iRow, { quantity: next, lastUpdated: todayStr() });
            log("deduct", ded.itemId, "qty=" + cur, "qty=" + next);
          }
        });
        const rRow = findRow("Recipes", 1, p.recipeId);
        if (rRow > 0) {
          const times = Number(sheet("Recipes").getRange(rRow, 9).getValue() || 0);
          sheet("Recipes").getRange(rRow, 9).setValue(times + 1);
        }
        log("cook_recipe", p.recipeId, "", (p.deductions || []).length + " deductions");
        return json({ ok: true });
      }

      case "saveMealPlan": {
        if (!p.weekOf) return json({ error: "Missing weekOf" });
        const SLOTS = ["Breakfast", "Lunch", "Dinner"];
        deleteMealPlanRows(p.weekOf); // the whole week, every slot
        let n = 0;
        (p.entries || []).forEach(function (entry) {
          if (!entry.recipeId && !entry.notes) return;
          const slot = SLOTS.indexOf(entry.mealSlot) >= 0 ? entry.mealSlot : "Dinner";
          const full = Object.assign({}, entry, { weekOf: p.weekOf, mealSlot: slot, status: "active" });
          sheet("MealPlan").appendRow(objToRow("MealPlan", full));
          n++;
        });
        log("save_meal_plan", p.weekOf, "", n + " meals");
        return json({ ok: true });
      }

      // Many recipes in one request (the Import box).
      case "addRecipes": {
        const ids = [];
        (p.recipes || []).forEach(function (r) {
          const recipeId = nextRecipeId();
          const recipe = Object.assign({}, r.recipe, { recipeId: recipeId, timesCooked: 0, status: "active" });
          sheet("Recipes").appendRow(objToRow("Recipes", recipe));
          const rows = (r.ingredients || []).map(function (ing) {
            return objToRow("RecipeIngredients", Object.assign({}, ing, { recipeId: recipeId }));
          });
          if (rows.length) {
            const sh = sheet("RecipeIngredients");
            const start = sh.getLastRow() + 1;
            const spare = sh.getMaxRows() - start + 1;
            if (spare < rows.length) sh.insertRowsAfter(sh.getMaxRows(), rows.length - spare);
            sh.getRange(start, 1, rows.length, rows[0].length).setValues(rows);
          }
          log("add_recipe", recipeId, "import", recipe.recipeName);
          ids.push(recipeId);
        });
        return json({ ok: true, recipeIds: ids });
      }

      case "clearDone": {
        const sh = sheet("ShoppingList");
        const last = sh.getLastRow();
        if (last >= 2) {
          const statusCol = sh.getRange(2, 10, last - 1, 1).getValues();
          // delete bottom-up so row numbers stay valid
          for (let i = statusCol.length - 1; i >= 0; i--) {
            const s = String(statusCol[i][0]);
            if (s === "purchased" || s === "skipped") sh.deleteRow(i + 2);
          }
        }
        log("clear_done", "ShoppingList", "", "");
        return json({ ok: true });
      }

      // ---- v3: quick add, barcodes, aliases ----

      // Relative change (+1 / -1) so two phones scanning at once
      // can't overwrite each other's counts.
      case "quickAdd": {
        const row = findRow("Inventory", 1, p.itemId);
        if (row < 0) return json({ error: "Item not found: " + p.itemId });
        const cur = Number(sheet("Inventory").getRange(row, 5).getValue() || 0);
        const next = Math.max(0, Math.round((cur + Number(p.qty || 0)) * 1000) / 1000);
        updateFields("Inventory", row, { quantity: next, lastUpdated: todayStr() });
        log(p.undo ? "quick_add_undo" : "quick_add", p.itemId, "qty=" + cur, "qty=" + next);
        return json({ ok: true, quantity: next });
      }

      // Attach a barcode to an item (moving it off any other item),
      // optionally bumping quantity in the same request.
      case "linkBarcode": {
        const code = String(p.barcode || "").trim();
        if (!code) return json({ error: "Missing barcode" });
        const key = barcodeKey(code);
        const sh = sheet("Inventory");
        const col = KEYS.Inventory.indexOf("barcodes") + 1;
        const last = sh.getLastRow();
        let target = -1;
        if (last >= 2) {
          const ids = sh.getRange(2, 1, last - 1, 1).getValues();
          const codes = sh.getRange(2, col, last - 1, 1).getValues();
          for (let i = 0; i < ids.length; i++) {
            const list = splitCodes(codes[i][0]);
            if (String(ids[i][0]) === String(p.itemId)) { target = i + 2; continue; }
            const kept = list.filter(function (c) { return barcodeKey(c) !== key; });
            if (kept.length !== list.length) {
              sh.getRange(i + 2, col).setValue(kept.join(","));
              log("move_barcode", String(ids[i][0]), code, "");
            }
          }
        }
        if (target < 0) return json({ error: "Item not found: " + p.itemId });
        const mine = splitCodes(sh.getRange(target, col).getValue());
        if (!mine.some(function (c) { return barcodeKey(c) === key; })) mine.push(code);
        const fields = { barcodes: mine.join(","), lastUpdated: todayStr() };
        let qty = null;
        if (Number(p.qty)) {
          const cur = Number(sh.getRange(target, 5).getValue() || 0);
          qty = Math.max(0, cur + Number(p.qty));
          fields.quantity = qty;
        }
        updateFields("Inventory", target, fields);
        log("link_barcode", p.itemId, "", code);
        return json({ ok: true, barcodes: fields.barcodes, quantity: qty });
      }

      // Upsert aliases: [{ alias, itemId }]. One alias → one item.
      case "saveAliases": {
        const sh = sheet("Aliases");
        (p.aliases || []).forEach(function (a) {
          const alias = String(a.alias || "").trim().toLowerCase();
          if (!alias || !a.itemId) return;
          const row = findRow("Aliases", 1, alias);
          if (row > 0) {
            const old = sh.getRange(row, 2).getValue();
            sh.getRange(row, 2, 1, 3).setValues([[a.itemId, todayStr(), a.source || "confirmed"]]);
            log("update_alias", alias, old, a.itemId);
          } else {
            sh.appendRow([alias, a.itemId, todayStr(), a.source || "confirmed"]);
            log("add_alias", alias, "", a.itemId);
          }
        });
        return json({ ok: true });
      }

      case "removeAlias": {
        const alias = String(p.alias || "").trim().toLowerCase();
        const row = findRow("Aliases", 1, alias);
        if (row > 0) {
          const old = sheet("Aliases").getRange(row, 2).getValue();
          sheet("Aliases").deleteRow(row);
          log("remove_alias", alias, old, "");
        }
        return json({ ok: true });
      }

      case "deleteLine": {
        const row = findRow("ShoppingList", 1, p.lineId);
        if (row > 0) sheet("ShoppingList").deleteRow(row);
        log("delete_line", p.lineId, "", "");
        return json({ ok: true });
      }

      default:
        return json({ error: "Unknown action: " + body.action });
    }
  } catch (err) {
    return json({ error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// ---------- small utilities ----------

// "041220576180" and "0041220576180" (UPC-A vs EAN-13) are the
// same product; so is a code whose leading zeros Sheets ate.
function barcodeKey(code) {
  const s = String(code || "").trim().toUpperCase();
  return /^\d+$/.test(s) ? s.replace(/^0+/, "") : s;
}

function splitCodes(cell) {
  return String(cell == null ? "" : cell).split(/[\s,]+/).filter(String);
}

/**
 * How often each item gets added/restocked, from the most recent
 * ChangeLog rows. Drives the quick-add chips. { itemId: count }
 */
function usageCounts(inventory) {
  const sh = sheet("ChangeLog");
  const last = sh.getLastRow();
  const counts = {};
  if (last < 2) return counts;
  const n = Math.min(2000, last - 1);
  const rows = sh.getRange(last - n + 1, 1, n, 5).getValues();
  const byName = {};
  (inventory || []).forEach(function (it) { byName[String(it.itemName).toLowerCase()] = it.itemId; });
  const bump = function (id, by) { if (id) counts[id] = (counts[id] || 0) + by; };

  rows.forEach(function (r) {
    const action = String(r[1]), target = String(r[2]), oldV = String(r[3]), newV = String(r[4]);
    switch (action) {
      case "quick_add":
      case "restock":
      case "add_item":
      case "link_barcode":
        bump(target, 1); break;
      case "quick_add_undo":
        bump(target, -1); break;
      case "add_line":
        bump(/^ITM-/.test(oldV) ? oldV : byName[newV.replace(/ x[\d.]+$/, "").toLowerCase()], 1); break;
      case "update_item": {
        const before = Number((oldV.match(/qty=([\d.]+)/) || [])[1]);
        const after = Number((newV.match(/"quantity":([\d.]+)/) || [])[1]);
        if (!isNaN(before) && !isNaN(after) && after > before) bump(target, 1);
        break;
      }
    }
  });
  Object.keys(counts).forEach(function (k) { if (counts[k] <= 0) delete counts[k]; });
  return counts;
}

function todayStr() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function nextRecipeId() {
  const sh = sheet("Recipes");
  const last = sh.getLastRow();
  let max = 0;
  if (last >= 2) {
    sh.getRange(2, 1, last - 1, 1).getValues().forEach(function (r) {
      const m = String(r[0]).match(/RCP-(\d+)/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
  }
  let s = String(max + 1);
  while (s.length < 4) s = "0" + s;
  return "RCP-" + s;
}

function deleteIngredientRows(recipeId) {
  const sh = sheet("RecipeIngredients");
  const last = sh.getLastRow();
  if (last < 2) return;
  const ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = ids.length - 1; i >= 0; i--) {
    if (String(ids[i][0]) === String(recipeId)) sh.deleteRow(i + 2);
  }
}

function deleteMealPlanRows(weekOf, mealSlot) {
  const sh = sheet("MealPlan");
  const last = sh.getLastRow();
  if (last < 2) return;
  const values = sh.getRange(2, 1, last - 1, TABS.MealPlan.length).getValues();
  for (let i = values.length - 1; i >= 0; i--) {
    const rowWeek = values[i][0] instanceof Date
      ? Utilities.formatDate(values[i][0], Session.getScriptTimeZone(), "yyyy-MM-dd")
      : String(values[i][0]);
    const rowSlot = String(values[i][2]);
    if (rowWeek === String(weekOf) && (!mealSlot || rowSlot === String(mealSlot))) sh.deleteRow(i + 2);
  }
}

/**
 * OPTIONAL: daily low-stock check via a time trigger.
 * In the Apps Script editor: Triggers → Add Trigger →
 * lowStockDaily, time-driven, day timer.
 * Adds any staple below its minimum to the shopping list
 * (skipping items already on it).
 */
function lowStockDaily() {
  const inv = readTab("Inventory");
  const list = readTab("ShoppingList");
  const onList = {};
  list.forEach(function (l) { if (l.status === "needed" && l.linkedItemId) onList[l.linkedItemId] = true; });

  inv.forEach(function (it) {
    const min = Number(it.minQuantity);
    if (it.status !== "active" || !min || isNaN(min)) return;
    // an opened package still counts as one (0.9 gal of milk isn't "low")
    const have = Math.ceil(Number(it.quantity || 0) - 1e-9);
    if (have >= min || onList[it.itemId]) return;
    const lineId = nextId("next_line_id", "SL", 4);
    sheet("ShoppingList").appendRow(objToRow("ShoppingList", {
      lineId: lineId,
      itemName: it.itemName,
      linkedItemId: it.itemId,
      quantityToBuy: Math.max(1, Math.ceil(min - have)),
      unit: it.unit,
      category: it.category,
      storeSection: it.storeSection || "Other",
      whatFor: "Low stock (" + it.quantity + "/" + min + ")",
      sourceType: "low_stock",
      status: "needed",
      dateAdded: todayStr(),
      notes: "",
    }));
    log("auto_low_stock", it.itemId, "", it.itemName);
  });
}
