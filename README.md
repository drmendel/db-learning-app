# Adatbázis gyakorló – learn the course by doing it

A local, offline practice app for **Adatbázis- és Big Data technológiák** (labs 1–10 + the sample ZH).
Every topic has a short lesson and hands-on tasks that are **graded automatically on your machine**, with no AI or internet needed.

## Start

```bash
cd ~/uni/adatb/db-learning-app
./start.sh            # or:  npm install && npm start
```

Then open **http://localhost:8765**. Stop with `Ctrl+C`. Your progress is saved in `progress.json`.

Requirements: Node.js ≥ 20 (you have v24). No Docker, no database servers; everything is embedded (~30 MB).

## What's inside (15 modules, 273 items)

| # | Module | From |
|---|---|---|
| 0 | Start here: how grading works, the HR schema | – |
| 1 | SELECT, WHERE, ORDER BY, NVL, LIKE, dates, CASE (Gyakorlat 1–5) | Lab 1 |
| 2 | Joins: WHERE-join, self-join, LEFT/RIGHT/FULL, A\B, NATURAL (Gyak. 6–16) | Lab 1 |
| 3 | GROUP BY & HAVING (Gyak. 25–29) | Labs 1–3 |
| 4 | Subqueries, inline views, WITH, EXISTS (Gyak. 30–33) | Lab 3 |
| 5 | DDL, constraints, sequences, INSERT/UPDATE/DELETE, views, indexes (Gyak. 17–24) | Labs 1–2 |
| 6 | Execution plans, access paths, join methods, hints, function-based index | Labs 3–4 |
| 7 | PostgreSQL basics: serial/FK, LIMIT/OFFSET, ILIKE, COALESCE, INTERVAL, UPDATE…FROM | Lab 5 |
| 8 | PostgreSQL arrays, ENUM, DOMAIN, composite types, inheritance, JSONB (+ end-of-class practice) | Labs 5–6 |
| 9 | Redis: strings, TTL, counters, lists, sets, sorted sets, hashes, MULTI, cache-aside | Lab 7 |
| 10 | MongoDB CRUD: all 23 lab tasks + more | Lab 8 |
| 11 | MongoDB aggregation pipeline, $lookup, indexes, explain | Lab 9 |
| 12 | Integration: the three Python TODOs of the course-search app | Lab 10 |
| 13 | Theory drill: quizzes + flashcards for ZH part II | Lectures |
| 14 | **Mock ZH**: 100-minute timed replica of `lab-11/MZH.pdf` with points and a grade | ZH |

## How tasks are graded

- **SQL** runs on real **PostgreSQL 19** (PGlite/WebAssembly) with the course's `HR_pgsql.sql` data. Your query and
  the reference solution run in identical rolled-back transactions and their results are compared. Column names and
  column order don't matter, and rows that tie in `ORDER BY` may come in any order. DDL tasks are graded by
  **behaviour**: the checker inserts good and bad rows to test your constraints.
- **Oracle syntax** from labs 1–4 is accepted where possible: `NVL`, `NVL2`, `MONTHS_BETWEEN`, `ADD_MONTHS`, `DUAL`,
  `SYSDATE`, `VARCHAR2`, `NUMBER`, `seq.NEXTVAL`, `MINUS`, `RENAME`, `ALTER TABLE … ADD (…)/MODIFY`, `DESC table`,
  `EXPLAIN PLAN FOR` + `DBMS_XPLAN.DISPLAY`, `user_tables`, `user_constraints`. A note shows you the PostgreSQL way each time.
- **Redis** commands run on a built-in emulator of the commands used in lab 7.
- **MongoDB** code uses mongosh syntax on the *mingo* engine (find, projections, update operators incl. `$[]`/`$`,
  upsert, aggregation incl. `$lookup`/`$unwind`, unique and TTL indexes, simplified `explain`).
- **Python (lab 10)** and the Oracle plan statements are checked for their key elements, since they can't run offline.
- **Theory** flashcards are self-assessed against a model answer.

Run the self-test (every reference solution plus 49 typical wrong or alternative answers): `npm test`.

## Limitations

- Oracle itself is not running: Oracle-only features (real CBO plans, hints, histograms, PL/SQL) are covered by
  lessons, quizzes and the PostgreSQL equivalents. For real Oracle practice use the lab VM.
- The Redis/Mongo emulators cover the course's commands, not 100% of the products (e.g. no `$text` search, no pub/sub delivery).
- To run lab 10 for real you need Docker and about 1.5 GB of free disk space. The commands are in the Integration lesson.

## Adding your own exercises

Exercises live in `content/m*.js`, lessons in `content/lessons/*.md`. An SQL exercise is just:

```js
{ id: 'my-1', type: 'pg', title: '…', prompt: '…markdown…', hints: ['…'],
  solution: 'SELECT …',          // reference solution
  setup: 'CREATE TABLE …',       // optional: runs before the student's code
  check: 'SELECT … FROM …' }     // optional: compare this state instead of the result
```

Run `npm test` afterwards to make sure the reference solution passes.
