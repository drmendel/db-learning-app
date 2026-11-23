export default {
  title: 'PostgreSQL tömbök, típusok, JSONB',
  lab: 'Labor 5–6',
  exercises: {
    'pga-1': {
      title: 'Tömbök – szerencseszámok',
      prompt: 'A dolgozók egy **másolatán** (`emp_copy`, már létrehozva):\n\n1. Adj hozzá egy `szerencseszamok` oszlopot, ami **több egész számot** tárol (egész tömb).\n2. Állítsd **mindenki** szerencseszámát **13-ra és 42-re**.\n3. Akinek a **department_id-ja nagyobb 80-nál**, annak a szerencseszámai legyenek: **42** és **department_id − 100**.',
      hints: ['`ALTER TABLE emp_copy ADD COLUMN szerencseszamok integer[];`', '`UPDATE emp_copy SET szerencseszamok = ARRAY[13, 42];`', '`UPDATE emp_copy SET szerencseszamok = ARRAY[42, department_id - 100] WHERE department_id > 80;`'],
    },
    'pga-2': {
      title: 'ZH 3a – kurzusok tábla',
      prompt: 'Hozz létre egy `kurzusok` táblát:\n\n- `kurzus_id`: **automatikusan növekvő** elsődleges kulcs\n- `nev`: **kötelező** szöveges mező\n- `cimkek`: **szövegtömb**, ami **alapértelmezetten üres**, és **nem lehet NULL**\n\n*(ZH 3a feladat – 5 pont.)*',
      hints: ['`kurzus_id serial PRIMARY KEY`', `\`cimkek text[] NOT NULL DEFAULT '{}'\` (vagy \`DEFAULT ARRAY[]::text[]\`)`],
    },
    'pga-3': {
      title: 'ZH 3b – kurzusok beszúrása',
      prompt: 'Az üres `kurzusok` tábla létezik. Szúrj be két kurzust **a kurzus_id megadása nélkül**:\n\n- **SQL alapok**, címkéi: *sql, adatbazis*\n- **PostgreSQL**, címkéi: *sql, postgresql, json*',
      hints: [`\`INSERT INTO kurzusok (nev, cimkek) VALUES ('SQL alapok', ARRAY['sql','adatbazis']), (...);\``, `A literál forma is működik: \`'{sql,adatbazis}'\``],
    },
    'pga-4': {
      title: 'ZH 3c – szűrés tömbre',
      prompt: 'A táblában most 4 kurzus van (SQL alapok, PostgreSQL, Python alapok, JSON gyakorlat). Kérdezd le az **sql** címkét tartalmazó kurzusok **nevét** és **címkéik darabszámát** (`cimkek_szama` néven), **név szerint növekvően** rendezve.',
      hints: [`\`WHERE 'sql' = ANY(cimkek)\` (vagy \`cimkek @> ARRAY['sql']\`)`, '`cardinality(cimkek) AS cimkek_szama`'],
    },
    'pga-5': { title: 'ZH 3d – hozzáfűzés tömbhöz', prompt: 'Frissítsd az **SQL alapok** kurzust úgy, hogy a `cimkek` tömb **végére** bekerüljön a **gyakorlat** címke.', hints: [`\`SET cimkek = array_append(cimkek, 'gyakorlat')\` vagy \`cimkek || 'gyakorlat'\``] },
    'pga-6': { title: 'Tartalmazás @>', prompt: 'Listázd azoknak a kurzusoknak a nevét, amelyeknek a *postgresql* **és** a *json* címkéje is megvan.', hints: [`\`cimkek @> ARRAY['postgresql', 'json']\``] },
    'pga-7': { title: 'Átfedés &&', prompt: 'Listázd azoknak a kurzusoknak a nevét, amelyeknek a *python* vagy az *api* címkék közül **legalább az egyik** megvan.', hints: [`\`cimkek && ARRAY['python', 'api']\``] },
    'pga-8': { title: 'UNNEST – címkestatisztika', prompt: 'Hány kurzus használja az egyes címkéket? Add meg a **címkét** és a **kurzusok számát**, a **darabszám szerint csökkenően**, majd **címke** szerint rendezve.', hints: ['A `SELECT unnest(cimkek) AS cimke FROM kurzusok` címkénként egy sort ad.', 'Használd inline nézetként, és csoportosíts rá.'] },
    'pga-9': { title: 'ARRAY_AGG', prompt: 'A **10-es, 20-as és 30-as** részlegnél add meg a **részlegazonosítót** és a dolgozók **vezetékneveinek tömbjét** **ábécésorrendben**.', hints: ['`array_agg(last_name ORDER BY last_name)`'] },
    'pga-10': { title: 'array_replace / array_remove', prompt: 'Minden kurzusban: cseréld a **json** címkét **jsonb**-re, és töröld a **programozas** címkét.', hints: [`\`SET cimkek = array_remove(array_replace(cimkek, 'json', 'jsonb'), 'programozas')\``] },
    'pga-11': {
      title: 'ENUM, DOMAIN, összetett típus',
      prompt: 'Hozd létre:\n\n- a `hallgato_statusz` ENUM típust **aktiv, passziv, vegzett** értékekkel\n- a `kredit_ertek` DOMAIN-t integer alapon, ami csak **0–300** közötti értéket enged\n- a `cim_tipus` összetett típust **varos, utca, hazszam** szöveges mezőkkel\n- a `hallgato` táblát: `id` serial PK, `nev` text NOT NULL, `statusz` hallgato_statusz NOT NULL, alapértelmezés **\'aktiv\'**, `kredit` kredit_ertek NOT NULL, `cim` cim_tipus, `profil` jsonb NOT NULL, alapértelmezés **\'{}\'**',
      hints: [`\`CREATE TYPE hallgato_statusz AS ENUM ('aktiv', 'passziv', 'vegzett');\``, '`CREATE DOMAIN kredit_ertek AS integer CHECK (VALUE BETWEEN 0 AND 300);`', '`CREATE TYPE cim_tipus AS (varos text, utca text, hazszam text);`'],
    },
    'pga-12': { title: 'Összetett mező lekérdezése', prompt: 'A 6. labor `employee_trainings` táblájából listázd a **képzés nevét**, valamint a `details` összetett oszlopból az **oktatót** és a **helyszínt (location)** a **10 óránál hosszabb** képzéseknél.', hints: ['`(details).instructor`, `(details).location`, `(details).hours` – figyelj a zárójelekre!'] },
    'pga-13': { title: 'Gyakorló 1 – tömbök (2 p)', prompt: 'Listázd azoknak a dolgozóknak a **teljes nevét**, **munkakörük nevét** és a **képzés címét**, akik valamelyik képzésen **postgresql** készséget szereztek. A kereséshez a `skills` tömböt használd.', hints: [`\`'postgresql' = ANY(t.skills)\``, 'employee_trainings → employees → jobs'] },
    'pga-14': { title: 'Gyakorló 2 – saját és összetett típusok (2 p)', prompt: 'Listázd az **IT-részlegen** (részlegnév \'IT\') dolgozók **legalább 90 pontos**, **completed** állapotú képzéseit. Jelenítsd meg a **dolgozó teljes nevét**, a **képzés címét**, a **pontszámot** és az **oktató nevét** (a `details` összetett mezőből).', hints: [`\`t.status = 'completed'\` – az ENUM értéket szövegként hasonlítjuk.`, '`(t.details).instructor`', `Kapcsold hozzá a departments-et, és szűrj: \`department_name = 'IT'\`.`] },
    'pga-15': {
      title: 'Gyakorló 3 – öröklés (2 p)',
      prompt: '**Egy két oszlopos lekérdezéssel** add meg, hány képzés jelenik meg az `employee_trainings` táblán keresztül **az örökölt (gyermek) rekordokkal együtt**, és hány található **kizárólag a szülőtáblában**.',
      hints: ['Két skalár allekérdezés: `(SELECT COUNT(*) FROM employee_trainings)` és `(SELECT COUNT(*) FROM ONLY employee_trainings)`'],
      require: ['Az ONLY kulcsszóval zárd ki a gyermektábla sorait.'],
    },
    'pga-16': { title: 'Gyakorló 4 – JSONB (2 p)', prompt: 'Listázd az **online** képzéseket, amelyek **legalább 4 csillagos** értékelést kaptak. Jelenítsd meg a **dolgozó teljes nevét**, a **képzés címét** és az **értékelést**. (A `feedback` JSONB mezőben a `mode` és `rating` kulcsok találhatók.)', hints: [`\`t.feedback->>'mode' = 'online'\``, `\`(t.feedback->>'rating')::int >= 4\` – a ->> szöveget ad vissza, számok összehasonlítása előtt alakítsd át.`] },
    'pga-17': { title: 'JSONB – tartalmazás és kulcs létezése', prompt: 'Listázd azoknak a képzéseknek a **nevét** és a **megjegyzés** szövegét, amelyek visszajelzésében **van `comment` kulcs**, és **tartalmazza** a `{"mode": "online"}` értéket.', hints: [`\`feedback ? 'comment'\``, `\`feedback @> '{"mode":"online"}'\``, `\`feedback->>'comment'\``] },
    'pga-18': {
      title: 'Gyakorló plusz – jsonb_set',
      prompt: 'Bruce Ernst a **Linux alapok** képzést utólag **5 csillagra** értékelte. Írj egy UPDATE utasítást, ami a `feedback` JSONB oszlopban a `rating` értéket módosítja **a többi kulcs megtartásával**.',
      hints: [`\`SET feedback = jsonb_set(feedback, '{rating}', '5')\``, `A sor azonosítása: course_name = 'Linux alapok' és a Bruce Ernst nevű dolgozó (employee_id 104) – pl. egy allekérdezéssel az employees táblán.`],
      require: ['Használd a jsonb_set-et, hogy a többi kulcs megmaradjon.'],
    },
    'pga-c1': {
      title: 'Tömb vagy kapcsolótábla? (ZH 9)',
      prompt: 'Mikor jó választás egy PostgreSQL **tömb oszlop**, és mikor érdemes inkább külön **kapcsolótáblát** használni? Mondj egy-egy példát.',
      answerText: '**Tömb:** egyszerű skalár értékek kis listája, ami a sorhoz tartozik és vele együtt olvassuk, hivatkozási integritás nélkül, pl. egy kurzus címkéi (`cimkek text[]`), szerencseszámok, telefonszámok. **Kapcsolótábla:** ha az elemek önálló entitások (hallgatók ↔ kurzusok), idegen kulcs/megszorítás kell rájuk, külön kérdezzük le, kapcsoljuk össze, frissítjük vagy számoljuk őket, saját attribútumuk van (pl. jegy, beiratkozás dátuma), vagy a lista nagyra nőhet. Ez a normalizált (1NF) relációs megoldás.',
    },
  },
};
