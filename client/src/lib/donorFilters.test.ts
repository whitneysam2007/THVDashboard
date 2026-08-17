import { describe, expect, it } from 'vitest';
import { matchesPotentialDonorFilter, matchesPotentiallyRecurringDonorFilter, matchesRecurringDonorFilter } from './donorFilters';

describe('matchesRecurringDonorFilter', () => {
  it('shows only explicitly recurring donors when the filter is active', () => {
    expect(matchesRecurringDonorFilter({ type: 'recurring' }, true)).toBe(true);
    expect(matchesRecurringDonorFilter({ type: 'potentially-recurring' }, true)).toBe(false);
    expect(matchesRecurringDonorFilter({ type: 'one-time' }, true)).toBe(false);
  });

  it('does not restrict donor types when inactive', () => {
    expect(matchesRecurringDonorFilter({ type: 'potentially-recurring' }, false)).toBe(true);
  });

  it('isolates potentially recurring donors without including current recurring donors', () => {
    expect(matchesPotentiallyRecurringDonorFilter({ type: 'potentially-recurring' }, true)).toBe(true);
    expect(matchesPotentiallyRecurringDonorFilter({ type: 'recurring' }, true)).toBe(false);
    expect(matchesPotentiallyRecurringDonorFilter({ type: 'potential' }, true)).toBe(false);
  });

  it('keeps Potential donors distinct from Potentially Recurring donors', () => {
    expect(matchesPotentialDonorFilter({ type: 'potential' }, true)).toBe(true);
    expect(matchesPotentialDonorFilter({ type: 'potentially-recurring' }, true)).toBe(false);
    expect(matchesPotentialDonorFilter({ type: 'potential' }, true)
      && matchesPotentiallyRecurringDonorFilter({ type: 'potential' }, true)).toBe(false);
  });
});
