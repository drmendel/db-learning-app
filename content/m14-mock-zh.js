// Mock ZH – modelled on lab-11/MZH.pdf (100 minutes, 70 practical + 30 theory points)
const B = { data: 'bolt', db: 'bolt' };
const KURZUS_TABLE = `CREATE TABLE kurzusok (kurzus_id serial PRIMARY KEY, nev text NOT NULL, cimkek text[] NOT NULL DEFAULT '{}');`;
const KURZUS_2 = KURZUS_TABLE + `
INSERT INTO kurzusok (nev, cimkek) VALUES ('SQL alapok', ARRAY['sql','adatbazis']), ('PostgreSQL', ARRAY['sql','postgresql','json']);`;
import { behaviour } from './util.js';
const assert = (cond) => `PERFORM 1 / (CASE WHEN (${cond}) THEN 1 ELSE 0 END)`;

export default {
  id: 'mockzh',
  title: 'Mock ZH (100 min)',
  lab: 'Exam',
  engine: 'mixed',
  exam: { minutes: 100 },
  lesson: '14-mock-zh.md',
  exercises: [
    {
      id: 'zh-1a', type: 'pg', points: 7, title: '1a) Oracle SQL – HR',
      prompt: 'List the **full name**, **department name** and **salary** of employees who earn **at least 8000 USD**. Order by **salary descending**.',
      solution: `SELECT e.first_name || ' ' || e.last_name AS nev, d.department_name, e.salary
FROM employees e JOIN departments d ON e.department_id = d.department_id
WHERE e.salary >= 8000
ORDER BY e.salary DESC;`,
    },
    {
      id: 'zh-1b', type: 'pg', points: 9, title: '1b) Oracle SQL – HR',
      prompt: 'Per department, list the **department name**, the **number of employees** and the **average salary rounded to an integer**. Only departments with **at least 5 employees** and an **average salary above 6000 USD** should appear. Order by the **average salary descending**.',
      solution: `SELECT d.department_name, COUNT(*) AS letszam, ROUND(AVG(e.salary)) AS atlag
FROM employees e JOIN departments d ON e.department_id = d.department_id
GROUP BY d.department_name
HAVING COUNT(*) >= 5 AND AVG(e.salary) > 6000
ORDER BY atlag DESC;`,
    },
    {
      id: 'zh-1c', type: 'pg', points: 9, title: '1c) Oracle SQL – subquery',
      prompt: 'Using a **subquery**, list the **full name**, **salary** and **department name** of employees who earn **more than the average salary of their own department**. Order by **salary descending**.',
      solution: `SELECT e.first_name || ' ' || e.last_name AS nev, e.salary, d.department_name
FROM employees e JOIN departments d ON e.department_id = d.department_id
WHERE e.salary > (SELECT AVG(x.salary) FROM employees x WHERE x.department_id = e.department_id)
ORDER BY e.salary DESC;`,
      require: [['\\(\\s*SELECT', 'The task asks for a subquery.']],
    },
    {
      id: 'zh-2a', type: 'text', lang: 'sql', points: 3, title: '2a) Plan statements',
      prompt: 'Write the **two Oracle SQL statements** that produce and then display the estimated execution plan of\n\n`SELECT last_name, salary FROM employees WHERE employee_id = 106;`',
      solution: `EXPLAIN PLAN FOR
SELECT last_name, salary FROM employees WHERE employee_id = 106;
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);`,
      require: [
        ['EXPLAIN\\s+PLAN\\s+FOR\\s+SELECT', 'Statement 1: EXPLAIN PLAN FOR <query>'],
        ['SELECT\\s+\\*\\s+FROM\\s+TABLE\\s*\\(\\s*DBMS_XPLAN\\.DISPLAY', 'Statement 2: SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY)'],
      ],
    },
    {
      id: 'zh-2b', type: 'card', points: 3, title: '2b) Explain the plan',
      prompt: 'The plan of the query above is:\n\n```text\n0 SELECT STATEMENT\n1  TABLE ACCESS BY INDEX ROWID  EMPLOYEES\n2   INDEX UNIQUE SCAN           EMP_EMP_ID_PK\n```\n\nExplain what **INDEX UNIQUE SCAN** and **TABLE ACCESS BY INDEX ROWID** do **in this plan**.',
      answerText: '**INDEX UNIQUE SCAN** (step 2, runs first): looks up the value 106 in the unique primary-key index EMP_EMP_ID_PK. Because the index is unique it returns at most one entry, i.e. one ROWID. **TABLE ACCESS BY INDEX ROWID** (step 1): uses that ROWID (the physical address of the row) to read exactly that row from the EMPLOYEES table, to get last_name and salary, which are not in the index. No full table scan is needed.',
    },
    {
      id: 'zh-2c', type: 'pg', points: 2, title: '2c) Function-based index',
      prompt: 'Write an index-creating statement (name it `emp_upper_last_ix`) that can speed up queries using the condition `UPPER(last_name) = \'KING\'`.',
      solution: `CREATE INDEX emp_upper_last_ix ON employees (UPPER(last_name));`,
      check: `SET enable_seqscan = off;
EXPLAIN SELECT * FROM employees WHERE UPPER(last_name) = 'KING';`,
    },
    {
      id: 'zh-3a', type: 'pg', points: 5, title: '3a) PostgreSQL – table with array',
      prompt: 'Create a table `kurzusok`: `kurzus_id` **auto-incrementing primary key**, `nev` **required** text, `cimkek` **text array**, **empty by default** and **not NULL**.',
      solution: KURZUS_TABLE,
      check: behaviour([
        ['id and empty tags are automatic', `INSERT INTO kurzusok (nev) VALUES ('A'); INSERT INTO kurzusok (nev) VALUES ('B'); ${assert(`(SELECT COUNT(DISTINCT kurzus_id) FROM kurzusok) = 2 AND (SELECT bool_and(cimkek = '{}') FROM kurzusok)`)}`],
        ['tags hold a text array', `INSERT INTO kurzusok (nev, cimkek) VALUES ('C', ARRAY['x', 'y']); ${assert(`(SELECT cimkek[2] FROM kurzusok WHERE nev = 'C') = 'y'`)}`],
        ['nev NULL is rejected', `INSERT INTO kurzusok (nev) VALUES (NULL)`],
        ['cimkek NULL is rejected', `INSERT INTO kurzusok (nev, cimkek) VALUES ('D', NULL)`],
      ]),
    },
    {
      id: 'zh-3b', type: 'pg', points: 3, title: '3b) PostgreSQL – insert',
      prompt: '(The empty `kurzusok` table exists.) Insert two courses: **"SQL alapok"** with tags *sql, adatbazis*; **"PostgreSQL"** with tags *sql, postgresql, json*. Don\'t give `kurzus_id`.',
      setup: KURZUS_TABLE,
      solution: `INSERT INTO kurzusok (nev, cimkek) VALUES ('SQL alapok', ARRAY['sql','adatbazis']), ('PostgreSQL', ARRAY['sql','postgresql','json']);`,
      check: `SELECT kurzus_id, nev, cimkek FROM kurzusok ORDER BY kurzus_id`,
    },
    {
      id: 'zh-3c', type: 'pg', points: 3, title: '3c) PostgreSQL – query arrays',
      prompt: 'List the **names** of courses that have the **sql** tag, and the **number of their tags** (as `cimkek_szama`), ordered by **name ascending**.',
      setup: KURZUS_2,
      solution: `SELECT nev, cardinality(cimkek) AS cimkek_szama FROM kurzusok WHERE 'sql' = ANY(cimkek) ORDER BY nev;`,
    },
    {
      id: 'zh-3d', type: 'pg', points: 2, title: '3d) PostgreSQL – update array',
      prompt: 'Update the **"SQL alapok"** course so that the tag **gyakorlat** is added to the **end** of its `cimkek` array.',
      setup: KURZUS_2,
      solution: `UPDATE kurzusok SET cimkek = array_append(cimkek, 'gyakorlat') WHERE nev = 'SQL alapok';`,
      check: `SELECT nev, cimkek FROM kurzusok ORDER BY kurzus_id`,
    },
    {
      id: 'zh-4a', type: 'redis', points: 2, title: '4a) Redis – hash',
      prompt: 'Store under the key `diak:101` a **hash**: **nev = Anna**, **pont = 40**.',
      solution: 'HSET diak:101 nev Anna pont 40',
      check: 'HGETALL diak:101',
    },
    {
      id: 'zh-4b', type: 'redis', points: 2, title: '4b) Redis – increment',
      prompt: '(`diak:101` exists.) Increase its **pont** field by **5** without reading its value first.',
      setup: 'HSET diak:101 nev Anna pont 40',
      solution: 'HINCRBY diak:101 pont 5',
      check: 'HGETALL diak:101',
      require: [['HINCRBY', 'Use HINCRBY.']],
    },
    {
      id: 'zh-4c', type: 'redis', points: 1, title: '4c) Redis – read the hash',
      prompt: 'Query **all fields and values** of the `diak:101` hash.',
      setup: 'HSET diak:101 nev Anna pont 45',
      solution: 'HGETALL diak:101',
    },
    {
      id: 'zh-4d', type: 'redis', points: 2, title: '4d) Redis – sorted set',
      prompt: 'Add to the sorted set `ranglista`: **Anna (50)**, **Bela (40)**, **Csilla (70)**.',
      solution: 'ZADD ranglista 50 Anna 40 Bela 70 Csilla',
      check: 'ZRANGE ranglista 0 -1 WITHSCORES',
    },
    {
      id: 'zh-4e', type: 'redis', points: 1, title: '4e) Redis – top 2',
      prompt: 'List the **two highest-scoring** members of `ranglista` **with their scores**.',
      setup: 'ZADD ranglista 50 Anna 40 Bela 70 Csilla',
      solution: 'ZREVRANGE ranglista 0 1 WITHSCORES',
    },
    {
      id: 'zh-4f', type: 'redis', points: 2, title: '4f) Redis – sets',
      prompt: 'Create the sets **sql = {Anna, Csilla}** and **python = {Anna, Bela}**, then query their **common elements**.',
      solution: 'SADD sql Anna Csilla\nSADD python Anna Bela\nSINTER sql python',
      check: 'SMEMBERS sql\nSMEMBERS python',
      alsoResult: true,
    },
    {
      id: 'zh-5a', type: 'mongo', points: 3, title: '5a) MongoDB – insert', ...B,
      prompt: 'Insert into `termekek`: **nev = "Adatbázisok könyv"**, **kategoria = "konyv"**, **ar = 8500**, **raktaron = true**, **cimkek = ["tanulas", "sql"]**.',
      solution: 'db.termekek.insertOne({ nev: "Adatbázisok könyv", kategoria: "konyv", ar: 8500, raktaron: true, cimkek: ["tanulas", "sql"] })',
      check: 'db.termekek.find({}, { _id: 0 })',
    },
    {
      id: 'zh-5b', type: 'mongo', points: 3, title: '5b) MongoDB – query', ...B,
      prompt: 'List the products that are **in stock** and cost **at least 10 000**. Show only the **nev** and **ar** fields, **not** the `_id`.',
      solution: 'db.termekek.find({ raktaron: true, ar: { $gte: 10000 } }, { nev: 1, ar: 1, _id: 0 })',
    },
    {
      id: 'zh-5c', type: 'mongo', points: 3, title: '5c) MongoDB – update', ...B,
      prompt: 'Set the **akcios** field to **true** on the products of the **konyv** category (also if the field did not exist before).',
      solution: 'db.termekek.updateMany({ kategoria: "konyv" }, { $set: { akcios: true } })',
      check: 'db.termekek.find({}, { _id: 0, nev: 1, akcios: 1 })',
    },
    {
      id: 'zh-5d', type: 'mongo', points: 5, title: '5d) MongoDB – aggregation', ...B,
      prompt: 'With an **aggregation pipeline**, group the **in-stock** products **by category**, and return the **number of products** and the **average price**. Order by the **average price descending**.',
      solution: 'db.termekek.aggregate([\n  { $match: { raktaron: true } },\n  { $group: { _id: "$kategoria", db: { $sum: 1 }, atlagar: { $avg: "$ar" } } },\n  { $sort: { atlagar: -1 } }\n])',
      lenientNames: true,
    },
    {
      id: 'zh-6', type: 'card', points: 6, title: '6) Oracle architecture',
      prompt: 'What is the difference between an Oracle **database** and an **instance**? What do **SGA** and **PGA** stand for, and what are these memory areas used for?',
      answerText: '**Database** = physical files (data files, control files, online redo log files). **Instance** = memory (SGA + PGAs) + background processes (DBWn, LGWR, CKPT, SMON, PMON…) that open and serve the database. **SGA** = System Global Area: shared memory: database buffer cache, shared pool (library cache with parsed SQL and plans, dictionary cache), redo log buffer. **PGA** = Program Global Area: private memory of one server process: sort/hash areas, session and cursor data.',
    },
    {
      id: 'zh-7', type: 'card', points: 6, title: '7) SQL execution & optimisation',
      prompt: 'Briefly define **cardinality** and **cost** in an execution plan. What is the difference between **TABLE ACCESS FULL** and **INDEX RANGE SCAN**?',
      answerText: '**Cardinality** = estimated number of rows a step returns. **Cost** = the optimizer\'s relative estimate of resources (I/O, CPU); the CBO picks the plan with the lowest cost. **TABLE ACCESS FULL** reads all blocks of the table (multiblock reads), good when many rows are needed or no usable index exists. **INDEX RANGE SCAN** reads a contiguous range of a sorted index (e.g. `<`, `>`, BETWEEN, non-unique `=`, `LIKE \'A%\'`) and returns ROWIDs, usually followed by TABLE ACCESS BY INDEX ROWID. Good for selective predicates.',
    },
    {
      id: 'zh-8', type: 'card', points: 6, title: '8) NoSQL basics',
      prompt: 'Name and briefly explain the **3V** of Big Data. What do the **C, A, P** letters of the CAP theorem mean?',
      answerText: '**Volume** (huge data amount), **Velocity** (high speed of generation/processing), **Variety** (structured, semi- and unstructured formats). **C**onsistency: every read sees the latest write. **A**vailability: every request gets a non-error answer. **P**artition tolerance: works despite network partitions. Only two can be fully guaranteed at once; in practice CP or AP.',
    },
    {
      id: 'zh-9', type: 'card', points: 3, title: '9) Array or junction table?',
      prompt: 'When can a PostgreSQL **array field** be a good choice, and when is a separate **junction table** recommended? Give a short example or reasoning for each.',
      answerText: 'Array: few simple values belonging to the row, read together, no FK needed, e.g. course tags `text[]`. Junction table: the elements are entities or need referential integrity, are queried/joined/updated individually, have their own attributes, or the list can be large, e.g. student–course enrolment with a grade.',
    },
    {
      id: 'zh-10', type: 'card', points: 4, title: '10) Redis data types',
      prompt: 'Which Redis data structure would you choose for: (1) an ordered task list, (2) a duplicate-free tag set, (3) a leaderboard by score, (4) a student\'s multi-field profile?',
      answerText: '(1) List, (2) Set, (3) Sorted set, (4) Hash.',
    },
    {
      id: 'zh-11', type: 'card', points: 5, title: '11) MongoDB principles',
      prompt: 'What is the role of the **_id** field? What does **BSON** mean? What is the difference between a **replica set** and **sharding**?',
      answerText: '**_id**: mandatory unique key of a document within the collection, automatically indexed, ObjectId generated if missing. **BSON**: Binary JSON, MongoDB\'s binary storage format with extra types (Date, ObjectId, …). **Replica set**: copies of the same data on several nodes (primary + secondaries), giving high availability and failover. **Sharding**: the data is partitioned across nodes by a shard key, giving horizontal scaling.',
    },
  ],
};
