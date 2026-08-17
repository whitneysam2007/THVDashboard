import { createClient } from '@supabase/supabase-js';

const projectUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apply = process.env.APPLY === '1';

if (!projectUrl || !serviceRoleKey) {
  throw new Error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
}

const supabase = createClient(projectUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const portfolioTag = 'thv-portfolio:monthly-giving';
const today = new Date().toISOString().slice(0, 10);

const monthlyDonors = [
  { key: 'jane-alfandre', name: 'Jane Alfandre', email: 'janealfandre@gmail.com', address: '2220 E Bryan Cir, Salt Lake City, Utah 84108', startDate: '2026-04-18', amount: 50, recurringDates: ['2026-04-18', '2026-05-18', '2026-06-18', '2026-07-18'], oneTime: [{ date: '2026-04-18', amount: 250, note: 'One-time Zefy gift' }] },
  { key: 'katie-ball', name: 'Katie Ball', email: 'ballk1@yahoo.com', startDate: '2026-04-29', amount: 250, recurringDates: ['2026-04-29', '2026-05-29', '2026-06-29', '2026-07-29'] },
  { key: 'elizabeth-ellison', name: 'Elizabeth Ellison', email: 'elizabeth.l.ellison@gmail.com', address: '2152 E 1300 S, Salt Lake City, Utah 84108', startDate: '2026-06-15', amount: 20, recurringDates: ['2026-06-15', '2026-07-15', '2026-08-15'], notes: 'Zefy shows an earlier $25 contribution whose date is not visible; it is intentionally not imported.' },
  { key: 'laura-eyi', name: 'Laura Eyi', email: 'lauralewiseyi@gmail.com', address: '546 W Summit View Way, Lehi, Utah 84048', startDate: '2026-04-18', amount: 10, recurringDates: ['2026-04-18', '2026-05-18', '2026-06-18', '2026-07-18'], notes: 'Zefy all-time amount includes two earlier payments whose dates are not visible; only visible transactions are imported.' },
  { key: 'amy-fougler', name: 'Amy Fougler', email: 'foulgerfive@gmail.com', address: 'Texas', startDate: '2026-04-26', amount: 50, recurringDates: ['2026-04-26', '2026-05-26', '2026-06-26', '2026-07-26'], notes: 'Amazing work, Lauren & team!' },
  { key: 'london-lowe', name: 'London Lowe', email: 'ldraper2@weber.edu', startDate: '2026-06-02', amount: 25, recurringDates: ['2026-06-02', '2026-07-02', '2026-08-02'] },
  { key: 'cassi-reese', name: 'Cassi Reese', email: 'cassireese@hotmail.com', address: '2668 East, Holladay, Utah 84117', startDate: '2026-04-18', amount: 10, recurringDates: ['2026-04-18', '2026-05-18', '2026-06-18', '2026-07-18'], oneTime: [{ date: '2026-04-30', amount: 25, note: 'One-time Zefy gift' }], notes: 'Clean water giving tree' },
  { key: 'rachel-rowley', name: 'Rachel Rowley', email: 'rachelfrowley@gmail.com', address: '174 Oak Avenue, Carlsbad, 92008', startDate: '2026-05-31', amount: 20, recurringDates: ['2026-05-31', '2026-06-30', '2026-07-31'], notes: 'Zefy all-time amount includes one earlier payment whose date is not visible; only visible transactions are imported.' },
  { key: 'emily-rowley', name: 'Emily Rowley', email: 'emilymrowley@gmail.com', startDate: '2026-06-23', amount: 100, recurringDates: ['2026-06-23', '2026-07-23'], notes: 'Owner confirmed a single $100 monthly commitment. Zefy shows additional $100 entries on the 27th that are not imported as a separate recurring stream.' },
  { key: 'alicia-simpson', name: 'Alicia Simpson', email: 'alicia.masuda.simpson@gmail.com', address: 'California', startDate: '2026-06-18', amount: 10, recurringDates: ['2026-06-18', '2026-07-18'] },
  { key: 'lindsay-toone', name: 'Lindsay Toone', email: 'lindsaytoone@gmail.com', startDate: '2026-07-07', amount: 40, recurringDates: ['2026-07-07', '2026-08-07'] },
  { key: 'tamara-weenig', name: 'Tamara Weenig', email: 'tamweenig@gmail.com', address: '3949 Highland Dr., Carlsbad, 92008', startDate: '2026-07-09', amount: 100, recurringDates: ['2026-07-09', '2026-08-09'], oneTime: [{ date: '2026-06-17', amount: 35, note: 'One-time Zefy gift' }, { date: '2026-06-17', amount: 65, note: 'One-time Zefy gift' }], notes: 'Tshirt/bracelet' },
];

function withPortfolioTag(tags) {
  const parsed = Array.isArray(tags) ? tags : typeof tags === 'string' ? JSON.parse(tags || '[]') : [];
  return JSON.stringify([...parsed.filter(tag => typeof tag === 'string' && !tag.startsWith('thv-portfolio:')), portfolioTag]);
}

function recurringId(donorId, date) {
  return `recurring-${donorId}-${date}`;
}

const { data: existingDonors, error: donorError } = await supabase.from('donors').select('id,name,email,tags');
if (donorError) throw new Error(donorError.message);

const existingByEmail = new Map((existingDonors ?? []).filter(row => row.email).map(row => [row.email.toLowerCase(), row]));
const planned = [];

for (const donor of monthlyDonors) {
  const existing = existingByEmail.get(donor.email.toLowerCase());
  const id = existing?.id ?? `monthly-${donor.key}`;
  planned.push({ id, existing: Boolean(existing), donor });
}

const sean = (existingDonors ?? []).find(row => row.email?.toLowerCase() === 'seanandaly17@gmail.com' || /sean.*aly.*johnson/i.test(row.name));
if (!sean) throw new Error('Could not find the existing Sean and Aly Johnson donor record to move to Monthly Giving.');

console.log(JSON.stringify({
  mode: apply ? 'apply' : 'dry-run',
  expectedMonthlyCards: 13,
  newCards: planned.filter(row => !row.existing).map(row => row.donor.name),
  existingCards: planned.filter(row => row.existing).map(row => row.donor.name),
  moveExisting: { id: sean.id, name: sean.name },
  skippedUnverifiedTransactions: ['Elizabeth Ellison earlier $25', 'Laura Eyi two earlier $10 gifts', 'Rachel Rowley earlier $20 gift', 'Emily Rowley second $100 stream'],
}, null, 2));

if (!apply) process.exit(0);

for (const row of planned) {
  const { donor, id } = row;
  const donorRow = {
    id,
    name: donor.name,
    contactName: '',
    email: donor.email,
    address: donor.address ?? null,
    startDate: donor.startDate,
    type: 'recurring',
    tier: 'individual',
    recurringAmount: donor.amount,
    recurringFrequency: 'monthly',
    cadenceDays: 365,
    cadenceDescription: 'annual stewardship',
    status: 'grey',
    naruCircle: false,
    donorTrip: false,
    taxReceiptSent: false,
    newsletterSubscribed: false,
    manuallyInactive: false,
    tags: withPortfolioTag([]),
    notes: donor.notes ?? null,
  };
  const { error } = await supabase.from('donors').upsert(donorRow, { onConflict: 'id' });
  if (error) throw new Error(`Could not upsert ${donor.name}: ${error.message}`);

  const transactions = [
    ...donor.recurringDates.map(date => ({ id: recurringId(id, date), donorId: id, date, amountCents: Math.round(donor.amount * 100), note: 'Monthly Zefy recurring gift' })),
    ...(donor.oneTime ?? []).map((gift, index) => ({ id: `monthly-import-${id}-one-time-${gift.date}-${index + 1}`, donorId: id, date: gift.date, amountCents: Math.round(gift.amount * 100), note: gift.note })),
  ];
  const { error: transactionError } = await supabase.from('donor_donations').upsert(transactions, { onConflict: 'id' });
  if (transactionError) throw new Error(`Could not import transactions for ${donor.name}: ${transactionError.message}`);
  const totalDonatedCents = transactions.reduce((sum, transaction) => sum + transaction.amountCents, 0);
  const { error: totalError } = await supabase.from('donors').update({ totalDonatedCents, updatedAt: new Date().toISOString() }).eq('id', id);
  if (totalError) throw new Error(`Could not update total for ${donor.name}: ${totalError.message}`);
}

const { error: seanError } = await supabase.from('donors').update({
  tags: withPortfolioTag(sean.tags),
  type: 'recurring',
  recurringFrequency: 'monthly',
  recurringAmount: 500,
  cadenceDays: 365,
  cadenceDescription: 'annual stewardship',
  updatedAt: new Date().toISOString(),
}).eq('id', sean.id);
if (seanError) throw new Error(`Could not move Sean and Aly Johnson: ${seanError.message}`);

console.log(JSON.stringify({ importedNewCards: planned.length, movedExistingCard: sean.name, completedAt: today }, null, 2));
