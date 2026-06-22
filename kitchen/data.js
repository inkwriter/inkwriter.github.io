// data.js — Kitchen Inventory shared helpers
// Inventory: loaded from inventory.csv (read-only, edit the file and push to update)
// Recipes:   stored in localStorage (editable from the app)

const KitchenData = (() => {

  // ── CSV loader ─────────────────────────────────────────────────────────────
  // Fetches inventory.csv, parses it, returns array of item objects.
  // Adds a generated id (row index) so the rest of the app can reference items.

  async function loadInventory() {
    const res = await fetch('inventory.csv?v=' + Date.now()); // bust cache
    if (!res.ok) throw new Error('Could not load inventory.csv');
    const text = await res.text();
    return parseCSV(text);
  }

  function parseCSV(text) {
    const lines = text.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());

    return lines.slice(1).map((line, idx) => {
      const values = splitCSVLine(line);
      const obj = { id: String(idx) };
      headers.forEach((h, i) => {
        obj[h] = (values[i] || '').trim();
      });
      // normalize lowStock to boolean
      obj.lowStock = obj.lowStock === 'true';
      return obj;
    });
  }

  // Handles quoted fields with commas inside them
  function splitCSVLine(line) {
    const result = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === ',' && !inQuote) { result.push(cur); cur = ''; continue; }
      cur += ch;
    }
    result.push(cur);
    return result;
  }

  function getItemsByLocation(items, location) {
    return items.filter(i => i.location === location);
  }

  // ── Recipes (localStorage) ─────────────────────────────────────────────────

  function getRecipes() {
    try { return JSON.parse(localStorage.getItem('kitchen_recipes')) || []; }
    catch { return []; }
  }

  function saveRecipes(recipes) {
    localStorage.setItem('kitchen_recipes', JSON.stringify(recipes));
  }

  function addRecipe(recipe) {
    const recipes = getRecipes();
    recipe.id = Date.now().toString();
    recipes.push(recipe);
    saveRecipes(recipes);
    return recipe;
  }

  function updateRecipe(id, updates) {
    const recipes = getRecipes();
    const idx = recipes.findIndex(r => r.id === id);
    if (idx === -1) return null;
    recipes[idx] = { ...recipes[idx], ...updates };
    saveRecipes(recipes);
    return recipes[idx];
  }

  function deleteRecipe(id) {
    saveRecipes(getRecipes().filter(r => r.id !== id));
  }

  // ── Meal matching ──────────────────────────────────────────────────────────

  function matchRecipes(inventory) {
    const inventoryNames = inventory.map(i => i.name.toLowerCase().trim());

    return getRecipes().map(recipe => {
      const ingredients = recipe.ingredients || [];
      const matched = [];
      const missing = [];

      ingredients.forEach(ing => {
        const name = ing.toLowerCase().trim();
        const found = inventoryNames.some(inv => inv.includes(name) || name.includes(inv));
        found ? matched.push(ing) : missing.push(ing);
      });

      const score = ingredients.length > 0
        ? Math.round((matched.length / ingredients.length) * 100)
        : 0;

      return { ...recipe, matched, missing, score };
    }).sort((a, b) => b.score - a.score);
  }

  // ── Date helpers ───────────────────────────────────────────────────────────

  function parseLocalDate(dateStr) {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function getExpirationStatus(dateStr) {
    if (!dateStr) return 'none';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = parseLocalDate(dateStr);
    const diff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
    if (diff < 0)  return 'expired';
    if (diff <= 3) return 'soon';
    if (diff <= 7) return 'week';
    return 'ok';
  }

  function formatExpDate(dateStr) {
    const d = parseLocalDate(dateStr);
    if (!d) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // ── HTML escaping ──────────────────────────────────────────────────────────

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  return {
    loadInventory, getItemsByLocation,
    getRecipes, addRecipe, updateRecipe, deleteRecipe, matchRecipes,
    getExpirationStatus, formatExpDate, esc
  };
})();
