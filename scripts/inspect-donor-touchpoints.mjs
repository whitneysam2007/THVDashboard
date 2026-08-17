import { getDb } from '../server/db.ts';

const nameFragment = process.argv[2] ?? '';
if (!nameFragment) throw new Error('Provide a donor name fragment, for example: Tuffli');

const db = await getDb();
const { data: donors, error: donorError } = await db
  .from('donors')
  .select('id,name,lastContactDate,cadenceDays')
  .ilike('name', `%${nameFragment}%`);
if (donorError) throw donorError;

for (const donor of donors ?? []) {
  const [activities, tasks] = await Promise.all([
    db.from('donor_activities').select('date,author,note').eq('donorId', donor.id).order('date', { ascending: false }),
    db.from('donor_tasks').select('id,label,dueDate,completedDate,completedBy').eq('donorId', donor.id).order('completedDate', { ascending: false }),
  ]);
  if (activities.error) throw activities.error;
  if (tasks.error) throw tasks.error;
  console.log(JSON.stringify({ donor, activities: activities.data, tasks: tasks.data }));
}
