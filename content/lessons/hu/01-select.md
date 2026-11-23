# SELECT alapok (1. labor)

## Oszlopok kiválasztása

```sql
SELECT * FROM employees;                              -- minden oszlop
SELECT first_name, last_name, salary FROM employees;  -- kiválasztott oszlopok
```

## Összefűzés és alias

Szövegeket a `||` operátor fűz össze; a szövegliterálok **aposztrófok** közé kerülnek. Az alias átnevez egy oszlopot. Használj
**idézőjelet**, ha az alias szóközt vagy ékezetes/nagybetűs karaktert tartalmaz.

```sql
SELECT first_name || ' ' || last_name AS "Név",
       employee_id "Azonosító"
FROM employees;
```

## Szűrés WHERE-rel

```sql
SELECT last_name, job_id, salary FROM employees WHERE salary > 10000;
SELECT * FROM employees WHERE department_id = 80 AND salary >= 10000;
SELECT * FROM employees WHERE NOT department_id = 100;
SELECT * FROM employees WHERE salary BETWEEN 2400 AND 3000;      -- mindkét határt beleérti
SELECT * FROM employees WHERE LOWER(first_name) IN ('kevin', 'steven');
```

> **Csapda:** a WHERE-ben nem használhatsz oszlopaliast. A `WHERE Jutalék > 2000` hibát ad, mert a `WHERE` a `SELECT` előtt értékelődik ki. Ismételd meg inkább a kifejezést.

## NULL kezelése

A `NULL` jelentése: *nincs érték*. Minden NULL-lal való összehasonlítás *ismeretlen*, ezért a `commission_pct = NULL` soha nem illeszkedik. Használd helyette az `IS NULL` / `IS NOT NULL` formát.

- **Oracle:** az `NVL(x, 0)` a NULL-t 0-ra cseréli.
- **PostgreSQL / szabványos SQL:** `COALESCE(x, 0)`. Ebben az alkalmazásban az `NVL` is működik.

```sql
SELECT first_name, NVL(commission_pct, 0) * salary AS "Jutalék"
FROM employees
WHERE NVL(commission_pct, 0) * salary > 2000;
```

## Mintaillesztés

A `LIKE`-ban a `%` tetszőleges számú, az `_` pontosan egy karaktert jelöl. **Kis-nagybetű érzékeny**, ezért normalizálj az `UPPER()`/`LOWER()` függvénnyel:

```sql
SELECT first_name, last_name FROM employees WHERE UPPER(first_name) LIKE '%EV%';
```

## Rendezés és DISTINCT

```sql
SELECT * FROM employees ORDER BY department_id DESC, first_name;   -- az ASC az alapértelmezés
SELECT * FROM employees ORDER BY 11 DESC, 2;                       -- a SELECT lista pozíciója szerint
SELECT DISTINCT department_id FROM employees;
```

## Dátumok

| Oracle | PostgreSQL |
|---|---|
| `TO_DATE('2001.01.13','YYYY.MM.DD')` | ugyanez működik (vagy `DATE '2001-01-13'`) |
| `TO_CHAR(hire_date,'YYYY.MM.DD')` | ugyanez működik |
| `EXTRACT(YEAR FROM hire_date)` | ugyanez működik |
| `SYSDATE` | `CURRENT_DATE` / `LOCALTIMESTAMP` |
| `MONTHS_BETWEEN(d1, d2)` | `AGE(d1, d2)`, vagy ebben az alkalmazásban `MONTHS_BETWEEN` |

> A HR adatok régiek: mindenki **1987 és 2000 között** lépett be.

## Szövegfüggvények

`LENGTH(s)`, `UPPER/LOWER(s)`, `SUBSTR(s, kezdet, hossz)` (1-től számol), `INITCAP(s)`, `TRIM(s)`.

> **Oracle vs PostgreSQL:** Oracle-ben a `SUBSTR(name, -1, 1)` az **utolsó** karakter. A PostgreSQL nem számol a végéről; használd a `RIGHT(name, 1)` (vagy a `LIKE '%n'`) formát.

## CASE

```sql
SELECT last_name,
       CASE WHEN salary < 5000 THEN 'Alacsony'
            WHEN salary BETWEEN 5000 AND 12000 THEN 'Közepes'
            ELSE 'Magas' END AS "Fizetés"
FROM employees;
```
