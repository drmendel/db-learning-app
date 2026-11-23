export default {
  title: 'SELECT, WHERE, ORDER BY',
  lab: 'Labor 1',
  exercises: {
    'sel-1': { title: 'Egy tábla teljes tartalma', prompt: 'Listázd a `departments` tábla **összes oszlopát**.', hints: ['A `*` jelentése: minden oszlop.'] },
    'sel-2': { title: 'Oszlopok kiválasztása', prompt: 'Az `employees` táblából csak a dolgozó **keresztnevét, vezetéknevét, fizetését** és **részlegazonosítóját** listázd.', hints: ['Az oszlopneveket vesszővel elválasztva írd a SELECT után.'] },
    'sel-3': {
      title: 'Összefűzés + alias',
      prompt: 'Listázd minden dolgozó **teljes nevét** (kereszt- és vezetéknév szóközzel elválasztva, egy oszlopban) `Név` fejléccel, valamint az **email címét**.',
      hints: ['Összefűzés: `||`.', `Ne felejtsd ki a szóközt: \`first_name || ' ' || last_name\`.`, 'Ékezetes alias → idézőjel: `AS "Név"`'],
    },
    'sel-4': { title: 'Egyszerű feltétel', prompt: 'Ki keres **10 000 USD-nál többet**? Add meg a **vezetéknevét, munkakör-azonosítóját** és **fizetését**.', hints: ['`WHERE salary > 10000`'] },
    'sel-5': {
      title: 'Jutalék NVL-lel',
      prompt: 'Ki kap **2000 USD-nál több jutalékot**, és mennyit? A jutalék összege `commission_pct * salary` (a hiányzó jutalék 0-nak számít). Add meg a **keresztnevet** és a **jutalék összegét** (`Jutalék` fejléccel).',
      hints: ['NULL * bármi = NULL. Használd az `NVL(commission_pct, 0)` vagy a `COALESCE(commission_pct, 0)` függvényt.', 'A `WHERE Jutalék > 2000` nem működik – a WHERE-ben ismételd meg a kifejezést.'],
    },
    'sel-6': { title: 'Összetett feltétel', prompt: 'Listázd a **80-as részlegben** dolgozók közül azok **azonosítóját, vezetéknevét** és **fizetését**, akik **legalább 10 000** USD-t keresnek.', hints: ['A feltételeket `AND` köti össze.', '„legalább” → `>=`'] },
    'sel-7': {
      title: 'Gyakorlat 1 – 5000 alatt',
      prompt: 'Listázd az **5000 USD-nál kevesebbet** keresők **teljes nevét**, **munkakör-azonosítóját** és **fizetését**. Fejlécek: `Név`, `Munkakör`, `Fizetés`. Rendezd **fizetés szerint csökkenően**.',
      hints: ['`ORDER BY salary DESC` (vagy `ORDER BY 3 DESC`).'],
    },
    'sel-8': {
      title: 'Gyakorlat 2 – BETWEEN',
      prompt: 'Listázd azok **teljes nevét, munkakörét és fizetését**, akiknek a fizetése **2400 és 3000 USD között** van (a határokat is beleértve). Fejlécek: `Név`, `Munkakör`, `Fizetés`; rendezd **fizetés szerint növekvően**.',
      hints: ['A `BETWEEN a AND b` mindkét határt tartalmazza.'],
    },
    'sel-9': { title: 'Gyakorlat 3 – NOT BETWEEN', prompt: 'Ugyanaz, mint az előbb, de most azokat listázd, akiknek a fizetése **NINCS** 2400 és 3000 között. Rendezd **fizetés szerint csökkenően**.', hints: ['`NOT BETWEEN`'] },
    'sel-10': {
      title: 'A LIKE kis-nagybetű érzékeny',
      prompt: 'Listázd azok **kereszt- és vezetéknevét**, akiknek a **keresztnevében szerepel az „ev”**, a kis- és nagybetűktől függetlenül. (Egy naiv `LIKE \'%EV%\'` senkit sem talál meg; 4 ilyen ember van.)',
      hints: ['Alakítsd át az oszlopot: `UPPER(first_name) LIKE ...`', 'PostgreSQL-ben van `ILIKE` is (kis-nagybetű független LIKE).'],
    },
    'sel-11': {
      title: 'IN lista',
      prompt: 'Keresd meg ugyanezeket az embereket (Kevin és Steven) **IN** segítségével LIKE helyett: listázd a **kereszt- és vezetéknevét** azoknak, akiknek a keresztneve Kevin vagy Steven.',
      hints: [`\`WHERE first_name IN ('Kevin', 'Steven')\` – a szöveg-összehasonlítás kis-nagybetű érzékeny!`],
      require: ['Ehhez az IN operátort használd.'],
    },
    'sel-12': {
      title: 'Gyakorlat 4 – telephelyek',
      prompt: 'Listázd azoknak a telephelyeknek a **címét, irányítószámát** és **városát**, amelyek **országkódja US vagy UK**, és **azonosítója 2500-nál kisebb**. Rendezd **városnév** szerint.',
      hints: ['A `locations` tábla oszlopai: location_id, street_address, postal_code, city, state_province, country_id', `Figyelj az AND/OR precedenciára: \`country_id IN ('US','UK') AND location_id < 2500\``],
    },
    'sel-13': { title: 'DISTINCT', prompt: 'Milyen **részlegazonosítók** szerepelnek az `employees` táblában? Mindegyiket **csak egyszer** listázd.', hints: ['`SELECT DISTINCT ...`', 'A NULL is egy értéknek számít (Kimberely Grant nem tartozik részleghez).'] },
    'sel-14': { title: 'IS NOT NULL', prompt: 'Ki kaphat egyáltalán jutalékot? Listázd azok **kereszt- és vezetéknevét**, valamint **commission_pct** értékét, akiknél a jutalék **nem hiányzik**.', hints: ['A `commission_pct > 0` nem ugyanaz! Használd az `IS NOT NULL`-t.'] },
    'sel-15': { title: 'IS NULL – a nagyfőnök', prompt: 'Kinek **nincs főnöke**? Add meg a **kereszt- és vezetéknevét**, valamint a **fizetését**.', hints: ['`manager_id IS NULL`'] },
    'sel-16': { title: 'Dátumok – TO_DATE', prompt: 'Listázd a **2000. január 13. után** belépett dolgozók **kereszt- és vezetéknevét**, valamint **belépési dátumát**.', hints: [`\`hire_date > TO_DATE('2000.01.13', 'YYYY.MM.DD')\``] },
    'sel-17': {
      title: 'Dátumok – TO_CHAR',
      prompt: 'Listázd az **1999-ben** belépett dolgozók **kereszt- és vezetéknevét**, valamint a **`YYYY.MM.DD` formátumú** belépési dátumot (`Belépés dátuma` fejléccel). A formázáshoz és a szűréshez is a `TO_CHAR` függvényt használd.',
      hints: [`\`TO_CHAR(hire_date, 'YYYY.MM.DD')\``, `Szűrés: \`TO_CHAR(hire_date, 'YYYY') = '1999'\` (vagy 'YY' = '99')`],
    },
    'sel-18': {
      title: 'Dátumok – EXTRACT',
      prompt: 'A 2000. január 13. után belépett dolgozóknál listázd a **keresztnevet, vezetéknevet, belépési dátumot**, valamint külön a belépés **évét, hónapját** és **napját** (3 további oszlop).',
      hints: ['`EXTRACT(YEAR FROM hire_date)`, `EXTRACT(MONTH FROM ...)`, `EXTRACT(DAY FROM ...)`'],
    },
    'sel-19': { title: 'Szövegfüggvények', prompt: 'Listázd azok **kereszt- és vezetéknevét**, akiknek a keresztneve **5 karakternél hosszabb**, és a **második betűje „a”**.', hints: ['`LENGTH(first_name) > 5`', `\`SUBSTR(first_name, 2, 1) = 'a'\``] },
    'sel-20': {
      title: 'Utolsó karakter (Oracle ≠ PostgreSQL)',
      prompt: 'Listázd azoknak a dolgozóknak a **keresztnevét**, akiknek a keresztneve **„n”-re végződik**.\n\n*(Oracle-ben a dián `SUBSTR(first_name, -1, 1) = \'n\'` szerepelt. Próbáld ki előbb ezt, és nézd meg, mit csinál a PostgreSQL!)*',
      hints: [`A PostgreSQL SUBSTR-je nem a végéről számol – a \`SUBSTR('Steven', -1, 1)\` üres szöveg.`, `Használd a \`RIGHT(first_name, 1) = 'n'\` vagy a \`first_name LIKE '%n'\` formát.`],
    },
    'sel-21': {
      title: 'CASE – fizetési sávok',
      prompt: 'Minden dolgozónál add meg a **vezetéknevet**, egy **fizetési sávot** és a **részlegazonosítót**. A sáv `Alacsony` 5000 alatt, `Közepes` 5000 és 12000 között (a határokat is beleértve), egyébként `Magas`.',
      hints: ['`CASE WHEN ... THEN ... WHEN ... THEN ... ELSE ... END`'],
    },
    'sel-22': {
      title: 'Gyakorlat 5 – szenioritás',
      prompt: 'Listázd a dolgozók **teljes nevét**, **belépési dátumát**, a cégnél (máig) eltöltött **egész évek** számát és a tapasztalatukat: **SENIOR**, ha **legalább 30 éve** dolgoznak a cégnél, különben **JUNIOR**.\n\n*(Az eredeti feladatban 15 év szerepel, de a HR adatok olyan régiek, hogy így mindenki SENIOR lenne.)*',
      hints: ['A mai nap és a belépés közti hónapok: `MONTHS_BETWEEN(CURRENT_DATE, hire_date)` (ebben az alkalmazásban működik) – oszd el 12-vel.', 'Egész évek: `TRUNC(...)` (vagy `FLOOR`). Tiszta PostgreSQL-ben: `EXTRACT(YEAR FROM AGE(CURRENT_DATE, hire_date))`.', 'A CASE-ben használd újra a kifejezést.'],
    },
  },
};
