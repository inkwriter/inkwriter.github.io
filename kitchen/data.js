// data.js — shared storage for Kitchen Inventory
// All data lives in localStorage under 'kitchen_inventory' and 'kitchen_recipes'

const KitchenData = (() => {

  // ── Inventory ──────────────────────────────────────────────────────────────

  function getInventory() {
    try { return JSON.parse(localStorage.getItem('kitchen_inventory')) || []; }
    catch { return []; }
  }

  function saveInventory(items) {
    localStorage.setItem('kitchen_inventory', JSON.stringify(items));
  }

  function addItem(item) {
    const items = getInventory();
    item.id = Date.now().toString();
    items.push(item);
    saveInventory(items);
    return item;
  }

  function updateItem(id, updates) {
    const items = getInventory();
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...updates };
    saveInventory(items);
    return items[idx];
  }

  function deleteItem(id) {
    saveInventory(getInventory().filter(i => i.id !== id));
  }

  function getItemsByLocation(location) {
    return getInventory().filter(i => i.location === location);
  }

  // ── Recipes ────────────────────────────────────────────────────────────────

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

  // ── Meal Matching ──────────────────────────────────────────────────────────

  function matchRecipes() {
    const inventoryNames = getInventory().map(i => i.name.toLowerCase().trim());

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
  // Parse "YYYY-MM-DD" without UTC timezone shift

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
    getInventory, saveInventory, addItem, updateItem, deleteItem, getItemsByLocation,
    getRecipes, saveRecipes, addRecipe, updateRecipe, deleteRecipe, matchRecipes,
    getExpirationStatus, formatExpDate, esc
  };
})();
