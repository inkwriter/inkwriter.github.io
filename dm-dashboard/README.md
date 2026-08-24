# DM Dashboard — Phase One

A static, mobile-friendly Dungeon Master dashboard for D&D 5e. No server, no build step, no accounts. Works on GitHub Pages and directly from a local folder (double-click `index.html`).

## What's included (Phase One)

| Module | Status |
|---|---|
| Dashboard navigation | ✅ |
| Character Studio (random generator with field locks, guided creator, saved characters, standard + simplified sheets with Basic/Beginner/Young Player detail levels, edit/duplicate/delete, JSON import/export, copy) | ✅ |
| NPC Generator (per-field reroll, save/edit/copy/delete) | ✅ |
| Dice Roller (quick dice, custom expressions, advantage/disadvantage, secret DM rolls, history) | ✅ |
| Initiative Tracker (HP, AC, conditions, concentration, sides, round counter, survives page refresh) | ✅ |
| Session Notes (autosave, search, tags, copy/download/export/import) | ✅ |
| D&D Reference links | ✅ |
| Full backup export / import / reset | ✅ |
| Content Editor — Paste-a-List → JSON, validation, merge, JS-constant fallback | ✅ |
| Encounter / Loot / Tavern / Shop / Rule Lookup | Phase Two |
| Monster Generator / Spell Lookup / Structured Record Editor / DM Screen | Phase Three |

## Hosting on GitHub Pages

1. Create a repository and upload this whole folder.
2. Settings → Pages → deploy from the main branch, root folder.
3. Visit the published URL. Done.

## How data works

- **Built-in defaults** live in `js/data.js` so the app always works — even from `file://` where browsers block loading local JSON.
- **Your JSON files** in `/data/generators/` override the matching category when hosted on GitHub Pages. Missing files are ignored gracefully.
- **Your saved stuff** (characters, NPCs, notes, combat) lives in the browser's LocalStorage. Use **Settings → Export Full Backup** regularly.

## Editing content

Open `editor.html`, pick a category, paste a list (newlines, commas, semicolons, or tabs all work), press **Process List**, then **Download**. The editor tells you the exact filename and folder. Commit the file to your repo and refresh the site.

## Character level range

The generator supports levels 1–5 in this version. Extending the class tables in `js/data.js` (features and `SLOTS`) raises the cap.
