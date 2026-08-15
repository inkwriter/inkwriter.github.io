// data.js — Default content for all generators.
// This file works everywhere (including file://). If a matching JSON file
// exists in /data/generators/, it overrides the category here (see app.js).
// Edit content with editor.html — you rarely need to touch this file by hand.

const DATA = {
  firstNames: ["Adrik","Alia","Baern","Bree","Cade","Dara","Eldon","Enna","Fargrim","Gilda","Hadar","Ilde","Jorah","Kael","Kithri","Lander","Lia","Mika","Nyx","Orin","Perrin","Quill","Rurik","Seraphina","Taman","Thia","Ulric","Vala","Wren","Xander","Yesenia","Zook","Bram","Corrin","Dagny","Emet","Faelar","Gwynn","Hobb","Isolde"],
  lastNames: ["Amberhill","Blackbriar","Coppervein","Dawnwood","Emberfall","Frostbeard","Grayspire","Hollowbrook","Ironfoot","Jadeleaf","Kettleblack","Longriver","Mossmantle","Nightbreeze","Oakenshield","Pinewhistle","Quickstep","Ravenholt","Stormcaller","Thistledown","Underbough","Vexley","Wildmane","Yarrow","Ashgrove","Brightwater","Cinderfell","Duskwalker"],

  species: [
    {name:"Human", speed:30, features:["Versatile: +1 to every ability score"]},
    {name:"Elf", speed:30, features:["Darkvision 60 ft.","Advantage vs. being charmed","Trance: long rest in 4 hours"]},
    {name:"Dwarf", speed:25, features:["Darkvision 60 ft.","Advantage on saves vs. poison","Resistance to poison damage"]},
    {name:"Halfling", speed:25, features:["Lucky: reroll 1s on d20s","Advantage vs. being frightened","Move through larger creatures' spaces"]},
    {name:"Dragonborn", speed:30, features:["Breath weapon (2d6, save for half)","Resistance to your dragon's damage type"]},
    {name:"Gnome", speed:25, features:["Darkvision 60 ft.","Advantage on INT/WIS/CHA saves vs. magic"]},
    {name:"Half-Orc", speed:30, features:["Darkvision 60 ft.","Relentless: drop to 1 HP instead of 0 once per rest","Extra die on critical hits"]},
    {name:"Tiefling", speed:30, features:["Darkvision 60 ft.","Resistance to fire damage","Knows the Thaumaturgy cantrip"]},
    {name:"Half-Elf", speed:30, features:["Darkvision 60 ft.","Advantage vs. being charmed","Two extra skill proficiencies"]}
  ],

  // hd: hit die size. saves: proficient saving throws. prio: ability priority for score assignment.
  // ac: base armor package. atk: default attacks. caster: "full" | "half" | null. cAbil: casting ability.
  classes: [
    {name:"Fighter", hd:10, saves:["STR","CON"], prio:["STR","CON","DEX","WIS","CHA","INT"],
      skills:["Athletics","Intimidation","Perception","Survival"], nSkills:2,
      ac:{name:"Chain mail + shield", base:18, dexMax:0},
      atk:[{name:"Longsword",dmg:"1d8",abil:"STR"},{name:"Handaxe (thrown)",dmg:"1d6",abil:"STR"}],
      equip:["Chain mail","Shield","Longsword","Two handaxes","Dungeoneer's pack"],
      features:{1:["Second Wind: bonus action, regain 1d10 + level HP once per rest","Fighting Style: Defense (+1 AC, included)"],2:["Action Surge: one extra action, once per rest"],3:["Martial Archetype"],4:["Ability Score Improvement"],5:["Extra Attack"]}, caster:null},
    {name:"Wizard", hd:6, saves:["INT","WIS"], prio:["INT","CON","DEX","WIS","CHA","STR"],
      skills:["Arcana","History","Investigation","Insight"], nSkills:2,
      ac:{name:"No armor (Mage Armor when cast: 13+DEX)", base:10, dexMax:99},
      atk:[{name:"Quarterstaff",dmg:"1d6",abil:"STR"},{name:"Fire Bolt (cantrip)",dmg:"1d10",abil:"INT",spell:true}],
      equip:["Quarterstaff","Spellbook","Component pouch","Scholar's pack"],
      features:{1:["Arcane Recovery: regain spell slots on a short rest"],2:["Arcane Tradition"],3:[],4:["Ability Score Improvement"],5:[]}, caster:"full", cAbil:"INT"},
    {name:"Cleric", hd:8, saves:["WIS","CHA"], prio:["WIS","CON","STR","DEX","CHA","INT"],
      skills:["Insight","Medicine","Persuasion","Religion"], nSkills:2,
      ac:{name:"Scale mail + shield", base:16, dexMax:2},
      atk:[{name:"Mace",dmg:"1d6",abil:"STR"},{name:"Sacred Flame (cantrip)",dmg:"1d8",abil:"WIS",spell:true,save:true}],
      equip:["Scale mail","Shield","Mace","Holy symbol","Priest's pack"],
      features:{1:["Divine Domain","Spellcasting"],2:["Channel Divinity (1/rest)"],3:[],4:["Ability Score Improvement"],5:["Destroy Undead (CR 1/2)"]}, caster:"full", cAbil:"WIS"},
    {name:"Rogue", hd:8, saves:["DEX","INT"], prio:["DEX","CON","INT","WIS","CHA","STR"],
      skills:["Stealth","Acrobatics","Deception","Sleight of Hand","Perception","Investigation"], nSkills:4,
      ac:{name:"Leather armor", base:11, dexMax:99},
      atk:[{name:"Rapier",dmg:"1d8",abil:"DEX"},{name:"Shortbow",dmg:"1d6",abil:"DEX"}],
      equip:["Leather armor","Rapier","Shortbow + 20 arrows","Thieves' tools","Burglar's pack"],
      features:{1:["Sneak Attack (1d6)","Expertise: double proficiency in two skills","Thieves' Cant"],2:["Cunning Action: Dash, Disengage, or Hide as a bonus action"],3:["Roguish Archetype","Sneak Attack (2d6)"],4:["Ability Score Improvement"],5:["Uncanny Dodge","Sneak Attack (3d6)"]}, caster:null},
    {name:"Ranger", hd:10, saves:["STR","DEX"], prio:["DEX","WIS","CON","STR","INT","CHA"],
      skills:["Survival","Nature","Perception","Stealth","Animal Handling"], nSkills:3,
      ac:{name:"Leather armor", base:11, dexMax:99},
      atk:[{name:"Longbow",dmg:"1d8",abil:"DEX"},{name:"Shortsword",dmg:"1d6",abil:"DEX"}],
      equip:["Leather armor","Longbow + 20 arrows","Two shortswords","Explorer's pack"],
      features:{1:["Favored Enemy","Natural Explorer"],2:["Fighting Style: Archery (+2 to bow attacks)","Spellcasting"],3:["Ranger Archetype","Primeval Awareness"],4:["Ability Score Improvement"],5:["Extra Attack"]}, caster:"half", cAbil:"WIS"},
    {name:"Barbarian", hd:12, saves:["STR","CON"], prio:["STR","CON","DEX","WIS","CHA","INT"],
      skills:["Athletics","Intimidation","Survival","Animal Handling"], nSkills:2,
      ac:{name:"Unarmored (10 + DEX + CON)", base:10, dexMax:99, addCon:true},
      atk:[{name:"Greataxe",dmg:"1d12",abil:"STR"},{name:"Javelin (thrown)",dmg:"1d6",abil:"STR"}],
      equip:["Greataxe","Four javelins","Explorer's pack"],
      features:{1:["Rage (2/day): bonus damage, resistance to weapon damage","Unarmored Defense"],2:["Reckless Attack","Danger Sense"],3:["Primal Path"],4:["Ability Score Improvement"],5:["Extra Attack","Fast Movement (+10 ft.)"]}, caster:null},
    {name:"Bard", hd:8, saves:["DEX","CHA"], prio:["CHA","DEX","CON","WIS","INT","STR"],
      skills:["Performance","Persuasion","Deception","Insight","Acrobatics","History"], nSkills:3,
      ac:{name:"Leather armor", base:11, dexMax:99},
      atk:[{name:"Rapier",dmg:"1d8",abil:"DEX"},{name:"Vicious Mockery (cantrip)",dmg:"1d4",abil:"CHA",spell:true,save:true}],
      equip:["Leather armor","Rapier","Lute","Entertainer's pack"],
      features:{1:["Bardic Inspiration (d6): bonus action, give an ally a bonus die"],2:["Jack of All Trades","Song of Rest"],3:["Bard College","Expertise"],4:["Ability Score Improvement"],5:["Bardic Inspiration (d8)","Font of Inspiration"]}, caster:"full", cAbil:"CHA"},
    {name:"Paladin", hd:10, saves:["WIS","CHA"], prio:["STR","CHA","CON","DEX","WIS","INT"],
      skills:["Athletics","Insight","Intimidation","Persuasion","Religion"], nSkills:2,
      ac:{name:"Chain mail + shield", base:18, dexMax:0},
      atk:[{name:"Longsword",dmg:"1d8",abil:"STR"},{name:"Javelin (thrown)",dmg:"1d6",abil:"STR"}],
      equip:["Chain mail","Shield","Longsword","Five javelins","Holy symbol","Priest's pack"],
      features:{1:["Divine Sense","Lay on Hands: heal a pool of 5 × level HP"],2:["Fighting Style: Defense (+1 AC, included)","Divine Smite","Spellcasting"],3:["Sacred Oath","Divine Health"],4:["Ability Score Improvement"],5:["Extra Attack"]}, caster:"half", cAbil:"CHA"},
    {name:"Druid", hd:8, saves:["INT","WIS"], prio:["WIS","CON","DEX","INT","CHA","STR"],
      skills:["Nature","Animal Handling","Perception","Medicine","Survival"], nSkills:2,
      ac:{name:"Leather armor + shield", base:13, dexMax:99},
      atk:[{name:"Scimitar",dmg:"1d6",abil:"DEX"},{name:"Produce Flame (cantrip)",dmg:"1d8",abil:"WIS",spell:true}],
      equip:["Leather armor","Wooden shield","Scimitar","Druidic focus","Explorer's pack"],
      features:{1:["Druidic language","Spellcasting"],2:["Wild Shape (2/rest)","Druid Circle"],3:[],4:["Ability Score Improvement","Wild Shape improvement"],5:[]}, caster:"full", cAbil:"WIS"},
    {name:"Monk", hd:8, saves:["STR","DEX"], prio:["DEX","WIS","CON","STR","INT","CHA"],
      skills:["Acrobatics","Athletics","Stealth","Insight"], nSkills:2,
      ac:{name:"Unarmored (10 + DEX + WIS)", base:10, dexMax:99, addWis:true},
      atk:[{name:"Shortsword",dmg:"1d6",abil:"DEX"},{name:"Unarmed Strike",dmg:"1d4",abil:"DEX"}],
      equip:["Shortsword","Ten darts","Explorer's pack"],
      features:{1:["Martial Arts (d4)","Unarmored Defense"],2:["Ki (2 points): Flurry of Blows, Patient Defense, Step of the Wind","Unarmored Movement (+10 ft.)"],3:["Monastic Tradition","Deflect Missiles"],4:["Ability Score Improvement","Slow Fall"],5:["Extra Attack","Stunning Strike","Martial Arts (d6)"]}, caster:null},
    {name:"Sorcerer", hd:6, saves:["CON","CHA"], prio:["CHA","CON","DEX","WIS","INT","STR"],
      skills:["Arcana","Deception","Persuasion","Intimidation"], nSkills:2,
      ac:{name:"No armor", base:10, dexMax:99},
      atk:[{name:"Dagger",dmg:"1d4",abil:"DEX"},{name:"Fire Bolt (cantrip)",dmg:"1d10",abil:"CHA",spell:true}],
      equip:["Two daggers","Arcane focus","Dungeoneer's pack"],
      features:{1:["Sorcerous Origin","Spellcasting"],2:["Font of Magic (sorcery points)"],3:["Metamagic (two options)"],4:["Ability Score Improvement"],5:[]}, caster:"full", cAbil:"CHA"},
    {name:"Warlock", hd:8, saves:["WIS","CHA"], prio:["CHA","CON","DEX","WIS","INT","STR"],
      skills:["Arcana","Deception","Intimidation","Investigation"], nSkills:2,
      ac:{name:"Leather armor", base:11, dexMax:99},
      atk:[{name:"Eldritch Blast (cantrip)",dmg:"1d10",abil:"CHA",spell:true},{name:"Dagger",dmg:"1d4",abil:"DEX"}],
      equip:["Leather armor","Two daggers","Arcane focus","Scholar's pack"],
      features:{1:["Otherworldly Patron","Pact Magic: slots recharge on a short rest"],2:["Eldritch Invocations (two)"],3:["Pact Boon"],4:["Ability Score Improvement"],5:[]}, caster:"pact", cAbil:"CHA"}
  ],

  backgrounds: [
    {name:"Soldier", skills:["Athletics","Intimidation"], equip:["Rank insignia","Deck of cards","Common clothes"]},
    {name:"Sage", skills:["Arcana","History"], equip:["Ink and quill","Letter from a dead colleague","Common clothes"]},
    {name:"Criminal", skills:["Deception","Stealth"], equip:["Crowbar","Dark hooded clothes"]},
    {name:"Folk Hero", skills:["Animal Handling","Survival"], equip:["Smith's tools","Shovel","Iron pot"]},
    {name:"Acolyte", skills:["Insight","Religion"], equip:["Prayer book","Incense","Vestments"]},
    {name:"Noble", skills:["History","Persuasion"], equip:["Signet ring","Fine clothes","Scroll of pedigree"]},
    {name:"Entertainer", skills:["Acrobatics","Performance"], equip:["Musical instrument","Costume","Admirer's favor"]},
    {name:"Outlander", skills:["Athletics","Survival"], equip:["Staff","Hunting trap","Traveler's clothes"]},
    {name:"Urchin", skills:["Sleight of Hand","Stealth"], equip:["Small knife","Pet mouse","City map"]},
    {name:"Guild Artisan", skills:["Insight","Persuasion"], equip:["Artisan's tools","Guild letter","Traveler's clothes"]}
  ],

  alignments: ["Lawful Good","Neutral Good","Chaotic Good","Lawful Neutral","True Neutral","Chaotic Neutral","Lawful Evil","Neutral Evil","Chaotic Evil"],

  traits: ["I judge people by their actions, not their words.","I have a joke for every occasion.","I am always calm, no matter the situation.","I pocket anything I see that might have value.","I ask a lot of questions.","I am utterly loyal to my friends.","I get bored easily and crave excitement.","I am suspicious of strangers.","I never back down from a dare.","I quote old proverbs constantly.","I keep meticulous notes on everything.","I talk to animals as if they understand me."],
  ideals: ["Freedom: chains are meant to be broken.","Honor: I never break my word.","Knowledge: understanding is the path to power.","Charity: I give to those in need.","Glory: I must prove myself worthy of song.","Tradition: the old ways must be preserved.","Justice: the guilty must answer for their crimes.","Change: the world must grow, not stagnate."],
  bonds: ["I owe my life to the healer who took me in.","My family's farm was taken; I will get it back.","An old rival still holds something precious of mine.","I protect those who cannot protect themselves.","My mentor vanished; I search for them still.","I carry a keepsake from someone I lost.","My hometown must never learn what I did.","I will repay a debt I can never fully repay."],
  flaws: ["I can't resist a pretty face.","I trust no one, not even my friends.","Gold matters more to me than it should.","I speak before I think.","I run from problems I can't punch.","A secret from my past could ruin me.","I hold grudges forever.","I can't turn down a wager."],

  npcOccupations: ["Blacksmith","Innkeeper","Farmer","Guard captain","Merchant","Herbalist","Fisher","Scribe","Gravedigger","Baker","Stablehand","Priest","Hunter","Tailor","Miner","Rat catcher","Ferryman","Midwife","Cartographer","Beekeeper"],
  npcAppearances: ["Missing two fingers on the left hand","A long scar across the cheek","Bright mismatched eyes","Hair braided with small charms","Always dusted in flour","A limp from an old wound","Extravagant mustache","Ink-stained fingers","A milky blind eye","Unusually tall and stooped","Covered in faded tattoos","Wears a heavy hooded cloak indoors"],
  npcVoices: ["Whispers everything","Booming and cheerful","Painfully slow and deliberate","Talks in questions","Thick regional accent","Constantly clears their throat","Sing-song cadence","Gravelly, like grinding stone","Overly formal","Never finishes a sentence"],
  npcGoals: ["Pay off a crushing debt","Find a missing sibling","Earn the town's respect","Leave and never come back","Protect a dangerous secret","Win someone's heart","Buy back the family land","Become guildmaster","Avenge an old wrong","Just survive the season"],
  npcFears: ["Deep water","The dark of the mines","A creditor's enforcers","Being forgotten","Wolves","Magic of any kind","The local lord's attention","Fire","Sleeping alone","The forest at night"],
  npcSecrets: ["Is deep in debt to a criminal gang","Witnessed a murder and told no one","Is not who they claim to be","Smuggles goods through the cellar","Loves someone they can never tell","Once served a dark cult","Knows where a body is buried","Has a child no one knows about","Is slowly being blackmailed","Found something in the woods they shouldn't have"],
  npcMotivations: ["Greed","Love","Fear","Duty","Revenge","Curiosity","Faith","Ambition","Guilt","Loneliness"],
  npcRelations: ["Friendly and helpful","Suspicious of outsiders","Openly hostile","Wants to hire the party","Terrified of the party","Sees the party as an opportunity","Owes one party member a favor","Will inform on the party to someone"],
  questHooks: ["Livestock keep vanishing near the old mill.","A locked chest washed ashore, ticking softly.","The mayor's son hasn't returned from the hills.","Strange lights burn in the abandoned tower.","A merchant offers good coin for an escort — and lies about the cargo.","Graves in the churchyard have been disturbed.","A child sells 'lucky stones' that are clearly ancient coins.","The wolves have stopped howling. All of them.","A prisoner swears they were framed and can prove it.","An old map turns up in a pawned coat."],
  weather: ["Clear skies","Overcast","Light rain","Heavy rain","Thunderstorm","Dense fog","Strong wind","Drizzle","Snow flurries","Bitter cold","Sweltering heat","Hail"]
};

// Spells by class. Small starter lists — extend with the Content Editor (spells category).
const SPELLS = {
  Wizard:{c:["Fire Bolt","Mage Hand","Prestidigitation","Light"],1:["Magic Missile","Shield","Mage Armor","Sleep","Detect Magic","Burning Hands"],2:["Misty Step","Scorching Ray","Invisibility","Web"],3:["Fireball","Counterspell","Fly"]},
  Cleric:{c:["Sacred Flame","Guidance","Thaumaturgy","Light"],1:["Cure Wounds","Bless","Guiding Bolt","Healing Word","Shield of Faith"],2:["Spiritual Weapon","Lesser Restoration","Hold Person"],3:["Spirit Guardians","Revivify","Dispel Magic"]},
  Bard:{c:["Vicious Mockery","Minor Illusion","Mage Hand"],1:["Healing Word","Dissonant Whispers","Faerie Fire","Charm Person"],2:["Invisibility","Suggestion","Shatter"],3:["Hypnotic Pattern","Dispel Magic"]},
  Druid:{c:["Produce Flame","Druidcraft","Guidance"],1:["Entangle","Cure Wounds","Faerie Fire","Thunderwave"],2:["Moonbeam","Pass Without Trace","Heat Metal"],3:["Call Lightning","Plant Growth"]},
  Sorcerer:{c:["Fire Bolt","Ray of Frost","Prestidigitation","Minor Illusion"],1:["Magic Missile","Shield","Chromatic Orb","Sleep"],2:["Misty Step","Scorching Ray","Mirror Image"],3:["Fireball","Haste"]},
  Warlock:{c:["Eldritch Blast","Minor Illusion","Prestidigitation"],1:["Hex","Armor of Agathys","Charm Person"],2:["Hold Person","Misty Step","Darkness"],3:["Hunger of Hadar","Counterspell"]},
  Paladin:{c:[],1:["Cure Wounds","Bless","Shield of Faith","Divine Favor"],2:["Find Steed","Lesser Restoration"]},
  Ranger:{c:[],1:["Hunter's Mark","Cure Wounds","Ensnaring Strike"],2:["Pass Without Trace","Spike Growth"]}
};

// Spell slots by class level (index 0 = 1st-level slots, etc.)
const SLOTS = {
  full:{1:[2],2:[3],3:[4,2],4:[4,3],5:[4,3,2]},
  half:{1:[],2:[2],3:[3],4:[3],5:[4,2]},
  pact:{1:[1],2:[2],3:[0,2],4:[0,2],5:[0,0,2]} // warlock: all slots are highest level
};
