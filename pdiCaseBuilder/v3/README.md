# PDI Case Builder v3 — Modular Pilot

PDI Case Builder v3 is a static, GitHub-Pages-friendly troubleshooting application built with plain HTML, CSS, JavaScript ES modules, and JSON pattern packs.

## What v3 adds

- Guided Mode that shows one highest-value troubleshooting step at a time.
- Technician Mode with the full evidence workspace.
- Sanitized known-pattern recognition with visible reasons and safety guardrails.
- Local screenshot capture and compression. Screenshots are **not** stored in the repository.
- Local IndexedDB case library.
- Standardized TXT, JSON, CSV, and printable/PDF case reports.
- Copy-for-ChatGPT handoff that packages the current evidence and pattern signal.
- Synthetic demo cases for team presentations without exposing real store/ticket information.
- Modular pattern packs so new troubleshooting areas can be added without rebuilding the interface.

## Public-safe repository structure

```text
v3/
├── index.html
├── css/
│   └── app.css
├── js/
│   ├── app.js
│   ├── config.js
│   ├── core/
│   ├── modules/
│   └── services/
├── data/
│   ├── patterns/
│   ├── patterns-manifest.json
│   ├── evidence-schema.json
│   ├── demo-cases.json
│   └── pattern-tests.json
├── tests/
├── docs/
├── version.json
├── CHANGELOG.md
└── .gitignore
```

## Privacy boundary

The public v3 folder must contain **sanitized logic only**. Do not commit:

- real ticket numbers or original ticket notes;
- employee/requester names;
- store-specific incident records intended to remain private;
- screenshots;
- internal IP addresses, credentials, or sensitive internal paths;
- the private historical case-to-pattern source map.

Real screenshots and case evidence are held in browser storage for the active technician and only leave the browser when the user deliberately exports/copies them.

## Run locally

Because v3 uses ES modules and JSON fetches, open it through a local HTTP server rather than double-clicking `index.html`.

```bash
python -m http.server 8080
```

Then open:

```text
http://localhost:8080/
```

## GitHub Pages deployment

Keep the current v2 page live and upload this entire folder as `/v3/` in the existing repository. The test URL will then be similar to:

```text
https://inkwriter.github.io/pdiCaseBuilder/v3/
```

Do not replace v2 until v3 has been tested with the synthetic regression suite, historical case replays, and current live cases.

## Update a pattern without redesigning the app

1. Edit the appropriate JSON file in `data/patterns/`.
2. Run the regression tests.
3. Test the changed pattern through the browser.
4. Commit the pattern update and note it in `CHANGELOG.md`.

## Core safety principle

A pattern match suggests **what to inspect next**. It is not authorization to change financial/store data or perform advanced recovery.
