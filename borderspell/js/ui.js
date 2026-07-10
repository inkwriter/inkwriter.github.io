// ============================================================
// ui.js — Draws the screen from State.game
//
// This module only READS game state and renders it. It never
// changes the rules — clicks are forwarded to app.js handlers.
// ============================================================

const UI = {
  message: "",        // one-line hint / "why was that invalid" text
  messageTimer: null,

  // Re-render everything. Called after every action.
  render() {
    const g = State.game;
    this.renderHeader();
    this.renderMap();
    this.renderTerritoryPanel();
    this.renderHand();
    this.renderLogs();
    this.renderBattle();
    this.renderGameOver();
    Debug.render();
  },

  // Show a short hint (e.g. why an action was invalid).
  flash(text) {
    this.message = text;
    const el = document.getElementById("action-message");
    el.textContent = text;
    el.classList.add("visible");
    clearTimeout(this.messageTimer);
    this.messageTimer = setTimeout(() => el.classList.remove("visible"), 4000);
  },

  // ---------- Header ----------
  renderHeader() {
    const g = State.game;
    const strip = document.getElementById("player-strip");
    strip.innerHTML = g.playerOrder.map(pid => {
      const p = State.getPlayer(pid);
      const active = pid === g.currentPlayerId ? "active" : "";
      return `
        <div class="player-chip ${active}" style="--player-color:${p.color}">
          <span class="chip-dot"></span>
          <span class="chip-name">${p.name}</span>
          <span class="chip-stat" title="Power">⚡${p.power}</span>
          <span class="chip-stat" title="Deck / Hand / Discard">🂠${p.deck.length}·✋${p.hand.length}·🗑${p.discard.length}</span>
          <span class="chip-stat" title="Territories">⬢${State.territoriesOwnedBy(pid).length}</span>
        </div>`;
    }).join("");

    const phaseNames = {
      reinforce: `Reinforce — place ${g.reinforcementsLeft} troop${g.reinforcementsLeft === 1 ? "" : "s"}`,
      attack: `Attack — ${State.currentPlayer().attacksLeft} attack${State.currentPlayer().attacksLeft === 1 ? "" : "s"} left`,
      gameover: "Game over"
    };
    document.getElementById("phase-display").textContent =
      `Turn ${g.turnNumber} · ${phaseNames[g.phase] || g.phase}`;

    // Phase buttons
    document.getElementById("btn-skip-reinforce").style.display =
      g.phase === "reinforce" ? "" : "none";
    document.getElementById("btn-end-turn").style.display =
      g.phase === "attack" ? "" : "none";
  },

  // ---------- Map ----------
  renderMap() {
    const g = State.game;
    const mapEl = document.getElementById("map");
    const svg = document.getElementById("map-links");

    // Draw each connection once (a < b avoids duplicates).
    const lines = [];
    Object.values(g.territories).forEach(t => {
      t.neighbors.forEach(nId => {
        if (t.id < nId) {
          const n = g.territories[nId];
          lines.push(`<line x1="${t.x}" y1="${t.y}" x2="${n.x}" y2="${n.y}" />`);
        }
      });
    });
    svg.innerHTML = lines.join("");

    // Territory tiles
    const tilesEl = document.getElementById("map-tiles");
    tilesEl.innerHTML = Object.values(g.territories).map(t => {
      const typeInfo = Bonuses.typeInfo(t.type);
      const ownerColor = t.owner === "neutral"
        ? GAME_CONFIG.neutral.color
        : State.getPlayer(t.owner).color;

      const classes = ["territory"];
      if (t.id === g.selectedTerritoryId) classes.push("selected");
      if (t.id === g.attackFromId && g.phase === "attack") classes.push("attack-origin");
      if (g.phase === "attack" && g.attackFromId &&
          GameMap.areNeighbors(g.attackFromId, t.id) && t.owner !== g.currentPlayerId) {
        classes.push("attack-target");
      }
      if (t.capital) classes.push("capital");

      return `
        <button class="${classes.join(" ")}" data-territory="${t.id}"
                style="left:${t.x}%; top:${t.y}%; --owner-color:${ownerColor}; --type-color:${typeInfo.color}">
          <span class="terr-type">${typeInfo.label}${t.capital ? " ★" : ""}</span>
          <span class="terr-name">${t.name}</span>
          <span class="terr-troops">${t.troops}</span>
        </button>`;
    }).join("");
  },

  // ---------- Selected territory details ----------
  renderTerritoryPanel() {
    const g = State.game;
    const el = document.getElementById("territory-panel");
    const t = g.selectedTerritoryId ? State.getTerritory(g.selectedTerritoryId) : null;

    if (!t) {
      el.innerHTML = `<p class="muted">Click a territory to inspect it.</p>`;
      return;
    }
    const typeInfo = Bonuses.typeInfo(t.type);
    const terrainNotes = [];
    if (typeInfo.terrain.defenderBonus) terrainNotes.push(`Defender +${typeInfo.terrain.defenderBonus}`);
    if (typeInfo.terrain.tagBonus) terrainNotes.push(`"${typeInfo.terrain.tagBonus.tag}" cards +${typeInfo.terrain.tagBonus.amount}`);
    if (typeInfo.terrain.cardTypeBonus) terrainNotes.push(`${typeInfo.terrain.cardTypeBonus.cardType} cards +${typeInfo.terrain.cardTypeBonus.amount}`);

    el.innerHTML = `
      <h3>${t.name}${t.capital ? " ★ Capital" : ""}</h3>
      <table class="detail-table">
        <tr><td>Type</td><td>${typeInfo.label}</td></tr>
        <tr><td>Owner</td><td>${State.playerName(t.owner)}</td></tr>
        <tr><td>Troops</td><td>${t.troops}</td></tr>
        <tr><td>Income</td><td>${Bonuses.territoryIncome(t)} Power/turn</td></tr>
        <tr><td>Terrain</td><td>${terrainNotes.join("; ") || "No bonus"}</td></tr>
        <tr><td>Borders</td><td>${t.neighbors.map(id => State.getTerritory(id).name).join(", ")}</td></tr>
      </table>`;
  },

  // ---------- Hand ----------
  renderHand() {
    const g = State.game;
    const el = document.getElementById("hand");
    const player = State.currentPlayer();
    const inBattlePick = Battle.activeSideRole() !== null;

    document.getElementById("hand-title").textContent =
      `${player.name}'s hand ${inBattlePick ? "" : "(cards are played during battles)"}`;

    el.innerHTML = player.hand.map(inst =>
      this.cardHTML(inst, State.cardDef(inst.cardId), { pickable: false })
    ).join("") || `<p class="muted">No cards in hand.</p>`;
  },

  // One card's HTML. Used for both the bottom hand and battle picks.
  cardHTML(instance, def, opts) {
    const typeInfo = def.requiredTerritoryType ? Bonuses.typeInfo(def.requiredTerritoryType) : null;
    const classes = ["card", `card-${def.type}`];
    if (opts.picked) classes.push("picked");
    if (opts.disabled) classes.push("disabled");

    return `
      <div class="${classes.join(" ")}" data-card="${instance.iid}"
           ${opts.disabledReason ? `title="${opts.disabledReason}"` : ""}
           ${typeInfo ? `style="--card-accent:${typeInfo.color}"` : ""}>
        <div class="card-top">
          <span class="card-cost">${def.cost}</span>
          <span class="card-name">${def.name}</span>
          ${def.type === "unit" ? `<span class="card-power">${def.power}</span>` : ""}
        </div>
        <div class="card-meta">${def.type}${def.requiredTerritoryType ? ` · ${typeInfo.label} T${def.tier}` : ""}</div>
        <div class="card-text">${def.text || ""}</div>
      </div>`;
  },

  // ---------- Logs ----------
  renderLogs() {
    const g = State.game;
    const fmt = entries => entries.slice(-20).map(e =>
      `<div class="log-line"><span class="log-turn">T${e.turn}</span>${e.message}</div>`
    ).join("") || `<p class="muted">Nothing yet.</p>`;

    const turnEl = document.getElementById("turn-log");
    const battleEl = document.getElementById("battle-log");
    turnEl.innerHTML = fmt(g.turnLog);
    battleEl.innerHTML = fmt(g.battleLog);
    turnEl.scrollTop = turnEl.scrollHeight;
    battleEl.scrollTop = battleEl.scrollHeight;
  },

  // ---------- Battle modal ----------
  renderBattle() {
    const g = State.game;
    const overlay = document.getElementById("battle-overlay");
    const b = g.battle;

    if (!b) {
      overlay.classList.remove("open");
      overlay.innerHTML = "";
      return;
    }
    overlay.classList.add("open");

    const from = State.getTerritory(b.fromId);
    const to = State.getTerritory(b.toId);
    const toType = Bonuses.typeInfo(to.type);

    const headline = `
      <div class="battle-headline">
        <div class="battle-side-label" style="--player-color:${this.playerColor(b.attackerId)}">
          ${State.playerName(b.attackerId)} attacks with ${b.committedTroops} troops from ${from.name}
        </div>
        <div class="battle-vs">⚔</div>
        <div class="battle-side-label" style="--player-color:${this.playerColor(b.defenderId)}">
          ${State.playerName(b.defenderId)} defends ${to.name} (${toType.label}) with ${to.troops} troops
        </div>
      </div>`;

    let body = "";
    if (b.stage === "attackerCards" || b.stage === "defenderCards") {
      body = this.battlePickHTML(b);
    } else if (b.stage === "handoff") {
      body = `
        <div class="handoff">
          <p>Attacker's cards are locked in.</p>
          <p><strong>Pass the device to ${State.playerName(b.defenderId)}.</strong></p>
          <button class="btn primary" data-action="begin-defense">I'm the defender — show my hand</button>
        </div>`;
    } else if (b.stage === "resolved") {
      const r = b.result;
      body = `
        <div class="battle-result">
          <div class="result-scores">
            <div class="score-box ${r.attackerWins ? "winner" : ""}">
              <div class="score-num">${r.atkScore}</div>
              <div class="score-detail">${r.breakdown.attacker}</div>
            </div>
            <div class="score-box ${!r.attackerWins ? "winner" : ""}">
              <div class="score-num">${r.defScore}</div>
              <div class="score-detail">${r.breakdown.defender}</div>
            </div>
          </div>
          <div class="result-log">${r.log.map(l => `<div>${l}</div>`).join("")}</div>
          <button class="btn primary" data-action="close-battle">Continue</button>
        </div>`;
    }

    overlay.innerHTML = `<div class="battle-modal">${headline}${body}</div>`;
  },

  battlePickHTML(b) {
    const role = Battle.activeSideRole();
    const playerId = Battle.activePlayerId();
    const player = State.getPlayer(playerId);
    const picks = b.picks[role];
    const to = State.getTerritory(b.toId);

    const spent = picks.reduce((sum, iid) => {
      const inst = player.hand.find(c => c.iid === iid);
      return sum + State.cardDef(inst.cardId).cost;
    }, 0);

    const cards = player.hand.map(inst => {
      const def = State.cardDef(inst.cardId);
      const picked = picks.includes(inst.iid);
      const check = picked ? { ok: true } : Battle.canPick(inst.iid);
      return this.cardHTML(inst, def, {
        pickable: true,
        picked,
        disabled: !check.ok,
        disabledReason: check.reason
      });
    }).join("") || `<p class="muted">No cards in hand — you'll fight with troops alone.</p>`;

    return `
      <div class="battle-pick">
        <p class="pick-instructions">
          <strong>${State.playerName(playerId)}</strong> (${role}): pick up to
          ${GAME_CONFIG.maxCardsPlayedPerBattle} cards.
          Power: ${player.power - spent} unspent · Battlefield: ${Bonuses.typeInfo(to.type).label}.
          Grayed-out cards show why they can't be played.
        </p>
        <div class="battle-hand">${cards}</div>
        <button class="btn primary" data-action="commit-cards">
          Fight with ${picks.length} card${picks.length === 1 ? "" : "s"}
        </button>
      </div>`;
  },

  playerColor(pid) {
    return pid === "neutral" ? GAME_CONFIG.neutral.color : State.getPlayer(pid).color;
  },

  // ---------- Game over banner ----------
  renderGameOver() {
    const g = State.game;
    const el = document.getElementById("gameover-banner");
    if (g.phase !== "gameover") {
      el.classList.remove("open");
      return;
    }
    el.classList.add("open");
    el.innerHTML = `
      <div class="gameover-box">
        <h2>👑 ${State.playerName(g.winnerId)} wins!</h2>
        <p>The enemy capital has fallen.</p>
        <button class="btn primary" data-action="reset">Play again</button>
      </div>`;
  }
};
