// character.js — Character Studio: random generator (with field locks), guided
// creator, saved-character management, and standard/simplified sheet views.

const ABILS = ["STR","DEX","CON","INT","WIS","CHA"];
const SKILL_ABIL = {
  "Acrobatics":"DEX","Animal Handling":"WIS","Arcana":"INT","Athletics":"STR","Deception":"CHA",
  "History":"INT","Insight":"WIS","Intimidation":"CHA","Investigation":"INT","Medicine":"WIS",
  "Nature":"INT","Perception":"WIS","Performance":"CHA","Persuasion":"CHA","Religion":"INT",
  "Sleight of Hand":"DEX","Stealth":"DEX","Survival":"WIS"
};

let characters = [];
let draft = null;          // character currently in the generator (not yet saved)
let locks = {};            // fieldName -> true while locked
let viewingId = null;      // id of saved character being viewed
let sheetMode = "standard";// "standard" | "simple"
let simpleLevel = "basic"; // "basic" | "beginner" | "young"

function initCharacters(){
  characters = Store.get(Store.KEYS.chars, []);
  renderCharList();
}

// ---------- generation ----------

function roll4d6drop(){
  const r = [rollDie(6),rollDie(6),rollDie(6),rollDie(6)].sort((a,b)=>b-a);
  return r[0]+r[1]+r[2];
}
function profBonus(level){ return 2 + Math.floor((level-1)/4); }

function buildCharacter(base){
  // base may carry locked fields; anything missing is rolled fresh.
  const c = Object.assign({}, base);
  c.id = c.id || uid();
  if (!locks.name || !c.name) c.name = pick(DATA.firstNames) + " " + pick(DATA.lastNames);
  if (!locks.species || !c.species) c.species = pick(DATA.species).name;
  if (!locks.klass || !c.klass) c.klass = pick(DATA.classes).name;
  if (!locks.background || !c.background) c.background = pick(DATA.backgrounds).name;
  if (!locks.alignment || !c.alignment) c.alignment = pick(DATA.alignments);
  if (!locks.level || !c.level) c.level = 1;
  if (!locks.personality || !c.personality) c.personality = pick(DATA.traits);
  if (!locks.ideal || !c.ideal) c.ideal = pick(DATA.ideals);
  if (!locks.bond || !c.bond) c.bond = pick(DATA.bonds);
  if (!locks.flaw || !c.flaw) c.flaw = pick(DATA.flaws);

  const cls = DATA.classes.find(k => k.name === c.klass) || DATA.classes[0];
  const sp  = DATA.species.find(s => s.name === c.species) || DATA.species[0];
  const bg  = DATA.backgrounds.find(b => b.name === c.background) || DATA.backgrounds[0];

  if (!locks.scores || !c.scores){
    const rolled = [roll4d6drop(),roll4d6drop(),roll4d6drop(),roll4d6drop(),roll4d6drop(),roll4d6drop()].sort((a,b)=>b-a);
    c.scores = {};
    cls.prio.forEach((abil,i) => c.scores[abil] = rolled[i]);
  }

  recomputeDerived(c, cls, sp, bg);
  return c;
}

// Recomputes everything derived from class/species/background/level/scores.
function recomputeDerived(c, cls, sp, bg){
  cls = cls || DATA.classes.find(k=>k.name===c.klass) || DATA.classes[0];
  sp  = sp  || DATA.species.find(s=>s.name===c.species) || DATA.species[0];
  bg  = bg  || DATA.backgrounds.find(b=>b.name===c.background) || DATA.backgrounds[0];
  const L = Math.max(1, Math.min(5, parseInt(c.level,10) || 1));
  c.level = L;
  c.prof = profBonus(L);
  c.mods = {};
  ABILS.forEach(a => c.mods[a] = mod(c.scores[a]));

  c.speed = sp.speed;
  c.saves = {};
  ABILS.forEach(a => c.saves[a] = c.mods[a] + (cls.saves.includes(a) ? c.prof : 0));

  // Skills: class picks + background skills
  if (!locks.skills || !c.skills){
    const bgSkills = bg.skills.slice();
    const clsPool = cls.skills.filter(s => !bgSkills.includes(s));
    c.skills = bgSkills.concat(pickN(clsPool, cls.nSkills));
  }
  c.skillMods = {};
  Object.keys(SKILL_ABIL).forEach(s => c.skillMods[s] = c.mods[SKILL_ABIL[s]] + (c.skills.includes(s) ? c.prof : 0));
  c.passivePerception = 10 + c.skillMods["Perception"];

  // AC
  let ac = cls.ac.base + Math.min(c.mods.DEX, cls.ac.dexMax === 0 ? 0 : cls.ac.dexMax);
  if (cls.ac.addCon) ac += c.mods.CON;
  if (cls.ac.addWis) ac += c.mods.WIS;
  c.ac = ac; c.acDesc = cls.ac.name;

  // HP: max at level 1, average thereafter
  c.hpMax = cls.hd + c.mods.CON + (L-1) * (Math.floor(cls.hd/2)+1 + c.mods.CON);
  if (c.hpMax < L) c.hpMax = L;
  if (c.hp === undefined || c.hp > c.hpMax) c.hp = c.hpMax;
  c.hitDie = "d"+cls.hd;
  c.initiative = c.mods.DEX;

  // Attacks
  c.attacks = cls.atk.map(a => {
    const abil = a.spell ? cls.cAbil : a.abil;
    const m = c.mods[abil];
    return {
      name: a.name,
      toHit: a.save ? null : m + c.prof,
      saveDC: a.save ? 8 + c.prof + m : null,
      dmg: a.dmg + (a.spell ? "" : (m ? (m>0?"+":"")+m : "")),
      dmgMod: a.spell ? 0 : m
    };
  });

  // Features (class up to level, plus species)
  c.features = [];
  for (let i=1;i<=L;i++) (cls.features[i]||[]).forEach(f => c.features.push(`Lv${i} — ${f}`));
  c.speciesFeatures = sp.features.slice();

  // Equipment & gold
  if (!locks.equipment || !c.equipment) c.equipment = cls.equip.concat(bg.equip);
  if (!locks.gold || c.gold === undefined) c.gold = (rollDie(4)+rollDie(4)) * 10;

  // Spellcasting
  if (cls.caster){
    const slotTable = SLOTS[cls.caster === "pact" ? "pact" : cls.caster][L] || [];
    c.spellAbility = cls.cAbil;
    c.spellDC = 8 + c.prof + c.mods[cls.cAbil];
    c.spellAtk = c.prof + c.mods[cls.cAbil];
    c.slots = slotTable;
    if (!locks.spells || !c.spells){
      const book = SPELLS[cls.name] || {c:[],1:[]};
      const cantrips = pickN(book.c || [], Math.min(3,(book.c||[]).length));
      let known = pickN(book[1] || [], Math.min(4,(book[1]||[]).length));
      if (L >= 3 && book[2]) known = known.concat(pickN(book[2], 2));
      if (L >= 5 && book[3]) known = known.concat(pickN(book[3], 2));
      c.spells = { cantrips, known };
    }
  } else {
    c.spellAbility = null; c.spells = null; c.slots = null;
  }
  return c;
}

function generateCharacter(){
  const lvl = parseInt(document.getElementById("gen-level").value,10) || 1;
  const base = draft && Object.keys(locks).some(k=>locks[k]) ? draft : {};
  if (!locks.level) base.level = lvl;
  draft = buildCharacter(base);
  renderDraft();
}

function toggleLock(field, btn){
  locks[field] = !locks[field];
  btn.classList.toggle("locked", locks[field]);
  btn.textContent = locks[field] ? "🔒" : "🔓";
}

function lockBtn(field){
  return `<button class="lock ${locks[field]?"locked":""}" title="Lock this field so Reroll keeps it" onclick="toggleLock('${field}', this)">${locks[field]?"🔒":"🔓"}</button>`;
}

function renderDraft(){
  const el = document.getElementById("char-draft");
  if (!draft){ el.innerHTML = ""; return; }
  const c = draft;
  el.innerHTML = `
    <div class="card">
      <h3>${esc(c.name)} ${lockBtn("name")}</h3>
      <div class="grid2">
        <p>${lockBtn("species")} <strong>Species:</strong> ${esc(c.species)}</p>
        <p>${lockBtn("klass")} <strong>Class:</strong> ${esc(c.klass)} (level ${c.level}) ${lockBtn("level")}</p>
        <p>${lockBtn("background")} <strong>Background:</strong> ${esc(c.background)}</p>
        <p>${lockBtn("alignment")} <strong>Alignment:</strong> ${esc(c.alignment)}</p>
      </div>
      <p>${lockBtn("scores")} <strong>Abilities:</strong> ${ABILS.map(a=>`${a} ${c.scores[a]} (${fmtMod(c.mods[a])})`).join(" · ")}</p>
      <p><strong>AC</strong> ${c.ac} · <strong>HP</strong> ${c.hpMax} · <strong>Speed</strong> ${c.speed} ft. · <strong>Init</strong> ${fmtMod(c.initiative)} · <strong>Prof</strong> +${c.prof}</p>
      <p>${lockBtn("skills")} <strong>Skills:</strong> ${c.skills.map(esc).join(", ")}</p>
      <p>${lockBtn("equipment")} <strong>Equipment:</strong> ${c.equipment.map(esc).join(", ")} · ${lockBtn("gold")} <strong>${c.gold} gp</strong></p>
      ${c.spells ? `<p>${lockBtn("spells")} <strong>Spells:</strong> ${c.spells.cantrips.concat(c.spells.known).map(esc).join(", ")}</p>` : ""}
      <p>${lockBtn("personality")} <strong>Trait:</strong> ${esc(c.personality)}</p>
      <p>${lockBtn("ideal")} <strong>Ideal:</strong> ${esc(c.ideal)}</p>
      <p>${lockBtn("bond")} <strong>Bond:</strong> ${esc(c.bond)}</p>
      <p>${lockBtn("flaw")} <strong>Flaw:</strong> ${esc(c.flaw)}</p>
      <div class="btnrow">
        <button onclick="generateCharacter()">Reroll Unlocked Fields</button>
        <button class="primary" onclick="saveDraft()">Save Character</button>
      </div>
    </div>`;
}

function saveDraft(){
  if (!draft) return;
  if (!characters.find(x=>x.id===draft.id)) characters.push(draft);
  Store.set(Store.KEYS.chars, characters);
  renderCharList();
  alert(`${draft.name} saved.`);
}

// ---------- guided creator ----------

const GUIDE_QUESTIONS = [
  {q:"How does your hero like to solve problems?", opts:[["Weapons and strength","martial"],["Magic","magic"],["A bit of both","mixed"],["Cleverness and sneaking","sneaky"]]},
  {q:"Where do you want to be in a fight?", opts:[["Right up close","melee"],["Far away","ranged"],["Wherever my friends need me","support"]]},
  {q:"What matters most to you?", opts:[["Protecting my friends","protect"],["Healing people","heal"],["Winning","win"],["Exploring and animals","nature"]]},
  {q:"Pick a word for your hero:", opts:[["Strong","STR"],["Quick","DEX"],["Clever","INT"],["Wise","WIS"],["Charming","CHA"]]},
  {q:"What personality fits best?", opts:[["Brave","brave"],["Funny","funny"],["Mysterious","mysterious"],["Kind","kind"],["Unusual","weird"]]}
];
let guideAnswers = [];
let guideStep = 0;

function startGuide(){
  guideAnswers = []; guideStep = 0;
  document.getElementById("guide-box").hidden = false;
  renderGuideStep();
}
function renderGuideStep(){
  const box = document.getElementById("guide-box");
  if (guideStep >= GUIDE_QUESTIONS.length){ finishGuide(); return; }
  const g = GUIDE_QUESTIONS[guideStep];
  box.innerHTML = `<div class="card"><h3>Question ${guideStep+1} of ${GUIDE_QUESTIONS.length}</h3>
    <p>${esc(g.q)}</p>
    <div class="btnrow">${g.opts.map((o,i)=>`<button onclick="answerGuide(${i})">${esc(o[0])}</button>`).join("")}</div></div>`;
}
function answerGuide(i){
  guideAnswers.push(GUIDE_QUESTIONS[guideStep].opts[i][1]);
  guideStep++;
  renderGuideStep();
}
function finishGuide(){
  const a = guideAnswers;
  const score = {};
  DATA.classes.forEach(c => score[c.name]=0);
  const bump = (names,n=2) => names.forEach(x => score[x]+=n);

  if (a.includes("martial")) bump(["Fighter","Barbarian","Monk"]);
  if (a.includes("magic")) bump(["Wizard","Sorcerer","Warlock","Druid"]);
  if (a.includes("mixed")) bump(["Paladin","Ranger","Bard","Cleric"]);
  if (a.includes("sneaky")) bump(["Rogue","Ranger"],3);
  if (a.includes("melee")) bump(["Fighter","Barbarian","Paladin","Monk"]);
  if (a.includes("ranged")) bump(["Ranger","Wizard","Sorcerer","Warlock","Rogue"]);
  if (a.includes("support")) bump(["Cleric","Bard","Druid","Paladin"]);
  if (a.includes("protect")) bump(["Paladin","Fighter","Cleric"]);
  if (a.includes("heal")) bump(["Cleric","Druid","Bard"],3);
  if (a.includes("win")) bump(["Fighter","Rogue","Sorcerer"]);
  if (a.includes("nature")) bump(["Ranger","Druid"],3);
  if (a.includes("STR")) bump(["Fighter","Barbarian","Paladin"]);
  if (a.includes("DEX")) bump(["Rogue","Ranger","Monk"]);
  if (a.includes("INT")) bump(["Wizard"]);
  if (a.includes("WIS")) bump(["Cleric","Druid","Monk"]);
  if (a.includes("CHA")) bump(["Bard","Sorcerer","Warlock","Paladin"]);

  const best = Object.entries(score).sort((x,y)=>y[1]-x[1])[0][0];
  locks = { klass:true };
  draft = buildCharacter({ klass: best, level: 1 });
  // Personality flavored by last answer
  const persMap = { brave:"I never back down from a dare.", funny:"I have a joke for every occasion.", mysterious:"I am suspicious of strangers.", kind:"I am utterly loyal to my friends.", weird:"I quote old proverbs constantly." };
  if (persMap[a[4]]) draft.personality = persMap[a[4]];
  document.getElementById("guide-box").innerHTML =
    `<div class="card"><h3>Recommendation: ${esc(best)}</h3><p>A character has been generated below. Lock what you like, reroll the rest, or edit after saving.</p></div>`;
  renderDraft();
  document.getElementById("char-draft").scrollIntoView({behavior:"smooth"});
}

// ---------- saved characters ----------

function renderCharList(){
  const el = document.getElementById("char-list");
  if (!el) return;
  el.innerHTML = characters.length
    ? characters.map(c => `<li>
        <button class="linklike" onclick="viewChar('${c.id}')">${esc(c.name)}</button>
        <span class="muted">${esc(c.species)} ${esc(c.klass)} ${c.level}</span>
        <span class="rowbtns">
          <button onclick="dupChar('${c.id}')" title="Duplicate">⧉</button>
          <button onclick="exportChar('${c.id}')" title="Export JSON">⬇</button>
          <button class="danger" onclick="delChar('${c.id}')" title="Delete">✕</button>
        </span></li>`).join("")
    : `<li class="muted">No saved characters yet.</li>`;
}

function viewChar(id){
  viewingId = id;
  renderSheet();
  document.getElementById("char-sheet").scrollIntoView({behavior:"smooth"});
}
function dupChar(id){
  const c = characters.find(x=>x.id===id);
  if (!c) return;
  const copy = JSON.parse(JSON.stringify(c));
  copy.id = uid(); copy.name = c.name + " (copy)";
  characters.push(copy);
  Store.set(Store.KEYS.chars, characters);
  renderCharList();
}
function delChar(id){
  const c = characters.find(x=>x.id===id);
  if (!c || !confirm(`Delete ${c.name}? This cannot be undone.`)) return;
  characters = characters.filter(x=>x.id!==id);
  if (viewingId === id){ viewingId = null; document.getElementById("char-sheet").innerHTML=""; }
  Store.set(Store.KEYS.chars, characters);
  renderCharList();
}
function exportChar(id){
  const c = characters.find(x=>x.id===id);
  if (c) downloadText(c.name.replace(/\W+/g,"-").toLowerCase()+".json", JSON.stringify(c, null, 2));
}
function copyChar(){
  const c = characters.find(x=>x.id===viewingId);
  if (c) copyText(JSON.stringify(c, null, 2), document.getElementById("char-copy-btn"));
}
function importChar(){
  const json = prompt("Paste a character JSON export:");
  if (!json) return;
  try{
    const c = JSON.parse(json);
    if (!c || !c.name || !c.scores) throw new Error();
    c.id = uid();
    recomputeDerived(c);
    characters.push(c);
    Store.set(Store.KEYS.chars, characters);
    renderCharList();
    alert(`${c.name} imported.`);
  }catch(e){ alert("That was not a valid character JSON. Nothing was changed."); }
}

// ---------- editing ----------

function editChar(){
  const c = characters.find(x=>x.id===viewingId);
  if (!c) return;
  const name = prompt("Name:", c.name); if (name === null) return;
  const lvl = prompt("Level (1-5):", c.level); if (lvl === null) return;
  const hp = prompt("Current HP:", c.hp); if (hp === null) return;
  const notes = prompt("Notes:", c.notes || ""); if (notes === null) return;
  c.name = name.trim() || c.name;
  c.level = Math.max(1, Math.min(5, parseInt(lvl,10) || c.level));
  c.notes = notes;
  locks = {}; // recompute freely but keep chosen skills/equipment/spells
  locks.skills = locks.equipment = locks.spells = locks.gold = true;
  recomputeDerived(c);
  c.hp = Math.max(0, Math.min(c.hpMax, parseInt(hp,10) || c.hpMax));
  locks = {};
  Store.set(Store.KEYS.chars, characters);
  renderCharList(); renderSheet();
}

// ---------- sheets ----------

function setSheetMode(m){ sheetMode = m; renderSheet(); }
function setSimpleLevel(l){ simpleLevel = l; renderSheet(); }

function renderSheet(){
  const el = document.getElementById("char-sheet");
  const c = characters.find(x=>x.id===viewingId);
  if (!c){ el.innerHTML = ""; return; }

  const controls = `
    <div class="btnrow sheet-controls">
      <button class="${sheetMode==='standard'?'primary':''}" onclick="setSheetMode('standard')">Standard Sheet</button>
      <button class="${sheetMode==='simple'?'primary':''}" onclick="setSheetMode('simple')">Simplified Sheet</button>
      ${sheetMode==='simple' ? `
        <select onchange="setSimpleLevel(this.value)" aria-label="Simplified detail level">
          <option value="basic" ${simpleLevel==='basic'?'selected':''}>Basic</option>
          <option value="beginner" ${simpleLevel==='beginner'?'selected':''}>Beginner</option>
          <option value="young" ${simpleLevel==='young'?'selected':''}>Young Player</option>
        </select>` : ""}
      <button onclick="editChar()">Edit</button>
      <button id="char-copy-btn" onclick="copyChar()">Copy Data</button>
    </div>`;

  el.innerHTML = controls + (sheetMode === "standard" ? standardSheet(c) : simpleSheet(c));
}

function standardSheet(c){
  const skillRows = Object.keys(SKILL_ABIL).map(s =>
    `<tr class="${c.skills.includes(s)?'prof':''}"><td>${s}</td><td>${SKILL_ABIL[s]}</td><td>${fmtMod(c.skillMods[s])}</td></tr>`).join("");
  return `<div class="card sheet">
    <h3>${esc(c.name)}</h3>
    <p class="muted">${esc(c.species)} ${esc(c.klass)} ${c.level} · ${esc(c.background)} · ${esc(c.alignment)}</p>
    <div class="statline">
      <span><strong>AC</strong> ${c.ac}</span><span><strong>HP</strong> ${c.hp}/${c.hpMax} (${c.hitDie})</span>
      <span><strong>Speed</strong> ${c.speed} ft.</span><span><strong>Init</strong> ${fmtMod(c.initiative)}</span>
      <span><strong>Prof</strong> +${c.prof}</span><span><strong>Passive Perception</strong> ${c.passivePerception}</span>
    </div>
    <p class="muted">Armor: ${esc(c.acDesc)}</p>
    <table><tr>${ABILS.map(a=>`<th>${a}</th>`).join("")}</tr>
      <tr>${ABILS.map(a=>`<td>${c.scores[a]} (${fmtMod(c.mods[a])})</td>`).join("")}</tr>
      <tr>${ABILS.map(a=>`<td class="muted">save ${fmtMod(c.saves[a])}</td>`).join("")}</tr></table>
    <details open><summary>Attacks</summary>
      <ul>${c.attacks.map(a=>`<li><strong>${esc(a.name)}</strong>: ${a.saveDC!==null?`DC ${a.saveDC} save`:`${fmtMod(a.toHit)} to hit`}, ${esc(a.dmg)} damage</li>`).join("")}</ul>
    </details>
    <details><summary>Skills</summary><table class="skilltable"><tr><th>Skill</th><th>Abil</th><th>Mod</th></tr>${skillRows}</table>
      <p class="muted">Bold rows are proficient.</p></details>
    <details><summary>Features & Traits</summary>
      <ul>${c.features.map(f=>`<li>${esc(f)}</li>`).join("")}${c.speciesFeatures.map(f=>`<li>Species — ${esc(f)}</li>`).join("")}</ul>
    </details>
    ${c.spells ? `<details><summary>Spellcasting (${c.spellAbility}, DC ${c.spellDC}, attack ${fmtMod(c.spellAtk)})</summary>
      <p><strong>Slots:</strong> ${c.slots.map((n,i)=>`Lv${i+1}: ${n}`).join(" · ") || "—"}</p>
      <p><strong>Cantrips:</strong> ${c.spells.cantrips.map(esc).join(", ") || "—"}</p>
      <p><strong>Spells:</strong> ${c.spells.known.map(esc).join(", ")}</p></details>` : ""}
    <details><summary>Equipment & Inventory (${c.gold} gp)</summary>
      <ul>${c.equipment.map(e=>`<li>${esc(e)}</li>`).join("")}</ul></details>
    <details><summary>Personality</summary>
      <p><strong>Trait:</strong> ${esc(c.personality)}</p><p><strong>Ideal:</strong> ${esc(c.ideal)}</p>
      <p><strong>Bond:</strong> ${esc(c.bond)}</p><p><strong>Flaw:</strong> ${esc(c.flaw)}</p></details>
    ${c.notes ? `<details><summary>Notes</summary><p>${esc(c.notes)}</p></details>` : ""}
  </div>`;
}

function plainFeature(f){
  // Translate a few common features into plain language for young players.
  const map = [
    [/Second Wind/i,"Catch Your Breath: once each battle, heal yourself a little."],
    [/Sneak Attack/i,"Sneaky Strike: if the enemy is distracted or your friend is next to it, you hit extra hard."],
    [/Rage/i,"Get Angry: twice a day, hit harder and take less damage."],
    [/Bardic Inspiration/i,"Cheer a Friend: give a friend a bonus die to add to a roll."],
    [/Lay on Hands/i,"Healing Touch: touch a friend to heal them."],
    [/Wild Shape/i,"Turn Into an Animal: twice per rest, become a beast."],
    [/Ki/i,"Inner Energy: spend energy points for extra moves."],
    [/Action Surge/i,"Burst of Speed: once per rest, take one extra action."],
    [/Cunning Action/i,"Quick Feet: dash, hide, or slip away as a quick move."]
  ];
  for (const [re, plain] of map) if (re.test(f)) return plain;
  return null;
}

function simpleSheet(c){
  const young = simpleLevel === "young";
  const beginner = simpleLevel === "beginner" || young;

  const attacks = c.attacks.map(a => {
    if (young){
      const hit = a.saveDC !== null
        ? `The enemy tries to dodge. The DM will tell you what happens (DC ${a.saveDC}).`
        : `Roll the big twenty-sided die and add ${a.toHit}. The DM will tell you if it hits.`;
      return `<div class="atkcard"><h4>${esc(a.name)}</h4><ol><li>${hit}</li><li>If it hits, roll ${esc(a.dmg.replace(/([+-]\d+)$/, ""))} ${a.dmgMod?`and add ${a.dmgMod}`:""} for damage.</li></ol></div>`;
    }
    return `<div class="atkcard"><h4>${esc(a.name)}</h4>
      <p>${a.saveDC!==null?`Enemy saves against DC ${a.saveDC}`:`Roll: d20 ${fmtMod(a.toHit)}`}</p>
      <p>Damage: ${esc(a.dmg)}</p></div>`;
  }).join("");

  const topSkills = Object.entries(c.skillMods).sort((a,b)=>b[1]-a[1]).slice(0, beginner?4:6)
    .map(([s,m]) => `<li>${s}: roll d20 ${fmtMod(m)}</li>`).join("");

  const abilities = [];
  c.features.forEach(f => {
    const plain = beginner ? plainFeature(f) : null;
    if (plain) abilities.push(plain);
    else if (!beginner) abilities.push(f.replace(/^Lv\d+ — /,""));
  });
  if (beginner && !abilities.length && c.features.length) abilities.push(c.features[0].replace(/^Lv\d+ — /,""));

  const spellBtns = c.spells
    ? `<h4>Spells</h4><div class="btnrow">${c.spells.cantrips.map(s=>`<button class="spellbtn" onclick="alert('Cantrip: ${esc(s)} — free to cast anytime. Ask the DM what it does!')">${esc(s)} ✨</button>`).join("")}
       ${c.spells.known.map(s=>`<button class="spellbtn" onclick="alert('Spell: ${esc(s)} — uses one spell slot. Ask the DM what it does!')">${esc(s)}</button>`).join("")}</div>
       <p class="muted">Spell slots: ${c.slots.map((n,i)=>`Lv${i+1}: ${n}`).join(" · ")}${young ? " — each spell uses up one slot, like batteries." : ""}</p>` : "";

  return `<div class="card sheet simple">
    <div class="portrait">🛡️</div>
    <h3>${esc(c.name)}</h3>
    <p class="muted">${esc(c.klass)} — level ${c.level}</p>
    <div class="statline big">
      <span>❤️ Health: ${c.hp} / ${c.hpMax}</span>
      <span>🛡️ Armor: ${c.ac}</span>
      <span>👟 Move: ${c.speed} ft.</span>
    </div>
    ${young ? `<p class="hint">When the DM says "roll initiative", roll the big twenty-sided die and add ${fmtMod(c.initiative)}.</p>` : `<p class="muted">Initiative: d20 ${fmtMod(c.initiative)}</p>`}
    <h4>${young ? "Your Moves" : "Attacks"}</h4>${attacks}
    <h4>Best Skills</h4><ul>${topSkills}</ul>
    ${abilities.length ? `<h4>Special Abilities</h4><ul>${abilities.map(a=>`<li>${esc(a)}</li>`).join("")}</ul>` : ""}
    ${spellBtns}
    <h4>Backpack</h4><p>${c.equipment.map(esc).join(", ")} · ${c.gold} gold</p>
    ${young ? `<p class="hint">Stuck? Just say what your hero tries to do — the DM will tell you what to roll.</p>` : ""}
  </div>`;
}
