# Subqueries and WITH (Lab 3)

Sometimes you need the result of one query **inside** another. A subquery can stand

1. **in place of a value** (scalar subquery): it returns exactly 1 row and 1 column,
2. **in a condition** (`IN`, `EXISTS`, comparison),
3. **in place of a table** (inline view, in FROM).

## In a condition

```sql
-- the job of the lowest-paid employee
SELECT job_title
FROM employees NATURAL JOIN jobs
WHERE salary = (SELECT MIN(salary) FROM employees);
```

## Inline view (subquery in FROM)

```sql
-- employees with their department's average salary
SELECT e.last_name, e.salary, e.department_id, a.atlag
FROM employees e
  JOIN (SELECT department_id, AVG(salary) AS atlag
        FROM employees GROUP BY department_id) a
    ON e.department_id = a.department_id;
```

The inline view behaves like a table, so you need a join condition with it, just as with a real table.

> Oracle allows an inline view without an alias. PostgreSQL ≥ 16 does too, but giving it an alias is good practice.

## Correlated subquery

The inner query refers to the outer row and is re-evaluated for each row:

```sql
SELECT last_name, salary
FROM employees e
WHERE salary > (SELECT AVG(salary) FROM employees x WHERE x.department_id = e.department_id);
```

## WITH: subquery factoring (CTE)

Name a subquery up front and use it like a table, even several times. This makes long queries readable:

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

The database may evaluate a CTE inline like a normal subquery, or *materialise* it once into a temporary result.

## EXISTS

```sql
-- departments with at least one employee earning > 10000
SELECT department_name FROM departments d
WHERE EXISTS (SELECT 1 FROM employees e WHERE e.department_id = d.department_id AND e.salary > 10000);
```
