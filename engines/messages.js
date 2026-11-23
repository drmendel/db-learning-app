// Grader / engine messages in every supported language.
// Usage: const T = tr('hu'); T('rowsDiffer', 3, 5)

const en = {
  correct: 'Correct!',
  colOrderNote: ' (your columns are in a different order – that is fine here)',
  colsDiffer: (want, got, u) => `Expected ${want} ${u === 'docs' ? 'field(s)' : 'column(s)'}, ${u === 'docs' ? 'you returned' : 'your query returned'} ${got}.`,
  colsDetail: (want, got) => `Expected columns (names may differ): ${want}\nYour columns: ${got}`,
  rowsDiffer: (want, got, u) => `Expected ${want} ${u === 'docs' ? 'document(s)' : 'row(s)'}, ${u === 'docs' ? 'you returned' : 'your query returned'} ${got}.`,
  missingRows: 'Some rows you are missing:',
  extraRows: 'Some rows that should not be there:',
  duplicates: 'You return duplicate rows – maybe DISTINCT, a missing join condition, or a GROUP BY is needed?',
  valuesDiffer: 'The number of rows is right, but some values differ.',
  valuesDetail: (bad, badStu) => `For example, this expected row is missing:\n  ${bad}\nand you have this row instead:\n  ${badStu}\n(Numbers are compared rounded to 2 decimals; check rounding, NULL handling, filters and the column order of the SELECT list.)`,
  wrongOrder: 'Right rows, wrong order – check your ORDER BY (direction ASC/DESC and the sort keys).',
  testsCouldNotRun: (e) => `The tests could not run: ${e}`,
  unknownError: 'unknown error',
  shouldReject: '  ← your table/data allowed it, but it should be rejected',
  shouldWork: '  ← this should work, but it raised an error',
  setupError: (e) => `Internal setup error: ${e}`,
  sqlError: 'Your SQL raised an error:',
  writeSql: 'Write some SQL first.',
  behaviourFailed: 'Some of the behaviour tests failed:',
  stateWrong: (m) => `The resulting state is not what was asked: ${m}`,
  noResultSet: 'Your code did not return a result set – this task expects a SELECT.',
  typeRedis: 'Type at least one Redis command.',
  lineError: (n) => `Line ${n} returned an error:`,
  redisData: 'The data in Redis is not what was asked.',
  checkedWith: (cmd, want, got) => `Checked with: ${cmd}\nExpected:\n${want}\nYours:\n${got}`,
  lastReply: 'The reply of your last command is not the expected one.',
  expectedYours: (want, got) => `Expected:\n${want}\nYours:\n${got}`,
  expectedDocs: 'Expected a list of documents.',
  fieldsDiffer: 'The documents do not have the expected fields.',
  missingFields: (f) => `Missing field(s): ${f}`,
  unexpectedFields: (f) => `Unexpected field(s): ${f} (check your projection – e.g. _id:0)`,
  resultDiffer: 'The result is not the expected one.',
  mongoError: 'Your code raised an error:',
  writeMongo: 'Write some mongosh code first.',
  checkFailed: (e) => `Checking your data failed: ${e}`,
  collState: (m) => `The data in the collection is not what was asked. ${m}`,
  noLast: 'Your code did not produce a result (the last statement should return something).',
  lastStmt: '(result of the last statement)',
  writeAnswer: 'Write your answer first.',
  textOk: 'Looks right! (checked by key elements – compare with the model solution)',
};

const hu = {
  correct: 'Helyes!',
  colOrderNote: ' (az oszlopaid más sorrendben vannak – itt ez nem baj)',
  colsDiffer: (want, got, u) => `${want} ${u === 'docs' ? 'mezőt' : 'oszlopot'} vártunk, ${u === 'docs' ? 'te' : 'a lekérdezésed'} ${got} darabot ${u === 'docs' ? 'adtál vissza' : 'adott vissza'}.`,
  colsDetail: (want, got) => `Várt oszlopok (a nevük eltérhet): ${want}\nA te oszlopaid: ${got}`,
  rowsDiffer: (want, got, u) => `${want} ${u === 'docs' ? 'dokumentumot' : 'sort'} vártunk, ${u === 'docs' ? 'te' : 'a lekérdezésed'} ${got} darabot ${u === 'docs' ? 'adtál vissza' : 'adott vissza'}.`,
  missingRows: 'Néhány sor, ami hiányzik nálad:',
  extraRows: 'Néhány sor, aminek nem kellene ott lennie:',
  duplicates: 'Ismétlődő sorokat adsz vissza – talán DISTINCT, egy hiányzó összekapcsolási feltétel vagy GROUP BY kell?',
  valuesDiffer: 'A sorok száma jó, de néhány érték eltér.',
  valuesDetail: (bad, badStu) => `Például ez a várt sor hiányzik:\n  ${bad}\nhelyette ez a sor van nálad:\n  ${badStu}\n(A számokat 2 tizedesre kerekítve hasonlítjuk össze; ellenőrizd a kerekítést, a NULL-kezelést, a szűrést és a SELECT lista oszlopait.)`,
  wrongOrder: 'Jók a sorok, de rossz a sorrend – ellenőrizd az ORDER BY-t (ASC/DESC irány és a rendezési kulcsok).',
  testsCouldNotRun: (e) => `A tesztek nem tudtak lefutni: ${e}`,
  unknownError: 'ismeretlen hiba',
  shouldReject: '  ← a táblád/adataid ezt engedték, de el kellene utasítani',
  shouldWork: '  ← ennek működnie kellene, de hibát adott',
  setupError: (e) => `Belső előkészítési hiba: ${e}`,
  sqlError: 'Az SQL kódod hibát adott:',
  writeSql: 'Előbb írj SQL kódot.',
  behaviourFailed: 'Néhány viselkedési teszt nem sikerült:',
  stateWrong: (m) => `Az eredményként kapott állapot nem az, amit a feladat kért: ${m}`,
  noResultSet: 'A kódod nem adott vissza eredményhalmazt – ez a feladat SELECT-et vár.',
  typeRedis: 'Írj be legalább egy Redis parancsot.',
  lineError: (n) => `A(z) ${n}. sor hibát adott:`,
  redisData: 'A Redisben lévő adatok nem azok, amiket a feladat kért.',
  checkedWith: (cmd, want, got) => `Ellenőrzés ezzel: ${cmd}\nVárt:\n${want}\nNálad:\n${got}`,
  lastReply: 'Az utolsó parancsod válasza nem a várt válasz.',
  expectedYours: (want, got) => `Várt:\n${want}\nNálad:\n${got}`,
  expectedDocs: 'Dokumentumok listáját vártuk.',
  fieldsDiffer: 'A dokumentumokban nem a várt mezők vannak.',
  missingFields: (f) => `Hiányzó mező(k): ${f}`,
  unexpectedFields: (f) => `Nem várt mező(k): ${f} (ellenőrizd a projekciót – pl. _id:0)`,
  resultDiffer: 'Az eredmény nem a várt eredmény.',
  mongoError: 'A kódod hibát adott:',
  writeMongo: 'Előbb írj mongosh kódot.',
  checkFailed: (e) => `Az adataid ellenőrzése nem sikerült: ${e}`,
  collState: (m) => `A gyűjteményben lévő adatok nem azok, amiket a feladat kért. ${m}`,
  noLast: 'A kódod nem adott eredményt (az utolsó utasításnak vissza kell adnia valamit).',
  lastStmt: '(az utolsó utasítás eredménye)',
  writeAnswer: 'Előbb írd meg a válaszodat.',
  textOk: 'Jónak tűnik! (a kulcselemeket ellenőriztük – vesd össze a mintamegoldással)',
};

// Notes emitted by the Oracle → PostgreSQL translator (engines/pg.js)
const NOTES_HU = {
  'Optimizer hints (/*+ ... */) are Oracle-only; PostgreSQL treats them as comments.': 'Az optimalizálói hintek (/*+ ... */) csak Oracle-ben működnek; a PostgreSQL megjegyzésnek tekinti őket.',
  'VARCHAR2 → VARCHAR (PostgreSQL has no VARCHAR2).': 'VARCHAR2 → VARCHAR (PostgreSQL-ben nincs VARCHAR2).',
  'Oracle NUMBER → PostgreSQL: NUMBER(p) → INTEGER/BIGINT, NUMBER(p,s) → NUMERIC(p,s), NUMBER → NUMERIC.': 'Oracle NUMBER → PostgreSQL: NUMBER(p) → INTEGER/BIGINT, NUMBER(p,s) → NUMERIC(p,s), NUMBER → NUMERIC.',
  'SYSDATE → LOCALTIMESTAMP / CURRENT_DATE in PostgreSQL.': 'SYSDATE → PostgreSQL-ben LOCALTIMESTAMP / CURRENT_DATE.',
  'SYSTIMESTAMP → CURRENT_TIMESTAMP.': 'SYSTIMESTAMP → CURRENT_TIMESTAMP.',
  "seq.NEXTVAL → nextval('seq') in PostgreSQL.": "seq.NEXTVAL → PostgreSQL-ben nextval('seq').",
  "seq.CURRVAL → currval('seq') in PostgreSQL.": "seq.CURRVAL → PostgreSQL-ben currval('seq').",
  'MINUS → EXCEPT in PostgreSQL.': 'MINUS → PostgreSQL-ben EXCEPT.',
  'NOCACHE removed (PostgreSQL: CACHE 1 is the default).': 'A NOCACHE el lett hagyva (PostgreSQL-ben a CACHE 1 az alapértelmezés).',
  'RENAME a TO b → ALTER TABLE a RENAME TO b in PostgreSQL.': 'RENAME a TO b → PostgreSQL-ben ALTER TABLE a RENAME TO b.',
  'ALTER TABLE t ADD (col type) → ALTER TABLE t ADD COLUMN col type in PostgreSQL.': 'ALTER TABLE t ADD (oszlop típus) → PostgreSQL-ben ALTER TABLE t ADD COLUMN oszlop típus.',
  'ALTER TABLE ... MODIFY → ALTER TABLE ... ALTER COLUMN ... TYPE / SET NOT NULL in PostgreSQL.': 'ALTER TABLE ... MODIFY → PostgreSQL-ben ALTER TABLE ... ALTER COLUMN ... TYPE / SET NOT NULL.',
  'EXPLAIN PLAN FOR → EXPLAIN in PostgreSQL (the plan is printed directly; DBMS_XPLAN.DISPLAY is Oracle-only).': 'EXPLAIN PLAN FOR → PostgreSQL-ben EXPLAIN (a terv azonnal megjelenik; a DBMS_XPLAN.DISPLAY csak Oracle-ben van).',
  'DBMS_XPLAN.DISPLAY emulated: shows the PostgreSQL plan of your last EXPLAIN PLAN FOR.': 'DBMS_XPLAN.DISPLAY emulálva: a legutóbbi EXPLAIN PLAN FOR PostgreSQL-tervét mutatja.',
  'Transaction control (COMMIT/ROLLBACK/BEGIN) is ignored inside exercises – every check runs in its own rolled-back transaction.': 'A tranzakciókezelő utasításokat (COMMIT/ROLLBACK/BEGIN) a feladatokban figyelmen kívül hagyjuk – minden ellenőrzés saját, visszagörgetett tranzakcióban fut.',
};

// Names of the behaviour tests used by DDL exercises (content/util.js behaviour())
export const TESTS_HU = {
  'valid row is accepted': 'érvényes sort elfogad',
  'duplicate id is rejected': 'ismétlődő id-t elutasít',
  'nem = 2 is rejected': 'nem = 2 értéket elutasít',
  'NULL name is rejected': 'NULL nevet elutasít',
  'unknown owner is rejected': 'nem létező gazdát elutasít',
  'duplicate email is rejected': 'ismétlődő emailt elutasít',
  'all 107 employees copied': 'mind a 107 dolgozó átmásolva',
  'duplicate department id rejected': 'ismétlődő részlegazonosítót elutasít',
  'duplicate employee id rejected': 'ismétlődő dolgozóazonosítót elutasít',
  'unknown department rejected': 'nem létező részleget elutasít',
  'salary 650 rejected': '650-es fizetést elutasít',
  'missing last name rejected': 'hiányzó vezetéknevet elutasít',
  'valid employee accepted': 'érvényes dolgozót elfogad',
  'every income is correct': 'minden income érték helyes',
  "'MEDIUM' is rejected": "'MEDIUM' értéket elutasít",
  "'LOW' is accepted": "'LOW' értéket elfogad",
  'view shows department 80 (34 rows)': 'a nézet a 80-as részleget mutatja (34 sor)',
  'insert into dept 80 works': 'beszúrás a 80-as részlegbe működik',
  'insert without dept 80 is rejected': 'beszúrást 80-as részleg nélkül elutasít',
  'raise through the view works': 'fizetésemelés a nézeten keresztül működik',
  'moving someone out is rejected': 'valaki kimozgatását elutasítja',
  'different names are fine': 'különböző nevek rendben vannak',
  'same name twice is rejected': 'kétszer ugyanazt a nevet elutasítja',
  'default evfolyam is 1': 'az alapértelmezett évfolyam 1',
  'id is generated automatically': 'az id automatikusan generálódik',
  'likes between existing people works': 'létező emberek közti kedvelés működik',
  'id_1 must exist': 'az id_1-nek léteznie kell',
  'id_2 must exist': 'az id_2-nek léteznie kell',
  'person.id is unique': 'a person.id egyedi',
  'id and empty tags are automatic': 'az id és az üres címkelista automatikus',
  'tags hold a text array': 'a címkék szövegtömböt tárolnak',
  'nev NULL is rejected': 'NULL nevet elutasít',
  'cimkek NULL is rejected': 'NULL címkelistát elutasít',
  'valid student with defaults': 'érvényes hallgató alapértékekkel',
  "status 'vegzett' is accepted": "'vegzett' státuszt elfogad",
  "status 'kirugva' is rejected": "'kirugva' státuszt elutasít",
  'kredit 301 is rejected': '301 kreditet elutasít',
  'kredit -1 is rejected': '-1 kreditet elutasít',
  'missing kredit is rejected': 'hiányzó kreditet elutasít',
};
en.testName = (n) => n;
hu.testName = (n) => TESTS_HU[n] || n;

const CATALOG = { en, hu };
export const LANGS = Object.keys(CATALOG);
export const normLang = (l) => (CATALOG[l] ? l : 'en');

export function tr(lang) {
  const cat = CATALOG[normLang(lang)];
  return (key, ...args) => {
    const v = cat[key] ?? en[key];
    if (v === undefined) return key;
    return typeof v === 'function' ? v(...args) : v;
  };
}

export function translateNote(note, lang) {
  return normLang(lang) === 'hu' ? (NOTES_HU[note] || note) : note;
}
