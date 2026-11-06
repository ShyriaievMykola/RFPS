const catalogImages = [
    "images/dress-vesna-small.jpg",
    "images/skirt-gratsiia-small.jpg",
    "images/vyshyvanka-karpaty-small.jpg",
    "images/jeans-classic-small.jpg",
    "images/kids-tee-sonechko-small.jpg",
    "images/coat-kyiv-small.jpg"
];

const brand = document.querySelector(".brand");
const title = brand.getElementsByTagName("h1")[0];
const fallingLayer = document.createElement("div");
fallingLayer.className = "falling-layer";
brand.prepend(fallingLayer);

function capitalLetterHeight() {
    const style = getComputedStyle(title);
    const context = document.createElement("canvas").getContext("2d");
    context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    return context.measureText("П").actualBoundingBoxAscent;
}

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function dropProduct() {
    if (typeof fallingLayer.animate !== "function" || reducedMotion.matches) return;
    const height = Math.floor(capitalLetterHeight() * 2);
    const image = document.createElement("img");
    image.src = catalogImages[Math.floor(Math.random() * catalogImages.length)];
    image.alt = "";
    image.className = "falling-item";
    image.style.height = `${height}px`;
    image.style.left = `${Math.random() * 95}%`;
    fallingLayer.append(image);

    const fall = image.animate(
        [
            { transform: `translateY(-${height}px)` },
            { transform: `translateY(${fallingLayer.clientHeight}px)` }
        ],
        { duration: 3000 + Math.random() * 2000, easing: "linear" }
    );
    fall.onfinish = () => image.remove();
}

setInterval(dropProduct, 1200);

const narrowScreen = window.matchMedia("(max-width: 768px)");

function placeNavigation() {
    document.body.classList.toggle("nav-vertical", narrowScreen.matches);
}

placeNavigation();
if (narrowScreen.addEventListener) narrowScreen.addEventListener("change", placeNavigation);
else narrowScreen.addListener(placeNavigation);
