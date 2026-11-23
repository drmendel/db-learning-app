export default {
  title: 'DDL, megszorítások, DML, nézetek',
  lab: 'Labor 1–2',
  exercises: {
    'ddl-1': { title: 'Tábla másolása (CTAS)', prompt: 'Hozz létre egy `employees3` nevű táblát egy lekérdezés alapján, ami az **5000 USD-nál többet** kereső dolgozókat tartalmazza (minden oszloppal).', hints: ['`CREATE TABLE employees3 AS SELECT ...`'] },
    'ddl-2': {
      title: 'Gyakorlat 18 – CREATE TABLE kutya',
      prompt: 'Hozd létre a következő táblát `kutya` néven (pontosan ezekkel az oszlopnevekkel):\n\n- `id`: legfeljebb 3 jegyű egész szám\n- `nev`: legfeljebb 20 karakter hosszú szöveg\n- `nem`: legfeljebb 1 jegyű egész szám\n- `szuldatum`: dátum',
      hints: ['Oracle típusok: NUMBER(3), VARCHAR2(20), NUMBER(1), DATE – itt is működnek.'],
    },
    'ddl-3': {
      title: 'Gyakorlat 19 – ALTER + RENAME',
      prompt: 'Az előző feladat `kutya` táblája már létezik.\n\n1. Adj hozzá egy `gazd_id` oszlopot, ami legfeljebb 6 jegyű egész számot tartalmaz.\n2. Nevezd át a táblát `kutyusok`-ra.',
      hints: ['`ALTER TABLE kutya ADD (gazd_id NUMBER(6));` (Oracle) vagy `ADD COLUMN gazd_id numeric(6)` (PG)', '`RENAME kutya TO kutyusok;` (Oracle) vagy `ALTER TABLE kutya RENAME TO kutyusok;`'],
    },
    'ddl-4': {
      title: 'Gyakorlat 20 – megszorítások ALTER-rel',
      prompt: 'A `kutyusok(id, nev, nem, szuldatum, gazd_id)` tábla létezik. **ALTER TABLE** utasításokkal állítsd be:\n\n- elsődleges kulcs: `id`\n- a `nem` csak **0 vagy 1** lehet\n- a `nev` nem maradhat üresen (NULL)\n- idegen kulcs: `gazd_id` → `employees(employee_id)`\n- adj hozzá egy új `email` oszlopot (szöveg, max. 20) **UNIQUE** megszorítással\n\nAz ellenőrző jó és rossz sorokat próbál beszúrni, hogy tesztelje a megszorításaidat.',
      hints: ['`ALTER TABLE kutyusok ADD CONSTRAINT k_pk PRIMARY KEY (id);`', '`... ADD CONSTRAINT k_ck CHECK (nem IN (0, 1));`', '`... ADD CONSTRAINT k_fk FOREIGN KEY (gazd_id) REFERENCES employees (employee_id);`', '`ALTER TABLE kutyusok ADD (email VARCHAR2(20) UNIQUE);`'],
    },
    'ddl-5': {
      title: 'Gyakorlat 20 – egyetlen CREATE TABLE-lel',
      prompt: 'Végezd el ugyanezt **egyetlen CREATE TABLE** utasítással. A tábla neve `kutyusok2`; oszlopai: `id`, `nev`, `nem`, `szuldatum`, `gazd_id`, `email`, ugyanazokkal a megszorításokkal.',
      hints: ['Inline: `id NUMBER(3) PRIMARY KEY`, `nev VARCHAR2(20) NOT NULL`, `nem NUMBER(1) CHECK (nem IN (0,1))`, `gazd_id NUMBER(6) REFERENCES employees(employee_id)`, `email VARCHAR2(20) UNIQUE`'],
    },
    'ddl-6': {
      title: 'Szekvencia',
      prompt: '1. Hozz létre egy `seq_tab` szekvenciát, ami 1-től indul és 1-esével nő.\n2. Hozz létre egy `tab` táblát `id` (szám, elsődleges kulcs) és `name` (max. 16 karakteres szöveg, NOT NULL) oszlopokkal.\n3. Szúrj be két sort úgy, hogy az id-t **a szekvencia** adja: először `\'ABC\'`, majd `\'CBA\'`.\n\n*(Máshol ne hívd meg a NEXTVAL-t, különben elhasználsz egy számot!)*',
      hints: ['`CREATE SEQUENCE seq_tab START WITH 1 INCREMENT BY 1;`', `\`INSERT INTO tab (id, name) VALUES (seq_tab.NEXTVAL, 'ABC');\` – PG-ben: \`nextval('seq_tab')\``],
      require: ['Az azonosítókat a szekvenciával (NEXTVAL / nextval) generáld.'],
    },
    'ddl-7': {
      title: 'DML – előkészületek',
      prompt: 'Készíts másolatokat a DML-feladatokhoz:\n\n1. `employees2` = a teljes `employees` tábla másolata, `departments2` = a `departments` másolata.\n2. A `departments2`-ben elsődleges kulcs a `department_id`, az `employees2`-ben az `employee_id`.\n3. Idegen kulcs: `employees2.department_id` → `departments2`.\n4. Az `employees2`-ben a `last_name` nem lehet üres, és a **fizetés legalább 700** dollár legyen.',
      hints: ['Kétszer CTAS, majd négyszer ALTER TABLE … ADD CONSTRAINT.', '`CHECK (last_name IS NOT NULL AND salary >= 700)`'],
    },
    'ddl-8': { title: 'INSERT – új részleg', prompt: '(Az employees2 / departments2 táblák elő vannak készítve.) Helyezz el a `departments2` táblában egy új részleget: azonosító **42**, név **SAJTKÉSZÍTŐ**, telephely **1000** (vezető nélkül).', hints: ['Sorold fel a kitöltött oszlopokat: `INSERT INTO departments2 (department_id, department_name, location_id) VALUES (...)`'] },
    'ddl-9': {
      title: 'INSERT – új dolgozók',
      prompt: 'A 42-es részleg már létezik. Szúrj be két dolgozót az `employees2` táblába (fizetés még nélkül):\n\n| azonosító | keresztnév | vezetéknév | email | belépés | részleg | munkakör |\n|---|---|---|---|---|---|---|\n| 1111 | Ödön | Bőrönd | bodon | 2018.10.15 | 42 | AC_MGR |\n| 1112 | Izolda | Huncut | hizolda | 2018.03.01 | 42 | SA_MAN |',
      hints: [`Dátumok: \`TO_DATE('2018.10.15', 'YYYY.MM.DD')\``, 'Az INSERT-ben sorold fel az oszlopokat.'],
    },
    'ddl-10': {
      title: 'UPDATE – Ödön fizetést kap',
      prompt: 'Ödönnek (1111) még nincs fizetése és főnöke. Adj neki **8500** fizetést, **100**-as főnököt és **10%** (0.1) jutalékot.\n\n*(Utána Futtatás módban próbáld meg 650-re állítani a fizetését – mi történik és miért?)*',
      hints: ['`UPDATE employees2 SET salary = 8500, manager_id = 100, commission_pct = 0.1 WHERE employee_id = 1111;`', 'Mindig adj meg WHERE feltételt – különben minden sor megváltozik!'],
    },
    'ddl-11': { title: 'Gyakorlat 21 – kártyaszámok', prompt: 'Adj az `employees2` táblához egy `cardnumber` (5 jegyű szám) oszlopot, és töltsd ki mindenkinél: **cardnumber = 10000 + employee_id**.', hints: ['ALTER TABLE … ADD, majd egy WHERE nélküli UPDATE (most tényleg minden sort módosítani akarunk).'] },
    'ddl-12': {
      title: 'Gyakorlat 22 – jövedelemkategória',
      prompt: 'Adj az `employees2` táblához egy `income` szöveges oszlopot: értéke **\'HIGH\'**, ha a fizetés **2500 feletti**, egyébként **\'LOW\'**. Megszorítással biztosítsd, hogy csak ez a két érték szerepelhessen.',
      hints: [`UPDATE CASE-szel: \`SET income = CASE WHEN salary > 2500 THEN 'HIGH' ELSE 'LOW' END\``, `\`ALTER TABLE employees2 ADD CONSTRAINT income_ck CHECK (income IN ('HIGH', 'LOW'))\``],
    },
    'ddl-13': {
      title: 'Gyakorlat 23 – fizetésemelés',
      prompt: 'Az `employees2` táblában:\n\n1. Kapjon **10% fizetésemelést** minden olyan dolgozó, akinek a fizetése **10 000 alatt** van, és **nem kaphat jutalékot**.\n2. Emeld meg **10%-kal** minden **80-as részlegben** dolgozó **jutalékát**.',
      hints: ['`UPDATE employees2 SET salary = salary * 1.1 WHERE salary < 10000 AND commission_pct IS NULL;`', '`UPDATE employees2 SET commission_pct = commission_pct * 1.1 WHERE department_id = 80;`'],
    },
    'ddl-14': {
      title: 'DELETE – megszűnik a sajtkészítés',
      prompt: 'A 42-es részlegnek (SAJTKÉSZÍTŐ) két dolgozója van: Ödön (1111, AC_MGR) és Izolda (1112, SA_MAN).\n\n1. Bocsásd el Ödönt (töröld az `employees2`-ből).\n2. Törölj **minden Sales Managert** (`SA_MAN`) az `employees2`-ből.\n3. Töröld a 42-es részleget a `departments2`-ből.\n\n*(Próbáld meg Futtatás módban előbb a 42-es részleget törölni – miért nem sikerül?)*',
      hints: ['Az idegen kulcs megakadályozza egy olyan részleg törlését, amelyben még vannak dolgozók.', `\`DELETE FROM employees2 WHERE UPPER(job_id) = 'SA_MAN';\``],
    },
    'ddl-15': {
      title: 'Gyakorlat 24/a – nézet',
      prompt: 'Hozz létre egy `dolgozok` nevű nézetet, amely listázza a dolgozók **teljes nevét**, **jövedelmét** (fizetés + jutalék, azaz `salary * (1 + commission_pct)`, a hiányzó jutalék 0), **munkakör-azonosítóját**, **belépésük évét** és **részlegük nevét** (belső összekapcsolással, így a részleg nélküli dolgozók nincsenek a nézetben).',
      hints: ['`CREATE OR REPLACE VIEW dolgozok AS SELECT ... FROM employees JOIN departments ...`', '`EXTRACT(YEAR FROM hire_date)`'],
    },
    'ddl-16': {
      title: 'Gyakorlat 24/b – a nézet bővítése',
      prompt: 'Az előző feladat `dolgozok` nézete létezik. Módosítsd úgy, hogy **utolsó oszlopként** a dolgozó **főnökének teljes nevét** is tartalmazza (a főnök nélküli dolgozók maradjanak benne NULL értékkel).',
      hints: ['`CREATE OR REPLACE VIEW` egy további `LEFT JOIN employees m ON e.manager_id = m.employee_id`-vel.', 'PostgreSQL-ben nézet cseréjekor új oszlopok csak a VÉGÉRE kerülhetnek.'],
    },
    'ddl-17': {
      title: 'Nézet WITH CHECK OPTION-nel',
      prompt: 'Hozz létre az `employees2` fölé egy `nyolcvan` nevű nézetet a **80-as részleg** dolgozóinak **employee_id, last_name, job_id, salary, department_id, hire_date, email** oszlopaival. A nézeten keresztül **ne** lehessen olyan sort beszúrni vagy módosítani, ami ezáltal kiesne a nézetből.',
      hints: ['`CREATE OR REPLACE VIEW nyolcvan AS SELECT ... FROM employees2 WHERE department_id = 80 WITH CHECK OPTION;`'],
    },
    'ddl-18': { title: 'Összetett index', prompt: 'A `hallgato(nev, szul_dat, evfolyam)` tábla létezik. Hozz létre egy `hallg_nevsor_idx` nevű indexet, ami **név szerint növekvő**, azonos nevűeknél **évfolyam szerint csökkenő** sorrendet ad.', hints: ['`CREATE INDEX hallg_nevsor_idx ON hallgato (nev, evfolyam DESC);`'] },
    'ddl-19': {
      title: 'Egyediség indexszel',
      prompt: 'Biztosítsd, hogy a `hallgato` táblában ne lehessen két azonos nevű hallgató – **UNIQUE INDEX**-szel (neve: `hallg_nev_idx`).',
      hints: ['`CREATE UNIQUE INDEX hallg_nev_idx ON hallgato (nev);`'],
      require: ['Ehhez a feladathoz CREATE UNIQUE INDEX-et használj (ne megszorítást).'],
    },
    'ddl-q1': {
      title: 'Melyik INSERT működik?',
      prompt: 'A `departments2(department_id PK, department_name, manager_id, location_id)` az eredeti 27 részleget tartalmazza (10, 20, …, 270). Melyik utasítás fut le sikeresen?',
      options: [
        "`INSERT INTO departments2 VALUES (55, 'NÉV', 200, 1700);`",
        "`INSERT INTO departments2 VALUES (30, 'NÉV', 200, 1700);`",
        "`INSERT INTO departments2 (department_name, location_id) VALUES ('NÉV', 1700);`",
        'Egyik sem',
      ],
      explain: 'A 30-as már létezik (elsődleges kulcs megsértése); a harmadik NULL-on hagyja az elsődleges kulcsot, ami nem megengedett. Az 55 szabad, és mind a 4 érték megadása oszlopsorrendben működik.',
    },
    'ddl-q2': {
      title: 'Megszorítás meglévő adatokon',
      prompt: 'Az `employees` táblában a legkisebb fizetés 2100. Mi történik az `ALTER TABLE employees ADD CONSTRAINT minimalber CHECK (salary > 3000);` utasítással?',
      options: ['Létrejön, és csak az új sorokra vonatkozik', 'Hibát ad, mert a meglévő sorok megsértik', 'Törli a szabálysértő sorokat', 'Létrejön, de letiltva'],
      explain: 'Csak olyan megszorítás adható hozzá (vagy engedélyezhető), aminek a meglévő adatok megfelelnek.',
    },
  },
};
