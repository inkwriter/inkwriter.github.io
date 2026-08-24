// ============================================================
// CAPE CITY COMICS — data.js
// All content lives here: powers, villains, names, headlines.
// Adding content should never require touching engine code.
// ============================================================
"use strict";

const PAL = {
  ink:"#1a1028", paper:"#f6ead0",
  road:"#4a4658", roadLine:"#c9c14f", sidewalk:"#9a94a8", sidewalk2:"#8b85a0",
  grass:"#58b458", grass2:"#4aa34a", tree:"#2e7d3a", treeTrunk:"#7a4a2b",
  wallA:"#c96a4a", wallB:"#8a6ec9", wallC:"#4a8ac9", wallD:"#c9a04a",
  roof:"#6b5a80", floor:"#d8c9a8", door:"#7a4a2b", windowT:"#bfe6f5",
  rubble:"#7d7668",
  fire1:"#ff5a2a", fire2:"#ffc93c", smoke:"rgba(90,80,100,.6)",
  water:"#4aa8e8",
  hero:"#e8433f", heroCape:"#2e63d8", skin:"#ffcf9e",
  civ:["#e8433f","#2e63d8","#3fbf6e","#ffc93c","#b45ac9","#e88a2a","#4ac9b0","#c94a8a"],
  enemy:"#454055", enemyMask:"#222",
  villain:"#7a2ee8", zap:"#ffe94a", iceC:"#8ae0ff", blast:"#ffb02a",
  ui:"#f6ead0"
};

const HERO_FIRST = ["CAPTAIN","THE MIGHTY","DOCTOR","AGENT","THE AMAZING","KID","MADAME","PROFESSOR","THE INCREDIBLE","SIR"];
const HERO_LAST  = ["COMET","THUNDERBOLT","MERIDIAN","VANGUARD","STARLING","QUAKE","ZEPHYR","BULWARK","PHOTON","MARVELOUS"];

const IMPACT = ["KRAK!","WHAM!","POW!","ZAP!","BONK!","THWACK!","KABOOM!","SMASH!"];

// ---------------- POWERS ----------------
// Every power is a data recipe over engine verbs (see game.js firePowerBasic).
// verb: 'melee' | 'bolt'
const POWERS = {
  strength:{
    name:"SUPER STRENGTH", color:"#e8433f", verb:"melee", tag:"melee",
    dmg:[3,4,6,7,9], range:34, knock:6,
    desc:"Punch hard. Pick up cars. Throw cars. Repeat.",
    special:"Lift & throw objects (RMB)", mobility:"Super Leap", defense:"Block",
    lvNotes:["Heavy Punch","Power Throw — and [2] SHOCKWAVE STOMP","Leap Slam — and [3] RUBBLE TOSS","[4] THUNDERCLAP unlocked","[5] TITAN IMPACT unlocked"]
  },
  speed:{
    name:"SUPER SPEED", color:"#ffc93c", verb:"melee", tag:"melee",
    dmg:[2,3,4,5,6], range:28, knock:3,
    desc:"Faster than a getaway car. Slippery indoors.",
    special:"Blur Strike: damaging dash-through (RMB)", mobility:"Sprint Dash", defense:"Perfect Dodge",
    lvNotes:["Sprint","Blur Strike — and [2] WHIRLWIND","[3] AFTERIMAGE unlocked","[4] RICOCHET RUN unlocked","[5] TIME SKIP unlocked"]
  },
  blast:{
    name:"ENERGY BLASTS", color:"#ffb02a", verb:"bolt", tag:"ranged",
    dmg:[2,3,4,5,6], speed:7, life:60,
    desc:"Zap crime from a safe distance.",
    special:"Charge Shot: piercing beam (RMB)", mobility:"Blast Jump", defense:"Energy Guard",
    lvNotes:["Bolt","Charge pierce — and [2] SCATTER SHOT","Split Shot — and [3] BLAST JUMP","[4] PIERCE BEAM unlocked","[5] NOVA RING unlocked"]
  },
  ice:{
    name:"ICE POWERS", color:"#8ae0ff", verb:"bolt", tag:"ice",
    dmg:[2,2,3,4,5], speed:6, life:55, slow:true,
    desc:"Frost ray, stacking freezes, buildable ice walls.",
    special:"Frost Ray: HOLD RMB to channel", mobility:"Ice Slide", defense:"Ice Guard",
    lvNotes:["Ice Shot chills","Longer Frost Ray — and [2] FROST RING","Douse splash — and [3] ICE WALL","[4] FLASH FREEZE unlocked","[5] BLIZZARD DOME unlocked"]
  }
};

// ---------------- SIGNATURE ABILITIES (keys 1-5) ----------------
// Ability [n] unlocks when that power reaches level n. Implemented in game.js castAbility().
const ABILITIES={
  strength:[
    {name:"HAYMAKER",  desc:"One huge punch."},
    {name:"STOMP",     desc:"Shockwave knockback around you."},
    {name:"RUBBLE TOSS",desc:"Rip a chunk from the street and hurl it."},
    {name:"THUNDERCLAP",desc:"Cone stun in front of you."},
    {name:"TITAN IMPACT",desc:"Leap to your cursor and SLAM. Collateral risk!"}
  ],
  speed:[
    {name:"JAB FLURRY", desc:"Three lightning-fast hits."},
    {name:"WHIRLWIND",  desc:"Spin: drag in and strike nearby foes."},
    {name:"AFTERIMAGE", desc:"Leave a decoy enemies attack."},
    {name:"RICOCHET RUN",desc:"Bounce between up to 3 enemies."},
    {name:"TIME SKIP",  desc:"Everyone else moves like molasses."}
  ],
  blast:[
    {name:"TWIN BOLT",  desc:"Two parallel bolts."},
    {name:"SCATTER SHOT",desc:"Five-bolt fan."},
    {name:"BLAST JUMP", desc:"Explosive launch — burst at takeoff."},
    {name:"PIERCE BEAM",desc:"Instant ray through everything."},
    {name:"NOVA RING",  desc:"360° discharge. Pops enemy projectiles."}
  ],
  ice:[
    {name:"ICE LANCE",  desc:"Piercing, freezing icicle."},
    {name:"FROST RING", desc:"Freeze burst around you."},
    {name:"ICE WALL",   desc:"Raise a wall of ice (melts in ~10s)."},
    {name:"FLASH FREEZE",desc:"Freeze everything nearby."},
    {name:"BLIZZARD DOME",desc:"Freeze the screen. Douse every fire."}
  ]
};
const ABILITY_CDS =[180,320,450,650,950];   // frames
const ABILITY_STAM=[1,1.5,2,2.5,3];

const SUPPORTS = {
  grapple:{
    name:"GRAPPLE LINES", color:"#3fbf6e",
    desc:"F: zip to a point, or yank an enemy to you.",
  },
  healing:{
    name:"HEALING FACTOR", color:"#e88ab0",
    desc:"Passive: steadily regenerate health. Slow and steady saves the day.",
    passive:true
  }
};

// ---------------- VILLAINS ----------------
const VILLAIN_THEMES = [
  {name:"STATIC CLING",  color:"#ffe94a", trim:"#7a2ee8", kind:"zap",
   intro:"You can't catch what you can't— hey! Stop chasing me!",
   brag:"Did you SEE me escape? Front page material, baby!"},
  {name:"THE GARDEN GNOME", color:"#3fbf6e", trim:"#e8433f", kind:"zap",
   intro:"You TRAMPLED my petunias, hero. Now face my lawn-fury!",
   brag:"My garden grows. Your reputation? Wilts."},
  {name:"COACH CHAOS", color:"#e88a2a", trim:"#f6ead0", kind:"zap",
   intro:"Rule one of Chaos-ball: THERE ARE NO RULES!",
   brag:"And THAT is how you run the play, rookie!"},
  {name:"MARQUIS MAGNET", color:"#8b85a0", trim:"#4a8ac9", kind:"zap",
   intro:"How attractive of you to show up. Magnetically speaking.",
   brag:"I am simply IRRESISTIBLE. Get it? Magnets? Ugh, philistines."},
  {name:"SIR SLAPSTICK", color:"#b45ac9", trim:"#ffc93c", kind:"zap",
   intro:"A pie for you! A pie for your city! PIES FOR EVERYONE!",
   brag:"Comedy gold. The hero? Comedy BRONZE."}
];

const RANKS = ["STREET TROUBLEMAKER","POWERED CRIMINAL","DISTRICT BOSS","CITY THREAT","MASTERMIND"];

// Adaptations keyed by the damage tag the player used most.
const ADAPTATIONS = {
  melee:{ label:"SPIKE GUARD", line:"New suit! Punch me and see what happens. Go on. PUNCH ME.",
          effect:"Returns a bit of melee damage to you." },
  ranged:{label:"MIRROR SHIELD", line:"Like my mirror? Your little zaps might come RIGHT back.",
          effect:"Chance to reflect your bolts." },
  ice:{   label:"HEATED ARMOR", line:"Toasty new threads. Your ice tricks won't slow me now!",
          effect:"Immune to chill and freeze." },
  thrown:{label:"CATCHER'S MITT", line:"Throw another car. I DARE you. I've been practicing!",
          effect:"Often dodges thrown objects." }
};

// ---------------- HEADLINES / STRINGS ----------------
const HEADLINES = {
  beloved:["CITY'S NEW GUARDIAN ANGEL!","{HERO} SAVES THE DAY — AGAIN!","DOWNTOWN CHEERS FOR {HERO}!"],
  mixed:["CAPE OR CALAMITY? CITY DIVIDED ON {HERO}","HERO HELPS — BUT AT WHAT COST?","{HERO}: MENACE OR MIRACLE?"],
  menace:["RECKLESS 'HERO' LEAVES TRAIL OF RUBBLE","COUNCIL DEMANDS: WHO PAYS FOR {HERO}'S MESS?","{HERO} STRIKES AGAIN — SO DO REPAIR CREWS"],
  villainWin:["{VILLAIN} HUMILIATES LOCAL HERO!","{VILLAIN} AT LARGE — CITIZENS ADVISED TO SIGH LOUDLY"],
  villainCaught:["{VILLAIN} CAPTURED! BUBBLE WRAP STOCKS SOAR!","{HERO} DELIVERS {VILLAIN} TO JUSTICE (AND BUBBLE WRAP)"]
};

const TICKER_LINES = {
  rescue:["Civilian rescued! The crowd goes wild!","Another citizen saved — headline material!","Rescued! Somebody get this hero a parade."],
  crime:["Robbery foiled!","Crooks bubble-wrapped and delivered.","Crime doesn't pay. Especially today."],
  chase:["Getaway car... didn't get away.","Chase ended. Hubcaps everywhere."],
  collateral:["The city council winces audibly.","Somewhere, an insurance adjuster faints.","That's coming out of SOMEBODY'S budget."],
  fireOut:["Fire extinguished! Firefighters send a thank-you card."],
  civHurt:["A civilian was endangered! The papers will hear about this."]
};

const D20_TABLE = [
  {min:1, max:1,  title:"UNSTABLE MUTATION!", text:"A strange surge grants you a NEW POWER — but you feel... crackly. (New power gained; you take extra fire damage for 3 minutes.)"},
  {min:2, max:4,  title:"POWER SURGE!", text:"Your core power operates at +1 level for the next 90 seconds!"},
  {min:5, max:8,  title:"INSIGHT!", text:"You suddenly understand your power more deeply. (Big Power XP gain!)"},
  {min:9, max:12, title:"BREAKTHROUGH!", text:"A new technique clicks into place. (Your core power gains a level!)"},
  {min:13,max:16, title:"PASSIVE PERK!", text:"You feel tougher. (+2 max HP, +stamina regeneration — permanent.)"},
  {min:17,max:19, title:"RARE TECHNIQUE!", text:"Two rare upgrades shimmer before you. Choose one!"},
  {min:20,max:20, title:"HEROIC BREAKTHROUGH!", text:"The stuff of legend! You gain a NEW power — already trained to level 2!"}
];
