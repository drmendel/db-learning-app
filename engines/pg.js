// PostgreSQL engine: real PostgreSQL (PGlite / WebAssembly) with the HR schema,
// a few Oracle-compatibility helpers, and sandboxed (rolled back) exercise runs.
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, '..', 'data');

const asText = (x) => x;
// keep dates/times as text so nothing gets shifted by the local time zone
const PARSERS = { 1082: asText, 1083: asText, 1114: asText, 1184: asText, 1266: asText, 1186: asText };

export const COMPAT_SQL = `
-- Oracle compatibility helpers (so Oracle-style answers from the labs also run)
CREATE OR REPLACE FUNCTION public.nvl(numeric, numeric) RETURNS numeric LANGUAGE sql IMMUTABLE AS 'SELECT COALESCE($1, $2)';
CREATE OR REPLACE FUNCTION public.nvl(text, text) RETURNS text LANGUAGE sql IMMUTABLE AS 'SELECT COALESCE($1, $2)';
CREATE OR REPLACE FUNCTION public.nvl(timestamp, timestamp) RETURNS timestamp LANGUAGE sql IMMUTABLE AS 'SELECT COALESCE($1, $2)';
CREATE OR REPLACE FUNCTION public.nvl2(anyelement, numeric, numeric) RETURNS numeric LANGUAGE sql IMMUTABLE AS 'SELECT CASE WHEN $1 IS NOT NULL THEN $2 ELSE $3 END';
CREATE OR REPLACE FUNCTION public.nvl2(anyelement, text, text) RETURNS text LANGUAGE sql IMMUTABLE AS 'SELECT CASE WHEN $1 IS NOT NULL THEN $2 ELSE $3 END';
CREATE OR REPLACE FUNCTION public.months_between(timestamp, timestamp) RETURNS numeric LANGUAGE sql IMMUTABLE AS
 $$SELECT ((EXTRACT(YEAR FROM $1) - EXTRACT(YEAR FROM $2)) * 12 + EXTRACT(MONTH FROM $1) - EXTRACT(MONTH FROM $2))
   + (EXTRACT(DAY FROM $1) - EXTRACT(DAY FROM $2)) / 31.0
   + (EXTRACT(EPOCH FROM $1::time) - EXTRACT(EPOCH FROM $2::time)) / (31.0 * 86400)$$;
CREATE OR REPLACE FUNCTION public.add_months(timestamp, integer) RETURNS timestamp LANGUAGE sql IMMUTABLE AS $$SELECT $1 + ($2 || ' months')::interval$$;
CREATE OR REPLACE FUNCTION public.instr(text, text) RETURNS integer LANGUAGE sql IMMUTABLE AS 'SELECT strpos($1, $2)';
CREATE OR REPLACE FUNCTION public.to_number(text) RETURNS numeric LANGUAGE sql IMMUTABLE AS 'SELECT $1::numeric';
CREATE OR REPLACE FUNCTION public.trunc(timestamp) RETURNS timestamp LANGUAGE sql IMMUTABLE AS $$SELECT date_trunc('day', $1)$$;
CREATE OR REPLACE VIEW public.dual AS SELECT 'X'::varchar(1) AS dummy;
CREATE OR REPLACE VIEW public.user_tables AS
  SELECT upper(table_name::text) AS table_name FROM information_schema.tables
  WHERE table_schema = 'hr' AND table_type = 'BASE TABLE';
CREATE OR REPLACE VIEW public.user_constraints AS
  SELECT upper(c.conname) AS constraint_name,
         CASE c.contype WHEN 'p' THEN 'P' WHEN 'f' THEN 'R' WHEN 'u' THEN 'U' WHEN 'c' THEN 'C' ELSE upper(c.contype::text) END AS constraint_type,
         upper(t.relname) AS table_name, pg_get_constraintdef(c.oid) AS search_condition
  FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'hr';
CREATE OR REPLACE VIEW public.user_indexes AS
  SELECT upper(indexname) AS index_name, upper(tablename) AS table_name, indexdef FROM pg_indexes WHERE schemaname = 'hr';
`;

export const LAB6_SQL = `
-- Lab 6 practice data: training records with ENUM, DOMAIN, composite type, array, JSONB, inheritance
CREATE TYPE hr.training_status AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');
CREATE DOMAIN hr.score_value AS integer CHECK (VALUE BETWEEN 0 AND 100);
CREATE TYPE hr.training_details AS (instructor text, location text, hours integer);
CREATE TABLE hr.employee_trainings (
  training_id   serial PRIMARY KEY,
  employee_id   integer NOT NULL REFERENCES hr.employees(employee_id),
  course_name   text NOT NULL,
  status        hr.training_status NOT NULL DEFAULT 'planned',
  score         hr.score_value,
  skills        text[] NOT NULL DEFAULT '{}',
  details       hr.training_details,
  feedback      jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE hr.mandatory_trainings (
  due_date date NOT NULL
) INHERITS (hr.employee_trainings);

INSERT INTO hr.employee_trainings (employee_id, course_name, status, score, skills, details, feedback) VALUES
 (103, 'PostgreSQL haladó', 'completed', 95, '{sql,postgresql,json}', ROW('Kiss Éva', 'Budapest', 16), '{"mode":"online","rating":5,"comment":"Nagyon hasznos"}'),
 (104, 'Linux alapok', 'completed', 88, '{linux,bash}', ROW('Nagy Péter', 'Budapest', 12), '{"mode":"online","rating":4}'),
 (104, 'PostgreSQL alapok', 'completed', 91, '{sql,postgresql}', ROW('Kiss Éva', 'Debrecen', 12), '{"mode":"onsite","rating":5}'),
 (105, 'Python programozás', 'in_progress', NULL, '{python,programozas}', ROW('Szabó Dániel', 'Budapest', 20), '{"mode":"online"}'),
 (106, 'Docker és konténerek', 'completed', 97, '{docker,linux}', ROW('Varga Tamás', 'Szeged', 8), '{"mode":"online","rating":3}'),
 (107, 'SQL alapok', 'completed', 72, '{sql}', ROW('Kovács Anna', 'Budapest', 10), '{"mode":"onsite","rating":4}'),
 (100, 'Vezetői kommunikáció', 'completed', 90, '{kommunikacio,vezetes}', ROW('Tóth Gábor', 'Budapest', 6), '{"mode":"onsite","rating":5}'),
 (145, 'Tárgyalástechnika', 'planned', NULL, '{ertekesites,kommunikacio}', ROW('Tóth Gábor', 'Győr', 8), '{}'),
 (201, 'Adatvizualizáció', 'completed', 84, '{excel,python}', ROW('Kiss Éva', 'Budapest', 10), '{"mode":"online","rating":4,"comment":"Jó példák"}'),
 (108, 'PostgreSQL haladó', 'cancelled', NULL, '{sql,postgresql}', ROW('Kiss Éva', 'Budapest', 16), '{"mode":"online"}');

INSERT INTO hr.mandatory_trainings (employee_id, course_name, status, score, skills, details, feedback, due_date) VALUES
 (103, 'Munkavédelem', 'completed', 100, '{munkavedelem}', ROW('Belső oktató', 'online', 2), '{"mode":"online","rating":3}', '2026-03-31'),
 (104, 'Adatvédelem (GDPR)', 'completed', 93, '{gdpr,adatvedelem}', ROW('Jogi osztály', 'online', 3), '{"mode":"online","rating":4}', '2026-06-30'),
 (124, 'Munkavédelem', 'in_progress', NULL, '{munkavedelem}', ROW('Belső oktató', 'online', 2), '{"mode":"online"}', '2026-12-31'),
 (149, 'Adatvédelem (GDPR)', 'planned', NULL, '{gdpr}', ROW('Jogi osztály', 'Budapest', 3), '{"mode":"onsite"}', '2027-01-31');
`;

export const KURZUSLABOR_SQL = `
CREATE SCHEMA kurzuslabor;
CREATE TABLE kurzuslabor.courses (id integer PRIMARY KEY, title text NOT NULL, teacher text NOT NULL, credits integer NOT NULL CHECK (credits > 0));
INSERT INTO kurzuslabor.courses VALUES
 (1,'Adatbázisok alapjai','Kovács Anna',5),(2,'Adatmodellezés','Nagy Péter',4),(3,'SQL programozás','Kiss Éva',4),
 (4,'NoSQL rendszerek','Szabó Dániel',4),(5,'Adattárházak','Varga Tamás',5),(6,'Algoritmusok','Nagy Péter',5),
 (7,'Programozás Pythonban','Kiss Éva',5),(8,'Webfejlesztés','Kovács Anna',4),(9,'Felhőalapú rendszerek','Varga Tamás',4),
 (10,'Operációs rendszerek','Szabó Dániel',5),(11,'Adatbázis-adminisztráció','Kovács Anna',4),(12,'Big Data alapok','Nagy Péter',5),
 (13,'Adatvizualizáció','Kiss Éva',3),(14,'Információbiztonság','Varga Tamás',4),(15,'Elosztott rendszerek','Szabó Dániel',5);
`;

// ---------------------------------------------------------------------------
// SQL splitting (quotes, $$ bodies, comments) and Oracle -> PostgreSQL rewriting
// ---------------------------------------------------------------------------

// Split into segments of {code} / {str} so rewriting only touches code
function segments(sql) {
  const out = [];
  let i = 0, buf = '';
  const n = sql.length;
  const flush = () => { if (buf) { out.push({ code: buf }); buf = ''; } };
  while (i < n) {
    const c = sql[i];
    if (c === "'" || c === '"') {
      flush();
      let j = i + 1;
      while (j < n) { if (sql[j] === c) { if (sql[j + 1] === c) { j += 2; continue; } break; } j++; }
      out.push({ str: sql.slice(i, j + 1) }); i = j + 1; continue;
    }
    if (c === '-' && sql[i + 1] === '-') {
      flush();
      let j = sql.indexOf('\n', i); if (j < 0) j = n;
      out.push({ str: sql.slice(i, j) }); i = j; continue;
    }
    if (c === '/' && sql[i + 1] === '*') {
      flush();
      let j = sql.indexOf('*/', i + 2); j = j < 0 ? n : j + 2;
      out.push({ str: sql.slice(i, j), comment: true }); i = j; continue;
    }
    if (c === '$') {
      const m = /^\$([A-Za-z_]\w*)?\$/.exec(sql.slice(i));
      if (m) {
        flush();
        const tag = m[0];
        let j = sql.indexOf(tag, i + tag.length); j = j < 0 ? n : j + tag.length;
        out.push({ str: sql.slice(i, j) }); i = j; continue;
      }
    }
    buf += c; i++;
  }
  flush();
  return out;
}

export function splitSql(sql) {
  const stmts = [];
  let cur = '';
  for (const seg of segments(sql)) {
    if (seg.str !== undefined) { cur += seg.str; continue; }
    const parts = seg.code.split(';');
    for (let k = 0; k < parts.length; k++) {
      cur += parts[k];
      if (k < parts.length - 1) { if (stripComments(cur).trim()) stmts.push(cur.trim()); cur = ''; }
    }
  }
  // SQL*Plus style "/" line terminators
  if (stripComments(cur).trim() && stripComments(cur).trim() !== '/') stmts.push(cur.trim());
  return stmts.map((s) => s.replace(/\n\s*\/\s*$/, '').trim()).filter((s) => stripComments(s).trim());
}

export function stripComments(sql) {
  return segments(sql).map((s) => (s.str !== undefined ? (s.str.startsWith('--') || s.comment ? ' ' : s.str) : s.code)).join('');
}

function mapCode(sql, fn) {
  return segments(sql).map((s) => (s.str !== undefined ? s.str : fn(s.code))).join('');
}

// Translate common Oracle-only syntax; returns {sql, notes[]}
export function oracleToPg(stmt) {
  const notes = [];
  let s = stmt;
  const first = stripComments(s).trim().split(/\s+/)[0]?.toUpperCase();
  const note = (n) => { if (!notes.includes(n)) notes.push(n); };

  if (/\/\*\+/.test(s)) note('Optimizer hints (/*+ ... */) are Oracle-only; PostgreSQL treats them as comments.');

  s = mapCode(s, (c) => {
    let x = c;
    if (/\bVARCHAR2\b/i.test(x)) { x = x.replace(/\bVARCHAR2\b/gi, 'VARCHAR'); note('VARCHAR2 → VARCHAR (PostgreSQL has no VARCHAR2).'); }
    if (/\bNUMBER\b/i.test(x) && (first === 'CREATE' || first === 'ALTER')) {
      x = x.replace(/\bNUMBER\s*\(\s*(\d+)\s*(?:,\s*(\d+)\s*)?\)/gi, (m, p, sc) => {
        if (sc && sc !== '0') return `NUMERIC(${p},${sc})`;
        const n = Number(p);
        return n <= 9 ? 'INTEGER' : n <= 18 ? 'BIGINT' : `NUMERIC(${p})`;
      });
      x = x.replace(/\bNUMBER\b/gi, 'NUMERIC');
      note('Oracle NUMBER → PostgreSQL: NUMBER(p) → INTEGER/BIGINT, NUMBER(p,s) → NUMERIC(p,s), NUMBER → NUMERIC.');
    }
    if (/\bSYSDATE\b/i.test(x)) { x = x.replace(/\bSYSDATE\b/gi, 'LOCALTIMESTAMP(0)'); note('SYSDATE → LOCALTIMESTAMP / CURRENT_DATE in PostgreSQL.'); }
    if (/\bSYSTIMESTAMP\b/i.test(x)) { x = x.replace(/\bSYSTIMESTAMP\b/gi, 'CURRENT_TIMESTAMP'); note('SYSTIMESTAMP → CURRENT_TIMESTAMP.'); }
    if (/\b(\w+)\.NEXTVAL\b/i.test(x)) { x = x.replace(/\b(\w+)\.NEXTVAL\b/gi, "nextval('$1')"); note("seq.NEXTVAL → nextval('seq') in PostgreSQL."); }
    if (/\b(\w+)\.CURRVAL\b/i.test(x)) { x = x.replace(/\b(\w+)\.CURRVAL\b/gi, "currval('$1')"); note("seq.CURRVAL → currval('seq') in PostgreSQL."); }
    if (/\bMINUS\b/i.test(x)) { x = x.replace(/\bMINUS\b/gi, 'EXCEPT'); note('MINUS → EXCEPT in PostgreSQL.'); }
    if (first === 'CREATE' && /\bSEQUENCE\b/i.test(x) && /\bNOCACHE\b/i.test(x)) { x = x.replace(/\bNOCACHE\b/gi, ''); note('NOCACHE removed (PostgreSQL: CACHE 1 is the default).'); }
    if (first === 'CREATE' && /\bSEQUENCE\b/i.test(x) && /\bNOCYCLE\b/i.test(x)) { x = x.replace(/\bNOCYCLE\b/gi, 'NO CYCLE'); }
    return x;
  });

  // RENAME a TO b;  (Oracle table rename)
  let m = /^\s*RENAME\s+(\w+)\s+TO\s+(\w+)\s*$/i.exec(s);
  if (m) { s = `ALTER TABLE ${m[1]} RENAME TO ${m[2]}`; note('RENAME a TO b → ALTER TABLE a RENAME TO b in PostgreSQL.'); }

  // ALTER TABLE t ADD (col type, ...)
  m = /^\s*ALTER\s+TABLE\s+([\w.]+)\s+ADD\s*\(([\s\S]*)\)\s*$/i.exec(s);
  if (m && !/^\s*(CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|CHECK)\b/i.test(m[2])) {
    const cols = splitTopLevel(m[2]);
    s = `ALTER TABLE ${m[1]} ` + cols.map((c) => `ADD COLUMN ${c.trim()}`).join(', ');
    note('ALTER TABLE t ADD (col type) → ALTER TABLE t ADD COLUMN col type in PostgreSQL.');
  }
  // ALTER TABLE t MODIFY col type  /  MODIFY (col type)
  m = /^\s*ALTER\s+TABLE\s+([\w.]+)\s+MODIFY\s*\(?\s*(\w+)\s+([\s\S]+?)\)?\s*$/i.exec(s);
  if (m) {
    const rest = m[3].trim();
    if (/^CHECK\b/i.test(rest)) { s = `ALTER TABLE ${m[1]} ADD CHECK ${rest.replace(/^CHECK/i, '')}`; }
    else if (/^NOT\s+NULL$/i.test(rest)) { s = `ALTER TABLE ${m[1]} ALTER COLUMN ${m[2]} SET NOT NULL`; }
    else { s = `ALTER TABLE ${m[1]} ALTER COLUMN ${m[2]} TYPE ${rest}`; }
    note('ALTER TABLE ... MODIFY → ALTER TABLE ... ALTER COLUMN ... TYPE / SET NOT NULL in PostgreSQL.');
  }
  // EXPLAIN PLAN FOR <query>
  m = /^\s*EXPLAIN\s+PLAN\s+(SET\s+STATEMENT_ID\s*=\s*'[^']*'\s+)?FOR\s+([\s\S]+)$/i.exec(s);
  if (m) { s = `EXPLAIN ${m[2]}`; note('EXPLAIN PLAN FOR → EXPLAIN in PostgreSQL (the plan is printed directly; DBMS_XPLAN.DISPLAY is Oracle-only).'); }
  return { sql: s, notes };
}

function splitTopLevel(s) {
  const out = []; let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

const TXN_RE = /^\s*(COMMIT|ROLLBACK|BEGIN|START\s+TRANSACTION|END|SAVEPOINT|RELEASE)\b/i;

// ---------------------------------------------------------------------------
export class PgEngine {
  constructor() { this.db = null; this.queue = Promise.resolve(); this.lastPlan = null; }

  async init() {
    const t0 = Date.now();
    if (this.db) { try { await this.db.close(); } catch { /* ignore */ } }
    this.db = await PGlite.create({ parsers: PARSERS });
    await this.db.exec('CREATE SCHEMA hr; SET search_path TO hr, public;');
    await this.db.exec(fs.readFileSync(path.join(DATA, 'hr_pgsql.sql'), 'utf8'));
    await this.db.exec(COMPAT_SQL);
    await this.db.exec(LAB6_SQL);
    await this.db.exec(KURZUSLABOR_SQL);
    await this.db.exec('ANALYZE');
    await this.db.exec('SET search_path TO hr, public;');
    this.bootMs = Date.now() - t0;
  }

  // serialize access (PGlite is a single connection)
  lock(fn) {
    const p = this.queue.then(fn, fn);
    this.queue = p.catch(() => {});
    return p;
  }

  async _one(sqlIn) {
    const trimmed = stripComments(sqlIn).trim();
    // psql / SQL*Plus describe helpers
    let m = /^(?:\\d\+?|DESC(?:RIBE|R)?)\s+([\w.]+)$/i.exec(trimmed);
    if (m) return this._describe(m[1], sqlIn);
    if (/^SELECT\s+\*\s+FROM\s+TABLE\s*\(\s*DBMS_XPLAN\.DISPLAY/i.test(trimmed)) {
      if (!this.lastPlan) throw new Error('No plan yet – run EXPLAIN PLAN FOR <query> first.');
      return { sql: sqlIn, fields: ['PLAN_TABLE_OUTPUT'], rows: this.lastPlan.map((r) => [r]), notes: ['DBMS_XPLAN.DISPLAY emulated: shows the PostgreSQL plan of your last EXPLAIN PLAN FOR.'], command: 'SELECT' };
    }
    if (/^\\dt$/i.test(trimmed)) return this._one("SELECT table_name FROM information_schema.tables WHERE table_schema = 'hr' ORDER BY 1");
    const { sql, notes } = oracleToPg(sqlIn);
    const res = await this.db.query(sql, [], { rowMode: 'array' });
    const command = stripComments(sql).trim().split(/\s+/)[0].toUpperCase();
    const out = { sql: sqlIn, notes, command };
    if (res.fields && res.fields.length) {
      out.fields = res.fields.map((f) => f.name);
      out.types = res.fields.map((f) => f.dataTypeID);
      out.rows = res.rows;
      if (command === 'EXPLAIN') this.lastPlan = res.rows.map((r) => r[0]);
    }
    if (typeof res.affectedRows === 'number' && ['INSERT', 'UPDATE', 'DELETE', 'MERGE'].includes(command)) out.affected = res.affectedRows;
    return out;
  }

  async _describe(name, original) {
    const [schema, table] = name.includes('.') ? name.split('.') : [null, name];
    const res = await this.db.query(
      `SELECT column_name AS "Name", CASE WHEN is_nullable = 'NO' THEN 'NOT NULL' ELSE '' END AS "Null?",
              CASE WHEN data_type = 'ARRAY' THEN udt_name ELSE data_type END ||
              COALESCE('(' || character_maximum_length || ')', CASE WHEN data_type = 'numeric' AND numeric_precision IS NOT NULL THEN '(' || numeric_precision || ',' || numeric_scale || ')' ELSE '' END) AS "Type"
       FROM information_schema.columns
       WHERE lower(table_name) = lower($1) AND ($2::text IS NULL OR table_schema = lower($2)) AND table_schema NOT IN ('pg_catalog','information_schema')
       ORDER BY ordinal_position`, [table, schema], { rowMode: 'array' });
    if (!res.rows.length) throw new Error(`relation "${name}" does not exist`);
    return { sql: original, fields: res.fields.map((f) => f.name), rows: res.rows, command: 'DESCRIBE', notes: [] };
  }

  // Run a list of statements; stops at the first error
  async _runList(stmts, { skipTxn = false } = {}) {
    const results = [];
    for (const s of stmts) {
      if (skipTxn && TXN_RE.test(stripComments(s))) {
        results.push({ sql: s, command: 'SKIPPED', notes: ['Transaction control (COMMIT/ROLLBACK/BEGIN) is ignored inside exercises – every check runs in its own rolled-back transaction.'] });
        continue;
      }
      try {
        results.push(await this._one(s));
      } catch (e) {
        results.push({ sql: s, error: e.message, position: e.position, hint: e.hint, detail: e.detail });
        return { results, error: e.message };
      }
    }
    return { results };
  }

  // Free playground (changes persist until reset)
  run(code) {
    return this.lock(async () => {
      const stmts = splitSql(code);
      const r = await this._runList(stmts);
      // make sure we are not stuck in an aborted transaction
      try { await this.db.exec('ROLLBACK'); } catch { /* no txn */ }
      return r;
    });
  }

  // Sandboxed run: BEGIN; setup; code; check; ROLLBACK
  sandbox({ setup = '', code = '', check = '' }) {
    return this.lock(async () => {
      await this.db.exec('BEGIN');
      try {
        if (setup) {
          const s = await this._runList(splitSql(setup));
          if (s.error) return { setupError: s.error, results: [] };
        }
        const main = await this._runList(splitSql(code), { skipTxn: true });
        let checkRes = null;
        if (check) {
          if (main.error) {
            checkRes = { error: 'not run (your code failed)' };
          } else {
            const c = await this._runList(splitSql(check));
            checkRes = c.error ? { error: c.error } : c.results[c.results.length - 1];
          }
        }
        return { ...main, check: checkRes };
      } finally {
        await this.db.exec('ROLLBACK');
        await this.db.exec('SET search_path TO hr, public');
      }
    });
  }

  reset() { return this.lock(() => this.init()); }
}
