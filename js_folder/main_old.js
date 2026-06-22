function toggleMenu() {
    var menu = document.getElementById("primaryNav");
    if (menu.style.display === "block") {
        menu.style.display = "none";
    } else {
        menu.style.display = "block";
    }
}

var x = document.getElementById("hamburgerBtn");
x.onclick = toggleMenu;
