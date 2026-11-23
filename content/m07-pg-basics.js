import { behaviour, columnsOf } from './util.js';

const TABLES = `CREATE TABLE person (id serial PRIMARY KEY, name varchar(50), birthdate date);
CREATE TABLE likes (id_1 integer REFERENCES person(id), id_2 integer REFERENCES person(id));`;
const DATA = TABLES + `
INSERT INTO person (name, birthdate) VALUES
 ('James', '2001-03-14'), ('Oliver', '2000-11-02'), ('Emma', '2002-06-30'), ('Sophia', '1999-01-21'), ('Liam', '2001-09-09');
INSERT INTO likes VALUES (2, 1), (3, 1), (1, 2), (4, 2), (5, 2), (4, 3), (5, 4);`;

export default {
  id: 'pgbasics',
  title: 'PostgreSQL basics',
  lab: 'Lab 5',
  engine: 'pg',
  lesson: '07-pg-basics.md',
  exercises: [
    {
      id: 'pgb-1', type: 'pg', title: 'person & likes tables',
      prompt: `Create two tables:\n\n- \`person\`: \`id\` (**serial**, primary key), \`name\` (varchar), \`birthdate\` (date)\n- \`likes\` – who likes whom: \`id_1\` and \`id_2\`, **both foreign keys to person**.`,
      hints: ['`id serial PRIMARY KEY`', '`id_1 integer REFERENCES person(id)`'],
      solution: TABLES,
      check: behaviour([
        ['id is generated automatically', `INSERT INTO person (name) VALUES ('A'); INSERT INTO person (name) VALUES ('B'); PERFORM 1 / (CASE WHEN (SELECT COUNT(DISTINCT id) FROM person) = 2 THEN 1 ELSE 0 END)`],
        ['likes between existing people works', `INSERT INTO person (id, name) VALUES (100, 'A'), (101, 'B'); INSERT INTO likes VALUES (100, 101)`],
        ['id_1 must exist', `INSERT INTO person (id, name) VALUES (100, 'A'); INSERT INTO likes VALUES (999, 100)`],
        ['id_2 must exist', `INSERT INTO person (id, name) VALUES (100, 'A'); INSERT INTO likes VALUES (100, 999)`],
        ['person.id is unique', `INSERT INTO person (id, name) VALUES (100, 'A'), (100, 'B')`],
      ]),
    },
    {
      id: 'pgb-2', type: 'pg', title: 'Multi-row INSERT',
      prompt: `The empty tables exist. Insert these people (let \`serial\` generate the ids – they will be 1..5 in this order) and likes:\n\n| name | birthdate |\n|---|---|\n| James | 2001-03-14 |\n| Oliver | 2000-11-02 |\n| Emma | 2002-06-30 |\n| Sophia | 1999-01-21 |\n| Liam | 2001-09-09 |\n\nLikes (id_1 likes id_2): **(2,1), (3,1), (1,2), (4,2), (5,2), (4,3), (5,4)**`,
      hints: [`One INSERT can have many rows: \`INSERT INTO person (name, birthdate) VALUES ('James', '2001-03-14'), ('Oliver', ...), ...;\``],
      setup: TABLES,
      solution: `INSERT INTO person (name, birthdate) VALUES
 ('James', '2001-03-14'), ('Oliver', '2000-11-02'), ('Emma', '2002-06-30'), ('Sophia', '1999-01-21'), ('Liam', '2001-09-09');
INSERT INTO likes VALUES (2, 1), (3, 1), (1, 2), (4, 2), (5, 2), (4, 3), (5, 4);`,
      check: `SELECT p1.name, p2.name FROM likes JOIN person p1 ON p1.id = id_1 JOIN person p2 ON p2.id = id_2 ORDER BY 1, 2`,
    },
    {
      id: 'pgb-3', type: 'pg', title: 'Who likes James?',
      prompt: `List the **names of the people who like James**.`,
      hints: ['Join likes to person on id_1 (the one who likes), and filter on the liked person being James (id_2).', 'You need person twice, or a subquery for James\'s id.'],
      setup: DATA,
      solution: `SELECT p1.name
FROM likes l
  JOIN person p1 ON p1.id = l.id_1
  JOIN person p2 ON p2.id = l.id_2
WHERE p2.name = 'James';`,
    },
    {
      id: 'pgb-4', type: 'pg', title: 'Popularity',
      prompt: `For every person show the **name** and **how many people like them** (0 too). Order by that count **descending**, then by **name**.`,
      hints: ['person LEFT JOIN likes ON person.id = likes.id_2', '`COUNT(l.id_1)` so that nobody-likes-me counts as 0.'],
      setup: DATA,
      solution: `SELECT p.name, COUNT(l.id_1) AS kedvelok
FROM person p LEFT JOIN likes l ON l.id_2 = p.id
GROUP BY p.name
ORDER BY kedvelok DESC, p.name;`,
    },
    {
      id: 'pgb-5', type: 'pg', title: 'LIMIT / OFFSET – paging',
      prompt: `Order the employees by **salary descending**, then **last name ascending**, and show the **3rd, 4th and 5th** ones (last name, salary).`,
      hints: ['`ORDER BY salary DESC, last_name LIMIT 3 OFFSET 2`'],
      solution: `SELECT last_name, salary FROM employees ORDER BY salary DESC, last_name LIMIT 3 OFFSET 2;`,
    },
    {
      id: 'pgb-6', type: 'pg', title: 'ILIKE',
      prompt: `List the **first and last name** of employees whose last name contains **"ar"** in any letter case (e.g. Hartstein, Partners, and also names written with "AR").`,
      hints: [`\`last_name ILIKE '%ar%'\``],
      solution: `SELECT first_name, last_name FROM employees WHERE last_name ILIKE '%ar%';`,
      require: [['ILIKE', 'Use the PostgreSQL ILIKE operator here.']],
    },
    {
      id: 'pgb-7', type: 'pg', title: 'Oracle → PostgreSQL (gyakorló 5)',
      prompt: `Rewrite this Oracle query in **PostgreSQL** (use the \`hr.employees\` table explicitly):\n\n\`\`\`sql\nSELECT employee_id, NVL(commission_pct, 0) AS commission\nFROM employees\nWHERE employee_id = 103;\n\`\`\``,
      hints: ['`COALESCE` instead of `NVL`.'],
      solution: `SELECT employee_id, COALESCE(commission_pct, 0) AS commission FROM hr.employees WHERE employee_id = 103;`,
      require: [['COALESCE', 'Use COALESCE (the standard SQL / PostgreSQL function).'], ['hr\\.employees', 'Use the schema-qualified name hr.employees.']],
      forbid: [['\\bNVL\\s*\\(', 'NVL is Oracle-only – PostgreSQL uses COALESCE. (It only works in this app because of a compatibility helper.)']],
    },
    {
      id: 'pgb-8', type: 'pg', title: 'Interval arithmetic',
      prompt: `For employees of **department 60**, show the **last name**, the **hire date**, and the **end of a 6-month probation period** (hire date + 6 months).`,
      hints: [`\`hire_date + INTERVAL '6 months'\``],
      solution: `SELECT last_name, hire_date, hire_date + INTERVAL '6 months' AS proba_vege FROM employees WHERE department_id = 60;`,
    },
    {
      id: 'pgb-9', type: 'pg', title: 'UPDATE … FROM',
      prompt: `Rename everyone who **likes Oliver** to \`'Oliver kedvelője'\`. Use PostgreSQL's **UPDATE … FROM** syntax.`,
      hints: ['`UPDATE person p SET name = ... FROM likes l, person o WHERE ...`', 'Conditions: l.id_1 = p.id, l.id_2 = o.id, o.name = \'Oliver\''],
      setup: DATA,
      solution: `UPDATE person p
SET name = 'Oliver kedvelője'
FROM likes l, person o
WHERE l.id_1 = p.id AND l.id_2 = o.id AND o.name = 'Oliver';`,
      check: `SELECT id, name FROM person ORDER BY id`,
      require: [['UPDATE[\\s\\S]+FROM', 'Use the UPDATE … FROM form.']],
    },
    {
      id: 'pgb-10', type: 'pg', title: 'ALTER TABLE the PostgreSQL way',
      prompt: `Change the \`person\` table:\n\n1. add a column \`email\` of type \`text\`,\n2. change the type of \`name\` to \`text\`,\n3. make \`birthdate\` **NOT NULL**.`,
      hints: ['`ALTER TABLE person ADD COLUMN email text;`', '`ALTER TABLE person ALTER COLUMN name TYPE text;`', '`ALTER TABLE person ALTER COLUMN birthdate SET NOT NULL;`'],
      setup: DATA,
      solution: `ALTER TABLE person ADD COLUMN email text;
ALTER TABLE person ALTER COLUMN name TYPE text;
ALTER TABLE person ALTER COLUMN birthdate SET NOT NULL;`,
      check: `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'person' ORDER BY ordinal_position`,
    },
    {
      id: 'pgb-11', type: 'pg', title: 'Gyakorlat 32 in PostgreSQL',
      prompt: `(Lab 5 repeats lab 3's task in PostgreSQL.) List the **last name, salary** and **department name** of employees who earn more than their department's average, ordered by **salary descending**. Try it with a **correlated subquery** this time.`,
      hints: ['`WHERE e.salary > (SELECT AVG(salary) FROM employees x WHERE x.department_id = e.department_id)`'],
      solution: `SELECT e.last_name, e.salary, d.department_name
FROM employees e JOIN departments d ON e.department_id = d.department_id
WHERE e.salary > (SELECT AVG(x.salary) FROM employees x WHERE x.department_id = e.department_id)
ORDER BY e.salary DESC;`,
    },
  ],
};
void columnsOf;
