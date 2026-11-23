# MongoDB aggregation pipeline & indexes (Lab 9)

An **aggregation pipeline** is a list of **stages**. Each stage receives documents and passes (possibly
different, fewer or more) documents to the next. **The order of the stages matters.** Field references
in values start with `$`: `"$price"`.

```mongo
db.orders.aggregate([
  { $match: { status: "paid" } },                                   // ≈ WHERE (put it early!)
  { $group: { _id: "$customerId", total: { $sum: "$total" } } },    // ≈ GROUP BY
  { $sort: { total: -1 } }                                          // ≈ ORDER BY
])
```

| Stage | SQL analogue | Notes |
|---|---|---|
| `$match` | WHERE / HAVING | same syntax as `find` filters |
| `$project` | SELECT | `1`/`0`, rename `{ newName: "$old" }`, compute `{ yearly: { $multiply: ["$salary", 12] } }` |
| `$group` | GROUP BY | `_id` is the group key (`null` = everything in one group) |
| `$sort`, `$limit`, `$skip` | ORDER BY, LIMIT, OFFSET | |
| `$unwind` | (unnest) | one document per array element |
| `$lookup` | LEFT JOIN | joined documents arrive as an **array** |
| `$addFields` / `$set`, `$count`, `$out` | | |

Accumulators in `$group`: `$sum`, `$avg`, `$min`, `$max`, `$first`, `$last`, `$push` (collect into an array),
`$addToSet` (collect distinct values). Count with `{ $sum: 1 }`.

Expression operators: `$add`, `$subtract`, `$multiply`, `$divide`, `$concat`, `$toUpper`, `$round`, …

```mongo
// how many users have each hobby?
db.users.aggregate([
  { $unwind: "$hobbies" },
  { $group: { _id: "$hobbies", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])

// join customer names to orders
db.orders.aggregate([
  { $lookup: { from: "customers", localField: "customerId", foreignField: "_id", as: "customer" } },
  { $unwind: "$customer" },                       // array → single sub-document
  { $project: { _id: 0, total: 1, name: "$customer.name" } }
])
```

Dates: `{ createdAt: { $gte: ISODate("2026-02-01T00:00:00Z"), $lt: ISODate("2026-03-01T00:00:00Z") } }`

## Indexes

Without an index MongoDB must examine every document (**COLLSCAN**). With an index it can search a B-tree (**IXSCAN**).
The `_id` field always has a unique index.

```mongo
db.users.createIndex({ email: 1 }, { unique: true })          // unique
db.users.createIndex({ city: 1, age: -1 })                    // compound
db.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 })   // TTL: auto-delete after 1 h
db.users.createIndex({ name: "text" })                        // text search ($text)
db.users.getIndexes()
db.users.find({ city: "Budapest" }).explain("executionStats")  // winningPlan: IXSCAN or COLLSCAN
```

Index types: single field, compound, **multikey** (on an array field), unique, TTL, text.

## The lab 9 data (db `aggregacio_gyak`)

```text
customers { _id: "A"|"B"|"C", name, city }
orders    { _id, customerId, status: "paid"|"cancelled", total, createdAt,
            items: [ { category, qty, price }, ... ] }
users     { name, age, city, salary, email, active, hobbies: [..], scores: [..] }
sessions  { userId, createdAt }
```

> In this app `explain()` is simplified: it reports IXSCAN when an index starts with a field of your filter, and COLLSCAN otherwise.
