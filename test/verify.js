// Self-test: every reference solution must pass its own check, and a set of
// typical wrong answers must fail.   Run:  npm test
import { PgEngine } from '../engines/pg.js';
import { grade } from '../engines/grade.js';
import fs from 'fs';
import path from 'path';
import { modules, exerciseById, datasets, overlays, LANGUAGES, contentFor } from '../content/index.js';
import { TESTS_HU } from '../engines/messages.js';

const pg = new PgEngine();
await pg.init();
const ctx = { pg, datasets };

let ok = 0, bad = 0;
const fail = (msg) => { bad++; console.log('  ✗ ' + msg); };

console.log('Reference solutions:');
for (const m of modules) {
  for (const ex of m.exercises) {
    if (ex.type === 'quiz') {
      if (!Array.isArray(ex.options) || ex.answer === undefined || !ex.options[ex.answer]) fail(`${ex.id}: malformed quiz`); else ok++;
      continue;
    }
    if (ex.type === 'card') { if (!ex.answerText) fail(`${ex.id}: card without answer`); else ok++; continue; }
    try {
      const r = await grade(ex, ex.solution, ctx);
      if (r.pass) ok++;
      else fail(`${ex.id}: ${r.message} ${r.detail || ''}`);
    } catch (e) {
      fail(`${ex.id}: threw ${e.message}`);
    }
  }
}

// Wrong answers that must be rejected (and correct alternatives that must be accepted)
const cases = [
  ['sel-5', `SELECT first_name, commission_pct * salary FROM employees WHERE commission_pct * salary > 2000`, true],
  ['sel-5', `SELECT first_name, COALESCE(commission_pct, 0) * salary AS j FROM employees WHERE COALESCE(commission_pct, 0) * salary > 2000`, true],
  ['sel-5', `SELECT first_name, salary FROM employees WHERE salary > 2000`, false],
  ['sel-7', `SELECT first_name || ' ' || last_name, job_id, salary FROM employees WHERE salary < 5000 ORDER BY salary`, false],
  ['sel-7', `SELECT salary, job_id, first_name || ' ' || last_name FROM employees WHERE salary < 5000 ORDER BY 1 DESC`, true],
  ['sel-7', `SELECT first_name || ' ' || last_name, job_id, salary FROM employees WHERE salary < 5000 ORDER BY salary DESC, last_name DESC`, true],
  ['sel-10', `SELECT first_name, last_name FROM employees WHERE first_name LIKE '%EV%'`, false],
  ['sel-10', `SELECT first_name, last_name FROM employees WHERE first_name ILIKE '%ev%'`, true],
  ['sel-20', `SELECT first_name FROM employees WHERE SUBSTR(first_name, -1, 1) = 'n'`, false],
  ['sel-20', `SELECT first_name FROM employees WHERE first_name LIKE '%n'`, true],
  ['join-9', `SELECT e.employee_id, e.last_name, e.department_id, d.department_name FROM employees e JOIN departments d ON e.department_id = d.department_id`, false],
  ['join-12', `SELECT department_name FROM departments WHERE department_id NOT IN (SELECT department_id FROM employees WHERE department_id IS NOT NULL)`, true],
  ['grp-10', `SELECT c.country_name, COUNT(*) FROM countries c LEFT JOIN locations l ON l.country_id = c.country_id LEFT JOIN departments d ON d.location_id = l.location_id GROUP BY c.country_name ORDER BY 2 DESC, 1`, false],
  ['grp-13', `SELECT department_name, AVG(salary) FROM employees JOIN departments USING (department_id) GROUP BY department_name HAVING AVG(salary) > 9000 ORDER BY 2`, false],
  ['sub-7', `SELECT e.last_name, e.salary, d.department_name FROM employees e JOIN departments d USING (department_id) WHERE e.salary > (SELECT AVG(salary) FROM employees) ORDER BY 2 DESC`, false],
  ['sub-10', `SELECT department_name, SUM(salary) FROM employees JOIN departments USING (department_id) GROUP BY department_name HAVING SUM(salary) > 30000 ORDER BY 1`, false],
  ['ddl-4', `ALTER TABLE kutyusok ADD CONSTRAINT k_pk PRIMARY KEY (id); ALTER TABLE kutyusok ADD (email VARCHAR2(20) UNIQUE);`, false],
  ['ddl-4', `ALTER TABLE kutyusok ADD PRIMARY KEY (id);
ALTER TABLE kutyusok ADD CHECK (nem BETWEEN 0 AND 1);
ALTER TABLE kutyusok ALTER COLUMN nev SET NOT NULL;
ALTER TABLE kutyusok ADD FOREIGN KEY (gazd_id) REFERENCES employees;
ALTER TABLE kutyusok ADD COLUMN email varchar(20) UNIQUE;`, true],
  ['ddl-6', `CREATE SEQUENCE seq_tab; CREATE TABLE tab (id integer PRIMARY KEY, name varchar(16) NOT NULL); INSERT INTO tab VALUES (nextval('seq_tab'), 'ABC'), (nextval('seq_tab'), 'CBA');`, true],
  ['ddl-12', `ALTER TABLE employees2 ADD COLUMN income text; UPDATE employees2 SET income = CASE WHEN salary > 2500 THEN 'HIGH' ELSE 'LOW' END;`, false],
  ['ddl-13', `UPDATE employees2 SET salary = salary * 1.1 WHERE salary < 10000;`, false],
  ['plan-4', `CREATE INDEX emp_upper_last_ix ON employees (last_name);`, false],
  ['pga-2', `CREATE TABLE kurzusok (kurzus_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, nev text NOT NULL, cimkek text[] NOT NULL DEFAULT ARRAY[]::text[]);`, true],
  ['pga-2', `CREATE TABLE kurzusok (kurzus_id serial PRIMARY KEY, nev text NOT NULL, cimkek text[] DEFAULT '{}');`, false],
  ['pga-4', `SELECT nev, array_length(cimkek, 1) AS cimkek_szama FROM kurzusok WHERE cimkek @> ARRAY['sql'] ORDER BY nev`, true],
  ['pga-5', `UPDATE kurzusok SET cimkek = cimkek || 'gyakorlat'::text WHERE nev = 'SQL alapok'`, true],
  ['pga-5', `UPDATE kurzusok SET cimkek = array_prepend('gyakorlat', cimkek) WHERE nev = 'SQL alapok'`, false],
  ['pga-16', `SELECT e.first_name || ' ' || e.last_name, t.course_name, t.feedback->>'rating' FROM employee_trainings t JOIN employees e USING (employee_id) WHERE t.feedback @> '{"mode":"online"}' AND (t.feedback->>'rating')::int >= 4`, true],
  ['pga-18', `UPDATE employee_trainings SET feedback = '{"rating":5}' WHERE course_name = 'Linux alapok'`, false],
  ['pgb-7', `SELECT employee_id, NVL(commission_pct, 0) AS commission FROM hr.employees WHERE employee_id = 103`, false],
  ['r-3', `SET lab:flash villanas\nTTL lab:flash`, false],
  ['r-3', `SETEX lab:flash 15 villanas\nTTL lab:flash`, true],
  ['r-11', `SADD sql Csilla Anna\nSADD python Bela Anna\nSINTER python sql`, true],
  ['r-13', `ZADD ranglista 50 Anna 40 Bela 70 Csilla\nZRANGE ranglista 0 1 WITHSCORES`, false],
  ['r-13', `ZADD ranglista 50 Anna 40 Bela 70 Csilla\nZRANGE ranglista 0 1 REV WITHSCORES`, true],
  ['r-15', `HSET diak:101 nev Anna pont 45\nHGETALL diak:101`, false],
  ['r-15', `HSET diak:101 nev Anna\nHSET diak:101 pont 40\nHINCRBY diak:101 pont 5\nHGETALL diak:101`, true],
  ['m-3', `db.Users.find({ active: true }, { name: 1, city: 1 })`, false],
  ['m-4', `db.Users.find().sort({ age: 1 }).limit(2)`, false],
  ['m-10', `db.Users.find({ name: /^S/ })`, true],
  ['m-14', `db.Users.find({ scores: { $gt: 4, $lt: 6 } })`, false],
  ['m-16', `db.Users.find({ age: { $gt: 24 }, $or: [{ hobbies: "film" }, { hobbies: "olvasás" }] }, { _id: 0, age: 1, name: 1 }).sort({ age: -1 })`, true],
  ['m-22', `db.Users.updateOne({ name: "Sanyi" }, { $set: { address: { number: 15 } } })`, false],
  ['m-zh-a', `db.termekek.insertOne({ nev: "Adatbázisok könyv", kategoria: "konyv", ar: "8500", raktaron: true, cimkek: ["tanulas", "sql"] })`, false],
  ['a-9', `db.orders.aggregate([{ $match: { status: "paid" } }, { $group: { _id: "$customerId", totalSpent: { $sum: "$total" } } }])`, false],
  ['zh-5d', `db.termekek.aggregate([{ $match: { raktaron: true } }, { $group: { _id: "$kategoria", darab: { $sum: 1 }, atlag: { $avg: "$ar" } } }, { $sort: { atlag: -1 } }])`, true],
  ['zh-1b', `SELECT d.department_name, COUNT(*), ROUND(AVG(e.salary)) FROM employees e JOIN departments d USING (department_id) GROUP BY d.department_name HAVING COUNT(*) >= 5 AND AVG(e.salary) > 6000 ORDER BY 3 DESC`, true],
  ['i-1', `def search_postgres(keyword):\n    con = pg_connect()\n    cur = con.cursor()\n    cur.execute(f"SELECT id, title, teacher FROM kurzuslabor.courses WHERE title ILIKE '%{keyword}%' ORDER BY title LIMIT 20")\n    rows = cur.fetchall()\n    cur.close(); con.close()\n    return rows`, false],
  ['i-1', `def search_postgres(keyword):\n    con = pg_connect()\n    cur = con.cursor()\n    cur.execute("SELECT id, title, teacher FROM kurzuslabor.courses WHERE title ILIKE %s ORDER BY title LIMIT 20", ('%' + keyword + '%',))\n    rows = [dict(id=a, title=b, teacher=c) for a, b, c in cur.fetchall()]\n    cur.close()\n    con.close()\n    return rows`, true],
];
console.log('\nAlternative / wrong answers:');
for (const [id, code, shouldPass] of cases) {
  const ex = exerciseById.get(id);
  if (!ex) { fail(`unknown case ${id}`); continue; }
  try {
    const r = await grade(ex, code, ctx);
    if (r.pass === shouldPass) ok++;
    else fail(`${id}: expected ${shouldPass ? 'PASS' : 'FAIL'} but got ${r.pass ? 'PASS' : 'FAIL'} – ${r.message} ${r.detail || ''}\n      code: ${code.replace(/\n/g, ' ')}`);
  } catch (e) { fail(`${id}: threw ${e.message}`); }
}

// ---------------------------------------------------------------- translations
console.log('\nTranslations:');
for (const lang of LANGUAGES.filter((l) => l !== 'en')) {
  const ov = overlays[lang];
  for (const id of Object.keys(ov)) if (!modules.find((m) => m.id === id)) fail(`${lang}: overlay for unknown module ${id}`);
  for (const m of modules) {
    const mo = ov[m.id];
    if (!mo) { fail(`${lang}: no overlay for module ${m.id}`); continue; }
    if (!mo.title || !mo.lab) fail(`${lang}/${m.id}: module title/lab missing`);
    if (m.lesson && !fs.existsSync(path.join('content', 'lessons', lang, m.lesson))) fail(`${lang}: lesson ${m.lesson} missing`);
    for (const id of Object.keys(mo.exercises || {})) if (!exerciseById.has(id)) fail(`${lang}/${m.id}: unknown exercise ${id}`);
    for (const ex of m.exercises) {
      const o = (mo.exercises || {})[ex.id];
      if (!o) { fail(`${lang}: ${ex.id} not translated`); continue; }
      const probs = [];
      if (!o.title) probs.push('title');
      if (!o.prompt) probs.push('prompt');
      for (const k of ['hints', 'options']) if (ex[k] && (!o[k] || o[k].length !== ex[k].length)) probs.push(`${k} (${o[k]?.length ?? 0}/${ex[k].length})`);
      for (const k of ['require', 'forbid']) if (ex[k] && (!o[k] || o[k].length !== ex[k].length)) probs.push(`${k} messages (${o[k]?.length ?? 0}/${ex[k].length})`);
      for (const k of ['explain', 'answerText', 'checkMsg']) if (ex[k] && !o[k]) probs.push(k);
      if (probs.length) fail(`${lang}: ${ex.id} missing ${probs.join(', ')}`); else ok++;
    }
  }
}
// every behaviour-test name must have a Hungarian label
for (const ex of exerciseById.values()) {
  for (const m of String(ex.check || '').matchAll(/INSERT INTO _checks VALUES \(\d+, '((?:[^']|'')*)'/g)) {
    const name = m[1].replace(/''/g, "'");
    if (!TESTS_HU[name]) fail(`hu: behaviour test name not translated: "${name}" (${ex.id})`);
  }
}
// grading in Hungarian returns Hungarian feedback
{
  const huEx = contentFor('hu').byId.get('sel-4');
  const r = await grade(huEx, 'SELECT last_name FROM employees', { ...ctx, lang: 'hu' });
  if (!r.pass && /oszlopot vártunk/.test(r.message)) ok++; else fail(`hu feedback not Hungarian: ${r.message}`);
  const r2 = await grade(contentFor('hu').byId.get('sub-10'), 'SELECT 1', { ...ctx, lang: 'hu' });
  if (/WITH-tel kezdődjön/.test(r2.message)) ok++; else fail(`hu require message not used: ${r2.message}`);
}

const total = modules.reduce((a, m) => a + m.exercises.length, 0);
console.log(`\n${ok} ok, ${bad} failed  (${modules.length} modules, ${total} exercises)`);
process.exit(bad ? 1 : 0);
