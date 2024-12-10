// Select DOM elements
const dialogueBox = document.getElementById("banditKingDialogueBox");
const dialogueText = document.getElementById("banditKingDialogueText");

// Function to update dialogue
export function updateDialogue() {
    const dialogues = [
        "Bandit King:'You shouldn't have come here...'",
        "Banit King:'I hope you've made peace...'",
        "Bandit King:'This is the end for you...'",
    ];
    // Randomly select a dialogue
    dialogueText.textContent = dialogues[Math.floor(Math.random() * dialogues.length)];
}

// Function to manage dialogue visibility
export function showDialogue() {
    if (dialogueBox) {
        dialogueBox.classList.remove("hidden");
        updateDialogue(); // Update the dialogue when showing
    } else {
        console.error("Dialogue box not found in the DOM");
    }
}

export function hideDialogue() {
    if (dialogueBox) {
        dialogueBox.classList.add("hidden");
    } else {
        console.error("Dialogue box not found in the DOM");
    }
}

// Initialize dialogue system when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
    if (dialogueBox && dialogueText) {
        // Initial setup, hide dialogue by default
        hideDialogue();
    } else {
        console.error("Dialogue elements not found in the DOM");
    }
});