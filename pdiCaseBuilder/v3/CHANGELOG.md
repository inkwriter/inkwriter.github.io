# 3.0.1-dev
- Fixed Guided Mode **Not sure** so it skips the current evidence question instead of immediately asking the same question again.
- Added skipped-evidence tracking to the case record.
- Added an inline favicon to avoid a harmless browser favicon 404 on GitHub Pages.
- Added a regression test for skipped evidence.

# Changelog

## 3.0.0-dev — Modular pilot
- Split the Case Builder into core, module, service, style, and data layers.
- Added modular sanitized pattern packs and a manifest loader.
- Added Guided Mode and Technician Mode.
- Added pattern-match explanation and safety guardrails.
- Added structured evidence fields and GT fingerprint logic.
- Added local screenshot compression/storage without a repository screenshot folder.
- Added standardized case reporting and Copy-for-ChatGPT handoff.
- Added local case library archive import/export.
- Added four synthetic team demo cases.
- Added regression-test runner and public-safe QA checks.

## 2.x
- Single-file Case Builder with guided evidence capture, screenshots, local case storage, and reporting.
