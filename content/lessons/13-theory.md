# Theory for the ZH (30 points)

The second part of the ZH asks short theory questions. This module drills them with **quiz questions** (graded instantly)
and **flashcards** (think of your answer, reveal the model answer, rate yourself honestly).

## Oracle architecture

- **Database**: the physical files on disk: **data files**, **control files**, **online redo log files** (+ parameter/password files, archived logs).
- **Instance**: the **memory structures (SGA + PGAs)** and **background processes** that work on a database. A database is opened by one instance (or several in RAC).
- **SGA** (System Global Area): **shared** memory of the instance: **database buffer cache** (data blocks), **shared pool** (library cache: parsed SQL and plans; data dictionary cache), **redo log buffer**, large/Java pool.
- **PGA** (Program Global Area): **private** memory of a server/background process: sort and hash areas, session information, cursor state.
- Background processes: **DBWn** (writes dirty buffers to data files), **LGWR** (writes the redo log buffer to redo log files, e.g. on COMMIT), **CKPT** (checkpoints), **SMON** (instance recovery), **PMON** (cleans up after failed processes), **ARCn** (archiving).
- Logical storage: **tablespace → segment → extent → data block**. A tablespace is physically one or more data files.
- **Data dictionary**: read-only metadata tables/views (`USER_*`, `ALL_*`, `DBA_*`, `V$*`).

## SQL processing and optimisation

Parse (**syntax** check → **semantic** check → **shared pool check**: soft vs hard parse) → **optimisation** (the CBO estimates the
cost of alternative plans using **statistics** and picks the cheapest) → **row source generation** → **execution**.

**Selectivity** = the fraction of rows a predicate keeps. **Cardinality** = the estimated number of rows of a step. **Cost** = the estimated resource usage.

## Database design (lecture 1)

- **1NF**: atomic attribute values (no repeating groups). **2NF**: 1NF + every non-key attribute depends on the **whole** key (no partial dependency).
  **3NF**: 2NF + no **transitive** dependency (non-key → non-key). **BCNF**: every determinant is a candidate key.

## MPP (massively parallel processing)

Many independent nodes (shared-nothing: own CPU, memory, disk). Data is **distributed/partitioned** across nodes, and a query runs
in parallel on every node, then the partial results are combined. Examples: Teradata, Greenplum, Amazon Redshift, Snowflake.

## NoSQL

- **Big Data 3V**: **Volume** (huge amount of data), **Velocity** (speed of generation and processing, streams), **Variety** (structured, semi-structured and unstructured formats). Often extended with Veracity and Value.
- **CAP theorem**: a distributed system can guarantee at most two of **C**onsistency (every read sees the latest write), **A**vailability (every request gets a non-error response), **P**artition tolerance (keeps working despite network partitions). Since partitions happen, the practical choice is CP or AP.
- **ACID** (relational) vs **BASE** (Basically Available, Soft state, Eventually consistent).
- Families: **key-value** (Redis), **document** (MongoDB), **column-family / wide-column** (Cassandra, HBase), **graph** (Neo4j).

## MongoDB

- `_id`: mandatory, **unique primary key** of each document in its collection, automatically indexed; generated as an **ObjectId** if not given.
- **BSON**: Binary JSON, the binary storage/transfer format. It is faster to traverse and has extra types (Date, ObjectId, Int32/64, Decimal128, binary).
- **Replica set**: several servers holding **copies of the same data** (one primary, several secondaries), giving **high availability** and automatic failover.
- **Sharding**: **splitting** the data across several servers by a **shard key**, giving **horizontal scaling** of storage and throughput.

## Graph databases (lecture 9)

Nodes (with labels), **relationships** (typed, directed) and **properties** on both. They are good when the connections themselves are the point
(social networks, recommendations, routes). Neo4j's query language is **Cypher**:
`MATCH (a:Person)-[:LIKES]->(b:Person) WHERE b.name = 'James' RETURN a.name`.

## Column stores (lecture 11)

**Columnar** storage keeps each column's values together. This is great for analytics: you read only the needed columns, and compression works well.
**Wide-column** NoSQL stores (Cassandra, HBase) store rows of column families keyed by a partition key and scale horizontally.
