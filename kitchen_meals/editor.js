// ─── EDITOR VIEW ─────────────────────────────────────────────────

const EDITOR_MODULES = [
  {
    id:      "recipes",
    label:   "Recipes",
    icon:    "📖",
    addLabel: "Add Recipe",
    fields: [
      { key: "name",        label: "Name",        type: "text",        required: true, placeholder: "Recipe name" },
      { key: "tags",        label: "Tags",         type: "tags",        placeholder: "dinner, quick…" },
      { key: "ingredients", label: "Ingredients",  type: "ingredients" },
    ],
    getData:    ()    => State.recipes,
    setData:    (val) => { State.set("recipes", val); },
    newItem:    ()    => ({ id: uid(), name: "", tags: [], ingredients: [] }),
  },
  {
    id:      "pantry",
    label:   "Pantry",
    icon:    "🥫",
    addLabel: "Add Item",
    fields: [
      { key: "name",     label: "Item",     type: "text",   required: true },
      { key: "qty",      label: "Qty",      type: "number", width: 70 },
      { key: "unit",     label: "Unit",     type: "select", options: () => UNITS,        width: 90 },
      { key: "category", label: "Category", type: "select", options: () => GROCERY_CATS },
    ],
    getData:    ()    => State.pantry,
    setData:    (val) => { State.set("pantry", val); },
    newItem:    ()    => ({ id: uid(), name: "", qty: 1, unit: "ct", category: "Other" }),
  },
  {
    id:      "supplies",
    label:   "Supplies",
    icon:    "🧻",
    addLabel: "Add Supply",
    fields: [
      { key: "name",      label: "Item",       type: "text",   required: true },
      { key: "qty",       label: "Qty",        type: "number", width: 70 },
      { key: "unit",      label: "Unit",       type: "select", options: () => UNITS,       width: 90 },
      { key: "threshold", label: "Reorder at", type: "number", width: 90 },
      { key: "category",  label: "Category",   type: "select", options: () => SUPPLY_CATS },
    ],
    getData:    ()    => State.supplies,
    setData:    (val) => { State.set("supplies", val); },
    newItem:    ()    => ({ id: uid(), name: "", qty: 1, unit: "ct", threshold: 1, category: "Other" }),
  },
  {
    id:      "categories",
    label:   "Grocery Cats",
    icon:    "🏷️",
    addLabel: "Add Category",
    fields: [
      { key: "name",  label: "Category", type: "text",   required: true },
      { key: "color", label: "Color",    type: "color",  width: 90 },
      { key: "order", label: "Order",    type: "number", width: 60 },
    ],
    getData:    ()    => State.categories,
    setData:    (val) => { State.set("categories", val); },
    newItem:    ()    => ({ id: uid(), name: "", color: "#2a5c45", order: 99 }),
  },
  {
    id:        "settings",
    label:     "Settings",
    icon:      "⚙️",
    singleton: true,
    fields: [
      { key: "familyName",    label: "Family name",              type: "text" },
      { key: "familySize",    label: "Family size",              type: "number" },
      { key: "groceryBudget", label: "Weekly grocery budget ($)", type: "number" },
      { key: "primaryStore",  label: "Primary store",            type: "text" },
    ],
    getData:    ()    => State.settings,
    setData:    (val) => { State.set("settings", val); },
  },
];

let _currentModule = "recipes";
let _ingModalRecipeId = null;

function switchModule(id) {
  _currentModule = id;
  document.querySelectorAll(".ed-mod-btn").forEach(b => b.classList.toggle("active", b.dataset.mod === id));
  renderEditorModule();
}

function updateEditorCounts() {
  document.getElementById("count-recipes").textContent    = State.recipes.length;
  document.getElementById("count-pantry").textContent     = State.pantry.length;
  document.getElementById("count-supplies").textContent   = State.supplies.length;
  document.getElementById("count-categories").textContent = State.categories.length;
}

function renderEditorModule() {
  const mod  = EDITOR_MODULES.find(m => m.id === _currentModule);
  const data = mod.getData();

  document.getElementById("ed-mod-icon").textContent  = mod.icon;
  document.getElementById("ed-mod-title").textContent = mod.label;
  document.getElementById("ed-add-btn").textContent   = mod.singleton ? "" : `+ ${mod.addLabel}`;
  document.getElementById("ed-add-btn").style.display = mod.singleton ? "none" : "";
  document.getElementById("ed-status-module").textContent = "Module: " + mod.id;
  document.getElementById("ed-status-count").textContent  = mod.singleton ? "Singleton" : `${data.length} records`;

  const desc = mod.singleton ? "Global settings" : `${data.length} record${data.length !== 1 ? "s" : ""}`;
  document.getElementById("ed-mod-desc").textContent = desc;

  const content = document.getElementById("ed-content");
  if (mod.singleton) {
    content.innerHTML = renderSettingsPanel(mod, data);
  } else {
    content.innerHTML = renderTable(mod, data);
  }
}

function renderSettingsPanel(mod, data) {
  return `<div class="ed-settings">` +
    mod.fields.map(f => `
      <div class="ed-setting-row">
        <div class="ed-setting-label">${f.label}</div>
        <input class="ed-setting-in"
          type="${f.type === 'number' ? 'number' : 'text'}"
          value="${data[f.key] ?? ""}"
          onchange="updateSetting('${f.key}', this.value, '${f.type}')" />
      </div>
    `).join("") +
  `</div>`;
}

function updateSetting(key, val, type) {
  const parsed = type === "number" ? (parseFloat(val) || 0) : val;
  State.settings[key] = parsed;
  State.save("settings");
  if (key === "familyName") {
    document.getElementById("family-name-display").textContent = val || "Family";
  }
}

function renderTable(mod, data) {
  const headers = mod.fields.map(f =>
    `<th style="${f.width ? "width:" + f.width + "px" : ""}">${f.label}</th>`
  ).join("") + `<th style="width:36px"></th>`;

  const rows = data.map(row => `
    <tr class="ed-row" data-id="${row.id}">
      ${mod.fields.map(f => renderCell(mod.id, row, f)).join("")}
      <td>
        <button class="ed-del-btn" onclick="editorDeleteRow('${row.id}')" title="Delete">✕</button>
      </td>
    </tr>
  `).join("") || `
    <tr>
      <td colspan="${mod.fields.length + 1}" style="padding:24px 10px;color:var(--ed-muted);font-size:13px;text-align:center">
        No records yet. Click + ${mod.addLabel} to create one.
      </td>
    </tr>
  `;

  return `
    <table class="ed-table">
      <thead><tr>${headers}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderCell(modId, row, field) {
  const val = row[field.key];
  switch (field.type) {
    case "text":
      return `<td><input class="ed-cell-in" value="${escapeHtml(val || "")}"
        placeholder="${field.placeholder || ""}"
        onchange="editorUpdateCell('${row.id}','${field.key}',this.value)" /></td>`;

    case "number":
      return `<td><input class="ed-cell-in" type="number" value="${val ?? ""}"
        onchange="editorUpdateCell('${row.id}','${field.key}',parseFloat(this.value)||0)"
        style="${field.width ? "width:" + field.width + "px" : ""}" /></td>`;

    case "select": {
      const opts = field.options().map(o =>
        `<option value="${o}" ${o === val ? "selected" : ""}>${o}</option>`
      ).join("");
      return `<td><select class="ed-cell-sel"
        onchange="editorUpdateCell('${row.id}','${field.key}',this.value)">${opts}</select></td>`;
    }

    case "color":
      return `<td>
        <div style="display:flex;align-items:center;gap:6px;padding:6px 10px">
          <input type="color" value="${val || "#2a5c45"}"
            onchange="editorUpdateCell('${row.id}','${field.key}',this.value)"
            style="width:28px;height:24px;border:none;background:none;cursor:pointer;padding:0" />
          <span style="font-size:11px;color:var(--ed-muted)">${val || "#2a5c45"}</span>
        </div>
      </td>`;

    case "tags":
      return `<td><input class="ed-cell-in"
        value="${Array.isArray(val) ? val.join(", ") : ""}"
        placeholder="${field.placeholder || ""}"
        onchange="editorUpdateCell('${row.id}','${field.key}',this.value.split(',').map(t=>t.trim()).filter(Boolean))" /></td>`;

    case "ingredients": {
      const count = Array.isArray(val) ? val.length : 0;
      return `<td>
        <div class="ed-ing-cell" onclick="openIngModal('${row.id}')">
          ${count > 0
            ? `${count} ingredient${count !== 1 ? "s" : ""} <span style="color:#7dd4a0;font-size:11px">✏ edit</span>`
            : `<span style="color:var(--ed-muted)">none · click to add</span>`
          }
        </div>
      </td>`;
    }

    default:
      return `<td><span style="padding:8px 10px;color:var(--ed-muted)">${val ?? ""}</span></td>`;
  }
}

function editorAddRow() {
  const mod = EDITOR_MODULES.find(m => m.id === _currentModule);
  if (!mod || mod.singleton) return;
  const data = mod.getData();
  data.push(mod.newItem());
  mod.setData(data);
  updateEditorCounts();
  renderEditorModule();
}

function editorDeleteRow(id) {
  const mod  = EDITOR_MODULES.find(m => m.id === _currentModule);
  const data = mod.getData().filter(r => r.id !== id);
  mod.setData(data);
  updateEditorCounts();
  renderEditorModule();
}

function editorUpdateCell(id, field, value) {
  const mod  = EDITOR_MODULES.find(m => m.id === _currentModule);
  const data = mod.getData().map(r => r.id === id ? { ...r, [field]: value } : r);
  mod.setData(data);
}

function openIngModal(recipeId) {
  _ingModalRecipeId = recipeId;
  const rec = State.recipes.find(r => r.id === recipeId);
  if (!rec) return;
  document.getElementById("modal-ing-title").textContent = "Ingredients — " + rec.name;
  renderIngRows(rec.ingredients || []);
  document.getElementById("modal-ing").classList.remove("hidden");
}

function renderIngRows(ings) {
  document.getElementById("modal-ing-list").innerHTML = ings.map((ing, i) => `
    <div class="ing-row" data-idx="${i}">
      <input placeholder="Item name" value="${escapeHtml(ing.name)}"
        onchange="ingRowUpdate(${i},'name',this.value)" />
      <input type="number" placeholder="Qty" value="${ing.qty}"
        onchange="ingRowUpdate(${i},'qty',parseFloat(this.value)||1)" />
      <select onchange="ingRowUpdate(${i},'unit',this.value)">
        ${UNITS.map(u => `<option ${u === ing.unit ? "selected" : ""}>${u}</option>`).join("")}
      </select>
      <button class="btn btn-sm btn-danger" onclick="ingRowRemove(${i})">×</button>
    </div>
  `).join("");
}

let _ingWorkingCopy = [];

function ingModalAddRow() {
  _ingWorkingCopy.push({ name: "", qty: 1, unit: "ct" });
  renderIngRows(_ingWorkingCopy);
}

function ingRowUpdate(idx, field, value) {
  _ingWorkingCopy[idx][field] = value;
}

function ingRowRemove(idx) {
  _ingWorkingCopy.splice(idx, 1);
  renderIngRows(_ingWorkingCopy);
}

function ingModalSave() {
  State.recipes = State.recipes.map(r =>
    r.id === _ingModalRecipeId ? { ...r, ingredients: [..._ingWorkingCopy] } : r
  );
  State.save("recipes");
  closeModal("modal-ing");
  renderEditorModule();
}

const _origOpenIngModal = openIngModal;
window.openIngModal = function(recipeId) {
  const rec = State.recipes.find(r => r.id === recipeId);
  _ingWorkingCopy = rec ? JSON.parse(JSON.stringify(rec.ingredients || [])) : [];
  _origOpenIngModal(recipeId);
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
