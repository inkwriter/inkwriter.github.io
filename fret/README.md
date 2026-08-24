# Fretkit 🎸

A free, no-backend guitar toolkit that runs entirely in your browser: tuner, custom tuning builder, ASCII tab playback, chord library, metronome, and practice drills. Built with plain HTML/CSS/JavaScript — no frameworks, no build step, no accounts, no tracking. Everything you save stays in your browser's localStorage.

Once the page has loaded, it keeps working offline.

## Features

| Section | What it does |
|---|---|
| **Tuner** | 8 built-in tunings (Standard, Drop D, Half-Step Down, Drop C#, Drop C, Open G, Open D, DADGAD) plus your custom ones. Click a string to hear its pitch — the string visibly vibrates. |
| **Custom Tuning** | Pick a note + octave per string, test each one, name it, save it. Saved tunings appear in the Tuner and Tab Player. |
| **Tab Player** | Paste a six-line ASCII tab and hear it. BPM slider, loop toggle, stop button, tuning selector, live highlighting of the tab text *and* the visual fretboard. |
| **Chords** | 9 common open chords with text diagrams and click-to-strum, plus a progression player (`G - D - Em - C`) that strums one chord per bar at your BPM. |
| **Metronome** | Web-Audio-clock scheduler (stays tight even in background tabs), 4/4 · 3/4 · 6/8, accent on beat 1, tap tempo. |
| **Practice** | String trainer, note finder (flashes every position on the fretboard), tuning challenge, and ear training with multiple choice. |
| **Library** | All saved tabs and tunings in one place, with JSON export/import for backups. |

## How to host on GitHub Pages

1. Create a new repository (e.g. `fretkit`).
2. Put `index.html`, `styles.css`, and `app.js` in the repository root.
3. Push, then go to **Settings → Pages**, set Source to **Deploy from a branch**, pick `main` and `/ (root)`, and save.
4. Your app appears at `https://<username>.github.io/fretkit/` within a minute or two.

No build step, no config — the three files are the whole app.

## Using the app

**First click matters:** browsers block all sound until you interact with the page. Click the **Power On Audio** pilot lamp in the header (it glows amber when audio is live). Any other click also wakes the audio, so if you forget, the first string you pluck handles it.

### Tuner
Pick a tuning from the dropdown. Strings are listed low (string 6, thick) to high (string 1, thin), like looking down at your own guitar. Click a string, let it ring, and tune your string to match. The "Simple tone" sound preset is often easiest to tune against; switch sounds in the helper bar up top.

### Tab Player
Paste a tab in this shape:

```
e|----------------|
B|----------------|
G|----------------|
D|--------2-------|
A|----2-3---3-2---|
E|--0-------------|
```

Press **Play**. Each character column is one **sixteenth note** at the current BPM, so `--0---2-` plays two notes half a beat apart at the dashes' spacing. Notes stacked in the same column play together as a chord.

## How the tab parser works

The parser (see `parseTab()` in `app.js`) does this:

1. **Filter lines.** Blank lines and non-tab text are dropped; exactly 6 tab lines must remain or you get a friendly error.
2. **Strip labels.** Optional string labels (`e|`, `B|`, `E |`) and the opening pipe are removed so all lines start at the same musical position.
3. **Pad.** All lines are padded with dashes to equal length so column indexes line up.
4. **Scan columns.** For each character column, every line is checked. A digit becomes a note; if the *next* character on that line is also a digit, both are read as one two-digit fret (`10`, `12`) and the second digit is marked consumed.
5. **Map to pitch.** The top tab line is your *highest* string. Pitch = (open-string MIDI note in the selected tuning) + fret. Frequency = `440 × 2^((midi − 69) / 12)`.
6. **Chords.** All notes found in the same column are scheduled at the same time.

### Supported tab format

- Six lines, one per string, high string on top
- String labels optional (`e|...` or just `|...` or bare dashes)
- Single- and double-digit frets (0–24)
- Dashes as rests, pipes as visual bar lines (ignored for timing)
- Blank lines around the tab are fine

### Not supported yet

Technique symbols — `h` (hammer-on), `p` (pull-off), `b` (bend), `r` (release), `/` and `\` (slides), `~` (vibrato), `x` (mute) — are **skipped safely**. The fret numbers around them still play as plain notes, and the app shows a one-line notice so you know why it sounds literal. Also not yet supported: multi-section tabs (paste one 6-line block at a time), timing notation, tuplets, and 7-string tabs.

## How the sound works

All audio is generated live with the Web Audio API — there are no sample files.

- **Clean pluck / Acoustic pluck** use *Karplus–Strong* synthesis: a buffer is filled with a burst of noise, then repeatedly averaged with itself at the period of the target pitch. The noise decays into a convincing plucked string. The acoustic preset low-passes the initial burst (warmer attack) and rings longer.
- **Simple tone** is a plain sine wave — the easiest thing to tune against.
- **Muted practice** is a fast-decaying triangle wave, like a palm-muted note, for quiet practice.

Synthesized notes are cached per pitch, so repeated notes are free.

## Customizing the code

Everything lives in `app.js`, organized under numbered banner comments.

**Add a tuning:** add an object to `BUILTIN_TUNINGS`. Strings are low-to-high MIDI numbers (E2 = 40, A2 = 45, D3 = 50, G3 = 55, B3 = 59, E4 = 64; one fret = +1).

```js
{ id: "opene", name: "Open E (E B E G# B e)",
  midi: [40, 47, 52, 56, 59, 64],
  blurb: "Open D shapes, a whole step up. Big slide-guitar sound." },
```

**Add a chord:** add to `CHORDS`. Frets run low string to high string; `"x"` = don't play.

```js
{ name: "Dm", frets: ["x", "x", 0, 2, 3, 1] },
```

**Tweak a sound:** in `playNote()`, the Karplus–Strong presets take `damping` (closer to 1 = longer sustain) and `brightness` (0–1, lower = warmer attack).

**Change tab timing:** in `playTab()`, `stepSec = (60 / bpm) / 4` makes each column a sixteenth. Change `/ 4` to `/ 2` for eighth-note columns.

**Colors and fonts:** every color is a CSS variable at the top of `styles.css`.

## localStorage keys

| Key | Contents |
|---|---|
| `fretkit.prefs` | Toggles, sound preset, BPM, left-handed mode |
| `fretkit.customTunings` | Your saved tunings |
| `fretkit.savedTabs` | Your saved tabs |

Export a JSON backup from the Library before clearing browser data — localStorage is per-browser, per-device.

## Roadmap ideas

- Microphone-based tuner (pitch detection via `getUserMedia` + autocorrelation)
- Hammer-ons/pull-offs/slides in the tab player
- Multi-section tabs and repeat markers
- Movable/barre chord shapes and chords in alternate tunings
- Service worker for full installable-offline (PWA) support
