const { products, sortByCountry, Customer, journal } = require("./lab3.js");

const first = products[0];
const client = journal.customers[0];
const show = (label, value) => console.log(label.padEnd(36), value);

console.log("=== 1. Типи даних (typeof) ===");
show(`typeof "${first.article}"`, typeof first.article);
show(`typeof ${first.price3}`, typeof first.price3);
show(`typeof (${first.stock} > 0)`, typeof (first.stock > 0));
show("typeof first.discount", typeof first.discount);
show("typeof null", typeof null);
show("typeof 10n", typeof 10n);
show('typeof Symbol("id")', typeof Symbol("id"));
show("typeof first (об'єкт товару)", typeof first);
show("typeof products (масив)", typeof products);
show("Array.isArray(products)", Array.isArray(products));
show("typeof client.appealDate (Date)", typeof client.appealDate);
show("typeof sortByCountry (функція)", typeof sortByCountry);
show("typeof Customer (клас)", typeof Customer);

console.log("\n=== 2. Явне перетворення типів ===");
show(`Number("${client.time.slice(0, 2)}")`, Number(client.time.slice(0, 2)));
show(`parseInt("${client.time}")`, parseInt(client.time));
show('parseFloat("1875.50 грн")', parseFloat("1875.50 грн"));
show(`String(${first.price3})`, JSON.stringify(String(first.price3)));
show(`Boolean(${first.stock})`, Boolean(first.stock));
show("Boolean(0)", Boolean(0));

console.log("\n=== 3. Неявне перетворення типів ===");
show(`"Ціна: " + ${first.price3}`, "Ціна: " + first.price3);
show('"10" * 60', "10" * 60);
show('"5" - 2', "5" - 2);
show("true + 1", true + 1);
show('1 == "1"', 1 == "1");
show('1 === "1"', 1 === "1");
show('"" ? "так" : "ні"', "" ? "так" : "ні");

console.log("\n=== 4. Оператори ===");
let price = first.price1;
show(`let price = ${first.price1}`, price);
price -= first.price3;
show(`price -= ${first.price3}`, price);
price *= 2;
show("price *= 2", price);
show(`${first.price1} % 1000`, first.price1 % 1000);
show("2 ** 10", 2 ** 10);
show(`${first.price3} !== ${first.price2}`, first.price3 !== first.price2);

console.log("\n=== 5. Цикл do...while ===");
let count = 0;
let stock = 0;
do {
  stock += products[count].stock;
  count++;
} while (stock < 50);
console.log(`Перші ${count} товари разом мають ${stock} шт. на складі`);

console.log("\n=== 6. Способи оголошення функцій і scope ===");
const shop = "Полотно";
function withVat(value) {
  return value * 1.2;
}
const withDiscount = function (value, percent) {
  return value - value * percent / 100;
};
const formatPrice = value => `${value.toFixed(2)} грн`;
show("function declaration: withVat", formatPrice(withVat(first.price3)));
show("function expression: withDiscount", formatPrice(withDiscount(first.price3, 10)));

function scopeDemo() {
  const local = "локальна";
  if (true) {
    let block = "блокова";
    var fn = "функціональна";
    console.log("всередині блоку:", shop, local, block, fn);
  }
  console.log("після блоку:   ", shop, local, typeof block, fn);
}
scopeDemo();
console.log("поза функцією: ", shop, typeof local);

console.log("\n=== 7. Date ===");
const d = client.appealDate;
show("d.getFullYear()", d.getFullYear());
show("d.getMonth() + 1", d.getMonth() + 1);
show("d.getDate()", d.getDate());
show("d.getDay() (0 = неділя)", d.getDay());
show('d.toLocaleDateString("uk-UA")', d.toLocaleDateString("uk-UA"));

console.log("\n=== 8. Math ===");
const prices = products.map(p => p.price3);
show("Math.max(...prices)", Math.max(...prices));
show("Math.min(...prices)", Math.min(...prices));
show(`Math.abs(${first.price3} - ${first.price1})`, Math.abs(first.price3 - first.price1));
show(`Math.round(${first.price3} * 1.15)`, Math.round(first.price3 * 1.15));

console.log("\n=== 9. String ===");
show(`"${first.article}".slice(0, 2)`, first.article.slice(0, 2));
show(`"${first.article}".startsWith("UA")`, first.article.startsWith("UA"));
show(`"${client.surname}".toUpperCase()`, client.surname.toUpperCase());
show('first.name.includes("Весна")', first.name.includes("Весна"));
show(`"${client.time}".split(":")`, client.time.split(":"));
show("Товарів з кодом UA", products.filter(p => p.article.startsWith("UA")).length);

console.log("\n=== 10. Hoisting ===");
show("hoisted() до оголошення", hoisted());
function hoisted() {
  return "працює";
}
show("early (var) до оголошення", early);
var early = 5;
try {
  console.log(late);
} catch (e) {
  show("late (let) до оголошення", `${e.name}: ${e.message}`);
}
let late = 5;
try {
  expr();
} catch (e) {
  show("expr() (var + function expression)", `${e.name}: ${e.message}`);
}
var expr = function () {};
