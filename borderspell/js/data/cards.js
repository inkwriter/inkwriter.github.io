// ============================================================
// data/cards.js — Every card in the game
//
// To add a card, copy an object below and change its fields.
// The engine never needs to know about individual cards — it only
// understands the reusable effect actions listed here:
//
//   damage       lower the ENEMY side's battle score by amount
//   heal         restore up to amount of YOUR troops after the battle
//   buffAttack   +amount to your score (attacker only)
//   buffDefense  +amount to your score (defender only)
//   addTroops    +amount troops join your side for this battle (and survive)
//   reduceDamage prevent up to amount of your casualties
//   drawCard     immediately draw amount cards
//   gainPower    immediately gain amount Power
//
// Card fields:
//   id                     unique string
//   name                   display name
//   type                   "unit" | "spell" | "tactic"
//   cost                   Power cost to play
//   power                  (units only) added to your battle score
//   requiredTerritoryType  (optional) "plains"|"forest"|"mountain"|"tower"
//   tier                   1+ — needs that many territories of the type
//                          (cards with no requiredTerritoryType are basic
//                          cards that everyone always has)
//   tags                   used by terrain bonuses (e.g. "forest")
//   copies                 how many go into a deck when unlocked (default 1)
//   effect                 { action, amount } — see actions above
//   text                   rules text shown on the card
// ============================================================

const CARD_DATA = [
  // ---------- Basic cards (always available) ----------
  { id: "militia", name: "Militia", type: "unit", cost: 1, power: 2, copies: 3,
    tags: ["soldier"], text: "A humble band of farmhands with spears." },
  { id: "footmen", name: "Footmen", type: "unit", cost: 2, power: 3, copies: 2,
    tags: ["soldier"], text: "Trained infantry of the realm." },
  { id: "rally", name: "Rally", type: "tactic", cost: 1, copies: 2,
    effect: { action: "buffAttack", amount: 2 },
    text: "+2 to your score when attacking." },
  { id: "shieldwall", name: "Shieldwall", type: "tactic", cost: 1, copies: 2,
    effect: { action: "buffDefense", amount: 2 },
    text: "+2 to your score when defending." },
  { id: "scouts", name: "Scouts", type: "tactic", cost: 1, copies: 1,
    effect: { action: "drawCard", amount: 1 },
    text: "Draw a card." },
  { id: "conscription", name: "Conscription", type: "tactic", cost: 2, copies: 1,
    effect: { action: "addTroops", amount: 2 },
    text: "2 extra troops join this battle and stay if they survive." },

  // ---------- Plains cards (soldiers & supply) ----------
  { id: "spearmen", name: "Spearmen", type: "unit", cost: 2, power: 3,
    requiredTerritoryType: "plains", tier: 1, copies: 2, tags: ["soldier"],
    text: "Steady ranks from the open fields." },
  { id: "harvest", name: "Harvest", type: "tactic", cost: 0,
    requiredTerritoryType: "plains", tier: 1, copies: 2,
    effect: { action: "gainPower", amount: 2 },
    text: "Gain 2 Power." },
  { id: "cavalry", name: "Cavalry Charge", type: "unit", cost: 3, power: 5,
    requiredTerritoryType: "plains", tier: 2, copies: 2, tags: ["soldier"],
    text: "Riders thunder across the plain." },
  { id: "war-banner", name: "War Banner", type: "tactic", cost: 2,
    requiredTerritoryType: "plains", tier: 2, copies: 1,
    effect: { action: "buffAttack", amount: 3 },
    text: "+3 to your score when attacking." },
  { id: "royal-lancers", name: "Royal Lancers", type: "unit", cost: 4, power: 7,
    requiredTerritoryType: "plains", tier: 3, copies: 1, tags: ["soldier"],
    text: "The crown's finest heavy cavalry." },

  // ---------- Forest cards (beasts, healing, ambush) ----------
  { id: "wolfpack", name: "Wolfpack", type: "unit", cost: 2, power: 3,
    requiredTerritoryType: "forest", tier: 1, copies: 2, tags: ["beast", "forest"],
    text: "Forest bonus applies: +1 in forest battles." },
  { id: "herbal-salve", name: "Herbal Salve", type: "spell", cost: 1,
    requiredTerritoryType: "forest", tier: 1, copies: 2,
    effect: { action: "heal", amount: 2 },
    text: "Restore up to 2 of your troops lost in this battle." },
  { id: "ambush", name: "Ambush", type: "tactic", cost: 2,
    requiredTerritoryType: "forest", tier: 2, copies: 2, tags: ["forest"],
    effect: { action: "buffAttack", amount: 3 },
    text: "+3 attacking. +1 more in forest battles." },
  { id: "forest-warden", name: "Forest Warden", type: "unit", cost: 3, power: 4,
    requiredTerritoryType: "forest", tier: 2, copies: 1, tags: ["beast", "forest"],
    text: "Keeper of the deep woods." },
  { id: "elder-treant", name: "Elder Treant", type: "unit", cost: 5, power: 7,
    requiredTerritoryType: "forest", tier: 3, copies: 1, tags: ["beast", "forest"],
    text: "The forest itself goes to war." },

  // ---------- Mountain cards (defense, armor, siege) ----------
  { id: "mountaineers", name: "Mountaineers", type: "unit", cost: 2, power: 3,
    requiredTerritoryType: "mountain", tier: 1, copies: 2, tags: ["soldier"],
    text: "Hardy fighters of the high passes." },
  { id: "stone-wall", name: "Stone Wall", type: "tactic", cost: 1,
    requiredTerritoryType: "mountain", tier: 1, copies: 2,
    effect: { action: "buffDefense", amount: 3 },
    text: "+3 to your score when defending." },
  { id: "siege-ram", name: "Siege Ram", type: "unit", cost: 3, power: 5,
    requiredTerritoryType: "mountain", tier: 2, copies: 1, tags: ["siege"],
    text: "Splinters gates and shield walls alike." },
  { id: "iron-armor", name: "Iron Armor", type: "tactic", cost: 2,
    requiredTerritoryType: "mountain", tier: 2, copies: 1,
    effect: { action: "reduceDamage", amount: 2 },
    text: "Prevent up to 2 of your casualties this battle." },
  { id: "dwarven-bulwark", name: "Dwarven Bulwark", type: "unit", cost: 4, power: 6,
    requiredTerritoryType: "mountain", tier: 3, copies: 1, tags: ["soldier", "siege"],
    text: "An unbreakable line of iron and stone." },

  // ---------- Tower cards (spells & magic) ----------
  { id: "firebolt", name: "Firebolt", type: "spell", cost: 2,
    requiredTerritoryType: "tower", tier: 1, copies: 2, tags: ["fire"],
    effect: { action: "damage", amount: 2 },
    text: "Enemy score −2. Spells gain +1 in tower battles." },
  { id: "arcane-insight", name: "Arcane Insight", type: "spell", cost: 2,
    requiredTerritoryType: "tower", tier: 1, copies: 1,
    effect: { action: "drawCard", amount: 2 },
    text: "Draw 2 cards." },
  { id: "fireball", name: "Fireball", type: "spell", cost: 3,
    requiredTerritoryType: "tower", tier: 2, copies: 1, tags: ["fire"],
    effect: { action: "damage", amount: 4 },
    text: "Enemy score −4." },
  { id: "mage-shield", name: "Mage Shield", type: "spell", cost: 2,
    requiredTerritoryType: "tower", tier: 2, copies: 1,
    effect: { action: "buffDefense", amount: 3 },
    text: "+3 to your score when defending." },
  { id: "meteor", name: "Meteor", type: "spell", cost: 5,
    requiredTerritoryType: "tower", tier: 3, copies: 1, tags: ["fire"],
    effect: { action: "damage", amount: 7 },
    text: "Enemy score −7. The sky falls." }
];
