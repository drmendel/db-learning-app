// MongoDB seed data (each exercise starts from a fresh copy)

// Lab 8 – db "feladatok"
export const feladatok = {
  feladatok: {
    Users: [
      { name: 'Sanyi', age: 22, city: 'Szeged', active: true, hobbies: ['foci', 'zene'], scores: [3, 5, 4], address: { street: 'Fő utca', number: 12 } },
      { name: 'Pista', age: 30, city: 'Debrecen', active: true, hobbies: ['zene', 'film'], scores: [5, 4] },
      { name: 'Sára', age: 25, city: 'Budapest', active: true, hobbies: ['olvasás', 'film'], scores: [4, 4, 5] },
      { name: 'Anna', age: 27, city: 'Budapest', active: false, hobbies: ['foci', 'film'], scores: [5, 5, 5] },
      { name: 'Bence', age: 19, city: 'Szeged', active: true, hobbies: ['futás'], scores: [2, 3, 4] },
      { name: 'Dóra', age: 24, city: 'Pécs', active: false, hobbies: ['zene', 'olvasás', 'futás'], scores: [3, 4, 4] },
    ],
  },
};

// Lab 9 – db "aggregacio_gyak"
export const aggregacio = {
  aggregacio_gyak: {
    customers: [
      { _id: 'A', name: 'Anna', city: 'Budapest' },
      { _id: 'B', name: 'Béla', city: 'Szeged' },
      { _id: 'C', name: 'Csilla', city: 'Budapest' },
    ],
    orders: [
      { _id: 1, customerId: 'A', status: 'paid', total: 26000, createdAt: new Date('2026-01-10T10:00:00Z'), items: [{ category: 'books', qty: 2, price: 3000 }, { category: 'electronics', qty: 1, price: 20000 }] },
      { _id: 2, customerId: 'B', status: 'paid', total: 6000, createdAt: new Date('2026-01-12T10:00:00Z'), items: [{ category: 'books', qty: 1, price: 3000 }, { category: 'stationery', qty: 3, price: 1000 }] },
      { _id: 3, customerId: 'A', status: 'paid', total: 5000, createdAt: new Date('2026-02-03T10:00:00Z'), items: [{ category: 'books', qty: 1, price: 3000 }, { category: 'stationery', qty: 2, price: 1000 }] },
      { _id: 4, customerId: 'C', status: 'cancelled', total: 20000, createdAt: new Date('2026-02-07T10:00:00Z'), items: [{ category: 'electronics', qty: 1, price: 20000 }] },
      { _id: 5, customerId: 'B', status: 'paid', total: 40000, createdAt: new Date('2026-02-11T10:00:00Z'), items: [{ category: 'electronics', qty: 2, price: 20000 }] },
      { _id: 6, customerId: 'C', status: 'paid', total: 4000, createdAt: new Date('2026-03-01T10:00:00Z'), items: [{ category: 'stationery', qty: 4, price: 1000 }] },
    ],
    users: [
      { name: 'Sanyi', age: 22, city: 'Budapest', salary: 450000, email: 'sanyi@example.test', active: true, hobbies: ['foci', 'zene'], scores: [3, 5, 4] },
      { name: 'Pista', age: 30, city: 'Debrecen', salary: 550000, email: 'pista@example.test', active: true, hobbies: ['zene', 'film'], scores: [4, 5] },
      { name: 'Sára', age: 25, city: 'Budapest', salary: 400000, email: 'sara@example.test', active: true, hobbies: ['olvasás', 'film'], scores: [5, 5] },
      { name: 'Dóra', age: 28, city: 'Budapest', salary: 480000, email: 'dora@example.test', active: true, hobbies: ['zene', 'olvasás'], scores: [3, 4] },
      { name: 'Bence', age: 35, city: 'Szeged', salary: 600000, email: 'bence@example.test', active: true, hobbies: ['foci'], scores: [4, 3] },
    ],
    sessions: [{ userId: 1, createdAt: new Date('2026-11-01T08:00:00Z') }],
  },
};

// Mock ZH task 5 – db "bolt"
export const bolt = {
  bolt: {
    termekek: [
      { nev: 'Laptop', kategoria: 'elektronika', ar: 320000, raktaron: true, cimkek: ['szamitogep', 'munka'] },
      { nev: 'Egér', kategoria: 'elektronika', ar: 6500, raktaron: true, cimkek: ['szamitogep'] },
      { nev: 'Monitor', kategoria: 'elektronika', ar: 75000, raktaron: false, cimkek: ['szamitogep', 'munka'] },
      { nev: 'SQL zsebkönyv', kategoria: 'konyv', ar: 4900, raktaron: true, cimkek: ['tanulas', 'sql'] },
      { nev: 'NoSQL a gyakorlatban', kategoria: 'konyv', ar: 12900, raktaron: true, cimkek: ['tanulas', 'nosql'] },
      { nev: 'Big Data kézikönyv', kategoria: 'konyv', ar: 15500, raktaron: false, cimkek: ['tanulas'] },
      { nev: 'Irodai szék', kategoria: 'butor', ar: 54000, raktaron: true, cimkek: ['munka'] },
      { nev: 'Állólámpa', kategoria: 'butor', ar: 18000, raktaron: true, cimkek: ['otthon'] },
      { nev: 'Füzet', kategoria: 'irodaszer', ar: 600, raktaron: true, cimkek: ['tanulas'] },
    ],
  },
};

export const datasets = { feladatok, aggregacio, bolt };
