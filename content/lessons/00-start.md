# How this works

You learn every topic **by doing it**: each module starts with a short lesson, then a series of tasks.
Everything runs on the app's own server, with no external services.

| Engine | What runs behind it |
|---|---|
| **SQL** | Real **PostgreSQL** (PGlite) with the course's **HR schema** (107 employees). Oracle-style syntax from labs 1–4 (`NVL`, `DUAL`, `VARCHAR2`, `NUMBER`, `SYSDATE`, `EXPLAIN PLAN FOR`, …) is translated where possible, and the app tells you the PostgreSQL way. |
| **Redis** | An emulator of the Redis commands used in lab 7 (strings, TTL, lists, sets, sorted sets, hashes, MULTI/EXEC). Output looks like `redis-cli`. |
| **MongoDB** | A mongosh-style shell (`use`, `db.coll.find(...)`, `aggregate`, `updateMany`, …) on top of the *mingo* query engine. |

## The workflow for every task

1. Read the task and write your answer in the editor.
2. **Run** (`Ctrl+Enter`) executes it so you can look at the output. Nothing is graded yet.
3. **Check** (`Ctrl+Shift+Enter`) grades it: your code and the reference solution run on an identical fresh
   copy of the data and their results are compared.
4. Stuck? Open **hints** one at a time, look at the **expected output**, and only then the **solution**.

Every check runs in a sandbox that is thrown away afterwards (SQL: a rolled-back transaction; Redis/Mongo: a fresh
in-memory database). You can't break anything. Use the **Playground** tab to experiment freely.

Your progress is stored **in this browser** (localStorage); on another computer or browser you start fresh.

## How SQL answers are compared

- Column **names/aliases don't matter**, and neither does the **order of the columns**.
- The **rows must match** (numbers are compared rounded to 2 decimals).
- If the task asks for an ordering, the **row order must match** too (rows that tie on the sort keys may come in any order).
- "Full name" always means **one column**: `first_name || ' ' || last_name`.

## The HR schema (used in labs 1–6 and the ZH)

```text
regions(region_id, region_name)
countries(country_id, country_name, region_id → regions)
locations(location_id, street_address, postal_code, city, state_province, country_id → countries)
departments(department_id, department_name, manager_id → employees, location_id → locations)
jobs(job_id, job_title, min_salary, max_salary)
employees(employee_id, first_name, last_name, email, phone_number, hire_date, job_id → jobs,
          salary, commission_pct, manager_id → employees, department_id → departments)
job_history(employee_id, start_date, end_date, job_id, department_id)
```

A few facts worth knowing (they make good traps):

- **Kimberely Grant** (178) has **no department** (`department_id IS NULL`).
- **Steven King** (100) has **no manager**.
- Only the sales people (department 80) have a `commission_pct`; for everybody else it is `NULL`.
- 16 of the 27 departments have **no employees**.

Open the **Schema** panel (top right) at any time to see all tables and columns.
