// ─── MAIN ────────────────────────────────────────────────────────

function switchMode(mode) {
  document.querySelectorAll(".mode-btn").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
  document.getElementById("view-app").classList.toggle("hidden",    mode !== "app");
  document.getElementById("view-editor").classList.toggle("hidden", mode !== "editor");

  if (mode === "app") {
    const activeTab = document.querySelector(".tab.active")?.dataset.tab || "plan";
    switchTab(activeTab);
  }
  if (mode === "editor") {
    updateEditorCounts();
    renderEditorModule();
  }
}

function setSyncStatus(msg, color) {
  const el = document.getElementById("sync-status");
  if (!el) return;
  el.textContent = msg;
  el.style.color = color || "rgba(255,255,255,0.5)";
}

// ─── BOOT ─────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  // Step 1: Load local data immediately so the app is usable right away
  State.loadLocal();
  document.getElementById("family-name-display").textContent = State.settings.familyName || "Family";
  renderPlan();

  // Step 2: Try to sync from Google Sheets in the background
  if (CONFIG.PUBLISHED_KEY) {
    setSyncStatus("⟳ syncing…", "rgba(255,255,255,0.5)");
    const fetched = await fetchFromSheets();
    if (State.applySheets(fetched)) {
      setSyncStatus("✓ synced", "#7dd4a0");
      // Refresh whatever is visible
      document.getElementById("family-name-display").textContent = State.settings.familyName || "Family";
      const activeTab = document.querySelector(".tab.active")?.dataset.tab || "plan";
      switchTab(activeTab);
      setTimeout(() => setSyncStatus("", ""), 3000);
    } else {
      setSyncStatus("local data", "rgba(255,255,255,0.35)");
    }
  } else {
    setSyncStatus("no sheet connected", "rgba(255,255,255,0.3)");
  }
});
