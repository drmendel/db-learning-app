import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import select from './m01-select.js';
import joins from './m02-joins.js';
import group from './m03-group.js';
import subquery from './m04-subquery.js';
import ddl from './m05-ddl.js';
import plans from './m06-plans.js';
import pgbasics from './m07-pg-basics.js';
import pgadvanced from './m08-pg-advanced.js';
import redis from './m09-redis.js';
import mongo from './m10-mongo.js';
import mongoagg from './m11-mongo-agg.js';
import integration from './m12-integration.js';
import theory from './m13-theory.js';
import mockzh from './m14-mock-zh.js';
export { datasets } from './datasets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const start = {
  id: 'start',
  title: 'Start here',
  lab: 'Intro',
  engine: 'pg',
  lesson: '00-start.md',
  exercises: [
    {
      id: 'start-1', type: 'pg', title: 'Your first query',
      prompt: 'Run `SELECT * FROM employees;` – press **Run** (Ctrl+Enter) to see the output, then **Check** (Ctrl+Shift+Enter) to grade it.',
      starter: 'SELECT * FROM employees;',
      hints: ['Just press Check – the answer is already in the editor.'],
      solution: 'SELECT * FROM employees;',
    },
    {
      id: 'start-2', type: 'pg', title: 'How many?',
      prompt: 'How many rows does the `departments` table have? Write a query that returns that **one number**.',
      hints: ['`SELECT COUNT(*) FROM departments;`'],
      solution: 'SELECT COUNT(*) FROM departments;',
    },
    {
      id: 'start-3', type: 'redis', title: 'Hello Redis',
      prompt: 'Redis exercises take one command per line. Type `PING` and check it.',
      hints: ['Type PING'],
      solution: 'PING',
    },
    {
      id: 'start-4', type: 'mongo', title: 'Hello MongoDB', data: 'feladatok', db: 'feladatok',
      prompt: 'MongoDB exercises use mongosh syntax. The database `feladatok` is selected. Count the documents in the `Users` collection.',
      hints: ['`db.Users.countDocuments({})`'],
      solution: 'db.Users.countDocuments({})',
    },
  ],
};

export const modules = [start, select, joins, group, subquery, ddl, plans, pgbasics, pgadvanced, redis, mongo, mongoagg, integration, theory, mockzh]
  .map((m) => ({
    ...m,
    lessonText: m.lesson ? fs.readFileSync(path.join(__dirname, 'lessons', m.lesson), 'utf8') : '',
    exercises: m.exercises.map((e) => ({ ...e, module: m.id })),
  }));

export const exerciseById = new Map();
for (const m of modules) {
  for (const e of m.exercises) {
    if (exerciseById.has(e.id)) throw new Error('duplicate exercise id ' + e.id);
    exerciseById.set(e.id, e);
  }
}
