# db-learning-app – learn databases by doing

A self-contained practice app for **Adatbázis- és Big Data technológiák** (labs 1–10 + the sample ZH).
Every topic has a short lesson and hands-on tasks that are **graded automatically**, with no AI and no external services.
Available in **English** and **Hungarian** (switch with the EN/HU selector in the top bar).

## Run it with Docker (any machine)

```bash
git clone git@github.com:drmendel/db-learning-app.git
cd db-learning-app
docker compose up -d --build
```

Open **http://localhost:8765**. Use another port with `PORT=9000 docker compose up -d`.
Stop it with `docker compose down`.

The whole stack is **one container**: Node.js serves the UI and runs real PostgreSQL (PGlite/WebAssembly) plus the
Redis and MongoDB emulators in-process. You don't need separate database containers or volumes.

## Run it without Docker

```bash
./start.sh            # or:  npm install && npm start
```

Requires Node.js ≥ 20. The server listens on `127.0.0.1:8765` by default. Set `HOST=0.0.0.0` to expose it on your network.

## Architecture

```text
browser (public/: vanilla JS, i18n.js, progress in localStorage)
   │  JSON API: /api/modules  /api/run  /api/check  /api/reveal  /api/schema  /api/health
   ▼
server.js (Node, stateless)
   ├─ engines/pg.js      PostgreSQL via PGlite + HR schema + Oracle→PG translation
   ├─ engines/redis.js   Redis command emulator
   ├─ engines/mongo.js   mongosh emulator on top of mingo
   ├─ engines/grade.js   runs reference vs. your code in fresh sandboxes and compares
   └─ content/           exercises (m*.js), lessons (lessons/*.md), translations (i18n/hu, lessons/hu)
```

- **Stateless server**: learning progress, drafts and exam results live in each visitor's **browser** (localStorage).
  One instance can serve a whole study group.
- **Isolation**: every check runs in a throw-away sandbox. Playgrounds are per visitor (Redis/MongoDB) or rolled back
  after each run (SQL).

## Hosting for others: security

Visitors execute code on the server: SQL inside PGlite, and JavaScript for the mongosh emulator, which runs in Node's
`vm` module. **`vm` is not a security sandbox.** The compose file therefore locks the container down:
non-root user, read-only filesystem, all capabilities dropped, `no-new-privileges`, and memory and PID limits.
That limits what a malicious visitor can do, but it doesn't make it safe on the open internet. Host it for people you
trust, or put it behind authentication (e.g. a reverse proxy with basic auth or a VPN).

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

- **SQL** runs on real **PostgreSQL 19** (PGlite) with the course's `HR_pgsql.sql` data. Your query and the reference
  solution run in identical rolled-back transactions and their results are compared. Column names and column order
  don't matter, and rows that tie in `ORDER BY` may come in any order. DDL tasks are graded by **behaviour**: the
  checker inserts good and bad rows to test your constraints.
- **Oracle syntax** from labs 1–4 is accepted where possible: `NVL`, `NVL2`, `MONTHS_BETWEEN`, `ADD_MONTHS`, `DUAL`,
  `SYSDATE`, `VARCHAR2`, `NUMBER`, `seq.NEXTVAL`, `MINUS`, `RENAME`, `ALTER TABLE … ADD (…)/MODIFY`, `DESC table`,
  `EXPLAIN PLAN FOR` + `DBMS_XPLAN.DISPLAY`, `user_tables`, `user_constraints`. A note shows you the PostgreSQL way each time.
- **Redis** commands run on a built-in emulator of the commands used in lab 7.
- **MongoDB** code uses mongosh syntax on the *mingo* engine (find, projections, update operators incl. `$[]`/`$`,
  upsert, aggregation incl. `$lookup`/`$unwind`, unique and TTL indexes, simplified `explain`).
- **Python (lab 10)** and the Oracle plan statements are checked for their key elements, since they can't run here.
- **Theory** flashcards are self-assessed against a model answer.

Run the self-test with `npm test`. It grades every reference solution, 49 typical wrong or alternative answers,
and the translation coverage of every exercise and lesson.

## Translations

- UI strings: `public/i18n.js` (one object per language).
- Grader feedback and Oracle-translation notes: `engines/messages.js`.
- Exercise texts: `content/i18n/<lang>/<moduleId>.js`, which overrides title, prompt, hints, options, explain,
  answerText and the require/forbid messages. Missing texts fall back to English.
- Lessons: `content/lessons/<lang>/<file>.md`.

To add a language, add it to `LANGUAGES` in `content/index.js`, to `public/i18n.js` and to `engines/messages.js`, then
create the overlay files. `npm test` lists everything that is still missing.

## Limitations

- Oracle itself is not running: Oracle-only features (real CBO plans, hints, histograms, PL/SQL) are covered by
  lessons, quizzes and the PostgreSQL equivalents. For real Oracle practice use the lab VM.
- The Redis/Mongo emulators cover the course's commands, not 100% of the products (e.g. no `$text` search, no pub/sub delivery).

## Adding your own exercises

Exercises live in `content/m*.js`, lessons in `content/lessons/*.md`. An SQL exercise is just:

```js
{ id: 'my-1', type: 'pg', title: '…', prompt: '…markdown…', hints: ['…'],
  solution: 'SELECT …',          // reference solution
  setup: 'CREATE TABLE …',       // optional: runs before the student's code
  check: 'SELECT … FROM …' }     // optional: compare this state instead of the result
```

Add its Hungarian texts to `content/i18n/hu/<module>.js`, then run `npm test`.
