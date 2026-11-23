// Helpers for writing exercises

// Build a PostgreSQL check script that tries each statement in its own
// sub-transaction and records whether it succeeded ('ok') or failed ('error').
// Nothing a test does is kept (each test is rolled back).
// tests: [[name, sql], ...]
export function behaviour(tests, prelude = '') {
  const body = tests.map(([name, sql]) => `
  BEGIN
    ${sql.trim().replace(/;?\s*$/, ';')}
    RAISE EXCEPTION 'test_ok_marker';
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _checks VALUES (${tests.findIndex((t) => t[0] === name)}, '${name.replace(/'/g, "''")}', CASE WHEN SQLERRM = 'test_ok_marker' THEN 'ok' ELSE 'error' END);
  END;`).join('\n');
  return `${prelude}
CREATE TEMP TABLE _checks (n int, test text, result text);
DO $chk$
BEGIN
${body}
END
$chk$;
SELECT test, result FROM _checks ORDER BY n;`;
}

// Columns of a table, with a coarse type category (so NUMBER(3)/integer etc. all count as "number")
export function columnsOf(table, extra = '') {
  return `SELECT column_name,
  CASE WHEN data_type IN ('numeric','integer','smallint','bigint','real','double precision') THEN 'number'
       WHEN data_type LIKE 'character%' OR data_type = 'text' THEN 'text'
       WHEN data_type LIKE 'timestamp%' OR data_type = 'date' THEN 'date'
       WHEN data_type = 'ARRAY' THEN 'array:' || udt_name
       ELSE data_type END AS kind${extra}
FROM information_schema.columns WHERE table_name = '${table}' AND table_schema = 'hr' ORDER BY ordinal_position`;
}
