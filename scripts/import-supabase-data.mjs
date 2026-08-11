import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const exportPath = process.env.THV_MIGRATION_FILE ?? '/home/ubuntu/thv-production-migration/manus-dashboard-export.json';
const projectUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!projectUrl || !serviceRoleKey) {
  throw new Error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for import.');
}

const booleanColumns = new Set([
  'naruCircle', 'donorTrip', 'taxReceiptSent', 'newsletterSubscribed', 'manuallyInactive',
  'isTeen', 'speaksSpanish', 'confirmed', 'purchasedTicket',
]);
const tables = [
  { source: 'users', target: 'users', key: 'id' },
  { source: 'trips', target: 'trips', key: 'id' },
  { source: 'donors', target: 'donors', key: 'id' },
  { source: 'donor_activities', target: 'donor_activities', key: 'id' },
  { source: 'donor_donations', target: 'donor_donations', key: 'id' },
  { source: 'donor_tasks', target: 'donor_tasks', key: 'id' },
  { source: 'trip_attendees', target: 'trip_attendees', key: 'id' },
  { source: 'initiatives', target: 'initiatives', key: 'id' },
];

const normalizeRow = row => Object.fromEntries(
  Object.entries(row).map(([column, value]) => [
    column,
    booleanColumns.has(column) && value !== null ? Number(value) === 1 || value === true : value,
  ]),
);

const exportPayload = JSON.parse(await readFile(exportPath, 'utf8'));
const supabase = createClient(projectUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const results = {};
for (const table of tables) {
  const rows = (exportPayload.data[table.source] ?? []).map(normalizeRow);
  if (rows.length > 0) {
    const { error } = await supabase.from(table.target).upsert(rows, { onConflict: table.key });
    if (error) throw new Error(`Import failed for ${table.target}: ${error.message}`);
  }

  const { count, error: countError } = await supabase
    .from(table.target)
    .select('*', { count: 'exact', head: true });
  if (countError) throw new Error(`Count reconciliation failed for ${table.target}: ${countError.message}`);
  results[table.target] = { exported: rows.length, imported: count ?? 0 };
}

console.log(JSON.stringify({ exportPath, results }, null, 2));
