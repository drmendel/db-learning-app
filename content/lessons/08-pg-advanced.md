# PostgreSQL advanced types (Labs 5–6)

## Arrays

Every type has an array version (`integer[]`, `text[]`, …). Arrays are **1-indexed**.

```sql
CREATE TABLE hallgato (id integer, jegyek integer[]);
INSERT INTO hallgato VALUES (1, ARRAY[5, 4, 3]);      -- constructor
INSERT INTO hallgato VALUES (2, '{5,4,3}');            -- literal
SELECT jegyek[1] FROM hallgato;                        -- first element
```

| Need | How |
|---|---|
| contains a value | `'sql' = ANY(cimkek)` |
| contains **all** of these | `cimkek @> ARRAY['sql','json']` |
| has **any** of these (overlap) | `cimkek && ARRAY['sql','json']` |
| condition for every element | `5 = ALL(jegyek)` |
| number of elements | `cardinality(cimkek)` or `array_length(cimkek, 1)` (NULL for an empty array!) |
| append an element | `array_append(cimkek, 'x')` or `cimkek \|\| 'x'` |
| concatenate arrays | `array_cat(a, b)` or `a \|\| b` |
| replace / remove a value | `array_replace(a, 'old', 'new')`, `array_remove(a, 'x')` |
| one row per element | `unnest(cimkek)` |
| aggregate rows into an array | `array_agg(x ORDER BY x)` |

```sql
CREATE TABLE kurzusok (
  kurzus_id serial PRIMARY KEY,                 -- or: integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY
  nev       text NOT NULL,
  cimkek    text[] NOT NULL DEFAULT '{}'
);
UPDATE kurzusok SET cimkek = array_append(cimkek, 'gyakorlat') WHERE nev = 'SQL alapok';
```

> **Array or junction table?** An array is handy for a **small, simple list of values** that is read together with the row
> (tags, phone numbers) and that you don't need to join or constrain. If the elements are **entities** with their own data,
> need **foreign keys / referential integrity**, are queried or updated independently, or the list can grow large,
> use a separate **junction (kapcsoló) table**, the normalised relational solution.

## ENUM and DOMAIN

```sql
CREATE TYPE hallgato_statusz AS ENUM ('aktiv', 'passziv', 'vegzett');       -- a fixed list of values
CREATE DOMAIN kredit_ertek AS integer CHECK (VALUE BETWEEN 0 AND 300);       -- base type + constraint
```

## Composite types

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
SELECT nev, (cim).varos FROM hallgato;      -- parentheses are required!
```

## Inheritance

```sql
CREATE TABLE mandatory_trainings (due_date date NOT NULL) INHERITS (employee_trainings);
SELECT COUNT(*) FROM employee_trainings;       -- parent + children rows
SELECT COUNT(*) FROM ONLY employee_trainings;  -- parent rows only
```

## JSON / JSONB

JSON values: object `{"nev":"Anna"}`, array `["SQL","Python"]`, string, number, `true/false`, `null`.
`jsonb` is stored in a parsed binary form, so it can be indexed and has more operators. Prefer it.

| Operator | Meaning |
|---|---|
| `doc -> 'key'` | field as **JSON** |
| `doc ->> 'key'` | field as **text** |
| `doc #> '{a,b}'` / `#>>` | value at a path (JSON / text) |
| `doc -> 'arr' ->> 0` | array element (**0-indexed** here!) |
| `doc @> '{"mode":"online"}'` | contains |
| `doc ? 'comment'` | key exists |

```sql
SELECT course_name, feedback->>'rating' FROM employee_trainings WHERE feedback->>'mode' = 'online';
SELECT * FROM employee_trainings WHERE (feedback->>'rating')::int >= 4;   -- cast text → int to compare numbers

UPDATE employee_trainings
SET feedback = jsonb_set(feedback, '{rating}', '5', true)   -- (value, path, new jsonb value, create_if_missing)
WHERE training_id = 2;
```

## The lab 6 practice tables (already loaded here)

```text
hr.employee_trainings(training_id, employee_id, course_name,
                      status   training_status  -- ENUM: planned, in_progress, completed, cancelled
                      score    score_value      -- DOMAIN: integer 0..100
                      skills   text[],
                      details  training_details -- composite: (instructor, location, hours)
                      feedback jsonb)           -- keys: mode ('online'/'onsite'), rating (1..5), comment
hr.mandatory_trainings(... same columns ..., due_date)  INHERITS employee_trainings
```
