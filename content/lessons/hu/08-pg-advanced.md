# PostgreSQL haladó típusok (5–6. labor)

## Tömbök

Minden típusnak van tömb változata (`integer[]`, `text[]`, …). A tömbök **1-től indexelődnek**.

```sql
CREATE TABLE hallgato (id integer, jegyek integer[]);
INSERT INTO hallgato VALUES (1, ARRAY[5, 4, 3]);      -- konstruktor
INSERT INTO hallgato VALUES (2, '{5,4,3}');            -- literál
SELECT jegyek[1] FROM hallgato;                        -- első elem
```

| Cél | Hogyan |
|---|---|
| tartalmaz egy értéket | `'sql' = ANY(cimkek)` |
| tartalmazza **mindet** | `cimkek @> ARRAY['sql','json']` |
| ezek közül **bármelyiket** (átfedés) | `cimkek && ARRAY['sql','json']` |
| feltétel minden elemre | `5 = ALL(jegyek)` |
| elemszám | `cardinality(cimkek)` vagy `array_length(cimkek, 1)` (üres tömbre NULL!) |
| elem hozzáfűzése | `array_append(cimkek, 'x')` vagy `cimkek \|\| 'x'` |
| tömbök összefűzése | `array_cat(a, b)` vagy `a \|\| b` |
| érték cseréje / törlése | `array_replace(a, 'régi', 'új')`, `array_remove(a, 'x')` |
| elemenként egy sor | `unnest(cimkek)` |
| sorok tömbbé aggregálása | `array_agg(x ORDER BY x)` |

```sql
CREATE TABLE kurzusok (
  kurzus_id serial PRIMARY KEY,                 -- vagy: integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY
  nev       text NOT NULL,
  cimkek    text[] NOT NULL DEFAULT '{}'
);
UPDATE kurzusok SET cimkek = array_append(cimkek, 'gyakorlat') WHERE nev = 'SQL alapok';
```

> **Tömb vagy kapcsolótábla?** A tömb **egyszerű értékek kis listájához** kényelmes, amit a sorral együtt olvasunk
> (címkék, telefonszámok), és nem kell összekapcsolni vagy megszorítással védeni. Ha az elemek **saját adatokkal rendelkező entitások**,
> **idegen kulcs / hivatkozási integritás** kell rájuk, egyenként kérdezzük le vagy módosítjuk őket, vagy a lista nagyra nőhet,
> akkor külön **kapcsolótábla** kell – ez a normalizált relációs megoldás.

## ENUM és DOMAIN

```sql
CREATE TYPE hallgato_statusz AS ENUM ('aktiv', 'passziv', 'vegzett');       -- rögzített értéklista
CREATE DOMAIN kredit_ertek AS integer CHECK (VALUE BETWEEN 0 AND 300);       -- alaptípus + megszorítás
```

## Összetett típusok

```sql
CREATE TYPE cim_tipus AS (varos text, utca text, hazszam text);
CREATE TABLE hallgato (
  id serial PRIMARY KEY,
  nev text NOT NULL,
  statusz hallgato_statusz NOT NULL DEFAULT 'aktiv',
  kredit kredit_ertek NOT NULL,
  cim cim_tipus,
  profil jsonb NOT NULL DEFAULT '{}'::jsonb
);
INSERT INTO hallgato (nev, kredit, cim) VALUES ('Anna', 120, ROW('Budapest', 'Fő utca', '12'));
SELECT nev, (cim).varos FROM hallgato;      -- a zárójel kötelező!
```

## Öröklés

```sql
CREATE TABLE mandatory_trainings (due_date date NOT NULL) INHERITS (employee_trainings);
SELECT COUNT(*) FROM employee_trainings;       -- szülő + gyermek sorok
SELECT COUNT(*) FROM ONLY employee_trainings;  -- csak a szülő sorai
```

## JSON / JSONB

JSON értékek: objektum `{"nev":"Anna"}`, tömb `["SQL","Python"]`, szöveg, szám, `true/false`, `null`.
A `jsonb` elemzett bináris formában tárolódik, így indexelhető, és több operátora van. Ezt érdemes használni.

| Operátor | Jelentés |
|---|---|
| `doc -> 'kulcs'` | mező **JSON**-ként |
| `doc ->> 'kulcs'` | mező **szövegként** |
| `doc #> '{a,b}'` / `#>>` | érték egy útvonalon (JSON / szöveg) |
| `doc -> 'tomb' ->> 0` | tömbelem (itt **0-tól** indexel!) |
| `doc @> '{"mode":"online"}'` | tartalmazás |
| `doc ? 'comment'` | kulcs létezik |

```sql
SELECT course_name, feedback->>'rating' FROM employee_trainings WHERE feedback->>'mode' = 'online';
SELECT * FROM employee_trainings WHERE (feedback->>'rating')::int >= 4;   -- szöveg → int, hogy számként hasonlítson

UPDATE employee_trainings
SET feedback = jsonb_set(feedback, '{rating}', '5', true)   -- (érték, útvonal, új jsonb érték, létrehozza-e ha hiányzik)
WHERE training_id = 2;
```

## A 6. labor gyakorló táblái (itt már be vannak töltve)

```text
hr.employee_trainings(training_id, employee_id, course_name,
                      status   training_status  -- ENUM: planned, in_progress, completed, cancelled
                      score    score_value      -- DOMAIN: egész 0..100
                      skills   text[],
                      details  training_details -- összetett: (instructor, location, hours)
                      feedback jsonb)           -- kulcsok: mode ('online'/'onsite'), rating (1..5), comment
hr.mandatory_trainings(... ugyanezek az oszlopok ..., due_date)  INHERITS employee_trainings
```
