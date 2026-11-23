// Adatbázis gyakorló – local interactive practice server.
// Start:  npm start   →  http://localhost:8765
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PgEngine } from './engines/pg.js';
import { RedisEmulator, runScript, formatReply } from './engines/redis.js';
import { MongoServer } from './engines/mongo.js';
import { grade, expected, runInExercise } from './engines/grade.js';
import { modules, exerciseById, datasets } from './content/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8765);
const HOST = process.env.HOST || '127.0.0.1';
const PROGRESS_FILE = path.join(__dirname, 'progress.json');
const PUBLIC = path.join(__dirname, 'public');
const MAX_ROWS = 300;

// ------------------------------------------------------------------ state
const pg = new PgEngine();
let redisPlay = new RedisEmulator();
let mongoPlay = newMongoPlayground();
function newMongoPlayground() {
  const m = new MongoServer();
  for (const d of Object.values(datasets)) m.load(d);
  m.currentDb = 'feladatok';
  return m;
}
const ctx = { pg, datasets };

function loadProgress() {
  try { return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); } catch { return { exercises: {}, quiz: {}, cards: {}, exams: [] }; }
}
let progress = loadProgress();
let saveTimer = null;
function saveProgress() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => fs.writeFile(PROGRESS_FILE, JSON.stringify(progress, null, 1), () => {}), 200);
}

// ------------------------------------------------------------------ helpers
function trimPg(out) {
  if (!out) return out;
  const trim = (r) => (r && r.rows ? { ...r, rowCount: r.rows.length, rows: r.rows.slice(0, MAX_ROWS), truncated: r.rows.length > MAX_ROWS } : r);
  return { ...out, results: (out.results || []).map(trim), check: trim(out.check) };
}
function publicExercise(ex) {
  // never send solution/check/setup code to the browser up-front
  const { solution, check, setup, require: req, forbid, ...rest } = ex;
  void solution; void check; void req; void forbid;
  return { ...rest, hasSetup: !!setup, hasCheck: !!check };
}
function publicModules() {
  return modules.map((m) => ({ ...m, exercises: m.exercises.map(publicExercise) }));
}
function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(type.startsWith('application/json') ? JSON.stringify(body) : body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 2e6) req.destroy(); });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon' };

async function playground(engine, code) {
  if (engine === 'pg') return trimPg({ kind: 'pg', ...(await pg.run(code)) });
  if (engine === 'redis') {
    const lines = runScript(redisPlay, code).map((l) => ({ cmd: l.cmd, text: formatReply(l.reply), error: l.reply?.type === 'error' }));
    return { kind: 'redis', lines };
  }
  if (engine === 'mongo') {
    const r = mongoPlay.execute(code);
    return { kind: 'mongo', lines: r.outputs.map((o) => ({ cmd: o.stmt, text: o.text, error: !!o.error })), db: mongoPlay.currentDb };
  }
  throw new Error('unknown engine ' + engine);
}

function recordAttempt(id, code, result) {
  const p = progress.exercises[id] || { attempts: 0 };
  p.attempts += 1;
  p.code = code;
  p.last = result.pass ? 'pass' : 'fail';
  if (result.pass) { p.passed = true; p.passedAt = p.passedAt || new Date().toISOString(); }
  p.ts = new Date().toISOString();
  progress.exercises[id] = p;
  saveProgress();
}

// ------------------------------------------------------------------ routes
async function api(req, res, url) {
  const route = url.pathname.replace(/^\/api/, '');
  if (req.method === 'GET' && route === '/modules') return send(res, 200, publicModules());
  if (req.method === 'GET' && route === '/progress') return send(res, 200, progress);
  if (req.method === 'GET' && route === '/schema') return send(res, 200, await schemaInfo());

  const body = req.method === 'POST' ? await readBody(req) : {};

  if (route === '/run') {
    const { engine, code = '', exerciseId } = body;
    if (exerciseId) {
      const ex = exerciseById.get(exerciseId);
      if (!ex) return send(res, 404, { error: 'unknown exercise' });
      const out = await runInExercise(ex, code, ctx);
      return send(res, 200, out.kind === 'pg' ? trimPg(out) : out);
    }
    return send(res, 200, await playground(engine, code));
  }
  if (route === '/check') {
    const ex = exerciseById.get(body.exerciseId);
    if (!ex) return send(res, 404, { error: 'unknown exercise' });
    const result = await grade(ex, body.code || '', ctx);
    if (result.output && result.output.kind === 'pg') result.output = trimPg(result.output);
    if (!body.exam) recordAttempt(ex.id, body.code || '', result);
    return send(res, 200, result);
  }
  if (route === '/reveal') {
    const ex = exerciseById.get(body.exerciseId);
    if (!ex) return send(res, 404, { error: 'unknown exercise' });
    if (body.what === 'solution') {
      const p = progress.exercises[ex.id] || { attempts: 0 };
      p.revealed = true; progress.exercises[ex.id] = p; saveProgress();
      return send(res, 200, { solution: ex.solution, explain: ex.explain || '' });
    }
    if (body.what === 'expected') {
      const out = await expected(ex, ctx);
      return send(res, 200, out && out.kind === 'pg' ? trimPg(out) : out);
    }
    if (body.what === 'setup') return send(res, 200, { setup: ex.setup || '', check: ex.check || '' });
    return send(res, 400, { error: 'what?' });
  }
  if (route === '/progress') {
    // partial updates: {quiz:{id:bool}, cards:{id:level}, draft:{id, code}, exam:{...}}
    if (body.quiz) Object.assign(progress.quiz, body.quiz);
    if (body.cards) Object.assign(progress.cards, body.cards);
    if (body.draft) { const p = progress.exercises[body.draft.id] || { attempts: 0 }; p.code = body.draft.code; progress.exercises[body.draft.id] = p; }
    if (body.exam) progress.exams.push({ ...body.exam, ts: new Date().toISOString() });
    if (body.resetAll) progress = { exercises: {}, quiz: {}, cards: {}, exams: [] };
    saveProgress();
    return send(res, 200, { ok: true });
  }
  if (route === '/reset') {
    if (body.engine === 'pg') await pg.reset();
    if (body.engine === 'redis') redisPlay = new RedisEmulator();
    if (body.engine === 'mongo') mongoPlay = newMongoPlayground();
    return send(res, 200, { ok: true });
  }
  return send(res, 404, { error: 'not found' });
}

let schemaCache = null;
async function schemaInfo() {
  if (schemaCache) return schemaCache;
  const r = await pg.run(`SELECT table_schema, table_name, column_name,
      CASE WHEN data_type = 'ARRAY' THEN udt_name WHEN data_type = 'USER-DEFINED' THEN udt_name ELSE data_type END
    FROM information_schema.columns WHERE table_schema IN ('hr','kurzuslabor')
    ORDER BY table_schema, table_name, ordinal_position`);
  const tables = {};
  for (const [s, t, c, ty] of r.results[0].rows) {
    const key = s === 'hr' ? t : `${s}.${t}`;
    (tables[key] = tables[key] || []).push([c, ty]);
  }
  const mongo = {};
  for (const [dsName, dbs] of Object.entries(datasets)) {
    for (const [dbName, colls] of Object.entries(dbs)) {
      mongo[dbName] = Object.fromEntries(Object.entries(colls).map(([c, docs]) => [c, { count: docs.length, sample: docs[0] }]));
      void dsName;
    }
  }
  schemaCache = { tables, mongo };
  return schemaCache;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    let file = path.normalize(path.join(PUBLIC, url.pathname === '/' ? 'index.html' : url.pathname));
    if (!file.startsWith(PUBLIC)) return send(res, 403, 'forbidden', 'text/plain');
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(PUBLIC, 'index.html');
    send(res, 200, fs.readFileSync(file), MIME[path.extname(file)] || 'application/octet-stream');
  } catch (e) {
    console.error(e);
    send(res, 500, { error: String(e && e.message || e) });
  }
});

console.log('Starting PostgreSQL (PGlite) and loading the HR schema…');
await pg.init();
server.listen(PORT, HOST, () => {
  const n = modules.reduce((a, m) => a + m.exercises.length, 0);
  console.log(`\n  Adatbázis gyakorló is running:  http://localhost:${PORT}\n  ${modules.length} modules, ${n} exercises · progress saved to progress.json\n  (Ctrl+C to stop)\n`);
});
