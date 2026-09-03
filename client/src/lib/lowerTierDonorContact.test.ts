import { describe, expect, it } from 'vitest';
import { lowerTierDonorContactUpdate } from './lowerTierDonorContact';

describe('lowerTierDonorContactUpdate', () => {
  it('preserves all editable contact fields and internal notes while normalizing whitespace', () => {
    expect(lowerTierDonorContactUpdate({
      name: '  Sean and Aly Johnson  ', email: '  sean@example.org ', phone: ' 555-0100 ', address: ' 123 Main Street ', notes: ' Prefers text messages before calls. ',
    })).toEqual({
      name: 'Sean and Aly Johnson', email: 'sean@example.org', phone: '555-0100', address: '123 Main Street', notes: 'Prefers text messages before calls.',
    });
  });

  it('rejects an empty donor name while allowing optional details to be cleared', () => {
    expect(lowerTierDonorContactUpdate({ name: ' ', email: '', phone: '', address: '', notes: '' })).toBeNull();
    expect(lowerTierDonorContactUpdate({ name: 'Katie Ball', email: '', phone: '', address: '', notes: '' })).toEqual({
      name: 'Katie Ball', email: '', phone: '', address: '', notes: '',
    });
  });
});
