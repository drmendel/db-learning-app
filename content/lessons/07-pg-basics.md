# PostgreSQL basics (Lab 5)

PostgreSQL ("the open source Oracle") is an **object-relational** DBMS with rich data types (arrays, JSON(B), custom types),
custom index types, **MVCC** (multi-version concurrency control: readers don't block writers), and replication.

## Data types you will use

| Type | Note |
|---|---|
| `integer` (`int4`), `smallint` (`int2`), `bigint` | whole numbers |
| `numeric(p,s)` (`decimal`) | exact decimals |
| `serial` / `GENERATED … AS IDENTITY` | auto-increment (a sequence behind the scenes) |
| `varchar(n)`, `char(n)`, `text` | `text` has no length limit |
| `date`, `timestamp`, `interval` | `date` has **no** time part (unlike Oracle's DATE) |
| `boolean` | `true` / `false` |

## Creating tables with keys

```sql
CREATE TABLE person (
  id        serial PRIMARY KEY,
  name      varchar(50),
  birthdate date
);
CREATE TABLE likes (
  id_1 integer REFERENCES person(id),
  id_2 integer REFERENCES person(id)
);
INSERT INTO person (name, birthdate) VALUES ('James', '2001-03-14'), ('Oliver', '2000-11-02');  -- multi-row insert
```

## Oracle → PostgreSQL cheat sheet

| Oracle | PostgreSQL |
|---|---|
| `FETCH FIRST n ROWS ONLY` / ROWNUM | `LIMIT n` (also FETCH FIRST) |
| paging | `LIMIT n OFFSET m` |
| `UPPER(x) LIKE UPPER(...)` | `x ILIKE '...'` (case-insensitive LIKE) |
| `SYSDATE` | `CURRENT_DATE`, `CURRENT_TIMESTAMP`, `now()` |
| `SUBSTR(s, i, n)` | `SUBSTRING(s FROM i FOR n)` (`substr` works too) |
| `NVL(a, b)` | `COALESCE(a, b)` |
| `SELECT 1 + 1 FROM dual` | `SELECT 1 + 1` (no dummy table needed) |
| `ADD (col type)` | `ADD COLUMN col type` |
| `MODIFY col type` | `ALTER COLUMN col TYPE type` |
| `MODIFY col NOT NULL` | `ALTER COLUMN col SET NOT NULL` |
| `EXPLAIN PLAN FOR` + DBMS_XPLAN | `EXPLAIN` / `EXPLAIN ANALYZE` |

## Dates and intervals

`TO_DATE`, `TO_CHAR` and `EXTRACT` work as in Oracle. You can add an **interval** to a date/time:

```sql
SELECT CURRENT_TIMESTAMP + INTERVAL '1 month', CURRENT_TIMESTAMP + INTERVAL '30 minutes';
SELECT hire_date, hire_date + INTERVAL '6 months' AS proba_vege FROM employees;
SELECT AGE(CURRENT_DATE, hire_date) FROM employees;  -- interval, e.g. "27 years 3 mons 5 days"
```

## UPDATE … FROM

PostgreSQL can join another table directly in an UPDATE:

```sql
UPDATE dolgozo d
SET fizetes = u.uj_fizetes
FROM uj_fizetesek u
WHERE d.id = u.id;
```

## Schemas

```sql
CREATE SCHEMA hr AUTHORIZATION psql;   -- (in the lab VM)
SET search_path TO hr;                 -- unqualified names are looked up in hr
SELECT * FROM hr.employees;            -- or qualify explicitly
```

In this app the HR tables live in the `hr` schema, and `search_path` is already set to `hr, public`.
