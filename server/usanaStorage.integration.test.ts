import { afterEach, describe, expect, it } from 'vitest';
import { nanoid } from 'nanoid';
import { getSupabaseServerClient } from './supabase';
import { defaultUsanaProject, getGardenTowerPdfDownloadUrl, getGuateTeamDocumentDownloadUrl, getUsanaProject, saveUsanaProject, uploadGardenTowerPdf, uploadGuateTeamDocument, USANA_BUCKET } from './usanaStorage';

const cleanupKeys: string[] = [];

afterEach(async () => {
  if (!cleanupKeys.length) return;
  const { error } = await getSupabaseServerClient().storage.from(USANA_BUCKET).remove(cleanupKeys.splice(0));
  expect(error).toBeNull();
});

describe('USANA Supabase Storage integration', () => {
  it('round-trips an isolated global-project record without changing the live USANA record', async () => {
    const key = `usana/integration-tests/project-${nanoid()}.json`;
    cleanupKeys.push(key);
    const project = { contractNumber: 'integration-contract', totalFundsUsd: 1250, fundsReceived: true, contactName: 'Integration Michelle', contactEmail: 'michelle@example.org' };

    await expect(saveUsanaProject(project, key)).resolves.toEqual(project);
    await expect(getUsanaProject(key)).resolves.toEqual({ ...defaultUsanaProject(), ...project });
  });

  it('uploads an isolated PDF and obtains a controlled signed download URL', async () => {
    const uploaded = await uploadGardenTowerPdf(`integration-${nanoid()}`, 'Garden Tower Test.pdf', Buffer.from('%PDF-1.4\nTHV integration test'));
    cleanupKeys.push(uploaded.key);

    expect(uploaded.key).toMatch(/^usana\/garden-tower\/integration-/);
    await expect(getGardenTowerPdfDownloadUrl(uploaded.key)).resolves.toMatch(/^https?:\/\//);
  });

  it('uploads an isolated internal Guatemala team document and obtains a download URL', async () => {
    const uploaded = await uploadGuateTeamDocument(`integration-${nanoid()}`, 'Family Market List.csv', Buffer.from('family,items\nLópez,beans'), 'text/csv');
    cleanupKeys.push(uploaded.key);

    expect(uploaded.key).toMatch(/^trips\/guate-team\/integration-/);
    await expect(getGuateTeamDocumentDownloadUrl(uploaded.key)).resolves.toMatch(/^https?:\/\//);
  });
});
