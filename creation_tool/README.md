# Vellum — a browser drawing studio for iPhone

Vellum is a mobile-first drawing and painting app that runs entirely in a web
browser. No server, no account, no uploads — every project lives in your device's
own storage. It's built as a single self-contained `index.html` (plus PWA files),
so it deploys to GitHub Pages as-is and also opens straight from `file://`.

This is the **Phase One + layers/PWA** build described in the project brief: a
complete, usable studio with nothing stubbed. See *Feature status* for exactly
what's in and what's planned next.

---

## Quick start

1. Put these files in a folder (keep the structure):

   ```
   index.html
   manifest.json
   service-worker.js
   icons/  (icon-180.png, icon-192.png, icon-512.png, icon-maskable-512.png)
   README.md
   ```

2. Open `index.html` in a browser to try it locally, **or** deploy to the web
   (below). The service worker and "Add to Home Screen" only work over `https://`
   (or `http://localhost`), which is why GitHub Pages is the recommended host.

---

## Deploy to GitHub Pages

1. Create a repository and push these files to the `main` branch (repo root).
2. On GitHub: **Settings → Pages → Build and deployment → Source = "Deploy from a
   branch"**, Branch = `main`, folder = `/ (root)`. Save.
3. Wait for the green check; your app is at
   `https://<your-username>.github.io/<repo-name>/`.

Everything uses **relative paths** (`./index.html`, `service-worker.js`,
`icons/...`), so it works from a project subpath without edits.

---

## Install on an iPhone home screen

1. Open the Pages URL in **Safari** on the iPhone.
2. Tap the **Share** button → **Add to Home Screen** → **Add**.
3. Launch from the new icon. It opens **full-screen (standalone)**, respects the
   notch / Dynamic Island / home-indicator safe areas, and works offline after the
   first load.

Chrome on iOS can also add it via its own menu, but the Home Screen flow is most
reliable in Safari.

---

## How to use it

- **One finger** draws. **Two fingers**: pinch to zoom, drag to pan, twist to
  rotate the canvas. **Two-finger tap = undo**, **three-finger tap = redo**.
  **Double-tap** fits the canvas to the screen. **Press and hold** the canvas to
  pick up a color.
- Left rail = tools (brush, eraser, fill, color-pick). Right rail = size / opacity
  sliders (drag them vertically). Top bar = back, actions (⋯), undo/redo, color,
  layers.
- **Double-tap the brush tool** to open the brush picker and editor.
- Turn on **left-handed mode**, interface scaling, high contrast, and reduced
  motion in **Settings** (gear on the gallery screen).

When a **stylus/Apple Pencil** is detected, touch input is treated as palm and
ignored for drawing (palm rejection). Pressure is read through Pointer Events;
without pressure hardware, stroke weight is simulated from movement speed.

---

## Feature status

**In this build**
- Gallery with IndexedDB persistence: create, open, rename, duplicate, delete
  (with confirmation), thumbnails, dimensions, last-edited, storage usage.
- New-canvas setup: presets (screen, square, portrait, landscape, 1080×1080,
  wallpaper), custom size, solid/transparent background, background color, and a
  memory warning for large canvases.
- Tools: brush, eraser, flood fill, color picker (eyedropper), selection, transform.
- Selection: rectangle, ellipse, freehand lasso, and auto (magic wand) with
  add/subtract combining, invert, feather, and marching-ants outline. Brush,
  eraser, and fill are constrained to the active selection.
- Transform: move / pinch-scale / rotate the layer or just the selected pixels,
  with corner handles, a rotation knob (15-degree detents), flip H/V, uniform or
  freeform scaling, and snap-to-center. Two-finger pinch drives the transform
  directly while it's active.
- Clipping masks: any layer can clip to the alpha of the layer below it
  (layer options > Clip to below).
- Brush engine: 10 presets plus fully custom brushes — size, opacity, flow,
  hardness, spacing, smoothing, taper (min size), pressure→size, pressure→opacity,
  grain texture, pixel/square mode. Create, duplicate, rename, edit, reset,
  favorite.
- Layers: add, duplicate, merge down, clear, delete, drag-to-reorder, visibility,
  opacity, rename, lock, alpha-lock, 10 blend modes, a dedicated background layer,
  and an estimated max-layer count for the canvas.
- Color: saturation/value square + hue slider, RGB, hex, recents, three starter
  palettes, primary/secondary with quick swap, eyedropper.
- Undo / redo: multi-step, memory-aware limit, gesture + button; covers drawing,
  erasing, fill, clear, layer add/delete/duplicate/merge/reorder, flip, rotate,
  and image import.
- Canvas actions: flip H/V, rotate 90°, reset/fit view, rename, canvas info,
  import image as a new layer.
- Export: PNG, transparent PNG, JPEG, WebP with quality, scale, and filename;
  iPhone share sheet via the Web Share API when available, else a download; plus
  "active layer only" export.
- Import an image as a new project, and full project **backup export/restore**
  (`.vellum` JSON).
- Autosave to IndexedDB (after changes and when the app is backgrounded) with a
  Saving / Saved / storage-warning indicator.
- PWA: manifest, service worker, offline app shell, standalone mode, icons,
  safe-area insets, theme color.
- Accessibility: labelled controls, large touch targets, interface scaling, high
  contrast, reduced motion, left-handed layout; the active tool is shown by shape
  and highlight, not color alone.

**Planned for later phases (intentionally not shown as dead buttons)**
Smudge tool; shape tools and quick-shape;
drawing guides and symmetry; text tool; filters/adjustments; time-lapse;
reference-image panel; layer groups; HSL fields and
palette-from-image; crop and background removal; curved text.

---

## Architecture (brief)

**Drawing engine.** Each layer is its own off-screen `<canvas>` at the artwork's
native resolution. A single on-screen canvas *composites* those layers every frame
through a `DOMMatrix` view transform (pan / zoom / rotate), scheduled with
`requestAnimationFrame` and a dirty flag so it only redraws when something changes.
Strokes are drawn by stamping brush "dabs" along the pointer path at a spacing
proportional to brush size; smoothing eases the target point, and pressure (real or
velocity-derived) modulates dab size and alpha. To keep per-stroke opacity honest,
a stroke is stamped onto a separate buffer and composited onto the layer once at the
brush's opacity, rather than letting overlapping dabs pile up. The eraser uses the
same path with `destination-out`.

**Storage.** Projects live in **IndexedDB** (object store keyed by id). A project
record holds metadata, a PNG thumbnail, and each layer serialized as a PNG data
URL. Light preferences (brushes, palette, recent colors, settings) live in
`localStorage`. Autosave is debounced after edits and forced on
`visibilitychange` / `pagehide`. Nothing leaves the device unless you export or
share. Clearing browser/website data will erase saved artwork — use **Export
backup** first.

**Layers.** The layer stack is an ordered array (`layers[0]` = bottom /
background). Compositing walks it bottom-to-top, applying each layer's opacity and
blend mode via `globalCompositeOperation`. Undo/redo uses a command pattern: pixel
operations capture before/after `ImageData`; structural operations (add, delete,
reorder, merge, transforms) store lightweight inverse closures. The history depth
adapts to the canvas size and available memory.

---

## Browser limitations & fallbacks

- **Pressure** needs a stylus and a browser that reports it via Pointer Events; if
  it's missing, weight is simulated from speed.
- **Web Share API** (native share sheet) isn't in every browser — export falls back
  to a normal download.
- **Haptics** (`navigator.vibrate`) are ignored by iOS Safari; they're a no-op
  where unavailable.
- **Service worker / offline / Add to Home Screen** require `https://` (or
  `localhost`); they won't engage over `file://`.
- **Very large canvases** (roughly over ~6 MP) use a lot of memory on phones; the
  app warns you and lowers the undo depth automatically. Prefer sizes around
  2048×2048 or smaller for smooth performance.
- **Private Browsing** can block IndexedDB; the app will say storage is unavailable
  and won't be able to save.
- Everything runs locally with no analytics, tracking, or network calls beyond
  loading the app files themselves.

---

## Notes on testing

The JavaScript is syntax-clean and its logic paths (drawing + history, all layer
operations, canvas flip/rotate, and every settings/tool panel) were exercised in a
headless harness. Canvas *rendering fidelity* and *touch pressure* can only be
judged on a real device — please test drawing, pinch-zoom, rotation, orientation
changes, refresh/reopen, image import, transparent-PNG export, and standalone mode
on an actual iPhone.

## Recent fixes (v2)

- Touch scrolling in the gallery and bottom sheets works on iOS (a global
  `touch-action:none` was blocking it).
- Pinch zoom is now anchored exactly under your fingers, including while
  rotating.
- Strokes no longer stop short of your fingertip: the smoothing tail is
  flushed to the final touch position when you lift.
- Undo history stores only the changed region of each stroke/fill instead of
  two full-canvas snapshots, so big canvases keep a deep undo stack without
  running Safari out of memory.
- Simulated pressure (finger velocity) is zoom-independent now.
- One-finger drag pans the canvas when "finger drawing" is turned off.
- Autosave waits until your fingers are off the canvas.
- Drawing and filling are blocked on hidden layers, and the active layer is
  remembered across sessions.
