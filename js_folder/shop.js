import { gameState, loadPlayerData, buyItem, Potion, savePlayerData } from "./gameData.js";

loadPlayerData();

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
    } else {
        alert("Not enough gold!");
    }
}

document.getElementById('buyPotionsBtn').addEventListener('click', () => handleBuyItem(Potion));

updateShopUI();