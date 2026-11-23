# MongoDB – dokumentumtároló (8. labor)

NoSQL, **dokumentumorientált** adatbázis. JSON-szerű dokumentumokat tárol egy **BSON** nevű bináris formátumban (bináris JSON,
további típusokkal: dátum, ObjectId, bináris adat). A séma rugalmas, a fejlesztés gyors, és könnyen skálázható.

**Adatbázis → gyűjtemények → dokumentumok**

- **Adatbázis**: a gyűjtemények fizikai tárolója (külön fájlok és jogosultságok).
- **Gyűjtemény**: összetartozó dokumentumok csoportja, mint egy tábla, de **séma nélküli**: a dokumentumok mezői eltérhetnek.
- **Dokumentum**: kulcs–érték párok; **egymásba ágyazható** (aldokumentumok, tömbök); max. **16 MB**; mindegyiknek van egy kötelező, egyedi `_id`-je.
  Ha nem adod meg, a MongoDB **ObjectId**-t generál (ez időbélyeget tartalmaz, így az azonosítók nagyjából növekvők).

## Shell alapok

```mongo
show dbs
use feladatok                 // kiválaszt (vagy az első íráskor létrehoz) egy adatbázist
db.getName()
db.createCollection("Users")
show collections
db.Users.drop()
```

## Beszúrás

```mongo
db.Users.insertOne({ name: "Teszt", age: 18 })
db.Users.insertMany([{ name: "A" }, { name: "B" }])
```

## Lekérdezés

```mongo
db.Users.find({ city: "Budapest" })                         // szűrés
db.Users.find({ active: true }, { name: 1, city: 1, _id: 0 })  // projekció: 1 = mutat, 0 = elrejt
db.Users.findOne({ name: "Anna" })
db.Users.find().sort({ age: -1 }).skip(2).limit(2)          // -1 csökkenő, 1 növekvő
db.Users.countDocuments({ active: true })
db.Users.distinct("city")
```

A projekcióban nem keverhetők az 1-esek és a 0-k. Az egyetlen kivétel az `_id: 0`.

## Lekérdező operátorok

| Fajta | Operátorok |
|---|---|
| összehasonlító | `$eq` (implicit), `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin` |
| logikai | `$and` (implicit, ha több mezőt sorolsz fel), `$or`, `$not`, `$nor` |
| elem | `$exists: true/false`, `$type` |
| kiértékelő | `$regex` (vagy `/^S/`), `$text` (text index kell hozzá), `$where` |
| tömb | `$all`, `$size`, `$elemMatch`; projekció: `$slice` |

```mongo
db.Users.find({ age: { $gte: 25 }, hobbies: "film" })             // a tömb tartalmazza a "film"-et
db.Users.find({ $or: [{ city: "Budapest" }, { age: { $lt: 20 } }] })
db.Users.find({ "address.street": { $exists: true } })            // pont-jelölés aldokumentumokba
db.Users.find({ scores: { $elemMatch: { $gt: 4, $lt: 6 } } })     // EGY elem teljesíti mindkettőt
```

> A `{ scores: { $gt: 4, $lt: 6 } }` `$elemMatch` nélkül *különböző* elemekkel is teljesülhet (az egyik > 4, egy másik < 6).

## Módosítás

```mongo
db.Users.updateOne({ name: "Sanyi" }, { $inc: { age: 2 }, $set: { city: "Győr" } })
db.Users.updateMany({ city: "Budapest" }, { $set: { active: true } })
db.Users.updateOne({ name: "X" }, { $set: { age: 1 } }, { upsert: true })   // beszúrja, ha nincs találat
```

| Operátor | Hatás |
|---|---|
| `$set` / `$unset` | mező beállítása (ha hiányzik, létrehozza) / mező törlése |
| `$inc`, `$mul`, `$rename`, `$currentDate` | növelés, szorzás, átnevezés, aktuális időpont |
| `$push` (`$each`) | hozzáfűzés tömbhöz |
| `$addToSet` | hozzáfűzés, ha még nincs benne |
| `$pop` (1 = utolsó, −1 = első), `$pull` (feltétel szerint), `$pullAll` | törlés tömbből |

Tömbpozíciók: `"scores.0"` (index), `"scores.$"` (a lekérdezés által illesztett első elem), `"scores.$[]"` (minden elem).

## Törlés

```mongo
db.Users.deleteOne({ name: "Teszt" })
db.Users.deleteMany({ active: false })
```

## A `Users` gyűjtemény (`feladatok` adatbázis, a laborról)

```text
{ name, age, city, active, hobbies: [..], scores: [..], address: { street, number } (csak Sanyinál) }
Sanyi 22 Szeged · Pista 30 Debrecen · Sára 25 Budapest · Anna 27 Budapest (inaktív) · Bence 19 Szeged · Dóra 24 Pécs (inaktív)
```
