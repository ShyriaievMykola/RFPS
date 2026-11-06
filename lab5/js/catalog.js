if (!Element.prototype.replaceChildren) {
    Element.prototype.replaceChildren = function (...nodes) {
        this.textContent = "";
        this.append(...nodes);
    };
}

const products = document.querySelectorAll(".product");
const productNames = document.getElementsByClassName("product-name");
const searchInput = document.getElementById("search");
const searchInfo = document.getElementById("search-info");

let newest = products[0];
for (const product of products) {
    if (product.dataset.added > newest.dataset.added) newest = product;
}

const badge = document.createElement("span");
badge.className = "new-badge";
newest.querySelector(".product-name").append(badge);

const badgeText = "Новинка!";
let printed = 0;

function typeBadge() {
    printed = printed > badgeText.length + 5 ? 0 : printed + 1;
    badge.textContent = badgeText.slice(0, printed);
}

setInterval(typeBadge, 200);

function searchProducts() {
    const query = searchInput.value.trim().toLowerCase();
    let found = 0;

    for (const name of productNames) {
        const match = name.firstChild.textContent.toLowerCase().includes(query);
        name.closest("li").hidden = !match;
        if (match) found++;
    }

    if (!query) searchInfo.replaceChildren();
    else if (found === 0) searchInfo.replaceChildren(`Нічого не знайдено за запитом «${query}»`);
    else searchInfo.replaceChildren(`Знайдено товарів: ${found}`);
}

searchInput.addEventListener("input", searchProducts);
