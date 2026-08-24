/* ==========================================================================
   FRETKIT — app.js
   Everything runs in the browser: Web Audio for sound, localStorage for
   saving. No backend, no build step. Heavily commented on purpose so it's
   easy to modify.

   Table of contents (search for the banner comments):
     1. MUSIC DATA        — notes, tunings, chords
     2. AUDIO ENGINE      — Web Audio setup + four sound presets
     3. STORAGE & PREFS   — localStorage helpers, user preferences
     4. NAVIGATION        — section tabs
     5. TUNER             — string rack UI
     6. CUSTOM TUNINGS    — builder, save/delete
     7. FRETBOARD         — visual board + highlighting
     8. TAB PARSER        — turn ASCII tab into note events
     9. TAB PLAYER        — scheduled playback + highlighting
    10. CHORDS            — chord cards + progression player
    11. METRONOME         — Web Audio clock scheduler
    12. PRACTICE TOOLS    — four mini drills
    13. LIBRARY           — saved tabs list, import/export
    14. BOOT              — initial render
   ========================================================================== */

"use strict";

/* ==========================================================================
   1. MUSIC DATA
   --------------------------------------------------------------------------
   We track every pitch as a MIDI number (A440 = MIDI 69). That makes math
   easy: one fret = +1 MIDI number, and frequency comes from one formula.
   ========================================================================== */

// Note names by pitch class (0–11). Sharps are used for display;
// the custom tuning builder also shows the flat spelling.
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

/** MIDI number -> frequency in Hz. */
function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** MIDI number -> display name like "E2" or "F#3". */
function midiToName(midi, { octave = true, flats = false } = {}) {
  const names = flats ? FLAT_NAMES : NOTE_NAMES;
  const name = names[midi % 12];
  return octave ? name + (Math.floor(midi / 12) - 1) : name;
}

/*
  Built-in tunings. Strings are stored LOW to HIGH (string 6 -> string 1),
  as MIDI numbers. For reference: E2=40, A2=45, D3=50, G3=55, B3=59, E4=64.
*/
const BUILTIN_TUNINGS = [
  {
    id: "standard", name: "Standard (E A D G B e)",
    midi: [40, 45, 50, 55, 59, 64],
    blurb: "The default tuning almost all songs and lessons assume. Learn chord shapes here first — every other tuning is described relative to this one."
  },
  {
    id: "dropd", name: "Drop D (D A D G B e)",
    midi: [38, 45, 50, 55, 59, 64],
    blurb: "Only the low E drops a whole step to D. One-finger power chords on the bottom three strings — a staple of rock, metal, and folk fingerstyle."
  },
  {
    id: "halfdown", name: "Half-Step Down (Eb Ab Db Gb Bb eb)",
    midi: [39, 44, 49, 54, 58, 63],
    blurb: "Everything down one fret. Slightly looser feel and a darker sound. Hendrix, Van Halen, and a huge amount of 90s rock live here."
  },
  {
    id: "dropcsharp", name: "Drop C# (C# G# C# F# A# d#)",
    midi: [37, 44, 49, 54, 58, 63],
    blurb: "Drop D shapes, a half step lower. Heavier than Drop D without getting floppy — common in hard rock and metalcore."
  },
  {
    id: "dropc", name: "Drop C (C G C F A d)",
    midi: [36, 43, 48, 53, 57, 62],
    blurb: "Drop D shapes a whole step lower. Deep and heavy; you may want thicker strings to keep tension. Very common in modern metal."
  },
  {
    id: "openg", name: "Open G (D G D G B D)",
    midi: [38, 43, 50, 55, 59, 62],
    blurb: "Strumming all open strings gives a G major chord. Keith Richards' signature tuning, and a favorite for slide and blues."
  },
  {
    id: "opend", name: "Open D (D A D F# A D)",
    midi: [38, 45, 50, 54, 57, 62],
    blurb: "Open strings ring a D major chord. Big, resonant, and beautiful for slide, folk, and fingerstyle."
  },
  {
    id: "dadgad", name: "DADGAD (D A D G A D)",
    midi: [38, 45, 50, 55, 57, 62],
    blurb: "Neither major nor minor — a droning, modal sound loved in Celtic, folk, and atmospheric rock. Chords are easy and everything rings."
  },
];

/*
  Chord library, standard tuning. Frets are LOW string to HIGH string;
  "x" means don't play that string, 0 means open.
*/
const CHORDS = [
  { name: "G",  frets: [3, 2, 0, 0, 3, 3] },
  { name: "C",  frets: ["x", 3, 2, 0, 1, 0] },
  { name: "D",  frets: ["x", "x", 0, 2, 3, 2] },
  { name: "Em", frets: [0, 2, 2, 0, 0, 0] },
  { name: "Am", frets: ["x", 0, 2, 2, 1, 0] },
  { name: "A",  frets: ["x", 0, 2, 2, 2, 0] },
  { name: "E",  frets: [0, 2, 2, 1, 0, 0] },
  { name: "F",  frets: [1, 3, 3, 2, 1, 1] },
  { name: "Bm", frets: ["x", 2, 4, 4, 3, 2] },
];

const STANDARD_MIDI = [40, 45, 50, 55, 59, 64]; // chords always use standard tuning

/* ==========================================================================
   2. AUDIO ENGINE
   --------------------------------------------------------------------------
   Browsers block sound until the user interacts with the page, so we create
   the AudioContext lazily and resume it on the first click. The "pluck" and
   "acoustic" presets use Karplus–Strong string synthesis: fill a short
   buffer with noise, then repeatedly average neighboring samples. The noise
   decays into a surprisingly convincing plucked string.
   ========================================================================== */

let audioCtx = null;          // created on first user interaction
let masterGain = null;        // one master volume node
const bufferCache = new Map(); // cache synthesized buffers: "preset:freq" -> AudioBuffer

/** Create/resume the AudioContext. Returns null if the browser refuses. */
function ensureAudio() {
  try {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AC();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.6;
      masterGain.connect(audioCtx.destination);
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    updatePilotLamp();
    return audioCtx;
  } catch (e) {
    console.error("Web Audio not available:", e);
    return null;
  }
}

function updatePilotLamp() {
  const on = audioCtx && audioCtx.state === "running";
  const btn = document.getElementById("power-btn");
  btn.classList.toggle("on", !!on);
  btn.setAttribute("aria-pressed", on ? "true" : "false");
  document.getElementById("pilot-label").textContent = on ? "AUDIO ON" : "POWER ON AUDIO";
}

/**
 * Karplus–Strong synthesis: returns an AudioBuffer containing a plucked
 * string at `freq` Hz. `brightness` (0–1) filters the initial noise burst,
 * and `damping` (close to 1) controls how long the string rings.
 */
function karplusStrong(freq, { seconds = 2.2, damping = 0.996, brightness = 1 } = {}) {
  const sr = audioCtx.sampleRate;
  const N = Math.max(2, Math.round(sr / freq)); // delay-line length = one period
  const length = Math.floor(sr * seconds);
  const buffer = audioCtx.createBuffer(1, length, sr);
  const out = buffer.getChannelData(0);

  // Initial "pick" excitation: white noise, optionally low-passed for a
  // warmer (more acoustic) attack.
  const ring = new Float32Array(N);
  let prev = 0;
  for (let i = 0; i < N; i++) {
    const white = Math.random() * 2 - 1;
    prev = brightness * white + (1 - brightness) * prev; // simple one-pole filter
    ring[i] = prev;
  }

  // Main loop: each output sample is the average of two neighbors in the
  // ring buffer, scaled by the damping factor.
  let idx = 0;
  for (let i = 0; i < length; i++) {
    const next = (idx + 1) % N;
    ring[idx] = damping * 0.5 * (ring[idx] + ring[next]);
    out[i] = ring[idx];
    idx = next;
  }
  return buffer;
}

/**
 * Play a single note. `preset` is one of:
 *   "pluck"    — bright Karplus–Strong electric-ish pluck
 *   "acoustic" — warmer, longer Karplus–Strong pluck
 *   "sine"     — plain sine tone (great for tuning by ear)
 *   "muted"    — short damped tone for quiet practice
 * `when` is an absolute AudioContext time (0 = now), `dur` caps the length.
 */
function playNote(freq, { preset = null, when = 0, dur = 2, velocity = 1 } = {}) {
  const ctx = ensureAudio();
  if (!ctx) return;
  preset = preset || prefs.sound;
  const t = Math.max(ctx.currentTime, when || ctx.currentTime);

  const gain = ctx.createGain();
  gain.connect(masterGain);

  if (preset === "sine") {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.5 * velocity, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + dur + 0.05);
    return;
  }

  if (preset === "muted") {
    // A triangle wave with a very fast decay reads as a palm-muted note.
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.6 * velocity, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + 0.3);
    return;
  }

  // Karplus–Strong presets. Buffers are cached per rounded frequency so we
  // only synthesize each pitch once.
  const opts = preset === "acoustic"
    ? { damping: 0.9975, brightness: 0.45, seconds: 2.6 }
    : { damping: 0.995,  brightness: 1.0,  seconds: 2.0 };

  const key = preset + ":" + freq.toFixed(1);
  let buf = bufferCache.get(key);
  if (!buf) {
    buf = karplusStrong(freq, opts);
    bufferCache.set(key, buf);
  }

  const src = ctx.createBufferSource();
  src.buffer = buf;
  gain.gain.value = 0.9 * velocity;
  // Fade out if the requested duration is shorter than the buffer.
  const end = t + Math.min(dur, buf.duration);
  gain.gain.setValueAtTime(0.9 * velocity, end - 0.05 > t ? end - 0.05 : t);
  gain.gain.linearRampToValueAtTime(0.0001, end);
  src.connect(gain);
  src.start(t);
  src.stop(end + 0.05);
}

/** Metronome click: a short filtered noise/osc blip. Accents are higher. */
function playClick(when, accent) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = accent ? 1600 : 1000;
  gain.gain.setValueAtTime(accent ? 0.5 : 0.3, when);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(when);
  osc.stop(when + 0.08);
}

/* ==========================================================================
   3. STORAGE & PREFS
   --------------------------------------------------------------------------
   Everything lives under a few localStorage keys. All reads are wrapped in
   try/catch so a corrupted value never breaks the app.
   ========================================================================== */

const LS_KEYS = {
  prefs: "fretkit.prefs",
  tunings: "fretkit.customTunings",
  tabs: "fretkit.savedTabs",
};

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("Could not save to localStorage:", e);
  }
}

// User preferences with sensible defaults.
const prefs = Object.assign({
  noteNames: true,
  stringNumbers: true,
  fretNumbers: true,
  explanations: true,
  lefty: false,
  sound: "pluck",
  tabBpm: 90,
}, loadJSON(LS_KEYS.prefs, {}));

function savePrefs() { saveJSON(LS_KEYS.prefs, prefs); }

// Custom tunings: [{ id, name, midi: [6 numbers] }]
let customTunings = loadJSON(LS_KEYS.tunings, []);
function saveCustomTunings() { saveJSON(LS_KEYS.tunings, customTunings); }

// Saved tabs: [{ id, name, text, bpm }]
let savedTabs = loadJSON(LS_KEYS.tabs, []);
function saveSavedTabs() { saveJSON(LS_KEYS.tabs, savedTabs); }

/** All tunings, built-in + custom, in one list. */
function allTunings() {
  return BUILTIN_TUNINGS.concat(customTunings);
}

function getTuningById(id) {
  return allTunings().find(t => t.id === id) || BUILTIN_TUNINGS[0];
}

/** Small helper: show a status message that fades after a few seconds. */
function flashMsg(el, text, kind = "ok") {
  el.textContent = text;
  el.className = "msg " + kind;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.textContent = ""; el.className = "msg"; }, 4000);
}

/** Apply preference toggles to the document body as CSS classes. */
function applyPrefClasses() {
  document.body.classList.toggle("show-note-names", prefs.noteNames);
  document.body.classList.toggle("hide-note-names", !prefs.noteNames);
  document.body.classList.toggle("hide-string-numbers", !prefs.stringNumbers);
  document.body.classList.toggle("hide-fret-numbers", !prefs.fretNumbers);
  document.body.classList.toggle("hide-explanations", !prefs.explanations);
  document.body.classList.toggle("lefty", prefs.lefty);
}

/* ==========================================================================
   4. NAVIGATION
   ========================================================================== */

document.querySelectorAll(".channel").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".channel").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("panel-" + btn.dataset.panel).classList.add("active");
  });
});

// Power button just wakes the AudioContext and plays a soft confirmation.
document.getElementById("power-btn").addEventListener("click", () => {
  const ctx = ensureAudio();
  if (ctx) playNote(midiToFreq(64), { dur: 0.8, velocity: 0.4 });
});

/* ==========================================================================
   5. TUNER
   --------------------------------------------------------------------------
   Renders one big "string" button per string. Clicking plucks the note and
   triggers the vibration animation on the wire.
   ========================================================================== */

let currentTuningId = "standard";

const tuningSelect = document.getElementById("tuning-select");
const tabTuningSelect = document.getElementById("tab-tuning-select");

/** (Re)fill both tuning dropdowns from built-in + custom lists. */
function renderTuningSelects() {
  [tuningSelect, tabTuningSelect].forEach(sel => {
    const prev = sel.value;
    sel.innerHTML = "";
    const groups = [
      ["Built-in tunings", BUILTIN_TUNINGS],
      ["Your custom tunings", customTunings],
    ];
    groups.forEach(([label, list]) => {
      if (!list.length) return;
      const og = document.createElement("optgroup");
      og.label = label;
      list.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t.id;
        opt.textContent = t.name;
        og.appendChild(opt);
      });
      sel.appendChild(og);
    });
    // Keep the previous selection if it still exists.
    if ([...sel.options].some(o => o.value === prev)) sel.value = prev;
  });
}

/** String gauges for the wire visual, low (thick) to high (thin), in px. */
const GAUGES = [6, 5, 4, 3, 2.4, 1.8];

function renderStringRack() {
  const tuning = getTuningById(currentTuningId);
  const rack = document.getElementById("string-rack");
  rack.innerHTML = "";

  // Display low string (string 6) at the top, like looking down at a guitar.
  for (let i = 5; i >= 0; i--) {
    const midi = tuning.midi[i];
    const stringNumber = 6 - i; // i=5 (high e) -> string 1

    const btn = document.createElement("button");
    btn.className = "string-btn";
    btn.innerHTML = `
      <span class="string-note">${midiToName(midi, { octave: false })}<small class="octave">${Math.floor(midi / 12) - 1}</small></span>
      <span class="string-wire" style="--gauge:${GAUGES[i]}px"></span>
      <span class="string-meta"><span class="snum">String ${stringNumber}</span><br>${midiToFreq(midi).toFixed(1)} Hz</span>
    `;
    btn.addEventListener("click", () => {
      playNote(midiToFreq(midi), { dur: 2.5 });
      btn.classList.remove("plucked");
      void btn.offsetWidth; // restart the CSS animation
      btn.classList.add("plucked");
    });
    rack.appendChild(btn);
  }

  // Update the explanation blurb (custom tunings get a generic one).
  document.getElementById("tuning-explanation").textContent =
    tuning.blurb || "One of your custom tunings. Strings run low to high: " +
    tuning.midi.map(m => midiToName(m)).join(" ") + ".";
}

tuningSelect.addEventListener("change", () => {
  currentTuningId = tuningSelect.value;
  renderStringRack();
  renderFretboard(); // fretboard note names depend on the tuning
});

/* ==========================================================================
   6. CUSTOM TUNINGS
   ========================================================================== */

const OCTAVE_CHOICES = [1, 2, 3, 4, 5];

function renderCustomBuilder() {
  const wrap = document.getElementById("custom-builder");
  wrap.innerHTML = "";
  const standard = BUILTIN_TUNINGS[0].midi;

  // Rows displayed low string (6) to high string (1), same as the tuner.
  for (let i = 5; i >= 0; i--) {
    const row = document.createElement("div");
    row.className = "custom-row";
    row.dataset.string = i;

    const noteSel = document.createElement("select");
    NOTE_NAMES.forEach((n, pc) => {
      const opt = document.createElement("option");
      opt.value = pc;
      // Show both spellings where they differ, e.g. "C# / Db"
      opt.textContent = n === FLAT_NAMES[pc] ? n : `${n} / ${FLAT_NAMES[pc]}`;
      noteSel.appendChild(opt);
    });

    const octSel = document.createElement("select");
    OCTAVE_CHOICES.forEach(o => {
      const opt = document.createElement("option");
      opt.value = o;
      opt.textContent = "Octave " + o;
      octSel.appendChild(opt);
    });

    // Default each row to standard tuning so users start from familiar ground.
    noteSel.value = standard[i] % 12;
    octSel.value = Math.floor(standard[i] / 12) - 1;

    const testBtn = document.createElement("button");
    testBtn.className = "btn";
    testBtn.textContent = "\u25B6 Test";
    testBtn.addEventListener("click", () => {
      playNote(midiToFreq(rowMidi(row)), { dur: 2 });
    });

    const label = document.createElement("span");
    label.className = "rlabel";
    label.textContent = "String " + (6 - i);

    row.append(label, noteSel, octSel, testBtn);
    wrap.appendChild(row);
  }
}

/** Read the MIDI number a builder row is currently set to. */
function rowMidi(row) {
  const [noteSel, octSel] = row.querySelectorAll("select");
  return (parseInt(octSel.value, 10) + 1) * 12 + parseInt(noteSel.value, 10);
}

document.getElementById("custom-save").addEventListener("click", () => {
  const msg = document.getElementById("custom-msg");
  const name = document.getElementById("custom-name").value.trim();

  if (!name) return flashMsg(msg, "Give your tuning a name first.", "err");
  if (allTunings().some(t => t.name.toLowerCase() === name.toLowerCase()))
    return flashMsg(msg, `A tuning named "${name}" already exists — pick another name.`, "err");

  // Rows are rendered string 6 -> 1; collect them back into low-to-high order.
  const rows = [...document.querySelectorAll(".custom-row")];
  const midi = new Array(6);
  rows.forEach(row => { midi[parseInt(row.dataset.string, 10)] = rowMidi(row); });

  customTunings.push({ id: "custom-" + Date.now(), name, midi });
  saveCustomTunings();
  renderTuningSelects();
  renderCustomSavedList();
  renderLibrary();
  document.getElementById("custom-name").value = "";
  flashMsg(msg, `Saved "${name}". It's now available in the Tuner and Tab Player.`);
});

function renderCustomSavedList() {
  const wrap = document.getElementById("custom-saved-list");
  wrap.innerHTML = "";
  if (!customTunings.length) {
    wrap.innerHTML = `<p class="saved-empty">No custom tunings yet. Build one above.</p>`;
    return;
  }
  customTunings.forEach(t => {
    const item = document.createElement("div");
    item.className = "saved-item";
    item.innerHTML = `
      <span class="sname">${escapeHtml(t.name)}</span>
      <span class="sdetail">${t.midi.map(m => midiToName(m)).join(" ")}</span>
      <span class="spacer"></span>
    `;
    const useBtn = document.createElement("button");
    useBtn.className = "btn";
    useBtn.textContent = "Open in tuner";
    useBtn.addEventListener("click", () => {
      currentTuningId = t.id;
      renderTuningSelects();
      tuningSelect.value = t.id;
      renderStringRack();
      renderFretboard();
      document.querySelector('[data-panel="tuner"]').click();
    });
    const delBtn = document.createElement("button");
    delBtn.className = "btn";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => {
      customTunings = customTunings.filter(x => x.id !== t.id);
      if (currentTuningId === t.id) currentTuningId = "standard";
      saveCustomTunings();
      renderTuningSelects();
      renderCustomSavedList();
      renderStringRack();
      renderFretboard();
      renderLibrary();
    });
    item.append(useBtn, delBtn);
    wrap.appendChild(item);
  });
}

/** Escape user-provided text before inserting it as HTML. */
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

/* ==========================================================================
   7. FRETBOARD
   --------------------------------------------------------------------------
   A CSS-grid board: fret-number row on top, then six string rows (low string
   on top). Each cell holds a .note-dot we can light up during playback or
   flash for practice drills. Note names come from the current tuner tuning.
   ========================================================================== */

const FRET_COUNT = 12;
const INLAY_FRETS = new Set([3, 5, 7, 9, 12]);

// noteDots[stringIndex][fret] -> the .note-dot element (stringIndex is low=0)
let noteDots = [];

function renderFretboard() {
  const tuning = getTuningById(currentTuningId);
  const board = document.getElementById("fretboard");
  board.innerHTML = "";
  noteDots = Array.from({ length: 6 }, () => new Array(FRET_COUNT + 1));

  // Fret-number header row.
  for (let f = 0; f <= FRET_COUNT; f++) {
    const cell = document.createElement("div");
    cell.className = "fret-num-row";
    cell.textContent = f === 0 ? "open" : f;
    board.appendChild(cell);
  }

  // Six string rows, low string (6) at the top.
  for (let i = 5; i >= 0; i--) {
    for (let f = 0; f <= FRET_COUNT; f++) {
      const cell = document.createElement("div");
      cell.className = "fret-cell" + (f === 0 ? " nut" : "");
      cell.style.setProperty("--gauge", GAUGES[i] * 0.6 + "px");
      // Inlay dots drawn once, on the middle string row.
      if (i === 3 && INLAY_FRETS.has(f)) cell.classList.add("inlay");

      const dot = document.createElement("span");
      dot.className = "note-dot";
      dot.textContent = midiToName(tuning.midi[i] + f, { octave: false });

      // Clicking a fretboard cell plays that note — handy for exploring,
      // and it powers the "note finder" practice drill.
      dot.addEventListener("click", () => {
        playNote(midiToFreq(tuning.midi[i] + f), { dur: 1.5 });
        onFretboardClick(i, f);
      });

      cell.appendChild(dot);
      noteDots[i][f] = dot;
      board.appendChild(cell);
    }
  }
}

/** Light a note dot for `ms` milliseconds. */
function lightDot(stringIndex, fret, ms = 300, cls = "lit") {
  const dot = noteDots[stringIndex] && noteDots[stringIndex][fret];
  if (!dot) return;
  dot.classList.add(cls);
  setTimeout(() => dot.classList.remove(cls), ms);
}

function clearAllDots() {
  document.querySelectorAll(".note-dot.lit, .note-dot.flash")
    .forEach(d => d.classList.remove("lit", "flash"));
}

// Hook used by the note-finder practice drill; a no-op by default.
let onFretboardClick = () => {};

/* ==========================================================================
   8. TAB PARSER
   --------------------------------------------------------------------------
   Input: ASCII tab text. Output: { events, columns, warnings } where events
   is a list of { col, notes: [{ string, fret }] } sorted by column.

   Rules:
   - Exactly six tab lines are required (blank lines are ignored).
   - Lines may start with a string label like "e|", "B|", "E |" — or not.
   - Lines are read top-to-bottom as HIGH string to LOW string (standard
     tab layout), and mapped onto the current tuning low-to-high.
   - Multi-digit frets ("10", "12") are read as one number.
   - Notes in the same character column play together as a chord.
   - Technique symbols (h p b r / \ ~ x) are skipped with a warning.
   ========================================================================== */

const TECHNIQUE_CHARS = new Set(["h", "p", "b", "r", "/", "\\", "~", "x", "s", "t", "v", "^"]);

function parseTab(text) {
  const warnings = [];

  // Keep only lines that look like tab (contain dashes or fret digits with
  // pipes); drop blank lines and stray comment lines.
  const rawLines = text.split("\n").map(l => l.replace(/\r/g, ""));
  const tabLines = rawLines.filter(l => {
    const t = l.trim();
    if (!t) return false;               // blank line
    return /[-|]/.test(t) && /-/.test(t); // must contain at least one dash
  });

  if (tabLines.length === 0)
    return { error: "No tab lines found. Paste a six-line tab like the example." };
  if (tabLines.length < 6)
    return { error: `Found only ${tabLines.length} tab line(s) — a guitar tab needs 6 (one per string). Check for missing lines.` };
  if (tabLines.length > 6)
    return { error: `Found ${tabLines.length} tab lines — paste one 6-line section at a time. (Multiple sections coming later!)` };

  // Strip optional string labels ("e|", "B|", "D |") and the leading pipe,
  // so all six lines start at the same musical position.
  const contents = tabLines.map(line => {
    let s = line;
    const labelMatch = s.match(/^\s*[A-Ga-g][#b]?\s*(?=\|)/);
    if (labelMatch) s = s.slice(labelMatch[0].length);
    s = s.replace(/^\s*\|/, ""); // opening pipe
    return s;
  });

  // Pad all lines to the same length so column indexes line up.
  const width = Math.max(...contents.map(l => l.length));
  const grid = contents.map(l => l.padEnd(width, "-"));

  // Walk every column. Line 0 is the HIGH string (top of the tab), so the
  // tuning index for line L is (5 - L). "consumed" skips the second digit
  // of two-digit frets.
  const events = [];
  let sawTechnique = false;
  const consumed = grid.map(() => new Array(width).fill(false));

  for (let col = 0; col < width; col++) {
    const notes = [];
    for (let line = 0; line < 6; line++) {
      if (consumed[line][col]) continue;
      const ch = grid[line][col];

      if (/\d/.test(ch)) {
        // Two-digit fret? Peek at the next character.
        let fretStr = ch;
        if (col + 1 < width && /\d/.test(grid[line][col + 1])) {
          fretStr += grid[line][col + 1];
          consumed[line][col + 1] = true;
        }
        const fret = parseInt(fretStr, 10);
        if (fret > 24) {
          warnings.push(`Fret ${fret} looks too high — check column ${col + 1}.`);
        } else {
          notes.push({ string: 5 - line, fret });
        }
      } else if (TECHNIQUE_CHARS.has(ch.toLowerCase())) {
        sawTechnique = true;
      } else if (ch !== "-" && ch !== "|" && ch !== " " && ch !== ".") {
        // Unknown character: warn once per character type.
        const w = `Ignored unrecognized character "${ch}".`;
        if (!warnings.includes(w)) warnings.push(w);
      }
    }
    if (notes.length) events.push({ col, notes });
  }

  if (sawTechnique)
    warnings.unshift("Heads up: bends, slides, hammer-ons and similar symbols (b / \\ h p ~) aren't supported yet — those notes play plainly or are skipped.");

  if (!events.length)
    return { error: "That tab parsed, but it has no notes in it — only empty strings." };

  return { events, columns: width, grid, warnings };
}

/* ==========================================================================
   9. TAB PLAYER
   --------------------------------------------------------------------------
   Each character column = one sixteenth note. We schedule audio slightly
   ahead on the Web Audio clock (accurate), and drive the visual highlight
   with setTimeout (close enough for eyes).
   ========================================================================== */

const tabInput = document.getElementById("tab-input");
const tabDisplay = document.getElementById("tab-display");
const tabMsg = document.getElementById("tab-msg");
const tabBpmSlider = document.getElementById("tab-bpm");
const tabBpmValue = document.getElementById("tab-bpm-value");

let tabPlayback = { timeouts: [], playing: false };

tabBpmSlider.value = prefs.tabBpm;
tabBpmValue.textContent = prefs.tabBpm;
tabBpmSlider.addEventListener("input", () => {
  tabBpmValue.textContent = tabBpmSlider.value;
  prefs.tabBpm = parseInt(tabBpmSlider.value, 10);
  savePrefs();
});

document.getElementById("tab-play").addEventListener("click", playTab);
document.getElementById("tab-stop").addEventListener("click", stopTab);

function playTab() {
  stopTab(); // restart cleanly if already playing
  const ctx = ensureAudio();
  if (!ctx) return flashMsg(tabMsg, "Your browser blocked audio — click Power On Audio first.", "err");

  const parsed = parseTab(tabInput.value);
  if (parsed.error) return flashMsg(tabMsg, parsed.error, "err");
  if (parsed.warnings.length) flashMsg(tabMsg, parsed.warnings[0], "err");

  const tuning = getTuningById(tabTuningSelect.value || currentTuningId);
  const bpm = parseInt(tabBpmSlider.value, 10);
  const stepSec = (60 / bpm) / 4; // one column = one sixteenth note

  renderTabDisplay(parsed.grid);

  const startTime = ctx.currentTime + 0.1;
  tabPlayback.playing = true;

  parsed.events.forEach(ev => {
    const when = startTime + ev.col * stepSec;
    ev.notes.forEach(n => {
      const midi = tuning.midi[n.string] + n.fret;
      playNote(midiToFreq(midi), { when, dur: Math.max(stepSec * 3, 0.5) });
    });

    // Visual highlight, aligned with the audio start.
    const delayMs = (when - ctx.currentTime) * 1000;
    tabPlayback.timeouts.push(setTimeout(() => {
      highlightTabColumn(ev.col);
      ev.notes.forEach(n => {
        if (n.fret <= FRET_COUNT) lightDot(n.string, n.fret, stepSec * 3000);
      });
    }, delayMs));
  });

  // Schedule the end (loop or stop).
  const totalMs = (0.1 + parsed.columns * stepSec) * 1000 + 150;
  tabPlayback.timeouts.push(setTimeout(() => {
    if (document.getElementById("tab-loop").checked && tabPlayback.playing) {
      playTab();
    } else {
      stopTab();
    }
  }, totalMs));
}

function stopTab() {
  tabPlayback.timeouts.forEach(clearTimeout);
  tabPlayback.timeouts = [];
  tabPlayback.playing = false;
  clearAllDots();
  highlightTabColumn(-1);
}

/**
 * Render the tab into the playback view with one <span> per character so we
 * can highlight a whole column at once.
 */
let tabDisplaySpans = []; // [line][col] -> span
function renderTabDisplay(grid) {
  tabDisplay.innerHTML = "";
  tabDisplaySpans = [];
  grid.forEach(line => {
    const row = [];
    const lineEl = document.createElement("div");
    for (const ch of line) {
      const span = document.createElement("span");
      span.textContent = ch;
      lineEl.appendChild(span);
      row.push(span);
    }
    tabDisplay.appendChild(lineEl);
    tabDisplaySpans.push(row);
  });
}

function highlightTabColumn(col) {
  tabDisplaySpans.forEach(row => {
    row.forEach((span, c) => {
      // Also highlight col+1 so both digits of two-digit frets light up.
      const on = c === col || (c === col + 1 && /\d/.test(span.textContent) && col >= 0 && /\d/.test(row[col] ? row[col].textContent : ""));
      span.classList.toggle("hit", on);
    });
  });
}

// Saving a tab to the library.
document.getElementById("tab-save").addEventListener("click", () => {
  const name = document.getElementById("tab-save-name").value.trim();
  if (!name) return flashMsg(tabMsg, "Give the tab a name before saving.", "err");
  savedTabs.push({
    id: "tab-" + Date.now(),
    name,
    text: tabInput.value,
    bpm: parseInt(tabBpmSlider.value, 10),
  });
  saveSavedTabs();
  renderLibrary();
  document.getElementById("tab-save-name").value = "";
  flashMsg(tabMsg, `Saved "${name}" to your library.`);
});

/* ==========================================================================
   10. CHORDS
   ========================================================================== */

/** Strum a chord: play its strings low-to-high, staggered like a real strum. */
function strumChord(chord, when = 0, dur = 1.6) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const t = Math.max(ctx.currentTime, when || ctx.currentTime);
  let delay = 0;
  chord.frets.forEach((fret, i) => {
    if (fret === "x") return;
    const midi = STANDARD_MIDI[i] + fret;
    playNote(midiToFreq(midi), { when: t + delay, dur, velocity: 0.8 });
    delay += 0.028; // ~28 ms between strings feels like a relaxed downstrum
  });
}

/** Text diagram of a chord: one line per string, high string on top. */
function chordDiagram(chord) {
  const lines = [];
  for (let i = 5; i >= 0; i--) {
    const label = midiToName(STANDARD_MIDI[i], { octave: false }).padEnd(2);
    const fret = chord.frets[i];
    lines.push(`${i === 5 ? "e" : label.trim()} |--${fret === "x" ? "x" : fret}--|`);
  }
  return lines.join("\n");
}

function renderChordGrid() {
  const grid = document.getElementById("chord-grid");
  grid.innerHTML = "";
  CHORDS.forEach(chord => {
    const card = document.createElement("button");
    card.className = "chord-card";
    card.innerHTML = `
      <h4>${chord.name}</h4>
      <div class="chord-diagram">${chordDiagram(chord)}</div>
      <div class="chord-frets">${chord.frets.map(f => f === "x" ? "x" : f).join(" ")}</div>
    `;
    card.title = "Click to hear " + chord.name;
    card.addEventListener("click", () => strumChord(chord));
    grid.appendChild(card);
  });
}

/* ---- Progression player -------------------------------------------------- */

const progMsg = document.getElementById("prog-msg");
const progNow = document.getElementById("prog-now");
const progBpmSlider = document.getElementById("prog-bpm");
const progBpmValue = document.getElementById("prog-bpm-value");
let progTimeouts = [];

progBpmSlider.addEventListener("input", () => { progBpmValue.textContent = progBpmSlider.value; });

document.getElementById("prog-play").addEventListener("click", () => {
  stopProgression();
  const ctx = ensureAudio();
  if (!ctx) return flashMsg(progMsg, "Click Power On Audio first.", "err");

  // Accept separators: dashes, commas, pipes, or plain spaces.
  const names = document.getElementById("prog-input").value
    .split(/[-,|]+|\s+/)
    .map(s => s.trim())
    .filter(Boolean);

  if (!names.length) return flashMsg(progMsg, "Type a progression like: G - D - Em - C", "err");

  const chords = [];
  for (const n of names) {
    const found = CHORDS.find(c => c.name.toLowerCase() === n.toLowerCase());
    if (!found)
      return flashMsg(progMsg, `I don't know the chord "${n}" yet. Available: ${CHORDS.map(c => c.name).join(", ")}.`, "err");
    chords.push(found);
  }

  const bpm = parseInt(progBpmSlider.value, 10);
  const beatSec = 60 / bpm;
  const barSec = beatSec * 4; // one chord per 4/4 bar
  const start = ctx.currentTime + 0.1;

  chords.forEach((chord, i) => {
    const when = start + i * barSec;
    // Strum on beats 1 and 3 of each bar for a simple feel.
    strumChord(chord, when, barSec);
    strumChord(chord, when + beatSec * 2, barSec / 2);

    progTimeouts.push(setTimeout(() => { progNow.textContent = chord.name; },
      (when - ctx.currentTime) * 1000));
  });

  progTimeouts.push(setTimeout(() => { progNow.textContent = ""; },
    (0.1 + chords.length * barSec) * 1000));
});

document.getElementById("prog-stop").addEventListener("click", stopProgression);

function stopProgression() {
  progTimeouts.forEach(clearTimeout);
  progTimeouts = [];
  progNow.textContent = "";
}

/* ==========================================================================
   11. METRONOME
   --------------------------------------------------------------------------
   Uses the standard "lookahead scheduler" pattern: a setInterval wakes every
   25 ms and schedules any clicks that fall in the next 100 ms on the Web
   Audio clock. Audio stays rock-solid even if the tab lags.
   ========================================================================== */

const metro = {
  running: false,
  bpm: 100,
  beatsPerBar: 4,
  accent: true,
  nextNoteTime: 0,
  beat: 0,           // current beat within the bar (0-indexed)
  timer: null,
};

const metroBpmSlider = document.getElementById("metro-bpm");
const metroBpmValue = document.getElementById("metro-bpm-value");
const metroToggle = document.getElementById("metro-toggle");
const metroBeats = document.getElementById("metro-beats");

metroBpmSlider.addEventListener("input", () => {
  metro.bpm = parseInt(metroBpmSlider.value, 10);
  metroBpmValue.textContent = metro.bpm;
});

document.getElementById("metro-sig").addEventListener("change", e => {
  metro.beatsPerBar = parseInt(e.target.value, 10);
  metro.beat = 0;
  renderMetroBeats();
});

document.getElementById("metro-accent").addEventListener("change", e => {
  metro.accent = e.target.checked;
});

metroToggle.addEventListener("click", () => {
  if (metro.running) stopMetronome(); else startMetronome();
});

function startMetronome() {
  const ctx = ensureAudio();
  if (!ctx) return;
  metro.running = true;
  metro.beat = 0;
  metro.nextNoteTime = ctx.currentTime + 0.05;
  metroToggle.innerHTML = "&#9632; Stop";
  metroToggle.classList.remove("btn-primary");
  metro.timer = setInterval(schedulerTick, 25);
}

function stopMetronome() {
  metro.running = false;
  clearInterval(metro.timer);
  metroToggle.innerHTML = "&#9654; Start";
  metroToggle.classList.add("btn-primary");
  document.querySelectorAll(".metro-beat").forEach(b => b.classList.remove("on"));
}

function schedulerTick() {
  const ctx = audioCtx;
  // In 6/8, the eighth note gets the beat, so beats come twice as fast.
  const beatSec = (60 / metro.bpm) * (metro.beatsPerBar === 6 ? 0.5 : 1);

  while (metro.nextNoteTime < ctx.currentTime + 0.1) {
    const isAccent = metro.accent && metro.beat === 0;
    playClick(metro.nextNoteTime, isAccent);

    // Light up the matching beat dot in sync with the click.
    const beatIndex = metro.beat;
    const delayMs = Math.max(0, (metro.nextNoteTime - ctx.currentTime) * 1000);
    setTimeout(() => flashBeatDot(beatIndex), delayMs);

    metro.nextNoteTime += beatSec;
    metro.beat = (metro.beat + 1) % metro.beatsPerBar;
  }
}

function renderMetroBeats() {
  metroBeats.innerHTML = "";
  for (let i = 0; i < metro.beatsPerBar; i++) {
    const dot = document.createElement("span");
    dot.className = "metro-beat" + (i === 0 ? " accent" : "");
    metroBeats.appendChild(dot);
  }
}

function flashBeatDot(i) {
  const dots = metroBeats.children;
  [...dots].forEach(d => d.classList.remove("on"));
  if (dots[i]) {
    dots[i].classList.add("on");
    setTimeout(() => dots[i] && dots[i].classList.remove("on"), 120);
  }
}

/* ---- Tap tempo: average the gaps between the last few taps. -------------- */
let tapTimes = [];
document.getElementById("metro-tap").addEventListener("click", () => {
  const now = performance.now();
  // Reset if it's been more than 2 seconds since the last tap.
  if (tapTimes.length && now - tapTimes[tapTimes.length - 1] > 2000) tapTimes = [];
  tapTimes.push(now);
  if (tapTimes.length >= 2) {
    const gaps = [];
    for (let i = 1; i < tapTimes.length; i++) gaps.push(tapTimes[i] - tapTimes[i - 1]);
    const avgMs = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const bpm = Math.min(250, Math.max(30, Math.round(60000 / avgMs)));
    metro.bpm = bpm;
    metroBpmSlider.value = bpm;
    metroBpmValue.textContent = bpm;
  }
  if (tapTimes.length > 6) tapTimes.shift(); // keep the average recent
});

/* ==========================================================================
   12. PRACTICE TOOLS
   ========================================================================== */

const rand = arr => arr[Math.floor(Math.random() * arr.length)];

/* ---- String trainer ---- */
let ptString = null; // { index, midi }
function nextPracticeString() {
  const tuning = getTuningById(currentTuningId);
  const index = Math.floor(Math.random() * 6);
  ptString = { index, midi: tuning.midi[index] };
  document.getElementById("pt-string-prompt").textContent =
    `String ${6 - index} (${midiToName(ptString.midi, { octave: false })})`;
}
document.getElementById("pt-string-next").addEventListener("click", nextPracticeString);
document.getElementById("pt-string-hear").addEventListener("click", () => {
  if (!ptString) nextPracticeString();
  playNote(midiToFreq(ptString.midi), { dur: 2 });
});

/* ---- Note finder ---- */
let ptNote = null; // pitch class 0–11
function nextPracticeNote() {
  ptNote = Math.floor(Math.random() * 12);
  document.getElementById("pt-note-prompt").textContent = NOTE_NAMES[ptNote];
  document.getElementById("pt-note-answer").textContent = "";
  document.getElementById("pt-note-answer").className = "practice-hint";
}
document.getElementById("pt-note-next").addEventListener("click", nextPracticeNote);
document.getElementById("pt-note-reveal").addEventListener("click", () => {
  if (ptNote === null) nextPracticeNote();
  const tuning = getTuningById(currentTuningId);
  const spots = [];
  for (let s = 0; s < 6; s++) {
    for (let f = 0; f <= FRET_COUNT; f++) {
      if ((tuning.midi[s] + f) % 12 === ptNote) {
        spots.push(`str ${6 - s} fret ${f}`);
        lightDot(s, f, 2500, "flash");
      }
    }
  }
  const answer = document.getElementById("pt-note-answer");
  answer.textContent = "Flashing on the fretboard below the Tab Player — " + spots.join(", ");
  answer.className = "practice-hint ok";
});

/* ---- Tuning challenge ---- */
function nextTuningChallenge() {
  const tuning = rand(BUILTIN_TUNINGS);
  document.getElementById("pt-tuning-prompt").textContent = tuning.name;
  const wrap = document.getElementById("pt-tuning-strings");
  wrap.innerHTML = "";
  for (let i = 5; i >= 0; i--) {
    const midi = tuning.midi[i];
    const b = document.createElement("button");
    b.className = "btn";
    b.textContent = midiToName(midi);
    b.addEventListener("click", () => playNote(midiToFreq(midi), { dur: 2 }));
    wrap.appendChild(b);
  }
}
document.getElementById("pt-tuning-next").addEventListener("click", nextTuningChallenge);

/* ---- Ear training ---- */
let earNote = null; // MIDI number
document.getElementById("pt-ear-play").addEventListener("click", () => {
  const ctx = ensureAudio();
  if (!ctx) return;
  const result = document.getElementById("pt-ear-result");
  result.textContent = "";
  result.className = "practice-hint";

  // Pick a random note from the current tuning's open strings ± a few frets.
  const tuning = getTuningById(currentTuningId);
  earNote = rand(tuning.midi) + Math.floor(Math.random() * 5);
  playNote(midiToFreq(earNote), { dur: 2 });

  // Build 4 answer choices: the right one + 3 nearby decoys.
  const correctPc = earNote % 12;
  const choices = new Set([correctPc]);
  while (choices.size < 4) choices.add(Math.floor(Math.random() * 12));
  const shuffled = [...choices].sort(() => Math.random() - 0.5);

  const wrap = document.getElementById("pt-ear-choices");
  wrap.innerHTML = "";
  shuffled.forEach(pc => {
    const b = document.createElement("button");
    b.className = "btn";
    b.textContent = NOTE_NAMES[pc];
    b.addEventListener("click", () => {
      if (pc === correctPc) {
        result.textContent = `Right! It was ${midiToName(earNote)}.`;
        result.className = "practice-hint ok";
      } else {
        result.textContent = `Not quite — try replaying it.`;
        result.className = "practice-hint err";
      }
    });
    wrap.appendChild(b);
  });
});

/* ==========================================================================
   13. LIBRARY — saved tabs, saved tunings, import/export
   ========================================================================== */

const libraryMsg = document.getElementById("library-msg");

function renderLibrary() {
  // Saved tabs
  const tabsWrap = document.getElementById("library-tabs");
  tabsWrap.innerHTML = "";
  if (!savedTabs.length) {
    tabsWrap.innerHTML = `<p class="saved-empty">No saved tabs yet. Save one from the Tab Player.</p>`;
  } else {
    savedTabs.forEach(tab => {
      const item = document.createElement("div");
      item.className = "saved-item";
      item.innerHTML = `
        <span class="sname">${escapeHtml(tab.name)}</span>
        <span class="sdetail">${tab.bpm} BPM</span>
        <span class="spacer"></span>
      `;
      const loadBtn = document.createElement("button");
      loadBtn.className = "btn";
      loadBtn.textContent = "Load in player";
      loadBtn.addEventListener("click", () => {
        tabInput.value = tab.text;
        tabBpmSlider.value = tab.bpm;
        tabBpmValue.textContent = tab.bpm;
        document.querySelector('[data-panel="tabplayer"]').click();
      });
      const delBtn = document.createElement("button");
      delBtn.className = "btn";
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", () => {
        savedTabs = savedTabs.filter(t => t.id !== tab.id);
        saveSavedTabs();
        renderLibrary();
      });
      item.append(loadBtn, delBtn);
      tabsWrap.appendChild(item);
    });
  }

  // Saved tunings (same data as the Custom Tuning panel, listed here too)
  const tuningsWrap = document.getElementById("library-tunings");
  tuningsWrap.innerHTML = "";
  if (!customTunings.length) {
    tuningsWrap.innerHTML = `<p class="saved-empty">No custom tunings yet.</p>`;
  } else {
    customTunings.forEach(t => {
      const item = document.createElement("div");
      item.className = "saved-item";
      item.innerHTML = `
        <span class="sname">${escapeHtml(t.name)}</span>
        <span class="sdetail">${t.midi.map(m => midiToName(m)).join(" ")}</span>
      `;
      tuningsWrap.appendChild(item);
    });
  }
}

/* ---- Export: bundle everything into one downloadable JSON file. ---------- */
document.getElementById("export-json").addEventListener("click", () => {
  const payload = {
    app: "fretkit",
    version: 1,
    exportedAt: new Date().toISOString(),
    customTunings,
    savedTabs,
    prefs,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "fretkit-backup.json";
  a.click();
  URL.revokeObjectURL(a.href);
  flashMsg(libraryMsg, "Backup downloaded.");
});

/* ---- Import: validate, then merge (skipping duplicates by name). --------- */
document.getElementById("import-json").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (data.app !== "fretkit") throw new Error("Not a Fretkit backup file.");

      let added = 0;
      (data.customTunings || []).forEach(t => {
        const valid = t && t.name && Array.isArray(t.midi) && t.midi.length === 6 &&
                      t.midi.every(m => Number.isInteger(m) && m >= 0 && m <= 127);
        if (valid && !customTunings.some(x => x.name === t.name)) {
          customTunings.push({ id: "custom-" + Date.now() + "-" + added, name: t.name, midi: t.midi });
          added++;
        }
      });
      (data.savedTabs || []).forEach(t => {
        if (t && t.name && typeof t.text === "string" && !savedTabs.some(x => x.name === t.name)) {
          savedTabs.push({ id: "tab-" + Date.now() + "-" + added, name: t.name, text: t.text, bpm: t.bpm || 90 });
          added++;
        }
      });

      saveCustomTunings();
      saveSavedTabs();
      renderTuningSelects();
      renderCustomSavedList();
      renderLibrary();
      flashMsg(libraryMsg, `Imported ${added} item(s).`);
    } catch (err) {
      flashMsg(libraryMsg, "Couldn't import that file: " + err.message, "err");
    }
    e.target.value = ""; // allow re-importing the same file
  };
  reader.readAsText(file);
});

/* ==========================================================================
   14. BOOT — wire up preference toggles and render everything once.
   ========================================================================== */

function bindPref(id, key, extra) {
  const el = document.getElementById(id);
  el.checked = prefs[key];
  el.addEventListener("change", () => {
    prefs[key] = el.checked;
    savePrefs();
    applyPrefClasses();
    if (extra) extra();
  });
}

bindPref("pref-note-names", "noteNames");
bindPref("pref-string-numbers", "stringNumbers");
bindPref("pref-fret-numbers", "fretNumbers");
bindPref("pref-explanations", "explanations");
bindPref("pref-lefty", "lefty");

const soundSelect = document.getElementById("pref-sound");
soundSelect.value = prefs.sound;
soundSelect.addEventListener("change", () => {
  prefs.sound = soundSelect.value;
  savePrefs();
  // Preview the new sound so the change is instantly audible.
  playNote(midiToFreq(64), { dur: 1.2, velocity: 0.5 });
});

// First interaction anywhere on the page also wakes the AudioContext, so
// users who skip the power button still get sound on their first click.
document.body.addEventListener("pointerdown", () => ensureAudio(), { once: true });

applyPrefClasses();
renderTuningSelects();
renderStringRack();
renderCustomBuilder();
renderCustomSavedList();
renderFretboard();
renderTabDisplay(parseTab(tabInput.value).grid || []);
renderChordGrid();
renderMetroBeats();
nextPracticeString();
nextPracticeNote();
nextTuningChallenge();
renderLibrary();
