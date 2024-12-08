import { gameState, loadPlayerData, savePlayerData } from "./gameData.js";
import { getWeather } from "./weather.js"; // Import getWeather from weather.js

// Load player data when the script starts
console.log("[Global] Loading player data...");
loadPlayerData();
console.log("[Global] Game state after loading:", gameState);

/*
 * Fetches user's geolocation and then gets weather information.
 * A promise that resolves to a string with weather information or an error message. */

async function getWeatherInfo() {
    console.log("[Global] Attempting to fetch weather info...");
    try {
        // Check if geolocation is supported by the browser
        if ("geolocation" in navigator) {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });

            const { latitude, longitude } = position.coords;
            console.log("[Global] User's location:", latitude, longitude);

            const weatherData = await getWeather(latitude, longitude);
            if (weatherData && weatherData.weather && weatherData.weather[0]) {
                console.log("[Global] Weather data fetched:", weatherData);
                return `${weatherData.weather[0].main} - ${weatherData.weather[0].description}`;
            } else {
                console.log("[Global] No valid weather data received");
                return "Weather data could not be retrieved";
            }
        } else {
            console.log("[Global] Geolocation is not supported by this browser.");
            return "Geolocation not supported";
        }
    } catch (error) {
        console.error("[Global] Error fetching weather or geolocation info:", error);
        return "Weather data error";
    }
}

 //Update the global UI with player stats, inventory, and weather

async function updateGlobalUI() {
    console.log("[Global] Updating UI with gameState:", gameState);

    const elements = {
        playerName: document.getElementById("playerName"),
        level: document.getElementById("level"),
        gold: document.getElementById("gold"),
        xp: document.getElementById("xp"),
        hp: document.getElementById("hp"),
        att: document.getElementById("att"),
        def: document.getElementById("def"),
        spd: document.getElementById("spd"),
        healthPotions: document.getElementById("healthPotions"),
        poison: document.getElementById("poison"),
        weatherInfo: document.getElementById("weatherInfo"),
    };

    // Update all relevant elements with data from `gameState`
    for (const [key, element] of Object.entries(elements)) {
        if (!element) {
            console.warn(`[Global] Element for ${key} not found in DOM.`);
            continue;
        }

        switch (key) {
            case "playerName":
                element.textContent = gameState.playerName || "Player";
                break;
            case "level":
                element.textContent = gameState.level;
                break;
            case "gold":
                element.textContent = gameState.gold;
                break;
            case "xp":
                element.textContent = `${gameState.xp}/100`;
                break;
            case "hp":
                element.textContent = gameState.hp;
                break;
            case "att":
                element.textContent = gameState.stats.attack;
                break;
            case "def":
                element.textContent = gameState.stats.defense;
                break;
            case "spd":
                element.textContent = gameState.stats.speed;
                break;
            case "healthPotions":
                element.textContent = gameState.inventory.potions;
                break;
            case "poison":
                element.textContent = gameState.inventory.poison;
                break;
            case "weatherInfo":
                // Await weather info since it's an async operation
                const weatherText = await getWeatherInfo();
                element.textContent = weatherText;
                break;
        }

        console.log(`[Global] Updated ${key}: ${element.textContent}`);
    }
}

// Add event listeners for DOM lifecycle events
document.addEventListener("DOMContentLoaded", async () => {
    console.log("[Global] Document loaded. Initializing UI...");
    await updateGlobalUI(); // Await here because updateGlobalUI is now async
});

window.addEventListener("beforeunload", () => {
    console.log("[Global] Saving player data before unload...");
    savePlayerData();
});

// Function to display the appropriate end message
function displayEndMessage(endType) {
    const endTitle = document.getElementById("endTitle");
    const endMessage = document.getElementById("endMessage");

    if (endType === "victory") {
        endTitle.textContent = "Victory!";
        endMessage.innerHTML = `
            <p>Congratulations, ${gameState.playerName}!</p>
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
            <p>Sorry, ${gameState.playerName}, you have been defeated.</p>
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

// Function to handle redirection to end pages
export function handleEndGame(isVictory) {
    const endType = isVictory ? "victory" : "gameOver";
    localStorage.setItem("endType", endType);
    const targetPage = isVictory ? "../victory.html" : "../gameOver.html";
    window.location.href = targetPage;
}

// Ensure the correct message is displayed on the end page and handle replay button
document.addEventListener("DOMContentLoaded", async () => {
    const endType = localStorage.getItem("endType") || "gameOver"; 
    displayEndMessage(endType);
    localStorage.removeItem("endType");

    const replayButton = document.getElementById("replayButton");
    if (replayButton) {
        replayButton.addEventListener("click", () => {
            resetGameState();
            savePlayerData();
            window.location.href = "../index.html"; 
        });
    }
});