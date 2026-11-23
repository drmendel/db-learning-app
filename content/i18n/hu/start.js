export default {
  title: 'Kezdd itt',
  lab: 'Bevezetés',
  exercises: {
    'start-1': {
      title: 'Az első lekérdezésed',
      prompt: 'Futtasd le a `SELECT * FROM employees;` lekérdezést – a **Futtatás** gombbal (Ctrl+Enter) megnézheted a kimenetet, az **Ellenőrzés** gombbal (Ctrl+Shift+Enter) pedig értékelheted.',
      hints: ['Csak nyomd meg az Ellenőrzés gombot – a válasz már a szerkesztőben van.'],
    },
    'start-2': {
      title: 'Hány darab?',
      prompt: 'Hány sora van a `departments` táblának? Írj egy lekérdezést, ami ezt az **egy számot** adja vissza.',
      hints: ['`SELECT COUNT(*) FROM departments;`'],
    },
    'start-3': {
      title: 'Szia, Redis',
      prompt: 'A Redis-feladatoknál soronként egy parancsot írsz. Írd be, hogy `PING`, és ellenőrizd.',
      hints: ['Írd be: PING'],
    },
    'start-4': {
      title: 'Szia, MongoDB',
      prompt: 'A MongoDB-feladatok mongosh szintaxist használnak. A `feladatok` adatbázis ki van választva. Számold meg a `Users` gyűjtemény dokumentumait.',
      hints: ['`db.Users.countDocuments({})`'],
    },
  },
};
