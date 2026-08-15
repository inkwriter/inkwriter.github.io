// editor.js — Content Editor. Turns pasted lists into valid JSON for the dashboard.

// Category metadata: key, JSON property name, file name, folder, which module uses it.
const CATEGORIES = [
  {key:"firstNames", prop:"firstNames", file:"names.json", folder:"/data/generators/", used:"Character Studio, NPC Generator"},
  {key:"lastNames", prop:"lastNames", file:"last-names.json", folder:"/data/generators/", used:"Character Studio, NPC Generator"},
  {key:"traits", prop:"personalities", file:"personalities.json", folder:"/data/generators/", used:"Character Studio, NPC Generator"},
  {key:"ideals", prop:"ideals", file:"ideals.json", folder:"/data/generators/", used:"Character Studio"},
  {key:"bonds", prop:"bonds", file:"bonds.json", folder:"/data/generators/", used:"Character Studio"},
  {key:"flaws", prop:"flaws", file:"flaws.json", folder:"/data/generators/", used:"Character Studio"},
  {key:"npcOccupations", prop:"occupations", file:"occupations.json", folder:"/data/generators/", used:"NPC Generator"},
  {key:"npcAppearances", prop:"appearances", file:"appearances.json", folder:"/data/generators/", used:"NPC Generator"},
  {key:"npcVoices", prop:"voices", file:"voices.json", folder:"/data/generators/", used:"NPC Generator"},
  {key:"npcGoals", prop:"goals", file:"goals.json", folder:"/data/generators/", used:"NPC Generator"},
  {key:"npcSecrets", prop:"secrets", file:"secrets.json", folder:"/data/generators/", used:"NPC Generator"},
  {key:"questHooks", prop:"questHooks", file:"quest-hooks.json", folder:"/data/generators/", used:"NPC Generator, Encounter Generator"},
  {key:"weather", prop:"weather", file:"weather.json", folder:"/data/generators/", used:"Encounter Generator, DM Screen"},
  {key:"custom", prop:"custom", file:"custom.json", folder:"/data/generators/", used:"Future custom modules"}
];

let currentList = [];

function catInfo(){
  const key = document.getElementById("ed-category").value;
  return CATEGORIES.find(c => c.key === key) || CATEGORIES[CATEGORIES.length-1];
}

function processList(){
  const raw = document.getElementById("ed-input").value;
  // Split on newlines, commas, semicolons, or tabs; trim; drop empties.
  currentList = raw.split(/[\n,;\t]+/).map(s => s.trim()).filter(Boolean);
  renderPreview();
}
function dedupeList(){
  const seen = new Set();
  currentList = currentList.filter(x => { const k = x.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  renderPreview();
}
function sortList(){ currentList.sort((a,b)=>a.localeCompare(b)); renderPreview(); }
function shuffleList(){
  for (let i=currentList.length-1; i>0; i--){
    const j = Math.floor(Math.random()*(i+1));
    [currentList[i],currentList[j]] = [currentList[j],currentList[i]];
  }
  renderPreview();
}
function clearList(){
  if (currentList.length && !confirm("Clear the current list?")) return;
  currentList = [];
  document.getElementById("ed-input").value = "";
  renderPreview();
}

function mergeExisting(){
  const cat = catInfo();
  const existing = (typeof DATA !== "undefined" && DATA[cat.key]) ? DATA[cat.key] : null;
  if (!existing){ alert("No built-in entries found for this category."); return; }
  const seen = new Set(currentList.map(x=>x.toLowerCase()));
  existing.forEach(x => { if (!seen.has(String(x).toLowerCase())) currentList.push(x); });
  renderPreview();
  alert(`Merged. The list now contains ${currentList.length} entries (existing entries were kept, duplicates skipped).`);
}

function importExistingJSON(){
  const json = document.getElementById("ed-import").value.trim();
  if (!json){ alert("Paste JSON into the import box first."); return; }
  let data;
  try{ data = JSON.parse(json); }
  catch(e){ alert("That is not valid JSON. Common causes: a missing comma between entries, a missing closing bracket, or curly quotes instead of straight quotes.\n\nNothing was changed."); return; }
  const arr = Array.isArray(data) ? data : data[Object.keys(data)[0]];
  if (!Array.isArray(arr)){ alert("Expected a JSON array or an object containing one array, like {\"weather\": [\"Rain\"]}.\n\nNothing was changed."); return; }
  const bad = arr.findIndex(x => typeof x !== "string");
  if (bad !== -1){ alert(`Entry ${bad+1} is not plain text. This editor handles simple text lists; structured records arrive in Phase Three.\n\nNothing was changed.`); return; }
  const seen = new Set(currentList.map(x=>x.toLowerCase()));
  arr.forEach(x => { if (!seen.has(x.toLowerCase())) currentList.push(x); });
  renderPreview();
  alert(`Imported ${arr.length} entries. Existing entries in your working list were kept.`);
}

function buildJSON(){
  const cat = catInfo();
  const obj = {}; obj[cat.prop] = currentList;
  return JSON.stringify(obj, null, 2);
}
function buildJS(){
  const cat = catInfo();
  return `const ${cat.prop}Data = ${JSON.stringify(currentList, null, 2)};`;
}

function validateJSON(text){
  try{ JSON.parse(text); return true; }
  catch(e){ alert("Internal error: generated JSON failed validation and was not exported. " + e.message); return false; }
}

function copyOutput(btn){
  if (!currentList.length){ alert("Process a list first."); return; }
  const jsMode = document.getElementById("ed-jsmode").checked;
  const out = jsMode ? buildJS() : buildJSON();
  if (!jsMode && !validateJSON(out)) return;
  copyText(out, btn);
}
function downloadOutput(){
  if (!currentList.length){ alert("Process a list first."); return; }
  const cat = catInfo();
  const jsMode = document.getElementById("ed-jsmode").checked;
  const out = jsMode ? buildJS() : buildJSON();
  if (!jsMode && !validateJSON(out)) return;
  downloadText(jsMode ? cat.file.replace(".json",".js") : cat.file, out);
}

function renderPreview(){
  const cat = catInfo();
  document.getElementById("ed-count").textContent = currentList.length + " entries";
  document.getElementById("ed-preview").textContent = currentList.length
    ? (document.getElementById("ed-jsmode").checked ? buildJS() : buildJSON())
    : "Preview appears here after you press Process List.";
  document.getElementById("ed-guide").innerHTML = `
    <p><strong>Recommended filename:</strong> ${cat.file}</p>
    <p><strong>Place it in:</strong> ${cat.folder}${cat.file}</p>
    <p><strong>Used by:</strong> ${cat.used}</p>`;
}
document.addEventListener("DOMContentLoaded", renderPreview);
