# Aggregation: GROUP BY and HAVING (Labs 1–3)

## Group (aggregate) functions

`AVG`, `SUM`, `MIN`, `MAX`, `COUNT`. They collapse many rows into one value:

```sql
SELECT AVG(salary), MAX(commission_pct), COUNT(*) FROM employees;
```

- `COUNT(*)` counts **rows**. `COUNT(column)` counts **non-NULL values**. `COUNT(DISTINCT column)` counts different values.
- Aggregates **ignore NULLs** (except `COUNT(*)`).

## GROUP BY

Compute the aggregate **per group** of rows that share the same value(s):

```sql
SELECT department_id, MAX(salary)
FROM employees
GROUP BY department_id;
```

> **Golden rule:** with GROUP BY, the SELECT list may contain only grouping columns, aggregate functions, constants, and
> expressions built from these. `SELECT department_id, salary, SUM(salary) ... GROUP BY department_id` is an error: *which* salary should it show?

## WHERE vs HAVING

- `WHERE` filters **rows before** grouping (it cannot use aggregates).
- `HAVING` filters **groups after** grouping (typically on aggregates).

```sql
SELECT department_id, COUNT(*)
FROM employees
WHERE salary > 3000          -- rows
GROUP BY department_id
HAVING COUNT(*) >= 10;       -- groups
```

## Clause order (write it in this order)

```text
SELECT … FROM … WHERE … GROUP BY … HAVING … ORDER BY …
```

The logical evaluation order is different: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY.
That is why an alias defined in SELECT can be used in ORDER BY but not in WHERE.

## ROUND

`ROUND(x)` rounds to an integer, `ROUND(x, 2)` to 2 decimals. In PostgreSQL `ROUND(x, n)` needs a `numeric` value. That is fine for HR's salary column.

## Counting zeros with an outer join

Count the **non-NULL key of the optional side**, so groups with no partner get 0:

```sql
SELECT c.country_name, COUNT(d.department_id)      -- not COUNT(*)!
FROM countries c
  LEFT JOIN locations l   ON l.country_id = c.country_id
  LEFT JOIN departments d ON d.location_id = l.location_id
GROUP BY c.country_name;
```
