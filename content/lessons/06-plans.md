# Execution plans, access paths, joins, hints (Labs 3–4)

Before a SQL statement runs, the **optimizer** (Oracle: CBO, the cost-based optimizer) chooses an **execution plan**.
The plan says how each table is read (*access path*) and how tables are combined (*join method*).

## Oracle: show the estimated plan

```sql
EXPLAIN PLAN FOR
SELECT last_name, salary FROM employees WHERE employee_id = 106;   -- 1) store the plan in PLAN_TABLE

SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);                            -- 2) display it
-- variants: DBMS_XPLAN.DISPLAY(FORMAT => 'BASIC') / 'ALL';  SQL Developer: F10
```

```text
| Id | Operation                   | Name          | Rows | Cost |
|  0 | SELECT STATEMENT            |               |    1 |    1 |
|  1 |  TABLE ACCESS BY INDEX ROWID| EMPLOYEES     |    1 |    1 |
|  2 |   INDEX UNIQUE SCAN         | EMP_EMP_ID_PK |    1 |    0 |
```

Read it **from the innermost (most indented) line outward**: first the index finds the single ROWID for
employee_id = 106 (INDEX UNIQUE SCAN on the primary key index), then the row is fetched from the table
directly by that ROWID (TABLE ACCESS BY INDEX ROWID).

- **Rows / Cardinality**: the *estimated* number of rows the step returns.
- **Cost**: the optimizer's estimate of the resources (I/O, CPU) needed. A relative number: lower is better.
- `EXPLAIN PLAN` does **not** execute the query, so these are estimates. The plans that actually ran are in `V$SQL_PLAN` (the library cache).

## Access paths (Oracle)

| Operation | When |
|---|---|
| **TABLE ACCESS FULL** | reads every block of the table (no usable index, or most rows are needed). Hint: `FULL(t)` |
| **TABLE ACCESS BY INDEX ROWID** | fetches a row by the ROWID an index returned |
| **INDEX UNIQUE SCAN** | equality on a unique / PK index → at most 1 ROWID |
| **INDEX RANGE SCAN** | a range of a (non-unique) index: `<`, `>`, `BETWEEN`, `LIKE 'A%'`, non-unique `=` |
| **INDEX FULL SCAN** | reads the whole index **in order** (e.g. to avoid a sort for `ORDER BY`) |
| **INDEX FAST FULL SCAN** | reads the whole index in **any order**, multiblock (like a full scan of a thin table). Hint: `INDEX_FFS` |
| **INDEX SKIP SCAN** | composite index used although the **leading column is not in the WHERE**. Hint: `INDEX_SS` |
| **INDEX JOIN SCAN** | combines several indexes so the table itself is not read. Hint: `INDEX_JOIN` |

> `LIKE 'A%'` can use an index range scan; `LIKE '%a'` cannot, because the leading characters are unknown.
> `UPPER(last_name) = 'KING'` cannot use a plain index on `last_name`. It needs a **function-based index**:
> `CREATE INDEX emp_upper_last_ix ON employees (UPPER(last_name));`

## Join methods

| Method | Typical use |
|---|---|
| **Nested loops** | small outer row set, indexed access on the inner table (e.g. `... WHERE employee_id = 106`) |
| **Hash join** | large equi-joins; builds a hash table from the smaller input (used for FULL OUTER joins too) |
| **Sort-merge join** | both inputs sorted on the join key; good for **non-equi** joins like `salary < max_salary` |
| **Cartesian (MERGE JOIN CARTESIAN)** | no join condition between two tables |

## Hints

`SELECT /*+ hint */ ...`. Write the hint right after SELECT/UPDATE/INSERT/DELETE/MERGE, with **no space between `/*` and `+`**.
A syntactically wrong hint is silently ignored. Use hints for testing, not normally.

- Access: `FULL(t)`, `INDEX(t idx)`, `NO_INDEX`, `INDEX_ASC/DESC`, `INDEX_FFS`, `INDEX_SS`, `INDEX_COMBINE`
- Join: `USE_NL`, `USE_HASH`, `USE_MERGE` (and `NO_USE_…`), `ORDERED` (join in FROM order)
- Goal: `ALL_ROWS` (throughput), `FIRST_ROWS(10)` (fast first rows)

## Statistics and histograms

The CBO relies on **statistics** (row counts, distinct values, …). With a skewed column (e.g. commission_pct),
the cardinality estimate can be wrong. A **histogram** describes the value distribution:

```sql
SELECT column_name, histogram FROM user_tab_col_statistics WHERE table_name = 'EMPLOYEES';
EXEC DBMS_STATS.GATHER_TABLE_STATS('HR', 'EMPLOYEES', method_opt => 'FOR COLUMNS COMMISSION_PCT');
```

**Selectivity** is the fraction of rows that a predicate keeps. Cardinality ≈ selectivity × number of rows.

## The PostgreSQL equivalents (you can run these here)

```sql
EXPLAIN SELECT * FROM employees WHERE employee_id = 106;          -- estimated plan
EXPLAIN ANALYZE SELECT * FROM employees WHERE employee_id = 106;  -- executes it, shows real times/rows
```

| PostgreSQL | Oracle |
|---|---|
| Seq Scan | TABLE ACCESS FULL |
| Index Scan | INDEX UNIQUE/RANGE SCAN + TABLE ACCESS BY INDEX ROWID |
| Index Only Scan | index-only access (no table visit) |
| Bitmap Index/Heap Scan | (bitmap access) |
| Nested Loop / Hash Join / Merge Join | the same join methods |

> HR is tiny (107 rows), so PostgreSQL usually prefers a Seq Scan: reading 2 pages is cheaper than using an index.
> To *see* index usage, discourage sequential scans for the session: `SET enable_seqscan = off;`
