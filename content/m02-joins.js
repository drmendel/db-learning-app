export default {
  id: 'joins',
  title: 'Joins',
  lab: 'Lab 1',
  engine: 'pg',
  lesson: '02-joins.md',
  exercises: [
    {
      id: 'join-1', type: 'pg', title: 'Join in WHERE',
      prompt: `Which employee works in which department? List **first name, last name** and **department name**, joining in the **WHERE** clause (Oracle style).`,
      hints: ['`FROM employees e, departments d WHERE e.department_id = d.department_id`'],
      solution: `SELECT first_name, last_name, department_name
FROM employees e, departments d
WHERE e.department_id = d.department_id;`,
    },
    {
      id: 'join-2', type: 'pg', title: 'Gyakorlat 6 – location id',
      prompt: `List the employees' **first name, last name, job id** and the **location id** of their department.`,
      hints: ['`location_id` is a column of `departments`.'],
      solution: `SELECT first_name, last_name, job_id, location_id
FROM employees e, departments d
WHERE e.department_id = d.department_id;`,
    },
    {
      id: 'join-3', type: 'pg', title: 'Gyakorlat 7 – department cities',
      prompt: `List every department's **name**, its **location id** and the **city**.`,
      hints: ['`location_id` exists in both tables – prefix it (`d.location_id`).'],
      solution: `SELECT department_name, d.location_id, city
FROM departments d, locations l
WHERE d.location_id = l.location_id;`,
    },
    {
      id: 'join-4', type: 'pg', title: 'Gyakorlat 8 – three tables',
      prompt: `List each employee's **last name**, **department id** and the **city** they work in.`,
      hints: ['employees → departments → locations: 3 tables need 2 join conditions.'],
      solution: `SELECT e.last_name, e.department_id, l.city
FROM employees e, departments d, locations l
WHERE e.department_id = d.department_id
  AND d.location_id = l.location_id;`,
    },
    {
      id: 'join-5', type: 'pg', title: 'Self-join – who is the boss?',
      prompt: `Next to every employee's **full name** show their **manager's full name** (two columns). Employees without a manager can be left out.`,
      hints: ['Join `employees` to itself: `FROM employees e, employees m`.', 'Condition: `e.manager_id = m.employee_id`.'],
      solution: `SELECT e.first_name || ' ' || e.last_name AS dolgozo,
       m.first_name || ' ' || m.last_name AS fonok
FROM employees e JOIN employees m ON e.manager_id = m.employee_id;`,
    },
    {
      id: 'join-6', type: 'pg', title: 'Gyakorlat 9 – salary gap',
      prompt: `Extend the previous query: besides the **manager's** and the **subordinate's full name**, show the **difference of their salaries** (manager's salary minus subordinate's salary).`,
      hints: ['`m.salary - e.salary`'],
      solution: `SELECT m.first_name || ' ' || m.last_name AS fonok,
       e.first_name || ' ' || e.last_name AS beosztott,
       m.salary - e.salary AS kulonbseg
FROM employees e JOIN employees m ON e.manager_id = m.employee_id;`,
    },
    {
      id: 'join-7', type: 'pg', title: 'INNER JOIN … USING',
      prompt: `Using **INNER JOIN … USING**, list the employees' **last name, job id, department id** and **department name**.`,
      hints: ['With USING the joined column is merged – do **not** prefix it (`department_id`, not `e.department_id`).'],
      solution: `SELECT last_name, job_id, department_id, department_name
FROM employees INNER JOIN departments USING (department_id);`,
      require: [['\\bJOIN\\b', 'Use the JOIN syntax for this task.']],
    },
    {
      id: 'join-8', type: 'pg', title: 'Gyakorlat 10 – job history',
      prompt: `For each record in \`job_history\` show the employee's **last name**, the **start** and **end date**, the **job id** they had then, and the **maximum salary** of that job.`,
      hints: ['Chain two joins: job_history → employees, job_history → jobs.', 'Careful: join `jobs` on **job_history.job_id** (the past job), not on employees.job_id!', 'There are 10 rows in job_history, so the result has 10 rows.'],
      solution: `SELECT e.last_name, h.start_date, h.end_date, h.job_id, j.max_salary
FROM job_history h
  JOIN employees e ON h.employee_id = e.employee_id
  JOIN jobs j ON h.job_id = j.job_id;`,
    },
    {
      id: 'join-9', type: 'pg', title: 'LEFT JOIN – nobody left behind',
      prompt: `List **employee id, last name, department id** and **department name** of all employees, **including those who don't belong to any department**.`,
      hints: ['`employees e LEFT JOIN departments d ON ...` keeps every employee.', 'Expected: 107 rows.'],
      solution: `SELECT e.employee_id, e.last_name, e.department_id, d.department_name
FROM employees e LEFT JOIN departments d ON e.department_id = d.department_id;`,
    },
    {
      id: 'join-10', type: 'pg', title: 'Gyakorlat 11 – department managers',
      prompt: `List the **employee id, last name, hire date** and the **name of the department they manage** for every employee who **is the manager of a department**.`,
      hints: ['The link is `departments.manager_id = employees.employee_id`.'],
      solution: `SELECT e.employee_id, e.last_name, e.hire_date, d.department_name
FROM employees e INNER JOIN departments d ON e.employee_id = d.manager_id;`,
    },
    {
      id: 'join-11', type: 'pg', title: 'A \\ B – not a manager',
      prompt: `List the **employee id** and **last name** of employees who are **not the manager of any department**.`,
      hints: ['Start from the previous query with a LEFT JOIN.', 'Keep the rows where the department side is missing: `WHERE d.department_id IS NULL`.'],
      solution: `SELECT e.employee_id, e.last_name
FROM employees e LEFT JOIN departments d ON e.employee_id = d.manager_id
WHERE d.department_id IS NULL;`,
    },
    {
      id: 'join-12', type: 'pg', title: 'B \\ A – empty departments',
      prompt: `List the **names of the departments where nobody works**.`,
      hints: ['`employees e RIGHT JOIN departments d ON ... WHERE e.employee_id IS NULL`', 'There are 16 of them.'],
      solution: `SELECT department_name
FROM employees e RIGHT JOIN departments d ON e.department_id = d.department_id
WHERE e.employee_id IS NULL;`,
    },
    {
      id: 'join-13', type: 'pg', title: 'FULL JOIN – everything',
      prompt: `List the **last name, department id** (from the employee) and **department name** for every employee **and** every department: employees without a department and departments without employees must appear too.`,
      hints: ['`FULL JOIN` = LEFT + RIGHT.', '107 employees + 16 empty departments = 123 rows.'],
      solution: `SELECT e.last_name, e.department_id, d.department_name
FROM employees e FULL JOIN departments d ON e.department_id = d.department_id;`,
    },
    {
      id: 'join-14', type: 'pg', title: 'FULL JOIN – only the loners',
      prompt: `Modify the previous query: list only the **last names of employees who belong to no department** and the **names of departments where nobody works** (two columns: last name, department name).`,
      hints: ['Keep rows where *either* side is missing: `WHERE e.employee_id IS NULL OR d.department_id IS NULL`.'],
      solution: `SELECT e.last_name, d.department_name
FROM employees e FULL JOIN departments d ON e.department_id = d.department_id
WHERE e.employee_id IS NULL OR d.department_id IS NULL;`,
    },
    {
      id: 'join-15', type: 'pg', title: 'Gyakorlat 13 – cities and departments',
      prompt: `List the **cities** and the **departments** in them (city, department name). Cities without any department must appear too. Order by **city name**.`,
      hints: ['`locations l LEFT JOIN departments d ON l.location_id = d.location_id`'],
      solution: `SELECT l.city, d.department_name
FROM locations l LEFT JOIN departments d ON l.location_id = d.location_id
ORDER BY l.city;`,
    },
    {
      id: 'join-16', type: 'pg', title: 'Gyakorlat 14 – countries and cities',
      prompt: `List the **country names** and the registered **cities** in them. **Every country** must appear, even those without a city.`,
      hints: ['`countries c LEFT JOIN locations l ON c.country_id = l.country_id`'],
      solution: `SELECT c.country_name, l.city
FROM countries c LEFT JOIN locations l ON c.country_id = l.country_id;`,
    },
    {
      id: 'join-17', type: 'pg', title: 'Gyakorlat 15 – which country?',
      prompt: `List the employees' **full name** and the **name of the country** they work in.`,
      hints: ['employees → departments → locations → countries (4 tables, 3 conditions).'],
      solution: `SELECT e.first_name || ' ' || e.last_name AS nev, c.country_name
FROM employees e
  JOIN departments d ON e.department_id = d.department_id
  JOIN locations l ON d.location_id = l.location_id
  JOIN countries c ON l.country_id = c.country_id;`,
    },
    {
      id: 'join-18', type: 'pg', title: 'Gyakorlat 16 – high earners and cities',
      prompt: `List the **full name**, the **job title** and the **city** of employees earning **at least 10 000**. Only employees whose department has a city should appear.`,
      hints: ['Job title comes from `jobs`, city from `locations` (via departments).', 'Inner joins automatically drop people without a department/city.'],
      solution: `SELECT e.first_name || ' ' || e.last_name AS nev, j.job_title, l.city
FROM employees e
  JOIN jobs j ON e.job_id = j.job_id
  JOIN departments d ON e.department_id = d.department_id
  JOIN locations l ON d.location_id = l.location_id
WHERE e.salary >= 10000;`,
    },
    {
      id: 'join-19', type: 'pg', title: 'NATURAL JOIN',
      prompt: `List all employee data together with their job data using **NATURAL JOIN** with \`jobs\`. Show just these columns: **last_name, job_id, job_title, salary, max_salary**.`,
      hints: ['`employees NATURAL JOIN jobs` – the only common column is job_id.'],
      solution: `SELECT last_name, job_id, job_title, salary, max_salary FROM employees NATURAL JOIN jobs;`,
      require: [['NATURAL\\s+JOIN', 'Use NATURAL JOIN here.']],
    },
    {
      id: 'join-q1', type: 'quiz', title: 'Why is this NATURAL JOIN wrong?',
      prompt: '`SELECT last_name, department_name FROM employees NATURAL JOIN departments;` returns far fewer rows than expected. Why?',
      options: [
        'NATURAL JOIN only works with USING',
        'Both tables have a `manager_id` column too, so it joins on department_id AND manager_id',
        'department_id is NULL for some departments',
        'NATURAL JOIN is a Cartesian product',
      ],
      answer: 1,
      explain: 'NATURAL JOIN uses **every** column with the same name. employees.manager_id (the employee\'s boss) and departments.manager_id (the department head) mean different things, so only employees whose boss is also their department head remain.',
    },
  ],
};
