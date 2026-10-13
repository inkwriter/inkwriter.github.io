/* ============================================================
   Stocked — recipe-import.js
   Paste recipes as plain text, preview, add them all at once.

   Format (forgiving — Claude can write this from photos, links
   or Trello cards):

     # Taco Soup
     meal: dinner | servings: 6 | tags: soup, crockpot
     - 1 lb ground beef
     - 1 (15 oz) can black beans
     - 1 packet taco seasoning
     - salt and pepper, to taste
     - 1 cup shredded cheese (optional)
     Steps:
     1. Brown the beef...
     Notes: Freezes well.

   Recipes are separated by the "# Name" lines.
   ============================================================ */

"use strict";

const PACKAGE_UNITS = new Set(("can jar box bag pack package packet envelope bunch clove head stick slice bottle carton " +
  "container pinch dash sprig loaf roll bar block tube tub sleeve pouch").split(" "));

function isUnitWord(w) {
  const k = unitKey(w);
  return (k in UNIT_TABLE && k !== "count") || PACKAGE_UNITS.has(k) || ["fl oz", "fluid ounce"].includes(String(w).toLowerCase());
}

/** "1 (15 oz) can black beans, drained" → { quantity:1, unit:"can", ingredientName:"black beans", note:"15 oz", optional:false } */
function parseIngredientLine(line) {
  let t = String(line).replace(/^\s*(?:[-*•·]|\d+[.)])\s+/, "").trim();
  if (!t) return null;
  let optional = false;
  if (/\(\s*optional\s*\)|,?\s*optional\s*$/i.test(t)) {
    optional = true;
    t = t.replace(/\(\s*optional\s*\)|,?\s*optional\s*$/i, "").trim();
  }
  if (/\bto taste\b|\bas needed\b|\bfor serving\b|\bfor garnish\b/i.test(t)) optional = true;

  // leading quantity: 1, 1.5, 1 1/2, ½, 2-3
  const qm = t.match(/^((?:\d+\s+)?\d+\/\d+|\d*\.?\d+(?:\s*[½⅓⅔¼¾⅛])?|[½⅓⅔¼¾⅛])(?:\s*(?:-|–|to)\s*(\d+\/\d+|\d*\.?\d+))?\s*/);
  let qty = 0;
  if (qm) { qty = parseQty(qm[2] || qm[1]); t = t.slice(qm[0].length); }

  // "(15 oz)" package size note
  let note = "";
  const pm = t.match(/^\(([^)]*)\)\s*/);
  if (pm) { note = pm[1]; t = t.slice(pm[0].length); }

  // unit: two-word ("fl oz") then one-word
  let unit = "";
  const words = t.split(/\s+/);
  if (words.length > 1 && isUnitWord(`${words[0]} ${words[1]}`)) { unit = unitKey(`${words[0]} ${words[1]}`); words.splice(0, 2); }
  else if (words.length > 1 && isUnitWord(words[0].replace(/\.$/, ""))) { unit = unitKey(words[0].replace(/\.$/, "")); words.splice(0, 1); }
  let name = words.join(" ").replace(/^of\s+/i, "");

  // prep notes after a comma aren't part of the item's identity
  name = name.split(",")[0].replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim()
    .replace(/^(?:extra[- ]large|large|medium|small|jumbo)\s+/i, "");
  if (!name) return null;

  if (!qty) { qty = optional ? 0 : 1; }
  return {
    ingredientName: name[0].toUpperCase() + name.slice(1),
    quantity: Math.round(qty * 1000) / 1000,
    unit: unit || (optional && !qm ? "to taste" : "count"),
    optional,
    note,
  };
}

function parseRecipeText(text) {
  const recipes = [];
  let cur = null, section = "ingredients";
  const lines = String(text).replace(/\r/g, "").split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    const head = line.match(/^#{1,3}\s*(.+)$/);
    if (head) {
      cur = { recipeName: head[1].trim(), mealType: "dinner", servings: 4, tags: "", description: "", instructions: [], notes: [], ingredients: [] };
      recipes.push(cur); section = "ingredients"; continue;
    }
    if (!cur || !line) continue;

    if (/^(meal|servings|serves|tags|source|description)\s*:/i.test(line)) {
      for (const part of line.split("|")) {
        const m = part.match(/^\s*(\w+)\s*:\s*(.*)$/);
        if (!m) continue;
        const k = m[1].toLowerCase(), v = m[2].trim();
        if (k === "meal") cur.mealType = v.toLowerCase();
        else if (k === "servings" || k === "serves") cur.servings = parseQty(v) || 4;
        else if (k === "tags") cur.tags = v;
        else if (k === "source") cur.notes.push(`Source: ${v}`);
        else if (k === "description") cur.description = v;
      }
      continue;
    }
    if (/^(steps|instructions|directions|method)\s*:?\s*$/i.test(line)) { section = "steps"; continue; }
    if (/^ingredients\s*:?\s*$/i.test(line)) { section = "ingredients"; continue; }
    const nm = line.match(/^notes?\s*:\s*(.*)$/i);
    if (nm) { section = "notes"; if (nm[1]) cur.notes.push(nm[1]); continue; }

    if (section === "ingredients" && /^[-*•·]/.test(line)) {
      const ing = parseIngredientLine(line);
      if (ing) cur.ingredients.push(ing);
    } else if (section === "notes") cur.notes.push(line);
    else if (section === "ingredients" && !cur.ingredients.length) {
      // a line of text before any ingredients is a description, not step 1
      cur.description = cur.description ? `${cur.description} ${line}` : line;
    } else { section = "steps"; cur.instructions.push(line); }
  }
  return recipes.map((r) => ({ ...r, instructions: r.instructions.join("\n"), notes: r.notes.join("\n") }));
}

/* ---------- the Import sheet ---------- */

function openImportModal(prefill = "") {
  openModal("Import recipes", `
    <p class="view-hint">Paste recipes in the format below (Claude can write this for you from photos, links or Trello),
      then check the preview.</p>
    <textarea class="input import-text" id="impText" rows="12" spellcheck="false" placeholder="# Taco Soup
meal: dinner | servings: 6 | tags: soup
- 1 lb ground beef
- 1 (15 oz) can black beans
- salt and pepper, to taste
Steps:
1. Brown the beef…">${esc(prefill)}</textarea>
    <div class="form-actions">
      <button class="btn btn-ghost" id="impCancel">Cancel</button>
      <button class="btn btn-primary" id="impPreview">Preview</button>
    </div>`);
  $("#impCancel").addEventListener("click", closeModal);
  $("#impPreview").addEventListener("click", () => {
    const text = $("#impText").value;
    const parsed = parseRecipeText(text);
    if (!parsed.length) { toast("Couldn't find any recipes — each one starts with “# Name”."); return; }
    openImportPreview(parsed, text);
  });
}

function openImportPreview(parsed, text) {
  const existing = new Set(state.data.recipes.filter((r) => r.status === "active").map((r) => normKey(r.recipeName)));
  const cards = parsed.map((r, i) => {
    const dup = existing.has(normKey(r.recipeName));
    const rows = r.ingredients.map((ing) => {
      const link = resolveName(ing.ingredientName);
      const conv = link && convertQty(1, ing.unit, link.item.unit, link.item) === null && !ing.optional;
      const status = link
        ? `<span class="imp-ok">✓ ${esc(link.item.itemName)}</span>${conv ? ` <span class="ing-warn">· units: ${esc(link.item.unit)}</span>` : ""}`
        : `<span class="imp-new">not tracked</span>`;
      return `<div class="imp-ing"><span>${ing.optional ? "<em>opt</em> " : ""}${esc(fmtQty(ing.quantity))} ${esc(ing.unit)} <strong>${esc(ing.ingredientName)}</strong>${ing.note ? ` <span class="cmp-detail">(${esc(ing.note)})</span>` : ""}</span>${status}</div>`;
    }).join("");
    return `<div class="imp-card ${dup ? "dup" : ""}">
      <label class="imp-title"><input type="checkbox" class="imp-pick" data-i="${i}" ${dup ? "" : "checked"}>
        <strong>${esc(r.recipeName)}</strong>
        <span class="cmp-detail">${esc(r.mealType)} · ${esc(fmtQty(r.servings))} servings · ${r.ingredients.length} ingredients${r.instructions ? " · steps" : ""}</span></label>
      ${dup ? `<p class="imp-dup">You already have a recipe with this name — unchecked so it isn't added twice.</p>` : ""}
      <div class="imp-ings">${rows || `<span class="cmp-detail">No ingredients found.</span>`}</div>
    </div>`;
  }).join("");

  openModal(`Import ${parsed.length} recipe${parsed.length === 1 ? "" : "s"}`, `
    <p class="view-hint">Ingredients link to your pantry by exact name or a name you've linked before.
      “Not tracked” ones can be linked later from the recipe or the pantry check.</p>
    ${cards}
    <div class="form-actions">
      <button class="btn btn-ghost" id="impBack">Back</button>
      <button class="btn btn-primary" id="impGo">Add recipes</button>
    </div>`);

  const count = () => $$(".imp-pick").filter((c) => c.checked).length;
  const label = () => { const n = count(); $("#impGo").textContent = `Add ${n} recipe${n === 1 ? "" : "s"}`; $("#impGo").disabled = !n; };
  $$(".imp-pick").forEach((c) => c.addEventListener("change", label));
  label();
  $("#impBack").addEventListener("click", () => openImportModal(text));
  $("#impGo").addEventListener("click", async () => {
    const picks = $$(".imp-pick").filter((c) => c.checked).map((c) => parsed[Number(c.dataset.i)]);
    const payload = picks.map((r) => ({
      recipe: {
        recipeName: r.recipeName,
        description: r.description,
        servings: r.servings,
        mealType: r.mealType,
        tags: r.tags,
        instructions: r.instructions,
        notes: r.notes,
      },
      ingredients: r.ingredients.map((ing) => {
        const link = resolveName(ing.ingredientName);
        return {
          ingredientName: ing.ingredientName,
          linkedItemId: link && link.via === "name" ? link.item.itemId : "",
          quantity: ing.quantity,
          unit: ing.unit,
          optional: ing.optional,
          substitutionNotes: "",
          storeSection: link ? (link.item.storeSection || "Other") : "Other",
        };
      }),
    }));
    const btn = $("#impGo");
    btn.disabled = true;
    btn.textContent = "Adding…";
    try {
      await apiPost("addRecipes", { recipes: payload });
      closeModal();
      await reload();
      toast(`Added ${payload.length} recipe${payload.length === 1 ? "" : "s"}.`);
    } catch (e) {
      btn.disabled = false;
      label();
      toast(`Import failed: ${e.message}`);
    }
  });
}
