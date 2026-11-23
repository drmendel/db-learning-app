# Hogyan működik?

Minden témát **gyakorlással** tanulsz meg: minden modul egy rövid leckével kezdődik, majd feladatok jönnek.
Minden a szerveren fut, külső szolgáltatás nélkül.

| Motor | Mi fut mögötte |
|---|---|
| **SQL** | Valódi **PostgreSQL** (PGlite) a kurzus **HR sémájával** (107 dolgozó). Az 1–4. labor Oracle-szintaxisát (`NVL`, `DUAL`, `VARCHAR2`, `NUMBER`, `SYSDATE`, `EXPLAIN PLAN FOR`, …) ahol lehet, lefordítja, és megmutatja a PostgreSQL-es megoldást. |
| **Redis** | A 7. labor Redis-parancsainak emulátora (szövegek, TTL, listák, halmazok, rendezett halmazok, hash-ek, MULTI/EXEC). A kimenet olyan, mint a `redis-cli`-é. |
| **MongoDB** | mongosh-szerű shell (`use`, `db.coll.find(...)`, `aggregate`, `updateMany`, …) a *mingo* lekérdezőmotorra építve. |

## Így oldasz meg egy feladatot

1. Olvasd el a feladatot, és írd be a válaszodat a szerkesztőbe.
2. A **Futtatás** (`Ctrl+Enter`) lefuttatja a kódot, így megnézheted a kimenetet – ez még nem értékel.
3. Az **Ellenőrzés** (`Ctrl+Shift+Enter`) értékel: a kódod és a mintamegoldás ugyanazon friss adatokon fut le, majd az
   eredményeket összehasonlítjuk.
4. Elakadtál? Nyisd ki a **tippeket** egyenként, nézd meg a **várt kimenetet**, és csak utána a **megoldást**.

Minden ellenőrzés egy eldobható homokozóban fut (SQL: visszagörgetett tranzakció; Redis/Mongo: friss, memóriában lévő
adatbázis), úgyhogy semmit sem ronthatsz el. A **Játszótér** fülön szabadon kísérletezhetsz.

A haladásod **ebben a böngészőben** tárolódik (localStorage) – egy másik gépen vagy böngészőben újra kell kezdened.

## Hogyan hasonlítjuk össze az SQL-válaszokat

- Az **oszlopnevek/aliasok nem számítanak**, és az **oszlopok sorrendje** sem.
- A **soroknak egyezniük kell** (a számokat 2 tizedesre kerekítve hasonlítjuk össze).
- Ha a feladat rendezést kér, a **sorok sorrendjének is egyeznie kell** (a rendezési kulcsokon egyező sorok tetszőleges sorrendben jöhetnek).
- A „teljes név” mindig **egy oszlop**: `first_name || ' ' || last_name`.

## A HR séma (az 1–6. laboron és a ZH-n használjuk)

```text
regions(region_id, region_name)
countries(country_id, country_name, region_id → regions)
locations(location_id, street_address, postal_code, city, state_province, country_id → countries)
departments(department_id, department_name, manager_id → employees, location_id → locations)
jobs(job_id, job_title, min_salary, max_salary)
employees(employee_id, first_name, last_name, email, phone_number, hire_date, job_id → jobs,
          salary, commission_pct, manager_id → employees, department_id → departments)
job_history(employee_id, start_date, end_date, job_id, department_id)
```

Néhány tény, amit érdemes tudni (jó csapdák):

- **Kimberely Grant** (178) **nem tartozik részleghez** (`department_id IS NULL`).
- **Steven King**nek (100) **nincs főnöke**.
- Csak az értékesítőknek (80-as részleg) van `commission_pct` értéke; mindenki másnál `NULL`.
- A 27 részlegből 16-ban **nem dolgozik senki**.

A **Séma** panelen (jobbra fent) bármikor megnézheted az összes táblát és oszlopot.
