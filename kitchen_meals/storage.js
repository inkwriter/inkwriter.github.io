// ─── STORAGE & SHEETS SYNC ───────────────────────────────────────
const STORE_PREFIX = "mfp-";

function storeSave(key, value) {
  try { localStorage.setItem(STORE_PREFIX + key, JSON.stringify(value)); }
  catch(e) { console.warn("localStorage save failed:", e); }
}

function storeLoad(key, fallback) {
  try {
    const raw = localStorage.getItem(STORE_PREFIX + key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch(e) { return fallback; }
}

// ─── GOOGLE SHEETS FETCH ─────────────────────────────────────────
function sheetsUrl(tabName) {
  return `https://docs.google.com/spreadsheets/d/e/${CONFIG.PUBLISHED_KEY}/pub?output=csv&sheet=${encodeURIComponent(tabName)}`;
}

function parseCSV(text) {
  const rows = [];
  const lines = text.trim().split("\n");
  for (const line of lines) {
    const cols = [];
    let inQuote = false, cur = "";
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i+1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === "," && !inQuote) {
        cols.push(cur.trim()); cur = "";
      } else { cur += ch; }
    }
    cols.push(cur.trim());
    rows.push(cols);
  }
  return rows;
}

function parseRecipesCSV(text) {
  const [, ...data] = parseCSV(text);
  return data.filter(r => r[1]).map(row => {
    const [id, name, tagsRaw, ingsRaw] = row;
    return {
      id:          id || uid(),
      name,
      tags:        (tagsRaw||"").split(",").map(t=>t.trim()).filter(Boolean),
      ingredients: (ingsRaw||"").split("|").map(s => {
        const [n,q,u] = s.split(":").map(x=>x.trim());
        return n ? { name:n, qty:parseFloat(q)||1, unit:u||"ct" } : null;
      }).filter(Boolean),
    };
  });
}

function parsePantryCSV(text) {
  const [, ...data] = parseCSV(text);
  return data.filter(r => r[1]).map(([id,name,qty,unit,category]) => ({
    id: id||uid(), name,
    qty: parseFloat(qty)||1,
    unit: unit||"ct",
    category: category||"Other",
  }));
}

function parseSettingsCSV(text) {
  const [, ...data] = parseCSV(text);
  const s = { ...DEFAULT_SETTINGS };
  data.forEach(([key,value]) => {
    if (!key) return;
    s[key] = (key==="familySize"||key==="groceryBudget") ? (parseFloat(value)||s[key]) : (value||s[key]);
  });
  return s;
}

async function fetchFromSheets() {
  if (!CONFIG.PUBLISHED_KEY) return null;

  if (!CONFIG.ALWAYS_REFRESH) {
    const age = (Date.now() - storeLoad("sheets-last-fetch", 0)) / 60000;
    if (age < CONFIG.CACHE_MINUTES) return null;
  }

  try {
    const [rRes, pRes, sRes] = await Promise.all([
      fetch(sheetsUrl(CONFIG.TABS.recipes)),
      fetch(sheetsUrl(CONFIG.TABS.pantry)),
      fetch(sheetsUrl(CONFIG.TABS.settings)),
    ]);
    if (!rRes.ok || !pRes.ok || !sRes.ok) throw new Error("Sheet fetch failed");

    const fetched = {
      recipes:  parseRecipesCSV(await rRes.text()),
      pantry:   parsePantryCSV(await pRes.text()),
      settings: parseSettingsCSV(await sRes.text()),
    };

    storeSave("recipes",  fetched.recipes);
    storeSave("pantry",   fetched.pantry);
    storeSave("settings", fetched.settings);
    storeSave("sheets-last-fetch", Date.now());

    console.log(`✅ Synced from Sheets — ${fetched.recipes.length} recipes, ${fetched.pantry.length} pantry items`);
    return fetched;
  } catch(e) {
    console.warn("⚠️ Sheets unavailable — using cached data.", e);
    return null;
  }
}

// ─── APP STATE ────────────────────────────────────────────────────
const State = {
  recipes:       [],
  pantry:        [],
  supplies:      [],
  plan:          {},
  categories:    [],
  settings:      {},
  gchecked:      {},
  groceryExtras: [],

  loadLocal() {
    this.recipes       = storeLoad("recipes",       DEFAULT_RECIPES);
    this.pantry        = storeLoad("pantry",         []);
    this.supplies      = storeLoad("supplies",       DEFAULT_SUPPLIES);
    this.plan          = storeLoad("plan",           emptyPlan());
    this.categories    = storeLoad("categories",     DEFAULT_CATEGORIES);
    this.settings      = storeLoad("settings",       DEFAULT_SETTINGS);
    this.gchecked      = storeLoad("gchecked",       {});
    this.groceryExtras = storeLoad("groceryExtras",  []);
  },

  applySheets(fetched) {
    if (!fetched) return false;
    if (fetched.recipes?.length)  this.recipes  = fetched.recipes;
    if (fetched.pantry)           this.pantry   = fetched.pantry;
    if (fetched.settings)         this.settings = { ...DEFAULT_SETTINGS, ...fetched.settings };
    return true;
  },

  save(key) { storeSave(key, this[key]); },
  set(key, value) { this[key] = value; this.save(key); },
};
