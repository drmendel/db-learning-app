# SELECT basics (Lab 1)

## Selecting columns

```sql
SELECT * FROM employees;                              -- every column
SELECT first_name, last_name, salary FROM employees;  -- chosen columns
```

## Concatenation and aliases

Text is joined with `||`; string literals use **single quotes**. An alias renames a column. Use **double quotes**
if the alias contains spaces or accented/upper-case letters.

```sql
SELECT first_name || ' ' || last_name AS "Név",
       employee_id "Azonosító"
FROM employees;
```

## Filtering with WHERE

```sql
SELECT last_name, job_id, salary FROM employees WHERE salary > 10000;
SELECT * FROM employees WHERE department_id = 80 AND salary >= 10000;
SELECT * FROM employees WHERE NOT department_id = 100;
SELECT * FROM employees WHERE salary BETWEEN 2400 AND 3000;      -- inclusive on both ends
SELECT * FROM employees WHERE LOWER(first_name) IN ('kevin', 'steven');
```

> **Trap:** you can't use a column alias in `WHERE`. `WHERE Jutalék > 2000` fails because `WHERE` is evaluated before `SELECT`. Repeat the expression instead.

## NULL handling

`NULL` means *no value*. Any comparison with NULL is *unknown*, so `commission_pct = NULL` never matches. Use `IS NULL` / `IS NOT NULL` instead.

- **Oracle:** `NVL(x, 0)` replaces NULL with 0.
- **PostgreSQL / standard SQL:** `COALESCE(x, 0)`. In this app `NVL` works too.

```sql
SELECT first_name, NVL(commission_pct, 0) * salary AS "Jutalék"
FROM employees
WHERE NVL(commission_pct, 0) * salary > 2000;
```

## Pattern matching

`LIKE` uses `%` for any number of characters and `_` for exactly one character. It is **case-sensitive**, so normalise with `UPPER()`/`LOWER()`:

```sql
SELECT first_name, last_name FROM employees WHERE UPPER(first_name) LIKE '%EV%';
```

## Sorting and DISTINCT

```sql
SELECT * FROM employees ORDER BY department_id DESC, first_name;   -- ASC is the default
SELECT * FROM employees ORDER BY 11 DESC, 2;                       -- by position in the SELECT list
SELECT DISTINCT department_id FROM employees;
```

## Dates

| Oracle | PostgreSQL |
|---|---|
| `TO_DATE('2001.01.13','YYYY.MM.DD')` | the same works (or `DATE '2001-01-13'`) |
| `TO_CHAR(hire_date,'YYYY.MM.DD')` | the same works |
| `EXTRACT(YEAR FROM hire_date)` | the same works |
| `SYSDATE` | `CURRENT_DATE` / `LOCALTIMESTAMP` |
| `MONTHS_BETWEEN(d1, d2)` | `AGE(d1, d2)`, or `MONTHS_BETWEEN` in this app |

> The HR data is old: everyone was hired between **1987 and 2000**.

## String functions

`LENGTH(s)`, `UPPER/LOWER(s)`, `SUBSTR(s, start, len)` (1-based), `INITCAP(s)`, `TRIM(s)`.

> **Oracle vs PostgreSQL:** in Oracle `SUBSTR(name, -1, 1)` is the **last** character. PostgreSQL does not count from the end; use `RIGHT(name, 1)` (or `LIKE '%n'`).

## CASE

```sql
SELECT last_name,
       CASE WHEN salary < 5000 THEN 'Alacsony'
            WHEN salary BETWEEN 5000 AND 12000 THEN 'Közepes'
            ELSE 'Magas' END AS "Fizetés"
FROM employees;
```
