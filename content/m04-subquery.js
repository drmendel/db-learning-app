export default {
  id: 'subquery',
  title: 'Subqueries & WITH',
  lab: 'Lab 3',
  engine: 'pg',
  lesson: '04-subquery.md',
  exercises: [
    {
      id: 'sub-1', type: 'pg', title: 'Lowest earners per department',
      prompt: `List the **department id**, the **last name** and the **salary** of the employee(s) with the **lowest salary in each department**.`,
      hints: ['Inline view: `(SELECT department_id, MIN(salary) legkisebb FROM employees GROUP BY department_id) m`', 'Join it on BOTH department_id and salary = legkisebb.'],
      solution: `SELECT e.department_id, e.last_name, m.legkisebb
FROM employees e,
     (SELECT department_id, MIN(salary) AS legkisebb FROM employees GROUP BY department_id) m
WHERE e.salary = m.legkisebb
  AND e.department_id = m.department_id;`,
    },
    {
      id: 'sub-2', type: 'pg', title: 'Department average next to each employee',
      prompt: `List **last name, salary, department id** and the **average salary of the employee's department**. (Employees without a department may be omitted.)`,
      hints: ['Inline view with the per-department averages, joined on department_id.'],
      solution: `SELECT last_name, salary, department_id, atlag
FROM employees NATURAL JOIN
  (SELECT department_id, AVG(salary) AS atlag FROM employees GROUP BY department_id) a;`,
    },
    {
      id: 'sub-3', type: 'pg', title: 'Worst-paid job',
      prompt: `Which **job title** belongs to the **lowest-paid employee**?`,
      hints: ['`WHERE salary = (SELECT MIN(salary) FROM employees)`'],
      solution: `SELECT job_title FROM employees NATURAL JOIN jobs
WHERE salary = (SELECT MIN(salary) FROM employees);`,
    },
    {
      id: 'sub-4', type: 'pg', title: 'Nested subqueries',
      prompt: `List the **last name, job title** and **salary** of all employees who have **the same job as the lowest-paid employee**.`,
      hints: ['`WHERE job_id = (SELECT job_id FROM employees WHERE salary = (SELECT MIN(salary) FROM employees))`'],
      solution: `SELECT last_name AS "Név", job_title AS "Munkakör", salary AS "Fizetés"
FROM employees NATURAL JOIN jobs
WHERE job_id = (SELECT job_id FROM employees
                WHERE salary = (SELECT MIN(salary) FROM employees));`,
    },
    {
      id: 'sub-5', type: 'pg', title: 'Gyakorlat 30',
      prompt: `For every employee list the **last name, salary, job id** and the **total salary of everybody in that job**. Order by **job id**, then **last name**.`,
      hints: ['Inline view: `SELECT job_id, SUM(salary) osszfizu FROM employees GROUP BY job_id`.'],
      solution: `SELECT e.last_name, e.salary, e.job_id, s.osszfizu
FROM employees e
  JOIN (SELECT job_id, SUM(salary) AS osszfizu FROM employees GROUP BY job_id) s ON e.job_id = s.job_id
ORDER BY e.job_id, e.last_name;`,
    },
    {
      id: 'sub-6', type: 'pg', title: 'Gyakorlat 31',
      prompt: `Same as the previous one, but show the **department name, last name, salary, job title** and the **job's total salary**. Order by **job title**, then **last name**. (Employees without a department can be dropped.)`,
      hints: ['Join departments (USING department_id), jobs, and the inline view.'],
      solution: `SELECT department_name, last_name, salary, job_title, osszfizu
FROM employees INNER JOIN departments USING (department_id)
  NATURAL JOIN jobs
  NATURAL JOIN (SELECT job_id, SUM(salary) AS osszfizu FROM employees GROUP BY job_id) s
ORDER BY job_title, last_name;`,
    },
    {
      id: 'sub-7', type: 'pg', title: 'Gyakorlat 32 – above the department average',
      prompt: `List the **last name, salary** and **department name** of employees who earn **more than the average salary of their own department**. Order by **salary descending**.\n\n*(This one is on the sample ZH, too!)*`,
      hints: ['Inline view with department averages, OR a correlated subquery in WHERE.', 'Then join departments for the name.'],
      solution: `SELECT e.last_name, e.salary, d.department_name
FROM employees e
  JOIN departments d ON e.department_id = d.department_id
  JOIN (SELECT department_id, AVG(salary) AS atlag FROM employees GROUP BY department_id) a
    ON e.department_id = a.department_id
WHERE e.salary > a.atlag
ORDER BY e.salary DESC;`,
    },
    {
      id: 'sub-8', type: 'pg', title: 'Gyakorlat 33/a – at most half the max',
      prompt: `List the **full name, salary** and **department name** of employees who earn **at most half** of the **highest salary in their department**.`,
      hints: ['Inline view with `MAX(salary)` per department; condition `e.salary <= m.maxfiz / 2`.'],
      solution: `SELECT e.first_name || ' ' || e.last_name AS nev, e.salary, d.department_name
FROM employees e
  JOIN departments d ON e.department_id = d.department_id
  JOIN (SELECT department_id, MAX(salary) AS maxfiz FROM employees GROUP BY department_id) m
    ON e.department_id = m.department_id
WHERE e.salary <= m.maxfiz / 2;`,
    },
    {
      id: 'sub-9', type: 'pg', title: 'Gyakorlat 33/b – managers and their teams',
      prompt: `List the **managers' last name**, their **job id**, their **department name**, the **number of their direct subordinates** and the **total salary of those subordinates**. Order by that **total descending**.`,
      hints: ['Inline view over employees grouped by manager_id: COUNT(*), SUM(salary).', 'Join it to employees (the manager row) on employee_id = manager_id, then to departments.'],
      solution: `SELECT m.last_name, m.job_id, d.department_name, s.db, s.ossz
FROM employees m
  JOIN (SELECT manager_id, COUNT(*) AS db, SUM(salary) AS ossz FROM employees GROUP BY manager_id) s
    ON s.manager_id = m.employee_id
  JOIN departments d ON m.department_id = d.department_id
ORDER BY s.ossz DESC;`,
    },
    {
      id: 'sub-10', type: 'pg', title: 'WITH – above-average departments',
      prompt: `Using **WITH**, list the **names** and **total salary cost** of departments whose total salary cost is **above the average of the departments' total costs** (average rounded to an integer). Order by **department name**.`,
      hints: ['CTE 1: per department name the SUM(salary). CTE 2: ROUND(AVG(...)) over CTE 1.', 'Final query: rows of CTE 1 where dsum > (SELECT average FROM CTE 2).'],
      solution: `WITH dept_sums AS (
  SELECT department_name, SUM(salary) AS dsum
  FROM employees INNER JOIN departments USING (department_id)
  GROUP BY department_name
),
avg_cost AS (
  SELECT ROUND(AVG(dsum)) AS average FROM dept_sums
)
SELECT * FROM dept_sums
WHERE dsum > (SELECT average FROM avg_cost)
ORDER BY department_name;`,
      require: [['^\\s*WITH\\b', 'Solve it with subquery factoring: start the query with WITH.']],
    },
    {
      id: 'sub-11', type: 'pg', title: 'WITH – above both averages',
      prompt: `Using **WITH**, list the **first name, last name** and **salary** of employees whose salary is higher than **both** the average of their **department** and the average of their **job**.`,
      hints: ['Two CTEs: dept averages and job averages. Join both to employees.'],
      solution: `WITH dept_avg AS (SELECT department_id, AVG(salary) AS davg FROM employees GROUP BY department_id),
     job_avg  AS (SELECT job_id, AVG(salary) AS javg FROM employees GROUP BY job_id)
SELECT e.first_name, e.last_name, e.salary
FROM employees e
  JOIN dept_avg d ON e.department_id = d.department_id
  JOIN job_avg j ON e.job_id = j.job_id
WHERE e.salary > d.davg AND e.salary > j.javg;`,
      require: [['^\\s*WITH\\b', 'Solve it with WITH (subquery factoring).']],
    },
    {
      id: 'sub-12', type: 'pg', title: 'EXISTS',
      prompt: `List the **names of departments** that have **at least one employee earning more than 10 000**. Use **EXISTS**.`,
      hints: ['`WHERE EXISTS (SELECT 1 FROM employees e WHERE e.department_id = d.department_id AND e.salary > 10000)`'],
      solution: `SELECT department_name FROM departments d
WHERE EXISTS (SELECT 1 FROM employees e WHERE e.department_id = d.department_id AND e.salary > 10000);`,
      require: [['\\bEXISTS\\b', 'Use EXISTS.']],
    },
  ],
};
