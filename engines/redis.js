// A small in-memory Redis emulator covering the commands used in the course
// (strings, numbers, TTL, lists, sets, sorted sets, hashes, MULTI/EXEC).
// Replies are returned as typed values so they can be compared and printed
// the same way redis-cli prints them.

export class RedisError extends Error {}

const OK = { type: 'status', value: 'OK' };
const st = (v) => ({ type: 'status', value: v });
const int = (n) => ({ type: 'int', value: n });
const bulk = (s) => (s === null || s === undefined ? { type: 'nil' } : { type: 'bulk', value: String(s) });
const arr = (items) => ({ type: 'array', value: items });
const NIL = { type: 'nil' };

function wrongType() {
  return new RedisError('WRONGTYPE Operation against a key holding the wrong kind of value');
}
function syntaxErr() { return new RedisError('ERR syntax error'); }
function notInt() { return new RedisError('ERR value is not an integer or out of range'); }
function notFloat() { return new RedisError('ERR value is not a valid float'); }

function toInt(s) {
  if (!/^[+-]?\d+$/.test(String(s))) throw notInt();
  return parseInt(s, 10);
}
function toFloat(s) {
  const str = String(s).toLowerCase();
  if (str === '+inf' || str === 'inf') return Infinity;
  if (str === '-inf') return -Infinity;
  const n = Number(s);
  if (s === '' || Number.isNaN(n)) throw notFloat();
  return n;
}
function fmtFloat(n) {
  if (n === Infinity) return 'inf';
  if (n === -Infinity) return '-inf';
  // Redis prints e.g. 10.5, 3, 0.1 (up to 17 significant digits)
  let s = String(Number(n.toPrecision(17)));
  if (s.includes('e')) s = n.toString();
  return s;
}

// Glob pattern for KEYS
function globToRegex(p) {
  let re = '^';
  for (let i = 0; i < p.length; i++) {
    const c = p[i];
    if (c === '*') re += '.*';
    else if (c === '?') re += '.';
    else if (c === '[') {
      const j = p.indexOf(']', i);
      if (j < 0) re += '\\[';
      else { re += '[' + p.slice(i + 1, j).replace(/^\^/, '^') + ']'; i = j; }
    } else if (c === '\\' && i + 1 < p.length) { re += '\\' + p[++i]; }
    else re += c.replace(/[.+^${}()|\\]/g, '\\$&');
  }
  return new RegExp(re + '$', 's');
}

// Normalise a Redis index range (start, stop may be negative)
function range(len, start, stop) {
  if (start < 0) start = len + start;
  if (stop < 0) stop = len + stop;
  if (start < 0) start = 0;
  if (stop >= len) stop = len - 1;
  return [start, stop];
}

// Tokenise a redis-cli style command line: handles "double" and 'single' quotes
export function tokenize(line) {
  const out = [];
  let i = 0;
  const n = line.length;
  while (i < n) {
    while (i < n && /\s/.test(line[i])) i++;
    if (i >= n) break;
    let tok = '';
    let quoted = false;
    while (i < n && !/\s/.test(line[i])) {
      const c = line[i];
      if (c === '"' || c === '“' || c === '”' || c === '„') {
        quoted = true; i++;
        while (i < n && !['"', '“', '”'].includes(line[i])) {
          if (line[i] === '\\' && i + 1 < n) {
            const e = line[i + 1];
            tok += e === 'n' ? '\n' : e === 't' ? '\t' : e; i += 2;
          } else tok += line[i++];
        }
        if (i >= n) throw new RedisError('Invalid argument(s): unbalanced quotes');
        i++;
      } else if (c === "'") {
        quoted = true; i++;
        while (i < n && line[i] !== "'") tok += line[i++];
        if (i >= n) throw new RedisError('Invalid argument(s): unbalanced quotes');
        i++;
      } else { tok += c; i++; }
    }
    out.push(tok);
    void quoted;
  }
  return out;
}

export class RedisEmulator {
  constructor() {
    this.data = new Map(); // key -> {type, value, expireAt}
    this.inMulti = false;
    this.queue = [];
  }

  // ---- key helpers ----
  _alive(key) {
    const e = this.data.get(key);
    if (!e) return null;
    if (e.expireAt !== undefined && e.expireAt <= Date.now()) { this.data.delete(key); return null; }
    return e;
  }
  _get(key, type) {
    const e = this._alive(key);
    if (!e) return null;
    if (type && e.type !== type) throw wrongType();
    return e;
  }
  _getOrCreate(key, type, init) {
    let e = this._get(key, type);
    if (!e) { e = { type, value: init() }; this.data.set(key, e); }
    return e;
  }
  _cleanupEmpty(key) {
    const e = this.data.get(key);
    if (!e) return;
    const v = e.value;
    if ((e.type === 'list' && v.length === 0) || ((e.type === 'set' || e.type === 'hash' || e.type === 'zset') && v.size === 0)) {
      this.data.delete(key);
    }
  }
  _str(key) { const e = this._get(key, 'string'); return e ? e.value : null; }

  // Run one command line (string) or token array -> reply
  run(input) {
    const args = Array.isArray(input) ? input : tokenize(input);
    if (args.length === 0) return null;
    const cmd = args[0].toUpperCase();
    const a = args.slice(1);
    if (this.inMulti && !['EXEC', 'DISCARD', 'MULTI', 'WATCH'].includes(cmd)) {
      if (!this['c_' + cmd]) return { type: 'error', value: `ERR unknown command '${args[0]}'` };
      this.queue.push(args);
      return st('QUEUED');
    }
    const fn = this['c_' + cmd];
    if (!fn) return { type: 'error', value: `ERR unknown command '${args[0]}', with args beginning with: ${a.slice(0, 3).map((x) => `'${x}'`).join(' ')}` };
    try {
      return fn.call(this, a);
    } catch (e) {
      if (e instanceof RedisError) return { type: 'error', value: e.message };
      throw e;
    }
  }
  _arity(a, min, max = min) {
    if (a.length < min || (max !== Infinity && a.length > max)) throw new RedisError(`ERR wrong number of arguments for command`);
  }

  // ---- generic ----
  c_PING(a) { return a.length ? bulk(a[0]) : st('PONG'); }
  c_ECHO(a) { this._arity(a, 1); return bulk(a[0]); }
  c_SELECT() { return OK; }
  c_FLUSHDB() { this.data.clear(); return OK; }
  c_FLUSHALL() { this.data.clear(); return OK; }
  c_DBSIZE() { let n = 0; for (const k of [...this.data.keys()]) if (this._alive(k)) n++; return int(n); }
  c_DEL(a) { this._arity(a, 1, Infinity); let n = 0; for (const k of a) { if (this._alive(k)) { this.data.delete(k); n++; } } return int(n); }
  c_UNLINK(a) { return this.c_DEL(a); }
  c_EXISTS(a) { this._arity(a, 1, Infinity); return int(a.filter((k) => this._alive(k)).length); }
  c_KEYS(a) {
    this._arity(a, 1);
    const re = globToRegex(a[0]);
    return arr([...this.data.keys()].filter((k) => this._alive(k) && re.test(k)).map(bulk));
  }
  c_TYPE(a) { this._arity(a, 1); const e = this._alive(a[0]); return st(e ? e.type : 'none'); }
  c_RENAME(a) {
    this._arity(a, 2);
    const e = this._alive(a[0]);
    if (!e) throw new RedisError('ERR no such key');
    this.data.delete(a[0]); this.data.set(a[1], e); return OK;
  }
  c_EXPIRE(a) {
    this._arity(a, 2, 3);
    const e = this._alive(a[0]); if (!e) return int(0);
    const s = toInt(a[1]);
    e.expireAt = Date.now() + s * 1000;
    if (s <= 0) this.data.delete(a[0]);
    return int(1);
  }
  c_PEXPIRE(a) { this._arity(a, 2); const e = this._alive(a[0]); if (!e) return int(0); e.expireAt = Date.now() + toInt(a[1]); return int(1); }
  c_TTL(a) {
    this._arity(a, 1);
    const e = this._alive(a[0]); if (!e) return int(-2);
    if (e.expireAt === undefined) return int(-1);
    return int(Math.round((e.expireAt - Date.now()) / 1000));
  }
  c_PTTL(a) {
    this._arity(a, 1);
    const e = this._alive(a[0]); if (!e) return int(-2);
    if (e.expireAt === undefined) return int(-1);
    return int(e.expireAt - Date.now());
  }
  c_PERSIST(a) { this._arity(a, 1); const e = this._alive(a[0]); if (!e || e.expireAt === undefined) return int(0); delete e.expireAt; return int(1); }

  // ---- strings ----
  c_SET(a) {
    if (a.length < 2) throw new RedisError("ERR wrong number of arguments for 'set' command");
    const [key, val] = a;
    let ex, nx = false, xx = false, get = false, keepttl = false;
    for (let i = 2; i < a.length; i++) {
      const o = a[i].toUpperCase();
      if (o === 'EX') { ex = toInt(a[++i]) * 1000; if (ex <= 0) throw new RedisError("ERR invalid expire time in 'set' command"); }
      else if (o === 'PX') ex = toInt(a[++i]);
      else if (o === 'NX') nx = true;
      else if (o === 'XX') xx = true;
      else if (o === 'GET') get = true;
      else if (o === 'KEEPTTL') keepttl = true;
      else throw syntaxErr();
    }
    const old = this._alive(key);
    if (get && old && old.type !== 'string') throw wrongType();
    const oldVal = old && old.type === 'string' ? old.value : null;
    if ((nx && old) || (xx && !old)) return get ? bulk(oldVal) : NIL;
    const e = { type: 'string', value: val };
    if (ex !== undefined) e.expireAt = Date.now() + ex;
    else if (keepttl && old) e.expireAt = old.expireAt;
    this.data.set(key, e);
    return get ? bulk(oldVal) : OK;
  }
  c_SETEX(a) { this._arity(a, 3); return this.c_SET([a[0], a[2], 'EX', a[1]]); }
  c_PSETEX(a) { this._arity(a, 3); return this.c_SET([a[0], a[2], 'PX', a[1]]); }
  c_SETNX(a) { this._arity(a, 2); return int(this.c_SET([a[0], a[1], 'NX']).type === 'status' ? 1 : 0); }
  c_GET(a) { this._arity(a, 1); return bulk(this._str(a[0])); }
  c_GETDEL(a) { this._arity(a, 1); const v = this._str(a[0]); if (v !== null) this.data.delete(a[0]); return bulk(v); }
  c_GETSET(a) { this._arity(a, 2); return this.c_SET([a[0], a[1], 'GET']); }
  c_MSET(a) {
    if (a.length === 0 || a.length % 2) throw new RedisError("ERR wrong number of arguments for 'mset' command");
    for (let i = 0; i < a.length; i += 2) this.data.set(a[i], { type: 'string', value: a[i + 1] });
    return OK;
  }
  c_MSETNX(a) {
    for (let i = 0; i < a.length; i += 2) if (this._alive(a[i])) return int(0);
    this.c_MSET(a); return int(1);
  }
  c_MGET(a) {
    this._arity(a, 1, Infinity);
    return arr(a.map((k) => { const e = this._alive(k); return e && e.type === 'string' ? bulk(e.value) : NIL; }));
  }
  c_APPEND(a) {
    this._arity(a, 2);
    const e = this._getOrCreate(a[0], 'string', () => '');
    e.value += a[1];
    return int(Buffer.byteLength(e.value));
  }
  c_STRLEN(a) { this._arity(a, 1); const v = this._str(a[0]); return int(v === null ? 0 : Buffer.byteLength(v)); }
  c_GETRANGE(a) {
    this._arity(a, 3);
    const v = this._str(a[0]) ?? '';
    const buf = Buffer.from(v);
    let [s, e] = range(buf.length, toInt(a[1]), toInt(a[2]));
    if (s > e || buf.length === 0) return bulk('');
    return bulk(buf.subarray(s, e + 1).toString());
  }
  c_SUBSTR(a) { return this.c_GETRANGE(a); }
  c_SETRANGE(a) {
    this._arity(a, 3);
    const off = toInt(a[1]);
    if (off < 0) throw new RedisError('ERR offset is out of range');
    const e = this._getOrCreate(a[0], 'string', () => '');
    let buf = Buffer.from(e.value);
    const ins = Buffer.from(a[2]);
    if (buf.length < off + ins.length) { const nb = Buffer.alloc(off + ins.length); buf.copy(nb); buf = nb; }
    ins.copy(buf, off);
    e.value = buf.toString();
    return int(buf.length);
  }
  c_LCS(a) {
    if (a.length < 2) throw new RedisError("ERR wrong number of arguments for 'lcs' command");
    const x = this._str(a[0]) ?? '', y = this._str(a[1]) ?? '';
    const opts = a.slice(2).map((s) => s.toUpperCase());
    const dp = Array.from({ length: x.length + 1 }, () => new Array(y.length + 1).fill(0));
    for (let i = 1; i <= x.length; i++) for (let j = 1; j <= y.length; j++)
      dp[i][j] = x[i - 1] === y[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    if (opts.includes('LEN')) return int(dp[x.length][y.length]);
    let i = x.length, j = y.length, s = '';
    while (i > 0 && j > 0) {
      if (x[i - 1] === y[j - 1]) { s = x[i - 1] + s; i--; j--; }
      else if (dp[i - 1][j] >= dp[i][j - 1]) i--; else j--;
    }
    return bulk(s);
  }
  _incr(key, by) {
    const e = this._get(key, 'string');
    const cur = e ? e.value : '0';
    if (!/^[+-]?\d+$/.test(cur)) throw notInt();
    const n = parseInt(cur, 10) + by;
    if (e) e.value = String(n); else this.data.set(key, { type: 'string', value: String(n) });
    return int(n);
  }
  c_INCR(a) { this._arity(a, 1); return this._incr(a[0], 1); }
  c_DECR(a) { this._arity(a, 1); return this._incr(a[0], -1); }
  c_INCRBY(a) { this._arity(a, 2); return this._incr(a[0], toInt(a[1])); }
  c_DECRBY(a) { this._arity(a, 2); return this._incr(a[0], -toInt(a[1])); }
  c_INCRBYFLOAT(a) {
    this._arity(a, 2);
    const e = this._get(a[0], 'string');
    const cur = e ? toFloat(e.value) : 0;
    const v = fmtFloat(cur + toFloat(a[1]));
    if (e) e.value = v; else this.data.set(a[0], { type: 'string', value: v });
    return bulk(v);
  }

  // ---- lists ----
  _list(key) { const e = this._get(key, 'list'); return e ? e.value : null; }
  c_LPUSH(a) {
    this._arity(a, 2, Infinity);
    const e = this._getOrCreate(a[0], 'list', () => []);
    for (const v of a.slice(1)) e.value.unshift(v);
    return int(e.value.length);
  }
  c_RPUSH(a) {
    this._arity(a, 2, Infinity);
    const e = this._getOrCreate(a[0], 'list', () => []);
    e.value.push(...a.slice(1));
    return int(e.value.length);
  }
  c_LPUSHX(a) { return this._list(a[0]) ? this.c_LPUSH(a) : int(0); }
  c_RPUSHX(a) { return this._list(a[0]) ? this.c_RPUSH(a) : int(0); }
  _pop(a, left) {
    this._arity(a, 1, 2);
    const l = this._list(a[0]);
    if (a.length === 2) {
      const c = toInt(a[1]);
      if (!l) return NIL;
      const out = [];
      for (let i = 0; i < c && l.length; i++) out.push(left ? l.shift() : l.pop());
      this._cleanupEmpty(a[0]);
      return arr(out.map(bulk));
    }
    if (!l || !l.length) return NIL;
    const v = left ? l.shift() : l.pop();
    this._cleanupEmpty(a[0]);
    return bulk(v);
  }
  c_LPOP(a) { return this._pop(a, true); }
  c_RPOP(a) { return this._pop(a, false); }
  c_LRANGE(a) {
    this._arity(a, 3);
    const l = this._list(a[0]) || [];
    const [s, e] = range(l.length, toInt(a[1]), toInt(a[2]));
    if (s > e) return arr([]);
    return arr(l.slice(s, e + 1).map(bulk));
  }
  c_LLEN(a) { this._arity(a, 1); const l = this._list(a[0]); return int(l ? l.length : 0); }
  c_LINDEX(a) {
    this._arity(a, 2);
    const l = this._list(a[0]) || [];
    let i = toInt(a[1]); if (i < 0) i += l.length;
    return i >= 0 && i < l.length ? bulk(l[i]) : NIL;
  }
  c_LPOS(a) {
    this._arity(a, 2, Infinity);
    const l = this._list(a[0]) || [];
    let rank = 1, count = null;
    for (let i = 2; i < a.length; i++) {
      const o = a[i].toUpperCase();
      if (o === 'RANK') rank = toInt(a[++i]);
      else if (o === 'COUNT') count = toInt(a[++i]);
      else if (o === 'MAXLEN') i++;
      else throw syntaxErr();
    }
    const idx = [];
    if (rank > 0) { let seen = 0; for (let i = 0; i < l.length; i++) if (l[i] === a[1] && ++seen >= rank) idx.push(i); }
    else { let seen = 0; for (let i = l.length - 1; i >= 0; i--) if (l[i] === a[1] && ++seen >= -rank) idx.push(i); }
    if (count === null) return idx.length ? int(idx[0]) : NIL;
    return arr((count === 0 ? idx : idx.slice(0, count)).map(int));
  }
  c_LSET(a) {
    this._arity(a, 3);
    const l = this._list(a[0]);
    if (!l) throw new RedisError('ERR no such key');
    let i = toInt(a[1]); if (i < 0) i += l.length;
    if (i < 0 || i >= l.length) throw new RedisError('ERR index out of range');
    l[i] = a[2]; return OK;
  }
  c_LREM(a) {
    this._arity(a, 3);
    const l = this._list(a[0]); if (!l) return int(0);
    let count = toInt(a[1]); const v = a[2]; let removed = 0;
    if (count >= 0) {
      for (let i = 0; i < l.length && (count === 0 || removed < count);) { if (l[i] === v) { l.splice(i, 1); removed++; } else i++; }
    } else {
      count = -count;
      for (let i = l.length - 1; i >= 0 && removed < count; i--) if (l[i] === v) { l.splice(i, 1); removed++; }
    }
    this._cleanupEmpty(a[0]);
    return int(removed);
  }
  c_LINSERT(a) {
    this._arity(a, 4);
    const l = this._list(a[0]); if (!l) return int(0);
    const where = a[1].toUpperCase();
    if (where !== 'BEFORE' && where !== 'AFTER') throw syntaxErr();
    const i = l.indexOf(a[2]);
    if (i < 0) return int(-1);
    l.splice(where === 'BEFORE' ? i : i + 1, 0, a[3]);
    return int(l.length);
  }
  c_LTRIM(a) {
    this._arity(a, 3);
    const e = this._get(a[0], 'list'); if (!e) return OK;
    const [s, en] = range(e.value.length, toInt(a[1]), toInt(a[2]));
    e.value = s > en ? [] : e.value.slice(s, en + 1);
    this._cleanupEmpty(a[0]);
    return OK;
  }
  c_LMOVE(a) {
    this._arity(a, 4);
    const src = this._list(a[0]); if (!src || !src.length) return NIL;
    const v = a[2].toUpperCase() === 'LEFT' ? src.shift() : src.pop();
    const dst = this._getOrCreate(a[1], 'list', () => []).value;
    if (a[3].toUpperCase() === 'LEFT') dst.unshift(v); else dst.push(v);
    this._cleanupEmpty(a[0]);
    return bulk(v);
  }
  c_RPOPLPUSH(a) { return this.c_LMOVE([a[0], a[1], 'RIGHT', 'LEFT']); }

  // ---- sets ----
  _set(key) { const e = this._get(key, 'set'); return e ? e.value : null; }
  c_SADD(a) {
    this._arity(a, 2, Infinity);
    const s = this._getOrCreate(a[0], 'set', () => new Set()).value;
    let n = 0; for (const v of a.slice(1)) if (!s.has(v)) { s.add(v); n++; }
    return int(n);
  }
  c_SREM(a) {
    this._arity(a, 2, Infinity);
    const s = this._set(a[0]); if (!s) return int(0);
    let n = 0; for (const v of a.slice(1)) if (s.delete(v)) n++;
    this._cleanupEmpty(a[0]);
    return int(n);
  }
  c_SMEMBERS(a) { this._arity(a, 1); return arr([...(this._set(a[0]) || [])].map(bulk)); }
  c_SISMEMBER(a) { this._arity(a, 2); const s = this._set(a[0]); return int(s && s.has(a[1]) ? 1 : 0); }
  c_SMISMEMBER(a) { this._arity(a, 2, Infinity); const s = this._set(a[0]) || new Set(); return arr(a.slice(1).map((v) => int(s.has(v) ? 1 : 0))); }
  c_SCARD(a) { this._arity(a, 1); const s = this._set(a[0]); return int(s ? s.size : 0); }
  c_SPOP(a) {
    this._arity(a, 1, 2);
    const s = this._set(a[0]);
    if (a.length === 2) {
      const c = toInt(a[1]); if (!s) return arr([]);
      const items = [...s].sort(() => Math.random() - 0.5).slice(0, c);
      items.forEach((v) => s.delete(v)); this._cleanupEmpty(a[0]);
      return arr(items.map(bulk));
    }
    if (!s || !s.size) return NIL;
    const items = [...s]; const v = items[Math.floor(Math.random() * items.length)];
    s.delete(v); this._cleanupEmpty(a[0]);
    return bulk(v);
  }
  c_SRANDMEMBER(a) {
    this._arity(a, 1, 2);
    const items = [...(this._set(a[0]) || [])];
    if (a.length === 2) {
      const c = toInt(a[1]);
      if (c >= 0) return arr(items.sort(() => Math.random() - 0.5).slice(0, c).map(bulk));
      return arr(Array.from({ length: -c }, () => bulk(items[Math.floor(Math.random() * items.length)])).filter(() => items.length));
    }
    return items.length ? bulk(items[Math.floor(Math.random() * items.length)]) : NIL;
  }
  c_SMOVE(a) {
    this._arity(a, 3);
    const src = this._set(a[0]); const dstE = this._get(a[1], 'set');
    if (!src || !src.has(a[2])) return int(0);
    src.delete(a[2]); this._cleanupEmpty(a[0]);
    (dstE ? dstE.value : this._getOrCreate(a[1], 'set', () => new Set()).value).add(a[2]);
    return int(1);
  }
  _setsOf(keys) { return keys.map((k) => this._set(k) || new Set()); }
  _inter(keys) { const [f, ...r] = this._setsOf(keys); return [...f].filter((v) => r.every((s) => s.has(v))); }
  _union(keys) { const out = new Set(); for (const s of this._setsOf(keys)) for (const v of s) out.add(v); return [...out]; }
  _diff(keys) { const [f, ...r] = this._setsOf(keys); return [...f].filter((v) => !r.some((s) => s.has(v))); }
  c_SINTER(a) { this._arity(a, 1, Infinity); return arr(this._inter(a).map(bulk)); }
  c_SUNION(a) { this._arity(a, 1, Infinity); return arr(this._union(a).map(bulk)); }
  c_SDIFF(a) { this._arity(a, 1, Infinity); return arr(this._diff(a).map(bulk)); }
  _store(dst, items) { this.data.delete(dst); if (items.length) this.data.set(dst, { type: 'set', value: new Set(items) }); return int(items.length); }
  c_SINTERSTORE(a) { this._arity(a, 2, Infinity); return this._store(a[0], this._inter(a.slice(1))); }
  c_SUNIONSTORE(a) { this._arity(a, 2, Infinity); return this._store(a[0], this._union(a.slice(1))); }
  c_SDIFFSTORE(a) { this._arity(a, 2, Infinity); return this._store(a[0], this._diff(a.slice(1))); }
  c_SINTERCARD(a) { const n = toInt(a[0]); return int(this._inter(a.slice(1, 1 + n)).length); }
  c_SSCAN(a) { this._arity(a, 2, Infinity); return arr([bulk('0'), arr([...(this._set(a[0]) || [])].map(bulk))]); }

  // ---- sorted sets ----
  _zset(key) { const e = this._get(key, 'zset'); return e ? e.value : null; }
  _zsorted(z) {
    return [...z.entries()].sort((x, y) => x[1] - y[1] || (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0));
  }
  c_ZADD(a) {
    if (a.length < 3) throw new RedisError("ERR wrong number of arguments for 'zadd' command");
    let i = 1; let nx = false, xx = false, gt = false, lt = false, ch = false, incr = false;
    for (; i < a.length; i++) {
      const o = a[i].toUpperCase();
      if (o === 'NX') nx = true; else if (o === 'XX') xx = true; else if (o === 'GT') gt = true;
      else if (o === 'LT') lt = true; else if (o === 'CH') ch = true; else if (o === 'INCR') incr = true;
      else break;
    }
    const pairs = a.slice(i);
    if (pairs.length === 0 || pairs.length % 2) throw syntaxErr();
    if (nx && (gt || lt || xx)) throw new RedisError('ERR GT, LT, and/or NX options at the same time are not compatible');
    const parsed = [];
    for (let j = 0; j < pairs.length; j += 2) parsed.push([toFloat(pairs[j]), pairs[j + 1]]);
    const z = this._getOrCreate(a[0], 'zset', () => new Map()).value;
    let added = 0, changed = 0, last = null;
    for (const [score, m] of parsed) {
      const has = z.has(m);
      if ((nx && has) || (xx && !has)) { last = null; continue; }
      let ns = incr && has ? z.get(m) + score : score;
      if (has && ((gt && ns <= z.get(m)) || (lt && ns >= z.get(m)))) { last = null; continue; }
      if (!has) added++; else if (z.get(m) !== ns) changed++;
      z.set(m, ns); last = ns;
    }
    this._cleanupEmpty(a[0]);
    if (incr) return last === null ? NIL : bulk(fmtFloat(last));
    return int(ch ? added + changed : added);
  }
  c_ZINCRBY(a) {
    this._arity(a, 3);
    const z = this._getOrCreate(a[0], 'zset', () => new Map()).value;
    const v = (z.get(a[2]) || 0) + toFloat(a[1]);
    z.set(a[2], v); return bulk(fmtFloat(v));
  }
  c_ZSCORE(a) { this._arity(a, 2); const z = this._zset(a[0]); return z && z.has(a[1]) ? bulk(fmtFloat(z.get(a[1]))) : NIL; }
  c_ZMSCORE(a) { const z = this._zset(a[0]) || new Map(); return arr(a.slice(1).map((m) => (z.has(m) ? bulk(fmtFloat(z.get(m))) : NIL))); }
  c_ZCARD(a) { this._arity(a, 1); const z = this._zset(a[0]); return int(z ? z.size : 0); }
  c_ZREM(a) {
    this._arity(a, 2, Infinity);
    const z = this._zset(a[0]); if (!z) return int(0);
    let n = 0; for (const m of a.slice(1)) if (z.delete(m)) n++;
    this._cleanupEmpty(a[0]); return int(n);
  }
  _scoreBound(s) {
    const str = String(s);
    if (str.startsWith('(')) return { v: toFloat(str.slice(1)), ex: true };
    return { v: toFloat(str), ex: false };
  }
  _inScore(score, min, max) {
    return (min.ex ? score > min.v : score >= min.v) && (max.ex ? score < max.v : score <= max.v);
  }
  _zout(entries, withScores) {
    const out = [];
    for (const [m, s] of entries) { out.push(bulk(m)); if (withScores) out.push(bulk(fmtFloat(s))); }
    return arr(out);
  }
  c_ZRANGE(a) {
    if (a.length < 3) throw new RedisError("ERR wrong number of arguments for 'zrange' command");
    const [key, start, stop] = a;
    let byscore = false, rev = false, withScores = false, limit = null, bylex = false;
    for (let i = 3; i < a.length; i++) {
      const o = a[i].toUpperCase();
      if (o === 'BYSCORE') byscore = true; else if (o === 'REV') rev = true; else if (o === 'BYLEX') bylex = true;
      else if (o === 'WITHSCORES') withScores = true;
      else if (o === 'LIMIT') { limit = [toInt(a[i + 1]), toInt(a[i + 2])]; i += 2; }
      else throw syntaxErr();
    }
    if (bylex) throw new RedisError('ERR BYLEX is not supported by this emulator');
    const z = this._zset(key); if (!z) return arr([]);
    let list = this._zsorted(z);
    if (rev) list.reverse();
    if (byscore) {
      let min = this._scoreBound(start), max = this._scoreBound(stop);
      if (rev) [min, max] = [max, min];
      list = list.filter(([, s]) => this._inScore(s, min, max));
      if (limit) list = list.slice(limit[0], limit[1] < 0 ? undefined : limit[0] + limit[1]);
      return this._zout(list, withScores);
    }
    const [s, e] = range(list.length, toInt(start), toInt(stop));
    if (s > e) return arr([]);
    return this._zout(list.slice(s, e + 1), withScores);
  }
  c_ZREVRANGE(a) { this._arity(a, 3, 4); return this.c_ZRANGE([a[0], a[1], a[2], 'REV', ...a.slice(3)]); }
  c_ZRANGEBYSCORE(a) { this._arity(a, 3, Infinity); return this.c_ZRANGE([a[0], a[1], a[2], 'BYSCORE', ...a.slice(3)]); }
  c_ZREVRANGEBYSCORE(a) { this._arity(a, 3, Infinity); return this.c_ZRANGE([a[0], a[1], a[2], 'BYSCORE', 'REV', ...a.slice(3)]); }
  c_ZRANK(a) {
    this._arity(a, 2, 3);
    const z = this._zset(a[0]); if (!z || !z.has(a[1])) return NIL;
    const i = this._zsorted(z).findIndex(([m]) => m === a[1]);
    return a[2] && a[2].toUpperCase() === 'WITHSCORE' ? arr([int(i), bulk(fmtFloat(z.get(a[1])))]) : int(i);
  }
  c_ZREVRANK(a) {
    this._arity(a, 2, 3);
    const z = this._zset(a[0]); if (!z || !z.has(a[1])) return NIL;
    const i = this._zsorted(z).reverse().findIndex(([m]) => m === a[1]);
    return a[2] && a[2].toUpperCase() === 'WITHSCORE' ? arr([int(i), bulk(fmtFloat(z.get(a[1])))]) : int(i);
  }
  c_ZCOUNT(a) {
    this._arity(a, 3);
    const z = this._zset(a[0]); if (!z) return int(0);
    const min = this._scoreBound(a[1]), max = this._scoreBound(a[2]);
    return int([...z.values()].filter((s) => this._inScore(s, min, max)).length);
  }
  _zpop(a, max) {
    this._arity(a, 1, 2);
    const z = this._zset(a[0]); if (!z) return arr([]);
    const c = a[1] ? toInt(a[1]) : 1;
    let list = this._zsorted(z); if (max) list.reverse();
    list = list.slice(0, c);
    list.forEach(([m]) => z.delete(m));
    this._cleanupEmpty(a[0]);
    return this._zout(list, true);
  }
  c_ZPOPMIN(a) { return this._zpop(a, false); }
  c_ZPOPMAX(a) { return this._zpop(a, true); }

  // ---- hashes ----
  _hash(key) { const e = this._get(key, 'hash'); return e ? e.value : null; }
  c_HSET(a) {
    if (a.length < 3 || (a.length - 1) % 2) throw new RedisError("ERR wrong number of arguments for 'hset' command");
    const h = this._getOrCreate(a[0], 'hash', () => new Map()).value;
    let n = 0; for (let i = 1; i < a.length; i += 2) { if (!h.has(a[i])) n++; h.set(a[i], a[i + 1]); }
    return int(n);
  }
  c_HMSET(a) { this.c_HSET(a); return OK; }
  c_HSETNX(a) {
    this._arity(a, 3);
    const h = this._getOrCreate(a[0], 'hash', () => new Map()).value;
    if (h.has(a[1])) return int(0);
    h.set(a[1], a[2]); return int(1);
  }
  c_HGET(a) { this._arity(a, 2); const h = this._hash(a[0]); return h && h.has(a[1]) ? bulk(h.get(a[1])) : NIL; }
  c_HMGET(a) { this._arity(a, 2, Infinity); const h = this._hash(a[0]) || new Map(); return arr(a.slice(1).map((f) => (h.has(f) ? bulk(h.get(f)) : NIL))); }
  c_HGETALL(a) {
    this._arity(a, 1);
    const h = this._hash(a[0]) || new Map();
    const out = []; for (const [k, v] of h) out.push(bulk(k), bulk(v));
    return { type: 'array', value: out, hash: true };
  }
  c_HDEL(a) {
    this._arity(a, 2, Infinity);
    const h = this._hash(a[0]); if (!h) return int(0);
    let n = 0; for (const f of a.slice(1)) if (h.delete(f)) n++;
    this._cleanupEmpty(a[0]); return int(n);
  }
  c_HEXISTS(a) { this._arity(a, 2); const h = this._hash(a[0]); return int(h && h.has(a[1]) ? 1 : 0); }
  c_HLEN(a) { this._arity(a, 1); const h = this._hash(a[0]); return int(h ? h.size : 0); }
  c_HSTRLEN(a) { const h = this._hash(a[0]); return int(h && h.has(a[1]) ? Buffer.byteLength(h.get(a[1])) : 0); }
  c_HKEYS(a) { this._arity(a, 1); return arr([...(this._hash(a[0]) || new Map()).keys()].map(bulk)); }
  c_HVALS(a) { this._arity(a, 1); return arr([...(this._hash(a[0]) || new Map()).values()].map(bulk)); }
  c_HINCRBY(a) {
    this._arity(a, 3);
    const h = this._getOrCreate(a[0], 'hash', () => new Map()).value;
    const cur = h.has(a[1]) ? h.get(a[1]) : '0';
    if (!/^[+-]?\d+$/.test(cur)) throw new RedisError('ERR hash value is not an integer');
    const n = parseInt(cur, 10) + toInt(a[2]);
    h.set(a[1], String(n)); return int(n);
  }
  c_HINCRBYFLOAT(a) {
    this._arity(a, 3);
    const h = this._getOrCreate(a[0], 'hash', () => new Map()).value;
    const v = fmtFloat(toFloat(h.has(a[1]) ? h.get(a[1]) : '0') + toFloat(a[2]));
    h.set(a[1], v); return bulk(v);
  }
  c_HRANDFIELD(a) {
    const h = this._hash(a[0]); if (!h || !h.size) return NIL;
    const ks = [...h.keys()];
    return bulk(ks[Math.floor(Math.random() * ks.length)]);
  }
  c_HSCAN(a) {
    const h = this._hash(a[0]) || new Map();
    const out = []; for (const [k, v] of h) out.push(bulk(k), bulk(v));
    return arr([bulk('0'), arr(out)]);
  }

  // ---- transactions & pub/sub ----
  c_MULTI() {
    if (this.inMulti) throw new RedisError('ERR MULTI calls can not be nested');
    this.inMulti = true; this.queue = []; return OK;
  }
  c_DISCARD() {
    if (!this.inMulti) throw new RedisError('ERR DISCARD without MULTI');
    this.inMulti = false; this.queue = []; return OK;
  }
  c_EXEC() {
    if (!this.inMulti) throw new RedisError('ERR EXEC without MULTI');
    this.inMulti = false;
    const q = this.queue; this.queue = [];
    return arr(q.map((c) => this.run(c)));
  }
  c_WATCH() { return OK; }
  c_UNWATCH() { return OK; }
  c_PUBLISH(a) { this._arity(a, 2); return int(0); }
  c_PUBSUB(a) {
    const sub = (a[0] || '').toUpperCase();
    if (sub === 'CHANNELS') return arr([]);
    if (sub === 'NUMSUB') return arr(a.slice(1).flatMap((c) => [bulk(c), int(0)]));
    return int(0);
  }
  c_SUBSCRIBE(a) {
    return arr(a.flatMap((c, i) => [bulk('subscribe'), bulk(c), int(i + 1)]));
  }
  c_PSUBSCRIBE(a) {
    return arr(a.flatMap((c, i) => [bulk('psubscribe'), bulk(c), int(i + 1)]));
  }
  c_INFO() { return bulk('# Server\r\nredis_version:8.0.0 (adatb-gyakorlo emulator)'); }

  // Snapshot of the whole keyspace (used for grading/state display)
  snapshot() {
    const out = {};
    for (const k of [...this.data.keys()].sort()) {
      const e = this._alive(k); if (!e) continue;
      let v = e.value;
      if (e.type === 'set') v = [...v].sort();
      else if (e.type === 'hash') v = Object.fromEntries([...v.entries()].sort());
      else if (e.type === 'zset') v = this._zsorted(v).map(([m, s]) => [m, s]);
      else if (e.type === 'list') v = [...v];
      out[k] = { type: e.type, value: v, ttl: e.expireAt !== undefined ? Math.round((e.expireAt - Date.now()) / 1000) : -1 };
    }
    return out;
  }
}

// Commands whose array reply has no meaningful order (compare as sets)
export const UNORDERED = new Set(['SMEMBERS', 'SINTER', 'SUNION', 'SDIFF', 'KEYS', 'HKEYS', 'HVALS', 'HGETALL', 'SRANDMEMBER', 'SPOP']);

// Format a reply like redis-cli does
export function formatReply(r, indent = '') {
  if (r === null || r === undefined) return '';
  switch (r.type) {
    case 'status': return r.value;
    case 'error': return `(error) ${r.value}`;
    case 'int': return `(integer) ${r.value}`;
    case 'nil': return '(nil)';
    case 'bulk': return JSON.stringify(r.value);
    case 'array': {
      if (r.value.length === 0) return '(empty array)';
      const w = String(r.value.length).length;
      return r.value.map((x, i) => {
        const prefix = `${String(i + 1).padStart(w)}) `;
        const body = formatReply(x, indent + ' '.repeat(prefix.length));
        return (i === 0 ? '' : indent) + prefix + body;
      }).join('\n');
    }
    default: return String(r.value);
  }
}

// Plain JS value for comparison
export function replyValue(r, cmdName) {
  if (!r) return null;
  if (r.type === 'array') {
    const vals = r.value.map((x) => replyValue(x));
    if (r.hash || cmdName === 'HGETALL') {
      const pairs = []; for (let i = 0; i < vals.length; i += 2) pairs.push([vals[i], vals[i + 1]]);
      return { hash: Object.fromEntries(pairs.sort()) };
    }
    if (cmdName && UNORDERED.has(cmdName)) return { set: vals.map((v) => JSON.stringify(v)).sort() };
    return vals;
  }
  if (r.type === 'nil') return null;
  if (r.type === 'error') return { error: r.value.split(' ')[0] };
  return r.value;
}

// Run a script of many lines; returns per-line results
export function runScript(redis, code) {
  const out = [];
  const lines = code.split(/\r?\n/);
  for (let ln = 0; ln < lines.length; ln++) {
    let line = lines[ln].trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) continue;
    line = line.replace(/^(127\.0\.0\.1:\d+(\[\d+\])?>|redis-cli\s+)/, '').trim();
    if (!line) continue;
    let args;
    try { args = tokenize(line); } catch (e) {
      out.push({ line: ln + 1, cmd: line, name: '?', reply: { type: 'error', value: e.message } });
      continue;
    }
    if (!args.length) continue;
    const reply = redis.run(args);
    out.push({ line: ln + 1, cmd: line, name: args[0].toUpperCase(), args, reply });
  }
  return out;
}
