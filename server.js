// db-learning-app – local interactive practice server.
// Start:  npm start   →  http://localhost:8765
//
// The server is stateless: learning progress lives in each visitor's browser
// (localStorage), so one instance can serve many people. Every exercise check
// runs in a throw-away sandbox; playgrounds are per visitor (Redis/Mongo) or
// rolled back after each run (SQL).
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PgEngine } from './engines/pg.js';
import { RedisEmulator, runScript, formatReply } from './engines/redis.js';
import { MongoServer } from './engines/mongo.js';
import { grade, expected, runInExercise } from './engines/grade.js';
import { translateNote, normLang } from './engines/messages.js';
import { contentFor, datasets, LANGUAGES } from './content/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8765);
const HOST = process.env.HOST || '127.0.0.1';
const PUBLIC = path.join(__dirname, 'public');
const MAX_ROWS = 300;
const MAX_BODY = 200_000;          // bytes of code per request
const MAX_CLIENTS = 500;           // playgrounds kept in memory
const CLIENT_IDLE_MS = 2 * 3600e3; // drop idle playgrounds after 2 h

const pg = new PgEngine();

// ------------------------------------------------------------------ per-visitor playgrounds
const clients = new Map(); // clientId -> { redis, mongo, seen }
function newMongoPlayground() {
  const m = new MongoServer();
  for (const d of Object.values(datasets)) m.load(d);
  m.currentDb = 'feladatok';
  return m;
}
function clientState(id) {
  const key = /^[\w-]{8,64}$/.test(id || '') ? id : 'anonymous';
  let c = clients.get(key);
  if (!c) {
    if (clients.size >= MAX_CLIENTS) {
      const oldest = [...clients.entries()].sort((a, b) => a[1].seen - b[1].seen)[0];
      if (oldest) clients.delete(oldest[0]);
    }
    c = { redis: new RedisEmulator(), mongo: newMongoPlayground(), seen: Date.now() };
    clients.set(key, c);
  }
  c.seen = Date.now();
  return c;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, c] of clients) if (now - c.seen > CLIENT_IDLE_MS) clients.delete(k);
}, 10 * 60e3).unref();

// ------------------------------------------------------------------ helpers
function localizeOutput(out, lang) {
  if (!out || out.kind !== 'pg') return out;
  const fix = (r) => {
    if (!r) return r;
    const t = r.rows ? { ...r, rowCount: r.rows.length, rows: r.rows.slice(0, MAX_ROWS), truncated: r.rows.length > MAX_ROWS } : { ...r };
    if (t.notes) t.notes = t.notes.map((n) => translateNote(n, lang));
    return t;
  };
  return { ...out, results: (out.results || []).map(fix), check: fix(out.check) };
}
function publicExercise(ex) {
  // never send solution/check/setup code to the browser up-front
  const { solution, check, setup, require: req, forbid, ...rest } = ex;
  void solution; void check; void req; void forbid;
  return { ...rest, hasSetup: !!setup, hasCheck: !!check };
}
function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(type.startsWith('application/json') ? JSON.stringify(body) : body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > MAX_BODY) { reject(new Error('Request too large')); req.destroy(); } });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon' };

async function playground(engine, code, client) {
  if (engine === 'pg') {
    const r = await pg.sandbox({ code });
    return { kind: 'pg', results: r.results, error: r.error, rolledBack: true };
  }
  if (engine === 'redis') {
    const lines = runScript(client.redis, code).map((l) => ({ cmd: l.cmd, text: formatReply(l.reply), error: l.reply?.type === 'error' }));
    return { kind: 'redis', lines };
  }
  if (engine === 'mongo') {
    const r = client.mongo.execute(code);
    return { kind: 'mongo', lines: r.outputs.map((o) => ({ cmd: o.stmt, text: o.text, error: !!o.error })), db: client.mongo.currentDb };
  }
  throw new Error('unknown engine ' + engine);
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
  for (const dbs of Object.values(datasets)) {
    for (const [dbName, colls] of Object.entries(dbs)) {
      mongo[dbName] = Object.fromEntries(Object.entries(colls).map(([c, docs]) => [c, { count: docs.length, sample: docs[0] }]));
    }
  }
  schemaCache = { tables, mongo };
  return schemaCache;
}

// ------------------------------------------------------------------ routes
async function api(req, res, url) {
  const route = url.pathname.replace(/^\/api/, '');
  const lang = normLang(url.searchParams.get('lang') || 'en');
  const content = contentFor(lang);
  const ctx = { pg, datasets, lang };

  if (req.method === 'GET') {
    if (route === '/health') return send(res, 200, { ok: true });
    if (route === '/languages') return send(res, 200, LANGUAGES);
    if (route === '/modules') return send(res, 200, content.modules.map((m) => ({ ...m, exercises: m.exercises.map(publicExercise) })));
    if (route === '/schema') return send(res, 200, await schemaInfo());
    return send(res, 404, { error: 'not found' });
  }
  if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });

  const body = await readBody(req);
  const ex = body.exerciseId ? content.byId.get(body.exerciseId) : null;
  if (body.exerciseId && !ex) return send(res, 404, { error: 'unknown exercise' });

  if (route === '/run') {
    const code = String(body.code || '');
    if (ex) return send(res, 200, localizeOutput(await runInExercise(ex, code, ctx), lang));
    const client = clientState(req.headers['x-client-id']);
    return send(res, 200, localizeOutput(await playground(body.engine, code, client), lang));
  }
  if (route === '/check' && ex) {
    const result = await grade(ex, String(body.code || ''), ctx);
    result.output = localizeOutput(result.output, lang);
    return send(res, 200, result);
  }
  if (route === '/reveal' && ex) {
    if (body.what === 'solution') return send(res, 200, { solution: ex.solution, explain: ex.explain || '' });
    if (body.what === 'expected') return send(res, 200, localizeOutput(await expected(ex, ctx), lang));
    if (body.what === 'setup') return send(res, 200, { setup: ex.setup || '' });
    return send(res, 400, { error: 'what?' });
  }
  if (route === '/reset') {
    const c = clientState(req.headers['x-client-id']);
    if (body.engine === 'redis') c.redis = new RedisEmulator();
    if (body.engine === 'mongo') c.mongo = newMongoPlayground();
    return send(res, 200, { ok: true });
  }
  return send(res, 404, { error: 'not found' });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    let file = path.normalize(path.join(PUBLIC, url.pathname === '/' ? 'index.html' : url.pathname));
    if (!file.startsWith(PUBLIC)) return send(res, 403, 'forbidden', 'text/plain');
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(PUBLIC, 'index.html');
    send(res, 200, fs.readFileSync(file), MIME[path.extname(file)] || 'application/octet-stream');
  } catch (e) {
    console.error(e);
    send(res, 500, { error: String((e && e.message) || e) });
  }
});

console.log('Starting PostgreSQL (PGlite) and loading the HR schema…');
await pg.init();
server.listen(PORT, HOST, () => {
  const mods = contentFor('en').modules;
  const n = mods.reduce((a, m) => a + m.exercises.length, 0);
  console.log(`\n  db-learning-app is running:  http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}\n  ${mods.length} modules, ${n} exercises · languages: ${LANGUAGES.join(', ')}\n  (Ctrl+C to stop)\n`);
});
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { server.close(); process.exit(0); });
