import { describe, expect, it } from 'vitest';
import { matchesRecurringDonorFilter } from './donorFilters';

describe('matchesRecurringDonorFilter', () => {
  it('shows only explicitly recurring donors when the filter is active', () => {
    expect(matchesRecurringDonorFilter({ type: 'recurring' }, true)).toBe(true);
    expect(matchesRecurringDonorFilter({ type: 'potentially-recurring' }, true)).toBe(false);
    expect(matchesRecurringDonorFilter({ type: 'one-time' }, true)).toBe(false);
  });

  it('does not restrict donor types when inactive', () => {
    expect(matchesRecurringDonorFilter({ type: 'potentially-recurring' }, false)).toBe(true);
  });
});
