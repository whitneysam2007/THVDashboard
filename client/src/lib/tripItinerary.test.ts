import { describe, expect, it } from 'vitest';
import { copyItineraryTemplate, sortItineraryActivities } from './tripItinerary';

describe('trip itinerary helpers', () => {
  it('sorts timed activities chronologically while retaining untimed activities after them', () => {
    const sorted = sortItineraryActivities([
      { id: 'late', title: 'Dinner', time: '18:00' },
      { id: 'untimed', title: 'Flexible visit' },
      { id: 'early', title: 'Devotional', time: '08:00' },
      { id: 'middle', title: 'Clinic', time: '13:30' },
    ]);
    expect(sorted.map(activity => activity.title)).toEqual(['Devotional', 'Clinic', 'Dinner', 'Flexible visit']);
  });

  it('copies a prior itinerary onto the target trip dates with new activity identities', () => {
    const copied = copyItineraryTemplate([{ date: '2026-11-07', activities: [{ id: 'old', title: 'Travel', time: '09:00' }] }], ['2027-03-13', '2027-03-14']);
    expect(copied.map(day => day.date)).toEqual(['2027-03-13', '2027-03-14']);
    expect(copied[0].activities[0]).toMatchObject({ title: 'Travel', time: '09:00' });
    expect(copied[0].activities[0].id).not.toBe('old');
    expect(copied[1].activities).toEqual([]);
  });
});
