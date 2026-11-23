# Redis – key-value store (Lab 7)

**Re**mote **Di**ctionary **S**erver: an in-memory **key → value** store. It is very fast, so it is used as a **cache**, for
counters, sessions, leaderboards, queues and pub/sub. A value can be one of several **data structures**.
Redis is dynamically typed: a key's type is decided by the first command that writes it.

Type one command per line, exactly as in `redis-cli`. Quote values that contain spaces: `SET greeting "Szia, Redis!"`.

## Strings (and numbers)

```redis
SET lab:tantargy "Redis"
GET lab:tantargy
DEL lab:tantargy
MSET a 1 b 2
MGET a b
KEYS lab:*            # all keys matching a pattern (avoid on big production DBs)
APPEND k " world"     # STRLEN, GETRANGE k 0 4, SETRANGE, GETSET, LCS k1 k2
INCR lab:clicks       # atomic +1 (also INCRBY n, DECR, DECRBY n, INCRBYFLOAT 0.5)
```

## Expiry: TTL

```redis
SET lab:flash villanas EX 15   # expires in 15 s  (SETEX key 15 value does the same)
TTL lab:flash                  # remaining seconds; -1 = no expiry, -2 = key does not exist
EXPIRE key 60                  # PERSIST key removes the expiry
```

## Lists: ordered, duplicates allowed (queue / stack)

```redis
RPUSH feladatok "a" "b" "c"   # push right   (LPUSH = left)
LPOP feladatok                # pop left → FIFO queue with RPUSH;  LIFO stack with LPUSH + LPOP
LRANGE feladatok 0 -1         # all elements (-1 = last)
LLEN, LINDEX k i, LPOS k value, LSET k i v, LREM k count v, LINSERT k BEFORE|AFTER pivot v
```

## Sets: no duplicates, no order

```redis
SADD sql Anna Csilla          # SREM, SMEMBERS, SISMEMBER, SMISMEMBER, SCARD, SPOP, SRANDMEMBER, SMOVE
SINTER sql python             # intersection   (SUNION = union, SDIFF a b = in a but not in b)
```

## Sorted sets: unique members ordered by a numeric score

```redis
ZADD ranglista 50 Anna 40 Bela 70 Csilla
ZREVRANGE ranglista 0 1 WITHSCORES     # top 2 with scores  (ZRANGE ... REV also works)
ZSCORE ranglista Anna    ZINCRBY ranglista 5 Bela    ZRANK / ZREVRANK    ZCOUNT ranglista 40 60
ZREM, ZCARD, ZPOPMIN, ZPOPMAX
```

## Hashes: field → value map under one key (like a row / object)

```redis
HSET diak:101 nev Anna pont 40
HINCRBY diak:101 pont 5        # atomic increment of a field
HGETALL diak:101               # HGET, HMGET, HDEL, HEXISTS, HLEN, HKEYS, HVALS, HSETNX
```

## Transactions

```redis
MULTI          # start queueing
INCR a
DECR b
EXEC           # run all queued commands without interruption   (DISCARD = cancel)
```

## Pub/Sub

`PUBLISH channel msg`, `SUBSCRIBE channel`, `PSUBSCRIBE pattern`. This is a notification mechanism, **not** a queue:
the delivery guarantee is *at-most-once*, and a message sent while nobody listens is lost. For durable event streams Redis has **Streams**.

## Choosing a structure (ZH 10)

| Need | Structure |
|---|---|
| ordered task list / queue | **List** |
| tags without duplicates | **Set** |
| leaderboard by score | **Sorted set** |
| a student's profile with several fields | **Hash** |
| cached JSON, counter | **String** |

## Cache-aside pattern (lab 7 mini-project)

1. `GET product:42`: a **hit** returns the cached JSON.
2. On a **miss**, read the database, then `SET product:42 '<json>' EX 600` and return it.
3. When the data changes in the database, **invalidate**: `DEL product:42`. Otherwise readers get stale data until the TTL runs out.

> In this app keys starting with `#` or `//` are comments. Each exercise starts with an empty Redis.
