import {gameState, setPlayerName} from './gameData.js';

// This handles the name submit
const form = document.getElementById('nameForm');
const choiceBtn = document.getElementById('choiceBtn');
const playerNameSpan = document.getElementById('playerName')
const introMessage = document.getElementById('introMessage');

if (form) {
    form.addEventListener('submit', (event) => {
        event.preventDefault();

        const name = document.getElementById('name').value;

        // Checks to make sure you entered a name
        if (!name) {
            alert("Please enter your name.");
            return;
        }

        // Save the player's name in the game state and localStorage 
        setPlayerName(name);
        console.log("name is set.")

        // Update the UI to show the player's name
        introMessage.classList.remove('hidden');
        playerNameSpan.textContent = name;
        choiceBtn.classList.remove('hidden');

    });
}

function startNewGame() {
    localStorage.removeItem("gameState");
    localStorage.removeItem("levelUpIncrements");
    window.location.href = "game.html"; // or wherever your game starts
}

document.getElementById("newGameBtn").addEventListener("click", startNewGame);