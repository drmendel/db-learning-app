// A mongosh-like shell emulator on top of the mingo query/aggregation engine.
// Supports: use/show, db.<coll>.insertOne/insertMany/find/findOne/updateOne/updateMany/
// replaceOne/deleteOne/deleteMany/countDocuments/distinct/aggregate/createIndex/getIndexes/
// dropIndex/drop, cursors with sort/skip/limit/toArray/count/explain, ObjectId, ISODate.
import vm from 'vm';
import util from 'util';
import * as mingo from 'mingo';

// ---------- BSON-ish types ----------
let oidCounter = Math.floor(Math.random() * 0xffffff);
const oidRandom = Array.from({ length: 5 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');

export class ObjectId {
  constructor(hex) {
    if (hex instanceof ObjectId) hex = hex.hex;
    if (hex === undefined || hex === null) {
      const ts = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
      oidCounter = (oidCounter + 1) % 0xffffff;
      hex = ts + oidRandom + oidCounter.toString(16).padStart(6, '0');
    }
    if (!/^[0-9a-fA-F]{24}$/.test(String(hex))) {
      throw new ShellError('BSONError: input must be a 24 character hex string, 12 byte Uint8Array, or an integer');
    }
    this.hex = String(hex).toLowerCase();
  }
  toString() { return this.hex; }
  toHexString() { return this.hex; }
  toJSON() { return { $oid: this.hex }; }
  equals(o) { return o instanceof ObjectId && o.hex === this.hex; }
  getTimestamp() { return new Date(parseInt(this.hex.slice(0, 8), 16) * 1000); }
  [util.inspect.custom]() { return `ObjectId('${this.hex}')`; }
}

export class ShellError extends Error {}
class MongoServerError extends ShellError {
  constructor(msg, code) { super(msg); this.name = 'MongoServerError'; this.code = code; }
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) && !(v instanceof ObjectId) && !(v instanceof RegExp);
}

export function clone(v) {
  if (Array.isArray(v)) return v.map(clone);
  if (v instanceof Date) return new Date(v.getTime());
  if (v instanceof ObjectId) return new ObjectId(v.hex);
  if (v instanceof RegExp) return new RegExp(v.source, v.flags);
  if (v && typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v)) o[k] = clone(v[k]);
    return o;
  }
  return v;
}

// Values coming from the vm context have foreign prototypes (Array/Object of another realm).
// Normalise them into this realm.
function importValue(v) {
  if (v === null || v === undefined) return v;
  if (typeof v !== 'object') return v;
  if (v instanceof ObjectId) return new ObjectId(v.hex);
  if (Object.prototype.toString.call(v) === '[object Date]') return new Date(v.getTime());
  if (Object.prototype.toString.call(v) === '[object RegExp]') return new RegExp(v.source, v.flags);
  if (Array.isArray(v)) return v.map(importValue);
  if (v instanceof Cursor || v instanceof AggCursor) return v;
  const o = {};
  for (const k of Object.keys(v)) o[k] = importValue(v[k]);
  return o;
}

// ---------- display ----------
class DisplayDate {
  constructor(d) { this.d = d; }
  [util.inspect.custom]() { return Number.isNaN(this.d.getTime()) ? 'Invalid Date' : `ISODate('${this.d.toISOString()}')`; }
}
function forDisplay(v) {
  if (v instanceof Cursor || v instanceof AggCursor) return forDisplay(v.toArray());
  if (Array.isArray(v)) return v.map(forDisplay);
  if (v instanceof Date || Object.prototype.toString.call(v) === '[object Date]') return new DisplayDate(v);
  if (v instanceof ObjectId) return v;
  if (v && typeof v === 'object' && !(v instanceof RegExp)) {
    const o = {};
    for (const k of Object.keys(v)) o[k] = forDisplay(v[k]);
    return o;
  }
  return v;
}
export function show(v) {
  if (typeof v === 'string') return v;
  return util.inspect(forDisplay(v), { depth: 8, colors: false, breakLength: 80, maxArrayLength: 200, compact: 3, sorted: false });
}

// Plain JSON-able value for comparison: ObjectIds become a placeholder unless keepIds
export function toComparable(v, { keepIds = false } = {}) {
  if (v instanceof Cursor || v instanceof AggCursor) return toComparable(v.toArray(), { keepIds });
  if (Array.isArray(v)) return v.map((x) => toComparable(x, { keepIds }));
  if (v instanceof ObjectId) return keepIds ? `ObjectId(${v.hex})` : 'ObjectId(*)';
  if (v instanceof Date || Object.prototype.toString.call(v) === '[object Date]') return 'Date(*)';
  if (v instanceof RegExp) return String(v);
  if (v && typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v).sort()) o[k] = toComparable(v[k], { keepIds });
    return o;
  }
  if (typeof v === 'number') return Math.round(v * 1e6) / 1e6;
  return v;
}

// ---------- helpers ----------
function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function equalityFields(filter) {
  // fields of the filter usable to seed an upserted document
  const out = {};
  for (const [k, v] of Object.entries(filter || {})) {
    if (k.startsWith('$')) {
      if (k === '$and' && Array.isArray(v)) v.forEach((f) => Object.assign(out, equalityFields(f)));
      continue;
    }
    if (isPlainObject(v) && Object.keys(v).some((x) => x.startsWith('$'))) {
      if ('$eq' in v) setPath(out, k, clone(v.$eq));
      continue;
    }
    setPath(out, k, clone(v));
  }
  return out;
}
function setPath(obj, path, val) {
  const parts = path.split('.');
  let o = obj;
  for (let i = 0; i < parts.length - 1; i++) { if (!isPlainObject(o[parts[i]])) o[parts[i]] = {}; o = o[parts[i]]; }
  o[parts[parts.length - 1]] = val;
}
function checkUpdateDoc(update) {
  if (Array.isArray(update)) return;
  if (!isPlainObject(update)) throw new MongoServerError('Update document must be an object');
  const keys = Object.keys(update);
  if (!keys.length) throw new MongoServerError('Update document requires atomic operators');
  if (!keys.every((k) => k.startsWith('$'))) {
    throw new MongoServerError("Update document requires atomic operators (pl. {$set: {...}}). Use replaceOne() to replace a whole document.");
  }
}
function indexName(keys) {
  return Object.entries(keys).map(([k, v]) => `${k}_${v}`).join('_');
}

// ---------- cursors ----------
class Cursor {
  constructor(coll, filter, projection) {
    this.coll = coll; this.filter = filter || {}; this.projection = projection;
    this._sort = null; this._skip = 0; this._limit = 0; this._cache = null;
  }
  sort(s) { this._sort = importValue(s); return this; }
  skip(n) { this._skip = n; return this; }
  limit(n) { this._limit = n; return this; }
  pretty() { return this; }
  batchSize() { return this; }
  hint() { return this; }
  toArray() {
    if (this._cache) return this._cache;
    let c = mingo.find(this.coll._docs(), this.filter, this.projection && Object.keys(this.projection).length ? this.projection : undefined);
    if (this._sort) c = c.sort(this._sort);
    if (this._skip) c = c.skip(this._skip);
    if (this._limit) c = c.limit(Math.abs(this._limit));
    this._cache = c.all().map(clone);
    return this._cache;
  }
  forEach(fn) { this.toArray().forEach((d) => fn(d)); }
  map(fn) { return this.toArray().map((d) => fn(d)); }
  count() { return mingo.find(this.coll._docs(), this.filter).all().length; }
  size() { return this.toArray().length; }
  itcount() { return this.toArray().length; }
  hasNext() { this._i = this._i || 0; return this._i < this.toArray().length; }
  next() { this._i = this._i || 0; return this.toArray()[this._i++] ?? null; }
  explain(verbosity) { return this.coll._explain(this.filter, verbosity, this.toArray().length); }
}
class AggCursor {
  constructor(result) { this.result = result; }
  toArray() { return this.result; }
  forEach(fn) { this.result.forEach((d) => fn(d)); }
  map(fn) { return this.result.map(fn); }
  pretty() { return this; }
  itcount() { return this.result.length; }
  hasNext() { this._i = this._i || 0; return this._i < this.result.length; }
  next() { this._i = this._i || 0; return this.result[this._i++] ?? null; }
}

// ---------- collection ----------
class Collection {
  constructor(db, name) { this.db = db; this.name = name; }
  _store(create = false) {
    let c = this.db.server.dbs.get(this.db.name)?.get(this.name);
    if (!c && create) {
      if (!this.db.server.dbs.has(this.db.name)) this.db.server.dbs.set(this.db.name, new Map());
      c = { docs: [], indexes: [{ v: 2, key: { _id: 1 }, name: '_id_' }] };
      this.db.server.dbs.get(this.db.name).set(this.name, c);
    }
    return c;
  }
  _docs() { const s = this._store(); return s ? s.docs : []; }
  _checkUnique(docs) {
    const s = this._store(); if (!s) return;
    for (const ix of s.indexes) {
      if (!ix.unique && ix.name !== '_id_') continue;
      const seen = new Map();
      for (const d of docs) {
        const key = JSON.stringify(Object.keys(ix.key).map((k) => toComparable(getPath(d, k) ?? null, { keepIds: true })));
        if (seen.has(key)) {
          const kv = Object.keys(ix.key).map((k) => `${k}: ${show(getPath(d, k) ?? null)}`).join(', ');
          throw new MongoServerError(`E11000 duplicate key error collection: ${this.db.name}.${this.name} index: ${ix.name} dup key: { ${kv} }`, 11000);
        }
        seen.set(key, true);
      }
    }
  }
  _prepare(doc) {
    doc = importValue(doc);
    if (!isPlainObject(doc)) throw new MongoServerError('Document must be an object (pl. {nev: "..."})');
    if (doc._id === undefined) doc = { _id: new ObjectId(), ...doc };
    return doc;
  }
  insertOne(doc) {
    if (arguments.length === 0) throw new ShellError('insertOne() requires a document');
    const s = this._store(true);
    const d = this._prepare(doc);
    this._checkUnique([...s.docs, d]);
    s.docs.push(d);
    return { acknowledged: true, insertedId: clone(d._id) };
  }
  insertMany(docs) {
    docs = importValue(docs);
    if (!Array.isArray(docs)) throw new ShellError('insertMany() requires an array of documents: insertMany([{...}, {...}])');
    const s = this._store(true);
    const prepared = docs.map((d) => this._prepare(d));
    this._checkUnique([...s.docs, ...prepared]);
    s.docs.push(...prepared);
    const ids = {}; prepared.forEach((d, i) => { ids[i] = clone(d._id); });
    return { acknowledged: true, insertedIds: ids };
  }
  insert(docs) { return Array.isArray(docs) ? this.insertMany(docs) : this.insertOne(docs); }
  find(filter, projection) { return new Cursor(this, importValue(filter), importValue(projection)); }
  findOne(filter, projection) {
    const r = new Cursor(this, importValue(filter), importValue(projection)).limit(1).toArray();
    return r.length ? r[0] : null;
  }
  _update(filter, update, options, many) {
    filter = importValue(filter) || {}; update = importValue(update); options = importValue(options) || {};
    checkUpdateDoc(update);
    const s = this._store(true);
    const before = s.docs.map(clone);
    let setOnInsert = null;
    if (!Array.isArray(update) && update.$setOnInsert) { setOnInsert = update.$setOnInsert; update = { ...update }; delete update.$setOnInsert; }
    const cfg = options.arrayFilters ? { arrayFilters: options.arrayFilters } : {};
    let res = { matchedCount: 0, modifiedCount: 0 };
    if (Object.keys(update).length) {
      res = many ? mingo.updateMany(s.docs, filter, update, cfg) : mingo.updateOne(s.docs, filter, update, cfg);
    } else {
      res.matchedCount = mingo.find(s.docs, filter).all().length;
    }
    let upsertedId = null;
    if (res.matchedCount === 0 && options.upsert) {
      const doc = equalityFields(filter);
      if (Object.keys(update).length) mingo.update(doc, update);
      if (setOnInsert) Object.entries(setOnInsert).forEach(([k, v]) => setPath(doc, k, v));
      const d = this._prepare(doc);
      s.docs.push(d);
      upsertedId = clone(d._id);
    }
    try { this._checkUnique(s.docs); } catch (e) { s.docs = before; this._store().docs = before; throw e; }
    return {
      acknowledged: true, insertedId: upsertedId,
      matchedCount: res.matchedCount, modifiedCount: res.modifiedCount, upsertedCount: upsertedId ? 1 : 0,
    };
  }
  updateOne(f, u, o) { return this._update(f, u, o, false); }
  updateMany(f, u, o) { return this._update(f, u, o, true); }
  update(f, u, o) { return this._update(f, u, o, !!(o && o.multi)); }
  replaceOne(filter, doc, options) {
    filter = importValue(filter); doc = importValue(doc); options = importValue(options) || {};
    if (Object.keys(doc).some((k) => k.startsWith('$'))) throw new MongoServerError('Replacement document must not contain atomic operators');
    const s = this._store(true);
    const q = new mingo.Query(filter || {});
    const i = s.docs.findIndex((d) => q.test(d));
    if (i < 0) {
      if (options.upsert) { const d = this._prepare({ ...equalityFields(filter), ...doc }); s.docs.push(d); return { acknowledged: true, insertedId: d._id, matchedCount: 0, modifiedCount: 0, upsertedCount: 1 }; }
      return { acknowledged: true, insertedId: null, matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
    }
    s.docs[i] = { _id: s.docs[i]._id, ...doc };
    return { acknowledged: true, insertedId: null, matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
  }
  findOneAndUpdate(filter, update, options) {
    options = importValue(options) || {};
    const before = this.findOne(filter);
    this.updateOne(filter, update, options);
    if (!before) return options.returnNewDocument || options.returnDocument === 'after' ? this.findOne(filter) : null;
    return options.returnNewDocument || options.returnDocument === 'after' ? this.findOne({ _id: before._id }) : before;
  }
  findOneAndDelete(filter) { const d = this.findOne(filter); if (d) this.deleteOne({ _id: d._id }); return d; }
  _delete(filter, many) {
    filter = importValue(filter);
    if (filter === undefined) throw new ShellError('deleteOne()/deleteMany() requires a filter, e.g. deleteMany({}) to delete everything');
    const s = this._store(); if (!s) return { acknowledged: true, deletedCount: 0 };
    const q = new mingo.Query(filter || {});
    let n = 0;
    s.docs = s.docs.filter((d) => { if ((many || n === 0) && q.test(d)) { n++; return false; } return true; });
    return { acknowledged: true, deletedCount: n };
  }
  deleteOne(f) { return this._delete(f, false); }
  deleteMany(f) { return this._delete(f, true); }
  remove(f) { return this._delete(f, true); }
  countDocuments(filter) { return mingo.find(this._docs(), importValue(filter) || {}).all().length; }
  estimatedDocumentCount() { return this._docs().length; }
  count(filter) { return this.countDocuments(filter); }
  distinct(field, filter) {
    const vals = [];
    for (const d of mingo.find(this._docs(), importValue(filter) || {}).all()) {
      const v = getPath(d, field);
      if (v === undefined) continue;
      if (Array.isArray(v)) vals.push(...v); else vals.push(v);
    }
    const seen = new Map();
    for (const v of vals) { const k = JSON.stringify(toComparable(v, { keepIds: true })); if (!seen.has(k)) seen.set(k, v); }
    return [...seen.values()].sort((a, b) => (typeof a === typeof b ? (a < b ? -1 : a > b ? 1 : 0) : typeof a < typeof b ? -1 : 1)).map(clone);
  }
  aggregate(pipeline, options) {
    pipeline = importValue(pipeline);
    if (!Array.isArray(pipeline)) {
      pipeline = [...arguments].map(importValue);
      if (options && !Array.isArray(options) && !Object.keys(options).some((k) => k.startsWith('$'))) pipeline.pop();
    }
    let out = null;
    const last = pipeline[pipeline.length - 1];
    if (last && (last.$out || last.$merge)) { out = last.$out || (typeof last.$merge === 'string' ? last.$merge : last.$merge.into); pipeline = pipeline.slice(0, -1); }
    const resolver = (name) => this.db.getCollection(name)._docs();
    const result = mingo.aggregate(this._docs().map(clone), pipeline, { collectionResolver: resolver }).map(clone);
    if (out) {
      const target = this.db.getCollection(typeof out === 'string' ? out : out.coll);
      const s = target._store(true);
      s.docs = result.map((d) => (d._id === undefined ? { _id: new ObjectId(), ...d } : d));
      return new AggCursor([]);
    }
    return new AggCursor(result);
  }
  createIndex(keys, options) {
    keys = importValue(keys); options = importValue(options) || {};
    const s = this._store(true);
    const name = options.name || indexName(keys);
    if (!s.indexes.find((i) => i.name === name)) {
      const ix = { v: 2, key: keys, name };
      if (options.unique) ix.unique = true;
      if (options.expireAfterSeconds !== undefined) ix.expireAfterSeconds = options.expireAfterSeconds;
      if (options.partialFilterExpression) ix.partialFilterExpression = options.partialFilterExpression;
      const prev = s.indexes;
      s.indexes = [...prev, ix];
      try { this._checkUnique(s.docs); } catch (e) { s.indexes = prev; throw e; }
    }
    return name;
  }
  createIndexes(list) { return list.map((k) => this.createIndex(k)); }
  ensureIndex(k, o) { return this.createIndex(k, o); }
  getIndexes() { const s = this._store(); return s ? clone(s.indexes) : []; }
  dropIndex(nameOrKeys) {
    const s = this._store(); if (!s) throw new MongoServerError('ns not found');
    const name = typeof nameOrKeys === 'string' ? nameOrKeys : indexName(importValue(nameOrKeys));
    if (name === '_id_') throw new MongoServerError('cannot drop _id index');
    const before = s.indexes.length;
    s.indexes = s.indexes.filter((i) => i.name !== name);
    if (s.indexes.length === before) throw new MongoServerError(`index not found with name [${name}]`);
    return { nIndexesWas: before, ok: 1 };
  }
  dropIndexes() { const s = this._store(); if (s) s.indexes = s.indexes.filter((i) => i.name === '_id_'); return { ok: 1 }; }
  drop() {
    const m = this.db.server.dbs.get(this.db.name);
    return !!(m && m.delete(this.name));
  }
  renameCollection(newName) {
    const m = this.db.server.dbs.get(this.db.name);
    const s = m?.get(this.name); if (!s) throw new MongoServerError('source namespace does not exist');
    m.delete(this.name); m.set(newName, s); return { ok: 1 };
  }
  stats() { return { ns: `${this.db.name}.${this.name}`, count: this._docs().length, nindexes: this.getIndexes().length }; }
  explain() { const self = this; return { find: (f) => ({ explain: (v) => self._explain(importValue(f) || {}, v, self.countDocuments(f)) }) }; }
  _explain(filter, verbosity, nReturned) {
    const s = this._store();
    const fields = Object.keys(filter || {}).filter((k) => !k.startsWith('$'));
    const ix = s && s.indexes.find((i) => fields.includes(Object.keys(i.key)[0]));
    const total = this._docs().length;
    const winningPlan = ix
      ? { stage: 'FETCH', inputStage: { stage: 'IXSCAN', keyPattern: ix.key, indexName: ix.name, direction: 'forward' } }
      : { stage: 'COLLSCAN', filter: filter, direction: 'forward' };
    const res = { explainVersion: '1', queryPlanner: { namespace: `${this.db.name}.${this.name}`, parsedQuery: filter, winningPlan, rejectedPlans: [] } };
    if (verbosity === 'executionStats' || verbosity === 'allPlansExecution') {
      res.executionStats = {
        executionSuccess: true, nReturned,
        totalKeysExamined: ix ? nReturned : 0,
        totalDocsExamined: ix ? nReturned : total,
      };
    }
    res.note = '(simplified explain from the practice emulator)';
    return res;
  }
  toString() { return `${this.db.name}.${this.name}`; }
  [util.inspect.custom]() { return `${this.db.name}.${this.name}`; }
}

// ---------- database ----------
class Database {
  constructor(server, name) { this.server = server; this.name = name; }
  getName() { return this.name; }
  getCollection(name) { return new Collection(this, name); }
  getSiblingDB(name) { return makeDbProxy(new Database(this.server, name)); }
  getCollectionNames() { return [...(this.server.dbs.get(this.name)?.keys() || [])].sort(); }
  getCollectionInfos() { return this.getCollectionNames().map((n) => ({ name: n, type: 'collection' })); }
  createCollection(name) {
    if (this.server.dbs.get(this.name)?.has(name)) throw new MongoServerError(`Collection ${this.name}.${name} already exists.`, 48);
    new Collection(this, name)._store(true); return { ok: 1 };
  }
  dropDatabase() { this.server.dbs.delete(this.name); return { ok: 1, dropped: this.name }; }
  stats() { return { db: this.name, collections: this.getCollectionNames().length }; }
  toString() { return this.name; }
  [util.inspect.custom]() { return this.name; }
}
function makeDbProxy(dbObj) {
  return new Proxy(dbObj, {
    get(target, prop) {
      if (typeof prop === 'symbol') return target[prop];
      if (prop in target) { const v = target[prop]; return typeof v === 'function' ? v.bind(target) : v; }
      if (prop === 'then') return undefined;
      return target.getCollection(prop);
    },
  });
}

// ---------- statement splitting ----------
export function splitStatements(code) {
  const stmts = [];
  let cur = '';
  let depth = 0;
  let i = 0;
  const n = code.length;
  let lastSig = ''; // last significant char (for regex detection)
  const pushCur = () => { if (cur.trim()) stmts.push(cur.trim()); cur = ''; };
  while (i < n) {
    const c = code[i];
    const c2 = code[i + 1];
    if (c === '/' && c2 === '/') { while (i < n && code[i] !== '\n') i++; continue; }
    if (c === '/' && c2 === '*') { const j = code.indexOf('*/', i + 2); i = j < 0 ? n : j + 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < n && code[j] !== c) { if (code[j] === '\\') j++; j++; }
      cur += code.slice(i, j + 1); i = j + 1; lastSig = c; continue;
    }
    if (c === '/' && (lastSig === '' || '(,:=[!&|?{};'.includes(lastSig))) {
      // regex literal
      let j = i + 1; let inClass = false;
      while (j < n && code[j] !== '\n') {
        if (code[j] === '\\') { j += 2; continue; }
        if (code[j] === '[') inClass = true; else if (code[j] === ']') inClass = false;
        else if (code[j] === '/' && !inClass) break;
        j++;
      }
      j++;
      while (j < n && /[a-z]/i.test(code[j])) j++;
      cur += code.slice(i, j); i = j; lastSig = '/'; continue;
    }
    if ('([{'.includes(c)) depth++;
    if (')]}'.includes(c)) depth--;
    if (c === ';' && depth <= 0) { pushCur(); i++; lastSig = ';'; continue; }
    if (c === '\n' && depth <= 0) {
      // does the statement continue on the next line?
      const rest = code.slice(i + 1);
      const nextLine = rest.replace(/^(\s*(\/\/[^\n]*)?\n)*/, '').trimStart();
      const trimmed = cur.trimEnd();
      const last = trimmed[trimmed.length - 1];
      if (trimmed && !nextLine.startsWith('.') && !(last && '=+-*/,.(&|?:'.includes(last))) { pushCur(); i++; continue; }
    }
    cur += c;
    if (!/\s/.test(c)) lastSig = c;
    i++;
  }
  pushCur();
  return stmts;
}

// ---------- shell ----------
function displayStmt(stmt) {
  return stmt.replace(/^use\("([\w-]+)"\);?$/, 'use $1').replace(/^__show\("(\w+)"\);?$/, 'show $1');
}

export class MongoServer {
  constructor() { this.dbs = new Map(); this.currentDb = 'test'; }

  // Load seed data quickly: { dbName: { coll: [docs] } }
  load(seed) {
    for (const [dbName, colls] of Object.entries(seed)) {
      if (!this.dbs.has(dbName)) this.dbs.set(dbName, new Map());
      for (const [c, docs] of Object.entries(colls)) {
        const store = { docs: [], indexes: [{ v: 2, key: { _id: 1 }, name: '_id_' }] };
        store.docs = docs.map((d) => { const x = clone(d); if (x._id === undefined) x._id = new ObjectId(); return { _id: x._id, ...x }; });
        this.dbs.get(dbName).set(c, store);
      }
    }
  }

  snapshotDb(name) {
    const out = {};
    for (const [c, s] of this.dbs.get(name) || []) out[c] = toComparable(s.docs);
    return out;
  }

  // Execute shell code. Returns {outputs:[{stmt, text, value}], last, error}
  execute(code) {
    const outputs = [];
    let last;
    let hasLast = false;
    const server = this;
    const printed = [];
    const ctx = {
      ObjectId: function (h) { return new ObjectId(h); },
      ISODate: (s) => (s === undefined ? new Date() : new Date(s)),
      NumberInt: (n) => Number(n), NumberLong: (n) => Number(n), NumberDecimal: (n) => Number(n), Int32: (n) => Number(n), Double: (n) => Number(n),
      print: (...a) => { printed.push(a.map((x) => (typeof x === 'string' ? x : show(x))).join(' ')); },
      printjson: (x) => { printed.push(show(x)); },
      console: { log: (...a) => { printed.push(a.map((x) => (typeof x === 'string' ? x : show(x))).join(' ')); } },
      use: (name) => { server.currentDb = String(name); return `switched to db ${name}`; },
      __show: (what) => {
        if (what === 'dbs' || what === 'databases') return [...server.dbs.keys()].sort().map((d) => `${d.padEnd(20)} ${server.dbs.get(d).size} collection(s)`).join('\n') || '(no databases)';
        if (what === 'collections' || what === 'tables') return new Database(server, server.currentDb).getCollectionNames().join('\n') || '(no collections)';
        throw new ShellError(`MongoshInvalidInputError: 'show ${what}' is not supported here (try: show dbs, show collections)`);
      },
      load: () => { throw new ShellError('load() is not available in the practice app – paste the script content instead.'); },
      sleep: () => {},
    };
    Object.defineProperty(ctx, 'db', {
      get: () => makeDbProxy(new Database(server, server.currentDb)),
      set: (v) => { if (v && typeof v.getName === 'function') server.currentDb = v.getName(); },
      enumerable: true,
    });
    const context = vm.createContext(ctx);
    // pre-process shell helpers
    const pre = code
      .replace(/^\s*use\s+([\w-]+)\s*;?\s*$/gm, 'use("$1");')
      .replace(/^\s*show\s+(\w+)\s*;?\s*$/gm, '__show("$1");')
      .replace(/^\s*it\s*;?\s*$/gm, '');
    const stmts = splitStatements(pre);
    for (const stmt of stmts) {
      try {
        let v = vm.runInContext(stmt, context, { timeout: 3000, displayErrors: false });
        if (v instanceof Cursor || v instanceof AggCursor) v = v.toArray();
        else v = importValue(v);
        const text = printed.length ? printed.splice(0).join('\n') + (v === undefined ? '' : '\n' + show(v)) : (v === undefined ? '' : show(v));
        outputs.push({ stmt: displayStmt(stmt), text });
        if (v !== undefined && !(typeof v === 'string' && v.startsWith('switched to db'))) { last = v; hasLast = true; }
      } catch (e) {
        const text = printed.splice(0).join('\n');
        const name = e && e.name && e.name !== 'Error' && !(e instanceof ShellError && !(e instanceof MongoServerError)) ? e.name + ': ' : '';
        const msg = (e && e.message) || String(e);
        outputs.push({ stmt: displayStmt(stmt), text: (text ? text + '\n' : '') + `${name}${msg}`, error: true });
        return { outputs, last, hasLast, error: `${name}${msg}`, failedStmt: displayStmt(stmt) };
      }
    }
    return { outputs, last, hasLast };
  }
}
