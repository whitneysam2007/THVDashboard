import { nanoid } from 'nanoid';
import { getSupabaseServerClient } from './supabase';
import { ALLOWED_DOCUMENT_MIME_TYPES, ensureUsanaBucket, MAX_PRIVATE_DOCUMENT_BYTES, safeDocumentName, USANA_BUCKET } from './usanaStorage';

const RESOURCE_LIBRARY_KEY = 'resources/resource-library.json';
const RESOURCE_LINK_CATEGORY_KEY = 'resources/resource-link-categories.json';

export const RESOURCE_LIBRARY_CATEGORIES = ['Reports', 'Resources', 'Trips', 'USANA Garden Towers'] as const;
export type ResourceLibraryCategory = (typeof RESOURCE_LIBRARY_CATEGORIES)[number];
export type ResourceLibraryDocument = {
  id: string;
  name: string;
  category: ResourceLibraryCategory;
  key: string;
  mimeType?: string;
  uploadedAt: string;
};

export async function getResourceLibrary(): Promise<ResourceLibraryDocument[]> {
  await ensureUsanaBucket();
  const { data, error } = await getSupabaseServerClient().storage.from(USANA_BUCKET).download(RESOURCE_LIBRARY_KEY);
  if (error || !data) return [];
  try {
    const parsed = JSON.parse(await data.text());
    return Array.isArray(parsed) ? parsed.filter(item => item && RESOURCE_LIBRARY_CATEGORIES.includes(item.category)) : [];
  } catch {
    return [];
  }
}

export async function saveResourceLibrary(documents: ResourceLibraryDocument[]) {
  await ensureUsanaBucket();
  const { error } = await getSupabaseServerClient().storage.from(USANA_BUCKET).upload(
    RESOURCE_LIBRARY_KEY,
    JSON.stringify(documents),
    { contentType: 'application/json', upsert: true },
  );
  if (error) throw new Error(error.message);
  return documents;
}

export async function updateResourceLibraryDocumentCategory(id: string, category: ResourceLibraryCategory) {
  const documents = await getResourceLibrary();
  const document = documents.find(item => item.id === id);
  if (!document) throw new Error('Resource not found.');
  const next = documents.map(item => item.id === id ? { ...item, category } : item);
  await saveResourceLibrary(next);
  return next;
}

export async function getResourceLinkCategories(): Promise<Record<string, ResourceLibraryCategory>> {
  await ensureUsanaBucket();
  const { data, error } = await getSupabaseServerClient().storage.from(USANA_BUCKET).download(RESOURCE_LINK_CATEGORY_KEY);
  if (error || !data) return {};
  try {
    const parsed = JSON.parse(await data.text());
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, category]) => typeof category === 'string' && RESOURCE_LIBRARY_CATEGORIES.includes(category as ResourceLibraryCategory))) as Record<string, ResourceLibraryCategory>;
  } catch {
    return {};
  }
}

export async function updateResourceLinkCategory(href: string, category: ResourceLibraryCategory) {
  const links = await getResourceLinkCategories();
  const next = { ...links, [href]: category };
  await ensureUsanaBucket();
  const { error } = await getSupabaseServerClient().storage.from(USANA_BUCKET).upload(
    RESOURCE_LINK_CATEGORY_KEY,
    JSON.stringify(next),
    { contentType: 'application/json', upsert: true },
  );
  if (error) throw new Error(error.message);
  return next;
}

export async function uploadResourceLibraryDocument(category: ResourceLibraryCategory, fileName: string, bytes: Buffer, mimeType: string) {
  if (bytes.byteLength > MAX_PRIVATE_DOCUMENT_BYTES) throw new Error('Please upload a file smaller than 15 MB.');
  if (!ALLOWED_DOCUMENT_MIME_TYPES.has(mimeType)) throw new Error('This file type is not supported. Upload a PDF, image, Word document, spreadsheet, text, or CSV file.');
  await ensureUsanaBucket();
  const path = `resources/${category.toLowerCase()}/${nanoid()}-${safeDocumentName(fileName)}`;
  const { error } = await getSupabaseServerClient().storage.from(USANA_BUCKET).upload(path, bytes, { contentType: mimeType, upsert: false });
  if (error) throw new Error(error.message);
  return { key: path };
}

export async function getResourceLibraryDocumentDownloadUrl(key: string) {
  if (!key.startsWith('resources/')) throw new Error('Invalid resource-library document key.');
  await ensureUsanaBucket();
  const { data, error } = await getSupabaseServerClient().storage.from(USANA_BUCKET).createSignedUrl(key, 60 * 60, { download: true });
  if (error || !data?.signedUrl) throw new Error(error?.message ?? 'Could not create a document download link.');
  return data.signedUrl;
}
