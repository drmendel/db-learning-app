# DDL, constraints, DML, views, indexes (Labs 1–2)

SQL statement categories: **DQL** (SELECT), **DDL** (CREATE, ALTER, DROP, TRUNCATE, RENAME),
**DML** (INSERT, UPDATE, DELETE), **DCL** (GRANT, REVOKE), **TCL** (COMMIT, ROLLBACK, SAVEPOINT).

> In these exercises your code runs inside a transaction that is **rolled back** after the check, so you start from the original HR data every time.

## Creating tables

```sql
CREATE TABLE employees3 AS SELECT * FROM employees WHERE salary > 5000;   -- copy (no constraints!)

CREATE TABLE hallgato (
  nev       VARCHAR2(30),
  szul_dat  DATE,
  evfolyam  NUMBER(1) DEFAULT 1
);
```

| Oracle type | Meaning | PostgreSQL |
|---|---|---|
| `CHAR(n)` | fixed length text | `char(n)` |
| `VARCHAR2(n)` | variable text, max n | `varchar(n)` / `text` |
| `NUMBER(p,s)` | fixed point, p digits, s decimals | `numeric(p,s)` |
| `NUMBER(p)` | integer, max p digits | `numeric(p)` / `integer` |
| `DATE` | date + time (seconds) | `timestamp` (PG `date` has no time) |
| CLOB / BLOB | large text / binary | `text` / `bytea` |
| *(no boolean in Oracle SQL ≤ 21c)* | | `boolean` |

The app translates `VARCHAR2` → `VARCHAR` and `NUMBER` → `NUMERIC` for you, and shows a note when it does.

## Changing tables

```sql
ALTER TABLE employees3 ADD (cardid NUMBER(5));          -- Oracle;  PG: ADD COLUMN cardid numeric(5)
ALTER TABLE employees3 MODIFY cardid NUMBER(7);         -- Oracle;  PG: ALTER COLUMN cardid TYPE numeric(7)
ALTER TABLE employees3 DROP COLUMN cardid;
ALTER TABLE employees3 RENAME COLUMN regi TO uj;
RENAME employees3 TO employees23;                        -- Oracle;  PG: ALTER TABLE employees3 RENAME TO employees23
TRUNCATE TABLE employees23;   DROP TABLE employees23;
```

## Constraints

`PRIMARY KEY`, `FOREIGN KEY … REFERENCES`, `NOT NULL`, `UNIQUE`, `CHECK (...)`. They can be declared **inline** (next to the column) or **out-of-line** (as a separate item, which is required for multi-column keys):

```sql
CREATE TABLE departments2 (
  department_id   NUMBER(4) CONSTRAINT d_pk PRIMARY KEY,               -- inline, named
  department_name VARCHAR2(30) NOT NULL,
  manager_id      NUMBER(6) REFERENCES employees (employee_id),        -- inline FK
  location_id     NUMBER(4),
  CONSTRAINT d_loc_fk FOREIGN KEY (location_id) REFERENCES locations   -- out-of-line
);
ALTER TABLE employees ADD CONSTRAINT minimalber CHECK (salary > 2000);
ALTER TABLE employees DROP CONSTRAINT minimalber;
```

- FK options: `ON DELETE CASCADE` (delete children as well), `ON DELETE SET NULL`. By default, a parent row with children **cannot be deleted**.
- A constraint can only be added if the **existing data satisfies it**.
- Oracle data dictionary: `user_tables`, `user_constraints` (constraint_type: P, R, U, C). These also work here.

## Sequences

```sql
CREATE SEQUENCE seq_tab START WITH 1 INCREMENT BY 1 NOCACHE;
INSERT INTO tab (id, name) VALUES (seq_tab.NEXTVAL, 'CBA');   -- PG: nextval('seq_tab')
```

PostgreSQL alternatives: `serial` or `GENERATED ALWAYS AS IDENTITY` columns create the sequence automatically.

## DML

```sql
INSERT INTO departments2 (department_id, department_name, location_id) VALUES (42, 'SAJTKÉSZÍTŐ', 1000);
UPDATE employees2 SET salary = 8500, manager_id = 100 WHERE employee_id = 1111;   -- WHERE!!!
DELETE FROM employees2 WHERE employee_id = 1111;
```

## Views

A view is a saved query that you can use like a table:

```sql
CREATE OR REPLACE VIEW empv1 AS
  SELECT employee_id, last_name, job_id FROM employees WHERE department_id = 50;
DROP VIEW empv1;          -- the data stays
```

- Simple views are updatable (DML goes into the base table).
- `WITH CHECK OPTION`: you cannot insert or update rows that would *fall out of* the view.
- `WITH READ ONLY` (Oracle): no DML through the view.

## Indexes

```sql
CREATE INDEX hallg_nevsor_idx ON hallgato (nev, evfolyam DESC);
CREATE UNIQUE INDEX hallg_nev_idx ON hallgato (nev);
DROP INDEX hallg_nevsor_idx;
```

Index columns you **search or sort by** often, and foreign keys (for joins). Every index slows down DML, because it has to be maintained too.
