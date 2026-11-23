# Végrehajtási tervek, elérési utak, összekapcsolások, hintek (3–4. labor)

Mielőtt egy SQL-utasítás lefut, az **optimalizáló** (Oracle: CBO, költségalapú optimalizáló) kiválaszt egy **végrehajtási tervet**.
A terv megmondja, hogyan olvassa az egyes táblákat (*elérési út*), és hogyan kapcsolja össze őket (*összekapcsolási módszer*).

## Oracle: a becsült terv megjelenítése

```sql
EXPLAIN PLAN FOR
SELECT last_name, salary FROM employees WHERE employee_id = 106;   -- 1) a tervet a PLAN_TABLE-be teszi

SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);                            -- 2) megjeleníti
-- változatok: DBMS_XPLAN.DISPLAY(FORMAT => 'BASIC') / 'ALL';  SQL Developerben: F10
```

```text
| Id | Operation                   | Name          | Rows | Cost |
|  0 | SELECT STATEMENT            |               |    1 |    1 |
|  1 |  TABLE ACCESS BY INDEX ROWID| EMPLOYEES     |    1 |    1 |
|  2 |   INDEX UNIQUE SCAN         | EMP_EMP_ID_PK |    1 |    0 |
```

**A legbelső (leginkább behúzott) sortól kifelé** olvasd: először az index megkeresi az employee_id = 106-hoz tartozó
egyetlen ROWID-t (INDEX UNIQUE SCAN az elsődleges kulcs indexén), majd a sort közvetlenül ezzel a ROWID-vel olvassa be a táblából
(TABLE ACCESS BY INDEX ROWID).

- **Rows / Cardinality**: a lépés által visszaadott sorok *becsült* száma.
- **Cost**: az optimalizáló becslése a szükséges erőforrásokra (I/O, CPU). Relatív szám: a kisebb a jobb.
- Az `EXPLAIN PLAN` **nem** futtatja le a lekérdezést, így ezek becslések. A ténylegesen lefutott tervek a `V$SQL_PLAN` nézetben vannak (library cache).

## Elérési utak (Oracle)

| Művelet | Mikor |
|---|---|
| **TABLE ACCESS FULL** | a tábla minden blokkját olvassa (nincs használható index, vagy a sorok nagy része kell). Hint: `FULL(t)` |
| **TABLE ACCESS BY INDEX ROWID** | egy sort olvas az index által visszaadott ROWID alapján |
| **INDEX UNIQUE SCAN** | egyenlőség egy egyedi / PK indexen → legfeljebb 1 ROWID |
| **INDEX RANGE SCAN** | egy (nem egyedi) index egy tartománya: `<`, `>`, `BETWEEN`, `LIKE 'A%'`, nem egyedi `=` |
| **INDEX FULL SCAN** | a teljes indexet **sorrendben** olvassa (pl. hogy elkerülje a rendezést `ORDER BY`-nál) |
| **INDEX FAST FULL SCAN** | a teljes indexet **tetszőleges sorrendben**, többblokkosan olvassa (mint egy keskeny tábla teljes olvasása). Hint: `INDEX_FFS` |
| **INDEX SKIP SCAN** | összetett indexet használ, bár a **vezető oszlop nincs a WHERE-ben**. Hint: `INDEX_SS` |
| **INDEX JOIN SCAN** | több indexből rakja össze az adatokat, így magát a táblát nem olvassa. Hint: `INDEX_JOIN` |

> A `LIKE 'A%'` használhat index range scant; a `LIKE '%a'` nem, mert a kezdő karakterek ismeretlenek.
> Az `UPPER(last_name) = 'KING'` nem használhat egy sima `last_name` indexet. **Függvény alapú index** kell hozzá:
> `CREATE INDEX emp_upper_last_ix ON employees (UPPER(last_name));`

## Összekapcsolási módszerek

| Módszer | Jellemző használat |
|---|---|
| **Nested loops** | kis külső sorhalmaz, indexelt elérés a belső táblán (pl. `... WHERE employee_id = 106`) |
| **Hash join** | nagy egyenlőségi összekapcsolások; a kisebb bemenetből hash táblát épít (FULL OUTER joinnál is) |
| **Sort-merge join** | mindkét bemenet rendezve az összekapcsoló kulcs szerint; jó **nem egyenlőségi** feltételekhez, pl. `salary < max_salary` |
| **Cartesian (MERGE JOIN CARTESIAN)** | két tábla között nincs összekapcsolási feltétel |

## Hintek

`SELECT /*+ hint */ ...`. A hintet közvetlenül a SELECT/UPDATE/INSERT/DELETE/MERGE után írd, a `/*` és a `+` között **szóköz nélkül**.
A szintaktikailag hibás hintet a rendszer csendben figyelmen kívül hagyja. Teszteléshez használd, normál működésben kerüld.

- Elérés: `FULL(t)`, `INDEX(t idx)`, `NO_INDEX`, `INDEX_ASC/DESC`, `INDEX_FFS`, `INDEX_SS`, `INDEX_COMBINE`
- Összekapcsolás: `USE_NL`, `USE_HASH`, `USE_MERGE` (és `NO_USE_…`), `ORDERED` (a FROM sorrendjében kapcsol)
- Cél: `ALL_ROWS` (áteresztőképesség), `FIRST_ROWS(10)` (gyors első sorok)

## Statisztikák és hisztogramok

A CBO a **statisztikákra** támaszkodik (sorszám, különböző értékek, …). Egyenetlen eloszlású oszlopnál (pl. commission_pct)
a kardinalitásbecslés téves lehet. A **hisztogram** az értékek eloszlását írja le:

```sql
SELECT column_name, histogram FROM user_tab_col_statistics WHERE table_name = 'EMPLOYEES';
EXEC DBMS_STATS.GATHER_TABLE_STATS('HR', 'EMPLOYEES', method_opt => 'FOR COLUMNS COMMISSION_PCT');
```

A **szelektivitás** azt mutatja, hogy egy feltétel a sorok mekkora hányadát tartja meg. Kardinalitás ≈ szelektivitás × sorok száma.

## A PostgreSQL megfelelők (ezeket itt futtathatod)

```sql
EXPLAIN SELECT * FROM employees WHERE employee_id = 106;          -- becsült terv
EXPLAIN ANALYZE SELECT * FROM employees WHERE employee_id = 106;  -- lefuttatja, valós időkkel/sorokkal
```

| PostgreSQL | Oracle |
|---|---|
| Seq Scan | TABLE ACCESS FULL |
| Index Scan | INDEX UNIQUE/RANGE SCAN + TABLE ACCESS BY INDEX ROWID |
| Index Only Scan | csak indexes elérés (táblaolvasás nélkül) |
| Bitmap Index/Heap Scan | (bitmap elérés) |
| Nested Loop / Hash Join / Merge Join | ugyanezek az összekapcsolási módszerek |

> A HR tábla pici (107 sor), ezért a PostgreSQL általában Seq Scant választ: 2 lap beolvasása olcsóbb, mint egy index használata.
> Ha *látni* szeretnéd az indexhasználatot, tiltsd le a szekvenciális olvasást a munkamenetre: `SET enable_seqscan = off;`
