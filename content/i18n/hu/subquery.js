export default {
  title: 'Allekérdezések és WITH',
  lab: 'Labor 3',
  exercises: {
    'sub-1': { title: 'Legkevesebbet keresők részlegenként', prompt: 'Listázd **részlegenként** a **legalacsonyabb fizetésű** dolgozó(k) **részlegazonosítóját**, **vezetéknevét** és **fizetését**.', hints: ['Inline nézet: `(SELECT department_id, MIN(salary) legkisebb FROM employees GROUP BY department_id) m`', 'Kapcsold hozzá a department_id ÉS a salary = legkisebb feltétellel is.'] },
    'sub-2': { title: 'Részlegátlag minden dolgozó mellett', prompt: 'Listázd a dolgozók **vezetéknevét, fizetését, részlegazonosítóját**, valamint **részlegük átlagfizetését**. (A részleg nélküli dolgozók kimaradhatnak.)', hints: ['Inline nézet a részlegenkénti átlagokkal, department_id szerint összekapcsolva.'] },
    'sub-3': { title: 'A legrosszabbul fizető munkakör', prompt: 'Melyik **munkakör** (munkakör neve) tartozik a **legalacsonyabb fizetésű dolgozóhoz**?', hints: ['`WHERE salary = (SELECT MIN(salary) FROM employees)`'] },
    'sub-4': { title: 'Egymásba ágyazott allekérdezések', prompt: 'Listázd azoknak a dolgozóknak a **vezetéknevét, munkakörének nevét** és **fizetését**, akik **ugyanabban a munkakörben dolgoznak, mint a legkevesebbet kereső dolgozó**.', hints: ['`WHERE job_id = (SELECT job_id FROM employees WHERE salary = (SELECT MIN(salary) FROM employees))`'] },
    'sub-5': { title: 'Gyakorlat 30', prompt: 'Listázd minden dolgozó **vezetéknevét, fizetését, munkakör-azonosítóját** és **a munkakörében dolgozók összfizetését**. Rendezz elsősorban **munkakör-azonosító**, másodsorban **név** szerint.', hints: ['Inline nézet: `SELECT job_id, SUM(salary) osszfizu FROM employees GROUP BY job_id`.'] },
    'sub-6': { title: 'Gyakorlat 31', prompt: 'Ugyanaz, mint az előző, de most a **részleg nevét, vezetéknevet, fizetést, munkakör nevét** és a **munkakör összfizetését** listázd. Rendezz **munkakörnév**, azon belül **vezetéknév** szerint. (A részleg nélküli dolgozók kimaradhatnak.)', hints: ['Kapcsold hozzá a departments-et (USING department_id), a jobs-t és az inline nézetet.'] },
    'sub-7': { title: 'Gyakorlat 32 – részlegátlag felett', prompt: 'Listázd azoknak a dolgozóknak a **vezetéknevét, fizetését** és **részlegük nevét**, akik **többet keresnek, mint a saját részlegük átlagfizetése**. Rendezd **fizetés szerint csökkenően**.\n\n*(Ez a minta ZH-ban is szerepel!)*', hints: ['Inline nézet a részlegátlagokkal, VAGY korrelált allekérdezés a WHERE-ben.', 'Utána kapcsold hozzá a departments-et a névért.'] },
    'sub-8': { title: 'Gyakorlat 33/a – legfeljebb a maximum fele', prompt: 'Listázd azoknak a dolgozóknak a **teljes nevét, fizetését** és **részlegük nevét**, akik **legfeljebb feleannyit** keresnek, mint **részlegük legmagasabb fizetése**.', hints: ['Inline nézet részlegenkénti `MAX(salary)`-vel; feltétel: `e.salary <= m.maxfiz / 2`.'] },
    'sub-9': { title: 'Gyakorlat 33/b – főnökök és csapataik', prompt: 'Listázd a **főnökök vezetéknevét**, **munkakör-azonosítóját**, **részlegük nevét**, a **közvetlen beosztottaik számát** és **összfizetését**. Rendezd ez utóbbi szerint **csökkenően**.', hints: ['Inline nézet az employees táblán manager_id szerint csoportosítva: COUNT(*), SUM(salary).', 'Kapcsold az employees táblához (a főnök sora) employee_id = manager_id feltétellel, majd a departments-hez.'] },
    'sub-10': {
      title: 'WITH – átlag feletti részlegek',
      prompt: '**WITH** segítségével listázd azoknak a részlegeknek a **nevét** és **teljes bérköltségét**, amelyek teljes bérköltsége **meghaladja a részlegek átlagos bérköltségét** (az átlagot egészre kerekítve). Rendezd **részlegnév** szerint.',
      hints: ['1. CTE: részlegnevenként a SUM(salary). 2. CTE: ROUND(AVG(...)) az 1. CTE felett.', 'A végső lekérdezés: az 1. CTE azon sorai, ahol dsum > (SELECT average FROM 2. CTE).'],
      require: ['Subquery factoringgal oldd meg: a lekérdezés WITH-tel kezdődjön.'],
    },
    'sub-11': {
      title: 'WITH – mindkét átlag felett',
      prompt: '**WITH** segítségével listázd azoknak a dolgozóknak a **keresztnevét, vezetéknevét** és **fizetését**, akiknek a fizetése **nagyobb a részlegük és a munkakörük átlagánál is**.',
      hints: ['Két CTE: részlegátlagok és munkakör-átlagok. Mindkettőt kapcsold az employees-hez.'],
      require: ['WITH-tel (subquery factoring) oldd meg.'],
    },
    'sub-12': {
      title: 'EXISTS',
      prompt: 'Listázd azoknak a **részlegeknek a nevét**, ahol **legalább egy dolgozó 10 000-nél többet keres**. Használj **EXISTS**-et.',
      hints: ['`WHERE EXISTS (SELECT 1 FROM employees e WHERE e.department_id = d.department_id AND e.salary > 10000)`'],
      require: ['Használj EXISTS-et.'],
    },
  },
};
