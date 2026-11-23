# DDL, megszorítások, DML, nézetek, indexek (1–2. labor)

Az SQL-utasítások kategóriái: **DQL** (SELECT), **DDL** (CREATE, ALTER, DROP, TRUNCATE, RENAME),
**DML** (INSERT, UPDATE, DELETE), **DCL** (GRANT, REVOKE), **TCL** (COMMIT, ROLLBACK, SAVEPOINT).

> Ezekben a feladatokban a kódod egy tranzakcióban fut, amit az ellenőrzés után **visszagörgetünk**, így mindig az eredeti HR adatokból indulsz.

## Tábla létrehozása

```sql
CREATE TABLE employees3 AS SELECT * FROM employees WHERE salary > 5000;   -- másolat (megszorítások nélkül!)

CREATE TABLE hallgato (
  nev       VARCHAR2(30),
  szul_dat  DATE,
  evfolyam  NUMBER(1) DEFAULT 1
);
```

| Oracle típus | Jelentés | PostgreSQL |
|---|---|---|
| `CHAR(n)` | fix hosszú szöveg | `char(n)` |
| `VARCHAR2(n)` | változó hosszú szöveg, max. n | `varchar(n)` / `text` |
| `NUMBER(p,s)` | fixpontos szám, p jegy, ebből s tizedes | `numeric(p,s)` |
| `NUMBER(p)` | egész, max. p jegy | `numeric(p)` / `integer` |
| `DATE` | dátum + idő (másodperc) | `timestamp` (a PG `date`-nek nincs időrésze) |
| CLOB / BLOB | nagy szöveg / bináris | `text` / `bytea` |
| *(Oracle SQL ≤ 21c-ben nincs logikai típus)* | | `boolean` |

Az alkalmazás a `VARCHAR2`-t `VARCHAR`-ra, a `NUMBER`-t `NUMERIC`-ra/`INTEGER`-re fordítja, és megjegyzésben jelzi, ha ezt teszi.

## Tábla módosítása

```sql
ALTER TABLE employees3 ADD (cardid NUMBER(5));          -- Oracle;  PG: ADD COLUMN cardid numeric(5)
ALTER TABLE employees3 MODIFY cardid NUMBER(7);         -- Oracle;  PG: ALTER COLUMN cardid TYPE numeric(7)
ALTER TABLE employees3 DROP COLUMN cardid;
ALTER TABLE employees3 RENAME COLUMN regi TO uj;
RENAME employees3 TO employees23;                        -- Oracle;  PG: ALTER TABLE employees3 RENAME TO employees23
TRUNCATE TABLE employees23;   DROP TABLE employees23;
```

## Megszorítások

`PRIMARY KEY`, `FOREIGN KEY … REFERENCES`, `NOT NULL`, `UNIQUE`, `CHECK (...)`. Megadhatók **inline** (az oszlop mellett) vagy
**out-of-line** (külön elemként, a több oszlopos kulcsokhoz ez kell):

```sql
CREATE TABLE departments2 (
  department_id   NUMBER(4) CONSTRAINT d_pk PRIMARY KEY,               -- inline, névvel
  department_name VARCHAR2(30) NOT NULL,
  manager_id      NUMBER(6) REFERENCES employees (employee_id),        -- inline idegen kulcs
  location_id     NUMBER(4),
  CONSTRAINT d_loc_fk FOREIGN KEY (location_id) REFERENCES locations   -- out-of-line
);
ALTER TABLE employees ADD CONSTRAINT minimalber CHECK (salary > 2000);
ALTER TABLE employees DROP CONSTRAINT minimalber;
```

- Idegen kulcs opciók: `ON DELETE CASCADE` (a gyermekrekordok is törlődnek), `ON DELETE SET NULL`. Alapból egy szülőrekord, amire gyermek hivatkozik, **nem törölhető**.
- Megszorítást csak akkor adhatsz hozzá, ha a **meglévő adatok megfelelnek neki**.
- Oracle adatszótár: `user_tables`, `user_constraints` (constraint_type: P, R, U, C). Ezek itt is működnek.

## Szekvenciák

```sql
CREATE SEQUENCE seq_tab START WITH 1 INCREMENT BY 1 NOCACHE;
INSERT INTO tab (id, name) VALUES (seq_tab.NEXTVAL, 'CBA');   -- PG: nextval('seq_tab')
```

PostgreSQL-ben a `serial` vagy a `GENERATED ALWAYS AS IDENTITY` oszlop automatikusan létrehozza a szekvenciát.

## DML

```sql
INSERT INTO departments2 (department_id, department_name, location_id) VALUES (42, 'SAJTKÉSZÍTŐ', 1000);
UPDATE employees2 SET salary = 8500, manager_id = 100 WHERE employee_id = 1111;   -- WHERE!!!
DELETE FROM employees2 WHERE employee_id = 1111;
```

## Nézetek

A nézet egy elmentett lekérdezés, amit táblaként használhatsz:

```sql
CREATE OR REPLACE VIEW empv1 AS
  SELECT employee_id, last_name, job_id FROM employees WHERE department_id = 50;
DROP VIEW empv1;          -- az adatok megmaradnak
```

- Az egyszerű nézetek módosíthatók (a DML az alaptáblába kerül).
- `WITH CHECK OPTION`: nem szúrhatsz be és nem módosíthatsz olyan sort, ami ezáltal *kiesne* a nézetből.
- `WITH READ ONLY` (Oracle): nincs DML a nézeten keresztül.

## Indexek

```sql
CREATE INDEX hallg_nevsor_idx ON hallgato (nev, evfolyam DESC);
CREATE UNIQUE INDEX hallg_nev_idx ON hallgato (nev);
DROP INDEX hallg_nevsor_idx;
```

Azokat az oszlopokat indexeld, amelyek szerint **gyakran keresel vagy rendezel**, valamint az idegen kulcsokat (az összekapcsolások miatt). Minden index lassítja a DML-t, mert azt is karban kell tartani.
