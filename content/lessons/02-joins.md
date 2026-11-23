# Joining tables (Lab 1)

The employee's name is in `employees`, the department's name is in `departments`. To see both, we **join** the
two tables on matching values (`employees.department_id = departments.department_id`).

## Classic (Oracle) syntax: join condition in WHERE

```sql
SELECT first_name, last_name, department_name
FROM employees e, departments d
WHERE e.department_id = d.department_id;
```

- If a column name exists in both tables, you must **qualify** it: `e.department_id`.
- Rule of thumb: **n tables → n−1 join conditions**. Without a condition you get a **Cartesian product**: every row paired with every row.

## ANSI JOIN syntax

```sql
-- ON: any condition
SELECT e.last_name, d.department_name
FROM employees e INNER JOIN departments d ON e.department_id = d.department_id;

-- USING: when the column has the same name on both sides (then don't prefix it!)
SELECT last_name, job_id, department_id, department_name
FROM employees INNER JOIN departments USING (department_id);

-- joins can be chained
SELECT e.last_name, l.city
FROM employees e
  JOIN departments d ON e.department_id = d.department_id
  JOIN locations   l ON d.location_id   = l.location_id;
```

## Self-join

A table joined to itself, e.g. employee and their manager. Use two aliases:

```sql
SELECT e.last_name AS beosztott, m.last_name AS fonok
FROM employees e JOIN employees m ON e.manager_id = m.employee_id;
```

## Outer joins

| Join | Keeps |
|---|---|
| `INNER JOIN` | only rows that have a partner in the other table |
| `LEFT [OUTER] JOIN` | every row from the **left** table (missing partner → NULLs) |
| `RIGHT [OUTER] JOIN` | every row from the **right** table |
| `FULL [OUTER] JOIN` | every row from **both** tables |

```sql
-- every employee, even Kimberely Grant who has no department
SELECT e.employee_id, e.last_name, e.department_id, d.department_name
FROM employees e LEFT JOIN departments d ON e.department_id = d.department_id;
```

### Set difference with outer joins

- **A \ B**: rows of A with no partner in B → `A LEFT JOIN B ... WHERE B.key IS NULL`
- **B \ A**: `A RIGHT JOIN B ... WHERE A.key IS NULL`

```sql
-- departments where nobody works
SELECT d.department_name
FROM employees e RIGHT JOIN departments d ON e.department_id = d.department_id
WHERE e.department_id IS NULL;
```

> Filter on the **key** of the optional side (`e.employee_id IS NULL`), not on a column that may legitimately be NULL anyway.

## NATURAL JOIN

`NATURAL JOIN` joins automatically on **all columns with the same name**. This is convenient, but it is a trap in HR:

- `employees NATURAL JOIN departments` joins on `department_id` **and** `manager_id`, which is wrong.
- `employees NATURAL JOIN job_history` joins on `job_id` too.
- `employees NATURAL JOIN jobs` is fine (only `job_id` is shared).
