function toggleMenu() {
    navHeight = 50
    var x = document.getElementById("topnav");
    if (x.className === "") {
        x.className = "responsive";
        var num_links = x.getElementsByTagName("a").length;
        x.style.maxHeight = num_links * navHeight + "px";
    } else {
        x.style.maxHeight = navHeight + "px";
        setTimeout(function(){
            x.className = "";
        }, 300);
    }
}

document.getElementById("toggleButton").addEventListener("click", function (event) {
    event.stopPropagation();
    const banner = document.getElementById("banner");
    // banner.classList.toggle("expanded");
    if (document.fullscreenElement) {
        document.exitFullscreen();
        return;
      }
      // Make the .element div fullscreen.
      banner.requestFullscreen();
});