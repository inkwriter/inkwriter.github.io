import {gameState, loadPlayerData, savePlayerData} from './gameData.js';

loadPlayerData();

function updateGameUI() {
    const playerNameElement = document.getElementById('playerName');
    if (playerNameElement) {
        playerNameElement.textContent = gameState.playerName || "Player";
    }


    document.getElementById('xp').textContent = `${gameState.xp}/100`;
    document.getElementById('hp').textContent = gameState.hp;
    document.getElementById('level').textContent = gameState.level;
    document.getElementById('gold').textContent = gameState.gold;

    document.getElementById('healthPotions').textContent = gameState.inventory.potions;
    document.getElementById('poison').textContent = textContent = gameState.inventory.poison;

    document.getElementById('att').textContent = gameState.stats.attack;
    document.getElementById('def').textContent = gameState.stats.defense;
    document.getElementById('spd').textContent = gameState.stats.speed;
}

 function revealBoss() {
    if (gameState.level >= 3) {
        discovered.classList.remove('hidden');
        bossBattleBtn.classList.remove('hidden');
     }
 }

revealBoss();

window.addEventListener('beforeunload', savePlayerData);

document.addEventListener('DOMContentLoaded', updateGameUI);