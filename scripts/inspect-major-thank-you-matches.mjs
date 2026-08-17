import { createClient } from '@supabase/supabase-js';

const projectUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!projectUrl || !serviceRoleKey) throw new Error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');

const supabase = createClient(projectUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const targets = [
  'Mike Wynn', 'Ashton Family', 'Jami and David Ward', 'Aly and Sean Johnson', 'JW and Alice Marriott Foundation',
  'Jen and Bob Jackson', 'Jake & Marivic Fund', 'Fenton', 'Ruth and Steve Lowe', 'Cheryl and Lonnie Smith Family Foundation',
  'Kristen Kirk', 'Christy LeBlanc (Tuffli)', 'The Fenton Foundation', 'Tianna Murray', 'Dean Wallace',
  'Spencer & Brenley Burton', 'Tom & Carolyn Crawfordory', 'Susan Larson', 'USANA',
];

const normalize = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const { data: donors, error } = await supabase.from('donors').select('id,name,tags').order('name');
if (error) throw new Error(error.message);

const rows = targets.map(target => {
  const targetKey = normalize(target);
  const matches = (donors ?? []).filter(donor => {
    const donorKey = normalize(donor.name);
    return donorKey.includes(targetKey) || targetKey.includes(donorKey) || target.split(/\s+/).filter(word => word.length > 3).every(word => donorKey.includes(normalize(word)));
  }).map(donor => ({ id: donor.id, name: donor.name }));
  return { target, matches };
});

console.log(JSON.stringify(rows, null, 2));
