const details = document.getElementById("details");
const tip = document.createElement("span");
tip.className = "details-tip";
tip.textContent = "Ваша думка для нас важлива! Конкретизуйте мету звернення, будь ласка";
details.after(tip);

function showDetailsTip() {
    details.classList.add("details-active");
    tip.classList.add("details-tip-visible");
}

function hideDetailsTip() {
    details.classList.remove("details-active");
    tip.classList.remove("details-tip-visible");
}

details.onmouseout = hideDetailsTip;
