import { gameState, savePlayerData } from "../js_folder/gameData.js";

// Track stat increments for future level-ups
export const levelUpIncrements = {
    attack: 0,
    defense: 0,
    speed: 0,
};

// Update stats UI
function updateStatsUI() {
    document.getElementById("att").textContent = gameState.stats.attack;
    document.getElementById("def").textContent = gameState.stats.defense;
    document.getElementById("spd").textContent = gameState.stats.speed;
}

// Update general UI
function updateGeneralUI() {
    const playerNameElement = document.getElementById("playerName");
    const goldElement = document.getElementById("gold");

    if (playerNameElement) {
        playerNameElement.textContent = gameState.playerName || "Player";
    }
    if (goldElement) {
        goldElement.textContent = gameState.gold;
    }
}

// Disable buttons to prevent multiple selections
function disableButtons() {
    const buttons = document.querySelectorAll(".choice-buttons button, #resetStats");
    buttons.forEach((button) => (button.disabled = true));
    document.querySelector(".buttons a button").classList.remove("hidden");
}

// Handle  a single stat
function doubleStat(stat) {
    gameState.stats[stat] += 2;
    levelUpIncrements[stat] += 2; // Increment for future level-ups
    savePlayerData();
    saveLevelUpIncrements();
    updateStatsUI();
    alert(`${stat.charAt(0).toUpperCase() + stat.slice(1)} increased by 2!`);
    disableButtons();
}

// Handle splitting points between two stats
function splitStat(stat1, stat2) {
    gameState.stats[stat1]++;
    gameState.stats[stat2]++;
    levelUpIncrements[stat1] += 1; // Half increment for split
    levelUpIncrements[stat2] += 1;
    savePlayerData();
    saveLevelUpIncrements();
    updateStatsUI();
    alert(
        `${stat1.charAt(0).toUpperCase() + stat1.slice(1)} and ${stat2.charAt(0).toUpperCase() + stat2.slice(1)} each increased by 1!`
    );
    disableButtons();
}

// Reset stats to default values
function resetStats() {
    gameState.stats.attack = 1;
    gameState.stats.defense = 1;
    gameState.stats.speed = 1;
    levelUpIncrements.attack = 0;
    levelUpIncrements.defense = 0;
    levelUpIncrements.speed = 0;
    savePlayerData();
    saveLevelUpIncrements();
    updateStatsUI();
    alert("Stats have been reset to their default values.");
}

// Save level-up increments to localStorage
function saveLevelUpIncrements() {
    localStorage.setItem("levelUpIncrements", JSON.stringify(levelUpIncrements));
}

// Load level-up increments from localStorage
function loadLevelUpIncrements() {
    const savedIncrements = JSON.parse(localStorage.getItem("levelUpIncrements"));
    if (savedIncrements) {
        Object.assign(levelUpIncrements, savedIncrements);
    }
}

// Event listeners for buttons
document.getElementById("doubleAttack").addEventListener("click", () => doubleStat("attack"));
document.getElementById("doubleDefense").addEventListener("click", () => doubleStat("defense"));
document.getElementById("doubleSpeed").addEventListener("click", () => doubleStat("speed"));

document.getElementById("splitAttackDefense").addEventListener("click", () => splitStat("attack", "defense"));
document.getElementById("splitAttackSpeed").addEventListener("click", () => splitStat("attack", "speed"));
document.getElementById("splitDefenseSpeed").addEventListener("click", () => splitStat("defense", "speed"));

// Initialize UI
loadLevelUpIncrements();
updateStatsUI();
updateGeneralUI();