// Hardcode the API key here
const apiKey = "YourKeyHere";

// Log the API Key to verify it's set correctly
console.log("Using API Key:", apiKey);

/**
 * Fetches current weather data for given coordinates.
 * @param {number} latitude - Latitude of the location
 * @param {number} longitude - Longitude of the location
 * @returns {Promise<Object|null>} Returns weather data or null if there's an error
 */
export async function getWeather(latitude, longitude) {
    // Check if API key exists
    if (!apiKey) {
        console.error("API Key is missing. Please set it in the code.");
        return null; // Exit function if API key is missing
    }

    // Build the API URL with the hardcoded API key
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`;

    try {
        console.log(`Fetching weather data for Latitude: ${latitude}, Longitude: ${longitude}`);
        console.log("API URL:", apiUrl); // Log the API URL for debugging

        const response = await fetch(apiUrl);
        console.log("Response status:", response.status); // Log the response status

        // Check if the API call was successful
        if (!response.ok) {
            throw new Error(`Error fetching weather: ${response.statusText}`);
        }

        // Parse and return the weather data
        const weatherData = await response.json();
        console.log("Weather data fetched successfully:", weatherData);
        return weatherData;
    } catch (error) {
        // Handle any fetch errors
        console.error("Failed to fetch weather data:", error.message);
        return null;
    }
}

/**
 * Adjusts player stats based on the weather condition.
 * @param {Object} weatherData - Weather data from OpenWeatherMap API
 * @param {Object} gameState - Current game state containing player stats
 * @returns {void}
 */
export function adjustPlayerStatsBasedOnWeather(weatherData, gameState) {
    if (!weatherData) {
        console.warn("Weather data is null. Skipping weather adjustments.");
        return;
    }

    // Extract the weather condition and adjust player stats accordingly
    const weatherCondition = weatherData.weather[0].main.toLowerCase();
    console.log(`Weather condition detected: ${weatherCondition}`);

    if (weatherCondition.includes("rain")) {
        console.log("Rain detected: Reducing speed by 1.");
        gameState.stats.speed = Math.max(1, gameState.stats.speed - 1);
    } else if (weatherCondition.includes("snow")) {
        console.log("Snow detected: Reducing speed by 2.");
        gameState.stats.speed = Math.max(1, gameState.stats.speed - 2);
    } else {
        console.log("Weather has no effect on player stats.");
    }

    // Update the UI after adjusting stats due to weather
    // Assuming there's a function to update UI elsewhere
    updateGlobalUI(); // Make sure this function is defined or imported in the scope where this is used
}
