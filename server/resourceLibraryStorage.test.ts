import { describe, expect, it } from 'vitest';
import { getResourceLibraryDocumentDownloadUrl, RESOURCE_LIBRARY_CATEGORIES } from './resourceLibraryStorage';

describe('resource library storage helpers', () => {
  it('uses the approved direct-upload categories', () => {
    expect(RESOURCE_LIBRARY_CATEGORIES).toEqual(['Reports', 'Resources', 'Trips', 'USANA Garden Towers']);
  });

  it('includes Trips and USANA Garden Towers as valid move destinations', () => {
    expect(RESOURCE_LIBRARY_CATEGORIES).toContain('Trips');
    expect(RESOURCE_LIBRARY_CATEGORIES).toContain('USANA Garden Towers');
  });

  it('rejects a signed download request outside the resource-library path', async () => {
    await expect(getResourceLibraryDocumentDownloadUrl('trips/guate-team/example.docx')).rejects.toThrow('Invalid resource-library document key.');
  });
});
