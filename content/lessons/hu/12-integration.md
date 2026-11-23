# Integráció: adatbázisok használata kódból (10. labor)

Az alkalmazások nem konzolba gépelik az SQL-t, hanem egy **drivert** (klienskönyvtárat) használnak:

| | Python | JavaScript | .NET | Java |
|---|---|---|---|---|
| Oracle | `oracledb` | `node-oracledb` | Oracle.ManagedDataAccess | JDBC |
| PostgreSQL | `psycopg` / `psycopg2` (aszinkron: `asyncpg`) | `pg` | Npgsql | JDBC |
| Redis | `redis` | `redis` / `ioredis` | StackExchange.Redis | Jedis / Lettuce |
| MongoDB | `pymongo` (aszinkron: `motor`) | `mongodb` / `mongoose` | MongoDB.Driver | mongodb-driver-sync |

## PostgreSQL Pythonból: paraméterezett lekérdezések

```python
import psycopg2
con = psycopg2.connect(host="127.0.0.1", port=15432, dbname="psql", user="psql")
cur = con.cursor()
cur.execute("SELECT id, title, teacher FROM kurzuslabor.courses WHERE title ILIKE %s ORDER BY title LIMIT 20",
            ("%" + keyword + "%",))          # a driver escape-eli az értéket → nincs SQL injection
rows = cur.fetchall()
cur.close(); con.close()
```

> **Soha** ne szövegformázással építs SQL-t (`f"... '{keyword}'"`): így jön létre az **SQL injection**.
> Helyőrzők: psycopg `%s` / `%(nev)s`, oracledb `:1` / `:nev`.
> Íráshoz `con.commit()` kell (az Oracle és a PostgreSQL tranzakciós). A Redisnél és az egyszerű MongoDB-írásoknál nem.

## Redis Pythonból

```python
import redis, json
r = redis.Redis(host="127.0.0.1", port=16379, decode_responses=True)
cached = r.get(key)                     # hiány esetén None
r.setex(key, 120, json.dumps(rows))     # érték + TTL egy hívásban
data = json.loads(cached)
```

A pipeline-ok (`r.pipeline()`) több parancsot küldenek el egyetlen körben.

## MongoDB Pythonból

```python
from pymongo import MongoClient
from datetime import datetime, timezone
client = MongoClient("mongodb://127.0.0.1:27018/?directConnection=true")
client["kurzuslabor"]["search_events"].insert_one({
    "lab_id": LAB_ID, "keyword": keyword, "count": n, "source": source,
    "timestamp": datetime.now(timezone.utc)})
client.close()
```

## A 10. labor miniprogramja

Kurzuskereső: a **PostgreSQL** az elsődleges adatforrás, a **Redis** 120 másodpercig gyorsítótárazza a keresési eredményeket (cache-aside),
a **MongoDB** pedig naplózza a kereséseket.

```text
search_with_cache(keyword)
  ├─ Redis GET cache_key(keyword) ── hit ──► json.loads → (results, 'Redis')
  └─ miss ─► search_postgres(keyword) ─► Redis SETEX (TTL_SECONDS) ─► (results, 'PostgreSQL')
log_search(keyword, count, source) ─► MongoDB insert_one a search_events gyűjteménybe
```

Ezek a feladatok valódi szervereket igényelnének, ezért itt a kulcselemeik alapján ellenőrizzük őket.
Utána vesd össze a megoldásodat a mintamegoldással.

### A 10. labor valódi futtatása (Dockerrel)

```bash
docker run -d --name pg-lab    -p 127.0.0.1:15432:5432  -e POSTGRES_USER=psql -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16-alpine
docker run -d --name redis-lab -p 127.0.0.1:16379:6379  redis:8-alpine
docker run -d --name mongo-lab -p 127.0.0.1:27018:27017 mongo:8
```

Ezek a portok megegyeznek a labor `config.py` alapértékeivel, így a `01_setup…`, `02_setup…` és `03_feladat.py` változtatás nélkül működik.
