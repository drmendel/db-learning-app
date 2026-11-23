export default {
  title: 'PostgreSQL alapok',
  lab: 'Labor 5',
  exercises: {
    'pgb-1': {
      title: 'person és likes táblák',
      prompt: 'Hozz létre két táblát:\n\n- `person`: `id` (**serial**, elsődleges kulcs), `name` (varchar), `birthdate` (date)\n- `likes` – ki kit kedvel: `id_1` és `id_2`, **mindkettő idegen kulcs a person táblára**.',
      hints: ['`id serial PRIMARY KEY`', '`id_1 integer REFERENCES person(id)`'],
    },
    'pgb-2': {
      title: 'Több soros INSERT',
      prompt: 'Az üres táblák léteznek. Szúrd be ezeket az embereket (az id-ket a `serial` generálja – ebben a sorrendben 1..5 lesznek) és a kedveléseket:\n\n| név | születési dátum |\n|---|---|\n| James | 2001-03-14 |\n| Oliver | 2000-11-02 |\n| Emma | 2002-06-30 |\n| Sophia | 1999-01-21 |\n| Liam | 2001-09-09 |\n\nKedvelések (id_1 kedveli id_2-t): **(2,1), (3,1), (1,2), (4,2), (5,2), (4,3), (5,4)**',
      hints: [`Egy INSERT több sort is tartalmazhat: \`INSERT INTO person (name, birthdate) VALUES ('James', '2001-03-14'), ('Oliver', ...), ...;\``],
    },
    'pgb-3': { title: 'Ki szereti Jamest?', prompt: 'Listázd azoknak a **nevét, akik kedvelik Jamest**.', hints: ['Kapcsold a likes táblát a personhöz az id_1 alapján (aki kedvel), és szűrj arra, hogy a kedvelt személy (id_2) James legyen.', 'A person tábla kétszer kell, vagy egy allekérdezés James azonosítójára.'] },
    'pgb-4': { title: 'Népszerűség', prompt: 'Minden személyhez add meg a **nevét** és azt, hogy **hányan kedvelik** (a 0-t is). Rendezd ez utóbbi szerint **csökkenően**, majd **név** szerint.', hints: ['person LEFT JOIN likes ON person.id = likes.id_2', '`COUNT(l.id_1)`, hogy akit senki sem kedvel, 0-val szerepeljen.'] },
    'pgb-5': { title: 'LIMIT / OFFSET – lapozás', prompt: 'Rendezd a dolgozókat **fizetés szerint csökkenően**, azon belül **vezetéknév szerint növekvően**, és mutasd meg a **3., 4. és 5.** dolgozót (vezetéknév, fizetés).', hints: ['`ORDER BY salary DESC, last_name LIMIT 3 OFFSET 2`'] },
    'pgb-6': {
      title: 'ILIKE',
      prompt: 'Listázd azoknak a dolgozóknak a **kereszt- és vezetéknevét**, akiknek a vezetéknevében bármilyen kis-nagybetűvel szerepel az **„ar”** (pl. Hartstein, Partners, és az „AR”-rel írt nevek is).',
      hints: [`\`last_name ILIKE '%ar%'\``],
      require: ['Itt a PostgreSQL ILIKE operátorát használd.'],
    },
    'pgb-7': {
      title: 'Oracle → PostgreSQL (gyakorló 5)',
      prompt: 'Írd át ezt az Oracle-lekérdezést **PostgreSQL**-re (a `hr.employees` táblát használd kifejezetten):\n\n```sql\nSELECT employee_id, NVL(commission_pct, 0) AS commission\nFROM employees\nWHERE employee_id = 103;\n```',
      hints: ['`COALESCE` az `NVL` helyett.'],
      require: ['Használd a COALESCE-t (a szabványos SQL / PostgreSQL függvényt).', 'Használd a sémával minősített hr.employees nevet.'],
      forbid: ['Az NVL csak Oracle-ben van – a PostgreSQL a COALESCE-t használja. (Ebben az alkalmazásban csak egy kompatibilitási segédfüggvény miatt működik.)'],
    },
    'pgb-8': { title: 'Intervallum-aritmetika', prompt: 'A **60-as részleg** dolgozóinál add meg a **vezetéknevet**, a **belépési dátumot** és a **6 hónapos próbaidő végét** (belépés + 6 hónap).', hints: [`\`hire_date + INTERVAL '6 months'\``] },
    'pgb-9': {
      title: 'UPDATE … FROM',
      prompt: 'Írd át mindenkinek a nevét, **aki Olivert kedveli**, erre: `\'Oliver kedvelője\'`. Használd a PostgreSQL **UPDATE … FROM** szintaxisát.',
      hints: ['`UPDATE person p SET name = ... FROM likes l, person o WHERE ...`', 'Feltételek: l.id_1 = p.id, l.id_2 = o.id, o.name = \'Oliver\''],
      require: ['Az UPDATE … FROM formát használd.'],
    },
    'pgb-10': {
      title: 'ALTER TABLE PostgreSQL-módra',
      prompt: 'Módosítsd a `person` táblát:\n\n1. adj hozzá egy `text` típusú `email` oszlopot,\n2. a `name` típusa legyen `text`,\n3. a `birthdate` legyen **NOT NULL**.',
      hints: ['`ALTER TABLE person ADD COLUMN email text;`', '`ALTER TABLE person ALTER COLUMN name TYPE text;`', '`ALTER TABLE person ALTER COLUMN birthdate SET NOT NULL;`'],
    },
    'pgb-11': {
      title: 'Gyakorlat 32 PostgreSQL-ben',
      prompt: '(Az 5. labor PostgreSQL-ben ismétli a 3. labor feladatát.) Listázd azoknak a **vezetéknevét, fizetését** és **részlegük nevét**, akik többet keresnek a részlegük átlagánál, **fizetés szerint csökkenően**. Most **korrelált allekérdezéssel** próbáld meg.',
      hints: ['`WHERE e.salary > (SELECT AVG(salary) FROM employees x WHERE x.department_id = e.department_id)`'],
    },
  },
};
