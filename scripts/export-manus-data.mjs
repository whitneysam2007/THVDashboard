import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';

const outputDirectory = process.env.THV_MIGRATION_DIR ?? '/home/ubuntu/thv-production-migration';
const outputFile = path.join(outputDirectory, 'manus-dashboard-export.json');
const tables = [
  'users',
  'trips',
  'donors',
  'donor_activities',
  'donor_donations',
  'donor_tasks',
  'trip_attendees',
  'initiatives',
];

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required to export current dashboard data.');
}

const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  const data = {};
  for (const table of tables) {
    const [rows] = await connection.query(`select * from \`${table}\``);
    data[table] = rows;
  }

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputFile, JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2));
  console.log(JSON.stringify({ outputFile, counts: Object.fromEntries(tables.map(table => [table, data[table].length])) }, null, 2));
} finally {
  await connection.end();
}
