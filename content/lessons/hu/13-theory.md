# Elmélet a ZH-ra (30 pont)

A ZH második része rövid elméleti kérdéseket tartalmaz. Ez a modul **kvízkérdésekkel** (azonnal értékelve)
és **kártyákkal** gyakoroltatja őket (gondold végig a válaszod, nézd meg a mintaválaszt, és értékeld magad őszintén).

## Oracle architektúra

- **Adatbázis**: a fizikai fájlok a lemezen: **adatfájlok**, **vezérlőfájlok**, **online redo log fájlok** (+ paraméter-/jelszófájlok, archivált logok).
- **Példány** (instance): a **memóriaterületek (SGA + PGA-k)** és **háttérfolyamatok**, amelyek egy adatbázison dolgoznak. Egy adatbázist egy példány nyit meg (RAC-ban több).
- **SGA** (System Global Area): a példány **közös** memóriája: **database buffer cache** (adatblokkok), **shared pool** (library cache: elemzett SQL és tervek; adatszótár-gyorsítótár), **redo log buffer**, large/Java pool.
- **PGA** (Program Global Area): egy szerver- vagy háttérfolyamat **saját** memóriája: rendezési és hash területek, munkamenet-információ, kurzorállapot.
- Háttérfolyamatok: **DBWn** (a módosított buffereket írja az adatfájlokba), **LGWR** (a redo log buffert írja a redo log fájlokba, pl. COMMIT-kor), **CKPT** (checkpoint), **SMON** (példány-helyreállítás), **PMON** (a hibás folyamatok után takarít), **ARCn** (archiválás).
- Logikai tárolás: **táblatér → szegmens → extent → adatblokk**. Egy táblatér fizikailag egy vagy több adatfájl.
- **Adatszótár**: csak olvasható metaadat-táblák/nézetek (`USER_*`, `ALL_*`, `DBA_*`, `V$*`).

## SQL-feldolgozás és optimalizálás

Elemzés (**szintaktikai** ellenőrzés → **szemantikai** ellenőrzés → **shared pool ellenőrzés**: soft vs hard parse) → **optimalizálás** (a CBO a
**statisztikák** alapján megbecsüli az alternatív tervek költségét, és a legolcsóbbat választja) → **sorforrás-generálás** → **végrehajtás**.

**Szelektivitás** = a sorok azon hányada, amit egy feltétel megtart. **Kardinalitás** = egy lépés becsült sorszáma. **Költség** = a becsült erőforrásigény.

## Adatbázis-tervezés (1. előadás)

- **1NF**: atomi attribútumértékek (nincsenek ismétlődő csoportok). **2NF**: 1NF + minden nem kulcs attribútum a **teljes** kulcstól függ (nincs részleges függés).
  **3NF**: 2NF + nincs **tranzitív** függés (nem kulcs → nem kulcs). **BCNF**: minden determináns kulcsjelölt.

## MPP (massively parallel processing)

Sok független csomópont (shared-nothing: saját CPU, memória, lemez). Az adatok **szét vannak osztva/particionálva** a csomópontok között, a lekérdezés
minden csomóponton párhuzamosan fut, majd a részeredmények összeállnak. Példák: Teradata, Greenplum, Amazon Redshift, Snowflake.

## NoSQL

- **Big Data 3V**: **Volume** (hatalmas adatmennyiség), **Velocity** (a keletkezés és feldolgozás sebessége, adatfolyamok), **Variety** (strukturált, félig strukturált és strukturálatlan formátumok). Gyakran kiegészül: Veracity és Value.
- **CAP-tétel**: egy elosztott rendszer legfeljebb kettőt garantálhat ezek közül: **C**onsistency (minden olvasás a legutóbbi írást látja), **A**vailability (minden kérés nem hibás választ kap), **P**artition tolerance (hálózati partíció esetén is működik). Mivel partíciók előfordulnak, a gyakorlati választás CP vagy AP.
- **ACID** (relációs) vs **BASE** (Basically Available, Soft state, Eventually consistent).
- Családok: **kulcs-érték** (Redis), **dokumentum** (MongoDB), **oszlopcsalád / széles oszlopos** (Cassandra, HBase), **gráf** (Neo4j).

## MongoDB

- `_id`: kötelező, a dokumentum **egyedi elsődleges kulcsa** a gyűjteményén belül, automatikusan indexelt; ha nem adod meg, **ObjectId** generálódik.
- **BSON**: Binary JSON, a bináris tárolási/átviteli formátum. Gyorsabban bejárható, és további típusai vannak (Date, ObjectId, Int32/64, Decimal128, bináris).
- **Replica set**: több szerver, amelyek **ugyanannak az adatnak a másolatait** tárolják (egy primary, több secondary), így **magas rendelkezésre állás** és automatikus átállás.
- **Sharding**: az adatok **felosztása** több szerver között egy **shard kulcs** szerint, így a tárolás és az áteresztőképesség **horizontálisan skálázható**.

## Gráfadatbázisok (9. előadás)

Csomópontok (címkékkel), **kapcsolatok** (típusosak, irányítottak) és mindkettőn **tulajdonságok**. Akkor jók, ha maguk a kapcsolatok a lényegesek
(közösségi hálók, ajánlórendszerek, útvonalak). A Neo4j lekérdezőnyelve a **Cypher**:
`MATCH (a:Person)-[:LIKES]->(b:Person) WHERE b.name = 'James' RETURN a.name`.

## Oszloptárolók (11. előadás)

Az **oszlopalapú** tárolás az egyes oszlopok értékeit együtt tárolja. Ez elemzésekhez kiváló: csak a szükséges oszlopokat kell olvasni, és jól tömöríthető.
A **széles oszlopos** NoSQL tárolók (Cassandra, HBase) oszlopcsaládokat tárolnak egy partíciókulccsal azonosított sorokban, és horizontálisan skálázódnak.
