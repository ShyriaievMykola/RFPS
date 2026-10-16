const test = require("node:test");
const assert = require("node:assert/strict");
const {
  products, sortByCountry, averagePriceByCountry, findMinPrice2,
  isComplete, addProduct, priceTrend, GROUPS, Customer, CustomerJournal, journal
} = require("./lab3.js");

test("1.1 сортування за країною та середня вартість", () => {
  const countries = sortByCountry(products).map(p => p.country);
  assert.deepEqual(countries, ["Італія", "Італія", "Польща", "Туреччина", "Туреччина", "Україна", "Україна", "Україна", "Україна", "Франція"]);
  const avg = Object.fromEntries(averagePriceByCountry(products).map(g => [g.country, g.averagePrice]));
  assert.deepEqual(avg, { "Італія": 4900, "Польща": 4200, "Туреччина": 1950, "Україна": 1875, "Франція": 1600 });
});

test("1.1 вихідний масив не змінюється", () => {
  assert.equal(products[0].id, 1);
  sortByCountry(products);
  assert.equal(products[0].id, 1);
});

test("1.2 мінімальна вартість2", () => {
  const p = findMinPrice2(products);
  assert.equal(p.id, 5);
  assert.equal(p.price2, 480);
});

test("1.3 повний запис — на початок, неповний — у кінець", () => {
  const list = [...products];
  const full = { article: "A1", id: 11, name: "Повний", country: "Україна", price1: 1, price2: 2, price3: 3, stock: 1 };
  const partial = { article: "A2", id: 12, name: "Без вартості2", country: "Польща", price1: 1, price3: 3, stock: 1 };
  const empty = { article: "", id: 13, name: "Порожній артикул", country: "Польща", price1: 1, price2: 2, price3: 3, stock: 1 };
  addProduct(list, full);
  addProduct(list, partial);
  addProduct(list, empty);
  assert.equal(list[0].id, 11);
  assert.equal(list.at(-2).id, 12);
  assert.equal(list.at(-1).id, 13);
  assert.equal(list.length, 13);
  assert.equal(isComplete({ ...full, stock: 0 }), true);
});

test("1.4 динаміка ціни: усі три випадки", () => {
  assert.equal(priceTrend({ price1: 3, price2: 2, price3: 1 }), "стабільно дешевшає");
  assert.equal(priceTrend({ price1: 1, price2: 2, price3: 3 }), "стабільно дорожчає");
  assert.equal(priceTrend({ price1: 1, price2: 3, price3: 2 }), "не стабільні зміни");
  assert.equal(priceTrend({ price1: 2, price2: 2, price3: 2 }), "не стабільні зміни");
  const trends = products.map(priceTrend);
  assert.equal(trends.filter(t => t === "стабільно дешевшає").length, 3);
  assert.equal(trends.filter(t => t === "стабільно дорожчає").length, 3);
  assert.equal(trends.filter(t => t === "не стабільні зміни").length, 4);
});

test("2.1 звернення за місяцем і годиною", () => {
  const found = journal.appealsAt(11, 10).map(c => c.surname);
  assert.deepEqual(found, ["Гнатюк", "Дячук", "Остапенко"]);
  assert.equal(found.includes("Захарченко"), false);
  assert.equal(found.includes("Яковенко"), false);
});

test("2.2 середній вік: збіг і відсутність збігу", () => {
  const { mean, found } = journal.withMeanAge();
  assert.equal(mean, 36);
  assert.deepEqual(found.map(c => [c.surname, c.education]), [["Климчук", "професійна"]]);
  const two = new CustomerJournal(journal.customers.slice(0, 2));
  assert.equal(two.withMeanAge().mean, 29);
  assert.equal(two.withMeanAge().found.length, 0);
});

test("2.3 класи та межі робочого часу", () => {
  assert.deepEqual(journal.groupSizes(), { [GROUPS.claim]: 3, [GROUPS.wish]: 2, [GROUPS.other]: 5 });
  const at = (time, purpose) => new Customer({ surname: "Т", name: "Т", age: 30, education: "вища", purpose, date: "2026-11-02", time }).group;
  assert.equal(at("09:00", "претензія"), GROUPS.claim);
  assert.equal(at("17:59", "побажання"), GROUPS.wish);
  assert.equal(at("18:00", "претензія"), GROUPS.other);
  assert.equal(at("08:59", "побажання"), GROUPS.other);
  assert.equal(at("12:00", "співпраця"), GROUPS.other);
});

test("2.4 сортування за спаданням віку та за алфавітом", () => {
  const ages = journal.byAgeDescending().map(c => c.age);
  assert.deepEqual(ages, [...ages].sort((a, b) => b - a));
  const tie = journal.byAgeDescending().filter(c => c.age === 40).map(c => c.surname);
  assert.deepEqual(tie, ["Остапенко", "Петрук"]);
  const names = journal.byName().map(c => c.surname);
  assert.equal(names[0], "Бойко");
  assert.equal(names.at(-1), "Яковенко");
});
