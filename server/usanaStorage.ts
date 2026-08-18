import { nanoid } from 'nanoid';
import { getSupabaseServerClient } from './supabase';
import type { TripOperations } from '../shared/tripOperations';

export const USANA_BUCKET = 'thv-dashboard-private';
export const USANA_PROJECT_KEY = 'usana/usana-garden-tower-project.json';
const MAX_PDF_BYTES = 10 * 1024 * 1024;

export type UsanaProject = NonNullable<TripOperations['usanaProject']>;

export const defaultUsanaProject = (): UsanaProject => ({
  contactName: 'Michelle Benedict',
  contactEmail: 'michelle.benedict@usanainc.com',
  contactPhone: '8019524518',
  contactAddress: '2538 S. 3850 W. Salt Lake City, UT 84120',
});

export function safePdfName(fileName: string) {
  const cleaned = fileName.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').toLowerCase();
  return cleaned.endsWith('.pdf') ? cleaned : `${cleaned || 'garden-tower-document'}.pdf`;
}

async function ensureUsanaBucket() {
  const storage = getSupabaseServerClient().storage;
  const { error: lookupError } = await storage.getBucket(USANA_BUCKET);
  if (!lookupError) return;
  const { error } = await storage.createBucket(USANA_BUCKET, {
    public: false,
    fileSizeLimit: MAX_PDF_BYTES,
    allowedMimeTypes: ['application/pdf', 'application/json'],
  });
  if (error && !/already exists/i.test(error.message)) throw new Error(error.message);
}

export async function getUsanaProject(projectKey = USANA_PROJECT_KEY): Promise<UsanaProject> {
  await ensureUsanaBucket();
  const { data, error } = await getSupabaseServerClient().storage.from(USANA_BUCKET).download(projectKey);
  if (error || !data) return defaultUsanaProject();
  try {
    const parsed = JSON.parse(await data.text());
    return typeof parsed === 'object' && parsed ? { ...defaultUsanaProject(), ...parsed } : defaultUsanaProject();
  } catch {
    return defaultUsanaProject();
  }
}

export async function saveUsanaProject(project: UsanaProject, projectKey = USANA_PROJECT_KEY) {
  await ensureUsanaBucket();
  const { error } = await getSupabaseServerClient().storage.from(USANA_BUCKET).upload(
    projectKey,
    JSON.stringify(project),
    { contentType: 'application/json', upsert: true },
  );
  if (error) throw new Error(error.message);
  return project;
}

export async function uploadGardenTowerPdf(tripId: string, fileName: string, bytes: Buffer) {
  if (bytes.byteLength > MAX_PDF_BYTES) throw new Error('Please upload a PDF smaller than 10 MB.');
  await ensureUsanaBucket();
  const path = `usana/garden-tower/${tripId}/${nanoid()}-${safePdfName(fileName)}`;
  const { error } = await getSupabaseServerClient().storage.from(USANA_BUCKET).upload(path, bytes, {
    contentType: 'application/pdf',
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return { key: path };
}

export async function getGardenTowerPdfDownloadUrl(key: string) {
  if (!key.startsWith('usana/garden-tower/')) throw new Error('Invalid Garden Tower document key.');
  await ensureUsanaBucket();
  const { data, error } = await getSupabaseServerClient().storage.from(USANA_BUCKET).createSignedUrl(key, 60 * 60);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? 'Could not create a document download link.');
  return data.signedUrl;
}
