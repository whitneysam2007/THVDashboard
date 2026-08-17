import { createClient } from '@supabase/supabase-js';

const projectUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apply = process.env.APPLY === '1';
if (!projectUrl || !serviceRoleKey) throw new Error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');

const supabase = createClient(projectUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const portfolioTag = 'thv-portfolio:donors-500-5k';

const records = [
  { key: 'camille-jones', name: 'Camille Jones', email: null, address: '646 E Woodland Hills Dr, Bountiful, UT 84010', date: '2026-04-16', amount: 1000, initialContact: 'Village Meeting Bountiful', thankYouDate: '2026-04-26', connection: 'Millie Bahr', paymentMethod: 'Check', notes: 'Daughter Holland' },
  { key: 'tara-lewis', name: 'Tara Lewis', email: 'tarallewis@yahoo.com', address: '1864 Hickory Ridge Ct. Draper, UT 84020', date: '2026-04-22', amount: 1000, initialContact: 'Premiere', thankYouDate: '2026-05-26', connection: 'Brenley Burton', paymentMethod: 'Zeffy', notes: 'Gifted through Agnesi Business Services' },
  { key: 'corwin-lewis', name: 'Corwin Lewis', email: 'clewis1837@gmail.com', address: '1746 S 80 W Orem, UT 84058', date: '2026-04-18', amount: 500, initialContact: 'Family & past donor', thankYouDate: '2026-05-26', connection: 'Brenley Burton', paymentMethod: 'Zeffy' },
  { key: 'janet-hales', name: 'Janet Hales', email: 'janet.hales@gmail.com', address: '4620 S Willow Tree Ln, Holladay, UT 84117', date: '2026-04-18', amount: 1000, initialContact: 'Premiere', thankYouDate: '2026-05-26', connection: 'Lauren Foulger', paymentMethod: 'Zeffy' },
  { key: 'marcelina-cardon', name: 'Marcelina Cardon', email: 'calebandmarci@gmail.com', address: '1505 Creekview Cv, Cottonwood Heights, UT 84121', date: '2026-04-18', amount: 1000, initialContact: 'Friend & premiere', thankYouDate: '2026-05-26', connection: 'Emily Featherstone', paymentMethod: 'Zeffy' },
  { key: 'cindy-jensen', name: 'Cindy Jensen', email: 'cindyjens@gmail.com', address: '403 S 8600 E, Huntsville, UT 84317', date: '2026-04-18', amount: 500, initialContact: 'Friend & premiere', thankYouDate: '2026-05-26', connection: 'Brenley Burton', paymentMethod: 'Zeffy' },
  { key: 'mike-freeman', name: 'Mike Freeman', email: 'mikefreeman@hotmail.com', address: '1870 Meadow Dr, Cottonwood Heights, UT 84121', date: '2026-04-18', amount: 500, initialContact: 'Friend & premiere', thankYouDate: '2026-05-26', connection: 'Emily Featherstone', paymentMethod: 'Zeffy' },
  { key: 'brett-rachel-stohlton', name: 'Brett and Rachel Stohlton', email: 'brett@stohlton.com', address: '5286 Cottonwood Lane, Holladay, UT 84117', date: '2026-04-18', amount: 4000, initialContact: 'Expedition & premiere', thankYouDate: '2026-05-26', connection: 'Rachel Stohlton', paymentMethod: 'Zeffy' },
  { key: 'rachel-nelson', name: 'Rachel Nelson', email: 'rachelensignnelson@gmail.com', address: '2887 E Northwood Rd, Salt Lake City, UT 84117', date: '2026-05-30', amount: 1075, initialContact: 'Family', thankYouDate: '2026-06-26', connection: 'Lauren Foulger', paymentMethod: 'Zeffy', notes: '“The Humble Tree” art selling campaign' },
];

const { data: existingDonors, error: donorError } = await supabase.from('donors').select('id,name,email,tags');
if (donorError) throw new Error(donorError.message);

function findExisting(record) {
  const byEmail = record.email && existingDonors?.find(donor => donor.email?.toLowerCase() === record.email.toLowerCase());
  return byEmail ?? existingDonors?.find(donor => donor.name?.toLowerCase() === record.name.toLowerCase()) ?? null;
}

const plan = records.map(record => ({ record, existing: findExisting(record) }));
console.log(JSON.stringify({
  mode: apply ? 'apply' : 'dry-run',
  approvedRecordCount: records.length,
  creates: plan.filter(item => !item.existing).map(item => item.record.name),
  existingMatches: plan.filter(item => item.existing).map(item => ({ name: item.record.name, matchedId: item.existing.id })),
  explicitlyExcluded: ['Sean and Aly Johnson (already Monthly Giving)', 'James and Jane Alfandre (monthly donor)', 'Blake and Tianna Murray (already Major Donors)', 'Austyn Whittenburg (in-kind services)', 'worksheet running-total rows'],
}, null, 2));
if (!apply) process.exit(0);

for (const { record, existing } of plan) {
  const id = existing?.id ?? `donors-500-4999-${record.key}`;
  const priorTags = existing?.tags ? JSON.parse(existing.tags) : [];
  const tags = [...priorTags.filter(tag => typeof tag === 'string' && !tag.startsWith('thv-portfolio:')), portfolioTag];
  const notes = [
    record.notes,
    `Initial contact: ${record.initialContact}`,
    `Payment method: ${record.paymentMethod}`,
    'Imported solely from the approved Donors $500-$4,999 worksheet.',
  ].filter(Boolean).join('\n');
  const donorPayload = {
    id,
    name: record.name,
    contactName: '',
    email: record.email,
    address: record.address,
    startDate: record.date,
    type: 'one-time',
    tier: 'individual',
    cadenceDays: 365,
    cadenceDescription: 'annual stewardship',
    status: 'grey',
    naruCircle: false,
    donorTrip: false,
    taxReceiptSent: false,
    newsletterSubscribed: false,
    manuallyInactive: false,
    referredBy: record.connection,
    tags: JSON.stringify(tags),
    notes,
  };
  const { error: upsertError } = await supabase.from('donors').upsert(donorPayload, { onConflict: 'id' });
  if (upsertError) throw new Error(`Could not import ${record.name}: ${upsertError.message}`);

  const donationId = `import-500-4999-${id}-${record.date}`;
  const { error: donationError } = await supabase.from('donor_donations').upsert({
    id: donationId,
    donorId: id,
    date: record.date,
    amountCents: Math.round(record.amount * 100),
    note: `${record.paymentMethod} · imported Donors $500-$4,999 worksheet`,
  }, { onConflict: 'id' });
  if (donationError) throw new Error(`Could not import ${record.name}'s donation: ${donationError.message}`);

  const thankYouTaskId = `manual-import-thank-you-${record.key}-2026`;
  const { error: taskError } = await supabase.from('donor_tasks').upsert({
    id: thankYouTaskId,
    donorId: id,
    kind: 'onboarding',
    label: 'Thank-you card sent',
    dueDate: record.thankYouDate,
    completedDate: record.thankYouDate,
    completedBy: record.connection,
  }, { onConflict: 'id' });
  if (taskError) throw new Error(`Could not import ${record.name}'s thank-you history: ${taskError.message}`);

  const { error: totalError } = await supabase.from('donors').update({ totalDonatedCents: Math.round(record.amount * 100), lastContactDate: record.thankYouDate, updatedAt: new Date().toISOString() }).eq('id', id);
  if (totalError) throw new Error(`Could not finalize ${record.name}: ${totalError.message}`);
}

console.log(JSON.stringify({ importedDonors500To4999: records.length }, null, 2));
