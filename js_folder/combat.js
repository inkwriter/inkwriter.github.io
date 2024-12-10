import { gameState, Bandit, attackEnemy, savePlayerData, BanditKing } from "../js_folder/gameData.js";
import { handleEndGame } from "../js_folder/endPage.js";
import { showDialogue, hideDialogue } from "../js_folder/combatDialogue.js";

// Clone the Bandit as the initial enemy for combat
let currentEnemy = { ...Bandit };

// Initialize level-up increments for player stats
let levelUpIncrements = {
    attack: 0,
    defense: 0,
    speed: 0,
};

function startCombat() {
    console.log("Combat started...");
    showDialogue(); // Show the dialogue
    // Use setTimeout to hide the dialogue after a few moments (e.g., 3 seconds)
    setTimeout(hideDialogue, 3000);
}

// Load the chosen increments from localStorage
function loadLevelUpIncrements() {
    const savedIncrements = JSON.parse(localStorage.getItem("levelUpIncrements"));
    if (savedIncrements) {
        Object.assign(levelUpIncrements, savedIncrements);
        console.log("Loaded level-up increments:", levelUpIncrements);
    }
}

// Function to update combat-related UI elements
function updateCombatUI() {
    console.log("Updating combat UI...");

    updateElementTextContent("playerName", gameState.playerName || "Player");
    updateElementTextContent("hp", gameState.hp);
    updateElementTextContent("enemyHP", currentEnemy.hp > 0 ? currentEnemy.hp : "Defeated");
    updateElementTextContent("gold", gameState.gold);
    updateElementTextContent("healthPotions", gameState.inventory.potions);
    updateElementTextContent("playerAttackFeedback");
    updateElementTextContent("enemyAttackFeedback");
    // Set default combat feedback only if no feedback is present
    updateElementTextContent("level", gameState.level);
    console.log("Combat UI updated.");
}

// Utility function to update the text content of an element
function updateElementTextContent(id, text) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text;
        console.log(`Updated element #${id} to:`, text);
    } else {
        console.warn(`Element with ID "${id}" not found.`);
    }
}

// Update combat feedback for both player and enemy
function updateCombatFeedback(playerMessage, enemyMessage) {
    console.log("Updating combat feedback...");
    updateElementTextContent("playerAttackFeedback", playerMessage);
    updateElementTextContent("enemyAttackFeedback", enemyMessage);
}

// Handle player's attack against the current enemy
function attack() {
    console.log("Attack function triggered...");
    if (currentEnemy.hp > 0 && gameState.hp > 0) {
        // Player attacks
        const playerMessage = attackEnemy(currentEnemy);
        console.log("Player attack result:", playerMessage);

        // Update feedback for player's attack
        updateElementTextContent("playerAttackFeedback", playerMessage);

        if (currentEnemy.hp > 0) {
            // Enemy counterattacks if still alive
            const enemyMessage = currentEnemy.attackPlayer(gameState);
            console.log("Enemy attack result:", enemyMessage);

            // Update feedback for enemy's counter-attack
            updateElementTextContent("enemyAttackFeedback", enemyMessage);

            if (gameState.hp <= 0) {
                console.log("Player defeated. Triggering game over.");
                handleEndGame(false); // Game Over
                return;
            }
        } else {
            console.log(`You defeated the ${currentEnemy.name}!`);
            alert(`You defeated the ${currentEnemy.name}! + 10 Gold!`);
            gameState.gold += 10; // Reward gold
            grantXP(20); // Reward XP
            
            runAwayBtn.textContent = "RETURN TO CAMP";

            savePlayerData(); // Save updated game state
            updateCombatUI(); // Refresh UI
            return;
        }

        updateElementTextContent("hp", gameState.hp);
        updateElementTextContent("enemyHP", currentEnemy.hp > 0 ? currentEnemy.hp : "Defeated");
        savePlayerData(); // Save updated state
    } else {
        console.log("Attack conditions not met. Either player or enemy is defeated.");
    }
}

// Grant XP and handle leveling up
function grantXP(amount) {
    console.log(`Granting ${amount} XP...`);
    gameState.xp += amount;
    console.log("Total XP:", gameState.xp);

    if (gameState.xp >= 100) {
        // Level up if XP threshold is reached
        gameState.xp -= 100; // Carry over excess XP
        gameState.level++; // Increment level
        gameState.hp += 5; // Increase Health
        alert("You leveled up!");

        console.log("Applying level-up increments:", levelUpIncrements);
        gameState.stats.attack += Math.floor(levelUpIncrements.attack);
        gameState.stats.defense += Math.floor(levelUpIncrements.defense);
        gameState.stats.speed += Math.floor(levelUpIncrements.speed);

        console.log("Updated stats after leveling up:", gameState.stats);
        savePlayerData(); // Save updated game state
        updateCombatUI(); // Refresh UI
    } else {
        savePlayerData(); // Save data if no level up
    }
}

// Use an item from the player's inventory
function useItem() {
    console.log("Use Item function triggered...");
    if (gameState.inventory.potions > 0) {
        gameState.hp = Math.min(100, gameState.hp + 10); // Heal player
        gameState.inventory.potions--; // Deduct potion
        alert("You used a health potion and restored 10 HP!");
        updateCombatUI(); // Refresh UI
        savePlayerData(); // Save updated game state
    } else {
        alert("You have no health potions left!");
        console.log("No health potions available to use.");
    }
}

// Modify the DOMContentLoaded event listener
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOMContentLoaded triggered, initializing combat...");

    const attackBtn = document.getElementById("attackBtn");
    const useItemBtn = document.getElementById("useItemBtn");

    if (attackBtn) {
        attackBtn.addEventListener("click", attack);
        console.log("Attack button event listener added.");
    } else {
        console.error("Attack button not found in DOM.");
    }

    if (useItemBtn) {
        useItemBtn.addEventListener("click", useItem);
        console.log("Use Item button event listener added.");
    } else {
        console.error("Use Item button not found in DOM.");
    }

    // Load saved increments and update UI initially
    loadLevelUpIncrements();
    updateCombatUI();
    
    // Start combat when the page loads or when a new fight begins
    startCombat();
});
