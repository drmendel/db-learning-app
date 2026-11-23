export default {
  id: 'plans',
  title: 'Execution plans & indexes',
  lab: 'Labs 3–4',
  engine: 'pg',
  lesson: '06-plans.md',
  exercises: [
    {
      id: 'plan-1', type: 'text', lang: 'sql', title: 'Oracle: produce and display a plan',
      prompt: `Write the **two Oracle statements** that produce the estimated execution plan of\n\n\`SELECT last_name, salary FROM employees WHERE employee_id = 106;\`\n\nand then display it. *(This is ZH task 2a – 3 points.)*`,
      hints: ['First: EXPLAIN PLAN FOR <query>', 'Then: SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);'],
      solution: `EXPLAIN PLAN FOR
SELECT last_name, salary FROM employees WHERE employee_id = 106;

SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);`,
      require: [
        ['EXPLAIN\\s+PLAN\\s+FOR\\s+SELECT', 'Statement 1 should be EXPLAIN PLAN FOR followed by the query.'],
        ['employee_id\\s*=\\s*106', 'Explain the given query (WHERE employee_id = 106).'],
        ['SELECT\\s+\\*\\s+FROM\\s+TABLE\\s*\\(\\s*DBMS_XPLAN\\.DISPLAY', 'Statement 2 should display PLAN_TABLE: SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY)'],
      ],
    },
    {
      id: 'plan-q1', type: 'quiz', title: 'Reading a plan',
      prompt: 'For `SELECT * FROM employees WHERE employee_id = 106;` the plan is:\n\n```text\n0 SELECT STATEMENT\n1  TABLE ACCESS BY INDEX ROWID  EMPLOYEES\n2   INDEX UNIQUE SCAN           EMP_EMP_ID_PK\n```\n\nWhat happens, in order?',
      options: [
        'The whole table is read, then filtered on employee_id',
        'The PK index is searched for 106 → it returns one ROWID → the row is read from the table by that ROWID',
        'The table is read by ROWID, then the index is checked for uniqueness',
        'A range of the index is read, then every matching row is sorted',
      ],
      answer: 1,
      explain: 'Read from the innermost step: INDEX UNIQUE SCAN finds the single entry for 106 in the unique (PK) index and returns its ROWID. TABLE ACCESS BY INDEX ROWID then fetches the row directly.',
    },
    {
      id: 'plan-q2', type: 'quiz', title: 'Which access path?',
      prompt: 'There is a (non-unique) index on `employees.department_id`. Which operation is typical for `SELECT * FROM employees WHERE department_id = 50;`?',
      options: ['INDEX UNIQUE SCAN', 'INDEX RANGE SCAN', 'INDEX FAST FULL SCAN', 'MERGE JOIN CARTESIAN'],
      answer: 1,
      explain: 'Equality on a non-unique index can match several entries → a range of the index is scanned.',
    },
    {
      id: 'plan-q3', type: 'quiz', title: 'LIKE and indexes',
      prompt: 'There is an index on `first_name`. Why can `WHERE first_name LIKE \'A%\'` use an index range scan, while `WHERE first_name LIKE \'%a\'` cannot?',
      options: [
        'Because % is not allowed at the beginning',
        'Because the index is ordered by the leading characters; with a leading wildcard the starting point of the range is unknown',
        'Because LIKE never uses indexes',
        'Because the second query returns more rows',
      ],
      answer: 1,
      explain: "A B-tree index is sorted by the value from its first character. 'A%' is a contiguous range (from 'A' to just before 'B'); '%a' can be anywhere.",
    },
    {
      id: 'plan-q4', type: 'quiz', title: 'TABLE ACCESS FULL vs INDEX RANGE SCAN',
      prompt: 'Which statement is TRUE?',
      options: [
        'An index range scan is always faster than a full table scan',
        'A full table scan reads every block of the table; it can be cheaper than an index when a large fraction of the rows is needed',
        'A full table scan is only used when the table has no indexes',
        'INDEX RANGE SCAN reads the whole table in index order',
      ],
      answer: 1,
      explain: 'With low selectivity (many rows), many single-block index + ROWID lookups cost more than one multiblock full scan. The optimizer compares the costs.',
    },
    {
      id: 'plan-q5', type: 'quiz', title: 'INDEX SKIP SCAN',
      prompt: 'When can Oracle choose an INDEX SKIP SCAN?',
      options: [
        'When the WHERE clause uses the leading column of a composite index',
        'When a composite index exists, but the query does not reference its leading column (and the leading column has few distinct values)',
        'When there is no index on the table',
        'Only with the ORDERED hint',
      ],
      answer: 1,
      explain: 'The index is logically split by the distinct values of the leading column, and each sub-index is probed using the second column.',
    },
    {
      id: 'plan-q6', type: 'quiz', title: 'Join methods',
      prompt: '`SELECT employee_id, salary, job_title FROM employees e, jobs j WHERE e.salary < j.max_salary;` – which join method fits a non-equi join condition like this?',
      options: ['Hash join', 'Sort-merge join', 'Index unique scan', 'Nested loops with INDEX UNIQUE SCAN'],
      answer: 1,
      explain: 'A hash join needs an equality condition. With a range (non-equi) condition the optimizer typically uses a sort-merge join (or nested loops).',
    },
    {
      id: 'plan-q7', type: 'quiz', title: 'Cartesian join',
      prompt: 'When do you typically see `MERGE JOIN CARTESIAN` in a plan?',
      options: ['When two tables are joined on their primary keys', 'When there is no join condition between two tables (or the ORDERED hint forces a bad order)', 'When a FULL OUTER JOIN is used', 'When a hash table does not fit into memory'],
      answer: 1,
      explain: 'Without a join condition every row is paired with every row. The ORDERED hint with a bad FROM order can also cause it.',
    },
    {
      id: 'plan-q8', type: 'quiz', title: 'Hint syntax',
      prompt: 'Which one is a valid Oracle hint that forces a full table scan of employees aliased as `e`?',
      options: ['`SELECT /* +FULL(e) */ * FROM employees e`', '`SELECT /*+ FULL(e) */ * FROM employees e`', '`SELECT * /*+ FULL(employees) */ FROM employees e`', '`SELECT --FULL(e) * FROM employees e`'],
      answer: 1,
      explain: 'The + must directly follow /*, the comment must come right after the SELECT keyword, and if the table has an alias the hint must use the alias.',
    },
    {
      id: 'plan-2', type: 'pg', title: 'PostgreSQL EXPLAIN',
      prompt: `Show the PostgreSQL estimated plan of\n\n\`SELECT last_name, salary FROM employees WHERE employee_id = 106;\`\n\n(Observe: it is a **Seq Scan**, because the table is tiny.)`,
      hints: ['`EXPLAIN <query>` – no PLAN FOR in PostgreSQL.'],
      solution: `EXPLAIN SELECT last_name, salary FROM employees WHERE employee_id = 106;`,
      require: [['^\\s*EXPLAIN\\s+(?!ANALYZE)', 'Use EXPLAIN (without ANALYZE – that one runs the query and the timings differ every time).']],
    },
    {
      id: 'plan-3', type: 'pg', title: 'Force the index',
      prompt: `Make PostgreSQL show the plan that **uses the primary key index** for the same query: first **disable sequential scans** for the session, then run EXPLAIN again.`,
      hints: ['`SET enable_seqscan = off;`', 'You should see `Index Scan using employees_pkey on employees`.'],
      solution: `SET enable_seqscan = off;
EXPLAIN SELECT last_name, salary FROM employees WHERE employee_id = 106;`,
    },
    {
      id: 'plan-4', type: 'pg', title: 'Function-based index (ZH 2c)',
      prompt: `Create an index named \`emp_upper_last_ix\` that can speed up queries with the condition \`UPPER(last_name) = 'KING'\`. *(ZH task 2c.)*`,
      hints: ['Index the **expression**, not the column: `CREATE INDEX emp_upper_last_ix ON employees (UPPER(last_name));`'],
      solution: `CREATE INDEX emp_upper_last_ix ON employees (UPPER(last_name));`,
      check: `SET enable_seqscan = off;
EXPLAIN SELECT * FROM employees WHERE UPPER(last_name) = 'KING';`,
      checkMsg: 'The planner could not use your index for UPPER(last_name) = \'KING\'.',
    },
    {
      id: 'plan-5', type: 'pg', title: 'Join methods in PostgreSQL',
      prompt: `Look at the join method PostgreSQL picks for joining all employees with their departments: run EXPLAIN on\n\n\`SELECT e.last_name, d.department_name FROM employees e JOIN departments d ON e.department_id = d.department_id;\``,
      hints: ['You should see a Hash Join: the smaller table (departments) is hashed.'],
      solution: `EXPLAIN SELECT e.last_name, d.department_name FROM employees e JOIN departments d ON e.department_id = d.department_id;`,
    },
    {
      id: 'plan-c1', type: 'card', title: 'Cardinality & cost',
      prompt: 'Define **cardinality** and **cost** in an execution plan. (ZH 7)',
      answerText: '**Cardinality** (Rows): the estimated number of rows a plan step returns. **Cost**: the optimizer\'s estimate of the resources (I/O, CPU, memory) the step and its children need. It is a relative unit used to compare plans; the CBO chooses the plan with the lowest cost.',
    },
    {
      id: 'plan-c2', type: 'card', title: 'Hard vs soft parse',
      prompt: 'What are the stages of SQL processing in Oracle, and what is the difference between a hard and a soft parse?',
      answerText: 'Parse (syntax check, semantic check, shared pool check) → optimisation (CBO builds plans and picks the cheapest) → row source generation → execution. **Soft parse**: an identical statement is already in the shared pool (library cache), so its plan is reused. **Hard parse**: not found, so the statement must be optimised and a new plan generated, which is expensive. Bind variables help reuse plans.',
    },
  ],
};
