const A = { data: 'aggregacio', db: 'aggregacio_gyak' };
const B = { data: 'bolt', db: 'bolt' };

export default {
  id: 'mongoagg',
  title: 'MongoDB aggregation & indexes',
  lab: 'Lab 9',
  engine: 'mongo',
  lesson: '11-mongo-agg.md',
  exercises: [
    {
      id: 'a-1', type: 'mongo', title: '$match with dates', ...A,
      prompt: 'Using an aggregation pipeline, list the **paid** orders created in **February 2026**.',
      hints: ['`{ $match: { status: "paid", createdAt: { $gte: ISODate("2026-02-01T00:00:00Z"), $lt: ISODate("2026-03-01T00:00:00Z") } } }`'],
      solution: 'db.orders.aggregate([\n  { $match: { status: "paid", createdAt: { $gte: ISODate("2026-02-01T00:00:00Z"), $lt: ISODate("2026-03-01T00:00:00Z") } } }\n])',
      require: [['aggregate', 'Solve it with aggregate().']],
    },
    {
      id: 'a-2', type: 'mongo', title: '$project – computed field', ...A,
      prompt: 'List every user\'s **name** and **yearly salary** (`yearlySalary` = salary × 12), without `_id`.',
      hints: ['`{ $project: { _id: 0, name: 1, yearlySalary: { $multiply: ["$salary", 12] } } }`'],
      solution: 'db.users.aggregate([\n  { $project: { _id: 0, name: 1, yearlySalary: { $multiply: ["$salary", 12] } } }\n])',
    },
    {
      id: 'a-3', type: 'mongo', title: '$group – total per customer', ...A,
      prompt: 'For the **paid** orders, compute the **sum of `total`** per **customerId** (field name `totalSpent`). Order by `totalSpent` **descending**.',
      hints: ['$match → $group: `{ _id: "$customerId", totalSpent: { $sum: "$total" } }` → $sort'],
      solution: 'db.orders.aggregate([\n  { $match: { status: "paid" } },\n  { $group: { _id: "$customerId", totalSpent: { $sum: "$total" } } },\n  { $sort: { totalSpent: -1 } }\n])',
    },
    {
      id: 'a-4', type: 'mongo', title: '$group – statistics per city', ...A,
      prompt: 'Per **city** of the users, compute the **number of users** (`count`), the **average** (`avgSalary`), **minimum** (`minSalary`) and **maximum salary** (`maxSalary`). Order by **count descending**, then by **_id ascending**.',
      hints: ['`count: { $sum: 1 }`, `avgSalary: { $avg: "$salary" }`, …', '`{ $sort: { count: -1, _id: 1 } }`'],
      solution: 'db.users.aggregate([\n  { $group: { _id: "$city", count: { $sum: 1 }, avgSalary: { $avg: "$salary" }, minSalary: { $min: "$salary" }, maxSalary: { $max: "$salary" } } },\n  { $sort: { count: -1, _id: 1 } }\n])',
    },
    {
      id: 'a-5', type: 'mongo', title: '$unwind – hobby popularity', ...A,
      prompt: 'How many users have each hobby? Output `{ _id: <hobby>, count: <n> }`, ordered by **count descending**, then **_id ascending**.',
      hints: ['`{ $unwind: "$hobbies" }` then group by `"$hobbies"`.'],
      solution: 'db.users.aggregate([\n  { $unwind: "$hobbies" },\n  { $group: { _id: "$hobbies", count: { $sum: 1 } } },\n  { $sort: { count: -1, _id: 1 } }\n])',
    },
    {
      id: 'a-6', type: 'mongo', title: '$group with null – grand total', ...A,
      prompt: 'Compute the **total revenue** (sum of `total`) and the **number** of all **paid** orders in **one document**: `{ _id: null, revenue: …, orders: … }`.',
      hints: ['Group key `_id: null` puts every document in one group.'],
      solution: 'db.orders.aggregate([\n  { $match: { status: "paid" } },\n  { $group: { _id: null, revenue: { $sum: "$total" }, orders: { $sum: 1 } } }\n])',
    },
    {
      id: 'a-7', type: 'mongo', title: '$push / $addToSet – names per city', ...A,
      prompt: 'Per **city**, collect the **names** of the users into an array called `names`. Order by **_id** (the city).',
      hints: ['`{ $group: { _id: "$city", names: { $push: "$name" } } }`'],
      solution: 'db.users.aggregate([\n  { $group: { _id: "$city", names: { $push: "$name" } } },\n  { $sort: { _id: 1 } }\n])',
    },
    {
      id: 'a-8', type: 'mongo', title: '$lookup – join customer data', ...A,
      prompt: 'For every order, show the **order _id**, its **status**, its **total**, and the **customer\'s name** (field `customerName`). Order by order **_id**.',
      hints: ['`$lookup: { from: "customers", localField: "customerId", foreignField: "_id", as: "customer" }`', '`$unwind: "$customer"` then `$project: { status: 1, total: 1, customerName: "$customer.name" }`'],
      solution: 'db.orders.aggregate([\n  { $lookup: { from: "customers", localField: "customerId", foreignField: "_id", as: "customer" } },\n  { $unwind: "$customer" },\n  { $project: { status: 1, total: 1, customerName: "$customer.name" } },\n  { $sort: { _id: 1 } }\n])',
    },
    {
      id: 'a-9', type: 'mongo', title: 'Lab 9 task – customer summary', ...A,
      prompt: 'Build a pipeline that summarises the **paid** orders **per customer**:\n\n1. only `paid` orders,\n2. **unwind** the `items` array,\n3. group per customer and compute:\n   - `totalQuantity`: total number of items bought (sum of `qty`),\n   - `totalSpent`: total spending (sum of `qty * price`),\n   - `categories`: the **distinct** categories bought,\n4. join the customer\'s **name** and **city** from `customers`,\n5. output only `name`, `city`, `totalQuantity`, `totalSpent`, `categories` (no `_id`),\n6. order by `totalSpent` **descending**.',
      hints: ['`totalSpent: { $sum: { $multiply: ["$items.qty", "$items.price"] } }`', '`categories: { $addToSet: "$items.category" }`', 'After $group the customer id is in `_id`: `$lookup: { from: "customers", localField: "_id", foreignField: "_id", as: "customer" }`, then `$unwind: "$customer"`.'],
      solution: `db.orders.aggregate([
  { $match: { status: "paid" } },
  { $unwind: "$items" },
  { $group: {
      _id: "$customerId",
      totalQuantity: { $sum: "$items.qty" },
      totalSpent: { $sum: { $multiply: ["$items.qty", "$items.price"] } },
      categories: { $addToSet: "$items.category" }
  } },
  { $lookup: { from: "customers", localField: "_id", foreignField: "_id", as: "customer" } },
  { $unwind: "$customer" },
  { $project: { _id: 0, name: "$customer.name", city: "$customer.city", totalQuantity: 1, totalSpent: 1, categories: 1 } },
  { $sort: { totalSpent: -1 } }
])`,
    },
    {
      id: 'a-10', type: 'mongo', title: 'ZH 5d – group in stock products', ...B,
      prompt: 'With an aggregation pipeline, group the **in-stock** products **by category**, and return the **number of products** (`db`) and the **average price** (`atlagar`). Order by the **average price descending**. *(ZH 5d – 5 points)*',
      hints: ['`$match: { raktaron: true }` → `$group: { _id: "$kategoria", db: { $sum: 1 }, atlagar: { $avg: "$ar" } }` → `$sort: { atlagar: -1 }`'],
      solution: 'db.termekek.aggregate([\n  { $match: { raktaron: true } },\n  { $group: { _id: "$kategoria", db: { $sum: 1 }, atlagar: { $avg: "$ar" } } },\n  { $sort: { atlagar: -1 } }\n])',
    },
    {
      id: 'a-11', type: 'mongo', title: 'Unique index', ...A,
      prompt: 'Create a **unique index** on the `email` field of `users`, then list the collection\'s indexes.',
      hints: ['`db.users.createIndex({ email: 1 }, { unique: true })`', '`db.users.getIndexes()`'],
      solution: 'db.users.createIndex({ email: 1 }, { unique: true })\ndb.users.getIndexes()',
    },
    {
      id: 'a-12', type: 'mongo', title: 'Unique index in action', ...A,
      prompt: 'After creating the unique index on `email`, the line below must **fail**. Write the createIndex call, then **count** the users whose email is `sanyi@example.test` – it must still be **1**.\n\n```mongo\n// what would fail afterwards: db.users.insertOne({ name: "Sanyi2", email: "sanyi@example.test" })\n```',
      hints: ['createIndex(..., { unique: true }), then `db.users.countDocuments({ email: "sanyi@example.test" })`'],
      solution: 'db.users.createIndex({ email: 1 }, { unique: true })\ndb.users.countDocuments({ email: "sanyi@example.test" })',
      check: 'try { db.users.insertOne({ name: "Sanyi2", email: "sanyi@example.test" }); "duplicate was accepted" } catch (e) { "rejected: " + (e.code === 11000) }',
    },
    {
      id: 'a-13', type: 'mongo', title: 'TTL index', ...A,
      prompt: 'Make the documents of `sessions` **expire one hour (3600 s) after** their `createdAt` time, using an index. Then list the indexes of `sessions`.',
      hints: ['`db.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 })`'],
      solution: 'db.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 })\ndb.sessions.getIndexes()',
    },
    {
      id: 'a-14', type: 'mongo', title: 'COLLSCAN vs IXSCAN', ...A,
      prompt: 'Create an index on `city` in `users`, then get the **winning plan** of `db.users.find({ city: "Budapest" })` with `explain()`. The input stage should be an **IXSCAN**.',
      hints: ['`db.users.createIndex({ city: 1 })`', '`db.users.find({ city: "Budapest" }).explain().queryPlanner.winningPlan`'],
      solution: 'db.users.createIndex({ city: 1 })\ndb.users.find({ city: "Budapest" }).explain().queryPlanner.winningPlan',
    },
    {
      id: 'a-q1', type: 'quiz', title: '$lookup result',
      prompt: 'After `{ $lookup: { from: "customers", localField: "customerId", foreignField: "_id", as: "customer" } }`, what is the type of the `customer` field?',
      options: ['A single document', 'An array of matching documents (possibly empty)', 'The customer\'s _id', 'A string'],
      answer: 1,
      explain: '$lookup is like a LEFT JOIN that puts the matches into an array. Use $unwind to turn it into a sub-document.',
    },
    {
      id: 'a-q2', type: 'quiz', title: 'Stage order',
      prompt: 'Why should `$match` usually be the first stage?',
      options: ['It is required by syntax', 'It reduces the number of documents early and can use indexes', '$group cannot follow $sort', 'Otherwise _id is lost'],
      answer: 1,
      explain: 'Filtering early means less work for later stages, and a leading $match (like a find filter) can use an index.',
    },
  ],
};
