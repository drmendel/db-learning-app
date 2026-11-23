export default {
  id: 'integration',
  title: 'Integration (Python drivers)',
  lab: 'Lab 10',
  engine: 'text',
  lesson: '12-integration.md',
  exercises: [
    {
      id: 'i-1', type: 'text', lang: 'python', title: 'TODO 1 – search PostgreSQL',
      prompt: 'Implement `search_postgres(keyword)`: query **kurzuslabor.courses** for courses whose **title contains the keyword** (case-insensitively), **ordered by title**, **at most 20** rows, with a **parameterised** query. Return a list of dicts `{"id", "title", "teacher"}`, and **close** the cursor and the connection.\n\nAvailable: `pg_connect()` from config.',
      starter: 'def search_postgres(keyword):\n    # TODO 1\n    pass\n',
      hints: ['`con = pg_connect(); cur = con.cursor()`', '`cur.execute("SELECT id, title, teacher FROM kurzuslabor.courses WHERE title ILIKE %s ORDER BY title LIMIT 20", ("%" + keyword + "%",))`', 'Use try/finally so the connection is always closed.'],
      solution: `def search_postgres(keyword):
    con = pg_connect()
    try:
        cur = con.cursor()
        try:
            cur.execute(
                "SELECT id, title, teacher FROM kurzuslabor.courses "
                "WHERE title ILIKE %s ORDER BY title LIMIT 20",
                ("%" + keyword + "%",),
            )
            return [{"id": r[0], "title": r[1], "teacher": r[2]} for r in cur.fetchall()]
        finally:
            cur.close()
    finally:
        con.close()
`,
      require: [
        ['pg_connect\\s*\\(', 'Connect with pg_connect().'],
        ['kurzuslabor\\.courses', 'Query the kurzuslabor.courses table.'],
        ['ILIKE', 'Use ILIKE for case-insensitive matching.'],
        ['ORDER\\s+BY\\s+title', 'Order by title.'],
        ['LIMIT\\s+20', 'Return at most 20 rows (LIMIT 20).'],
        ['execute\\s*\\([^)]*%s', 'Use a %s placeholder – a parameterised query.'],
        ['\\.close\\s*\\(', 'Close the cursor and the connection.'],
      ],
      forbid: [
        ['f["\'][^"\'\\n]*(SELECT|WHERE|ILIKE|LIKE)[^"\'\\n]*\\{keyword', 'Don\'t put the keyword into the SQL text with an f-string – pass it as a parameter (SQL injection!).'],
        ['(SELECT|WHERE|ILIKE)[^"\'\\n]*["\']\\s*\\+\\s*keyword', 'Don\'t concatenate the keyword into the SQL text – pass it as a parameter (SQL injection!).'],
        ['(SELECT|WHERE|ILIKE)[^\\n]*["\']\\s*\\.format\\s*\\(', 'Don\'t .format() the keyword into the SQL – pass it as a parameter (SQL injection!).'],
      ],
    },
    {
      id: 'i-2', type: 'text', lang: 'python', title: 'TODO 2 – Redis cache',
      prompt: 'Implement `search_with_cache(keyword)` with the **cache-aside** pattern. Look up `cache_key(keyword)` in Redis first; on a **hit** return the cached list and the source `\'Redis\'`. On a **miss**, call `search_postgres`, store the JSON result with a TTL of `TTL_SECONDS`, and return it with the source `\'PostgreSQL\'`.\n\nAvailable: `redis_client()`, `cache_key()`, `TTL_SECONDS`, `json`.',
      starter: 'def search_with_cache(keyword):\n    # TODO 2\n    pass\n',
      hints: ['`r = redis_client(); key = cache_key(keyword); cached = r.get(key)`', '`if cached is not None: return json.loads(cached), "Redis"`', '`r.setex(key, TTL_SECONDS, json.dumps(results, ensure_ascii=False))`'],
      solution: `def search_with_cache(keyword):
    r = redis_client()
    key = cache_key(keyword)
    cached = r.get(key)
    if cached is not None:
        return json.loads(cached), 'Redis'
    results = search_postgres(keyword)
    r.setex(key, TTL_SECONDS, json.dumps(results, ensure_ascii=False))
    return results, 'PostgreSQL'
`,
      require: [
        ['cache_key\\s*\\(\\s*keyword', 'Build the key with cache_key(keyword).'],
        ['\\.get\\s*\\(', 'Look up the cache with get().'],
        ['json\\.loads', 'Decode the cached JSON with json.loads.'],
        ['search_postgres\\s*\\(', 'On a miss, query PostgreSQL with search_postgres().'],
        ['setex\\s*\\([^)]*TTL_SECONDS', 'Store the result with setex(key, TTL_SECONDS, ...).'],
        ['json\\.dumps', 'Encode the result with json.dumps before storing it.'],
        ["['\"]Redis['\"]", "Return the source 'Redis' on a hit."],
        ["['\"]PostgreSQL['\"]", "Return the source 'PostgreSQL' on a miss."],
      ],
    },
    {
      id: 'i-3', type: 'text', lang: 'python', title: 'TODO 3 – MongoDB log',
      prompt: 'Implement `log_search(keyword, count, source)`: insert one document into the **search_events** collection of the `MONGO_DB` database with the **keyword**, the **number of results**, the **source**, the **timestamp** (UTC now) and the **lab id** (`LAB_ID`). Close the client afterwards.\n\nAvailable: `mongo_client()`, `MONGO_DB`, `LAB_ID`, `datetime`, `timezone`.',
      starter: 'def log_search(keyword, count, source):\n    # TODO 3\n    pass\n',
      hints: ['`client = mongo_client()`', '`client[MONGO_DB]["search_events"].insert_one({...})`', '`datetime.now(timezone.utc)`', 'try/finally: `client.close()`'],
      solution: `def log_search(keyword, count, source):
    client = mongo_client()
    try:
        client[MONGO_DB]['search_events'].insert_one({
            'lab_id': LAB_ID,
            'keyword': keyword,
            'count': count,
            'source': source,
            'timestamp': datetime.now(timezone.utc),
        })
    finally:
        client.close()
`,
      require: [
        ['mongo_client\\s*\\(', 'Connect with mongo_client().'],
        ['MONGO_DB', 'Use the MONGO_DB database.'],
        ['search_events', "Write to the 'search_events' collection."],
        ['insert_one', 'Insert with insert_one().'],
        ['LAB_ID', 'Store the LAB_ID too.'],
        ['datetime\\.now\\s*\\(\\s*timezone\\.utc', 'Use datetime.now(timezone.utc) for the timestamp.'],
        ['\\.close\\s*\\(', 'Close the client.'],
      ],
    },
    {
      id: 'i-q1', type: 'quiz', title: 'Parameterised queries',
      prompt: 'Why is `cur.execute("... WHERE title ILIKE %s", (pattern,))` better than `cur.execute(f"... WHERE title ILIKE \'{pattern}\'")`?',
      options: ['It is faster to type', 'The driver sends the value separately/escaped, so input like `\'; DROP TABLE x; --` cannot change the SQL (no SQL injection)', 'f-strings don\'t work in Python 3', 'ILIKE only works with %s'],
      answer: 1,
      explain: 'Bind parameters keep data separate from code. In Oracle they also let the shared pool reuse the parsed statement (soft parse).',
    },
    {
      id: 'i-q2', type: 'quiz', title: 'Cache hit / miss',
      prompt: 'In the cache-aside pattern, what happens on a **cache miss**?',
      options: ['The request fails', 'The data is read from the database, stored in the cache with a TTL, then returned', 'The cache is flushed', 'Redis queries PostgreSQL by itself'],
      answer: 1,
      explain: 'The application handles the miss: it reads the source of truth and populates the cache, usually with a TTL so stale data eventually disappears.',
    },
    {
      id: 'i-q3', type: 'quiz', title: 'TTL trade-off',
      prompt: 'What is the risk of a **very long TTL** on cached data?',
      options: ['Higher database load', 'Readers may get stale (outdated) data for a long time after the source changed', 'Redis runs out of keys', 'Nothing'],
      answer: 1,
      explain: 'A short TTL means more DB load but fresher data; a long TTL means less load but more staleness. Explicit invalidation (DEL on change) solves the staleness.',
    },
  ],
};
