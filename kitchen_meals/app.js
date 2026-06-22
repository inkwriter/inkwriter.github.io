// ─── APP VIEW ────────────────────────────────────────────────────

let _activeRecipeTag = null; // currently selected tag filter

// ── Tab switching ──
function switchTab(id) {
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === id));
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.toggle("hidden", p.id !== "tab-" + id));
  if (id === "plan")     renderPlan();
  if (id === "recipes")  renderRecipes();
  if (id === "pantry")   renderPantry();
  if (id === "supplies") renderSupplies();
  if (id === "grocery")  renderGrocery();
}

// ─────────────────────────────────────────────────────────────────
// PLAN TAB
// ─────────────────────────────────────────────────────────────────
function renderPlan() {
  const plan    = State.plan;
  const recipes = State.recipes;

  const filled = Object.values(plan).flatMap(d => Object.values(d)).filter(Boolean).length;
  document.getElementById("plan-summary").innerHTML = `
    <div class="stat"><span>${filled}</span>planned</div>
    <div class="stat"><span>${21 - filled}</span>open</div>
    <div class="stat"><span>${Math.round(filled / 21 * 100)}%</span>filled</div>
  `;

  const grid = document.getElementById("plan-grid");
  let html = `
    <div class="grid-head" style="border-radius:10px 0 0 0">Day</div>
    <div class="grid-head">Breakfast</div>
    <div class="grid-head">Lunch</div>
    <div class="grid-head" style="border-radius:0 10px 0 0">Dinner</div>
  `;

  DAYS.forEach(day => {
    html += `<div class="grid-day">${day.slice(0, 3)}</div>`;
    MEALS.forEach(meal => {
      const rid = plan[day][meal];
      const rec = recipes.find(r => r.id === rid);
      if (rec) {
        html += `
          <div class="grid-cell">
            <div class="meal-chip" onclick="openPickModal('${day}','${meal}')">
              <span>${rec.name}</span>
              <span class="meal-remove" onclick="clearMeal(event,'${day}','${meal}')" title="Remove">×</span>
            </div>
          </div>`;
      } else {
        html += `
          <div class="grid-cell">
            <div class="meal-empty" onclick="openPickModal('${day}','${meal}')">+ add</div>
          </div>`;
      }
    });
  });

  grid.innerHTML = html;
}

function clearMeal(event, day, meal) {
  event.stopPropagation();
  State.plan[day][meal] = "";
  State.save("plan");
  renderPlan();
}

function clearWeek() {
  if (!confirm("Clear all meals from this week?")) return;
  State.set("plan", emptyPlan());
  renderPlan();
}

// Pick modal
let _pickContext = null;

function openPickModal(day, meal) {
  _pickContext = { day, meal };
  document.getElementById("modal-pick-title").textContent = `${day} — ${meal}`;

  const list = document.getElementById("modal-pick-list");
  list.innerHTML = State.recipes.map(r => `
    <div class="pick-item" onclick="assignMeal('${r.id}')">
      <strong>${r.name}</strong>
      <div>${r.tags.map(t => `<span class="tag">${t}</span>`).join("")}</div>
    </div>
  `).join("");

  document.getElementById("modal-pick").classList.remove("hidden");
}

function assignMeal(recipeId) {
  const { day, meal } = _pickContext;
  State.plan[day][meal] = recipeId;
  State.save("plan");
  closeModal("modal-pick");
  renderPlan();
}

// ─────────────────────────────────────────────────────────────────
// RECIPES TAB
// ─────────────────────────────────────────────────────────────────
function getAllTags() {
  const tags = new Set();
  State.recipes.forEach(r => (r.tags || []).forEach(t => tags.add(t)));
  return [...tags].sort();
}

function renderTagFilters() {
  const tags = getAllTags();
  const wrap = document.getElementById("recipe-tag-filters");
  if (!tags.length) { wrap.innerHTML = ""; return; }

  wrap.innerHTML = tags.map(t => `
    <button class="tag-filter-btn ${_activeRecipeTag === t ? "active" : ""}"
      onclick="toggleTagFilter('${t}')">${t}</button>
  `).join("");
}

function toggleTagFilter(tag) {
  _activeRecipeTag = _activeRecipeTag === tag ? null : tag;
  renderRecipes();
}

function renderRecipes() {
  renderTagFilters();
  const q = (document.getElementById("recipe-search")?.value || "").toLowerCase();
  let filtered = State.recipes.filter(r => r.name.toLowerCase().includes(q));
  if (_activeRecipeTag) {
    filtered = filtered.filter(r => (r.tags || []).includes(_activeRecipeTag));
  }

  document.getElementById("recipe-grid").innerHTML = filtered.map(r => `
    <div class="recipe-card">
      <h3>${r.name}</h3>
      <div class="recipe-tags">${(r.tags || []).map(t => `<span class="tag">${t}</span>`).join("")}</div>
      <div class="ing-preview">
        ${r.ingredients.map(i => `${i.qty} ${i.unit} ${i.name}`).join(" · ")}
      </div>
    </div>
  `).join("") || `<p class="empty-msg">No recipes found.</p>`;
}

// ─────────────────────────────────────────────────────────────────
// PANTRY TAB
// ─────────────────────────────────────────────────────────────────
function initPantrySelects() {
  const unitSel = document.getElementById("pant-unit");
  const catSel  = document.getElementById("pant-cat");
  if (!unitSel.options.length) UNITS.forEach(u => unitSel.add(new Option(u, u)));
  if (!catSel.options.length)  GROCERY_CATS.forEach(c => catSel.add(new Option(c, c)));
}

function renderPantry() {
  initPantrySelects();
  const grid = document.getElementById("pantry-grid");

  if (!State.pantry.length) {
    grid.innerHTML = `<p class="empty-msg">No pantry items yet. Add what you have on hand — they'll be subtracted from your grocery list.</p>`;
    return;
  }

  grid.innerHTML = State.pantry.map(item => `
    <div class="item-card">
      <div class="item-info">
        <div class="item-name">${item.name}</div>
        <div class="item-meta">${item.qty} ${item.unit} · ${item.category}</div>
      </div>
      <button class="btn btn-sm btn-danger" onclick="removePantryItem('${item.id}')">×</button>
    </div>
  `).join("");
}

function addPantryItem() {
  const name = document.getElementById("pant-name").value.trim();
  if (!name) return;
  const item = {
    id:       uid(),
    name,
    qty:      parseFloat(document.getElementById("pant-qty").value) || 1,
    unit:     document.getElementById("pant-unit").value,
    category: document.getElementById("pant-cat").value,
  };
  State.pantry.push(item);
  State.save("pantry");
  document.getElementById("pant-name").value = "";
  document.getElementById("pant-qty").value  = "";
  renderPantry();
  updateEditorCounts();
}

function removePantryItem(id) {
  State.set("pantry", State.pantry.filter(p => p.id !== id));
  renderPantry();
  updateEditorCounts();
}

// ─────────────────────────────────────────────────────────────────
// SUPPLIES TAB
// ─────────────────────────────────────────────────────────────────
function initSupplySelects() {
  const unitSel = document.getElementById("sup-unit");
  const catSel  = document.getElementById("sup-cat");
  if (!unitSel.options.length) UNITS.forEach(u => unitSel.add(new Option(u, u)));
  if (!catSel.options.length)  SUPPLY_CATS.forEach(c => catSel.add(new Option(c, c)));
}

function renderSupplies() {
  initSupplySelects();
  const grid = document.getElementById("supply-grid");

  if (!State.supplies.length) {
    grid.innerHTML = `<p class="empty-msg">No supplies tracked yet.</p>`;
    return;
  }

  // Group by category
  const byCat = {};
  State.supplies.forEach(s => {
    const cat = s.category || "Other";
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push(s);
  });

  grid.innerHTML = Object.entries(byCat).map(([cat, items]) => `
    <div class="supply-cat-head">${cat}</div>
    <div class="supply-group">
      ${items.map(s => {
        const low = s.qty <= s.threshold;
        return `
          <div class="supply-item ${low ? "supply-low" : ""}">
            <div class="supply-info">
              <div class="supply-name">${s.name} ${low ? '<span class="low-badge">LOW</span>' : ""}</div>
              <div class="supply-meta">Reorder at: ${s.threshold} ${s.unit}</div>
            </div>
            <div class="supply-controls">
              <button class="qty-btn" onclick="adjustSupply('${s.id}', -1)">−</button>
              <span class="supply-qty ${low ? "supply-qty--low" : ""}">${s.qty} ${s.unit}</span>
              <button class="qty-btn" onclick="adjustSupply('${s.id}', 1)">+</button>
              <button class="btn btn-sm btn-danger" onclick="removeSupplyItem('${s.id}')" style="margin-left:8px">×</button>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `).join("");
}

function addSupplyItem() {
  const name = document.getElementById("sup-name").value.trim();
  if (!name) return;
  const item = {
    id:        uid(),
    name,
    qty:       parseFloat(document.getElementById("sup-qty").value) || 1,
    unit:      document.getElementById("sup-unit").value,
    threshold: parseFloat(document.getElementById("sup-threshold").value) || 1,
    category:  document.getElementById("sup-cat").value,
  };
  State.supplies.push(item);
  State.save("supplies");
  document.getElementById("sup-name").value      = "";
  document.getElementById("sup-qty").value       = "";
  document.getElementById("sup-threshold").value = "";
  renderSupplies();
  updateEditorCounts();
}

function adjustSupply(id, delta) {
  State.supplies = State.supplies.map(s => {
    if (s.id !== id) return s;
    return { ...s, qty: Math.max(0, s.qty + delta) };
  });
  State.save("supplies");
  renderSupplies();
}

function removeSupplyItem(id) {
  State.set("supplies", State.supplies.filter(s => s.id !== id));
  renderSupplies();
  updateEditorCounts();
}

// ─────────────────────────────────────────────────────────────────
// GROCERY TAB
// ─────────────────────────────────────────────────────────────────
function buildGroceryList() {
  const needed = {};

  // Aggregate ingredients from planned meals
  Object.values(State.plan).forEach(day => {
    Object.values(day).forEach(rid => {
      const rec = State.recipes.find(r => r.id === rid);
      if (!rec) return;
      rec.ingredients.forEach(ing => {
        const k = ing.name.toLowerCase();
        if (!needed[k]) needed[k] = { name: ing.name, qty: 0, unit: ing.unit, category: "Other", source: "meal" };
        needed[k].qty += ing.qty;
      });
    });
  });

  // Subtract pantry
  State.pantry.forEach(p => {
    const k = p.name.toLowerCase();
    if (needed[k]) {
      needed[k].qty -= (p.qty || 0);
      if (needed[k].qty <= 0) delete needed[k];
    }
  });

  // Auto-add supplies below threshold
  State.supplies.forEach(s => {
    if (s.qty <= s.threshold) {
      const k = s.name.toLowerCase();
      if (!needed[k]) {
        needed[k] = {
          name:     s.name,
          qty:      Math.max(1, s.threshold - s.qty + 1),
          unit:     s.unit,
          category: "Household",
          source:   "supply",
        };
      }
    }
  });

  // Add manual extras
  State.groceryExtras.forEach(e => {
    const k = e.name.toLowerCase();
    if (!needed[k]) needed[k] = { ...e, source: "extra" };
  });

  return Object.values(needed);
}

function renderGrocery() {
  const planned = Object.values(State.plan).flatMap(d => Object.values(d)).filter(Boolean).length;
  const lowSupplies = State.supplies.filter(s => s.qty <= s.threshold).length;
  const items   = buildGroceryList();
  const checked = items.filter(i => State.gchecked[i.name]).length;

  document.getElementById("grocery-summary").innerHTML = `
    <div class="stat"><span>${items.length}</span>items</div>
    <div class="stat"><span>${checked}</span>in cart</div>
    <div class="stat"><span>${items.length - checked}</span>remaining</div>
    ${lowSupplies ? `<div class="stat stat--warn"><span>${lowSupplies}</span>low supply</div>` : ""}
  `;

  document.getElementById("clear-checked-btn").style.display = checked > 0 ? "" : "none";

  const listEl  = document.getElementById("grocery-list");
  const emptyEl = document.getElementById("grocery-empty");

  if (!planned && !State.groceryExtras.length && !lowSupplies) {
    listEl.innerHTML = "";
    emptyEl.style.display = "";
    return;
  }
  emptyEl.style.display = "none";

  // Group by category
  const byCategory = {};
  items.forEach(item => {
    const cat = item.category || "Other";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(item);
  });

  // Sort: Household first (supplies), then alphabetical
  const catOrder = ["Household", ...GROCERY_CATS.filter(c => c !== "Household"), "Other"];
  const sorted = Object.entries(byCategory).sort(([a], [b]) => {
    const ai = catOrder.indexOf(a), bi = catOrder.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  listEl.innerHTML = sorted.map(([cat, catItems]) => `
    <div class="grocery-cat-head">${cat}</div>
    ${catItems.map(item => `
      <div class="grocery-item${State.gchecked[item.name] ? " checked" : ""}${item.source === "supply" ? " supply-source" : ""}">
        <input type="checkbox" ${State.gchecked[item.name] ? "checked" : ""}
          onchange="toggleGroceryItem('${item.name}')" />
        <span class="g-name">
          ${item.name}
          ${item.source === "supply" ? '<span class="g-badge">auto</span>' : ""}
        </span>
        <span class="g-qty">${Math.ceil(item.qty * 10) / 10} ${item.unit}</span>
      </div>
    `).join("")}
  `).join("");
}

function toggleGroceryItem(name) {
  State.gchecked[name] = !State.gchecked[name];
  State.save("gchecked");
  renderGrocery();
}

function clearChecked() {
  State.set("gchecked", {});
  renderGrocery();
}

function addGroceryExtra() {
  const input = document.getElementById("grocery-extra");
  const name  = input.value.trim();
  if (!name) return;
  State.groceryExtras.push({ id: uid(), name, qty: 1, unit: "ct", category: "Other" });
  State.save("groceryExtras");
  input.value = "";
  renderGrocery();
}

// ─────────────────────────────────────────────────────────────────
// MODAL HELPERS
// ─────────────────────────────────────────────────────────────────
function closeModal(id) {
  document.getElementById(id).classList.add("hidden");
}
