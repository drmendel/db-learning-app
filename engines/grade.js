// Grading: run the reference solution and the student's code in identical fresh
// sandboxes, then compare result sets / state.
import { RedisEmulator, runScript, replyValue, formatReply } from './redis.js';
import { MongoServer, toComparable, show } from './mongo.js';
import { splitSql, stripComments } from './pg.js';

// ---------------------------------------------------------------- normalising
function normCell(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'boolean') return v ? 't' : 'f';
  if (typeof v === 'number' || typeof v === 'bigint') return numStr(Number(v));
  if (typeof v === 'string') {
    if (/^[+-]?\d+(\.\d+)?$/.test(v.trim())) return numStr(Number(v));
    const m = /^(\d{4}-\d{2}-\d{2}) 00:00:00$/.exec(v);
    if (m) return m[1];
    return v.replace(/\s+$/, '');
  }
  if (Array.isArray(v)) return JSON.stringify(v.map(normCell));
  if (typeof v === 'object') return JSON.stringify(sortKeys(v));
  return String(v);
}
function numStr(n) {
  const r = Math.round(n * 100) / 100;
  return 'n:' + (Object.is(r, -0) ? 0 : r);
}
function sortKeys(o) {
  if (Array.isArray(o)) return o.map(sortKeys);
  if (o && typeof o === 'object') { const r = {}; for (const k of Object.keys(o).sort()) r[k] = sortKeys(o[k]); return r; }
  return o;
}
const rowKey = (row) => JSON.stringify(row);
const pretty = (cell) => (cell === null ? 'NULL' : String(cell).replace(/^n:/, ''));

function cmpCells(a, b) {
  if (a === b) return 0;
  if (a === null) return 1; // NULLs last (PG default for ASC)
  if (b === null) return -1;
  if (a.startsWith('n:') && b.startsWith('n:')) return Number(a.slice(2)) - Number(b.slice(2));
  return a < b ? -1 : 1;
}

// Greedy detection of the sort keys visible in the reference result, so rows
// that tie on every ORDER BY key may legitimately appear in any order.
function sortKeyColumns(rows) {
  const ncol = rows[0] ? rows[0].length : 0;
  const keys = [];
  let groups = [rows.map((_, i) => i)];
  for (;;) {
    let picked = -1;
    for (let c = 0; c < ncol; c++) {
      if (keys.includes(c)) continue;
      let dir = 0, ok = true, splits = false;
      for (const g of groups) {
        for (let k = 1; k < g.length; k++) {
          const d = cmpCells(rows[g[k - 1]][c], rows[g[k]][c]);
          if (d === 0) continue;
          splits = true;
          const s = Math.sign(d);
          if (dir === 0) dir = s; else if (s !== dir) { ok = false; break; }
        }
        if (!ok) break;
      }
      if (ok && splits) { picked = c; break; }
    }
    if (picked < 0) break;
    keys.push(picked);
    const ng = [];
    for (const g of groups) {
      let cur = [g[0]];
      for (let k = 1; k < g.length; k++) {
        if (rows[g[k]][picked] === rows[g[k - 1]][picked]) cur.push(g[k]); else { ng.push(cur); cur = [g[k]]; }
      }
      ng.push(cur);
    }
    groups = ng.filter((g) => g.length > 1);
    if (!groups.length) break;
  }
  return keys;
}

// Try to reorder student columns to match the reference (aliases don't matter)
function matchColumns(ref, stu, ordered) {
  const ncol = ref[0]?.length ?? 0;
  if (!stu.length || stu[0].length !== ncol) return null;
  const sig = (rows, c) => { const v = rows.map((r) => r[c]); return JSON.stringify(ordered ? v : [...v].sort()); };
  const refSig = Array.from({ length: ncol }, (_, c) => sig(ref, c));
  const stuSig = Array.from({ length: ncol }, (_, c) => sig(stu, c));
  const used = new Set();
  const perm = [];
  for (let c = 0; c < ncol; c++) {
    let found = -1;
    for (let d = 0; d < ncol; d++) if (!used.has(d) && stuSig[d] === refSig[c]) { found = d; break; }
    if (found < 0) return null;
    used.add(found); perm.push(found);
  }
  return stu.map((r) => perm.map((d) => r[d]));
}

function tableSnippet(fields, rows, max = 5) {
  return { fields, rows: rows.slice(0, max).map((r) => r.map(pretty)), more: Math.max(0, rows.length - max) };
}

// Compare two result sets: {fields, rows}
export function compareResults(ref, stu, { ordered = false } = {}) {
  const refRows = (ref.rows || []).map((r) => r.map(normCell));
  let stuRows = (stu.rows || []).map((r) => r.map(normCell));
  const refCols = ref.fields || [];
  const stuCols = stu.fields || [];
  if (refCols.length !== stuCols.length) {
    return {
      ok: false,
      message: `Expected ${refCols.length} column(s), your query returned ${stuCols.length}.`,
      detail: `Expected columns (names may differ): ${refCols.join(', ')}\nYour columns: ${stuCols.join(', ')}`,
    };
  }
  if (refRows.length !== stuRows.length) {
    const refSet = new Map(); refRows.forEach((r) => refSet.set(rowKey(r), (refSet.get(rowKey(r)) || 0) + 1));
    const stuSet = new Map(); stuRows.forEach((r) => stuSet.set(rowKey(r), (stuSet.get(rowKey(r)) || 0) + 1));
    const missing = refRows.filter((r) => !stuSet.has(rowKey(r)));
    const extra = stuRows.filter((r) => !refSet.has(rowKey(r)));
    let detail = '';
    if (missing.length && missing.length < refRows.length) detail += `Some rows you are missing:\n${missing.slice(0, 3).map((r) => '  ' + r.map(pretty).join(' | ')).join('\n')}\n`;
    if (extra.length && extra.length < stuRows.length) detail += `Some rows that should not be there:\n${extra.slice(0, 3).map((r) => '  ' + r.map(pretty).join(' | ')).join('\n')}\n`;
    if (stuRows.length > refRows.length && !extra.length) detail += 'You return duplicate rows – maybe DISTINCT, a missing join condition, or a GROUP BY is needed?\n';
    return { ok: false, message: `Expected ${refRows.length} row(s), your query returned ${stuRows.length}.`, detail: detail.trim() };
  }
  // multiset comparison (allowing reordered columns)
  const sameMultiset = (a, b) => JSON.stringify(a.map(rowKey).sort()) === JSON.stringify(b.map(rowKey).sort());
  let colNote = '';
  if (!sameMultiset(refRows, stuRows)) {
    const re = matchColumns(refRows, stuRows, false);
    if (re && sameMultiset(refRows, re)) { stuRows = re; colNote = ' (your columns are in a different order – that is fine here)'; }
    else {
      const stuKeys = new Set(stuRows.map(rowKey));
      const bad = refRows.find((r) => !stuKeys.has(rowKey(r)));
      const refKeys = new Set(refRows.map(rowKey));
      const badStu = stuRows.find((r) => !refKeys.has(rowKey(r)));
      return {
        ok: false,
        message: 'The number of rows is right, but some values differ.',
        detail: `For example, this expected row is missing:\n  ${bad ? bad.map(pretty).join(' | ') : '?'}\nand you have this row instead:\n  ${badStu ? badStu.map(pretty).join(' | ') : '?'}\n(Numbers are compared rounded to 2 decimals; check rounding, NULL handling, filters and the column order of the SELECT list.)`,
      };
    }
  } else if (ordered && rowKey(refRows) !== rowKey(stuRows)) {
    // columns might be permuted; align for order check
    const re = matchColumns(refRows, stuRows, false);
    if (re && sameMultiset(refRows, re)) stuRows = re;
  }
  if (ordered) {
    const keys = sortKeyColumns(refRows);
    const proj = (rows) => rows.map((r) => keys.map((k) => r[k]));
    const okOrder = keys.length ? rowKey(proj(refRows)) === rowKey(proj(stuRows)) : true;
    if (!okOrder) {
      return { ok: false, message: 'Right rows, wrong order – check your ORDER BY (direction ASC/DESC and the sort keys).', detail: '' };
    }
  }
  return { ok: true, message: 'Correct!' + colNote };
}

// Is there an ORDER BY at the top level of the last statement?
export function hasTopLevelOrderBy(sql) {
  const stmts = splitSql(sql);
  const last = stripComments(stmts[stmts.length - 1] || '');
  let depth = 0, top = '';
  for (const ch of last) { if (ch === '(') depth++; else if (ch === ')') depth--; else if (depth === 0) top += ch; }
  return /\bORDER\s+BY\b/i.test(top);
}

// Behaviour checks (content/util.js behaviour()) return rows of (test, result)
function isBehaviour(r) { return r && Array.isArray(r.fields) && r.fields.join(',') === 'test,result'; }
function behaviourDiff(ref, stu) {
  if (!stu || stu.error || !stu.rows) return { ok: false, detail: `The tests could not run: ${stu && stu.error ? stu.error : 'unknown error'}` };
  const got = new Map(stu.rows.map(([t, r]) => [t, r]));
  let ok = true;
  const lines = ref.rows.map(([t, want]) => {
    const have = got.get(t);
    const pass = have === want;
    if (!pass) ok = false;
    const why = pass ? '' : want === 'error' ? '  ← your table/data allowed it, but it should be rejected' : '  ← this should work, but it raised an error';
    return `${pass ? '✓' : '✗'} ${t}${why}`;
  });
  return { ok, detail: lines.join('\n') };
}

function lastResultSet(run) {
  const rs = (run.results || []).filter((r) => r.fields);
  return rs[rs.length - 1] || null;
}

function checkPatterns(ex, code) {
  const clean = code;
  for (const [re, msg] of ex.require || []) {
    if (!new RegExp(re, 'im').test(clean)) return msg;
  }
  for (const [re, msg] of ex.forbid || []) {
    if (new RegExp(re, 'im').test(clean)) return msg;
  }
  return null;
}

// ---------------------------------------------------------------- PostgreSQL
const refCache = new Map();

async function pgReference(ex, pg) {
  if (refCache.has(ex.id)) return refCache.get(ex.id);
  const ref = await pg.sandbox({ setup: ex.setup, code: ex.solution, check: ex.check });
  if (ref.error || ref.setupError) throw new Error(`Reference solution of ${ex.id} failed: ${ref.error || ref.setupError}`);
  refCache.set(ex.id, ref);
  return ref;
}

async function gradePg(ex, code, pg) {
  const ref = await pgReference(ex, pg);
  const stu = await pg.sandbox({ setup: ex.setup, code, check: ex.check });
  const output = { kind: 'pg', results: stu.results, check: stu.check };
  if (stu.setupError) return { pass: false, message: 'Internal setup error: ' + stu.setupError, output };
  if (stu.error) return { pass: false, message: 'Your SQL raised an error:', detail: stu.error, output };
  if (!stu.results.length) return { pass: false, message: 'Write some SQL first.', output };
  const pat = checkPatterns(ex, code);
  if (pat) return { pass: false, message: pat, output };
  if (ex.check && isBehaviour(ref.check)) {
    const b = behaviourDiff(ref.check, stu.check);
    if (!b.ok) return { pass: false, message: 'Some of the behaviour tests failed:', detail: b.detail, output };
  } else if (ex.check) {
    const c = compareResults(ref.check, stu.check || {}, { ordered: ex.checkOrdered ?? hasTopLevelOrderBy(ex.check) });
    if (!c.ok) return { pass: false, message: (ex.checkMsg ? ex.checkMsg + ' ' : '') + 'The resulting state is not what was asked: ' + c.message, detail: c.detail, output };
  }
  if (!ex.check || ex.alsoResult) {
    const r = lastResultSet(ref);
    const s = lastResultSet(stu);
    if (!s) return { pass: false, message: 'Your code did not return a result set – this task expects a SELECT.', output };
    const c = compareResults(r, s, { ordered: ex.ordered ?? hasTopLevelOrderBy(ex.solution) });
    if (!c.ok) return { pass: false, message: c.message, detail: c.detail, output };
    return { pass: true, message: c.message, output };
  }
  return { pass: true, message: 'Correct!', output };
}

export async function expectedPg(ex, pg) {
  const ref = await pgReference(ex, pg);
  return { kind: 'pg', results: ex.check ? [] : [lastResultSet(ref)].filter(Boolean), check: ex.check ? ref.check : null };
}

// ---------------------------------------------------------------- Redis
function redisRun(ex, code) {
  const r = new RedisEmulator();
  if (ex.setup) runScript(r, ex.setup);
  const main = runScript(r, code);
  const check = ex.check ? runScript(r, ex.check) : [];
  return { main, check, redis: r };
}
const redisOut = (lines) => lines.map((l) => ({ cmd: l.cmd, text: formatReply(l.reply), error: l.reply?.type === 'error' }));

function gradeRedis(ex, code) {
  const ref = redisRun(ex, ex.solution);
  const refErr = ref.main.find((l) => l.reply?.type === 'error');
  if (refErr) throw new Error(`Reference solution of ${ex.id} failed: ${refErr.reply.value}`);
  const stu = redisRun(ex, code);
  const output = { kind: 'redis', lines: redisOut(stu.main), check: redisOut(stu.check) };
  if (!stu.main.length) return { pass: false, message: 'Type at least one Redis command.', output };
  const err = stu.main.find((l) => l.reply?.type === 'error');
  if (err && !ex.allowErrors) return { pass: false, message: `Line ${err.line} returned an error:`, detail: `${err.cmd}\n${formatReply(err.reply)}`, output };
  const pat = checkPatterns(ex, code);
  if (pat) return { pass: false, message: pat, output };
  if (ex.check) {
    for (let i = 0; i < ref.check.length; i++) {
      const a = JSON.stringify(replyValue(ref.check[i].reply, ref.check[i].name));
      const b = JSON.stringify(replyValue(stu.check[i]?.reply, stu.check[i]?.name));
      if (a !== b) {
        return {
          pass: false, message: 'The data in Redis is not what was asked.',
          detail: `Checked with: ${ref.check[i].cmd}\nExpected:\n${formatReply(ref.check[i].reply)}\nYours:\n${formatReply(stu.check[i]?.reply)}`,
          output,
        };
      }
    }
  }
  if (!ex.check || ex.alsoResult) {
    const rl = ref.main[ref.main.length - 1];
    const sl = stu.main[stu.main.length - 1];
    const a = JSON.stringify(replyValue(rl.reply, rl.name));
    const b = JSON.stringify(replyValue(sl.reply, sl.name));
    if (a !== b) {
      return { pass: false, message: 'The reply of your last command is not the expected one.', detail: `Expected:\n${formatReply(rl.reply)}\nYours:\n${formatReply(sl.reply)}`, output };
    }
  }
  return { pass: true, message: 'Correct!', output };
}
function expectedRedis(ex) {
  const ref = redisRun(ex, ex.solution);
  if (ex.check && !ex.alsoResult) return { kind: 'redis', lines: [], check: redisOut(ref.check) };
  return { kind: 'redis', lines: redisOut(ref.main.slice(-1)), check: redisOut(ref.check) };
}

// ---------------------------------------------------------------- MongoDB
export function mongoFresh(ex, datasets) {
  const m = new MongoServer();
  for (const name of [].concat(ex.data || [])) m.load(datasets[name]);
  m.currentDb = ex.db || 'test';
  return m;
}
function mongoRun(ex, code, datasets) {
  const m = mongoFresh(ex, datasets);
  if (ex.setup) { const s = m.execute(ex.setup); if (s.error) throw new Error('setup failed: ' + s.error); m.currentDb = ex.db || 'test'; }
  const main = m.execute(code);
  let check = null;
  if (ex.check && !main.error) { m.currentDb = ex.db || 'test'; check = m.execute(ex.check); }
  return { main, check };
}
const mongoOut = (r) => (r ? r.outputs.map((o) => ({ cmd: o.stmt, text: o.text, error: !!o.error })) : []);

function docsToRows(v) {
  // array of docs -> rows of normalised cells (key-union order)
  const keys = [...new Set(v.flatMap((d) => (d && typeof d === 'object' && !Array.isArray(d) ? Object.keys(d) : [])))].sort();
  // strings are tagged so that "8500" (string) never equals 8500 (number) – MongoDB is type-strict
  const cell = (v) => (typeof v === 'string' ? JSON.stringify(v) : v);
  return { fields: keys, rows: v.map((d) => (d && typeof d === 'object' && !Array.isArray(d) ? keys.map((k) => (d[k] === undefined ? '(missing)' : cell(d[k]))) : [cell(d)])) };
}
function compareMongo(refVal, stuVal, ordered, lenientNames = false) {
  const a = toComparable(refVal), b = toComparable(stuVal);
  if (Array.isArray(a) && Array.isArray(b) && a.every((x) => x && typeof x === 'object' && !Array.isArray(x))) {
    if (!b.every((x) => x && typeof x === 'object' && !Array.isArray(x))) return { ok: false, message: 'Expected a list of documents.' };
    let ra = docsToRows(a), rb = docsToRows(b);
    if (lenientNames) {
      // field names are free: compare values only (column order is matched by the comparator)
      ra = { fields: ra.fields.map((_, i) => 'f' + i), rows: ra.rows };
      rb = { fields: rb.fields.map((_, i) => 'f' + i), rows: rb.rows };
    }
    if (JSON.stringify(ra.fields) !== JSON.stringify(rb.fields)) {
      const missing = ra.fields.filter((f) => !rb.fields.includes(f));
      const extra = rb.fields.filter((f) => !ra.fields.includes(f));
      return {
        ok: false, message: 'The documents do not have the expected fields.',
        detail: [missing.length ? `Missing field(s): ${missing.join(', ')}` : '', extra.length ? `Unexpected field(s): ${extra.join(', ')} (check your projection – e.g. _id:0)` : ''].filter(Boolean).join('\n'),
      };
    }
    const c = compareResults(ra, rb, { ordered });
    return c.ok ? c : { ...c, message: c.message.replace('column(s)', 'field(s)').replace('row(s)', 'document(s)').replace('your query', 'you') };
  }
  const sa = JSON.stringify(a), sb = JSON.stringify(b);
  if (ordered === false && Array.isArray(a) && Array.isArray(b)) {
    if (JSON.stringify(a.map((x) => JSON.stringify(x)).sort()) === JSON.stringify(b.map((x) => JSON.stringify(x)).sort())) return { ok: true, message: 'Correct!' };
  }
  if (sa === sb) return { ok: true, message: 'Correct!' };
  return { ok: false, message: 'The result is not the expected one.', detail: `Expected:\n${show(refVal)}\nYours:\n${show(stuVal)}` };
}
function mongoOrdered(code) { return /\.sort\s*\(|\$sort\b/.test(code); }

function gradeMongo(ex, code, datasets) {
  const ref = mongoRun(ex, ex.solution, datasets);
  if (ref.main.error) throw new Error(`Reference solution of ${ex.id} failed: ${ref.main.error}`);
  const stu = mongoRun(ex, code, datasets);
  const output = { kind: 'mongo', lines: mongoOut(stu.main), check: mongoOut(stu.check) };
  if (stu.main.error) return { pass: false, message: 'Your code raised an error:', detail: stu.main.error, output };
  if (!stu.main.outputs.length) return { pass: false, message: 'Write some mongosh code first.', output };
  const pat = checkPatterns(ex, code);
  if (pat) return { pass: false, message: pat, output };
  if (ex.check) {
    if (stu.check.error) return { pass: false, message: 'Checking your data failed: ' + stu.check.error, output };
    const c = compareMongo(ref.check.last, stu.check.last, ex.checkOrdered ?? mongoOrdered(ex.check));
    if (!c.ok) return { pass: false, message: 'The data in the collection is not what was asked. ' + c.message, detail: c.detail, output };
  }
  if (!ex.check || ex.alsoResult) {
    if (!stu.main.hasLast) return { pass: false, message: 'Your code did not produce a result (the last statement should return something).', output };
    const c = compareMongo(ref.main.last, stu.main.last, ex.ordered ?? mongoOrdered(ex.solution), ex.lenientNames);
    if (!c.ok) return { pass: false, message: c.message, detail: c.detail, output };
  }
  return { pass: true, message: 'Correct!', output };
}
function expectedMongo(ex, datasets) {
  const ref = mongoRun(ex, ex.solution, datasets);
  const lines = [];
  if (!ex.check || ex.alsoResult) lines.push({ cmd: '(result of the last statement)', text: show(ref.main.last) });
  return { kind: 'mongo', lines, check: ex.check ? [{ cmd: ex.check, text: show(ref.check.last) }] : [] };
}

// ---------------------------------------------------------------- text (pattern) tasks
function gradeText(ex, code) {
  if (!code.trim()) return { pass: false, message: 'Write your answer first.' };
  const pat = checkPatterns(ex, code);
  if (pat) return { pass: false, message: pat };
  return { pass: true, message: 'Looks right! (checked by key elements – compare with the model solution)' };
}

// ---------------------------------------------------------------- entry points
export async function grade(ex, code, ctx) {
  switch (ex.type) {
    case 'pg': return gradePg(ex, code, ctx.pg);
    case 'redis': return gradeRedis(ex, code);
    case 'mongo': return gradeMongo(ex, code, ctx.datasets);
    case 'text': return gradeText(ex, code);
    default: throw new Error('cannot grade type ' + ex.type);
  }
}

export async function expected(ex, ctx) {
  switch (ex.type) {
    case 'pg': return expectedPg(ex, ctx.pg);
    case 'redis': return expectedRedis(ex);
    case 'mongo': return expectedMongo(ex, ctx.datasets);
    default: return null;
  }
}

// Run the student's code in the exercise's sandbox without grading
export async function runInExercise(ex, code, ctx) {
  switch (ex.type) {
    case 'pg': { const r = await ctx.pg.sandbox({ setup: ex.setup, code, check: '' }); return { kind: 'pg', results: r.results, error: r.error || r.setupError }; }
    case 'redis': { const r = redisRun({ ...ex, check: '' }, code); return { kind: 'redis', lines: redisOut(r.main) }; }
    case 'mongo': { const r = mongoRun({ ...ex, check: '' }, code, ctx.datasets); return { kind: 'mongo', lines: mongoOut(r.main) }; }
    default: return null;
  }
}
