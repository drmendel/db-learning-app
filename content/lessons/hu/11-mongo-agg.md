# MongoDB aggregációs pipeline és indexek (9. labor)

Az **aggregációs pipeline** **lépések** (stage-ek) listája. Minden lépés dokumentumokat kap, és (esetleg más, kevesebb vagy több)
dokumentumot ad tovább a következőnek. **A lépések sorrendje számít.** Az értékekben a mezőhivatkozások `$` jellel kezdődnek: `"$price"`.

```mongo
db.orders.aggregate([
  { $match: { status: "paid" } },                                   // ≈ WHERE (tedd előre!)
  { $group: { _id: "$customerId", total: { $sum: "$total" } } },    // ≈ GROUP BY
  { $sort: { total: -1 } }                                          // ≈ ORDER BY
])
```

| Lépés | SQL megfelelő | Megjegyzés |
|---|---|---|
| `$match` | WHERE / HAVING | ugyanaz a szintaxis, mint a `find` szűrőié |
| `$project` | SELECT | `1`/`0`, átnevezés `{ ujNev: "$regi" }`, számítás `{ eves: { $multiply: ["$salary", 12] } }` |
| `$group` | GROUP BY | az `_id` a csoportkulcs (`null` = minden egy csoportban) |
| `$sort`, `$limit`, `$skip` | ORDER BY, LIMIT, OFFSET | |
| `$unwind` | (unnest) | tömbelemenként egy dokumentum |
| `$lookup` | LEFT JOIN | a kapcsolt dokumentumok **tömbként** érkeznek |
| `$addFields` / `$set`, `$count`, `$out` | | |

Akkumulátorok a `$group`-ban: `$sum`, `$avg`, `$min`, `$max`, `$first`, `$last`, `$push` (tömbbe gyűjt),
`$addToSet` (különböző értékeket gyűjt). Számolás: `{ $sum: 1 }`.

Kifejezés-operátorok: `$add`, `$subtract`, `$multiply`, `$divide`, `$concat`, `$toUpper`, `$round`, …

```mongo
// hány felhasználónak van meg az egyes hobbi?
db.users.aggregate([
  { $unwind: "$hobbies" },
  { $group: { _id: "$hobbies", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])

// vásárlónevek hozzákapcsolása a rendelésekhez
db.orders.aggregate([
  { $lookup: { from: "customers", localField: "customerId", foreignField: "_id", as: "customer" } },
  { $unwind: "$customer" },                       // tömb → egyetlen aldokumentum
  { $project: { _id: 0, total: 1, name: "$customer.name" } }
])
```

Dátumok: `{ createdAt: { $gte: ISODate("2026-02-01T00:00:00Z"), $lt: ISODate("2026-03-01T00:00:00Z") } }`

## Indexek

Index nélkül a MongoDB-nek minden dokumentumot át kell néznie (**COLLSCAN**). Indexszel B-fában kereshet (**IXSCAN**).
Az `_id` mezőn mindig van egyedi index.

```mongo
db.users.createIndex({ email: 1 }, { unique: true })          // egyedi
db.users.createIndex({ city: 1, age: -1 })                    // összetett
db.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 })   // TTL: 1 óra után automatikusan töröl
db.users.createIndex({ name: "text" })                        // szöveges keresés ($text)
db.users.getIndexes()
db.users.find({ city: "Budapest" }).explain("executionStats")  // winningPlan: IXSCAN vagy COLLSCAN
```

Indextípusok: egymezős, összetett, **multikey** (tömbmezőn), egyedi, TTL, text.

## A 9. labor adatai (`aggregacio_gyak` adatbázis)

```text
customers { _id: "A"|"B"|"C", name, city }
orders    { _id, customerId, status: "paid"|"cancelled", total, createdAt,
            items: [ { category, qty, price }, ... ] }
users     { name, age, city, salary, email, active, hobbies: [..], scores: [..] }
sessions  { userId, createdAt }
```

> Ebben az alkalmazásban az `explain()` egyszerűsített: IXSCAN-t jelez, ha egy index a szűrőd egyik mezőjével kezdődik, különben COLLSCAN-t.
