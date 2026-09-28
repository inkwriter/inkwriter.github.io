/* ============================================================
   UI.JS — HUD + all menu panels.
   Panels: title, class select, subclass, inventory, skill tree,
   shop, world map (travel), captain dialog, pause, death, victory.
   ============================================================ */

const UI = {
  el: {},

  init() {
    const ids = ['hud', 'hp-fill', 'hp-text', 'shield-fill', 'xp-fill', 'lvl-text',
      'gold-text', 'pot-text', 'class-text', 'quest-text', 'zone-text', 'seals',
      'ability-bar', 'dodge-slot', 'dodge-cd', 'boss-bar', 'boss-fill', 'boss-name',
      'overlay', 'toasts', 'interact-hint', 'damage-flash'];
    for (const id of ids) this.el[id.replace(/-(\w)/g, (m, c) => c.toUpperCase())] = document.getElementById(id);
    this.el.overlay.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      this.handleAction(btn.dataset.act, btn.dataset);
    });
  },

  handleAction(act, d) {
    const p = G.player;
    switch (act) {
      case 'new': this.showClassSelect(); break;
      case 'continue': continueGame(); break;
      case 'pickclass': startNewGame(d.id); break;
      case 'picksub': chooseSubclass(p, d.id); this.closeOverlay(); break;
      case 'close': this.closeOverlay(); break;
      case 'resume': this.closeOverlay(); break;
      case 'save': saveGame(); this.toast('Game saved!', '#7ec850'); break;
      case 'quit': saveGame(); location.reload(); break;
      case 'respawn': respawnPlayer(); break;
      case 'newgameplus': clearSave(); location.reload(); break;
      case 'equip': this.equipItem(parseInt(d.idx)); break;
      case 'sell': this.sellItem(parseInt(d.idx)); break;
      case 'unequip': this.unequipSlot(d.slot); break;
      case 'node': this.buyNode(d.id); break;
      case 'buypotion': this.buyPotion(); break;
      case 'buyitem': this.buyShopItem(); break;
      case 'reroll': this.rerollShop(); break;
      case 'travel': this.closeOverlay(); enterZone(d.id); break;
    }
  },

  show(name, html) {
    G.overlay = name;
    G.mouseDown = false;
    this.el.overlay.innerHTML = html;
    this.el.overlay.classList.remove('hidden');
  },
  closeOverlay() {
    if (G.state !== 'playing') return;
    G.overlay = null;
    this.el.overlay.classList.add('hidden');
    this.el.overlay.innerHTML = '';
  },

  /* ---------- Title / class / subclass ---------- */
  showTitle(save) {
    this.show('title', `
      <div class="panel title-panel">
        <div class="game-title">DRAGONSEAL</div>
        <div class="game-sub">~ An Action RPG of Aldervale ~</div>
        <p class="story">The six dragon seals are failing. Monsters pour from the wilds,
        a fallen guardian gathers relics in the dark, and beneath Dragonspire Peak
        something ancient is waking up. Choose your hero. Restore the seals.</p>
        <button class="btn big" data-act="new">⚔ New Adventure</button>
        ${save ? '<button class="btn big" data-act="continue">▶ Continue</button>' : ''}
        <div class="hint-row">WASD move · mouse aim · click/J attack · Space dodge · 1–5 abilities · E interact</div>
      </div>`);
  },

  showClassSelect() {
    const cards = Object.entries(CLASSES).map(([id, c]) => `
      <div class="class-card">
        <div class="class-icon">${c.icon}</div>
        <div class="class-name">${c.name}</div>
        <div class="class-tag">${c.tagline}</div>
        <div class="class-desc">${c.desc}</div>
        <div class="class-stats">HP ${c.baseHp} · ATK ${c.baseAtk} · SPL ${c.baseSpl}<br>Armor ${c.armor} · Crit ${c.crit}%</div>
        <div class="class-abils">${c.abilities.map(a => ABILITIES[a].name).join(' · ')}</div>
        <button class="btn" data-act="pickclass" data-id="${id}">Choose ${c.name}</button>
      </div>`).join('');
    this.show('classselect', `
      <div class="panel wide">
        <div class="panel-title">Choose Your Class</div>
        <div class="class-row">${cards}</div>
        <div class="hint-row">At level 6 you will choose one of two subclasses.</div>
      </div>`);
  },

  showSubclassSelect() {
    const p = G.player;
    if (!p || p.subclassId) return;
    const subs = CLASSES[p.classId].subclasses;
    const cards = Object.entries(subs).map(([id, s]) => `
      <div class="class-card">
        <div class="class-icon">${s.icon}</div>
        <div class="class-name">${s.name}</div>
        <div class="class-desc">${s.desc}</div>
        <div class="class-stats">Passive: ${s.passive}<br>Ultimate: ${ABILITIES[s.ult].name}</div>
        <button class="btn" data-act="picksub" data-id="${id}">Become ${s.name}</button>
      </div>`).join('');
    this.show('subclass', `
      <div class="panel wide">
        <div class="panel-title">Level 6 — Choose Your Path</div>
        <div class="class-row">${cards}</div>
      </div>`);
  },

  /* ---------- Inventory ---------- */
  showInventory() { this.show('inventory', this.inventoryHtml()); },
  refreshInventory() { if (G.overlay === 'inventory') this.el.overlay.innerHTML = this.inventoryHtml(); },

  itemStatsHtml(it) {
    let h = Object.entries(it.stats).map(([k, v]) => {
      const s = statLabel(k);
      return `<div class="istat">+${v}${s.pct ? '%' : ''} ${s.name}</div>`;
    }).join('');
    if (it.fx) h += `<div class="istat legendary-fx">★ ${it.fx}</div>`;
    return h;
  },

  inventoryHtml() {
    const p = G.player;
    const equipped = GEAR_SLOTS.map(slot => {
      const it = p.equipment[slot];
      if (!it) return `<div class="equip-slot empty"><span class="slot-name">${slot}</span><span class="dim">— empty —</span></div>`;
      return `<div class="equip-slot" style="border-color:${rarityData(it.rarity).color}">
        <span class="slot-name">${slot}</span>
        <span class="iname" style="color:${rarityData(it.rarity).color}">${it.name}</span>
        ${this.itemStatsHtml(it)}
        <button class="btn tiny" data-act="unequip" data-slot="${slot}">Unequip</button>
      </div>`;
    }).join('');
    const bag = p.inventory.length ? p.inventory.map((it, i) => `
      <div class="bag-item" style="border-color:${rarityData(it.rarity).color}">
        <div class="iname" style="color:${rarityData(it.rarity).color}">${it.name}</div>
        <div class="dim">${rarityData(it.rarity).name} ${it.slot} · ilvl ${it.ilvl}</div>
        ${this.itemStatsHtml(it)}
        ${this.compareHtml(it)}
        <div class="row">
          <button class="btn tiny" data-act="equip" data-idx="${i}">Equip</button>
          <button class="btn tiny ghost" data-act="sell" data-idx="${i}">Sell ${rarityData(it.rarity).sell}g</button>
        </div>
      </div>`).join('') : '<div class="dim center">Your bag is empty. Slay monsters and open chests!</div>';
    return `
      <div class="panel wide tall">
        <div class="panel-title">Inventory <span class="gold-chip">◉ ${p.gold} gold</span> <span class="gold-chip">🧪 ${p.potions}</span></div>
        <div class="inv-cols">
          <div class="inv-col"><div class="col-title">Equipped</div>${equipped}</div>
          <div class="inv-col"><div class="col-title">Bag (${p.inventory.length}/24)</div><div class="bag-grid">${bag}</div></div>
        </div>
        <button class="btn" data-act="close">Close (I)</button>
      </div>`;
  },

  compareHtml(it) {
    const cur = G.player.equipment[it.slot];
    if (!cur) return '<div class="dim">↳ slot empty — free upgrade!</div>';
    return `<div class="dim">↳ replaces: <span style="color:${rarityData(cur.rarity).color}">${cur.name}</span></div>`;
  },

  equipItem(idx) {
    const p = G.player;
    const it = p.inventory[idx];
    if (!it) return;
    p.inventory.splice(idx, 1);
    if (p.equipment[it.slot]) p.inventory.push(p.equipment[it.slot]);
    p.equipment[it.slot] = it;
    recalcStats(p);
    this.toast('Equipped ' + it.name, rarityData(it.rarity).color);
    this.refreshInventory();
    saveGame();
  },
  unequipSlot(slot) {
    const p = G.player;
    const it = p.equipment[slot];
    if (!it) return;
    if (p.inventory.length >= 24) { this.toast('Bag is full!', '#e05858'); return; }
    delete p.equipment[slot];
    p.inventory.push(it);
    recalcStats(p);
    this.refreshInventory();
  },
  sellItem(idx) {
    const p = G.player;
    const it = p.inventory[idx];
    if (!it) return;
    p.inventory.splice(idx, 1);
    p.gold += rarityData(it.rarity).sell;
    this.toast('Sold for ' + rarityData(it.rarity).sell + ' gold', '#f0c840');
    this.refreshInventory();
  },

  /* ---------- Skill tree ---------- */
  showSkills() { this.show('skills', this.skillsHtml()); },
  refreshSkills() { if (G.overlay === 'skills') this.el.overlay.innerHTML = this.skillsHtml(); },

  nodeHtml(n, available, owned) {
    const cls = owned ? 'node owned' : available ? 'node open' : 'node locked';
    return `<button class="${cls}" data-act="node" data-id="${n.id}">
      <div class="node-name">${n.name}</div>
      <div class="node-desc">${n.desc}</div>
      ${owned ? '<div class="node-owned">✓ LEARNED</div>' : available ? '<div class="node-cost">1 point</div>' : '<div class="node-cost dim">locked</div>'}
    </button>`;
  },

  skillsHtml() {
    const p = G.player;
    const tree = SKILL_TREES[p.classId];
    let baseHtml = '<div class="branch"><div class="branch-title">' + CLASSES[p.classId].name + ' Training</div>';
    for (let i = 0; i < tree.base.length; i++) {
      const n = tree.base[i];
      const owned = p.nodes.includes(n.id);
      const avail = !owned && (i === 0 || p.nodes.includes(tree.base[i - 1].id)) && p.skillPoints > 0;
      baseHtml += this.nodeHtml(n, avail, owned);
    }
    baseHtml += '</div>';
    let subHtml = '';
    if (p.subclassId) {
      subHtml = tree[p.subclassId].branches.map(br => {
        let h = `<div class="branch"><div class="branch-title">${br.name}</div>`;
        for (let i = 0; i < br.nodes.length; i++) {
          const n = br.nodes[i];
          const owned = p.nodes.includes(n.id);
          const avail = !owned && (i === 0 || p.nodes.includes(br.nodes[i - 1].id)) && p.skillPoints > 0;
          h += this.nodeHtml(n, avail, owned);
        }
        return h + '</div>';
      }).join('');
    } else {
      subHtml = '<div class="branch"><div class="branch-title">???</div><div class="dim center" style="padding:20px">Choose a subclass at level 6 to unlock three more branches.</div></div>';
    }
    return `
      <div class="panel wide tall">
        <div class="panel-title">Skill Tree <span class="gold-chip">✦ ${p.skillPoints} points</span></div>
        <div class="stat-row">
          HP ${p.hp}/${p.maxHp} · ATK ${Math.round(p.attack)} · SPL ${Math.round(p.spell)} · Armor ${p.armor}
          · Crit ${Math.round(p.crit)}% · CDR ${Math.round(p.cdr)}%
        </div>
        <div class="tree-row">${baseHtml}${subHtml}</div>
        <button class="btn" data-act="close">Close (K)</button>
      </div>`;
  },

  buyNode(id) {
    const p = G.player;
    if (p.skillPoints <= 0 || p.nodes.includes(id)) return;
    const tree = SKILL_TREES[p.classId];
    let ok = false;
    const chains = [tree.base];
    if (p.subclassId) for (const br of tree[p.subclassId].branches) chains.push(br.nodes);
    for (const chain of chains) {
      const i = chain.findIndex(n => n.id === id);
      if (i >= 0 && (i === 0 || p.nodes.includes(chain[i - 1].id))) ok = true;
    }
    if (!ok) return;
    p.skillPoints--;
    p.nodes.push(id);
    recalcStats(p);
    this.toast('Learned: ' + findNode(p.classId, id).name, '#7ec850');
    this.refreshSkills();
    saveGame();
  },

  /* ---------- Shop ---------- */
  shopItem: null,
  showShop() {
    if (!this.shopItem) this.shopItem = genItem(Math.max(G.player.level, 1), Math.max(rollRarity(), 1));
    this.show('shop', this.shopHtml());
  },
  refreshShop() { if (G.overlay === 'shop') this.el.overlay.innerHTML = this.shopHtml(); },
  shopHtml() {
    const p = G.player;
    const it = this.shopItem;
    const price = SHOP.itemPriceBase + it.ilvl * 18;
    return `
      <div class="panel">
        <div class="panel-title">Mira's Trading Post <span class="gold-chip">◉ ${p.gold} gold</span></div>
        <p class="story">"Seals cracking, monsters everywhere… wonderful for business, terrible for everything else. What'll it be, hero?"</p>
        <div class="shop-row">
          <div class="bag-item">
            <div class="iname">🧪 Health Potion</div>
            <div class="dim">Restores 50% HP. Press Q to drink.</div>
            <button class="btn tiny" data-act="buypotion">Buy — ${SHOP.potionPrice}g</button>
          </div>
          <div class="bag-item" style="border-color:${rarityData(it.rarity).color}">
            <div class="iname" style="color:${rarityData(it.rarity).color}">${it.name}</div>
            <div class="dim">${rarityData(it.rarity).name} ${it.slot} · ilvl ${it.ilvl}</div>
            ${this.itemStatsHtml(it)}
            <div class="row">
              <button class="btn tiny" data-act="buyitem">Buy — ${price}g</button>
              <button class="btn tiny ghost" data-act="reroll">New stock — ${SHOP.rerollPrice}g</button>
            </div>
          </div>
        </div>
        <div class="hint-row">Sell unwanted gear from your inventory (I).</div>
        <button class="btn" data-act="close">Leave shop</button>
      </div>`;
  },
  buyPotion() {
    const p = G.player;
    if (p.gold < SHOP.potionPrice) { this.toast('Not enough gold!', '#e05858'); return; }
    p.gold -= SHOP.potionPrice; p.potions++;
    this.toast('Bought a potion.', '#7ec850');
    this.refreshShop();
  },
  buyShopItem() {
    const p = G.player;
    const price = SHOP.itemPriceBase + this.shopItem.ilvl * 18;
    if (p.gold < price) { this.toast('Not enough gold!', '#e05858'); return; }
    if (p.inventory.length >= 24) { this.toast('Bag is full!', '#e05858'); return; }
    p.gold -= price;
    p.inventory.push(this.shopItem);
    this.toast('Bought ' + this.shopItem.name, rarityData(this.shopItem.rarity).color);
    this.shopItem = genItem(Math.max(p.level, 1), Math.max(rollRarity(), 1));
    this.refreshShop();
    saveGame();
  },
  rerollShop() {
    const p = G.player;
    if (p.gold < SHOP.rerollPrice) { this.toast('Not enough gold!', '#e05858'); return; }
    p.gold -= SHOP.rerollPrice;
    this.shopItem = genItem(Math.max(p.level, 1), Math.max(rollRarity(), 1));
    this.refreshShop();
  },

  /* ---------- World map (travel) ---------- */
  showMap() {
    const rows = ZONES.map((z, i) => {
      const unlocked = i <= G.progress.unlocked || z.kind === 'town';
      const done = G.progress.bosses[z.id];
      const here = G.zone && G.zone.id === z.id;
      const status = here ? '◈ you are here' : done ? '✔ seal safe' : unlocked ? '' : '🔒 locked';
      return `<div class="zone-row ${unlocked ? '' : 'dim'}">
        <span class="zone-num">${i + 1}</span>
        <span class="zone-name">${z.name}${z.kind === 'gen' ? ' <small class="dim">ilvl ' + z.ilvl + '</small>' : ''}</span>
        <span class="zone-note">${status || z.desc}</span>
        ${unlocked && !here ? `<button class="btn tiny" data-act="travel" data-id="${z.id}">Travel</button>` : ''}
      </div>`;
    }).join('');
    this.show('map', `
      <div class="panel wide tall">
        <div class="panel-title">World Map — The Kingdom of Aldervale <span class="gold-chip">Seals ${G.progress.seals}/6</span></div>
        ${rows}
        <div class="hint-row">Defeat each zone's boss to unlock the next. Zones repopulate when you return — good for loot runs.</div>
        <button class="btn" data-act="close">Close (M)</button>
      </div>`);
  },

  /* ---------- Captain dialog ---------- */
  showCaptain() {
    const s = G.progress.seals;
    const next = ZONES.find((z, i) => z.kind === 'gen' && !G.progress.bosses[z.id] && i <= G.progress.unlocked);
    const line = s >= 6
      ? 'You did it. The seals hold, the dragon sleeps, and Aldervale owes you everything. Rest, hero — or keep hunting. The wilds are still wild.'
      : s === 0
        ? 'So you\'re the volunteer. Listen: the dragon seals are failing and monsters are pouring out of Brightwood Forest. Start there — deal with whoever\'s leading the bandits. Take the gate and follow the amber arrow.'
        : `Good work out there. ${s}/6 seals restored. ${next ? 'Next: ' + next.name + ' — ' + next.desc : 'Press on.'} And hero — the black knight the scouts keep seeing? He was one of ours, once. Be careful.`;
    this.show('captain', `
      <div class="panel">
        <div class="panel-title">Captain Elara</div>
        <p class="story">"${line}"</p>
        <div class="hint-row">Seals restored: ${s}/6 · Open the world map with M</div>
        <button class="btn" data-act="close">Farewell</button>
      </div>`);
  },

  /* ---------- Pause / death / victory ---------- */
  showPause() {
    this.show('pause', `
      <div class="panel">
        <div class="panel-title">Paused</div>
        <div class="controls-list">
          <div>WASD / arrows — move</div><div>Mouse — aim · Click / J — attack</div>
          <div>Space — dodge roll (brief invincibility)</div>
          <div>1–5 — abilities · Q — potion</div>
          <div>E — interact (talk, chests, shrines, portals)</div>
          <div>I — inventory · K — skills · M — world map</div>
        </div>
        <button class="btn" data-act="resume">Resume (Esc)</button>
        <button class="btn ghost" data-act="save">Save game</button>
        <button class="btn ghost" data-act="quit">Save & quit to title</button>
      </div>`);
  },
  showDead(goldLost) {
    this.show('dead', `
      <div class="panel">
        <div class="panel-title" style="color:#e05858">You have fallen…</div>
        <p class="story">Aldervale claims another hero — but heroes get back up.
        You lost ${goldLost} gold. Your gear, levels and seals are safe.</p>
        <button class="btn big" data-act="respawn">Wake up in Brightwood Village</button>
      </div>`);
  },
  showVictory() {
    this.show('victory', `
      <div class="panel">
        <div class="panel-title" style="color:#f0c840">✦ THE LAST SEAL HOLDS ✦</div>
        <p class="story">The Ancient Dragon's roar fades into a long, slow breath — and then, sleep.
        Six seals burn bright across Aldervale. The Death Knight's armor lies empty on the
        battlefield, at peace at last. Bards will argue about the details, but they'll agree
        on one thing: you were there, and you did not run.</p>
        <p class="story dim">Thanks for playing Dragonseal! Free play continues — every zone
        can be re-run for loot, and your legend is saved.</p>
        <button class="btn big" data-act="close">Keep adventuring</button>
        <button class="btn ghost" data-act="newgameplus">Erase save & start fresh</button>
      </div>`);
  },

  /* ---------- HUD ---------- */
  buildAbilityBar() {
    const p = G.player;
    this.el.abilityBar.innerHTML = p.abilities.map((id, i) => {
      const a = ABILITIES[id];
      return `<div class="slot" title="${a.name}: ${a.desc}">
        <div class="slot-icon">${a.icon}</div>
        <div class="slot-cd" id="cd-${i}"></div>
        <div class="slot-key">${i + 1}</div>
      </div>`;
    }).join('');
  },

  updateZoneLabel() {
    if (this.el.zoneText && G.zone) this.el.zoneText.textContent = G.zone.name;
    if (this.el.seals) {
      let pips = '';
      for (let i = 0; i < 6; i++) pips += i < G.progress.seals ? '◆' : '◇';
      this.el.seals.textContent = pips;
    }
  },

  updateHUD() {
    const p = G.player;
    if (!p) return;
    this.el.hpFill.style.width = clamp(p.hp / p.maxHp * 100, 0, 100) + '%';
    this.el.hpText.textContent = Math.max(0, p.hp) + ' / ' + p.maxHp;
    this.el.shieldFill.style.width = clamp(p.shieldHp / p.maxHp * 100, 0, 100) + '%';
    this.el.xpFill.style.width = clamp(p.xp / xpNeeded(p.level) * 100, 0, 100) + '%';
    this.el.lvlText.textContent = 'Lv ' + p.level;
    this.el.goldText.textContent = p.gold;
    this.el.potText.textContent = p.potions;
    const sub = p.subclassId ? CLASSES[p.classId].subclasses[p.subclassId].name : CLASSES[p.classId].name;
    this.el.classText.textContent = sub + (p.skillPoints > 0 ? ' · ✦' + p.skillPoints : '');

    // Quest tracker
    const z = G.zone;
    let q = '';
    if (z) {
      if (z.kind === 'town') {
        const next = ZONES.find((zz, i) => zz.kind === 'gen' && !G.progress.bosses[zz.id] && i <= G.progress.unlocked);
        q = G.gameWon ? 'Aldervale is saved. Free play!' : next ? 'Next: ' + next.name + ' (M to travel)' : 'Take the gate (E)';
      } else if (G.shrineActive) q = 'Restore the seal shrine (E)';
      else if (G.progress.bosses[z.id]) q = z.name + ' cleared — loot & leave';
      else if (z.quest) q = z.quest.name + ': follow the amber arrow';
    }
    this.el.questText.textContent = q;

    // Ability cooldowns
    for (let i = 0; i < p.abilities.length; i++) {
      const id = p.abilities[i];
      const cdEl = document.getElementById('cd-' + i);
      if (!cdEl) continue;
      const remain = p.cds[id] || 0;
      const total = abilityCd(p, id);
      if (remain > 0) {
        cdEl.style.height = clamp(remain / total * 100, 0, 100) + '%';
        cdEl.textContent = remain > 1 ? Math.ceil(remain) : '';
      } else { cdEl.style.height = '0%'; cdEl.textContent = ''; }
    }
    // Dodge indicator
    if (this.el.dodgeCd) {
      const r = p.dodgeCd > 0 ? clamp(p.dodgeCd / p.dodgeCdMax * 100, 0, 100) : 0;
      this.el.dodgeCd.style.height = r + '%';
    }

    if (G.boss) this.el.bossFill.style.width = clamp(G.boss.hp / G.boss.maxHp * 100, 0, 100) + '%';

    const hint = p.dead || !G.map ? null : nearestInteract(p);
    if (hint) { this.el.interactHint.textContent = hint; this.el.interactHint.classList.remove('hidden'); }
    else this.el.interactHint.classList.add('hidden');
  },

  showBossBar(name) {
    this.el.bossName.textContent = name;
    this.el.bossBar.classList.remove('hidden');
  },
  hideBossBar() { this.el.bossBar.classList.add('hidden'); },

  flashDamage() {
    this.el.damageFlash.classList.remove('active');
    void this.el.damageFlash.offsetWidth;
    this.el.damageFlash.classList.add('active');
  },

  toast(text, color) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.style.borderColor = color || '#f0c840';
    t.textContent = text;
    this.el.toasts.appendChild(t);
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3100);
    while (this.el.toasts.children.length > 4) this.el.toasts.firstChild.remove();
  },
};
