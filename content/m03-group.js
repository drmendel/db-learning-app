export default {
  id: 'group',
  title: 'GROUP BY & HAVING',
  lab: 'Labs 1–3',
  engine: 'pg',
  lesson: '03-group.md',
  exercises: [
    {
      id: 'grp-1', type: 'pg', title: 'Aggregates on the whole table',
      prompt: `In one row, show the **average salary**, the **highest commission_pct** and the **number of employees**.`,
      hints: ['`SELECT AVG(salary), MAX(commission_pct), COUNT(*) FROM employees`'],
      solution: `SELECT AVG(salary), MAX(commission_pct), COUNT(*) FROM employees;`,
    },
    {
      id: 'grp-2', type: 'pg', title: 'Highest salary per department',
      prompt: `For every **department id** show the **highest salary**.`,
      hints: ['`GROUP BY department_id`'],
      solution: `SELECT department_id, MAX(salary) FROM employees GROUP BY department_id;`,
    },
    {
      id: 'grp-3', type: 'pg', title: 'Lowest income per job',
      prompt: `Income = \`salary * (1 + commission_pct)\`, where a missing commission counts as 0. Show the **lowest income per job id** (job id, lowest income).`,
      hints: ['`MIN(salary * (1 + NVL(commission_pct, 0)))`'],
      solution: `SELECT job_id AS "Munkakör", MIN(salary * (1 + NVL(commission_pct, 0))) AS "Legkisebb"
FROM employees
GROUP BY job_id;`,
    },
    {
      id: 'grp-4', type: 'pg', title: 'Average per manager',
      prompt: `Show the **manager id** and the **average salary** of their direct subordinates, **rounded to 2 decimals**.`,
      hints: ['`ROUND(AVG(salary), 2)`, grouped by `manager_id`.'],
      solution: `SELECT manager_id AS "Főnökazonosító", ROUND(AVG(salary), 2) AS "Átlagfizu"
FROM employees
GROUP BY manager_id;`,
    },
    {
      id: 'grp-5', type: 'pg', title: 'Total salary per department name',
      prompt: `Show the **total salary per department name**, ordered by **department name**.`,
      hints: ['Join departments first, then `GROUP BY department_name`.'],
      solution: `SELECT department_name AS "Részleg", SUM(salary) AS "Összfizetés"
FROM employees INNER JOIN departments USING (department_id)
GROUP BY department_name
ORDER BY department_name;`,
    },
    {
      id: 'grp-6', type: 'pg', title: 'Headcount above 5000',
      prompt: `How many people work in each **job title** with a salary **above 5000**? (job title, headcount)`,
      hints: ['The salary filter is about rows → WHERE, not HAVING.', '`employees NATURAL JOIN jobs` is safe.'],
      solution: `SELECT job_title AS "Munkakör", COUNT(*) AS "Létszám"
FROM employees NATURAL JOIN jobs
WHERE salary > 5000
GROUP BY job_title;`,
    },
    {
      id: 'grp-7', type: 'pg', title: 'COUNT(*) vs COUNT(column)',
      prompt: `Per **job id**, show the **number of employees** and the **number of employees who can receive commission** (commission_pct is not NULL).`,
      hints: ['`COUNT(commission_pct)` counts only non-NULL values.'],
      solution: `SELECT job_id, COUNT(*) AS letszam, COUNT(commission_pct) AS "Jutalékot kaphat"
FROM employees
GROUP BY job_id;`,
    },
    {
      id: 'grp-8', type: 'pg', title: 'Gyakorlat 25 – department stats',
      prompt: `Per **department id** list the **lowest**, the **highest** and the **average salary** and the **headcount**.`,
      hints: ['MIN, MAX, AVG, COUNT(*) in one query.'],
      solution: `SELECT department_id, MIN(salary), MAX(salary), AVG(salary), COUNT(*)
FROM employees
GROUP BY department_id;`,
    },
    {
      id: 'grp-9', type: 'pg', title: 'Gyakorlat 26/a – departments per country',
      prompt: `How many departments are there in each country? Only list countries that **have at least one** department. Columns: **country name, number of departments**; order by **country name**.`,
      hints: ['countries → locations → departments, inner joins.'],
      solution: `SELECT c.country_name, COUNT(*) AS db
FROM countries c
  JOIN locations l ON l.country_id = c.country_id
  JOIN departments d ON d.location_id = l.location_id
GROUP BY c.country_name
ORDER BY c.country_name;`,
    },
    {
      id: 'grp-10', type: 'pg', title: 'Gyakorlat 26/b – every country, zeros too',
      prompt: `Now list **every** country, including those with **0** departments. Order by **count descending**, then **country name ascending**.`,
      hints: ['LEFT JOINs from countries.', '`COUNT(d.department_id)` instead of `COUNT(*)` – otherwise empty countries count as 1!'],
      solution: `SELECT c.country_name, COUNT(d.department_id) AS db
FROM countries c
  LEFT JOIN locations l ON l.country_id = c.country_id
  LEFT JOIN departments d ON d.location_id = l.location_id
GROUP BY c.country_name
ORDER BY db DESC, c.country_name;`,
    },
    {
      id: 'grp-11', type: 'pg', title: 'HAVING – big departments',
      prompt: `List the **id** and **headcount** of departments with **at least 10 employees**.`,
      hints: ['`HAVING COUNT(*) >= 10`'],
      solution: `SELECT department_id, COUNT(*) FROM employees GROUP BY department_id HAVING COUNT(*) >= 10;`,
    },
    {
      id: 'grp-12', type: 'pg', title: 'HAVING – well-paid jobs',
      prompt: `List the **job titles** where the best-paid employee earns **more than 10 000**, together with that **highest salary**.`,
      hints: ['`HAVING MAX(salary) > 10000`'],
      solution: `SELECT job_title, MAX(salary)
FROM employees NATURAL JOIN jobs
GROUP BY job_title
HAVING MAX(salary) > 10000;`,
    },
    {
      id: 'grp-13', type: 'pg', title: 'Gyakorlat 27',
      prompt: `List the **names of departments** whose **average salary is above 9000**, with the average **rounded to an integer**. Order by that average **ascending**.`,
      hints: ['`ROUND(AVG(salary))` in SELECT, `HAVING AVG(salary) > 9000`.'],
      solution: `SELECT department_name, ROUND(AVG(salary)) AS atlag
FROM employees JOIN departments USING (department_id)
GROUP BY department_name
HAVING AVG(salary) > 9000
ORDER BY atlag;`,
    },
    {
      id: 'grp-14', type: 'pg', title: 'Gyakorlat 28',
      prompt: `Per manager (**manager's last name**) list the **total salary of their direct subordinates who receive no commission**, in **descending** order, but only where this total is **more than 20 000**.`,
      hints: ['Self-join employees e (subordinate) with m (manager).', 'Rows filter: `e.commission_pct IS NULL`; group filter: `HAVING SUM(e.salary) > 20000`.'],
      solution: `SELECT m.last_name, SUM(e.salary) AS osszeg
FROM employees e JOIN employees m ON e.manager_id = m.employee_id
WHERE e.commission_pct IS NULL
GROUP BY m.last_name
HAVING SUM(e.salary) > 20000
ORDER BY osszeg DESC;`,
    },
    {
      id: 'grp-15', type: 'pg', title: 'Gyakorlat 29/a – cities',
      prompt: `Which **city** has **more than one department**, and how many?`,
      hints: ['departments JOIN locations, GROUP BY city, HAVING COUNT(*) > 1'],
      solution: `SELECT l.city, COUNT(*)
FROM departments d JOIN locations l ON d.location_id = l.location_id
GROUP BY l.city
HAVING COUNT(*) > 1;`,
    },
    {
      id: 'grp-16', type: 'pg', title: 'Gyakorlat 29/b – job categories',
      prompt: `Treat the **first two characters of the job id** as the job category (AD, AC, IT, …). Per category, show the category and the **average of (max_salary − min_salary)** of its jobs, but only for categories that contain **more than one job**.`,
      hints: ['`SUBSTR(job_id, 1, 2)` – group by the same expression.', '`HAVING COUNT(*) > 1`'],
      solution: `SELECT SUBSTR(job_id, 1, 2) AS kategoria, AVG(max_salary - min_salary) AS atlag_elteres
FROM jobs
GROUP BY SUBSTR(job_id, 1, 2)
HAVING COUNT(*) > 1;`,
    },
  ],
};
