// ============================================================
// Stocked — configuration
// This is the ONLY file you need to edit to go live.
// ============================================================

// 1. Deploy apps-script/Code.gs as a Web App (see README).
// 2. Paste the deployment URL below.
// 3. Set DEMO_MODE to false.

const CONFIG = {
  // Apps Script web app URL, e.g.
  // "https://script.google.com/macros/s/AKfycb.../exec"
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbyBHIRT0v9MWHPH7YZRlaHhloMBJ98KEbbyjbiWKjoLzsQ7LoF_wrbBPZT8qVS2h6Ru/exec",

  // Must match the api_token value in your sheet's Settings tab.
  API_TOKEN: "stk-X8wP3fzxEbB5ZZVRcmhpPaYFuubulfop",

  // true  = runs entirely in the browser with sample data (no Sheet needed)
  // false = reads/writes your Google Sheet through the Apps Script API
  DEMO_MODE: false,
};
