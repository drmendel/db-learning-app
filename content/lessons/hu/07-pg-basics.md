# PostgreSQL alapok (5. labor)

A PostgreSQL („a nyílt forráskódú Oracle”) egy **objektum-relációs** ABKR gazdag adattípusokkal (tömbök, JSON(B), saját típusok),
saját indextípusokkal, **MVCC**-vel (többverziós konkurenciavezérlés: az olvasók nem blokkolják az írókat) és replikációval.

## Használt adattípusok

| Típus | Megjegyzés |
|---|---|
| `integer` (`int4`), `smallint` (`int2`), `bigint` | egész számok |
| `numeric(p,s)` (`decimal`) | pontos tizedes törtek |
| `serial` / `GENERATED … AS IDENTITY` | automatikusan növekvő (a háttérben egy szekvencia) |
| `varchar(n)`, `char(n)`, `text` | a `text`-nek nincs hosszkorlátja |
| `date`, `timestamp`, `interval` | a `date`-nek **nincs** időrésze (az Oracle DATE-tel ellentétben) |
| `boolean` | `true` / `false` |

## Táblák kulcsokkal

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
INSERT INTO person (name, birthdate) VALUES ('James', '2001-03-14'), ('Oliver', '2000-11-02');  -- több soros beszúrás
```

## Oracle → PostgreSQL puska

| Oracle | PostgreSQL |
|---|---|
| `FETCH FIRST n ROWS ONLY` / ROWNUM | `LIMIT n` (a FETCH FIRST is működik) |
| lapozás | `LIMIT n OFFSET m` |
| `UPPER(x) LIKE UPPER(...)` | `x ILIKE '...'` (kis-nagybetű független LIKE) |
| `SYSDATE` | `CURRENT_DATE`, `CURRENT_TIMESTAMP`, `now()` |
| `SUBSTR(s, i, n)` | `SUBSTRING(s FROM i FOR n)` (a `substr` is működik) |
| `NVL(a, b)` | `COALESCE(a, b)` |
| `SELECT 1 + 1 FROM dual` | `SELECT 1 + 1` (nem kell dummy tábla) |
| `ADD (oszlop típus)` | `ADD COLUMN oszlop típus` |
| `MODIFY oszlop típus` | `ALTER COLUMN oszlop TYPE típus` |
| `MODIFY oszlop NOT NULL` | `ALTER COLUMN oszlop SET NOT NULL` |
| `EXPLAIN PLAN FOR` + DBMS_XPLAN | `EXPLAIN` / `EXPLAIN ANALYZE` |

## Dátumok és intervallumok

A `TO_DATE`, a `TO_CHAR` és az `EXTRACT` ugyanúgy működik, mint Oracle-ben. Dátumhoz/időhöz **intervallum** adható:

```sql
SELECT CURRENT_TIMESTAMP + INTERVAL '1 month', CURRENT_TIMESTAMP + INTERVAL '30 minutes';
SELECT hire_date, hire_date + INTERVAL '6 months' AS proba_vege FROM employees;
SELECT AGE(CURRENT_DATE, hire_date) FROM employees;  -- intervallum, pl. "27 years 3 mons 5 days"
```

## UPDATE … FROM

PostgreSQL-ben egy UPDATE közvetlenül összekapcsolhat egy másik táblát:

```sql
UPDATE dolgozo d
SET fizetes = u.uj_fizetes
FROM uj_fizetesek u
WHERE d.id = u.id;
```

## Sémák

```sql
CREATE SCHEMA hr AUTHORIZATION psql;   -- (a labor virtuális gépén)
SET search_path TO hr;                 -- a minősítetlen neveket a hr sémában keresi
SELECT * FROM hr.employees;            -- vagy minősítsd kifejezetten
```

Ebben az alkalmazásban a HR táblák a `hr` sémában vannak, és a `search_path` már be van állítva: `hr, public`.
