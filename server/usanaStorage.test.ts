import { describe, expect, it } from 'vitest';
import { defaultUsanaProject, getGardenTowerPdfDownloadUrl, getGuateTeamDocumentDownloadUrl, safeDocumentName, safePdfName } from './usanaStorage';

describe('USANA project storage helpers', () => {
  it('starts the global project record with the approved USANA contact', () => {
    expect(defaultUsanaProject()).toEqual({
      contactName: 'Michelle Benedict',
      contactEmail: 'michelle.benedict@usanainc.com',
      contactPhone: '8019524518',
      contactAddress: '2538 S. 3850 W. Salt Lake City, UT 84120',
    });
  });

  it('normalizes Garden Tower PDF object names without allowing path characters', () => {
    expect(safePdfName('../../Guatemala Towers May 2026.PDF')).toBe('..-..-guatemala-towers-may-2026.pdf');
    expect(safePdfName('tower-plan')).toBe('tower-plan.pdf');
  });

  it('rejects a document key outside the controlled Garden Tower path before accessing storage', async () => {
    await expect(getGardenTowerPdfDownloadUrl('not-a-garden-tower-file.pdf')).rejects.toThrow('Invalid Garden Tower document key.');
  });

  it('normalizes Guatemala team document names and rejects keys outside their trip scope', async () => {
    expect(safeDocumentName('../../Family Market List May 2027.xlsx')).toBe('..-..-family-market-list-may-2027.xlsx');
    await expect(getGuateTeamDocumentDownloadUrl('usana/garden-tower/example.pdf')).rejects.toThrow('Invalid Guatemala team document key.');
  });
});
