import { gameState, loadPlayerData, buyItem, Potion, savePlayerData } from "./gameData.js";
import { showDialogue, hideDialogue } from "../js_folder/shopDialogue.js";

loadPlayerData();

function startDialogue() {
    console.log("Dialogue started...");
    showDialogue(); // Show the dialogue
    // Use setTimeout to hide the dialogue after a few moments (e.g., 3 seconds)
    setTimeout(hideDialogue, 3000);
}

// Update the shop UI with player data
function updateShopUI(){
    document.getElementById('playerName').textContent = gameState.playerName || "Player";
    document.getElementById('gold').textContent = gameState.gold;
    document.getElementById('healthPotions').textContent = gameState.inventory.potions;
    document.getElementById('poison').textContent = gameState.inventory.poison;
}

// Handle buying an item
function handleBuyItem(item) {
    if (gameState.gold >= item.price) {
        gameState.gold -= item.price;
        item.addToInventory();
        savePlayerData();
        console.log("GameState after saving in shop:", JSON.parse(localStorage.getItem("gameState")));
        updateShopUI();
        console.log(`${item.name}purchased successfully!`);
        startDialogue();
    } else {
        alert("Not enough gold!");
    }
}

document.getElementById('buyPotionsBtn').addEventListener('click', () => handleBuyItem(Potion));

updateShopUI();