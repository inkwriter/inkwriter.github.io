import { gameState } from "./gameData.js";

function displayEndMessage(endType) {
    const endTitle = document.getElementById("endTitle");
    const endMessage = document.getElementById("endMessage");

    // Retrieve saved game state
    const savedState = JSON.parse(localStorage.getItem("gameState"));
    if (savedState) {
        Object.assign(gameState, savedState);
    }

    if (endType === "victory") {
        endTitle.textContent = "Victory!";
        endMessage.innerHTML = `
            <p>Congratulations, ${gameState.playerName || "Player"}!</p>
            <p>You defeated the Bandit King and saved the town!</p>
            <p>Final Stats:</p>
            <ul>
                <li>Level: ${gameState.level}</li>
                <li>Gold: ${gameState.gold}</li>
                <li>Attack: ${gameState.stats.attack}</li>
                <li>Defense: ${gameState.stats.defense}</li>
                <li>Speed: ${gameState.stats.speed}</li>
            </ul>
        `;
    } else {
        endTitle.textContent = "Game Over";
        endMessage.innerHTML = `
            <p>Sorry, ${gameState.playerName || "Player"}, you have been defeated.</p>
            <p>Better luck next time!</p>
            <p>Final Stats:</p>
            <ul>
                <li>Level: ${gameState.level}</li>
                <li>Gold: ${gameState.gold}</li>
                <li>Attack: ${gameState.stats.attack}</li>
                <li>Defense: ${gameState.stats.defense}</li>
                <li>Speed: ${gameState.stats.speed}</li>
            </ul>
        `;
    }
}

export function handleEndGame(isVictory) {
    const endType = isVictory ? "victory" : "gameOver";
    localStorage.setItem("endType", endType);
    localStorage.setItem("gameState", JSON.stringify(gameState)); // Save game state
    window.location.href = "../pages/gameOver.html";
}

document.addEventListener("DOMContentLoaded", () => {
    const endType = localStorage.getItem("endType") || "gameOver";
    displayEndMessage(endType);

    // Add replay button functionality
    document.getElementById("replayButton").addEventListener("click", () => {
        localStorage.removeItem("gameState"); // Clear game state from localStorage
        localStorage.removeItem("levelUpIncrements"); // Clear level up increments from localStorage
        window.location.href = "../banditsBaneIndex.html"; // Redirect to start page
    });
});