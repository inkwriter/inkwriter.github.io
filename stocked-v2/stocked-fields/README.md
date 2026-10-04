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
├── js/units.js             # unit conversions
├── js/recipe-import.js     # paste-in recipe import
├── js/match.js             # name matching, aliases, autocomplete
├── js/scan.js              # camera barcode scanning + product lookup
├── js/app.js               # app logic, comparison engine, demo data
└── apps-script/Code.gs     # backend — paste into your Sheet's Apps Script
```

## Quick start (demo mode)

Open `index.html` in a browser. The app runs entirely in memory with sample data so you can try every flow — build a list from Tacos + Chili and watch it dedupe onions against the pantry. Nothing persists until you connect a Sheet.

## Going live

### Step 1 — Create the Sheet

1. Create a new Google Sheet (any name, e.g. "Stocked").
2. **Extensions → Apps Script**. Delete the placeholder code and paste in the contents of `apps-script/Code.gs`. Save.
3. In the function dropdown, select **`setupSheet`** and click **Run**. Authorize when prompted (it only touches this spreadsheet). This builds all 10 tabs with headers, default locations, categories, and settings.
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

## v4: three meals a day, use-by dates, unit conversions, recipe import

**Upgrading from v3:** same as before: paste the new `Code.gs`, then **Deploy → Manage deployments → ✏️ → New version**. Copy the frontend files over (two new ones: `js/units.js` and `js/recipe-import.js`) and push. The first request adds two Inventory columns, **Shelf Life Days** (P) and **Conversions** (Q). Existing rows aren't touched.

**Meal plan:** Breakfast, Lunch and Dinner for each day. Recipes whose Meal type matches the slot are listed first. *Leftovers*, *Eating out* and *Fend for yourself* can be planned without needing any ingredients. Unsaved picks survive switching tabs. There's also ‹ › to move between weeks and **Copy last week**.

**Use-by dates:** restocking a perishable (a *Keeps for* setting, an existing date, or Produce/Meat/Dairy) offers quick picks: Usual / 3 days / 1 week / 2 weeks / 1 month / a specific date. This works in the purchase screen, as a "Use-by" button on the quick-add toast, and as a row in the scan tally (so scanning isn't interrupted). The item keeps the *earlier* date while older stock is still around, and it learns "keeps for N days" from what you pick.

**Unit conversions:** kitchen volumes and weights convert automatically (2 cups milk counts against 1 gal). For package units (jar, stick, can, head), the pantry check and "Mark cooked" show **Set conversion**. Answer once ("1 jar = 16 tbsp") and it's saved on the item. Buy amounts round up to whole packages. Volume ↔ weight only converts if you saved a conversion for it.

**Import recipes:** Recipes → **Import**. Paste text in the format below, preview it (ingredients show whether they matched your pantry), and add them all at once. Recipes whose names you already have are unchecked so they aren't added twice.

```
# Taco Soup
meal: dinner | servings: 6 | tags: soup
- 1 lb ground beef
- 1 (15 oz) can black beans, drained
- salt and pepper, to taste
Steps:
1. Brown the beef…
Notes: Freezes well.
```

## v3: quick add, phone scanning, ingredient aliases

**Upgrading from v2 (about 5 minutes):**

1. **Backend first.** Open the Sheet → Extensions → Apps Script. Replace all of `Code.gs` with the new one and save.
   Then **Deploy → Manage deployments → ✏️ (edit) → Version: New version → Deploy**.
   Editing the existing deployment keeps the same `/exec` URL, so `config.js` doesn't change.
   (Choosing *New deployment* instead gives you a new URL you'd have to paste into `config.js`.)
2. **Frontend.** Copy `index.html`, `css/styles.css`, `js/app.js`, plus the two new files `js/match.js` and `js/scan.js` into the repo folder and push. `config.js` is unchanged.
3. Open the app once. The first request upgrades the Sheet by itself: a **Barcodes** column is added to Inventory (column O, formatted as plain text so UPCs keep their leading zeros), and a new **Aliases** tab is created. Existing rows aren't touched.

**Quick add.** Inventory and List both get a type-ahead box and a row of chips for the things you add most (ranked from the ChangeLog). On Inventory, a chip or pick adds 1; on List, it puts the item on the list. Both show an **Undo** toast. Typing a name you don't track offers "+ New item…".

**Scanning.** The Scan button opens the phone's rear camera in the browser (no app; needs the https:// site). Two modes:
- *Restock pantry* — scan groceries as you put them away, each scan adds 1, with a running tally you can ±1.
- *Add to list* — scan the empty before it goes in the trash.

A code you've scanned before is instant. A new code is looked up on Open Food Facts / Open Beauty Facts / Open Products Facts, then you pick which of your items it is (or create one). The code is saved to that item, so it's instant forever after, and several brands' codes can all point at "Milk". Holding the same box in view won't double-count it. If the camera won't start, you can type the digits instead.

**Aliases.** In the recipe editor, every ingredient shows what it's linked to. Unlinked ones get a suggestion ("Is this **Ground beef**?") or a picker. With "Remember my matches" on, your pick is saved as an alias, and every recipe that uses that name matches it from then on, including old recipes. The pantry check also has a **Link** button next to untracked ingredients. You can see and remove aliases (and barcodes) on each item's Edit screen, and removing one undoes it everywhere.

## How the core logic works

**Matching.** An ingredient counts against an inventory item in exactly three ways: its `Linked Item ID`, an exact name match (ignoring case, punctuation and plurals — "Onions" = "Onion"), or an **alias** you confirmed ("hamburger meat" → Ground beef). Anything fuzzier — "Onion" vs "Onion, yellow", "cream" vs "sour cream", common synonyms — is only ever *suggested*. Unmatched ingredients go on the list at full quantity with a "not tracked — verify" note. The system never guesses.

**Comparison.** For each selected recipe, ingredients are aggregated by linked item (or name+unit), summed across recipes, then compared against inventory quantity. `buy = max(0, needed − have)`. Items fall into Need / Partially have / Already have / Optional, shown in a confirmation modal before anything is written.

**Units.** Standard volumes and weights convert automatically. Package units (jar, stick, can) convert through a per-item conversion you confirm once; until then the ingredient is flagged, never guessed.

**Purchasing.** Tapping a list item offers *Purchased + restock* (increments the linked inventory item at its default location), *Purchased only*, or *Skip*. Untracked items offer to be added to inventory with a location picker.

**Cooking.** "Mark cooked" shows exactly what will be deducted (e.g. `Chicken breast 2 → 0 lb`) and requires confirmation. Untracked or unit-mismatched ingredients are listed as "no change" so nothing silently breaks.

**Safety.** Every mutation goes through one Apps Script endpoint that takes a document lock (no two phones clobbering each other), validates the token, and appends a row to the `ChangeLog` tab — your audit trail. Quantities floor at zero. Deletes never happen except "clear purchased," which only removes finished list lines. The Sheet itself remains hand-editable; the app reads whatever's there.

## Edge cases to know about

- **Hand edits are fine** — the app re-reads the whole Sheet on every action. Just keep the header row intact and don't reorder columns.
- **Duplicate names** in inventory: the first match wins for auto-linking. Use distinct names ("Onion, yellow" / "Onion, red").
- **One alias → one item.** Saving an alias that already exists moves it to the new item. The Aliases tab is hand-editable (Alias must be lowercase).
- **One barcode → one item.** Scanning a known code onto a different item moves it.
- **Expiration logic** uses the `expiring_soon_days` setting (default 5) and shows a "Use first" banner plus pills on items.
- **Archived items** keep their rows (and their history in old recipes) but disappear from the app.
- **Apps Script quotas** are generous for household use (20k+ URL fetches/day on a free account; you'll never get close).

## Roadmap ideas (intentionally not in v1)

Unit conversions, per-store section ordering, price columns, substitutions ("use ground turkey when out of ground beef" — deliberately separate from aliases). The schema supports all of them without restructuring.
