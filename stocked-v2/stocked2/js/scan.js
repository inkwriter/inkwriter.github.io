/* ============================================================
   Stocked — scan.js
   Phone-camera barcode scanning, right in the browser.

   Lookup order for a scanned code:
     1. Your own Inventory (Barcodes column) — instant.
     2. Open Food Facts → Open Beauty Facts → Open Products Facts
        (free, no key) to suggest a name for a code you've never seen.
     3. Neither knows it → you name it once; the code is saved to
        that item, so next time it's step 1.
   ============================================================ */

"use strict";

const SCAN_LIB_URL = "https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js";

const scan = {
  mode: "restock",   // "restock" (+1 to pantry) | "list" (put on shopping list)
  reader: null,
  busy: false,
  lastCode: "",
  lastSeen: 0,
  tally: [],         // [{ itemId, name, count, detail }]
};

let scanLibPromise = null;
function loadScanLib() {
  if (window.Html5Qrcode) return Promise.resolve();
  if (!scanLibPromise) {
    scanLibPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SCAN_LIB_URL;
      s.onload = resolve;
      s.onerror = () => { scanLibPromise = null; reject(new Error("Couldn't load the scanner library")); };
      document.head.appendChild(s);
    });
  }
  return scanLibPromise;
}

/* ---------- the scanner sheet ---------- */

function openScanner(mode = "restock") {
  scan.mode = mode;
  scan.busy = false;
  scan.lastCode = "";
  scan.tally = [];

  openModal("Scan barcodes", `
    <div class="seg" role="radiogroup" aria-label="What scanning does">
      <button class="seg-btn" data-mode="restock" role="radio">Restock pantry</button>
      <button class="seg-btn" data-mode="list" role="radio">Add to list</button>
    </div>
    <div class="scan-stage">
      <div id="scanReader" class="scan-reader"></div>
      <div class="scan-overlay-msg" id="scanCamMsg">Starting camera…</div>
    </div>
    <p class="scan-tip">Hold the phone <strong>6–10 inches</strong> back — the barcode doesn't need to fill the box. Blurry up close? Back up, or use Zoom.</p>
    <div class="scan-controls" id="scanControls" hidden></div>
    <div class="scan-status" id="scanStatus" aria-live="polite"></div>
    <div id="scanUnknown"></div>
    <form class="scan-manual" id="scanManualForm">
      <input class="input" id="scanManual" inputmode="numeric" placeholder="Or type the barcode number" aria-label="Barcode number">
      <button class="btn btn-ghost" type="submit">Look up</button>
    </form>
    <div class="scan-tally" id="scanTally"></div>
    <div class="form-actions">
      <button class="btn btn-primary" id="scanDone">Done</button>
    </div>`, { onClose: stopScanner, wide: false });

  $$(".seg-btn").forEach((b) => b.addEventListener("click", () => { scan.mode = b.dataset.mode; drawScanMode(); }));
  $("#scanDone").addEventListener("click", closeModal);
  $("#scanManualForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const v = $("#scanManual").value;
    $("#scanManual").value = "";
    handleCode(v, { manual: true });
  });
  drawScanMode();
  drawTally();
  startCamera();
}

function drawScanMode() {
  $$(".seg-btn").forEach((b) => {
    const on = b.dataset.mode === scan.mode;
    b.classList.toggle("active", on);
    b.setAttribute("aria-checked", on ? "true" : "false");
  });
  if (!scan.busy) setScanStatus(scan.mode === "restock"
    ? "Scan each item as you put it away — it adds 1."
    : "Scan the empty before you toss it — it goes on the list.");
}

function setScanStatus(html, tone = "") {
  const el = $("#scanStatus");
  if (!el) return;
  el.className = `scan-status ${tone}`;
  el.innerHTML = html;
}

// Phones can't focus closer than ~4–8 in. (iPhone Pro main cameras are
// the worst), so we ask for a high-resolution stream: a barcode held
// further back still has enough pixels to read. We also turn on
// continuous autofocus and offer zoom / torch / lens switching when
// the phone's browser supports them.
const CAM_PREF_KEY = "stocked.scanCamera";

function savedCameraId() {
  try { return localStorage.getItem(CAM_PREF_KEY) || ""; } catch (e) { return ""; }
}
function saveCameraId(id) {
  try { id ? localStorage.setItem(CAM_PREF_KEY, id) : localStorage.removeItem(CAM_PREF_KEY); } catch (e) {}
}

async function startCamera(deviceId = savedCameraId()) {
  const msg = $("#scanCamMsg");
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    msg.textContent = "Camera needs the https:// site. Type the number below instead.";
    return;
  }
  msg.textContent = "Starting camera…";
  msg.hidden = false;
  try {
    await loadScanLib();
    if (!$("#scanReader")) return; // sheet closed while loading
    const F = window.Html5QrcodeSupportedFormats;
    if (!scan.reader) {
      scan.reader = new window.Html5Qrcode("scanReader", {
        verbose: false,
        formatsToSupport: [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_128],
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      });
    }
    const videoConstraints = {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "environment" }),
    };
    const config = {
      fps: 15,
      videoConstraints,
      qrbox: (w, h) => ({ width: Math.floor(w * 0.9), height: Math.floor(Math.min(h * 0.6, w * 0.45)) }),
    };
    try {
      const cam = deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "environment" };
      await scan.reader.start(cam, config, (text) => handleCode(text), () => {});
    } catch (err) {
      // a saved lens may be gone (new phone, other browser) — fall back once
      if (!deviceId) throw err;
      saveCameraId("");
      return startCamera("");
    }
    msg.hidden = true;
    await tuneCamera();
    await drawCameraControls();
  } catch (err) {
    const denied = /permission|denied|notallowed/i.test(String(err?.name || err));
    msg.textContent = denied
      ? "Camera permission was blocked. Allow it in your browser settings, or type the number below."
      : "Couldn't start the camera. You can type the number below.";
    msg.hidden = false;
    scan.reader = null;
  }
}

/** Continuous autofocus where the browser allows it (mostly Android Chrome). */
async function tuneCamera() {
  const caps = safeCaps();
  const adv = {};
  if (caps.focusMode?.includes?.("continuous")) adv.focusMode = "continuous";
  if (caps.exposureMode?.includes?.("continuous")) adv.exposureMode = "continuous";
  if (Object.keys(adv).length) {
    await applyCam({ advanced: [adv] });
  }
}

async function applyCam(constraints) {
  try { await scan.reader?.applyVideoConstraints(constraints); } catch (e) { /* not supported here */ }
}

function safeCaps() {
  try { return scan.reader?.getRunningTrackCapabilities?.() || {}; } catch (e) { return {}; }
}

/** Zoom slider, flashlight and "switch lens" — each only if this phone supports it. */
async function drawCameraControls() {
  const box = $("#scanControls");
  if (!box) return;
  const caps = safeCaps();
  const parts = [];

  if (caps.zoom && caps.zoom.max > caps.zoom.min) {
    const start = Math.min(caps.zoom.max, Math.max(caps.zoom.min, 1.5));
    parts.push(`<label class="scan-zoom">Zoom
      <input type="range" id="scanZoom" min="${caps.zoom.min}" max="${Math.min(caps.zoom.max, 5)}" step="${caps.zoom.step || 0.1}" value="${start}">
    </label>`);
    await applyCam({ advanced: [{ zoom: start }] });
  }
  if (caps.torch) parts.push(`<button type="button" class="btn btn-ghost btn-sm" id="scanTorch" aria-pressed="false">Flashlight</button>`);

  let backCams = [];
  try {
    const cams = await window.Html5Qrcode.getCameras();
    backCams = cams.filter((c) => !/front|user|facetime/i.test(c.label));
    if (backCams.length < 2) backCams = cams.length > 1 ? cams : [];
  } catch (e) {}
  if (backCams.length > 1) {
    const current = scan.reader.getRunningTrackSettings?.().deviceId || savedCameraId();
    parts.push(`<label class="scan-lens">Lens
      <select class="input input-sm" id="scanLens">
        ${backCams.map((c, i) => `<option value="${esc(c.id)}" ${c.id === current ? "selected" : ""}>${esc(c.label || `Camera ${i + 1}`)}</option>`).join("")}
      </select></label>`);
  }

  box.innerHTML = parts.join("");
  box.hidden = !parts.length;

  $("#scanZoom")?.addEventListener("input", (e) => {
    applyCam({ advanced: [{ zoom: Number(e.target.value) }] });
  });
  $("#scanTorch")?.addEventListener("click", (e) => {
    const on = e.currentTarget.getAttribute("aria-pressed") !== "true";
    e.currentTarget.setAttribute("aria-pressed", String(on));
    e.currentTarget.classList.toggle("active", on);
    applyCam({ advanced: [{ torch: on }] });
  });
  $("#scanLens")?.addEventListener("change", async (e) => {
    const id = e.target.value;
    saveCameraId(id);
    try { if (scan.reader?.isScanning) await scan.reader.stop(); } catch (err) {}
    startCamera(id);
  });
}

async function stopScanner() {
  const r = scan.reader;
  scan.reader = null;
  if (!r) return;
  try { if (r.isScanning) await r.stop(); r.clear(); } catch (e) { /* already stopped */ }
}

function pauseCamera() { try { scan.reader?.pause(true); } catch (e) {} }
function resumeCamera() { try { scan.reader?.resume(); } catch (e) {} }

/* ---------- handling a code ---------- */

async function handleCode(raw, { manual = false } = {}) {
  const code = normBarcode(raw);
  if (!code) { if (manual) setScanStatus("That doesn't look like a barcode.", "warn"); return; }
  if (scan.busy) return;

  // Holding one box in frame shouldn't count it five times: the same
  // code is ignored until it's been out of view for ~2.5 seconds.
  const now = Date.now();
  if (!manual && code === scan.lastCode && now - scan.lastSeen < 2500) { scan.lastSeen = now; return; }
  scan.lastCode = code;
  scan.lastSeen = now;
  navigator.vibrate?.(40);

  const item = findItemByBarcode(code);
  if (item) return applyKnown(item);

  scan.busy = true;
  pauseCamera();
  $(".scan-stage")?.classList.add("compact");
  setScanStatus(`New barcode <code>${esc(code)}</code> — looking it up…`);
  const info = await lookupProduct(code);
  if (!$("#scanUnknown")) return; // sheet was closed
  showUnknownForm(code, info);
}

async function applyKnown(item) {
  if (scan.mode === "restock") {
    const res = await quickAdjust(item.itemId, 1, { silent: true });
    if (!res) return;
    pushTally(item, `now ${res.quantity} ${item.unit}`);
    setScanStatus(`<strong>${esc(item.itemName)}</strong> +1`, "ok");
  } else {
    const added = await addItemToList(item, { silent: true });
    pushTally(item, added ? "on the list" : "already on the list");
    setScanStatus(added ? `<strong>${esc(item.itemName)}</strong> added to the list` : `<strong>${esc(item.itemName)}</strong> is already on the list`, added ? "ok" : "");
  }
}

function pushTally(item, detail) {
  const top = scan.tally[0];
  if (top && top.itemId === item.itemId && top.mode === scan.mode) {
    top.count += scan.mode === "restock" ? 1 : 0;
    top.detail = detail;
  } else {
    scan.tally.unshift({ itemId: item.itemId, name: item.itemName, count: 1, detail, mode: scan.mode });
  }
  drawTally();
}

function drawTally() {
  const el = $("#scanTally");
  if (!el) return;
  if (!scan.tally.length) { el.innerHTML = ""; return; }
  el.innerHTML = `<div class="scan-tally-head">This session</div>` + scan.tally.map((t, i) => `
    <div class="scan-tally-row">
      <span><strong>${esc(t.name)}</strong>${t.mode === "restock" && t.count > 1 ? ` ×${t.count}` : ""}
        <span class="cmp-detail"> · ${esc(t.detail)}</span></span>
      ${t.mode === "restock" ? `<span class="scan-tally-btns">
        <button class="btn btn-ghost btn-sm" data-t="${i}" data-d="-1" aria-label="One less ${esc(t.name)}">−1</button>
        <button class="btn btn-ghost btn-sm" data-t="${i}" data-d="1" aria-label="One more ${esc(t.name)}">+1</button>
      </span>` : ""}
    </div>`).join("");
  el.querySelectorAll("[data-t]").forEach((b) => b.addEventListener("click", async () => {
    const t = scan.tally[Number(b.dataset.t)];
    const d = Number(b.dataset.d);
    const res = await quickAdjust(t.itemId, d, { silent: true, undo: d < 0 });
    if (!res) return;
    t.count = Math.max(0, t.count + d);
    const it = itemById(t.itemId);
    t.detail = `now ${res.quantity} ${it?.unit || ""}`;
    if (t.count === 0) scan.tally.splice(Number(b.dataset.t), 1);
    drawTally();
  }));
}

/* ---------- unknown barcode: name it once ---------- */

function showUnknownForm(code, info) {
  const d = state.data;
  const productTitle = info ? [info.brand && !info.name.toLowerCase().includes(info.brand.toLowerCase()) ? info.brand : "", info.name].filter(Boolean).join(" ") : "";
  const sugg = info ? suggestForProduct(`${info.name} ${info.generic || ""}`) : [];
  const guessCat = info ? guessCategory(info) : "";
  const catOpts = d.categories.filter((c) => c.status === "active")
    .map((c) => `<option ${c.categoryName === guessCat ? "selected" : ""}>${esc(c.categoryName)}</option>`).join("");

  setScanStatus(info
    ? `Found on ${esc(info.sourceLabel)}: <strong>${esc(productTitle)}</strong>${info.quantity ? ` <span class="cmp-detail">(${esc(info.quantity)})</span>` : ""}`
    : `Barcode <code>${esc(code)}</code> isn't in the product databases. What is it?`, info ? "" : "warn");

  $("#scanUnknown").innerHTML = `
    <div class="scan-unknown">
      ${sugg.length ? `<div class="form-field"><label>Is it one of these?</label>
        <div class="suggest-row">${sugg.map((s) => `<button class="chip chip-suggest" data-item-id="${esc(s.item.itemId)}">${esc(s.item.itemName)}</button>`).join("")}</div></div>` : ""}
      <div class="form-field">
        <label>${sugg.length ? "Or search your items / name a new one" : "Search your items or name a new one"}</label>
        <input class="input" id="suName" value="${esc(info ? info.name : "")}" placeholder="e.g. Milk">
      </div>
      <div id="suPicked"></div>
      <div class="form-grid" id="suNewFields">
        <div class="form-field"><label>Category</label><select class="input" id="suCat">${catOpts}</select></div>
        <div class="form-field"><label>Location</label><select class="input" id="suLoc"></select></div>
        <div class="form-field"><label>Unit</label><input class="input" id="suUnit" value="count"></div>
        <div class="form-field"><label>Store section</label><select class="input" id="suSec"></select></div>
      </div>
      <p class="view-hint scan-hint">Tip: keep the name generic (“Milk”, not the brand) so every brand's barcode can point at the same item.</p>
      <div class="form-actions">
        <button class="btn btn-ghost" id="suSkip">Skip</button>
        <button class="btn btn-primary" id="suSave">Create item</button>
      </div>
    </div>`;

  let picked = null;
  const syncNewDefaults = () => {
    const cat = $("#suCat").value;
    const catRow = d.categories.find((c) => c.categoryName === cat);
    $("#suLoc").innerHTML = locationOptions(likelyLocation(cat));
    $("#suSec").innerHTML = SECTION_ORDER().map((s) => `<option ${s === (catRow?.defaultStoreSection || "Other") ? "selected" : ""}>${esc(s)}</option>`).join("");
  };
  syncNewDefaults();
  $("#suCat").addEventListener("change", syncNewDefaults);

  const drawPicked = () => {
    $("#suNewFields").hidden = !!picked;
    $("#suPicked").innerHTML = picked
      ? `<div class="picked-card">This barcode will be saved to <strong>${esc(picked.itemName)}</strong>
          <span class="cmp-detail">(${esc(picked.quantity)} ${esc(picked.unit)} · ${esc(picked.location)})</span>
          <button class="btn btn-ghost btn-sm" id="suUnpick">Not this</button></div>`
      : "";
    $("#suSave").textContent = picked
      ? (scan.mode === "restock" ? "Save barcode & +1" : "Save barcode & add to list")
      : (scan.mode === "restock" ? "Create item (qty 1)" : "Create item & add to list");
    $("#suUnpick")?.addEventListener("click", () => { picked = null; drawPicked(); $("#suName").focus(); });
  };

  const pick = (item) => { picked = item; $("#suName").value = item.itemName; drawPicked(); };
  $$(".chip-suggest").forEach((b) => b.addEventListener("click", () => pick(itemById(b.dataset.itemId))));
  attachAutocomplete($("#suName"), { onPick: pick });
  $("#suName").addEventListener("input", () => { if (picked && $("#suName").value !== picked.itemName) { picked = null; drawPicked(); } });
  drawPicked();

  $("#suSkip").addEventListener("click", finishUnknown);
  $("#suSave").addEventListener("click", async () => {
    const btn = $("#suSave");
    btn.disabled = true;
    try {
      if (picked) {
        const qty = scan.mode === "restock" ? 1 : 0;
        const res = await apiPost("linkBarcode", { itemId: picked.itemId, barcode: code, qty });
        moveBarcodeLocally(code, picked.itemId);
        if (qty && res.quantity != null) picked.quantity = res.quantity;
        else if (qty) picked.quantity = Number(picked.quantity || 0) + qty;
        if (scan.mode === "list") await addItemToList(picked, { silent: true });
        pushTally(picked, scan.mode === "restock" ? `barcode saved · now ${picked.quantity} ${picked.unit}` : "barcode saved · on the list");
      } else {
        const name = $("#suName").value.trim();
        if (!name) { toast("Give it a name first."); btn.disabled = false; return; }
        const existing = resolveName(name);
        if (existing) { pick(existing.item); btn.disabled = false; toast(`You already track ${existing.item.itemName} — saving the barcode there.`); return; }
        const fields = {
          itemName: name,
          category: $("#suCat").value,
          location: $("#suLoc").value,
          quantity: scan.mode === "restock" ? 1 : 0,
          unit: $("#suUnit").value.trim() || "count",
          minQuantity: "",
          expirationDate: "",
          storeSection: $("#suSec").value,
          staple: false,
          defaultLocation: $("#suLoc").value,
          notes: "",
          barcodes: code,
        };
        const res = await apiPost("addItem", fields);
        const item = res.item || { ...fields, itemId: `TMP-${Date.now()}`, status: "active" };
        state.data.inventory.push(item);
        state.data.usage = state.data.usage || {};
        state.data.usage[item.itemId] = (state.data.usage[item.itemId] || 0) + 1;
        if (scan.mode === "list") await addItemToList(item, { silent: true });
        pushTally(item, scan.mode === "restock" ? "new item · 1 " + item.unit : "new item · on the list");
      }
      finishUnknown();
    } catch (err) {
      toast(`Save failed: ${err.message}`);
      btn.disabled = false;
    }
  });
}

function finishUnknown() {
  const el = $("#scanUnknown");
  if (el) el.innerHTML = "";
  scan.busy = false;
  $(".scan-stage")?.classList.remove("compact");
  scan.lastSeen = Date.now(); // don't instantly re-read the same box
  drawScanMode();
  resumeCamera();
  render();
}

function moveBarcodeLocally(code, itemId) {
  const k = barcodeKey(code);
  for (const it of state.data.inventory) {
    const list = itemBarcodes(it);
    if (it.itemId === itemId) {
      if (!list.some((c) => barcodeKey(c) === k)) list.push(code);
      it.barcodes = list.join(",");
    } else if (list.some((c) => barcodeKey(c) === k)) {
      it.barcodes = list.filter((c) => barcodeKey(c) !== k).join(",");
    }
  }
}

function likelyLocation(category) {
  const counts = {};
  activeItems().filter((i) => i.category === category).forEach((i) => { counts[i.location] = (counts[i.location] || 0) + 1; });
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || "";
}

function locationOptions(selected) {
  return state.data.locations.filter((l) => l.status === "active")
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((l) => `<option ${l.locationName === selected ? "selected" : ""}>${esc(l.locationName)}</option>`).join("");
}

/* ---------- product databases ---------- */

const PRODUCT_DBS = [
  { host: "world.openfoodfacts.org", label: "Open Food Facts", kind: "food" },
  { host: "world.openbeautyfacts.org", label: "Open Beauty Facts", kind: "beauty" },
  { host: "world.openproductsfacts.org", label: "Open Products Facts", kind: "product" },
];

async function lookupProduct(code) {
  if (!/^\d{8,14}$/.test(code)) return null;
  const tries = code.length === 12 ? [code, "0" + code] : [code];
  for (const db of PRODUCT_DBS) {
    for (const c of tries) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        const res = await fetch(`https://${db.host}/api/v2/product/${c}.json?fields=product_name,product_name_en,generic_name,brands,categories_tags,quantity`, { signal: ctrl.signal });
        clearTimeout(timer);
        if (!res.ok) continue;
        const j = await res.json();
        const p = j.product;
        const name = (p && (p.product_name_en || p.product_name || p.generic_name) || "").trim();
        if (j.status === 1 && name) {
          return {
            name,
            generic: p.generic_name || "",
            brand: String(p.brands || "").split(",")[0].trim(),
            quantity: p.quantity || "",
            categories: p.categories_tags || [],
            kind: db.kind,
            sourceLabel: db.label,
          };
        }
      } catch (e) { /* offline or timed out — try the next one */ }
    }
  }
  return null;
}

/** Map product-database tags onto your Categories tab. Only a default in a dropdown. */
function guessCategory(info) {
  const have = new Set(state.data.categories.filter((c) => c.status === "active").map((c) => c.categoryName));
  const pick = (name) => (have.has(name) ? name : "");
  if (info.kind === "beauty") return pick("Toiletries");
  const tags = info.categories.join(" ");
  const rules = [
    [/paper|tissue|towel|napkin/, "Paper Goods"],
    [/clean|detergent|laundry|dish/, "Cleaning"],
    [/dair|milk|cheese|yogurt|butter|cream|egg/, "Dairy"],
    [/meat|beef|pork|chicken|poultry|sausage|bacon|fish|seafood/, "Meat"],
    [/fruit|vegetable|produce|salad|fresh/, "Produce"],
    [/spice|seasoning|herb|condiment|sauce/, "Spices"],
    [/cereal|pasta|rice|flour|snack|canned|bread|beverage|drink|sugar|baking/, "Dry Goods"],
    [/toothpaste|shampoo|soap|hygiene|deodorant/, "Toiletries"],
  ];
  for (const [re, cat] of rules) if (re.test(tags) && pick(cat)) return cat;
  if (info.kind === "product") return pick("Household");
  return pick("Dry Goods");
}
