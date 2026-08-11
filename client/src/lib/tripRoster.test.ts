import { describe, expect, it } from 'vitest';
import { summarizeTripRoster } from './tripRoster';

describe('summarizeTripRoster', () => {
  it('counts team members and confirmed guests but excludes possible guests from total travelers', () => {
    const roster = summarizeTripRoster({
      teamMembers: ['Liz', 'Lauren'],
      attendees: [
        { id: 'a', name: 'Confirmed Guest', confirmed: true } as any,
        { id: 'b', name: 'Possible Guest', confirmed: false } as any,
      ],
    });

    expect(roster.teamCount).toBe(2);
    expect(roster.confirmedGuests.map(attendee => attendee.name)).toEqual(['Confirmed Guest']);
    expect(roster.possibleGuests.map(attendee => attendee.name)).toEqual(['Possible Guest']);
    expect(roster.totalTravelers).toBe(3);
  });
});
