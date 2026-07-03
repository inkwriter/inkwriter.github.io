# Stocked

Household inventory, recipes, and inventory-aware shopping lists. A static site (host it free on GitHub Pages) backed by a Google Sheet through a Google Apps Script web app.

```
GitHub Pages (HTML/CSS/JS)  →  fetch()  →  Apps Script Web App  →  Google Sheet
```

No server, no database, no monthly bill. The Sheet is the database; the Apps Script is the API.

## Files

```
stocked/
├── index.html              # app shell
├── css/styles.css          # all styling
├── js/config.js            # ← the only file you edit to go live
├── js/app.js               # app logic, comparison engine, demo data
└── apps-script/Code.gs     # backend — paste into your Sheet's Apps Script
```

## Quick start (demo mode)

Open `index.html` in a browser. The app runs entirely in memory with sample data so you can try every flow — build a list from Tacos + Chili and watch it dedupe onions against the pantry. Nothing persists until you connect a Sheet.

## Going live

### Step 1 — Create the Sheet

1. Create a new Google Sheet (any name, e.g. "Stocked").
2. **Extensions → Apps Script**. Delete the placeholder code and paste in the contents of `apps-script/Code.gs`. Save.
3. In the function dropdown, select **`setupSheet`** and click **Run**. Authorize when prompted (it only touches this spreadsheet). This builds all 9 tabs with headers, default locations, categories, and settings.
4. Go back to the Sheet, open the **Settings** tab, and change `api_token` from `change-me` to a random string (a long passphrase is fine).

### Step 2 — Deploy the web app

1. In the Apps Script editor: **Deploy → New deployment**.
2. Type: **Web app**.
3. Execute as: **Me**. Who has access: **Anyone**.
   > "Anyone" sounds scary, but every request still requires your `api_token` — without it the script returns `Bad token` and reads nothing. This is the standard pattern for personal Apps Script APIs.
4. Click **Deploy** and copy the URL ending in `/exec`.

### Step 3 — Connect the site

Edit `js/config.js`:

```js
SCRIPT_URL: "https://script.google.com/macros/s/.../exec",
API_TOKEN: "your-random-token",
DEMO_MODE: false,
```

### Step 4 — Host on GitHub Pages

Since your portfolio is already on `username.github.io`, the simplest route is a project subfolder:

```bash
# inside your existing pages repo
mkdir stocked
cp -r index.html css js stocked/
git add . && git commit -m "Add Stocked" && git push
```

It'll be live at `https://username.github.io/stocked/`. (A separate repo with Pages enabled works the same way.)

> **Note on the token:** it lives in `config.js`, which is public on GitHub Pages. For a household app the worst case is someone who finds both the URL and token can edit your grocery list — acceptable for v1. If you want it tighter later: private repo + Cloudflare Pages, or move the token into a login prompt stored in localStorage.

### Step 5 (optional) — Daily low-stock check

In the Apps Script editor: **Triggers → Add Trigger** → function `lowStockDaily`, time-driven, day timer (e.g. 6–7am). Staples below their minimum get added to the list automatically overnight. Otherwise the **Check staples** button does the same thing on demand.


## Meal Plan tab

This build adds a dinner-only **Meal Plan** tab. Pick a week start date, choose one saved recipe for dinner Monday through Sunday, then click **Build list from week**. Stocked reuses the same inventory comparison engine as the Recipes tab, so it combines duplicate ingredients, checks what you already have, flags unit mismatches, and writes only the missing items to the ShoppingList tab with `sourceType = meal_plan` and `What It's For = Meal plan: ...`.

Click **Save week** to write the selected dinners to the `MealPlan` tab in Google Sheets. Existing dinner rows for that week are replaced, which keeps each week clean and avoids duplicate planned meals.

## How the core logic works

**Matching.** Recipe ingredients match inventory through the `Linked Item ID` column. When you add a recipe in the app, ingredients are auto-linked by name match against inventory (exact or "Onion" → "Onion, yellow"). Unlinked ingredients always go on the list at full quantity with a "not tracked — verify" note — the system never guesses.

**Comparison.** For each selected recipe, ingredients are aggregated by linked item (or name+unit), summed across recipes, then compared against inventory quantity. `buy = max(0, needed − have)`. Items fall into Need / Partially have / Already have / Optional, shown in a confirmation modal before anything is written.

**Units.** v1 compares quantities only when units match (case-insensitive). A recipe needing `1 tbsp` cumin against a jar tracked as `1 jar` gets flagged "units differ — check shelf" rather than doing fake math. A conversion table is a clean v2 feature.

**Purchasing.** Tapping a list item offers *Purchased + restock* (increments the linked inventory item at its default location), *Purchased only*, or *Skip*. Untracked items offer to be added to inventory with a location picker.

**Cooking.** "Mark cooked" shows exactly what will be deducted (e.g. `Chicken breast 2 → 0 lb`) and requires confirmation. Untracked or unit-mismatched ingredients are listed as "no change" so nothing silently breaks.

**Safety.** Every mutation goes through one Apps Script endpoint that takes a document lock (no two phones clobbering each other), validates the token, and appends a row to the `ChangeLog` tab — your audit trail. Quantities floor at zero. Deletes never happen except "clear purchased," which only removes finished list lines. The Sheet itself remains hand-editable; the app reads whatever's there.

## Edge cases to know about

- **Hand edits are fine** — the app re-reads the whole Sheet on every action. Just keep the header row intact and don't reorder columns.
- **Duplicate names** in inventory: the first match wins for auto-linking. Use distinct names ("Onion, yellow" / "Onion, red").
- **Expiration logic** uses the `expiring_soon_days` setting (default 5) and shows a "Use first" banner plus pills on items.
- **Archived items** keep their rows (and their history in old recipes) but disappear from the app.
- **Apps Script quotas** are generous for household use (20k+ URL fetches/day on a free account; you'll never get close).

## Roadmap ideas (intentionally not in v1)

Meal-plan tab UI (the tab and schema already exist), unit conversions, per-store section ordering, barcode entry, price columns. The schema supports all of them without restructuring.
