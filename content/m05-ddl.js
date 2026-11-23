import { behaviour, columnsOf } from './util.js';

const PREP = `
CREATE TABLE employees2 AS SELECT * FROM employees;
CREATE TABLE departments2 AS SELECT * FROM departments;
ALTER TABLE departments2 ADD CONSTRAINT dept2_pk PRIMARY KEY (department_id);
ALTER TABLE employees2 ADD CONSTRAINT emp2_pk PRIMARY KEY (employee_id);
ALTER TABLE employees2 ADD CONSTRAINT emp2_deptid_fk FOREIGN KEY (department_id) REFERENCES departments2;
ALTER TABLE employees2 ADD CONSTRAINT lastname_ck CHECK (last_name IS NOT NULL AND salary >= 700);`;

const WITH_42 = PREP + `
INSERT INTO departments2 (department_id, department_name, location_id) VALUES (42, 'SAJTKÉSZÍTŐ', 1000);`;

const WITH_ODON = WITH_42 + `
INSERT INTO employees2 (employee_id, first_name, last_name, email, hire_date, department_id, job_id)
VALUES (1111, 'Ödön', 'Bőrönd', 'bodon', TO_DATE('2018.10.15', 'YYYY.MM.DD'), 42, 'AC_MGR');
INSERT INTO employees2 (employee_id, first_name, last_name, email, hire_date, department_id, job_id)
VALUES (1112, 'Izolda', 'Huncut', 'hizolda', TO_DATE('2018.03.01', 'YYYY.MM.DD'), 42, 'SA_MAN');`;

const assert = (cond) => `PERFORM 1 / (CASE WHEN (${cond}) THEN 1 ELSE 0 END)`;

const kutyaTests = (t) => behaviour([
  ['valid row is accepted', `INSERT INTO ${t} (id, nev, nem, gazd_id, email) VALUES (1, 'Bodri', 1, 100, 'bodri@x.hu')`],
  ['duplicate id is rejected', `INSERT INTO ${t} (id, nev, nem) VALUES (1, 'A', 0); INSERT INTO ${t} (id, nev, nem) VALUES (1, 'B', 0)`],
  ['nem = 2 is rejected', `INSERT INTO ${t} (id, nev, nem) VALUES (2, 'A', 2)`],
  ['NULL name is rejected', `INSERT INTO ${t} (id, nev, nem) VALUES (3, NULL, 0)`],
  ['unknown owner is rejected', `INSERT INTO ${t} (id, nev, nem, gazd_id) VALUES (4, 'A', 0, 99999)`],
  ['duplicate email is rejected', `INSERT INTO ${t} (id, nev, nem, email) VALUES (5, 'A', 0, 'x'); INSERT INTO ${t} (id, nev, nem, email) VALUES (6, 'B', 0, 'x')`],
]);

export default {
  id: 'ddl',
  title: 'DDL, constraints, DML, views',
  lab: 'Labs 1–2',
  engine: 'pg',
  lesson: '05-ddl.md',
  exercises: [
    {
      id: 'ddl-1', type: 'pg', title: 'Copy a table (CTAS)',
      prompt: `Create a table called \`employees3\` that contains the employees earning **more than 5000** USD (all columns), based on a query.`,
      hints: ['`CREATE TABLE employees3 AS SELECT ...`'],
      solution: `CREATE TABLE employees3 AS SELECT * FROM employees WHERE salary > 5000;`,
      check: `SELECT COUNT(*), MIN(salary), MAX(salary), COUNT(DISTINCT department_id) FROM employees3`,
    },
    {
      id: 'ddl-2', type: 'pg', title: 'Gyakorlat 18 – CREATE TABLE kutya',
      prompt: `Create a table named \`kutya\` with these columns (use exactly these names):\n\n- \`id\`: integer with at most 3 digits\n- \`nev\`: text of at most 20 characters\n- \`nem\`: integer with at most 1 digit\n- \`szuldatum\`: date`,
      hints: ['Oracle types: NUMBER(3), VARCHAR2(20), NUMBER(1), DATE – they work here too.'],
      solution: `CREATE TABLE kutya (
  id NUMBER(3),
  nev VARCHAR2(20),
  nem NUMBER(1),
  szuldatum DATE
);`,
      check: columnsOf('kutya', ', character_maximum_length'),
    },
    {
      id: 'ddl-3', type: 'pg', title: 'Gyakorlat 19 – ALTER + RENAME',
      prompt: `The table \`kutya\` from the previous task already exists. \n\n1. Add a column \`gazd_id\` holding an integer of at most 6 digits.\n2. Rename the table to \`kutyusok\`.`,
      hints: ['`ALTER TABLE kutya ADD (gazd_id NUMBER(6));` (Oracle) or `ADD COLUMN gazd_id numeric(6)` (PG)', '`RENAME kutya TO kutyusok;` (Oracle) or `ALTER TABLE kutya RENAME TO kutyusok;`'],
      setup: `CREATE TABLE kutya (id INTEGER, nev VARCHAR(20), nem INTEGER, szuldatum DATE);`,
      solution: `ALTER TABLE kutya ADD (gazd_id NUMBER(6));
RENAME kutya TO kutyusok;`,
      check: `SELECT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'kutya') AS regi_tabla,
       string_agg(column_name, ', ' ORDER BY ordinal_position) AS oszlopok
FROM information_schema.columns WHERE table_name = 'kutyusok' AND table_schema = 'hr'`,
    },
    {
      id: 'ddl-4', type: 'pg', title: 'Gyakorlat 20 – constraints with ALTER',
      prompt: `The table \`kutyusok(id, nev, nem, szuldatum, gazd_id)\` exists. Using **ALTER TABLE** statements:\n\n- primary key: \`id\`\n- \`nem\` can only be **0 or 1**\n- \`nev\` cannot be empty (NULL)\n- foreign key: \`gazd_id\` → \`employees(employee_id)\`\n- add a new column \`email\` (text, max 20) with a **UNIQUE** constraint\n\nThe checker will try to insert good and bad rows to test your constraints.`,
      hints: ['`ALTER TABLE kutyusok ADD CONSTRAINT k_pk PRIMARY KEY (id);`', '`... ADD CONSTRAINT k_ck CHECK (nem IN (0, 1));`', '`... ADD CONSTRAINT k_fk FOREIGN KEY (gazd_id) REFERENCES employees (employee_id);`', '`ALTER TABLE kutyusok ADD (email VARCHAR2(20) UNIQUE);`'],
      setup: `CREATE TABLE kutyusok (id INTEGER, nev VARCHAR(20), nem INTEGER, szuldatum DATE, gazd_id INTEGER);`,
      solution: `ALTER TABLE kutyusok ADD CONSTRAINT k_pk PRIMARY KEY (id);
ALTER TABLE kutyusok ADD CONSTRAINT k_ck CHECK (nem IN (0, 1));
ALTER TABLE kutyusok ADD CONSTRAINT k_ck2 CHECK (nev IS NOT NULL);
ALTER TABLE kutyusok ADD CONSTRAINT k_fk FOREIGN KEY (gazd_id) REFERENCES employees (employee_id);
ALTER TABLE kutyusok ADD (email VARCHAR2(20) UNIQUE);`,
      check: kutyaTests('kutyusok'),
    },
    {
      id: 'ddl-5', type: 'pg', title: 'Gyakorlat 20 – all in one CREATE TABLE',
      prompt: `Do the same with a **single CREATE TABLE** statement. Name the table \`kutyusok2\`; columns: \`id\`, \`nev\`, \`nem\`, \`szuldatum\`, \`gazd_id\`, \`email\` with the same constraints as before.`,
      hints: ['Inline: `id NUMBER(3) PRIMARY KEY`, `nev VARCHAR2(20) NOT NULL`, `nem NUMBER(1) CHECK (nem IN (0,1))`, `gazd_id NUMBER(6) REFERENCES employees(employee_id)`, `email VARCHAR2(20) UNIQUE`'],
      solution: `CREATE TABLE kutyusok2 (
  id        NUMBER(3) CONSTRAINT k2_pk PRIMARY KEY,
  nev       VARCHAR2(20) NOT NULL,
  nem       NUMBER(1) CONSTRAINT k2_ck CHECK (nem IN (0, 1)),
  szuldatum DATE,
  gazd_id   NUMBER(6) REFERENCES employees (employee_id),
  email     VARCHAR2(20) UNIQUE
);`,
      check: kutyaTests('kutyusok2'),
    },
    {
      id: 'ddl-6', type: 'pg', title: 'Sequence',
      prompt: `1. Create a sequence \`seq_tab\` that starts at 1 and increments by 1.\n2. Create a table \`tab\` with columns \`id\` (number, primary key) and \`name\` (text up to 16 chars, NOT NULL).\n3. Insert two rows **using the sequence** for the id: first \`'ABC'\`, then \`'CBA'\`.\n\n*(Don't call NEXTVAL anywhere else, otherwise you burn a number!)*`,
      hints: ['`CREATE SEQUENCE seq_tab START WITH 1 INCREMENT BY 1;`', `\`INSERT INTO tab (id, name) VALUES (seq_tab.NEXTVAL, 'ABC');\` – in PG: \`nextval('seq_tab')\``],
      solution: `CREATE SEQUENCE seq_tab MINVALUE 1 MAXVALUE 99999999 START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE TABLE tab (id NUMBER PRIMARY KEY, name VARCHAR2(16) NOT NULL);
INSERT INTO tab (id, name) VALUES (seq_tab.NEXTVAL, 'ABC');
INSERT INTO tab (id, name) VALUES (seq_tab.NEXTVAL, 'CBA');`,
      check: `SELECT id, name FROM tab ORDER BY id`,
      require: [['nextval', 'Use the sequence (NEXTVAL / nextval) to generate the ids.']],
    },
    {
      id: 'ddl-7', type: 'pg', title: 'DML preparation',
      prompt: `Prepare copies for the DML exercises:\n\n1. \`employees2\` = copy of the whole \`employees\` table, \`departments2\` = copy of \`departments\`.\n2. Primary key of \`departments2\`: \`department_id\`; of \`employees2\`: \`employee_id\`.\n3. Foreign key: \`employees2.department_id\` → \`departments2\`.\n4. In \`employees2\`, \`last_name\` cannot be empty, and the **salary must be at least 700** dollars.`,
      hints: ['CTAS twice, then ALTER TABLE … ADD CONSTRAINT four times.', '`CHECK (last_name IS NOT NULL AND salary >= 700)`'],
      solution: PREP,
      check: behaviour([
        ['all 107 employees copied', assert('(SELECT COUNT(*) FROM employees2) = 107')],
        ['duplicate department id rejected', `INSERT INTO departments2 (department_id, department_name) VALUES (10, 'X')`],
        ['duplicate employee id rejected', `INSERT INTO employees2 (employee_id, last_name, email, hire_date, job_id, salary) VALUES (100, 'X', 'x', CURRENT_DATE, 'IT_PROG', 1000)`],
        ['unknown department rejected', `INSERT INTO employees2 (employee_id, last_name, email, hire_date, job_id, salary, department_id) VALUES (5000, 'X', 'x', CURRENT_DATE, 'IT_PROG', 1000, 999)`],
        ['salary 650 rejected', `UPDATE employees2 SET salary = 650 WHERE employee_id = 100`],
        ['missing last name rejected', `UPDATE employees2 SET last_name = NULL WHERE employee_id = 100`],
        ['valid employee accepted', `INSERT INTO employees2 (employee_id, last_name, email, hire_date, job_id, salary, department_id) VALUES (5001, 'X', 'x', CURRENT_DATE, 'IT_PROG', 1000, 60)`],
      ]),
    },
    {
      id: 'ddl-8', type: 'pg', title: 'INSERT – new department',
      prompt: `(employees2 / departments2 are prepared.) Add a new department to \`departments2\`: id **42**, name **SAJTKÉSZÍTŐ**, location **1000** (no manager).`,
      hints: ['List the columns you fill: `INSERT INTO departments2 (department_id, department_name, location_id) VALUES (...)`'],
      setup: PREP,
      solution: `INSERT INTO departments2 (department_id, department_name, location_id) VALUES (42, 'SAJTKÉSZÍTŐ', 1000);`,
      check: `SELECT * FROM departments2 WHERE department_id = 42`,
    },
    {
      id: 'ddl-9', type: 'pg', title: 'INSERT – new employees',
      prompt: `Department 42 exists now. Insert two employees into \`employees2\` (no salary yet):\n\n| id | first name | last name | email | hire date | dept | job |\n|---|---|---|---|---|---|---|\n| 1111 | Ödön | Bőrönd | bodon | 2018.10.15 | 42 | AC_MGR |\n| 1112 | Izolda | Huncut | hizolda | 2018.03.01 | 42 | SA_MAN |`,
      hints: [`Dates: \`TO_DATE('2018.10.15', 'YYYY.MM.DD')\``, 'List the columns explicitly in the INSERT.'],
      setup: WITH_42,
      solution: `INSERT INTO employees2 (employee_id, first_name, last_name, email, hire_date, department_id, job_id)
VALUES (1111, 'Ödön', 'Bőrönd', 'bodon', TO_DATE('2018.10.15', 'YYYY.MM.DD'), 42, 'AC_MGR');
INSERT INTO employees2 (employee_id, first_name, last_name, email, hire_date, department_id, job_id)
VALUES (1112, 'Izolda', 'Huncut', 'hizolda', TO_DATE('2018.03.01', 'YYYY.MM.DD'), 42, 'SA_MAN');`,
      check: `SELECT employee_id, first_name, last_name, email, hire_date::date, department_id, job_id, salary
FROM employees2 WHERE employee_id IN (1111, 1112) ORDER BY employee_id`,
    },
    {
      id: 'ddl-10', type: 'pg', title: 'UPDATE – Ödön gets a salary',
      prompt: `Ödön (1111) has no salary and no manager yet. Give him a salary of **8500**, manager **100**, and a commission of **10%** (0.1).\n\n*(Then try setting his salary to 650 in Run mode – what happens and why?)*`,
      hints: ['`UPDATE employees2 SET salary = 8500, manager_id = 100, commission_pct = 0.1 WHERE employee_id = 1111;`', 'Always use a WHERE – otherwise every row changes!'],
      setup: WITH_ODON,
      solution: `UPDATE employees2 SET salary = 8500, manager_id = 100 WHERE employee_id = 1111;
UPDATE employees2 SET commission_pct = 0.1 WHERE employee_id = 1111;`,
      check: `SELECT employee_id, salary, manager_id, commission_pct, (SELECT COUNT(*) FROM employees2 WHERE salary = 8500) AS ennyien
FROM employees2 WHERE employee_id = 1111`,
    },
    {
      id: 'ddl-11', type: 'pg', title: 'Gyakorlat 21 – card numbers',
      prompt: `Add a column \`cardnumber\` (5-digit number) to \`employees2\`, and fill it for everybody: **cardnumber = 10000 + employee_id**.`,
      hints: ['ALTER TABLE … ADD, then one UPDATE without WHERE (this time we really want every row).'],
      setup: PREP,
      solution: `ALTER TABLE employees2 ADD (cardnumber NUMBER(5));
UPDATE employees2 SET cardnumber = 10000 + employee_id;`,
      check: `SELECT employee_id, cardnumber FROM employees2 ORDER BY employee_id`,
    },
    {
      id: 'ddl-12', type: 'pg', title: 'Gyakorlat 22 – income category',
      prompt: `Add a text column \`income\` to \`employees2\`: it is **'HIGH'** for those earning **more than 2500**, **'LOW'** for the others. Add a constraint that only allows these two values.`,
      hints: [`UPDATE with CASE: \`SET income = CASE WHEN salary > 2500 THEN 'HIGH' ELSE 'LOW' END\``, `\`ALTER TABLE employees2 ADD CONSTRAINT income_ck CHECK (income IN ('HIGH', 'LOW'))\``],
      setup: PREP,
      solution: `ALTER TABLE employees2 ADD (income VARCHAR2(4));
UPDATE employees2 SET income = CASE WHEN salary > 2500 THEN 'HIGH' ELSE 'LOW' END;
ALTER TABLE employees2 ADD CONSTRAINT income_ck CHECK (income IN ('HIGH', 'LOW'));`,
      check: behaviour([
        ['every income is correct', assert(`NOT EXISTS (SELECT 1 FROM employees2 WHERE income IS DISTINCT FROM CASE WHEN salary > 2500 THEN 'HIGH' ELSE 'LOW' END)`)],
        ["'MEDIUM' is rejected", `UPDATE employees2 SET income = 'MEDIUM' WHERE employee_id = 100`],
        ["'LOW' is accepted", `UPDATE employees2 SET income = 'LOW' WHERE employee_id = 100`],
      ]),
    },
    {
      id: 'ddl-13', type: 'pg', title: 'Gyakorlat 23 – raises',
      prompt: `In \`employees2\`:\n\n1. Everybody who earns **less than 10 000** and **cannot receive commission** gets a **10% raise**.\n2. **Increase the commission** of everybody in **department 80** by **10%**.`,
      hints: ['`UPDATE employees2 SET salary = salary * 1.1 WHERE salary < 10000 AND commission_pct IS NULL;`', '`UPDATE employees2 SET commission_pct = commission_pct * 1.1 WHERE department_id = 80;`'],
      setup: PREP,
      solution: `UPDATE employees2 SET salary = salary * 1.1 WHERE salary < 10000 AND commission_pct IS NULL;
UPDATE employees2 SET commission_pct = commission_pct * 1.1 WHERE department_id = 80;`,
      check: `SELECT employee_id, salary, commission_pct FROM employees2 ORDER BY employee_id`,
    },
    {
      id: 'ddl-14', type: 'pg', title: 'DELETE – closing the cheese business',
      prompt: `Department 42 (SAJTKÉSZÍTŐ) has two employees: Ödön (1111, AC_MGR) and Izolda (1112, SA_MAN).\n\n1. Fire Ödön (delete him from \`employees2\`).\n2. Delete **every Sales Manager** (\`SA_MAN\`) from \`employees2\`.\n3. Delete department 42 from \`departments2\`.\n\n*(Try deleting department 42 first in Run mode – why does it fail?)*`,
      hints: ['The FK prevents deleting a department that still has employees.', `\`DELETE FROM employees2 WHERE UPPER(job_id) = 'SA_MAN';\``],
      setup: WITH_ODON,
      solution: `DELETE FROM employees2 WHERE employee_id = 1111;
DELETE FROM employees2 WHERE UPPER(job_id) = 'SA_MAN';
DELETE FROM departments2 WHERE department_id = 42;`,
      check: `SELECT (SELECT COUNT(*) FROM employees2) AS dolgozok,
       (SELECT COUNT(*) FROM employees2 WHERE job_id = 'SA_MAN') AS sa_man,
       (SELECT COUNT(*) FROM departments2 WHERE department_id = 42) AS reszleg42`,
    },
    {
      id: 'ddl-15', type: 'pg', title: 'Gyakorlat 24/a – a view',
      prompt: `Create a view \`dolgozok\` that lists each employee's **full name**, **income** (salary + commission, i.e. \`salary * (1 + commission_pct)\` with a missing commission as 0), **job id**, the **year they joined**, and their **department name** (inner join, so employees without a department are not in the view).`,
      hints: ['`CREATE OR REPLACE VIEW dolgozok AS SELECT ... FROM employees JOIN departments ...`', '`EXTRACT(YEAR FROM hire_date)`'],
      solution: `CREATE OR REPLACE VIEW dolgozok AS
SELECT e.first_name || ' ' || e.last_name AS nev,
       e.salary * (1 + NVL(e.commission_pct, 0)) AS jovedelem,
       e.job_id,
       EXTRACT(YEAR FROM e.hire_date) AS belepes_eve,
       d.department_name
FROM employees e JOIN departments d ON e.department_id = d.department_id;`,
      check: `SELECT * FROM dolgozok`,
    },
    {
      id: 'ddl-16', type: 'pg', title: 'Gyakorlat 24/b – extend the view',
      prompt: `The view \`dolgozok\` from the previous task exists. Modify it so that it also contains the **full name of the employee's manager** as the **last column** (employees without a manager must stay in the view with NULL there).`,
      hints: ['`CREATE OR REPLACE VIEW` with an extra `LEFT JOIN employees m ON e.manager_id = m.employee_id`.', 'PostgreSQL only allows adding new columns at the END when replacing a view.'],
      setup: `CREATE VIEW dolgozok AS
SELECT e.first_name || ' ' || e.last_name AS nev, e.salary * (1 + COALESCE(e.commission_pct, 0)) AS jovedelem,
       e.job_id, EXTRACT(YEAR FROM e.hire_date) AS belepes_eve, d.department_name
FROM employees e JOIN departments d ON e.department_id = d.department_id;`,
      solution: `CREATE OR REPLACE VIEW dolgozok AS
SELECT e.first_name || ' ' || e.last_name AS nev,
       e.salary * (1 + NVL(e.commission_pct, 0)) AS jovedelem,
       e.job_id,
       EXTRACT(YEAR FROM e.hire_date) AS belepes_eve,
       d.department_name,
       m.first_name || ' ' || m.last_name AS fonok
FROM employees e
  JOIN departments d ON e.department_id = d.department_id
  LEFT JOIN employees m ON e.manager_id = m.employee_id;`,
      check: `SELECT * FROM dolgozok`,
    },
    {
      id: 'ddl-17', type: 'pg', title: 'View WITH CHECK OPTION',
      prompt: `Create a view \`nyolcvan\` over \`employees2\` with the columns **employee_id, last_name, job_id, salary, department_id, hire_date, email** for the employees of **department 80**. Through the view it must **not** be possible to insert or modify rows so that they fall out of the view.`,
      hints: ['`CREATE OR REPLACE VIEW nyolcvan AS SELECT ... FROM employees2 WHERE department_id = 80 WITH CHECK OPTION;`'],
      setup: PREP,
      solution: `CREATE OR REPLACE VIEW nyolcvan AS
SELECT employee_id, last_name, job_id, salary, department_id, hire_date, email
FROM employees2 WHERE department_id = 80
WITH CHECK OPTION;`,
      check: behaviour([
        ['view shows department 80 (34 rows)', assert('(SELECT COUNT(*) FROM nyolcvan) = 34')],
        ['insert into dept 80 works', `INSERT INTO nyolcvan (employee_id, last_name, email, hire_date, job_id, department_id, salary) VALUES (998, 'ALADÁR', 'baladar', CURRENT_DATE, 'SA_MAN', 80, 1000)`],
        ['insert without dept 80 is rejected', `INSERT INTO nyolcvan (employee_id, last_name, email, hire_date, job_id, salary) VALUES (999, 'ODON', 'bodon', CURRENT_DATE, 'SA_MAN', 1000)`],
        ['raise through the view works', `UPDATE nyolcvan SET salary = salary * 1.1 WHERE salary < 8000`],
        ['moving someone out is rejected', `UPDATE nyolcvan SET department_id = 50 WHERE employee_id = 145`],
      ]),
    },
    {
      id: 'ddl-18', type: 'pg', title: 'Composite index',
      prompt: `The table \`hallgato(nev, szul_dat, evfolyam)\` exists. Create an index named \`hallg_nevsor_idx\` that orders by **name ascending**, and within the same name by **year (evfolyam) descending**.`,
      hints: ['`CREATE INDEX hallg_nevsor_idx ON hallgato (nev, evfolyam DESC);`'],
      setup: `CREATE TABLE hallgato (nev VARCHAR(30), szul_dat DATE, evfolyam NUMERIC(1) DEFAULT 1);`,
      solution: `CREATE INDEX hallg_nevsor_idx ON hallgato (nev, evfolyam DESC);`,
      check: `SELECT indexname, replace(indexdef, 'hr.', '') FROM pg_indexes WHERE tablename = 'hallgato' ORDER BY 1`,
    },
    {
      id: 'ddl-19', type: 'pg', title: 'Uniqueness with an index',
      prompt: `Make sure that no two students in \`hallgato\` can have the same name – using a **UNIQUE INDEX** (named \`hallg_nev_idx\`).`,
      hints: ['`CREATE UNIQUE INDEX hallg_nev_idx ON hallgato (nev);`'],
      setup: `CREATE TABLE hallgato (nev VARCHAR(30), szul_dat DATE, evfolyam NUMERIC(1) DEFAULT 1);`,
      solution: `CREATE UNIQUE INDEX hallg_nev_idx ON hallgato (nev);`,
      check: behaviour([
        ['different names are fine', `INSERT INTO hallgato (nev) VALUES ('Anna'); INSERT INTO hallgato (nev) VALUES ('Béla')`],
        ['same name twice is rejected', `INSERT INTO hallgato (nev) VALUES ('Anna'); INSERT INTO hallgato (nev) VALUES ('Anna')`],
        ['default evfolyam is 1', `INSERT INTO hallgato (nev) VALUES ('Cili'); ${assert(`(SELECT evfolyam FROM hallgato WHERE nev = 'Cili') = 1`)}`],
      ]),
      require: [['UNIQUE\\s+INDEX', 'Use CREATE UNIQUE INDEX (not a constraint) for this task.']],
    },
    {
      id: 'ddl-q1', type: 'quiz', title: 'Which INSERT works?',
      prompt: '`departments2(department_id PK, department_name, manager_id, location_id)` contains the original 27 departments (10, 20, …, 270). Which statement succeeds?',
      options: [
        "`INSERT INTO departments2 VALUES (55, 'NÉV', 200, 1700);`",
        "`INSERT INTO departments2 VALUES (30, 'NÉV', 200, 1700);`",
        "`INSERT INTO departments2 (department_name, location_id) VALUES ('NÉV', 1700);`",
        'None of them',
      ],
      answer: 0,
      explain: '30 already exists (PK violation); the third leaves the primary key NULL, which is not allowed. 55 is free, and giving all 4 values in column order works.',
    },
    {
      id: 'ddl-q2', type: 'quiz', title: 'Constraint on existing data',
      prompt: 'The lowest salary in `employees` is 2100. What happens with `ALTER TABLE employees ADD CONSTRAINT minimalber CHECK (salary > 3000);`?',
      options: ['It is added, and only applies to new rows', 'It fails because existing rows violate it', 'It deletes the violating rows', 'It is added but disabled'],
      answer: 1,
      explain: 'A constraint can only be added (or enabled) if the existing data satisfies it.',
    },
  ],
};
