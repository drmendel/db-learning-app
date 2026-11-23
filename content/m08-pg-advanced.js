import { behaviour } from './util.js';

const KURZUS_TABLE = `CREATE TABLE kurzusok (kurzus_id serial PRIMARY KEY, nev text NOT NULL, cimkek text[] NOT NULL DEFAULT '{}');`;
const KURZUS_DATA = KURZUS_TABLE + `
INSERT INTO kurzusok (nev, cimkek) VALUES
 ('SQL alapok', ARRAY['sql', 'adatbazis']),
 ('PostgreSQL', ARRAY['sql', 'postgresql', 'json']),
 ('Python alapok', ARRAY['python', 'programozas']),
 ('JSON gyakorlat', ARRAY['json', 'api', 'postgresql']);`;
const assert = (cond) => `PERFORM 1 / (CASE WHEN (${cond}) THEN 1 ELSE 0 END)`;

export default {
  id: 'pgadvanced',
  title: 'PostgreSQL arrays, types, JSONB',
  lab: 'Labs 5–6',
  engine: 'pg',
  lesson: '08-pg-advanced.md',
  exercises: [
    {
      id: 'pga-1', type: 'pg', title: 'Arrays – lucky numbers',
      prompt: `On a **copy** of the employees (\`emp_copy\`, already created):\n\n1. Add a column \`szerencseszamok\` that stores **several integers** (an integer array).\n2. Set **everybody's** lucky numbers to **13 and 42**.\n3. For everybody whose **department_id is greater than 80**, the lucky numbers should be **42** and **department_id − 100**.`,
      hints: ['`ALTER TABLE emp_copy ADD COLUMN szerencseszamok integer[];`', '`UPDATE emp_copy SET szerencseszamok = ARRAY[13, 42];`', '`UPDATE emp_copy SET szerencseszamok = ARRAY[42, department_id - 100] WHERE department_id > 80;`'],
      setup: `CREATE TABLE emp_copy AS SELECT * FROM employees;`,
      solution: `ALTER TABLE emp_copy ADD COLUMN szerencseszamok integer[];
UPDATE emp_copy SET szerencseszamok = ARRAY[13, 42];
UPDATE emp_copy SET szerencseszamok = ARRAY[42, department_id - 100] WHERE department_id > 80;`,
      check: `SELECT employee_id, szerencseszamok FROM emp_copy ORDER BY employee_id`,
    },
    {
      id: 'pga-2', type: 'pg', title: 'ZH 3a – kurzusok table',
      prompt: `Create a table \`kurzusok\`:\n\n- \`kurzus_id\`: **automatically increasing** primary key\n- \`nev\`: **required** text\n- \`cimkek\`: **text array** that is **empty by default** and **cannot be NULL**\n\n*(ZH task 3a – 5 points.)*`,
      hints: ['`kurzus_id serial PRIMARY KEY`', `\`cimkek text[] NOT NULL DEFAULT '{}'\` (or \`DEFAULT ARRAY[]::text[]\`)`],
      solution: KURZUS_TABLE,
      check: behaviour([
        ['id and empty tags are automatic', `INSERT INTO kurzusok (nev) VALUES ('A'); INSERT INTO kurzusok (nev) VALUES ('B'); ${assert(`(SELECT COUNT(DISTINCT kurzus_id) FROM kurzusok) = 2 AND (SELECT bool_and(cimkek = '{}') FROM kurzusok)`)}`],
        ['tags hold a text array', `INSERT INTO kurzusok (nev, cimkek) VALUES ('C', ARRAY['x', 'y']); ${assert(`(SELECT cimkek[2] FROM kurzusok WHERE nev = 'C') = 'y'`)}`],
        ['nev NULL is rejected', `INSERT INTO kurzusok (nev) VALUES (NULL)`],
        ['cimkek NULL is rejected', `INSERT INTO kurzusok (nev, cimkek) VALUES ('D', NULL)`],
        ['duplicate id is rejected', `INSERT INTO kurzusok (kurzus_id, nev) VALUES (500, 'E'), (500, 'F')`],
      ]),
    },
    {
      id: 'pga-3', type: 'pg', title: 'ZH 3b – insert courses',
      prompt: `The empty \`kurzusok\` table exists. Insert two courses **without giving kurzus_id**:\n\n- **SQL alapok** with tags *sql, adatbazis*\n- **PostgreSQL** with tags *sql, postgresql, json*`,
      hints: [`\`INSERT INTO kurzusok (nev, cimkek) VALUES ('SQL alapok', ARRAY['sql','adatbazis']), (...);\``, `Literal form also works: \`'{sql,adatbazis}'\``],
      setup: KURZUS_TABLE,
      solution: `INSERT INTO kurzusok (nev, cimkek) VALUES
 ('SQL alapok', ARRAY['sql', 'adatbazis']),
 ('PostgreSQL', ARRAY['sql', 'postgresql', 'json']);`,
      check: `SELECT nev, cimkek FROM kurzusok ORDER BY nev`,
    },
    {
      id: 'pga-4', type: 'pg', title: 'ZH 3c – filter on an array',
      prompt: `The table now has 4 courses (SQL alapok, PostgreSQL, Python alapok, JSON gyakorlat). List the **name** of the courses that have the **sql** tag, together with the **number of their tags** (column name \`cimkek_szama\`), ordered by **name ascending**.`,
      hints: [`\`WHERE 'sql' = ANY(cimkek)\` (or \`cimkek @> ARRAY['sql']\`)`, '`cardinality(cimkek) AS cimkek_szama`'],
      setup: KURZUS_DATA,
      solution: `SELECT nev, cardinality(cimkek) AS cimkek_szama
FROM kurzusok
WHERE 'sql' = ANY(cimkek)
ORDER BY nev;`,
    },
    {
      id: 'pga-5', type: 'pg', title: 'ZH 3d – append to an array',
      prompt: `Update the course **SQL alapok** so that the tag **gyakorlat** is appended to the **end** of its \`cimkek\` array.`,
      hints: [`\`SET cimkek = array_append(cimkek, 'gyakorlat')\` or \`cimkek || 'gyakorlat'\``],
      setup: KURZUS_DATA,
      solution: `UPDATE kurzusok SET cimkek = array_append(cimkek, 'gyakorlat') WHERE nev = 'SQL alapok';`,
      check: `SELECT nev, cimkek FROM kurzusok ORDER BY kurzus_id`,
    },
    {
      id: 'pga-6', type: 'pg', title: 'Containment @>',
      prompt: `List the names of the courses that have **both** the *postgresql* **and** the *json* tags.`,
      hints: [`\`cimkek @> ARRAY['postgresql', 'json']\``],
      setup: KURZUS_DATA,
      solution: `SELECT nev FROM kurzusok WHERE cimkek @> ARRAY['postgresql', 'json'];`,
    },
    {
      id: 'pga-7', type: 'pg', title: 'Overlap &&',
      prompt: `List the names of the courses that have **at least one** of the tags *python* or *api*.`,
      hints: [`\`cimkek && ARRAY['python', 'api']\``],
      setup: KURZUS_DATA,
      solution: `SELECT nev FROM kurzusok WHERE cimkek && ARRAY['python', 'api'];`,
    },
    {
      id: 'pga-8', type: 'pg', title: 'UNNEST – tag statistics',
      prompt: `How many courses use each tag? Show the **tag** and the **number of courses**, ordered by the **count descending**, then by **tag**.`,
      hints: ['`SELECT unnest(cimkek) AS cimke FROM kurzusok` gives one row per tag.', 'Use it as an inline view and GROUP BY it.'],
      setup: KURZUS_DATA,
      solution: `SELECT cimke, COUNT(*) AS db
FROM (SELECT unnest(cimkek) AS cimke FROM kurzusok) t
GROUP BY cimke
ORDER BY db DESC, cimke;`,
    },
    {
      id: 'pga-9', type: 'pg', title: 'ARRAY_AGG',
      prompt: `For departments **10, 20 and 30**, show the **department id** and an **array of the last names** of its employees in **alphabetical order**.`,
      hints: ['`array_agg(last_name ORDER BY last_name)`'],
      solution: `SELECT department_id, array_agg(last_name ORDER BY last_name) AS nevek
FROM employees
WHERE department_id IN (10, 20, 30)
GROUP BY department_id;`,
    },
    {
      id: 'pga-10', type: 'pg', title: 'array_replace / array_remove',
      prompt: `In every course: replace the tag **json** with **jsonb**, and remove the tag **programozas**.`,
      hints: [`\`SET cimkek = array_remove(array_replace(cimkek, 'json', 'jsonb'), 'programozas')\``],
      setup: KURZUS_DATA,
      solution: `UPDATE kurzusok SET cimkek = array_remove(array_replace(cimkek, 'json', 'jsonb'), 'programozas');`,
      check: `SELECT nev, cimkek FROM kurzusok ORDER BY kurzus_id`,
    },
    {
      id: 'pga-11', type: 'pg', title: 'ENUM, DOMAIN, composite type',
      prompt: `Create:\n\n- an ENUM type \`hallgato_statusz\` with values **aktiv, passziv, vegzett**\n- a DOMAIN \`kredit_ertek\` on integer that only allows **0–300**\n- a composite type \`cim_tipus\` with text fields **varos, utca, hazszam**\n- a table \`hallgato\`: \`id\` serial PK, \`nev\` text NOT NULL, \`statusz\` hallgato_statusz NOT NULL default **'aktiv'**, \`kredit\` kredit_ertek NOT NULL, \`cim\` cim_tipus, \`profil\` jsonb NOT NULL default **'{}'**`,
      hints: [`\`CREATE TYPE hallgato_statusz AS ENUM ('aktiv', 'passziv', 'vegzett');\``, '`CREATE DOMAIN kredit_ertek AS integer CHECK (VALUE BETWEEN 0 AND 300);`', '`CREATE TYPE cim_tipus AS (varos text, utca text, hazszam text);`'],
      solution: `CREATE TYPE hallgato_statusz AS ENUM ('aktiv', 'passziv', 'vegzett');
CREATE DOMAIN kredit_ertek AS integer CHECK (VALUE BETWEEN 0 AND 300);
CREATE TYPE cim_tipus AS (varos text, utca text, hazszam text);
CREATE TABLE hallgato (
  id serial PRIMARY KEY,
  nev text NOT NULL,
  statusz hallgato_statusz NOT NULL DEFAULT 'aktiv',
  kredit kredit_ertek NOT NULL,
  cim cim_tipus,
  profil jsonb NOT NULL DEFAULT '{}'::jsonb
);`,
      check: behaviour([
        ['valid student with defaults', `INSERT INTO hallgato (nev, kredit, cim) VALUES ('Anna', 120, ROW('Budapest', 'Fő utca', '12')); ${assert(`(SELECT statusz::text = 'aktiv' AND profil = '{}'::jsonb AND (cim).varos = 'Budapest' FROM hallgato WHERE nev = 'Anna')`)}`],
        ["status 'vegzett' is accepted", `INSERT INTO hallgato (nev, kredit, statusz) VALUES ('Béla', 10, 'vegzett')`],
        ["status 'kirugva' is rejected", `INSERT INTO hallgato (nev, kredit, statusz) VALUES ('Béla', 10, 'kirugva')`],
        ['kredit 301 is rejected', `INSERT INTO hallgato (nev, kredit) VALUES ('Cili', 301)`],
        ['kredit -1 is rejected', `INSERT INTO hallgato (nev, kredit) VALUES ('Cili', -1)`],
        ['missing kredit is rejected', `INSERT INTO hallgato (nev) VALUES ('Dani')`],
      ]),
    },
    {
      id: 'pga-12', type: 'pg', title: 'Querying a composite field',
      prompt: `Using the lab 6 table \`employee_trainings\`: list the **course name**, the **instructor** and the **city (location)** from the composite \`details\` column, for trainings longer than **10 hours**.`,
      hints: ['`(details).instructor`, `(details).location`, `(details).hours` – mind the parentheses!'],
      solution: `SELECT course_name, (details).instructor, (details).location
FROM employee_trainings
WHERE (details).hours > 10;`,
    },
    {
      id: 'pga-13', type: 'pg', title: 'Gyakorló 1 – arrays (2 p)',
      prompt: `List the **full name**, the **job title** and the **course name** of employees who gained the **postgresql** skill on some training. Search in the \`skills\` array.`,
      hints: [`\`'postgresql' = ANY(t.skills)\``, 'employee_trainings → employees → jobs'],
      solution: `SELECT e.first_name || ' ' || e.last_name AS nev, j.job_title, t.course_name
FROM employee_trainings t
  JOIN employees e ON e.employee_id = t.employee_id
  JOIN jobs j ON j.job_id = e.job_id
WHERE 'postgresql' = ANY(t.skills);`,
    },
    {
      id: 'pga-14', type: 'pg', title: 'Gyakorló 2 – custom & composite types (2 p)',
      prompt: `List the **completed** trainings with a score of **at least 90** of employees working in the **IT department** (department name 'IT'). Show the **employee's full name**, the **course name**, the **score** and the **instructor's name** (from the \`details\` composite column).`,
      hints: [`\`t.status = 'completed'\` – the ENUM value is compared like text.`, '`(t.details).instructor`', `Join departments and filter \`department_name = 'IT'\`.`],
      solution: `SELECT e.first_name || ' ' || e.last_name AS nev, t.course_name, t.score, (t.details).instructor
FROM employee_trainings t
  JOIN employees e ON e.employee_id = t.employee_id
  JOIN departments d ON d.department_id = e.department_id
WHERE d.department_name = 'IT' AND t.status = 'completed' AND t.score >= 90;`,
    },
    {
      id: 'pga-15', type: 'pg', title: 'Gyakorló 3 – inheritance (2 p)',
      prompt: `In **one query with two columns**, show how many trainings appear through \`employee_trainings\` **including the inherited (child) rows**, and how many are **only in the parent table**.`,
      hints: ['Two scalar subqueries: `(SELECT COUNT(*) FROM employee_trainings)` and `(SELECT COUNT(*) FROM ONLY employee_trainings)`'],
      solution: `SELECT (SELECT COUNT(*) FROM employee_trainings) AS osszes,
       (SELECT COUNT(*) FROM ONLY employee_trainings) AS csak_szulo;`,
      require: [['\\bONLY\\b', 'Use the ONLY keyword to exclude the child table rows.']],
    },
    {
      id: 'pga-16', type: 'pg', title: 'Gyakorló 4 – JSONB (2 p)',
      prompt: `List the **online** trainings that received a rating of **at least 4 stars**. Show the **employee's full name**, the **course name** and the **rating**. (The \`feedback\` JSONB column has the keys \`mode\` and \`rating\`.)`,
      hints: [`\`t.feedback->>'mode' = 'online'\``, `\`(t.feedback->>'rating')::int >= 4\` – ->> returns text, cast it before comparing numbers.`],
      solution: `SELECT e.first_name || ' ' || e.last_name AS nev, t.course_name, (t.feedback->>'rating')::int AS ertekeles
FROM employee_trainings t JOIN employees e ON e.employee_id = t.employee_id
WHERE t.feedback->>'mode' = 'online' AND (t.feedback->>'rating')::int >= 4;`,
    },
    {
      id: 'pga-17', type: 'pg', title: 'JSONB – containment and key existence',
      prompt: `List the **course name** and the **comment** text of trainings whose feedback **has a \`comment\` key** and **contains** \`{"mode": "online"}\`.`,
      hints: [`\`feedback ? 'comment'\``, `\`feedback @> '{"mode":"online"}'\``, `\`feedback->>'comment'\``],
      solution: `SELECT course_name, feedback->>'comment' AS megjegyzes
FROM employee_trainings
WHERE feedback ? 'comment' AND feedback @> '{"mode":"online"}';`,
    },
    {
      id: 'pga-18', type: 'pg', title: 'Gyakorló plusz – jsonb_set',
      prompt: `Bruce Ernst afterwards rated his **Linux alapok** training **5 stars**. Write an UPDATE that changes the \`rating\` inside the \`feedback\` JSONB column, **keeping the other keys**.`,
      hints: [`\`SET feedback = jsonb_set(feedback, '{rating}', '5')\``, `Identify the row: course_name = 'Linux alapok' and the employee named Bruce Ernst (employee_id 104) – e.g. with a subquery on employees.`],
      solution: `UPDATE employee_trainings
SET feedback = jsonb_set(feedback, '{rating}', '5', true)
WHERE course_name = 'Linux alapok'
  AND employee_id = (SELECT employee_id FROM employees WHERE first_name = 'Bruce' AND last_name = 'Ernst');`,
      check: `SELECT training_id, feedback FROM employee_trainings ORDER BY training_id`,
      require: [['jsonb_set', 'Use jsonb_set so the other keys are kept.']],
    },
    {
      id: 'pga-c1', type: 'card', title: 'Array or junction table? (ZH 9)',
      prompt: 'When is a PostgreSQL **array column** a good choice, and when should you use a separate **junction (kapcsoló) table**? Give an example of each.',
      answerText: '**Array:** a small, simple list of scalar values that belongs to the row and is read with it, with no referential integrity needed, e.g. tags of a course (`cimkek text[]`), lucky numbers, phone numbers. **Junction table:** when the elements are entities in their own right (students ↔ courses), need foreign keys/constraints, are queried, joined, updated or counted independently, carry extra attributes (e.g. grade, enrolment date), or the list may grow large. This is the normalised (1NF) relational design.',
    },
  ],
};
