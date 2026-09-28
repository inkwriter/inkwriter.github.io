/* ============================================================
   Stocked — units.js
   Unit conversions so "2 tbsp cumin" can count against "1 jar",
   and "8 oz cheese" against "1 lb".

   - Kitchen volume (tsp → gallon) and weight (oz, lb, g, kg)
     convert automatically.
   - Anything package-shaped (jar, can, box, head, stick…) needs a
     per-item conversion you confirm once, e.g. "1 jar = 16 tbsp".
     Stocked asks the first time it needs one and remembers it on
     the item (Inventory → Conversions column).
   - Nothing is ever guessed across volume ↔ weight unless you
     saved a conversion that says so ("1 lb = 3.5 cup").
   ============================================================ */

"use strict";

// base: ml for volume, g for weight
const UNIT_TABLE = {
  tsp: { dim: "vol", f: 4.92892 },
  tbsp: { dim: "vol", f: 14.7868 },
  floz: { dim: "vol", f: 29.5735 },
  cup: { dim: "vol", f: 236.588 },
  pint: { dim: "vol", f: 473.176 },
  quart: { dim: "vol", f: 946.353 },
  gal: { dim: "vol", f: 3785.41 },
  ml: { dim: "vol", f: 1 },
  l: { dim: "vol", f: 1000 },
  g: { dim: "wt", f: 1 },
  kg: { dim: "wt", f: 1000 },
  oz: { dim: "wt", f: 28.3495 },
  lb: { dim: "wt", f: 453.592 },
  count: { dim: "count", f: 1 },
};

const UNIT_ALIASES = {
  t: "tsp", tsp: "tsp", tsps: "tsp", teaspoon: "tsp", teaspoons: "tsp",
  tbsp: "tbsp", tbsps: "tbsp", tbs: "tbsp", tbl: "tbsp", tblsp: "tbsp", tablespoon: "tbsp", tablespoons: "tbsp",
  "fl oz": "floz", floz: "floz", "fluid ounce": "floz", "fluid ounces": "floz", "fl. oz": "floz", "fl.oz": "floz",
  c: "cup", cup: "cup", cups: "cup",
  pt: "pint", pint: "pint", pints: "pint",
  qt: "quart", quart: "quart", quarts: "quart",
  gal: "gal", gallon: "gal", gallons: "gal",
  ml: "ml", milliliter: "ml", milliliters: "ml", millilitre: "ml",
  l: "l", liter: "l", liters: "l", litre: "l", litres: "l",
  g: "g", gram: "g", grams: "g", gr: "g",
  kg: "kg", kilogram: "kg", kilograms: "kg", kilo: "kg", kilos: "kg",
  oz: "oz", ounce: "oz", ounces: "oz",
  lb: "lb", lbs: "lb", pound: "lb", pounds: "lb", "#": "lb",
  count: "count", ct: "count", each: "count", ea: "count", whole: "count", piece: "count", pieces: "count", pc: "count", pcs: "count", "": "count",
};

/** Canonical unit key: "Tablespoons" → "tbsp"; "jars" → "jar". */
function unitKey(u) {
  const s = String(u ?? "").trim().toLowerCase().replace(/\(s\)$/, "").replace(/\.$/, "").replace(/\s+/g, " ");
  if (s in UNIT_ALIASES) return UNIT_ALIASES[s];
  if (s.endsWith("es") && ["boxes", "bunches", "pouches", "packages", "dashes", "pinches"].includes(s)) return s.slice(0, -2);
  if (s.endsWith("s") && s.length > 3 && !s.endsWith("ss")) return s.slice(0, -1); // jars → jar, cans → can
  return s;
}

function isStandardUnit(u) {
  return !!UNIT_TABLE[unitKey(u)] && unitKey(u) !== "count";
}

/** "1 jar = 16 tbsp; 1 stick = 8 tbsp" → [{ a:{q,u}, b:{q,u} }] */
function parseConversions(text) {
  return String(text ?? "").split(/[;\n]+/).map((part) => {
    // "1 jar = 16 tbsp", "jar = 16 tbsp", "1 12-pack = 12 can", "1 bag (2 lb) = 2 lb"
    const sides = part.split("=");
    if (sides.length !== 2) return null;
    const side = (t, needQty) => {
      const m = t.trim().match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d*\.?\d+)\s+(.+)$/) || (needQty ? null : [null, "1", t.trim()]);
      if (!m || !m[2]) return null;
      const q = parseQty(m[1]);
      return q > 0 ? { q, u: unitKey(m[2].replace(/\s*\([^)]*\)\s*/g, " ").trim()) } : null;
    };
    const a = side(sides[0], false), b = side(sides[1], true);
    return a && b && a.u && b.u ? { a, b } : null;
  }).filter(Boolean);
}

function formatConversion(qa, ua, qb, ub) {
  return `${fmtQty(qa)} ${ua} = ${fmtQty(qb)} ${ub}`;
}

/**
 * How many `to` units is `qty` `from` units — for this item?
 * Returns a number, or null if Stocked can't know without asking.
 */
function convertQty(qty, from, to, item = null) {
  const a = unitKey(from), b = unitKey(to);
  if (a === b) return qty;

  // graph: standard edges within a dimension + this item's saved conversions
  const edges = [];
  for (const c of parseConversions(item?.conversions)) edges.push([c.a.u, c.b.u, c.b.q / c.a.q]);
  const factorTo = (x, y) => {
    const ux = UNIT_TABLE[x], uy = UNIT_TABLE[y];
    if (ux && uy && ux.dim === uy.dim && ux.dim !== "count") return ux.f / uy.f;
    return null;
  };
  // breadth-first search over units, multiplying factors
  const seen = new Map([[a, 1]]);
  const queue = [a];
  const allUnits = new Set([a, b, ...edges.flatMap((e) => [e[0], e[1]]), ...Object.keys(UNIT_TABLE)]);
  while (queue.length) {
    const u = queue.shift();
    const f = seen.get(u);
    if (u === b) return qty * f;
    for (const v of allUnits) {
      if (seen.has(v)) continue;
      let k = factorTo(u, v);
      if (k === null) {
        const e = edges.find((e) => e[0] === u && e[1] === v);
        const r = edges.find((e) => e[0] === v && e[1] === u);
        k = e ? e[2] : r ? 1 / r[2] : null;
      }
      if (k !== null) { seen.set(v, f * k); queue.push(v); }
    }
  }
  return null;
}

/** 0.3333 → "0.33", 2 → "2", 1.5 → "1.5" */
function fmtQty(n) {
  const x = Number(n);
  if (!isFinite(x)) return String(n ?? "");
  return String(Math.round(x * 100) / 100);
}

/** Round a buy amount sensibly: whole packages/counts round up; weights & volumes to 2 decimals. */
function roundBuy(qty, unit) {
  if (qty <= 0) return 0;
  return isStandardUnit(unit) ? Math.ceil(qty * 100) / 100 : Math.ceil(qty - 1e-9);
}

/** "1 1/2", "½", "1.5", "2-3" (takes the high end) → number */
function parseQty(s) {
  let t = String(s ?? "").trim()
    .replace(/½/g, " 1/2").replace(/⅓/g, " 1/3").replace(/⅔/g, " 2/3").replace(/¼/g, " 1/4")
    .replace(/¾/g, " 3/4").replace(/⅛/g, " 1/8").replace(/⅜/g, " 3/8").trim();
  const range = t.match(/^([\d.\/\s]+)\s*(?:-|–|to)\s*([\d.\/\s]+)$/);
  if (range) t = range[2].trim();
  let total = 0, any = false;
  for (const part of t.split(/\s+/)) {
    if (/^\d+\/\d+$/.test(part)) { const [n, d] = part.split("/").map(Number); if (d) { total += n / d; any = true; } }
    else if (/^\d*\.?\d+$/.test(part)) { total += Number(part); any = true; }
    else return any ? total : 0;
  }
  return any ? total : 0;
}
