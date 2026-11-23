# Táblák összekapcsolása (1. labor)

A dolgozó neve az `employees`, a részleg neve a `departments` táblában van. Hogy mindkettőt lássuk, a két táblát az
egyező értékek alapján **összekapcsoljuk** (`employees.department_id = departments.department_id`).

## Klasszikus (Oracle) szintaxis: feltétel a WHERE-ben

```sql
SELECT first_name, last_name, department_name
FROM employees e, departments d
WHERE e.department_id = d.department_id;
```

- Ha egy oszlopnév mindkét táblában szerepel, **jelölnöd kell**, melyikből veszed: `e.department_id`.
- Ökölszabály: **n táblához n−1 összekapcsolási feltétel** kell. Feltétel nélkül **Descartes-szorzatot** kapsz: minden sor minden sorral párosul.

## ANSI JOIN szintaxis

```sql
-- ON: tetszőleges feltétel
SELECT e.last_name, d.department_name
FROM employees e INNER JOIN departments d ON e.department_id = d.department_id;

-- USING: ha az oszlop neve mindkét oldalon ugyanaz (ilyenkor NE írj elé táblanevet!)
SELECT last_name, job_id, department_id, department_name
FROM employees INNER JOIN departments USING (department_id);

-- az összekapcsolások egymás után fűzhetők
SELECT e.last_name, l.city
FROM employees e
  JOIN departments d ON e.department_id = d.department_id
  JOIN locations   l ON d.location_id   = l.location_id;
```

## Önmagával összekapcsolás (self-join)

A tábla önmagával kapcsolódik, pl. dolgozó és a főnöke. Két aliast használj:

```sql
SELECT e.last_name AS beosztott, m.last_name AS fonok
FROM employees e JOIN employees m ON e.manager_id = m.employee_id;
```

## Külső összekapcsolások

| Összekapcsolás | Mit tart meg |
|---|---|
| `INNER JOIN` | csak azokat a sorokat, amelyeknek van párja a másik táblában |
| `LEFT [OUTER] JOIN` | a **bal** oldali tábla minden sorát (hiányzó pár → NULL-ok) |
| `RIGHT [OUTER] JOIN` | a **jobb** oldali tábla minden sorát |
| `FULL [OUTER] JOIN` | **mindkét** tábla minden sorát |

```sql
-- minden dolgozó, Kimberely Grant is, aki nem tartozik részleghez
SELECT e.employee_id, e.last_name, e.department_id, d.department_name
FROM employees e LEFT JOIN departments d ON e.department_id = d.department_id;
```

### Halmazkülönbség külső összekapcsolással

- **A \ B**: A azon sorai, amelyeknek nincs párja B-ben → `A LEFT JOIN B ... WHERE B.kulcs IS NULL`
- **B \ A**: `A RIGHT JOIN B ... WHERE A.kulcs IS NULL`

```sql
-- részlegek, ahol senki sem dolgozik
SELECT d.department_name
FROM employees e RIGHT JOIN departments d ON e.department_id = d.department_id
WHERE e.department_id IS NULL;
```

> Az opcionális oldal **kulcsára** szűrj (`e.employee_id IS NULL`), ne olyan oszlopra, ami egyébként is lehet NULL.

## NATURAL JOIN

A `NATURAL JOIN` automatikusan **az összes azonos nevű oszlop** alapján kapcsol. Kényelmes, de a HR sémában csapda:

- az `employees NATURAL JOIN departments` a `department_id` **és** a `manager_id` alapján kapcsol, ami hibás.
- az `employees NATURAL JOIN job_history` a `job_id` alapján is kapcsol.
- az `employees NATURAL JOIN jobs` rendben van (csak a `job_id` közös).
