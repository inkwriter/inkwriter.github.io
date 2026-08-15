// app.js — Navigation, optional JSON data overrides, Dice Roller, backup controls.

// ---------- navigation (hash-based sections) ----------

const SECTIONS = ["home","characters","npcs","dice","initiative","notes","reference","settings"];

function showSection(id){
  if (!SECTIONS.includes(id)) id = "home";
  SECTIONS.forEach(s => {
    const el = document.getElementById("sec-"+s);
    if (el) el.hidden = (s !== id);
  });
  document.querySelectorAll(".topnav a").forEach(a => a.classList.toggle("active", a.dataset.sec === id));
  window.scrollTo(0,0);
}
window.addEventListener("hashchange", () => showSection(location.hash.replace("#","") || "home"));

// ---------- optional JSON overrides ----------
// If /data/generators/<category>.json exists (GitHub Pages), it replaces that
// category in DATA. Missing files or file:// failures are ignored silently,
// so the built-in defaults in data.js always keep the app working.

const OVERRIDE_FILES = {
  firstNames:"names.json", weather:"weather.json", questHooks:"quest-hooks.json",
  traits:"personalities.json"
};
function loadOverrides(){
  if (location.protocol === "file:") return; // fetch blocked on file://; defaults are used
  Object.entries(OVERRIDE_FILES).forEach(([cat, file]) => {
    fetch("data/generators/" + file)
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (!json) return;
        // Accept either a bare array or { "category": [ ... ] }
        const arr = Array.isArray(json) ? json : json[Object.keys(json)[0]];
        if (Array.isArray(arr) && arr.length) DATA[cat] = arr;
      })
      .catch(() => {}); // missing file is fine
  });
}

// ---------- dice roller ----------

let diceHistory = [];
const advSelect = () => document.getElementById("dice-adv").value;

function rollExpression(expr){
  // Supports forms like: d20, 2d6+3, 4d8, 1d20-1. Whitespace ignored.
  const m = /^(\d*)d(\d+)([+-]\d+)?$/.exec(expr.replace(/\s+/g,"").toLowerCase());
  if (!m) return null;
  const count = Math.min(parseInt(m[1] || "1",10), 100);
  const sides = Math.min(parseInt(m[2],10), 1000);
  const bonus = parseInt(m[3] || "0",10);
  if (count < 1 || sides < 2) return null;
  const rolls = [];
  for (let i=0;i<count;i++) rolls.push(rollDie(sides));
  return { rolls, bonus, total: rolls.reduce((a,b)=>a+b,0)+bonus, expr:`${count}d${sides}${bonus? (bonus>0?"+":"")+bonus : ""}` };
}

function doRoll(expr, secret){
  const advMode = advSelect();
  let result, detail;

  if (advMode !== "none" && /^1?d20/.test(expr.replace(/\s+/g,""))){
    const r1 = rollExpression(expr), r2 = rollExpression(expr);
    if (!r1){ alert("Could not read that dice expression. Try formats like 1d20+5 or 2d6."); return; }
    const keep = advMode === "adv" ? (r1.total >= r2.total ? r1 : r2) : (r1.total <= r2.total ? r1 : r2);
    result = keep.total;
    detail = `${r1.expr} ${advMode === "adv" ? "advantage" : "disadvantage"}: [${r1.rolls[0]}] vs [${r2.rolls[0]}] → kept ${keep.rolls[0]}${keep.bonus? " "+(keep.bonus>0?"+":"")+keep.bonus : ""}`;
  } else {
    const r = rollExpression(expr);
    if (!r){ alert("Could not read that dice expression. Try formats like 1d20+5 or 2d6."); return; }
    result = r.total;
    detail = `${r.expr}: [${r.rolls.join(", ")}]${r.bonus? " "+(r.bonus>0?"+":"")+r.bonus : ""}`;
  }

  diceHistory.unshift({ result, detail, secret: !!secret, time: new Date().toLocaleTimeString() });
  diceHistory = diceHistory.slice(0, 50);
  Store.set(Store.KEYS.history, diceHistory);
  renderDice(result, detail, secret);
}

function quickRoll(sides){
  const n = Math.max(1, parseInt(document.getElementById("dice-count").value,10) || 1);
  const b = parseInt(document.getElementById("dice-mod").value,10) || 0;
  doRoll(`${n}d${sides}${b ? (b>0?"+":"")+b : ""}`, false);
}

function rollCustom(secret){
  const expr = document.getElementById("dice-expr").value.trim();
  if (!expr){ alert("Enter a dice expression first, like 2d6+3."); return; }
  doRoll(expr, secret);
}

function renderDice(result, detail, secret){
  const out = document.getElementById("dice-result");
  if (out) out.innerHTML = secret
    ? `<span class="big">DM roll made</span><div class="muted">Result hidden — see history.</div>`
    : `<span class="big">${result}</span><div class="muted">${esc(detail)}</div>`;
  renderDiceHistory();
}

function renderDiceHistory(){
  const el = document.getElementById("dice-history");
  if (!el) return;
  el.innerHTML = diceHistory.length
    ? diceHistory.map(h => `<li>${h.secret ? "🔒 " : ""}<strong>${h.result}</strong> — ${esc(h.detail)} <span class="muted">${h.time}</span></li>`).join("")
    : `<li class="muted">No rolls yet.</li>`;
}

function clearDiceHistory(){
  diceHistory = [];
  Store.set(Store.KEYS.history, diceHistory);
  renderDiceHistory();
}

// ---------- session notes ----------

let notes = [];
let activeNote = null;

function loadNotes(){ notes = Store.get(Store.KEYS.notes, []); renderNoteList(); }
function saveNotes(){ Store.set(Store.KEYS.notes, notes); renderNoteList(); }

function newNote(){
  activeNote = { id: uid(), title:"New Session", date: new Date().toISOString().slice(0,10), tags:"", body:"" };
  notes.unshift(activeNote);
  saveNotes(); openNote(activeNote.id);
}
function openNote(id){
  activeNote = notes.find(n => n.id === id) || null;
  const ed = document.getElementById("note-editor");
  if (!activeNote){ ed.hidden = true; return; }
  ed.hidden = false;
  document.getElementById("note-title").value = activeNote.title;
  document.getElementById("note-date").value = activeNote.date;
  document.getElementById("note-tags").value = activeNote.tags;
  document.getElementById("note-body").value = activeNote.body;
}
function noteChanged(){
  if (!activeNote) return;
  activeNote.title = document.getElementById("note-title").value;
  activeNote.date = document.getElementById("note-date").value;
  activeNote.tags = document.getElementById("note-tags").value;
  activeNote.body = document.getElementById("note-body").value;
  saveNotes(); // autosave on every change event (input blur / typing pause via 'change' and debounce)
}
let noteTimer = null;
function noteTyped(){ clearTimeout(noteTimer); noteTimer = setTimeout(noteChanged, 600); }

function deleteNote(){
  if (!activeNote) return;
  if (!confirm(`Delete note "${activeNote.title}"?`)) return;
  notes = notes.filter(n => n.id !== activeNote.id);
  activeNote = null;
  document.getElementById("note-editor").hidden = true;
  saveNotes();
}
function copyNote(){ if (activeNote) copyText(`# ${activeNote.title} (${activeNote.date})\nTags: ${activeNote.tags}\n\n${activeNote.body}`, document.getElementById("note-copy")); }
function downloadNote(){ if (activeNote) downloadText(activeNote.title.replace(/\W+/g,"-").toLowerCase()+".txt", `${activeNote.title} (${activeNote.date})\nTags: ${activeNote.tags}\n\n${activeNote.body}`); }
function exportNotes(){ downloadText("session-notes.json", JSON.stringify(notes, null, 2)); }
function importNotes(){
  const json = prompt("Paste exported notes JSON:");
  if (!json) return;
  try{
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) throw new Error();
    arr.forEach(n => { if (n && n.id && !notes.find(x=>x.id===n.id)) notes.push(n); });
    saveNotes();
    alert("Notes imported. Existing notes were kept.");
  }catch(e){ alert("That was not a valid notes export. Nothing was changed."); }
}
function renderNoteList(){
  const q = (document.getElementById("note-search")?.value || "").toLowerCase();
  const el = document.getElementById("note-list");
  if (!el) return;
  const shown = notes.filter(n => !q || (n.title+" "+n.tags+" "+n.body).toLowerCase().includes(q));
  el.innerHTML = shown.length
    ? shown.map(n => `<li><button class="linklike" onclick="openNote('${n.id}')">${esc(n.title)}</button> <span class="muted">${esc(n.date)}${n.tags? " · "+esc(n.tags):""}</span></li>`).join("")
    : `<li class="muted">No notes${q? " match that search":""}.</li>`;
}

// ---------- boot ----------

document.addEventListener("DOMContentLoaded", () => {
  loadOverrides();
  diceHistory = Store.get(Store.KEYS.history, []);
  renderDiceHistory();
  loadNotes();
  if (typeof initCharacters === "function") initCharacters();
  if (typeof initNPCs === "function") initNPCs();
  if (typeof initCombat === "function") initCombat();
  showSection(location.hash.replace("#","") || "home");
});
