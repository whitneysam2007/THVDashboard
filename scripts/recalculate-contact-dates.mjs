import { getDb, recalculateLastContactDate } from '../server/db.ts';

const db = await getDb();
const { data: donors, error } = await db.from('donors').select('id,name');
if (error) throw error;

for (const donor of donors ?? []) {
  await recalculateLastContactDate(donor.id);
}

console.log(JSON.stringify({ recalculated: donors?.length ?? 0 }));
