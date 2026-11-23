# Csoportosítás: GROUP BY és HAVING (1–3. labor)

## Csoportfüggvények

`AVG`, `SUM`, `MIN`, `MAX`, `COUNT`. Sok sorból egyetlen értéket állítanak elő:

```sql
SELECT AVG(salary), MAX(commission_pct), COUNT(*) FROM employees;
```

- A `COUNT(*)` a **sorokat** számolja. A `COUNT(oszlop)` a **nem NULL értékeket**. A `COUNT(DISTINCT oszlop)` a különböző értékeket.
- A csoportfüggvények **figyelmen kívül hagyják a NULL-okat** (kivéve a `COUNT(*)`).

## GROUP BY

A csoportfüggvényt **csoportonként** számolja ki, ahol egy csoportba az azonos érték(ek)kel rendelkező sorok kerülnek:

```sql
SELECT department_id, MAX(salary)
FROM employees
GROUP BY department_id;
```

> **Aranyszabály:** GROUP BY esetén a SELECT listában csak csoportosító oszlop, csoportfüggvény, konstans és ezekből alkotott
> kifejezés szerepelhet. A `SELECT department_id, salary, SUM(salary) ... GROUP BY department_id` hibás: *melyik* fizetést mutassa?

## WHERE vs HAVING

- A `WHERE` a **sorokat szűri a csoportosítás előtt** (nem használhat csoportfüggvényt).
- A `HAVING` a **csoportokat szűri a csoportosítás után** (jellemzően csoportfüggvényekre).

```sql
SELECT department_id, COUNT(*)
FROM employees
WHERE salary > 3000          -- sorok
GROUP BY department_id
HAVING COUNT(*) >= 10;       -- csoportok
```

## A lekérdezés részeinek sorrendje (ebben a sorrendben írd)

```text
SELECT … FROM … WHERE … GROUP BY … HAVING … ORDER BY …
```

A logikai kiértékelés sorrendje más: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY.
Ezért egy SELECT-ben definiált alias használható az ORDER BY-ban, de a WHERE-ben nem.

## ROUND

A `ROUND(x)` egészre, a `ROUND(x, 2)` 2 tizedesre kerekít. PostgreSQL-ben a `ROUND(x, n)`-hez `numeric` érték kell. A HR salary oszlopa ilyen.

## Nullák számolása külső összekapcsolással

Az **opcionális oldal nem NULL kulcsát** számold, így a pár nélküli csoportok 0-t kapnak:

```sql
SELECT c.country_name, COUNT(d.department_id)      -- nem COUNT(*)!
FROM countries c
  LEFT JOIN locations l   ON l.country_id = c.country_id
  LEFT JOIN departments d ON d.location_id = l.location_id
GROUP BY c.country_name;
```
