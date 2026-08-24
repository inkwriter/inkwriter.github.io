# Pixel Synth Studio

A retro chiptune + lofi loop maker that runs entirely in your browser. All sounds are generated live with the Web Audio API — no samples, no backend, no build tools, no installs.

## Files

- `index.html` — the app shell and all UI controls
- `styles.css` — the retro console-inspired styling
- `app.js` — audio engine, instruments, sequencer, effects, export/save

## Open it locally

Just open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari). Double-clicking the file works — no server needed. If your browser is strict about local files, run a tiny server from the project folder instead:

```
python -m http.server 8000
```

Then visit `http://localhost:8000`.

Note: browsers require a click before audio can start, so press **PLAY** (or click a note) to wake the audio engine.

## Host it on GitHub Pages

1. Create a new repository on GitHub and push these three files (plus this README) to the root of the `main` branch.
2. In the repo, go to **Settings → Pages**.
3. Under **Source**, choose **Deploy from a branch**, pick `main` and the `/ (root)` folder, and save.
4. After a minute, your app is live at `https://<username>.github.io/<repo-name>/`.

## Using the sequencer

- **Tracks** (left panel): click a track to select it — the piano roll and instrument panel always edit the selected track. Each track has an instrument dropdown, **M**ute, **S**olo, **C**lear, and a volume slider.
- **Piano roll**: click an empty cell to add a note; click a note to remove it. The **NOTE LEN** dropdown sets how many steps new notes last. Click a row label to preview that pitch. Scale notes are tinted; the root note is highlighted green.
- **Drum tracks**: a track using the *8-bit Drum Kit* shows four rows — Hi-hat, Snare, Kick, and Noise.
- **Transport**: PLAY/STOP (or press Space), BPM, and loop length (4/8/16/32 steps).
- **Helpers**: pick a KEY and SCALE, then use *Snap to scale* to pull stray notes in tune, or generate a *Random melody / bassline / drums* to get started fast. *Duplicate loop* doubles the loop length and copies your pattern into the new half so you can add variation.
- **Instrument panel**: waveform, pulse width, octave, ADSR envelope, vibrato, pitch bend, and the arpeggiator (the classic chiptune "fake chord" effect).
- **Effects panel**: reverb, delay, low-pass filter, bitcrusher, tape wobble, vinyl noise, saturation, and master volume — or press **MAKE IT LOFI** for an instant warm preset.

## Exporting audio

Click **Export WAV** to render one pass of your loop (plus a short effects tail) to a 16-bit stereo WAV file. WAV is used instead of MP3 because MP3 encoding isn't built into browsers and would require an external library — WAV is lossless and imports cleanly into any DAW or video editor, where you can convert it if needed.

## Saving and loading projects

- **Save project (JSON)** downloads your whole song — notes, instruments, effects, BPM — as a small JSON file.
- **Load project** opens a saved JSON file and restores everything.
- **Copy project data** puts the JSON on your clipboard, handy for pasting into a note or sharing.

Projects are plain JSON, so they're easy to inspect, back up, or version-control.

## Extending it

The code in `app.js` is split into commented sections (audio engine, instruments, sequencer, helpers, UI, export). Some easy first mods:

- Add a preset: add an entry to `PRESETS` and it appears in every instrument dropdown.
- Add a scale: add a semitone list to `SCALES` and an `<option>` in `index.html`.
- Change the drum sounds: tweak the frequencies and decay times in `playKick`, `playSnare`, and `playHat`.

All sounds are original synthesized tones — no copyrighted samples, music, or branding are used or included.
