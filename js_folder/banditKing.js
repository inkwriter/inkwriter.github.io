import { gameState, BanditKing, attackEnemy, savePlayerData } from "../js_folder/gameData.js";
import { handleEndGame } from "../js_folder/endPage.js";

let currentEnemy = { ...BanditKing };

// Initialize level-up increments for player stats
let levelUpIncrements = {
    attack: 0,
    defense: 0,
    speed: 0,
};

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
    updateElementTextContent("playerName", gameState.playerName || "Player");
    updateElementTextContent("hp", gameState.hp);
    updateElementTextContent("enemyHP", currentEnemy.hp > 0 ? currentEnemy.hp : "Defeated");
    updateElementTextContent("gold", gameState.gold);
    updateElementTextContent("healthPotions", gameState.inventory.potions);
    updateElementTextContent("playerAttackFeedback", "");
    updateElementTextContent("enemyAttackFeedback", "");
    updateElementTextContent("level", gameState.level);
}

// Utility function to update a single element's text content
function updateElementTextContent(id, text) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text;
    } else {
        console.warn(`Element with ID "${id}" not found.`);
    }
}

function updateCombatFeedback(playerMessage, enemyMessage) {
    updateElementTextContent("playerAttackFeedback", playerMessage);
    updateElementTextContent("enemyAttackFeedback", enemyMessage);
}

// Player attack logic
function attack() {
    if (currentEnemy.hp > 0 && gameState.hp > 0) {
        const playerMessage = attackEnemy(currentEnemy);
        console.log("Player's attack damage:", playerMessage);

        const enemyMessage = currentEnemy.hp > 0 ? currentEnemy.attackPlayer(gameState) : "";
        
        updateCombatFeedback(playerMessage, enemyMessage);

        updateElementTextContent("enemyHP", currentEnemy.hp > 0 ? currentEnemy.hp : "Defeated");

        if (currentEnemy.hp <= 0) {
            alert(`You defeated the ${currentEnemy.name}!`);
            gameState.gold += 10; 
            grantXP(20);
            savePlayerData();
            updateCombatUI();
            handleEndGame(true); // Victory
            return;
        }

        if (gameState.hp <= 0) {
            handleEndGame(false); // Game Over
            return;
        }

        updateElementTextContent("hp", gameState.hp);
        savePlayerData();
    }
}

// Grant XP and handle leveling up
function grantXP(amount) {
    gameState.xp += amount;
    console.log("XP gained:", amount, "Total XP:", gameState.xp);

    if (gameState.xp >= 100) {
        gameState.xp -= 100;
        gameState.level++;
        alert("You leveled up!");

        gameState.stats.attack += Math.floor(levelUpIncrements.attack);
        gameState.stats.defense += Math.floor(levelUpIncrements.defense);
        gameState.stats.speed += Math.floor(levelUpIncrements.speed);

        console.log("Level-up applied:", gameState.stats);

        savePlayerData();
        updateCombatUI();
    } else {
        savePlayerData();
    }
}

// Add event listeners for combat actions
document.addEventListener("DOMContentLoaded", () => {
    const attackBtn = document.getElementById("attackBtn");
    const useItemBtn = document.getElementById("useItemBtn");

    if (attackBtn) {
        attackBtn.addEventListener("click", attack);
    } else {
        console.error("Attack button not found in the DOM");
    }

    if (useItemBtn) {
        useItemBtn.addEventListener("click", () => {
            if (gameState.inventory.potions > 0) {
                gameState.hp = Math.min(100, gameState.hp + 10);
                gameState.inventory.potions--;
                alert("You used a potion and healed 10 HP!");
                updateCombatUI();
                savePlayerData();
            } else {
                alert("You have no potions!");
            }
        });
    } else {
        console.error("Use Item button not found in the DOM");
    }

    loadLevelUpIncrements();
    updateCombatUI();
});