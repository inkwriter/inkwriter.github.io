/* ============================================================
   app.js — The game engine.

   Reading guide (top to bottom):
   1. CONFIG        — starting values & tuning knobs
   2. STATE         — everything the game tracks
   3. GAME FLOW     — new game, daily loop, travel
   4. EVENTS        — showing encounters & resolving choices
   5. EFFECTS       — applying stat changes, damage, statuses
   6. TOWNS         — shops and rest stops
   7. FINAL DUNGEON — the three-challenge ending
   8. WIN / LOSS    — endings
   9. SAVE / LOAD   — localStorage
   10. RENDERING    — drawing the UI
   ============================================================ */

/* ============ 1. CONFIG — tweak the game here ============ */

const CONFIG = {
  // Starting resources per difficulty. Add or edit freely.
  difficulties: {
    easy:     { label: "Story Mode",  gold: 140, food: 32, potions: 5, morale: 90, rollBonus: 2 },
    normal:   { label: "Adventurer",  gold: 100, food: 24, potions: 3, morale: 80, rollBonus: 0 },
    hardcore: { label: "Hardcore",    gold: 60,  food: 16, potions: 1, morale: 70, rollBonus: -2 }
  },

  targetDistance: 100,   // distance to the final dungeon
  travelMin: 4,          // min miles per day
  travelMax: 8,          // max miles per day
  foodPerMemberPerDay: 1,
  encounterChance: 0.75, // chance of a random event each day
  starvationDamage: 5,   // daily damage per member when food is 0
  starvationLimit: 5,    // days at 0 food before the journey ends
  potionHeal: 20,        // healing from using a potion
  classBonusValue: 5,    // added to rolls when the right class is alive
  blessedBonus: 2,       // extra roll bonus if someone is Blessed
  logLimit: 15           // visible log entries
};

/* ============ 2. STATE ============ */

let state = null; // set by newGame() or loadGame()

function freshState(difficultyKey) {
  const d = CONFIG.difficulties[difficultyKey];
  return {
    difficulty: difficultyKey,
    rollBonus: d.rollBonus,
    gold: d.gold,
    food: d.food,
    potions: d.potions,
    morale: d.morale,
    distance: 0,
    targetDistance: CONFIG.targetDistance,
    day: 1,
    party: CLASSES.generateParty(),
    log: [],
    seenEventIds: [],     // avoid repeating encounters until the pool runs dry
    visitedTowns: [],     // townAt distances already visited
    starvingDays: 0,
    finalStage: -1,       // -1 = not started; 0..2 = challenge index
    eventsSurvived: 0,
    over: false
  };
}

/* ============ 3. GAME FLOW ============ */

function newGame(difficultyKey) {
  state = freshState(difficultyKey);
  const region = EVENTS.regionFor(0);
  addLog(`The party sets out for the Last Dungeon. ${CONFIG.difficulties[difficultyKey].label} difficulty.`);
  addLog(`The party entered ${region.name}.`);
  showScreen("game");
  showTravelPanel(
    "The Journey Begins",
    `Your party of four gathers at the edge of ${region.name}. ` +
    `${state.targetDistance} miles of forest, swamp, mountain, and haunted road lie between you and the Last Dungeon. ` +
    `Arrive alive. Arrive ready.`
  );
  render();
}

/** One press of "Travel Onward" = one day. */
function nextDay() {
  if (state.over) return;

  state.day++;

  tickStatuses();       // poison, curses, exhaustion recovery
  travel();             // move forward
  eatFood();            // consume rations / starve
  moraleDrift();        // the road wears on everyone

  if (checkGameOver()) return;

  // Reached the Last Dungeon?
  if (state.distance >= state.targetDistance) {
    state.distance = state.targetDistance;
    render();
    startFinalDungeon();
    return;
  }

  // Region change announcement
  const region = EVENTS.regionFor(state.distance);
  const prevRegion = EVENTS.regionFor(state.prevDistance ?? 0);
  if (region.name !== prevRegion.name) {
    addLog(`The party entered ${region.name}.`);
  }

  // Town stop?
  const townDue = EVENTS.regions.find(
    r => state.distance >= r.townAt && !state.visitedTowns.includes(r.townAt)
  );
  if (townDue) {
    state.visitedTowns.push(townDue.townAt);
    render();
    showTown();
    return;
  }

  // Random encounter, or a quiet day
  if (Math.random() < CONFIG.encounterChance) {
    showRandomEvent(region);
  } else {
    const quiet = UTILS.pick([
      "A blessedly uneventful day. Nobody trusts it.",
      "Miles pass under clear skies. The party swaps stories to pass the time.",
      "Nothing attacks, curses, or haggles with you today. Suspicious.",
      "A quiet day on the road. The horizon creeps closer."
    ]);
    addLog(`A quiet day of travel.`);
    showTravelPanel("On the Road", quiet);
  }

  render();
}

function travel() {
  state.prevDistance = state.distance;
  let miles = UTILS.randInt(CONFIG.travelMin, CONFIG.travelMax);
  // Exhausted members slow the whole party down.
  const exhausted = state.party.filter(m => m.alive && m.status === "Exhausted").length;
  miles = Math.max(2, miles - exhausted * 2);
  state.distance = UTILS.clamp(state.distance + miles, 0, state.targetDistance);
}

function eatFood() {
  const mouths = livingMembers().length;
  const needed = mouths * CONFIG.foodPerMemberPerDay;

  if (state.food >= needed) {
    state.food -= needed;
    state.starvingDays = 0;
    return;
  }

  // Not enough food: whatever's left is eaten, then everyone suffers.
  state.food = 0;
  state.starvingDays++;
  state.morale = UTILS.clamp(state.morale - 5, 0, 100);
  livingMembers().forEach(m => damageMember(m, CONFIG.starvationDamage));
  addLog(`Day ${state.day}: The party goes hungry. (${state.starvingDays} day${state.starvingDays > 1 ? "s" : ""} without food)`);
}

function moraleDrift() {
  // The long road slowly grinds spirits down.
  if (Math.random() < 0.5) changeMorale(-UTILS.randInt(1, 2));
  // Cursed members make it worse.
  const cursed = state.party.filter(m => m.alive && m.status === "Cursed").length;
  if (cursed) changeMorale(-2 * cursed);
}

function tickStatuses() {
  state.party.forEach(m => {
    if (!m.alive) return;
    if (m.status === "Poisoned") {
      damageMember(m, 2);
      if (m.alive === false) return;
    }
    if (m.status === "Exhausted" && Math.random() < 0.25) {
      m.status = null; // a good night's sleep, finally
    }
    if (m.status === "Inspired" && Math.random() < 0.2) {
      m.status = null; // inspiration fades
    }
  });
}

/* ============ 4. EVENTS ============ */

let currentEvent = null; // the encounter on screen right now

function showRandomEvent(region) {
  let candidates = EVENTS.poolFor(region.name)
    .filter(e => !state.seenEventIds.includes(e.id));

  // If the region's pool is exhausted, allow repeats.
  if (candidates.length === 0) {
    state.seenEventIds = state.seenEventIds.filter(
      id => !EVENTS.poolFor(region.name).some(e => e.id === id)
    );
    candidates = EVENTS.poolFor(region.name);
  }

  currentEvent = UTILS.pick(candidates);
  state.seenEventIds.push(currentEvent.id);
  renderEvent(currentEvent, resolveChoice);
}

/**
 * Roll the dice and apply the outcome of a chosen option.
 * roll (d20) + class bonus + blessed bonus + difficulty modifier
 * vs the choice's difficulty. No difficulty = automatic success.
 */
function resolveChoice(event, choice) {
  let outcomeText, effects, success = true;
  let rollDetail = "";

  if (choice.difficulty != null) {
    const roll = UTILS.d20();
    let bonus = state.rollBonus;
    const parts = [];

    if (choice.classBonus && CLASSES.hasLiving(state.party, choice.classBonus)) {
      bonus += CONFIG.classBonusValue;
      parts.push(`+${CONFIG.classBonusValue} ${choice.classBonus}`);
    }
    const blessedMember = state.party.find(m => m.alive && m.status === "Blessed");
    if (blessedMember) {
      bonus += CONFIG.blessedBonus;
      parts.push(`+${CONFIG.blessedBonus} Blessed`);
      blessedMember.status = null; // the blessing is spent
    }
    if (state.rollBonus) parts.push(`${state.rollBonus > 0 ? "+" : ""}${state.rollBonus} difficulty`);

    success = roll + bonus >= choice.difficulty;
    rollDetail = `[D20] Rolled ${roll}${parts.length ? " " + parts.join(" ") : ""} = ${roll + bonus} vs ${choice.difficulty} — ${success ? "Success!" : "Failure."}`;
  }

  if (success) {
    outcomeText = choice.successText;
    effects = choice.successEffects || {};
  } else {
    outcomeText = choice.failureText;
    effects = choice.failureEffects || {};
  }

  const summary = applyEffects(effects);
  state.eventsSurvived++;
  addLog(`${event.title}: ${success ? "the party prevailed" : "it went badly"}.`);

  if (checkGameOver()) return;

  // Final dungeon challenges chain into the next stage instead of travel.
  const inFinal = state.finalStage >= 0;
  showOutcomePanel(event.title, rollDetail, outcomeText, summary, inFinal);
  render();
}

/* ============ 5. EFFECTS ============ */

function livingMembers() {
  return state.party.filter(m => m.alive);
}

function changeMorale(amount) {
  // Inspired members soften morale losses.
  if (amount < 0 && state.party.some(m => m.alive && m.status === "Inspired")) {
    amount = Math.ceil(amount / 2);
  }
  state.morale = UTILS.clamp(state.morale + amount, 0, 100);
}

function damageMember(member, amount) {
  member.health = UTILS.clamp(member.health - amount, 0, member.maxHealth);
  if (member.health <= 0 && member.alive) {
    member.alive = false;
    member.status = null;
    addLog(`*** ${member.name} the ${member.className} has died. ***`);
    changeMorale(-10);
  }
}

/**
 * Apply an effects object (see events.js docs) to the game state.
 * Returns a short human-readable summary like "+12 gold, −5 health".
 */
function applyEffects(fx) {
  const notes = [];

  if (fx.gold)    { state.gold = Math.max(0, state.gold + fx.gold); notes.push(`${sign(fx.gold)} gold`); }
  if (fx.food)    { state.food = Math.max(0, state.food + fx.food); notes.push(`${sign(fx.food)} food`); }
  if (fx.potions) { state.potions = Math.max(0, state.potions + fx.potions); notes.push(`${sign(fx.potions)} potion${Math.abs(fx.potions) > 1 ? "s" : ""}`); }
  if (fx.morale)  { changeMorale(fx.morale); notes.push(`${sign(fx.morale)} morale`); }

  if (fx.partyHealth) {
    if (fx.partyHealth < 0) {
      // Spread damage randomly, point by point, across living members.
      let dmg = -fx.partyHealth;
      while (dmg > 0 && livingMembers().length > 0) {
        const chunk = Math.min(dmg, UTILS.randInt(1, 4));
        damageMember(UTILS.pick(livingMembers()), chunk);
        dmg -= chunk;
      }
      notes.push(`−${-fx.partyHealth} party health`);
    } else {
      // Healing goes to the most injured first.
      let heal = fx.partyHealth;
      while (heal > 0) {
        const hurt = livingMembers()
          .filter(m => m.health < m.maxHealth)
          .sort((a, b) => (a.health / a.maxHealth) - (b.health / b.maxHealth))[0];
        if (!hurt) break;
        const chunk = Math.min(heal, 5, hurt.maxHealth - hurt.health);
        hurt.health += chunk;
        heal -= chunk;
      }
      notes.push(`+${fx.partyHealth} party health`);
    }
  }

  if (fx.status) {
    // Prefer someone without a status; otherwise overwrite a random member.
    const targets = livingMembers();
    if (targets.length) {
      const clean = targets.filter(m => !m.status);
      const target = UTILS.pick(clean.length ? clean : targets);
      target.status = fx.status;
      notes.push(`${target.name} is ${fx.status}`);
      addLog(`${target.name} became ${fx.status}.`);
    }
  }

  if (fx.cureStatus) {
    state.party.forEach(m => {
      if (!m.alive || !m.status) return;
      if (fx.cureStatus === "All" || m.status === fx.cureStatus) {
        addLog(`${m.name} is no longer ${m.status}.`);
        m.status = null;
      }
    });
    notes.push(fx.cureStatus === "All" ? "ailments cured" : `${fx.cureStatus} cured`);
  }

  return notes.join(", ");
}

function sign(n) { return n > 0 ? `+${n}` : `${n}`; }

/** The "Use Potion" button: heal the most injured living member. */
function usePotion() {
  if (state.over || state.potions <= 0) return;
  const hurt = livingMembers()
    .filter(m => m.health < m.maxHealth)
    .sort((a, b) => (a.health / a.maxHealth) - (b.health / b.maxHealth))[0];
  if (!hurt) { toast("Everyone is at full health."); return; }
  state.potions--;
  hurt.health = UTILS.clamp(hurt.health + CONFIG.potionHeal, 0, hurt.maxHealth);
  if (hurt.status === "Poisoned") hurt.status = null;
  addLog(`${hurt.name} drank a potion. (+${CONFIG.potionHeal} health)`);
  render();
}

/* ============ 6. TOWNS ============ */

function showTown() {
  const townName = UTILS.pick(EVENTS.town.names);
  const rumor = UTILS.pick(EVENTS.town.rumors);
  addLog(`The party rests at ${townName}.`);
  renderTown(townName, rumor);
}

function buyService(serviceId) {
  const s = EVENTS.town.services.find(x => x.id === serviceId);
  if (!s) return;
  if (state.gold + s.gold < 0) { toast("Not enough gold."); return; }
  const summary = applyEffects(s);
  addLog(`Town: ${s.label.split("—")[0].trim()}. (${summary})`);
  render();
  renderTownStatus(`Done — ${summary}.`);
}

/* ============ 7. FINAL DUNGEON ============ */

function startFinalDungeon() {
  addLog("*** The party stands before the Last Dungeon. ***");
  state.finalStage = 0;
  showTravelPanel(
    "The Last Dungeon",
    "After everything — the goblins, the swamp, the mountains, the ghosts — it's here. " +
    "Black stone doors twice the height of a giant, carved with warnings in languages older than the kingdom. " +
    "Three trials wait inside. Ready your party, drink your potions, and steel yourselves.",
    "Enter the Dungeon"
  );
  render();
}

function nextFinalStage() {
  if (state.over) return;
  if (state.finalStage >= EVENTS.finalDungeon.length) {
    victory();
    return;
  }
  currentEvent = EVENTS.finalDungeon[state.finalStage];
  state.finalStage++;
  renderEvent(currentEvent, resolveChoice);
}

/* ============ 8. WIN / LOSS ============ */

function checkGameOver() {
  if (state.over) return true;

  let cause = null;
  if (livingMembers().length === 0) {
    cause = "Your party has fallen, every last one. The road keeps their names now, and travelers who pass this way speak of four brave souls who almost made it.";
  } else if (state.morale <= 0) {
    cause = "Morale breaks completely. One grey morning, nobody packs the camp. The party drifts apart on the road home, and the Last Dungeon keeps waiting — as it always has.";
  } else if (state.starvingDays >= CONFIG.starvationLimit) {
    cause = "Days without food become a week. Too weak to hunt, too far from any town, the party's journey ends not with a battle, but with an empty pack.";
  }

  if (cause) {
    state.over = true;
    addLog("*** The journey has ended in failure. ***");
    renderEnd(false, cause);
    return true;
  }
  return false;
}

function victory() {
  state.over = true;
  const alive = livingMembers().length;
  addLog("*** The party has conquered the Last Dungeon! ***");

  // Multiple endings based on how many walked out.
  let ending;
  if (alive === 4) {
    ending = "All four adventurers walk out into the sunlight together — battered, broke, and grinning. The bards will not need to exaggerate this one.";
  } else if (alive >= 2) {
    ending = `${alive} adventurers emerge from the dungeon, carrying the memory of those who didn't. They raise a toast at the first tavern they find — one cup poured out for the fallen.`;
  } else {
    ending = "One lone survivor limps out of the Last Dungeon, the only living soul who knows what happened inside. Some victories are carried home alone.";
  }

  renderEnd(true, ending);
}

/* ============ 9. SAVE / LOAD ============ */

const SAVE_KEY = "dungeonTrailSave";

function saveGame() {
  if (!state) return;
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  toast("Game saved.");
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) { toast("No saved game found."); return; }
  try {
    state = JSON.parse(raw);
  } catch {
    toast("Save file was corrupted.");
    return;
  }
  currentEvent = null;
  showScreen("game");
  if (state.over) {
    // Loading a finished game just shows the summary again.
    renderEnd(livingMembers().length > 0 && state.finalStage > EVENTS.finalDungeon.length - 1, "This journey has already ended. Start a new game to ride again.");
  } else if (state.finalStage >= 0) {
    showTravelPanel("The Last Dungeon", "You stand before the dungeon once more. The trials await.", "Enter the Dungeon");
  } else {
    showTravelPanel("Back on the Road", `Day ${state.day}. The journey continues where you left it.`);
  }
  render();
  toast("Game loaded.");
}

/* ============ 10. RENDERING ============ */

const $ = id => document.getElementById(id);

function showScreen(name) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  $(`screen-${name}`).classList.add("active");
}

/** Update the always-visible HUD: resources, progress, party cards, log. */
function render() {
  if (!state) return;
  const region = EVENTS.regionFor(state.distance);

  $("stat-day").textContent = state.day;
  $("stat-gold").textContent = state.gold;
  $("stat-food").textContent = state.food;
  $("stat-potions").textContent = state.potions;
  $("stat-morale").textContent = state.morale;
  $("region-name").textContent = `[${region.icon}] ${region.name}`;

  const pct = Math.round((state.distance / state.targetDistance) * 100);
  $("progress-fill").style.width = `${pct}%`;
  $("progress-label").textContent = `${state.distance} / ${state.targetDistance} miles`;

  // Morale bar color hint
  $("stat-morale").className = state.morale <= 25 ? "danger" : state.morale <= 50 ? "warn" : "";
  $("stat-food").className = state.food <= 5 ? "danger" : state.food <= 10 ? "warn" : "";

  renderParty();
  renderLog();

  $("btn-potion").disabled = state.potions <= 0 || state.over;
}

function renderParty() {
  $("party-grid").innerHTML = state.party.map(m => {
    const pct = Math.round((m.health / m.maxHealth) * 100);
    // Status shown as bracketed terminal tags, e.g. [POISONED]
    const statusTag = st => st ? `[${st.toUpperCase()}]` : "";
    return `
      <div class="member ${m.alive ? "" : "dead"}">
        <div class="member-head">
          <span class="member-icon">${m.alive ? m.icon : "RIP"}</span>
          <div>
            <div class="member-name">${m.name}</div>
            <div class="member-class">${m.className}</div>
          </div>
        </div>
        <div class="hp-bar"><div class="hp-fill ${pct <= 30 ? "low" : ""}" style="width:${m.alive ? pct : 0}%"></div></div>
        <div class="member-foot">
          <span>${m.alive ? `${m.health}/${m.maxHealth} HP` : "Fallen"}</span>
          <span class="member-status">${m.alive ? statusTag(m.status) : ""}</span>
        </div>
      </div>`;
  }).join("");
}

function renderLog() {
  const entries = state.log.slice(-CONFIG.logLimit);
  $("log-list").innerHTML = entries.map(e => `<li>${e}</li>`).reverse().join("");
}

function addLog(text) {
  state.log.push(`Day ${state.day}: ${text}`);
}

/** Panel between events: title + text + a single onward button. */
function showTravelPanel(title, text, buttonLabel) {
  const inFinal = state.finalStage >= 0 && !state.over;
  $("event-panel").innerHTML = `
    <h2 class="event-title">${title}</h2>
    <p class="event-text">${text}</p>
    <div class="choices">
      <button class="btn btn-travel" onclick="${inFinal ? "nextFinalStage()" : "nextDay()"}">
        ${buttonLabel || "TRAVEL ONWARD"}
      </button>
    </div>`;
}

/** Show an encounter with its choice buttons. */
function renderEvent(event, onChoose) {
  const buttons = event.choices.map((c, i) => {
    const hasBonus = c.classBonus && CLASSES.hasLiving(state.party, c.classBonus);
    const tag = c.classBonus
      ? `<span class="choice-tag ${hasBonus ? "have" : "lack"}">[${c.classBonus.toUpperCase()}${hasBonus ? " +5" : ": NONE ALIVE"}]</span>`
      : (c.difficulty == null ? `<span class="choice-tag safe">[ALWAYS WORKS]</span>` : "");
    return `<button class="btn choice" onclick="chooseIndex(${i})">${c.text} ${tag}</button>`;
  }).join("");

  $("event-panel").innerHTML = `
    <h2 class="event-title">${event.title}</h2>
    <p class="event-text">${event.description}</p>
    <div class="choices">${buttons}</div>`;

  // Wire the buttons to the current event via a tiny global helper.
  window.chooseIndex = i => onChoose(event, event.choices[i]);
}

/** Show what happened after a choice, with a continue button. */
function showOutcomePanel(title, rollDetail, text, effectSummary, inFinal) {
  const doneWithFinal = inFinal && state.finalStage >= EVENTS.finalDungeon.length;
  $("event-panel").innerHTML = `
    <h2 class="event-title">${title}</h2>
    ${rollDetail ? `<p class="roll-detail">${rollDetail}</p>` : ""}
    <p class="event-text">${text}</p>
    ${effectSummary ? `<p class="effect-summary">${effectSummary}</p>` : ""}
    <div class="choices">
      <button class="btn btn-travel" onclick="${inFinal ? (doneWithFinal ? "victory()" : "nextFinalStage()") : "showAfterOutcome()"}">
        ${inFinal ? (doneWithFinal ? "EMERGE VICTORIOUS" : "PRESS DEEPER") : "CONTINUE"}
      </button>
    </div>`;
}

/** After a regular encounter outcome, return to the travel panel. */
function showAfterOutcome() {
  showTravelPanel("On the Road", "The party regroups and the journey continues.");
}

/* ---- Town rendering ---- */
function renderTown(townName, rumor) {
  const services = EVENTS.town.services.map(s =>
    `<button class="btn choice" onclick="buyService('${s.id}')">${s.label}</button>`
  ).join("");

  $("event-panel").innerHTML = `
    <h2 class="event-title">${townName}</h2>
    <p class="event-text">Warm hearths, real beds, and prices that know you're desperate. A local leans in with a rumor:</p>
    <p class="rumor">${rumor}</p>
    <p id="town-status" class="effect-summary"></p>
    <div class="choices">
      ${services}
      <button class="btn btn-travel" onclick="showAfterOutcome()">CONTINUE THE JOURNEY</button>
    </div>`;
}

function renderTownStatus(text) {
  const el = $("town-status");
  if (el) el.textContent = text;
}

/* ---- Endings ---- */
function renderEnd(won, story) {
  const alive = livingMembers().length;
  showScreen("end");
  $("end-title").textContent = won ? "*** VICTORY ***" : "*** GAME OVER ***";
  $("end-title").className = won ? "end-title win" : "end-title lose";
  $("end-story").textContent = story;
  $("end-summary").innerHTML = `
    <li>DAYS SURVIVED ......... <strong>${state.day}</strong></li>
    <li>PARTY ALIVE ........... <strong>${alive} / 4</strong></li>
    <li>GOLD REMAINING ........ <strong>${state.gold}</strong></li>
    <li>FINAL MORALE .......... <strong>${state.morale}</strong></li>
    <li>EVENTS SURVIVED ....... <strong>${state.eventsSurvived}</strong></li>`;
  $("end-roster").innerHTML = state.party.map(m =>
    `<li>[${m.alive ? m.icon : "RIP"}] ${m.name} the ${m.className} — ${m.alive ? "SURVIVED" : "FELL ON THE ROAD"}</li>`
  ).join("");
}

/* ---- Tiny toast messages ---- */
let toastTimer = null;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

/* ---- Start screen wiring ---- */
document.addEventListener("DOMContentLoaded", () => {
  // Enable the Load button on the start screen if a save exists.
  if (localStorage.getItem(SAVE_KEY)) {
    $("btn-start-load").disabled = false;
  }
});
