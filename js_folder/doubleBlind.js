document.addEventListener("DOMContentLoaded", () => {
    const randomizeBtn = document.getElementById("randomizeBtn");
    const randomizeFiveBtn = document.getElementById("randomizeFiveBtn");
    const namesInput = document.getElementById("namesInput");
  
    // Event listeners for the buttons
    randomizeBtn.addEventListener("click", () => handleRandomization(false));
    randomizeFiveBtn.addEventListener("click", () => handleRandomization(true));
  
    function handleRandomization(limitToFive) {
      const input = namesInput.value.trim();
      if (!input) {
        alert("Please enter some names.");
        return;
      }
  
      const names = input.split("\n").map(name => name.trim()).filter(name => name);
      const requiredMinimum = limitToFive ? 5 : 2;
  
      if (names.length < requiredMinimum) {
        alert(`Please enter at least ${requiredMinimum} names.`);
        return;
      }
  
      const selectedNames = limitToFive ? getRandomSubset(names, 5) : names;
      const assignments = randomizeNames(selectedNames);
      displayAssignments(assignments);
    }
  
    function getRandomSubset(array, size) {
      const shuffled = [...array].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, size);
    }
  
    function randomizeNames(names) {
      const shuffledNames = [...names].sort(() => Math.random() - 0.5);
      return shuffledNames.map((name, index) => ({
        codeName: `Person ${index + 1}`,
        actualName: name,
      }));
    }
  
    function displayAssignments(assignments) {
      const assignmentList = document.getElementById("assignmentList");
      assignmentList.innerHTML = "";
  
      assignments.forEach(assignment => {
        const li = document.createElement("li");
        li.textContent = assignment.codeName;
        assignmentList.appendChild(li);
      });
  
      document.getElementById("output").classList.remove("hidden");
  
      document.getElementById("revealBtn").onclick = () => revealAssignments(assignments);
    }
  
    function revealAssignments(assignments) {
      const revealList = document.getElementById("revealList");
      revealList.innerHTML = "";
  
      assignments.forEach(assignment => {
        const li = document.createElement("li");
        li.textContent = `${assignment.codeName} ➡️ ${assignment.actualName}`;
        revealList.appendChild(li);
      });
  
      document.getElementById("revealOutput").classList.remove("hidden");
    }
  });
  