export default {
  id: 'select',
  title: 'SELECT, WHERE, ORDER BY',
  lab: 'Lab 1',
  engine: 'pg',
  lesson: '01-select.md',
  exercises: [
    {
      id: 'sel-1', type: 'pg', title: 'Everything from a table',
      prompt: `List **all columns** of the \`departments\` table.`,
      hints: ['`*` means every column.'],
      solution: `SELECT * FROM departments;`,
    },
    {
      id: 'sel-2', type: 'pg', title: 'Choosing columns',
      prompt: `From \`employees\`, list only the employee's **first name, last name, salary** and **department id**.`,
      hints: ['List the column names after SELECT, separated by commas.'],
      solution: `SELECT first_name, last_name, salary, department_id FROM employees;`,
    },
    {
      id: 'sel-3', type: 'pg', title: 'Concatenation + alias',
      prompt: `List every employee's **full name** (first and last name separated by a space, in one column) under the heading \`Név\`, and their **email**.`,
      hints: ['Concatenate with `||`.', `Don't forget the space literal: \`first_name || ' ' || last_name\`.`, 'Alias with accents → double quotes: `AS "Név"`'],
      solution: `SELECT first_name || ' ' || last_name AS "Név", email FROM employees;`,
    },
    {
      id: 'sel-4', type: 'pg', title: 'Simple condition',
      prompt: `Who earns **more than 10 000 USD**? Show their **last name, job id** and **salary**.`,
      hints: ['`WHERE salary > 10000`'],
      solution: `SELECT last_name, job_id, salary FROM employees WHERE salary > 10000;`,
    },
    {
      id: 'sel-5', type: 'pg', title: 'Commission with NVL',
      prompt: `Who receives **more than 2000 USD commission**, and how much? The commission amount is \`commission_pct * salary\` (treat a missing commission as 0). Show the **first name** and the **commission amount** (heading \`Jutalék\`).`,
      hints: ['NULL * anything = NULL. Use `NVL(commission_pct, 0)` or `COALESCE(commission_pct, 0)`.', 'You cannot write `WHERE Jutalék > 2000` – repeat the expression in WHERE.'],
      solution: `SELECT first_name, NVL(commission_pct, 0) * salary AS "Jutalék"
FROM employees
WHERE NVL(commission_pct, 0) * salary > 2000;`,
    },
    {
      id: 'sel-6', type: 'pg', title: 'Compound condition',
      prompt: `List the **employee id, last name** and **salary** of people working in **department 80** whose salary is **at least 10 000** USD.`,
      hints: ['Combine conditions with `AND`.', '"at least" → `>=`'],
      solution: `SELECT employee_id, last_name, salary FROM employees WHERE department_id = 80 AND salary >= 10000;`,
    },
    {
      id: 'sel-7', type: 'pg', title: 'Gyakorlat 1 – under 5000',
      prompt: `List the **full name**, **job id** and **salary** of employees earning **less than 5000 USD**. Headings: \`Név\`, \`Munkakör\`, \`Fizetés\`. Order by **salary descending**.`,
      hints: ['`ORDER BY salary DESC` (or `ORDER BY 3 DESC`).'],
      solution: `SELECT first_name || ' ' || last_name AS "Név", job_id AS "Munkakör", salary AS "Fizetés"
FROM employees
WHERE salary < 5000
ORDER BY salary DESC;`,
    },
    {
      id: 'sel-8', type: 'pg', title: 'Gyakorlat 2 – BETWEEN',
      prompt: `List the **full name, job id and salary** of employees whose salary is **between 2400 and 3000 USD** (inclusive). Headings \`Név\`, \`Munkakör\`, \`Fizetés\`; order by **salary ascending**.`,
      hints: ['`BETWEEN a AND b` includes both ends.'],
      solution: `SELECT first_name || ' ' || last_name AS "Név", job_id AS "Munkakör", salary AS "Fizetés"
FROM employees
WHERE salary BETWEEN 2400 AND 3000
ORDER BY salary;`,
    },
    {
      id: 'sel-9', type: 'pg', title: 'Gyakorlat 3 – NOT BETWEEN',
      prompt: `Same as before, but now list those whose salary is **NOT** between 2400 and 3000. Order by **salary descending**.`,
      hints: ['`NOT BETWEEN`'],
      solution: `SELECT first_name || ' ' || last_name AS "Név", job_id AS "Munkakör", salary AS "Fizetés"
FROM employees
WHERE salary NOT BETWEEN 2400 AND 3000
ORDER BY salary DESC;`,
    },
    {
      id: 'sel-10', type: 'pg', title: 'LIKE is case-sensitive',
      prompt: `List the **first and last name** of employees whose **first name contains "ev"**, ignoring upper/lower case. (A naive \`LIKE '%EV%'\` finds nobody; there are 4 such people.)`,
      hints: ['Normalise the column: `UPPER(first_name) LIKE ...`', 'PostgreSQL also has `ILIKE` (case-insensitive LIKE).'],
      solution: `SELECT first_name, last_name FROM employees WHERE UPPER(first_name) LIKE '%EV%';`,
    },
    {
      id: 'sel-11', type: 'pg', title: 'IN list',
      prompt: `Find the same people (Kevin and Steven) using **IN** instead of LIKE: list **first and last name** of employees whose first name is Kevin or Steven.`,
      hints: [`\`WHERE first_name IN ('Kevin', 'Steven')\` – string comparison is case-sensitive!`],
      solution: `SELECT first_name, last_name FROM employees WHERE first_name IN ('Kevin', 'Steven');`,
      require: [['\\bIN\\s*\\(', 'Use the IN operator for this one.']],
    },
    {
      id: 'sel-12', type: 'pg', title: 'Gyakorlat 4 – locations',
      prompt: `List the **street address, postal code** and **city** of locations whose **country code is US or UK** and whose **location id is less than 2500**. Order by **city**.`,
      hints: ['Columns of `locations`: location_id, street_address, postal_code, city, state_province, country_id', `Careful with AND/OR precedence: \`country_id IN ('US','UK') AND location_id < 2500\``],
      solution: `SELECT street_address, postal_code, city
FROM locations
WHERE country_id IN ('US', 'UK') AND location_id < 2500
ORDER BY city;`,
    },
    {
      id: 'sel-13', type: 'pg', title: 'DISTINCT',
      prompt: `Which **department ids** occur in the \`employees\` table? List each one **only once**.`,
      hints: ['`SELECT DISTINCT ...`', 'NULL also counts as one value (Kimberely Grant has no department).'],
      solution: `SELECT DISTINCT department_id FROM employees;`,
    },
    {
      id: 'sel-14', type: 'pg', title: 'IS NOT NULL',
      prompt: `Who can receive commission at all? List **first name, last name** and **commission_pct** of employees whose commission is **not missing**.`,
      hints: ['`commission_pct > 0` is not the same thing! Use `IS NOT NULL`.'],
      solution: `SELECT first_name, last_name, commission_pct FROM employees WHERE commission_pct IS NOT NULL;`,
    },
    {
      id: 'sel-15', type: 'pg', title: 'IS NULL – the big boss',
      prompt: `Who has **no manager**? Show their **first name, last name** and **salary**.`,
      hints: ['`manager_id IS NULL`'],
      solution: `SELECT first_name, last_name, salary FROM employees WHERE manager_id IS NULL;`,
    },
    {
      id: 'sel-16', type: 'pg', title: 'Dates – TO_DATE',
      prompt: `List the **first name, last name** and **hire date** of employees hired **after 13 January 2000**.`,
      hints: [`\`hire_date > TO_DATE('2000.01.13', 'YYYY.MM.DD')\``],
      solution: `SELECT first_name, last_name, hire_date
FROM employees
WHERE hire_date > TO_DATE('2000.01.13', 'YYYY.MM.DD');`,
    },
    {
      id: 'sel-17', type: 'pg', title: 'Dates – TO_CHAR',
      prompt: `List the **first name, last name** and the hire date **formatted as \`YYYY.MM.DD\`** (heading \`Belépés dátuma\`) of everybody hired in **1999**. Use \`TO_CHAR\` both for the formatting and for the filter.`,
      hints: [`\`TO_CHAR(hire_date, 'YYYY.MM.DD')\``, `Filter: \`TO_CHAR(hire_date, 'YYYY') = '1999'\` (or 'YY' = '99')`],
      solution: `SELECT first_name, last_name, TO_CHAR(hire_date, 'YYYY.MM.DD') AS "Belépés dátuma"
FROM employees
WHERE TO_CHAR(hire_date, 'YYYY') = '1999';`,
    },
    {
      id: 'sel-18', type: 'pg', title: 'Dates – EXTRACT',
      prompt: `For employees hired after 13 January 2000, list **first name, last name, hire date**, and separately the **year, month** and **day** of the hire date (3 extra columns).`,
      hints: ['`EXTRACT(YEAR FROM hire_date)`, `EXTRACT(MONTH FROM ...)`, `EXTRACT(DAY FROM ...)`'],
      solution: `SELECT first_name, last_name, hire_date,
       EXTRACT(YEAR FROM hire_date) AS be_ev,
       EXTRACT(MONTH FROM hire_date) AS be_honap,
       EXTRACT(DAY FROM hire_date) AS be_nap
FROM employees
WHERE hire_date > TO_DATE('2000.01.13', 'YYYY.MM.DD');`,
    },
    {
      id: 'sel-19', type: 'pg', title: 'String functions',
      prompt: `List **first and last name** of employees whose first name is **longer than 5 characters** and whose **second letter is "a"**.`,
      hints: ['`LENGTH(first_name) > 5`', `\`SUBSTR(first_name, 2, 1) = 'a'\``],
      solution: `SELECT first_name, last_name FROM employees
WHERE LENGTH(first_name) > 5 AND SUBSTR(first_name, 2, 1) = 'a';`,
    },
    {
      id: 'sel-20', type: 'pg', title: 'Last character (Oracle ≠ PostgreSQL)',
      prompt: `List the **first names** of employees whose first name **ends with "n"**.\n\n*(In Oracle the slide used \`SUBSTR(first_name, -1, 1) = 'n'\`. Try that first and see what PostgreSQL does!)*`,
      hints: [`PostgreSQL's SUBSTR does not count from the end – \`SUBSTR('Steven', -1, 1)\` is an empty string.`, `Use \`RIGHT(first_name, 1) = 'n'\` or \`first_name LIKE '%n'\`.`],
      solution: `SELECT first_name FROM employees WHERE RIGHT(first_name, 1) = 'n';`,
    },
    {
      id: 'sel-21', type: 'pg', title: 'CASE – salary bands',
      prompt: `For every employee show the **last name**, a **salary band** and the **department id**. The band is \`Alacsony\` below 5000, \`Közepes\` between 5000 and 12000 (inclusive), \`Magas\` otherwise.`,
      hints: ['`CASE WHEN ... THEN ... WHEN ... THEN ... ELSE ... END`'],
      solution: `SELECT last_name AS "Név",
       CASE WHEN salary < 5000 THEN 'Alacsony'
            WHEN salary BETWEEN 5000 AND 12000 THEN 'Közepes'
            ELSE 'Magas' END AS "Fizetés",
       department_id AS "Részleg"
FROM employees;`,
    },
    {
      id: 'sel-22', type: 'pg', title: 'Gyakorlat 5 – seniority',
      prompt: `List the employees' **full name**, **hire date**, the number of **whole years** spent at the company (up to today), and their experience level: **SENIOR** if they have worked there for **at least 30 years**, **JUNIOR** otherwise.\n\n*(The original task says 15 years, but the HR data is so old that everybody would be SENIOR.)*`,
      hints: ['Months between today and the hire date: `MONTHS_BETWEEN(CURRENT_DATE, hire_date)` (in this app) – divide by 12.', 'Whole years: `TRUNC(...)` (or `FLOOR`). In pure PostgreSQL: `EXTRACT(YEAR FROM AGE(CURRENT_DATE, hire_date))`.', 'Reuse the expression inside the CASE.'],
      solution: `SELECT first_name || ' ' || last_name AS nev, hire_date,
       TRUNC(MONTHS_BETWEEN(CURRENT_DATE, hire_date) / 12) AS evek,
       CASE WHEN MONTHS_BETWEEN(CURRENT_DATE, hire_date) / 12 >= 30 THEN 'SENIOR' ELSE 'JUNIOR' END AS tapasztalat
FROM employees;`,
    },
  ],
};
