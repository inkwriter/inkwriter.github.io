# Stocked — friend's household setup (trial on Jake's account)

This folder is Stocked v4.1, ready for a second household. It has its own
API token already filled in on both ends:

- `js/config.js` → `API_TOKEN`
- `apps-script/Code.gs` → `setupSheet()` writes the same token into the Settings tab

So you never type the token by hand. The only blanks are marked below.

Their Sheet is already created in your Drive: **Stocked – Friend Household**
https://docs.google.com/spreadsheets/d/1eAykcwk4eoN5oxImgrhbMWd3LjVyN4LWvFDnp8qIrs0/edit

---

## 1. Backend (about 10 min)

1. Open **Stocked – Friend Household**. Rename it to their name if you like.
2. **Extensions → Apps Script.** Delete the placeholder code, paste all of
   `apps-script/Code.gs` from THIS folder (not your own copy — this one has
   their token). Save.
3. Function dropdown → **setupSheet** → **Run**. Approve the permissions.
   All 10 tabs appear. Check Settings: `api_token` should start `stk-X8wP…`.
4. **Deploy → New deployment** → gear → **Web app**.
   Execute as: **Me**. Who has access: **Anyone**. Deploy.
5. Copy the **/exec URL**.
6. Optional: Triggers → Add Trigger → `lowStockDaily`, time-driven, day timer.

## 2. Fill in the blanks

| File | Blank | Put in |
|---|---|---|
| `js/config.js` | `PASTE_YOUR_EXEC_URL_HERE` | the /exec URL from step 1.5 |
| `index.html` (line 6) | `FRIEND_NAME` | their family name (browser tab title only) |

## 3. Website (about 5 min)

1. Rename the folder if you want a nicer URL (e.g. `stocked-smith`).
2. Put it in your `inkwriter.github.io` repo, next to `stocked-v2/`, and push.
3. Wait for the Pages deploy to go green in **Actions**
   (if it says "Deployment failed", re-run the job).
4. Open `https://inkwriter.github.io/<folder-name>/` — it should say
   **Synced to Sheet** and show an empty inventory.
5. Send them the link. On their phones: Share → **Add to Home Screen**.

## 4. Tell them

- Their data lives in your Google Drive during the trial and you can see it.
- Barcode scanning needs camera permission the first time.

## Updating later

Each release: paste the new `Code.gs` into **both** Apps Scripts → Deploy →
Manage deployments → edit → **New version**. Then copy the new website files
into both folders **except `js/config.js`** (each household keeps its own), bump
`?v=` in both `index.html` files, and push once.

## Moving it to their account after the trial

1. Share the Sheet with them (Viewer).
2. They do **File → Make a copy** (Apps Script and data come along).
3. In their copy: Extensions → Apps Script → Deploy → New deployment
   (Web app, Me, Anyone) → they send you the /exec URL.
4. You swap only `SCRIPT_URL` in their `config.js` and push. Token stays the same.
5. Confirm **Synced to Sheet**, then delete your trial copy.
