// combat.js — Initiative Tracker. State persists in LocalStorage across refreshes.

let combat = { round:1, turn:0, list:[] };

const CONDITIONS = ["Blinded","Charmed","Deafened","Frightened","Grappled","Incapacitated","Invisible","Paralyzed","Petrified","Poisoned","Prone","Restrained","Stunned","Unconscious"];

function initCombat(){
  combat = Store.get(Store.KEYS.init, { round:1, turn:0, list:[] });
  renderCombat();
}
function saveCombat(){ Store.set(Store.KEYS.init, combat); renderCombat(); }

function addCombatant(pre){
  const c = Object.assign({
    id: uid(), name:"Combatant", init:10, hp:10, hpMax:10, ac:10,
    side:"enemy", conditions:[], conc:false, notes:""
  }, pre || {});
  if (!pre){
    const name = prompt("Name:"); if (!name) return;
    c.name = name;
    c.init = parseInt(prompt("Initiative:", "10"),10) || 10;
    c.hpMax = c.hp = parseInt(prompt("Max HP:", "10"),10) || 10;
    c.ac = parseInt(prompt("AC:", "12"),10) || 12;
    c.side = (prompt("Side — ally, enemy, or neutral:", "enemy") || "enemy").toLowerCase();
    if (!["ally","enemy","neutral"].includes(c.side)) c.side = "neutral";
  }
  combat.list.push(c);
  saveCombat();
}

function addSavedCharacter(){
  if (!characters.length){ alert("No saved characters. Create one in the Character Studio first."); return; }
  const names = characters.map((c,i)=>`${i+1}. ${c.name} (${c.klass} ${c.level})`).join("\n");
  const n = parseInt(prompt("Add which character?\n"+names, "1"),10);
  const c = characters[n-1];
  if (!c) return;
  addCombatant({ name:c.name, init: rollDie(20)+c.initiative, hp:c.hp, hpMax:c.hpMax, ac:c.ac, side:"ally" });
}

function addSavedNPC(){
  if (!npcs.length){ alert("No saved NPCs. Create one in the NPC Generator first."); return; }
  const names = npcs.map((x,i)=>`${i+1}. ${x.name} (${x.occupation})`).join("\n");
  const n = parseInt(prompt("Add which NPC?\n"+names, "1"),10);
  const x = npcs[n-1];
  if (!x) return;
  addCombatant({ name:x.name, init: rollDie(20), hp:8, hpMax:8, ac:10, side:"neutral" });
}

function sortInit(){
  combat.list.sort((a,b)=>b.init-a.init);
  combat.turn = 0;
  saveCombat();
}
function nextTurn(){
  if (!combat.list.length) return;
  combat.turn++;
  if (combat.turn >= combat.list.length){ combat.turn = 0; combat.round++; }
  saveCombat();
}
function prevTurn(){
  if (!combat.list.length) return;
  combat.turn--;
  if (combat.turn < 0){ combat.turn = combat.list.length-1; combat.round = Math.max(1, combat.round-1); }
  saveCombat();
}
function damage(id, sign){
  const c = combat.list.find(x=>x.id===id);
  if (!c) return;
  const n = parseInt(prompt(sign>0 ? "Healing amount:" : "Damage amount:", "1"),10);
  if (isNaN(n)) return;
  c.hp = Math.max(0, Math.min(c.hpMax, c.hp + sign*n));
  if (c.hp === 0 && sign < 0 && c.conc){ c.conc = false; alert(`${c.name} drops to 0 HP — concentration ends.`); }
  saveCombat();
}
function toggleConc(id){
  const c = combat.list.find(x=>x.id===id);
  if (c){ c.conc = !c.conc; saveCombat(); }
}
function addCondition(id){
  const c = combat.list.find(x=>x.id===id);
  if (!c) return;
  const pickStr = prompt("Condition:\n" + CONDITIONS.join(", "), "Prone");
  if (!pickStr) return;
  if (!c.conditions.includes(pickStr)) c.conditions.push(pickStr);
  saveCombat();
}
function removeCondition(id, cond){
  const c = combat.list.find(x=>x.id===id);
  if (c){ c.conditions = c.conditions.filter(x=>x!==cond); saveCombat(); }
}
function editCombatantNotes(id){
  const c = combat.list.find(x=>x.id===id);
  if (!c) return;
  const n = prompt("Notes:", c.notes || "");
  if (n !== null){ c.notes = n; saveCombat(); }
}
function removeCombatant(id){
  const c = combat.list.find(x=>x.id===id);
  if (!c || !confirm(`Remove ${c.name} from combat?`)) return;
  const idx = combat.list.indexOf(c);
  combat.list = combat.list.filter(x=>x.id!==id);
  if (idx < combat.turn) combat.turn--;
  if (combat.turn >= combat.list.length) combat.turn = 0;
  saveCombat();
}
function resetEncounter(){
  if (!confirm("Clear all combatants and reset the encounter?")) return;
  combat = { round:1, turn:0, list:[] };
  saveCombat();
}

function renderCombat(){
  const el = document.getElementById("combat-table");
  if (!el) return;
  document.getElementById("combat-round").textContent = "Round " + combat.round;
  if (!combat.list.length){
    el.innerHTML = `<p class="muted">No combatants. Add one to begin.</p>`;
    return;
  }
  el.innerHTML = `<table class="combat">
    <tr><th>Init</th><th>Name</th><th>HP</th><th>AC</th><th>Status</th><th></th></tr>
    ${combat.list.map((c,i)=>`
      <tr class="${i===combat.turn?'active':''} side-${c.side}">
        <td>${c.init}</td>
        <td><strong>${esc(c.name)}</strong>${c.conc?' <span title="Concentrating">🧠</span>':''}
          ${c.notes?`<div class="muted small">${esc(c.notes)}</div>`:""}
          ${c.conditions.map(cd=>`<span class="chip" onclick="removeCondition('${c.id}','${esc(cd)}')" title="Tap to remove">${esc(cd)} ✕</span>`).join(" ")}</td>
        <td class="${c.hp===0?'dead':''}">${c.hp}/${c.hpMax}</td>
        <td>${c.ac}</td>
        <td><span class="muted">${c.side}</span></td>
        <td class="rowbtns">
          <button onclick="damage('${c.id}',-1)" title="Damage">−</button>
          <button onclick="damage('${c.id}',1)" title="Heal">+</button>
          <button onclick="addCondition('${c.id}')" title="Add condition">☠</button>
          <button onclick="toggleConc('${c.id}')" title="Toggle concentration">🧠</button>
          <button onclick="editCombatantNotes('${c.id}')" title="Notes">✎</button>
          <button class="danger" onclick="removeCombatant('${c.id}')" title="Remove">✕</button>
        </td></tr>`).join("")}
  </table>`;
}
