// ============================================================================
// GAME CONSTANTS
// These are fixed values used throughout the game for leveling and health mechanics
// ============================================================================
const LEVEL_UP_XP = 100;         // XP required to level up
const LEVEL_UP_HP_GAIN = 5;      // HP gained per level up
const MAX_HP = 100;              // Maximum HP a player can have

// ============================================================================
// GAME STATE
// This object stores the player's current status and progress
// ============================================================================
let gameState = {
    playerName: "Unknown",       // Player's name, set when choosing a class
    class: null,                 // Player's class (warrior, rogue, guardian)
    xp: 0,                       // Current experience points
    hp: 20,                      // Current hit points
    maxHp: 20,                   // Maximum hit points (increases with level)
    level: 1,                    // Current player level
    stats: {                     // Base stats affecting combat
        attack: 0,               // Influences damage dealt
        defense: 0,              // Reduces damage taken
        speed: 0                 // Affects turn order and evasion
    },
    baseAC: 10,                  // Base armor class for combat avoidance
    gold: 100,                   // Currency for buying items
    inventory: [                 // Array of items player owns
        { name: "healingPotion", quantity: 2 },
        { name: "shortSword", quantity: 1 }
    ],
    equipped: {                  // Currently equipped gear
        weapon: null,
        armor: null
    },
    ability: null                // Special ability based on class
};

// Summary: Defines the player's persistent state, including stats, inventory, and equipment.

// ============================================================================
// COMBAT STATE
// Tracks the state of an ongoing battle
// ============================================================================
let combatState = {
    active: false,               // Whether a battle is happening
    turn: "player",              // Whose turn it is ("player" or "enemy")
    currentEnemy: null,          // Current enemy object
    log: []                      // Array of combat messages
};

// Summary: Manages the state of combat, including turn order and battle log.

// ============================================================================
// DATA
// Defines game data like classes, enemies, equipment, and items
// ============================================================================
const classes = {
    warrior: {
        stats: { attack: 5, defense: 3, speed: 1 },  // Warrior's base stats
        ability: {                                   // Special ability
            name: "Cleave",
            effect: (user, target) => {
                const dmg = rollDamage("1d10") + user.stats.attack;  // Rolls 1d10 + attack stat
                target.hp -= dmg;                                    // Reduces target HP
                return `${user.playerName} uses Cleave, dealing ${dmg} damage!`;  // Combat message
            }
        }
    },
    rogue: {
        stats: { attack: 3, defense: 1, speed: 5 },
        ability: {
            name: "Backstab",
            effect: (user, target) => {
                const dmg = rollDamage("1d6") + user.stats.attack + 2;  // Bonus +2 damage
                target.hp -= dmg;
                return `${user.playerName} uses Backstab, striking for ${dmg} damage!`;
            }
        }
    },
    guardian: {
        stats: { attack: 3, defense: 5, speed: 1 },
        ability: {
            name: "Shield Bash",
            effect: (user, target) => {
                const dmg = rollDamage("1d6") + user.stats.attack;
                target.hp -= dmg;
                target.stunTurns = 1;  // Stuns enemy for 1 turn
                return `${user.playerName} uses Shield Bash, dealing ${dmg} damage and stunning ${target.name}!`;
            }
        }
    }
};

// Summary: Defines three player classes with unique stats and abilities.

const enemies = {
    bandit: {
        name: "Bandit",
        hp: 12,
        stats: { attack: 2, speed: 3, defense: 2 },
        goldReward: 10,         // Gold dropped on defeat
        xpReward: 20,           // XP awarded on defeat
        image: "/assets/img_folder/enemies/bandit.jpeg",
        damage: "1d4",          // Damage die for attacks
        ability: "steal",       // Special ability identifier
        loot: {                 // Possible loot drops with % chances
            common: ["wolfPelt", 50],
            rare: ["dagger", 10]
        }
    },
    // ... other enemies follow similar structure (wolves, thief, etc.)
    banditKing: {
        name: "Bandit King",
        hp: 50,
        stats: { attack: 6, speed: 5, defense: 5 },
        goldReward: 100,
        xpReward: 150,
        image: "/assets/img_folder/enemies/banditKing.jpeg",
        damage: "1d10",
        ability: "intimidate",
        loot: { common: ["goldCoin", 80], rare: ["longsword", 50] }
    }
};

// Summary: Defines enemy types with stats, rewards, abilities, and loot tables.

const equipment = {
    shortSword: { 
        type: "weapon", 
        damage: "1d6", 
        attack: 1, 
        defense: 0, 
        speed: 0, 
        price: 20 
    },
    // ... other equipment (longsword, dagger, armor, etc.)
};

// Summary: Lists equippable items with stat bonuses and prices.

const items = {
    healingPotion: {
        effect: (user) => {
            user.hp = Math.min(MAX_HP, user.hp + 15);  // Heals 15 HP up to max
            return `${user.playerName} uses a Healing Potion, restoring 15 HP!`;
        },
        price: 10
    },
    // ... other items (salve, bomb, etc.)
};

// Summary: Defines consumable items with effects and prices.

const enemyAbilities = {
    steal: (user, target) => {
        target.gold = Math.max(0, target.gold - 5);  // Steals 5 gold
        return `${user.name} steals 5 gold from you!`;
    },
    // ... other enemy abilities (bite, evade, etc.)
};

// Summary: Defines special abilities enemies can use in combat.

// ============================================================================
// UTILITY FUNCTIONS
// Helper functions for dice rolling and data persistence
// ============================================================================
function rollDice(sides) {
    return Math.floor(Math.random() * sides) + 1;  // Rolls a die with given sides
}

function rollDamage(damageString) {
    const match = damageString.match(/(\d+)d(\d+)/);  // Parses "XdY" format (e.g., "2d6")
    if (!match) return rollDice(4);                   // Default to 1d4 if invalid
    const [_, numDice, sides] = match;
    return Array.from({ length: parseInt(numDice) }, () => rollDice(parseInt(sides)))
                .reduce((a, b) => a + b, 0);          // Rolls multiple dice and sums
}

function savePlayerData() {
    localStorage.setItem("gameState", JSON.stringify(gameState));  // Saves game state to local storage
    console.log("Game saved");
}

function loadPlayerData() {
    const savedData = localStorage.getItem("gameState");
    if (savedData) {
        gameState = JSON.parse(savedData);                         // Loads saved state
        if (!Array.isArray(gameState.inventory)) gameState.inventory = [{ name: "healingPotion", quantity: 2 }, { name: "shortSword", quantity: 1 }];
        if (!gameState.equipped) gameState.equipped = { weapon: null, armor: null };
        if (gameState.class) {                                     // Restores class stats and ability
            gameState.stats = { ...classes[gameState.class].stats };
            gameState.ability = classes[gameState.class].ability;
        }
    }
    console.log("Game loaded:", gameState);
}

function calculateAC(entity) {
    const baseAC = entity.baseAC || 10;                        // Base armor class
    const speedBonus = Math.floor(((entity.stats.speed || 0) + (entity.speedBonus || 0)) / 3);  // Speed contributes to AC
    const defenseBonus = Math.floor((entity.stats.defense || 0) / 2);  // Defense adds to AC
    const equipBonus = (entity.equipped?.weapon?.defense || 0) + (entity.equipped?.armor?.defense || 0) + (entity.evadeTurns > 0 ? 2 : 0);
    const ac = baseAC + speedBonus + defenseBonus + equipBonus;  // Total AC calculation
    console.log(`${entity.playerName || entity.name || "Player"} AC: ${ac}`);
    return ac;
}

// Summary: Provides utility functions for random rolls, saving/loading game state, and calculating armor class.

// ============================================================================
// INVENTORY & EQUIPMENT FUNCTIONS
// Manage player's items and gear
// ============================================================================
function addToInventory(itemName, amount = 1) {
    const item = gameState.inventory.find(i => i.name === itemName);
    if (item) item.quantity += amount;                         // Increases quantity if item exists
    else if (items[itemName] || equipment[itemName]) gameState.inventory.push({ name: itemName, quantity: amount });
    updateUI();                                                // Updates UI after change
}

function removeFromInventory(itemName, amount = 1) {
    const item = gameState.inventory.find(i => i.name === itemName);
    if (item && item.quantity >= amount) {                     // Removes item if enough quantity
        item.quantity -= amount;
        if (item.quantity === 0) gameState.inventory = gameState.inventory.filter(i => i.name !== itemName);
        return true;
    }
    return false;
}

function useItem(itemName, user, target) {
    const item = items[itemName];
    if (!item || !removeFromInventory(itemName)) return null;  // Uses item if available
    const effectMessage = typeof item.effect === "function" ? item.effect(user, target || user) : item.effect;
    updateUI();
    return effectMessage;
}

function equipItem(itemName) {
    const item = equipment[itemName];
    if (!item || !removeFromInventory(itemName)) return false;  // Equips item, unequipping current if any
    const current = gameState.equipped[item.type];
    if (current) {                                             // Adjusts stats for unequipped item
        gameState.stats.attack -= current.attack || 0;
        gameState.stats.defense -= current.defense || 0;
        gameState.stats.speed -= current.speed || 0;
        addToInventory(current.name);
    }
    gameState.equipped[item.type] = item;                      // Applies new item's stats
    gameState.stats.attack += item.attack || 0;
    gameState.stats.defense += item.defense || 0;
    gameState.stats.speed += item.speed || 0;
    console.log(`Equipped ${itemName}:`, gameState.stats);
    updateUI();
    return true;
}

// Summary: Handles adding, removing, using, and equipping items in the player's inventory.

// ============================================================================
// UI FUNCTIONS
// Update the game's user interface
// ============================================================================
function updateUI() {
    const elements = {  // DOM elements to update
        playerName: document.getElementById("playerName"),
        xp: document.getElementById("xp"),
        hp: document.getElementById("hp"),
        // ... other elements
    };
    if (elements.playerName) elements.playerName.textContent = gameState.playerName;  // Updates text content
    if (elements.xp) elements.xp.textContent = `${gameState.xp}/${LEVEL_UP_XP}`;
    // ... updates other UI elements similarly
}

function showAction(text) {
    const actionBox = document.getElementById("actionBox");
    if (actionBox) {
        const p = document.createElement("p");                 // Adds new action message
        p.textContent = text;
        actionBox.appendChild(p);
        if (combatState.active) combatState.log.push(text);    // Logs combat actions
        actionBox.classList.remove("hidden");
        actionBox.scrollTop = actionBox.scrollHeight;          // Scrolls to latest message
        console.log("Action:", text);
    }
}

// Summary: Updates the game's UI with current stats and displays action messages.

// ============================================================================
// COMBAT FUNCTIONS
// Handle battle mechanics
// ============================================================================
function startBattle(enemyType) {
    if (enemyType === "negative") {  // Random negative event
        const roll = rollDice(3);
        if (roll === 1) { gameState.hp -= rollDice(6); /* trap */ }
        // ... other negative outcomes
        return;
    } else if (enemyType === "positive") {  // Random positive event
        const roll = rollDice(3);
        if (roll === 1) { gameState.hp = Math.min(gameState.maxHp, gameState.hp + rollDice(8) + 2); /* healing */ }
        // ... other positive outcomes
        return;
    }

    combatState.currentEnemy = { ...enemies[enemyType], ac: calculateAC(enemies[enemyType]), /* status effects */ };
    gameState.ac = calculateAC(gameState);
    combatState.active = true;
    combatState.turn = "player";
    showAction(`A ${combatState.currentEnemy.name} appears! Your turn.`);
    // ... UI setup for combat
}

function performAttack(attacker, target) {
    const attackRoll = rollDice(20) + attacker.stats.attack;  // D20 roll + attack stat
    if (attackRoll >= target.ac) {                            // Hit if roll beats AC
        let damage = rollDamage(attacker.equipped?.weapon?.damage || "1d4") + attacker.stats.attack;
        target.hp -= damage;
        return `${attacker.playerName || attacker.name} hits ${target.playerName || target.name} for ${damage} damage!`;
    }
    return `${attacker.playerName || attacker.name} swings at ${target.playerName || target.name} but misses!`;
}

// Summary: Manages combat initiation, attack resolution, and turn-based mechanics.

// ============================================================================
// SHOP FUNCTIONS
// Handle buying and selling items
// ============================================================================
function handleBuyItem(itemName, price) {
    if (gameState.gold >= price) {
        gameState.gold -= price;
        if (equipment[itemName]) equipItem(itemName) || addToInventory(itemName);
        else addToInventory(itemName);
        showAction(`Bought ${itemName} for ${price} Gold!`);
        savePlayerData();
        updateUI();
    }
}

// Summary: Facilitates transactions in the shop, updating inventory and gold.

// ============================================================================
// EVENT LISTENERS
// Set up game interactions on page load
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
    loadPlayerData();
    updateUI();
    if (window.location.pathname.includes("index.html")) {
        document.getElementById("warriorBtn")?.addEventListener("click", () => {
            gameState.class = "warrior";  // Sets up player class and redirects
            gameState.stats = { ...classes.warrior.stats };
            gameState.ability = classes.warrior.ability;
            gameState.playerName = "Torin Blackthorne";
            savePlayerData();
            setTimeout(() => window.location.href = "camp.html", 1000);
        });
        // ... similar listeners for rogue and guardian
    }
    // ... other page-specific listeners
});

// Summary: Initializes the game and sets up event listeners for navigation and actions.