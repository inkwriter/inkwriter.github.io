// js/main.js — boot, input, requestAnimationFrame loop.
"use strict";

(function () {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  // Load the sprite atlas, then a save (or start fresh)
  let booted = false;
  Sprites.load(() => {
    if (!Save.load()) Game.newGame();
    booted = true;
  });

  // ---------- Input ----------
  window.addEventListener("keydown", (ev) => {
    const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    // Don't hijack typing in inputs
    if (ev.target.tagName === "INPUT") return;
    Game.keys[k] = true;

    switch (k) {
      case " ": ev.preventDefault(); Player.dodge(); break;
      case "Tab": ev.preventDefault(); Army.toggleRally(); break;
      case "c": Combat.tryCapture(); break;
      case "e": Player.interact(); break;
      case "k": Game.togglePanel("skills"); break;
      case "r": Game.togglePanel("roster"); break;
      case "m": Game.togglePanel("captains"); break;
      case "i": Game.togglePanel("invasion"); break;
      case "l": Game.togglePanel("log"); break;
      case "1": case "2": case "3": case "4":
        Player.castSlot(Number(k) - 1);
        break;
      case "Escape":
        if (Game.openPanel) Game.closePanels();
        else if (G.mode === "invasion") Invasion.abort();
        break;
    }
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(k)) ev.preventDefault();
  });
  window.addEventListener("keyup", (ev) => {
    const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    Game.keys[k] = false;
  });

  // ---------- Mouse aim + attack ----------
  // The Warden faces the cursor at all times (Dragonseal-style).
  // LMB sword (hold to keep swinging), RMB bow, SPACE dodge roll.
  function canvasCoords(ev) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - r.left) * (canvas.width / r.width),
      y: (ev.clientY - r.top) * (canvas.height / r.height)
    };
  }
  canvas.addEventListener("mousemove", (ev) => {
    const c = canvasCoords(ev);
    Game.mouse.x = c.x; Game.mouse.y = c.y; Game.mouse.active = true;
  });
  canvas.addEventListener("mousedown", (ev) => {
    ev.preventDefault();
    if (ev.button === 0) { Game.mouse.down = true; Player.attack(); }
    else if (ev.button === 2) { Player.shoot(); }
  });
  window.addEventListener("mouseup", (ev) => { if (ev.button === 0) Game.mouse.down = false; });
  canvas.addEventListener("contextmenu", (ev) => ev.preventDefault());
  canvas.style.cursor = "none"; // we draw our own crosshair

  // Panel buttons
  document.getElementById("btn-save").onclick = () => Save.save();
  document.getElementById("btn-load").onclick = () => Save.load();
  document.getElementById("btn-reset").onclick = () => Save.reset();
  document.getElementById("btn-start-invasion").onclick = () => Game.startInvasionFromPanel();

  // ---------- Main loop ----------
  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.1) dt = 0.1; // tab-switch guard
    if (booted) {
      Game.update(dt);
      Game.draw(ctx, canvas);
    } else {
      ctx.fillStyle = "#0c1410"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#e7dcbf"; ctx.font = "14px monospace";
      ctx.fillText("Loading the Thornwood...", 20, 30);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
