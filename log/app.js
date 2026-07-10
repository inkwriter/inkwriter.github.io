/* ============================================================
   FIELD LOG — app.js
   Plain JS, no framework, no build step. All state lives in
   localStorage. Sections below are marked to match the spec.
============================================================ */

(function () {
  "use strict";

  /* ============================================================
     STATE + LOCALSTORAGE
  ============================================================ */
  const LS_ENTRIES = "fieldlog.entries.v1";
  const LS_THEME = "fieldlog.theme.v1";

  /** @type {Array<{id,text,category,createdAt,date,time}>} */
  let entries = [];

  // Active view filters
  const filters = {
    query: "",
    range: "all",       // all | today | yesterday | week | month | custom
    from: null,         // YYYY-MM-DD (custom)
    to: null,           // YYYY-MM-DD (custom)
    category: null,     // lowercased category or null
  };

  function loadEntries() {
    try {
      const raw = localStorage.getItem(LS_ENTRIES);
      const parsed = raw ? JSON.parse(raw) : [];
      entries = Array.isArray(parsed) ? parsed.filter(isValidEntry) : [];
    } catch (err) {
      console.error("Could not read saved log:", err);
      entries = [];
    }
  }

  function saveEntries() {
    try {
      localStorage.setItem(LS_ENTRIES, JSON.stringify(entries));
      return true;
    } catch (err) {
      console.error("Could not save log:", err);
      toast("Couldn't save — this browser's storage may be full or blocked.", true);
      return false;
    }
  }

  function isValidEntry(e) {
    return (
      e &&
      typeof e === "object" &&
      typeof e.id === "string" &&
      typeof e.text === "string" &&
      typeof e.createdAt === "string" &&
      typeof e.date === "string" &&
      typeof e.time === "string"
    );
  }

  /* ============================================================
     HELPERS — ids, dates, formatting
  ============================================================ */
  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  // Local YYYY-MM-DD (avoids the UTC shift you get from toISOString)
  function localDateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // Local ISO-ish timestamp with offset, e.g. 2026-07-09T08:22:00
  function localISO(d) {
    const pad = (n) => String(n).padStart(2, "0");
    return (
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
      `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    );
  }

  function formatTime(d) {
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  }

  function formatDayHeading(dateKey) {
    // Build from parts so it's parsed as a LOCAL date
    const [y, m, d] = dateKey.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString(undefined, {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
  }

  /* ============================================================
     ENTRY CREATION (+ optional category detection)
     Format "category: activity" -> category is the token before
     the first colon, when it's short and has an activity after it.
  ============================================================ */
  function parseEntry(rawText) {
    const text = rawText.trim();
    let category = "";
    let activity = text;

    const idx = text.indexOf(":");
    if (idx > 0) {
      const head = text.slice(0, idx).trim();
      const tail = text.slice(idx + 1).trim();
      // Treat as a category only when it's a single short token with real
      // activity text after it. Keeps clock times ("meet at 8:30") intact.
      if (head && tail && head.length <= 20 && !/\s/.test(head)) {
        category = head;
        activity = tail;
      }
    }
    return { category, activity };
  }

  function addEntry(rawText) {
    const { category, activity } = parseEntry(rawText);
    if (!activity) return null; // no blank entries

    const now = new Date();
    const entry = {
      id: uid(),
      text: activity,
      category: category, // "" when none
      createdAt: localISO(now),
      date: localDateKey(now),
      time: formatTime(now),
    };
    entries.push(entry);
    saveEntries();
    return entry;
  }

  /* ============================================================
     FILTERING / SEARCHING
  ============================================================ */
  function startOfWeek(d) {
    // Week starts Monday
    const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = (copy.getDay() + 6) % 7; // Mon=0 … Sun=6
    copy.setDate(copy.getDate() - day);
    return copy;
  }

  function rangeBounds() {
    // Returns {from, to} as YYYY-MM-DD (inclusive) or nulls for "all"
    const today = new Date();
    const todayKey = localDateKey(today);

    switch (filters.range) {
      case "today":
        return { from: todayKey, to: todayKey };
      case "yesterday": {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        const k = localDateKey(y);
        return { from: k, to: k };
      }
      case "week":
        return { from: localDateKey(startOfWeek(today)), to: todayKey };
      case "month":
        return { from: localDateKey(new Date(today.getFullYear(), today.getMonth(), 1)), to: todayKey };
      case "custom":
        return { from: filters.from || null, to: filters.to || null };
      default:
        return { from: null, to: null };
    }
  }

  function getFilteredEntries() {
    const { from, to } = rangeBounds();
    const q = filters.query.trim().toLowerCase();
    const cat = filters.category;

    return entries.filter((e) => {
      if (from && e.date < from) return false;
      if (to && e.date > to) return false;
      if (cat && (e.category || "").toLowerCase() !== cat) return false;
      if (q) {
        const hay = (e.text + " " + (e.category || "")).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  // Sort newest-first for day groups, but entries WITHIN a day oldest-first
  function groupByDay(list) {
    const map = new Map();
    for (const e of list) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date).push(e);
    }
    const days = Array.from(map.keys()).sort((a, b) => (a < b ? 1 : -1)); // newest day first
    return days.map((date) => {
      const items = map.get(date).slice().sort((a, b) => {
        // chronological within the day using createdAt
        return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
      });
      return { date, items };
    });
  }

  /* ============================================================
     RENDERING LOGS
  ============================================================ */
  const logRoot = document.getElementById("logRoot");

  function render() {
    renderCategoryChips();

    const list = getFilteredEntries();
    logRoot.innerHTML = "";

    if (entries.length === 0) {
      logRoot.appendChild(emptyState("No logs yet. Add your first entry above."));
      return;
    }
    if (list.length === 0) {
      logRoot.appendChild(emptyState("No logs match your current filters."));
      return;
    }

    const groups = groupByDay(list);
    for (const group of groups) {
      logRoot.appendChild(renderDay(group));
    }
  }

  function emptyState(message) {
    const wrap = document.createElement("div");
    wrap.className = "empty";
    const mark = document.createElement("div");
    mark.className = "empty__mark";
    mark.textContent = "▚";
    const text = document.createElement("p");
    text.className = "empty__text";
    text.textContent = message;
    wrap.append(mark, text);
    return wrap;
  }

  function renderDay(group) {
    const section = document.createElement("section");
    section.className = "day";

    const head = document.createElement("div");
    head.className = "day__head";
    const date = document.createElement("h2");
    date.className = "day__date";
    date.textContent = formatDayHeading(group.date);
    const count = document.createElement("span");
    count.className = "day__count";
    count.textContent = group.items.length === 1 ? "1 entry" : `${group.items.length} entries`;
    head.append(date, count);
    section.appendChild(head);

    for (const e of group.items) section.appendChild(renderEntry(e));
    return section;
  }

  function renderEntry(e) {
    const row = document.createElement("article");
    row.className = "entry";
    row.dataset.id = e.id;

    const time = document.createElement("div");
    time.className = "entry__time";
    time.textContent = e.time;

    const main = document.createElement("div");
    main.className = "entry__main";

    if (e.category) {
      const badge = document.createElement("span");
      badge.className = "entry__cat";
      badge.textContent = e.category;
      main.appendChild(badge);
    }

    const text = document.createElement("div");
    text.className = "entry__text";
    text.textContent = e.text;
    main.appendChild(text);

    const actions = document.createElement("div");
    actions.className = "entry__actions";

    const editBtn = document.createElement("button");
    editBtn.className = "entry__action";
    editBtn.type = "button";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => beginEdit(row, e));

    const delBtn = document.createElement("button");
    delBtn.className = "entry__action entry__action--del";
    delBtn.type = "button";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => deleteEntry(e));

    actions.append(editBtn, delBtn);
    main.appendChild(actions);

    row.append(time, main);
    return row;
  }

  /* ============================================================
     EDIT + DELETE
     Edit keeps the original date/time; only the text (and any
     re-detected category) changes.
  ============================================================ */
  function beginEdit(row, e) {
    const main = row.querySelector(".entry__main");
    main.innerHTML = "";

    const box = document.createElement("div");
    box.className = "entry__edit";

    const ta = document.createElement("textarea");
    ta.value = e.category ? `${e.category}: ${e.text}` : e.text;

    const btnRow = document.createElement("div");
    btnRow.className = "entry__edit-row";
    const save = document.createElement("button");
    save.className = "btn btn--primary";
    save.type = "button";
    save.textContent = "Save";
    const cancel = document.createElement("button");
    cancel.className = "btn btn--ghost";
    cancel.type = "button";
    cancel.textContent = "Cancel";

    btnRow.append(save, cancel);
    box.append(ta, btnRow);
    main.appendChild(box);
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);

    const commit = () => {
      const parsed = parseEntry(ta.value);
      if (!parsed.activity) {
        toast("Entry can't be blank.", true);
        return;
      }
      e.text = parsed.activity;
      e.category = parsed.category;
      saveEntries();
      render();
      toast("Entry updated.");
    };

    save.addEventListener("click", commit);
    cancel.addEventListener("click", render);
    ta.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); commit(); }
      if (ev.key === "Escape") { ev.preventDefault(); render(); }
    });
  }

  function deleteEntry(e) {
    const preview = e.text.length > 40 ? e.text.slice(0, 40) + "…" : e.text;
    if (!confirm(`Delete this entry?\n\n${e.time} — ${preview}\n\nThis can't be undone.`)) return;
    entries = entries.filter((x) => x.id !== e.id);
    saveEntries();
    render();
    toast("Entry deleted.");
  }

  /* ============================================================
     EXPORTING — PDF / CSV / JSON
     PDF & CSV use the CURRENT filtered view; JSON backs up everything.
  ============================================================ */
  function rangeLabel() {
    const map = {
      all: "All logs", today: "Today", yesterday: "Yesterday",
      week: "This week", month: "This month",
    };
    if (filters.range === "custom") {
      const f = filters.from || "…";
      const t = filters.to || "…";
      return `Custom (${f} to ${t})`;
    }
    return map[filters.range] || "All logs";
  }

  function stamp() {
    return localDateKey(new Date());
  }

  // ---- PDF (jsPDF) ----
  function exportPdf() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      toast("PDF library didn't load — check your connection and retry.", true);
      return;
    }
    const list = getFilteredEntries();
    if (list.length === 0) { toast("Nothing to export in this view.", true); return; }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 54;
    let y = margin;

    const newPageIfNeeded = (needed) => {
      if (y + needed > pageH - margin) { doc.addPage(); y = margin; }
    };

    // Title block
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Time Log Report", margin, y);
    y += 22;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(110);
    const now = new Date();
    doc.text(`Generated ${now.toLocaleDateString()} at ${formatTime(now)}`, margin, y); y += 14;
    doc.text(`Filter: ${rangeLabel()}${filters.category ? "  ·  category: " + filters.category : ""}${filters.query ? '  ·  search: "' + filters.query + '"' : ""}`, margin, y); y += 14;
    doc.text(`${list.length} ${list.length === 1 ? "entry" : "entries"}`, margin, y); y += 8;
    doc.setTextColor(30);

    // divider
    doc.setDrawColor(200); doc.line(margin, y, pageW - margin, y); y += 18;

    const groups = groupByDay(list);
    for (const group of groups) {
      newPageIfNeeded(40);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(formatDayHeading(group.date), margin, y);
      y += 16;
      doc.setDrawColor(225); doc.line(margin, y - 6, pageW - margin, y - 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);

      for (const e of group.items) {
        const label = e.category ? `[${e.category}] ` : "";
        const body = `${e.time}   ${label}${e.text}`;
        // wrap to page width, indent continuation under the text
        const lines = doc.splitTextToSize(body, pageW - margin * 2 - 6);
        newPageIfNeeded(lines.length * 14 + 4);
        doc.text(lines, margin + 6, y);
        y += lines.length * 14 + 4;
      }
      y += 10;
    }

    doc.save(`time-log_${rangeLabel().toLowerCase().replace(/[^a-z0-9]+/g, "-")}_${stamp()}.pdf`);
    toast("PDF exported.");
  }

  // ---- CSV ----
  function csvField(v) {
    const s = String(v == null ? "" : v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function exportCsv() {
    const list = getFilteredEntries();
    if (list.length === 0) { toast("Nothing to export in this view.", true); return; }

    // Chronological, oldest first, for a clean spreadsheet
    const sorted = list.slice().sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    const header = ["Date", "Time", "Category", "Activity", "Created timestamp"];
    const rows = sorted.map((e) => [e.date, e.time, e.category || "", e.text, e.createdAt]);

    const csv = [header, ...rows].map((r) => r.map(csvField).join(",")).join("\r\n");
    // BOM so Excel reads UTF-8 correctly
    downloadBlob("\uFEFF" + csv, `time-log_${stamp()}.csv`, "text/csv;charset=utf-8");
    toast("CSV exported.");
  }

  // ---- JSON backup (everything, unfiltered) ----
  function exportJson() {
    if (entries.length === 0) { toast("No logs to back up yet.", true); return; }
    const payload = {
      app: "field-log",
      version: 1,
      exportedAt: localISO(new Date()),
      entries: entries,
    };
    downloadBlob(JSON.stringify(payload, null, 2), `field-log-backup_${stamp()}.json`, "application/json");
    toast("Backup exported.");
  }

  function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ============================================================
     IMPORTING BACKUPS
     Validate -> ask merge or replace -> dedupe on merge.
  ============================================================ */
  function handleImportFile(file) {
    const reader = new FileReader();
    reader.onerror = () => toast("Couldn't read that file.", true);
    reader.onload = () => {
      let data;
      try {
        data = JSON.parse(String(reader.result));
      } catch {
        toast("That file isn't valid JSON.", true);
        return;
      }

      // Accept either a wrapped backup {entries:[…]} or a bare array
      const incoming = Array.isArray(data) ? data : Array.isArray(data.entries) ? data.entries : null;
      if (!incoming) {
        toast("This doesn't look like a Field Log backup.", true);
        return;
      }

      const clean = incoming.filter(isValidEntry);
      if (clean.length === 0) {
        toast("No valid entries found in that file.", true);
        return;
      }

      const replace = confirm(
        `Found ${clean.length} ${clean.length === 1 ? "entry" : "entries"}.\n\n` +
        `OK = REPLACE everything currently logged.\n` +
        `Cancel = MERGE with what you already have.`
      );

      if (replace) {
        if (!confirm("Replace will delete your current logs and load the backup instead. Continue?")) {
          toast("Import cancelled.");
          return;
        }
        entries = clean.map(normalizeImported);
        saveEntries();
        resetFiltersToAll();
        render();
        toast(`Replaced with ${entries.length} entries.`);
      } else {
        // Merge, skipping ids we already have
        const existingIds = new Set(entries.map((e) => e.id));
        let added = 0;
        for (const e of clean) {
          const n = normalizeImported(e);
          if (existingIds.has(n.id)) continue; // dedupe
          entries.push(n);
          existingIds.add(n.id);
          added++;
        }
        saveEntries();
        render();
        toast(added === 0 ? "Nothing new to merge — all entries already present." : `Merged ${added} new ${added === 1 ? "entry" : "entries"}.`);
      }
    };
    reader.readAsText(file);
  }

  // Fill in anything an older/partial backup might be missing
  function normalizeImported(e) {
    const out = {
      id: typeof e.id === "string" && e.id ? e.id : uid(),
      text: String(e.text || "").trim(),
      category: typeof e.category === "string" ? e.category : "",
      createdAt: String(e.createdAt || ""),
      date: String(e.date || ""),
      time: String(e.time || ""),
    };
    // Backfill date/time/createdAt from whichever field exists
    if (!out.createdAt && out.date) out.createdAt = out.date + "T00:00:00";
    if (!out.date && out.createdAt) out.date = out.createdAt.slice(0, 10);
    if (!out.time && out.createdAt) {
      const d = new Date(out.createdAt);
      if (!isNaN(d)) out.time = formatTime(d);
    }
    if (!out.date) out.date = localDateKey(new Date());
    if (!out.time) out.time = formatTime(new Date());
    if (!out.createdAt) out.createdAt = localISO(new Date());
    return out;
  }

  /* ============================================================
     RESET HANDLING — type-to-confirm guard
  ============================================================ */
  const resetModal = document.getElementById("resetModal");
  const resetConfirm = document.getElementById("resetConfirm");
  const resetConfirmBtn = document.getElementById("resetConfirmBtn");

  function openResetModal() {
    resetConfirm.value = "";
    resetConfirmBtn.disabled = true;
    resetModal.hidden = false;
    setTimeout(() => resetConfirm.focus(), 30);
  }
  function closeResetModal() { resetModal.hidden = true; }

  function doReset() {
    entries = [];
    try { localStorage.removeItem(LS_ENTRIES); } catch (_) {}
    closeResetModal();
    resetFiltersToAll();
    render();
    toast("All data cleared.");
  }

  /* ============================================================
     THEME HANDLING
  ============================================================ */
  const root = document.documentElement;
  const themeGlyph = document.querySelector("[data-theme-glyph]");

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    themeGlyph.textContent = theme === "dark" ? "☾" : "☀";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#14181d" : "#e9e5db");
  }

  function initTheme() {
    let theme = null;
    try { theme = localStorage.getItem(LS_THEME); } catch (_) {}
    if (!theme) {
      const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      theme = prefersDark ? "dark" : "light";
    }
    applyTheme(theme);
  }

  function toggleTheme() {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem(LS_THEME, next); } catch (_) {}
  }

  /* ============================================================
     UI PLUMBING — toast, status line, chips, drawer
  ============================================================ */
  const toastEl = document.getElementById("toast");
  let toastTimer = null;
  function toast(message, isError) {
    toastEl.textContent = message;
    toastEl.classList.toggle("toast--error", !!isError);
    toastEl.hidden = false;
    // force reflow so the transition runs each time
    void toastEl.offsetWidth;
    toastEl.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove("is-show");
      setTimeout(() => { toastEl.hidden = true; }, 220);
    }, 2600);
  }

  const savedFlash = document.getElementById("savedFlash");
  const lastSaved = document.getElementById("lastSaved");
  let flashTimer = null;
  function showSaved(entry) {
    savedFlash.hidden = false;
    savedFlash.style.animation = "none";
    void savedFlash.offsetWidth;
    savedFlash.style.animation = "";
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { savedFlash.hidden = true; }, 1800);
    lastSaved.textContent = `Last saved ${entry.time}`;
  }

  function renderCategoryChips() {
    const container = document.getElementById("categoryChips");
    const cats = Array.from(
      new Set(entries.map((e) => (e.category || "").trim()).filter(Boolean).map((c) => c.toLowerCase()))
    ).sort();

    container.innerHTML = "";
    if (cats.length === 0) {
      // If the currently-selected category vanished, drop the filter
      if (filters.category) { filters.category = null; }
      return;
    }

    // "All categories" reset chip
    const allChip = document.createElement("button");
    allChip.type = "button";
    allChip.className = "chip" + (filters.category === null ? " is-active" : "");
    allChip.textContent = "all categories";
    allChip.addEventListener("click", () => { filters.category = null; render(); });
    container.appendChild(allChip);

    for (const c of cats) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip chip--cat" + (filters.category === c ? " is-active" : "");
      chip.textContent = c;
      chip.addEventListener("click", () => {
        filters.category = filters.category === c ? null : c;
        render();
      });
      container.appendChild(chip);
    }
  }

  function resetFiltersToAll() {
    filters.range = "all";
    filters.category = null;
    // Reflect in the date chips UI
    document.querySelectorAll("#dateChips .chip").forEach((c) =>
      c.classList.toggle("is-active", c.dataset.range === "all")
    );
    document.getElementById("customRange").hidden = true;
  }

  /* ============================================================
     WIRING UP EVENTS
  ============================================================ */
  const entryInput = document.getElementById("entryInput");
  const composeForm = document.getElementById("composeForm");

  // Auto-grow the compose textarea
  function autoGrow() {
    entryInput.style.height = "auto";
    entryInput.style.height = Math.min(entryInput.scrollHeight, window.innerHeight * 0.4) + "px";
  }
  entryInput.addEventListener("input", autoGrow);

  function submitEntry() {
    const val = entryInput.value;
    if (!val.trim()) { toast("Type something first.", true); entryInput.focus(); return; }
    const entry = addEntry(val);
    if (!entry) { entryInput.focus(); return; }
    entryInput.value = "";
    autoGrow();
    // Keep the input as the focus; don't scroll the page around
    entryInput.focus();
    showSaved(entry);
    render();
  }

  composeForm.addEventListener("submit", (e) => { e.preventDefault(); submitEntry(); });

  // Enter saves; Shift+Enter makes a new line
  entryInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitEntry(); }
  });

  // Tools drawer
  const drawer = document.getElementById("toolsDrawer");
  const menuToggle = document.getElementById("menuToggle");
  menuToggle.addEventListener("click", () => {
    const open = drawer.hidden;
    drawer.hidden = !open;
    menuToggle.setAttribute("aria-expanded", String(open));
  });

  document.getElementById("themeToggle").addEventListener("click", toggleTheme);

  // Search
  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener("input", () => { filters.query = searchInput.value; render(); });

  // Date chips
  const customRange = document.getElementById("customRange");
  document.getElementById("dateChips").addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    document.querySelectorAll("#dateChips .chip").forEach((c) => c.classList.remove("is-active"));
    btn.classList.add("is-active");
    filters.range = btn.dataset.range;
    customRange.hidden = filters.range !== "custom";
    render();
  });

  document.getElementById("fromDate").addEventListener("change", (e) => { filters.from = e.target.value || null; render(); });
  document.getElementById("toDate").addEventListener("change", (e) => { filters.to = e.target.value || null; render(); });

  // Export / import
  document.getElementById("exportPdf").addEventListener("click", exportPdf);
  document.getElementById("exportCsv").addEventListener("click", exportCsv);
  document.getElementById("exportJson").addEventListener("click", exportJson);

  const importFile = document.getElementById("importFile");
  document.getElementById("importBtn").addEventListener("click", () => importFile.click());
  importFile.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) handleImportFile(file);
    importFile.value = ""; // allow re-importing the same file
  });

  // Reset flow
  document.getElementById("resetBtn").addEventListener("click", openResetModal);
  document.getElementById("resetBackupBtn").addEventListener("click", exportJson);
  resetConfirm.addEventListener("input", () => {
    resetConfirmBtn.disabled = resetConfirm.value.trim() !== "RESET";
  });
  resetConfirm.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && resetConfirm.value.trim() === "RESET") doReset();
  });
  resetConfirmBtn.addEventListener("click", doReset);
  resetModal.querySelectorAll("[data-close-reset]").forEach((el) =>
    el.addEventListener("click", closeResetModal)
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !resetModal.hidden) closeResetModal();
  });

  /* ============================================================
     BOOT
  ============================================================ */
  initTheme();
  loadEntries();
  render();
  autoGrow();
  entryInput.focus();
})();
