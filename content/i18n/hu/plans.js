export default {
  title: 'Végrehajtási tervek és indexek',
  lab: 'Labor 3–4',
  exercises: {
    'plan-1': {
      title: 'Oracle: terv előállítása és megjelenítése',
      prompt: 'Írd le azt a **két Oracle utasítást**, amellyel a\n\n`SELECT last_name, salary FROM employees WHERE employee_id = 106;`\n\nlekérdezés becsült végrehajtási tervét előállítod, majd megjeleníted. *(Ez a ZH 2a feladata – 3 pont.)*',
      hints: ['Először: EXPLAIN PLAN FOR <lekérdezés>', 'Majd: SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);'],
      require: [
        'Az 1. utasítás: EXPLAIN PLAN FOR, utána a lekérdezés.',
        'A megadott lekérdezés tervét készítsd el (WHERE employee_id = 106).',
        'A 2. utasítás jelenítse meg a PLAN_TABLE-t: SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY)',
      ],
    },
    'plan-q1': {
      title: 'Terv olvasása',
      prompt: 'A `SELECT * FROM employees WHERE employee_id = 106;` terve:\n\n```text\n0 SELECT STATEMENT\n1  TABLE ACCESS BY INDEX ROWID  EMPLOYEES\n2   INDEX UNIQUE SCAN           EMP_EMP_ID_PK\n```\n\nMi történik, milyen sorrendben?',
      options: [
        'Beolvassa a teljes táblát, majd employee_id szerint szűr',
        'Megkeresi a 106-ot az elsődleges kulcs indexében → az egy ROWID-t ad → a sort a táblából ezzel a ROWID-vel olvassa be',
        'ROWID alapján olvassa a táblát, majd az indexben ellenőrzi az egyediséget',
        'Az index egy tartományát olvassa, majd minden találatot rendez',
      ],
      explain: 'A legbelső lépéstől olvasd: az INDEX UNIQUE SCAN megkeresi a 106-hoz tartozó egyetlen bejegyzést az egyedi (PK) indexben, és visszaadja a ROWID-jét. A TABLE ACCESS BY INDEX ROWID ezután közvetlenül beolvassa a sort.',
    },
    'plan-q2': {
      title: 'Melyik elérési út?',
      prompt: 'Az `employees.department_id` oszlopon van egy (nem egyedi) index. Melyik művelet jellemző a `SELECT * FROM employees WHERE department_id = 50;` lekérdezésre?',
      options: ['INDEX UNIQUE SCAN', 'INDEX RANGE SCAN', 'INDEX FAST FULL SCAN', 'MERGE JOIN CARTESIAN'],
      explain: 'Egy nem egyedi indexen az egyenlőség több bejegyzésre is illeszkedhet → az index egy tartományát olvassa végig.',
    },
    'plan-q3': {
      title: 'LIKE és indexek',
      prompt: 'A `first_name` oszlopon van index. Miért használhat a `WHERE first_name LIKE \'A%\'` index range scant, a `WHERE first_name LIKE \'%a\'` pedig miért nem?',
      options: [
        'Mert a % nem állhat az elején',
        'Mert az index a kezdő karakterek szerint rendezett; elöl álló helyettesítő karakternél a tartomány kezdőpontja ismeretlen',
        'Mert a LIKE soha nem használ indexet',
        'Mert a második lekérdezés több sort ad vissza',
      ],
      explain: "A B-fa index az értékek első karakterétől kezdve rendezett. Az 'A%' egy összefüggő tartomány ('A'-tól 'B' előttig); a '%a' bárhol lehet.",
    },
    'plan-q4': {
      title: 'TABLE ACCESS FULL vs INDEX RANGE SCAN',
      prompt: 'Melyik állítás IGAZ?',
      options: [
        'Az index range scan mindig gyorsabb a teljes táblaolvasásnál',
        'A teljes táblaolvasás a tábla minden blokkját beolvassa; olcsóbb lehet az indexnél, ha a sorok nagy része kell',
        'Teljes táblaolvasást csak akkor használ, ha a táblán nincs index',
        'Az INDEX RANGE SCAN index sorrendben olvassa végig a teljes táblát',
      ],
      explain: 'Alacsony szelektivitásnál (sok sor) a sok egyblokkos index- és ROWID-olvasás többe kerül, mint egyetlen többblokkos teljes olvasás. Az optimalizáló a költségeket hasonlítja össze.',
    },
    'plan-q5': {
      title: 'INDEX SKIP SCAN',
      prompt: 'Mikor választhat az Oracle INDEX SKIP SCAN-t?',
      options: [
        'Ha a WHERE egy összetett index első oszlopát használja',
        'Ha van összetett index, de a lekérdezés nem hivatkozik az első oszlopára (és annak kevés különböző értéke van)',
        'Ha a táblán nincs index',
        'Csak az ORDERED hinttel',
      ],
      explain: 'Az indexet logikailag felbontja az első oszlop különböző értékei szerint, és mindegyik részindexben a második oszlop alapján keres.',
    },
    'plan-q6': {
      title: 'Összekapcsolási módszerek',
      prompt: '`SELECT employee_id, salary, job_title FROM employees e, jobs j WHERE e.salary < j.max_salary;` – melyik összekapcsolási módszer illik egy ilyen nem egyenlőségen alapuló (non-equi) feltételhez?',
      options: ['Hash join', 'Sort-merge join', 'Index unique scan', 'Nested loops INDEX UNIQUE SCAN-nel'],
      explain: 'A hash joinhoz egyenlőségi feltétel kell. Tartományfeltételnél az optimalizáló jellemzően sort-merge joint (vagy nested loopsot) használ.',
    },
    'plan-q7': {
      title: 'Descartes-szorzat',
      prompt: 'Mikor jelenik meg jellemzően a `MERGE JOIN CARTESIAN` a tervben?',
      options: ['Ha két táblát az elsődleges kulcsuk alapján kapcsolunk össze', 'Ha két tábla között nincs összekapcsolási feltétel (vagy az ORDERED hint rossz sorrendet kényszerít ki)', 'FULL OUTER JOIN esetén', 'Ha a hash tábla nem fér el a memóriában'],
      explain: 'Összekapcsolási feltétel nélkül minden sor minden sorral párosul. Az ORDERED hint rossz FROM-sorrenddel szintén okozhatja.',
    },
    'plan-q8': {
      title: 'Hint szintaxis',
      prompt: 'Melyik egy érvényes Oracle hint, ami teljes táblaolvasást kényszerít ki az `e` aliasú employees táblán?',
      options: ['`SELECT /* +FULL(e) */ * FROM employees e`', '`SELECT /*+ FULL(e) */ * FROM employees e`', '`SELECT * /*+ FULL(employees) */ FROM employees e`', '`SELECT --FULL(e) * FROM employees e`'],
      explain: 'A + jelnek közvetlenül a /* után kell állnia, a megjegyzésnek rögtön a SELECT kulcsszó után kell jönnie, és ha a táblának van aliasa, a hintben az aliast kell használni.',
    },
    'plan-2': {
      title: 'PostgreSQL EXPLAIN',
      prompt: 'Jelenítsd meg PostgreSQL-ben a\n\n`SELECT last_name, salary FROM employees WHERE employee_id = 106;`\n\nbecsült végrehajtási tervét. (Figyeld meg: **Seq Scan**, mert a tábla nagyon kicsi.)',
      hints: ['`EXPLAIN <lekérdezés>` – PostgreSQL-ben nincs PLAN FOR.'],
      require: ['EXPLAIN-t használj (ANALYZE nélkül – az lefuttatja a lekérdezést, és az időzítések minden alkalommal mások).'],
    },
    'plan-3': {
      title: 'Kényszerítsd az indexet',
      prompt: 'Érd el, hogy a PostgreSQL ugyanarra a lekérdezésre az **elsődleges kulcs indexét használó** tervet mutassa: előbb **tiltsd le a szekvenciális olvasást** a munkamenetre, majd futtasd újra az EXPLAIN-t.',
      hints: ['`SET enable_seqscan = off;`', 'Ezt kell látnod: `Index Scan using employees_pkey on employees`.'],
    },
    'plan-4': {
      title: 'Függvény alapú index (ZH 2c)',
      prompt: 'Hozz létre egy `emp_upper_last_ix` nevű indexet, ami gyorsíthatja az `UPPER(last_name) = \'KING\'` feltételt használó lekérdezéseket. *(ZH 2c feladat.)*',
      hints: ['A **kifejezést** indexeld, ne az oszlopot: `CREATE INDEX emp_upper_last_ix ON employees (UPPER(last_name));`'],
      checkMsg: 'A tervező nem tudta használni az indexedet az UPPER(last_name) = \'KING\' feltételhez.',
    },
    'plan-5': {
      title: 'Összekapcsolási módszerek PostgreSQL-ben',
      prompt: 'Nézd meg, milyen összekapcsolási módszert választ a PostgreSQL, ha minden dolgozót összekapcsolunk a részlegével: futtass EXPLAIN-t erre:\n\n`SELECT e.last_name, d.department_name FROM employees e JOIN departments d ON e.department_id = d.department_id;`',
      hints: ['Hash Joint kell látnod: a kisebb táblából (departments) hash tábla készül.'],
    },
    'plan-c1': {
      title: 'Kardinalitás és költség',
      prompt: 'Definiáld a végrehajtási tervben szereplő **cardinality** (kardinalitás) és **cost** (költség) fogalmakat. (ZH 7)',
      answerText: '**Kardinalitás** (Rows): egy tervlépés által visszaadott sorok becsült száma. **Költség**: az optimalizáló becslése a lépés és gyermekei erőforrásigényére (I/O, CPU, memória). Relatív egység a tervek összehasonlítására; a CBO a legkisebb költségű tervet választja.',
    },
    'plan-c2': {
      title: 'Hard és soft parse',
      prompt: 'Milyen lépésekből áll az SQL-utasítások feldolgozása Oracle-ben, és mi a különbség a hard és a soft parse között?',
      answerText: 'Elemzés/parse (szintaktikai ellenőrzés, szemantikai ellenőrzés, shared pool ellenőrzés) → optimalizálás (a CBO terveket készít és kiválasztja a legolcsóbbat) → sorforrás-generálás → végrehajtás. **Soft parse**: egy azonos utasítás már szerepel a shared poolban (library cache), így a terve újrahasznosítható. **Hard parse**: nincs ott, ezért az utasítást optimalizálni kell, és új terv készül – ez drága. A kötött változók (bind variables) segítik a tervek újrahasznosítását.',
    },
  },
};
