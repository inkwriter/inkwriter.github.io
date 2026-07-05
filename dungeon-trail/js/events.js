/* ============================================================
   events.js — Regions, random encounters, towns, final dungeon.

   TO ADD A NEW EVENT:
   Copy any object in EVENTS.pool, change the id/title/text,
   and set "region" to one of the region names below (or "Any"
   to let it appear everywhere). Done — app.js finds it.

   EVENT FIELDS:
   - id           unique string
   - title        shown as the event heading
   - region       region name, or "Any"
   - description  the situation shown to the player
   - choices[]    each choice has:
       text            button label
       classBonus      (optional) class name that adds +5 to the roll
       difficulty      (optional) number the d20+bonus must meet.
                       Omit it and the choice ALWAYS succeeds —
                       useful for "safe but costly" options.
       successText     story text on success
       failureText     story text on failure (omit if no difficulty)
       successEffects  stat changes on success
       failureEffects  stat changes on failure

   EFFECT FIELDS (all optional, use negatives to subtract):
   - gold, food, potions, morale   flat resource changes
   - partyHealth                   damage/healing spread randomly
                                   across living members
   - status                        applies a status effect to a
                                   random living member, e.g.
                                   "Poisoned", "Blessed"
   - cureStatus                    removes this status from everyone,
                                   or "All" to cleanse everything
   ============================================================ */

const EVENTS = {

  /* ----------------------------------------------------------
     REGIONS — the journey in order. "from"/"to" are distances.
     Towns appear automatically at each region's "townAt" mark.
     ---------------------------------------------------------- */
  regions: [
    {
      name: "Greenwood Forest",
      from: 0, to: 25, townAt: 18,
      icon: "FOR",
      description: "Sun-dappled and deceptively peaceful. The goblins think so too."
    },
    {
      name: "Blackfen Swamp",
      from: 26, to: 50, townAt: 42,
      icon: "SWP",
      description: "Everything here is wet, smells terrible, and is probably watching you."
    },
    {
      name: "Ashen Mountains",
      from: 51, to: 75, townAt: 66,
      icon: "MTN",
      description: "Thin air, thinner paths, and things with wings circling overhead."
    },
    {
      name: "The Haunted Road",
      from: 76, to: 99, townAt: 88,
      icon: "HNT",
      description: "The last stretch. The dead walk it too — they're just quieter about it."
    }
  ],

  /** Find the region for a given distance. */
  regionFor(distance) {
    return this.regions.find(r => distance >= r.from && distance <= r.to)
      || this.regions[this.regions.length - 1];
  },

  /* ----------------------------------------------------------
     RANDOM ENCOUNTER POOL
     ---------------------------------------------------------- */
  pool: [

    /* ================= GREENWOOD FOREST ================= */
    {
      id: "goblin_ambush",
      title: "Goblin Ambush",
      region: "Greenwood Forest",
      description: "A band of goblins bursts from the trees with rusty blades drawn. One of them is wearing a stolen boot as a hat. They seem serious anyway.",
      choices: [
        {
          text: "Fight them head-on",
          classBonus: "Fighter",
          difficulty: 11,
          successText: "Your fighter holds the line. The goblins flee, dropping loot and the boot-hat.",
          failureText: "The goblins swarm and slash before scattering into the trees, cackling.",
          successEffects: { gold: 12, morale: 3, partyHealth: -5 },
          failureEffects: { partyHealth: -18, morale: -8 }
        },
        {
          text: "Send someone to flank them",
          classBonus: "Rogue",
          difficulty: 11,
          successText: "A blade flashes from the shadows. The goblins decide they have somewhere else to be.",
          failureText: "A twig snaps. The flanker is spotted and barely escapes the pile-on.",
          successEffects: { gold: 8, morale: 4 },
          failureEffects: { partyHealth: -12, morale: -5 }
        },
        {
          text: "Run away",
          successText: "You escape, but a food sack is abandoned in the panic. The goblins cheer.",
          successEffects: { food: -4, morale: -4 }
        }
      ]
    },
    {
      id: "hunting_grounds",
      title: "Rich Hunting Grounds",
      region: "Greenwood Forest",
      description: "Deer tracks everywhere, fat rabbits, a stream full of fish. This glade practically begs you to stay a while and stock the larder.",
      choices: [
        {
          text: "Spend the day hunting",
          classBonus: "Ranger",
          difficulty: 9,
          successText: "The ranger's arrows fly true. The party feasts and packs the rest.",
          failureText: "Hours of crashing through underbrush yields one very smug squirrel. Zero squirrels caught.",
          successEffects: { food: 10, morale: 4 },
          failureEffects: { morale: -3 }
        },
        {
          text: "Forage quickly and move on",
          successText: "Berries and mushrooms — the definitely-not-poisonous kind. Probably.",
          successEffects: { food: 3 }
        }
      ]
    },
    {
      id: "faerie_ring",
      title: "The Faerie Ring",
      region: "Greenwood Forest",
      description: "A perfect circle of white mushrooms glows faintly in a clearing. Tiny laughter comes from nowhere in particular. Every folk tale says walk away. Every folk tale is boring.",
      choices: [
        {
          text: "Study it before touching anything",
          classBonus: "Wizard",
          difficulty: 12,
          successText: "The wizard barters three riddles for a blessing. The fae seem delighted.",
          failureText: "Wrong riddle. The laughter turns mean and someone wakes up cursed.",
          successEffects: { status: "Blessed", morale: 5 },
          failureEffects: { status: "Cursed", morale: -5 }
        },
        {
          text: "Leave an offering of food",
          successText: "The food vanishes. A warm feeling settles over the party. Fair trade.",
          successEffects: { food: -2, morale: 6 }
        },
        {
          text: "Walk around it. Far around it.",
          successText: "The laughter follows you for an hour. Nothing else does. Wise.",
          successEffects: {}
        }
      ]
    },
    {
      id: "bandit_toll",
      title: "The Toll Bridge",
      region: "Greenwood Forest",
      description: "Bandits block the only bridge for miles. Their leader smiles with too few teeth. 'Toll's twenty gold. Or we can discuss... alternatives.'",
      choices: [
        {
          text: "Pay the 20 gold",
          successText: "Gold changes hands. The bandits even wave goodbye. Weirdly polite, really.",
          successEffects: { gold: -20 }
        },
        {
          text: "Talk them down",
          classBonus: "Bard",
          difficulty: 12,
          successText: "Ten minutes later the bandits are laughing, crying, and waving you through for free.",
          failureText: "The joke about the leader's teeth does not land. Blades come out.",
          successEffects: { morale: 6 },
          failureEffects: { partyHealth: -14, gold: -10, morale: -4 }
        },
        {
          text: "Fight through",
          classBonus: "Fighter",
          difficulty: 13,
          successText: "The bandits picked the wrong party. Their toll box is now yours.",
          failureText: "There were more of them behind the trees. Of course there were.",
          successEffects: { gold: 25, partyHealth: -6, morale: 4 },
          failureEffects: { partyHealth: -16, morale: -6 }
        }
      ]
    },
    {
      id: "lost_merchant",
      title: "The Lost Merchant",
      region: "Greenwood Forest",
      description: "A merchant sits on a broken cart wheel, surrounded by crates. 'Wolves took my guards. Not ate — took. Recruited, maybe? Anyway. Help a fellow out?'",
      choices: [
        {
          text: "Escort him to the road",
          classBonus: "Ranger",
          difficulty: 10,
          successText: "You guide him safely back. He pays well and throws in a potion 'for the wolf thing.'",
          failureText: "You get lost together. He bills YOU for wasted time, somehow persuasively.",
          successEffects: { gold: 20, potions: 1, morale: 3 },
          failureEffects: { gold: -5, morale: -3 }
        },
        {
          text: "Buy his 'slightly cursed' surplus stock cheap",
          successText: "Cheap rations and a mystery crate. The crate hums faintly. Best not to ask.",
          successEffects: { gold: -10, food: 8 }
        },
        {
          text: "Wish him luck and keep moving",
          successText: "He shouts increasingly generous offers as you walk away. You do not look back.",
          successEffects: { morale: -1 }
        }
      ]
    },
    {
      id: "river_crossing",
      title: "The Swollen River",
      region: "Greenwood Forest",
      description: "Spring rains have turned the ford into a churning brown torrent. A fallen log spans the narrowest point, slick with moss and bad intentions.",
      choices: [
        {
          text: "Scout for a safer crossing",
          classBonus: "Ranger",
          difficulty: 10,
          successText: "The ranger finds a gravel shallow upstream. Everyone crosses with dry boots.",
          failureText: "Hours wasted, and the 'shallow' turns out to be neck-deep. Supplies get soaked.",
          successEffects: { morale: 2 },
          failureEffects: { food: -4, morale: -4 }
        },
        {
          text: "Cross the mossy log",
          classBonus: "Rogue",
          difficulty: 11,
          successText: "One at a time, arms out, nobody breathe — and you're across.",
          failureText: "Someone slips. The river is cold, fast, and full of judgmental fish.",
          successEffects: { morale: 3 },
          failureEffects: { partyHealth: -10, status: "Exhausted" }
        }
      ]
    },

    /* ================= BLACKFEN SWAMP ================= */
    {
      id: "bog_witch",
      title: "The Bog Witch's Hut",
      region: "Blackfen Swamp",
      description: "A hut on crooked stilts leans over the water. An old woman stirs a cauldron that smells amazing, which in a swamp is deeply suspicious. 'Trade or travel on, dearies.'",
      choices: [
        {
          text: "Trade gold for her 'restorative' stew",
          successText: "The stew heals aches you didn't know you had. She waves as you leave. Nice witch, actually.",
          successEffects: { gold: -15, partyHealth: 15, morale: 4 }
        },
        {
          text: "Ask about the road ahead",
          classBonus: "Bard",
          difficulty: 10,
          successText: "Charmed, she marks safe paths on your map and gifts a potion 'for the pretty one.'",
          failureText: "You bore her. She curses the chattiest party member out of pure spite.",
          successEffects: { potions: 1, morale: 3 },
          failureEffects: { status: "Cursed", morale: -3 }
        },
        {
          text: "Travel on. Rule one: never bother a witch.",
          successText: "She cackles approvingly as you pass. Correct instincts are their own reward.",
          successEffects: { morale: 1 }
        }
      ]
    },
    {
      id: "sinking_path",
      title: "The Sinking Path",
      region: "Blackfen Swamp",
      description: "The trail ahead is dotted with suspiciously smooth patches of ground. One of them just swallowed a passing heron. The heron seemed surprised.",
      choices: [
        {
          text: "Pick a path through the sinkholes",
          classBonus: "Rogue",
          difficulty: 11,
          successText: "Step where I step. Exactly where I step. The party tiptoes through untouched.",
          failureText: "The ground gulps. Two members go waist-deep and the mud does NOT want to let go.",
          successEffects: { morale: 3 },
          failureEffects: { partyHealth: -8, status: "Exhausted", morale: -4 }
        },
        {
          text: "Take the long way around",
          successText: "A full extra day of squelching, but everyone keeps their boots and their dignity.",
          successEffects: { food: -3, morale: -2 }
        }
      ]
    },
    {
      id: "swamp_fever",
      title: "Swamp Fever",
      region: "Blackfen Swamp",
      description: "The mosquitoes here are the size of sparrows and twice as motivated. By nightfall, someone is shivering, sweating, and describing colors that don't exist.",
      choices: [
        {
          text: "Tend to them with prayer and poultice",
          classBonus: "Cleric",
          difficulty: 10,
          successText: "By dawn the fever breaks. The cleric accepts thanks with insufferable modesty.",
          failureText: "The poultice helps the mosquitoes, if anything. The sickness settles in.",
          successEffects: { morale: 3 },
          failureEffects: { status: "Poisoned", morale: -4 }
        },
        {
          text: "Use a potion",
          successText: "One swig and the fever is gone. Expensive, but that's what potions are for.",
          successEffects: { potions: -1, morale: 2 }
        },
        {
          text: "Push through it",
          successText: "They ride in the cart, moaning theatrically. The swamp takes its toll.",
          successEffects: { partyHealth: -8, status: "Exhausted", morale: -3 }
        }
      ]
    },
    {
      id: "will_o_wisps",
      title: "Lights in the Fen",
      region: "Blackfen Swamp",
      description: "Pale blue lights bob over the water, drifting toward a half-sunken ruin. They pulse gently, invitingly. Nothing in a swamp invites you anywhere good. And yet.",
      choices: [
        {
          text: "Follow the lights to the ruin",
          classBonus: "Wizard",
          difficulty: 13,
          successText: "The wizard binds the wisps with a word. They sulk, then reveal a drowned strongbox.",
          failureText: "The lights scatter — and the water beneath you is suddenly much deeper.",
          successEffects: { gold: 30, morale: 5 },
          failureEffects: { partyHealth: -12, morale: -5 }
        },
        {
          text: "Ignore them and make camp",
          successText: "The lights bob sadly all night, like scorned party hosts. You sleep fine.",
          successEffects: { morale: 1 }
        }
      ]
    },
    {
      id: "lizardfolk_hunters",
      title: "Lizardfolk Hunting Party",
      region: "Blackfen Swamp",
      description: "Six lizardfolk rise silently from the reeds, spears leveled. Their leader tilts her head, hissing something that is either a greeting or a dinner order.",
      choices: [
        {
          text: "Attempt diplomacy",
          classBonus: "Bard",
          difficulty: 11,
          successText: "It was a greeting! You trade songs for smoked fish and safe passage.",
          failureText: "It was a dinner order. You correct the misunderstanding at spear-point and flee.",
          successEffects: { food: 6, morale: 5 },
          failureEffects: { partyHealth: -10, morale: -4 }
        },
        {
          text: "Stand and fight",
          classBonus: "Fighter",
          difficulty: 13,
          successText: "They fight well but yield when their leader is bested. They leave tribute — and respect.",
          failureText: "They fight better in the mud. Everything they own is mud.",
          successEffects: { gold: 15, food: 4, partyHealth: -8, morale: 3 },
          failureEffects: { partyHealth: -16, morale: -6 }
        },
        {
          text: "Back away slowly",
          successText: "You retreat and detour through the deep fen. Slow, wet, but unstabbed.",
          successEffects: { food: -3, morale: -2 }
        }
      ]
    },
    {
      id: "drowned_shrine",
      title: "The Drowned Shrine",
      region: "Blackfen Swamp",
      description: "A stone shrine to a forgotten god pokes above the waterline, its altar heavy with waterlogged offerings. Gold glints among the moss. It's not like the god is USING it.",
      choices: [
        {
          text: "Say the proper rites, then take a respectful share",
          classBonus: "Cleric",
          difficulty: 11,
          successText: "The cleric's blessing is accepted. The god, it turns out, appreciates being remembered.",
          failureText: "Wrong god, wrong rites. The temperature drops twenty degrees.",
          successEffects: { gold: 20, status: "Blessed" },
          failureEffects: { status: "Cursed", morale: -5 }
        },
        {
          text: "Grab it all and run",
          classBonus: "Rogue",
          difficulty: 14,
          successText: "Fast hands, faster feet. If the god objects, it can file a complaint.",
          failureText: "The water around the shrine rises with intent. So does everything in it.",
          successEffects: { gold: 35, morale: 3 },
          failureEffects: { partyHealth: -14, status: "Cursed", morale: -6 }
        },
        {
          text: "Leave an offering instead",
          successText: "You add food to the altar. Somewhere, something ancient sighs contentedly.",
          successEffects: { food: -2, morale: 4 }
        }
      ]
    },

    /* ================= ASHEN MOUNTAINS ================= */
    {
      id: "rockslide",
      title: "Rockslide!",
      region: "Ashen Mountains",
      description: "A low rumble becomes a roar. The cliff face above the trail is coming down to meet you, and it's bringing friends.",
      choices: [
        {
          text: "Sprint for the overhang",
          classBonus: "Rogue",
          difficulty: 11,
          successText: "Everyone dives under cover as boulders thunder past. Dusty, alive, exhilarated.",
          failureText: "Almost everyone makes it. The stragglers get clipped by flying stone.",
          successEffects: { morale: 3 },
          failureEffects: { partyHealth: -15, morale: -5 }
        },
        {
          text: "Shield up and weather it",
          classBonus: "Fighter",
          difficulty: 12,
          successText: "The fighter braces, shield high, and the party huddles behind. Loud. Effective.",
          failureText: "The shield holds. The arm holding the shield has complaints.",
          successEffects: { morale: 2 },
          failureEffects: { partyHealth: -12, status: "Wounded" }
        }
      ]
    },
    {
      id: "wyvern_shadow",
      title: "Shadow of the Wyvern",
      region: "Ashen Mountains",
      description: "A vast shadow sweeps across the trail. Above, a wyvern circles, deciding whether your party qualifies as lunch or merely a snack.",
      choices: [
        {
          text: "Hide among the rocks until it passes",
          classBonus: "Rogue",
          difficulty: 10,
          successText: "You become extremely boring rocks. The wyvern loses interest and glides on.",
          failureText: "Someone's cloak flaps. The wyvern makes one low, terrifying pass before leaving.",
          successEffects: { morale: 2 },
          failureEffects: { partyHealth: -10, morale: -5 }
        },
        {
          text: "Drive it off with spell and steel",
          classBonus: "Wizard",
          difficulty: 14,
          successText: "A crack of arcane thunder sends it shrieking into the clouds. It drops a talon. Trophy!",
          failureText: "The wyvern is unimpressed by your light show and says so, with claws.",
          successEffects: { gold: 18, morale: 6 },
          failureEffects: { partyHealth: -18, morale: -6 }
        },
        {
          text: "Abandon the trail and take the low route",
          successText: "A long, cold detour through the ravines. The wyvern keeps its lunch plans open.",
          successEffects: { food: -3, status: "Exhausted" }
        }
      ]
    },
    {
      id: "dwarf_outpost",
      title: "The Dwarven Outpost",
      region: "Ashen Mountains",
      description: "A squat stone waystation, warm light in the windows, the smell of bread and forge-smoke. The dwarves inside eye your party. 'Travelers pay in coin or news.'",
      choices: [
        {
          text: "Pay in news — spin tales of the road",
          classBonus: "Bard",
          difficulty: 10,
          successText: "By the third tale they're refilling your packs for free and calling you 'the good kind of surface folk.'",
          failureText: "Dwarves are a tough crowd. You pay full price AND get heckled.",
          successEffects: { food: 8, morale: 6 },
          failureEffects: { gold: -10, food: 5, morale: -2 }
        },
        {
          text: "Pay in coin, no fuss",
          successText: "Fair prices, hot bread, a night behind stone walls. Sometimes gold is the answer.",
          successEffects: { gold: -12, food: 8, partyHealth: 8, morale: 4 }
        },
        {
          text: "Keep moving — daylight is short",
          successText: "The smell of bread haunts the party for hours. Someone writes a sad poem about it.",
          successEffects: { morale: -2 }
        }
      ]
    },
    {
      id: "frozen_pass",
      title: "The Frozen Pass",
      region: "Ashen Mountains",
      description: "The high pass is a wall of wind and snow. Crossing now saves a day — if the mountain permits it. The mountain has a reputation for not permitting things.",
      choices: [
        {
          text: "Read the weather and cross fast",
          classBonus: "Ranger",
          difficulty: 12,
          successText: "The ranger finds the window between squalls. You crest the pass ahead of schedule!",
          failureText: "The 'window' slams shut halfway. The mountain files you under 'lessons taught.'",
          successEffects: { morale: 5 },
          failureEffects: { partyHealth: -10, food: -4, status: "Exhausted" }
        },
        {
          text: "Camp below and cross at dawn",
          successText: "A cold night, but a clear morning. The mountain approves of patience.",
          successEffects: { food: -2, morale: 1 }
        }
      ]
    },
    {
      id: "abandoned_mine",
      title: "The Abandoned Mine",
      region: "Ashen Mountains",
      description: "A boarded-up mine entrance, warning signs in three languages, and a fourth sign that just says 'NO.' Old miners' tales say the vein was never emptied — just... vacated.",
      choices: [
        {
          text: "Slip in and search for leftover ore",
          classBonus: "Rogue",
          difficulty: 13,
          successText: "Past the collapsed shafts, a forgotten cart still holds silver ore. The 'NO' sign was bluffing.",
          failureText: "The mine is not empty. You don't stop running until sunset. Nobody discusses what was seen.",
          successEffects: { gold: 32, morale: 4 },
          failureEffects: { partyHealth: -12, morale: -7 }
        },
        {
          text: "Respect the sign. The very clear sign.",
          successText: "Something inside knocks twice as you pass, politely, as if to say 'good call.'",
          successEffects: { morale: 1 }
        }
      ]
    },
    {
      id: "mountain_hermit",
      title: "The Mountain Hermit",
      region: "Ashen Mountains",
      description: "An ancient hermit sits outside a cave, brewing tea in the freezing wind, dressed for summer. 'Sit,' he says. 'You look like people carrying more than your packs.'",
      choices: [
        {
          text: "Sit and share tea",
          successText: "The tea tastes like childhood mornings. He says nothing profound, and it helps anyway.",
          successEffects: { morale: 8, partyHealth: 5 }
        },
        {
          text: "Ask him to tend your wounds",
          classBonus: "Cleric",
          difficulty: 9,
          successText: "He and the cleric trade techniques for hours. The party leaves patched and lighter of heart.",
          failureText: "'Hmm. Beyond my herbs,' he admits. The tea is still nice.",
          successEffects: { partyHealth: 14, cureStatus: "Wounded", morale: 3 },
          failureEffects: { morale: 2 }
        },
        {
          text: "Decline politely — the road calls",
          successText: "'It always does,' he says, and returns to his tea. The wind feels colder after.",
          successEffects: { morale: -1 }
        }
      ]
    },

    /* ================= THE HAUNTED ROAD ================= */
    {
      id: "ghost_procession",
      title: "The Ghost Procession",
      region: "The Haunted Road",
      description: "A silent column of translucent soldiers marches down the center of the road, banners tattered, eyes forward. They have been marching for three hundred years. They do not stop for traffic.",
      choices: [
        {
          text: "Offer a blessing for their rest",
          classBonus: "Cleric",
          difficulty: 12,
          successText: "The captain's ghost salutes. A weight lifts from the road — and from the party.",
          failureText: "The prayer falters. The cold of three centuries seeps into someone's bones.",
          successEffects: { status: "Blessed", morale: 7 },
          failureEffects: { status: "Cursed", morale: -5 }
        },
        {
          text: "Stand aside and let them pass",
          successText: "You wait in respectful silence for an hour. The last soldier nods as he fades.",
          successEffects: { morale: 2 }
        },
        {
          text: "Walk through them. They're dead. It's fine.",
          successText: "It is NOT fine. It feels like swimming through someone else's grief.",
          successEffects: { partyHealth: -6, morale: -6 }
        }
      ]
    },
    {
      id: "cursed_battlefield",
      title: "The Cursed Battlefield",
      region: "The Haunted Road",
      description: "Rusted weapons and bleached bones stretch to the horizon — the site of the kingdom's last stand. Fine armor and coin still litter the field. The bones seem... attentive.",
      choices: [
        {
          text: "Salvage armor and coin from the fallen",
          classBonus: "Fighter",
          difficulty: 13,
          successText: "The fighter salutes each body before searching it. The dead permit a soldier's due.",
          failureText: "The bones object. Loudly. With swords. There are SO many bones.",
          successEffects: { gold: 30, morale: 2 },
          failureEffects: { partyHealth: -16, status: "Cursed", morale: -6 }
        },
        {
          text: "Cross quickly, touching nothing",
          successText: "You pick a path between the bones. A thousand empty helms track your passing. Brr.",
          successEffects: { morale: -2 }
        }
      ]
    },
    {
      id: "wailing_inn",
      title: "The Wailing Inn",
      region: "The Haunted Road",
      description: "An inn stands alone on the dead road — windows glowing, music playing, sign creaking. It looks warm. It looks safe. It looks like it shouldn't exist out here, which it shouldn't.",
      choices: [
        {
          text: "Check it for traps and glamours first",
          classBonus: "Rogue",
          difficulty: 12,
          successText: "Real inn! Run by a very lost, very friendly halfling. Best stew of the whole journey.",
          failureText: "The 'inn' is hungry. You fight your way out of the dining room. The dining room fights back.",
          successEffects: { partyHealth: 12, food: 5, morale: 8 },
          failureEffects: { partyHealth: -15, morale: -7 }
        },
        {
          text: "Camp outside instead",
          successText: "You watch the inn all night. Around midnight, it briefly has too many windows.",
          successEffects: { morale: -2 }
        }
      ]
    },
    {
      id: "shadow_stalker",
      title: "The Shadow Stalker",
      region: "The Haunted Road",
      description: "Something has been pacing the party since dusk — a patch of darkness that moves against the wind. It's getting closer each time nobody watches it.",
      choices: [
        {
          text: "Banish it with a warding circle",
          classBonus: "Wizard",
          difficulty: 13,
          successText: "The wizard completes the circle just as it lunges. It dissolves with a sound like tearing silk.",
          failureText: "The circle has a gap. Shadows are extremely good at finding gaps.",
          successEffects: { morale: 6, status: "Inspired" },
          failureEffects: { partyHealth: -14, morale: -6 }
        },
        {
          text: "Keep torches blazing and march through the night",
          successText: "It hates the light. You buy safety with a sleepless, torch-lit slog.",
          successEffects: { status: "Exhausted", morale: -2 }
        }
      ]
    },
    {
      id: "gravekeeper",
      title: "The Last Gravekeeper",
      region: "The Haunted Road",
      description: "An old woman tends graves along the dead road, alone. 'Nobody pays me anymore,' she says. 'I do it so they stay down. Mostly they stay down.' She eyes your supplies.",
      choices: [
        {
          text: "Share your food with her",
          successText: "She eats like it's her first meal in days. In thanks, she marks the graves that DON'T stay down.",
          successEffects: { food: -4, morale: 5, status: "Inspired" }
        },
        {
          text: "Hire her as a guide through the barrows",
          successText: "Worth every coin. She walks you past dangers you never even see.",
          successEffects: { gold: -15, morale: 4, partyHealth: 5 }
        },
        {
          text: "Keep your distance",
          successText: "She shrugs and returns to her digging. You count graves as you pass. You stop counting.",
          successEffects: { morale: -3 }
        }
      ]
    },
    {
      id: "black_carriage",
      title: "The Black Carriage",
      region: "The Haunted Road",
      description: "A lacquered black carriage with no horses rolls to a stop beside you. The door opens by itself. A voice like velvet says: 'Going my way? I do so love company on this dreary road.'",
      choices: [
        {
          text: "Negotiate the terms of the ride. ALL the terms.",
          classBonus: "Bard",
          difficulty: 13,
          successText: "Three hours of contract law later, you ride in style with your souls explicitly excluded from payment.",
          failureText: "You miss a clause. The ride is lovely. The 'gratuity' is not.",
          successEffects: { morale: 6 },
          failureEffects: { gold: -20, morale: -5 }
        },
        {
          text: "Decline. Firmly. While backing away.",
          successText: "'Pity,' says the voice. The carriage rolls on. The road feels lighter once it's gone.",
          successEffects: { morale: 1 }
        }
      ]
    },

    /* ================= ANY REGION ================= */
    {
      id: "wandering_minstrel",
      title: "The Wandering Minstrel",
      region: "Any",
      description: "A traveling minstrel with a battered lute offers to trade: a song and the news of the road for a share of your supper.",
      choices: [
        {
          text: "Share supper and swap songs",
          classBonus: "Bard",
          difficulty: 8,
          successText: "The duet around the campfire becomes the stuff of legend. Spirits soar.",
          failureText: "Musical differences. It gets weirdly competitive. Still a decent evening.",
          successEffects: { food: -2, morale: 8, status: "Inspired" },
          failureEffects: { food: -2, morale: 3 }
        },
        {
          text: "Politely decline",
          successText: "He bows and moves on, playing a song about stingy adventurers. Catchy, unfortunately.",
          successEffects: { morale: -1 }
        }
      ]
    },
    {
      id: "old_shrine",
      title: "A Roadside Shrine",
      region: "Any",
      description: "A small, well-kept shrine sits at a crossroads — candles lit, though no one is around. A worn plaque reads: 'Leave what you can. Take what you need.'",
      choices: [
        {
          text: "Leave a few coins and pray",
          successText: "The candles flare warmly. The next mile feels easier than any before it.",
          successEffects: { gold: -5, morale: 5 }
        },
        {
          text: "Take from the offering box. You DO need it.",
          successText: "The coins are yours. The candles gutter out one by one as you leave. Probably the wind.",
          successEffects: { gold: 12, morale: -6 }
        },
        {
          text: "Tidy the shrine and move on",
          successText: "You sweep the leaves and straighten the candles. A small kindness on a long road.",
          successEffects: { morale: 3 }
        }
      ]
    }
  ],

  /** All events valid for a region name (region-specific + "Any"). */
  poolFor(regionName) {
    return this.pool.filter(e => e.region === regionName || e.region === "Any");
  },

  /* ----------------------------------------------------------
     TOWN — shown when the party reaches each region's townAt
     distance. Prices/amounts are easy to tweak here.
     ---------------------------------------------------------- */
  town: {
    names: [
      "The Prancing Griffon", "Millbrook Village", "Camp Bittercress",
      "The Shrine of Saint Odo", "Cinderpost Waystation", "The Weary Wyrm Inn",
      "Foxhollow Market", "The Lantern Rest"
    ],
    services: [
      { id: "buyFood",  label: "Buy 5 food — 10 gold",        gold: -10, food: 5 },
      { id: "buyPotion", label: "Buy 1 potion — 15 gold",     gold: -15, potions: 1 },
      { id: "rest",     label: "Rest for the night — 20 gold", gold: -20, partyHealth: 10, morale: 8, cureStatus: "Exhausted" },
      { id: "healer",   label: "Visit the healer — 25 gold",   gold: -25, partyHealth: 20, cureStatus: "All" }
    ],
    rumors: [
      "\"The final dungeon? They say the door only opens for the living. Sets a certain tone.\"",
      "\"A party came through last spring, heading the same way. Their bard came back. Just the bard.\"",
      "\"Keep your morale up, travelers. The road doesn't kill most folk — despair does.\"",
      "\"They say whatever waits in that dungeon is patient. It's waited this long, after all.\"",
      "\"Stock potions before the mountains. The mountains take their share of everyone.\"",
      "\"Bless yourselves before the Haunted Road. Or don't. The ghosts appreciate fresh company.\""
    ]
  },

  /* ----------------------------------------------------------
     FINAL DUNGEON — three challenges in sequence.
     Same choice format as regular events.
     ---------------------------------------------------------- */
  finalDungeon: [
    {
      id: "final_entrance",
      title: "The Trapped Entrance",
      description: "The dungeon doors stand open — too open, too welcoming. The threshold gleams with hair-trigger runes and pressure plates. Whoever built this place wanted visitors. In pieces.",
      choices: [
        {
          text: "Disarm the traps, one by one",
          classBonus: "Rogue",
          difficulty: 12,
          successText: "Wire by wire, rune by rune, the entrance is defanged. The dungeon seems almost offended.",
          failureText: "Eleven traps disarmed. The twelfth introduces itself with a wall of darts.",
          successEffects: { morale: 5 },
          failureEffects: { partyHealth: -15, morale: -5 }
        },
        {
          text: "Dispel the runes with counter-magic",
          classBonus: "Wizard",
          difficulty: 12,
          successText: "The wizard unravels the ward-work like a bad sweater. The runes die with a disappointed hiss.",
          failureText: "One rune resists — explosively.",
          successEffects: { morale: 5 },
          failureEffects: { partyHealth: -15, morale: -5 }
        },
        {
          text: "Charge through and trust your armor",
          classBonus: "Fighter",
          difficulty: 14,
          successText: "Sometimes the answer to a clever trap is a fast, heavily armored insult to its designer.",
          failureText: "The traps were designed by someone who anticipated exactly this plan.",
          successEffects: { morale: 6 },
          failureEffects: { partyHealth: -20, morale: -6 }
        }
      ]
    },
    {
      id: "final_altar",
      title: "The Cursed Altar",
      description: "The inner hall holds a black altar, thick with wrongness. Every torch dims near it. To pass, its power must be broken, endured, or bargained with — and it is listening.",
      choices: [
        {
          text: "Consecrate the altar",
          classBonus: "Cleric",
          difficulty: 13,
          successText: "Holy words crack the black stone. Light floods the hall — and hope floods the party.",
          failureText: "The altar drinks the prayer and asks for seconds. The cold that follows is personal.",
          successEffects: { morale: 8, status: "Blessed", cureStatus: "Cursed" },
          failureEffects: { partyHealth: -12, status: "Cursed", morale: -6 }
        },
        {
          text: "Sing against the darkness",
          classBonus: "Bard",
          difficulty: 13,
          successText: "The bard's song fills the hall until there is no room left for despair. The altar falls silent.",
          failureText: "The altar harmonizes. In a minor key. It's deeply unsettling and mildly damaging.",
          successEffects: { morale: 10, status: "Inspired" },
          failureEffects: { partyHealth: -10, morale: -6 }
        },
        {
          text: "Sprint past. Don't look at it. DON'T look at it.",
          successText: "You make it past — but its whispers cling like smoke, and everyone heard their name.",
          successEffects: { morale: -8, partyHealth: -5 }
        }
      ]
    },
    {
      id: "final_boss",
      title: "The Keeper of the Last Dungeon",
      description: "In the deepest chamber, it rises — the thing every rumor circled and no survivor described. It regards your battered, road-worn party and speaks: 'So few have come so far. Show me why.'",
      choices: [
        {
          text: "Meet it blade to blade",
          classBonus: "Fighter",
          difficulty: 14,
          successText: "Steel rings against shadow in a duel the bards will get wrong for centuries. Your blade lands true.",
          failureText: "It is faster than anything has a right to be. The party pays in blood before rallying for one last stand...",
          successEffects: { morale: 10 },
          failureEffects: { partyHealth: -25, morale: -10 }
        },
        {
          text: "Unleash everything the wizard has left",
          classBonus: "Wizard",
          difficulty: 14,
          successText: "Every scroll, every spell, every trick — released at once. The chamber goes white. The Keeper does not get up.",
          failureText: "It walks through the barrage like rain. The backlash alone nearly finishes the party...",
          successEffects: { morale: 10 },
          failureEffects: { partyHealth: -25, morale: -10 }
        },
        {
          text: "Answer it: tell the story of your journey",
          classBonus: "Bard",
          difficulty: 15,
          successText: "You tell it everything — the goblins, the swamp, the ghosts, the graves. It listens. And, satisfied at last, it lets go.",
          failureText: "It finds the tale wanting. The critique is delivered with claws...",
          successEffects: { morale: 12 },
          failureEffects: { partyHealth: -25, morale: -10 }
        }
      ]
    }
  ]
};
