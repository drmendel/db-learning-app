# Allekérdezések és WITH (3. labor)

Néha jól jönne, ha egy lekérdezés eredményét egy **másik lekérdezésben** használhatnánk fel. Az allekérdezés állhat

1. **érték helyett** (skalár allekérdezés): pontosan 1 sort és 1 oszlopot ad vissza,
2. **feltételben** (`IN`, `EXISTS`, összehasonlítás),
3. **tábla helyett** (inline nézet, a FROM-ban).

## Feltételben

```sql
-- a legkevesebbet kereső dolgozó munkaköre
SELECT job_title
FROM employees NATURAL JOIN jobs
WHERE salary = (SELECT MIN(salary) FROM employees);
```

## Inline nézet (allekérdezés a FROM-ban)

```sql
-- a dolgozók a részlegük átlagfizetésével
SELECT e.last_name, e.salary, e.department_id, a.atlag
FROM employees e
  JOIN (SELECT department_id, AVG(salary) AS atlag
        FROM employees GROUP BY department_id) a
    ON e.department_id = a.department_id;
```

Az inline nézet táblaként viselkedik, ezért ugyanúgy meg kell adni hozzá az összekapcsolási feltételt, mint egy valódi táblánál.

> Az Oracle megengedi az alias nélküli inline nézetet. A PostgreSQL 16+ szintén, de jó szokás aliast adni neki.

## Korrelált allekérdezés

A belső lekérdezés a külső sorra hivatkozik, és minden sorra újra kiértékelődik:

```sql
SELECT last_name, salary
FROM employees e
WHERE salary > (SELECT AVG(salary) FROM employees x WHERE x.department_id = e.department_id);
```

## WITH: subquery factoring (CTE)

Előre elnevezel egy allekérdezést, és utána úgy használod, mint egy táblát, akár többször is. A hosszú lekérdezések így olvashatóbbak:

```sql
WITH dept_sums AS (
  SELECT department_name, SUM(salary) AS dsum
  FROM employees JOIN departments USING (department_id)
  GROUP BY department_name
),
avg_cost AS (
  SELECT ROUND(AVG(dsum)) AS average FROM dept_sums
)
SELECT * FROM dept_sums
WHERE dsum > (SELECT average FROM avg_cost)
ORDER BY department_name;
```

Az adatbázis a CTE-t kezelheti hagyományos inline allekérdezésként, vagy egyszer kiszámolva ideiglenes eredményként (*materializálva*).

## EXISTS

```sql
-- részlegek, ahol legalább egy dolgozó 10000-nél többet keres
SELECT department_name FROM departments d
WHERE EXISTS (SELECT 1 FROM employees e WHERE e.department_id = d.department_id AND e.salary > 10000);
```
