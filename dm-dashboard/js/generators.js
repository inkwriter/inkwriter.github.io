// generators.js — NPC Generator (Phase One). Encounter/loot/etc. arrive in Phase Two.

let npcs = [];
let npcDraft = null;

const NPC_FIELDS = [
  ["name","Name", () => pick(DATA.firstNames)+" "+pick(DATA.lastNames)],
  ["species","Species", () => pick(DATA.species).name],
  ["age","Age", () => (rollDie(50)+15) + " years"],
  ["occupation","Occupation", () => pick(DATA.npcOccupations)],
  ["appearance","Appearance", () => pick(DATA.npcAppearances)],
  ["personality","Personality", () => pick(DATA.traits)],
  ["voice","Voice", () => pick(DATA.npcVoices)],
  ["goal","Goal", () => pick(DATA.npcGoals)],
  ["fear","Fear", () => pick(DATA.npcFears)],
  ["secret","Secret", () => pick(DATA.npcSecrets)],
  ["motivation","Motivation", () => pick(DATA.npcMotivations)],
  ["relation","Relationship to party", () => pick(DATA.npcRelations)],
  ["hook","Quest hook", () => pick(DATA.questHooks)]
];

function initNPCs(){
  npcs = Store.get(Store.KEYS.npcs, []);
  renderNPCList();
}

function generateNPC(){
  npcDraft = { id: uid() };
  NPC_FIELDS.forEach(([key,,fn]) => npcDraft[key] = fn());
  npcDraft.desc = `${npcDraft.name} is a ${npcDraft.species.toLowerCase()} ${npcDraft.occupation.toLowerCase()} — ${npcDraft.appearance.toLowerCase()}. ${npcDraft.voice}.`;
  renderNPCDraft();
}

function rerollNPCField(key){
  if (!npcDraft) return;
  const field = NPC_FIELDS.find(f => f[0] === key);
  if (field) npcDraft[key] = field[2]();
  npcDraft.desc = `${npcDraft.name} is a ${npcDraft.species.toLowerCase()} ${npcDraft.occupation.toLowerCase()} — ${npcDraft.appearance.toLowerCase()}. ${npcDraft.voice}.`;
  renderNPCDraft();
}

function renderNPCDraft(){
  const el = document.getElementById("npc-draft");
  if (!npcDraft){ el.innerHTML=""; return; }
  el.innerHTML = `<div class="card">
    <h3>${esc(npcDraft.name)}</h3>
    <p class="muted">${esc(npcDraft.desc)}</p>
    ${NPC_FIELDS.map(([key,label]) => `
      <p><button class="lock" title="Reroll ${label}" onclick="rerollNPCField('${key}')">🎲</button>
      <strong>${label}:</strong> ${esc(npcDraft[key])}</p>`).join("")}
    <div class="btnrow">
      <button onclick="generateNPC()">Reroll All</button>
      <button class="primary" onclick="saveNPC()">Save NPC</button>
    </div></div>`;
}

function saveNPC(){
  if (!npcDraft) return;
  if (!npcs.find(n=>n.id===npcDraft.id)) npcs.push(npcDraft);
  Store.set(Store.KEYS.npcs, npcs);
  renderNPCList();
  alert(`${npcDraft.name} saved.`);
}

function renderNPCList(){
  const el = document.getElementById("npc-list");
  if (!el) return;
  el.innerHTML = npcs.length
    ? npcs.map(n => `<li>
        <button class="linklike" onclick="viewNPC('${n.id}')">${esc(n.name)}</button>
        <span class="muted">${esc(n.occupation)}</span>
        <span class="rowbtns">
          <button onclick="copyNPC('${n.id}', this)" title="Copy">⧉</button>
          <button onclick="editNPC('${n.id}')" title="Edit">✎</button>
          <button class="danger" onclick="delNPC('${n.id}')" title="Delete">✕</button>
        </span></li>`).join("")
    : `<li class="muted">No saved NPCs yet.</li>`;
}

function viewNPC(id){
  npcDraft = JSON.parse(JSON.stringify(npcs.find(n=>n.id===id) || null));
  renderNPCDraft();
  document.getElementById("npc-draft").scrollIntoView({behavior:"smooth"});
}
function copyNPC(id, btn){
  const n = npcs.find(x=>x.id===id);
  if (n) copyText(NPC_FIELDS.map(([k,l])=>`${l}: ${n[k]}`).join("\n"), btn);
}
function editNPC(id){
  const n = npcs.find(x=>x.id===id);
  if (!n) return;
  const name = prompt("Name:", n.name); if (name === null) return;
  const occ = prompt("Occupation:", n.occupation); if (occ === null) return;
  const goal = prompt("Goal:", n.goal); if (goal === null) return;
  const secret = prompt("Secret:", n.secret); if (secret === null) return;
  n.name = name.trim() || n.name; n.occupation = occ.trim() || n.occupation;
  n.goal = goal; n.secret = secret;
  Store.set(Store.KEYS.npcs, npcs);
  renderNPCList();
  if (npcDraft && npcDraft.id === id) viewNPC(id);
}
function delNPC(id){
  const n = npcs.find(x=>x.id===id);
  if (!n || !confirm(`Delete ${n.name}?`)) return;
  npcs = npcs.filter(x=>x.id!==id);
  if (npcDraft && npcDraft.id === id){ npcDraft = null; document.getElementById("npc-draft").innerHTML=""; }
  Store.set(Store.KEYS.npcs, npcs);
  renderNPCList();
}
