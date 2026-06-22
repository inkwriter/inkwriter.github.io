# Family Meal Planner
### Plain HTML/CSS/JS — no frameworks, no build step

---

## File Structure

```
meal-planner/
├── index.html    — structure only, no logic
├── style.css     — all visual styles
├── config.js     — ⭐ YOUR SETUP FILE (Sheet ID goes here)
├── data.js       — default recipes and constants
├── storage.js    — localStorage + Google Sheets sync
├── app.js        — Plan, Recipes, Pantry, Grocery tabs
├── editor.js     — Editor mode (manage data like a CMS)
└── main.js       — boots the app
```

---

## Running Locally

Just open `index.html` in any browser. No server needed.

---

## Hosting on Your Portfolio Site

Drop all 7 files into a folder on your server (e.g. `/meals/`).
The app will be live at `yoursite.com/meals/`.

If you use GitHub Pages, push the folder and enable Pages in repo settings.
The app will be at `yourusername.github.io/meal-planner/`.

---

## Connecting Google Sheets (One-Time Setup)

This is how you and Katelyn can manage recipes and pantry from any device.

### Step 1 — Create the Google Sheet

Create a new Google Sheet with **3 tabs** named exactly:
- `Recipes`
- `Pantry`
- `Settings`

---

### Step 2 — Set up each tab

#### Recipes tab
| id | name | tags | ingredients |
|----|------|------|-------------|
| r1 | Spaghetti & Meat Sauce | dinner | ground beef:1:lb\|spaghetti:1:lb\|pasta sauce:1:jar |
| r2 | Tacos | dinner, quick | ground beef:1.5:lb\|taco shells:1:box\|taco seasoning:1:packet |

- **id** — any unique text (r1, r2, etc.)
- **tags** — comma separated: `dinner, quick`
- **ingredients** — pipe-separated triplets of `name:qty:unit`
  - Example: `eggs:6:ct|bread:4:slices|butter:1:tbsp`
  - Units: ct, lb, oz, cup, bag, box, can, jar, gallon, tbsp, tsp, slices, packet, loaf, head

#### Pantry tab
| id | name | qty | unit | category |
|----|------|-----|------|----------|
| p1 | rice | 2 | cup | Grains |
| p2 | pasta sauce | 3 | can | Canned/Dry |

- **category** options: Produce, Meat, Dairy, Grains, Canned/Dry, Frozen, Snacks, Household, Other

#### Settings tab
| key | value |
|-----|-------|
| familyName | Sexton |
| familySize | 5 |
| groceryBudget | 175 |
| primaryStore | Walmart |

---

### Step 3 — Publish the Sheet

1. In Google Sheets: **File → Share → Publish to web**
2. Click **Publish** (publish the entire document)
3. Close that dialog — you don't need the link it gives you

---

### Step 4 — Get your Sheet ID

Look at the URL of your sheet:
```
https://docs.google.com/spreadsheets/d/ →COPY THIS PART← /edit
```

It's the long string of letters and numbers between `/d/` and `/edit`.

---

### Step 5 — Paste it into config.js

Open `config.js` and paste your Sheet ID:

```js
const CONFIG = {
  SHEET_ID: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",  // ← your ID here
  ...
};
```

Save the file and reload the app. You'll see **"✓ synced"** in the header
when it successfully pulls from your sheet.

---

## How Sync Works

- App loads local data instantly (fast, works offline)
- Then fetches fresh data from Sheets in the background
- If Sheets is unreachable (no internet, etc.) it falls back to cached data
- Cache refreshes every 30 minutes by default (change `CACHE_MINUTES` in config.js)
- Set `ALWAYS_REFRESH: true` to force a fresh fetch every load

**What syncs from Sheets:** Recipes, Pantry, Settings  
**What stays local:** Weekly plan, grocery check state, manually added grocery items

---

## Adding a New Editor Module

Open `editor.js`. At the top you'll see `EDITOR_MODULES = [...]`.
Copy any existing module entry and modify it. The editor builds its UI
automatically from the `fields` array — you don't need to write any
table or form code.

---

## Ingredient Format Quick Reference

```
name:qty:unit|name:qty:unit|name:qty:unit
```

Examples:
```
eggs:6:ct|bread:4:slices|butter:1:tbsp
ground beef:1.5:lb|taco shells:1:box|cheese:1:bag
chicken breast:2:lb|rice:2:cup|broth:2:cup
```
