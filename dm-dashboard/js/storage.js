// storage.js — LocalStorage wrappers, backup/restore, shared utilities.

const Store = {
  KEYS: { chars:"dmd.characters", npcs:"dmd.npcs", init:"dmd.initiative", notes:"dmd.notes", settings:"dmd.settings", history:"dmd.diceHistory" },

  get(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    }catch(e){
      console.warn("Could not read " + key, e);
      return fallback;
    }
  },
  set(key, value){
    try{ localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch(e){ alert("Saving failed. Browser storage may be full or blocked."); return false; }
  },

  exportBackup(){
    const backup = {};
    Object.values(this.KEYS).forEach(k => backup[k] = this.get(k, null));
    downloadText("dm-dashboard-backup.json", JSON.stringify(backup, null, 2));
  },
  importBackup(json){
    let data;
    try{ data = JSON.parse(json); }
    catch(e){ alert("That file is not valid JSON. Nothing was changed."); return false; }
    if (typeof data !== "object" || data === null){ alert("Backup format not recognized. Nothing was changed."); return false; }
    Object.values(this.KEYS).forEach(k => { if (k in data && data[k] !== null) this.set(k, data[k]); });
    alert("Backup imported. Reloading.");
    location.reload();
    return true;
  },
  resetAll(){
    if (!confirm("Delete ALL saved dashboard data (characters, NPCs, notes, combat)? This cannot be undone.")) return;
    if (!confirm("Really delete everything? Consider exporting a backup first.")) return;
    Object.values(this.KEYS).forEach(k => localStorage.removeItem(k));
    location.reload();
  }
};

// ---------- shared utilities ----------

function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function pickN(arr, n){
  const copy = arr.slice(), out = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(Math.random()*copy.length),1)[0]);
  return out;
}
function rollDie(sides){ return Math.floor(Math.random()*sides)+1; }
function mod(score){ return Math.floor((score-10)/2); }
function fmtMod(m){ return (m>=0?"+":"") + m; }
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

// Escape user content before inserting into HTML.
function esc(s){
  return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

function downloadText(filename, text){
  const blob = new Blob([text], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function copyText(text, btn){
  const done = () => { if(btn){ const t=btn.textContent; btn.textContent="Copied!"; setTimeout(()=>btn.textContent=t,1200);} };
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(done, () => legacyCopy(text, done));
  } else legacyCopy(text, done);
}
function legacyCopy(text, done){
  const ta = document.createElement("textarea");
  ta.value = text; document.body.appendChild(ta); ta.select();
  try{ document.execCommand("copy"); done(); }catch(e){ alert("Copy failed — select and copy manually."); }
  document.body.removeChild(ta);
}
