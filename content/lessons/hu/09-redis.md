# Redis – kulcs-érték tároló (7. labor)

**Re**mote **Di**ctionary **S**erver: memóriában tárolt **kulcs → érték** tároló. Nagyon gyors, ezért **gyorsítótárként** (cache),
számlálókhoz, munkamenetekhez, ranglistákhoz, sorokhoz és pub/sub-hoz használják. Az érték többféle **adatstruktúra** lehet.
A Redis dinamikusan típusos: a kulcs típusát az első író parancs határozza meg.

Soronként egy parancsot írj, pontosan úgy, mint a `redis-cli`-ben. A szóközt tartalmazó értékeket tedd idézőjelbe: `SET koszones "Szia, Redis!"`.

## Szövegek (és számok)

```redis
SET lab:tantargy "Redis"
GET lab:tantargy
DEL lab:tantargy
MSET a 1 b 2
MGET a b
KEYS lab:*            # mintára illeszkedő kulcsok (nagy éles adatbázison kerülendő)
APPEND k " world"     # STRLEN, GETRANGE k 0 4, SETRANGE, GETSET, LCS k1 k2
INCR lab:clicks       # atomikus +1 (még: INCRBY n, DECR, DECRBY n, INCRBYFLOAT 0.5)
```

## Lejárat: TTL

```redis
SET lab:flash villanas EX 15   # 15 mp múlva lejár  (a SETEX kulcs 15 érték ugyanezt csinálja)
TTL lab:flash                  # hátralévő mp; -1 = nincs lejárata, -2 = a kulcs nem létezik
EXPIRE kulcs 60                # a PERSIST kulcs törli a lejáratot
```

## Listák: rendezett, ismétlődés megengedett (sor / verem)

```redis
RPUSH feladatok "a" "b" "c"   # jobbra tesz   (LPUSH = balra)
LPOP feladatok                # balról vesz ki → RPUSH-sal FIFO sor;  LPUSH + LPOP-pal LIFO verem
LRANGE feladatok 0 -1         # minden elem (-1 = utolsó)
LLEN, LINDEX k i, LPOS k érték, LSET k i v, LREM k darab v, LINSERT k BEFORE|AFTER pivot v
```

## Halmazok: nincs ismétlődés, nincs sorrend

```redis
SADD sql Anna Csilla          # SREM, SMEMBERS, SISMEMBER, SMISMEMBER, SCARD, SPOP, SRANDMEMBER, SMOVE
SINTER sql python             # metszet   (SUNION = unió, SDIFF a b = a-ban van, b-ben nincs)
```

## Rendezett halmazok: egyedi tagok numerikus pontszám szerint rendezve

```redis
ZADD ranglista 50 Anna 40 Bela 70 Csilla
ZREVRANGE ranglista 0 1 WITHSCORES     # a legjobb 2 pontszámmal  (a ZRANGE ... REV is működik)
ZSCORE ranglista Anna    ZINCRBY ranglista 5 Bela    ZRANK / ZREVRANK    ZCOUNT ranglista 40 60
ZREM, ZCARD, ZPOPMIN, ZPOPMAX
```

## Hash-ek: mező → érték párok egy kulcs alatt (mint egy sor / objektum)

```redis
HSET diak:101 nev Anna pont 40
HINCRBY diak:101 pont 5        # egy mező atomikus növelése
HGETALL diak:101               # HGET, HMGET, HDEL, HEXISTS, HLEN, HKEYS, HVALS, HSETNX
```

## Tranzakciók

```redis
MULTI          # sorba állítás indul
INCR a
DECR b
EXEC           # a sorba állított parancsok megszakítás nélküli végrehajtása   (DISCARD = megszakítás)
```

## Pub/Sub

`PUBLISH csatorna üzenet`, `SUBSCRIBE csatorna`, `PSUBSCRIBE minta`. Ez értesítési mechanizmus, **nem** üzenetsor:
a kézbesítési garancia *at-most-once*, és ha épp senki sem figyel, az üzenet elvész. Tartós eseményfolyamokhoz a Redisben **Streamek** vannak.

## Melyik struktúrát válasszam? (ZH 10)

| Cél | Struktúra |
|---|---|
| sorrendhelyes feladatlista / sor | **Lista** |
| címkék ismétlődés nélkül | **Halmaz** |
| ranglista pontszám szerint | **Rendezett halmaz** |
| egy diák több mezős profilja | **Hash** |
| gyorsítótárazott JSON, számláló | **String** |

## Cache-aside minta (7. labor miniprojekt)

1. `GET product:42`: **találat** (hit) esetén visszaadja a tárolt JSON-t.
2. **Hiány** (miss) esetén olvasd ki az adatbázisból, majd `SET product:42 '<json>' EX 600`, és add vissza.
3. Ha az adat megváltozik az adatbázisban, **érvénytelenítsd**: `DEL product:42`. Különben az olvasók a TTL lejártáig elavult adatot kapnak.

> Ebben az alkalmazásban a `#`-tel vagy `//`-rel kezdődő sorok megjegyzések. Minden feladat üres Redisből indul.
