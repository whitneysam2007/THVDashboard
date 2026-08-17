import { describe, expect, it } from 'vitest';
import { latestEligibleTouchpointDate } from '../shared/contactTouchpoints';

describe('latestEligibleTouchpointDate', () => {
  it('uses the latest logged grey interaction or completed manual blue task', () => {
    expect(latestEligibleTouchpointDate(
      [{ date: '2026-08-07' }],
      [{ id: 'manual-wedding-follow-up', completedDate: '2026-08-15' }],
    )).toBe('2026-08-15');
  });

  it('excludes automatic welcome and recurring fig tasks from cadence resets', () => {
    expect(latestEligibleTouchpointDate(
      [{ date: '2026-08-07' }],
      [
        { id: 'welcome-note', completedDate: '2026-08-20' },
        { id: 'annual-report-2026', completedDate: '2026-08-25' },
      ],
    )).toBe('2026-08-07');
  });

  it('counts a completed handwritten thank-you letter as an intentional donor touchpoint', () => {
    expect(latestEligibleTouchpointDate(
      [{ date: '2026-08-07' }],
      [{ id: 'thank-you-letter-2026', completedDate: '2026-09-04' }],
    )).toBe('2026-09-04');
  });

  it('recognizes the donor-scoped handwritten thank-you letter ID stored in the database', () => {
    expect(latestEligibleTouchpointDate(
      [],
      [{ id: 'donor-123_thank-you-letter-2026', completedDate: '2026-09-04' }],
    )).toBe('2026-09-04');
  });

  it('returns no touchpoint when nothing eligible has occurred', () => {
    expect(latestEligibleTouchpointDate([], [{ id: 'manual-call' }])).toBeNull();
  });
});
