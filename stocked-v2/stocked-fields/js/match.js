/* ============================================================
   Stocked — match.js
   Names, aliases, match suggestions, and the autocomplete box.

   The rule: SUGGEST loosely, LINK strictly.
   - An ingredient links to an item only by an exact normalized
     name match, an alias you confirmed, or a link you picked.
   - Everything fuzzier (word overlap, "Onion" vs "Onion, yellow",
     common synonyms) is only ever offered as a suggestion.
   ============================================================ */

"use strict";

/* ---------- normalization ---------- */

function singularWord(w) {
  if (w.length <= 3) return w;
  if (/ies$/.test(w)) return w.slice(0, -3) + "y";          // berries → berry
  if (/(ch|sh|x|z)es$/.test(w)) return w.slice(0, -2);       // dishes → dish
  if (/sses$/.test(w)) return w.slice(0, -2);                // glasses → glass
  if (/oes$/.test(w)) return w.slice(0, -2);                 // tomatoes → tomato
  if (/(ss|us|is)$/.test(w)) return w;                       // hummus, grass
  if (/s$/.test(w)) return w.slice(0, -1);                   // onions → onion
  return w;
}

/** Canonical key used for exact matching and stored aliases.
 *  "Onions" → "onion", "Half-and-Half" → "half and half". */
function normKey(s) {
  const words = String(s ?? "").toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  words[words.length - 1] = singularWord(words[words.length - 1]);
  return words.join(" ");
}

// Words that describe prep or size, not identity. Only used for
// suggestions — never for automatic links.
const FILLER = new Set(("fresh chopped diced minced sliced shredded grated crushed large small medium " +
  "whole organic boneless skinless raw cooked ripe finely roughly thinly softened melted room temperature " +
  "to taste of the a an and or for plus extra about").split(" "));

function coreTokens(s) {
  return normKey(s).split(" ").filter(Boolean).map(singularWord).filter((w) => !FILLER.has(w));
}

/** "Onion, yellow" → head "onion"; "ground beef" → "beef". */
function headWord(s) {
  const firstPart = String(s ?? "").split(",")[0];
  const t = coreTokens(firstPart);
  return t[t.length - 1] || "";
}

// Common grocery synonyms. These only raise a suggestion to
// "strong" (shown first) — you still confirm it once.
const SYNONYM_GROUPS = [
  ["ground beef", "hamburger meat", "hamburger", "beef mince", "minced beef", "hamburger beef"],
  ["green onion", "scallion", "spring onion"],
  ["chickpea", "garbanzo bean", "garbanzo"],
  ["powdered sugar", "confectioners sugar", "confectioner sugar", "icing sugar"],
  ["cornstarch", "corn starch"],
  ["bell pepper", "sweet pepper", "capsicum"],
  ["zucchini", "courgette"],
  ["eggplant", "aubergine"],
  ["heavy cream", "heavy whipping cream", "whipping cream", "double cream"],
  ["half half", "half n half"],
  ["baking soda", "bicarbonate soda", "bicarb"],
  ["ketchup", "catsup"],
  ["pasta sauce", "marinara", "marinara sauce", "spaghetti sauce"],
  ["cheddar", "cheddar cheese"],
  ["parmesan", "parmesan cheese", "parmigiano", "parmigiano reggiano"],
  ["mozzarella", "mozzarella cheese"],
  ["garlic", "garlic clove", "clove garlic"],
  ["all purpose flour", "ap flour", "plain flour"],
  ["soda", "pop", "soft drink"],
  ["toilet paper", "toilet tissue", "bath tissue"],
  ["paper towel", "kitchen roll"],
  ["dish soap", "dishwashing liquid", "dish detergent", "dish liquid"],
  ["soy sauce", "soya sauce"],
];
const SYN_INDEX = new Map();
SYNONYM_GROUPS.forEach((g, i) => g.forEach((phrase) => SYN_INDEX.set(coreTokens(phrase).join(" "), i)));

/**
 * How likely is ingredient/product name `a` the same thing as item name `b`?
 * Returns { score, strong, reason } — strong suggestions are listed first
 * and phrased as "Is this X?"; weak ones only appear in the picker.
 */
function scoreMatch(a, b) {
  const ta = coreTokens(a), tb = coreTokens(b);
  if (!ta.length || !tb.length) return { score: 0 };
  const ja = ta.join(" "), jb = tb.join(" ");
  const sa = [...ta].sort().join(" "), sb = [...tb].sort().join(" ");

  if (ja === jb || sa === sb) return { score: 0.95, strong: true, reason: "same words" };

  // "Onion" ↔ "Onion, yellow": the part before the comma matches
  const baseA = coreTokens(String(a).split(",")[0]).join(" ");
  const baseB = coreTokens(String(b).split(",")[0]).join(" ");
  if ((String(b).includes(",") && baseB === ja) || (String(a).includes(",") && baseA === jb)) {
    return { score: 0.9, strong: true, reason: "variety" };
  }

  const ga = SYN_INDEX.get(ja), gb = SYN_INDEX.get(jb);
  if (ga !== undefined && ga === gb) return { score: 0.9, strong: true, reason: "synonym" };

  const ha = headWord(a), hb = headWord(b);
  if (ha && ha === hb) {
    const setA = new Set(ta), setB = new Set(tb);
    const subset = ta.every((w) => setB.has(w)) || tb.every((w) => setA.has(w));
    // "cream" vs "sour cream", "butter" vs "peanut butter" land here:
    // shown in the picker, never pre-chosen.
    return { score: subset ? 0.6 : 0.4, strong: false, reason: "similar" };
  }
  return { score: 0 };
}

/* ---------- lookups against the loaded data ---------- */

function activeItems() {
  return (state.data?.inventory || []).filter((i) => i.status === "active");
}

function itemById(id) {
  return state.data?.inventory.find((i) => i.itemId === id) || null;
}

function aliasesFor(itemId) {
  return (state.data?.aliases || []).filter((a) => a.itemId === itemId);
}

/**
 * Strict resolution — the only way an unlinked ingredient gets
 * treated as an inventory item. Exact normalized name, then alias.
 */
function resolveName(name) {
  const k = normKey(name);
  if (!k) return null;
  const byName = activeItems().find((i) => normKey(i.itemName) === k);
  if (byName) return { item: byName, via: "name" };
  const alias = (state.data?.aliases || []).find((a) => String(a.alias) === k);
  if (alias) {
    const item = itemById(alias.itemId);
    if (item && item.status === "active") return { item, via: "alias" };
  }
  return null;
}

/** The item an ingredient row actually points at: stored link first, then strict resolution. */
function effectiveLink(ing) {
  if (ing.linkedItemId) {
    const it = itemById(ing.linkedItemId);
    if (it) return { item: it, via: "linked" };
  }
  return resolveName(ing.ingredientName);
}

/** Ranked suggestions for an unresolved name. */
function suggestMatches(name, limit = 5) {
  const out = [];
  for (const item of activeItems()) {
    let best = scoreMatch(name, item.itemName);
    for (const a of aliasesFor(item.itemId)) {
      const s = scoreMatch(name, a.alias);
      if (s.score > best.score) best = { ...s, reason: `alias “${a.alias}”` };
    }
    if (best.score > 0) out.push({ item, ...best });
  }
  return out.sort((x, y) => y.score - x.score || x.item.itemName.localeCompare(y.item.itemName)).slice(0, limit);
}

/** Items whose whole name appears inside a long product title
 *  ("Great Value 2% Reduced Fat Milk" → Milk). Suggestions only. */
function suggestForProduct(title, limit = 4) {
  const words = new Set(coreTokens(title));
  if (!words.size) return [];
  return activeItems()
    .map((item) => {
      const t = coreTokens(String(item.itemName).split(",")[0]);
      const hit = t.length && t.every((w) => words.has(w));
      return hit ? { item, score: t.length } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || usageOf(b.item.itemId) - usageOf(a.item.itemId))
    .slice(0, limit);
}

function usageOf(itemId) {
  return Number(state.data?.usage?.[itemId] || 0);
}

/* ---------- barcodes ---------- */

/** Clean a scanned/typed code. EAN-13 with a leading 0 is a UPC-A. */
function normBarcode(raw) {
  let s = String(raw ?? "").trim().toUpperCase().replace(/\s+/g, "");
  if (/^\d+$/.test(s)) {
    if (s.length === 13 && s.startsWith("0")) s = s.slice(1);
    if (s.length < 6 || s.length > 14) return "";
  }
  return s;
}

function barcodeKey(code) {
  const s = String(code ?? "").trim().toUpperCase();
  return /^\d+$/.test(s) ? s.replace(/^0+/, "") : s;
}

function itemBarcodes(item) {
  return String(item?.barcodes ?? "").split(/[\s,]+/).filter(Boolean);
}

function findItemByBarcode(code) {
  const k = barcodeKey(code);
  return activeItems().find((i) => itemBarcodes(i).some((c) => barcodeKey(c) === k)) || null;
}

/* ---------- autocomplete ---------- */

/**
 * Turns a text input into an item picker.
 * opts.onPick(item)          — an existing item was chosen
 * opts.onCreate(text)        — "+ Add …" row chosen (omit to hide it)
 * opts.createLabel(text)     — label for that row
 * opts.filter(item)          — optional, hide some items
 * opts.submitOnPick          — clear the box after a pick (quick-add bars)
 */
function attachAutocomplete(input, opts = {}) {
  const wrap = document.createElement("div");
  wrap.className = "ac-wrap";
  input.parentNode.insertBefore(wrap, input);
  wrap.appendChild(input);
  const list = document.createElement("div");
  list.className = "ac-list";
  list.setAttribute("role", "listbox");
  list.hidden = true;
  wrap.appendChild(list);
  input.setAttribute("autocomplete", "off");
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-expanded", "false");

  let rows = [];
  let active = -1;

  const search = (q) => {
    const nq = String(q).trim().toLowerCase();
    if (!nq) return [];
    const kq = normKey(nq);
    const scored = [];
    for (const item of activeItems()) {
      if (opts.filter && !opts.filter(item)) continue;
      const name = String(item.itemName).toLowerCase();
      let rank = null, via = "";
      if (name.startsWith(nq)) rank = 0;
      else if (name.split(/[^a-z0-9]+/).some((w) => w.startsWith(nq))) rank = 1;
      else if (name.includes(nq)) rank = 2;
      if (rank === null) {
        const al = aliasesFor(item.itemId).find((a) => a.alias.startsWith(kq) || a.alias.includes(nq));
        if (al) { rank = 3; via = al.alias; }
      }
      if (rank !== null) scored.push({ item, rank, via });
    }
    scored.sort((a, b) => a.rank - b.rank || usageOf(b.item.itemId) - usageOf(a.item.itemId) || a.item.itemName.localeCompare(b.item.itemName));
    const out = scored.slice(0, opts.limit || 7);
    const exact = resolveName(nq);
    if (opts.onCreate && !exact) out.push({ create: String(q).trim() });
    return out;
  };

  const close = () => { list.hidden = true; input.setAttribute("aria-expanded", "false"); active = -1; };

  const draw = () => {
    rows = search(input.value);
    if (!rows.length) return close();
    list.innerHTML = rows.map((r, i) => r.create
      ? `<div class="ac-item ac-create ${i === active ? "active" : ""}" data-i="${i}" role="option">${esc(opts.createLabel ? opts.createLabel(r.create) : `+ Add “${r.create}”`)}</div>`
      : `<div class="ac-item ${i === active ? "active" : ""}" data-i="${i}" role="option">
          <span class="ac-name">${esc(r.item.itemName)}</span>
          <span class="ac-sub">${r.via ? `aka “${esc(r.via)}” · ` : ""}${esc(r.item.quantity)} ${esc(r.item.unit)} · ${esc(r.item.location)}</span>
        </div>`).join("");
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
  };

  const choose = (i) => {
    const r = rows[i];
    if (!r) return;
    close();
    if (r.create) opts.onCreate?.(r.create);
    else opts.onPick?.(r.item);
    if (opts.submitOnPick) input.value = "";
  };

  input.addEventListener("input", () => { active = -1; draw(); });
  input.addEventListener("focus", () => { if (input.value) draw(); });
  input.addEventListener("blur", () => setTimeout(close, 120));
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (list.hidden) draw();
      if (!rows.length) return;
      e.preventDefault();
      active = (active + (e.key === "ArrowDown" ? 1 : -1) + rows.length) % rows.length;
      draw();
    } else if (e.key === "Enter") {
      if (list.hidden && !input.value.trim()) return;
      e.preventDefault();
      if (active >= 0 && !list.hidden) return choose(active);
      rows = search(input.value);
      const exact = resolveName(input.value);
      const itemIdxs = rows.map((r, i) => (r.create ? -1 : i)).filter((i) => i >= 0);
      if (exact && (!opts.filter || opts.filter(exact.item))) {
        close(); opts.onPick?.(exact.item); if (opts.submitOnPick) input.value = "";
      } else if (itemIdxs.length === 1) choose(itemIdxs[0]);
      else if (opts.onCreate && input.value.trim()) choose(rows.length - 1);
      else if (itemIdxs.length) { active = 0; draw(); }
    } else if (e.key === "Escape") {
      if (!list.hidden) { e.stopPropagation(); close(); }
    }
  });
  // pointerdown so the pick lands before the input blurs
  list.addEventListener("pointerdown", (e) => {
    const el = e.target.closest(".ac-item");
    if (!el) return;
    e.preventDefault();
    choose(Number(el.dataset.i));
  });

  return { close, refresh: draw };
}
