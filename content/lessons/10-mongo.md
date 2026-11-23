# MongoDB – document store (Lab 8)

A NoSQL, **document-oriented** database. It stores JSON-like documents in a binary format called **BSON** (binary JSON,
which adds types such as dates, ObjectId and binary data). The schema is flexible, development is fast, and it scales out easily.

**Database → collections → documents**

- **Database**: a physical container of collections (separate files and permissions).
- **Collection**: a group of related documents, like a table, but **schemaless**: documents may have different fields.
- **Document**: key–value pairs; can be **nested** (sub-documents, arrays); max **16 MB**; each one has a mandatory unique `_id`.
  If you don't give one, MongoDB generates an **ObjectId** (it contains a timestamp, so ids are roughly increasing).

## Shell basics

```mongo
show dbs
use feladatok                 // select (or create on first write) a database
db.getName()
db.createCollection("Users")
show collections
db.Users.drop()
```

## Insert

```mongo
db.Users.insertOne({ name: "Teszt", age: 18 })
db.Users.insertMany([{ name: "A" }, { name: "B" }])
```

## Find

```mongo
db.Users.find({ city: "Budapest" })                         // filter
db.Users.find({ active: true }, { name: 1, city: 1, _id: 0 })  // projection: 1 = show, 0 = hide
db.Users.findOne({ name: "Anna" })
db.Users.find().sort({ age: -1 }).skip(2).limit(2)          // -1 descending, 1 ascending
db.Users.countDocuments({ active: true })
db.Users.distinct("city")
```

You cannot mix 1s and 0s in a projection. The only exception is `_id: 0`.

## Query operators

| Kind | Operators |
|---|---|
| comparison | `$eq` (implicit), `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin` |
| logical | `$and` (implicit when you list several fields), `$or`, `$not`, `$nor` |
| element | `$exists: true/false`, `$type` |
| evaluation | `$regex` (or `/^S/`), `$text` (needs a text index), `$where` |
| array | `$all`, `$size`, `$elemMatch`; projection: `$slice` |

```mongo
db.Users.find({ age: { $gte: 25 }, hobbies: "film" })             // array contains "film"
db.Users.find({ $or: [{ city: "Budapest" }, { age: { $lt: 20 } }] })
db.Users.find({ "address.street": { $exists: true } })            // dot notation into sub-documents
db.Users.find({ scores: { $elemMatch: { $gt: 4, $lt: 6 } } })     // ONE element satisfies both
```

> `{ scores: { $gt: 4, $lt: 6 } }` without `$elemMatch` could be satisfied by *different* elements (one > 4, another < 6).

## Update

```mongo
db.Users.updateOne({ name: "Sanyi" }, { $inc: { age: 2 }, $set: { city: "Győr" } })
db.Users.updateMany({ city: "Budapest" }, { $set: { active: true } })
db.Users.updateOne({ name: "X" }, { $set: { age: 1 } }, { upsert: true })   // insert if not found
```

| Operator | Effect |
|---|---|
| `$set` / `$unset` | set a field (creating it if missing) / remove a field |
| `$inc`, `$mul`, `$rename`, `$currentDate` | increment, multiply, rename, set to now |
| `$push` (`$each`) | append to an array |
| `$addToSet` | append only if not present |
| `$pop` (1 = last, −1 = first), `$pull` (by condition), `$pullAll` | remove from an array |

Array positions: `"scores.0"` (index), `"scores.$"` (the first element matched by the query), `"scores.$[]"` (all elements).

## Delete

```mongo
db.Users.deleteOne({ name: "Teszt" })
db.Users.deleteMany({ active: false })
```

## The `Users` collection (db `feladatok`, from the lab)

```text
{ name, age, city, active, hobbies: [..], scores: [..], address: { street, number } (only Sanyi) }
Sanyi 22 Szeged · Pista 30 Debrecen · Sára 25 Budapest · Anna 27 Budapest (inactive) · Bence 19 Szeged · Dóra 24 Pécs (inactive)
```
