function toggleMenu () {
    document.getElementById("primaryNav").classList.toggle("open");
}

let x = document.getElementById("hamburgerBtn");
x.onclick = toggleMenu;

function final(){
  let d6One = rndDice(1, 7);
  let d6Two = rndDice(1, 7);
  let d6Three = rndDice(1, 7);

  let final = d6One + d6Two + d6Three;
  return final;
}


function rndDice(min, max){
    return Math.floor(Math.random() * (max - min)) + min;

}
  
  

  function blacksmithFunction() {
    var x = document.getElementById("blacksmith");
    if (x.style.display === "none") {
      x.style.display = "block";
    } else {
      x.style.display = "none";
    }
  }

  function forestLoseFunction() {
    var x = document.getElementById("forestLose");
    if (x.style.display === "none") {
      x.style.display = "block";
    } else {
      x.style.display = "none";
    }
  }

  function goblinsWinFunction() {
    var x = document.getElementById("goblinsWin");
    if (x.style.display === "none") {
      x.style.display = "block";
    } else {
      x.style.display = "none";
    }
  }

  function playerWinsFunction() {
    var x = document.getElementById("playerWins");
    if (x.style.display === "none") {
      x.style.display = "block";
    } else {
      x.style.display = "none";
    }
  }

  function intoTheWoodsFunction() {
    var x = document.getElementById("intoTheWoods");
    if (x.style.display === "none") {
      x.style.display = "block";
    } else {
      x.style.display = "none";
    }
  }

  function intoCaveFunction() {
    var x = document.getElementById("intoCave");
    if (x.style.display === "none") {
      x.style.display = "block";
    } else {
      x.style.display = "none";
    }
  }

  function lookAroundFunction() {
    var x = document.getElementById("lookAround");
    if (x.style.display === "none") {
      x.style.display = "block";
    } else {
      x.style.display = "none";
    }
  }

  function playerDiesCaveFunction() {
    var x = document.getElementById("playerDiesCave");
    if (x.style.display === "none") {
      x.style.display = "block";
    } else {
      x.style.display = "none";
    }
  }

  function lookAroundFunction() {
    var x = document.getElementById("lookAround");
    if (x.style.display === "none") {
      x.style.display = "block";
    } else {
      x.style.display = "none";
    }
  }

  function playerWinsCaveFunction() {
    var x = document.getElementById("playerWinsCave");
    if (x.style.display === "none") {
      x.style.display = "block";
    } else {
      x.style.display = "none";
    }
  }


