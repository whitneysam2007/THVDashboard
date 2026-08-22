import type { MedicalTask } from '../shared/medicalTasks';
import { ensureUsanaBucket, USANA_BUCKET } from './usanaStorage';
import { getSupabaseServerClient } from './supabase';

const MEDICAL_TASKS_KEY = 'medical-volunteers/medical-tasks.json';

export async function getMedicalTasks(): Promise<MedicalTask[]> {
  await ensureUsanaBucket();
  const { data, error } = await getSupabaseServerClient().storage.from(USANA_BUCKET).download(MEDICAL_TASKS_KEY);
  if (error || !data) return [];
  try {
    const parsed = JSON.parse(await data.text());
    return Array.isArray(parsed) ? parsed.filter(task => task && typeof task.id === 'string' && typeof task.title === 'string' && typeof task.owner === 'string' && typeof task.category === 'string') : [];
  } catch {
    return [];
  }
}

export async function saveMedicalTasks(tasks: MedicalTask[]) {
  await ensureUsanaBucket();
  const { error } = await getSupabaseServerClient().storage.from(USANA_BUCKET).upload(
    MEDICAL_TASKS_KEY,
    JSON.stringify(tasks),
    { contentType: 'application/json', upsert: true },
  );
  if (error) throw new Error(error.message);
  return tasks;
}
