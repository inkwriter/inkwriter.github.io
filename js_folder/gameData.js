// Central game state
export const gameState = {
    playerName: "",
    level: 1,
    hp: 100,
    xp: 0,
    gold: 30,
    stats: {
        attack: 1,
        defense: 1,
        speed: 1,
    },
    inventory: {
        potions: 0,
        poison: 0,
    },
    levelUpIncrements: {
        attack: 0,
        defense: 0,
        speed: 0,
    },
    calculateAC() {
        return 10 + this.stats.defense + this.stats.speed;
    },
};

export function setPlayerName(name) {
    console.log("setPlayerName called with:", name);
    gameState.playerName = name;
    savePlayerData();
    console.log("Updated gameState:", gameState);
}

// Utility: Calculate attack damage (shared for all enemies)
function calculateAttackDamage(baseAttack, critBonus = 4) {
    const roll = Math.floor(Math.random() * 20) + 1;
    let damage = Math.floor(Math.random() * baseAttack) + 1;

    if (roll === 20) {
        const critDamage = Math.floor(Math.random() * critBonus) + 1;
        damage += critDamage;
        console.log(`[Attack] Critical hit! Total damage: ${damage}`);
    } else {
        console.log(`[Attack] Regular hit! Damage: ${damage}`);
    }

    return { damage, roll };
}

// Bandit enemy
export const Bandit = {
    name: "Bandit",
    hp: 20,
    attack: 2,
    defense: 0,
    speed: 1,
    calculateAC() {
        return 10 + this.defense + this.speed;
    },
    attackPlayer(player) {
        const { damage, roll } = calculateAttackDamage(this.attack);
        if (roll >= player.calculateAC()) {
            player.hp = Math.max(0, player.hp - damage);
            return roll === 20
                ? `Critical hit! The ${this.name} deals ${damage} damage to you!`
                : `The ${this.name} hits you for ${damage} damage!`;
        }
        return `The ${this.name} misses!`;
    },
};

// Bandit King boss
export const BanditKing = {
    ...Bandit, // Inherits basic structure from Bandit
    name: "Bandit King",
    hp: 150,
    attack: 10,
    defense: 3,
    speed: 2,
    calculateAC() {
        return 10 + this.defense + this.speed;
    },
    specialAbilityUsed: false,
    useWarCry() {
        if (!this.specialAbilityUsed) {
            this.specialAbilityUsed = true;
            this.attack += 2; // Temporary attack boost
            return `${this.name} uses War Cry, increasing attack!`;
        }
        return `${this.name} has already used War Cry.`;
    },
};

// Player attacking an enemy
export function attackEnemy(enemy) {
    const { damage, roll } = calculateAttackDamage(gameState.stats.attack);
    if (roll >= enemy.calculateAC()) {
        enemy.hp = Math.max(0, enemy.hp - damage);
        return roll === 20
            ? `Critical hit! You deal ${damage} damage to the ${enemy.name}!`
            : `You hit the ${enemy.name} for ${damage} damage!`;
    }
    return `You miss the ${enemy.name}!`;
}

// Inventory management
export const Potion = {
    name: "HP Potion",
    price: 10,
    addToInventory() {
        gameState.inventory.potions++;
    },
};

export function buyItem(item) {
    if (gameState.gold >= item.price) {
        gameState.gold -= item.price;
        item.addToInventory();
        savePlayerData();
        return true;
    }
    return false;
}

// Game state persistence
export function savePlayerData() {
    console.log("[GameState] Saving:", gameState);
    localStorage.setItem("gameState", JSON.stringify(gameState));
}

export function loadPlayerData() {
    try {
        const savedGameState = JSON.parse(localStorage.getItem("gameState"));
        if (savedGameState) {
            Object.assign(gameState, savedGameState);
            console.log("[GameState] Loaded:", gameState);
        }
    } catch (error) {
        console.error("[GameState] Failed to load:", error);
    }
}