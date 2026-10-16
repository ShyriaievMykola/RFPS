const products = [
  { article: "UA4521DR", id: 1, name: "Сукня лляна \"Весна\"", country: "Україна", price1: 2100, price2: 1950, price3: 1850, stock: 14 },
  { article: "FR7730SK", id: 2, name: "Спідниця міді \"Грація\"", country: "Франція", price1: 1400, price2: 1500, price3: 1600, stock: 9 },
  { article: "UA1188VS", id: 3, name: "Вишиванка \"Карпати\"", country: "Україна", price1: 2700, price2: 2900, price3: 2800, stock: 6 },
  { article: "TR5402JN", id: 4, name: "Джинси \"Denim Classic\"", country: "Туреччина", price1: 1900, price2: 2000, price3: 2100, stock: 21 },
  { article: "UA3015TS", id: 5, name: "Футболка дитяча \"Сонечко\"", country: "Україна", price1: 520, price2: 480, price3: 450, stock: 40 },
  { article: "IT9001CT", id: 6, name: "Пальто вовняне \"Київ\"", country: "Італія", price1: 9200, price2: 8800, price3: 8500, stock: 3 },
  { article: "PL2207JK", id: 7, name: "Куртка демісезонна \"Вітер\"", country: "Польща", price1: 4200, price2: 4200, price3: 4200, stock: 7 },
  { article: "TR6633HD", id: 8, name: "Худі \"Street\"", country: "Туреччина", price1: 1700, price2: 1850, price3: 1800, stock: 12 },
  { article: "IT4410SC", id: 9, name: "Шарф кашеміровий \"Мілан\"", country: "Італія", price1: 1100, price2: 1250, price3: 1300, stock: 18 },
  { article: "UA8820SW", id: 10, name: "Светр в'язаний \"Затишок\"", country: "Україна", price1: 2400, price2: 2300, price3: 2400, stock: 10 }
];

const productFields = ["article", "id", "name", "country", "price1", "price2", "price3", "stock"];

function sortByCountry(list) {
  return [...list].sort((a, b) => a.country.localeCompare(b.country, "uk") || a.name.localeCompare(b.name, "uk"));
}

function averagePriceByCountry(list) {
  const byCountry = {};
  for (const p of list) {
    if (!byCountry[p.country]) byCountry[p.country] = { country: p.country, count: 0, sum: 0 };
    byCountry[p.country].count++;
    byCountry[p.country].sum += p.price3;
  }
  return Object.values(byCountry)
    .map(g => ({ country: g.country, count: g.count, averagePrice: +(g.sum / g.count).toFixed(2) }))
    .sort((a, b) => a.country.localeCompare(b.country, "uk"));
}

function findMinPrice2(list) {
  return list.reduce((min, p) => (p.price2 < min.price2 ? p : min));
}

function isComplete(record) {
  return productFields.every(f => record[f] !== undefined && record[f] !== null && record[f] !== "");
}

function addProduct(list, record) {
  if (isComplete(record)) list.unshift(record);
  else list.push(record);
  return list;
}

function priceTrend(product) {
  const prices = [product.price1, product.price2, product.price3];
  let falling = true;
  let rising = true;
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] >= prices[i - 1]) falling = false;
    if (prices[i] <= prices[i - 1]) rising = false;
  }
  if (falling) return "стабільно дешевшає";
  if (rising) return "стабільно дорожчає";
  return "не стабільні зміни";
}

function priceDynamics(list) {
  return list.map(p => ({
    id: p.id,
    name: p.name,
    prices: `${p.price1} → ${p.price2} → ${p.price3}`,
    trend: priceTrend(p)
  }));
}

const WORK_START = 9 * 60;
const WORK_END = 18 * 60;

const GROUPS = {
  claim: "звернулись з претензією у робочий час",
  wish: "звернулись з побажанням у робочий час",
  other: "Інші"
};

class Customer {
  constructor({ surname, name, age, education, purpose, date, time }) {
    Object.assign(this, { surname, name, age, education, purpose, date, time });
  }

  get appealDate() {
    const [year, month, day] = this.date.split("-").map(Number);
    const [hours, minutes] = this.time.split(":").map(Number);
    return new Date(year, month - 1, day, hours, minutes);
  }

  get fullName() {
    return `${this.surname} ${this.name}`;
  }

  inWorkingHours() {
    const d = this.appealDate;
    const minutesOfDay = d.getHours() * 60 + d.getMinutes();
    return minutesOfDay >= WORK_START && minutesOfDay < WORK_END;
  }

  get group() {
    if (!this.inWorkingHours()) return GROUPS.other;
    if (this.purpose === "претензія") return GROUPS.claim;
    if (this.purpose === "побажання") return GROUPS.wish;
    return GROUPS.other;
  }
}

class CustomerJournal {
  constructor(customers) {
    this.customers = customers;
  }

  appealsAt(month, hour) {
    return this.customers.filter(c => {
      const d = c.appealDate;
      return d.getMonth() + 1 === month && d.getHours() === hour;
    });
  }

  meanAge() {
    let total = 0;
    for (const c of this.customers) total += c.age;
    return total / this.customers.length;
  }

  withMeanAge() {
    const mean = this.meanAge();
    return { mean, found: this.customers.filter(c => c.age === mean) };
  }

  groupSizes() {
    const sizes = {};
    for (const g of Object.values(GROUPS)) sizes[g] = 0;
    for (const c of this.customers) sizes[c.group] += 1;
    return sizes;
  }

  byAgeDescending() {
    return [...this.customers].sort((a, b) => b.age - a.age || a.fullName.localeCompare(b.fullName, "uk"));
  }

  byName() {
    return [...this.customers].sort((a, b) => a.fullName.localeCompare(b.fullName, "uk"));
  }
}

const journal = new CustomerJournal([
  new Customer({ surname: "Гнатюк", name: "Тарас", age: 31, education: "вища", purpose: "претензія", date: "2026-11-03", time: "10:15" }),
  new Customer({ surname: "Дячук", name: "Ірина", age: 27, education: "професійна", purpose: "побажання", date: "2026-11-12", time: "10:40" }),
  new Customer({ surname: "Захарченко", name: "Богдан", age: 58, education: "повна", purpose: "претензія", date: "2026-10-28", time: "10:05" }),
  new Customer({ surname: "Остапенко", name: "Вікторія", age: 40, education: "вища", purpose: "співпраця", date: "2026-11-20", time: "10:55" }),
  new Customer({ surname: "Петрук", name: "Олег", age: 40, education: "неповна", purpose: "претензія", date: "2026-11-07", time: "18:00" }),
  new Customer({ surname: "Романюк", name: "Христина", age: 23, education: "неповна", purpose: "побажання", date: "2026-09-15", time: "08:50" }),
  new Customer({ surname: "Климчук", name: "Владислав", age: 36, education: "професійна", purpose: "претензія", date: "2026-11-25", time: "09:00" }),
  new Customer({ surname: "Федорів", name: "Зоряна", age: 19, education: "повна", purpose: "побажання", date: "2026-12-02", time: "17:59" }),
  new Customer({ surname: "Яковенко", name: "Максим", age: 66, education: "професійна", purpose: "пропозиція", date: "2026-11-18", time: "11:10" }),
  new Customer({ surname: "Бойко", name: "Людмила", age: 20, education: "вища", purpose: "питання", date: "2026-08-21", time: "13:30" })
]);

function printTask1() {
  console.log("=== Завдання 1 ===");

  console.log("\n1.1. Товари, впорядковані за країною походження:");
  console.table(sortByCountry(products), ["country", "id", "name", "price3"]);
  console.log("Середня (діюча) вартість товарів однієї країни, грн:");
  console.table(averagePriceByCountry(products));

  console.log("\n1.2. Товар з мінімальною вартістю2 (недіючою):");
  const minP2 = findMinPrice2(products);
  console.log(`${minP2.name}: вартість2 = ${minP2.price2} грн, внутрішній id = ${minP2.id}`);

  console.log("\n1.3. Додавання нових записів:");
  const list = [...products];
  addProduct(list, { article: "UA5590BL", id: 11, name: "Блуза шовкова \"Ранок\"", country: "Україна", price1: 1300, price2: 1350, price3: 1400, stock: 8 });
  addProduct(list, { article: "PL3141KD", id: 12, name: "Кардиган \"Осінь\"", country: "Польща", price1: 1600, price3: 1500, stock: 5 });
  console.table(list, ["id", "article", "name", "price2", "stock"]);

  console.log("\n1.4. Динаміка зміни ціни кожного товару:");
  console.table(priceDynamics(products));
}

function printTask2() {
  console.log("\n=== Завдання 2 ===");

  console.log("\n2.1. Клієнти, що звернулись у листопаді (11) о 10-й годині:");
  console.table(journal.appealsAt(11, 10).map(c => ({ client: c.fullName, date: c.date, time: c.time })));

  console.log("\n2.2. Середній вік клієнтів:");
  const { mean, found } = journal.withMeanAge();
  console.log(`Середній вік: ${mean}`);
  if (found.length === 0) {
    console.log("Клієнтів, вік яких дорівнює середньому, немає");
  }
  for (const c of found) {
    console.log(`Такий вік має ${c.fullName}, освіта: ${c.education}`);
  }

  console.log("\n2.3. Розподіл клієнтів за класами:");
  console.table(journal.groupSizes());
  console.table(journal.customers.map(c => ({ client: c.fullName, purpose: c.purpose, time: c.time, group: c.group })));

  console.log("\n2.4. Клієнти за спаданням віку:");
  console.table(journal.byAgeDescending().map(c => ({ client: c.fullName, age: c.age })));
  console.log("Клієнти за алфавітом:");
  console.table(journal.byName().map(c => ({ client: c.fullName, age: c.age })));
}

if (require.main === module) {
  printTask1();
  printTask2();
}

module.exports = {
  products, productFields, sortByCountry, averagePriceByCountry, findMinPrice2,
  isComplete, addProduct, priceTrend, priceDynamics,
  GROUPS, Customer, CustomerJournal, journal
};
