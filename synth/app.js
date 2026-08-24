/* =====================================================================
   PIXEL SYNTH STUDIO — app.js
   A chiptune / lofi loop maker built on the Web Audio API. No build
   tools, no backend — everything runs in this one file.

   Sections:
     1. UTILITIES          small helper functions
     2. MUSIC DATA         note names, scales, instrument presets
     3. STATE              the whole project lives in one object
     4. AUDIO ENGINE       context, effects chain, per-track gains
     5. INSTRUMENTS        oscillator voices + 8-bit drum sounds
     6. SEQUENCER          the look-ahead scheduler that plays the loop
     7. MUSICAL HELPERS    snap-to-scale + random pattern generators
     8. UI RENDERING       track list, piano roll, control panels
     9. EXPORT / SAVE      WAV render, JSON save/load, clipboard
    10. INIT               wire everything up
   ===================================================================== */

'use strict';

/* =====================================================================
   1. UTILITIES
   ===================================================================== */

// Shorthand for document.getElementById
const $ = (id) => document.getElementById(id);

// Convert a MIDI note number (60 = middle C) to a frequency in Hz
function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Random integer in [0, n)
function randInt(n) { return Math.floor(Math.random() * n); }

// Pick a random item from an array
function pick(arr) { return arr[randInt(arr.length)]; }

// Clamp a number between lo and hi
function clamp(x, lo, hi) { return Math.min(hi, Math.max(lo, x)); }

// Show a short status message in the export bar
let statusTimer = null;
function showStatus(msg) {
  $('status-msg').textContent = msg;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => { $('status-msg').textContent = ''; }, 4000);
}

/* =====================================================================
   2. MUSIC DATA
   ===================================================================== */

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Scales as semitone offsets from the root note
const SCALES = {
  major:      [0, 2, 4, 5, 7, 9, 11],
  minor:      [0, 2, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
  blues:      [0, 3, 5, 6, 7, 10],
};

// Rows shown in the piano roll for a drum track (top to bottom)
const DRUM_ROWS = ['Hi-hat', 'Snare', 'Kick', 'Noise'];

/*
  Instrument presets. Picking one from a track's dropdown copies these
  values into the track's own synth settings, which you can then tweak
  in the INSTRUMENT panel.

  wave:  'square' | 'pulse' | 'triangle' | 'sawtooth' | 'sine' | 'noise'
  duty:  pulse width for the 'pulse' wave (0.05–0.5)
  a/d/s/r: attack, decay (seconds), sustain (0–1 level), release (seconds)
  vibrato / bend: 0–1 amounts
  arpOn / arpSpeed: arpeggiator settings (notes per beat)
  lofi:  adds a per-voice low-pass + random detune for a warm, wobbly tone
  bell:  layers a bright overtone for a bell/pluck sound
  drum:  'kit' makes the whole track a 4-row drum machine;
         'kick'/'snare'/'hat' make every placed note fire that one drum
*/
const PRESETS = {
  square:   { label: 'Square Wave Lead', wave: 'square',   duty: 0.5,  a: 0.005, d: 0.05, s: 0.6, r: 0.08, vibrato: 0,   bend: 0,   arpOn: false, arpSpeed: 8, octave: 4 },
  pulse:    { label: 'Pulse Wave Lead',  wave: 'pulse',    duty: 0.25, a: 0.005, d: 0.05, s: 0.6, r: 0.08, vibrato: 0.1, bend: 0,   arpOn: false, arpSpeed: 8, octave: 4 },
  tribass:  { label: 'Triangle Bass',    wave: 'triangle', duty: 0.5,  a: 0.005, d: 0.08, s: 0.8, r: 0.06, vibrato: 0,   bend: 0,   arpOn: false, arpSpeed: 8, octave: 2 },
  softkeys: { label: 'Soft Synth Keys',  wave: 'sine',     duty: 0.5,  a: 0.03,  d: 0.25, s: 0.5, r: 0.35, vibrato: 0.1, bend: 0,   arpOn: false, arpSpeed: 8, octave: 4 },
  bell:     { label: 'Bell / Pluck',     wave: 'sine',     duty: 0.5,  a: 0.002, d: 0.3,  s: 0,   r: 0.25, vibrato: 0,   bend: 0.2, arpOn: false, arpSpeed: 8, octave: 5, bell: true },
  lofikeys: { label: 'Lofi Keys',        wave: 'sine',     duty: 0.5,  a: 0.05,  d: 0.3,  s: 0.5, r: 0.4,  vibrato: 0.2, bend: 0,   arpOn: false, arpSpeed: 8, octave: 4, lofi: true },
  arpsynth: { label: 'Arpeggio Synth',   wave: 'square',   duty: 0.5,  a: 0.004, d: 0.06, s: 0.5, r: 0.06, vibrato: 0,   bend: 0,   arpOn: true,  arpSpeed: 8, octave: 4 },
  drumkit:  { label: '8-bit Drum Kit',   drum: 'kit' },
  kick:     { label: '8-bit Kick',       drum: 'kick' },
  snare:    { label: '8-bit Snare',      drum: 'snare' },
  hihat:    { label: '8-bit Hi-hat',     drum: 'hat' },
};

/* =====================================================================
   3. STATE — the whole project in one JSON-friendly object
   ===================================================================== */

function defaultSynth(presetKey) {
  // Copy a preset so each track can edit its own values
  return Object.assign({ preset: presetKey }, PRESETS[presetKey]);
}

function defaultProject() {
  return {
    version: 1,
    bpm: 110,
    steps: 16,
    key: 'C',
    scale: 'major',
    tracks: [
      { name: 'MELODY', volume: 0.8, muted: false, solo: false, notes: [], synth: defaultSynth('square')   },
      { name: 'BASS',   volume: 0.8, muted: false, solo: false, notes: [], synth: defaultSynth('tribass')  },
      { name: 'DRUMS',  volume: 0.8, muted: false, solo: false, notes: [], synth: defaultSynth('drumkit')  },
      { name: 'KEYS',   volume: 0.6, muted: false, solo: false, notes: [], synth: defaultSynth('softkeys') },
    ],
    fx: {
      reverbOn: false, reverb: 0.3,
      delayOn:  false, delay: 0.25,
      filterOn: false, filter: 3000,
      crushOn:  false, crush: 6,
      wobbleOn: false, wobble: 0.3,
      vinylOn:  false, vinyl: 0.2,
      satOn:    false, sat: 0.3,
      master: 0.8,
    },
  };
}

let project = defaultProject();

// UI-only state (not saved with the project)
const ui = {
  selectedTrack: 0, // which track the piano roll and synth panel edit
  noteLen: 1,       // length (in steps) of newly placed notes
  playing: false,
};

/*
  Notes are stored per track as { step, row, len }.
  - Pitched tracks: row is a MIDI note number, so notes keep their pitch
    even when you change the track's octave view.
  - Drum tracks: row is 0–3, an index into DRUM_ROWS.
*/

/* =====================================================================
   4. AUDIO ENGINE
   One buildEngine(ctx) function creates the whole signal chain. It is
   used twice: once with a live AudioContext for playback, and once with
   an OfflineAudioContext when exporting a WAV file.

   Signal flow:
     track gains -> saturation -> bitcrush -> low-pass -> tape wobble
                 -> (dry + delay + reverb) -> master -> speakers
     vinyl noise ----------------------------------------^
   ===================================================================== */

let live = null; // the live engine, created on the first user gesture

function buildEngine(ctx) {
  const eng = { ctx };

  // --- master output ---
  eng.master = ctx.createGain();
  eng.master.connect(ctx.destination);

  // --- mix point that the dry/wet effect sends hang off ---
  eng.preMix = ctx.createGain();

  // dry path
  eng.dry = ctx.createGain();
  eng.preMix.connect(eng.dry);
  eng.dry.connect(eng.master);

  // delay send (time is synced to the BPM when update() runs)
  eng.delayNode = ctx.createDelay(1.5);
  eng.delayFb = ctx.createGain();
  eng.delayFb.gain.value = 0.35;
  eng.delayWet = ctx.createGain();
  eng.preMix.connect(eng.delayNode);
  eng.delayNode.connect(eng.delayFb);
  eng.delayFb.connect(eng.delayNode);
  eng.delayNode.connect(eng.delayWet);
  eng.delayWet.connect(eng.master);

  // reverb send (convolver with a generated noise impulse)
  eng.reverbNode = ctx.createConvolver();
  eng.reverbNode.buffer = makeImpulse(ctx, 2.0, 3.0);
  eng.reverbWet = ctx.createGain();
  eng.preMix.connect(eng.reverbNode);
  eng.reverbNode.connect(eng.reverbWet);
  eng.reverbWet.connect(eng.master);

  // --- serial chain in front of the mix point ---
  // tape wobble: a tiny delay whose time is wiggled by an LFO
  eng.wobbleDelay = ctx.createDelay(0.05);
  eng.wobbleDelay.delayTime.value = 0.006;
  eng.wobbleLfo = ctx.createOscillator();
  eng.wobbleLfo.frequency.value = 3.5;
  eng.wobbleDepth = ctx.createGain();
  eng.wobbleDepth.gain.value = 0;
  eng.wobbleLfo.connect(eng.wobbleDepth);
  eng.wobbleDepth.connect(eng.wobbleDelay.delayTime);
  eng.wobbleLfo.start();
  eng.wobbleDelay.connect(eng.preMix);

  // low-pass filter
  eng.filter = ctx.createBiquadFilter();
  eng.filter.type = 'lowpass';
  eng.filter.frequency.value = 20000;
  eng.filter.connect(eng.wobbleDelay);

  // bitcrusher (a wave shaper that quantises the signal into steps)
  eng.crusher = ctx.createWaveShaper();
  eng.crusher.connect(eng.filter);

  // soft saturation (a gentle tanh curve)
  eng.saturator = ctx.createWaveShaper();
  eng.saturator.connect(eng.crusher);

  // --- per-track input gains ---
  eng.trackGains = project.tracks.map((t) => {
    const g = ctx.createGain();
    g.gain.value = t.volume;
    g.connect(eng.saturator);
    return g;
  });

  // --- vinyl noise bed, looping quietly under everything ---
  eng.vinylGain = ctx.createGain();
  eng.vinylGain.gain.value = 0;
  eng.vinylGain.connect(eng.master);
  const vinylSrc = ctx.createBufferSource();
  vinylSrc.buffer = makeVinylBuffer(ctx);
  vinylSrc.loop = true;
  const vinylFilter = ctx.createBiquadFilter();
  vinylFilter.type = 'bandpass';
  vinylFilter.frequency.value = 3000;
  vinylFilter.Q.value = 0.5;
  vinylSrc.connect(vinylFilter);
  vinylFilter.connect(eng.vinylGain);
  vinylSrc.start();

  eng.update = () => updateEngine(eng);
  eng.update();
  return eng;
}

// Push the current fx settings into an engine's nodes
function updateEngine(eng) {
  const fx = project.fx;
  eng.master.gain.value = fx.master;

  eng.reverbWet.gain.value = fx.reverbOn ? fx.reverb * 0.9 : 0;

  eng.delayWet.gain.value = fx.delayOn ? fx.delay * 0.8 : 0;
  // dotted-eighth delay time, a classic lofi/chiptune echo
  eng.delayNode.delayTime.value = (60 / project.bpm) * 0.75;

  eng.filter.frequency.value = fx.filterOn ? fx.filter : 20000;

  eng.crusher.curve = fx.crushOn ? makeCrushCurve(fx.crush) : null;

  eng.saturator.curve = fx.satOn ? makeSatCurve(fx.sat) : null;

  eng.wobbleDepth.gain.value = fx.wobbleOn ? fx.wobble * 0.0035 : 0;

  eng.vinylGain.gain.value = fx.vinylOn ? fx.vinyl * 0.12 : 0;

  project.tracks.forEach((t, i) => {
    if (eng.trackGains[i]) eng.trackGains[i].gain.value = t.volume;
  });
}

// Lazily create (and resume) the live engine — browsers require a user
// gesture before audio can start.
function getLiveEngine() {
  if (!live) {
    const AC = window.AudioContext || window.webkitAudioContext;
    live = buildEngine(new AC());
  }
  if (live.ctx.state === 'suspended') live.ctx.resume();
  return live;
}

// --- generated buffers and curves for the effects ---

// Decaying noise burst used as a reverb impulse response
function makeImpulse(ctx, seconds, decay) {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

// Two seconds of soft hiss with random crackle pops
function makeVinylBuffer(ctx) {
  const rate = ctx.sampleRate;
  const len = rate * 2;
  const buf = ctx.createBuffer(1, len, rate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.25;
  for (let p = 0; p < 30; p++) { // crackle pops
    const at = randInt(len - 100);
    const amp = 0.5 + Math.random() * 0.5;
    for (let i = 0; i < 60; i++) data[at + i] += (Math.random() * 2 - 1) * amp * (1 - i / 60);
  }
  return buf;
}

// Staircase curve that fakes reducing the bit depth
function makeCrushCurve(bits) {
  const levels = Math.pow(2, bits);
  const n = 2048;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.round(x * levels) / levels;
  }
  return curve;
}

// Gentle tanh curve for warm saturation
function makeSatCurve(amount) {
  const k = 1 + amount * 8;
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(k * x) / Math.tanh(k);
  }
  return curve;
}

/* =====================================================================
   5. INSTRUMENTS
   playNote() is the single entry point the sequencer calls. Everything
   takes an engine + a time so the same code drives live playback and
   offline WAV rendering.
   ===================================================================== */

// A shared buffer of white noise, one per context
const noiseCache = new WeakMap();
function getNoiseBuffer(ctx) {
  if (!noiseCache.has(ctx)) {
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseCache.set(ctx, buf);
  }
  return noiseCache.get(ctx);
}

// Build a pulse wave with an adjustable duty cycle from its Fourier
// series (the trick behind classic console pulse channels)
function makePulseWave(ctx, duty) {
  const n = 32;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let k = 1; k < n; k++) {
    real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
  }
  return ctx.createPeriodicWave(real, imag);
}

// Play one note of a track. midiOrRow is a MIDI number for pitched
// tracks, or a drum row index for drum tracks.
function playNote(eng, trackIndex, midiOrRow, time, dur) {
  const track = project.tracks[trackIndex];
  const s = track.synth;
  const out = eng.trackGains[trackIndex];
  if (!out) return;

  if (s.drum === 'kit')   { playDrum(eng, out, midiOrRow, time); return; }
  if (s.drum === 'kick')  { playKick(eng, out, time);  return; }
  if (s.drum === 'snare') { playSnare(eng, out, time); return; }
  if (s.drum === 'hat')   { playHat(eng, out, time);   return; }

  if (s.arpOn) {
    // Arpeggiator: replace the held note with a fast root/3rd/5th/octave
    // cycle, the classic "fake chord" chiptune sound
    const minorish = project.scale === 'minor' || project.scale === 'blues';
    const patt = minorish ? [0, 3, 7, 12] : [0, 4, 7, 12];
    const interval = (60 / project.bpm) / s.arpSpeed;
    let t = time, i = 0;
    while (t < time + dur) {
      playTone(eng, out, s, midiOrRow + patt[i % patt.length], t,
               Math.min(interval * 0.95, time + dur - t));
      t += interval; i++;
    }
    return;
  }
  playTone(eng, out, s, midiOrRow, time, dur);
}

// One synth voice: oscillator (or filtered noise) + ADSR envelope
function playTone(eng, out, s, midi, time, dur) {
  const ctx = eng.ctx;
  const transposed = midi + (s.octave - 4) * 12;
  const freq = midiToFreq(transposed);

  // amplitude envelope
  const env = ctx.createGain();
  env.connect(out);
  const peak = 0.5;
  env.gain.setValueAtTime(0, time);
  env.gain.linearRampToValueAtTime(peak, time + s.a);
  env.gain.linearRampToValueAtTime(peak * s.s, time + s.a + s.d);
  env.gain.setValueAtTime(peak * s.s, Math.max(time + s.a + s.d, time + dur));
  const end = Math.max(time + s.a + s.d, time + dur) + s.r;
  env.gain.linearRampToValueAtTime(0, end);

  // per-voice lofi colour: a soft low-pass and a slightly drifted pitch
  let dest = env;
  if (s.lofi) {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1400;
    lp.connect(env);
    dest = lp;
  }
  const drift = s.lofi ? (Math.random() * 10 - 5) : 0;

  const sources = [];

  if (s.wave === 'noise') {
    // pitched noise: white noise through a resonant bandpass at the note
    const src = ctx.createBufferSource();
    src.buffer = getNoiseBuffer(ctx);
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = 12;
    src.connect(bp);
    bp.connect(dest);
    sources.push(src);
  } else {
    const osc = ctx.createOscillator();
    if (s.wave === 'pulse') osc.setPeriodicWave(makePulseWave(ctx, s.duty));
    else osc.type = s.wave;
    osc.frequency.value = freq;
    osc.detune.value = drift;
    applyPitchFx(ctx, osc, s, time);
    osc.connect(dest);
    sources.push(osc);

    if (s.bell) {
      // a quiet, bright overtone gives the bell its "ping"
      const ping = ctx.createOscillator();
      ping.type = 'sine';
      ping.frequency.value = freq * 3.01;
      const pingGain = ctx.createGain();
      pingGain.gain.value = 0.3;
      ping.connect(pingGain);
      pingGain.connect(dest);
      sources.push(ping);
    }
  }

  sources.forEach((src) => { src.start(time); src.stop(end + 0.05); });
}

// Vibrato LFO and a rising pitch-bend at the start of the note
function applyPitchFx(ctx, osc, s, time) {
  if (s.vibrato > 0) {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.5;
    const depth = ctx.createGain();
    depth.gain.value = s.vibrato * 45; // cents
    lfo.connect(depth);
    depth.connect(osc.detune);
    lfo.start(time);
    lfo.stop(time + 10);
  }
  if (s.bend > 0) {
    osc.detune.setValueAtTime(osc.detune.value - s.bend * 400, time);
    osc.detune.linearRampToValueAtTime(0, time + 0.08);
  }
}

// --- 8-bit drum sounds ---

function playDrum(eng, out, row, time) {
  // row matches DRUM_ROWS top→bottom: 0=Hi-hat, 1=Snare, 2=Kick, 3=Noise
  if (row === 0) playHat(eng, out, time);
  else if (row === 1) playSnare(eng, out, time);
  else if (row === 2) playKick(eng, out, time);
  else playNoisePerc(eng, out, time);
}

function playKick(eng, out, time) {
  const ctx = eng.ctx;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(40, time + 0.12);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.9, time);
  env.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
  osc.connect(env); env.connect(out);
  osc.start(time); osc.stop(time + 0.3);
}

function playSnare(eng, out, time) {
  const ctx = eng.ctx;
  // noise body
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 0.8;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.6, time);
  env.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
  src.connect(bp); bp.connect(env); env.connect(out);
  src.start(time); src.stop(time + 0.2);
  // short tonal thump under the noise
  const osc = ctx.createOscillator();
  osc.type = 'triangle'; osc.frequency.value = 190;
  const oenv = ctx.createGain();
  oenv.gain.setValueAtTime(0.35, time);
  oenv.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
  osc.connect(oenv); oenv.connect(out);
  osc.start(time); osc.stop(time + 0.1);
}

function playHat(eng, out, time) {
  const ctx = eng.ctx;
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 7000;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.35, time);
  env.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
  src.connect(hp); hp.connect(env); env.connect(out);
  src.start(time); src.stop(time + 0.06);
}

function playNoisePerc(eng, out, time) {
  const ctx = eng.ctx;
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 4000;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.4, time);
  env.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
  src.connect(hp); hp.connect(env); env.connect(out);
  src.start(time); src.stop(time + 0.45);
}

/* =====================================================================
   6. SEQUENCER
   A classic look-ahead scheduler: a timer wakes up every 25ms and
   schedules any notes that fall within the next 120ms, using the audio
   clock for sample-accurate timing.
   ===================================================================== */

const seq = {
  currentStep: 0,
  nextStepTime: 0,
  timer: null,
  drawQueue: [], // { step, time } used to move the playhead in the UI
};

function stepDuration() {
  // one step = a 16th note
  return (60 / project.bpm) / 4;
}

function startPlayback() {
  const eng = getLiveEngine();
  eng.update();
  seq.currentStep = 0;
  seq.nextStepTime = eng.ctx.currentTime + 0.06;
  seq.drawQueue.length = 0;
  ui.playing = true;
  seq.timer = setInterval(schedulerTick, 25);
  requestAnimationFrame(drawPlayhead);
  $('btn-play').textContent = '■ STOP';
  $('btn-play').classList.add('on');
}

function stopPlayback() {
  ui.playing = false;
  clearInterval(seq.timer);
  seq.drawQueue.length = 0;
  clearPlayheadHighlight();
  $('btn-play').textContent = '► PLAY';
  $('btn-play').classList.remove('on');
}

function togglePlayback() {
  if (ui.playing) stopPlayback(); else startPlayback();
}

function schedulerTick() {
  const eng = live;
  while (seq.nextStepTime < eng.ctx.currentTime + 0.12) {
    scheduleStep(eng, seq.currentStep, seq.nextStepTime);
    seq.drawQueue.push({ step: seq.currentStep, time: seq.nextStepTime });
    seq.nextStepTime += stepDuration();
    seq.currentStep = (seq.currentStep + 1) % project.steps;
  }
}

// Fire every note that starts on this step, on every audible track
function scheduleStep(eng, step, time) {
  const anySolo = project.tracks.some((t) => t.solo);
  project.tracks.forEach((track, ti) => {
    const audible = anySolo ? track.solo : !track.muted;
    if (!audible) return;
    track.notes.forEach((note) => {
      if (note.step !== step || note.step >= project.steps) return;
      const dur = note.len * stepDuration() * 0.95;
      playNote(eng, ti, note.row, time, dur);
    });
  });
}

// Move the magenta playhead column in time with the audio clock
function drawPlayhead() {
  if (!ui.playing) return;
  const now = live.ctx.currentTime;
  let latest = null;
  while (seq.drawQueue.length && seq.drawQueue[0].time <= now) {
    latest = seq.drawQueue.shift().step;
  }
  if (latest !== null) {
    clearPlayheadHighlight();
    document.querySelectorAll(`.roll-cell[data-step="${latest}"]`)
      .forEach((el) => el.classList.add('playcol'));
  }
  requestAnimationFrame(drawPlayhead);
}

function clearPlayheadHighlight() {
  document.querySelectorAll('.roll-cell.playcol')
    .forEach((el) => el.classList.remove('playcol'));
}

/* =====================================================================
   7. MUSICAL HELPERS
   ===================================================================== */

// MIDI numbers of every scale note across the full range
function scaleMidiSet() {
  const root = NOTE_NAMES.indexOf(project.key);
  const offsets = SCALES[project.scale];
  const set = new Set();
  for (let midi = 0; midi < 128; midi++) {
    if (offsets.includes(((midi - root) % 12 + 12) % 12)) set.add(midi);
  }
  return set;
}

// Move every note on a pitched track to the nearest scale tone
function snapTrackToScale(trackIndex) {
  const track = project.tracks[trackIndex];
  if (track.synth.drum) { showStatus('Drum tracks have no pitch to snap.'); return; }
  const inScale = scaleMidiSet();
  track.notes.forEach((note) => {
    if (inScale.has(note.row)) return;
    for (let d = 1; d <= 6; d++) {
      if (inScale.has(note.row - d)) { note.row -= d; break; }
      if (inScale.has(note.row + d)) { note.row += d; break; }
    }
  });
  renderRoll();
  showStatus(`Snapped ${track.name} to ${project.key} ${project.scale}.`);
}

// Scale notes inside the two octaves a track currently displays
function scaleNotesInView(track) {
  const base = rollBaseMidi(track);
  const inScale = scaleMidiSet();
  const notes = [];
  for (let m = base; m < base + 25; m++) if (inScale.has(m)) notes.push(m);
  return notes;
}

function randomMelody(trackIndex) {
  const track = project.tracks[trackIndex];
  if (track.synth.drum) return;
  const pool = scaleNotesInView(track);
  track.notes = [];
  let last = pick(pool);
  for (let step = 0; step < project.steps; step++) {
    const strong = step % 4 === 0;
    if (Math.random() < (strong ? 0.85 : 0.45)) {
      // wander in small steps so the melody sounds intentional
      const idx = clamp(pool.indexOf(last) + (randInt(5) - 2), 0, pool.length - 1);
      last = pool[idx];
      const len = strong && Math.random() < 0.3 ? 2 : 1;
      track.notes.push({ step, row: last, len });
      if (len === 2) step++;
    }
  }
  renderRoll();
  showStatus(`New melody on ${track.name}.`);
}

function randomBassline(trackIndex) {
  const track = project.tracks[trackIndex];
  if (track.synth.drum) return;
  const base = rollBaseMidi(track);
  const rootPc = NOTE_NAMES.indexOf(project.key);
  // find the root note near the bottom of the view
  let root = base;
  while (root % 12 !== rootPc) root++;
  const fifth = root + 7;
  const octaveUp = root + 12;
  track.notes = [];
  for (let step = 0; step < project.steps; step++) {
    if (step % 4 === 0) track.notes.push({ step, row: root, len: 2 });
    else if (step % 4 === 2 && Math.random() < 0.7) {
      track.notes.push({ step, row: pick([root, fifth, octaveUp]), len: 1 });
    }
  }
  renderRoll();
  showStatus(`New bassline on ${track.name}.`);
}

function randomDrums(trackIndex) {
  const track = project.tracks[trackIndex];
  if (track.synth.drum !== 'kit') { showStatus('Pick a track using the 8-bit Drum Kit first.'); return; }
  track.notes = [];
  const HAT = 0, SNARE = 1, KICK = 2, NOISE = 3;
  for (let step = 0; step < project.steps; step++) {
    if (step % 8 === 0) track.notes.push({ step, row: KICK, len: 1 });
    else if (step % 8 === 6 && Math.random() < 0.5) track.notes.push({ step, row: KICK, len: 1 });
    if (step % 8 === 4) track.notes.push({ step, row: SNARE, len: 1 });
    if (step % 2 === 0 && Math.random() < 0.9) track.notes.push({ step, row: HAT, len: 1 });
    if (step === project.steps - 1 && Math.random() < 0.4) track.notes.push({ step, row: NOISE, len: 1 });
  }
  renderRoll();
  showStatus(`New drum pattern on ${track.name}.`);
}

function clearTrack(trackIndex) {
  project.tracks[trackIndex].notes = [];
  renderRoll();
}

// Double the loop length and copy every track's pattern into the new half
function duplicateLoop() {
  if (project.steps >= 32) { showStatus('Loop is already at the 32-step maximum.'); return; }
  const old = project.steps;
  project.steps *= 2;
  project.tracks.forEach((track) => {
    const copies = track.notes
      .filter((n) => n.step < old)
      .map((n) => ({ step: n.step + old, row: n.row, len: n.len }));
    track.notes.push(...copies);
  });
  $('sel-steps').value = String(project.steps);
  renderRoll();
  showStatus(`Loop doubled to ${project.steps} steps.`);
}

/* =====================================================================
   8. UI RENDERING
   ===================================================================== */

// The lowest MIDI note shown in a pitched track's roll (2 octaves + 1)
function rollBaseMidi(track) {
  return 12 * (track.synth.octave + 1); // C at the track's octave, MIDI style
}

function selectedTrack() { return project.tracks[ui.selectedTrack]; }

// ---- track list ----

function renderTracks() {
  const list = $('track-list');
  list.innerHTML = '';
  project.tracks.forEach((track, i) => {
    const row = document.createElement('div');
    row.className = 'track-row' + (i === ui.selectedTrack ? ' selected' : '');

    const top = document.createElement('div');
    top.className = 'track-row-top';

    const name = document.createElement('span');
    name.className = 'track-name';
    name.textContent = track.name;

    const mute = document.createElement('button');
    mute.className = 'tbtn' + (track.muted ? ' on-mute' : '');
    mute.textContent = 'M';
    mute.title = 'Mute this track';
    mute.onclick = (e) => { e.stopPropagation(); track.muted = !track.muted; renderTracks(); };

    const solo = document.createElement('button');
    solo.className = 'tbtn' + (track.solo ? ' on-solo' : '');
    solo.textContent = 'S';
    solo.title = 'Solo this track';
    solo.onclick = (e) => { e.stopPropagation(); track.solo = !track.solo; renderTracks(); };

    const clear = document.createElement('button');
    clear.className = 'tbtn';
    clear.textContent = 'C';
    clear.title = 'Clear all notes on this track';
    clear.onclick = (e) => { e.stopPropagation(); clearTrack(i); };

    top.append(name, mute, solo, clear);

    // instrument dropdown
    const sel = document.createElement('select');
    sel.title = 'Instrument preset';
    Object.entries(PRESETS).forEach(([key, p]) => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = p.label;
      if (track.synth.preset === key) opt.selected = true;
      sel.append(opt);
    });
    sel.onchange = () => {
      const wasDrum = !!track.synth.drum;
      track.synth = defaultSynth(sel.value);
      const isDrum = !!track.synth.drum;
      if (wasDrum !== isDrum) track.notes = []; // rows mean different things
      renderAll();
    };
    sel.onclick = (e) => e.stopPropagation();

    // volume slider
    const volWrap = document.createElement('div');
    volWrap.className = 'track-vol';
    const volLabel = document.createElement('span');
    volLabel.textContent = 'VOL';
    const vol = document.createElement('input');
    vol.type = 'range'; vol.min = 0; vol.max = 1; vol.step = 0.01;
    vol.value = track.volume;
    vol.title = 'Track volume';
    vol.oninput = () => { track.volume = Number(vol.value); if (live) live.update(); };
    vol.onclick = (e) => e.stopPropagation();
    volWrap.append(volLabel, vol);

    row.append(top, sel, volWrap);
    row.onclick = () => { ui.selectedTrack = i; renderAll(); };
    list.append(row);
  });
}

// ---- piano roll ----

function renderRoll() {
  const track = selectedTrack();
  const isDrum = track.synth.drum === 'kit';
  const isOneShotDrum = !!track.synth.drum && !isDrum;
  const rows = isDrum ? DRUM_ROWS.length : (isOneShotDrum ? 1 : 25);
  const base = rollBaseMidi(track);
  const inScale = scaleMidiSet();
  const rootPc = NOTE_NAMES.indexOf(project.key);

  // map "step -> css class" for existing notes
  const startAt = new Map();  // "row,step" -> note
  const bodyAt = new Set();   // "row,step" for the tail of long notes
  track.notes.forEach((n) => {
    startAt.set(n.row + ',' + n.step, n);
    for (let k = 1; k < n.len; k++) bodyAt.add(n.row + ',' + (n.step + k));
  });

  const roll = $('piano-roll');
  roll.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'roll-grid';
  grid.style.gridTemplateColumns = `64px repeat(${project.steps}, minmax(22px, 1fr))`;

  for (let r = 0; r < rows; r++) {
    // pitched rolls list high notes at the top
    const rowId = isDrum || isOneShotDrum ? r : base + (rows - 1 - r);

    const label = document.createElement('div');
    label.className = 'roll-label';
    if (isDrum) label.textContent = DRUM_ROWS[r];
    else if (isOneShotDrum) label.textContent = PRESETS[track.synth.preset].label;
    else {
      label.textContent = NOTE_NAMES[rowId % 12] + (Math.floor(rowId / 12) - 1);
      if (inScale.has(rowId)) label.classList.add('in-scale');
      if (rowId % 12 === rootPc) label.classList.add('root');
    }
    label.title = 'Preview this sound';
    label.onclick = () => previewRow(rowId);
    grid.append(label);

    for (let step = 0; step < project.steps; step++) {
      const cell = document.createElement('div');
      cell.className = 'roll-cell';
      if (step % 4 === 0) cell.classList.add('beat');
      cell.dataset.step = step;
      const key = rowId + ',' + step;
      if (startAt.has(key)) cell.classList.add('note');
      else if (bodyAt.has(key)) cell.classList.add('note-body');
      cell.onclick = () => toggleNote(rowId, step);
      grid.append(cell);
    }
  }
  roll.append(grid);

  $('screen-track-name').textContent = track.name + ' · ' + (PRESETS[track.synth.preset] || {}).label;
}

// Add a note at (row, step), or remove the note that covers that cell
function toggleNote(row, step) {
  const track = selectedTrack();
  const existing = track.notes.find(
    (n) => n.row === row && step >= n.step && step < n.step + n.len
  );
  if (existing) {
    track.notes = track.notes.filter((n) => n !== existing);
  } else {
    const len = track.synth.drum ? 1 : ui.noteLen;
    track.notes.push({ step, row, len: Math.min(len, project.steps - step) });
    previewRow(row); // instant feedback
  }
  renderRoll();
}

// Play a single sound so users can audition rows while editing
function previewRow(row) {
  const eng = getLiveEngine();
  playNote(eng, ui.selectedTrack, row, eng.ctx.currentTime + 0.01, stepDuration() * 2);
}

// ---- synth panel ----

function renderSynthPanel() {
  const track = selectedTrack();
  const s = track.synth;
  const isDrum = !!s.drum;
  $('synth-track-name').textContent = track.name;
  $('synth-controls').style.opacity = isDrum ? 0.35 : 1;
  $('synth-controls').style.pointerEvents = isDrum ? 'none' : 'auto';
  $('synth-drum-note').hidden = !isDrum;
  if (isDrum) return;

  $('syn-wave').value = s.wave;
  $('syn-duty').value = s.duty;
  $('syn-octave').value = s.octave;
  $('syn-a').value = s.a; $('syn-d').value = s.d;
  $('syn-s').value = s.s; $('syn-r').value = s.r;
  $('syn-vib').value = s.vibrato;
  $('syn-bend').value = s.bend;
  $('syn-arp').checked = s.arpOn;
  $('syn-arpspd').value = s.arpSpeed;
  refreshSynthReadouts();
}

function refreshSynthReadouts() {
  const s = selectedTrack().synth;
  if (s.drum) return;
  $('val-duty').textContent = Math.round(s.duty * 100) + '%';
  $('val-a').textContent = Math.round(s.a * 1000) + 'ms';
  $('val-d').textContent = Math.round(s.d * 1000) + 'ms';
  $('val-s').textContent = Math.round(s.s * 100) + '%';
  $('val-r').textContent = Math.round(s.r * 1000) + 'ms';
  $('val-vib').textContent = Math.round(s.vibrato * 100) + '%';
  $('val-bend').textContent = Math.round(s.bend * 100) + '%';
  $('val-arpspd').textContent = s.arpSpeed + '/beat';
}

function bindSynthControls() {
  const set = (id, prop, isNum = true) => {
    $(id).addEventListener('input', () => {
      const el = $(id);
      const val = el.type === 'checkbox' ? el.checked : (isNum ? Number(el.value) : el.value);
      selectedTrack().synth[prop] = val;
      refreshSynthReadouts();
      if (prop === 'octave') renderRoll(); // the visible pitch range moved
    });
  };
  set('syn-wave', 'wave', false);
  set('syn-duty', 'duty');
  set('syn-octave', 'octave');
  set('syn-a', 'a'); set('syn-d', 'd'); set('syn-s', 's'); set('syn-r', 'r');
  set('syn-vib', 'vibrato');
  set('syn-bend', 'bend');
  set('syn-arp', 'arpOn');
  set('syn-arpspd', 'arpSpeed');
}

// ---- effects panel ----

function renderFxPanel() {
  const fx = project.fx;
  $('fx-reverb-on').checked = fx.reverbOn; $('fx-reverb').value = fx.reverb;
  $('fx-delay-on').checked = fx.delayOn;   $('fx-delay').value = fx.delay;
  $('fx-filter-on').checked = fx.filterOn; $('fx-filter').value = fx.filter;
  $('fx-crush-on').checked = fx.crushOn;   $('fx-crush').value = fx.crush;
  $('fx-wobble-on').checked = fx.wobbleOn; $('fx-wobble').value = fx.wobble;
  $('fx-vinyl-on').checked = fx.vinylOn;   $('fx-vinyl').value = fx.vinyl;
  $('fx-sat-on').checked = fx.satOn;       $('fx-sat').value = fx.sat;
  $('fx-master').value = fx.master;
  refreshFxReadouts();
}

function refreshFxReadouts() {
  const fx = project.fx;
  const pct = (x) => Math.round(x * 100) + '%';
  $('val-reverb').textContent = pct(fx.reverb);
  $('val-delay').textContent = pct(fx.delay);
  $('val-filter').textContent = fx.filter + 'Hz';
  $('val-crush').textContent = fx.crush + ' bit';
  $('val-wobble').textContent = pct(fx.wobble);
  $('val-vinyl').textContent = pct(fx.vinyl);
  $('val-sat').textContent = pct(fx.sat);
  $('val-master').textContent = pct(fx.master);
}

function bindFxControls() {
  const pairs = [
    ['reverb', 'fx-reverb'], ['delay', 'fx-delay'], ['filter', 'fx-filter'],
    ['crush', 'fx-crush'], ['wobble', 'fx-wobble'], ['vinyl', 'fx-vinyl'],
    ['sat', 'fx-sat'],
  ];
  pairs.forEach(([prop, id]) => {
    $(id).addEventListener('input', () => {
      project.fx[prop] = Number($(id).value);
      refreshFxReadouts();
      if (live) live.update();
    });
    $(id + '-on').addEventListener('input', () => {
      project.fx[prop + 'On'] = $(id + '-on').checked;
      if (live) live.update();
    });
  });
  $('fx-master').addEventListener('input', () => {
    project.fx.master = Number($('fx-master').value);
    refreshFxReadouts();
    if (live) live.update();
  });
  $('btn-lofi').addEventListener('click', makeItLofi);
}

// One click, instant warmth: a curated lofi effects preset
function makeItLofi() {
  Object.assign(project.fx, {
    reverbOn: true, reverb: 0.35,
    delayOn: true, delay: 0.2,
    filterOn: true, filter: 2600,
    crushOn: true, crush: 8,
    wobbleOn: true, wobble: 0.4,
    vinylOn: true, vinyl: 0.25,
    satOn: true, sat: 0.35,
  });
  renderFxPanel();
  if (live) live.update();
  showStatus('Lofi mode on. Try Lofi Keys and a slower BPM (70–90) too.');
}

function renderAll() {
  renderTracks();
  renderRoll();
  renderSynthPanel();
  renderFxPanel();
}

/* =====================================================================
   9. EXPORT / SAVE / LOAD
   ===================================================================== */

// Render one pass of the loop (plus a reverb/delay tail) offline and
// download it as a 16-bit stereo WAV file.
async function exportWav() {
  showStatus('Rendering WAV…');
  const rate = 44100;
  const loopSec = project.steps * stepDuration();
  const tailSec = 2.0;
  const oc = new OfflineAudioContext(2, Math.ceil((loopSec + tailSec) * rate), rate);

  const eng = buildEngine(oc); // same engine code, offline context
  const startAt = 0.05;
  for (let step = 0; step < project.steps; step++) {
    scheduleStep(eng, step, startAt + step * stepDuration());
  }

  const rendered = await oc.startRendering();
  const blob = encodeWav(rendered);
  downloadBlob(blob, 'pixel-synth-loop.wav');
  showStatus('WAV exported.');
}

// Pack an AudioBuffer into a standard 16-bit PCM WAV file
function encodeWav(buffer) {
  const numCh = buffer.numberOfChannels;
  const len = buffer.length * numCh * 2;
  const out = new ArrayBuffer(44 + len);
  const view = new DataView(out);

  const writeStr = (at, s) => { for (let i = 0; i < s.length; i++) view.setUint8(at + i, s.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + len, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);            // PCM chunk size
  view.setUint16(20, 1, true);             // PCM format
  view.setUint16(22, numCh, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * numCh * 2, true); // byte rate
  view.setUint16(32, numCh * 2, true);     // block align
  view.setUint16(34, 16, true);            // bits per sample
  writeStr(36, 'data');
  view.setUint32(40, len, true);

  // interleave channels and convert floats to 16-bit ints
  let at = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      const x = clamp(buffer.getChannelData(ch)[i], -1, 1);
      view.setInt16(at, x < 0 ? x * 0x8000 : x * 0x7FFF, true);
      at += 2;
    }
  }
  return new Blob([out], { type: 'audio/wav' });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function saveProject() {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  downloadBlob(blob, 'pixel-synth-project.json');
  showStatus('Project saved.');
}

function loadProjectFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      applyLoadedProject(JSON.parse(reader.result));
    } catch (err) {
      showStatus('That file is not a valid project. Load a JSON file saved from this app.');
    }
  };
  reader.readAsText(file);
}

function applyLoadedProject(data) {
  if (!data || !Array.isArray(data.tracks)) {
    showStatus('That file is not a valid project. Load a JSON file saved from this app.');
    return;
  }
  stopPlayback();
  // merge onto defaults so older/partial files still load safely
  const fresh = defaultProject();
  project = Object.assign(fresh, data);
  project.fx = Object.assign(fresh.fx, data.fx || {});
  ui.selectedTrack = 0;
  // rebuild the live engine so track gains match the loaded project
  if (live) { live.ctx.close(); live = null; }
  syncTopBar();
  renderAll();
  showStatus('Project loaded.');
}

async function copyProjectToClipboard() {
  try {
    await navigator.clipboard.writeText(JSON.stringify(project));
    showStatus('Project data copied to clipboard.');
  } catch (err) {
    showStatus('Clipboard blocked by the browser — use Save project instead.');
  }
}

/* =====================================================================
   10. INIT — wire up the top bar, buttons, and first render
   ===================================================================== */

function syncTopBar() {
  $('inp-bpm').value = project.bpm;
  $('sel-steps').value = String(project.steps);
  $('sel-key').value = project.key;
  $('sel-scale').value = project.scale;
}

function init() {
  // populate the key dropdown
  NOTE_NAMES.filter((n) => !n.includes('#')).forEach((n) => {
    const opt = document.createElement('option');
    opt.value = n; opt.textContent = n;
    $('sel-key').append(opt);
  });

  // transport + top bar
  $('btn-play').addEventListener('click', togglePlayback);
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !['INPUT', 'SELECT', 'BUTTON'].includes(e.target.tagName)) {
      e.preventDefault();
      togglePlayback();
    }
  });
  $('inp-bpm').addEventListener('input', () => {
    project.bpm = clamp(Number($('inp-bpm').value) || 110, 40, 240);
    if (live) live.update(); // keep the delay time in sync
  });
  $('sel-steps').addEventListener('change', () => {
    project.steps = Number($('sel-steps').value);
    seq.currentStep = seq.currentStep % project.steps;
    renderRoll();
  });
  $('sel-key').addEventListener('change', () => { project.key = $('sel-key').value; renderRoll(); });
  $('sel-scale').addEventListener('change', () => { project.scale = $('sel-scale').value; renderRoll(); });
  $('sel-notelen').addEventListener('change', () => { ui.noteLen = Number($('sel-notelen').value); });

  // helpers
  $('btn-snap').addEventListener('click', () => snapTrackToScale(ui.selectedTrack));
  $('btn-rand-melody').addEventListener('click', () => {
    const i = selectedTrack().synth.drum ? 0 : ui.selectedTrack;
    randomMelody(i);
  });
  $('btn-rand-bass').addEventListener('click', () => randomBassline(1));
  $('btn-rand-drums').addEventListener('click', () => {
    const i = project.tracks.findIndex((t) => t.synth.drum === 'kit');
    if (i >= 0) randomDrums(i); else showStatus('No track is using the 8-bit Drum Kit.');
  });
  $('btn-duplicate').addEventListener('click', duplicateLoop);

  // panels
  bindSynthControls();
  bindFxControls();

  // export / save / load
  $('btn-wav').addEventListener('click', () => exportWav().catch(() => showStatus('WAV export failed in this browser.')));
  $('btn-save').addEventListener('click', saveProject);
  $('btn-load').addEventListener('click', () => $('inp-load').click());
  $('inp-load').addEventListener('change', (e) => {
    if (e.target.files[0]) loadProjectFile(e.target.files[0]);
    e.target.value = '';
  });
  $('btn-copy').addEventListener('click', copyProjectToClipboard);

  // starter pattern so the first Play press makes music
  starterPattern();
  syncTopBar();
  renderAll();
}

// A tiny demo groove: C major melody fragment, root-fifth bass, basic beat
function starterPattern() {
  const M = (n, o = 4) => 12 * (o + 1) + n; // helper: semitone n in octave o
  project.tracks[0].notes = [
    { step: 0, row: M(0), len: 1 }, { step: 2, row: M(4), len: 1 },
    { step: 4, row: M(7), len: 2 }, { step: 8, row: M(9), len: 1 },
    { step: 10, row: M(7), len: 1 }, { step: 12, row: M(4), len: 2 },
  ];
  project.tracks[1].notes = [
    { step: 0, row: M(0, 2), len: 2 }, { step: 4, row: M(0, 2), len: 2 },
    { step: 8, row: M(9, 1), len: 2 }, { step: 12, row: M(7, 1), len: 2 },
  ];
  project.tracks[2].notes = [
    { step: 0, row: 2, len: 1 }, { step: 8, row: 2, len: 1 },   // kicks
    { step: 4, row: 1, len: 1 }, { step: 12, row: 1, len: 1 },  // snares
    { step: 0, row: 0, len: 1 }, { step: 2, row: 0, len: 1 },   // hats
    { step: 4, row: 0, len: 1 }, { step: 6, row: 0, len: 1 },
    { step: 8, row: 0, len: 1 }, { step: 10, row: 0, len: 1 },
    { step: 12, row: 0, len: 1 }, { step: 14, row: 0, len: 1 },
  ];
}

document.addEventListener('DOMContentLoaded', init);
