// ============================================================================
// GAME CONSTANTS
// ============================================================================
const LEVEL_UP_XP = 100;
const LEVEL_UP_HP_GAIN = 5;
const MAX_HP = 100;

// ============================================================================
// GAME STATE
// ============================================================================
let gameState = {
    playerName: "Unknown",
    class: null,
    xp: 0,
    hp: 20,
    maxHp: 20,
    level: 1,
    stats: { attack: 0, defense: 0, speed: 0 },
    baseAC: 10,
    gold: 100,
    inventory: [
        { name: "healingPotion", quantity: 2 },
        { name: "shortSword", quantity: 1 },
        { name: "poisonVial", quantity: 1 }
    ],
    equipped: { weapon: null, helmet: null, chest: null, legs: null, boots: null },
    ability: null,
    abilityCooldown: 0,
    poisonStacks: [],
    bleedStacks: []
};

let combatState = {
    active: false,
    turn: "player",
    currentEnemy: null,
    log: []
};

// ============================================================================
// DATA
// ============================================================================
const classes = {
    warrior: {
        stats: { attack: 5, defense: 3, speed: 1 },
        levelUpBonuses: { attack: 2, defense: 1, speed: 0 },
        ability: {
            name: "Cleave",
            cooldown: 2,
            effect: (user, target) => {
                const dmg = rollDamage("1d10") + user.stats.attack;
                target.hp -= dmg;
                return `${user.playerName} uses Cleave, dealing ${dmg} damage!`;
            }
        }
    },
    rogue: {
        stats: { attack: 3, defense: 1, speed: 5 },
        levelUpBonuses: { attack: 1, defense: 0, speed: 2 },
        ability: {
            name: "Backstab",
            cooldown: 2,
            effect: (user, target) => {
                const dmg = rollDamage("1d6") + user.stats.attack + 2;
                target.hp -= dmg;
                return `${user.playerName} uses Backstab, striking for ${dmg} damage!`;
            }
        }
    },
    guardian: {
        stats: { attack: 3, defense: 5, speed: 1 },
        levelUpBonuses: { attack: 1, defense: 2, speed: 0 },
        ability: {
            name: "Shield Bash",
            cooldown: 2,
            effect: (user, target) => {
                const dmg = rollDamage("1d6") + user.stats.attack;
                target.hp -= dmg;
                target.stunTurns = 1;
                return `${user.playerName} uses Shield Bash, dealing ${dmg} damage and stunning ${target.name}!`;
            }
        }
    }
};

const enemies = {
    bandit: {
        name: "Bandit",
        hp: 12,
        stats: { attack: 2, speed: 3, defense: 2 },
        goldReward: 10,
        xpReward: 20,
        image: "assets/img_folder/enemies/bandit.jpeg",
        damage: "1d4",
        weapon: "shortSword",
        abilities: [
            { name: "slash", weight: 50 },
            { name: "kick", weight: 30 },
            { name: "taunt", weight: 20 }
        ],
        loot: { common: ["wolfPelt", 50], rare: ["dagger", 10] }
    },
    wolves: {
        name: "Wolves",
        hp: 15,
        stats: { attack: 3, speed: 5, defense: 1 },
        goldReward: 5,
        xpReward: 25,
        image: "assets/img_folder/enemies/wolves.jpg",
        damage: "1d6",
        weapon: null,
        abilities: [
            { name: "bite", weight: 50 },
            { name: "venomousSpit", weight: 30 },
            { name: "howl", weight: 20 }
        ],
        loot: { common: ["wolfPelt", 80], rare: ["cloak", 5] }
    },
    thief: {
        name: "Thief",
        hp: 10,
        stats: { attack: 2, speed: 6, defense: 2 },
        goldReward: 150,
        xpReward: 15,
        image: "assets/img_folder/enemies/thief.jpg",
        damage: "1d8",
        weapon: "dagger",
        abilities: [
            { name: "stab", weight: 50 },
            { name: "evade", weight: 30 },
            { name: "steal", weight: 20 }
        ],
        loot: { common: ["raregem", 40], rare: ["swiftBoots", 8] }
    },
    trickster: {
        name: "Trickster",
        hp: 8,
        stats: { attack: 7, speed: 10, defense: 1 },
        goldReward: 20,
        xpReward: 80,
        image: "assets/img_folder/enemies/trickster.jpg",
        damage: "1d8",
        weapon: "dagger",
        abilities: [
            { name: "stab", weight: 50 },
            { name: "feint", weight: 30 },
            { name: "pocketSand", weight: 20 }
        ],
        loot: { common: ["pocketSand", 60], rare: ["sharpeningStone", 15] }
    },
    bountyHunter: {
        name: "Bounty Hunter",
        hp: 20,
        stats: { attack: 6, speed: 4, defense: 7 },
        goldReward: 25,
        xpReward: 35,
        image: "assets/img_folder/enemies/bountyHunter.jpg",
        damage: "1d8",
        weapon: "bow",
        abilities: [
            { name: "cripplingShot", weight: 40 },
            { name: "bash", weight: 30 },
            { name: "rally", weight: 30 }
        ],
        loot: { common: ["wolfpelt", 50], rare: ["shortSword", 20] }
    },
    hoshiTheSloth: {
        name: "hoshiTheSloth",
        hp: 50,
        stats: { attack: 15, defense: 1, speed: 9 },
        goldReward: 1000,
        xpReward: 50,
        image: "assets/img_folder/enemies/hoshiTheSloth.jpg",
        damage: "1d10",
        weapon: "dagger",
        abilities: [
            { name: "stab", weight: 40 },
            { name: "evade", weight: 40 }
        ],
        loot: { 
            common: [
                { item: "campRations", chance: 50 },
                { item: "campRations", chance: 50 },
                { item: "campRations", chance: 50 },
                { item: "campRations", chance: 50 },
                { item: "campRations", chance: 50 },
                { item: "campRations", chance: 50 }
            ], 
            rare: [{ item: "throwingKnife", chance: 10 }]
        }
    },
    valonTheImmortal: {
        name: "valonTheImmortal",
        hp: 50,
        stats: { attack: 6, defense: 15, speed: 9 },
        goldReward: 1000,
        xpReward: 50,
        image: "assets/img_folder/enemies/valonTheImmortal.jpg",
        damage: "1d10",
        weapon: "longsword",
        abilities: [
            { name: "charge", weight: 40 },
            { name: "block", weight: 40 },
            { name: "rally", weight: 20 }
        ],
        loot: { common: [{ item: "chainmail", chance: 50 }], rare: [{ item: "throwingKnife", chance: 10 }] }
    },
    dirtyDave: {
        name: "dirtyDave",
        hp: 50,
        stats: { attack: 10, defense: 1, speed: 15 },
        goldReward: 1000,
        xpReward: 50,
        image: "assets/img_folder/enemies/dirtyDave.jpg",
        damage: "1d10",
        weapon: "dagger",
        abilities: [
            { name: "slash", weight: 40 },
            { name: "evade", weight: 20 }
        ],
        loot: { 
            common: [
                { item: "dagger", chance: 50 },
                { item: "pocketSand", chance: 50 },
                { item: "silverRing", chance: 50 }
            ], 
            rare: [{ item: "throwingKnife", chance: 10 }]
        }
    }
};

const boss = {
    banditKing: {
        name: "Bandit King",
        hp: 50,
        stats: { attack: 6, speed: 5, defense: 5 },
        goldReward: 100,
        xpReward: 150,
        image: "assets/img_folder/enemies/banditKing.jpeg",
        damage: "1d10",
        weapon: "longsword",
        abilities: [
            { name: "charge", weight: 40 },
            { name: "rally", weight: 30 }
        ],
        loot: { common: ["wolfpelt", 80], rare: ["longsword", 50] }
    }
};

const equipment = {
    shortSword: { 
        type: "weapon", 
        boxtype: "weapon", 
        damage: "1d6", 
        attack: 1, 
        defense: 0, 
        speed: 0, 
        price: 20, 
        description: "A lightweight sword, perfect for quick strikes."
    },
    longsword: { 
        type: "weapon", 
        boxtype: "weapon", 
        damage: "1d8", 
        attack: 2, 
        defense: 0, 
        speed: -1, 
        price: 30, 
        description: "A heavy blade that deals significant damage."
    },
    dagger: { 
        type: "weapon", 
        boxtype: "weapon", 
        damage: "1d4", 
        attack: 0, 
        defense: 0, 
        speed: 2, 
        price: 15, 
        bleedChance: 30, 
        description: "A small blade with a chance to cause bleeding."
    },
    bow: { 
        type: "weapon", 
        boxtype: "weapon", 
        damage: "1d6", 
        attack: 1, 
        defense: 0, 
        speed: 1, 
        price: 25, 
        description: "A ranged weapon for precise attacks."
    },
    leatherHelmet: { 
        type: "helmet", 
        boxtype: "armor", 
        attack: 0, 
        defense: 1, 
        speed: 0, 
        price: 15, 
        description: "A light helmet made of tanned leather."
    },
    leatherChest: { 
        type: "chest", 
        boxtype: "armor", 
        attack: 0, 
        defense: 2, 
        speed: 0, 
        price: 25, 
        description: "Flexible leather armor for the torso."
    },
    leatherLegs: { 
        type: "legs", 
        boxtype: "armor", 
        attack: 0, 
        defense: 1, 
        speed: 0, 
        price: 20, 
        description: "Leather greaves for leg protection."
    },
    leatherBoots: { 
        type: "boots", 
        boxtype: "armor", 
        attack: 0, 
        defense: 0, 
        speed: 1, 
        price: 15, 
        description: "Sturdy leather boots that enhance mobility."
    },
    chainHelmet: { 
        type: "helmet", 
        boxtype: "armor", 
        attack: 0, 
        defense: 2, 
        speed: -1, 
        price: 30, 
        description: "A chainmail coif offering solid protection."
    },
    chainChest: { 
        type: "chest", 
        boxtype: "armor", 
        attack: 0, 
        defense: 4, 
        speed: -1, 
        price: 50, 
        description: "Heavy chainmail armor for the chest."
    },
    chainLegs: { 
        type: "legs", 
        boxtype: "armor", 
        attack: 0, 
        defense: 2, 
        speed: -1, 
        price: 35, 
        description: "Chainmail leggings for enhanced defense."
    },
    swiftBoots: { 
        type: "boots", 
        boxtype: "armor", 
        attack: 0, 
        defense: 0, 
        speed: 3, 
        price: 40, 
        description: "Enchanted boots that greatly increase speed."
    },
    plateHelmet: { 
        type: "helmet", 
        boxtype: "armor", 
        attack: 0, 
        defense: 3, 
        speed: -2, 
        price: 50, 
        description: "A heavy plate helm for maximum protection."
    },
    plateChest: { 
        type: "chest", 
        boxtype: "armor", 
        attack: 0, 
        defense: 6, 
        speed: -2, 
        price: 80, 
        description: "Bulky plate armor for the torso."
    },
    plateLegs: { 
        type: "legs", 
        boxtype: "armor", 
        attack: 0, 
        defense: 3, 
        speed: -2, 
        price: 60, 
        description: "Plate greaves for superior defense."
    },
    leatherArms: { 
        type: "arms", 
        boxtype: "armor", 
        attack: 0, 
        defense: 1, 
        speed: 0, 
        price: 15, 
        description: "Light leather bracers for arm protection."
    },
    chainArms: { 
        type: "arms", 
        boxtype: "armor", 
        attack: 0, 
        defense: 2, 
        speed: -1, 
        price: 30, 
        description: "Chainmail vambraces offering sturdy arm defense."
    },
    plateArms: { 
        type: "arms", 
        boxtype: "armor", 
        attack: 0, 
        defense: 3, 
        speed: -2, 
        price: 50, 
        description: "Heavy plate gauntlets for superior arm protection."
    },
    spikedBracers: { 
        type: "arms", 
        boxtype: "armor", 
        attack: 1, 
        defense: 1, 
        speed: 0, 
        price: 25, 
        description: "Leather bracers with metal spikes, useful for counterattacks."
    },
    shield: { 
        type: "weapon", 
        boxtype: "weapon", 
        damage: "1d4", 
        attack: 0, 
        defense: 2, 
        speed: -1, 
        price: 30, 
        description: "A sturdy wooden shield, good for blocking and bashing."
    },
    battleAxe: { 
        type: "weapon", 
        boxtype: "weapon", 
        damage: "1d10", 
        attack: 3, 
        defense: 0, 
        speed: -2, 
        price: 40, 
        bleedChance: 20, 
        description: "A heavy axe that cleaves through armor, with a chance to cause bleeding."
    },
    crossbow: { 
        type: "weapon", 
        boxtype: "weapon", 
        damage: "1d8", 
        attack: 2, 
        defense: 0, 
        speed: 0, 
        price: 35, 
        description: "A powerful ranged weapon with high accuracy."
    },
    paddedCloak: { 
        type: "chest", 
        boxtype: "armor", 
        attack: 0, 
        defense: 1, 
        speed: 1, 
        price: 20, 
        description: "A thick cloak offering light protection and mobility."
    },
    ironBoots: { 
        type: "boots", 
        boxtype: "armor", 
        attack: 1, 
        defense: 1, 
        speed: -1, 
        price: 25, 
        description: "Reinforced boots for kicking and stability."
    },
    scoutCap: { 
        type: "helmet", 
        boxtype: "armor", 
        attack: 0, 
        defense: 0, 
        speed: 2, 
        price: 20, 
        description: "A lightweight cap designed for quick movement."
    }
};

const items = {
    healingPotion: {
        effect: (user) => {
            user.hp = Math.min(MAX_HP, user.hp + 15);
            return `${user.playerName} uses a Healing Potion, restoring 15 HP!`;
        },
        price: 10,
        description: "Restores 15 HP when used."
    },
    bomb: {
        effect: (user, target) => {
            const dmg = rollDamage("2d6");
            target.hp -= dmg;
            return `${user.playerName} throws a Bomb, dealing ${dmg} damage!`;
        },
        price: 20,
        description: "Deals 2d6 damage to an enemy."
    },
    poisonDart: {
        effect: (user, target) => {
            if (target.poisonStacks.length < 5) {
                target.poisonStacks.push(1);
                return `${user.playerName} fires a Poison Dart—${target.name} gains a poison stack (${target.poisonStacks.length}/5)!`;
            }
            return `${user.playerName} fires a Poison Dart, but ${target.name} is already at max poison stacks!`;
        },
        price: 15,
        description: "Applies one poison stack to an enemy."
    },
    poisonVial: {
        effect: (user, target) => {
            const stacksToAdd = Math.min(2, 5 - target.poisonStacks.length);
            if (stacksToAdd > 0) {
                for (let i = 0; i < stacksToAdd; i++) {
                    target.poisonStacks.push(1);
                }
                return `${user.playerName} throws a Poison Vial, applying ${stacksToAdd} poison stack${stacksToAdd > 1 ? "s" : ""} (${target.poisonStacks.length}/5)!`;
            }
            return `${user.playerName} throws a Poison Vial, but ${target.name} is already at max poison stacks!`;
        },
        price: 25,
        description: "Applies up to two poison stacks to an enemy."
    },
    sharpeningStone: {
        effect: (user) => {
            user.sharpenTurns = 3;
            return `${user.playerName} uses a Sharpening Stone (+2 attack for 3 turns)!`;
        },
        price: 10,
        description: "Increases attack by 2 for 3 turns."
    },
    bearTrap: {
        effect: (user, target) => {
            target.trapTurns = 2;
            target.stats.speed = 0;
            return `${user.playerName} sets a Bear Trap—${target.name} is immobilized!`;
        },
        price: 25,
        description: "Immobilizes an enemy for 2 turns."
    },
    pocketSand: {
        effect: (user, target) => {
            target.blindTurns = 1;
            return `${user.playerName} tosses Pocket Sand—${target.name} is distracted!`;
        },
        price: 5,
        description: "Distracts an enemy for 1 turn."
    },
    wolfPelt: { 
        effect: () => "A pelt from a wolf—good for trading.", 
        price: 0, 
        sellPrice: 8, 
        description: "A wolf pelt, valuable for trading."
    },
    rareGem: { 
        effect: () => "A valuable gemstone—rare and precious.", 
        price: 0, 
        sellPrice: 50, 
        description: "A rare gemstone, highly valuable."
    },
    throwingKnife: {
        effect: (user, target) => {
            const dmg = rollDamage("1d4");
            target.hp -= dmg;
            if (target.bleedStacks.length < 3) {
                target.bleedStacks.push({ damage: 3, turns: 3 });
                return `${user.playerName} throws a Throwing Knife for ${dmg} damage, causing ${target.name} to bleed (${target.bleedStacks.length}/3)!`;
            }
            return `${user.playerName} throws a Throwing Knife for ${dmg} damage, but ${target.name} is already at max bleed stacks!`;
        },
        price: 20,
        sellPrice: 10,
        description: "Deals 1d4 damage and may cause bleeding."
    }
};

const enemyAbilities = {
    steal: (user, target) => {
        target.gold = Math.max(0, target.gold - 5);
        return `${user.name} steals 5 gold from you!`;
    },
    bite: (user, target) => {
        const dmg = rollDamage("1d4");
        target.hp -= dmg;
        return `${user.name} bites you for ${dmg} extra damage!`;
    },
    evade: (user) => {
        user.evadeTurns = 1;
        return `${user.name} prepares to evade (+2 AC for 1 turn)!`;
    },
    charge: (user, target) => {
        const dmg = rollDamage("1d6") + user.stats.attack;
        target.hp -= dmg;
        return `${user.name} charges, dealing ${dmg} bonus damage!`;
    },
    slash: (user, target) => {
        const dmg = rollDamage(user.damage) + user.stats.attack;
        target.hp -= dmg;
        let poisonMessage = "";
        if (rollDice(100) <= 20 && target.poisonStacks.length < 5) {
            target.poisonStacks.push(1);
            poisonMessage = ` and applies a poison stack (${target.poisonStacks.length}/5)`;
        }
        return `${user.name} slashes for ${dmg} damage${poisonMessage}!`;
    },
    howl: (user, target) => {
        target.attackReduction = 1;
        target.attackReductionTurns = 2;
        return `${user.name} howls, reducing your attack by 1 for 2 turns!`;
    },
    ambush: (user) => {
        user.speedBonus = 2;
        user.speedBonusTurns = 1;
        return `${user.name} prepares an ambush (+2 speed this turn)!`;
    },
    disarm: (user, target) => {
        if (rollDice(100) <= 10 && target.equipped.weapon) {
            const weapon = target.equipped.weapon;
            target.stats.attack -= equipment[weapon].attack;
            target.stats.defense -= equipment[weapon].defense;
            target.stats.speed -= equipment[weapon].speed;
            target.equipped.weapon = null;
            addToInventory(weapon);
            return `${user.name} disarms you, dropping your ${formatItemName(weapon)}!`;
        }
        return `${user.name} tries to disarm you but fails!`;
    },
    taunt: (user, target) => {
        target.tauntTurns = 1;
        return `${user.name} taunts you, forcing your next attack!`;
    },
    sneak: (user, target) => {
        const dmg = rollDamage(user.damage) + user.stats.attack;
        target.hp -= dmg;
        return `${user.name} sneaks in a free attack for ${dmg} damage!`;
    },
    frenzy: (user) => {
        user.frenzyBonus = (user.frenzyBonus || 0) + 1;
        user.frenzyBonus = Math.min(user.frenzyBonus, 3);
        return `${user.name} enters a frenzy (+${user.frenzyBonus} attack)!`;
    },
    pounce: (user, target) => {
        const dmg = user.stats.speed > target.stats.speed ? rollDamage(user.damage) * 2 + user.stats.attack : rollDamage(user.damage) + user.stats.attack;
        target.hp -= dmg;
        return `${user.name} pounces for ${dmg} damage!`;
    },
    ravage: (user, target) => {
        const dmg1 = Math.floor(rollDamage(user.damage) / 2) + user.stats.attack;
        const dmg2 = Math.floor(rollDamage(user.damage) / 2) + user.stats.attack;
        target.hp -= (dmg1 + dmg2);
        return `${user.name} ravages you for ${dmg1} and ${dmg2} damage!`;
    },
    block: (user) => {
        user.blockBonus = 2;
        user.blockTurns = 1;
        return `${user.name} prepares to block (-2 damage taken this turn)!`;
    },
    counter: (user, target) => {
        const dmg = rollDice(4);
        target.hp -= dmg;
        return `${user.name} counters for ${dmg} damage!`;
    },
    lunge: (user, target) => {
        const dmg = rollDamage(user.damage) + user.stats.attack - Math.floor(target.stats.defense / 2);
        target.hp -= dmg;
        return `${user.name} lunges, ignoring half defense for ${dmg} damage!`;
    },
    intimidate: (user, target) => {
        target.speedReduction = 2;
        target.speedReductionTurns = 2;
        return `${user.name} intimidates you, lowering speed by 2 for 2 turns!`;
    },
    feint: (user) => {
        user.feintBonus = 2;
        user.feintTurns = 1;
        return `${user.name} feints (+2 to hit next attack)!`;
    },
    roar: (user, target) => {
        if (rollDice(100) <= 10) {
            target.stunTurns = 1;
            return `${user.name} roars, stunning you!`;
        }
        return `${user.name} roars but you resist!`;
    },
    cripple: (user, target) => {
        target.stats.speed = Math.max(0, target.stats.speed - 1);
        return `${user.name} cripples you, reducing speed by 1 permanently!`;
    },
    bash: (user, target) => {
        const dmg = rollDamage("1d6") + user.stats.attack;
        target.hp -= dmg;
        if (rollDice(100) <= 20) target.stunTurns = 1;
        return `${user.name} bashes for ${dmg} damage${target.stunTurns > 0 ? " and stuns you!" : ""}!`;
    },
    sweep: (user, target) => {
        const dmg = Math.floor(rollDamage(user.damage) / 2) + user.stats.attack;
        target.hp -= dmg;
        return `${user.name} sweeps for ${dmg} damage!`;
    },
    gouge: (user, target) => {
        const dmg = rollDamage("1d8") + user.stats.attack;
        target.hp -= dmg;
        if (rollDice(100) <= 15) target.blindTurns = 1;
        return `${user.name} gouges for ${dmg} damage${target.blindTurns > 0 ? " and blinds you!" : ""}!`;
    },
    stab: (user, target) => {
        const dmg = rollDamage(user.damage) + user.stats.attack;
        target.hp -= dmg;
        return `${user.name} stabs for ${dmg} damage!`;
    },
    kick: (user, target) => {
        const dmg = rollDice(4);
        target.hp -= dmg;
        if (rollDice(100) <= 25) {
            target.speedReduction = 1;
            target.speedReductionTurns = 2;
            return `${user.name} kicks you for ${dmg} damage and slows you!`;
        }
        return `${user.name} kicks you for ${dmg} damage!`;
    },
    pocketSand: (user, target) => {
        target.blindTurns = 1;
        return `${user.name} throws pocket sand, distracting you!`;
    },
    cripplingShot: (user, target) => {
        const dmg = rollDamage("1d6") + user.stats.attack;
        target.hp -= dmg;
        if (rollDice(100) <= 20 && target.bleedStacks.length < 3) {
            target.bleedStacks.push({ damage: 3, turns: 3 });
            return `${user.name} fires a crippling shot for ${dmg} damage, causing you to bleed (${target.bleedStacks.length}/3)!`;
        }
        return `${user.name} fires a crippling shot for ${dmg} damage!`;
    },
    venomousSpit: (user, target) => {
        const dmg = rollDice(4);
        target.hp -= dmg;
        if (target.poisonStacks.length < 5) {
            target.poisonStacks.push(1);
            return `${user.name} spits venom for ${dmg} damage, poisoning you (${target.poisonStacks.length}/5)!`;
        }
        return `${user.name} spits venom for ${dmg} damage!`;
    },
    rally: (user) => {
        user.attackBonus = (user.attackBonus || 0) + 2;
        user.attackBonusTurns = 2;
        return `${user.name} rallies, gaining +2 attack for 2 turns!`;
    }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function rollDice(sides) {
    return Math.floor(Math.random() * sides) + 1;
}

function formatItemName(itemName) {
    if (!itemName || typeof itemName !== "string") return itemName || "Unknown Item";
    const words = itemName.replace(/([a-z])([A-Z])/g, "$1 $2").split(" ");
    return words
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
}

function rollDamage(damageString) {
    if (!damageString || typeof damageString !== "string") {
        console.warn("Invalid damageString, using default 1d4:", damageString);
        return rollDice(4); // Default to 1d4 if undefined or invalid
    }
    const match = damageString.match(/(\d+)d(\d+)/);
    if (!match) {
        console.warn("Damage string format invalid, using default 1d4:", damageString);
        return rollDice(4); // Default to 1d4 if format is wrong
    }
    const [_, numDice, sides] = match;
    return Array.from({ length: parseInt(numDice) }, () => rollDice(parseInt(sides))).reduce((a, b) => a + b, 0);
}

function savePlayerData() {
    const dataToSave = JSON.stringify(gameState);
    console.log("Saving to localStorage:", dataToSave);
    localStorage.setItem("gameState", dataToSave);
    console.log("Game saved");
}

function resetGame() {
    // Reset gameState to default values
    gameState = {
        playerName: "",
        class: "",
        level: 1,
        xp: 0,
        nextLevelXp: 100,
        gold: 0,
        stats: {
            hp: 20,
            maxhp: 20,
            attack: 1,
            defense: 1,
            speed: 1,
            critChance: 5
        },
        inventory: [],
        equipped: {
            weapon: null,
            head: null,
            chest: null,
            arms: null,
            legs: null,
            boots: null
        },
        forestKills: 0,
        bossKills: 0
    };

    // Reset combatState
    combatState = {
        active: false,
        currentEnemy: null,
        turn: "player"
    };

    // Clear all relevant localStorage keys
    localStorage.removeItem("playerData");
    localStorage.removeItem("lastActionMessage"); // Clear any additional keys
    // Add other keys if used, e.g., localStorage.removeItem("someOtherKey");

    // Do NOT call savePlayerData here, as it would save the reset state unnecessarily
}

// Event listener for restartBtn
const restartBtn = document.getElementById("restartBtn");
if (restartBtn) {
    restartBtn.addEventListener("click", () => {
        resetGame();
        // Ensure reset is complete before redirecting
        setTimeout(() => {
            window.location.href = "index.html"; // Redirect to starting page
        }, 100); // Small delay to ensure localStorage operations complete
    });
}

function loadPlayerData() {
    const savedData = localStorage.getItem("gameState");
    if (savedData) {
        gameState = JSON.parse(savedData);
        console.log("Loaded gameState:", JSON.stringify(gameState, null, 2));

        // Validate inventory
        if (!Array.isArray(gameState.inventory)) {
            gameState.inventory = [];
        }

        // Validate equipped items
        if (!gameState.equipped || typeof gameState.equipped !== "object") {
            gameState.equipped = {
                weapon: null,
                helmet: null,
                chest: null,
                arms: null,
                legs: null,
                boots: null
            };
        } else {
            // Ensure equipped weapon is valid
            if (gameState.equipped.weapon && !equipment[gameState.equipped.weapon.name]) {
                console.warn("Invalid equipped weapon, resetting:", gameState.equipped.weapon);
                gameState.equipped.weapon = null;
            }
        }

        // Validate stats and health
        if (!gameState.stats || typeof gameState.stats !== "object") {
            gameState.stats = {
                hp: 20,
                maxHp: 20,
                attack: 1,
                defense: 1,
                speed: 1,
                critChance: 5
            };
        } else {
            gameState.hp = Math.max(1, gameState.hp || 20); // Use gameState.hp directly
            gameState.maxHp = Math.max(1, gameState.maxHp || 20);
            if (gameState.hp > gameState.maxHp) {
                gameState.hp = gameState.maxHp;
            }
        }

        // Validate class and apply stats
        if (gameState.class && classes[gameState.class]) {
            const classData = classes[gameState.class];
            let baseStats = {
                attack: classData.stats.attack || 0,
                defense: classData.stats.defense || 0,
                speed: classData.stats.speed || 0
            };

            // Apply equipment bonuses
            for (const slot in gameState.equipped) {
                if (gameState.equipped[slot] && equipment[gameState.equipped[slot].name]) {
                    baseStats.attack += gameState.equipped[slot].attack || 0;
                    baseStats.defense += gameState.equipped[slot].defense || 0;
                    baseStats.speed += gameState.equipped[slot].speed || 0;
                }
            }

            // Apply level-up bonuses
            const levelBonusCount = Math.max(0, gameState.level - 1);
            const bonuses = classData.levelUpBonuses || { attack: 0, defense: 0, speed: 0 };
            baseStats.attack += levelBonusCount * bonuses.attack;
            baseStats.defense += levelBonusCount * bonuses.defense;
            baseStats.speed += levelBonusCount * bonuses.speed;

            // Update stats, preserving hp and maxHp
            gameState.stats = {
                ...baseStats,
                hp: gameState.hp,
                maxHp: gameState.maxHp,
                critChance: gameState.stats.critChance || 5
            };

            gameState.ability = classData.ability;
        }

        gameState.bleedStacks = gameState.bleedStacks || [];
        gameState.poisonStacks = gameState.poisonStacks || [];
        gameState.abilityCooldown = gameState.abilityCooldown || 0;
    } else {
        console.log("No saved data, using default gameState:", JSON.stringify(gameState, null, 2));
        // Ensure default stats if no saved data
        if (!gameState.stats) {
            gameState.stats = {
                hp: 20,
                maxHp: 20,
                attack: 1,
                defense: 1,
                speed: 1,
                critChance: 5
            };
        }
        gameState.hp = gameState.stats.hp;
        gameState.maxHp = gameState.stats.maxHp;
    }

    updateUI();
    console.log("Final loaded stats:", gameState.stats);
}

function calculateAC(entity) {
    const baseAC = entity.baseAC || 10;
    const speedBonus = Math.floor(((entity.stats.speed || 0) + (entity.speedBonus || 0)) / 3);
    const defenseBonus = Math.floor((entity.stats.defense || 0) / 2);
    let equipBonus = 0;
    for (const slot in entity.equipped) {
        if (entity.equipped[slot]) {
            equipBonus += entity.equipped[slot].defense || 0;
        }
    }
    equipBonus += entity.evadeTurns > 0 ? 2 : 0;
    const ac = baseAC + speedBonus + defenseBonus + equipBonus;
    console.log(`${entity.playerName || entity.name || "Player"} AC: ${ac}`);
    return ac;
}

// ============================================================================
// INVENTORY & EQUIPMENT FUNCTIONS
// ============================================================================
function addToInventory(itemName, amount = 1) {
    const item = gameState.inventory.find(i => i.name === itemName);
    if (item) item.quantity += amount;
    else if (items[itemName] || equipment[itemName])
        gameState.inventory.push({ name: itemName, quantity: amount });
    showAction(`Added ${formatItemName(itemName)} to your inventory!`);
    updateUI();
}

function removeFromInventory(itemName, amount = 1) {
    const item = gameState.inventory.find(i => i.name === itemName);
    if (item && item.quantity >= amount) {
        item.quantity -= amount;
        if (item.quantity === 0)
            gameState.inventory = gameState.inventory.filter(i => i.name !== itemName);
        return true;
    }
    return false;
}

function equipItem(item, slot) {
    if (!item || !slot) {
        console.error("Invalid item or slot:", item, slot);
        return;
    }
    const validSlots = ["weapon", "head", "chest", "arms", "legs", "boots"];
    if (!validSlots.includes(slot)) {
        console.error("Unsupported slot:", slot);
        return;
    }
    // Unequip current item in slot, return to inventory
    if (gameState.equipped[slot]) {
        const currentItem = gameState.equipped[slot];
        const inventoryItem = gameState.inventory.find(i => i.name === currentItem.name);
        if (inventoryItem) {
            inventoryItem.quantity = (inventoryItem.quantity || 0) + 1;
        } else {
            gameState.inventory.push({ name: currentItem.name, quantity: 1, type: currentItem.type });
        }
    }
    // Equip new item
    const equipmentData = equipment[item.name];
    gameState.equipped[slot] = { 
        name: item.name, 
        type: item.type, 
        attack: equipmentData.attack || 0,
        defense: equipmentData.defense || 0,
        speed: equipmentData.speed || 0
    };
    // Remove from inventory
    const inventoryItem = gameState.inventory.find(i => i.name === item.name);
    if (inventoryItem) {
        inventoryItem.quantity -= 1;
        if (inventoryItem.quantity <= 0) {
            gameState.inventory = gameState.inventory.filter(i => i.name !== item.name);
        }
    }
    savePlayerData();
    updateUI();
    updateGearList();
    // Only call showEquipMenu in camp.html
    if (window.location.pathname.includes("camp.html")) {
        showEquipMenu();
    }
}

function unequipItem(slot) {
    if (!["weapon", "head", "chest", "arms", "legs", "boots"].includes(slot)) {
        console.error("Invalid slot:", slot);
        return;
    }
    const currentItem = gameState.equipped[slot];
    if (currentItem) {
        const inventoryItem = gameState.inventory.find(i => i.name === currentItem.name);
        if (inventoryItem) {
            inventoryItem.quantity = (inventoryItem.quantity || 0) + 1;
        } else {
            gameState.inventory.push({ name: currentItem.name, quantity: 1, type: currentItem.type });
        }
        gameState.equipped[slot] = null;
        savePlayerData();
        updateUI();
        updateGearList();
        if (window.location.pathname.includes("camp.html")) {
            showEquipMenu();
        }
    }
}

function useItem(itemName, user, target) {
    const item = items[itemName];
    if (!item || !removeFromInventory(itemName)) return null;
    const effectMessage =
        typeof item.effect === "function" ? item.effect(user, target || user) : item.effect;
    updateUI();
    return effectMessage;
}

// ============================================================================
// UI FUNCTIONS
// ============================================================================
function updateUI() {
    const page = window.location.pathname;
    const elements = {
        playerName: document.getElementById("playerName"),
        xp: document.getElementById("xp"),
        hp: document.getElementById("hp"),
        level: document.getElementById("level"),
        gold: document.getElementById("gold"),
        inventoryList: document.getElementById("inventoryList"),
        att: document.getElementById("att"),
        def: document.getElementById("def"),
        spd: document.getElementById("spd"),
        enemyName: document.getElementById("enemyName"),
        enemyHP: document.getElementById("enemyHP")
    };

    if (elements.playerName) elements.playerName.textContent = gameState.playerName || "Hero";
    if (elements.xp) elements.xp.textContent = `${gameState.xp || 0}/${LEVEL_UP_XP || 100}`;
    if (elements.hp) elements.hp.textContent = `${gameState.hp || 0}/${gameState.maxHp || 100}`;
    if (elements.level) elements.level.textContent = gameState.level || 1;
    if (elements.gold) elements.gold.textContent = gameState.gold || 0;
    if (elements.att) elements.att.textContent = (gameState.stats && gameState.stats.attack) || 0;
    if (elements.def) elements.def.textContent = (gameState.stats && gameState.stats.defense) || 0;
    if (elements.spd) elements.spd.textContent = (gameState.stats && gameState.stats.speed) || 0;
    if (elements.inventoryList) {
        elements.inventoryList.innerHTML =
            gameState.inventory.length === 0
                ? "<p class='item'>Empty</p>"
                : gameState.inventory
                      .map(
                          item =>
                              `<p class="item">${formatItemName(item.name)}: ${item.quantity}</p>`
                      )
                      .join("");
    }
    console.log("UI update - Equipped:", gameState.equipped);

    if (combatState.active && combatState.currentEnemy) {
        if (elements.enemyName) elements.enemyName.textContent = combatState.currentEnemy.name || "Unknown";
        if (elements.enemyHP) elements.enemyHP.textContent = combatState.currentEnemy.hp || 0;
        const enemyHealthBar = document.getElementById("enemy-health");
        if (enemyHealthBar) {
            const enemyKey = combatState.currentEnemy.enemyType || combatState.currentEnemy.name.toLowerCase();
            const enemyData = enemies[enemyKey] || boss[enemyKey];
            if (!enemyData) {
                console.error("Enemy not found in enemies or boss object:", enemyKey, combatState.currentEnemy);
                return;
            }
            const maxHp = enemyData.hp;
            const hpPercent = (combatState.currentEnemy.hp / maxHp) * 100;
            enemyHealthBar.style.width = `${hpPercent}%`;
        }
    }

    // Update gearList for camp.html, shop.html, ambush.html, exploration.html
    if (
        page.includes("camp.html") ||
        page.includes("shop.html") ||
        page.includes("ambush.html") ||
        page.includes("exploration.html")
    ) {
        updateGearList();
    }

    savePlayerData(); // From previous unload fix
}

function showAction(text) {
    const actionBox = document.getElementById("actionBox");
    if (actionBox) {
        const p = document.createElement("p");
        p.textContent = text;
        actionBox.appendChild(p);
        if (combatState.active) combatState.log.push(text);
        actionBox.classList.remove("hidden");
        actionBox.scrollTop = actionBox.scrollHeight;
        console.log("Action:", text);
    }
} 

function showEquipMenu() {
    const equipMenu = document.getElementById("equipMenu");
    if (!equipMenu) {
        console.error("equipMenu not found");
        return;
    }
    equipMenu.classList.remove("hidden");
    const slots = ["weapon", "head", "chest", "arms", "legs", "boots"];
    equipMenu.innerHTML = `
        <h3>Equip Items</h3>
        ${slots
            .map(slot => {
                const equippedItem = gameState.equipped[slot];
                const availableItems = gameState.inventory.filter(item => item.type === slot || (slot === "head" && item.type === "helmet"));
                return `
                    <div class="equip-section">
                        <h4>${slot.charAt(0).toUpperCase() + slot.slice(1)}</h4>
                        <p>Equipped: ${equippedItem && equippedItem.name ? formatItemName(equippedItem.name) : "None"}
                            ${equippedItem ? `<button onclick="unequipItem('${slot}')">Unequip</button>` : ""}
                        </p>
                        ${availableItems.length > 0 ? availableItems
                            .map(item => `
                                <p>${formatItemName(item.name)} (x${item.quantity})
                                    <button onclick="equipItem({ name: '${item.name}', type: '${item.type}' }, '${slot}')">Equip</button>
                                </p>
                            `).join("") : "<p>No items available.</p>"}
                    </div>
                `;
            })
            .join("")}
        <button id="backBtn" onclick="equipMenu.classList.add('hidden')">Back</button>
    `;
}

function toggleGearMenu() {
    const gearList = document.getElementById("gearList");
    if (!gearList) {
        console.error("gearList not found");
        return;
    }

    if (gearList.classList.contains("hidden")) {
        const slots = ["weapon", "helmet", "chest", "arms", "legs", "boots"];
        gearList.innerHTML = slots
            .map(slot => {
                const item = gameState.equipped[slot];
                return `<p>${slot.charAt(0).toUpperCase() + slot.slice(1)}: ${item ? formatItemName(item.name) : "None"}</p>`;
            })
            .join("");
        gearList.classList.remove("hidden");
    } else {
        gearList.classList.add("hidden");
    }
}

function updateGearList() {
    const gearList = document.getElementById("gearList");
    if (!gearList) {
        console.error("gearList not found");
        return;
    }
    const slots = ["weapon", "head", "chest", "arms", "legs", "boots"];
    gearList.innerHTML = slots
        .map(slot => {
            const item = gameState.equipped[slot];
            return `<p>${slot.charAt(0).toUpperCase() + slot.slice(1)}: ${item && item.name ? formatItemName(item.name) : "None"}</p>`;
        })
        .join("");
    console.log("gearList updated:", gearList.innerHTML);
}

// ============================================================================
// SHOP FUNCTIONS
// ============================================================================
function handleBuyItem(itemName, cost) {
    if (gameState.gold < cost) {
        showAction("Not enough gold!");
        return;
    }
    gameState.gold -= cost;
    let item, source;
    // Check equipment for gear
    if (equipment[itemName]) {
        item = equipment[itemName];
        source = "equipment";
    }
    // Check items for consumables
    else if (items[itemName]) {
        item = items[itemName];
        source = "items";
    } else {
        console.error("Item not found in equipment or items:", itemName);
        showAction("Error: Item not found.");
        return;
    }
    const inventoryItem = gameState.inventory.find(i => i.name === itemName);
    if (inventoryItem) {
        inventoryItem.quantity = (inventoryItem.quantity || 0) + 1;
    } else {
        gameState.inventory.push({ name: itemName, quantity: 1, type: item.type || "consumable" });
    }
    showAction(`Purchased ${formatItemName(itemName)}!`);
    // Auto-equip only for equipment items
    if (source === "equipment") {
        const validSlots = ["weapon", "head", "chest", "arms", "legs", "boots"];
        const slot = item.type === "helmet" ? "head" : item.type;
        if (validSlots.includes(slot)) {
            equipItem({ name: itemName, type: item.type }, slot);
        } else {
            console.warn("Item type not equippable:", item.type);
        }
    }
    savePlayerData();
    updateUI();
    updateShopUI();
}

function handleSellItem(itemName) {
    const item = items[itemName] || equipment[itemName] || {};
    const sellPrice =
        item.sellPrice !== undefined
            ? item.sellPrice
            : item.price !== undefined
            ? Math.floor(item.price / 2)
            : 1;
    if (removeFromInventory(itemName)) {
        gameState.gold += sellPrice;
        showAction(`Sold ${formatItemName(itemName)} for ${sellPrice} Gold!`);
        savePlayerData();
        updateUI();
        updateShopUI();
    } else {
        showAction(`No ${formatItemName(itemName)} to sell!`);
    }
}

function updateShopUI() {
    const weaponList = document.getElementById("weaponList");
    const armorList = document.getElementById("armorList");
    const useableList = document.getElementById("useableList");
    const sellList = document.getElementById("sellList");

    if (weaponList) weaponList.innerHTML = "";
    if (armorList) armorList.innerHTML = "";
    if (useableList) useableList.innerHTML = "";
    if (sellList) sellList.innerHTML = "";

    // Populate weapon list
    if (weaponList) {
        const weapons = Object.keys(equipment).filter(item => equipment[item].type === "weapon");
        weaponList.innerHTML =
            weapons.length > 0
                ? weapons
                      .map(item => {
                          const data = equipment[item];
                          return `
                            <p>
                                ${formatItemName(item)}: ${data.price} Gold
                                <br><span class="item-description">${data.description}</span>
                                <br>[A:${data.attack || 0} D:${data.defense || 0} S:${data.speed || 0}${data.bleedChance ? ` Bleed:${data.bleedChance}%` : ""}]
                                <button class="buyBtn" data-item="${item}" data-price="${data.price}">Buy</button>
                            </p>`;
                      })
                      .join("")
                : "<p>No weapons available.</p>";
    }

    // Populate armor list
    if (armorList) {
        const armors = Object.keys(equipment).filter(item => equipment[item].boxtype === "armor");
        armorList.innerHTML =
            armors.length > 0
                ? armors
                      .map(item => {
                          const data = equipment[item];
                          return `
                            <p>
                                ${formatItemName(item)}: ${data.price} Gold
                                <br><span class="item-description">${data.description}</span>
                                <br>[A:${data.attack || 0} D:${data.defense || 0} S:${data.speed || 0}]
                                <button class="buyBtn" data-item="${item}" data-price="${data.price}">Buy</button>
                            </p>`;
                      })
                      .join("")
                : "<p>No armor available.</p>";
    }

    // Populate consumable list
    if (useableList) {
        const consumables = Object.keys(items).filter(item => items[item].price && !equipment[item]);
        useableList.innerHTML =
            consumables.length > 0
                ? consumables
                      .map(item => {
                          const data = items[item];
                          return `
                            <p>
                                ${formatItemName(item)}: ${data.price} Gold
                                <br><span class="item-description">${data.description}</span>
                                <button class="buyBtn" data-item="${item}" data-price="${data.price}">Buy</button>
                            </p>`;
                      })
                      .join("")
                : "<p>No consumables available.</p>";
    }

    // Populate sell list
    if (sellList) {
        sellList.innerHTML =
            gameState.inventory.length > 0
                ? gameState.inventory
                      .map(item => {
                          const data = equipment[item.name] || items[item.name] || {};
                          const sellPrice =
                              data.sellPrice !== undefined
                                  ? data.sellPrice
                                  : data.price !== undefined
                                  ? Math.floor(data.price / 2)
                                  : 1;
                          return `
                            <p>
                                ${formatItemName(item.name)} (${item.quantity}): ${sellPrice} Gold
                                <br><span class="item-description">${data.description || "No description available."}</span>
                                <button class="sellBtn" data-item="${item.name}" data-price="${sellPrice}">Sell</button>
                            </p>`;
                      })
                      .join("")
                : "<p>No items to sell.</p>";
    }

    // Attach event listeners for buy buttons
    document.querySelectorAll(".buyBtn").forEach(btn => {
        btn.removeEventListener("click", handleBuyClick);
        btn.addEventListener("click", handleBuyClick);
    });

    // Attach event listeners for sell buttons
    document.querySelectorAll(".sellBtn").forEach(btn => {
        btn.removeEventListener("click", handleSellClick);
        btn.addEventListener("click", handleSellClick);
    });
}


// Helper functions for buy/sell clicks
function handleBuyClick(event) {
    const item = event.target.dataset.item;
    const price = parseInt(event.target.dataset.price);
    if (item && !isNaN(price)) {
        handleBuyItem(item, price);
    } else {
        showAction("Error: Invalid item or price!");
    }
}

function handleSellClick(event) {
    const item = event.target.dataset.item;
    if (item) {
        handleSellItem(item);
    } else {
        showAction("Error: Invalid item!");
    }
}



// ============================================================================
// COMBAT FUNCTIONS
// ============================================================================
function startBattle(enemyType) {
    if (enemyType === "negative") {
        const roll = rollDice(3);
        let message = "";
        if (roll === 1) {
            const dmg = rollDice(6);
            gameState.hp -= dmg;
            message = `You step into a trap, taking ${dmg} damage!`;
        } else if (roll === 2) {
            const goldLoss = Math.min(gameState.gold, 10);
            gameState.gold -= goldLoss;
            message = `A pickpocket swipes ${goldLoss} gold from you!`;
        } else {
            message = `You don't find anything`;
        }
        showAction(message);
        updateUI();
        savePlayerData();
        if (gameState.hp <= 0) gameOver();
        return;
    } else if (enemyType === "positive") {
        const roll = rollDice(3);
        let message = "";
        if (roll === 1) {
            const hpGain = rollDice(8) + 2;
            gameState.hp = Math.min(gameState.maxHp, gameState.hp + hpGain);
            message = `You find a hidden spring and recover ${hpGain} HP!`;
        } else if (roll === 2) {
            const goldGain = rollDice(10) + 10;
            gameState.gold += goldGain;
            message = `You discover a lost pouch with ${goldGain} gold!`;
        } else {
            const item = ["healingPotion", "sharpeningStone", "throwingKnife"][
                rollDice(3) - 1
            ];
            addToInventory(item);
            message = `You stumble upon a ${formatItemName(item)}!`;
        }
        showAction(message);
        updateUI();
        savePlayerData();
        return;
    } else {
        const enemyData = enemies[enemyType] || boss[enemyType];
        if (!enemyData) {
            console.error("Invalid enemy type:", enemyType);
            showAction("Error: Enemy not found!");
            return;
        }
        combatState.currentEnemy = {
            ...enemyData,
            enemyType: enemyType,
            ac: calculateAC(enemyData),
            equipped: {
                weapon: enemyData.weapon
                    ? { ...equipment[enemyData.weapon], name: enemyData.weapon }
                    : null
            },
            poisonStacks: [],
            bleedStacks: [],
            trapTurns: 0,
            blindTurns: 0,
            evadeTurns: 0,
            sharpenTurns: 0,
            stunTurns: 0,
            attackReduction: 0,
            attackReductionTurns: 0,
            speedBonus: 0,
            speedBonusTurns: 0,
            tauntTurns: 0,
            frenzyBonus: 0,
            blockBonus: 0,
            blockTurns: 0,
            feintBonus: 0,
            feintTurns: 0,
            speedReduction: 0,
            speedReductionTurns: 0,
            attackBonus: 0,
            attackBonusTurns: 0,
            abilityCooldowns: {}
        };
        combatState.currentEnemy.abilities.forEach(ability => {
            combatState.currentEnemy.abilityCooldowns[ability.name] = 0;
        });
        if (combatState.currentEnemy.equipped?.weapon) {
            const weapon = combatState.currentEnemy.equipped.weapon;
            combatState.currentEnemy.stats.attack += weapon.attack || 0;
            combatState.currentEnemy.stats.defense += weapon.defense || 0;
            combatState.currentEnemy.stats.speed += weapon.speed || 0;
        }
        gameState.ac = calculateAC(gameState);
        combatState.active = true;
        combatState.turn = "player";
        showAction(
            enemyType === "banditKing"
                ? "The Bandit King emerges from the shadows—there’s no escape now!"
                : `A ${combatState.currentEnemy.name} appears! Your turn.`
        );

        const enemyNameEl = document.getElementById("enemyName");
        const enemyHPEl = document.getElementById("enemyHP");
        if (enemyNameEl) enemyNameEl.textContent = combatState.currentEnemy.name;
        if (enemyHPEl) enemyHPEl.textContent = combatState.currentEnemy.hp;

        const campBtn = document.getElementById("campBtn");
        const forestBtn = document.getElementById("forestBtn");
        const mountainBtn = document.getElementById("mountainBtn");
        const swampBtn = document.getElementById("swampBtn");
        const kingBtn = document.getElementById("kingBtn");
        if (campBtn) campBtn.classList.add("hidden");
        if (forestBtn) forestBtn.classList.add("hidden");
        if (swampBtn) swampBtn.classList.add("hidden");
        if (mountainBtn) mountainBtn.classList.add("hidden");
        if (kingBtn) kingBtn.classList.add("hidden");

        const combatContainer = document.getElementById("combat-container");
        if (combatContainer) combatContainer.classList.remove("hidden");

        const banditEnemyImg = document.getElementById("banditEnemy");
        if (banditEnemyImg) {
            banditEnemyImg.src = enemyData.image;
            banditEnemyImg.classList.remove("hidden");
        }

        showCombatMenu(enemyType === "banditKing");
    }
}

function showCombatMenu(isBoss) {
    const combatMenu = document.getElementById("combatMenu");
    if (!combatMenu) {
        console.error("Combat menu not found");
        return;
    }

    combatMenu.innerHTML = `
        <h3>Combat Options</h3>
        <button id="attackBtn">Attack</button>
        <button id="abilityBtn" ${gameState.abilityCooldown > 0 ? "disabled" : ""}>
            ${gameState.ability?.name || "Ability"} ${
            gameState.abilityCooldown > 0 ? `(Cooldown: ${gameState.abilityCooldown})` : ""
        }
        </button>
        <button id="itemBtn">Use Item</button>
        ${!isBoss ? '<button id="fleeBtn">Flee</button>' : ""}
    `;

    combatMenu.classList.remove("hidden");

    const attackBtn = document.getElementById("attackBtn");
    if (attackBtn) {
        attackBtn.addEventListener("click", () => playerAttack());
    }

    const abilityBtn = document.getElementById("abilityBtn");
    if (abilityBtn && gameState.abilityCooldown === 0) {
        abilityBtn.addEventListener("click", () => {
            const message = gameState.ability.effect(gameState, combatState.currentEnemy);
            showAction(message);
            gameState.abilityCooldown = gameState.ability.cooldown;
            combatState.turn = "enemy";
            updateUI();
            checkCombatStatus();
        });
    }

    const itemBtn = document.getElementById("itemBtn");
    if (itemBtn) {
        itemBtn.addEventListener("click", () => showItemMenu());
    }

    const fleeBtn = document.getElementById("fleeBtn");
    if (fleeBtn) {
        fleeBtn.addEventListener("click", () => {
            const speedCheck = rollDice(20) + gameState.stats.speed;
            const enemySpeed = combatState.currentEnemy.stats.speed;
            if (speedCheck > enemySpeed + 10) {
                showAction("You successfully flee from the battle!");
                endCombat(false);
            } else {
                showAction("You fail to flee!");
                combatState.turn = "enemy";
                enemyTurn();
            }
        });
    }
}

function showItemMenu() {
    const combatMenu = document.getElementById("combatMenu");
    if (!combatMenu) return;

    const usableItems = gameState.inventory.filter(item => items[item.name]?.effect);
    combatMenu.innerHTML = `
        <h3>Select Item</h3>
        ${
            usableItems.length > 0
                ? usableItems
                      .map(
                          item =>
                              `<p><button class="itemBtn" data-item="${item.name}">${formatItemName(
                                  item.name
                              )} (${item.quantity})</button></p>`
                      )
                      .join("")
                : "<p>No usable items.</p>"
        }
        <button id="backBtn">Back</button>
    `;

    document.querySelectorAll(".itemBtn").forEach(btn => {
        btn.addEventListener("click", () => {
            const itemName = btn.dataset.item;
            const message = useItem(itemName, gameState, combatState.currentEnemy);
            if (message) {
                showAction(message);
                combatState.turn = "enemy";
                updateUI();
                checkCombatStatus();
            } else {
                showAction(`Cannot use ${formatItemName(itemName)}!`);
                showItemMenu();
            }
        });
    });

    const backBtn = document.getElementById("backBtn");
    if (backBtn) {
        backBtn.addEventListener("click", () => showCombatMenu(combatState.currentEnemy.enemyType === "banditKing"));
    }
}

function playerAttack() {
    if (!combatState.active || !combatState.currentEnemy) {
        console.error("No active combat or enemy");
        return;
    }
    const weapon = gameState.equipped?.weapon;
    let damageString = "1d4"; // Default damage if no weapon or invalid
    if (weapon && equipment[weapon.name]?.damage) {
        damageString = equipment[weapon.name].damage;
    } else {
        console.warn("No valid weapon equipped or weapon lacks damage, using default 1d4:", weapon);
    }
    const baseDamage = rollDamage(damageString);
    const totalDamage = baseDamage + (gameState.stats.attack || 0);
    combatState.currentEnemy.hp -= totalDamage;
    combatState.currentEnemy.hp = Math.max(0, combatState.currentEnemy.hp);
    
    showAction(`${gameState.playerName} attacks for ${totalDamage} damage!`);
    if (combatState.currentEnemy.hp <= 0) {
        endCombat(true);
    } else {
        combatState.turn = "enemy";
        enemyTurn();
    }
    updateUI();
}
function enemyTurn() {
    if (!combatState.active || !combatState.currentEnemy) return;

    const enemy = combatState.currentEnemy;

    if (enemy.stunTurns > 0) {
        showAction(`${enemy.name} is stunned and skips their turn!`);
        enemy.stunTurns--;
        combatState.turn = "player";
        updateUI();
        checkCombatStatus();
        return;
    }

    if (enemy.trapTurns > 0) {
        showAction(`${enemy.name} is trapped and cannot act!`);
        enemy.trapTurns--;
        if (enemy.trapTurns === 0) {
            enemy.stats.speed = enemies[enemy.enemyType]?.stats.speed || boss[enemy.enemyType]?.stats.speed || 0;
            showAction(`${enemy.name} is freed from the trap!`);
        }
        combatState.turn = "player";
        updateUI();
        checkCombatStatus();
        return;
    }

    let totalWeight = enemy.abilities.reduce((sum, ability) => sum + ability.weight, 0);
    let roll = rollDice(totalWeight);
    let selectedAbility = null;

    for (let ability of enemy.abilities) {
        roll -= ability.weight;
        if (roll <= 0) {
            selectedAbility = ability.name;
            break;
        }
    }

    const abilityFn = enemyAbilities[selectedAbility];
    let message = "";
    if (abilityFn) {
        message = abilityFn(enemy, gameState);
    } else {
        const hitChance = rollDice(20) + enemy.stats.attack + (enemy.feintBonus || 0);
        const playerAC = calculateAC(gameState);
        if (hitChance >= playerAC) {
            const damage = rollDamage(enemy.damage) + enemy.stats.attack + (enemy.frenzyBonus || 0) + (enemy.attackBonus || 0);
            gameState.hp -= damage;
            message = `${enemy.name} hits you for ${damage} damage!`;
        } else {
            message = `${enemy.name}'s attack misses you!`;
        }
    }

    showAction(message);

    if (enemy.poisonStacks.length > 0) {
        const poisonDamage = enemy.poisonStacks.length * 1;
        enemy.hp -= poisonDamage;
        showAction(`${enemy.name} takes ${poisonDamage} poison damage (${enemy.poisonStacks.length}/5)!`);
    }

    if (enemy.bleedStacks.length > 0) {
        let totalBleedDamage = 0;
        enemy.bleedStacks = enemy.bleedStacks.filter(bleed => bleed.turns > 0);
        enemy.bleedStacks.forEach(bleed => {
            totalBleedDamage += bleed.damage;
            bleed.turns--;
        });
        enemy.hp -= totalBleedDamage;
        showAction(`${enemy.name} takes ${totalBleedDamage} bleed damage (${enemy.bleedStacks.length}/3)!`);
    }

    if (gameState.poisonStacks.length > 0) {
        const poisonDamage = gameState.poisonStacks.length * 1;
        gameState.hp -= poisonDamage;
        showAction(`You take ${poisonDamage} poison damage (${gameState.poisonStacks.length}/5)!`);
    }

    if (gameState.bleedStacks.length > 0) {
        let totalBleedDamage = 0;
        gameState.bleedStacks = gameState.bleedStacks.filter(bleed => bleed.turns > 0);
        gameState.bleedStacks.forEach(bleed => {
            totalBleedDamage += bleed.damage;
            bleed.turns--;
        });
        gameState.hp -= totalBleedDamage;
        showAction(`You take ${totalBleedDamage} bleed damage (${gameState.bleedStacks.length}/3)!`);
    }

    enemy.evadeTurns = Math.max(0, (enemy.evadeTurns || 0) - 1);
    enemy.sharpenTurns = Math.max(0, (enemy.sharpenTurns || 0) - 1);
    enemy.blockTurns = Math.max(0, (enemy.blockTurns || 0) - 1);
    enemy.feintTurns = Math.max(0, (enemy.feintTurns || 0) - 1);
    enemy.attackBonusTurns = Math.max(0, (enemy.attackBonusTurns || 0) - 1);
    if (enemy.attackBonusTurns === 0) enemy.attackBonus = 0;

    gameState.sharpenTurns = Math.max(0, (gameState.sharpenTurns || 0) - 1);
    gameState.abilityCooldown = Math.max(0, gameState.abilityCooldown - 1);
    gameState.attackReductionTurns = Math.max(0, (gameState.attackReductionTurns || 0) - 1);
    gameState.speedReductionTurns = Math.max(0, (gameState.speedReductionTurns || 0) - 1);
    if (gameState.attackReductionTurns === 0) gameState.attackReduction = 0;
    if (gameState.speedReductionTurns === 0) gameState.speedReduction = 0;

    combatState.turn = "player";
    updateUI();
    checkCombatStatus();
}

function checkCombatStatus() {
    if (!combatState.active) return;

    if (gameState.hp <= 0) {
        showAction("You have been defeated!");
        gameOver();
    } else if (combatState.currentEnemy.hp <= 0) {
        showAction(`You defeated ${combatState.currentEnemy.name}!`);
        const enemyData = enemies[combatState.currentEnemy.enemyType] || boss[combatState.currentEnemy.enemyType];
        gameState.gold += enemyData.goldReward;
        gameState.xp += enemyData.xpReward;
        showAction(`Gained ${enemyData.goldReward} gold and ${enemyData.xpReward} XP!`);

        if (enemyData.loot.common) {
            const commonLoot = enemyData.loot.common;
            let lootItem;
            if (Array.isArray(commonLoot[0])) {
                commonLoot.forEach(loot => {
                    if (rollDice(100) <= loot.chance) {
                        addToInventory(loot.item);
                        showAction(`Found ${formatItemName(loot.item)}!`);
                    }
                });
            } else {
                if (rollDice(100) <= commonLoot[1]) {
                    addToInventory(commonLoot[0]);
                    showAction(`Found ${formatItemName(commonLoot[0])}!`);
                }
            }
        }

        if (enemyData.loot.rare) {
            const rareLoot = enemyData.loot.rare;
            let lootItem;
            if (Array.isArray(rareLoot[0])) {
                rareLoot.forEach(loot => {
                    if (rollDice(100) <= loot.chance) {
                        addToInventory(loot.item);
                        showAction(`Found ${formatItemName(loot.item)}!`);
                    }
                });
            } else {
                if (rollDice(100) <= rareLoot[1]) {
                    addToInventory(rareLoot[0]);
                    showAction(`Found ${formatItemName(rareLoot[0])}!`);
                }
            }
        }

        if (gameState.xp >= LEVEL_UP_XP) {
            levelUp();
        }

        if (combatState.currentEnemy.enemyType === "banditKing") {
            localStorage.setItem("victory", "true");
            showAction("Congratulations! You have defeated the Bandit King!");
            setTimeout(() => (window.location.href = "victory.html"), 2000);
        } else {
            endCombat(true);
        }
    } else {
        if (combatState.turn === "enemy") {
            enemyTurn();
        } else {
            showCombatMenu(combatState.currentEnemy.enemyType === "banditKing");
        }
    }
}

function levelUp() {
    gameState.level++;
    gameState.xp -= LEVEL_UP_XP;
    gameState.maxHp += LEVEL_UP_HP_GAIN;
    gameState.hp = gameState.maxHp;
    const bonuses = classes[gameState.class].levelUpBonuses;
    gameState.stats.attack += bonuses.attack;
    gameState.stats.defense += bonuses.defense;
    gameState.stats.speed += bonuses.speed;
    showAction(
        `You reached level ${gameState.level}! HP restored, stats increased: +${bonuses.attack} Attack, +${bonuses.defense} Defense, +${bonuses.speed} Speed.`
    );
    savePlayerData();
    updateUI();
}

function endCombat(returnToCamp) {
    combatState.active = false;
    combatState.currentEnemy = null;
    combatState.log = [];
    gameState.poisonStacks = [];
    gameState.bleedStacks = [];
    gameState.sharpenTurns = 0;
    gameState.attackReduction = 0;
    gameState.attackReductionTurns = 0;
    gameState.speedReduction = 0;
    gameState.speedReductionTurns = 0;

    const combatMenu = document.getElementById("combatMenu");
    if (combatMenu) combatMenu.classList.add("hidden");

    const banditEnemyImg = document.getElementById("banditEnemy");
    if (banditEnemyImg) banditEnemyImg.classList.add("hidden");

    const combatContainer = document.getElementById("combat-container");
    if (combatContainer) combatContainer.classList.add("hidden");

    const campBtn = document.getElementById("campBtn");
    const forestBtn = document.getElementById("forestBtn");
    const mountainBtn = document.getElementById("mountainBtn");
    const swampBtn = document.getElementById("swampBtn");
    const kingBtn = document.getElementById("kingBtn");
    if (campBtn) campBtn.classList.remove("hidden");
    if (forestBtn) forestBtn.classList.remove("hidden");
    //if (swampBtn) swampBtn.classList.remove("hidden");
    //if (mountainBtn) mountainBtn.classList.remove("hidden");
    if (kingBtn && gameState.level >= 5) kingBtn.classList.remove("hidden");

    updateUI();
    savePlayerData();

}

function gameOver() {
    showAction("Game Over!");
    localStorage.removeItem("gameState");
    setTimeout(() => (window.location.href = "gameover.html"), 2000);
}


// ============================================================================
// EVENT LISTENERS
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOMContentLoaded fired, page:", window.location.pathname); // Debug
    loadPlayerData();
    updateUI();
    const page = window.location.pathname;

    // Single click handler for all delegated button events
    const handleButtonClick = (event) => {
        const targetId = event.target.id;
        console.log(`Button clicked: ${targetId} on ${page}`); // Debug

        if (page.includes("exploration.html") && targetId === "campBtn") {
            if (combatState.active) {
                showAction("You cannot return to camp while in combat!");
                return;
            }
            localStorage.setItem("lastActionMessage", "You’ve returned to camp from the forest.");
            savePlayerData();
            setTimeout(() => {
                console.log("Redirecting to camp.html from exploration.html"); // Debug
                window.location.href = "camp.html";
            }, 1000);
        } else if (page.includes("shop.html") && (targetId === "backBtn" || targetId === "returnBtn")) {
            showAction("You leave the shop.");
            savePlayerData();
            setTimeout(() => {
                console.log("Redirecting to camp.html from shop.html"); // Debug
                window.location.href = "camp.html";
            }, 1000);
        } else if (page.includes("gameover.html") && targetId === "restartBtn") {
            localStorage.removeItem("gameState");
            localStorage.removeItem("victory");
            showAction("Starting a new game...");
            setTimeout(() => {
                console.log("Redirecting to index.html from gameover.html"); // Debug
                window.location.href = "index.html";
            }, 1000);
        } else if (page.includes("victory.html") && targetId === "restartBtn") {
            localStorage.removeItem("gameState");
            localStorage.removeItem("victory");
            showAction("Starting a new game...");
            setTimeout(() => {
                console.log("Redirecting to index.html from victory.html"); // Debug
                window.location.href = "index.html";
            }, 1000);
        } else if (page.includes("ambush.html") && targetId === "campBtn") {
            if (combatState.active) {
                showAction("You cannot return to camp while in combat!");
                return;
            }
            showAction("You trek back to the safety of camp.");
            localStorage.setItem("lastActionMessage", "You’ve returned to camp after an ambush.");
            savePlayerData();
            setTimeout(() => {
                console.log("Redirecting to camp.html from ambush.html"); // Debug
                window.location.href = "camp.html";
            }, 1000);
        }
    };

    // Attach single click listener
    document.addEventListener("click", handleButtonClick);

    // Page-specific setup
    if (page.includes("index.html")) {
        localStorage.removeItem("victory"); // Clear victory flag on new game
        if (gameState.class) {
            window.location.href = "camp.html";
        } else {
            const warriorBtn = document.getElementById("warriorBtn");
            if (warriorBtn) {
                warriorBtn.addEventListener("click", () => {
                    gameState.class = "warrior";
                    gameState.stats = { ...classes.warrior.stats };
                    gameState.ability = classes.warrior.ability;
                    gameState.playerName = "Torin Blackthorne";
                    savePlayerData();
                    setTimeout(() => window.location.href = "camp.html", 1000);
                });
            }
            const rogueBtn = document.getElementById("rogueBtn");
            if (rogueBtn) {
                rogueBtn.addEventListener("click", () => {
                    gameState.class = "rogue";
                    gameState.stats = { ...classes.rogue.stats };
                    gameState.ability = classes.rogue.ability;
                    gameState.playerName = "Lira Swiftblade";
                    savePlayerData();
                    setTimeout(() => window.location.href = "camp.html", 1000);
                });
            }
            const guardianBtn = document.getElementById("guardianBtn");
            if (guardianBtn) {
                guardianBtn.addEventListener("click", () => {
                    gameState.class = "guardian";
                    gameState.stats = { ...classes.guardian.stats };
                    gameState.ability = classes.guardian.ability;
                    gameState.playerName = "Thane Ironwall";
                    savePlayerData();
                    setTimeout(() => window.location.href = "camp.html", 1000);
                });
            }
        }
    } else if (page.includes("camp.html")) {
        showAction(localStorage.getItem("lastActionMessage") || "You’ve arrived at camp.");
        const exploreBtn = document.getElementById("exploreBtn");
        if (exploreBtn) {
            exploreBtn.addEventListener("click", () => {
                showAction("You head into the wild forest...");
                savePlayerData();
                setTimeout(() => window.location.href = "exploration.html", 1000);
            });
        }
        const shopBtn = document.getElementById("shopBtn");
        if (shopBtn) {
            shopBtn.addEventListener("click", () => {
                showAction("You approach the merchant's stall...");
                savePlayerData();
                setTimeout(() => window.location.href = "shop.html", 1000);
            });
        }
        const equipBtn = document.getElementById("equipBtn");
        if (equipBtn) {
            equipBtn.addEventListener("click", () => {
                showEquipMenu();
            });
        }
        const shortRestBtn = document.getElementById("shortRestBtn");
        if (shortRestBtn) {
            shortRestBtn.addEventListener("click", () => {
                if (combatState.active) {
                    showAction("You cannot rest while in combat!");
                    return;
                }
                const ambushChance = rollDice(100);
                if (ambushChance <= 20) {
                    showAction("You’re ambushed during your rest!");
                    localStorage.setItem("lastActionMessage", "You were ambushed during your rest!");
                    savePlayerData();
                    setTimeout(() => {
                        try {
                            window.location.href = "ambush.html";
                        } catch (e) {
                            console.error("Failed to redirect to ambush.html:", e);
                            showAction("Error: Could not load ambush page!");
                        }
                    }, 1000);
                } else {
                    gameState.hp = Math.min(gameState.maxHp, gameState.hp + 10);
                    showAction("You take a short rest and recover 10 HP!");
                    updateUI();
                    savePlayerData();
                }
            });
        } else {
            console.error("shortRestBtn not found in camp.html");
        }
    } else if (page.includes("exploration.html")) {
        console.log("Setting up exploration.html listeners"); // Debug
        const forestBtn = document.getElementById("forestBtn");
        if (forestBtn) {
            forestBtn.addEventListener("click", () => {
                const roll = rollDice(20);
                let enemyType = null;
                if (roll === 1) {
                    enemyType = "negative";
                } else if (roll <= 10) {
                    enemyType = "bandit";
                } else if (roll === 11) {
                    enemyType = "thief";
                } else if (roll === 12) {
                    enemyType = "trickster";
                } else if (roll <= 16) {
                    enemyType = "wolves";
                } else if (roll <= 18) {
                    enemyType = "bountyHunter";
                } else if (roll === 19) {
                    const specialRoll = rollDice(3);
                    enemyType = [
                        "valonTheImmortal",
                        "dirtyDave",
                        "hoshiTheSloth"
                    ][specialRoll - 1];
                    console.log("Special enemy selected:", enemyType); // Debug
                } else if (roll === 20) {
                    enemyType = "positive";
                }
                if (!enemyType) {
                    console.error("No enemyType set for roll:", roll);
                    enemyType = "bandit"; // Fallback
                }
                console.log("Starting battle with enemyType:", enemyType);
                startBattle(enemyType);
            });
        } else {
            console.error("forestBtn not found in exploration.html");
        }
        const kingBtn = document.getElementById("kingBtn");
        if (kingBtn && gameState.level >= 5) {
            kingBtn.classList.remove("hidden");
            kingBtn.addEventListener("click", () => {
                showAction("You face the Bandit King!");
                savePlayerData();
                startBattle("banditKing");
            });
        }
        const campBtn = document.getElementById("campBtn");
        if (campBtn) {
            campBtn.addEventListener("click", () => {
                console.log("Direct campBtn clicked in exploration.html"); // Debug
                if (combatState.active) {
                    showAction("You cannot return to camp while in combat!");
                    return;
                }
                showAction("You trek back to the safety of camp.");
                localStorage.setItem("lastActionMessage", "You’ve returned to camp from the forest.");
                savePlayerData();
                setTimeout(() => {
                    console.log("Redirecting to camp.html from exploration.html"); // Debug
                    window.location.href = "camp.html";
                }, 3000);
            });
        } else {
            console.error("campBtn not found in exploration.html");
        }
        setTimeout(() => {
            const campBtnCheck = document.getElementById("campBtn");
            if (!campBtnCheck) {
                console.error("Delayed check: campBtn not found in exploration.html");
            } else {
                console.log("Delayed check: campBtn found in exploration.html");
            }
        }, 1000);
    } else if (page.includes("shop.html")) {
        console.log("Setting up shop.html listeners"); // Debug
        updateShopUI();
        const tabs = document.querySelectorAll(".shop-tab");
        const shopLists = document.querySelectorAll(".shop-list");
        tabs.forEach(tab => {
            tab.addEventListener("click", () => {
                tabs.forEach(t => t.classList.remove("active"));
                shopLists.forEach(list => list.classList.add("hidden"));
                tab.classList.add("active");
                const targetList = document.getElementById(tab.dataset.tab);
                if (targetList) targetList.classList.remove("hidden");
            });
        });
        setTimeout(() => {
            const backBtn = document.getElementById("backBtn");
            const returnBtn = document.getElementById("returnBtn");
            if (!backBtn && !returnBtn) {
                console.error("Delayed check: Neither backBtn nor returnBtn found in shop.html");
            } else {
                if (backBtn) console.log("Delayed check: backBtn found in shop.html");
                if (returnBtn) console.log("Delayed check: returnBtn found in shop.html");
            }
        }, 1000);
    } else if (page.includes("gameover.html")) {
        console.log("Setting up gameover.html listeners"); // Debug
        const victory = localStorage.getItem("victory") === "true";
        console.log("Victory flag:", localStorage.getItem("victory"), "Parsed as victory:", victory); // Debug
        const gameOverScreen = document.getElementById("gameOverScreen");
        const messageEl = document.getElementById("gameOverMessage");
        const titleEl = document.getElementById("gameOverTitle");
        if (gameOverScreen) {
            gameOverScreen.classList.add(victory ? "victory" : "defeat");
        }
        if (titleEl) {
            titleEl.textContent = victory ? "Victory!" : "Game Over";
        }
        if (messageEl) {
            messageEl.textContent = victory
                ? "Victory! You have defeated the Bandit King and saved the forest!"
                : "Defeat... The forest remains under the Bandit King's control.";
        }
        setTimeout(() => {
            const restartBtn = document.getElementById("restartBtn");
            if (!restartBtn) {
                console.error("Delayed check: restartBtn not found in gameover.html");
            } else {
                console.log("Delayed check: restartBtn found in gameover.html");
            }
        }, 1000);
    } else if (page.includes("victory.html")) {
        console.log("Setting up victory.html listeners"); // Debug
        const victoryScreen = document.getElementById("victoryScreen");
        if (victoryScreen) {
            victoryScreen.classList.remove("hidden");
            console.log("Removed hidden class from victoryScreen");
        }
        const playerNameEl = document.getElementById("playerName");
        if (playerNameEl) {
            playerNameEl.textContent = localStorage.getItem("playerName") || "Hero";
        }
        setTimeout(() => {
            const restartBtn = document.getElementById("restartBtn");
            if (!restartBtn) {
                console.error("Delayed check: restartBtnVictory not found in victory.html");
            } else {
                console.log("Delayed check: restartBtnVictory found in victory.html");
            }
        }, 1000);
    } else if (page.includes("ambush.html")) {
        showAction(localStorage.getItem("lastActionMessage") || "You’ve been ambushed!");
        localStorage.removeItem("lastActionMessage");
        const roll = rollDice(20);
        let enemyType = null;
        if (roll <= 10) {
            enemyType = "bandit";
        } else if (roll <= 14) {
            enemyType = "wolves";
        } else if (roll <= 16) {
            enemyType = "thief";
        } else if (roll <= 18) {
            enemyType = "trickster";
        } else {
            enemyType = "bountyHunter";
        }
        if (!enemyType) {
            console.error("No enemyType set for roll:", roll);
            enemyType = "bandit"; // Fallback
        }
        console.log("Starting battle with enemyType:", enemyType); // Debug
        startBattle(enemyType);
        setTimeout(() => {
            const campBtn = document.getElementById("campBtn");
            if (!campBtn) {
                console.error("Delayed check: campBtn not found in ambush.html");
            } else {
                console.log("Delayed check: campBtn found in ambush.html");
            }
        }, 1000);
    }

    // Cleanup event listener on page unload to prevent memory leaks
    // Replace at line ~2032
    window.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
            savePlayerData();
        }
    });
});