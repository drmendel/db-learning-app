# Integration: using databases from code (Lab 10)

Applications don't type SQL into a console; they use a **driver** (client library):

| | Python | JavaScript | .NET | Java |
|---|---|---|---|---|
| Oracle | `oracledb` | `node-oracledb` | Oracle.ManagedDataAccess | JDBC |
| PostgreSQL | `psycopg` / `psycopg2` (async: `asyncpg`) | `pg` | Npgsql | JDBC |
| Redis | `redis` | `redis` / `ioredis` | StackExchange.Redis | Jedis / Lettuce |
| MongoDB | `pymongo` (async: `motor`) | `mongodb` / `mongoose` | MongoDB.Driver | mongodb-driver-sync |

## PostgreSQL from Python: parameterised queries

```python
import psycopg2
con = psycopg2.connect(host="127.0.0.1", port=15432, dbname="psql", user="psql")
cur = con.cursor()
cur.execute("SELECT id, title, teacher FROM kurzuslabor.courses WHERE title ILIKE %s ORDER BY title LIMIT 20",
            ("%" + keyword + "%",))          # the driver escapes the value → no SQL injection
rows = cur.fetchall()
cur.close(); con.close()
```

> **Never** build SQL with string formatting (`f"... '{keyword}'"`): that is how **SQL injection** happens.
> Placeholders: psycopg `%s` / `%(name)s`, oracledb `:1` / `:name`.
> Writes need `con.commit()` (Oracle and PostgreSQL are transactional). Redis and single MongoDB writes don't.

## Redis from Python

```python
import redis, json
r = redis.Redis(host="127.0.0.1", port=16379, decode_responses=True)
cached = r.get(key)                     # None on a miss
r.setex(key, 120, json.dumps(rows))     # value + TTL in one call
data = json.loads(cached)
```

Pipelines (`r.pipeline()`) send several commands in one round trip.

## MongoDB from Python

```python
from pymongo import MongoClient
from datetime import datetime, timezone
client = MongoClient("mongodb://127.0.0.1:27018/?directConnection=true")
client["kurzuslabor"]["search_events"].insert_one({
    "lab_id": LAB_ID, "keyword": keyword, "count": n, "source": source,
    "timestamp": datetime.now(timezone.utc)})
client.close()
```

## The lab 10 mini app

A course search: **PostgreSQL** is the source of truth, **Redis** caches each search result for 120 s (cache-aside), and **MongoDB** logs every search.

```text
search_with_cache(keyword)
  ├─ Redis GET cache_key(keyword) ── hit ──► json.loads → (results, 'Redis')
  └─ miss ─► search_postgres(keyword) ─► Redis SETEX (TTL_SECONDS) ─► (results, 'PostgreSQL')
log_search(keyword, count, source) ─► MongoDB insert_one into search_events
```

The servers are not available in this offline app, so these tasks are checked by their key elements.
Compare your solution with the model solution afterwards.

### Running lab 10 for real (when you have Docker and ~1.5 GB of free disk space)

```bash
docker run -d --name pg-lab    -p 127.0.0.1:15432:5432  -e POSTGRES_USER=psql -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16-alpine
docker run -d --name redis-lab -p 127.0.0.1:16379:6379  redis:8-alpine
docker run -d --name mongo-lab -p 127.0.0.1:27018:27017 mongo:8
```

These ports match the lab's `config.py` defaults, so `01_setup…`, `02_setup…` and `03_feladat.py` work unchanged.
